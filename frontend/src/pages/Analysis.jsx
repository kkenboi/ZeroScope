import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Paper,
  Chip,
  Divider,
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import {
  Assessment as AssessmentIcon,
  Science as ScienceIcon,
  Calculate as CalculateIcon,
} from "@mui/icons-material";

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index} style={{ paddingTop: 20 }}>
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

function Analysis() {
  const [tabValue, setTabValue] = useState(0);

  // Project-level analysis state
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [projectAnalysisLoading, setProjectAnalysisLoading] = useState(false);
  const [projectResults, setProjectResults] = useState(null);

  // Product-level analysis state
  const [databases, setDatabases] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState("");
  const [activities, setActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState("");
  const [activityQuantity, setActivityQuantity] = useState(1);
  const [productAnalysisLoading, setProductAnalysisLoading] = useState(false);
  const [productResults, setProductResults] = useState(null);

  // Common state
  const [impactMethods, setImpactMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [iterations, setIterations] = useState(1000);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProjects();
    loadDatabases();
    loadImpactMethods();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await fetch("/api/projects/");
      const data = await response.json();
      setProjects(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error("Error loading projects:", err);
    }
  };

  const loadDatabases = async () => {
    try {
      const response = await fetch("/api/brightway2/list_databases/");
      const data = await response.json();
      if (data.success) {
        setDatabases(data.databases);
      }
    } catch (err) {
      console.error("Error loading databases:", err);
    }
  };

  const loadImpactMethods = async () => {
    try {
      const response = await fetch("/api/brightway2/list_impact_methods/");
      const data = await response.json();
      if (data.success) {
        setImpactMethods(data.methods);
        // Set default to IPCC 2013 GWP100
        const defaultMethod = data.methods.find(m => 
          m.name.includes("IPCC 2013") && m.name.includes("GWP100")
        );
        if (defaultMethod) {
          setSelectedMethod(JSON.stringify(defaultMethod.method));
        }
      }
    } catch (err) {
      console.error("Error loading impact methods:", err);
    }
  };

  const loadActivities = async (dbName) => {
    try {
      const response = await fetch(
        `/api/brightway2/get_activities/?database_name=${encodeURIComponent(dbName)}&limit=100`
      );
      const data = await response.json();
      if (data.success) {
        setActivities(data.activities);
      }
    } catch (err) {
      console.error("Error loading activities:", err);
    }
  };

  useEffect(() => {
    if (selectedDatabase) {
      loadActivities(selectedDatabase);
    }
  }, [selectedDatabase]);

  const runProjectAnalysis = async () => {
    if (!selectedProject) {
      setError("Please select a project");
      return;
    }

    setProjectAnalysisLoading(true);
    setError("");
    setProjectResults(null);

    try {
      const method = selectedMethod ? JSON.parse(selectedMethod) : null;
      const payload = {
        project_id: selectedProject,
        iterations,
      };
      
      if (method) {
        payload.impact_method = method;
      }
      
      const response = await fetch("/api/uncertainty/project/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Server error: ${response.status} - ${text}`);
      }

      const data = await response.json();

      if (data.success) {
        setProjectResults(data);
      } else {
        setError(data.error || "Analysis failed");
      }
    } catch (err) {
      console.error('Project analysis error:', err);
      setError(`Analysis failed: ${err.message}`);
    } finally {
      setProjectAnalysisLoading(false);
    }
  };

  const runProductAnalysis = async () => {
    if (!selectedDatabase || !selectedActivity) {
      setError("Please select a database and activity");
      return;
    }

    setProductAnalysisLoading(true);
    setError("");
    setProductResults(null);

    try {
      const method = selectedMethod ? JSON.parse(selectedMethod) : null;
      const activity = activities.find(a => a.code === selectedActivity);

      const payload = {
        database_name: selectedDatabase,
        activity_code: selectedActivity,
        quantity: parseFloat(activityQuantity),
        iterations,
      };
      
      if (method) {
        payload.impact_method = method;
      }

      const response = await fetch("/api/uncertainty/activity/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Server error: ${response.status} - ${text}`);
      }

      const data = await response.json();

      if (data.success) {
        setProductResults(data);
      } else {
        setError(data.error || "Analysis failed");
      }
    } catch (err) {
      console.error('Product analysis error:', err);
      setError(`Analysis failed: ${err.message}`);
    } finally {
      setProductAnalysisLoading(false);
    }
  };

  const renderDistributionChart = (results) => {
    if (!results || !results.histogram) return null;

    const chartData = results.histogram.map((count, idx) => ({
      bin: `${results.bin_edges[idx].toFixed(2)}`,
      count,
    }));

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="bin" label={{ value: "tCO₂e", position: "insideBottom", offset: -5 }} />
          <YAxis label={{ value: "Frequency", angle: -90, position: "insideLeft" }} />
          <Tooltip />
          <Bar dataKey="count" fill="#1976d2" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderStatistics = (results) => {
    if (!results || !results.statistics) return null;

    const stats = results.statistics;

    return (
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="caption" color="text.secondary">
              Mean
            </Typography>
            <Typography variant="h6">
              {stats.mean.toFixed(3)} tCO₂e
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="caption" color="text.secondary">
              Std Dev
            </Typography>
            <Typography variant="h6">
              ±{stats.std.toFixed(3)} tCO₂e
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="caption" color="text.secondary">
              95% CI Lower
            </Typography>
            <Typography variant="h6">
              {stats.percentile_2_5.toFixed(3)} tCO₂e
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="caption" color="text.secondary">
              95% CI Upper
            </Typography>
            <Typography variant="h6">
              {stats.percentile_97_5.toFixed(3)} tCO₂e
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="caption" color="text.secondary">
              Median
            </Typography>
            <Typography variant="h6">
              {stats.median.toFixed(3)} tCO₂e
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="caption" color="text.secondary">
              Minimum
            </Typography>
            <Typography variant="h6">
              {stats.min.toFixed(3)} tCO₂e
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="caption" color="text.secondary">
              Maximum
            </Typography>
            <Typography variant="h6">
              {stats.max.toFixed(3)} tCO₂e
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="caption" color="text.secondary">
              CV (%)
            </Typography>
            <Typography variant="h6">
              {((stats.std / stats.mean) * 100).toFixed(1)}%
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
        Uncertainty Analysis
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Perform Monte Carlo uncertainty analysis on projects or individual LCA products
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Project Analysis" icon={<AssessmentIcon />} iconPosition="start" />
          <Tab label="Product Analysis" icon={<ScienceIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Tab 1: Project-level Analysis */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Analysis Parameters
                </Typography>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Select Project</InputLabel>
                  <Select
                    value={selectedProject}
                    label="Select Project"
                    onChange={(e) => setSelectedProject(e.target.value)}
                  >
                    {projects.map((project) => (
                      <MenuItem key={project.project_id} value={project.project_id}>
                        {project.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Impact Method (Optional)</InputLabel>
                  <Select
                    value={selectedMethod}
                    label="Impact Method (Optional)"
                    onChange={(e) => setSelectedMethod(e.target.value)}
                    displayEmpty
                  >
                    <MenuItem value="">
                      <em>Default: IPCC 2013 GWP100</em>
                    </MenuItem>
                    {impactMethods.map((method, idx) => (
                      <MenuItem key={idx} value={JSON.stringify(method.method)}>
                        {method.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="Monte Carlo Iterations"
                  type="number"
                  value={iterations}
                  onChange={(e) => setIterations(parseInt(e.target.value))}
                  inputProps={{ min: 100, max: 10000, step: 100 }}
                  sx={{ mb: 2 }}
                  helperText="More iterations = more accurate but slower"
                />

                <Button
                  fullWidth
                  variant="contained"
                  startIcon={projectAnalysisLoading ? <CircularProgress size={20} /> : <CalculateIcon />}
                  onClick={runProjectAnalysis}
                  disabled={projectAnalysisLoading || !selectedProject}
                >
                  {projectAnalysisLoading ? "Running..." : "Run Analysis"}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            {projectAnalysisLoading ? (
              <Card>
                <CardContent sx={{ textAlign: "center", py: 8 }}>
                  <CircularProgress size={60} />
                  <Typography variant="h6" sx={{ mt: 2 }}>
                    Running Monte Carlo Simulation...
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    This may take a few moments
                  </Typography>
                </CardContent>
              </Card>
            ) : projectResults ? (
              <Box>
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Distribution of Results
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {iterations} Monte Carlo iterations
                    </Typography>
                    {renderDistributionChart(projectResults)}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Statistical Summary
                    </Typography>
                    {renderStatistics(projectResults)}
                  </CardContent>
                </Card>
              </Box>
            ) : (
              <Card>
                <CardContent sx={{ textAlign: "center", py: 8 }}>
                  <AssessmentIcon sx={{ fontSize: 80, color: "text.secondary", mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    Select parameters and run analysis
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 2: Product-level Analysis */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Product Parameters
                </Typography>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Database</InputLabel>
                  <Select
                    value={selectedDatabase}
                    label="Database"
                    onChange={(e) => {
                      setSelectedDatabase(e.target.value);
                      setSelectedActivity("");
                    }}
                  >
                    {databases.map((db) => (
                      <MenuItem key={db.name} value={db.name}>
                        {db.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Activity</InputLabel>
                  <Select
                    value={selectedActivity}
                    label="Activity"
                    onChange={(e) => setSelectedActivity(e.target.value)}
                    disabled={!selectedDatabase}
                  >
                    {activities.map((activity) => (
                      <MenuItem key={activity.code} value={activity.code}>
                        {activity.name} ({activity.location})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="Quantity"
                  type="number"
                  value={activityQuantity}
                  onChange={(e) => setActivityQuantity(e.target.value)}
                  inputProps={{ min: 0, step: "any" }}
                  sx={{ mb: 2 }}
                />

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Impact Method (Optional)</InputLabel>
                  <Select
                    value={selectedMethod}
                    label="Impact Method (Optional)"
                    onChange={(e) => setSelectedMethod(e.target.value)}
                    displayEmpty
                  >
                    <MenuItem value="">
                      <em>Default: IPCC 2013 GWP100</em>
                    </MenuItem>
                    {impactMethods.map((method, idx) => (
                      <MenuItem key={idx} value={JSON.stringify(method.method)}>
                        {method.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="Monte Carlo Iterations"
                  type="number"
                  value={iterations}
                  onChange={(e) => setIterations(parseInt(e.target.value))}
                  inputProps={{ min: 100, max: 10000, step: 100 }}
                  sx={{ mb: 2 }}
                  helperText="More iterations = more accurate but slower"
                />

                <Button
                  fullWidth
                  variant="contained"
                  startIcon={productAnalysisLoading ? <CircularProgress size={20} /> : <CalculateIcon />}
                  onClick={runProductAnalysis}
                  disabled={productAnalysisLoading || !selectedDatabase || !selectedActivity}
                >
                  {productAnalysisLoading ? "Running..." : "Run Analysis"}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            {productAnalysisLoading ? (
              <Card>
                <CardContent sx={{ textAlign: "center", py: 8 }}>
                  <CircularProgress size={60} />
                  <Typography variant="h6" sx={{ mt: 2 }}>
                    Running Monte Carlo Simulation...
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    This may take a few moments
                  </Typography>
                </CardContent>
              </Card>
            ) : productResults ? (
              <Box>
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Distribution of Results
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {iterations} Monte Carlo iterations for {activityQuantity} unit(s)
                    </Typography>
                    {renderDistributionChart(productResults)}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Statistical Summary
                    </Typography>
                    {renderStatistics(productResults)}
                  </CardContent>
                </Card>
              </Box>
            ) : (
              <Card>
                <CardContent sx={{ textAlign: "center", py: 8 }}>
                  <ScienceIcon sx={{ fontSize: 80, color: "text.secondary", mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    Select product and run analysis
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
}

export default Analysis;
