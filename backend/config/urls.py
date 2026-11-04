from django.conf import settings
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def health(_request):
    return JsonResponse({'status': 'ok'})


def google_disabled(_request, *args, **kwargs):
    return JsonResponse({'detail': 'Google sign-in is not configured.'}, status=404)


urlpatterns = [
    path(f'{settings.ADMIN_URL}/', admin.site.urls),
    path('api/health/', health, name='health'),
    path('api/users/', include('users.urls')),
    path('api/tasks/', include('tasks.urls')),
    path('api/payments/', include('payments.urls')),
    path('api/analytics/', include('analytics.urls')),
    # Without credentials the Google routes answer 404 instead of failing with a server error.
    *([] if settings.GOOGLE_ENABLED else [path('accounts/google/', google_disabled), path('accounts/google/<path:rest>', google_disabled)]),
    # Google OAuth only (allauth). Local signup/login is handled by users.views.
    path('accounts/', include('allauth.urls')),
]
