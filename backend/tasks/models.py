from django.db import models
from users.models import User

class Task(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    due_date = models.DateField(null=True, blank=True)
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title

class FocusSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='focus_sessions')
    duration_minutes = models.IntegerField(default=25)  # Pomodoro default
    task = models.ForeignKey(Task, on_delete=models.SET_NULL, null=True, blank=True)
    completed = models.BooleanField(default=False)
    started_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-started_at']
    
    def __str__(self):
        return f"{self.user.email} - {self.duration_minutes}min"