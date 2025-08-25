import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Avatar,
  CardHeader,
  Fade,
  Backdrop,
} from "@mui/material";
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  FolderOpen as ProjectIcon,
  Schedule as TimeIcon,
} from "@mui/icons-material";

function Projects() {
    const [projects, setProjects] = useState([]);
    const [newProjectName, setProjectName] = useState("");
    const [selectedProject, setSelectedProject] = useState(null)
    const [previewOpen, setPreviewOpen] = useState(false)
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const navigate = useNavigate()

    // Load projects from backend
    // useEffect is used when we want to do side effects - data fetching or setting up timers
    // The dependency array [] is used to signify what variables changed does the side effect then occur
    // [] empty = once at start, [var1, var2] = when these variables change, empty = occur every render
    // return is for any cleanups if the effect created stuff  
    useEffect(() => {
        fetch("/api/projects/") // adjust to your backend URL
        .then(res => res.json())
        .then(data => setProjects(data));
    }, []);

    // Create a new project
    const createProject = async () => {
        // asking django to create a project through this URL

        const projectName = newProjectName == "" ? "New Project" : newProjectName;

        const result = await fetch("api/projects/", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({title: projectName}) // we are creating with this title (if model, has required fields that are not specified here, it will 400 error)
        });
        if (result.ok) {
            const newProject = await result.json();
            setProjects([...projects, newProject]); // adding previous projects with this new project

            // reset
            setProjectName("");
            setCreateDialogOpen(false);
        }
    }

    // Delete a project
    const deleteProject = async (id) => {
        const result = await fetch(`/api/projects/${id}/`, { 
            method: "DELETE" 
        });
        if (result.ok) {
            setProjects(projects.filter(p => p.id !== id)); // what are the actual IDs and do they get reset after deleting?
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
            setProjects(projects.map(p => p.id === id ? updatedProject : p)); // keep everything same, update affected id
        }
    }

    // helper functions
    const handleCardClick = (project) => {
        setSelectedProject(project);
        setPreviewOpen(true);
    }

    const handleViewDetails = (projectId) => {
        navigate(`/projects/${projectId}`);
    }
    
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

    // // each project shows its item and takes care of it's own state
    // function ProjectItem({ project, onUpdate, onDelete }) {
    //     const [editName, setEditName] = useState("");

    //     return (
    //         <li>
    //             <span>{project.title}</span>
    //             <input
    //                 value={editName}
    //                 onChange={(e) => setEditName(e.target.value)}
    //             />
    //             <button onClick={() => onUpdate(project.id, { title: editName })}>
    //                 Update Name
    //             </button>
    //             <button onClick={() => onDelete(project.id)}>Delete</button>
    //         </li>
    //     );
    // }

    return (
        <Box sx={{ p: 3 }}>
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
            onClick={() => setCreateDialogOpen(true)}
            sx={{ borderRadius: 2, px: 3 }}
            >
            New Project
            </Button>
        </Box>

        <Grid container spacing={3}>
            {projects.map((project) => (
            <Grid item xs={12} sm={6} md={4} key={project.id}>
                <Card
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
                        {project.title}
                    </Typography>
                    }
                    subheader={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                        <TimeIcon fontSize="small" color="action" />
                        <Typography variant="caption" color="text.secondary">
                        {project.lastModified}
                        </Typography>
                    </Box>
                    }
                />
                <CardContent sx={{ flexGrow: 1, pt: 0 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {project.description}
                    </Typography>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Chip
                        label={project.status}
                        color={getStatusColor(project.status)}
                        size="small"
                        sx={{ borderRadius: 1 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                        {project.progress}% complete
                    </Typography>
                    </Box>
                </CardContent>
                </Card>
            </Grid>
            ))}
        </Grid>

        <Dialog
            open={previewOpen}
            onClose={() => setPreviewOpen(false)}
            maxWidth="md"
            fullWidth
            TransitionComponent={Fade}
            BackdropComponent={Backdrop}
            BackdropProps={{
            sx: { backgroundColor: "rgba(0, 0, 0, 0.7)" },
            }}
            slotProps={{
                paper: {
                    sx: { borderRadius: 3, minHeight: 400 },
                }
            }}
        >
            {selectedProject && (
            <>
                <DialogTitle sx={{ pb: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Avatar sx={{ bgcolor: "primary.main" }}>
                    <ProjectIcon />
                    </Avatar>
                    <Box>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        {selectedProject.title}
                    </Typography>
                    <Chip
                        label={selectedProject.status}
                        color={getStatusColor(selectedProject.status)}
                        size="small"
                        sx={{ mt: 1 }}
                    />
                    </Box>
                </Box>
                </DialogTitle>
                <DialogContent>
                <Typography variant="body1" sx={{ mb: 3 }}>
                    {selectedProject.description}
                </Typography>
                <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                    <strong>Last Modified:</strong> {selectedProject.lastModified}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                    <strong>Progress:</strong> {selectedProject.progress}%
                    </Typography>
                </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3, gap: 1 }}>
                <Button onClick={() => setPreviewOpen(false)} color="inherit">
                    Close
                </Button>
                <Button onClick={() => deleteProject(selectedProject.id)} color="error" startIcon={<DeleteIcon />}>
                    Delete
                </Button>
                <Button
                    onClick={() => handleViewDetails(selectedProject.id)}
                    variant="contained"
                    startIcon={<ViewIcon />}
                    sx={{ borderRadius: 2 }}
                >
                    View Details
                </Button>
                </DialogActions>
            </>
            )}
        </Dialog>

        <Dialog
            open={createDialogOpen}
            onClose={() => setCreateDialogOpen(false)}
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
            <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={createProject} variant="contained" sx={{ borderRadius: 2 }}>
                Create Project
            </Button>
            </DialogActions>
        </Dialog>
        </Box>
    );
}

export default Projects