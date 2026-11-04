from django.conf import settings
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from .tokens import email_verification_token, password_reset_token


def _link(path, user, token):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    return f'{settings.FRONTEND_URL}{path}?uid={uid}&token={token}'


def send_verification_email(user):
    link = _link('/verify-email', user, email_verification_token.make_token(user))
    send_mail('Verify your FocusFlow email',
              f'Hi {user.username},\n\nConfirm your email address:\n{link}\n\n'
              'If you did not create this account you can ignore this message.',
              None, [user.email])


def send_password_reset_email(user):
    link = _link('/reset-password', user, password_reset_token.make_token(user))
    send_mail('Reset your FocusFlow password',
              f'Hi {user.username},\n\nReset your password (valid for 1 hour):\n{link}\n\n'
              'If you did not request this you can ignore this message.',
              None, [user.email])
