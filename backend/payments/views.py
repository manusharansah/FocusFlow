import logging

import stripe
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle

from users.serializers import UserSerializer

from . import services

log = logging.getLogger(__name__)


class PaymentsThrottle(UserRateThrottle):
    scope = 'payments'


def _unavailable():
    return Response({'detail': 'Billing is temporarily unavailable.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


@api_view(['GET'])
@permission_classes([AllowAny])
def plans(request):
    catalog = services.plan_catalog()
    return Response({'plans': catalog, 'billing_enabled': bool(catalog)})


@api_view(['POST'])
@throttle_classes([PaymentsThrottle])
def create_checkout_session(request):
    if not services.configured():
        return _unavailable()
    user = request.user
    if not user.email_verified:
        return Response({'detail': 'Please verify your email address before upgrading.'}, status=status.HTTP_403_FORBIDDEN)
    if user.is_premium:
        return Response({'detail': 'You already have an active subscription.'}, status=status.HTTP_409_CONFLICT)
    plan = request.data.get('plan', 'monthly')
    if plan not in services.PLANS or not settings.STRIPE_PRICE_IDS.get(plan):
        return Response({'detail': 'Unknown plan.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        session = services.create_checkout(user, plan)
    except stripe.StripeError:
        log.exception('Stripe checkout creation failed')
        return _unavailable()
    return Response({'checkout_url': session.url})


@api_view(['POST'])
@throttle_classes([PaymentsThrottle])
def create_portal_session(request):
    if not services.configured():
        return _unavailable()
    if not request.user.stripe_customer_id:
        return Response({'detail': 'No billing account yet.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        return Response({'url': services.create_portal(request.user).url})
    except stripe.StripeError:
        log.exception('Stripe portal creation failed')
        return _unavailable()


@api_view(['POST'])
@throttle_classes([PaymentsThrottle])
def verify_payment(request):
    """Called by the success page; the webhook remains the source of truth."""
    session_id = str(request.data.get('session_id', ''))
    if not session_id.startswith('cs_') or len(session_id) > 200:
        return Response({'detail': 'Invalid session.'}, status=status.HTTP_400_BAD_REQUEST)
    if not services.configured():
        return _unavailable()
    try:
        user = services.sync_checkout_session(request.user, session_id)
    except PermissionError:
        return Response({'detail': 'Invalid session.'}, status=status.HTTP_403_FORBIDDEN)
    except stripe.StripeError:
        log.exception('Stripe session lookup failed')
        return _unavailable()
    return Response({'success': user.is_premium, 'user': UserSerializer(user).data})


@csrf_exempt
@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([])
def stripe_webhook(request):
    if not settings.STRIPE_WEBHOOK_SECRET:
        return Response(status=status.HTTP_503_SERVICE_UNAVAILABLE)
    try:
        event = stripe.Webhook.construct_event(
            request.body, request.META.get('HTTP_STRIPE_SIGNATURE', ''), settings.STRIPE_WEBHOOK_SECRET)
    except (ValueError, stripe.SignatureVerificationError):
        return Response(status=status.HTTP_400_BAD_REQUEST)
    services.client()
    try:
        services.handle_event(event)
    except Exception:
        log.exception('Webhook processing failed for %s', event.get('id'))
        return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR)  # Stripe will retry
    return Response(status=status.HTTP_200_OK)
