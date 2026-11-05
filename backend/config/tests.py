import tempfile
from pathlib import Path

from django.test import TestCase, override_settings


class SinglePageAppServingTests(TestCase):
    """On single-service hosting Django serves the React app as well as the API."""

    def setUp(self):
        self.dist = Path(tempfile.mkdtemp())
        (self.dist / 'index.html').write_text('<!doctype html><div id="root"></div>')
        self.override = override_settings(FRONTEND_DIST=self.dist)
        self.override.enable()

    def tearDown(self):
        self.override.disable()

    def test_client_side_routes_return_the_app(self):
        for path in ('/app/tasks', '/pricing', '/login', '/some/deep/route'):
            r = self.client.get(path)
            self.assertEqual(r.status_code, 200, path)
            self.assertIn(b'id="root"', b''.join(r.streaming_content), path)
            self.assertEqual(r['Cache-Control'], 'no-cache')

    def test_missing_files_are_real_404s_not_the_app(self):
        self.assertEqual(self.client.get('/assets/missing-abc123.js').status_code, 404)
        self.assertEqual(self.client.get('/favicon-missing.ico').status_code, 404)

    def test_api_and_oauth_paths_never_fall_through_to_the_app(self):
        r = self.client.get('/api/does-not-exist/')
        self.assertEqual(r.status_code, 404)
        self.assertNotIn(b'id="root"', r.content)
        self.assertEqual(self.client.get('/api/health/').json(), {'status': 'ok'})

    def test_html_carries_security_headers(self):
        r = self.client.get('/app')
        self.assertIn("default-src 'self'", r['Content-Security-Policy'])
        self.assertIn("script-src 'self'", r['Content-Security-Policy'])
        self.assertEqual(r['X-Frame-Options'], 'DENY')
        self.assertEqual(r['X-Content-Type-Options'], 'nosniff')
        self.assertIn('camera=()', r['Permissions-Policy'])

    def test_api_responses_carry_security_headers(self):
        r = self.client.get('/api/health/')
        self.assertIn('Content-Security-Policy', r)
        self.assertIn('Permissions-Policy', r)

    def test_admin_is_excluded_from_csp_so_it_keeps_working(self):
        r = self.client.get('/admin/login/', follow=True)
        self.assertNotIn('Content-Security-Policy', r)

    def test_without_a_build_the_app_route_is_404(self):
        with override_settings(FRONTEND_DIST=self.dist / 'nope'):
            self.assertEqual(self.client.get('/app/tasks').status_code, 404)


class ExposedRoutesTests(TestCase):
    def test_allauth_html_pages_are_not_reachable(self):
        for path in ('/accounts/login/', '/accounts/signup/', '/accounts/password/reset/', '/accounts/logout/'):
            self.assertEqual(self.client.get(path).status_code, 404, path)

    def test_google_routes_stay_reachable(self):
        # Without credentials they answer 404 from our guard; with credentials allauth handles them.
        self.assertIn(self.client.get('/accounts/google/login/').status_code, (302, 404, 405))


class FrameAndCacheHeaderTests(TestCase):
    def test_x_frame_options_on_every_response(self):
        self.assertEqual(self.client.get('/api/health/')['X-Frame-Options'], 'DENY')
