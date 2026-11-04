from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.functions import Lower


class User(AbstractUser):
    email = models.EmailField(unique=True)
    email_verified = models.BooleanField(default=False)

    # Billing state. Only ever written by payments.services (Stripe webhooks),
    # never by user-supplied data.
    is_premium = models.BooleanField(default=False)
    subscription_date = models.DateTimeField(null=True, blank=True)
    stripe_customer_id = models.CharField(max_length=64, blank=True, db_index=True)
    stripe_subscription_id = models.CharField(max_length=64, blank=True)
    subscription_status = models.CharField(max_length=32, blank=True)
    premium_until = models.DateTimeField(null=True, blank=True)
    cancel_at_period_end = models.BooleanField(default=False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        constraints = [
            models.UniqueConstraint(Lower('email'), name='users_user_email_ci_unique'),
        ]

    def save(self, *args, **kwargs):
        if self.email:
            self.email = self.email.strip().lower()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.email
