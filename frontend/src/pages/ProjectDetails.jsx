"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Avatar,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from "@mui/material"
import {
  ArrowBack as BackIcon,
  FolderOpen as ProjectIcon,
  Assignment as TaskIcon,
  Person as PersonIcon,
  Code as CodeIcon,
} from "@mui/icons-material"

function ProjectDetails() {
  const { projectID } = useParams(); // Correctly extracts UUID from URL

  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/projects/${projectID}/`); // Use projectID directly
        
        if (!response.ok) {
          throw new Error('Project not found');
        }
        
        const projectData = await response.json();
        setProject(projectData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (projectID) {
      fetchProject();
    }
  }, [projectID]);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Error: {error}</Typography>
        <Button onClick={() => navigate("/projects")} startIcon={<BackIcon />}>
          Back to Projects
        </Button>
      </Box>
    );
  }

  if (!project) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Project not found</Typography>
        <Button onClick={() => navigate("/projects")} startIcon={<BackIcon />}>
          Back to Projects
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with back button */}
      <Button onClick={() => navigate("/projects")} startIcon={<BackIcon />} sx={{ mb: 2 }}>
        Back to Projects
      </Button>

      <Typography variant="h4" sx={{ mb: 3 }}>
        {project.name}
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 2 }}>
        {project.description}
      </Typography>
      
      <Typography variant="body2" color="text.secondary">
        Project ID: {project.project_id}
      </Typography>
      
      <Typography variant="body2" color="text.secondary">
        Created: {new Date(project.created_date).toLocaleDateString()}
      </Typography>
      
      <Typography variant="body2" color="text.secondary">
        Last Modified: {new Date(project.last_modified).toLocaleDateString()}
      </Typography>
    </Box>
  );
}

export default ProjectDetails;