from django.core.management.base import BaseCommand
from api.utils.sefr_importer import SEFRExcelImporter

class Command(BaseCommand):
    help = 'Import SEFR emission factors from Excel file'
    
    def add_arguments(self, parser):
        parser.add_argument('excel_file', type=str, help='Path to SEFR Excel file')
        
    def handle(self, *args, **options):
        excel_file = options['excel_file']
        
        self.stdout.write(f'Starting SEFR import from: {excel_file}')
        
        importer = SEFRExcelImporter(excel_file)
        success = importer.import_data()
        
        # Print summary
        summary = importer.get_import_summary()
        
        self.stdout.write(f"\n=== IMPORT SUMMARY ===")
        self.stdout.write(f"Total rows processed: {summary['total_rows']}")
        self.stdout.write(f"Successfully imported: {summary['success_count']}")
        self.stdout.write(f"Skipped (duplicates): {summary['skipped_count']}")
        self.stdout.write(f"Errors: {summary['error_count']}")
        
        if summary['errors']:
            self.stdout.write(f"\n=== ERRORS ===")
            for error in summary['errors']:
                self.stdout.write(self.style.ERROR(error))
        
        if success and summary['error_count'] == 0:
            self.stdout.write(self.style.SUCCESS('Import completed successfully!'))
        elif success:
            self.stdout.write(self.style.WARNING('Import completed with some errors.'))
        else:
            self.stdout.write(self.style.ERROR('Import failed.'))
