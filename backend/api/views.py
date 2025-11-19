from rest_framework import generics
from rest_framework import viewsets

from django.conf import settings
from django.http import JsonResponse

from django.contrib.auth.models import User
from .serializer import UserSerializer, ProjectSerializer

from .models import Project, EmissionScope, EmissionFactor, EmissionActivity, LCAProduct, LCAActivity
from django.db.models import Q
from .serializer import EmissionScopeSerializer, EmissionFactorSerializer, EmissionActivitySerializer
from .serializer import CategoryInfoSerializer
from .serializer import LCAProductSerializer, LCAActivitySerializer

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


class LCAActivityViewSet(viewsets.ModelViewSet):
    """
    ViewSet for LCA activities that use Brightway2 processes
    Allows full LCA calculations with supply chain impacts
    """
    queryset = LCAActivity.objects.all()
    serializer_class = LCAActivitySerializer
    permission_classes = [AllowAny]
    
    @action(detail=True, methods=['POST'])
    def calculate(self, request, pk=None):
        """
        Calculate LCA impact for this activity using Brightway2
        """
        try:
            lca_activity = self.get_object()
            
            # Perform LCA calculation
            impact = lca_activity.calculate_lca_impact()
            
            # Save the updated activity
            lca_activity.save()
            
            return Response({
                'success': True,
                'activity_id': str(lca_activity.activity_id),
                'activity_name': lca_activity.activity_name,
                'calculated_emissions_kg': float(lca_activity.calculated_emissions),
                'calculated_emissions_tco2e': float(lca_activity.get_emissions_tco2e()),
                'quantity': float(lca_activity.quantity),
                'unit': lca_activity.bw2_unit,
                'last_calculated': lca_activity.last_calculated.isoformat() if lca_activity.last_calculated else None,
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['POST'])
    def calculate_all(self, request):
        """
        Calculate LCA impact for all activities in a project or scope
        Query params: project_id (required), scope_number (optional)
        """
        try:
            project_id = request.data.get('project_id')
            scope_number = request.data.get('scope_number')
            
            if not project_id:
                return Response({
                    'success': False,
                    'error': 'project_id is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Filter activities
            activities = LCAActivity.objects.filter(project_id=project_id)
            if scope_number is not None:
                activities = activities.filter(scope__scope_number=scope_number)
            
            results = []
            errors = []
            
            for activity in activities:
                try:
                    impact = activity.calculate_lca_impact()
                    activity.save()
                    results.append({
                        'activity_id': str(activity.activity_id),
                        'activity_name': activity.activity_name,
                        'success': True,
                        'emissions_tco2e': float(activity.get_emissions_tco2e())
                    })
                except Exception as e:
                    errors.append({
                        'activity_id': str(activity.activity_id),
                        'activity_name': activity.activity_name,
                        'error': str(e)
                    })
            
            return Response({
                'success': True,
                'calculated': len(results),
                'failed': len(errors),
                'results': results,
                'errors': errors
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BW2AdminViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['GET'])
    def list_impact_methods(self, request):
        """List notable impact methods for environmental assessment"""
        try:
            import bw2data as bd
            bd.projects.set_current("ZeroScope_LCA")
            
            # Define notable impact assessment methods
            notable_keywords = [
                'IPCC 2013',  # Climate change
                'ReCiPe 2016',  # Comprehensive environmental assessment
                'CML-IA baseline',  # Classic LCA method
                'EF v3.1',  # Environmental Footprint
                'TRACI',  # US EPA method
                'Ecological Scarcity',  # Swiss method
            ]
            
            methods_list = []
            for method in bd.methods:
                method_name = ' - '.join(method)
                # Only include methods that match notable keywords
                if any(keyword in method_name for keyword in notable_keywords):
                    # Prioritize climate change methods
                    if 'IPCC 2013' in method_name and 'GWP100' in method_name and 'no LT' not in method_name:
                        methods_list.insert(0, {
                            'method': list(method),
                            'name': method_name
                        })
                    else:
                        methods_list.append({
                            'method': list(method),
                            'name': method_name
                        })
            
            return Response({
                'success': True,
                'methods': methods_list,
                'count': len(methods_list)
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['GET'])
    def list_databases(self, request):
        """List all databases in the BW2 project"""
        try:
            from .utils.bw2_setup import BW2LCA
            bw2Instance = BW2LCA()
            databases = bw2Instance.list_databases()
            
            return Response({
                'success': True,
                'databases': databases
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['POST'])
    def import_ecoinvent(self, request):
        """
        Import ecoinvent database
        Expected body: {
            "version": "3.9.1",
            "system_model": "cutoff",
            "username": "your_username",
            "password": "your_password"
        }
        """
        try:
            from .utils.bw2_setup import BW2LCA
            
            version = request.data.get('version')
            system_model = request.data.get('system_model', 'cutoff')
            username = request.data.get('username')
            password = request.data.get('password')
            
            if not version or not username or not password:
                return Response({
                    'success': False,
                    'error': 'Missing required fields: version, username, password'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate system_model
            valid_models = ['cutoff', 'apos', 'consequential', 'EN15804']
            if system_model not in valid_models:
                return Response({
                    'success': False,
                    'error': f'Invalid system_model. Must be one of: {", ".join(valid_models)}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            bw2Instance = BW2LCA()
            
            # Import with progress tracking (simplified for now - can be enhanced with WebSocket)
            result = bw2Instance.import_ecoinvent(
                version=version,
                system_model=system_model,
                username=username,
                password=password
            )
            
            if result['success']:
                return Response(result, status=status.HTTP_200_OK)
            else:
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['DELETE'])
    def delete_database(self, request):
        """
        Delete a database
        Expected body: { "database_name": "ecoinvent-3.9.1-cutoff" }
        """
        try:
            from .utils.bw2_setup import BW2LCA
            
            database_name = request.data.get('database_name')
            
            if not database_name:
                return Response({
                    'success': False,
                    'error': 'Missing required field: database_name'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            bw2Instance = BW2LCA()
            result = bw2Instance.delete_database(database_name)
            
            if result['success']:
                return Response(result, status=status.HTTP_200_OK)
            else:
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['POST'])
    def reset_project(self, request):
        """
        Reset the entire Brightway2 project by deleting all databases
        WARNING: This will delete all LCA data
        """
        try:
            from .utils.bw2_setup import BW2LCA
            
            bw2Instance = BW2LCA()
            result = bw2Instance.reset_project()
            
            if result['success']:
                return Response(result, status=status.HTTP_200_OK)
            else:
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['GET'])
    def get_activities(self, request):
        """
        Get activities from a database
        Query params: database_name, search (optional), limit, offset
        """
        try:
            from .utils.bw2_setup import BW2LCA
            
            database_name = request.query_params.get('database_name')
            search = request.query_params.get('search', None)
            limit = int(request.query_params.get('limit', 100))
            offset = int(request.query_params.get('offset', 0))
            
            if not database_name:
                return Response({
                    'success': False,
                    'error': 'Missing required parameter: database_name'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            bw2Instance = BW2LCA()
            result = bw2Instance.get_activities(database_name, search, limit, offset)
            
            if result['success']:
                return Response(result, status=status.HTTP_200_OK)
            else:
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['GET'])
    def get_exchanges(self, request):
        """
        Get exchanges for an activity
        Query params: database_name, activity_code
        """
        try:
            from .utils.bw2_setup import BW2LCA
            
            database_name = request.query_params.get('database_name')
            activity_code = request.query_params.get('activity_code')
            
            if not database_name or not activity_code:
                return Response({
                    'success': False,
                    'error': 'Missing required parameters: database_name, activity_code'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            bw2Instance = BW2LCA()
            result = bw2Instance.get_exchanges(database_name, activity_code)
            
            if result['success']:
                return Response(result, status=status.HTTP_200_OK)
            else:
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['GET'])
    def search_activities_for_inputs(self, request):
        """
        Search for activities to use as inputs in custom products
        Query params: search_term, limit (optional, default 50)
        """
        try:
            from .utils.bw2_setup import BW2LCA
            
            search_term = request.query_params.get('search_term', '')
            limit = int(request.query_params.get('limit', 50))
            
            if not search_term:
                return Response({
                    'success': False,
                    'error': 'Missing required parameter: search_term'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            bw2Instance = BW2LCA()
            result = bw2Instance.search_activities_for_inputs(search_term, limit)
            
            if result['success']:
                return Response(result, status=status.HTTP_200_OK)
            else:
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['POST'])
    def create_custom_product(self, request):
        """
        Create a custom LCA product
        Expected body: {
            "name": "My Custom Product",
            "database": "custom_products" (optional),
            "location": "GLO" (optional),
            "unit": "kilogram" (optional),
            "description": "Product description" (optional),
            "inputs": [
                {
                    "database": "ecoinvent-3.9.1-cutoff",
                    "code": "activity_code",
                    "amount": 1.5,
                    "type": "technosphere"
                }
            ],
            "outputs": [
                {
                    "name": "Product output",
                    "amount": 1.0,
                    "type": "production"
                }
            ] (optional, defaults to single production output)
        }
        """
        try:
            from .utils.bw2_setup import BW2LCA
            
            product_data = request.data
            
            if not product_data.get('name'):
                return Response({
                    'success': False,
                    'error': 'Missing required field: name'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            bw2Instance = BW2LCA()
            result = bw2Instance.create_custom_product(product_data)
            
            if result['success']:
                return Response(result, status=status.HTTP_201_CREATED)
            else:
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['GET'])
    def verify_custom_product(self, request):
        """
        Verify and get details of a custom product
        Query params: database_name, activity_code
        """
        try:
            from .utils.bw2_setup import BW2LCA
            
            database_name = request.query_params.get('database_name')
            activity_code = request.query_params.get('activity_code')
            
            if not database_name or not activity_code:
                return Response({
                    'success': False,
                    'error': 'Missing required parameters: database_name, activity_code'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            bw2Instance = BW2LCA()
            result = bw2Instance.verify_custom_product(database_name, activity_code)
            
            if result['success']:
                return Response(result, status=status.HTTP_200_OK)
            else:
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['DELETE'])
    def delete_custom_product(self, request):
        """
        Delete a custom product
        Expected body: { "database_name": "custom_products", "activity_code": "code" }
        """
        try:
            from .utils.bw2_setup import BW2LCA
            
            database_name = request.data.get('database_name')
            activity_code = request.data.get('activity_code')
            
            if not database_name or not activity_code:
                return Response({
                    'success': False,
                    'error': 'Missing required fields: database_name, activity_code'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            bw2Instance = BW2LCA()
            result = bw2Instance.delete_custom_product(database_name, activity_code)
            
            if result['success']:
                return Response(result, status=status.HTTP_200_OK)
            else:
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
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


class UncertaintyAnalysisViewSet(viewsets.ViewSet):
    """
    Uncertainty analysis using Monte Carlo simulation
    """
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['POST'])
    def project(self, request):
        """
        Run Monte Carlo uncertainty analysis on a project
        Expected body: {
            "project_id": "uuid",
            "iterations": 1000,
            "impact_method": ["IPCC 2013", "climate change", "GWP 100a"] (optional)
        }
        """
        try:
            from .utils.bw2_setup import BW2LCA
            import numpy as np
            
            project_id = request.data.get('project_id')
            iterations = request.data.get('iterations', 1000)
            impact_method = request.data.get('impact_method')
            
            if not project_id:
                return Response({
                    'success': False,
                    'error': 'project_id is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get all LCA activities for this project
            lca_activities = LCAActivity.objects.filter(project_id=project_id)
            
            if not lca_activities.exists():
                return Response({
                    'success': False,
                    'error': 'No LCA activities found for this project'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            bw2Instance = BW2LCA()
            
            # Use default method if not specified
            if not impact_method:
                impact_method = ('ecoinvent-3.9.1', 'IPCC 2013', 'climate change', 'global warming potential (GWP100)')
            else:
                impact_method = tuple(impact_method)
            
            # Run Monte Carlo for each activity and sum results
            all_results = []
            
            for iteration in range(iterations):
                total_impact = 0
                
                for activity in lca_activities:
                    result = bw2Instance.run_monte_carlo_single(
                        database_name=activity.bw2_database,
                        activity_code=activity.bw2_activity_code,
                        quantity=float(activity.quantity),
                        impact_method=impact_method
                    )
                    
                    if result['success']:
                        total_impact += result['impact']
                
                all_results.append(total_impact / 1000)  # Convert to tCO2e
            
            # Calculate statistics
            results_array = np.array(all_results)
            statistics = {
                'mean': float(np.mean(results_array)),
                'std': float(np.std(results_array)),
                'min': float(np.min(results_array)),
                'max': float(np.max(results_array)),
                'median': float(np.median(results_array)),
                'percentile_2_5': float(np.percentile(results_array, 2.5)),
                'percentile_97_5': float(np.percentile(results_array, 97.5)),
                'percentile_5': float(np.percentile(results_array, 5)),
                'percentile_95': float(np.percentile(results_array, 95)),
            }
            
            # Create histogram
            hist, bin_edges = np.histogram(results_array, bins=30)
            
            return Response({
                'success': True,
                'statistics': statistics,
                'histogram': hist.tolist(),
                'bin_edges': bin_edges.tolist(),
                'iterations': iterations,
                'num_activities': lca_activities.count()
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            import traceback
            return Response({
                'success': False,
                'error': str(e),
                'traceback': traceback.format_exc()
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['POST'])
    def activity(self, request):
        """
        Run Monte Carlo uncertainty analysis on a single activity
        Expected body: {
            "database_name": "ecoinvent-3.9.1-cutoff",
            "activity_code": "abc123",
            "quantity": 1.0,
            "iterations": 1000,
            "impact_method": ["IPCC 2013", "climate change", "GWP 100a"] (optional)
        }
        """
        try:
            from .utils.bw2_setup import BW2LCA
            import numpy as np
            
            database_name = request.data.get('database_name')
            activity_code = request.data.get('activity_code')
            quantity = request.data.get('quantity', 1.0)
            iterations = request.data.get('iterations', 1000)
            impact_method = request.data.get('impact_method')
            
            if not database_name or not activity_code:
                return Response({
                    'success': False,
                    'error': 'database_name and activity_code are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            bw2Instance = BW2LCA()
            
            # Use default method if not specified
            if not impact_method:
                impact_method = ('ecoinvent-3.9.1', 'IPCC 2013', 'climate change', 'global warming potential (GWP100)')
            else:
                impact_method = tuple(impact_method)
            
            # Run Monte Carlo iterations
            all_results = []
            
            for iteration in range(iterations):
                result = bw2Instance.run_monte_carlo_single(
                    database_name=database_name,
                    activity_code=activity_code,
                    quantity=float(quantity),
                    impact_method=impact_method
                )
                
                if result['success']:
                    all_results.append(result['impact'] / 1000)  # Convert to tCO2e
            
            # Calculate statistics
            results_array = np.array(all_results)
            statistics = {
                'mean': float(np.mean(results_array)),
                'std': float(np.std(results_array)),
                'min': float(np.min(results_array)),
                'max': float(np.max(results_array)),
                'median': float(np.median(results_array)),
                'percentile_2_5': float(np.percentile(results_array, 2.5)),
                'percentile_97_5': float(np.percentile(results_array, 97.5)),
                'percentile_5': float(np.percentile(results_array, 5)),
                'percentile_95': float(np.percentile(results_array, 95)),
            }
            
            # Create histogram
            hist, bin_edges = np.histogram(results_array, bins=30)
            
            return Response({
                'success': True,
                'statistics': statistics,
                'histogram': hist.tolist(),
                'bin_edges': bin_edges.tolist(),
                'iterations': iterations,
                'quantity': quantity
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            import traceback
            return Response({
                'success': False,
                'error': str(e),
                'traceback': traceback.format_exc()
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
