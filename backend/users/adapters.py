from allauth.account.adapter import DefaultAccountAdapter
from allauth.core.exceptions import ImmediateHttpResponse
from django.conf import settings
from django.http import HttpResponseRedirect
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter

from .models import User


class NoLocalSignupAccountAdapter(DefaultAccountAdapter):
    """Local sign-up/login go through our throttled API, not allauth's HTML forms."""

    def is_open_for_signup(self, request):
        return False


class SocialAdapter(DefaultSocialAccountAdapter):
    def is_open_for_signup(self, request, sociallogin):
        return True

    def pre_social_login(self, request, sociallogin):
        """Link a Google sign-in to an existing account that has the same e-mail.

        Safe only because BOTH sides are verified: Google vouches for the address, and we ignore
        Google addresses it has not verified. If the local account was never verified, its password
        was set by whoever registered first (possibly an attacker), so that password is discarded and
        every existing session is revoked before the link is made.
        """
        if sociallogin.is_existing:
            return
        verified = [e.email for e in sociallogin.email_addresses if e.verified]
        if not verified:
            return
        user = User.objects.filter(email__iexact=verified[0], is_active=True).first()
        if user is None:
            return
        if not user.email_verified:
            from .views import revoke_all_sessions
            user.set_unusable_password()
            user.email_verified = True
            user.save()
            revoke_all_sessions(user)
        sociallogin.connect(request, user)

    def populate_user(self, request, sociallogin, data):
        user = super().populate_user(request, sociallogin, data)
        # Google only returns verified addresses for primary e-mail.
        email_addresses = sociallogin.email_addresses
        if email_addresses and any(e.verified for e in email_addresses):
            user.email_verified = True
        return user

    def on_authentication_error(self, request, provider, error=None, exception=None, extra_context=None):
        # Send users back to the SPA instead of rendering allauth's HTML error page.
        raise ImmediateHttpResponse(HttpResponseRedirect(f'{settings.FRONTEND_URL}/login?error=oauth'))
