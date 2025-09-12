import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Stepper,
    Step,
    StepLabel,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormGroup,
    FormControlLabel,
    Checkbox,
    Typography,
    Box,
    Alert,
    Grid
} from '@mui/material';

const AddEmissionFactorDialog = ({ open, onClose, onSuccess }) => {
    const [activeStep, setActiveStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [formErrors, setFormErrors] = useState({});
    
    // Form data for new emission factor
    const [formData, setFormData] = useState({
        // Step 1: Basic Information
        name: '',
        description: '',
        
        // Step 2: Category & Scope
        category: '',
        sub_category: '',
        applicable_scopes: [],
        
        // Step 3: Emission Values
        emission_factor_value: '',
        unit: '',
        
        // Step 4: Additional Information
        source: '',
        year: new Date().getFullYear(),
        uncertainty_type: 0,
        uncertainty_params: {}
    });

    const steps = [
        'Basic Information',
        'Category & Scope',
        'Emission Values',
        'Additional Information'
    ];

    // Updated category structure based on your requirements
    const categoryChoices = {
        // Scope 1 (Direct)
        'Scope 1 (Direct)': [
            ['stationary_combustion', 'Stationary Combustion'],
            ['mobile_combustion', 'Mobile Combustion'],
            ['fugitive_emissions', 'Fugitive Emissions'],
            ['process_emissions', 'Process Emissions']
        ],
        // Scope 2 (Indirect, Purchased Energy)
        'Scope 2 (Indirect, Purchased Energy)': [
            ['purchased_electricity', 'Purchased Electricity'],
            ['purchased_heat_steam_cooling', 'Purchased Heat, Steam, or Cooling']
        ],
        // Scope 3 (Other Indirect, Value Chain)
        'Scope 3 (Other Indirect, Value Chain)': [
            ['purchased_goods_services', 'Purchased Goods & Services'],
            ['capital_goods', 'Capital Goods'],
            ['fuel_energy_related', 'Fuel- and Energy-Related Activities'],
            ['upstream_transport', 'Upstream Transportation & Distribution'],
            ['waste_generated', 'Waste Generated in Operations'],
            ['business_travel', 'Business Travel'],
            ['employee_commuting', 'Employee Commuting'],
            ['upstream_leased_assets', 'Upstream Leased Assets'],
            ['downstream_transport', 'Downstream Transportation & Distribution'],
            ['processing_sold_products', 'Processing of Sold Products'],
            ['use_sold_products', 'Use of Sold Products'],
            ['end_of_life_sold_products', 'End-of-Life Treatment of Sold Products'],
            ['downstream_leased_assets', 'Downstream Leased Assets'],
            ['franchises', 'Franchises'],
            ['investments', 'Investments']
        ]
    };

    // Map categories to their scopes
    const categoryToScope = {
        // Scope 1
        'stationary_combustion': [1],
        'mobile_combustion': [1],
        'fugitive_emissions': [1],
        'process_emissions': [1],
        // Scope 2
        'purchased_electricity': [2],
        'purchased_heat_steam_cooling': [2],
        // Scope 3
        'purchased_goods_services': [3],
        'capital_goods': [3],
        'fuel_energy_related': [3],
        'upstream_transport': [3],
        'waste_generated': [3],
        'business_travel': [3],
        'employee_commuting': [3],
        'upstream_leased_assets': [3],
        'downstream_transport': [3],
        'processing_sold_products': [3],
        'use_sold_products': [3],
        'end_of_life_sold_products': [3],
        'downstream_leased_assets': [3],
        'franchises': [3],
        'investments': [3]
    };

    // Uncertainty type choices
    const uncertaintyTypeChoices = [
        [0, 'No uncertainty'],
        [1, 'Lognormal'],
        [2, 'Normal'],
        [3, 'Uniform'],
        [4, 'Triangular'],
        [5, 'Beta']
    ];

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            category: '',
            sub_category: '',
            applicable_scopes: [],
            emission_factor_value: '',
            unit: '',
            source: '',
            year: new Date().getFullYear(),
            uncertainty_type: 0,
            uncertainty_params: {}
        });
        setActiveStep(0);
        setFormErrors({});
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        
        // Clear error for this field when user starts typing
        if (formErrors[field]) {
            setFormErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    const handleCategoryChange = (category) => {
        const scopes = categoryToScope[category] || [];
        setFormData(prev => ({
            ...prev,
            category: category,
            applicable_scopes: scopes
        }));
    };

    const handleScopeChange = (scope) => {
        const currentScopes = formData.applicable_scopes;
        let newScopes;
        
        if (currentScopes.includes(scope)) {
            newScopes = currentScopes.filter(s => s !== scope);
        } else {
            newScopes = [...currentScopes, scope];
        }
        
        setFormData(prev => ({
            ...prev,
            applicable_scopes: newScopes
        }));
    };

    const validateCurrentStep = () => {
        const errors = {};
        
        switch (activeStep) {
            case 0: // Basic Information
                if (!formData.name.trim()) {
                    errors.name = 'Name is required';
                }
                if (!formData.description.trim()) {
                    errors.description = 'Description is required';
                }
                break;
                
            case 1: // Category & Scope
                if (!formData.category) {
                    errors.category = 'Category is required';
                }
                if (formData.applicable_scopes.length === 0) {
                    errors.applicable_scopes = 'At least one scope must be selected';
                }
                break;
                
            case 2: // Emission Values
                if (!formData.emission_factor_value) {
                    errors.emission_factor_value = 'Emission factor value is required';
                } else if (isNaN(formData.emission_factor_value) || parseFloat(formData.emission_factor_value) <= 0) {
                    errors.emission_factor_value = 'Must be a positive number';
                }
                if (!formData.unit.trim()) {
                    errors.unit = 'Unit is required';
                }
                break;
                
            case 3: // Additional Information
                if (!formData.source.trim()) {
                    errors.source = 'Source is required';
                }
                if (!formData.year || formData.year < 1900 || formData.year > new Date().getFullYear() + 5) {
                    errors.year = 'Please enter a valid year';
                }
                break;
        }
        
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleNext = () => {
        if (validateCurrentStep()) {
            setActiveStep((prevActiveStep) => prevActiveStep + 1);
        }
    };

    const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
    };

    const handleSubmit = async () => {
        if (!validateCurrentStep()) return;
        
        setLoading(true);
        
        try {
            const response = await fetch('/api/emission-factors/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            if (response.ok) {
                const newFactor = await response.json();
                onSuccess?.(newFactor);
                handleClose();
            } else {
                const errorData = await response.json();
                setFormErrors(errorData.errors || { general: 'Failed to create emission factor' });
            }
        } catch (error) {
            setFormErrors({ general: 'Network error: ' + error.message });
        }
        
        setLoading(false);
    };

    const renderStepContent = (step) => {
        switch (step) {
            case 0:
                return (
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Name"
                                value={formData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                error={!!formErrors.name}
                                helperText={formErrors.name}
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Description"
                                value={formData.description}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                                error={!!formErrors.description}
                                helperText={formErrors.description}
                                multiline
                                rows={3}
                                required
                            />
                        </Grid>
                    </Grid>
                );
                
            case 1:
                return (
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <FormControl fullWidth error={!!formErrors.category}>
                                <InputLabel>Category *</InputLabel>
                                <Select
                                    value={formData.category}
                                    onChange={(e) => handleCategoryChange(e.target.value)}
                                    label="Category *"
                                >
                                    {Object.entries(categoryChoices).map(([scopeGroup, categories]) => [
                                        <MenuItem key={scopeGroup} disabled sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                                            {scopeGroup}
                                        </MenuItem>,
                                        ...categories.map(([value, label]) => (
                                            <MenuItem key={value} value={value} sx={{ pl: 4 }}>
                                                {label}
                                            </MenuItem>
                                        ))
                                    ])}
                                </Select>
                                {formErrors.category && <Typography variant="caption" color="error">{formErrors.category}</Typography>}
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Sub-category (optional)"
                                value={formData.sub_category}
                                onChange={(e) => handleInputChange('sub_category', e.target.value)}
                                helperText="Specify a more detailed category if applicable"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" gutterBottom>
                                Applicable Scopes *
                            </Typography>
                            <FormGroup row>
                                {[1, 2, 3].map((scope) => (
                                    <FormControlLabel
                                        key={scope}
                                        control={
                                            <Checkbox
                                                checked={formData.applicable_scopes.includes(scope)}
                                                onChange={() => handleScopeChange(scope)}
                                            />
                                        }
                                        label={`Scope ${scope}`}
                                    />
                                ))}
                            </FormGroup>
                            {formErrors.applicable_scopes && (
                                <Typography variant="caption" color="error">
                                    {formErrors.applicable_scopes}
                                </Typography>
                            )}
                        </Grid>
                    </Grid>
                );
                
            case 2:
                return (
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Emission Factor Value"
                                type="number"
                                value={formData.emission_factor_value}
                                onChange={(e) => handleInputChange('emission_factor_value', e.target.value)}
                                error={!!formErrors.emission_factor_value}
                                helperText={formErrors.emission_factor_value || "kg CO2-eq per unit"}
                                required
                                inputProps={{ step: "any", min: "0" }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Unit"
                                value={formData.unit}
                                onChange={(e) => handleInputChange('unit', e.target.value)}
                                error={!!formErrors.unit}
                                helperText={formErrors.unit || "e.g., kg, L, kWh, km"}
                                required
                            />
                        </Grid>
                    </Grid>
                );
                
            case 3:
                return (
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Source"
                                value={formData.source}
                                onChange={(e) => handleInputChange('source', e.target.value)}
                                error={!!formErrors.source}
                                helperText={formErrors.source || "Data source or reference"}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Year"
                                type="number"
                                value={formData.year}
                                onChange={(e) => handleInputChange('year', parseInt(e.target.value))}
                                error={!!formErrors.year}
                                helperText={formErrors.year}
                                required
                                inputProps={{ min: "1900", max: new Date().getFullYear() + 5 }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Uncertainty Type</InputLabel>
                                <Select
                                    value={formData.uncertainty_type}
                                    onChange={(e) => handleInputChange('uncertainty_type', e.target.value)}
                                    label="Uncertainty Type"
                                >
                                    {uncertaintyTypeChoices.map(([value, label]) => (
                                        <MenuItem key={value} value={value}>
                                            {label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                );
                
            default:
                return null;
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>Add New Emission Factor</DialogTitle>
            <DialogContent>
                <Box sx={{ width: '100%', mt: 2 }}>
                    <Stepper activeStep={activeStep}>
                        {steps.map((label) => (
                            <Step key={label}>
                                <StepLabel>{label}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>
                    
                    <Box sx={{ mt: 3, mb: 2 }}>
                        {formErrors.general && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {formErrors.general}
                            </Alert>
                        )}
                        {renderStepContent(activeStep)}
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button
                    disabled={activeStep === 0}
                    onClick={handleBack}
                >
                    Back
                </Button>
                {activeStep === steps.length - 1 ? (
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? 'Creating...' : 'Create Emission Factor'}
                    </Button>
                ) : (
                    <Button
                        variant="contained"
                        onClick={handleNext}
                    >
                        Next
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default AddEmissionFactorDialog;
