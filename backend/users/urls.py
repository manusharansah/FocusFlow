from django.urls import path

from . import views

urlpatterns = [
    path('csrf/', views.csrf, name='csrf'),
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('logout/', views.logout, name='logout'),
    path('token/refresh/', views.token_refresh, name='token_refresh'),
    path('oauth-complete/', views.oauth_complete, name='oauth_complete'),
    path('profile/', views.profile, name='profile'),
    path('export/', views.export_data, name='export'),
    path('verify-email/', views.verify_email, name='verify_email'),
    path('resend-verification/', views.resend_verification, name='resend_verification'),
    path('password-reset/', views.password_reset_request, name='password_reset'),
    path('password-reset/confirm/', views.password_reset_confirm, name='password_reset_confirm'),
]
