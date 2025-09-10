"use client"

import { useState, useEffect } from "react"
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
  Alert,
  Chip,
  Grid,
  FormHelperText,
  Divider,
} from "@mui/material"

const EmissionFactorEntry = ({ open, onClose, onSuccess }) => {
  const [categories, setCategories] = useState([])
  const [validUnits, setValidUnits] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Form state for emission factor entry
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    description: "",
    emission_factor_value: "",
    unit: "",
    source: "",
    year: new Date().getFullYear(),
    // Brightway2 uncertainty analysis fields
    uncertainty_type: 0,
    uncertainty_params: {},
  })

  // Fetch categories on component mount
  useEffect(() => {
    if (open) {
      fetchCategories()
      resetForm()
    }
  }, [open])

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/emission-factors/categories/")
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      } else {
        console.error("Failed to fetch categories")
      }
    } catch (err) {
      console.error("Error fetching categories:", err)
      setError("Failed to load categories")
    }
  }

  const fetchValidUnits = async (category) => {
    try {
      // Get valid units from the category data we already have
      const selectedCategory = categories.find((cat) => cat.category === category)
      if (selectedCategory) {
        setValidUnits(selectedCategory.valid_units || [])
      } else {
        setValidUnits([])
      }
    } catch (err) {
      console.error("Error fetching units:", err)
      setValidUnits([])
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      description: "",
      emission_factor_value: "",
      unit: "",
      source: "",
      year: new Date().getFullYear(),
      uncertainty_type: 0,
      uncertainty_params: {},
    })
    setValidUnits([])
    setError("")
  }

  const handleCategoryChange = (category) => {
    setFormData((prev) => ({
      ...prev,
      category,
      unit: "",
    }))
    fetchValidUnits(category)
  }

  const renderUncertaintyParameters = () => {
    const { uncertainty_type } = formData

    if (uncertainty_type === 0) return null

    const uncertaintyTypes = {
      1: "Lognormal",
      2: "Normal",
      3: "Uniform",
      4: "Triangular",
      5: "Beta",
    }

    const getRequiredParams = (type) => {
      switch (type) {
        case 1:
          return ["sigma"] // Lognormal
        case 2:
          return ["sigma"] // Normal
        case 3:
          return ["min", "max"] // Uniform
        case 4:
          return ["min", "max"] // Triangular (mode optional)
        case 5:
          return ["min", "max", "alpha", "beta"] // Beta
        default:
          return []
      }
    }

    const requiredParams = getRequiredParams(uncertainty_type)

    return (
      <Box>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          {uncertaintyTypes[uncertainty_type]} Distribution Parameters
        </Typography>

        {/* Render parameters in pairs side by side */}
        {requiredParams.includes("sigma") && (
          <Box sx={{ mb: 3 }}>
            <TextField
              label="Sigma (Standard Deviation)"
              type="number"
              fullWidth
              value={formData.uncertainty_params.sigma || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  uncertainty_params: {
                    ...prev.uncertainty_params,
                    sigma: Number.parseFloat(e.target.value) || "",
                  },
                }))
              }
              helperText="Standard deviation for the distribution"
              size="small"
              sx={{
                "& .MuiFormHelperText-root": {
                  minHeight: "40px",
                  display: "flex",
                  alignItems: "center",
                },
              }}
            />
          </Box>
        )}

        {(requiredParams.includes("min") || requiredParams.includes("max")) && (
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            {requiredParams.includes("min") && (
              <Box sx={{ flex: 1 }}>
                <TextField
                  label="Minimum Value"
                  type="number"
                  fullWidth
                  value={formData.uncertainty_params.min || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      uncertainty_params: {
                        ...prev.uncertainty_params,
                        min: Number.parseFloat(e.target.value) || "",
                      },
                    }))
                  }
                  helperText="Minimum possible value"
                  size="small"
                  sx={{
                    "& .MuiFormHelperText-root": {
                      minHeight: "40px",
                      display: "flex",
                      alignItems: "center",
                    },
                  }}
                />
              </Box>
            )}

            {requiredParams.includes("max") && (
              <Box sx={{ flex: 1 }}>
                <TextField
                  label="Maximum Value"
                  type="number"
                  fullWidth
                  value={formData.uncertainty_params.max || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      uncertainty_params: {
                        ...prev.uncertainty_params,
                        max: Number.parseFloat(e.target.value) || "",
                      },
                    }))
                  }
                  helperText="Maximum possible value"
                  size="small"
                  sx={{
                    "& .MuiFormHelperText-root": {
                      minHeight: "40px",
                      display: "flex",
                      alignItems: "center",
                    },
                  }}
                />
              </Box>
            )}
          </Box>
        )}

        {(requiredParams.includes("alpha") || requiredParams.includes("beta")) && (
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            {requiredParams.includes("alpha") && (
              <Box sx={{ flex: 1 }}>
                <TextField
                  label="Alpha Parameter"
                  type="number"
                  fullWidth
                  value={formData.uncertainty_params.alpha || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      uncertainty_params: {
                        ...prev.uncertainty_params,
                        alpha: Number.parseFloat(e.target.value) || "",
                      },
                    }))
                  }
                  helperText="Alpha parameter for Beta distribution"
                  size="small"
                  sx={{
                    "& .MuiFormHelperText-root": {
                      minHeight: "40px",
                      display: "flex",
                      alignItems: "center",
                    },
                  }}
                />
              </Box>
            )}

            {requiredParams.includes("beta") && (
              <Box sx={{ flex: 1 }}>
                <TextField
                  label="Beta Parameter"
                  type="number"
                  fullWidth
                  value={formData.uncertainty_params.beta || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      uncertainty_params: {
                        ...prev.uncertainty_params,
                        beta: Number.parseFloat(e.target.value) || "",
                      },
                    }))
                  }
                  helperText="Beta parameter for Beta distribution"
                  size="small"
                  sx={{
                    "& .MuiFormHelperText-root": {
                      minHeight: "40px",
                      display: "flex",
                      alignItems: "center",
                    },
                  }}
                />
              </Box>
            )}
          </Box>
        )}

        {uncertainty_type === 4 && (
          <Box sx={{ mb: 3 }}>
            <TextField
              label="Mode (Optional)"
              type="number"
              fullWidth
              value={formData.uncertainty_params.mode || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  uncertainty_params: {
                    ...prev.uncertainty_params,
                    mode: Number.parseFloat(e.target.value) || "",
                  },
                }))
              }
              helperText="Most likely value for triangular distribution"
              size="small"
              sx={{
                "& .MuiFormHelperText-root": {
                  minHeight: "40px",
                  display: "flex",
                  alignItems: "center",
                },
              }}
            />
          </Box>
        )}
      </Box>
    )
  }

  const validateForm = () => {
    const { name, category, emission_factor_value, unit, source, year, uncertainty_type, uncertainty_params } = formData

    if (!name.trim()) return "Name is required"
    if (!category) return "Category is required"
    if (!emission_factor_value || isNaN(Number(emission_factor_value)) || Number(emission_factor_value) <= 0) {
      return "Emission factor must be a positive number"
    }
    if (!unit) return "Unit is required"
    if (!source.trim()) return "Source is required"
    if (!year || year < 1990 || year > new Date().getFullYear() + 5) {
      return "Year must be between 1990 and " + (new Date().getFullYear() + 5)
    }

    // Validate uncertainty parameters if uncertainty type is specified
    if (uncertainty_type > 0) {
      const requiredParams = {
        1: ["sigma"], // Lognormal
        2: ["sigma"], // Normal
        3: ["min", "max"], // Uniform
        4: ["min", "max"], // Triangular
        5: ["min", "max", "alpha", "beta"], // Beta
      }

      const required = requiredParams[uncertainty_type] || []
      for (const param of required) {
        if (!uncertainty_params[param] || uncertainty_params[param] === "") {
          return `${param.charAt(0).toUpperCase() + param.slice(1)} parameter is required for the selected uncertainty type`
        }
      }

      // Additional validations for specific uncertainty types
      if (uncertainty_type === 3 || uncertainty_type === 4) {
        // Uniform or Triangular
        if (uncertainty_params.min >= uncertainty_params.max) {
          return "Maximum value must be greater than minimum value"
        }
      }
    }

    return null
  }

  const handleSubmit = async () => {
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError("")

    try {
      // Use the standard emission factors endpoint
      const payload = { ...formData }

      const response = await fetch(`/api/emission-factors/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        onSuccess?.()
        handleClose()
      } else {
        const errorData = await response.json()
        setError(errorData.message || errorData.detail || "Error creating emission factor")
      }
    } catch (err) {
      setError("Network error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const renderForm = () => (
    <Box sx={{ mt: 2 }}>
      {/* Basic Information Section */}
      <Typography variant="h6" color="primary" sx={{ mb: 3 }}>
        Basic Information
      </Typography>

      {/* Name field - full width */}
      <Box sx={{ mb: 3 }}>
        <TextField
          label="Emission Factor Name *"
          fullWidth
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          helperText="Descriptive name for this emission factor"
          size="small"
          sx={{
            "& .MuiFormHelperText-root": {
              minHeight: "40px",
              display: "flex",
              alignItems: "center",
            },
          }}
        />
      </Box>

      {/* Category field - full width */}
      <Box sx={{ mb: 3 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Category *</InputLabel>
          <Select value={formData.category} onChange={(e) => handleCategoryChange(e.target.value)}>
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
          <FormHelperText sx={{ minHeight: "40px", display: "flex", alignItems: "center" }}>
            Choose the GHG Protocol category that best fits this emission source
          </FormHelperText>
        </FormControl>
      </Box>

      {/* Emission Factor Value and Unit - side by side */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Box sx={{ flex: 1 }}>
          <TextField
            label="Emission Factor Value *"
            type="number"
            fullWidth
            value={formData.emission_factor_value}
            onChange={(e) => setFormData((prev) => ({ ...prev, emission_factor_value: e.target.value }))}
            helperText="Will be automatically converted to kgCO₂e"
            inputProps={{ min: 0, step: "any" }}
            size="small"
            sx={{
              "& .MuiFormHelperText-root": {
                minHeight: "40px",
                display: "flex",
                alignItems: "center",
              },
            }}
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Unit *</InputLabel>
            <Select
              value={formData.unit}
              onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}
              disabled={!formData.category}
            >
              {validUnits.map((unit) => (
                <MenuItem key={unit} value={unit}>
                  {unit}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText sx={{ minHeight: "40px", display: "flex", alignItems: "center" }}>
              {validUnits.length === 0 && formData.category
                ? "Loading valid units..."
                : `Valid units for ${formData.category || "selected category"}`}
            </FormHelperText>
          </FormControl>
        </Box>
      </Box>

      {/* Source and Year - side by side */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Box sx={{ flex: 1 }}>
          <TextField
            label="Source *"
            fullWidth
            value={formData.source}
            onChange={(e) => setFormData((prev) => ({ ...prev, source: e.target.value }))}
            helperText="Data source or reference (e.g., IPCC, EPA, company study)"
            placeholder="e.g., IPCC 2019, EPA 2023, Internal Study"
            size="small"
            sx={{
              "& .MuiFormHelperText-root": {
                minHeight: "40px",
                display: "flex",
                alignItems: "center",
              },
            }}
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <TextField
            label="Year *"
            type="number"
            fullWidth
            value={formData.year}
            onChange={(e) => setFormData((prev) => ({ ...prev, year: Number.parseInt(e.target.value) || "" }))}
            helperText="Year of publication or applicability"
            inputProps={{ min: 1990, max: new Date().getFullYear() + 5 }}
            size="small"
            sx={{
              "& .MuiFormHelperText-root": {
                minHeight: "40px",
                display: "flex",
                alignItems: "center",
              },
            }}
          />
        </Box>
      </Box>

      {/* Description - full width */}
      <Box sx={{ mb: 4 }}>
        <TextField
          label="Description/Notes"
          multiline
          rows={3}
          fullWidth
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          helperText="Additional context, assumptions, or notes about this emission factor"
          size="small"
          sx={{
            "& .MuiFormHelperText-root": {
              minHeight: "40px",
              display: "flex",
              alignItems: "center",
            },
          }}
        />
      </Box>

      {/* Uncertainty Analysis Section */}
      <Divider sx={{ my: 3 }} />
      
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <Typography variant="h6" color="primary">
            Uncertainty Analysis
          </Typography>
          <Chip label="Brightway2" size="small" variant="outlined" color="primary" />
        </Box>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Configure statistical distribution for uncertainty and sensitivity analysis
        </Typography>
      </Box>

      {/* Uncertainty Type - full width */}
      <Box sx={{ mb: 3 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Uncertainty Type</InputLabel>
          <Select
            value={formData.uncertainty_type}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                uncertainty_type: Number.parseInt(e.target.value),
                uncertainty_params: {}, // Reset params when type changes
              }))
            }
          >
            <MenuItem value={0}>No uncertainty</MenuItem>
            <MenuItem value={1}>Lognormal</MenuItem>
            <MenuItem value={2}>Normal</MenuItem>
            <MenuItem value={3}>Uniform</MenuItem>
            <MenuItem value={4}>Triangular</MenuItem>
            <MenuItem value={5}>Beta</MenuItem>
          </Select>
          <FormHelperText sx={{ minHeight: "40px", display: "flex", alignItems: "center" }}>
            Select statistical distribution for uncertainty analysis
          </FormHelperText>
        </FormControl>
      </Box>

      {/* Uncertainty Parameters */}
      {formData.uncertainty_type > 0 && (
        <Box sx={{ mb: 3 }}>
          {renderUncertaintyParameters()}
        </Box>
      )}

      {/* Display valid units as chips */}
      {validUnits.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="caption" color="textSecondary" gutterBottom display="block">
            Valid units for this category:
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
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
  )

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md">
      <DialogTitle>
        <Typography variant="h6">Add Emission Factor</Typography>
        <Typography variant="body2" color="textSecondary">
          Add a new emission factor for GHG calculations with uncertainty analysis support
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Create emission factors with support for Brightway2 uncertainty analysis. All factors are standardized to
            kgCO₂e for consistent calculations.
          </Typography>
        </Alert>

        {renderForm()}

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
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? "Adding..." : "Add Emission Factor"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default EmissionFactorEntry
