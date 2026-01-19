"""
Dashboard statistics endpoint for ZeroScope
Aggregates emissions data by time period and scope
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

from django.db.models import Sum, Q
from datetime import timedelta, datetime
from django.utils import timezone
from decimal import Decimal
from collections import defaultdict
import calendar

from .models import Project, EmissionScope, EmissionActivity, LCAActivity


@api_view(['GET'])
@permission_classes([AllowAny])
def dashboard_stats(request, project_id=None):
    """
    Aggregate dashboard statistics with time-period support
    
    Query Parameters:
    - period: '3months', '6months', or '1year' (default: '6months')
    
    Returns:
    - total_emissions: Total emissions for the project (tCO₂e)
    - total_projects: 1 (or count if filtered by list)
    - monthly_emissions: Array of {month, emissions, target} for chart
    - emissions_by_scope: {scope_number: emissions} for pie chart
    - period: The period used for filtering
    """
    try:
        # Query parameters
        period = request.GET.get('period', '6months')
        
        # Calculate date range
        end_date = timezone.now().date()
        if period == '3months':
            start_date = end_date - timedelta(days=90)
            months_back = 3
        elif period == '1year':
            start_date = end_date - timedelta(days=365)
            months_back = 12
        else:  # 6months default
            start_date = end_date - timedelta(days=180)
            months_back = 6
        
        # Get Projects
        if project_id:
            projects = Project.objects.filter(pk=project_id)
        else:
            projects = Project.objects.all()
            
        total_projects = projects.count()
        
        # Calculate total emissions (all time)
        total_emissions = Decimal('0')
        for project in projects:
            for scope in project.scopes.all():
                total_emissions += scope.total_emissions_tco2e or Decimal('0')
        
        # Monthly emissions (within period)
        # Note: calculate_monthly_emissions needs to filter by project now too
        monthly_data = calculate_monthly_emissions(start_date, end_date, months_back, projects)
        
        # Emissions by scope
        emissions_by_scope = calculate_emissions_by_scope(projects)
        
        # Calculate monthly change (if we have at least 2 months of data)
        monthly_change = None
        if len(monthly_data) >= 2:
            current_month = monthly_data[-1]['emissions']
            previous_month = monthly_data[-2]['emissions']
            if previous_month > 0:
                monthly_change = ((current_month - previous_month) / previous_month) * 100
        
        return Response({
            'total_emissions': float(round(total_emissions, 2)),
            'total_projects': total_projects,
            'monthly_emissions': monthly_data,
            'emissions_by_scope': emissions_by_scope,
            'monthly_change': round(monthly_change, 1) if monthly_change is not None else None,
            'period': period
        })
        
    except Exception as e:
        import traceback
        return Response({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def calculate_monthly_emissions(start_date, end_date, months_back, projects_queryset=None):
    """
    Calculate emissions for each month in the period.
    Groups activities by their period_start month.
    For activities without period_start, uses created_date.
    """
    # Generate list of months
    months = []
    current = end_date
    for i in range(months_back):
        months.insert(0, {
            'year': current.year,
            'month': current.month,
            'month_name': calendar.month_abbr[current.month],
            'emissions': 0,
            'target': 2000  # TODO: Make this configurable per project
        })
        # Go back one month
        if current.month == 1:
            current = current.replace(year=current.year - 1, month=12)
        else:
            current = current.replace(month=current.month - 1)
    
    # Base filters
    ea_filter = Q()
    lca_filter = Q()
    
    if projects_queryset is not None:
        ea_filter &= Q(project__in=projects_queryset)
        lca_filter &= Q(project__in=projects_queryset)
    
    # Aggregate emissions by month
    for month_data in months:
        year = month_data['year']
        month = month_data['month']
        
        # Get first and last day of this month
        first_day = datetime(year, month, 1).date()
        last_day = datetime(year, month, calendar.monthrange(year, month)[1]).date()
        
        monthly_total = Decimal('0')
        
        # Sum EmissionActivity emissions for this month
        # Activities with period_start in this month
        emission_activities = EmissionActivity.objects.filter(
            ea_filter,
            period_start__gte=first_day,
            period_start__lte=last_day
        )
        for activity in emission_activities:
            monthly_total += activity.calculated_emissions or Decimal('0')
        
        # Activities without period_start but created in this month
        emission_activities_no_period = EmissionActivity.objects.filter(
            ea_filter,
            period_start__isnull=True,
            created_date__date__gte=first_day,
            created_date__date__lte=last_day
        )
        for activity in emission_activities_no_period:
            monthly_total += activity.calculated_emissions or Decimal('0')
        
        # Sum LCAActivity emissions for this month (convert from kgCO₂e to tCO₂e)
        lca_activities = LCAActivity.objects.filter(
            lca_filter,
            period_start__gte=first_day,
            period_start__lte=last_day
        )
        for activity in lca_activities:
            monthly_total += (activity.calculated_emissions or Decimal('0')) / Decimal('1000')
        
        # LCA activities without period_start but created in this month
        lca_activities_no_period = LCAActivity.objects.filter(
            lca_filter,
            period_start__isnull=True,
            created_date__date__gte=first_day,
            created_date__date__lte=last_day
        )
        for activity in lca_activities_no_period:
            monthly_total += (activity.calculated_emissions or Decimal('0')) / Decimal('1000')
        
        month_data['emissions'] = float(round(monthly_total, 2))
    
    return months


def calculate_emissions_by_scope(projects_queryset=None):
    """
    Calculate total emissions grouped by scope number.
    Returns dict like {1: 45.2, 2: 67.8, 3: 10.45}
    """
    emissions_by_scope = {}
    
    # Get all scopes
    if projects_queryset is not None:
        scopes = EmissionScope.objects.filter(project__in=projects_queryset)
    else:
        scopes = EmissionScope.objects.all()
    
    for scope in scopes:
        scope_num = scope.scope_number
        if scope_num not in emissions_by_scope:
            emissions_by_scope[scope_num] = Decimal('0')
        
        emissions_by_scope[scope_num] += scope.total_emissions_tco2e or Decimal('0')
    
    # Convert to float and round
    return {
        scope_num: float(round(emissions, 2))
        for scope_num, emissions in emissions_by_scope.items()
    }
