import pandas as pd
from decimal import Decimal, ROUND_DOWN
from django.core.exceptions import ValidationError
from api.models import EmissionFactor
from decimal import Decimal


class SEFRExcelImporter:
    """
    Utility class to import SEFR emission factors from Excel
    Updated to work with the new clean EmissionFactor model
    """
    
    EXCEL_COLUMN_MAPPING = {
        'Category': 'category',
        'Sub-Category': 'sub_category', 
        'Activity': 'name',
        'EF (kg CO2-eq per unit)': 'emission_factor_value',
        'Unit': 'unit',
        'Year': 'year',
        'Data Source': 'source',
        'Description': 'description',
    }
    
    # Map SEFR categories to our new clean categories
    CATEGORY_MAPPING = {
        'Building Equipment': 'purchased_goods_services',  # Map to Scope 3 Cat 1
        'Building Materials': 'purchased_goods_services',   # Map to Scope 3 Cat 1
        'Fuel': 'stationary_combustion',                    # Map to Scope 1 - Stationary Combustion
        'Greenhouse Gases': 'fugitive_emissions',           # Map to Scope 1 - Fugitive Emissions
        'Land Transport': 'mobile_combustion',              # Map to Scope 1 - Mobile Combustion (can also be business travel)
        'Purchased Energy': 'purchased_electricity',        # Map to Scope 2 - Purchased Electricity
        'Waste': 'waste_generated',                         # Map to Scope 3 Cat 5
        'Water': 'waste_generated',                         # Map to Scope 3 Cat 5 (water treatment often falls under waste)
        'Other': 'purchased_goods_services',               # Default to Scope 3 Cat 1
    }
    
    # Map categories to applicable scopes (scope_3_category is now redundant)
    CATEGORY_TO_SCOPE_MAPPING = {
        'Building Equipment': {'applicable_scopes': [3]},
        'Building Materials': {'applicable_scopes': [3]},
        'Fuel': {'applicable_scopes': [1]},
        'Greenhouse Gases': {'applicable_scopes': [1]},
        'Land Transport': {'applicable_scopes': [1, 3]},  # Can be Scope 1 (company vehicles) or Scope 3 (business travel)
        'Purchased Energy': {'applicable_scopes': [2]},
        'Waste': {'applicable_scopes': [3]},
        'Water': {'applicable_scopes': [3]},
        'Other': {'applicable_scopes': [1, 2, 3]},  # Could apply to any scope
    }
    
    def __init__(self, excel_file_path):
        self.excel_file_path = excel_file_path
        self.df = None
        self.errors = []
        self.success_count = 0
        self.skipped_count = 0
        self.imported_factors = []
        
    def load_excel(self):
        """Load Excel file into DataFrame"""
        try:
            self.df = pd.read_excel(self.excel_file_path)
            print(f"Loaded Excel with {len(self.df)} rows and columns: {list(self.df.columns)}")
            return True
        except Exception as e:
            error_msg = f"Failed to load Excel file: {str(e)}"
            print(error_msg)
            self.errors.append(error_msg)
            return False
    
    def validate_columns(self):
        """Check if required columns exist"""
        required_columns = ['Category', 'Activity', 'EF (kg CO2-eq per unit)', 'Unit']
        missing_columns = [col for col in required_columns if col not in self.df.columns]
        
        if missing_columns:
            error_msg = f"Missing required columns: {missing_columns}"
            print(error_msg)
            self.errors.append(error_msg)
            return False
        return True
    
    def clean_data(self):
        """Clean and prepare data for import"""
        # Remove rows with NaN in critical columns
        original_count = len(self.df)
        self.df = self.df.dropna(subset=['Category', 'Activity', 'EF (kg CO2-eq per unit)', 'Unit'])
        print(f"Removed {original_count - len(self.df)} rows with missing critical data")
        
        # Clean whitespace
        for col in self.df.columns:
            if self.df[col].dtype == 'object':
                self.df[col] = self.df[col].astype(str).str.strip()
        
        # Replace empty strings with None for optional fields
        self.df = self.df.replace('', None)
        self.df = self.df.replace('nan', None)
        
    def process_row(self, row):
        """Process a single row from the Excel file using new clean model"""
        try:
            # Map SEFR category to our clean categories
            sefr_category = row['Category']
            sefr_sub_category = row.get('Sub-Category', None)
            clean_category = self.CATEGORY_MAPPING.get(sefr_category, 'purchased_goods_services')
            
            # Get scope mapping
            scope_mapping = self.CATEGORY_TO_SCOPE_MAPPING.get(sefr_category, {'applicable_scopes': [3]})
            applicable_scopes = scope_mapping['applicable_scopes']

            # Determine year early so we can include it in duplicate detection
            raw_year = row.get('Year')
            if pd.notna(raw_year) and str(raw_year).isdigit():
                year_value = int(raw_year)
            else:
                year_value = 2023  # default
            
            # Check for existing factor (avoid duplicates) – now includes year so different years are allowed
            existing = EmissionFactor.objects.filter(
                name=row['Activity'],
                category=clean_category,
                source='SEFR',
                year=year_value
            ).first()
            
            if existing:
                self.skipped_count += 1
                return f"Skipped duplicate (same year {year_value}): {row['Activity']}"
            
            # Validate emission factor value
            try:
                ef_value = float(row['EF (kg CO2-eq per unit)'])
                if ef_value <= 0:
                    raise ValueError("Emission factor must be positive")
            except (ValueError, TypeError) as e:
                raise ValueError(f"Invalid emission factor value: {row['EF (kg CO2-eq per unit)']} - {str(e)}")
            
            # Unit - no validation, allow any unit
            unit = str(row['Unit']).strip()
            
            # Create new emission factor with clean model structure
            # Extract original description only (no injected prefix)
            raw_desc = row.get('Description')
            if raw_desc is not None:
                desc_clean = str(raw_desc).strip()
                if desc_clean.lower() in ('', 'nan', 'none'):
                    desc_clean = None
            else:
                desc_clean = None
            factor_data = {
                'name': str(row['Activity']).strip(),
                'category': clean_category,
                'description': desc_clean,
                'emission_factor_value': Decimal(str(ef_value)).quantize(Decimal('0.000001')),
                'unit': unit,
                'source': 'SEFR',
                'year': year_value,
                'imported_category': sefr_category,
                'imported_sub_category': sefr_sub_category,
                'applicable_scopes': applicable_scopes,
            }
            
            # Create and save the factor
            factor = EmissionFactor(**factor_data)
            factor.full_clean()  # This will run our model validation
            factor.save()
            
            self.success_count += 1
            self.imported_factors.append(row['Activity'])
            return f"Successfully imported: {row['Activity']} → {clean_category} (Scopes {applicable_scopes})"
            
        except Exception as e:
            error_msg = f"Failed to import '{row.get('Activity', 'Unknown')}': {str(e)}"
            print(error_msg)
            self.errors.append(error_msg)
            return error_msg
    
    def import_data(self):
        """Main import process"""
        print(f"Starting SEFR import from: {self.excel_file_path}")
        
        if not self.load_excel():
            return False
            
        if not self.validate_columns():
            return False
            
        self.clean_data()
        print(f"Processing {len(self.df)} rows...")
        
        # Process each row
        for index, row in self.df.iterrows():
            try:
                result = self.process_row(row)
                if index % 10 == 0:  # Progress indicator every 10 rows
                    print(f"Processed {index + 1}/{len(self.df)} rows...")
            except Exception as e:
                error_msg = f"Row {index + 1}: {str(e)}"
                print(error_msg)
                self.errors.append(error_msg)
        
        print(f"Import completed: {self.success_count} success, {self.skipped_count} skipped, {len(self.errors)} errors")
        return True
    
    def get_import_summary(self):
        """Return summary of import results"""
        return {
            'total_rows': len(self.df) if self.df is not None else 0,
            'success_count': self.success_count,
            'skipped_count': self.skipped_count,
            'error_count': len(self.errors),
            'errors': self.errors[:10],  # Limit errors to first 10 to avoid overwhelming
            'imported_factors': self.imported_factors[:20],  # Limit to first 20 for display
        }