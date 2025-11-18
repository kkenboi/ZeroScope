"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Divider,
  TextField,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  IconButton,
} from "@mui/material"
import { BarChart } from "@mui/x-charts"
import { DataGrid } from "@mui/x-data-grid"
import { 
  ArrowBack as BackIcon,
  Calculate as CalculateIcon,
  Science as ScienceIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material"
import LCAProductSearch from "../components/LCAProductSearch"

function ProjectDetails() {
  const { projectID } = useParams()
  const navigate = useNavigate()

  const [project, setProject] = useState(null)
  const [factors, setFactors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Form state for new activity dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activityType, setActivityType] = useState('emission_factor') // 'emission_factor' or 'lca'
  const [lcaSearchOpen, setLcaSearchOpen] = useState(false)
  const [selectedLCAProduct, setSelectedLCAProduct] = useState(null)
  const [newActivity, setNewActivity] = useState({
    scope: 1,
    activityName: "",
    description: "",
    quantity: "",
    emissionFactorId: "",
    scope3Category: ""
  })
  const [selectedScopes, setSelectedScopes] = useState([1, 2, 3])
  const [calculating, setCalculating] = useState(false)

  // Fetch project (with scopes + activities)
  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/projects/${projectID}/`)
        if (!response.ok) throw new Error("Project not found")
        const data = await response.json()
        setProject(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (projectID) fetchProject()
  }, [projectID])

  // Fetch emission factors
  useEffect(() => {
    const fetchAllFactors = async () => {
      try {
        let allFactors = [];
        let url = "/api/emission-factors/?page_size=100"; // Use smaller page size
        
        while (url) {
          const response = await fetch(url);
          if (!response.ok) throw new Error("Failed to fetch emission factors");
          
          const data = await response.json();
          
          // Handle both array and paginated responses
          if (Array.isArray(data)) {
            allFactors = [...allFactors, ...data];
            break; // No pagination
          } else if (data.results) {
            allFactors = [...allFactors, ...data.results];
            url = data.next; // Continue to next page if available
          } else {
            break;
          }
        }
        
        console.log(`Loaded ${allFactors.length} emission factors`);
        console.log('Sample factor structure:', allFactors[0]);
        console.log('Factors by scope:', {
          scope1: allFactors.filter(f => f.applicable_scopes && f.applicable_scopes.includes(1)).length,
          scope2: allFactors.filter(f => f.applicable_scopes && f.applicable_scopes.includes(2)).length,
          scope3: allFactors.filter(f => f.applicable_scopes && f.applicable_scopes.includes(3)).length
        });
        setFactors(allFactors);
      } catch (error) {
        console.error("Failed to fetch emission factors:", error);
        setFactors([]);
      }
    };
    
    fetchAllFactors();
  }, [])

  const handleDeleteActivity = async (activityId, activityType) => {
    if (!window.confirm('Are you sure you want to delete this activity?')) {
      return
    }

    try {
      const endpoint = activityType === 'LCA' 
        ? `/api/lca-activities/${activityId}/`
        : `/api/activities/${activityId}/`
      
      const deleteResponse = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'DELETE',
      })

      if (!deleteResponse.ok) {
        throw new Error('Failed to delete activity')
      }

      // Reload project data
      const projectResponse = await fetch(`/api/projects/${projectID}/`)
      if (projectResponse.ok) {
        const data = await projectResponse.json()
        setProject(data)
      }
    } catch (err) {
      console.error('Error deleting activity:', err)
      alert('Failed to delete activity. Please try again.')
    }
  }

  // Filtered factors based on selected scope and category
  const availableFactors = useMemo(() => {
    console.log(`Filtering factors: total=${factors.length}, scope=${newActivity.scope}, category=${newActivity.scope3Category}`);
    
    // Filter by applicable_scopes instead of scope
    let filtered = factors.filter(f => f.applicable_scopes && f.applicable_scopes.includes(newActivity.scope));
    console.log(`After scope filter: ${filtered.length} factors`);
    
    // For Scope 3, also filter by category if one is selected
    if (newActivity.scope === 3 && newActivity.scope3Category) {
      filtered = filtered.filter(f => f.category === newActivity.scope3Category);
      console.log(`After category filter (${newActivity.scope3Category}): ${filtered.length} factors`);
    }
    
    return filtered;
  }, [factors, newActivity.scope, newActivity.scope3Category])

  const handleLCAProductSelect = (product) => {
    setSelectedLCAProduct(product);
    setNewActivity(prev => ({
      ...prev,
      activityName: product.name,
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (activityType === 'lca' && !selectedLCAProduct) {
      alert("Please select an LCA product")
      return
    }
    
    if (activityType === 'emission_factor' && !newActivity.emissionFactorId) {
      alert("Please select an emission factor")
      return
    }

    if (!newActivity.activityName.trim()) {
      alert("Please enter an activity name")
      return
    }

    if (!newActivity.quantity || Number(newActivity.quantity) <= 0) {
      alert("Please enter a valid quantity")
      return
    }

    setCalculating(true);

    try {
      let endpoint, payload, activityId;

      if (activityType === 'lca') {
        // Create LCA Activity
        endpoint = '/api/lca-activities/';
        payload = {
          project: project.project_id,
          scope_number: newActivity.scope,
          activity_name: newActivity.activityName,
          description: newActivity.description,
          bw2_database: selectedLCAProduct.database,
          bw2_activity_code: selectedLCAProduct.code,
          quantity: Number(newActivity.quantity),
          impact_method: {
            method: ['ecoinvent-3.9.1', 'IPCC 2013', 'climate change', 'global warming potential (GWP100)']
          },
        };

        if (newActivity.scope === 3 && newActivity.scope3Category) {
          const categoryMapping = {
            'purchased_goods_services': 'purchased_goods_services',
            'capital_goods': 'capital_goods',
            'fuel_energy_related': 'fuel_energy_related',
            'upstream_transport': 'upstream_transport',
            'waste_generated': 'waste_generated',
            'business_travel': 'business_travel',
            'employee_commuting': 'employee_commuting',
            'upstream_leased_assets': 'leased_assets_upstream',
            'downstream_transport': 'downstream_transport',
            'processing_sold_products': 'processing_sold_products',
            'use_sold_products': 'use_sold_products',
            'end_of_life_sold_products': 'end_of_life',
            'downstream_leased_assets': 'leased_assets_downstream',
            'franchises': 'franchises',
            'investments': 'investments'
          };
          payload.scope3_category = categoryMapping[newActivity.scope3Category] || newActivity.scope3Category;
        }

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(JSON.stringify(err));
        }

        const newLCAActivity = await res.json();
        activityId = newLCAActivity.activity_id;

        // Calculate LCA impact
        const calcRes = await fetch(`/api/lca-activities/${activityId}/calculate/`, {
          method: 'POST',
        });

        if (!calcRes.ok) {
          console.warn('LCA calculation failed, but activity was created');
        }

        alert("LCA Activity added and calculated successfully!");

      } else {
        // Create regular Emission Factor Activity
        const selectedFactor = factors.find(f => f.factor_id === newActivity.emissionFactorId);
        
        const categoryMapping = {
          'purchased_goods_services': 'purchased_goods_services',
          'capital_goods': 'capital_goods',
          'fuel_energy_related': 'fuel_energy_related', 
          'upstream_transport': 'upstream_transport',
          'waste_generated': 'waste_generated',
          'business_travel': 'business_travel',
          'employee_commuting': 'employee_commuting',
          'upstream_leased_assets': 'leased_assets_upstream',
          'downstream_transport': 'downstream_transport',
          'processing_sold_products': 'processing_sold_products',
          'use_sold_products': 'use_sold_products',
          'end_of_life_sold_products': 'end_of_life',
          'downstream_leased_assets': 'leased_assets_downstream',
          'franchises': 'franchises',
          'investments': 'investments'
        };
        
        payload = {
          project: project.project_id,
          scope_number: newActivity.scope,
          activity_name: newActivity.activityName,
          description: newActivity.description,
          quantity: Number(newActivity.quantity),
          unit: selectedFactor.unit,
          emission_factor_id: selectedFactor.factor_id,
        };

        if (newActivity.scope === 3 && newActivity.scope3Category) {
          payload.scope3_category = categoryMapping[newActivity.scope3Category] || newActivity.scope3Category;
        }

        const res = await fetch("/api/emission-activities/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(JSON.stringify(err));
        }

        alert("Activity added successfully!");
      }

      // Reset form
      setNewActivity({
        scope: 1,
        activityName: "",
        description: "",
        quantity: "",
        emissionFactorId: "",
        scope3Category: ""
      });
      setSelectedLCAProduct(null);
      setActivityType('emission_factor');
      setDialogOpen(false);

      // Refresh project details
      const refreshed = await fetch(`/api/projects/${projectID}/`);
      if (refreshed.ok) {
        setProject(await refreshed.json());
      }

    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setCalculating(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading...</Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Error: {error}</Typography>
        <Button onClick={() => navigate("/projects")} startIcon={<BackIcon />}>
          Back to Projects
        </Button>
      </Box>
    )
  }

  if (!project) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Project not found</Typography>
        <Button onClick={() => navigate("/projects")} startIcon={<BackIcon />}>
          Back to Projects
        </Button>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Button onClick={() => navigate("/projects")} startIcon={<BackIcon />} sx={{ mb: 2 }}>
        Back to Projects
      </Button>

      <Typography variant="h4">{project.name}</Typography>
      <Typography>{project.description}</Typography>
      <Typography variant="body2" color="text.secondary">
        Project ID: {project.project_id}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Created: {new Date(project.created_date).toLocaleDateString()}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Last Modified: {new Date(project.last_modified).toLocaleDateString()}
      </Typography>

      <Divider sx={{ my: 3 }} />

      {/* Add Activity Dialog trigger */}
      <Box sx={{ my: 2 }}>
        <Button variant="contained" onClick={() => setDialogOpen(true)}>Add Emission Activity</Button>
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          <Typography variant="h6" component="div">
            Add New Activity
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Choose between simple emission factors or comprehensive LCA analysis
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            
            {/* Activity Type Selection */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Activity Type
              </Typography>
              <ToggleButtonGroup
                value={activityType}
                exclusive
                onChange={(e, value) => {
                  if (value !== null) {
                    setActivityType(value);
                    setNewActivity(prev => ({
                      ...prev,
                      activityName: "",
                      quantity: "",
                      emissionFactorId: "",
                    }));
                    setSelectedLCAProduct(null);
                  }
                }}
                fullWidth
              >
                <ToggleButton value="emission_factor">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalculateIcon />
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="body2" fontWeight={600}>Emission Factor</Typography>
                      <Typography variant="caption">Simple calculation</Typography>
                    </Box>
                  </Box>
                </ToggleButton>
                <ToggleButton value="lca">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ScienceIcon />
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="body2" fontWeight={600}>LCA Product</Typography>
                      <Typography variant="caption">Full supply chain</Typography>
                    </Box>
                  </Box>
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Guidance for LCA Scope Selection */}
            {activityType === 'lca' && (
              <Alert severity="info" sx={{ bgcolor: 'info.light' }}>
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  💡 Choosing the Right Scope for LCA Products
                </Typography>
                <Typography variant="caption" component="div" sx={{ mt: 1 }}>
                  • <strong>Scope 1:</strong> Fuels/materials you burn or use on-site (e.g., natural gas for heating)
                </Typography>
                <Typography variant="caption" component="div">
                  • <strong>Scope 2:</strong> Purchased energy (e.g., electricity, steam, district heating)
                </Typography>
                <Typography variant="caption" component="div">
                  • <strong>Scope 3:</strong> Purchased goods, capital assets, transportation, waste (most LCA products)
                </Typography>
                <Typography variant="caption" component="div" sx={{ mt: 1, fontStyle: 'italic' }}>
                  Note: LCA calculates all supply chain steps internally, but you report the final product under one scope based on your organizational boundary.
                </Typography>
              </Alert>
            )}
            
            {/* Scope Selection */}
            <TextField
              select
              label="Emission Scope"
              value={newActivity.scope}
              onChange={e => setNewActivity(prev => ({ 
                ...prev, 
                scope: Number(e.target.value),
                emissionFactorId: "", // Reset factor when scope changes
                scope3Category: "" // Reset scope 3 category
              }))}
              fullWidth
              required
            >
              <MenuItem value={1}>
                <Box>
                  <Typography variant="body1">Scope 1 - Direct Emissions</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Direct GHG emissions from sources owned/controlled by organization
                  </Typography>
                </Box>
              </MenuItem>
              <MenuItem value={2}>
                <Box>
                  <Typography variant="body1">Scope 2 - Energy Indirect</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Indirect emissions from purchased electricity, steam, heat, cooling
                  </Typography>
                </Box>
              </MenuItem>
              <MenuItem value={3}>
                <Box>
                  <Typography variant="body1">Scope 3 - Other Indirect</Typography>
                  <Typography variant="caption" color="text.secondary">
                    All other indirect emissions in value chain
                  </Typography>
                </Box>
              </MenuItem>
            </TextField>

            {/* LCA Product Selection (only for LCA type) */}
            {activityType === 'lca' && (
              <Box>
                {selectedLCAProduct ? (
                  <Card sx={{ p: 2, bgcolor: 'action.hover' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Selected Product
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {selectedLCAProduct.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                      <Chip label={selectedLCAProduct.database} size="small" color="primary" />
                      {selectedLCAProduct.location && (
                        <Chip label={selectedLCAProduct.location} size="small" />
                      )}
                      <Chip label={selectedLCAProduct.unit} size="small" />
                    </Box>
                    <Button
                      size="small"
                      onClick={() => setLcaSearchOpen(true)}
                      sx={{ mt: 2 }}
                    >
                      Change Product
                    </Button>
                  </Card>
                ) : (
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => setLcaSearchOpen(true)}
                    startIcon={<ScienceIcon />}
                    sx={{ py: 2 }}
                  >
                    Search for LCA Product
                  </Button>
                )}
              </Box>
            )}

            {/* Scope 3 Category (only show if Scope 3 selected) */}
            {newActivity.scope === 3 && (
              <TextField
                select
                label="Scope 3 Category"
                value={newActivity.scope3Category}
                onChange={e => setNewActivity(prev => ({ 
                  ...prev, 
                  scope3Category: e.target.value,
                  emissionFactorId: activityType === 'emission_factor' ? "" : prev.emissionFactorId
                }))}
                fullWidth
                required
                helperText={activityType === 'emission_factor' 
                  ? "Filter emission factors by Scope 3 category" 
                  : "Select the appropriate Scope 3 category for this LCA product"
                }
              >
                <MenuItem value="purchased_goods_services">1. Purchased goods & services ({factors.filter(f => f.applicable_scopes && f.applicable_scopes.includes(3) && f.category === 'purchased_goods_services').length} factors)</MenuItem>
                <MenuItem value="capital_goods">2. Capital goods ({factors.filter(f => f.applicable_scopes && f.applicable_scopes.includes(3) && f.category === 'capital_goods').length} factors)</MenuItem>
                <MenuItem value="fuel_energy_related">3. Fuel & energy related activities ({factors.filter(f => f.applicable_scopes && f.applicable_scopes.includes(3) && f.category === 'fuel_energy_related').length} factors)</MenuItem>
                <MenuItem value="upstream_transport">4. Upstream transportation & distribution ({factors.filter(f => f.applicable_scopes && f.applicable_scopes.includes(3) && f.category === 'upstream_transport').length} factors)</MenuItem>
                <MenuItem value="waste_generated">5. Waste generated in operations ({factors.filter(f => f.applicable_scopes && f.applicable_scopes.includes(3) && f.category === 'waste_generated').length} factors)</MenuItem>
                <MenuItem value="business_travel">6. Business travel ({factors.filter(f => f.applicable_scopes && f.applicable_scopes.includes(3) && f.category === 'business_travel').length} factors)</MenuItem>
                <MenuItem value="employee_commuting">7. Employee commuting ({factors.filter(f => f.applicable_scopes && f.applicable_scopes.includes(3) && f.category === 'employee_commuting').length} factors)</MenuItem>
                <MenuItem value="upstream_leased_assets">8. Upstream leased assets ({factors.filter(f => f.applicable_scopes && f.applicable_scopes.includes(3) && f.category === 'upstream_leased_assets').length} factors)</MenuItem>
                <MenuItem value="downstream_transport">9. Downstream transportation & distribution ({factors.filter(f => f.applicable_scopes && f.applicable_scopes.includes(3) && f.category === 'downstream_transport').length} factors)</MenuItem>
                <MenuItem value="processing_sold_products">10. Processing of sold products ({factors.filter(f => f.applicable_scopes && f.applicable_scopes.includes(3) && f.category === 'processing_sold_products').length} factors)</MenuItem>
                <MenuItem value="use_sold_products">11. Use of sold products ({factors.filter(f => f.applicable_scopes && f.applicable_scopes.includes(3) && f.category === 'use_sold_products').length} factors)</MenuItem>
                <MenuItem value="end_of_life_sold_products">12. End-of-life treatment of sold products ({factors.filter(f => f.applicable_scopes && f.applicable_scopes.includes(3) && f.category === 'end_of_life_sold_products').length} factors)</MenuItem>
                <MenuItem value="downstream_leased_assets">13. Downstream leased assets ({factors.filter(f => f.applicable_scopes && f.applicable_scopes.includes(3) && f.category === 'downstream_leased_assets').length} factors)</MenuItem>
                <MenuItem value="franchises">14. Franchises ({factors.filter(f => f.applicable_scopes && f.applicable_scopes.includes(3) && f.category === 'franchises').length} factors)</MenuItem>
                <MenuItem value="investments">15. Investments ({factors.filter(f => f.applicable_scopes && f.applicable_scopes.includes(3) && f.category === 'investments').length} factors)</MenuItem>
              </TextField>
            )}

            {/* Emission Factor Selection (only for emission_factor type) */}
            {activityType === 'emission_factor' && (
              <TextField
                select
                label="Emission Factor"
                value={newActivity.emissionFactorId}
                onChange={e => setNewActivity(prev => ({ ...prev, emissionFactorId: e.target.value }))}
                fullWidth
                required
                disabled={availableFactors.length === 0}
                helperText={
                  availableFactors.length === 0 
                    ? `No emission factors available for Scope ${newActivity.scope}${newActivity.scope === 3 && newActivity.scope3Category ? ` - ${newActivity.scope3Category}` : ''}` 
                    : undefined
                }
              >
                {availableFactors.map(factor => (
                  <MenuItem key={factor.factor_id} value={factor.factor_id}>
                    <Box>
                      <Typography variant="body1">{factor.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {factor.emission_factor_value} kgCO₂e/{factor.unit} • {factor.category_display || factor.category}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            )}

            {/* Activity Details */}
            <TextField
              label="Activity Name"
              value={newActivity.activityName}
              onChange={e => setNewActivity(prev => ({ ...prev, activityName: e.target.value }))}
              fullWidth
              required
              placeholder="e.g., Office electricity consumption"
            />

            <TextField
              label="Description"
              value={newActivity.description}
              onChange={e => setNewActivity(prev => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              rows={2}
              placeholder="Optional: Additional details about this activity"
            />

            {/* Quantity and Unit */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Quantity"
                type="number"
                value={newActivity.quantity}
                onChange={e => setNewActivity(prev => ({ ...prev, quantity: e.target.value }))}
                fullWidth
                required
                inputProps={{ min: 0, step: "any" }}
                disabled={activityType === 'lca' && !selectedLCAProduct}
              />
              <TextField
                label="Unit"
                value={(() => {
                  if (activityType === 'lca') {
                    return selectedLCAProduct?.unit || ""
                  }
                  const selectedFactor = factors.find(f => f.factor_id === newActivity.emissionFactorId)
                  return selectedFactor?.unit || ""
                })()}
                InputProps={{ readOnly: true }}
                fullWidth
                helperText={activityType === 'lca' 
                  ? "Unit from LCA product" 
                  : "Unit from emission factor"
                }
              />
            </Box>

            {/* Calculation Preview */}
            {activityType === 'emission_factor' && newActivity.emissionFactorId && newActivity.quantity && (
              <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" gutterBottom>Emission Calculation Preview</Typography>
                {(() => {
                  const selectedFactor = factors.find(f => f.factor_id === newActivity.emissionFactorId)
                  const emissions = (Number(newActivity.quantity) * Number(selectedFactor?.emission_factor_value || 0)) / 1000 // Convert kg to tonnes
                  return (
                    <Typography variant="body2" color="text.secondary">
                      {newActivity.quantity} {selectedFactor?.unit} × {selectedFactor?.emission_factor_value} kgCO₂e/{selectedFactor?.unit} = <strong>{emissions.toFixed(3)} tCO₂e</strong>
                    </Typography>
                  )
                })()}
              </Box>
            )}

            {activityType === 'lca' && selectedLCAProduct && newActivity.quantity && (
              <Alert severity="info" sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2">
                  LCA calculation will be performed after adding this activity. This includes full supply chain impacts.
                </Typography>
              </Alert>
            )}

          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button 
            onClick={() => {
              setDialogOpen(false)
              setNewActivity({
                scope: 1,
                activityName: "",
                description: "",
                quantity: "",
                emissionFactorId: "",
                scope3Category: ""
              })
              setSelectedLCAProduct(null)
              setActivityType('emission_factor')
            }}
            disabled={calculating}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSubmit}
            disabled={
              calculating ||
              !newActivity.activityName || 
              !newActivity.quantity ||
              (activityType === 'emission_factor' ? !newActivity.emissionFactorId : !selectedLCAProduct)
            }
          >
            {calculating ? 'Adding...' : 'Add Activity'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* LCA Product Search Dialog */}
      <LCAProductSearch
        open={lcaSearchOpen}
        onClose={() => setLcaSearchOpen(false)}
        onSelect={handleLCAProductSelect}
      />

      <Divider sx={{ my: 3 }} />

      {/* Combined Scope Overview */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Scope Overview</Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
            {[1, 2, 3].map(n => (
              <Chip
                key={n}
                label={`Scope ${n}`}
                color={selectedScopes.includes(n) ? (n === 1 ? 'primary' : n === 2 ? 'success' : 'warning') : 'default'}
                variant={selectedScopes.includes(n) ? 'filled' : 'outlined'}
                onClick={() => setSelectedScopes(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n])}
              />
            ))}
            <Chip label="Reset" onClick={() => setSelectedScopes([1, 2, 3])} variant="outlined" />
          </Stack>

          {(() => {
            const totals = [1, 2, 3].map(n => {
              const s = (project.scopes || []).find(sc => sc.scope_number === n)
              return Number(s?.total_emissions_tco2e || 0)
            })
            const labels = [1, 2, 3].filter(n => selectedScopes.includes(n)).map(n => `Scope ${n}`)
            const data = [1, 2, 3].filter(n => selectedScopes.includes(n)).map(n => totals[n - 1])
            return (
              <BarChart
                height={280}
                xAxis={[{ scaleType: 'band', data: labels }]}
                series={[{ label: 'Emissions (tCO₂e)', data }]}
                grid={{ horizontal: true }}
                margin={{ left: 60, right: 20, top: 10, bottom: 40 }}
              />
            )
          })()}
        </CardContent>
      </Card>

      {/* Activities Table (filtered by selected scopes) */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Activities</Typography>
          {(() => {
            // Combine both emission factor activities and LCA activities
            const rows = (project.scopes || [])
              .filter(s => selectedScopes.includes(s.scope_number))
              .flatMap(s => {
                const emissionActivities = (s.activities || []).map(a => ({
                  id: `ef-${a.activity_id}`,
                  activityId: a.activity_id,
                  type: 'Emission Factor',
                  scopeNumber: s.scope_number,
                  activityName: a.activity_name,
                  quantity: Number(a.quantity || 0),
                  unit: a.unit,
                  source: a.emission_factor?.name || '',
                  emissions: isFinite(Number(a.calculated_emissions)) ? Number(a.calculated_emissions).toFixed(3) : "",
                  scope3Category: a.scope3_category || '',
                }));

                const lcaActivities = (s.lca_activities || []).map(a => ({
                  id: `lca-${a.activity_id}`,
                  activityId: a.activity_id,
                  type: 'LCA',
                  scopeNumber: s.scope_number,
                  activityName: a.activity_name,
                  quantity: Number(a.quantity || 0),
                  unit: a.bw2_unit || '',
                  source: a.bw2_activity_name || a.bw2_database || 'LCA Product',
                  emissions: isFinite(Number(a.emissions_tco2e)) ? Number(a.emissions_tco2e).toFixed(3) : "",
                  scope3Category: a.scope3_category || '',
                }));

                return [...emissionActivities, ...lcaActivities];
              });

            const columns = [
              { 
                field: 'type', 
                headerName: 'Type', 
                width: 130,
                renderCell: (params) => (
                  <Chip 
                    label={params.value} 
                    size="small"
                    color={params.value === 'LCA' ? 'secondary' : 'default'}
                    icon={params.value === 'LCA' ? <ScienceIcon /> : <CalculateIcon />}
                  />
                )
              },
              { field: 'scopeNumber', headerName: 'Scope', width: 80 },
              { field: 'activityName', headerName: 'Activity', flex: 1, minWidth: 200 },
              { field: 'quantity', headerName: 'Qty', width: 100, type: 'number' },
              { field: 'unit', headerName: 'Unit', width: 100 },
              { field: 'source', headerName: 'Source', flex: 1, minWidth: 200 },
              { field: 'emissions', headerName: 'tCO₂e', width: 120, type: 'number' },
              { 
                field: 'actions', 
                headerName: 'Actions', 
                width: 100,
                sortable: false,
                renderCell: (params) => (
                  <IconButton 
                    size="small" 
                    color="error"
                    onClick={() => handleDeleteActivity(params.row.activityId, params.row.type)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )
              },
            ];

            return (
              <div style={{ width: '100%' }}>
                <DataGrid
                  autoHeight
                  disableRowSelectionOnClick
                  rows={rows}
                  columns={columns}
                  initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                  pageSizeOptions={[5, 10, 25]}
                  sx={{
                    '& .MuiDataGrid-columnHeaders': { backgroundColor: 'background.default' },
                    borderRadius: 1,
                  }}
                />
              </div>
            )
          })()}
        </CardContent>
      </Card>
    </Box>
  )
}

export default ProjectDetails
