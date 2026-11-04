from django.urls import path

from . import views

urlpatterns = [
    path('plans/', views.plans, name='plans'),
    path('create-checkout/', views.create_checkout_session, name='create_checkout'),
    path('portal/', views.create_portal_session, name='portal'),
    path('verify-payment/', views.verify_payment, name='verify_payment'),
    path('webhook/', views.stripe_webhook, name='stripe_webhook'),
]
