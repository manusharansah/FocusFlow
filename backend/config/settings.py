"""
FocusFlow settings. All environment-specific values come from environment
variables (see .env.example). Secure defaults: DEBUG is off and a SECRET_KEY
is required unless DEBUG=True.
"""
import os
from datetime import timedelta
from pathlib import Path

import sys

import dj_database_url
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')


def env_bool(name, default=False):
    return os.environ.get(name, str(default)).strip().lower() in ('1', 'true', 'yes', 'on')


def env_list(name, default=''):
    return [v.strip() for v in os.environ.get(name, default).split(',') if v.strip()]


DEBUG = env_bool('DEBUG', False)
TESTING = 'test' in sys.argv[:2]

SECRET_KEY = os.environ.get('SECRET_KEY', '')
if not SECRET_KEY:
    if DEBUG or TESTING:
        SECRET_KEY = 'insecure-dev-only-key-do-not-use-in-production'
    else:
        raise ImproperlyConfigured('SECRET_KEY environment variable is required when DEBUG is off.')

FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000' if DEBUG or TESTING else '').rstrip('/')
BACKEND_URL = os.environ.get('BACKEND_URL', 'http://localhost:8000' if DEBUG or TESTING else '').rstrip('/')
if not DEBUG and not TESTING and not (FRONTEND_URL and BACKEND_URL):
    raise ImproperlyConfigured('FRONTEND_URL and BACKEND_URL are required when DEBUG is off.')

ALLOWED_HOSTS = env_list('ALLOWED_HOSTS', 'localhost,127.0.0.1' if DEBUG or TESTING else '')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',

    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',

    'users',
    'tasks',
    'payments',
    'analytics',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'allauth.account.middleware.AccountMiddleware',
]

ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'

TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [],
    'APP_DIRS': True,
    'OPTIONS': {'context_processors': [
        'django.template.context_processors.request',
        'django.contrib.auth.context_processors.auth',
        'django.contrib.messages.context_processors.messages',
    ]},
}]

# --- Database -------------------------------------------------------------
# PostgreSQL via DATABASE_URL in production; SQLite file (git-ignored) for dev.
DATABASES = {
    'default': dj_database_url.config(
        default=f'sqlite:///{BASE_DIR / "db.sqlite3"}',
        conn_max_age=600,
        conn_health_checks=True,
    )
}
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# --- Cache (used for throttling) -----------------------------------------
if os.environ.get('REDIS_URL'):
    CACHES = {'default': {'BACKEND': 'django.core.cache.backends.redis.RedisCache',
                          'LOCATION': os.environ['REDIS_URL']}}
else:
    CACHES = {'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}

# --- Auth ------------------------------------------------------------------
AUTH_USER_MODEL = 'users.User'
SITE_ID = 1
AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend',
]
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
     'OPTIONS': {'min_length': 10}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]
PASSWORD_RESET_TIMEOUT = 60 * 60  # 1 hour

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': ('rest_framework_simplejwt.authentication.JWTAuthentication',),
    'DEFAULT_PERMISSION_CLASSES': ('rest_framework.permissions.IsAuthenticated',),
    'DEFAULT_RENDERER_CLASSES': ('rest_framework.renderers.JSONRenderer',),
    'DEFAULT_PARSER_CLASSES': ('rest_framework.parsers.JSONParser',),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
    # Number of trusted reverse proxies in front of the app; DRF then ignores client-supplied XFF entries.
    'NUM_PROXIES': int(os.environ.get('NUM_PROXIES', '1')),
    'DEFAULT_THROTTLE_CLASSES': (
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'anon': '60/min',
        'user': '300/min',
        'auth': '20/min',          # per IP; brute force is additionally capped per account (users.views.LOGIN_ATTEMPTS)
        'refresh': '60/min',       # session restore on page load
        'sensitive': '5/hour',     # password reset, verification e-mails
        'payments': '20/hour',
    },
}

# Access tokens are short-lived and kept in memory by the SPA. The refresh
# token lives in an HttpOnly cookie (see users.cookies) and is rotated and
# blacklisted on every use.
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=14),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}
REFRESH_COOKIE_NAME = 'ff_refresh'
REFRESH_COOKIE_PATH = '/api/users/'

# --- django-allauth (Google sign-in only; local accounts use users.views) --
ACCOUNT_ADAPTER = 'users.adapters.NoLocalSignupAccountAdapter'
SOCIALACCOUNT_ADAPTER = 'users.adapters.SocialAdapter'
ACCOUNT_LOGIN_METHODS = {'email'}
ACCOUNT_SIGNUP_FIELDS = ['email*', 'username*', 'password1*', 'password2*']
ACCOUNT_USER_MODEL_USERNAME_FIELD = 'username'
ACCOUNT_EMAIL_VERIFICATION = 'none'
SOCIALACCOUNT_AUTO_SIGNUP = True
SOCIALACCOUNT_EMAIL_AUTHENTICATION = False   # never auto-link by e-mail (account-takeover risk)
SOCIALACCOUNT_LOGIN_ON_GET = False           # sign-in must be a CSRF-protected POST
LOGIN_REDIRECT_URL = '/api/users/oauth-complete/'
ACCOUNT_LOGOUT_REDIRECT_URL = FRONTEND_URL or '/'
SOCIALACCOUNT_PROVIDERS = {'google': {
    'SCOPE': ['profile', 'email'],
    'AUTH_PARAMS': {'access_type': 'online'},
    'OAUTH_PKCE_ENABLED': True,
    'APPS': [{
        'client_id': os.environ.get('GOOGLE_CLIENT_ID', ''),
        'secret': os.environ.get('GOOGLE_CLIENT_SECRET', ''),
        'key': '',
    }],
}}
GOOGLE_ENABLED = bool(os.environ.get('GOOGLE_CLIENT_ID') and os.environ.get('GOOGLE_CLIENT_SECRET'))

# --- CORS / CSRF -----------------------------------------------------------
# Production serves SPA and API from the same site (see docs/DEPLOYMENT.md),
# so CORS is only needed for explicitly listed origins.
CORS_ALLOWED_ORIGINS = env_list('CORS_ALLOWED_ORIGINS', FRONTEND_URL)
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = env_list('CSRF_TRUSTED_ORIGINS', ','.join(filter(None, [FRONTEND_URL, BACKEND_URL])))

# --- Transport / cookie / header hardening --------------------------------
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_AGE = 60 * 60 * 24  # allauth session only bridges the OAuth redirect
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
SECURE_CROSS_ORIGIN_OPENER_POLICY = 'same-origin'
X_FRAME_OPTIONS = 'DENY'
if not DEBUG:
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_SSL_REDIRECT = env_bool('SECURE_SSL_REDIRECT', True)
if env_bool('BEHIND_PROXY', False):
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    USE_X_FORWARDED_HOST = True
DATA_UPLOAD_MAX_MEMORY_SIZE = 1024 * 256

ADMIN_URL = os.environ.get('ADMIN_URL', 'admin').strip('/')

# --- Stripe ----------------------------------------------------------------
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY', '')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')
STRIPE_PRICE_IDS = {
    'monthly': os.environ.get('STRIPE_PRICE_ID_MONTHLY', ''),
    'yearly': os.environ.get('STRIPE_PRICE_ID_YEARLY', ''),
}
STRIPE_AUTOMATIC_TAX = env_bool('STRIPE_AUTOMATIC_TAX', False)

# --- E-mail ---------------------------------------------------------------
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'FocusFlow <no-reply@localhost>')
if os.environ.get('EMAIL_HOST'):
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = os.environ['EMAIL_HOST']
    EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
    EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
    EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
    EMAIL_USE_TLS = env_bool('EMAIL_USE_TLS', True)
elif DEBUG or TESTING:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
else:
    # Never print password-reset/verification links to production logs.
    raise ImproperlyConfigured('EMAIL_HOST is required when DEBUG is off (verification and reset e-mails).')

# --- Static / i18n ---------------------------------------------------------
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage'
                    if not (DEBUG or TESTING) else 'django.contrib.staticfiles.storage.StaticFilesStorage'},
}
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# --- Logging (never log request bodies, tokens or card data) ----------------
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {'std': {'format': '%(asctime)s %(levelname)s %(name)s %(message)s'}},
    'handlers': {'console': {'class': 'logging.StreamHandler', 'formatter': 'std'}},
    'root': {'handlers': ['console'], 'level': 'INFO'},
}

if os.environ.get('SENTRY_DSN'):
    import sentry_sdk
    sentry_sdk.init(dsn=os.environ['SENTRY_DSN'], send_default_pii=False, traces_sample_rate=0.05)
