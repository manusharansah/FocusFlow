"""Security headers for responses served by Django itself (the SPA, static files and the API).

With a separate web server (nginx or Caddy) these are set there; on single-service hosting such as Render this
middleware provides them. The Django admin is excluded from the CSP because it uses inline scripts.
"""
from django.conf import settings

CSP = (
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; "
    "font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; "
    "form-action 'self' https://accounts.google.com; object-src 'none'"
)
PERMISSIONS = 'camera=(), microphone=(), geolocation=(), payment=()'


class SecurityHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if not request.path.startswith(f'/{settings.ADMIN_URL}/'):
            response.headers.setdefault('Content-Security-Policy', CSP)
        response.headers.setdefault('Permissions-Policy', PERMISSIONS)
        response.headers.setdefault('X-Frame-Options', 'DENY')
        return response
