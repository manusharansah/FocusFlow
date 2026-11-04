from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter


class NoLocalSignupAccountAdapter(DefaultAccountAdapter):
    """Local sign-up/login go through our throttled API, not allauth's HTML forms."""

    def is_open_for_signup(self, request):
        return False


class SocialAdapter(DefaultSocialAccountAdapter):
    def is_open_for_signup(self, request, sociallogin):
        return True

    def populate_user(self, request, sociallogin, data):
        user = super().populate_user(request, sociallogin, data)
        # Google only returns verified addresses for primary e-mail.
        email_addresses = sociallogin.email_addresses
        if email_addresses and any(e.verified for e in email_addresses):
            user.email_verified = True
        return user
