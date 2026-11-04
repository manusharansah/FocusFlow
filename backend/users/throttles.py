from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle


class AuthRateThrottle(AnonRateThrottle):
    scope = 'auth'


class RefreshRateThrottle(AnonRateThrottle):
    scope = 'refresh'


class SensitiveRateThrottle(SimpleRateThrottle):
    """Applies to anonymous AND authenticated callers (AnonRateThrottle skips logged-in users)."""
    scope = 'sensitive'

    def get_cache_key(self, request, view):
        who = request.user.pk if request.user and request.user.is_authenticated else self.get_ident(request)
        return self.cache_format % {'scope': self.scope, 'ident': who}
