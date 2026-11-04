from django.utils import timezone
from rest_framework import serializers

from .models import FocusSession, Task


class TaskSerializer(serializers.ModelSerializer):
    title = serializers.CharField(max_length=200, trim_whitespace=True)

    class Meta:
        model = Task
        fields = ['id', 'title', 'description', 'priority', 'status', 'due_date', 'completed', 'completed_at', 'created_at']
        read_only_fields = ['id', 'completed_at', 'created_at']

    def _sync(self, data, current_completed=False):
        """`status` and `completed` always agree; completed_at follows."""
        if 'status' in data:
            data['completed'] = data['status'] == 'done'
        elif 'completed' in data:
            data['status'] = 'done' if data['completed'] else 'todo'
        if 'completed' in data and data['completed'] != current_completed:
            data['completed_at'] = timezone.now() if data['completed'] else None
        return data

    def update(self, instance, validated_data):
        return super().update(instance, self._sync(validated_data, instance.completed))

    def create(self, validated_data):
        return super().create(self._sync(validated_data))


class FocusSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FocusSession
        fields = ['id', 'duration_minutes', 'task', 'completed', 'started_at']
        read_only_fields = ['id', 'started_at']

    def validate_task(self, task):
        # Prevent linking a session to another user's task (IDOR).
        if task is not None and task.user_id != self.context['request'].user.id:
            raise serializers.ValidationError('Task not found.')
        return task
