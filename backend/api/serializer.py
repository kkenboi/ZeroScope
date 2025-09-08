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
    """Base serializer for emission factors with full validation"""
    scope = serializers.ReadOnlyField()
    scope_display = serializers.ReadOnlyField()
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    valid_units = serializers.SerializerMethodField()

    class Meta:
        model = EmissionFactor
        fields = [
            'factor_id', 'name', 'category', 'category_display', 'scope', 'scope_display',
            'emission_factor_value', 'unit', 'valid_units', 'source', 'year',
            'description', 'sub_category', 'entry_type', 'guided_parameters',
            'created_date', 'last_modified'
        ]
        read_only_fields = ['factor_id', 'created_date', 'last_modified', 'scope', 'scope_display']

    def get_valid_units(self, obj):
        """Return valid units for this category"""
        return EmissionFactor.get_valid_units_for_category(obj.category)

    def validate(self, attrs):
        """Comprehensive validation"""
        category = attrs.get('category')
        unit = attrs.get('unit')
        
        # Unit-category validation
        if category and unit:
            if not EmissionFactor.validate_unit_for_category(category, unit):
                valid_units = EmissionFactor.get_valid_units_for_category(category)
                raise serializers.ValidationError({
                    'unit': f"Unit '{unit}' is not valid for category '{category}'. "
                           f"Valid units are: {', '.join(valid_units)}"
                })
        
        return attrs


class SimpleEmissionFactorSerializer(EmissionFactorSerializer):
    """Simplified serializer for direct emission factor entry"""
    
    class Meta(EmissionFactorSerializer.Meta):
        fields = [
            'factor_id', 'name', 'category', 'category_display', 'scope', 'scope_display',
            'emission_factor_value', 'unit', 'valid_units', 'source', 'year',
            'description', 'sub_category', 'created_date', 'last_modified'
        ]
    
    def create(self, validated_data):
        """Create emission factor with simple entry type"""
        validated_data['entry_type'] = 'simple'
        return super().create(validated_data)


class GuidedEmissionFactorSerializer(EmissionFactorSerializer):
    """Enhanced serializer for guided emission factor entry with category-specific validation"""
    
    class Meta(EmissionFactorSerializer.Meta):
        fields = EmissionFactorSerializer.Meta.fields  # Include all fields including guided_parameters
    
    def create(self, validated_data):
        """Create emission factor with guided entry type"""
        validated_data['entry_type'] = 'guided'
        return super().create(validated_data)
    
    def validate(self, attrs):
        """Enhanced validation including guided parameters"""
        attrs = super().validate(attrs)
        
        category = attrs.get('category')
        guided_params = attrs.get('guided_parameters', {})
        
        # Category-specific guided parameter validation
        if category and guided_params:
            self._validate_guided_parameters(category, guided_params)
        
        return attrs
    
    def _validate_guided_parameters(self, category, guided_params):
        """Validate guided parameters based on category"""
        
        # Fuel combustion validation
        if category == 'fuel_combustion':
            required_params = ['fuel_type', 'measurement_type']
            for param in required_params:
                if param not in guided_params:
                    raise serializers.ValidationError({
                        'guided_parameters': f'{param} is required for fuel combustion category'
                    })
        
        # Transportation validation (business travel, employee commuting)
        elif category in ['business_travel', 'employee_commuting']:
            if 'transport_mode' not in guided_params:
                raise serializers.ValidationError({
                    'guided_parameters': 'transport_mode is required for transportation categories'
                })
        
        # Transport distribution validation
        elif category in ['upstream_transport', 'downstream_transport']:
            required_params = ['transport_mode', 'transport_type']
            for param in required_params:
                if param not in guided_params:
                    raise serializers.ValidationError({
                        'guided_parameters': f'{param} is required for transport distribution categories'
                    })
        
        # Electricity consumption validation
        elif category == 'electricity_consumption':
            if 'grid_region' not in guided_params:
                raise serializers.ValidationError({
                    'guided_parameters': 'grid_region is required for electricity consumption'
                })


class CategoryInfoSerializer(serializers.Serializer):
    """Serializer for category information with valid units"""
    category = serializers.CharField()
    category_label = serializers.CharField()
    scope = serializers.IntegerField()
    valid_units = serializers.ListField(child=serializers.CharField())


class UnitValidationSerializer(serializers.Serializer):
    """Serializer for unit validation requests"""
    category = serializers.CharField()
    unit = serializers.CharField()
    
    def validate_category(self, value):
        """Validate that category exists"""
        valid_categories = [choice[0] for choice in EmissionFactor.CATEGORY_CHOICES]
        if value not in valid_categories:
            raise serializers.ValidationError(f"Invalid category. Valid options: {', '.join(valid_categories)}")
        return value

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

