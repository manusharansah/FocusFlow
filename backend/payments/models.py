from django.conf import settings
from django.db import models


class Payment(models.Model):
    """Immutable ledger row created from a paid Stripe invoice."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='payments')
    stripe_invoice_id = models.CharField(max_length=100, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='usd')
    status = models.CharField(max_length=50, default='paid')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.stripe_invoice_id} {self.amount} {self.currency.upper()}'


class StripeEvent(models.Model):
    """Processed webhook ids, so Stripe retries are idempotent."""
    event_id = models.CharField(max_length=100, unique=True)
    type = models.CharField(max_length=100)
    received_at = models.DateTimeField(auto_now_add=True)
