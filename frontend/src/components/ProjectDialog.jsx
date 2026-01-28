import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Avatar,
  Chip,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
  Paper,
  TextField,
} from "@mui/material";
import {
  FolderOpen as ProjectIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Assessment as ScopeIcon,
  Factory as Scope1Icon,
  ElectricBolt as Scope2Icon,
  LocalShipping as Scope3Icon,
  DataObject as FactorIcon,
  TrendingUp as EmissionIcon,
  Edit as EditIcon,
} from "@mui/icons-material";

const ProjectDialog = ({
  open,
  onClose,
  project,
  onDelete,
  onViewDetails,
  onProjectUpdate
}) => {
  const [projectDetails, setProjectDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [tempDesc, setTempDesc] = useState("");
  const [isSavingDesc, setIsSavingDesc] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  // Fetch detailed project data when dialog opens
  useEffect(() => {
    if (open && project?.project_id) {
      fetchProjectDetails(project.project_id);
    }
  }, [open, project?.project_id]);

  const fetchProjectDetails = async (projectId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/`);
      if (response.ok) {
        const data = await response.json();
        setProjectDetails(data);
        setTempDesc(data.description || "");
        setTempName(data.name || "");
      } else {
        setError('Failed to load project details');
      }
    } catch (err) {
      setError('Error loading project details');
      console.error('Error fetching project details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDescription = async () => {
    if (!project?.project_id) return;
    try {
      setIsSavingDesc(true);
      const response = await fetch(`/api/projects/${project.project_id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: tempDesc }),
      });

      if (response.ok) {
        setProjectDetails(prev => ({ ...prev, description: tempDesc }));
        if (onProjectUpdate) {
          onProjectUpdate({ ...project, description: tempDesc });
        }
        setIsEditingDesc(false);
      } else {
        setError("Failed to update description");
      }
    } catch (err) {
      setError("Error updating description");
    } finally {
      setIsSavingDesc(false);
    }
  };

  const startEditingDesc = () => {
    setTempDesc(projectDetails?.description || project.description || "");
    setIsEditingDesc(true);
  };

  const handleSaveName = async () => {
    if (!project?.project_id || !tempName.trim()) return;
    try {
      setIsSavingName(true);
      const response = await fetch(`/api/projects/${project.project_id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tempName }),
      });

      if (response.ok) {
        setProjectDetails(prev => ({ ...prev, name: tempName }));
        if (onProjectUpdate) {
          onProjectUpdate({ ...project, name: tempName });
        }
        setIsEditingName(false);
      } else {
        setError("Failed to update name");
      }
    } catch (err) {
      setError("Error updating name");
    } finally {
      setIsSavingName(false);
    }
  };

  const startEditingName = () => {
    setTempName(projectDetails?.name || project.name || "");
    setIsEditingName(true);
  };

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(project.project_id);
    } else {
      navigate(`/projects/${project.project_id}`);
    }
    onClose();
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    }
    onClose();
  };

  // Calculate total emissions across all scopes
  const calculateTotalEmissions = () => {
    if (!projectDetails?.scopes) return 0;
    return projectDetails.scopes.reduce((total, scope) => {
      return total + parseFloat(scope.total_emissions_tco2e || 0);
    }, 0);
  };

  // Get scope data with proper formatting
  const getScopeData = () => {
    if (!projectDetails?.scopes) return { scope1: 0, scope2: 0, scope3: 0 };

    const scopeData = { scope1: 0, scope2: 0, scope3: 0 };
    projectDetails.scopes.forEach(scope => {
      const emissions = parseFloat(scope.total_emissions_tco2e || 0);
      if (scope.scope_number === 1) scopeData.scope1 = emissions;
      else if (scope.scope_number === 2) scopeData.scope2 = emissions;
      else if (scope.scope_number === 3) scopeData.scope3 = emissions;
    });

    return scopeData;
  };

  // Count active data sources (unique emission factors)
  const getActiveDataSources = () => {
    if (!projectDetails?.scopes) return { count: 0, factors: [] };

    const factorIds = new Set();
    const factorNames = [];

    projectDetails.scopes.forEach(scope => {
      if (scope.activities) {
        scope.activities.forEach(activity => {
          if (activity.emission_factor && !factorIds.has(activity.emission_factor.factor_id)) {
            factorIds.add(activity.emission_factor.factor_id);
            factorNames.push({
              name: activity.emission_factor.name,
              category: activity.emission_factor.category_display
            });
          }
        });
      }
    });

    return { count: factorIds.size, factors: factorNames.slice(0, 3) }; // Show max 3 in preview
  };

  const formatEmissions = (value) => {
    const num = parseFloat(value);
    if (num === 0) return '0';
    if (num < 0.01) return '<0.01';
    return num.toFixed(2);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "completed": return "success";
      case "in progress": return "warning";
      case "active": return "primary";
      default: return "default";
    }
  };

  const getScopeIcon = (scopeNumber) => {
    switch (scopeNumber) {
      case 1: return <Scope1Icon />;
      case 2: return <Scope2Icon />;
      case 3: return <Scope3Icon />;
      default: return <ScopeIcon />;
    }
  };

  const totalEmissions = calculateTotalEmissions();
  const scopeData = getScopeData();
  const { count: dataSourceCount, factors: previewFactors } = getActiveDataSources();

  if (!project) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          minHeight: 500,
          maxHeight: '90vh'
        },
      }}
    >
      <DialogTitle sx={{ pb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Avatar sx={{ bgcolor: "primary.main", width: 56, height: 56 }}>
            <ProjectIcon fontSize="large" />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            {isEditingName ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  variant="outlined"
                  size="small"
                  autoFocus
                  sx={{ flex: 1 }}
                />
                <Button onClick={handleSaveName} variant="contained" disabled={isSavingName}>Save</Button>
                <Button onClick={() => setIsEditingName(false)}>Cancel</Button>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, '&:hover .edit-name-icon': { opacity: 1 } }}>
                <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {projectDetails?.name || project.name}
                </Typography>
                <EditIcon
                  className="edit-name-icon"
                  fontSize="small"
                  sx={{ opacity: 0, cursor: 'pointer', color: 'action.active', transition: 'opacity 0.2s' }}
                  onClick={startEditingName}
                />
              </Box>
            )}
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {/* Description Section - Editable */}
        <Box sx={{ mb: 4, mt: 2 }}>
          {isEditingDesc ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={tempDesc}
                onChange={(e) => setTempDesc(e.target.value)}
                placeholder="Project description..."
                variant="outlined"
                size="small"
                autoFocus
              />
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button size="small" onClick={() => setIsEditingDesc(false)}>Cancel</Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleSaveDescription}
                  disabled={isSavingDesc}
                >
                  Save
                </Button>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, '&:hover .edit-icon': { opacity: 1 } }}>
              <Typography variant="body1" sx={{ color: 'text.secondary', flex: 1 }}>
                {projectDetails?.description || project.description || 'No description available'}
              </Typography>
              <EditIcon
                className="edit-icon"
                fontSize="small"
                sx={{ opacity: 0, cursor: 'pointer', color: 'action.active', transition: 'opacity 0.2s' }}
                onClick={startEditingDesc}
              />
            </Box>
          )}
        </Box>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Loading project details...
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && (
          <>
            {/* Emission Summary */}
            <Paper elevation={1} sx={{ p: 2.5, mb: 2.5, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <EmissionIcon color="primary" />
                Emission Summary
              </Typography>

              <Grid container spacing={24} alignItems="center" sx={{ justifyContent: 'center' }}>
                {/* Total Emissions */}
                <Grid item xs={12} md={4}>
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {formatEmissions(totalEmissions)}
                      <Typography component="span" variant="h6" sx={{ fontWeight: 400, color: 'text.secondary', ml: 1 }}>
                        tCO₂e
                      </Typography>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Project Emissions
                    </Typography>
                  </Box>
                </Grid>

                {/* Scope Breakdown */}
                <Grid item xs={12} md={8}>
                  <Grid container spacing={4}>
                    {[
                      { number: 1, value: scopeData.scope1, label: 'Direct Emissions', color: '#1976d2', bgcolor: '#e3f2fd' },
                      { number: 2, value: scopeData.scope2, label: 'Energy Indirect', color: '#ed6c02', bgcolor: '#fff3e0' },
                      { number: 3, value: scopeData.scope3, label: 'Other Indirect', color: '#2e7d32', bgcolor: '#e8f5e9' }
                    ].map((scope) => (
                      <Grid item xs={12} sm={4} key={scope.number}>
                        <Card
                          variant="outlined"
                          sx={{
                            textAlign: 'center',
                            p: 2,
                            borderColor: scope.value > 0 ? scope.color : 'divider',
                            bgcolor: scope.value > 0 ? scope.bgcolor : 'background.paper',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            transition: 'transform 0.2s',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: 2
                            }
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
                            <Avatar sx={{ bgcolor: scope.color, width: 40, height: 40 }}>
                              {getScopeIcon(scope.number)}
                            </Avatar>
                          </Box>
                          <Typography variant="h5" sx={{ fontWeight: 700, color: scope.color, mb: 0.5 }}>
                            {formatEmissions(scope.value)}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            Scope {scope.number}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {scope.label}
                          </Typography>

                          {/* Progress bar showing relative contribution */}
                          {totalEmissions > 0 && (
                            <LinearProgress
                              variant="determinate"
                              value={(scope.value / totalEmissions) * 100}
                              sx={{
                                mt: 2,
                                height: 6,
                                borderRadius: 3,
                                bgcolor: 'rgba(0,0,0,0.05)',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: scope.color
                                }
                              }}
                            />
                          )}
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              </Grid>
            </Paper>

            {/* Active Data Sources */}
            <Paper elevation={1} sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <FactorIcon color="primary" />
                Active Data Sources
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                <Chip
                  label={`${dataSourceCount} Emission Factors`}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              </Box>

              {dataSourceCount > 0 ? (
                <>
                  <List dense sx={{ py: 0 }}>
                    {previewFactors.map((factor, index) => (
                      <ListItem key={index} sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <FactorIcon fontSize="small" color="action" />
                        </ListItemIcon>
                        <ListItemText
                          primary={factor.name}
                          secondary={factor.category}
                          primaryTypographyProps={{ variant: 'body2' }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                      </ListItem>
                    ))}
                  </List>

                  {dataSourceCount > 3 && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      + {dataSourceCount - 3} more factors
                    </Typography>
                  )}
                </>
              ) : (
                <Alert severity="info" variant="outlined">
                  No emission factors linked yet. Add activities to see data sources.
                </Alert>
              )}
            </Paper>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button onClick={handleDelete} color="error" startIcon={<DeleteIcon />}>
          Delete
        </Button>
        <Button
          onClick={handleViewDetails}
          variant="contained"
          startIcon={<ViewIcon />}
          sx={{ borderRadius: 2 }}
        >
          View Full Details
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProjectDialog;
