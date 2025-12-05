#!/usr/bin/env python3
"""
Generate TypeScript file with California city boundary polygons from GeoJSON.
Processes city boundaries with simplification to reduce file size.
"""

import json
from shapely.geometry import shape
from shapely.ops import unary_union

def abbreviateNumber(num):
    """Format numbers for display (e.g., 5950 → '5.9k')"""
    if num >= 1000000:
        return f"{num / 1000000:.1f}m".replace('.0m', 'm')
    if num >= 1000:
        return f"{num / 1000:.1f}k".replace('.0k', 'k')
    return str(num)

# Read the GeoJSON file
print("Reading California city boundaries GeoJSON...")
with open('ca_cities.geojson', 'r', encoding='utf-8') as f:
    geojson = json.load(f)

print(f"Total cities in file: {len(geojson['features'])}")

# Process each city
city_boundaries = {}
skipped_cities = []

for feature in geojson['features']:
    # Get city name from CDTFA_CITY field
    city_name = feature['properties'].get('CDTFA_CITY') or feature['properties'].get('CDT_NAME_S')

    if not city_name:
        skipped_cities.append(f"Unknown (GNIS: {feature['properties'].get('GNIS_ID', 'N/A')})")
        continue

    # Parse geometry
    try:
        geom = shape(feature['geometry'])

        # Fix invalid geometries
        if not geom.is_valid:
            print(f"  Fixing invalid geometry for {city_name}")
            geom = geom.buffer(0)

        # Simplify the geometry more aggressively for cities (they're smaller, so need less detail)
        # Use 0.005 degrees (~550m) for simplification to balance detail and file size
        geom = geom.simplify(0.005, preserve_topology=True)

        # Convert back to GeoJSON
        geom_json = geom.__geo_interface__

        # Store the boundary
        city_boundaries[city_name] = {
            'type': geom_json['type'],
            'coordinates': geom_json['coordinates']
        }

        print(f"  Processed: {city_name} ({geom_json['type']})")

    except Exception as e:
        print(f"  ERROR processing {city_name}: {e}")
        skipped_cities.append(f"{city_name} (error: {e})")

print(f"\n Successfully processed {len(city_boundaries)} cities")
if skipped_cities:
    print(f" Skipped {len(skipped_cities)} cities:")
    for city in skipped_cities[:10]:  # Show first 10
        print(f"    - {city}")
    if len(skipped_cities) > 10:
        print(f"    ... and {len(skipped_cities) - 10} more")

# Generate TypeScript file
print("\nGenerating TypeScript file...")
ts_output = """/**
 * California City Boundary Polygons
 *
 * Generated from California Open Data Portal city boundaries.
 * Source: https://data.ca.gov/dataset/california-city-boundaries-and-identifiers
 *
 * Contains polygon coordinates for {} California cities.
 * Geometries simplified to ~550m tolerance for performance.
 *
 * @generated - Do not edit manually
 */

export interface CityBoundary {{
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
}}

export const CITY_BOUNDARIES: Record<string, CityBoundary> = {{
""".format(len(city_boundaries))

# Add each city boundary
for city_name, boundary in sorted(city_boundaries.items()):
    # Use compact JSON format
    boundary_json = json.dumps(boundary, separators=(",", ":"))
    ts_output += f'  "{city_name}": {boundary_json},\n'

ts_output += "};\n"

# Write to TypeScript file
output_path = '../src/data/city-boundaries.ts'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(ts_output)

print(f" Written to {output_path}")
print(f"  Total cities: {len(city_boundaries)}")
print(f"  File size: {len(ts_output) / 1024 / 1024:.2f} MB")
