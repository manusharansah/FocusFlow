from django.conf import settings
from django.contrib import admin
from django.http import JsonResponse
from django.http import FileResponse, Http404
from django.urls import include, path, re_path


def health(_request):
    return JsonResponse({'status': 'ok'})


def not_found(_request, *args, **kwargs):
    raise Http404


def google_disabled(_request, *args, **kwargs):
    return JsonResponse({'detail': 'Google sign-in is not configured.'}, status=404)


def spa_index(request, rest=''):
    """Serve the React app's index.html for client-side routes such as /app/tasks.

    Requests for a file (a path with an extension) that does not exist are a real 404, not the app.
    """
    index = settings.FRONTEND_DIST / 'index.html'
    if not index.exists() or '.' in rest.rsplit('/', 1)[-1]:
        raise Http404
    response = FileResponse(open(index, 'rb'), content_type='text/html; charset=utf-8')
    response.headers['Cache-Control'] = 'no-cache'
    return response


urlpatterns = [
    *([path(f'{settings.ADMIN_URL}/', admin.site.urls)] if settings.ADMIN_ENABLED else []),
    path('api/health/', health, name='health'),
    path('api/users/', include('users.urls')),
    path('api/tasks/', include('tasks.urls')),
    path('api/payments/', include('payments.urls')),
    path('api/analytics/', include('analytics.urls')),
    # Without credentials the Google routes answer 404 instead of failing with a server error.
    *([] if settings.GOOGLE_ENABLED else [path('accounts/google/', google_disabled), path('accounts/google/<path:rest>', google_disabled)]),
    # allauth's HTML account pages (login, signup, password reset) are not part of this app: only Google routes are open.
    re_path(r'^accounts/(?!google/|3rdparty/).*$', not_found),
    # Google OAuth only (allauth). Local signup/login is handled by users.views.
    path('accounts/', include('allauth.urls')),
    # Everything else is the React app (client-side routing). Must stay last.
    re_path(r'^(?P<rest>(?!api/|accounts/|static/|%s/).*)$' % settings.ADMIN_URL, spa_index),
]
