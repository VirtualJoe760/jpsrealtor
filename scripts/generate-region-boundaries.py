#!/usr/bin/env python3
"""
Generate regional boundary polygons by merging California county GeoJSON boundaries.

This script:
1. Loads California county GeoJSON data
2. Maps each county to its region (Northern, Central, or Southern California)
3. Merges county polygons within each region using shapely
4. Outputs simplified regional boundaries for use in map clustering
"""

import json
from shapely.geometry import shape, MultiPolygon, Polygon
from shapely.ops import unary_union

# County to region mapping (based on existing database schema)
# Source: County model region field values
COUNTY_REGION_MAP = {
    # Northern California
    'Del Norte': 'Northern California',
    'Siskiyou': 'Northern California',
    'Modoc': 'Northern California',
    'Humboldt': 'Northern California',
    'Trinity': 'Northern California',
    'Shasta': 'Northern California',
    'Lassen': 'Northern California',
    'Tehama': 'Northern California',
    'Plumas': 'Northern California',
    'Glenn': 'Northern California',
    'Butte': 'Northern California',
    'Sierra': 'Northern California',
    'Mendocino': 'Northern California',
    'Lake': 'Northern California',
    'Colusa': 'Northern California',
    'Sutter': 'Northern California',
    'Yuba': 'Northern California',
    'Nevada': 'Northern California',

    # Bay Area (part of Central California)
    'Sonoma': 'Central California',
    'Napa': 'Central California',
    'Marin': 'Central California',
    'San Francisco': 'Central California',
    'San Mateo': 'Central California',
    'Santa Clara': 'Central California',
    'Alameda': 'Central California',
    'Contra Costa': 'Central California',
    'Solano': 'Central California',

    # Sacramento Valley (part of Central California)
    'Yolo': 'Central California',
    'Sacramento': 'Central California',
    'Placer': 'Central California',
    'El Dorado': 'Central California',

    # Sierra Nevada (part of Central California)
    'Alpine': 'Central California',
    'Amador': 'Central California',
    'Calaveras': 'Central California',
    'Tuolumne': 'Central California',
    'Mariposa': 'Central California',
    'Mono': 'Central California',

    # Central Valley (part of Central California)
    'San Joaquin': 'Central California',
    'Stanislaus': 'Central California',
    'Merced': 'Central California',
    'Madera': 'Central California',
    'Fresno': 'Central California',
    'Kings': 'Central California',
    'Tulare': 'Central California',
    'Kern': 'Central California',

    # Central Coast (part of Central California)
    'San Benito': 'Central California',
    'Monterey': 'Central California',
    'San Luis Obispo': 'Central California',
    'Santa Cruz': 'Central California',

    # Southern California
    'Santa Barbara': 'Southern California',
    'Ventura': 'Southern California',
    'Los Angeles': 'Southern California',
    'Orange': 'Southern California',
    'San Bernardino': 'Southern California',
    'Riverside': 'Southern California',
    'Imperial': 'Southern California',
    'San Diego': 'Southern California',
    'Inyo': 'Southern California',
}

def load_county_geojson(filepath):
    """Load the California counties GeoJSON file"""
    with open(filepath, 'r') as f:
        return json.load(f)

def merge_counties_by_region(geojson_data):
    """Group counties by region and merge their polygons"""
    region_polygons = {
        'Northern California': [],
        'Central California': [],
        'Southern California': []
    }

    # Group county geometries by region
    for feature in geojson_data['features']:
        county_name = feature['properties']['name']
        region = COUNTY_REGION_MAP.get(county_name)

        if not region:
            print(f"Warning: County '{county_name}' not found in mapping, skipping")
            continue

        # Convert GeoJSON geometry to shapely object
        geom = shape(feature['geometry'])

        # Fix any invalid geometries with buffer(0) trick
        if not geom.is_valid:
            geom = geom.buffer(0)

        region_polygons[region].append(geom)

    # Merge polygons within each region
    merged_regions = {}
    for region_name, polygons in region_polygons.items():
        print(f"Merging {len(polygons)} counties for {region_name}...")

        # Use unary_union to merge all polygons
        merged = unary_union(polygons)

        # Simplify to reduce coordinate count (tolerance in degrees, ~1km)
        simplified = merged.simplify(0.01, preserve_topology=True)

        merged_regions[region_name] = simplified
        print(f"  Result: {simplified.geom_type} with {len(simplified.exterior.coords) if hasattr(simplified, 'exterior') else 'multiple'} coordinates")

    return merged_regions

def shapely_to_geojson_coords(geom):
    """Convert shapely geometry to GeoJSON coordinate format"""
    if isinstance(geom, Polygon):
        # Single polygon: [[[x, y], [x, y], ...]]
        return [list(geom.exterior.coords)]
    elif isinstance(geom, MultiPolygon):
        # Multiple polygons: [[[x, y], ...]], [[[x, y], ...]], ...]
        result = []
        for poly in geom.geoms:
            result.append([list(poly.exterior.coords)])
        return result
    else:
        raise ValueError(f"Unsupported geometry type: {geom.geom_type}")

def generate_output(merged_regions):
    """Generate TypeScript/JavaScript object for region boundaries"""
    output_lines = [
        "// Auto-generated region boundaries from California county GeoJSON data",
        "// Generated by scripts/generate-region-boundaries.py",
        "",
        "export const REGION_BOUNDARIES: Record<string, number[][][]> = {"
    ]

    for region_name, geom in merged_regions.items():
        coords = shapely_to_geojson_coords(geom)

        # Format as JavaScript/TypeScript
        output_lines.append(f"  '{region_name}': {json.dumps(coords, separators=(',', ': '))},")

    output_lines.append("};")

    return "\n".join(output_lines)

def main():
    print("Generating California region boundaries...")
    print()

    # Load county GeoJSON
    print("Loading county GeoJSON...")
    geojson_data = load_county_geojson('ca_counties.json')
    print(f"   Loaded {len(geojson_data['features'])} counties")
    print()

    # Merge counties into regions
    print("Merging counties by region...")
    merged_regions = merge_counties_by_region(geojson_data)
    print()

    # Generate TypeScript output
    print("Generating TypeScript output...")
    output = generate_output(merged_regions)

    # Save to file
    output_path = 'src/data/region-boundaries.ts'
    with open(output_path, 'w') as f:
        f.write(output)

    print(f"SUCCESS: Region boundaries saved to {output_path}")
    print()

    # Print summary
    print("Summary:")
    for region_name, geom in merged_regions.items():
        coord_count = len(geom.exterior.coords) if hasattr(geom, 'exterior') else sum(len(p.exterior.coords) for p in geom.geoms)
        print(f"   {region_name}: {geom.geom_type}, ~{coord_count} coordinates")

if __name__ == '__main__':
    main()
