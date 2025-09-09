import uuid
from django.utils import timezone
from django.db import models
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from decimal import Decimal


class Project(models.Model):
    project_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    created_date = models.DateTimeField(auto_now_add=True)
    last_modified = models.DateTimeField(auto_now=True)  # Add this field

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # This ensures last_modified is updated on every save
        self.last_modified = timezone.now()
        super().save(*args, **kwargs)

# Scope 1 2 3
class EmissionScope(models.Model):
    scope_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="scopes")
    scope_number = models.IntegerField(
        choices=[(1, "Scope 1"), (2, "Scope 2"), (3, "Scope 3")]
    )
    total_emissions_tco2e = models.DecimalField(max_digits=15, decimal_places=6, default=0)

    class Meta:
        unique_together = ['project', 'scope_number']  # One scope per number per project

    def calculate_total_emissions(self):
        """Calculate total from all activities in this scope"""
        total = self.activities.aggregate(
            total=models.Sum('calculated_emissions')
        )['total'] or 0
        self.total_emissions_tco2e = total
        self.save()
        return total

    def __str__(self):
        return f"Scope {self.scope_number} for {self.project.name}"
        
class EmissionFactor(models.Model):
    """
    Clean, user-focused emission factor model aligned with GHG Protocol.
    All factors standardized to kgCO₂e for consistent calculations.
    Formula: Emissions = Activity Data × Emission Factor
    """
    
    # GHG Protocol Categories - Scope 1, 2, 3
    CATEGORY_CHOICES = [
        # === SCOPE 1: Direct Emissions ===
        ('fuel_combustion', 'Fuel Combustion'),
        ('company_vehicles', 'Company-Owned Vehicles'),
        ('refrigerants_fugitive', 'Refrigerants & Fugitive Emissions'),
        ('process_emissions', 'Industrial Process Emissions'),
        
        # === SCOPE 2: Indirect Energy Emissions ===
        ('electricity_consumption', 'Electricity Consumption'),
        ('purchased_steam_heat_cooling', 'Purchased Steam/Heat/Cooling'),
        
        # === SCOPE 3: Other Indirect Emissions ===
        ('purchased_goods_materials', 'Purchased Goods & Materials (Cat 1)'),
        ('capital_goods', 'Capital Goods (Cat 2)'),
        ('fuel_energy_related', 'Fuel & Energy Related Activities (Cat 3)'),
        ('upstream_transport', 'Upstream Transportation & Distribution (Cat 4)'),
        ('waste_generated', 'Waste Generated in Operations (Cat 5)'),
        ('business_travel', 'Business Travel (Cat 6)'),
        ('employee_commuting', 'Employee Commuting (Cat 7)'),
        ('upstream_leased_assets', 'Upstream Leased Assets (Cat 8)'),
        ('downstream_transport', 'Downstream Transportation & Distribution (Cat 9)'),
        ('processing_sold_products', 'Processing of Sold Products (Cat 10)'),
        ('use_sold_products', 'Use of Sold Products (Cat 11)'),
        ('end_of_life_sold_products', 'End-of-Life Treatment of Sold Products (Cat 12)'),
        ('downstream_leased_assets', 'Downstream Leased Assets (Cat 13)'),
        ('franchises', 'Franchises (Cat 14)'),
        ('investments', 'Investments (Cat 15)'),
        
        # === SPECIAL CATEGORIES ===
        ('water_supply_treatment', 'Water Supply & Treatment'),
        ('spend_based_fallback', 'Spend-Based Calculation'),
    ]
    
    # Scope mapping for categories
    CATEGORY_SCOPES = {
        'fuel_combustion': 1,
        'company_vehicles': 1,
        'refrigerants_fugitive': 1,
        'process_emissions': 1,
        'electricity_consumption': 2,
        'purchased_steam_heat_cooling': 2,
        'purchased_goods_materials': 3,
        'capital_goods': 3,
        'fuel_energy_related': 3,
        'upstream_transport': 3,
        'waste_generated': 3,
        'business_travel': 3,
        'employee_commuting': 3,
        'upstream_leased_assets': 3,
        'downstream_transport': 3,
        'processing_sold_products': 3,
        'use_sold_products': 3,
        'end_of_life_sold_products': 3,
        'downstream_leased_assets': 3,
        'franchises': 3,
        'investments': 3,
        'water_supply_treatment': 3,
        'spend_based_fallback': 3,
    }
    
    # Valid units per category (enforced validation)
    CATEGORY_UNITS = {
        'fuel_combustion': ['kg', 'tonne', 'L', 'm³', 'MJ', 'GJ', 'TJ'],
        'company_vehicles': ['L', 'kg', 'km', 'vehicle-km'],
        'refrigerants_fugitive': ['kg', 'tonne'],
        'process_emissions': ['kg', 'tonne', 'unit', 'batch'],
        'electricity_consumption': ['kWh', 'MWh', 'GWh'],
        'purchased_steam_heat_cooling': ['MJ', 'GJ', 'TJ', 'kWh', 'MWh'],
        'purchased_goods_materials': ['kg', 'tonne', 'm³', 'unit', 'piece', '$', '€', '£'],
        'capital_goods': ['$', '€', '£', 'unit', 'piece'],
        'fuel_energy_related': ['kWh', 'MWh', 'L', 'kg', 'tonne', 'MJ', 'GJ'],
        'upstream_transport': ['tonne-km', 't-km', 'm³-km', '$', '€', '£'],
        'waste_generated': ['kg', 'tonne', 'm³'],
        'business_travel': ['km', 'passenger-km', '$', '€', '£'],
        'employee_commuting': ['km', 'passenger-km', '$', '€', '£'],
        'upstream_leased_assets': ['$', '€', '£', 'm²', 'unit'],
        'downstream_transport': ['tonne-km', 't-km', 'm³-km', '$', '€', '£'],
        'processing_sold_products': ['kg', 'tonne', '$', '€', '£'],
        'use_sold_products': ['kWh', 'MWh', 'MJ', 'GJ', 'unit', 'piece'],
        'end_of_life_sold_products': ['kg', 'tonne', 'm³'],
        'downstream_leased_assets': ['$', '€', '£', 'm²', 'unit'],
        'franchises': ['$', '€', '£', 'unit'],
        'investments': ['$', '€', '£'],
        'water_supply_treatment': ['m³', 'L'],
        'spend_based_fallback': ['$', '€', '£', 'local_currency'],
    }
    
    # Uncertainty type choices for Brightway2 integration
    UNCERTAINTY_TYPE_CHOICES = [
        (0, 'No uncertainty'),
        (1, 'Lognormal'),
        (2, 'Normal'),
        (3, 'Uniform'),
        (4, 'Triangular'),
        (5, 'Beta'),
    ]
    
    # === CORE FIELDS ===
    factor_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Basic information (required)
    name = models.CharField(max_length=255, help_text="Descriptive name of the emission factor")
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, help_text="GHG Protocol category")
    emission_factor_value = models.DecimalField(
        max_digits=20, 
        decimal_places=6, 
        help_text="Emission factor value in kgCO₂e per unit"
    )
    unit = models.CharField(max_length=50, help_text="Unit of measurement (validated against category)")
    
    # Metadata (required for credibility)
    source = models.CharField(max_length=200, help_text="Data source or reference")
    year = models.IntegerField(help_text="Year of publication or applicability")
    
    # Optional details
    description = models.TextField(blank=True, null=True, help_text="Additional notes or context")
    sub_category = models.CharField(max_length=100, blank=True, null=True, help_text="More specific categorization")
    
    # Brightway2 uncertainty analysis fields
    uncertainty_type = models.IntegerField(
        choices=UNCERTAINTY_TYPE_CHOICES,
        default=0,
        help_text="Statistical distribution type for uncertainty analysis (Brightway2 conventions)"
    )
    uncertainty_params = models.JSONField(
        blank=True,
        null=True,
        help_text="Statistical distribution parameters (e.g., {'mean': x, 'sigma': y, 'min': z, 'max': w})"
    )
    
    # System fields
    created_date = models.DateTimeField(auto_now_add=True)
    last_modified = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['category', 'name']
        indexes = [
            models.Index(fields=['category']),
            models.Index(fields=['year']),
            models.Index(fields=['source']),
        ]

    # === UTILITY METHODS ===
    
    @property
    def scope(self):
        """Get the GHG Protocol scope for this category"""
        return self.CATEGORY_SCOPES.get(self.category, None)
    
    @property
    def scope_display(self):
        """Get human-readable scope"""
        scope_num = self.scope
        if scope_num:
            return f"Scope {scope_num}"
        return "Unknown Scope"
    
    def clean(self):
        """Validation logic for the emission factor"""
        from django.core.exceptions import ValidationError
        
        # Validate unit against category
        if self.category and self.unit:
            valid_units = self.get_valid_units_for_category(self.category)
            if valid_units and self.unit not in valid_units:
                raise ValidationError({
                    'unit': f"Unit '{self.unit}' is not valid for category '{self.get_category_display()}'. "
                           f"Valid units are: {', '.join(valid_units)}"
                })
        
        # Validate emission factor value
        if self.emission_factor_value is not None and self.emission_factor_value <= 0:
            raise ValidationError({
                'emission_factor_value': 'Emission factor value must be greater than 0'
            })
        
        # Validate year
        if self.year and (self.year < 1990 or self.year > timezone.now().year + 5):
            raise ValidationError({
                'year': f'Year must be between 1990 and {timezone.now().year + 5}'
            })
        
        # Validate uncertainty parameters based on uncertainty type
        if self.uncertainty_type and self.uncertainty_type > 0:
            if not self.uncertainty_params:
                raise ValidationError({
                    'uncertainty_params': 'Uncertainty parameters are required when uncertainty type is specified'
                })
            
            # Validate required parameters based on uncertainty type
            required_params = self._get_required_uncertainty_params(self.uncertainty_type)
            if required_params:
                missing_params = [param for param in required_params if param not in self.uncertainty_params]
                if missing_params:
                    raise ValidationError({
                        'uncertainty_params': f'Missing required parameters for uncertainty type {self.get_uncertainty_type_display()}: {", ".join(missing_params)}'
                    })
    
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
    
    @classmethod
    def get_valid_units_for_category(cls, category):
        """Get valid units for a given category"""
        return cls.CATEGORY_UNITS.get(category, [])
    
    @classmethod
    def get_categories_by_scope(cls, scope):
        """Get all categories for a specific scope (1, 2, or 3)"""
        return [
            (key, value) for key, value in cls.CATEGORY_CHOICES 
            if cls.CATEGORY_SCOPES.get(key) == scope
        ]
    
    @classmethod
    def validate_unit_for_category(cls, category, unit):
        """Validate if a unit is valid for a given category"""
        valid_units = cls.get_valid_units_for_category(category)
        return not valid_units or unit in valid_units
    
    def save(self, *args, **kwargs):
        """Save with validation"""
        self.full_clean()
        super().save(*args, **kwargs)
    
    def has_uncertainty(self):
        """Check if this emission factor has uncertainty data"""
        return self.uncertainty_type > 0 and self.uncertainty_params is not None
    
    def get_uncertainty_description(self):
        """Get human-readable description of uncertainty"""
        if not self.has_uncertainty():
            return "No uncertainty data"
        
        uncertainty_name = self.get_uncertainty_type_display()
        params = self.uncertainty_params or {}
        
        param_str = ", ".join([f"{k}={v}" for k, v in params.items()])
        return f"{uncertainty_name} ({param_str})"

    def __str__(self):
        uncertainty_info = f" [{self.get_uncertainty_type_display()}]" if self.has_uncertainty() else ""
        return f"{self.name} ({self.get_category_display()}) - {self.emission_factor_value} kgCO₂e/{self.unit}{uncertainty_info}"


class EmissionActivity(models.Model):
    """Represents actual activity data entered by users"""
    activity_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="activities")
    scope = models.ForeignKey(EmissionScope, on_delete=models.CASCADE, related_name="activities")
    
    # Activity details
    activity_name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    
    # Calculation inputs
    quantity = models.DecimalField(max_digits=15, decimal_places=6)  # e.g. 1000 L
    unit = models.CharField(max_length=50)  # Should match emission_factor.unit
    emission_factor = models.ForeignKey(EmissionFactor, on_delete=models.CASCADE, related_name="activities")
    
    # Optional: Scope 3 category (GHG Protocol)
    SCOPE3_CATEGORY_CHOICES = [
        ("purchased_goods_services", "1. Purchased goods and services"),
        ("capital_goods", "2. Capital goods"),
        ("fuel_energy_related", "3. Fuel- and energy-related activities"),
        ("upstream_transport", "4. Upstream transportation and distribution"),
        ("waste_generated", "5. Waste generated in operations"),
        ("business_travel", "6. Business travel"),
        ("employee_commuting", "7. Employee commuting"),
        ("leased_assets_upstream", "8. Upstream leased assets"),
        ("downstream_transport", "9. Downstream transportation and distribution"),
        ("processing_sold_products", "10. Processing of sold products"),
        ("use_sold_products", "11. Use of sold products"),
        ("end_of_life", "12. End-of-life treatment of sold products"),
        ("leased_assets_downstream", "13. Downstream leased assets"),
        ("franchises", "14. Franchises"),
        ("investments", "15. Investments"),
    ]
    scope3_category = models.CharField(max_length=64, blank=True, null=True, choices=SCOPE3_CATEGORY_CHOICES)
    
    # Results
    calculated_emissions = models.DecimalField(max_digits=15, decimal_places=6, default=0)  # in tCO2e
    
    # Tracking
    created_date = models.DateTimeField(auto_now_add=True)
    last_modified = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.unit != self.emission_factor.unit:
            raise ValueError(
                f"Unit mismatch: Activity uses '{self.unit}' but emission factor uses '{self.emission_factor.unit}'"
            )

        qty_value = Decimal(self.quantity or 0)
        factor_value = Decimal(self.emission_factor.emission_factor_value or 0)

        # kg → tonnes (emission factor is in kgCO₂e, result should be in tCO₂e)
        self.calculated_emissions = (qty_value * factor_value) / Decimal("1000")

        super().save(*args, **kwargs)

        # update scope total
        if self.scope:
            self.scope.calculate_total_emissions()

    def __str__(self):
        return f"{self.activity_name} - {self.calculated_emissions} tCO₂e"



class LCAProduct(models.Model):
    lca_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="lca_products")
    name = models.CharField(max_length=255)
    functional_unit = models.CharField(max_length=255)
    total_carbon_footprint_per_unit = models.DecimalField(max_digits=15, decimal_places=6, default=0)
    created_date = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} ({self.project.name})"


# Signal handlers to automatically update scope totals
@receiver([post_save, post_delete], sender=EmissionActivity)
def update_scope_total(sender, instance, **kwargs):
    """Automatically recalculate scope total when activity changes"""
    if hasattr(instance, 'scope') and instance.scope:
        instance.scope.calculate_total_emissions()
