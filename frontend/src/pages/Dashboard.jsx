import { useState, useEffect } from "react"
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  useTheme,
  CardHeader,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
} from "@mui/material"
import { BarChart } from "@mui/x-charts/BarChart"
import { PieChart } from "@mui/x-charts/PieChart"
import { useSidebar } from "../layout/Layout"
import { useNavigate } from "react-router-dom"

const EnvironmentalDashboard = () => {
  const theme = useTheme()
  const navigate = useNavigate()
  const [timeRange, setTimeRange] = useState("6months")
  const { collapsed } = useSidebar()

  // State for real data
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(null)
  const [projects, setProjects] = useState([])

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData()
  }, [timeRange])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch dashboard stats
      const statsResponse = await fetch(`/api/dashboard/stats/?period=${timeRange}`)
      if (!statsResponse.ok) throw new Error('Failed to fetch dashboard stats')
      const statsData = await statsResponse.json()
      setStats(statsData)

      // Fetch projects
      const projectsResponse = await fetch('/api/projects/')
      if (!projectsResponse.ok) throw new Error('Failed to fetch projects')
      const projectsData = await projectsResponse.json()
      if (Array.isArray(projectsData)) {
        setProjects(projectsData)
      } else if (projectsData.results && Array.isArray(projectsData.results)) {
        setProjects(projectsData.results)
      } else {
        setProjects([])
        console.warn('Unexpected projects API response format:', projectsData)
      }

    } catch (err) {
      console.error('Dashboard data fetch error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Transform data for charts
  const getMonthlyEmissionsData = () => {
    if (!stats || !stats.monthly_emissions) return []
    return stats.monthly_emissions
  }

  const getEmissionsBySourceData = () => {
    if (!stats || !stats.emissions_by_scope) return []

    const scopeLabels = {
      1: "Scope 1 (Direct)",
      2: "Scope 2 (Energy)",
      3: "Scope 3 (Indirect)"
    }

    const scopeColors = {
      1: theme.palette.scopes.scope1,
      2: theme.palette.scopes.scope2,
      3: theme.palette.scopes.scope3
    }

    return Object.entries(stats.emissions_by_scope).map(([scope, value], index) => ({
      id: index,
      value: value,
      label: scopeLabels[scope] || `Scope ${scope}`,
      color: scopeColors[scope] || theme.palette.grey[500]
    })).filter(item => item.value > 0) // Only show scopes with emissions
  }

  // Process projects data
  const getActiveProjects = () => {
    if (!Array.isArray(projects)) return []

    return projects.map(project => {
      // Calculate total emissions for this project
      const totalEmissions = project.scopes?.reduce((sum, scope) =>
        sum + parseFloat(scope.total_emissions_tco2e || 0), 0) || 0

      return {
        id: project.project_id,
        name: project.name,
        type: "Carbon Footprint", // Generic type for now
        progress: 100, // Placeholder as we don't have progress tracking yet
        status: "Active",
        reduction: `${totalEmissions.toFixed(2)} tCO2e`, // Showing total emissions instead of reduction
        emissions: totalEmissions
      }
    }).sort((a, b) => b.emissions - a.emissions) // Sort by emissions (highest first)
      .slice(0, 6) // Show top 6
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "Active":
        return "success"
      case "In Progress":
        return "primary"
      case "Planning":
        return "warning"
      case "Completed":
        return "info"
      default:
        return "default"
    }
  }

  const handleProjectClick = (project) => {
    navigate(`/projects/${project.id}`)
  }

  // Dynamic sizing based on sidebar state
  const chartHeight = collapsed ? "340px" : "290px"
  const projectCardHeight = collapsed ? "700px" : "600px"
  const pieRadius = collapsed ? 95 : 75
  const pieInnerRadius = Math.floor(pieRadius / 3)

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Error loading dashboard: {error}</Alert>
        <Button sx={{ mt: 2 }} variant="contained" onClick={fetchDashboardData}>Retry</Button>
      </Box>
    )
  }

  const monthlyEmissions = getMonthlyEmissionsData()
  const emissionsBySource = getEmissionsBySourceData()
  const activeProjects = getActiveProjects()

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "none",
        pb: 3,
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" sx={{ mb: 0 }}>
          Dashboard
        </Typography>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Period</InputLabel>
          <Select value={timeRange} label="Period" onChange={(e) => setTimeRange(e.target.value)}>
            <MenuItem value="3months">3 Months</MenuItem>
            <MenuItem value="6months">6 Months</MenuItem>
            <MenuItem value="1year">1 Year</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Key Metrics */}
      <Box sx={{ display: "flex", gap: 2.5, mb: 3, width: "100%" }}>
        <Card sx={{ flex: 1, minWidth: 0 }}>
          <CardContent sx={{ pb: "16px !important", textAlign: "center" }}>
            <Typography color="text.secondary" variant="body2" sx={{ mb: 0.5 }}>
              Total Emissions
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              {stats?.total_emissions?.toLocaleString() || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              tons CO2e
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, minWidth: 0 }}>
          <CardContent sx={{ pb: "16px !important", textAlign: "center" }}>
            <Typography color="text.secondary" variant="body2" sx={{ mb: 0.5 }}>
              Monthly Change
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                mb: 1,
                color: (stats?.monthly_change || 0) <= 0 ? "success.main" : "error.main"
              }}
            >
              {stats?.monthly_change ? `${stats.monthly_change > 0 ? '+' : ''}${stats.monthly_change}%` : 'N/A'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              vs last month
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, minWidth: 0 }}>
          <CardContent sx={{ pb: "16px !important", textAlign: "center" }}>
            <Typography color="text.secondary" variant="body2" sx={{ mb: 0.5 }}>
              Active Projects
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              {stats?.total_projects || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              projects
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, minWidth: 0 }}>
          <CardContent sx={{ pb: "16px !important", textAlign: "center" }}>
            <Typography color="text.secondary" variant="body2" sx={{ mb: 0.5 }}>
              Data Quality
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              High
            </Typography>
            <Typography variant="body2" color="text.secondary">
              based on inputs
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Graphs and Projects */}
      <Box sx={{ display: "flex", gap: 2.5, minHeight: projectCardHeight, width: "100%" }}>
        {/* Left Container */}
        <Box sx={{ width: "55%", display: "flex", flexDirection: "column", gap: 2.5, minWidth: 0 }}>
          {/* Bar Chart */}
          <Card sx={{ height: chartHeight, minWidth: 0 }}>
            <CardHeader title="Emissions Trend" sx={{ pb: 1 }} />
            <CardContent sx={{ pt: 0, height: "calc(100% - 64px)", p: 1 }}>
              <Box sx={{ width: "100%", height: "100%" }}>
                {monthlyEmissions.length > 0 ? (
                  <BarChart
                    dataset={monthlyEmissions}
                    xAxis={[{ scaleType: "band", dataKey: "month_name" }]}
                    series={[
                      { dataKey: "emissions", label: "Actual Emissions", color: theme.palette.primary.main },
                      // { dataKey: "target", label: "Target", color: "#E5E7EB" }, // Hiding target for now
                    ]}
                  />
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Typography color="text.secondary">No emissions data available for this period</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Pie Chart */}
          <Card sx={{ height: chartHeight, minWidth: 0 }}>
            <CardHeader title="Emissions by Scope" sx={{ pb: 1 }} />
            <CardContent sx={{ pt: 0, height: "calc(100% - 64px)", p: 1 }}>
              <Box sx={{ width: "100%", height: "100%", position: "relative" }}>
                {emissionsBySource.length > 0 ? (
                  <PieChart
                    key={`${pieRadius}-${collapsed}`}
                    series={[
                      {
                        data: emissionsBySource,
                        highlightScope: { fade: "global", highlight: "item" },
                        faded: { innerRadius: pieInnerRadius, additionalRadius: -30, color: "gray" },
                        innerRadius: pieInnerRadius,
                        outerRadius: pieRadius,
                        paddingAngle: 1,
                        cornerRadius: 3,
                        startAngle: 0,
                        endAngle: 360,
                        cx: "50%",
                        cy: "50%",
                      },
                    ]}
                    legend={{
                      direction: "column",
                      position: { vertical: "middle", horizontal: "right" },
                      padding: 0,
                    }}
                  />
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Typography color="text.secondary">No emissions data available</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Right Container */}
        <Box sx={{ width: "45%", display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Card sx={{ height: projectCardHeight, minWidth: 0 }}>
            <CardHeader
              title="Top Projects"
              action={
                <Button variant="outlined" size="small" onClick={() => navigate('/projects')}>
                  View All
                </Button>
              }
              sx={{ pb: 1 }}
            />
            <CardContent sx={{ pt: 0, height: "calc(100% - 64px)", overflowY: "auto" }}>
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 2,
                  justifyContent: "flex-start",
                }}
              >
                {activeProjects.length > 0 ? (
                  activeProjects.map((project) => (
                    <Card
                      key={project.id}
                      elevation={0}
                      sx={{
                        cursor: "pointer",
                        transition: "all 0.2s ease-in-out",
                        width: "calc(50% - 8px)",
                        height: collapsed ? "220px" : "180px",
                        minWidth: "180px",
                        border: `1px solid ${theme.palette.divider}`,
                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                          borderColor: theme.palette.primary.main,
                        },
                      }}
                      onClick={() => handleProjectClick(project)}
                    >
                      <CardContent
                        sx={{
                          pb: "16px !important",
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          p: 2,
                        }}
                      >
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 600,
                            mb: 0.5,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontSize: "0.875rem",
                            height: "20px",
                          }}
                          title={project.name}
                        >
                          {project.name}
                        </Typography>
                        <Typography
                          color="text.secondary"
                          variant="body2"
                          sx={{
                            mb: 2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontSize: "0.75rem",
                            height: "16px",
                          }}
                          title={project.type}
                        >
                          {project.type}
                        </Typography>
                        <Box sx={{ mb: 2, flex: 1 }}>
                          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1, alignItems: "center" }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                              Total Impact
                            </Typography>
                          </Box>
                          <Typography
                            variant="h6"
                            fontWeight={600}
                            color="primary.main"
                            sx={{ fontSize: "1.1rem" }}
                          >
                            {project.emissions.toFixed(2)}
                            <Typography component="span" variant="caption" sx={{ ml: 0.5 }}>tCO2e</Typography>
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mt: "auto",
                            gap: 1,
                            height: "32px",
                          }}
                        >
                          <Chip
                            label={project.status}
                            color={getStatusColor(project.status)}
                            size="small"
                            sx={{
                              fontSize: "0.65rem",
                              height: "24px",
                              "& .MuiChip-label": {
                                px: 1,
                              },
                            }}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Box sx={{ width: '100%', textAlign: 'center', py: 4 }}>
                    <Typography color="text.secondary">No active projects found</Typography>
                    <Button
                      variant="contained"
                      size="small"
                      sx={{ mt: 2 }}
                      onClick={() => navigate('/projects')}
                    >
                      Create Project
                    </Button>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  )
}

export default EnvironmentalDashboard
