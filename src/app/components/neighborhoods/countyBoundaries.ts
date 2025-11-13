// GeoJSON boundaries for Southern California counties and specialized areas
// Boundaries are designed to fit together like puzzle pieces with shared coordinates
// Coastlines and southern borders are conservative to avoid ocean/Mexico overlap

export const countyBoundaries = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": 0,
      "properties": {
        "name": "Santa Barbara",
        "shortName": "SB",
        "slug": "santa-barbara",
        "listings": "1,234",
        "medianPrice": "$1.2M - $3.5M"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-120.4, 34.85],
          [-119.5, 34.85],
          [-119.5, 34.4],
          [-119.2, 34.25],
          [-119.1, 34.05],
          [-119.6, 34.15],
          [-120.1, 34.35],
          [-120.4, 34.6],
          [-120.4, 34.85]
        ]]
      }
    },
    {
      "type": "Feature",
      "id": 1,
      "properties": {
        "name": "Ventura",
        "shortName": "Ventura",
        "slug": "ventura",
        "listings": "2,156",
        "medianPrice": "$850K - $2.1M"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-119.5, 34.85],
          [-118.6, 34.75],
          [-118.6, 34.35],
          [-118.6, 34.1],
          [-119.1, 34.05],
          [-119.2, 34.25],
          [-119.5, 34.4],
          [-119.5, 34.85]
        ]]
      }
    },
    {
      "type": "Feature",
      "id": 2,
      "properties": {
        "name": "Los Angeles",
        "shortName": "LA",
        "slug": "los-angeles",
        "listings": "15,432",
        "medianPrice": "$950K - $4.2M"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-118.6, 34.75],
          [-117.65, 34.75],
          [-117.65, 34.0],
          [-117.6, 33.9],
          [-118.1, 33.75],
          [-118.55, 33.8],
          [-118.6, 34.1],
          [-118.6, 34.35],
          [-118.6, 34.75]
        ]]
      }
    },
    {
      "type": "Feature",
      "id": 3,
      "properties": {
        "name": "Orange",
        "shortName": "OC",
        "slug": "orange",
        "listings": "8,765",
        "medianPrice": "$1.1M - $3.8M"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-117.6, 33.9],
          [-117.4, 33.9],
          [-117.4, 33.65],
          [-117.45, 33.5],
          [-117.65, 33.5],
          [-118.1, 33.75],
          [-117.6, 33.9]
        ]]
      }
    },
    {
      "type": "Feature",
      "id": 4,
      "properties": {
        "name": "San Diego",
        "shortName": "SD",
        "slug": "san-diego",
        "listings": "9,234",
        "medianPrice": "$850K - $2.5M"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-117.65, 33.5],
          [-117.45, 33.5],
          [-117.0, 33.45],
          [-116.2, 33.25],
          [-116.3, 32.6],
          [-117.15, 32.6],
          [-117.25, 32.8],
          [-117.35, 33.0],
          [-117.5, 33.35],
          [-117.65, 33.5]
        ]]
      }
    },
    {
      "type": "Feature",
      "id": 5,
      "properties": {
        "name": "Riverside",
        "shortName": "Riverside",
        "slug": "riverside",
        "listings": "5,678",
        "medianPrice": "$600K - $1.5M"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-117.65, 34.1],
          [-116.5, 34.15],
          [-116.5, 33.75],
          [-116.3, 33.5],
          [-117.0, 33.45],
          [-117.45, 33.5],
          [-117.4, 33.65],
          [-117.4, 33.9],
          [-117.65, 34.0],
          [-117.65, 34.1]
        ]]
      }
    },
    {
      "type": "Feature",
      "id": 6,
      "properties": {
        "name": "Coachella Valley",
        "shortName": "Coachella",
        "slug": "coachella-valley",
        "listings": "3,421",
        "medianPrice": "$450K - $1.2M"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-116.5, 34.15],
          [-115.8, 34.2],
          [-115.5, 34.0],
          [-114.6, 33.75],
          [-114.7, 33.4],
          [-116.2, 33.25],
          [-116.3, 33.5],
          [-116.5, 33.75],
          [-116.5, 34.15]
        ]]
      }
    },
    {
      "type": "Feature",
      "id": 7,
      "properties": {
        "name": "San Bernardino",
        "shortName": "San Bern.",
        "slug": "san-bernardino",
        "listings": "4,123",
        "medianPrice": "$500K - $1.3M"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-118.5, 35.0],
          [-117.65, 34.75],
          [-117.65, 34.1],
          [-117.65, 34.0],
          [-117.0, 34.1],
          [-117.0, 34.5],
          [-116.5, 34.8],
          [-116.0, 35.2],
          [-116.5, 35.5],
          [-117.5, 35.7],
          [-118.5, 35.0]
        ]]
      }
    },
    {
      "type": "Feature",
      "id": 8,
      "properties": {
        "name": "High Desert / Joshua Tree",
        "shortName": "High Desert",
        "slug": "high-desert",
        "listings": "2,345",
        "medianPrice": "$350K - $850K"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-117.0, 34.5],
          [-117.0, 34.1],
          [-116.5, 34.15],
          [-115.8, 34.2],
          [-115.5, 34.0],
          [-114.6, 34.3],
          [-114.6, 35.0],
          [-116.0, 35.2],
          [-116.5, 34.8],
          [-117.0, 34.5]
        ]]
      }
    },
    {
      "type": "Feature",
      "id": 9,
      "properties": {
        "name": "Imperial",
        "shortName": "Imperial",
        "slug": "imperial",
        "listings": "1,567",
        "medianPrice": "$300K - $650K"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-116.2, 33.25],
          [-114.7, 33.4],
          [-114.7, 32.6],
          [-116.3, 32.6],
          [-116.2, 33.25]
        ]]
      }
    }
  ]
};
