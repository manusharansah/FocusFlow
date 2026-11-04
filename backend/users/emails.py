from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode


def _link(path, user, token):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    return f'{settings.FRONTEND_URL}{path}?uid={uid}&token={token}'


def send_verification_email(user):
    link = _link('/verify-email', user, default_token_generator.make_token(user))
    send_mail('Verify your FocusFlow email',
              f'Hi {user.username},\n\nConfirm your email address:\n{link}\n\n'
              'If you did not create this account you can ignore this message.',
              None, [user.email])


def send_password_reset_email(user):
    link = _link('/reset-password', user, default_token_generator.make_token(user))
    send_mail('Reset your FocusFlow password',
              f'Hi {user.username},\n\nReset your password (valid for 1 hour):\n{link}\n\n'
              'If you did not request this you can ignore this message.',
              None, [user.email])
