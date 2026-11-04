from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class FocusFlowUserAdmin(UserAdmin):
    list_display = ('email', 'username', 'is_premium', 'subscription_status', 'email_verified', 'is_staff')
    list_filter = ('is_premium', 'subscription_status', 'email_verified', 'is_staff')
    search_fields = ('email', 'username', 'stripe_customer_id')
    # Billing state is owned by Stripe webhooks; keep it read-only in the admin.
    readonly_fields = ('stripe_customer_id', 'stripe_subscription_id', 'subscription_status',
                       'premium_until', 'is_premium', 'subscription_date', 'cancel_at_period_end',
                       'last_login', 'date_joined')
