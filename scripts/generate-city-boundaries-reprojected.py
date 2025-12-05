#!/usr/bin/env python3
"""
Generate TypeScript file with California city boundary polygons from shapefile.
Reprojects from California Teale Albers to WGS84 (EPSG:4326) for MapLibre.
"""

import json
import shapefile
from pyproj import Transformer
from shapely.geometry import shape, mapping
from shapely.ops import transform

print("Reading California city boundaries shapefile...")
sf = shapefile.Reader('California_City_Boundaries_and_Identifiers.shp')

print(f"Total cities in file: {len(sf.shapes())}")

# Create transformer from California Teale Albers to WGS84
# EPSG:3310 is California Teale Albers
# EPSG:4326 is WGS84 (lat/lng)
transformer = Transformer.from_crs("EPSG:3310", "EPSG:4326", always_xy=True)

# Process each city
city_boundaries = {}
skipped_cities = []

for sr in sf.shapeRecords():
    # Get city name from CDTFA_CITY field
    props = dict(zip([f[0] for f in sf.fields[1:]], sr.record))
    city_name = props.get('CDTFA_CITY') or props.get('CDT_NAME_S')

    if not city_name:
        skipped_cities.append(f"Unknown (GNIS: {props.get('GNIS_ID', 'N/A')})")
        continue

    try:
        # Get geometry
        geom = shape(sr.shape.__geo_interface__)

        # Fix invalid geometries
        if not geom.is_valid:
            print(f"  Fixing invalid geometry for {city_name}")
            geom = geom.buffer(0)

        # Reproject from California Teale Albers to WGS84
        geom_wgs84 = transform(transformer.transform, geom)

        # Simplify the geometry in WGS84 coordinates
        # Use 0.001 degrees (~111m) for simplification to balance detail and file size
        geom_simplified = geom_wgs84.simplify(0.001, preserve_topology=True)

        # Convert to GeoJSON format
        geom_json = mapping(geom_simplified)

        # Store the boundary
        city_boundaries[city_name] = {
            'type': geom_json['type'],
            'coordinates': geom_json['coordinates']
        }

        print(f"  Processed: {city_name} ({geom_json['type']})")

    except Exception as e:
        print(f"  ERROR processing {city_name}: {e}")
        skipped_cities.append(f"{city_name} (error: {e})")

print(f"\nSuccessfully processed {len(city_boundaries)} cities")
if skipped_cities:
    print(f"Skipped {len(skipped_cities)} cities:")
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
 * Contains polygon coordinates for {} California cities in WGS84 (EPSG:4326).
 * Geometries simplified to ~111m tolerance for performance.
 * Reprojected from California Teale Albers (EPSG:3310) to WGS84.
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

print(f"Written to {output_path}")
print(f"  Total cities: {len(city_boundaries)}")
print(f"  File size: {len(ts_output) / 1024 / 1024:.2f} MB")
