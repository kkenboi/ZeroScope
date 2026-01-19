# Simple mapping of ISO-2 country codes to Lat/Lng
# This avoids needing a heavy external library or API calls for basic locations
COUNTRY_COORDINATES = {
    'CN': {'lat': 35.8617, 'lng': 104.1954, 'name': 'China'},
    'US': {'lat': 37.0902, 'lng': -95.7129, 'name': 'United States'},
    'IN': {'lat': 20.5937, 'lng': 78.9629, 'name': 'India'},
    'DE': {'lat': 51.1657, 'lng': 10.4515, 'name': 'Germany'},
    'JP': {'lat': 36.2048, 'lng': 138.2529, 'name': 'Japan'},
    'RU': {'lat': 61.5240, 'lng': 105.3188, 'name': 'Russia'},
    'BR': {'lat': -14.2350, 'lng': -51.9253, 'name': 'Brazil'},
    'GB': {'lat': 55.3781, 'lng': -3.4360, 'name': 'United Kingdom'},
    'FR': {'lat': 46.2276, 'lng': 2.2137, 'name': 'France'},
    'IT': {'lat': 41.8719, 'lng': 12.5674, 'name': 'Italy'},
    'CA': {'lat': 56.1304, 'lng': -106.3468, 'name': 'Canada'},
    'AU': {'lat': -25.2744, 'lng': 133.7751, 'name': 'Australia'},
    'SG': {'lat': 1.3521, 'lng': 103.8198, 'name': 'Singapore'},
    'KR': {'lat': 35.9078, 'lng': 127.7669, 'name': 'South Korea'},
    'ID': {'lat': -0.7893, 'lng': 113.9213, 'name': 'Indonesia'},
    'MY': {'lat': 4.2105, 'lng': 101.9758, 'name': 'Malaysia'},
    'VN': {'lat': 14.0583, 'lng': 108.2772, 'name': 'Vietnam'},
    'TH': {'lat': 15.8700, 'lng': 100.9925, 'name': 'Thailand'},
    'GLO': {'lat': 0.0, 'lng': 0.0, 'name': 'Global Average'}, # Null Island / Placeholder
    'ROW': {'lat': 0.0, 'lng': 0.0, 'name': 'Rest of World'},
    'RER': {'lat': 48.0, 'lng': 10.0, 'name': 'Europe'} # Approx Europe
}

def get_coordinates(location_code):
    """
    Get coordinates for a location code (e.g., 'CN', 'US')
    Returns dict with lat, lng, name, or None if not found
    """
    if not location_code:
        return None
        
    code = location_code.upper().strip()
    return COUNTRY_COORDINATES.get(code)
