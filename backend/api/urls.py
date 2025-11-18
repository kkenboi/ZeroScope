from django.urls import path, include
from rest_framework import routers
from .views import (
    ProjectViewSet, EmissionScopeViewSet, EmissionFactorViewSet, EmissionActivityViewSet, 
    LCAProductViewSet, LCAActivityViewSet, BW2AdminViewSet,
    get_settings
)

router = routers.DefaultRouter()
router.register(r'projects', ProjectViewSet)
router.register(r'emission-scopes', EmissionScopeViewSet)
router.register(r'emission-factors', EmissionFactorViewSet)
router.register(r'emission-activities', EmissionActivityViewSet)
router.register(r'lca-products', LCAProductViewSet)
router.register(r'lca-activities', LCAActivityViewSet)
router.register(r'brightway2', BW2AdminViewSet, basename='brightway2')

urlpatterns = [
    path('settings/', get_settings, name='get-settings'),
    path('', include(router.urls)),
]
