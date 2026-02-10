from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Task
from .serializers import TaskSerializer
from .models import Task, FocusSession
from .serializers import TaskSerializer, FocusSessionSerializer
from rest_framework.decorators import action

from rest_framework.decorators import action
from rest_framework import viewsets, status
from rest_framework.response import Response

class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Task.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        # Free users limited to 10 tasks
        if not self.request.user.is_premium:
            task_count = Task.objects.filter(user=self.request.user).count()
            if task_count >= 10:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Free users can only create 10 tasks. Upgrade to Premium!")
        
        serializer.save(user=self.request.user)




class TaskViewSet(viewsets.ModelViewSet):
    # ... existing code ...
    
    @action(detail=False, methods=['post'], url_path='focus-session')
    def create_focus_session(self, request):
        # Only premium users
        if not request.user.is_premium:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Focus Timer is a Premium feature!")
        
        serializer = FocusSessionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'], url_path='focus-sessions')
    def get_focus_sessions(self, request):
        if not request.user.is_premium:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Focus Timer is a Premium feature!")
        
        sessions = FocusSession.objects.filter(user=request.user)
        serializer = FocusSessionSerializer(sessions, many=True)
        return Response(serializer.data)