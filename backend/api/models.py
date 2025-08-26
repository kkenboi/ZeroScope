import uuid
from django.utils import timezone
from django.db import models

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


class EmissionScope(models.Model):
    scope_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="scopes")
    scope_number = models.IntegerField(
        choices=[(1, "Scope 1"), (2, "Scope 2"), (3, "Scope 3")]
    )
    total_emissions_tco2e = models.DecimalField(max_digits=15, decimal_places=6, default=0)

    def __str__(self):
        return f"Scope {self.scope_number} for {self.project.name}"


class LCAProduct(models.Model):
    lca_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="lca_products")
    name = models.CharField(max_length=255)
    functional_unit = models.CharField(max_length=255)
    total_carbon_footprint_per_unit = models.DecimalField(max_digits=15, decimal_places=6, default=0)
    created_date = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} ({self.project.name})"