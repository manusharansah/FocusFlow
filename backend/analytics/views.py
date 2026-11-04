from datetime import timedelta

from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from datetime import datetime, time

from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response

from tasks.models import FocusSession, Task


def _last_days(n):
    today = timezone.localdate()
    return [today - timedelta(days=n - 1 - i) for i in range(n)]


@api_view(['GET'])
def get_analytics(request):
    user = request.user
    days = _last_days(7)
    since = timezone.make_aware(datetime.combine(days[0], time.min))
    tasks = Task.objects.filter(user=user)

    by_priority = dict(tasks.values_list('priority').annotate(c=Count('id')))
    total = sum(by_priority.values())
    completed = tasks.filter(completed=True).count()

    done_per_day = dict(
        tasks.filter(completed=True, completed_at__gte=since)
        .annotate(d=TruncDate('completed_at')).values_list('d').annotate(c=Count('id')))

    payload = {
        'total_tasks': total,
        'completed_tasks': completed,
        'pending_tasks': total - completed,
        'tasks_by_priority': {p: by_priority.get(p, 0) for p in ('high', 'medium', 'low')},
        'daily_completion': [{'date': d.strftime('%m/%d'), 'completed': done_per_day.get(d, 0)} for d in days],
        'focus_data': {},
    }

    if user.is_premium:  # advanced analytics
        sessions = FocusSession.objects.filter(user=user)
        minutes_per_day = dict(
            sessions.filter(completed=True, started_at__gte=since)
            .annotate(d=TruncDate('started_at')).values_list('d').annotate(m=Sum('duration_minutes')))
        payload['focus_data'] = {
            'total_focus_time': sessions.filter(completed=True).aggregate(m=Sum('duration_minutes'))['m'] or 0,
            'total_sessions': sessions.filter(completed=True).count(),
            'daily_focus': [{'date': d.strftime('%m/%d'), 'minutes': minutes_per_day.get(d, 0)} for d in days],
        }
    return Response(payload)
