from rest_framework import generics
from rest_framework import viewsets

from django.contrib.auth.models import User
from .serializer import UserSerializer, ProjectSerializer

from .models import Project, EmissionScope, LCAProduct
from .serializer import ProjectSerializer, EmissionScopeSerializer, LCAProductSerializer

from rest_framework.permissions import IsAuthenticated, AllowAny

class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny] # Non authenticated users can also create

# # GET all projects and POST projects
# class CreateProjectList(generics.ListCreateAPIView):
#     queryset = Project.objects.all()
#     serializer_class = ProjectSerializer
#     permission_classes = [AllowAny]

# # GET, UPDATE and DELETE singular projects
# class CreateProjectDetail(generics.RetrieveUpdateDestroyAPIView):
#     queryset = Project.objects.all()
#     serializer_class = ProjectSerializer
#     permission_classes = [AllowAny]

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    lookup_field = "project_id"
    permission_classes = [AllowAny]


class EmissionScopeViewSet(viewsets.ModelViewSet):
    queryset = EmissionScope.objects.all()
    serializer_class = EmissionScopeSerializer
    lookup_field = "scope_id"
    permission_classes = [AllowAny]

class LCAProductViewSet(viewsets.ModelViewSet):
    queryset = LCAProduct.objects.all()
    serializer_class = LCAProductSerializer
    lookup_field = "lca_id"
    permission_classes = [AllowAny]
    
# DEPRECATED CRUD

# @api_view(['GET']) # Reading data
# def get_users(request):
#     users = User.objects.all()
#     serializedData =  UserSerializer(users, many = True).data
#     return Response(serializedData)
    
# @api_view(['POST']) # Writing data
# def create_user(request):
#     data = request.data
#     serializer = UserSerializer(data=data)
#     if serializer.is_valid():
#         serializer.save()
#         return Response(serializer.data, status = status.HTTP_201_CREATED)
#     return Response(serializer.errors, status = status.HTTP_400_BAD_REQUEST)

# @api_view(['PUT', 'DELETE'])
# def update_user(request, pk):
#     try:
#         user = User.objects.get(pk = pk)
#     except User.DoesNotExist:
#         return Response(status=status.HTTP_404_NOT_FOUND)
    
#     if request.method == 'DELETE':
#         user.delete()
#         return Response(status=status.HTTP_204_NO_CONTENT)
#     elif request.method == 'PUT':
#         data = request.data
#         serializer = UserSerializer(user, data = data)
#         if serializer.is_valid():
#             serializer.save()
#             return Response(serializer.data)
#         else:
#             return Response(serializer.errors, status = status.HTTP_400_BAD_REQUEST)
