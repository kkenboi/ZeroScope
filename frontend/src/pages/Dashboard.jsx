import { useState } from "react"
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
} from "@mui/material"
import { BarChart } from "@mui/x-charts/BarChart"
import { PieChart } from "@mui/x-charts/PieChart"
import { useSidebar } from "../layout/Layout"

const EnvironmentalDashboard = () => {
  const theme = useTheme()
  const [timeRange, setTimeRange] = useState("6months")
  const { collapsed } = useSidebar()

  // Sample data for charts
  const monthlyEmissions = [
    { month: "Jan", emissions: 2400, target: 2000 },
    { month: "Feb", emissions: 1398, target: 2000 },
    { month: "Mar", emissions: 9800, target: 2000 },
    { month: "Apr", emissions: 3908, target: 2000 },
    { month: "May", emissions: 4800, target: 2000 },
    { month: "Jun", emissions: 3800, target: 2000 },
  ]

  const emissionsBySource = [
    { id: 0, value: 45, label: "Energy", color: theme.palette.primary.main },
    { id: 1, value: 25, label: "Transportation", color: theme.palette.secondary.main },
    { id: 2, value: 20, label: "Manufacturing", color: theme.palette.success.main },
    { id: 3, value: 10, label: "Waste", color: theme.palette.warning.main },
  ]

  const activeProjects = [
    {
      id: 1,
      name: "Solar Panel Installation",
      type: "Renewable Energy",
      progress: 75,
      status: "In Progress",
      reduction: "2.5 tons CO2/year",
    },
    {
      id: 2,
      name: "Fleet Electrification",
      type: "Transportation",
      progress: 45,
      status: "Planning",
      reduction: "15 tons CO2/year",
    },
    {
      id: 3,
      name: "Energy Efficiency Upgrade",
      type: "Energy",
      progress: 90,
      status: "Near Completion",
      reduction: "8.2 tons CO2/year",
    },
    {
      id: 4,
      name: "Office Lighting Retrofit",
      type: "Energy",
      progress: 60,
      status: "In Progress",
      reduction: "3.4 tons CO2/year",
    },
    {
      id: 5,
      name: "Supply Chain Optimization",
      type: "Logistics",
      progress: 25,
      status: "Starting",
      reduction: "5.7 tons CO2/year",
    },
    {
      id: 6,
      name: "Waste Reduction Program",
      type: "Waste Management",
      progress: 30,
      status: "Starting",
      reduction: "1.8 tons CO2/year",
    },
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case "In Progress":
        return "primary"
      case "Planning":
        return "warning"
      case "Near Completion":
        return "success"
      case "Starting":
        return "secondary"
      default:
        return "default"
    }
  }

  const handleProjectClick = (project) => {
    console.log("Clicked project:", project.name)
  }

  // Dynamic sizing based on sidebar state
  const chartHeight = collapsed ? "340px" : "290px"
  const projectCardHeight = collapsed ? "700px" : "600px"
  const pieRadius = collapsed ? 95 : 75
  const pieInnerRadius = Math.floor(pieRadius / 3)

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
              24.5
            </Typography>
            <Typography variant="body2" color="text.secondary">
              tons CO2
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, minWidth: 0 }}>
          <CardContent sx={{ pb: "16px !important", textAlign: "center" }}>
            <Typography color="text.secondary" variant="body2" sx={{ mb: 0.5 }}>
              Monthly Change
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: "success.main" }}>
              -12.3%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              vs last month
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, minWidth: 0 }}>
          <CardContent sx={{ pb: "16px !important", textAlign: "center" }}>
            <Typography color="text.secondary" variant="body2" sx={{ mb: 0.5 }}>
              Target Progress
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              68%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={68}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: "rgba(46, 125, 50, 0.1)",
                "& .MuiLinearProgress-bar": {
                  bgcolor: "primary.main",
                },
                mx: 2,
              }}
            />
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, minWidth: 0 }}>
          <CardContent sx={{ pb: "16px !important", textAlign: "center" }}>
            <Typography color="text.secondary" variant="body2" sx={{ mb: 0.5 }}>
              Active Projects
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              {activeProjects.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              in progress
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
            <CardHeader title="Emissions vs Target" sx={{ pb: 1 }} />
            <CardContent sx={{ pt: 0, height: "calc(100% - 64px)", p: 1 }}>
              <Box sx={{ width: "100%", height: "100%" }}>
                <BarChart
                  dataset={monthlyEmissions}
                  xAxis={[{ scaleType: "band", dataKey: "month" }]}
                  series={[
                    { dataKey: "emissions", label: "Actual", color: theme.palette.primary.main },
                    { dataKey: "target", label: "Target", color: "#E5E7EB" },
                  ]}
                />
              </Box>
            </CardContent>
          </Card>

          {/* Pie Chart */}
          <Card sx={{ height: chartHeight, minWidth: 0 }}>
            <CardHeader title="Emissions by Source" sx={{ pb: 1 }} />
            <CardContent sx={{ pt: 0, height: "calc(100% - 64px)", p: 1 }}>
              <Box sx={{ width: "100%", height: "100%", position: "relative" }}>
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
                    position: { vertical: "middle", horizontal: "" },
                    padding: 0,
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Right Container */}
        <Box sx={{ width: "45%", display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Card sx={{ height: projectCardHeight, minWidth: 0 }}>
            <CardHeader
              title="Active Projects"
              action={
                <Button variant="outlined" size="small">
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
                {activeProjects.map((project) => (
                  <Card
                    key={project.id}
                    elevation={0}
                    sx={{
                      cursor: "pointer",
                      transition: "all 0.2s ease-in-out",
                      width: "calc(50% - 8px)",
                      height: collapsed ? "220px" : "180px",
                      minWidth: "180px",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
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
                            Progress
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            sx={{ fontSize: "0.75rem", minWidth: "35px", textAlign: "right" }}
                          >
                            {project.progress}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={project.progress}
                          sx={{
                            height: 4,
                            borderRadius: 2,
                          }}
                        />
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
                        <Typography
                          variant="body2"
                          color="success.main"
                          sx={{
                            fontWeight: 600,
                            fontSize: "0.65rem",
                            minWidth: "85px",
                            textAlign: "right",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={project.reduction}
                        >
                          {project.reduction}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  )
}

export default EnvironmentalDashboard
