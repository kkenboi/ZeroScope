import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Tabs,
  Tab,
  Alert,
  Chip,
  Grid,
  FormHelperText,
  Divider,
} from '@mui/material';

const EmissionFactorEntry = ({ open, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [categories, setCategories] = useState([]);
  const [validUnits, setValidUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Simplified form state for both entry modes
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    emission_factor_value: '',
    unit: '',
    source: '',
    year: new Date().getFullYear(),
    // Guided entry specific fields
    guided_parameters: {}
  });

  // Fetch categories on component mount
  useEffect(() => {
    if (open) {
      fetchCategories();
      resetForm();
    }
  }, [open]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/emission-factors/categories/');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      } else {
        console.error('Failed to fetch categories');
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to load categories');
    }
  };

  const fetchValidUnits = async (category) => {
    try {
      // Get valid units from the category data we already have
      const selectedCategory = categories.find(cat => cat.category === category);
      if (selectedCategory) {
        setValidUnits(selectedCategory.valid_units || []);
      } else {
        setValidUnits([]);
      }
    } catch (err) {
      console.error('Error fetching units:', err);
      setValidUnits([]);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      description: '',
      emission_factor_value: '',
      unit: '',
      source: '',
      year: new Date().getFullYear(),
      guided_parameters: {}
    });
    setValidUnits([]);
    setError('');
  };

  const handleCategoryChange = (category) => {
    setFormData(prev => ({
      ...prev,
      category,
      unit: '',
      guided_parameters: {}
    }));
    fetchValidUnits(category);
  };

  const renderGuidedParameters = () => {
    const { category } = formData;
    
    switch (category) {
      case 'upstream_transport':
      case 'downstream_transport':
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom color="primary">
              Transport Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Transport Mode *</InputLabel>
                  <Select
                    value={formData.guided_parameters.transport_mode || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      guided_parameters: {
                        ...prev.guided_parameters,
                        transport_mode: e.target.value
                      }
                    }))}
                  >
                    <MenuItem value="road_truck">Road - Truck</MenuItem>
                    <MenuItem value="road_van">Road - Van</MenuItem>
                    <MenuItem value="rail">Rail</MenuItem>
                    <MenuItem value="sea_freight">Sea Freight</MenuItem>
                    <MenuItem value="air_freight">Air Freight</MenuItem>
                  </Select>
                  <FormHelperText>Select the primary transport mode</FormHelperText>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Load Factor</InputLabel>
                  <Select
                    value={formData.guided_parameters.load_factor || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      guided_parameters: {
                        ...prev.guided_parameters,
                        load_factor: e.target.value
                      }
                    }))}
                  >
                    <MenuItem value="average">Average (50%)</MenuItem>
                    <MenuItem value="full">Full Load (100%)</MenuItem>
                    <MenuItem value="partial">Partial Load (25%)</MenuItem>
                  </Select>
                  <FormHelperText>Typical vehicle load factor</FormHelperText>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        );

      case 'business_travel':
      case 'employee_commuting':
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom color="primary">
              Passenger Transport Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Transport Mode *</InputLabel>
                  <Select
                    value={formData.guided_parameters.transport_mode || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      guided_parameters: {
                        ...prev.guided_parameters,
                        transport_mode: e.target.value
                      }
                    }))}
                  >
                    <MenuItem value="car_petrol">Car - Petrol</MenuItem>
                    <MenuItem value="car_diesel">Car - Diesel</MenuItem>
                    <MenuItem value="bus">Bus</MenuItem>
                    <MenuItem value="train">Train</MenuItem>
                    <MenuItem value="plane_domestic">Plane - Domestic</MenuItem>
                    <MenuItem value="plane_international">Plane - International</MenuItem>
                    <MenuItem value="taxi">Taxi</MenuItem>
                  </Select>
                  <FormHelperText>Select passenger transport mode</FormHelperText>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Average Occupancy"
                  type="number"
                  fullWidth
                  value={formData.guided_parameters.occupancy || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    guided_parameters: {
                      ...prev.guided_parameters,
                      occupancy: e.target.value
                    }
                  }))}
                  helperText="Average number of passengers"
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 'fuel_combustion':
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom color="primary">
              Fuel Combustion Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Fuel Type *</InputLabel>
                  <Select
                    value={formData.guided_parameters.fuel_type || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      guided_parameters: {
                        ...prev.guided_parameters,
                        fuel_type: e.target.value
                      }
                    }))}
                  >
                    <MenuItem value="natural_gas">Natural Gas</MenuItem>
                    <MenuItem value="diesel">Diesel</MenuItem>
                    <MenuItem value="petrol">Petrol/Gasoline</MenuItem>
                    <MenuItem value="coal">Coal</MenuItem>
                    <MenuItem value="lpg">LPG</MenuItem>
                    <MenuItem value="fuel_oil">Fuel Oil</MenuItem>
                  </Select>
                  <FormHelperText>Type of fuel being combusted</FormHelperText>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Combustion Equipment</InputLabel>
                  <Select
                    value={formData.guided_parameters.equipment_type || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      guided_parameters: {
                        ...prev.guided_parameters,
                        equipment_type: e.target.value
                      }
                    }))}
                  >
                    <MenuItem value="boiler">Boiler</MenuItem>
                    <MenuItem value="generator">Generator</MenuItem>
                    <MenuItem value="furnace">Furnace</MenuItem>
                    <MenuItem value="engine">Engine</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                  <FormHelperText>Equipment used for combustion</FormHelperText>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        );

      case 'electricity_consumption':
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom color="primary">
              Electricity Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Grid Region *</InputLabel>
                  <Select
                    value={formData.guided_parameters.grid_region || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      guided_parameters: {
                        ...prev.guided_parameters,
                        grid_region: e.target.value
                      }
                    }))}
                  >
                    <MenuItem value="singapore">Singapore</MenuItem>
                    <MenuItem value="malaysia">Malaysia</MenuItem>
                    <MenuItem value="thailand">Thailand</MenuItem>
                    <MenuItem value="indonesia">Indonesia</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                  <FormHelperText>Electricity grid region/country</FormHelperText>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Supply Type</InputLabel>
                  <Select
                    value={formData.guided_parameters.supply_type || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      guided_parameters: {
                        ...prev.guided_parameters,
                        supply_type: e.target.value
                      }
                    }))}
                  >
                    <MenuItem value="grid_average">Grid Average</MenuItem>
                    <MenuItem value="renewable">Renewable Energy</MenuItem>
                    <MenuItem value="coal">Coal-based</MenuItem>
                    <MenuItem value="gas">Gas-based</MenuItem>
                  </Select>
                  <FormHelperText>Type of electricity supply</FormHelperText>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        );

      default:
        return null;
    }
  };

  const validateForm = () => {
    const { name, category, emission_factor_value, unit, source, year } = formData;
    
    if (!name.trim()) return 'Name is required';
    if (!category) return 'Category is required';
    if (!emission_factor_value || isNaN(Number(emission_factor_value)) || Number(emission_factor_value) <= 0) {
      return 'Emission factor must be a positive number';
    }
    if (!unit) return 'Unit is required';
    if (!source.trim()) return 'Source is required';
    if (!year || year < 1990 || year > new Date().getFullYear() + 5) {
      return 'Year must be between 1990 and ' + (new Date().getFullYear() + 5);
    }
    
    // Guided entry specific validations
    if (activeTab === 1) {
      const { category, guided_parameters } = formData;
      
      if ((category === 'upstream_transport' || category === 'downstream_transport') && !guided_parameters.transport_mode) {
        return 'Transport mode is required for transport categories';
      }
      if ((category === 'business_travel' || category === 'employee_commuting') && !guided_parameters.transport_mode) {
        return 'Transport mode is required for transport categories';
      }
      if (category === 'fuel_combustion' && !guided_parameters.fuel_type) {
        return 'Fuel type is required for fuel combustion';
      }
      if (category === 'electricity_consumption' && !guided_parameters.grid_region) {
        return 'Grid region is required for electricity';
      }
    }
    
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Use the main endpoint directly instead of custom actions
      const payload = {
        ...formData,
        entry_type: activeTab === 0 ? 'simple' : 'guided'
      };
      
      const response = await fetch(`/api/emission-factors/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (response.ok) {
        onSuccess?.();
        handleClose();
      } else {
        const errorData = await response.json();
        setError(errorData.message || errorData.detail || 'Error creating emission factor');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    setActiveTab(0);
    onClose();
  };

  const renderForm = () => (
    <Box sx={{ mt: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            label="Emission Factor Name *"
            fullWidth
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            helperText="Descriptive name for this emission factor"
          />
        </Grid>
        
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel>Category *</InputLabel>
            <Select
              value={formData.category}
              onChange={(e) => handleCategoryChange(e.target.value)}
            >
              {categories.map((cat) => (
                <MenuItem key={cat.category} value={cat.category}>
                  <Box>
                    <Typography variant="body2">{cat.category_label}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      Scope {cat.scope} • {cat.valid_units?.length || 0} valid units
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              Choose the GHG Protocol category that best fits this emission source
            </FormHelperText>
          </FormControl>
        </Grid>

        {/* Guided parameters for specific categories */}
        {activeTab === 1 && renderGuidedParameters()}

        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
        </Grid>

        <Grid item xs={6}>
          <TextField
            label="Emission Factor Value *"
            type="number"
            fullWidth
            value={formData.emission_factor_value}
            onChange={(e) => setFormData(prev => ({ ...prev, emission_factor_value: e.target.value }))}
            helperText="Will be automatically converted to kgCO₂e"
            inputProps={{ min: 0, step: "any" }}
          />
        </Grid>
        
        <Grid item xs={6}>
          <FormControl fullWidth>
            <InputLabel>Unit *</InputLabel>
            <Select
              value={formData.unit}
              onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
              disabled={!formData.category}
            >
              {validUnits.map((unit) => (
                <MenuItem key={unit} value={unit}>
                  {unit}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              {validUnits.length === 0 && formData.category 
                ? 'Loading valid units...' 
                : `Valid units for ${formData.category || 'selected category'}`
              }
            </FormHelperText>
          </FormControl>
        </Grid>

        <Grid item xs={6}>
          <TextField
            label="Source *"
            fullWidth
            value={formData.source}
            onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
            helperText="Data source or reference (e.g., IPCC, EPA, company study)"
            placeholder="e.g., IPCC 2019, EPA 2023, Internal Study"
          />
        </Grid>
        
        <Grid item xs={6}>
          <TextField
            label="Year *"
            type="number"
            fullWidth
            value={formData.year}
            onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) || '' }))}
            helperText="Year of publication or applicability"
            inputProps={{ min: 1990, max: new Date().getFullYear() + 5 }}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Description/Notes"
            multiline
            rows={3}
            fullWidth
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            helperText="Additional context, assumptions, or notes about this emission factor"
          />
        </Grid>
      </Grid>
      
      {/* Display valid units as chips */}
      {validUnits.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="textSecondary" gutterBottom display="block">
            Valid units for this category:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {validUnits.map((unit) => (
              <Chip 
                key={unit} 
                label={unit} 
                size="small" 
                variant={formData.unit === unit ? "filled" : "outlined"}
                color={formData.unit === unit ? "primary" : "default"}
              />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6">Add Emission Factor</Typography>
        <Typography variant="body2" color="textSecondary">
          Add a new emission factor for GHG calculations using the formula: Emissions = Activity Data × Emission Factor
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab 
              label="Simple Entry" 
              icon={<Typography variant="caption">Direct Input</Typography>}
            />
            <Tab 
              label="Guided Entry" 
              icon={<Typography variant="caption">Step-by-Step</Typography>}
            />
          </Tabs>
        </Box>
        
        {activeTab === 0 && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Simple Entry:</strong> Use this if you already have the emission factor value and know the exact unit.
                Perfect for importing factors from established sources like IPCC or EPA.
              </Typography>
            </Alert>
            {renderForm()}
          </Box>
        )}
        
        {activeTab === 1 && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Guided Entry:</strong> Step-by-step process with category-specific guidance.
                Helps ensure you select the right parameters and units for accurate calculations.
              </Typography>
            </Alert>
            {renderForm()}
          </Box>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          variant="contained" 
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Adding...' : `Add Emission Factor`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmissionFactorEntry;
