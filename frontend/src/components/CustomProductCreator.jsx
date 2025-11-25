import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  Alert,
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
  IconButton,
  Chip,
  CircularProgress,
  Autocomplete,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Clear as ClearIcon,
  Edit as EditIcon,
  AccountTree as GraphIcon
} from "@mui/icons-material";
import CustomProductEditorWrapper from "./CustomProductEditor";

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index} style={{ paddingTop: 20 }}>
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

function CustomProductCreator() {
  const [tabValue, setTabValue] = useState(0);

  // Product Creation State
  const [productName, setProductName] = useState("");
  const [productLocation, setProductLocation] = useState("GLO");
  const [productUnit, setProductUnit] = useState("kilogram");
  const [productDatabase, setProductDatabase] = useState("custom_products");
  const [productDescription, setProductDescription] = useState("");

  // Inputs State
  const [inputs, setInputs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedInput, setSelectedInput] = useState(null);
  const [inputAmount, setInputAmount] = useState(1.0);

  // Outputs State
  const [outputs, setOutputs] = useState([]);
  const [outputName, setOutputName] = useState("");
  const [outputAmount, setOutputAmount] = useState(1.0);

  // Custom Products List State
  const [customProducts, setCustomProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productDetailsDialog, setProductDetailsDialog] = useState(false);
  const [productDetails, setProductDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Editor State
  const [editingProduct, setEditingProduct] = useState(null);

  // Status State
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [creating, setCreating] = useState(false);

  const commonUnits = [
    "kilogram",
    "ton",
    "gram",
    "liter",
    "cubic meter",
    "meter",
    "square meter",
    "kilowatt hour",
    "megajoule",
    "hour",
    "unit",
    "kilometer"
  ];

  const commonLocations = [
    "GLO",
    "US",
    "EU",
    "CN",
    "DE",
    "FR",
    "GB",
    "JP",
    "RoW"
  ];

  useEffect(() => {
    if (tabValue === 1) {
      loadCustomProducts();
    }
  }, [tabValue]);

  const searchActivities = async () => {
    if (!searchTerm || searchTerm.length < 3) {
      setErrorMessage("Please enter at least 3 characters to search");
      return;
    }

    setSearching(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/brightway2/search_activities_for_inputs/?search_term=${encodeURIComponent(searchTerm)}&limit=50`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON response");
      }

      const data = await response.json();

      if (data.success) {
        setSearchResults(data.activities || []);
        if (!data.activities || data.activities.length === 0) {
          setErrorMessage(data.message || "No activities found. Try a different search term or import a database first.");
        }
      } else {
        setErrorMessage(data.error || "Search failed");
        setSearchResults([]);
      }
    } catch (error) {
      setErrorMessage(`Search failed: ${error.message}`);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const addInput = () => {
    if (!selectedInput) {
      setErrorMessage("Please select an activity to add as input");
      return;
    }

    if (inputAmount <= 0) {
      setErrorMessage("Amount must be greater than 0");
      return;
    }

    const newInput = {
      ...selectedInput,
      amount: inputAmount,
      type: "technosphere"
    };

    setInputs([...inputs, newInput]);
    setSelectedInput(null);
    setInputAmount(1.0);
    setSearchTerm("");
    setSearchResults([]);
    setStatusMessage(`Added input: ${newInput.name}`);
  };

  const removeInput = (index) => {
    const removed = inputs[index];
    setInputs(inputs.filter((_, i) => i !== index));
    setStatusMessage(`Removed input: ${removed.name}`);
  };

  const addOutput = () => {
    if (!outputName) {
      setErrorMessage("Output name is required");
      return;
    }

    if (outputAmount <= 0) {
      setErrorMessage("Amount must be greater than 0");
      return;
    }

    const newOutput = {
      name: outputName,
      amount: outputAmount,
      type: "production",
      unit: productUnit
    };

    setOutputs([...outputs, newOutput]);
    setOutputName("");
    setOutputAmount(1.0);
    setStatusMessage(`Added output: ${newOutput.name}`);
  };

  const removeOutput = (index) => {
    const removed = outputs[index];
    setOutputs(outputs.filter((_, i) => i !== index));
    setStatusMessage(`Removed output: ${removed.name}`);
  };

  const createProduct = async () => {
    if (!productName) {
      setErrorMessage("Product name is required");
      return;
    }

    if (inputs.length === 0) {
      setErrorMessage("Please add at least one input to your product");
      return;
    }

    setCreating(true);
    setErrorMessage("");
    setStatusMessage("Creating custom product...");

    try {
      // Prepare the product data
      const productData = {
        name: productName,
        database: productDatabase,
        location: productLocation,
        unit: productUnit,
        description: productDescription,
        inputs: inputs.map(input => ({
          database: input.database,
          code: input.code,
          amount: input.amount,
          type: input.type
        })),
        outputs: outputs.length > 0 ? outputs : [
          {
            name: productName,
            amount: 1.0,
            type: "production",
            unit: productUnit
          }
        ]
      };

      const response = await fetch("/api/brightway2/create_custom_product/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productData),
      });

      const data = await response.json();

      if (data.success) {
        setStatusMessage(
          `Successfully created product: ${data.product.name} in database ${data.product.database}!`
        );

        // Reset form
        setProductName("");
        setProductLocation("GLO");
        setProductUnit("kilogram");
        setProductDescription("");
        setInputs([]);
        setOutputs([]);

        // Load products if on that tab
        if (tabValue === 1) {
          loadCustomProducts();
        }
      } else {
        setErrorMessage(data.error || "Failed to create product");
      }
    } catch (error) {
      setErrorMessage(`Failed to create product: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  const loadCustomProducts = async () => {
    setLoadingProducts(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/brightway2/list_databases/");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON response");
      }

      const data = await response.json();

      if (data.success) {
        // Filter for custom databases (not ecoinvent)
        const customDbs = data.databases.filter(
          db => !db.name.startsWith('ecoinvent') && !db.name.startsWith('biosphere')
        );

        // Load activities from each custom database
        const allProducts = [];
        for (const db of customDbs) {
          try {
            const actResponse = await fetch(
              `/api/brightway2/get_activities/?database_name=${encodeURIComponent(db.name)}&limit=1000`
            );

            if (!actResponse.ok) {
              console.warn(`Failed to load activities from ${db.name}`);
              continue;
            }

            const actContentType = actResponse.headers.get("content-type");
            if (!actContentType || !actContentType.includes("application/json")) {
              console.warn(`Non-JSON response for ${db.name}`);
              continue;
            }

            const actData = await actResponse.json();

            if (actData.success && actData.activities) {
              allProducts.push(...actData.activities.map(act => ({
                ...act,
                db_name: db.name
              })));
            }
          } catch (err) {
            console.warn(`Error loading activities from ${db.name}:`, err);
            continue;
          }
        }

        setCustomProducts(allProducts);
      } else {
        setErrorMessage(data.error || "Failed to load databases");
      }
    } catch (error) {
      setErrorMessage(`Error loading custom products: ${error.message}`);
    } finally {
      setLoadingProducts(false);
    }
  };

  const viewProductDetails = async (product) => {
    setSelectedProduct(product);
    setProductDetailsDialog(true);
    setLoadingDetails(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/brightway2/verify_custom_product/?database_name=${encodeURIComponent(
          product.database
        )}&activity_code=${encodeURIComponent(product.code)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON response");
      }

      const data = await response.json();

      if (data.success) {
        setProductDetails(data.product);
      } else {
        setErrorMessage(data.error || "Failed to load product details");
        setProductDetails(null);
      }
    } catch (error) {
      setErrorMessage(`Error loading product details: ${error.message}`);
      setProductDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const deleteProduct = async (product) => {
    if (!confirm(`Are you sure you want to delete "${product.name}"?`)) {
      return;
    }

    setErrorMessage("");

    try {
      const response = await fetch("/api/brightway2/delete_custom_product/", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          database_name: product.database,
          activity_code: product.code,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON response");
      }

      const data = await response.json();

      if (data.success) {
        setStatusMessage(data.message);
        loadCustomProducts();
      } else {
        setErrorMessage(data.error || "Failed to delete product");
      }
    } catch (error) {
      setErrorMessage(`Error deleting product: ${error.message}`);
    }
  };

  const handleEditGraph = (product) => {
    setEditingProduct(product);
  };

  const handleCloseEditor = () => {
    setEditingProduct(null);
    loadCustomProducts(); // Refresh to show updated impact if calculated
  };

  if (editingProduct) {
    return (
      <Box sx={{ width: "100%", height: "80vh" }}>
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button startIcon={<ClearIcon />} onClick={() => setEditingProduct(null)}>
            Back to List
          </Button>
          <Typography variant="h6">
            Editing: {editingProduct.name}
          </Typography>
        </Box>
        <CustomProductEditorWrapper
          activity={editingProduct}
          onClose={handleCloseEditor}
          onSaveSuccess={() => {
            setStatusMessage("Product graph updated successfully!");
            handleCloseEditor();
          }}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Create Product" icon={<AddIcon />} iconPosition="start" />
          <Tab label="My Products" icon={<CheckCircleIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Status Messages */}
      {statusMessage && (
        <Alert severity="success" sx={{ mt: 2 }} onClose={() => setStatusMessage("")}>
          {statusMessage}
        </Alert>
      )}
      {errorMessage && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setErrorMessage("")}>
          {errorMessage}
        </Alert>
      )}

      {/* Tab 1: Create Product */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {/* Left Column: Product Details */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Product Details
                </Typography>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
                  <TextField
                    label="Product Name *"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    fullWidth
                    required
                  />

                  <TextField
                    label="Database Name"
                    value={productDatabase}
                    onChange={(e) => setProductDatabase(e.target.value)}
                    fullWidth
                    helperText="Database where the product will be stored"
                  />

                  <FormControl fullWidth>
                    <InputLabel>Location</InputLabel>
                    <Select
                      value={productLocation}
                      label="Location"
                      onChange={(e) => setProductLocation(e.target.value)}
                    >
                      {commonLocations.map((loc) => (
                        <MenuItem key={loc} value={loc}>
                          {loc}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>Unit</InputLabel>
                    <Select
                      value={productUnit}
                      label="Unit"
                      onChange={(e) => setProductUnit(e.target.value)}
                    >
                      {commonUnits.map((unit) => (
                        <MenuItem key={unit} value={unit}>
                          {unit}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    label="Description"
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    fullWidth
                    multiline
                    rows={3}
                  />
                </Box>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" gutterBottom>
                  Outputs (Optional)
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  By default, a production output will be created. Add custom outputs below.
                </Typography>

                <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                  <TextField
                    label="Output Name"
                    value={outputName}
                    onChange={(e) => setOutputName(e.target.value)}
                    size="small"
                    sx={{ flexGrow: 1 }}
                  />
                  <TextField
                    label="Amount"
                    type="number"
                    value={outputAmount}
                    onChange={(e) => setOutputAmount(parseFloat(e.target.value) || 0)}
                    size="small"
                    sx={{ width: 120 }}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={addOutput}
                    size="small"
                  >
                    Add
                  </Button>
                </Box>

                {outputs.length > 0 && (
                  <List dense sx={{ mt: 2 }}>
                    {outputs.map((output, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={output.name}
                          secondary={`Amount: ${output.amount} ${output.unit}`}
                        />
                        <ListItemSecondaryAction>
                          <IconButton edge="end" onClick={() => removeOutput(index)} size="small">
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Right Column: Inputs */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Product Inputs *
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Search for activities from imported databases to use as inputs
                </Typography>

                <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                  <TextField
                    label="Search Activities"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && searchActivities()}
                    fullWidth
                    size="small"
                    helperText="Enter at least 3 characters"
                  />
                  <Button
                    variant="contained"
                    startIcon={searching ? <CircularProgress size={20} /> : <SearchIcon />}
                    onClick={searchActivities}
                    disabled={searching || searchTerm.length < 3}
                  >
                    Search
                  </Button>
                </Box>

                {searchResults.length > 0 && (
                  <Box sx={{ mt: 2, maxHeight: 300, overflow: "auto", border: 1, borderColor: "divider", borderRadius: 1 }}>
                    <List dense>
                      {searchResults.map((activity, index) => (
                        <ListItem
                          key={index}
                          button
                          selected={selectedInput?.code === activity.code}
                          onClick={() => setSelectedInput(activity)}
                        >
                          <ListItemText
                            primary={activity.name}
                            secondary={`${activity.database} | ${activity.location} | ${activity.unit}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {selectedInput && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: "action.hover", borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Selected: {selectedInput.name}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                      <TextField
                        label="Amount"
                        type="number"
                        value={inputAmount}
                        onChange={(e) => setInputAmount(parseFloat(e.target.value) || 0)}
                        size="small"
                        sx={{ width: 150 }}
                      />
                      <Typography variant="body2" sx={{ alignSelf: "center" }}>
                        {selectedInput.unit}
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={addInput}
                        size="small"
                      >
                        Add Input
                      </Button>
                    </Box>
                  </Box>
                )}

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle1" gutterBottom>
                  Added Inputs ({inputs.length})
                </Typography>

                {inputs.length === 0 ? (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    No inputs added yet. Search and add activities above.
                  </Alert>
                ) : (
                  <List dense>
                    {inputs.map((input, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={input.name}
                          secondary={`${input.amount} ${input.unit} | ${input.database}`}
                        />
                        <ListItemSecondaryAction>
                          <IconButton edge="end" onClick={() => removeInput(index)} size="small" color="error">
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>

            {/* Create Button */}
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                fullWidth
                startIcon={creating ? <CircularProgress size={20} /> : <SaveIcon />}
                onClick={createProduct}
                disabled={creating || !productName || inputs.length === 0}
              >
                {creating ? "Creating Product..." : "Create Custom Product"}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 2: My Products */}
      <TabPanel value={tabValue} index={1}>
        <Card>
          <CardContent>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6">My Custom Products</Typography>
              <Button
                startIcon={<RefreshIcon />}
                onClick={loadCustomProducts}
                disabled={loadingProducts}
              >
                Refresh
              </Button>
            </Box>

            {loadingProducts ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                <CircularProgress />
              </Box>
            ) : customProducts.length === 0 ? (
              <Alert severity="info">
                No custom products found. Create one using the "Create Product" tab.
              </Alert>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Name</strong></TableCell>
                      <TableCell><strong>Database</strong></TableCell>
                      <TableCell><strong>Location</strong></TableCell>
                      <TableCell><strong>Unit</strong></TableCell>
                      <TableCell align="right"><strong>Exchanges</strong></TableCell>
                      <TableCell align="right"><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {customProducts.map((product) => (
                      <TableRow key={`${product.database}-${product.code}`}>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>
                          <Chip label={product.database} size="small" color="primary" />
                        </TableCell>
                        <TableCell>{product.location}</TableCell>
                        <TableCell>{product.unit}</TableCell>
                        <TableCell align="right">
                          <Chip label={product.num_exchanges} size="small" />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            startIcon={<GraphIcon />}
                            onClick={() => handleEditGraph(product)}
                            sx={{ mr: 1 }}
                            color="secondary"
                          >
                            Edit Graph
                          </Button>
                          <Button
                            size="small"
                            startIcon={<InfoIcon />}
                            onClick={() => viewProductDetails(product)}
                            sx={{ mr: 1 }}
                          >
                            View
                          </Button>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => deleteProduct(product)}
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

      {/* Product Details Dialog */}
      <Dialog
        open={productDetailsDialog}
        onClose={() => setProductDetailsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Product Details
          {selectedProduct && ` - ${selectedProduct.name}`}
        </DialogTitle>
        <DialogContent>
          {loadingDetails ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress />
            </Box>
          ) : productDetails ? (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Basic Information</strong>
              </Typography>
              <Typography variant="body2">Database: {productDetails.database}</Typography>
              <Typography variant="body2">Location: {productDetails.location}</Typography>
              <Typography variant="body2">Unit: {productDetails.unit}</Typography>
              {productDetails.description && (
                <Typography variant="body2">Description: {productDetails.description}</Typography>
              )}

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" gutterBottom>
                <strong>Outputs ({productDetails.outputs.length})</strong>
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Unit</TableCell>
                      <TableCell>Type</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {productDetails.outputs.map((output, index) => (
                      <TableRow key={index}>
                        <TableCell>{output.input_name}</TableCell>
                        <TableCell align="right">{output.amount.toExponential(3)}</TableCell>
                        <TableCell>{output.unit}</TableCell>
                        <TableCell>
                          <Chip label={output.type} size="small" color="success" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" gutterBottom>
                <strong>Inputs ({productDetails.inputs.length})</strong>
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Unit</TableCell>
                      <TableCell>Database</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {productDetails.inputs.map((input, index) => (
                      <TableRow key={index}>
                        <TableCell>{input.input_name}</TableCell>
                        <TableCell align="right">{input.amount.toExponential(3)}</TableCell>
                        <TableCell>{input.unit}</TableCell>
                        <TableCell>
                          <Chip label={input.database} size="small" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : (
            <Alert severity="error">Failed to load product details</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProductDetailsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CustomProductCreator;
