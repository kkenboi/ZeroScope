from django.urls import path, include
from rest_framework import routers
from .views import (
    ProjectViewSet, EmissionScopeViewSet, EmissionFactorViewSet, EmissionActivityViewSet,
    LCAProductViewSet, LCAActivityViewSet, BW2AdminViewSet, UncertaintyAnalysisViewSet,
    SensitivityAnalysisViewSet, get_settings, calculate_lca, ProductExchangeViewSet
)
from .views_dashboard import dashboard_stats
from .views_reports import generate_report
from .views_visualization import GlobeDataView

router = routers.DefaultRouter()
router.register(r'projects', ProjectViewSet)
router.register(r'emission-scopes', EmissionScopeViewSet)
router.register(r'emission-factors', EmissionFactorViewSet)
router.register(r'emission-activities', EmissionActivityViewSet)
router.register(r'lca-products', LCAProductViewSet)
router.register(r'product-exchanges', ProductExchangeViewSet)
router.register(r'lca-activities', LCAActivityViewSet)
router.register(r'brightway2', BW2AdminViewSet, basename='bw2')
router.register(r'uncertainty', UncertaintyAnalysisViewSet, basename='uncertainty')
router.register(r'sensitivity', SensitivityAnalysisViewSet, basename='sensitivity')

urlpatterns = [
    path('', include(router.urls)),
    path('settings/', get_settings, name='get_settings'),
    path('calculate-lca/', calculate_lca, name='calculate_lca'),
    path('dashboard/stats/', dashboard_stats, name='dashboard_stats_all'),
    path('dashboard/stats/<uuid:project_id>/', dashboard_stats, name='dashboard_stats'),
    path('reports/generate/', generate_report, name='generate_report'),
    path('globe-data/<uuid:project_id>/', GlobeDataView.as_view(), name='globe_data'),
]

