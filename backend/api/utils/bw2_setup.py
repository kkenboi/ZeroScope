import bw2data as bd
import bw2io as bi
import bw2calc as bc

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import time

class BW2LCA:
    
    PROJECT_NAME = "ZeroScope_LCA"  # Fixed project name for all operations
    
    def __init__(self):
        # Set the project to the fixed ZeroScope project
        bd.projects.set_current(self.PROJECT_NAME)
    
    def reset_project(self):
        """
        Reset the Brightway2 project by deleting all databases
        WARNING: This will delete all LCA data in the project
        """
        try:
            bd.projects.set_current(self.PROJECT_NAME)
            db_names = list(bd.databases.keys())
            
            for db_name in db_names:
                try:
                    del bd.databases[db_name]
                except Exception as e:
                    print(f"Failed to delete {db_name}: {str(e)}")
            
            return {
                'success': True,
                'message': f'Successfully reset project. Deleted {len(db_names)} databases.',
                'deleted_databases': db_names
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def print_versions(self):
        """Print versions of Brightway2 packages"""
        versions = {
            'bw2data': bd.__version__,
            'bw2io': bi.__version__,
            'bw2calc': bc.__version__
        }
        print("bw2data version", bd.__version__)
        print("bw2io version", bi.__version__)
        print("bw2calc version", bc.__version__)
        return versions
    
    def list_databases(self):
        """List all databases in the current project"""
        bd.projects.set_current(self.PROJECT_NAME)
        databases = []
        for db_name in bd.databases:
            db = bd.Database(db_name)
            databases.append({
                'name': db_name,
                'num_activities': len(db)
            })
        return databases
    
    def import_ecoinvent(self, version, system_model, username, password, progress_callback=None):
        """
        Import ecoinvent database with progress tracking
        
        Args:
            version: ecoinvent version (e.g., '3.9.1', '3.10')
            system_model: 'cutoff', 'apos', 'consequential', or 'EN15804'
            username: ecoinvent username
            password: ecoinvent password
            progress_callback: function to call with progress updates
        """
        bd.projects.set_current(self.PROJECT_NAME)
        db_name = f'ecoinvent-{version}-{system_model}'
        
        try:
            # Check if database already exists and clean it up if partially imported
            if db_name in bd.databases:
                if progress_callback:
                    progress_callback({
                        'status': 'warning',
                        'message': f'Database {db_name} already exists. Deleting and re-importing...',
                        'progress': 5
                    })
                # Delete the existing database to avoid conflicts
                try:
                    del bd.databases[db_name]
                except Exception as delete_error:
                    if progress_callback:
                        progress_callback({
                            'status': 'error',
                            'message': f'Failed to delete existing database: {str(delete_error)}',
                            'progress': 0
                        })
                    return {
                        'success': False,
                        'error': f'Database {db_name} exists and could not be deleted: {str(delete_error)}. Please delete it manually first.'
                    }
            
            if progress_callback:
                progress_callback({
                    'status': 'downloading',
                    'message': 'Downloading ecoinvent data...',
                    'progress': 10
                })
            
            # Import ecoinvent - this can take several minutes
            try:
                bi.import_ecoinvent_release(
                    version=version,
                    system_model=system_model,
                    username=username,
                    password=password
                )
            except Exception as import_error:
                error_msg = str(import_error)
                
                # Handle UNIQUE constraint error specifically
                if 'UNIQUE constraint failed' in error_msg or 'activitydataset' in error_msg.lower():
                    # Try to clean up and provide helpful error message
                    if db_name in bd.databases:
                        try:
                            del bd.databases[db_name]
                        except:
                            pass
                    
                    if progress_callback:
                        progress_callback({
                            'status': 'error',
                            'message': 'Database corruption detected. Please try again or reset the Brightway2 project.',
                            'progress': 0
                        })
                    
                    return {
                        'success': False,
                        'error': 'Import failed due to database conflict. This can happen if a previous import was interrupted. Try deleting all ecoinvent databases and importing again, or reset the Brightway2 project data.'
                    }
                
                # Re-raise other errors
                raise import_error
            
            if progress_callback:
                progress_callback({
                    'status': 'processing',
                    'message': 'Processing and writing database...',
                    'progress': 80
                })
            
            # Give it a moment to finish writing
            time.sleep(2)
            
            if progress_callback:
                progress_callback({
                    'status': 'complete',
                    'message': f'Successfully imported {db_name}',
                    'progress': 100
                })
            
            return {
                'success': True,
                'database_name': db_name,
                'num_activities': len(bd.Database(db_name)) if db_name in bd.databases else 0
            }
            
        except Exception as e:
            error_msg = str(e)
            if progress_callback:
                progress_callback({
                    'status': 'error',
                    'message': f'Import failed: {error_msg}',
                    'progress': 0
                })
            return {
                'success': False,
                'error': error_msg
            }
    
    def delete_database(self, db_name):
        """Delete a database"""
        bd.projects.set_current(self.PROJECT_NAME)
        try:
            if db_name not in bd.databases:
                return {
                    'success': False,
                    'error': f'Database {db_name} does not exist'
                }
            
            del bd.databases[db_name]
            return {
                'success': True,
                'message': f'Successfully deleted {db_name}'
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_activities(self, db_name, search=None, limit=100, offset=0):
        """
        Get activities from a database with pagination
        
        Args:
            db_name: name of the database
            search: optional search term
            limit: max number of results
            offset: offset for pagination
        """
        bd.projects.set_current(self.PROJECT_NAME)
        try:
            if db_name not in bd.databases:
                return {
                    'success': False,
                    'error': f'Database {db_name} does not exist'
                }
            
            db = bd.Database(db_name)
            activities = []
            
            # Get all activities or filter by search
            if search:
                search_lower = search.lower()
                filtered_acts = [act for act in db if search_lower in act['name'].lower()]
            else:
                filtered_acts = list(db)
            
            total_count = len(filtered_acts)
            
            # Apply pagination
            paginated_acts = filtered_acts[offset:offset + limit]
            
            for act in paginated_acts:
                activities.append({
                    'code': act['code'],
                    'name': act['name'],
                    'location': act.get('location', 'Unknown'),
                    'unit': act.get('unit', 'Unknown'),
                    'database': act['database'],
                    'num_exchanges': len(list(act.exchanges()))
                })
            
            return {
                'success': True,
                'activities': activities,
                'total_count': total_count,
                'limit': limit,
                'offset': offset
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_exchanges(self, db_name, activity_code):
        """
        Get exchanges for a specific activity
        
        Args:
            db_name: name of the database
            activity_code: code of the activity
        """
        bd.projects.set_current(self.PROJECT_NAME)
        try:
            if db_name not in bd.databases:
                return {
                    'success': False,
                    'error': f'Database {db_name} does not exist'
                }
            
            db = bd.Database(db_name)
            activity = db.get(activity_code)
            
            if not activity:
                return {
                    'success': False,
                    'error': f'Activity {activity_code} not found'
                }
            
            exchanges = []
            for exc in activity.exchanges():
                exchanges.append({
                    'input': exc.input['name'],
                    'amount': float(exc['amount']),
                    'unit': exc.input.get('unit', 'Unknown'),
                    'type': exc['type'],
                    'input_database': exc.input['database'],
                    'input_code': exc.input['code']
                })
            
            return {
                'success': True,
                'activity': {
                    'code': activity['code'],
                    'name': activity['name'],
                    'location': activity.get('location', 'Unknown'),
                    'unit': activity.get('unit', 'Unknown')
                },
                'exchanges': exchanges
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def search_activities_for_inputs(self, search_term, limit=50):
        """
        Search across all databases for activities to use as inputs
        
        Args:
            search_term: search string
            limit: maximum number of results to return
        """
        bd.projects.set_current(self.PROJECT_NAME)
        try:
            results = []
            search_lower = search_term.lower()
            
            # Check if there are any databases
            if not bd.databases:
                return {
                    'success': True,
                    'activities': [],
                    'total_found': 0,
                    'message': 'No databases found. Please import a database first.'
                }
            
            for db_name in bd.databases:
                try:
                    db = bd.Database(db_name)
                    for act in db:
                        try:
                            if search_lower in act['name'].lower():
                                results.append({
                                    'code': act['code'],
                                    'name': act['name'],
                                    'location': act.get('location', 'Unknown'),
                                    'unit': act.get('unit', 'Unknown'),
                                    'database': act['database']
                                })
                                
                                if len(results) >= limit:
                                    break
                        except Exception:
                            # Skip activities that cause errors
                            continue
                    if len(results) >= limit:
                        break
                except Exception:
                    # Skip databases that cause errors
                    continue
            
            return {
                'success': True,
                'activities': results,
                'total_found': len(results)
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_custom_database(self, db_name):
        """
        Create a new custom database for user-defined products
        
        Args:
            db_name: name of the new database
        """
        bd.projects.set_current(self.PROJECT_NAME)
        try:
            if db_name in bd.databases:
                return {
                    'success': False,
                    'error': f'Database {db_name} already exists'
                }
            
            # Create new database
            db = bd.Database(db_name)
            db.write({})  # Write empty database
            
            return {
                'success': True,
                'message': f'Successfully created database {db_name}'
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_custom_product(self, product_data):
        """
        Create a custom LCA product with inputs and outputs
        
        Args:
            product_data: dict containing:
                - name: product name
                - database: target database name (will be created if doesn't exist)
                - location: location (optional, default 'GLO')
                - unit: unit (optional, default 'kilogram')
                - description: description (optional)
                - inputs: list of dicts with:
                    - database: input database
                    - code: input activity code
                    - amount: amount
                    - type: exchange type (default 'technosphere')
                - outputs: list of dicts with:
                    - name: output name (for production, use same as product name)
                    - amount: amount
                    - type: exchange type (default 'production')
                    - unit: unit (optional, defaults to product unit)
        """
        bd.projects.set_current(self.PROJECT_NAME)
        try:
            # Extract data
            name = product_data.get('name')
            db_name = product_data.get('database', 'custom_products')
            location = product_data.get('location', 'GLO')
            unit = product_data.get('unit', 'kilogram')
            description = product_data.get('description', '')
            inputs = product_data.get('inputs', [])
            outputs = product_data.get('outputs', [])
            
            if not name:
                return {
                    'success': False,
                    'error': 'Product name is required'
                }
            
            # Create database if it doesn't exist
            if db_name not in bd.databases:
                db = bd.Database(db_name)
                db.write({})
            else:
                db = bd.Database(db_name)
            
            # Generate unique code for the activity
            import uuid
            code = str(uuid.uuid4())
            
            # Create the activity
            new_activity = db.new_activity(code)
            new_activity['name'] = name
            new_activity['location'] = location
            new_activity['unit'] = unit
            if description:
                new_activity['comment'] = description
            
            new_activity.save()
            
            # Add production exchange (output)
            # If no outputs specified, create default production exchange
            if not outputs:
                outputs = [{
                    'name': name,
                    'amount': 1.0,
                    'type': 'production',
                    'unit': unit
                }]
            
            for output in outputs:
                new_activity.new_exchange(
                    input=new_activity.key,
                    amount=output.get('amount', 1.0),
                    type=output.get('type', 'production'),
                    unit=output.get('unit', unit)
                ).save()
            
            # Add input exchanges
            for input_data in inputs:
                input_db_name = input_data.get('database')
                input_code = input_data.get('code')
                amount = input_data.get('amount', 1.0)
                exchange_type = input_data.get('type', 'technosphere')
                
                if not input_db_name or not input_code:
                    continue
                
                # Get the input activity
                if input_db_name not in bd.databases:
                    continue
                
                input_db = bd.Database(input_db_name)
                input_activity = input_db.get(input_code)
                
                if not input_activity:
                    continue
                
                # Create exchange
                new_activity.new_exchange(
                    input=input_activity.key,
                    amount=amount,
                    type=exchange_type,
                    unit=input_activity.get('unit', 'Unknown')
                ).save()
            
            return {
                'success': True,
                'message': f'Successfully created product: {name}',
                'product': {
                    'code': code,
                    'name': name,
                    'database': db_name,
                    'location': location,
                    'unit': unit,
                    'num_inputs': len(inputs),
                    'num_outputs': len(outputs)
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def verify_custom_product(self, db_name, activity_code):
        """
        Verify a custom product and return its details
        
        Args:
            db_name: database name
            activity_code: activity code
        """
        bd.projects.set_current(self.PROJECT_NAME)
        try:
            if db_name not in bd.databases:
                return {
                    'success': False,
                    'error': f'Database {db_name} does not exist'
                }
            
            db = bd.Database(db_name)
            activity = db.get(activity_code)
            
            if not activity:
                return {
                    'success': False,
                    'error': f'Activity {activity_code} not found'
                }
            
            # Get all exchanges
            inputs = []
            outputs = []
            
            for exc in activity.exchanges():
                exchange_data = {
                    'input_name': exc.input['name'],
                    'amount': float(exc['amount']),
                    'unit': exc.input.get('unit', 'Unknown'),
                    'type': exc['type'],
                    'database': exc.input['database']
                }
                
                if exc['type'] == 'production':
                    outputs.append(exchange_data)
                else:
                    inputs.append(exchange_data)
            
            return {
                'success': True,
                'product': {
                    'code': activity['code'],
                    'name': activity['name'],
                    'location': activity.get('location', 'Unknown'),
                    'unit': activity.get('unit', 'Unknown'),
                    'database': activity['database'],
                    'description': activity.get('comment', ''),
                    'inputs': inputs,
                    'outputs': outputs
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_custom_product(self, db_name, activity_code):
        """
        Delete a custom product from a database
        
        Args:
            db_name: database name
            activity_code: activity code to delete
        """
        bd.projects.set_current(self.PROJECT_NAME)
        try:
            if db_name not in bd.databases:
                return {
                    'success': False,
                    'error': f'Database {db_name} does not exist'
                }
            
            db = bd.Database(db_name)
            activity = db.get(activity_code)
            
            if not activity:
                return {
                    'success': False,
                    'error': f'Activity {activity_code} not found'
                }
            
            activity_name = activity['name']
            activity.delete()
            
            return {
                'success': True,
                'message': f'Successfully deleted product: {activity_name}'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
