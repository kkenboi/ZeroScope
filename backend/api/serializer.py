from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Project
from .models import EmissionScope, EmissionFactor, EmissionActivity
from .models import LCAProduct

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "password"]
        extra_kwargs = {"password": {"write_only": True}} # Accept password when only creating a new user
        
    def create(self, validated_data):
        user = User.objects.create_user(**validated_data) # ** Splits keywords
        return user       

class EmissionFactorSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmissionFactor
        fields = "__all__"

class EmissionScopeSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmissionScope
        fields = ["scope_id", "scope_number", "total_emissions_tco2e"]

class EmissionActivitySerializer(serializers.ModelSerializer):
    emission_factor = EmissionFactorSerializer(read_only=True)
    emission_factor_id = serializers.UUIDField(write_only=True)
    scope_number = serializers.IntegerField(write_only=True, required=False)
    # scope is set server-side via scope_number; expose as read-only in responses
    scope = serializers.PrimaryKeyRelatedField(read_only=True)
    quantity = serializers.DecimalField(max_digits=15, decimal_places=6)
    calculated_emissions = serializers.DecimalField(max_digits=15, decimal_places=6, read_only=True)

    class Meta:
        model = EmissionActivity
        fields = [
            "activity_id",
            "project",
            "scope",
            "activity_name",
            "description",
            "quantity",
            "unit",
            "scope3_category",
            "emission_factor",
            "emission_factor_id",
            "scope_number",
            "calculated_emissions",
        ]

    def create(self, validated_data):
        factor_id = validated_data.pop("emission_factor_id")
        factor = EmissionFactor.objects.get(pk=factor_id)
        validated_data["emission_factor"] = factor
        
        # Allow creating/finding scope by scope_number if provided
        scope_number = validated_data.pop("scope_number", None)
        if scope_number is not None:
            project = validated_data.get("project")
            # project may be a PK (UUID) or an instance depending on DRF behavior
            if not isinstance(project, Project):
                project = Project.objects.get(pk=project)
                validated_data["project"] = project
            scope_obj, _ = EmissionScope.objects.get_or_create(
                project=project,
                scope_number=scope_number,
            )
            validated_data["scope"] = scope_obj
        
        return super().create(validated_data)

    def validate(self, attrs):
        scope_number = attrs.get("scope_number")
        # If scope 3 is being created, require scope3_category
        if scope_number == 3 and not attrs.get("scope3_category"):
            raise serializers.ValidationError({"scope3_category": "This field is required for Scope 3 activities."})
        return attrs

class EmissionActivityListSerializer(serializers.ModelSerializer):
    emission_factor = EmissionFactorSerializer(read_only=True)
    quantity = serializers.DecimalField(max_digits=15, decimal_places=6)
    calculated_emissions = serializers.DecimalField(max_digits=15, decimal_places=6)

    class Meta:
        model = EmissionActivity
        fields = [
            "activity_id",
            "activity_name",
            "description",
            "quantity",
            "unit",
            "emission_factor",
            "calculated_emissions",
        ]


class LCAProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = LCAProduct
        fields = ["lca_id", "name", "functional_unit", "total_carbon_footprint_per_unit"]

# This serialiser is dependent on the the other two serialisers
class ProjectSerializer(serializers.ModelSerializer):
    class ScopeWithActivitiesSerializer(serializers.ModelSerializer):
        activities = EmissionActivityListSerializer(many=True, read_only=True)

        class Meta:
            model = EmissionScope
            fields = ["scope_id", "scope_number", "total_emissions_tco2e", "activities"]

    scopes = ScopeWithActivitiesSerializer(many=True, read_only=True)
    lca_products = LCAProductSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = ["project_id", "name", "description", "created_date", "last_modified", "scopes", "lca_products"]
        read_only_fields = ['project_id', 'created_date', 'last_modified']  # Add last_modified to read-only

