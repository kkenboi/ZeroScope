import os
import json
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import Project, EmissionActivity, LCAActivity
from google import genai
from google.genai import types

# Keep AllowAny for now if other endpoints use it, or change as needed. Adjust based on existing project authentication.
@api_view(['POST'])
@permission_classes([AllowAny])
def generate_reduction_plan(request, project_id):
    project = get_object_or_404(Project, project_id=project_id)
    
    # 1. Gather Project Data
    scopes = project.scopes.all()
    project_data = {
        "project_name": project.name,
        "description": project.description,
        "location": project.location,
        "scopes": []
    }
    
    total_project_emissions = 0
    
    for scope in scopes:
        scope_data = {
            "scope_number": scope.scope_number,
            "total_emissions_tco2e": float(scope.total_emissions_tco2e),
            "activities": [],
            "lca_activities": []
        }
        total_project_emissions += float(scope.total_emissions_tco2e)
        
        # Standard Emission Activities
        for activity in scope.activities.all():
            scope_data["activities"].append({
                "name": activity.activity_name,
                "quantity": float(activity.quantity),
                "unit": activity.unit,
                "emissions_tco2e": float(activity.calculated_emissions),
                "factor_category": activity.emission_factor.category if activity.emission_factor else None,
                "factor_name": activity.emission_factor.name if activity.emission_factor else None
            })
            
        # LCA Activities
        for lca_activity in scope.lca_activities.all():
            scope_data["lca_activities"].append({
                "name": lca_activity.activity_name,
                "quantity": float(lca_activity.quantity),
                "emissions_tco2e": float(lca_activity.get_emissions_tco2e()),
                "bw2_database": lca_activity.bw2_database,
                "bw2_activity": lca_activity.bw2_activity_name
            })
            
        project_data["scopes"].append(scope_data)
        
    project_data["total_project_emissions_tco2e"] = total_project_emissions

    # 2. Prepare Prompt for AI
    system_instruction = """
    You are an expert environmental consultant and Life Cycle Assessment (LCA) specialist. 
    Your task is to analyze the provided carbon emissions data for a project and create a highly actionable, 
    specific "What's Next? / Reduction Plan".
    
    For each major emission source, propose concrete alternative materials, processes, or energy sources 
    to lower the environmental impact. If LCA activities are present, suggest greener alternatives 
    to those specific materials or processes.
    
    You must return a JSON response matching the following schema structure:
    {
      "summary": "A brief overview of the project's emission profile and the main areas for improvement.",
      "actionable_steps": [
        {
          "title": "Short, catchy title for the action",
          "description": "Detailed explanation of what to do",
          "impact": "High, Medium, or Low",
          "category": "E.g., Energy, Materials, Transport, Processes",
          "estimated_reduction_percentage": "Optional number (e.g. 15-20) if possible to estimate, otherwise null"
        }
      ]
    }
    """

    prompt = f"Please analyze the following project data and generate a reduction plan:\n\n{json.dumps(project_data, indent=2)}"

    # 3. Call Google GenAI
    ai_api_key = os.environ.get("GEMINI_API_KEY")
    if not ai_api_key:
        return Response({"error": "GEMINI_API_KEY is not set in environment variables."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        client = genai.Client(api_key=ai_api_key)
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                temperature=0.2, # Low temperature for more analytical/consistent output
            ),
        )
        
        reduction_plan = json.loads(response.text)
        return Response(reduction_plan, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        return Response({
            "error": f"Failed to generate reduction plan: {str(e)}",
            "details": traceback.format_exc()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
