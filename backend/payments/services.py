"""Stripe integration. Entitlement (User.is_premium) is derived ONLY from
Stripe subscription state received via signed webhooks or re-fetched from
Stripe's API - never from client-supplied data."""
import logging
from datetime import datetime, timezone as dt_timezone
from decimal import Decimal

import stripe
from django.conf import settings
from django.core.cache import cache
from django.db import IntegrityError, transaction

from users.models import User

from .models import Payment, StripeEvent

log = logging.getLogger(__name__)
ACTIVE_STATES = {'active', 'trialing'}
PLANS = ('monthly', 'yearly')


def client():
    stripe.api_key = settings.STRIPE_SECRET_KEY
    return stripe


def configured():
    return bool(settings.STRIPE_SECRET_KEY)


def _ts(value):
    return datetime.fromtimestamp(value, tz=dt_timezone.utc) if value else None


def ensure_customer(user):
    if user.stripe_customer_id:
        return user.stripe_customer_id
    customer = client().Customer.create(email=user.email, metadata={'user_id': str(user.pk)})
    user.stripe_customer_id = customer.id
    user.save(update_fields=['stripe_customer_id'])
    return customer.id


def create_checkout(user, plan):
    price = settings.STRIPE_PRICE_IDS.get(plan)
    if not price:
        raise ValueError('Plan is not configured.')
    session = client().checkout.Session.create(
        mode='subscription',
        customer=ensure_customer(user),
        client_reference_id=str(user.pk),
        line_items=[{'price': price, 'quantity': 1}],
        allow_promotion_codes=True,
        billing_address_collection='auto',
        automatic_tax={'enabled': settings.STRIPE_AUTOMATIC_TAX},
        subscription_data={'metadata': {'user_id': str(user.pk)}},
        success_url=f'{settings.FRONTEND_URL}/payment-success?session_id={{CHECKOUT_SESSION_ID}}',
        cancel_url=f'{settings.FRONTEND_URL}/pricing?canceled=1',
    )
    return session


def create_portal(user):
    return client().billing_portal.Session.create(
        customer=ensure_customer(user), return_url=f'{settings.FRONTEND_URL}/account')


def apply_subscription(user, sub):
    """Mirror a Stripe Subscription object onto the user."""
    status = sub['status']
    item = (sub.get('items') or {}).get('data', [{}])[0]
    period_end = sub.get('current_period_end') or item.get('current_period_end')
    user.stripe_customer_id = sub.get('customer') or user.stripe_customer_id
    user.stripe_subscription_id = sub['id']
    user.subscription_status = status
    user.premium_until = _ts(period_end)
    user.cancel_at_period_end = bool(sub.get('cancel_at_period_end'))
    was_premium = user.is_premium
    user.is_premium = status in ACTIVE_STATES
    if user.is_premium and not was_premium:
        user.subscription_date = _ts(sub.get('start_date')) or user.subscription_date
    user.save()


def _user_for(obj):
    meta_id = (obj.get('metadata') or {}).get('user_id') or obj.get('client_reference_id')
    if meta_id and str(meta_id).isdigit():
        user = User.objects.filter(pk=int(meta_id)).first()
        if user:
            return user
    if obj.get('customer'):
        return User.objects.filter(stripe_customer_id=obj['customer']).first()
    return None


def sync_checkout_session(user, session_id):
    """Used by the success page. Only returns data for the caller's own session."""
    session = client().checkout.Session.retrieve(session_id, expand=['subscription'])
    if str(session.get('client_reference_id')) != str(user.pk):
        raise PermissionError('Session does not belong to this user.')
    if session.get('payment_status') in ('paid', 'no_payment_required') and session.get('subscription'):
        apply_subscription(user, session['subscription'])
    return user


def handle_event(event):
    """Idempotently process a verified webhook event."""
    try:
        with transaction.atomic():
            StripeEvent.objects.create(event_id=event['id'], type=event['type'])
            _dispatch(event['type'], event['data']['object'])
    except IntegrityError:
        log.info('Duplicate Stripe event %s ignored', event['id'])


def _dispatch(etype, obj):
    if etype in ('customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'):
        user = _user_for(obj)
        if user:
            apply_subscription(user, obj)
        else:
            log.warning('Subscription %s has no matching user', obj.get('id'))
    elif etype == 'checkout.session.completed':
        user = _user_for(obj)
        if user and obj.get('subscription'):
            apply_subscription(user, client().Subscription.retrieve(obj['subscription']))
    elif etype == 'invoice.paid':
        user = _user_for(obj)
        Payment.objects.get_or_create(
            stripe_invoice_id=obj['id'],
            defaults={'user': user, 'amount': Decimal(obj['amount_paid']) / 100,
                      'currency': obj['currency'], 'status': 'paid'})
    elif etype == 'invoice.payment_failed':
        user = _user_for(obj)
        if user:
            user.subscription_status = 'past_due'
            user.save(update_fields=['subscription_status'])


def cancel_for_deleted_user(user):
    """Stop billing before an account is erased."""
    if configured() and user.stripe_subscription_id:
        try:
            client().Subscription.cancel(user.stripe_subscription_id)
        except Exception:
            log.exception('Could not cancel Stripe subscription for user %s', user.pk)


def plan_catalog():
    """Display prices come from Stripe so the UI can never differ from what is charged."""
    cached = cache.get('stripe_plan_catalog')
    if cached is not None:
        return cached
    catalog = []
    if configured():
        for plan in PLANS:
            price_id = settings.STRIPE_PRICE_IDS.get(plan)
            if not price_id:
                continue
            try:
                price = client().Price.retrieve(price_id)
            except stripe.StripeError:
                log.exception('Could not load Stripe price %s', plan)
                return []
            catalog.append({'plan': plan, 'amount': price['unit_amount'], 'currency': price['currency'],
                            'interval': (price.get('recurring') or {}).get('interval', 'month')})
        cache.set('stripe_plan_catalog', catalog, 600)
    return catalog
