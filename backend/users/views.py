import logging

from django.conf import settings
from django.contrib.auth import authenticate, password_validation
from django.contrib.auth.tokens import default_token_generator
from django.db import transaction
from django.http import HttpResponseRedirect
from django.middleware.csrf import get_token
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from payments import services as billing
from tasks.models import FocusSession, Task

from .cookies import clear_refresh_cookie, set_refresh_cookie
from .emails import send_password_reset_email, send_verification_email
from .models import User
from .serializers import (DeleteAccountSerializer, PasswordResetConfirmSerializer,
                          PasswordResetRequestSerializer, ProfileUpdateSerializer,
                          RegisterSerializer, UserSerializer, VerifyEmailSerializer)
from .throttles import AuthRateThrottle, RefreshRateThrottle, SensitiveRateThrottle

log = logging.getLogger(__name__)
GENERIC_LOGIN_ERROR = 'Invalid email or password.'


def _tokens_response(user, status_code=status.HTTP_200_OK):
    refresh = RefreshToken.for_user(user)
    response = Response({'access': str(refresh.access_token), 'user': UserSerializer(user).data},
                        status=status_code)
    set_refresh_cookie(response, refresh)
    return response


@api_view(['GET'])
@permission_classes([AllowAny])
def csrf(request):
    """Sets the csrftoken cookie and returns the token (used by the Google sign-in form POST)."""
    return Response({'csrfToken': get_token(request), 'google': settings.GOOGLE_ENABLED})


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthRateThrottle])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    email = serializer.validated_data['email']
    if User.objects.filter(email__iexact=email).exists():
        # Same response as success so the endpoint cannot be used to enumerate accounts.
        return Response({'detail': 'Check your inbox to verify your email.'}, status=status.HTTP_201_CREATED)
    user = User.objects.create_user(**serializer.validated_data)
    try:
        send_verification_email(user)
    except Exception:
        log.exception('Could not send verification e-mail')
    return Response({'detail': 'Check your inbox to verify your email.'}, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthRateThrottle])
def login(request):
    email = str(request.data.get('email', '')).strip().lower()
    password = request.data.get('password', '')
    user = authenticate(request, username=email, password=password) if email and isinstance(password, str) else None
    if user is None or not user.is_active:
        return Response({'detail': GENERIC_LOGIN_ERROR}, status=status.HTTP_401_UNAUTHORIZED)
    return _tokens_response(user)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([RefreshRateThrottle])
def token_refresh(request):
    raw = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)
    if not raw:
        return Response({'detail': 'Not authenticated.'}, status=status.HTTP_401_UNAUTHORIZED)
    try:
        old = RefreshToken(raw)
        user = User.objects.get(pk=old['user_id'], is_active=True)
        old.blacklist()  # rotation: each refresh token is single-use
    except (TokenError, User.DoesNotExist, KeyError):
        response = Response({'detail': 'Session expired.'}, status=status.HTTP_401_UNAUTHORIZED)
        clear_refresh_cookie(response)
        return response
    return _tokens_response(user)


@api_view(['POST'])
@permission_classes([AllowAny])
def logout(request):
    raw = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)
    if raw:
        try:
            RefreshToken(raw).blacklist()
        except TokenError:
            pass
    response = Response(status=status.HTTP_204_NO_CONTENT)
    clear_refresh_cookie(response)
    return response


@api_view(['GET'])
@permission_classes([AllowAny])
def oauth_complete(request):
    """Bridge after Google sign-in: turn the allauth session into our refresh cookie."""
    from django.contrib.auth import logout as django_logout
    target = f'{settings.FRONTEND_URL}/auth/callback'
    user = request.user
    if not user.is_authenticated:
        return HttpResponseRedirect(f'{settings.FRONTEND_URL}/login?error=oauth')
    refresh = RefreshToken.for_user(user)
    django_logout(request)  # session was only needed for this redirect
    response = HttpResponseRedirect(target)
    set_refresh_cookie(response, refresh)
    return response


@api_view(['GET', 'PATCH', 'DELETE'])
def profile(request):
    user = request.user
    if request.method == 'GET':
        return Response(UserSerializer(user).data)
    if request.method == 'PATCH':
        serializer = ProfileUpdateSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(user).data)
    # DELETE: erase account (GDPR/CCPA right to erasure)
    serializer = DeleteAccountSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    if user.has_usable_password() and not user.check_password(serializer.validated_data.get('password', '')):
        return Response({'detail': 'Password is incorrect.'}, status=status.HTTP_403_FORBIDDEN)
    billing.cancel_for_deleted_user(user)
    user.delete()
    response = Response(status=status.HTTP_204_NO_CONTENT)
    clear_refresh_cookie(response)
    return response


@api_view(['GET'])
def export_data(request):
    """GDPR data portability: everything we hold about the user as JSON."""
    user = request.user
    data = {
        'account': UserSerializer(user).data,
        'tasks': list(Task.objects.filter(user=user).values(
            'id', 'title', 'description', 'priority', 'due_date', 'completed', 'completed_at', 'created_at')),
        'focus_sessions': list(FocusSession.objects.filter(user=user).values(
            'id', 'duration_minutes', 'task_id', 'completed', 'started_at')),
        'payments': list(user.payments.values('amount', 'currency', 'status', 'created_at')),
    }
    return Response(data)


@api_view(['POST'])
@throttle_classes([SensitiveRateThrottle])
def resend_verification(request):
    if not request.user.email_verified:
        send_verification_email(request.user)
    return Response({'detail': 'If your email is not yet verified, a new link has been sent.'})


def _user_from_uid(uid):
    try:
        return User.objects.get(pk=force_str(urlsafe_base64_decode(uid)))
    except (User.DoesNotExist, ValueError, TypeError, OverflowError):
        return None


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthRateThrottle])
def verify_email(request):
    serializer = VerifyEmailSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = _user_from_uid(serializer.validated_data['uid'])
    if user is None or not default_token_generator.check_token(user, serializer.validated_data['token']):
        return Response({'detail': 'This link is invalid or has expired.'}, status=status.HTTP_400_BAD_REQUEST)
    user.email_verified = True
    user.save(update_fields=['email_verified'])
    return Response({'detail': 'Email verified.'})


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([SensitiveRateThrottle])
def password_reset_request(request):
    serializer = PasswordResetRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = User.objects.filter(email__iexact=serializer.validated_data['email'], is_active=True).first()
    if user and user.has_usable_password():
        try:
            send_password_reset_email(user)
        except Exception:
            log.exception('Could not send password reset e-mail')
    return Response({'detail': 'If that email is registered, a reset link has been sent.'})


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthRateThrottle])
@transaction.atomic
def password_reset_confirm(request):
    serializer = PasswordResetConfirmSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    user = _user_from_uid(data['uid'])
    if user is None or not default_token_generator.check_token(user, data['token']):
        return Response({'detail': 'This link is invalid or has expired.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        password_validation.validate_password(data['password'], user)
    except Exception as exc:
        return Response({'password': list(getattr(exc, 'messages', [str(exc)]))}, status=status.HTTP_400_BAD_REQUEST)
    user.set_password(data['password'])
    user.email_verified = True  # proved control of the mailbox
    user.save()  # password change also invalidates the token
    return Response({'detail': 'Password updated. You can now sign in.'})
