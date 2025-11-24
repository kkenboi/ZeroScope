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
        """Calculate total from all activities (both emission factor and LCA activities) in this scope"""
        from decimal import Decimal
        
        # Sum from regular emission activities (already in tCO₂e)
        emission_total = self.activities.aggregate(
            total=models.Sum('calculated_emissions')
        )['total'] or Decimal('0')
        
        # Sum from LCA activities (in kgCO₂e, need to convert to tCO₂e)
        lca_total_kg = self.lca_activities.aggregate(
            total=models.Sum('calculated_emissions')
        )['total'] or Decimal('0')
        lca_total_tco2e = lca_total_kg / Decimal('1000')
        
        # Combine both
        total = emission_total + lca_total_tco2e
        self.total_emissions_tco2e = total
        self.save()
        return total

    def __str__(self):
        return f"Scope {self.scope_number} for {self.project.name}"
        
class EmissionFactor(models.Model):
    """
    Clean, user-focused emission factor model aligned with GHG Protocol.
    All factors standardized to kgCO₂e for consistent calculations.
    Formula: Emissions = Activity Data x Emission Factor
    """
    
    # GHG Protocol Categories - Scope 1, 2, 3
    CATEGORY_CHOICES = [
        # === SCOPE 1: Direct Emissions ===
        ('stationary_combustion', 'Stationary Combustion'),
        ('mobile_combustion', 'Mobile Combustion'),
        ('fugitive_emissions', 'Fugitive Emissions'),
        ('process_emissions', 'Process Emissions'),
        
        # === SCOPE 2: Indirect, Purchased Energy ===
        ('purchased_electricity', 'Purchased Electricity'),
        ('purchased_heat_steam_cooling', 'Purchased Heat, Steam, or Cooling'),
        
        # === SCOPE 3: Other Indirect, Value Chain ===
        ('purchased_goods_services', 'Purchased Goods & Services'),
        ('capital_goods', 'Capital Goods'),
        ('fuel_energy_related', 'Fuel- and Energy-Related Activities'),
        ('upstream_transport', 'Upstream Transportation & Distribution'),
        ('waste_generated', 'Waste Generated in Operations'),
        ('business_travel', 'Business Travel'),
        ('employee_commuting', 'Employee Commuting'),
        ('upstream_leased_assets', 'Upstream Leased Assets'),
        ('downstream_transport', 'Downstream Transportation & Distribution'),
        ('processing_sold_products', 'Processing of Sold Products'),
        ('use_sold_products', 'Use of Sold Products'),
        ('end_of_life_sold_products', 'End-of-Life Treatment of Sold Products'),
        ('downstream_leased_assets', 'Downstream Leased Assets'),
        ('franchises', 'Franchises'),
        ('investments', 'Investments'),
    ]
    
    # Scope 3 specific categories (15 categories as per GHG Protocol) - This is now redundant
    # since we're mapping directly to main categories, but keeping for backwards compatibility
    SCOPE_3_CATEGORY_CHOICES = [
        ('purchased_goods_services', 'Purchased Goods & Services'),
        ('capital_goods', 'Capital Goods'),
        ('fuel_energy_related', 'Fuel- and Energy-Related Activities'),
        ('upstream_transport', 'Upstream Transportation & Distribution'),
        ('waste_generated', 'Waste Generated in Operations'),
        ('business_travel', 'Business Travel'),
        ('employee_commuting', 'Employee Commuting'),
        ('upstream_leased_assets', 'Upstream Leased Assets'),
        ('downstream_transport', 'Downstream Transportation & Distribution'),
        ('processing_sold_products', 'Processing of Sold Products'),
        ('use_sold_products', 'Use of Sold Products'),
        ('end_of_life_sold_products', 'End-of-Life Treatment of Sold Products'),
        ('downstream_leased_assets', 'Downstream Leased Assets'),
        ('franchises', 'Franchises'),
        ('investments', 'Investments'),
    ]
    
    # Scope choices
    SCOPE_CHOICES = [
        (1, 'Scope 1'),
        (2, 'Scope 2'),
        (3, 'Scope 3'),
    ]
    
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
    
    # === MAPPING AND SCOPE FIELDS ===
    # Store original imported data for auditing
    imported_category = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Original category from the source database (for auditing)"
    )
    imported_sub_category = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Original sub-category from the source database (for auditing)"
    )
    
    # Applicable scopes and category
    applicable_scopes = models.JSONField(
        default=list,
        help_text="List of applicable GHG Protocol Scopes [1, 2, 3] where this factor can be used"
    )
    scope_3_category = models.CharField(
        max_length=50,
        choices=SCOPE_3_CATEGORY_CHOICES,
        blank=True,
        null=True,
        help_text="Specific Scope 3 category (required if any of applicable scopes is 3)"
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
    
    def clean(self):
        """Validation logic for the emission factor"""
        from django.core.exceptions import ValidationError
        
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
        
        # Validate scope 3 category requirement (keeping for backwards compatibility but not enforcing)
        # Note: scope_3_category is now redundant since categories directly map to scopes
        # if 3 in (self.applicable_scopes or []) and not self.scope_3_category:
        #     raise ValidationError({
        #         'scope_3_category': 'Scope 3 category is required when scope 3 is in applicable scopes'
        #     })
        
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
    
    # Time period tracking (for monthly/quarterly emissions analysis)
    period_start = models.DateField(null=True, blank=True, help_text="Start of reporting period (e.g., 2024-01-01)")
    period_end = models.DateField(null=True, blank=True, help_text="End of reporting period (e.g., 2024-01-31)")
    is_recurring = models.BooleanField(default=True, help_text="Whether this activity recurs regularly (e.g., monthly electricity)")
    
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


class LCAActivity(models.Model):
    """
    Represents an activity that uses a Brightway2 LCA product/process
    instead of a simple emission factor. This allows full LCA calculations
    with supply chain impacts.
    """
    activity_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="lca_activities")
    scope = models.ForeignKey(EmissionScope, on_delete=models.CASCADE, related_name="lca_activities")
    
    # Activity details
    activity_name = models.CharField(max_length=255, help_text="User-friendly name for this activity")
    description = models.TextField(blank=True, null=True)
    
    # Brightway2 reference - points to a process/activity in BW2 database
    bw2_database = models.CharField(max_length=255, help_text="Brightway2 database name (e.g., 'ecoinvent-3.9.1-cutoff')")
    bw2_activity_code = models.CharField(max_length=255, help_text="Brightway2 activity code")
    bw2_activity_name = models.CharField(max_length=500, blank=True, null=True, help_text="Cached name from Brightway2")
    bw2_location = models.CharField(max_length=100, blank=True, null=True, help_text="Cached location from Brightway2")
    bw2_unit = models.CharField(max_length=50, blank=True, null=True, help_text="Cached unit from Brightway2")
    
    # Calculation inputs
    quantity = models.DecimalField(max_digits=15, decimal_places=6, help_text="Amount of the activity")
    
    # Optional: Impact method selection (default: IPCC GWP 100a)
    impact_method = models.JSONField(
        default=dict,
        blank=True,
        help_text="Impact assessment method as tuple, e.g., ('IPCC 2013', 'climate change', 'GWP 100a')"
    )
    
    # Results (cached from Brightway2 calculation)
    calculated_emissions = models.DecimalField(
        max_digits=15, 
        decimal_places=6, 
        default=0,
        help_text="Calculated emissions in kgCO₂e (will be converted to tCO₂e for display)"
    )
    
    # Optional: Scope 3 category
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
    
    # Time period tracking (optional for one-time LCA products)
    period_start = models.DateField(null=True, blank=True, help_text="Start of reporting period")
    period_end = models.DateField(null=True, blank=True, help_text="End of reporting period")
    is_recurring = models.BooleanField(default=False, help_text="Whether this activity recurs (usually False for LCA products)")
    
    # Tracking
    created_date = models.DateTimeField(auto_now_add=True)
    last_modified = models.DateTimeField(auto_now=True)
    last_calculated = models.DateTimeField(null=True, blank=True, help_text="When LCA calculation was last performed")
    
    class Meta:
        verbose_name = "LCA Activity"
        verbose_name_plural = "LCA Activities"
        ordering = ['-created_date']
    
    def calculate_lca_impact(self):
        """
        Calculate the LCA impact using Brightway2
        Returns the impact in kgCO₂e
        """
        try:
            import bw2data as bd
            import bw2calc as bc
            from django.utils import timezone
            
            # Set Brightway2 project
            bd.projects.set_current("ZeroScope_LCA")
            
            # Get the activity
            if self.bw2_database not in bd.databases:
                raise ValueError(f"Database '{self.bw2_database}' not found in Brightway2")
            
            db = bd.Database(self.bw2_database)
            activity = db.get(self.bw2_activity_code)
            
            if not activity:
                raise ValueError(f"Activity '{self.bw2_activity_code}' not found in database '{self.bw2_database}'")
            
            # Cache activity details
            self.bw2_activity_name = activity.get('name', '')
            self.bw2_location = activity.get('location', '')
            self.bw2_unit = activity.get('unit', '')
            
            # Determine impact method - use default IPCC if not specified
            if not self.impact_method or not self.impact_method.get('method'):
                # Default to IPCC 2013 GWP 100a (ecoinvent format)
                method = ('ecoinvent-3.9.1', 'IPCC 2013', 'climate change', 'global warming potential (GWP100)')
            else:
                method = tuple(self.impact_method.get('method', []))
            
            # Create functional unit
            functional_unit = {activity: float(self.quantity)}
            
            # Perform LCA calculation
            lca = bc.LCA(functional_unit, method)
            lca.lci()
            lca.lcia()
            
            # Result is in the unit of the impact method (kgCO₂e for GWP)
            impact = lca.score
            
            # Store result in kgCO₂e
            self.calculated_emissions = Decimal(str(impact))
            self.last_calculated = timezone.now()
            
            return impact
            
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            raise Exception(f"LCA calculation failed: {str(e)}\n{error_detail}")
    
    def get_emissions_tco2e(self):
        """Get emissions in tCO₂e (converted from kgCO₂e)"""
        return self.calculated_emissions / Decimal("1000")
    
    def save(self, *args, **kwargs):
        """
        Override save to calculate LCA impact if needed
        Note: Calculation can be expensive, so it's not automatic
        """
        super().save(*args, **kwargs)
        
        # Update scope total after saving
        if self.scope:
            self.scope.calculate_total_emissions()
    
    def __str__(self):
        return f"{self.activity_name} - {self.get_emissions_tco2e()} tCO₂e (LCA)"


# Signal handlers to automatically update scope totals
@receiver([post_save, post_delete], sender=EmissionActivity)
def update_scope_total_emission_activity(sender, instance, **kwargs):
    """Automatically recalculate scope total when emission activity changes"""
    if hasattr(instance, 'scope') and instance.scope:
        instance.scope.calculate_total_emissions()


@receiver([post_save, post_delete], sender=LCAActivity)
def update_scope_total_lca_activity(sender, instance, **kwargs):
    """Automatically recalculate scope total when LCA activity changes"""
    if hasattr(instance, 'scope') and instance.scope:
        instance.scope.calculate_total_emissions()
