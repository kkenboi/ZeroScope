from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import Project, EmissionActivity, LCAActivity
from .utils.geocoding import get_coordinates
import math

from rest_framework.permissions import AllowAny

class GlobeDataView(APIView):
    """
    Serves data for the 3D Globe Visualization.
    Aggregates supply chain activities that have geographic data.
    """
    permission_classes = [AllowAny]
    
    def get(self, request, project_id):
        project = get_object_or_404(Project, pk=project_id)
        
        # Base response structure
        response_data = {
            "project_location": {
                "name": project.location or "Project Site",
                "lat": float(project.latitude) if project.latitude else 0,
                "lng": float(project.longitude) if project.longitude else 0,
            },
            "routes": [],
            "markers": [],
            "statistics": {
                "total_emissions": 0,
                "mapped_emissions": 0,
                "unmapped_emissions": 0
            }
        }
        
        # Helper to process activities
        def process_activity(activity, is_lca=False):
            try:
                # Calculate emissions tCO2e
                # Handle None values safely using 0
                raw_emissions = activity.calculated_emissions
                if raw_emissions is None:
                    raw_emissions = 0
                    
                emissions = float(raw_emissions)
                if is_lca:
                    emissions = emissions / 1000.0 # Convert kg to tonnes if LCA
                
                response_data["statistics"]["total_emissions"] += emissions
                
                # Check for coordinates
                has_origin = activity.origin_latitude and activity.origin_longitude
                has_dest = activity.destination_latitude and activity.destination_longitude
                
                if has_origin:
                    response_data["statistics"]["mapped_emissions"] += emissions
                    
                    # Create Marker for Origin
                    response_data["markers"].append({
                        "id": str(activity.activity_id),
                        "name": activity.activity_name,
                        "lat": float(activity.origin_latitude),
                        "lng": float(activity.origin_longitude),
                        "emissions": emissions,
                        "type": "lca" if is_lca else "direct",
                        "location_name": activity.origin_location or "Unknown"
                    })
                    
                    # Create Route if we have a destination (which should be Project Location usually)
                    if has_dest:
                        response_data["routes"].append({
                            "id": str(activity.activity_id),
                            "start_lat": float(activity.origin_latitude),
                            "start_lng": float(activity.origin_longitude),
                            "end_lat": float(activity.destination_latitude),
                            "end_lng": float(activity.destination_longitude),
                            "emissions": emissions,
                            "name": activity.activity_name
                        })
                else:
                    response_data["statistics"]["unmapped_emissions"] += emissions
            except Exception as e:
                # Log error but continue processing other activities
                print(f"Error processing activity {activity.activity_id}: {str(e)}")
        
        try:
            # Process Emission Activities
            if hasattr(project, 'activities'):
                for activity in project.activities.all():
                    process_activity(activity, is_lca=False)
            
            # Process LCA Activities
            if hasattr(project, 'lca_activities'):
                for activity in project.lca_activities.all():
                    process_activity(activity, is_lca=True)
                    
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {"error": str(e), "details": "Failed to process project data"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
