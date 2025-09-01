import uuid
from django.utils import timezone
from django.db import models
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

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
    # SEFR Categories from your Excel
    CATEGORY_CHOICES = [
        ('building_equipment', 'Building Equipment'),
        ('building_materials', 'Building Materials'),
        ('fuel', 'Fuel'),
        ('greenhouse_gases', 'Greenhouse Gases'),
        ('land_transport', 'Land Transport'),
        ('purchased_energy', 'Purchased Energy'),
        ('waste', 'Waste'),
        ('water', 'Water'),
        ('other', 'Other'),
    ]
    
    SOURCE_CHOICES = [
        ('sefr', 'SEFR'),
        ('user', 'User Defined'),
        ('exiobase', 'EXIOBASE'),
        ('ipcc', 'IPCC'),
        ('sgbc', 'Singapore Green Building Council (SGBC)'),
        ('nea', 'National Environment Agency (NEA)'),
        ('other', 'Other'),
    ]

    factor_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # SEFR Excel columns mapping
    name = models.CharField(max_length=500)  # Maps to "Activity" column
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)  # Maps to "Category"
    sub_category = models.CharField(max_length=255, blank=True, null=True)  # Maps to "Sub-Category"
    description = models.TextField(blank=True, null=True)  # Maps to "Description"
    
    # Emission factor details
    emission_factor_co2e = models.DecimalField(max_digits=20, decimal_places=5)  # Maps to "EF (kg CO2-eq per unit)"
    base_unit = models.CharField(max_length=100)  # Maps to "Unit" (can be complex like "m3/hr", "Refrigerant Tonne")
    
    # Source and metadata from SEFR
    source = models.CharField(max_length=100, default="sefr")  # Maps to "Data Source"
    year = models.IntegerField(null=True, blank=True)  # Maps to "Year"
    ghg_standard = models.CharField(max_length=100, blank=True, null=True)  # Maps to "GHG Emissions Standard Applied"
    ipcc_version = models.CharField(max_length=20, blank=True, null=True)  # Maps to "IPCC Version"
    boundary_exclusions = models.TextField(blank=True, null=True)  # Maps to "Boundary and Exclusions"
    
    # For user-defined factors only (SEFR factors don't need these)
    gas_type = models.CharField(max_length=20, blank=True, null=True)  # CO2, CH4, N2O (for user-defined only)
    gwp_factor = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)  # Only for user-defined
    raw_emission_factor = models.DecimalField(max_digits=15, decimal_places=10, null=True, blank=True)  # Before GWP conversion
    
    # Control flags
    is_sefr_factor = models.BooleanField(default=True)  # True for SEFR, False for user-defined
    is_editable = models.BooleanField(default=False)  # SEFR factors not editable
    
    # Tracking
    created_date = models.DateTimeField(auto_now_add=True)
    last_modified = models.DateTimeField(auto_now=True)

    class Meta:
        # Prevent duplicates
        unique_together = ['name', 'category', 'sub_category', 'source']

    @property 
    def final_co2e_factor(self):
        """
        Returns the final CO2e emission factor
        - For SEFR factors: use emission_factor_co2e directly (already in CO2e)
        - For user-defined: calculate raw_emission_factor * gwp_factor
        """
        if self.is_sefr_factor:
            return self.emission_factor_co2e
        else:
            if self.raw_emission_factor and self.gwp_factor:
                return self.raw_emission_factor * self.gwp_factor
            return self.emission_factor_co2e

    def clean(self):
        """Validation logic"""
        from django.core.exceptions import ValidationError
        
        if not self.is_sefr_factor:
            # User-defined factors need gas_type and gwp_factor
            if not self.gas_type:
                raise ValidationError("Gas type is required for user-defined factors")
            if not self.gwp_factor:
                raise ValidationError("GWP factor is required for user-defined factors")
            if not self.raw_emission_factor:
                raise ValidationError("Raw emission factor is required for user-defined factors")

    def save(self, *args, **kwargs):
        self.full_clean()
        
        # For user-defined factors, calculate the CO2e factor
        if not self.is_sefr_factor and self.raw_emission_factor and self.gwp_factor:
            self.emission_factor_co2e = self.raw_emission_factor * self.gwp_factor
            
        super().save(*args, **kwargs)

    def __str__(self):
        if self.sub_category:
            return f"{self.category} - {self.sub_category} - {self.name}"
        return f"{self.category} - {self.name}"


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
    unit = models.CharField(max_length=50)  # Should match factor's base_unit
    emission_factor = models.ForeignKey(EmissionFactor, on_delete=models.CASCADE, related_name="activities")
    
    # Results
    calculated_emissions = models.DecimalField(max_digits=15, decimal_places=6, default=0)  # in tCO2e
    
    # Tracking
    created_date = models.DateTimeField(auto_now_add=True)
    last_modified = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Validate units match
        if self.unit != self.emission_factor.base_unit:
            raise ValueError(f"Unit mismatch: Activity uses {self.unit} but factor uses {self.emission_factor.base_unit}")
        
        # Calculate emissions: quantity × final_co2e_factor
        # SEFR factors are already in kg CO2e, convert to tonnes
        self.calculated_emissions = (
            self.quantity * self.emission_factor.final_co2e_factor / 1000  # Convert kg to tonnes
        )
        super().save(*args, **kwargs)
        
        # Update scope total after saving
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
