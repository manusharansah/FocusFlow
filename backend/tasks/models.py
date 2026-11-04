from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Task(models.Model):
    PRIORITY_CHOICES = [('low', 'Low'), ('medium', 'Medium'), ('high', 'High')]
    STATUS_CHOICES = [('todo', 'To do'), ('in_progress', 'In progress'), ('done', 'Done')]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, max_length=5000)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default='todo')
    due_date = models.DateField(null=True, blank=True)
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'completed']),
            models.Index(fields=['user', 'completed_at']),
        ]

    def __str__(self):
        return self.title


class FocusSession(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='focus_sessions')
    duration_minutes = models.PositiveSmallIntegerField(
        default=25, validators=[MinValueValidator(1), MaxValueValidator(180)])
    task = models.ForeignKey(Task, on_delete=models.SET_NULL, null=True, blank=True)
    completed = models.BooleanField(default=False)
    started_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-started_at']
        indexes = [models.Index(fields=['user', 'started_at'])]

    def __str__(self):
        return f'{self.user_id} - {self.duration_minutes}min'
