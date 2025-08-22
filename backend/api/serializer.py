from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Project

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "password"]
        extra_kwargs = {"password": {"write_only": True}} # Accept password when only creating a new user
        
    def create(self, validated_data):
        user = User.objects.create_user(**validated_data) # ** Splits keywords
        return user
    
class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = "__all__"