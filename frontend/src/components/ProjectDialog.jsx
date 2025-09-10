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
} from "@mui/icons-material";

const ProjectDialog = ({ 
  open, 
  onClose, 
  project, 
  onDelete, 
  onViewDetails 
}) => {
  const [projectDetails, setProjectDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

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
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>
              {project.name}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {/* Description */}
        <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
          {project.description || 'No description available'}
        </Typography>

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
              
              <Grid container spacing={3} alignItems="center">
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
                  <Grid container spacing={1.5}>
                    {[
                      { number: 1, value: scopeData.scope1, label: 'Direct Emissions', color: '#1976d2' },
                      { number: 2, value: scopeData.scope2, label: 'Energy Indirect', color: '#ed6c02' },
                      { number: 3, value: scopeData.scope3, label: 'Other Indirect', color: '#2e7d32' }
                    ].map((scope) => (
                      <Grid item xs={4} key={scope.number}>
                        <Card 
                          variant="outlined" 
                          sx={{ 
                            textAlign: 'center', 
                            p: 1.5,
                            borderColor: scope.value > 0 ? scope.color : 'divider',
                            bgcolor: scope.value > 0 ? `${scope.color}08` : 'transparent'
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.5 }}>
                            {getScopeIcon(scope.number)}
                          </Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: scope.color, mb: 0.5 }}>
                            {formatEmissions(scope.value)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.2 }}>
                            Scope {scope.number}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem', lineHeight: 1.1 }}>
                            {scope.label}
                          </Typography>
                          
                          {/* Progress bar showing relative contribution */}
                          {totalEmissions > 0 && (
                            <LinearProgress
                              variant="determinate"
                              value={(scope.value / totalEmissions) * 100}
                              sx={{ 
                                mt: 0.75, 
                                height: 3, 
                                borderRadius: 2,
                                bgcolor: 'grey.200',
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
