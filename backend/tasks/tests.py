from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from users.models import User

NOCACHE = override_settings(CACHES={'default': {'BACKEND': 'django.core.cache.backends.dummy.DummyCache'}})


@NOCACHE
class TaskTests(TestCase):
    def setUp(self):
        self.a = User.objects.create_user('a', 'a@x.io', 'pw-123456789')
        self.b = User.objects.create_user('b', 'b@x.io', 'pw-123456789', is_premium=True)
        self.c = APIClient()
        self.c.force_authenticate(self.a)

    def test_auth_required(self):
        self.assertEqual(APIClient().get('/api/tasks/').status_code, 401)

    def test_users_cannot_see_or_modify_others_tasks(self):
        t = self.c.post('/api/tasks/', {'title': 'mine'}, format='json').data
        other = APIClient(); other.force_authenticate(self.b)
        self.assertEqual(other.get('/api/tasks/').data['count'], 0)
        self.assertEqual(other.get(f"/api/tasks/{t['id']}/").status_code, 404)
        self.assertEqual(other.patch(f"/api/tasks/{t['id']}/", {'title': 'x'}, format='json').status_code, 404)
        self.assertEqual(other.delete(f"/api/tasks/{t['id']}/").status_code, 404)

    def test_user_field_cannot_be_spoofed(self):
        r = self.c.post('/api/tasks/', {'title': 't', 'user': self.b.pk}, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(self.a.tasks.count(), 1)

    def test_free_limit_and_premium_unlimited(self):
        for i in range(10):
            self.assertEqual(self.c.post('/api/tasks/', {'title': f't{i}'}, format='json').status_code, 201)
        self.assertEqual(self.c.post('/api/tasks/', {'title': 'x'}, format='json').status_code, 403)
        p = APIClient(); p.force_authenticate(self.b)
        for i in range(12):
            self.assertEqual(p.post('/api/tasks/', {'title': f't{i}'}, format='json').status_code, 201)

    def test_completed_at_tracks_toggle(self):
        t = self.c.post('/api/tasks/', {'title': 't'}, format='json').data
        r = self.c.patch(f"/api/tasks/{t['id']}/", {'completed': True}, format='json')
        self.assertIsNotNone(r.data['completed_at'])
        r = self.c.patch(f"/api/tasks/{t['id']}/", {'completed': False}, format='json')
        self.assertIsNone(r.data['completed_at'])

    def test_focus_session_premium_only_and_ownership(self):
        self.assertEqual(self.c.post('/api/tasks/focus-session/', {'duration_minutes': 25}, format='json').status_code, 403)
        mine = self.c.post('/api/tasks/', {'title': 't'}, format='json').data
        p = APIClient(); p.force_authenticate(self.b)
        # premium user may not attach someone else's task
        r = p.post('/api/tasks/focus-session/', {'duration_minutes': 25, 'task': mine['id']}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(p.post('/api/tasks/focus-session/', {'duration_minutes': 9999}, format='json').status_code, 400)
        self.assertEqual(p.post('/api/tasks/focus-session/', {'duration_minutes': 25, 'completed': True}, format='json').status_code, 201)

    def test_analytics_scoped_and_gated(self):
        self.c.post('/api/tasks/', {'title': 't', 'priority': 'high'}, format='json')
        r = self.c.get('/api/analytics/stats/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['total_tasks'], 1)
        self.assertEqual(r.data['focus_data'], {})
        p = APIClient(); p.force_authenticate(self.b)
        self.assertEqual(p.get('/api/analytics/stats/').data['total_tasks'], 0)
        self.assertIn('daily_focus', p.get('/api/analytics/stats/').data['focus_data'])

    def test_status_and_completed_stay_in_sync_and_filters(self):
        t = self.c.post('/api/tasks/', {'title': 'Alpha'}, format='json').data
        self.assertEqual(t['status'], 'todo')
        r = self.c.patch(f"/api/tasks/{t['id']}/", {'status': 'done'}, format='json').data
        self.assertTrue(r['completed']); self.assertIsNotNone(r['completed_at'])
        r = self.c.patch(f"/api/tasks/{t['id']}/", {'status': 'in_progress'}, format='json').data
        self.assertFalse(r['completed']); self.assertIsNone(r['completed_at'])
        self.c.post('/api/tasks/', {'title': 'Beta', 'priority': 'high'}, format='json')
        self.assertEqual(self.c.get('/api/tasks/?search=alp').data['count'], 1)
        self.assertEqual(self.c.get('/api/tasks/?priority=high').data['count'], 1)
        self.assertEqual(self.c.get('/api/tasks/?status=in_progress').data['count'], 1)

    def test_focus_session_task_error_is_uniform(self):
        p = APIClient(); p.force_authenticate(self.b)
        foreign = self.c.post('/api/tasks/', {'title': 't'}, format='json').data['id']
        a = p.post('/api/tasks/focus-session/', {'duration_minutes': 25, 'task': foreign}, format='json')
        b = p.post('/api/tasks/focus-session/', {'duration_minutes': 25, 'task': 999999}, format='json')
        self.assertEqual((a.status_code, a.data), (b.status_code, b.data))

    def test_page_size_param_is_capped(self):
        p = APIClient(); p.force_authenticate(self.b)
        for i in range(3):
            p.post('/api/tasks/', {'title': f't{i}'}, format='json')
        self.assertEqual(len(p.get('/api/tasks/?page_size=2').data['results']), 2)
        self.assertEqual(len(p.get('/api/tasks/?page_size=100000').data['results']), 3)
