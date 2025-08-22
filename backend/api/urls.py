from django.urls import path
from .import views

urlpatterns = [
    path("projects/", views.CreateProjectList.as_view(), name="project-list"),
    path("projects/<int:pk>/", views.CreateProjectDetail.as_view(), name="project-detail"),
]