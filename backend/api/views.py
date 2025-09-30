from rest_framework import generics
from rest_framework import viewsets

from django.conf import settings
from django.http import JsonResponse

from django.contrib.auth.models import User
from .serializer import UserSerializer, ProjectSerializer

from .models import Project, EmissionScope, EmissionFactor, EmissionActivity, LCAProduct
from django.db.models import Q
from .serializer import EmissionScopeSerializer, EmissionFactorSerializer, EmissionActivitySerializer
from .serializer import CategoryInfoSerializer
from .serializer import LCAProductSerializer

from rest_framework.decorators import api_view, permission_classes
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status

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
    """
    Clean, user-focused emission factor management.
    All emission factors use the unified model with uncertainty analysis support.
    """
    queryset = EmissionFactor.objects.all()
    serializer_class = EmissionFactorSerializer
    lookup_field = "factor_id"
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        """Filter emission factors based on query parameters"""
        queryset = EmissionFactor.objects.all()

        params = self.request.query_params

        # Category: allow comma-separated list
        category = params.get('category')
        if category:
            cats = [c.strip() for c in category.split(',') if c.strip()]
            if cats:
                queryset = queryset.filter(category__in=cats)

        # Scope (JSONField contains) single value only for now
        scope = params.get('scope')
        if scope:
            try:
                queryset = queryset.filter(applicable_scopes__contains=[int(scope)])
            except ValueError:
                pass

        # Year: allow single, list, or min/max range
        year = params.get('year')
        if year:
            years = [y.strip() for y in year.split(',') if y.strip().isdigit()]
            if years:
                queryset = queryset.filter(year__in=years)

        year_min = params.get('year_min')
        year_max = params.get('year_max')
        if year_min and year_min.isdigit():
            queryset = queryset.filter(year__gte=int(year_min))
        if year_max and year_max.isdigit():
            queryset = queryset.filter(year__lte=int(year_max))

        # Emission factor value range
        ef_min = params.get('ef_min')
        ef_max = params.get('ef_max')
        if ef_min:
            try:
                queryset = queryset.filter(emission_factor_value__gte=ef_min)
            except ValueError:
                pass
        if ef_max:
            try:
                queryset = queryset.filter(emission_factor_value__lte=ef_max)
            except ValueError:
                pass

        # Source partial match
        source = params.get('source')
        if source:
            queryset = queryset.filter(source__icontains=source)

        # Unit partial match
        unit = params.get('unit')
        if unit:
            queryset = queryset.filter(unit__icontains=unit)

        # General search across several text fields
        search = params.get('search') or params.get('q')
        if search:
            search = search.strip()
            if search:
                queryset = queryset.filter(
                    Q(name__icontains=search) |
                    Q(description__icontains=search) |
                    Q(source__icontains=search) |
                    Q(imported_category__icontains=search) |
                    Q(imported_sub_category__icontains=search)
                )

        # Sorting
        sort = params.get('sort')
        allowed_sort_fields = {
            'name', 'year', 'emission_factor_value', 'category', 'source', 'created_date', 'last_modified'
        }
        if sort:
            base = sort.lstrip('-')
            if base in allowed_sort_fields:
                queryset = queryset.order_by(sort)
            else:
                queryset = queryset.order_by('category', 'name')
        else:
            queryset = queryset.order_by('category', 'name')

        return queryset
    
    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Get all categories with their information"""
        categories_info = []
        
        for category_key, category_label in EmissionFactor.CATEGORY_CHOICES:
            categories_info.append({
                'category': category_key,
                'category_label': category_label,
            })
        
        return Response(categories_info)
    
    @action(detail=False, methods=['delete'])
    def delete_all(self, request):
        """Delete all emission factors (admin function)"""
        count = EmissionFactor.objects.count()
        EmissionFactor.objects.all().delete()
        return Response({
            'message': f'Successfully deleted {count} emission factors',
            'count': count
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'])
    def import_excel(self, request):
        """Import emission factors from SEFR Excel file - Updated for clean model"""
        
        if 'file' not in request.FILES:
            return Response(
                {'error': 'No file provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        file = request.FILES['file']
        
        # Validate file type
        if not file.name.lower().endswith(('.xlsx', '.xls')):
            return Response(
                {'error': 'File must be Excel format (.xlsx or .xls)'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file size (limit to 10MB)
        if file.size > 10 * 1024 * 1024:  # 10MB
            return Response(
                {'error': 'File size must be less than 10MB'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            import tempfile
            import os
            
            # Create temp file with proper extension
            with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as temp_file:
                for chunk in file.chunks():
                    temp_file.write(chunk)
                temp_path = temp_file.name
            
            # Import data using updated importer
            from .utils.sefr_importer import SEFRExcelImporter
            importer = SEFRExcelImporter(temp_path)
            
            success = importer.import_data()
            summary = importer.get_import_summary()
            
            # Clean up temp file
            try:
                os.unlink(temp_path)
            except:
                pass
            
            # Return detailed response
            if success:
                return Response({
                    'success': True,
                    'message': f'Import completed: {summary["success_count"]} imported, {summary["skipped_count"]} skipped, {summary["error_count"]} errors',
                    'summary': summary
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'success': False,
                    'message': 'Import failed - see errors for details',
                    'summary': summary
                }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            # Clean up temp file if it exists
            try:
                if 'temp_path' in locals():
                    os.unlink(temp_path)
            except:
                pass
                
            error_message = str(e)
            
            return Response({
                'success': False,
                'error': f'Import failed: {error_message}',
                'summary': {
                    'total_rows': 0,
                    'success_count': 0,
                    'skipped_count': 0,
                    'error_count': 1,
                    'errors': [error_message]
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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


@api_view(['GET'])
@permission_classes([AllowAny])
def get_settings(request):
    """Get application settings"""
    data = {
        'PAGE_SIZE': settings.REST_FRAMEWORK['PAGE_SIZE'],
        'AVAILABLE_SCOPES': [1, 2, 3],
        'TOTAL_CATEGORIES': len(EmissionFactor.CATEGORY_CHOICES),
    }
    return Response(data, status=status.HTTP_200_OK)

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
