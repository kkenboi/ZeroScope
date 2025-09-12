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
    """Base serializer for emission factors with full validation and Brightway2 uncertainty support"""
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    uncertainty_type_display = serializers.CharField(source='get_uncertainty_type_display', read_only=True)
    has_uncertainty = serializers.ReadOnlyField()
    uncertainty_description = serializers.CharField(source='get_uncertainty_description', read_only=True)
    scope_3_category_display = serializers.CharField(source='get_scope_3_category_display', read_only=True)

    class Meta:
        model = EmissionFactor
        fields = [
            'factor_id', 'name', 'category', 'category_display', 'applicable_scopes',
            'scope_3_category', 'scope_3_category_display', 'emission_factor_value', 'unit', 
            'source', 'year', 'description', 'sub_category', 'uncertainty_type', 
            'uncertainty_type_display', 'uncertainty_params', 'has_uncertainty', 
            'uncertainty_description', 'imported_category', 'imported_sub_category',
            'created_date', 'last_modified'
        ]
        read_only_fields = ['factor_id', 'created_date', 'last_modified']

    def validate(self, attrs):
        """Comprehensive validation including uncertainty parameters"""
        uncertainty_type = attrs.get('uncertainty_type', 0)
        uncertainty_params = attrs.get('uncertainty_params')
        applicable_scopes = attrs.get('applicable_scopes', [])
        scope_3_category = attrs.get('scope_3_category')
        
        # Validate scope 3 category requirement
        if 3 in applicable_scopes and not scope_3_category:
            raise serializers.ValidationError({
                'scope_3_category': 'Scope 3 category is required when scope 3 is in applicable scopes'
            })
        
        # Uncertainty validation
        if uncertainty_type and uncertainty_type > 0:
            if not uncertainty_params:
                raise serializers.ValidationError({
                    'uncertainty_params': 'Uncertainty parameters are required when uncertainty type is specified'
                })
            
            # Validate required parameters based on uncertainty type
            required_params = self._get_required_uncertainty_params(uncertainty_type)
            if required_params:
                missing_params = [param for param in required_params if param not in uncertainty_params]
                if missing_params:
                    uncertainty_type_name = dict(EmissionFactor.UNCERTAINTY_TYPE_CHOICES).get(uncertainty_type, 'Unknown')
                    raise serializers.ValidationError({
                        'uncertainty_params': f'Missing required parameters for {uncertainty_type_name}: {", ".join(missing_params)}'
                    })
        
        return attrs
    
    def _get_required_uncertainty_params(self, uncertainty_type):
        """Get required parameters for each uncertainty type"""
        param_requirements = {
            1: ['sigma'],  # Lognormal: needs sigma (geometric standard deviation)
            2: ['sigma'],  # Normal: needs sigma (standard deviation)
            3: ['min', 'max'],  # Uniform: needs min and max
            4: ['min', 'max'],  # Triangular: needs min, max (mode optional)
            5: ['min', 'max', 'alpha', 'beta'],  # Beta: needs min, max, alpha, beta
        }
        return param_requirements.get(uncertainty_type, [])


class CategoryInfoSerializer(serializers.Serializer):
    """Serializer for category information"""
    category = serializers.CharField()
    category_label = serializers.CharField()
    scope = serializers.IntegerField()

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

