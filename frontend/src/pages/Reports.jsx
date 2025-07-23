import { useState } from "react"
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CardHeader,
  useTheme,
} from "@mui/material"
import { LineChart } from "@mui/x-charts/LineChart"
import { useSidebar } from "../layout/Layout"

const Reports = () => {
  const theme = useTheme()
  const [timeRange, setTimeRange] = useState("6months")
  const [reportType, setReportType] = useState("emissions")
  const { collapsed } = useSidebar()

  // Sample data for reports
  const emissionsTrend = [
    { month: "Jan", emissions: 2400, reduction: 200 },
    { month: "Feb", emissions: 1398, reduction: 300 },
    { month: "Mar", emissions: 9800, reduction: 150 },
    { month: "Apr", emissions: 3908, reduction: 400 },
    { month: "May", emissions: 4800, reduction: 350 },
    { month: "Jun", emissions: 3800, reduction: 500 },
    { month: "Jul", emissions: 2900, reduction: 600 },
    { month: "Aug", emissions: 2100, reduction: 700 },
  ]

  const reportsData = [
    {
      id: 1,
      name: "Q2 2024 Carbon Assessment",
      type: "Quarterly",
      date: "2024-06-30",
      status: "Completed",
      emissions: "18.5 tons CO2",
      reduction: "15%",
    },
    {
      id: 2,
      name: "Energy Efficiency Report",
      type: "Monthly",
      date: "2024-06-01",
      status: "Completed",
      emissions: "6.2 tons CO2",
      reduction: "8%",
    },
    {
      id: 3,
      name: "Transportation Impact Analysis",
      type: "Project",
      date: "2024-05-15",
      status: "In Progress",
      emissions: "12.1 tons CO2",
      reduction: "22%",
    },
    {
      id: 4,
      name: "Annual Sustainability Report",
      type: "Annual",
      date: "2023-12-31",
      status: "Completed",
      emissions: "95.3 tons CO2",
      reduction: "12%",
    },
    {
      id: 5,
      name: "Waste Management Assessment",
      type: "Project",
      date: "2024-04-20",
      status: "Completed",
      emissions: "3.8 tons CO2",
      reduction: "35%",
    },
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "success"
      case "In Progress":
        return "warning"
      case "Pending":
        return "error"
      default:
        return "default"
    }
  }

  const handleDownloadReport = (reportId) => {
    console.log("Downloading report:", reportId)
  }

  const months = emissionsTrend.map((item) => item.month)
  const emissionsData = emissionsTrend.map((item) => item.emissions)
  const reductionData = emissionsTrend.map((item) => item.reduction)

  // Dynamic sizing based on sidebar state
  const chartHeight = collapsed ? 380 : 350

  return (
    <Box sx={{ width: "100%", pb: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" sx={{ mb: 0 }}>
          Reports
        </Typography>
        <Button variant="contained">Generate Report</Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="Filters" sx={{ pb: 1 }} />
        <CardContent sx={{ pt: 0 }}>
          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl size="small">
                <InputLabel>Time Range</InputLabel>
                <Select value={timeRange} label="Time Range" onChange={(e) => setTimeRange(e.target.value)}>
                  <MenuItem value="3months">3 Months</MenuItem>
                  <MenuItem value="6months">6 Months</MenuItem>
                  <MenuItem value="1year">1 Year</MenuItem>
                  <MenuItem value="2years">2 Years</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl size="small">
                <InputLabel>Report Type</InputLabel>
                <Select value={reportType} label="Report Type" onChange={(e) => setReportType(e.target.value)}>
                  <MenuItem value="emissions">Emissions</MenuItem>
                  <MenuItem value="energy">Energy</MenuItem>
                  <MenuItem value="transportation">Transportation</MenuItem>
                  <MenuItem value="waste">Waste</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField label="Start Date" type="date" size="small" InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField label="End Date" type="date" size="small" InputLabelProps={{ shrink: true }} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <Box sx={{ display: "flex", gap: 2.5, mb: 3, width: "100%" }}>
        {/* Left Chart */}
        <Card sx={{ width: "50%", minWidth: 0 }}>
          <CardHeader title="Emissions Trend" sx={{ pb: 1 }} />
          <CardContent sx={{ pt: 0, p: 1 }}>
            <Box sx={{ width: "100%", height: chartHeight }}>
              <LineChart
                xAxis={[{ data: months, scaleType: "band" }]}
                series={[
                  {
                    data: emissionsData,
                    color: theme.palette.primary.main,
                    label: "Emissions (tons CO2)",
                    curve: "linear",
                    area: true,
                  },
                ]}
                height={chartHeight}
                margin={{ left: 60, right: 20, top: 20, bottom: 40 }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Right Chart */}
        <Card sx={{ width: "50%", minWidth: 0 }}>
          <CardHeader title="Reduction Progress" sx={{ pb: 1 }} />
          <CardContent sx={{ pt: 0, p: 1 }}>
            <Box sx={{ width: "100%", height: chartHeight }}>
              <LineChart
                xAxis={[{ data: months, scaleType: "band" }]}
                series={[
                  {
                    data: reductionData,
                    color: theme.palette.secondary.main,
                    label: "Reduction (tons CO2)",
                    showMark: true,
                    lineWidth: 2,
                  },
                ]}
                height={chartHeight}
                margin={{ left: 60, right: 20, top: 20, bottom: 40 }}
              />
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Reports Table */}
      <Card>
        <CardHeader
          title="Generated Reports"
          action={
            <Button variant="outlined" size="small">
              Export All
            </Button>
          }
          sx={{ pb: 1 }}
        />
        <CardContent sx={{ p: 0 }}>
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Report Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Emissions</TableCell>
                  <TableCell>Reduction</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportsData.map((report) => (
                  <TableRow key={report.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {report.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={report.type} variant="outlined" size="small" color="primary" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{report.date}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={report.status} color={getStatusColor(report.status)} size="small" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{report.emissions}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          color: "success.main",
                          fontWeight: 600,
                        }}
                      >
                        -{report.reduction}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleDownloadReport(report.id)}
                        disabled={report.status !== "Completed"}
                      >
                        Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  )
}

export default Reports
