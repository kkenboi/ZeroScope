from django.urls import path, include
from rest_framework import routers
from .views import (
    ProjectViewSet, EmissionScopeViewSet, EmissionFactorViewSet, EmissionActivityViewSet, LCAProductViewSet,
    upload_sefr_excel
)

router = routers.DefaultRouter()
router.register(r'projects', ProjectViewSet)
router.register(r'emission-scopes', EmissionScopeViewSet)
router.register(r'emission-factors', EmissionFactorViewSet)
router.register(r'emission-activities', EmissionActivityViewSet)
router.register(r'lca-products', LCAProductViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('import-sefr/', upload_sefr_excel, name='import-sefr'),
]
