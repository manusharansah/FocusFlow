from django.core import mail
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from .models import User

PW = 'correct-horse-battery-9'


@override_settings(CACHES={'default': {'BACKEND': 'django.core.cache.backends.dummy.DummyCache'}})
class AuthTests(TestCase):
    def setUp(self):
        self.c = APIClient()

    def register(self, **kw):
        data = {'username': 'ann', 'email': 'Ann@Example.com', 'password': PW, **kw}
        return self.c.post(reverse('register'), data, format='json')

    def test_register_cannot_grant_premium(self):
        r = self.register(is_premium=True, is_staff=True, is_superuser=True, email_verified=True)
        self.assertEqual(r.status_code, 201)
        u = User.objects.get(email='ann@example.com')
        self.assertFalse(u.is_premium or u.is_staff or u.is_superuser or u.email_verified)

    def test_register_does_not_enumerate_accounts(self):
        self.register()
        r = self.register(username='other')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(User.objects.count(), 1)

    def test_register_rejects_weak_password(self):
        self.assertEqual(self.register(password='12345678').status_code, 400)
        self.assertEqual(self.register(password='short').status_code, 400)

    def test_login_refresh_logout_flow(self):
        self.register()
        User.objects.update(email_verified=True)
        r = self.c.post(reverse('login'), {'email': 'ANN@example.com', 'password': PW}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertIn('access', r.data)
        cookie = r.cookies['ff_refresh']
        self.assertTrue(cookie['httponly'])
        self.assertNotIn('refresh', r.data)  # refresh token never exposed to JS

        me = self.c.get(reverse('profile'), HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")
        self.assertEqual(me.status_code, 200)
        self.assertNotIn('password', me.data)

        old = cookie.value
        r2 = self.c.post(reverse('token_refresh'))
        self.assertEqual(r2.status_code, 200)
        # rotation: reusing the old refresh token must fail
        self.c.cookies['ff_refresh'] = old
        self.assertEqual(self.c.post(reverse('token_refresh')).status_code, 401)

        self.c.cookies['ff_refresh'] = r2.cookies['ff_refresh'].value
        self.assertEqual(self.c.post(reverse('logout')).status_code, 204)
        self.c.cookies['ff_refresh'] = r2.cookies['ff_refresh'].value
        self.assertEqual(self.c.post(reverse('token_refresh')).status_code, 401)

    def test_login_errors_are_generic(self):
        self.register()
        a = self.c.post(reverse('login'), {'email': 'ann@example.com', 'password': 'nope'}, format='json')
        b = self.c.post(reverse('login'), {'email': 'ghost@example.com', 'password': 'nope'}, format='json')
        self.assertEqual((a.status_code, a.data), (b.status_code, b.data))

    def test_profile_requires_auth_and_ignores_billing_fields(self):
        self.assertEqual(self.c.get(reverse('profile')).status_code, 401)
        self.register()
        u = User.objects.get()
        self.c.force_authenticate(u)
        r = self.c.patch(reverse('profile'), {'username': 'ann2', 'is_premium': True}, format='json')
        self.assertEqual(r.status_code, 200)
        u.refresh_from_db()
        self.assertEqual(u.username, 'ann2')
        self.assertFalse(u.is_premium)

    def test_email_verification_and_password_reset(self):
        self.register()
        self.assertEqual(len(mail.outbox), 1)
        import re
        uid, token = re.search(r'uid=([^&]+)&token=(\S+)', mail.outbox[0].body).groups()
        self.assertEqual(self.c.post(reverse('verify_email'), {'uid': uid, 'token': 'bad'}, format='json').status_code, 400)
        self.assertEqual(self.c.post(reverse('verify_email'), {'uid': uid, 'token': token}, format='json').status_code, 200)
        self.assertTrue(User.objects.get().email_verified)

        mail.outbox.clear()
        for email in ('ann@example.com', 'ghost@example.com'):
            r = self.c.post(reverse('password_reset'), {'email': email}, format='json')
            self.assertEqual(r.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        uid, token = re.search(r'uid=([^&]+)&token=(\S+)', mail.outbox[0].body).groups()
        r = self.c.post(reverse('password_reset_confirm'), {'uid': uid, 'token': token, 'password': 'new-Passw0rd-xyz'}, format='json')
        self.assertEqual(r.status_code, 200)
        # token is single-use
        r = self.c.post(reverse('password_reset_confirm'), {'uid': uid, 'token': token, 'password': 'another-Passw0rd-1'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertTrue(User.objects.get().check_password('new-Passw0rd-xyz'))

    def test_export_and_delete_account(self):
        self.register()
        u = User.objects.get()
        self.c.force_authenticate(u)
        self.assertEqual(self.c.get(reverse('export')).status_code, 200)
        self.assertEqual(self.c.delete(reverse('profile'), {'password': 'wrong'}, format='json').status_code, 403)
        self.assertEqual(self.c.delete(reverse('profile'), {'password': PW}, format='json').status_code, 204)
        self.assertFalse(User.objects.exists())


class ThrottleTests(TestCase):
    def test_login_is_rate_limited(self):
        from django.core.cache import cache
        cache.clear()
        c = APIClient()
        codes = [c.post(reverse('login'), {'email': 'a@b.co', 'password': 'x'}, format='json').status_code for _ in range(12)]
        self.assertIn(429, codes)
        cache.clear()


@override_settings(CACHES={'default': {'BACKEND': 'django.core.cache.backends.dummy.DummyCache'}})
class HardeningTests(TestCase):
    def setUp(self):
        self.c = APIClient()

    def make(self, verified=True, **kw):
        return User.objects.create_user('u', 'u@x.io', PW, email_verified=verified, **kw)

    def test_unverified_cannot_login(self):
        self.make(verified=False)
        r = self.c.post(reverse('login'), {'email': 'u@x.io', 'password': PW}, format='json')
        self.assertEqual((r.status_code, r.data['code']), (403, 'email_not_verified'))

    def test_register_duplicate_email_is_uniform(self):
        self.make()
        r = self.c.post(reverse('register'), {'username': 'new', 'email': 'U@x.io', 'password': PW}, format='json')
        self.assertEqual(r.status_code, 201)
        r2 = self.c.post(reverse('register'), {'username': 'new2', 'email': 'u@x.io', 'password': PW}, format='json')
        self.assertEqual(r2.status_code, 201)

    def test_verification_and_reset_tokens_not_interchangeable(self):
        from .tokens import email_verification_token, password_reset_token
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        u = self.make(verified=False)
        uid = urlsafe_base64_encode(force_bytes(u.pk))
        vt = email_verification_token.make_token(u)
        r = self.c.post(reverse('password_reset_confirm'), {'uid': uid, 'token': vt, 'password': 'brand-New-pass-77'}, format='json')
        self.assertEqual(r.status_code, 400)
        rt = password_reset_token.make_token(u)
        self.assertEqual(self.c.post(reverse('verify_email'), {'uid': uid, 'token': rt}, format='json').status_code, 400)
        self.assertEqual(self.c.post(reverse('verify_email'), {'uid': uid, 'token': vt}, format='json').status_code, 200)
        # verification token is single-use (hash includes email_verified)
        self.assertEqual(self.c.post(reverse('verify_email'), {'uid': uid, 'token': vt}, format='json').status_code, 400)

    def test_password_reset_revokes_existing_sessions(self):
        from .tokens import password_reset_token
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        u = self.make()
        r = self.c.post(reverse('login'), {'email': 'u@x.io', 'password': PW}, format='json')
        stolen = r.cookies['ff_refresh'].value
        uid = urlsafe_base64_encode(force_bytes(u.pk))
        ok = self.c.post(reverse('password_reset_confirm'),
                         {'uid': uid, 'token': password_reset_token.make_token(u), 'password': 'brand-New-pass-77'}, format='json')
        self.assertEqual(ok.status_code, 200)
        attacker = APIClient(); attacker.cookies['ff_refresh'] = stolen
        self.assertEqual(attacker.post(reverse('token_refresh')).status_code, 401)

    def test_refresh_reuse_revokes_whole_family(self):
        self.make()
        r = self.c.post(reverse('login'), {'email': 'u@x.io', 'password': PW}, format='json')
        first = r.cookies['ff_refresh'].value
        r2 = self.c.post(reverse('token_refresh'))
        second = r2.cookies['ff_refresh'].value
        thief = APIClient(); thief.cookies['ff_refresh'] = first       # replay of a used token
        self.assertEqual(thief.post(reverse('token_refresh')).status_code, 401)
        legit = APIClient(); legit.cookies['ff_refresh'] = second      # successor is now revoked too
        self.assertEqual(legit.post(reverse('token_refresh')).status_code, 401)

    def test_oauth_complete_converts_session_to_refresh_cookie(self):
        u = self.make()
        self.c.force_login(u)
        r = self.c.get(reverse('oauth_complete'))
        self.assertEqual(r.status_code, 302)
        self.assertTrue(r['Location'].endswith('/auth/callback'))
        self.assertIn('ff_refresh', r.cookies)
        # session destroyed after the hand-off
        self.assertEqual(self.c.get(reverse('oauth_complete'))['Location'].split('/')[-1], 'login?error=oauth')

    def test_oauth_complete_without_session_redirects_to_error(self):
        r = APIClient().get(reverse('oauth_complete'))
        self.assertTrue(r['Location'].endswith('/login?error=oauth'))

    def test_per_account_login_lockout(self):
        from django.core.cache import cache
        with override_settings(CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache', 'LOCATION': 'lock'}}):
            cache.clear(); self.make()
            codes = []
            for i in range(10):
                codes.append(APIClient().post(reverse('login'), {'email': 'u@x.io', 'password': 'bad'}, format='json',
                                              HTTP_X_FORWARDED_FOR=f'10.0.0.{i}').status_code)
            self.assertEqual(codes[-1], 429)
            self.assertEqual(APIClient().post(reverse('login'), {'email': 'u@x.io', 'password': PW}, format='json').status_code, 429)
            cache.clear()


class GoogleSignInTests(TestCase):
    """The Google round trip itself needs real credentials; these cover our own logic around it."""

    def _login(self, email, verified=True, uid='g-1'):
        from allauth.account.models import EmailAddress
        from allauth.socialaccount.models import SocialAccount, SocialLogin
        from django.test import RequestFactory
        from .adapters import SocialAdapter
        request = RequestFactory().get('/')
        request.session = self.client.session
        request.user = __import__('django.contrib.auth.models', fromlist=['AnonymousUser']).AnonymousUser()
        login = SocialLogin(user=User(email=email, username='g'), account=SocialAccount(provider='google', uid=uid, extra_data={}),
                            email_addresses=[EmailAddress(email=email, verified=verified, primary=True)])
        SocialAdapter().pre_social_login(request, login)
        return login

    def test_links_to_existing_verified_account(self):
        u = User.objects.create_user('ann', 'ann@example.com', PW, email_verified=True)
        login = self._login('Ann@Example.com')
        self.assertEqual(login.user.pk, u.pk)
        u.refresh_from_db(); self.assertTrue(u.has_usable_password())  # a verified owner keeps their password

    def test_unverified_local_account_loses_attacker_password_and_sessions(self):
        from rest_framework.test import APIClient
        victim = User.objects.create_user('v', 'victim@example.com', 'attacker-chosen-pass-1', email_verified=False)
        # an attacker holds a refresh token minted for the pre-registered account
        from rest_framework_simplejwt.tokens import RefreshToken
        stale = str(RefreshToken.for_user(victim))
        login = self._login('victim@example.com')
        victim.refresh_from_db()
        self.assertEqual(login.user.pk, victim.pk)
        self.assertTrue(victim.email_verified)
        self.assertFalse(victim.has_usable_password())
        attacker = APIClient(); attacker.cookies['ff_refresh'] = stale
        self.assertEqual(attacker.post(reverse('token_refresh')).status_code, 401)

    def test_unverified_google_address_is_never_linked(self):
        u = User.objects.create_user('ann', 'ann@example.com', PW, email_verified=True)
        login = self._login('ann@example.com', verified=False)
        self.assertNotEqual(getattr(login.user, 'pk', None), u.pk)

    def test_new_google_user_is_created_verified_without_a_password(self):
        from allauth.socialaccount.models import SocialLogin
        from django.test import RequestFactory
        from allauth.account.models import EmailAddress
        from allauth.socialaccount.models import SocialAccount
        from .adapters import SocialAdapter
        login = SocialLogin(user=User(), account=SocialAccount(provider='google', uid='g-2', extra_data={}),
                            email_addresses=[EmailAddress(email='new@example.com', verified=True, primary=True)])
        user = SocialAdapter().populate_user(RequestFactory().get('/'), login, {'email': 'new@example.com', 'username': 'newbie'})
        self.assertTrue(user.email_verified)

    @override_settings(CACHES={'default': {'BACKEND': 'django.core.cache.backends.dummy.DummyCache'}})
    def test_csrf_endpoint_reports_google_flag(self):
        with override_settings(GOOGLE_ENABLED=False):
            self.assertFalse(APIClient().get(reverse('csrf')).data['google'])
        with override_settings(GOOGLE_ENABLED=True):
            self.assertTrue(APIClient().get(reverse('csrf')).data['google'])
