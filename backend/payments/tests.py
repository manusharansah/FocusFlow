import json
from unittest import mock

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from users.models import User

from .models import Payment, StripeEvent

NOCACHE = {'default': {'BACKEND': 'django.core.cache.backends.dummy.DummyCache'}}
STRIPE = dict(STRIPE_SECRET_KEY='sk_test_x', STRIPE_WEBHOOK_SECRET='whsec_x',
              STRIPE_PRICE_IDS={'monthly': 'price_m', 'yearly': 'price_y'}, CACHES=NOCACHE)


def sub(user, status='active', sid='sub_1'):
    return {'id': sid, 'status': status, 'customer': 'cus_1', 'metadata': {'user_id': str(user.pk)},
            'current_period_end': 1893456000, 'cancel_at_period_end': False, 'start_date': 1700000000}


@override_settings(**STRIPE)
class PaymentTests(TestCase):
    def setUp(self):
        self.u = User.objects.create_user('u', 'u@x.io', 'pw-123456789', email_verified=True)
        self.other = User.objects.create_user('o', 'o@x.io', 'pw-123456789')
        self.c = APIClient(); self.c.force_authenticate(self.u)

    def test_checkout_requires_auth_verified_email_and_known_plan(self):
        self.assertEqual(APIClient().post('/api/payments/create-checkout/').status_code, 401)
        unverified = APIClient(); unverified.force_authenticate(self.other)
        self.assertEqual(unverified.post('/api/payments/create-checkout/', {'plan': 'monthly'}, format='json').status_code, 403)
        self.assertEqual(self.c.post('/api/payments/create-checkout/', {'plan': 'free-lunch'}, format='json').status_code, 400)

    @mock.patch('payments.services.stripe')
    def test_checkout_uses_server_side_price(self, st):
        st.Customer.create.return_value = mock.Mock(id='cus_1')
        st.checkout.Session.create.return_value = mock.Mock(url='https://checkout.stripe.com/x')
        r = self.c.post('/api/payments/create-checkout/', {'plan': 'yearly', 'amount': 1}, format='json')
        self.assertEqual(r.status_code, 200)
        kwargs = st.checkout.Session.create.call_args.kwargs
        self.assertEqual(kwargs['line_items'], [{'price': 'price_y', 'quantity': 1}])
        self.assertEqual(kwargs['mode'], 'subscription')
        self.assertTrue(kwargs['success_url'].startswith('http://localhost:3000/'))

    @mock.patch('payments.services.stripe')
    def test_verify_payment_rejects_other_users_session(self, st):
        st.checkout.Session.retrieve.return_value = {
            'client_reference_id': str(self.other.pk), 'payment_status': 'paid', 'subscription': sub(self.other)}
        r = self.c.post('/api/payments/verify-payment/', {'session_id': 'cs_test_abc'}, format='json')
        self.assertEqual(r.status_code, 403)
        self.u.refresh_from_db(); self.assertFalse(self.u.is_premium)
        self.other.refresh_from_db(); self.assertFalse(self.other.is_premium)

    @mock.patch('payments.services.stripe')
    def test_verify_payment_own_session(self, st):
        st.checkout.Session.retrieve.return_value = {
            'client_reference_id': str(self.u.pk), 'payment_status': 'paid', 'subscription': sub(self.u)}
        r = self.c.post('/api/payments/verify-payment/', {'session_id': 'cs_test_abc'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.u.refresh_from_db(); self.assertTrue(self.u.is_premium)
        self.assertEqual(self.c.post('/api/payments/verify-payment/', {'session_id': '../etc'}, format='json').status_code, 400)

    def hook(self, event):
        body = json.dumps(event)
        with mock.patch('payments.views.stripe.Webhook.construct_event', return_value=event):
            return APIClient().post('/api/payments/webhook/', body, content_type='application/json',
                                    HTTP_STRIPE_SIGNATURE='sig')

    def test_webhook_rejects_bad_signature(self):
        r = APIClient().post('/api/payments/webhook/', '{}', content_type='application/json', HTTP_STRIPE_SIGNATURE='bad')
        self.assertEqual(r.status_code, 400)

    def test_webhook_subscription_lifecycle_and_idempotency(self):
        ev = {'id': 'evt_1', 'type': 'customer.subscription.created', 'data': {'object': sub(self.u)}}
        self.assertEqual(self.hook(ev).status_code, 200)
        self.u.refresh_from_db(); self.assertTrue(self.u.is_premium)
        self.assertEqual(self.u.stripe_customer_id, 'cus_1')
        self.assertEqual(self.hook(ev).status_code, 200)  # replay
        self.assertEqual(StripeEvent.objects.count(), 1)

        ev2 = {'id': 'evt_2', 'type': 'customer.subscription.deleted', 'data': {'object': sub(self.u, 'canceled')}}
        self.hook(ev2)
        self.u.refresh_from_db(); self.assertFalse(self.u.is_premium)

    def test_webhook_invoice_paid_records_payment_once(self):
        inv = {'id': 'in_1', 'amount_paid': 999, 'currency': 'usd', 'customer': 'cus_1', 'metadata': {}}
        self.u.stripe_customer_id = 'cus_1'; self.u.save()
        self.hook({'id': 'evt_a', 'type': 'invoice.paid', 'data': {'object': inv}})
        self.hook({'id': 'evt_b', 'type': 'invoice.paid', 'data': {'object': inv}})
        self.assertEqual(Payment.objects.count(), 1)
        self.assertEqual(str(Payment.objects.get().amount), '9.99')

    def test_errors_do_not_leak_internals(self):
        with override_settings(STRIPE_SECRET_KEY=''):
            r = self.c.post('/api/payments/create-checkout/', {'plan': 'monthly'}, format='json')
            self.assertEqual(r.status_code, 503)
            self.assertNotIn('sk_', json.dumps(r.data))


@override_settings(**STRIPE)
class PlansTests(TestCase):
    @mock.patch('payments.services.stripe')
    def test_plans_reflect_stripe_prices(self, st):
        from django.core.cache import cache
        cache.clear()
        st.StripeError = Exception
        st.Price.retrieve.side_effect = lambda pid: {'unit_amount': 999 if pid == 'price_m' else 9900,
                                                       'currency': 'usd', 'recurring': {'interval': 'month' if pid == 'price_m' else 'year'}}
        c = APIClient(); c.force_authenticate(User.objects.create_user('p', 'p@x.io', 'pw-123456789'))
        r = c.get('/api/payments/plans/')
        self.assertEqual([p['amount'] for p in r.data['plans']], [999, 9900])
