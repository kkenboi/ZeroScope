import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Avatar,
  CardHeader,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  FolderOpen as ProjectIcon,
  Schedule as TimeIcon,
} from "@mui/icons-material";
import ProjectDialog from "../components/ProjectDialog";

function Projects() {
  const [projects, setProjects] = useState([]);
  const [newProjectName, setProjectName] = useState("");
  const [selectedProject, setSelectedProject] = useState(null)
  const [previewDialog, setPreviewDialog] = useState(false)
  const [createDialog, setCreateDialog] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const navigate = useNavigate()

  // Load projects from backend
  // useEffect is used when we want to do side effects - data fetching or setting up timers
  // The dependency array [] is used to signify what variables changed does the side effect then occur
  // [] empty = once at start, [var1, var2] = when these variables change, empty = occur every render
  // return is for any cleanups if the effect created stuff  
  useEffect(() => {
    fetch("/api/projects/") // adjust to your backend URL
      .then(res => res.json())
      .then(data => {
        // If paginated, use data.results; else, use data directly
        setProjects(Array.isArray(data) ? data : (data.results || []));
      })
      .catch(() => setProjects([]));
  }, []);

  // Create a new project
  const createProject = async () => {
    // asking django to create a project through this URL

    const projectName = newProjectName == "" ? "New Project" : newProjectName;

    const result = await fetch("api/projects/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: projectName }) // we are creating with this name (if model, has required fields that are not specified here, it will 400 error)
    });
    if (result.ok) {
      const newProject = await result.json();
      setProjects([...projects, newProject]); // adding previous projects with this new project

      // reset
      setProjectName("");
      setCreateDialog(false);
    }
  }

  // Delete a project
  const deleteProject = async (id) => {
    const result = await fetch(`/api/projects/${id}/`, {
      method: "DELETE"
    });
    if (result.ok) {
      setProjects(projects.filter(p => p.project_id !== id)); // what are the actual IDs and do they get reset after deleting?

      // exit out of all the dialogs
      setPreviewDialog(false);
      setDeleteDialog(false);
    }
  };

  // Update a project
  const updateProject = async (id, updatedData) => {
    const result = await fetch(`/api/projects/${id}/`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedData),  // send full updated object
    });
    if (result.ok) {
      const updatedProject = await result.json(); // extract the JSON portion of the updated project
      setProjects(projects.map(p => p.project_id === id ? updatedProject : p)); // keep everything same, update affected id
    }
  }

  // helper functions
  const handleCardClick = (project) => {
    setSelectedProject(project);
    setPreviewDialog(true);
  }

  const handleViewDetails = (projectId) => {
    navigate(`/projects/${projectId}`);
  }

  const handleDeleteClick = () => {
    setDeleteDialog(true);
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "success";
      case "In Progress":
        return "warning";
      case "Active":
        return "primary";
      default:
        return "default";
    }
  }


  const handleProjectUpdate = (updatedProject) => {
    setProjects(prev => prev.map(p =>
      p.project_id === updatedProject.project_id ? { ...p, ...updatedProject } : p
    ));
    if (selectedProject?.project_id === updatedProject.project_id) {
      setSelectedProject(prev => ({ ...prev, ...updatedProject }));
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
            Projects
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage and track your project portfolio
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialog(true)}
          sx={{ borderRadius: 2, px: 3 }}
        >
          New Project
        </Button>
      </Box>

      {/* Box Grid to fit Projects */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
            lg: "repeat(3, 1fr)",
          },
          gap: 2,
          mt: 2,
        }}
      >
        {projects.map((project) => (
          <Card
            key={project.project_id}
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              cursor: "pointer",
              transition: "all 0.3s ease",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: 6,
              },
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
            onClick={() => handleCardClick(project)}
          >
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: "primary.main" }}>
                  <ProjectIcon />
                </Avatar>
              }
              title={
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {project.name}
                </Typography>
              }
              subheader={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                  <TimeIcon fontSize="small" color="action" />
                  <Typography variant="caption" color="text.secondary">
                    {project.last_modified ? formatDate(project.last_modified) : 'N/A'}
                  </Typography>
                </Box>
              }
            />
            <CardContent sx={{ flexGrow: 1, pt: 0 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 2, height: '40px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {project.description || "No description provided."}
              </Typography>

              <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Total Emissions
                  </Typography>
                  <Typography variant="h6" color="primary" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                    {(() => {
                      const total = (project.scopes || []).reduce((acc, scope) => acc + Number(scope.total_emissions_tco2e || 0), 0);
                      return total < 0.01 && total > 0 ? "<0.01" : total.toFixed(2);
                    })()}
                    <Typography component="span" variant="caption" sx={{ ml: 0.5, fontWeight: 500 }}>tCO₂e</Typography>
                  </Typography>
                </Box>
                <Chip
                  label={`${(project.scopes || []).reduce((acc, s) => acc + (s.activities?.length || 0) + (s.lca_activities?.length || 0), 0)} Activities`}
                  size="small"
                  variant="outlined"
                />
              </Box>
            </CardContent>
          </Card>
        ))
        }
      </Box>

      {/* Enhanced Project Dialog */}
      <ProjectDialog
        open={previewDialog}
        onClose={() => setPreviewDialog(false)}
        project={selectedProject}
        onDelete={handleDeleteClick}
        onViewDetails={handleViewDetails}
        onProjectUpdate={handleProjectUpdate}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog}
        onClose={() => setDeleteDialog(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 },
        }}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to delete "{selectedProject?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button onClick={() => setDeleteDialog(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={() => deleteProject(selectedProject?.project_id)}
            color="error"
            variant="contained"
            startIcon={<DeleteIcon />}
          >
            Yes, Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Project Dialog */}
      <Dialog
        open={createDialog}
        onClose={() => setCreateDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 },
        }}
      >
        <DialogTitle>Create New Project</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Project Name"
            fullWidth
            variant="outlined"
            value={newProjectName}
            onChange={(e) => setProjectName(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
          <Button onClick={createProject} variant="contained" sx={{ borderRadius: 2 }}>
            Create Project
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}

export default Projects