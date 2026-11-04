from django.conf import settings


def set_refresh_cookie(response, refresh_token):
    response.set_cookie(
        settings.REFRESH_COOKIE_NAME,
        str(refresh_token),
        max_age=int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()),
        httponly=True,
        secure=not settings.DEBUG,
        samesite='Lax',
        path=settings.REFRESH_COOKIE_PATH,
    )


def clear_refresh_cookie(response):
    response.delete_cookie(settings.REFRESH_COOKIE_NAME, path=settings.REFRESH_COOKIE_PATH, samesite='Lax')
