from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Project, EmissionScope, LCAProduct

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "password"]
        extra_kwargs = {"password": {"write_only": True}} # Accept password when only creating a new user
        
    def create(self, validated_data):
        user = User.objects.create_user(**validated_data) # ** Splits keywords
        return user       

class EmissionScopeSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmissionScope
        fields = ["scope_id", "scope_number", "total_emissions_tco2e"]


class LCAProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = LCAProduct
        fields = ["lca_id", "name", "functional_unit", "total_carbon_footprint_per_unit"]

# This serialiser is dependent on the the other two serialisers
class ProjectSerializer(serializers.ModelSerializer):
    scopes = EmissionScopeSerializer(many=True, read_only=True)
    lca_products = LCAProductSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = ["project_id", "name", "description", "created_date", "last_modified", "scopes", "lca_products"]
        read_only_fields = ['project_id', 'created_date', 'last_modified']  # Add last_modified to read-only

