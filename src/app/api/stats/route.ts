import { NextResponse } from "next/server";

/**
 * GET /api/stats
 *
 * Stats API Index - Returns information about all available statistics endpoints
 *
 * This is the main entry point for the Stats API, providing documentation
 * and links to all available statistical data endpoints.
 */
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const endpoints = {
    california: {
      path: '/api/stats/california',
      description: 'California statewide listing statistics',
      methods: ['GET'],
      queryParameters: {
        propertyType: {
          type: 'string',
          required: false,
          values: ['A', 'B', 'C', 'D'],
          description: 'Filter by property type (A=Sale, B=Rental, C=Multi-family, D=Land)'
        }
      },
      caching: {
        duration: '1 hour (unfiltered), 10 minutes (filtered)',
        revalidate: '2 hours (unfiltered), 20 minutes (filtered)'
      },
      examples: [
        `${baseUrl}/api/stats/california`,
        `${baseUrl}/api/stats/california?propertyType=A`,
        `${baseUrl}/api/stats/california?propertyType=D`
      ]
    },
    market: {
      path: '/api/stats/market',
      description: 'Current market statistics including mortgage rates and economic indicators',
      methods: ['GET'],
      queryParameters: {},
      caching: {
        duration: '15 minutes',
        revalidate: '30 minutes'
      },
      examples: [
        `${baseUrl}/api/stats/market`
      ]
    },
    propertyTypes: {
      path: '/api/stats/property-types',
      description: 'Comparative statistics across all property types',
      methods: ['GET'],
      status: 'coming-soon',
      queryParameters: {},
      caching: {
        duration: '30 minutes',
        revalidate: '1 hour'
      }
    }
  };

  const propertyTypeCodes = {
    A: {
      name: 'Residential Sale',
      description: 'Single-family homes, condos, and residential properties for sale',
      color: 'emerald'
    },
    B: {
      name: 'Rental',
      description: 'Properties available for rent',
      color: 'purple'
    },
    C: {
      name: 'Multi-Family',
      description: 'Apartment buildings, duplexes, multi-unit properties',
      color: 'yellow'
    },
    D: {
      name: 'Land',
      description: 'Vacant land, lots, and developable parcels',
      color: 'blue'
    }
  };

  return NextResponse.json({
    name: 'Stats API',
    version: '1.0.0',
    description: 'Comprehensive statistics API for real estate data, market indicators, and analytics',
    documentation: '/api/stats/README.md',
    endpoints,
    propertyTypeCodes,
    support: {
      email: 'support@jpsrealtor.com',
      documentation: `${baseUrl}/docs/api/stats`
    },
    metadata: {
      totalEndpoints: Object.keys(endpoints).length,
      activeEndpoints: Object.values(endpoints).filter((e: any) => e.status !== 'coming-soon').length,
      generatedAt: new Date().toISOString()
    }
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200'
    }
  });
}
