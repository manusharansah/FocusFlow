from django.contrib.auth.tokens import PasswordResetTokenGenerator


class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    """Distinct salt from password reset, and bound to verification state, so tokens are not interchangeable."""
    key_salt = 'focusflow.users.EmailVerificationTokenGenerator'

    def _make_hash_value(self, user, timestamp):
        return f'{user.pk}{user.email}{user.email_verified}{timestamp}'


class PasswordResetTokenGen(PasswordResetTokenGenerator):
    key_salt = 'focusflow.users.PasswordResetTokenGen'


email_verification_token = EmailVerificationTokenGenerator()
password_reset_token = PasswordResetTokenGen()
