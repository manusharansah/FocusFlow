from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from tasks.models import Task, FocusSession
from django.db.models import Count
from django.utils import timezone
from datetime import timedelta

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_analytics(request):
    user = request.user
    
    # Get date range (last 7 days)
    today = timezone.now().date()
    week_ago = today - timedelta(days=7)
    
    # Tasks analytics
    total_tasks = Task.objects.filter(user=user).count()
    completed_tasks = Task.objects.filter(user=user, completed=True).count()
    pending_tasks = total_tasks - completed_tasks
    
    # Tasks by priority
    tasks_by_priority = {
        'high': Task.objects.filter(user=user, priority='high').count(),
        'medium': Task.objects.filter(user=user, priority='medium').count(),
        'low': Task.objects.filter(user=user, priority='low').count(),
    }
    
    # Daily completion trend (last 7 days)
    daily_completion = []
    for i in range(7):
        date = today - timedelta(days=6-i)
        count = Task.objects.filter(
            user=user,
            completed=True,
            created_at__date=date
        ).count()
        daily_completion.append({
            'date': date.strftime('%m/%d'),
            'completed': count
        })
    
    # Focus sessions (premium only)
    focus_data = {}
    if user.is_premium:
        total_focus_time = sum(
            session.duration_minutes 
            for session in FocusSession.objects.filter(user=user, completed=True)
        )
        
        # Daily focus time (last 7 days)
        daily_focus = []
        for i in range(7):
            date = today - timedelta(days=6-i)
            sessions = FocusSession.objects.filter(
                user=user,
                started_at__date=date
            )
            total_minutes = sum(s.duration_minutes for s in sessions)
            daily_focus.append({
                'date': date.strftime('%m/%d'),
                'minutes': total_minutes
            })
        
        focus_data = {
            'total_focus_time': total_focus_time,
            'daily_focus': daily_focus,
            'total_sessions': FocusSession.objects.filter(user=user).count()
        }
    
    return Response({
        'total_tasks': total_tasks,
        'completed_tasks': completed_tasks,
        'pending_tasks': pending_tasks,
        'tasks_by_priority': tasks_by_priority,
        'daily_completion': daily_completion,
        'focus_data': focus_data,
    })