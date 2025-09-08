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
} from "@mui/material"
import { BarChart } from "@mui/x-charts"
import { DataGrid } from "@mui/x-data-grid"
import { ArrowBack as BackIcon } from "@mui/icons-material"

function ProjectDetails() {
  const { projectID } = useParams()
  const navigate = useNavigate()

  const [project, setProject] = useState(null)
  const [factors, setFactors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Form state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [scope, setScope] = useState(1)
  const [activityName, setActivityName] = useState("")
  const [description, setDescription] = useState("")
  const [quantity, setQuantity] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedFactor, setSelectedFactor] = useState(null)
  const [scope3Category, setScope3Category] = useState("")
  const [selectedScopes, setSelectedScopes] = useState([1, 2, 3])

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
    fetch("/api/emission-factors/all/")
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch emission factors");
        return res.json();
      })
      .then(data => {
        // Accept both array and paginated object
        if (Array.isArray(data)) {
          setFactors(data);
        } else if (data.results) {
          setFactors(data.results);
        } else {
          setFactors([]);
        }
      })
      .catch(() => setFactors([]));
  }, [])

  const categories = useMemo(() => [...new Set(factors.map(f => f.category))], [factors])
  const filteredFactors = useMemo(
    () => factors.filter(f => !selectedCategory || f.category === selectedCategory),
    [factors, selectedCategory]
  )
  const handleFactorChange = (id) => setSelectedFactor(filteredFactors.find(f => f.factor_id === id) || null)

  const handleSubmit = async () => {
    if (!selectedFactor) {
      alert("Please select an emission factor")
      return
    }

    const selectedScopeObj = Array.isArray(project?.scopes)
      ? project.scopes.find(s => s.scope_number === scope)
      : null

    const payload = {
      project: project.project_id,
      // backend will create/find the scope if missing when scope_number is provided
      scope: selectedScopeObj?.scope_id,
      scope_number: scope,
      activity_name: activityName,
      description,
      quantity: Number(quantity),
      unit: selectedFactor.base_unit,
      emission_factor_id: selectedFactor.factor_id,
    }
    if (scope === 3) {
      if (!scope3Category) {
        alert("Please select a Scope 3 category")
        return
      }
      payload.scope3_category = scope3Category
    }

    const res = await fetch("/api/emission-activities/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      alert("Activity added!")
      setActivityName("")
      setDescription("")
      setQuantity("")
      setSelectedFactor(null)
      setSelectedCategory("")
      setScope3Category("")
      setDialogOpen(false)

      // Refresh project details
      const refreshed = await fetch(`/api/projects/${projectID}/`)
      setProject(await refreshed.json())
    } else {
      const err = await res.json()
      alert("Error: " + JSON.stringify(err))
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Add Emission Activity</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                label="Scope"
                value={scope}
                onChange={e => setScope(Number(e.target.value))}
                fullWidth
              >
                <MenuItem value={1}>Scope 1</MenuItem>
                <MenuItem value={2}>Scope 2</MenuItem>
                <MenuItem value={3}>Scope 3</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                select
                label="Factor Category"
                value={selectedCategory}
                onChange={e => {
                  setSelectedCategory(e.target.value)
                  setSelectedFactor(null)
                }}
                fullWidth
              >
                {[...new Set(factors.map(f => f.category))].map(c => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                select
                label="Emission Factor"
                value={selectedFactor?.factor_id || ""}
                onChange={e => handleFactorChange(e.target.value)}
                fullWidth
              >
                {factors
                  .filter(f => !selectedCategory || f.category === selectedCategory)
                  .map(f => (
                    <MenuItem key={f.factor_id} value={f.factor_id}>
                      {f.name} ({f.base_unit})
                    </MenuItem>
                  ))}
              </TextField>
            </Grid>

            {scope === 3 && (
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Scope 3 Category"
                  value={scope3Category}
                  onChange={e => setScope3Category(e.target.value)}
                  fullWidth
                >
                  <MenuItem value="purchased_goods_services">1. Purchased goods and services</MenuItem>
                  <MenuItem value="capital_goods">2. Capital goods</MenuItem>
                  <MenuItem value="fuel_energy_related">3. Fuel- and energy-related activities</MenuItem>
                  <MenuItem value="upstream_transport">4. Upstream transportation and distribution</MenuItem>
                  <MenuItem value="waste_generated">5. Waste generated in operations</MenuItem>
                  <MenuItem value="business_travel">6. Business travel</MenuItem>
                  <MenuItem value="employee_commuting">7. Employee commuting</MenuItem>
                  <MenuItem value="leased_assets_upstream">8. Upstream leased assets</MenuItem>
                  <MenuItem value="downstream_transport">9. Downstream transportation and distribution</MenuItem>
                  <MenuItem value="processing_sold_products">10. Processing of sold products</MenuItem>
                  <MenuItem value="use_sold_products">11. Use of sold products</MenuItem>
                  <MenuItem value="end_of_life">12. End-of-life treatment of sold products</MenuItem>
                  <MenuItem value="leased_assets_downstream">13. Downstream leased assets</MenuItem>
                  <MenuItem value="franchises">14. Franchises</MenuItem>
                  <MenuItem value="investments">15. Investments</MenuItem>
                </TextField>
              </Grid>
            )}

            <Grid item xs={12} sm={6}>
              <TextField
                label="Quantity"
                type="number"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Unit"
                value={selectedFactor?.base_unit || ""}
                InputProps={{ readOnly: true }}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Activity Name"
                value={activityName}
                onChange={e => setActivityName(e.target.value)}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                fullWidth
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>Add</Button>
        </DialogActions>
      </Dialog>

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
            const rows = (project.scopes || [])
              .filter(s => selectedScopes.includes(s.scope_number))
              .flatMap(s => (s.activities || []).map(a => ({
                id: a.activity_id,
                scopeNumber: s.scope_number,
                activityName: a.activity_name,
                quantity: Number(a.quantity || 0),
                unit: a.unit,
                factor: a.emission_factor?.name || '',
                emissions: isFinite(Number(a.calculated_emissions)) ? Number(a.calculated_emissions).toFixed(3) : "",
                scope3Category: a.scope3_category || '',
              })))

            const columns = [
              { field: 'scopeNumber', headerName: 'Scope', width: 100 },
              { field: 'activityName', headerName: 'Activity', flex: 1, minWidth: 200 },
              { field: 'quantity', headerName: 'Qty', width: 100, type: 'number' },
              { field: 'unit', headerName: 'Unit', width: 120 },
              { field: 'factor', headerName: 'Emission Factor', flex: 1, minWidth: 220 },
              { field: 'emissions', headerName: 'tCO₂e', width: 120, type: 'number' },
              { field: 'scope3Category', headerName: 'Scope 3 Category', flex: 1, minWidth: 220 },
            ]

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
