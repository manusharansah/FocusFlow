from rest_framework.throttling import AnonRateThrottle


class AuthRateThrottle(AnonRateThrottle):
    scope = 'auth'


class SensitiveRateThrottle(AnonRateThrottle):
    scope = 'sensitive'


class RefreshRateThrottle(AnonRateThrottle):
    scope = 'refresh'
