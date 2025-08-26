from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, EmissionScopeViewSet, LCAProductViewSet

router = DefaultRouter()
router.register(r'projects', ProjectViewSet)
router.register(r'scopes', EmissionScopeViewSet)
router.register(r'lca-products', LCAProductViewSet)

urlpatterns = router.urls
