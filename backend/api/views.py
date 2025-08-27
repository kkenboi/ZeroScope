from rest_framework import generics
from rest_framework import viewsets

from django.contrib.auth.models import User
from .serializer import UserSerializer, ProjectSerializer

from .models import Project
from .models import EmissionScope, EmissionFactor, EmissionActivity
from .models import LCAProduct
from .serializer import ProjectSerializer
from .serializer import EmissionScopeSerializer, EmissionFactorSerializer, EmissionActivitySerializer
from .serializer import LCAProductSerializer

from .utils.sefr_importer import SEFRExcelImporter

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from django.core.files.storage import default_storage
import os

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
    
class EmissionFactorViewSet(viewsets.ModelViewSet):
    queryset = EmissionFactor.objects.all()
    serializer_class = EmissionFactorSerializer
    lookup_field = "factor_id"
    permission_classes = [AllowAny]

class EmissionActivityViewSet(viewsets.ModelViewSet):
    queryset = EmissionActivity.objects.all()
    serializer_class = EmissionActivitySerializer
    lookup_field = "activity_id"
    permission_classes = [AllowAny]

class LCAProductViewSet(viewsets.ModelViewSet):
    queryset = LCAProduct.objects.all()
    serializer_class = LCAProductSerializer
    lookup_field = "lca_id"
    permission_classes = [AllowAny]
    
    
    

@api_view(['POST'])
@permission_classes([AllowAny])
def upload_sefr_excel(request):
    """API endpoint to upload and import SEFR Excel file"""
    
    if 'file' not in request.FILES:
        return Response(
            {'error': 'No file provided'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    file = request.FILES['file']
    
    # Validate file type
    if not file.name.endswith(('.xlsx', '.xls')):
        return Response(
            {'error': 'File must be Excel format (.xlsx or .xls)'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Save file temporarily
        file_path = default_storage.save(f'temp/{file.name}', file)
        full_path = default_storage.path(file_path)
        
        # Import data
        importer = SEFRExcelImporter(full_path)
        success = importer.import_data()
        summary = importer.get_import_summary()
        
        # Clean up temp file
        os.remove(full_path)
        
        return Response({
            'success': success,
            'summary': summary
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Import failed: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    
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
