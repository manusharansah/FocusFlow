from django.contrib import admin

from .models import FocusSession, Task

admin.site.register(Task)
admin.site.register(FocusSession)
