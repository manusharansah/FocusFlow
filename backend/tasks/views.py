from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from .models import FocusSession, Task
from .serializers import FocusSessionSerializer, TaskSerializer

FREE_TASK_LIMIT = 10


class TaskPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    pagination_class = TaskPagination

    def get_queryset(self):
        qs = Task.objects.filter(user=self.request.user)
        completed = self.request.query_params.get('completed')
        if completed in ('true', 'false'):
            qs = qs.filter(completed=(completed == 'true'))
        params = self.request.query_params
        if params.get('status') in ('todo', 'in_progress', 'done'):
            qs = qs.filter(status=params['status'])
        if params.get('priority') in ('low', 'medium', 'high'):
            qs = qs.filter(priority=params['priority'])
        search = params.get('search', '').strip()[:100]
        if search:
            qs = qs.filter(title__icontains=search)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        with transaction.atomic():
            # Lock the user row so parallel requests cannot all pass the limit check.
            type(user).objects.select_for_update().get(pk=user.pk)
            if not user.is_premium and Task.objects.filter(user=user).count() >= FREE_TASK_LIMIT:
                raise PermissionDenied(f'The free plan is limited to {FREE_TASK_LIMIT} tasks. Upgrade to Premium for unlimited tasks.')
            serializer.save(user=user)

    @action(detail=False, methods=['post'], url_path='focus-session')
    def create_focus_session(self, request):
        if not request.user.is_premium:
            raise PermissionDenied('The focus timer is a Premium feature.')
        serializer = FocusSessionSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='focus-sessions')
    def get_focus_sessions(self, request):
        if not request.user.is_premium:
            raise PermissionDenied('The focus timer is a Premium feature.')
        sessions = FocusSession.objects.filter(user=request.user)[:100]
        return Response(FocusSessionSerializer(sessions, many=True, context={'request': request}).data)
