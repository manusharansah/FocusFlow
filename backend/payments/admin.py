from django.contrib import admin

from .models import Payment, StripeEvent


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('stripe_invoice_id', 'user', 'amount', 'currency', 'status', 'created_at')
    readonly_fields = [f.name for f in Payment._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(StripeEvent)
class StripeEventAdmin(admin.ModelAdmin):
    list_display = ('event_id', 'type', 'received_at')
    readonly_fields = [f.name for f in StripeEvent._meta.fields]
