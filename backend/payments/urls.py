from django.urls import path
from . import views

urlpatterns = [
    path('create-checkout/', views.create_checkout_session, name='create_checkout'),
    path('verify-payment/', views.verify_payment, name='verify_payment'),
]