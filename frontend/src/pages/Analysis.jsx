import { useState, useEffect } from "react";
import GlobeVisualization from "../components/GlobeVisualization"; // Add Import
import PublicIcon from '@mui/icons-material/Public'; // Add Icon
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
  Slider,
  Tooltip as MuiTooltip, // Renamed to avoid conflict with Recharts
  ToggleButton,
  ToggleButtonGroup,
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
  ReferenceLine,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import {
  Assessment as AssessmentIcon,
  Science as ScienceIcon,
  Calculate as CalculateIcon,
  TrendingUp as TrendingUpIcon,
  HelpOutline as HelpIcon,
  InfoOutlined as InfoIcon,
  ArrowForward as ArrowForwardIcon,
} from "@mui/icons-material";

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index} style={{ paddingTop: 20 }}>
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

import { useTheme } from "@mui/material/styles";

function Analysis() {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [renderError, setRenderError] = useState(null);

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

  // Sensitivity analysis state
  const [sensitivityProject, setSensitivityProject] = useState("");
  const [sensitivityLoading, setSensitivityLoading] = useState(false);
  const [sensitivityResults, setSensitivityResults] = useState(null);
  const [projectDetails, setProjectDetails] = useState(null);
  const [activityAdjustments, setActivityAdjustments] = useState({});
  const [timelineYears, setTimelineYears] = useState(5);
  const [growthRate, setGrowthRate] = useState(0);
  const [chartView, setChartView] = useState("timeline"); // "timeline" or "tornado"

  // LCA Product Sensitivity state
  const [lcaSensitivityDatabase, setLcaSensitivityDatabase] = useState("");
  const [lcaSensitivityActivity, setLcaSensitivityActivity] = useState("");
  const [lcaSensitivityQuantities, setLcaSensitivityQuantities] = useState([0.5, 1, 2, 5, 10]);
  const [lcaSensitivityLoading, setLcaSensitivityLoading] = useState(false);
  const [lcaSensitivityResults, setLcaSensitivityResults] = useState(null);

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
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("Database response:", data); // Debug log

      if (data.success) {
        // Handle both array and object formats
        let dbList = [];
        if (Array.isArray(data.databases)) {
          dbList = data.databases;
        } else if (typeof data.databases === 'object' && data.databases !== null) {
          dbList = Object.keys(data.databases);
        }
        console.log("Processed databases:", dbList); // Debug log
        setDatabases(dbList);
      } else {
        console.warn("Database API returned success=false");
        setDatabases([]);
      }
    } catch (err) {
      console.error("Error loading databases:", err);
      setDatabases([]);
    }
  };

  const loadImpactMethods = async () => {
    try {
      const response = await fetch("/api/brightway2/list_impact_methods/");
      const data = await response.json();
      console.log("=== IMPACT METHODS DEBUG ===");
      console.log("Total impact methods received from API:", data.methods?.length);

      if (data.success) {
        const allMethods = data.methods || [];

        // Log all IPCC methods to understand what's available
        setImpactMethods(allMethods);

        // Set default to first method as per user request
        const defaultMethod = allMethods[0];
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

  const loadActivitiesForDatabase = async (dbName) => {
    if (!dbName) {
      setActivities([]);
      return;
    }
    try {
      const response = await fetch(
        `/api/brightway2/get_activities/?database_name=${encodeURIComponent(dbName)}&limit=100`
      );
      const data = await response.json();
      if (data.success && Array.isArray(data.activities)) {
        setActivities(data.activities);
      } else {
        setActivities([]);
      }
    } catch (err) {
      console.error("Error loading activities:", err);
      setActivities([]);
    }
  };

  const loadProjectDetails = async (projectId) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/`);
      const data = await response.json();
      setProjectDetails(data);

      // Initialize adjustments for all activities
      const initialAdjustments = {};
      data.scopes?.forEach(scope => {
        scope.activities?.forEach(act => {
          initialAdjustments[act.activity_id] = 0;
        });
        scope.lca_activities?.forEach(act => {
          initialAdjustments[act.activity_id] = 0;
        });
      });
      setActivityAdjustments(initialAdjustments);
    } catch (err) {
      console.error("Error loading project details:", err);
    }
  };

  useEffect(() => {
    if (selectedDatabase) {
      loadActivities(selectedDatabase);
    }
  }, [selectedDatabase]);

  useEffect(() => {
    if (sensitivityProject) {
      loadProjectDetails(sensitivityProject);
    }
  }, [sensitivityProject]);

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

  const runSensitivityAnalysis = async () => {
    if (!sensitivityProject) {
      setError("Please select a project");
      return;
    }

    setSensitivityLoading(true);
    setError("");
    setSensitivityResults(null);

    try {
      const method = selectedMethod ? JSON.parse(selectedMethod) : null;
      const payload = {
        project_id: sensitivityProject,
        adjustments: activityAdjustments,
        timeline_years: timelineYears,
        growth_rate: growthRate / 100,
      };

      if (method) {
        payload.impact_method = method;
      }

      console.log("=== SENSITIVITY ANALYSIS REQUEST ===");
      console.log("URL: /api/sensitivity/project/");
      console.log("Payload:", JSON.stringify(payload, null, 2));

      const response = await fetch("/api/sensitivity/project/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("Response status:", response.status);
      console.log("Response URL:", response.url);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        let errorMessage;

        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          errorMessage = JSON.stringify(errorData, null, 2);
        } else {
          errorMessage = await response.text();
        }

        console.error("Error response body:", errorMessage);

        if (response.status === 404) {
          throw new Error(`Endpoint not found (404). The backend sensitivity analysis endpoint may not be available. Please ensure the Django server is running and the endpoint is registered.`);
        }

        throw new Error(`Server error ${response.status}: ${errorMessage}`);
      }

      const data = await response.json();
      console.log("Success response:", data);

      if (data.success) {
        setSensitivityResults(data);
      } else {
        setError(data.error || "Analysis failed");
      }
    } catch (err) {
      console.error('Sensitivity analysis error:', err);
      setError(`Analysis failed: ${err.message}`);
    } finally {
      setSensitivityLoading(false);
    }
  };

  const runLCAProductSensitivity = async () => {
    if (!lcaSensitivityDatabase || !lcaSensitivityActivity) {
      setError("Please select a database and activity");
      return;
    }

    setLcaSensitivityLoading(true);
    setError("");
    setLcaSensitivityResults(null);

    try {
      const method = selectedMethod ? JSON.parse(selectedMethod) : null;

      console.log("=== LCA PRODUCT SENSITIVITY ANALYSIS ===");
      console.log("Database:", lcaSensitivityDatabase);
      console.log("Activity:", lcaSensitivityActivity);
      console.log("Quantities:", lcaSensitivityQuantities);
      console.log("Impact method:", method);

      // Run analysis for each quantity sequentially to avoid backend concurrency issues
      const results = [];
      for (const quantity of lcaSensitivityQuantities) {
        const payload = {
          database_name: lcaSensitivityDatabase,
          activity_code: lcaSensitivityActivity,
          quantity: parseFloat(quantity),
        };

        if (method) {
          payload.impact_method = method;
        }

        console.log(`Requesting calculation for quantity ${quantity}:`, payload);

        const response = await fetch("/api/lca/calculate/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        console.log(`Response for quantity ${quantity}:`, response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error response for quantity ${quantity}:`, errorText);
          throw new Error(`Server error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log(`Success data for quantity ${quantity}:`, data);

        results.push({
          quantity,
          impact: data.total_impact || 0,
        });
      }

      results.sort((a, b) => a.quantity - b.quantity);

      console.log("Final results:", results);

      const minResult = results[0];
      const maxResult = results[results.length - 1];
      const unitImpact = results.find(r => r.quantity === 1)?.impact || (results[0].impact / results[0].quantity);

      setLcaSensitivityResults({
        data: results,
        unitImpact,
        minImpact: minResult.impact,
        minQuantity: minResult.quantity,
        maxImpact: maxResult.impact,
        maxQuantity: maxResult.quantity,
      });
    } catch (err) {
      console.error('LCA sensitivity analysis error:', err);
      setError(`Analysis failed: ${err.message}`);
    } finally {
      setLcaSensitivityLoading(false);
    }
  };

  const renderDistributionChart = (results) => {
    if (!results || !results.histogram) return null;

    const chartData = results.histogram.map((count, idx) => ({
      bin: `${results.bin_edges[idx].toFixed(4)}`, // Increased precision to avoid duplicate keys
      count,
    }));

    // Check if we should show simpler visualization for low iterations
    const isLowIterations = (results.statistics?.n || iterations) < 30;
    const stats = results.statistics;

    return (
      <Box sx={{ height: 400, width: '100%' }}>
        <Box sx={{ mb: 1, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Typography variant="h6">Distribution of Results</Typography>
          <Typography variant="caption" color={iterations < 100 ? "warning.main" : "text.secondary"}>
            n = {iterations} {iterations < 100 && "(Results may be unstable)"}
          </Typography>
        </Box>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="bin" label={{ value: "tCO₂e", position: "insideBottom", offset: -5 }} />
            <YAxis label={{ value: "Frequency", angle: -90, position: "insideLeft" }} />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.05)' }}
              formatter={(value) => [value, "Run Count"]}
            />
            <Bar dataKey="count" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} />

            {/* Reference Lines for Mean and CI */}
            {stats && (
              <>
                <ReferenceLine x={stats.mean.toFixed(2)} stroke="red" strokeDasharray="3 3" label={{ position: 'top', value: 'Mean', fill: 'red', fontSize: 12 }} />
                <ReferenceLine x={stats.percentile_2_5.toFixed(2)} stroke="green" strokeDasharray="3 3" label={{ position: 'top', value: 'Lower CI', fill: 'green', fontSize: 10 }} />
                <ReferenceLine x={stats.percentile_97_5.toFixed(2)} stroke="green" strokeDasharray="3 3" label={{ position: 'top', value: 'Upper CI', fill: 'green', fontSize: 10 }} />
              </>
            )}
          </BarChart>
        </ResponsiveContainer>
      </Box>
    );
  };

  const renderStatistics = (results) => {
    if (!results || !results.statistics) return null;

    const stats = results.statistics;
    const cv = stats.std / stats.mean; // Coefficient of Variation

    // Smart Interpretation Logic (Badges only)
    let uncertaintyLevel = "Low";
    let uncertaintyColor = "success";

    if (cv > 0.3) {
      uncertaintyLevel = "High";
      uncertaintyColor = "error";
    } else if (cv > 0.1) {
      uncertaintyLevel = "Moderate";
      uncertaintyColor = "warning";
    }

    const definitions = {
      mean: "The average of all simulation runs. This is the 'most expected' value.",
      ci: "95% Confidence Interval: We are 95% sure the true value is within this range.",
      std: "Standard Deviation: Measures how spread out the results are.",
    };

    return (
      <Box>
        {/* Improved Neutral Card with Hero Stat */}
        <Card sx={{ mb: 3, bgcolor: 'grey.50' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 1 }}>
                    ESTIMATED IMPACT
                  </Typography>
                  <MuiTooltip title={definitions.mean} arrow>
                    <HelpIcon sx={{ fontSize: 16, ml: 0.5, color: 'text.disabled', cursor: 'help' }} />
                  </MuiTooltip>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
                  {stats.mean.toFixed(3)} <Typography component="span" variant="h5" color="text.secondary">tCO₂e</Typography>
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={`Uncertainty: ${uncertaintyLevel}`}
                    color={uncertaintyColor}
                    size="small"
                    sx={{ fontWeight: 'bold' }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    <strong>95% CI:</strong> {stats.percentile_2_5.toFixed(3)} – {stats.percentile_97_5.toFixed(3)}
                  </Typography>
                  <MuiTooltip title={definitions.ci} arrow>
                    <InfoIcon sx={{ fontSize: 16, color: 'text.disabled', cursor: 'help' }} />
                  </MuiTooltip>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Detailed Statistics List (Compact) */}
        <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>
          Detailed Statistics
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Typography variant="caption" color="text.secondary" display="block">Median</Typography>
              <Typography variant="subtitle1" fontWeight={600}>{stats.median.toFixed(3)}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">Std Dev</Typography>
                <MuiTooltip title={definitions.std} arrow>
                  <HelpIcon sx={{ fontSize: 12, ml: 0.5, color: 'text.disabled' }} />
                </MuiTooltip>
              </Box>
              <Typography variant="subtitle1" fontWeight={600}>±{stats.std.toFixed(3)}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Typography variant="caption" color="text.secondary" display="block">Minimum</Typography>
              <Typography variant="subtitle1">{stats.min.toFixed(3)}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Typography variant="caption" color="text.secondary" display="block">Maximum</Typography>
              <Typography variant="subtitle1">{stats.max.toFixed(3)}</Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  };


  const renderTimelineChart = (results) => {
    if (!results || !results.timeline) return null;

    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={results.timeline}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="year"
            label={{ value: "Year", position: "insideBottom", offset: -5 }}
          />
          <YAxis label={{ value: "Total Emissions (tCO₂e)", angle: -90, position: "insideLeft" }} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="baseline"
            stroke="#8884d8"
            name="Baseline"
            strokeWidth={3}
          />
          <Line
            type="monotone"
            dataKey="adjusted"
            stroke="#82ca9d"
            name="With Adjustments"
            strokeWidth={3}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderTornadoChart = (results) => {
    if (!results || !results.tornado) return null;

    const sortedData = [...results.tornado].sort((a, b) => Math.abs(b.baseline) - Math.abs(a.baseline));

    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ mr: 1 }}>
            What drives the uncertainty?
          </Typography>
          <MuiTooltip title="The top bars show which activities have the biggest impact on the total uncertainty. Focus on reducing uncertainty in these activities to improve your overall confidence." arrow>
            <InfoIcon color="action" fontSize="small" sx={{ cursor: 'help' }} />
          </MuiTooltip>
        </Box>
        {sortedData.map((activity, idx) => {
          const changePercent = activity.baseline ? (activity.impact / activity.baseline * 100) : 0;
          const isIncrease = activity.impact > 0;

          return (
            <Box key={idx} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {activity.activity}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Chip
                    label={`Scope ${activity.scope}`}
                    size="small"
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {activity.baseline.toFixed(3)} → {activity.adjusted.toFixed(3)} tCO₂e
                  </Typography>
                  {activity.impact !== 0 && (
                    <Chip
                      label={`${changePercent > 0 ? '+' : ''}${changePercent.toFixed(0)}%`}
                      size="small"
                      color={isIncrease ? 'error' : 'success'}
                      sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                    />
                  )}
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ flexGrow: 1, bgcolor: 'grey.100', height: 32, borderRadius: 1, position: 'relative', overflow: 'hidden' }}>
                  <Box
                    sx={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      height: '100%',
                      width: `${(activity.baseline / results.baseline_total * 100)}%`,
                      bgcolor: 'primary.200',
                      transition: 'width 0.3s ease'
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      height: '100%',
                      width: `${(activity.adjusted / results.adjusted_total * 100)}%`,
                      bgcolor: isIncrease ? 'error.main' : activity.impact < 0 ? 'success.main' : 'primary.main',
                      opacity: 0.8,
                      transition: 'width 0.3s ease'
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      position: 'absolute',
                      left: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontWeight: 600,
                      color: 'text.primary',
                      zIndex: 1
                    }}
                  >
                    {((activity.adjusted / results.adjusted_total * 100)).toFixed(1)}%
                  </Typography>
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  };

  if (renderError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6">Something went wrong</Typography>
          <Typography variant="body2">{renderError.toString()}</Typography>
          <Button onClick={() => setRenderError(null)} sx={{ mt: 2 }}>
            Try Again
          </Button>
        </Alert>
      </Box>
    );
  }

  try {
    return (
      <Box>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          Analysis
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Perform uncertainty and sensitivity analysis on projects and LCA products
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Uncertainty - Project" icon={<AssessmentIcon />} iconPosition="start" />
            <Tab label="Uncertainty - Product" icon={<ScienceIcon />} iconPosition="start" />
            <Tab label="Sensitivity - Project" icon={<TrendingUpIcon />} iconPosition="start" />
            <Tab label="Sensitivity - Product" icon={<ScienceIcon />} iconPosition="start" />
            <Tab label="Supply Chain Map" icon={<PublicIcon />} iconPosition="start" />
          </Tabs>
        </Box>

        {/* Tab 1: Project-level Analysis */}
        <TabPanel value={tabValue} index={0}>
          {!projectResults && !projectAnalysisLoading ? (
            <Grid container spacing={3} sx={{ alignItems: 'flex-start' }}>
              <Grid item xs={12} md={5}>
                <Card sx={{ mb: 3 }}>
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
                            {project.project_name || project.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <InputLabel sx={{ position: 'relative', transform: 'none', mb: 0.5 }}>Impact Method</InputLabel>
                        <MuiTooltip title="Methodology for calculating environmental impact (e.g., IPCC 2013 GWP100)." arrow>
                          <HelpIcon sx={{ fontSize: 16, ml: 1, color: 'text.disabled', cursor: 'help' }} />
                        </MuiTooltip>
                      </Box>
                      <Select
                        value={selectedMethod}
                        onChange={(e) => setSelectedMethod(e.target.value)}
                        displayEmpty
                      >

                        {impactMethods.map((method, idx) => (
                          <MenuItem key={idx} value={JSON.stringify(method.method)}>
                            {method.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Box sx={{ mb: 3 }}>
                      <Typography variant="caption" color="text.secondary" gutterBottom>
                        Monte Carlo Iterations
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <ToggleButtonGroup
                          value={iterations}
                          exclusive
                          onChange={(e, newVal) => newVal && setIterations(newVal)}
                          size="small"
                          aria-label="iteration presets"
                        >
                          <ToggleButton value={100}>Quick (100)</ToggleButton>
                          <ToggleButton value={1000}>Std (1k)</ToggleButton>
                          <ToggleButton value={10000}>Robust (10k)</ToggleButton>
                        </ToggleButtonGroup>
                        <TextField
                          type="number"
                          value={iterations}
                          onChange={(e) => setIterations(parseInt(e.target.value) || 0)}
                          size="small"
                          sx={{ width: 100 }}
                          inputProps={{ min: 10, step: 100 }}
                        />
                      </Box>
                      {iterations < 100 && (
                        <Alert severity="warning" sx={{ mt: 1, py: 0 }}>
                          Results may be unstable
                        </Alert>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        More iterations = higher accuracy but slower
                      </Typography>
                    </Box>

                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<CalculateIcon />}
                      onClick={runProjectAnalysis}
                      disabled={!selectedProject}
                    >
                      Run Analysis
                    </Button>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={7}>
                <Card>
                  <CardContent sx={{ textAlign: "center", py: 8 }}>
                    <AssessmentIcon sx={{ fontSize: 80, color: "text.secondary", mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      Select parameters and run analysis
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : (
            <Box sx={{ width: '100%' }}>
              {projectAnalysisLoading ? (
                <Card sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CardContent sx={{ textAlign: "center" }}>
                    <CircularProgress size={60} />
                    <Typography variant="h6" sx={{ mt: 2 }}>
                      Running Monte Carlo Simulation...
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      This may take a few moments
                    </Typography>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent>
                    {/* Header with Edit Button */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h5">Analysis Results</Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setProjectResults(null)}
                        startIcon={<AssessmentIcon />}
                      >
                        New Analysis
                      </Button>
                    </Box>

                    <Grid container spacing={4}>
                      <Grid item xs={12} md={3}>
                        <Typography variant="h6" gutterBottom color="text.secondary" sx={{ fontSize: '1rem' }}>Statistical Summary</Typography>
                        {renderStatistics(projectResults)}
                      </Grid>

                      {/* Right: Chart */}
                      <Grid item xs={12} md={9}>
                        {renderDistributionChart(projectResults)}
                      </Grid>
                    </Grid>

                    <Divider sx={{ my: 3 }} />

                    {/* Footer: Next Steps */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                      <Box>
                        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                          Next Steps
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Refine your analysis or export the data.
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                          variant="outlined"
                          endIcon={<ArrowForwardIcon />}
                          onClick={() => setTabValue(2)} // Switch to Sensitivity
                        >
                          Run Sensitivity Analysis
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => alert("Export feature coming soon!")}
                        >
                          Export Results
                        </Button>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              )}
            </Box>
          )
          }
        </TabPanel >

        {/* Tab 2: Product-level Analysis */}
        < TabPanel value={tabValue} index={1} >
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
                      value={selectedDatabase || ""}
                      label="Database"
                      onChange={(e) => {
                        const value = e.target.value;
                        setSelectedDatabase(value);
                        setSelectedActivity("");
                        if (value) {
                          loadActivitiesForDatabase(value);
                        }
                      }}
                    >
                      {!databases || databases.length === 0 ? (
                        <MenuItem value="" disabled>No databases available</MenuItem>
                      ) : (
                        databases.map((db, idx) => {
                          const dbName = typeof db === 'string' ? db : (db?.name || db);
                          return (
                            <MenuItem key={`product-db-${idx}`} value={dbName}>
                              {dbName}
                            </MenuItem>
                          );
                        })
                      )}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Activity</InputLabel>
                    <Select
                      value={selectedActivity || ""}
                      label="Activity"
                      onChange={(e) => setSelectedActivity(e.target.value)}
                      disabled={!selectedDatabase}
                    >
                      {!activities || activities.length === 0 ? (
                        <MenuItem value="" disabled>
                          {selectedDatabase ? "Loading activities..." : "Select a database first"}
                        </MenuItem>
                      ) : (
                        activities.map((activity) => (
                          <MenuItem key={activity.code} value={activity.code}>
                            {activity.name} ({activity.location})
                          </MenuItem>
                        ))
                      )}
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
        </TabPanel >

        {/* Tab 3: Sensitivity Analysis */}
        < TabPanel value={tabValue} index={2} >
          <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' }, pr: 3 }}>
            {/* Left Side: Graph and Analytics */}
            <Box sx={{ flex: '0 0 60%', minWidth: 0 }}>
              {sensitivityLoading ? (
                <Card>
                  <CardContent sx={{ textAlign: "center", py: 8 }}>
                    <CircularProgress size={60} />
                    <Typography variant="h6" sx={{ mt: 2 }}>
                      Running Sensitivity Analysis...
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Calculating impact scenarios...
                    </Typography>
                  </CardContent>
                </Card>
              ) : sensitivityResults ? (
                <Box>
                  {/* Timeline Chart */}
                  <Card sx={{ mb: 3 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                        Emissions Timeline Projection
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        How emissions evolve over {timelineYears} years with {growthRate}% annual growth rate
                      </Typography>
                      <Box sx={{ height: 450 }}>
                        {renderTimelineChart(sensitivityResults)}
                      </Box>
                    </CardContent>
                  </Card>

                  {/* Activity Impact Analysis */}
                  <Card sx={{ mb: 3 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                        Activity Impact Analysis
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Contribution of each activity to baseline and adjusted emissions
                      </Typography>
                      <Box sx={{ maxHeight: 600, overflow: 'auto', pr: 1 }}>
                        {renderTornadoChart(sensitivityResults)}
                      </Box>
                    </CardContent>
                  </Card>

                  {/* Analytics Summary Cards */}
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                        Impact Summary
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={6} md={3}>
                          <Paper sx={{ p: 2.5, textAlign: "center", bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
                              Baseline
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                              {sensitivityResults.baseline_total?.toFixed(2)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              tCO₂e
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={6} sm={6} md={3}>
                          <Paper sx={{
                            p: 2.5,
                            textAlign: "center",
                            bgcolor: (sensitivityResults.adjusted_total - sensitivityResults.baseline_total) > 0 ? 'error.50' : 'success.50',
                            border: '1px solid',
                            borderColor: (sensitivityResults.adjusted_total - sensitivityResults.baseline_total) > 0 ? 'error.200' : 'success.200'
                          }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
                              Adjusted
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                              {sensitivityResults.adjusted_total?.toFixed(2)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              tCO₂e
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={6} sm={6} md={3}>
                          <Paper sx={{ p: 2.5, textAlign: "center", bgcolor: 'grey.100', border: '1px solid', borderColor: 'grey.300' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
                              Change
                            </Typography>
                            <Typography
                              variant="h5"
                              sx={{ fontWeight: 700, mb: 0.5 }}
                              color={
                                (sensitivityResults.adjusted_total - sensitivityResults.baseline_total) > 0
                                  ? "error.main"
                                  : "success.main"
                              }
                            >
                              {((sensitivityResults.adjusted_total - sensitivityResults.baseline_total) / sensitivityResults.baseline_total * 100).toFixed(1)}%
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              vs baseline
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={6} sm={6} md={3}>
                          <Paper sx={{ p: 2.5, textAlign: "center", bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
                              Year {timelineYears}
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                              {sensitivityResults.timeline?.[sensitivityResults.timeline.length - 1]?.adjusted.toFixed(2)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              tCO₂e projected
                            </Typography>
                          </Paper>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Box>
              ) : (
                <Card>
                  <CardContent sx={{ textAlign: "center", py: 10 }}>
                    <TrendingUpIcon sx={{ fontSize: 100, color: "text.secondary", mb: 3, opacity: 0.5 }} />
                    <Typography variant="h5" color="text.secondary" sx={{ fontWeight: 600, mb: 1 }}>
                      Ready to Analyze
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Select a project and adjust activities on the right to see impact projections
                    </Typography>
                  </CardContent>
                </Card>
              )}
            </Box>

            {/* Right Side: Configuration and Controls */}
            <Box sx={{ flex: '0 0 40%', minWidth: 0 }}>
              <Box sx={{ position: 'sticky', top: 20 }}>
                {/* Configuration Card */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                      Configuration
                    </Typography>

                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel id="sensitivity-project-label">Select Project</InputLabel>
                      <Select
                        labelId="sensitivity-project-label"
                        value={sensitivityProject}
                        onChange={(e) => {
                          setSensitivityProject(e.target.value);
                          loadProjectDetails(e.target.value);
                        }}
                        label="Select Project"
                        MenuProps={{
                          PaperProps: {
                            style: {
                              maxHeight: 400,
                            },
                          },
                          anchorOrigin: {
                            vertical: 'bottom',
                            horizontal: 'left',
                          },
                          transformOrigin: {
                            vertical: 'top',
                            horizontal: 'left',
                          },
                        }}
                      >
                        {projects.map((proj) => (
                          <MenuItem
                            key={proj.project_id}
                            value={proj.project_id}
                          >
                            {proj.project_name || proj.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <TextField
                      fullWidth
                      label="Timeline (years)"
                      type="number"
                      value={timelineYears}
                      onChange={(e) => setTimelineYears(parseInt(e.target.value))}
                      inputProps={{ min: 1, max: 50 }}
                      sx={{ mb: 2 }}
                      helperText="Project emissions over this time period"
                    />

                    <TextField
                      fullWidth
                      label="Annual Growth Rate (%)"
                      type="number"
                      value={growthRate}
                      onChange={(e) => setGrowthRate(parseFloat(e.target.value))}
                      inputProps={{ min: -50, max: 50, step: 0.5 }}
                      sx={{ mb: 3 }}
                      helperText="Positive = growth, Negative = reduction"
                    />

                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      startIcon={sensitivityLoading ? <CircularProgress size={20} color="inherit" /> : <TrendingUpIcon />}
                      onClick={runSensitivityAnalysis}
                      disabled={sensitivityLoading || !sensitivityProject}
                      sx={{ py: 1.5, fontWeight: 600 }}
                    >
                      {sensitivityLoading ? "Analyzing..." : "Run Analysis"}
                    </Button>
                  </CardContent>
                </Card>

                {/* Activity Adjustments Card */}
                {projectDetails && (
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          Activity Adjustments
                        </Typography>
                        <Button
                          size="small"
                          onClick={() => setActivityAdjustments(Object.keys(activityAdjustments).reduce((acc, key) => ({ ...acc, [key]: 0 }), {}))}
                          variant="outlined"
                          sx={{ fontSize: '0.75rem' }}
                        >
                          Reset All
                        </Button>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        Adjust activity quantities to model different scenarios
                      </Typography>
                      <Divider sx={{ mb: 1.5 }} />
                      <Box>
                        {projectDetails.scopes?.map(scope => (
                          <Box key={scope.scope_id} sx={{ mb: 2 }}>
                            <Chip
                              label={`Scope ${scope.scope_number}`}
                              size="small"
                              color="primary"
                              sx={{ mb: 1.5, fontWeight: 600, height: 22, fontSize: '0.75rem' }}
                            />
                            {scope.activities?.map(act => (
                              <Box key={act.activity_id} sx={{ mb: 2, pb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 500, flex: 1, pr: 1, fontSize: '0.875rem' }}>
                                    {act.activity_name}
                                  </Typography>
                                  <Chip
                                    label={`${activityAdjustments[act.activity_id] || 0}%`}
                                    size="small"
                                    color={
                                      (activityAdjustments[act.activity_id] || 0) > 0 ? 'error' :
                                        (activityAdjustments[act.activity_id] || 0) < 0 ? 'success' : 'default'
                                    }
                                    sx={{ fontWeight: 600, height: 20, fontSize: '0.7rem' }}
                                  />
                                </Box>
                                <Slider
                                  value={activityAdjustments[act.activity_id] || 0}
                                  onChange={(e, value) => setActivityAdjustments(prev => ({
                                    ...prev,
                                    [act.activity_id]: value
                                  }))}
                                  min={-100}
                                  max={100}
                                  step={5}
                                  marks={[
                                    { value: -100, label: '-100%' },
                                    { value: 0, label: '0%' },
                                    { value: 100, label: '+100%' }
                                  ]}
                                  valueLabelDisplay="auto"
                                  valueLabelFormat={(value) => `${value}%`}
                                  size="small"
                                  sx={{
                                    '& .MuiSlider-markLabel': {
                                      fontSize: '0.6rem',
                                    },
                                  }}
                                />
                              </Box>
                            ))}
                            {scope.lca_activities?.map(act => (
                              <Box key={act.activity_id} sx={{ mb: 2, pb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                  <Box sx={{ flex: 1, pr: 1 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                                      {act.activity_name}
                                    </Typography>
                                    <Chip label="LCA" size="small" sx={{ mt: 0.5, height: 16, fontSize: '0.6rem' }} />
                                  </Box>
                                  <Chip
                                    label={`${activityAdjustments[act.activity_id] || 0}%`}
                                    size="small"
                                    color={
                                      (activityAdjustments[act.activity_id] || 0) > 0 ? 'error' :
                                        (activityAdjustments[act.activity_id] || 0) < 0 ? 'success' : 'default'
                                    }
                                    sx={{ fontWeight: 600, height: 20, fontSize: '0.7rem' }}
                                  />
                                </Box>
                                <Slider
                                  value={activityAdjustments[act.activity_id] || 0}
                                  onChange={(e, value) => setActivityAdjustments(prev => ({
                                    ...prev,
                                    [act.activity_id]: value
                                  }))}
                                  min={-100}
                                  max={100}
                                  step={5}
                                  marks={[
                                    { value: -100, label: '-100%' },
                                    { value: 0, label: '0%' },
                                    { value: 100, label: '+100%' }
                                  ]}
                                  valueLabelDisplay="auto"
                                  valueLabelFormat={(value) => `${value}%`}
                                  size="small"
                                  sx={{
                                    '& .MuiSlider-markLabel': {
                                      fontSize: '0.6rem',
                                    },
                                  }}
                                />
                              </Box>
                            ))}
                          </Box>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                )}
              </Box>
            </Box>
          </Box>
        </TabPanel >

        {/* Tab 4: LCA Product Sensitivity Analysis */}
        < TabPanel value={tabValue} index={3} >
          <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' }, pr: 3 }}>
            {/* Left Side: Graph and Analytics */}
            <Box sx={{ flex: '0 0 60%', minWidth: 0 }}>
              {lcaSensitivityLoading ? (
                <Card>
                  <CardContent sx={{ textAlign: "center", py: 8 }}>
                    <CircularProgress size={60} />
                    <Typography variant="h6" sx={{ mt: 2 }}>
                      Running Sensitivity Analysis...
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Calculating impact for different quantities...
                    </Typography>
                  </CardContent>
                </Card>
              ) : lcaSensitivityResults ? (
                <Box>
                  {/* Sensitivity Line Chart */}
                  <Card sx={{ mb: 3 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                        Quantity vs. Environmental Impact
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        How emissions scale with different product quantities
                      </Typography>
                      <Box sx={{ height: 450 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={lcaSensitivityResults.data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="quantity"
                              label={{ value: "Quantity", position: "insideBottom", offset: -5 }}
                            />
                            <YAxis label={{ value: "Total Impact (tCO₂e)", angle: -90, position: "insideLeft" }} />
                            <Tooltip />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="impact"
                              stroke="#1976d2"
                              name="Environmental Impact"
                              strokeWidth={3}
                              dot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </Box>
                    </CardContent>
                  </Card>

                  {/* Analytics Summary */}
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                        Impact Analysis
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6} md={4}>
                          <Paper sx={{ p: 2.5, textAlign: "center", bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
                              Unit Impact
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                              {lcaSensitivityResults.unitImpact?.toFixed(3)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              tCO₂e per unit
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={6} md={4}>
                          <Paper sx={{ p: 2.5, textAlign: "center", bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
                              Min Impact
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                              {lcaSensitivityResults.minImpact?.toFixed(3)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              tCO₂e (qty: {lcaSensitivityResults.minQuantity})
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={6} md={4}>
                          <Paper sx={{ p: 2.5, textAlign: "center", bgcolor: 'error.50', border: '1px solid', borderColor: 'error.200' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
                              Max Impact
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                              {lcaSensitivityResults.maxImpact?.toFixed(3)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              tCO₂e (qty: {lcaSensitivityResults.maxQuantity})
                            </Typography>
                          </Paper>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Box>
              ) : (
                <Card>
                  <CardContent sx={{ textAlign: "center", py: 10 }}>
                    <ScienceIcon sx={{ fontSize: 100, color: "text.secondary", mb: 3, opacity: 0.5 }} />
                    <Typography variant="h5" color="text.secondary" sx={{ fontWeight: 600, mb: 1 }}>
                      Ready to Analyze
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Select a product and configure quantities to see impact scaling
                    </Typography>
                  </CardContent>
                </Card>
              )}
            </Box>

            {/* Right Side: Configuration */}
            <Box sx={{ flex: '0 0 40%', minWidth: 0 }}>
              <Box sx={{ position: 'sticky', top: 20 }}>
                {/* Configuration Card */}
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                      Product Configuration
                    </Typography>

                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel id="lca-database-label">Database</InputLabel>
                      <Select
                        labelId="lca-database-label"
                        value={lcaSensitivityDatabase || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          setLcaSensitivityDatabase(value);
                          setLcaSensitivityActivity("");
                          if (value) {
                            loadActivitiesForDatabase(value);
                          }
                        }}
                        label="Database"
                        MenuProps={{
                          PaperProps: {
                            style: {
                              maxHeight: 400,
                            },
                          },
                        }}
                      >
                        {!databases || databases.length === 0 ? (
                          <MenuItem value="" disabled>No databases available</MenuItem>
                        ) : (
                          databases.map((db, idx) => {
                            const dbName = typeof db === 'string' ? db : (db?.name || db);
                            return (
                              <MenuItem key={`lca-db-${idx}`} value={dbName}>
                                {dbName}
                              </MenuItem>
                            );
                          })
                        )}
                      </Select>
                    </FormControl>

                    <FormControl fullWidth sx={{ mb: 2 }} disabled={!lcaSensitivityDatabase}>
                      <InputLabel id="lca-activity-label">Product/Activity</InputLabel>
                      <Select
                        labelId="lca-activity-label"
                        value={lcaSensitivityActivity || ""}
                        onChange={(e) => setLcaSensitivityActivity(e.target.value)}
                        label="Product/Activity"
                        MenuProps={{
                          PaperProps: {
                            style: {
                              maxHeight: 400,
                            },
                          },
                        }}
                      >
                        {!activities || activities.length === 0 ? (
                          <MenuItem value="" disabled>
                            {lcaSensitivityDatabase ? "Loading activities..." : "Select a database first"}
                          </MenuItem>
                        ) : (
                          activities.map((act) => (
                            <MenuItem key={act.code} value={act.code}>
                              {act.name} ({act.location})
                            </MenuItem>
                          ))
                        )}
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

                        {impactMethods.map((method, idx) => (
                          <MenuItem key={idx} value={JSON.stringify(method.method)}>
                            {method.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                      Quantity Range
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Test quantities: {lcaSensitivityQuantities.join(', ')}
                    </Typography>

                    <Box sx={{ mb: 3 }}>
                      {lcaSensitivityQuantities.map((qty, idx) => (
                        <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                          <TextField
                            size="small"
                            type="number"
                            value={qty}
                            onChange={(e) => {
                              const newQuantities = [...lcaSensitivityQuantities];
                              newQuantities[idx] = parseFloat(e.target.value);
                              setLcaSensitivityQuantities(newQuantities);
                            }}
                            inputProps={{ min: 0.001, step: 0.5 }}
                            sx={{ flex: 1 }}
                          />
                          {lcaSensitivityQuantities.length > 2 && (
                            <Button
                              size="small"
                              color="error"
                              onClick={() => {
                                setLcaSensitivityQuantities(lcaSensitivityQuantities.filter((_, i) => i !== idx));
                              }}
                            >
                              Remove
                            </Button>
                          )}
                        </Box>
                      ))}
                      <Button
                        size="small"
                        variant="outlined"
                        fullWidth
                        onClick={() => setLcaSensitivityQuantities([...lcaSensitivityQuantities, lcaSensitivityQuantities[lcaSensitivityQuantities.length - 1] * 2])}
                        sx={{ mt: 1 }}
                      >
                        Add Quantity
                      </Button>
                    </Box>

                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      startIcon={lcaSensitivityLoading ? <CircularProgress size={20} color="inherit" /> : <ScienceIcon />}
                      onClick={() => runLCAProductSensitivity()}
                      disabled={lcaSensitivityLoading || !lcaSensitivityDatabase || !lcaSensitivityActivity}
                      sx={{ py: 1.5, fontWeight: 600 }}
                    >
                      {lcaSensitivityLoading ? "Analyzing..." : "Run Analysis"}
                    </Button>
                  </CardContent>
                </Card>
              </Box>
            </Box>
          </Box>
        </TabPanel >

        {/* Tab 4: Supply Chain Map */}
        < TabPanel value={tabValue} index={4} >
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Configuration
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
                          {project.project_name || project.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Typography variant="body2" color="text.secondary">
                    Select a project to visualize its supply chain emission footprint.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={8}>
              {selectedProject ? (
                <Card>
                  <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                    <GlobeVisualization projectId={selectedProject} />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent sx={{ textAlign: "center", py: 10 }}>
                    <PublicIcon sx={{ fontSize: 100, color: "text.secondary", mb: 3, opacity: 0.5 }} />
                    <Typography variant="h5" color="text.secondary" sx={{ fontWeight: 600, mb: 1 }}>
                      Select a Project
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Choose a project to view the global supply chain map.
                    </Typography>
                  </CardContent>
                </Card>
              )}
            </Grid>
          </Grid>
        </TabPanel >
      </Box >
    );
  } catch (err) {
    console.error("Render error:", err);
    setRenderError(err);
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <Typography variant="h6">Rendering Error</Typography>
          <Typography variant="body2">{err.toString()}</Typography>
        </Alert>
      </Box>
    );
  }
}

export default Analysis;
