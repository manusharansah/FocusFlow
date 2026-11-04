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
