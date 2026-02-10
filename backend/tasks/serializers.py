from rest_framework import serializers
from .models import Task

class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ['id', 'title', 'description', 'priority', 'due_date', 'completed', 'created_at']
        read_only_fields = ['created_at']

from .models import Task, FocusSession

class FocusSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FocusSession
        fields = ['id', 'duration_minutes', 'task', 'completed', 'started_at']
        read_only_fields = ['started_at']