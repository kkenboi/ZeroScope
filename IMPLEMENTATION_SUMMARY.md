# ZeroScope Emission Factor System - Complete Redesign

## Overview
Complete redesign of the emission factor system with focus on user simplicity while maintaining GHG Protocol accuracy. All backward compatibility removed for a clean, purpose-built solution.

## Core Design Principle
**Emissions = Activity Data × Emission Factor**
- All emission factors standardized to kgCO₂e
- Simple, accurate, interoperable across categories
- User-friendly entry with guided workflows

---

## Backend Implementation

### 1. Clean EmissionFactor Model (`backend/api/models.py`)
```python
class EmissionFactor(models.Model):
    # Core fields only - no legacy complexity
    factor_id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    description = models.TextField(blank=True, null=True)
    
    # The emission factor value (standardized to kgCO₂e)
    emission_factor = models.DecimalField(max_digits=15, decimal_places=6)
    unit = models.CharField(max_length=50)
    
    # Metadata
    source = models.CharField(max_length=255)
    year = models.IntegerField()
    
    # Entry workflow tracking
    entry_type = models.CharField(max_length=10, choices=ENTRY_TYPE_CHOICES, default='simple')
    guided_parameters = models.JSONField(blank=True, null=True)
```

**Key Features:**
- ✅ 23 GHG Protocol categories covering Scope 1, 2, and 3
- ✅ Automatic scope detection via `CATEGORY_SCOPES` mapping
- ✅ Category-specific unit validation via `CATEGORY_UNITS`
- ✅ Built-in validation methods
- ✅ Clean field names aligned with purpose

### 2. Simple, Focused Serializers (`backend/api/serializer.py`)
```python
class SimpleEntrySerializer(serializers.ModelSerializer):
    # Direct input for users who already have EF values
    
class GuidedEntrySerializer(serializers.ModelSerializer):
    # Step-by-step with category-specific parameters
    
class EmissionFactorDisplaySerializer(serializers.ModelSerializer):
    # Clean display with computed fields (scope, category_display)
```

**Validation Features:**
- ✅ Unit-category validation
- ✅ Required field enforcement
- ✅ Automatic kgCO₂e standardization
- ✅ Guided parameter validation

### 3. RESTful API Endpoints (`backend/api/views.py`)
```
GET    /api/emission-factors/          # List with pagination, filtering
POST   /api/emission-factors/simple-entry/   # Simple workflow
POST   /api/emission-factors/guided-entry/   # Guided workflow
GET    /api/categories/                # List all categories with metadata
GET    /api/categories/{key}/units/    # Get valid units for category
DELETE /api/emission-factors/delete-all/     # Admin function
```

---

## Frontend Implementation

### 1. Modern EmissionFactorEntry Component (`frontend/src/components/EmissionFactorEntry.jsx`)

**Features:**
- ✅ **Tabbed Interface**: Simple vs Guided entry modes
- ✅ **Smart Validation**: Real-time unit validation against categories
- ✅ **Guided Workflows**: Category-specific parameter collection
- ✅ **Visual Feedback**: Unit chips, scope indicators, helpful text
- ✅ **Error Handling**: Comprehensive validation and error messages

**Simple Entry Mode:**
- Direct input for users with existing EF values
- Category selection → Unit validation → Value entry
- Perfect for importing from established sources (IPCC, EPA)

**Guided Entry Mode:**
- Step-by-step workflow with category-specific guidance
- Additional parameters for transport, fuel, electricity categories
- Helps ensure correct parameter selection

### 2. Updated Data Display (`frontend/src/pages/Data.jsx`)
- ✅ Clean table with Scope indicators
- ✅ Entry type badges (Simple/Guided)
- ✅ Improved field names and formatting
- ✅ Integration with new component

---

## Categories Implemented

### **Scope 1 (Direct Emissions)**
| Category | Valid Units | Description |
|----------|-------------|-------------|
| `fuel_combustion` | kg, tonne, L, m³, MJ, GJ, TJ | Stationary combustion |
| `company_vehicles` | L, kg, km, vehicle-km | Mobile combustion |
| `refrigerants_fugitive` | kg, tonne | Fugitive emissions |
| `process_emissions` | kg, tonne, unit, batch | Process emissions |

### **Scope 2 (Energy Indirect)**
| Category | Valid Units | Description |
|----------|-------------|-------------|
| `electricity_consumption` | kWh, MWh, GWh | Purchased electricity |
| `purchased_steam_heat_cooling` | MJ, GJ, TJ, kWh, MWh | Purchased thermal energy |

### **Scope 3 (Other Indirect) - 15 Categories**
| Category | Valid Units | GHG Cat |
|----------|-------------|---------|
| `purchased_goods_materials` | kg, tonne, m³, unit, piece, $, €, £ | Cat 1 |
| `capital_goods` | $, €, £, unit, piece | Cat 2 |
| `fuel_energy_related` | kWh, MWh, L, kg, tonne, MJ, GJ | Cat 3 |
| `upstream_transport` | tonne-km, t-km, m³-km, $, €, £ | Cat 4 |
| `waste_generated` | kg, tonne, m³ | Cat 5 |
| `business_travel` | km, passenger-km, $, €, £ | Cat 6 |
| `employee_commuting` | km, passenger-km, $, €, £ | Cat 7 |
| `upstream_leased_assets` | $, €, £, m², unit | Cat 8 |
| `downstream_transport` | tonne-km, t-km, m³-km, $, €, £ | Cat 9 |
| `processing_sold_products` | kg, tonne, $, €, £ | Cat 10 |
| `use_sold_products` | kWh, MWh, MJ, GJ, unit, piece | Cat 11 |
| `end_of_life_sold_products` | kg, tonne, m³ | Cat 12 |
| `downstream_leased_assets` | $, €, £, m², unit | Cat 13 |
| `franchises` | $, €, £, unit | Cat 14 |
| `investments` | $, €, £ | Cat 15 |

**Additional Categories:**
- `water_supply_treatment` - Water-related emissions
- `spend_based_fallback` - For spend-based calculations when activity data unavailable

---

## Key Improvements

### ✅ **User Simplicity First**
- Clean, intuitive interface
- Guided workflows for complex categories
- Real-time validation and feedback
- Clear error messages and help text

### ✅ **GHG Protocol Alignment**
- Complete coverage of Scope 1, 2, 3 categories
- Proper unit validation per category
- Automatic scope detection
- Standardized kgCO₂e storage

### ✅ **Technical Excellence**
- No backward compatibility bloat
- Clean, purpose-built models
- RESTful API design
- Modern React components
- Comprehensive validation

### ✅ **Calculation Ready**
- All factors in consistent kgCO₂e units
- Interoperable across categories
- Ready for emissions calculation engine
- Formula: **Emissions = Activity Data × Emission Factor**

---

## Testing Guide

### 1. Test Simple Entry
1. Open Data page → "Add Emission Factor"
2. Select "Simple Entry"
3. Choose "Electricity Consumption" category
4. Verify units show: kWh, MWh, GWh
5. Enter EF value: 0.4085
6. Select unit: kWh
7. Add source: "Singapore Grid 2023"
8. Submit and verify success

### 2. Test Guided Entry
1. Select "Guided Entry"
2. Choose "Fuel Combustion"
3. Fill guided parameters:
   - Fuel Type: Natural Gas
   - Equipment: Boiler
4. Enter EF value and other fields
5. Submit and verify creation

### 3. Test Validation
- Try invalid unit for category → Should show error
- Try empty required fields → Should show validation
- Check real-time unit filtering works

### 4. Test API Directly
```bash
# Get categories
curl http://localhost:8000/api/categories/

# Get units for electricity
curl http://localhost:8000/api/categories/electricity_consumption/units/

# Create simple entry
curl -X POST http://localhost:8000/api/emission-factors/simple-entry/ \
  -H "Content-Type: application/json" \
  -d '{"name":"Singapore Grid","category":"electricity_consumption","emission_factor":0.4085,"unit":"kWh","source":"EMA 2023","year":2023}'
```

---

## Migration Status
✅ **Database Migration Applied** - All model changes implemented
✅ **Frontend Running** - React app compiled successfully
✅ **API Endpoints Ready** - All new endpoints operational

The system is now completely redesigned with focus on user simplicity while maintaining GHG Protocol accuracy!
