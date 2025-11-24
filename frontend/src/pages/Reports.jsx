import { useState, useEffect } from "react"
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CardHeader,
  CircularProgress,
  Alert,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from "@mui/material"
import { useTheme } from "@mui/material/styles"
import DownloadIcon from '@mui/icons-material/Download'
import DescriptionIcon from '@mui/icons-material/Description'

const Reports = () => {
  const theme = useTheme()

  // State
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState("")
  const [standard, setStandard] = useState("ghg")
  const [period, setPeriod] = useState("all")
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState(null)
  const [error, setError] = useState(null)

  // Fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects/')
        if (response.ok) {
          const data = await response.json()
          // Handle both array and paginated response
          const projectList = Array.isArray(data) ? data : (data.results || [])
          setProjects(projectList)
          if (projectList.length > 0) {
            setSelectedProject(projectList[0].project_id)
          }
        }
      } catch (err) {
        console.error("Failed to fetch projects", err)
      }
    }
    fetchProjects()
  }, [])

  // Clear report data when configuration changes to prevent type mismatch
  useEffect(() => {
    setReportData(null)
    setError(null)
  }, [standard, period, selectedProject])

  const handleGenerateReport = async () => {
    if (!selectedProject) return

    setLoading(true)
    setError(null)
    setReportData(null)

    try {
      const response = await fetch(`/api/reports/generate/?project_id=${selectedProject}&standard=${standard}&period=${period}`)
      if (!response.ok) {
        throw new Error('Failed to generate report')
      }
      const data = await response.json()
      setReportData(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  // Render different report sections based on standard
  const renderReportContent = () => {
    if (!reportData) return null

    // Safety check: ensure report data matches selected standard (backend returns uppercase)
    if (reportData.standard.toLowerCase() !== standard) return null

    switch (standard) {
      case 'ghg':
        return renderGHGReport()
      case 'iso':
        return renderISOReport()
      case 'tcfd':
        return renderTCFDReport()
      default:
        return null
    }
  }

  const renderGHGReport = () => {
    const { summary, details } = reportData
    return (
      <Box>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={3}>
            <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
              <CardContent>
                <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>Total Emissions</Typography>
                <Typography variant="h4" fontWeight="bold">{summary.total_emissions_tco2e} tCO₂e</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">Scope 1 (Direct)</Typography>
                <Typography variant="h5" fontWeight="bold">{summary.scope_1_total} tCO₂e</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">Scope 2 (Energy)</Typography>
                <Typography variant="h5" fontWeight="bold">{summary.scope_2_total} tCO₂e</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">Scope 3 (Indirect)</Typography>
                <Typography variant="h5" fontWeight="bold">{summary.scope_3_total} tCO₂e</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Typography variant="h6" gutterBottom>Detailed Breakdown</Typography>
        {[1, 2, 3].map(scope => (
          <Card key={scope} sx={{ mb: 2 }}>
            <CardHeader
              title={`Scope ${scope}`}
              subheader={scope === 1 ? "Direct Emissions" : scope === 2 ? "Purchased Energy" : "Value Chain"}
              sx={{ bgcolor: 'action.hover', py: 1.5 }}
            />
            <CardContent>
              {details[scope].length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Activity</TableCell>
                        <TableCell align="right">Emissions (tCO₂e)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {details[scope].map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell align="right">{item.emissions}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">No significant activities recorded.</Typography>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>
    )
  }

  const renderISOReport = () => {
    const { goal_and_scope, inventory_analysis, impact_assessment, interpretation } = reportData
    return (
      <Box>
        <Card sx={{ mb: 3 }}>
          <CardHeader title="1. Goal and Scope Definition" sx={{ bgcolor: 'action.hover' }} />
          <CardContent>
            <Typography variant="body2" paragraph><strong>Goal:</strong> {goal_and_scope.goal}</Typography>
            <Typography variant="body2" paragraph><strong>System Boundary:</strong> {goal_and_scope.system_boundary}</Typography>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardHeader title="2. Life Cycle Inventory (LCI)" sx={{ bgcolor: 'action.hover' }} />
          <CardContent>
            <Typography variant="body2" paragraph>
              Analyzed {inventory_analysis.activities_count} unit processes using data from {inventory_analysis.data_sources}.
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardHeader title="3. Life Cycle Impact Assessment (LCIA)" sx={{ bgcolor: 'action.hover' }} />
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary">
              Total Impact: {impact_assessment.total_gwp_tco2e} tCO₂e (GWP 100a)
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Activity</TableCell>
                    <TableCell>LCA Product</TableCell>
                    <TableCell align="right">Impact (tCO₂e)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {impact_assessment.results_by_activity.map((act, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{act.name}</TableCell>
                      <TableCell>
                        <Typography variant="body2">{act.product}</Typography>
                        <Typography variant="caption" color="text.secondary">{act.database} | {act.location}</Typography>
                      </TableCell>
                      <TableCell align="right">{act.impact_gwp100}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="4. Interpretation" sx={{ bgcolor: 'action.hover' }} />
          <CardContent>
            <Typography variant="body2" paragraph>{interpretation.conclusion}</Typography>
            <Alert severity="info">{interpretation.recommendation}</Alert>
          </CardContent>
        </Card>
      </Box>
    )
  }

  const renderTCFDReport = () => {
    const { governance, strategy, risk_management, metrics_and_targets } = reportData
    return (
      <Box>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardHeader title="Governance" avatar={<DescriptionIcon color="primary" />} />
              <CardContent>
                <Typography variant="body2" color="text.secondary" paragraph>{governance.disclosure}</Typography>
                <Chip label={governance.status} color="default" size="small" />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardHeader title="Strategy" avatar={<DescriptionIcon color="primary" />} />
              <CardContent>
                <Typography variant="body2" color="text.secondary" paragraph>{strategy.disclosure}</Typography>
                <Typography variant="subtitle2">Scenarios Considered:</Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  {strategy.scenarios.map(s => <Chip key={s} label={s} size="small" variant="outlined" />)}
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardHeader title="Risk Management" avatar={<DescriptionIcon color="primary" />} />
              <CardContent>
                <Typography variant="body2" color="text.secondary" paragraph>{risk_management.disclosure}</Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  {risk_management.processes.map(p => <Chip key={p} label={p} size="small" color="warning" variant="outlined" />)}
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardHeader title="Metrics & Targets" avatar={<DescriptionIcon color="primary" />} />
              <CardContent>
                <Typography variant="body2" color="text.secondary" paragraph>{metrics_and_targets.disclosure}</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell>Scope 1</TableCell>
                        <TableCell align="right">{metrics_and_targets.scope_1} tCO₂e</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Scope 2</TableCell>
                        <TableCell align="right">{metrics_and_targets.scope_2} tCO₂e</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Scope 3</TableCell>
                        <TableCell align="right">{metrics_and_targets.scope_3} tCO₂e</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Total</strong></TableCell>
                        <TableCell align="right"><strong>{metrics_and_targets.total_emissions} tCO₂e</strong></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box sx={{ mt: 2, p: 1, bgcolor: 'success.light', borderRadius: 1, color: 'success.contrastText' }}>
                  <Typography variant="caption" fontWeight="bold">TARGET: {metrics_and_targets.target}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    )
  }

  return (
    <Box sx={{ width: "100%", pb: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" sx={{ mb: 0 }}>
          Reports
        </Typography>
      </Box>

      {/* Configuration Card */}
      <Card sx={{ mb: 4 }}>
        <CardHeader title="Report Configuration" subheader="Select parameters to generate a compliant report" />
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Project</InputLabel>
                <Select
                  value={selectedProject}
                  label="Project"
                  onChange={(e) => setSelectedProject(e.target.value)}
                >
                  {projects.map(p => (
                    <MenuItem key={p.project_id} value={p.project_id}>{p.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Standard</InputLabel>
                <Select
                  value={standard}
                  label="Standard"
                  onChange={(e) => setStandard(e.target.value)}
                >
                  <MenuItem value="ghg">GHG Protocol (Corporate)</MenuItem>
                  <MenuItem value="iso">ISO 14040/14044 (LCA)</MenuItem>
                  <MenuItem value="tcfd">TCFD (Climate Risk)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Period</InputLabel>
                <Select
                  value={period}
                  label="Period"
                  onChange={(e) => setPeriod(e.target.value)}
                >
                  <MenuItem value="all">All Time</MenuItem>
                  <MenuItem value="1year">Last Year</MenuItem>
                  <MenuItem value="6months">Last 6 Months</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                variant="contained"
                fullWidth
                onClick={handleGenerateReport}
                disabled={loading || !selectedProject}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : "Generate Report"}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      )}

      {/* Report Display */}
      {reportData && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h5">{reportData.project_name}</Typography>
              <Typography variant="body2" color="text.secondary">
                Standard: {reportData.standard} | Generated: {reportData.generated_date}
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handlePrint}
            >
              Print / Save PDF
            </Button>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {renderReportContent()}

          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Generated by ZeroScope Environmental Intelligence Platform
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  )
}

export default Reports
