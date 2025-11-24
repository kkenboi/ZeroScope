from django.urls import path, include
from rest_framework import routers
from .views import (
    ProjectViewSet, EmissionScopeViewSet, EmissionFactorViewSet, EmissionActivityViewSet, 
    LCAProductViewSet, LCAActivityViewSet, BW2AdminViewSet, UncertaintyAnalysisViewSet,
    SensitivityAnalysisViewSet, get_settings, calculate_lca
)
from .views_dashboard import dashboard_stats

router = routers.DefaultRouter()
router.register(r'projects', ProjectViewSet)
router.register(r'emission-scopes', EmissionScopeViewSet)
router.register(r'emission-factors', EmissionFactorViewSet)
router.register(r'emission-activities', EmissionActivityViewSet)
router.register(r'activities', EmissionActivityViewSet, basename='activities')  # Alias for emission-activities
router.register(r'lca-products', LCAProductViewSet)
router.register(r'lca-activities', LCAActivityViewSet)
router.register(r'brightway2', BW2AdminViewSet, basename='brightway2')
router.register(r'uncertainty', UncertaintyAnalysisViewSet, basename='uncertainty')
router.register(r'sensitivity', SensitivityAnalysisViewSet, basename='sensitivity')

urlpatterns = [
    path('settings/', get_settings, name='get-settings'),
    path('lca/calculate/', calculate_lca, name='calculate-lca'),
    path('dashboard/stats/', dashboard_stats, name='dashboard-stats'),
    path('', include(router.urls)),
]
