import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  IconButton,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Pagination
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CloudUpload as CloudUploadIcon,
  Storage as StorageIcon,
  Search as SearchIcon,
  ArrowBack as ArrowBackIcon,
  Info as InfoIcon,
  Add as AddIcon
} from "@mui/icons-material";
import CustomProductCreator from "./CustomProductCreator";

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index} style={{ paddingTop: 20 }}>
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

function BrightwayImport() {
  const [tabValue, setTabValue] = useState(0);
  
  // Import Tab State
  const [version, setVersion] = useState("3.9.1");
  const [systemModel, setSystemModel] = useState("cutoff");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState("");
  const [importError, setImportError] = useState("");
  
  // Database List State
  const [databases, setDatabases] = useState([]);
  const [loadingDatabases, setLoadingDatabases] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [databaseToDelete, setDatabaseToDelete] = useState(null);
  
  // Browser Tab State
  const [selectedDatabase, setSelectedDatabase] = useState("");
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitySearch, setActivitySearch] = useState("");
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotalCount, setActivityTotalCount] = useState(0);
  const [activityLimit] = useState(50);
  
  // Exchanges State
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [exchanges, setExchanges] = useState([]);
  const [exchangesLoading, setExchangesLoading] = useState(false);
  const [exchangesDialogOpen, setExchangesDialogOpen] = useState(false);
  
  const systemModels = [
    { value: "cutoff", label: "Cut-off" },
    { value: "apos", label: "APOS" },
    { value: "consequential", label: "Consequential" },
    { value: "EN15804", label: "EN15804" }
  ];

  useEffect(() => {
    loadDatabases();
  }, []);

  const loadDatabases = async () => {
    setLoadingDatabases(true);
    try {
      const response = await fetch("/api/brightway2/list_databases/");
      const data = await response.json();
      if (data.success) {
        setDatabases(data.databases);
        // Set first database as selected if none selected
        if (data.databases.length > 0 && !selectedDatabase) {
          setSelectedDatabase(data.databases[0].name);
        }
      }
    } catch (error) {
      console.error("Error loading databases:", error);
    } finally {
      setLoadingDatabases(false);
    }
  };

  const handleImportEcoinvent = async () => {
    if (!username || !password) {
      setImportError("Please provide ecoinvent username and password");
      return;
    }

    setImporting(true);
    setImportProgress(10);
    setImportStatus("Starting import...");
    setImportError("");

    try {
      const response = await fetch("/api/brightway2/import_ecoinvent/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version,
          system_model: systemModel,
          username,
          password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setImportProgress(100);
        setImportStatus(
          `Successfully imported ${data.database_name} with ${data.num_activities} activities!`
        );
        // Clear password for security
        setPassword("");
        // Reload databases
        loadDatabases();
      } else {
        setImportError(data.error || "Import failed");
        setImportProgress(0);
      }
    } catch (error) {
      setImportError(`Import failed: ${error.message}`);
      setImportProgress(0);
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteDatabase = async () => {
    if (!databaseToDelete) return;

    try {
      const response = await fetch("/api/brightway2/delete_database/", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          database_name: databaseToDelete,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setImportStatus(`Successfully deleted ${databaseToDelete}`);
        loadDatabases();
        // Clear selected database if it was deleted
        if (selectedDatabase === databaseToDelete) {
          setSelectedDatabase("");
          setActivities([]);
        }
      } else {
        setImportError(data.error || "Delete failed");
      }
    } catch (error) {
      setImportError(`Delete failed: ${error.message}`);
    } finally {
      setDeleteDialogOpen(false);
      setDatabaseToDelete(null);
    }
  };

  const loadActivities = async () => {
    if (!selectedDatabase) return;

    setActivitiesLoading(true);
    try {
      const offset = (activityPage - 1) * activityLimit;
      const url = `/api/brightway2/get_activities/?database_name=${encodeURIComponent(
        selectedDatabase
      )}&limit=${activityLimit}&offset=${offset}${
        activitySearch ? `&search=${encodeURIComponent(activitySearch)}` : ""
      }`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setActivities(data.activities);
        setActivityTotalCount(data.total_count);
      } else {
        setImportError(data.error || "Failed to load activities");
      }
    } catch (error) {
      setImportError(`Error loading activities: ${error.message}`);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const loadExchanges = async (activity) => {
    setSelectedActivity(activity);
    setExchangesLoading(true);
    setExchangesDialogOpen(true);

    try {
      const url = `/api/brightway2/get_exchanges/?database_name=${encodeURIComponent(
        activity.database
      )}&activity_code=${encodeURIComponent(activity.code)}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setExchanges(data.exchanges);
      } else {
        setImportError(data.error || "Failed to load exchanges");
        setExchanges([]);
      }
    } catch (error) {
      setImportError(`Error loading exchanges: ${error.message}`);
      setExchanges([]);
    } finally {
      setExchangesLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDatabase) {
      setActivityPage(1);
      loadActivities();
    }
  }, [selectedDatabase]);

  useEffect(() => {
    if (selectedDatabase) {
      loadActivities();
    }
  }, [activityPage, activitySearch]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setImportError("");
    setImportStatus("");
  };

  const activityPageCount = Math.ceil(activityTotalCount / activityLimit);

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Import Database" icon={<CloudUploadIcon />} iconPosition="start" />
          <Tab label="Manage Databases" icon={<StorageIcon />} iconPosition="start" />
          <Tab label="Browse Database" icon={<SearchIcon />} iconPosition="start" />
          <Tab label="Custom Products" icon={<AddIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Status Messages */}
      {importStatus && (
        <Alert severity="success" sx={{ mt: 2 }} onClose={() => setImportStatus("")}>
          {importStatus}
        </Alert>
      )}
      {importError && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setImportError("")}>
          {importError}
        </Alert>
      )}

      {/* Tab 1: Import Database */}
      <TabPanel value={tabValue} index={0}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Import Ecoinvent Database
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Import an ecoinvent database into the ZeroScope_LCA project. This operation may
              take several minutes depending on your internet connection and the database size.
            </Typography>

            <Alert severity="info" sx={{ my: 2 }}>
              <Typography variant="body2">
                <strong>Note:</strong> You need valid ecoinvent credentials to import databases.
                The project name is always <strong>ZeroScope_LCA</strong>.
              </Typography>
            </Alert>

            <Box sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Ecoinvent Version</InputLabel>
                <Select
                  value={version}
                  label="Ecoinvent Version"
                  onChange={(e) => setVersion(e.target.value)}
                  disabled={importing}
                >
                  <MenuItem value="3.9.1">3.9.1</MenuItem>
                  <MenuItem value="3.10">3.10</MenuItem>
                  <MenuItem value="3.8">3.8</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>System Model</InputLabel>
                <Select
                  value={systemModel}
                  label="System Model"
                  onChange={(e) => setSystemModel(e.target.value)}
                  disabled={importing}
                >
                  {systemModels.map((model) => (
                    <MenuItem key={model.value} value={model.value}>
                      {model.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Ecoinvent Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                fullWidth
                disabled={importing}
              />

              <TextField
                label="Ecoinvent Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                disabled={importing}
              />

              {importing && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {importStatus}
                  </Typography>
                  <LinearProgress variant="determinate" value={importProgress} />
                  <Typography variant="caption" sx={{ mt: 1, display: "block" }}>
                    {importProgress}%
                  </Typography>
                </Box>
              )}

              <Button
                variant="contained"
                startIcon={importing ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                onClick={handleImportEcoinvent}
                disabled={importing || !username || !password}
                fullWidth
              >
                {importing ? "Importing..." : "Import Database"}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Tab 2: Manage Databases */}
      <TabPanel value={tabValue} index={1}>
        <Card>
          <CardContent>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6">Available Databases</Typography>
              <Button
                startIcon={<RefreshIcon />}
                onClick={loadDatabases}
                disabled={loadingDatabases}
              >
                Refresh
              </Button>
            </Box>

            {loadingDatabases ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                <CircularProgress />
              </Box>
            ) : databases.length === 0 ? (
              <Alert severity="info">
                No databases found. Import a database using the Import tab.
              </Alert>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Database Name</strong></TableCell>
                      <TableCell align="right"><strong>Activities</strong></TableCell>
                      <TableCell align="right"><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {databases.map((db) => (
                      <TableRow key={db.name}>
                        <TableCell>{db.name}</TableCell>
                        <TableCell align="right">
                          <Chip label={db.num_activities.toLocaleString()} color="primary" size="small" />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            color="error"
                            onClick={() => {
                              setDatabaseToDelete(db.name);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      {/* Tab 3: Browse Database */}
      <TabPanel value={tabValue} index={2}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Browse Database Activities
            </Typography>

            <Box sx={{ mb: 3, display: "flex", gap: 2, alignItems: "center" }}>
              <FormControl sx={{ minWidth: 300 }}>
                <InputLabel>Select Database</InputLabel>
                <Select
                  value={selectedDatabase}
                  label="Select Database"
                  onChange={(e) => setSelectedDatabase(e.target.value)}
                  disabled={databases.length === 0}
                >
                  {databases.map((db) => (
                    <MenuItem key={db.name} value={db.name}>
                      {db.name} ({db.num_activities} activities)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Search Activities"
                value={activitySearch}
                onChange={(e) => {
                  setActivitySearch(e.target.value);
                  setActivityPage(1);
                }}
                sx={{ flexGrow: 1 }}
                disabled={!selectedDatabase}
              />
            </Box>

            {activitiesLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                <CircularProgress />
              </Box>
            ) : !selectedDatabase ? (
              <Alert severity="info">Select a database to browse activities.</Alert>
            ) : activities.length === 0 ? (
              <Alert severity="info">No activities found.</Alert>
            ) : (
              <>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Name</strong></TableCell>
                        <TableCell><strong>Location</strong></TableCell>
                        <TableCell><strong>Unit</strong></TableCell>
                        <TableCell align="right"><strong>Exchanges</strong></TableCell>
                        <TableCell align="right"><strong>Actions</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {activities.map((activity) => (
                        <TableRow key={activity.code}>
                          <TableCell>{activity.name}</TableCell>
                          <TableCell>{activity.location}</TableCell>
                          <TableCell>{activity.unit}</TableCell>
                          <TableCell align="right">
                            <Chip label={activity.num_exchanges} size="small" />
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              startIcon={<InfoIcon />}
                              onClick={() => loadExchanges(activity)}
                            >
                              View Exchanges
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                  <Pagination
                    count={activityPageCount}
                    page={activityPage}
                    onChange={(e, page) => setActivityPage(page)}
                    color="primary"
                  />
                </Box>
                <Typography variant="caption" sx={{ display: "block", textAlign: "center", mt: 1 }}>
                  Showing {activities.length} of {activityTotalCount.toLocaleString()} activities
                </Typography>
              </>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      {/* Tab 4: Custom Products */}
      <TabPanel value={tabValue} index={3}>
        <CustomProductCreator />
      </TabPanel>

      {/* Delete Database Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete Database</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the database <strong>{databaseToDelete}</strong>?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteDatabase} color="error" variant="contained" startIcon={<DeleteIcon />}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Exchanges Dialog */}
      <Dialog
        open={exchangesDialogOpen}
        onClose={() => setExchangesDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="h6">Exchanges</Typography>
            <IconButton onClick={() => setExchangesDialogOpen(false)}>
              <ArrowBackIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedActivity && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1"><strong>Activity:</strong> {selectedActivity.name}</Typography>
              <Typography variant="body2"><strong>Location:</strong> {selectedActivity.location}</Typography>
              <Typography variant="body2"><strong>Unit:</strong> {selectedActivity.unit}</Typography>
            </Box>
          )}
          <Divider sx={{ mb: 2 }} />
          
          {exchangesLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress />
            </Box>
          ) : exchanges.length === 0 ? (
            <Alert severity="info">No exchanges found for this activity.</Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Input</strong></TableCell>
                    <TableCell align="right"><strong>Amount</strong></TableCell>
                    <TableCell><strong>Unit</strong></TableCell>
                    <TableCell><strong>Type</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {exchanges.map((exchange, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{exchange.input}</TableCell>
                      <TableCell align="right">{exchange.amount.toExponential(3)}</TableCell>
                      <TableCell>{exchange.unit}</TableCell>
                      <TableCell>
                        <Chip
                          label={exchange.type}
                          size="small"
                          color={exchange.type === "production" ? "success" : "default"}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExchangesDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default BrightwayImport;
