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
        'Building Equipment': 'purchased_goods_materials',  # Map to Scope 3 Cat 1
        'Building Materials': 'purchased_goods_materials',   # Map to Scope 3 Cat 1
        'Fuel': 'fuel_combustion',                          # Map to Scope 1
        'Greenhouse Gases': 'refrigerants_fugitive',        # Map to Scope 1
        'Land Transport': 'business_travel',                 # Map to Scope 3 Cat 6
        'Purchased Energy': 'electricity_consumption',       # Map to Scope 2
        'Waste': 'waste_generated',                         # Map to Scope 3 Cat 5
        'Water': 'water_supply_treatment',                  # Map to Scope 3
        'Other': 'purchased_goods_materials',               # Default to Scope 3 Cat 1
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
            clean_category = self.CATEGORY_MAPPING.get(sefr_category, 'purchased_goods_materials')
            
            # Check for existing factor (avoid duplicates)
            existing = EmissionFactor.objects.filter(
                name=row['Activity'],
                category=clean_category,
                source='SEFR'
            ).first()
            
            if existing:
                self.skipped_count += 1
                return f"Skipped duplicate: {row['Activity']}"
            
            # Validate emission factor value
            try:
                ef_value = float(row['EF (kg CO2-eq per unit)'])
                if ef_value <= 0:
                    raise ValueError("Emission factor must be positive")
            except (ValueError, TypeError) as e:
                raise ValueError(f"Invalid emission factor value: {row['EF (kg CO2-eq per unit)']} - {str(e)}")
            
            # Validate unit against category
            unit = str(row['Unit']).strip()
            valid_units = EmissionFactor.get_valid_units_for_category(clean_category)
            if valid_units and unit not in valid_units:
                # Log warning but still import (SEFR might have legacy units)
                print(f"Warning: Unit '{unit}' not in valid units for category '{clean_category}': {valid_units}")
            
            # Create new emission factor with clean model structure
            factor_data = {
                'name': str(row['Activity']).strip(),
                'category': clean_category,
                'description': f"Imported from SEFR. Original category: {sefr_category}. {row.get('Description', '')}" if row.get('Description') else f"Imported from SEFR. Original category: {sefr_category}",
                'emission_factor_value': Decimal(str(ef_value)).quantize(Decimal('0.000001')),
                'unit': unit,
                'source': 'SEFR',
                'year': int(row['Year']) if pd.notna(row.get('Year')) and str(row.get('Year')).isdigit() else 2023,  # Default to 2023 if no year
                'entry_type': 'simple',  # SEFR imports are simple entries
            }
            
            # Create and save the factor
            factor = EmissionFactor(**factor_data)
            factor.full_clean()  # This will run our model validation
            factor.save()
            
            self.success_count += 1
            self.imported_factors.append(row['Activity'])
            return f"Successfully imported: {row['Activity']} → {clean_category}"
            
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