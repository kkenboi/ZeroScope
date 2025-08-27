import pandas as pd
from decimal import Decimal
from django.core.exceptions import ValidationError
from api.models import EmissionFactor

class SEFRExcelImporter:
    """
    Utility class to import SEFR emission factors from Excel
    """
    
    EXCEL_COLUMN_MAPPING = {
        'Category': 'category',
        'Sub-Category': 'sub_category', 
        'Activity': 'name',
        'EF (kg CO2-eq per unit)': 'emission_factor_co2e',
        'Unit': 'base_unit',
        'Year': 'year',
        'Data Source': 'source',
        'Description': 'description',
        'GHG Emissions Standard Applied': 'ghg_standard',
        'IPCC Version': 'ipcc_version',
        'Boundary and Exclusions': 'boundary_exclusions'
    }
    
    CATEGORY_MAPPING = {
        'Building Equipment': 'building_equipment',
        'Building Materials': 'building_materials', 
        'Fuel': 'fuel',
        'Greenhouse Gases': 'greenhouse_gases',
        'Land Transport': 'land_transport',
        'Purchased Energy': 'purchased_energy',
        'Waste': 'waste',
        'Water': 'water'
    }
    
    def __init__(self, excel_file_path):
        self.excel_file_path = excel_file_path
        self.df = None
        self.errors = []
        self.success_count = 0
        self.skipped_count = 0
        self.imported_factors = []  # Add this line
        
    def load_excel(self):
        """Load Excel file into DataFrame"""
        try:
            self.df = pd.read_excel(self.excel_file_path)
            return True
        except Exception as e:
            self.errors.append(f"Failed to load Excel file: {str(e)}")
            return False
    
    def validate_columns(self):
        """Check if required columns exist"""
        required_columns = ['Category', 'Activity', 'EF (kg CO2-eq per unit)', 'Unit']
        missing_columns = [col for col in required_columns if col not in self.df.columns]
        
        if missing_columns:
            self.errors.append(f"Missing required columns: {missing_columns}")
            return False
        return True
    
    def clean_data(self):
        """Clean and prepare data for import"""
        # Remove rows with NaN in critical columns
        self.df = self.df.dropna(subset=['Category', 'Activity', 'EF (kg CO2-eq per unit)', 'Unit'])
        
        # Clean whitespace
        for col in self.df.columns:
            if self.df[col].dtype == 'object':
                self.df[col] = self.df[col].astype(str).str.strip()
        
        # Replace empty strings with None for optional fields
        self.df = self.df.replace('', None)
        self.df = self.df.replace('nan', None)
        
    def process_row(self, row):
        """Process a single row from the Excel file"""
        try:
            # Map category to internal format
            category = self.CATEGORY_MAPPING.get(row['Category'], 'other')
            
            # Check for existing factor (avoid duplicates)
            existing = EmissionFactor.objects.filter(
                name=row['Activity'],
                category=category,
                sub_category=row.get('Sub-Category'),
                source='sefr'
            ).first()
            
            if existing:
                self.skipped_count += 1
                return f"Skipped duplicate: {row['Activity']}"
            
            # Create new emission factor
            factor_data = {
                'name': row['Activity'],
                'category': category,
                'sub_category': row.get('Sub-Category'),
                'description': row.get('Description'),
                'emission_factor_co2e': Decimal(str(row['EF (kg CO2-eq per unit)'])),
                'base_unit': row['Unit'],
                'source': 'sefr',
                'year': int(row['Year']) if pd.notna(row.get('Year')) else None,
                'ghg_standard': row.get('GHG Emissions Standard Applied'),
                'ipcc_version': row.get('IPCC Version'),
                'boundary_exclusions': row.get('Boundary and Exclusions'),
                'is_sefr_factor': True,
                'is_editable': False  # SEFR factors are not editable
            }
            
            # Create and save the factor
            factor = EmissionFactor(**factor_data)
            factor.save()
            
            self.success_count += 1
            self.imported_factors.append(row['Activity'])  # Track imported factor name
            return f"Successfully imported: {row['Activity']}"
            
        except Exception as e:
            error_msg = f"Failed to import row {row.get('Activity', 'Unknown')}: {str(e)}"
            self.errors.append(error_msg)
            return error_msg
    
    def import_data(self):
        """Main import process"""
        if not self.load_excel():
            return False
            
        if not self.validate_columns():
            return False
            
        self.clean_data()
        
        # Process each row
        for index, row in self.df.iterrows():
            try:
                result = self.process_row(row)
                print(f"Row {index + 1}: {result}")
            except Exception as e:
                self.errors.append(f"Row {index + 1}: {str(e)}")
        
        return True
    
    def get_import_summary(self):
        """Return summary of import results"""
        return {
            'total_rows': len(self.df) if self.df is not None else 0,
            'success_count': self.success_count,
            'skipped_count': self.skipped_count,
            'error_count': len(self.errors),
            'errors': self.errors,
            'imported_factors': self.imported_factors  # Add this line
        }