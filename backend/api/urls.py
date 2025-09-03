from django.urls import path, include
from rest_framework import routers
from .views import (
    ProjectViewSet, EmissionScopeViewSet, EmissionFactorViewSet, EmissionActivityViewSet, LCAProductViewSet,
    upload_sefr_excel, emission_factors_all
)

router = routers.DefaultRouter()
router.register(r'projects', ProjectViewSet)
router.register(r'emission-scopes', EmissionScopeViewSet)
router.register(r'emission-factors', EmissionFactorViewSet)
router.register(r'emission-activities', EmissionActivityViewSet)
router.register(r'lca-products', LCAProductViewSet)

urlpatterns = [
    path('import-sefr/', upload_sefr_excel, name='import-sefr'),
    path('emission-factors/all/', emission_factors_all, name='emission-factors-all'),
    path('', include(router.urls)),
]
