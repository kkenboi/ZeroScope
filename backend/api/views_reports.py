"""
Reporting endpoint for ZeroScope
Generates reports based on ISO 14040/14044, GHG Protocol, and TCFD standards.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

from django.db.models import Sum
from django.utils import timezone
from decimal import Decimal
import json

from .models import Project, EmissionScope, EmissionActivity, LCAActivity

@api_view(['GET'])
@permission_classes([AllowAny])
def generate_report(request):
    """
    Generate a report for a specific project and standard.
    
    Query Parameters:
    - project_id: ID of the project to report on
    - standard: 'ghg', 'iso', or 'tcfd'
    - period: '3months', '6months', '1year', 'all' (default: 'all')
    
    Returns:
    - JSON object containing structured report data
    """
    try:
        project_id = request.GET.get('project_id')
        standard = request.GET.get('standard', 'ghg')
        period = request.GET.get('period', 'all')
        
        if not project_id:
            return Response({'error': 'project_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            project = Project.objects.get(project_id=project_id)
        except Project.DoesNotExist:
            return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)
            
        # Basic Project Info
        report_data = {
            'project_name': project.name,
            'project_description': project.description,
            'generated_date': timezone.now().strftime('%Y-%m-%d'),
            'standard': standard.upper(),
            'period': period,
        }
        
        # Fetch Data (Scopes and Activities)
        scopes = project.scopes.all().prefetch_related('activities', 'lca_activities')
        
        # Generate Standard-Specific Report
        if standard == 'ghg':
            report_data.update(generate_ghg_report(scopes))
        elif standard == 'iso':
            report_data.update(generate_iso_report(scopes))
        elif standard == 'tcfd':
            report_data.update(generate_tcfd_report(scopes))
        else:
            return Response({'error': 'Invalid standard. Choose ghg, iso, or tcfd.'}, status=status.HTTP_400_BAD_REQUEST)
            
        return Response(report_data)

    except Exception as e:
        import traceback
        return Response({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def generate_ghg_report(scopes):
    """
    Generates data for GHG Protocol Corporate Standard.
    Focus: Scope 1, 2, and 3 breakdown.
    """
    scope_data = {1: 0, 2: 0, 3: 0}
    scope_details = {1: [], 2: [], 3: []}
    total_emissions = 0
    
    for scope in scopes:
        s_num = scope.scope_number
        s_total = float(scope.total_emissions_tco2e or 0)
        scope_data[s_num] = s_total
        total_emissions += s_total
        
        def get_emissions(act):
            if hasattr(act, 'get_emissions_tco2e'):
                return float(act.get_emissions_tco2e() or 0)
            return float(getattr(act, 'calculated_emissions', 0) or 0)

        # Collect significant activities for details
        activities = list(scope.activities.all()) + list(scope.lca_activities.all())
        # Sort by emissions desc
        activities.sort(key=get_emissions, reverse=True)
        
        for act in activities[:5]: # Top 5 per scope
            name = getattr(act, 'activity_name', 'Unknown Activity')
            val = get_emissions(act)
            
            scope_details[s_num].append({
                'name': name,
                'emissions': round(val, 3)
            })

    return {
        'summary': {
            'total_emissions_tco2e': round(total_emissions, 2),
            'scope_1_total': round(scope_data[1], 2),
            'scope_2_total': round(scope_data[2], 2),
            'scope_3_total': round(scope_data[3], 2),
        },
        'details': scope_details,
        'methodology': 'GHG Protocol Corporate Accounting and Reporting Standard',
        'notes': 'Calculations based on standard emission factors and LCA data.'
    }


def generate_iso_report(scopes):
    """
    Generates data for ISO 14040/14044 (LCA).
    Focus: Life Cycle Inventory (LCI) and Impact Assessment (LCIA).
    """
    lca_activities = []
    total_gwp = 0
    
    for scope in scopes:
        for act in scope.lca_activities.all():
            emissions = float(act.get_emissions_tco2e() or 0)
            total_gwp += emissions
            lca_activities.append({
                'name': act.activity_name,
                'product': act.bw2_activity_name or 'Custom Product',
                'database': act.bw2_database,
                'location': act.bw2_location,
                'unit': act.bw2_unit,
                'quantity': float(act.quantity or 0),
                'impact_gwp100': round(emissions, 3)
            })
            
    return {
        'goal_and_scope': {
            'goal': 'To assess the environmental impact of project activities.',
            'functional_unit': 'Various (see activity details)',
            'system_boundary': 'Cradle-to-gate (typical for ecoinvent datasets)'
        },
        'inventory_analysis': {
            'activities_count': len(lca_activities),
            'data_sources': 'Ecoinvent 3.9.1, IPCC 2013',
        },
        'impact_assessment': {
            'method': 'IPCC 2013 GWP 100a',
            'total_gwp_tco2e': round(total_gwp, 2),
            'results_by_activity': lca_activities
        },
        'interpretation': {
            'conclusion': f'The total Global Warming Potential is {round(total_gwp, 2)} tCO2e.',
            'recommendation': 'Focus reduction efforts on high-impact activities identified in the inventory.'
        }
    }


def generate_tcfd_report(scopes):
    """
    Generates data for TCFD (Task Force on Climate-related Financial Disclosures).
    Focus: Governance, Strategy, Risk Management, Metrics & Targets.
    """
    # Reuse GHG calculation for Metrics
    ghg_data = generate_ghg_report(scopes)
    
    return {
        'governance': {
            'disclosure': 'Describe the board\'s oversight of climate-related risks and opportunities.',
            'status': 'Not Started' # Placeholder
        },
        'strategy': {
            'disclosure': 'Describe the actual and potential impacts of climate-related risks and opportunities on the organization\'s businesses, strategy, and financial planning.',
            'scenarios': ['2°C Scenario', 'Business as Usual']
        },
        'risk_management': {
            'disclosure': 'Describe how processes for identifying, assessing, and managing climate-related risks are integrated into the organization\'s overall risk management.',
            'processes': ['Risk Identification', 'Impact Assessment', 'Mitigation Planning']
        },
        'metrics_and_targets': {
            'disclosure': 'Disclose the metrics and targets used to assess and manage relevant climate-related risks and opportunities.',
            'scope_1': ghg_data['summary']['scope_1_total'],
            'scope_2': ghg_data['summary']['scope_2_total'],
            'scope_3': ghg_data['summary']['scope_3_total'],
            'total_emissions': ghg_data['summary']['total_emissions_tco2e'],
            'target': 'Net Zero by 2050 (Example)'
        }
    }
