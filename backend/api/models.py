from django.db import models
from django.contrib.auth.models import User

class Note(models.Model):
    title = models.CharField(max_length=100)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notes")
    
    def __str__(self):
        return self.title
    
class Project(models.Model):
    title = models.CharField(max_length=20)
    description = models.TextField(blank=True)
    
    def __str__(self):
        return self.title