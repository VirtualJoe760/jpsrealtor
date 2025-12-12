#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Analytics Test Script - Python Version

Test appreciation analytics by city, subdivision, or county
Works directly with MongoDB (no API server needed)

Usage:
    python src/scripts/test/test-analytics.py --city "Palm Desert"
    python src/scripts/test/test-analytics.py --subdivision "Indian Wells Country Club"
    python src/scripts/test/test-analytics.py --county "Riverside"
"""

import os
import sys
import argparse
from pathlib import Path
from datetime import datetime, timedelta
from dotenv import load_dotenv
from pymongo import MongoClient
import statistics

# Load environment variables
env_path = Path(__file__).resolve().parents[3] / ".env.local"
load_dotenv(dotenv_path=env_path)

# ============================================================================
# APPRECIATION CALCULATION
# ============================================================================

def calculate_cagr(start_price, end_price, years):
    """Calculate Compound Annual Growth Rate"""
    if start_price <= 0 or years <= 0:
        return 0
    cagr = (pow(end_price / start_price, 1 / years) - 1) * 100
    return round(cagr, 2)


def analyze_appreciation(sales, period='5y'):
    """Analyze appreciation from sales data"""
    years_map = {'1y': 1, '3y': 3, '5y': 5, '10y': 10}
    years = years_map.get(period, 5)

    # Filter and sort
    valid_sales = [s for s in sales if s.get('closePrice') and s.get('closeDate')]
    sorted_sales = sorted(valid_sales, key=lambda s: s['closeDate'])

    if not sorted_sales:
        raise ValueError('No valid sales data')

    # Get prices
    prices = [s['closePrice'] for s in sorted_sales]

    # Calculate median for first and last quarter
    quarter_size = max(1, len(prices) // 4)
    first_quarter = prices[:quarter_size]
    last_quarter = prices[-quarter_size:]

    start_median = statistics.median(first_quarter) if first_quarter else prices[0]
    end_median = statistics.median(last_quarter) if last_quarter else prices[-1]

    # Calculate metrics
    annual = calculate_cagr(start_median, end_median, years)
    cumulative = round(((end_median - start_median) / start_median) * 100, 2)

    # Determine trend
    if annual > 5:
        trend = 'increasing'
    elif annual < -2:
        trend = 'decreasing'
    else:
        trend = 'stable'

    # Confidence
    if len(sorted_sales) > 50:
        confidence = 'high'
    elif len(sorted_sales) > 20:
        confidence = 'medium'
    else:
        confidence = 'low'

    return {
        'period': period,
        'appreciation': {
            'annual': annual,
            'cumulative': cumulative,
            'trend': trend
        },
        'marketData': {
            'startMedianPrice': round(start_median),
            'endMedianPrice': round(end_median),
            'totalSales': len(sorted_sales),
            'confidence': confidence
        }
    }


# ============================================================================
# MAIN TEST FUNCTION
# ============================================================================

def test_appreciation(args):
    """Main test function"""
    period = args.period or '5y'
    verbose = args.verbose

    print('\n' + '=' * 80)
    print('ANALYTICS TEST - Appreciation Analysis')
    print('=' * 80)

    # Build query
    query = {}
    location_type = ''
    location_value = ''

    if args.city:
        query['city'] = args.city
        location_type = 'City'
        location_value = args.city
    elif args.subdivision:
        query['subdivisionName'] = args.subdivision
        location_type = 'Subdivision'
        location_value = args.subdivision
    elif args.county:
        query['countyOrParish'] = args.county
        location_type = 'County'
        location_value = args.county
    else:
        print('[X] Error: Must specify --city, --subdivision, or --county')
        sys.exit(1)

    # Add time filter
    years_map = {'1y': 1, '3y': 3, '5y': 5, '10y': 10}
    years_back = years_map.get(period, 5)
    cutoff_date = datetime.now() - timedelta(days=365.25 * years_back)
    query['closeDate'] = {'$gte': cutoff_date}

    print(f'\n[*] Location: {location_value} ({location_type})')
    print(f'[*] Period: Past {years_back} years (since {cutoff_date.strftime("%Y-%m-%d")})')
    print(f'\n[*] Querying MongoDB...')

    try:
        # Connect to MongoDB
        mongodb_uri = os.getenv('MONGODB_URI')
        if not mongodb_uri:
            raise Exception('MONGODB_URI not found in .env.local')

        client = MongoClient(mongodb_uri)
        db = client.get_database()
        collection = db['unified_closed_listings']

        # Fetch closed sales
        sales = list(collection.find(query))

        if not sales:
            print(f'\n[X] No closed sales found for {location_value}')
            print(f'\n[*] Suggestions:')
            print(f'   - Check spelling')
            print(f'   - Try different time period (--period 10y)')
            print(f'   - Data might not be seeded yet (run seed.py)')
            return

        print(f'[+] Found {len(sales):,} closed sales\n')

        # Show MLS sources
        mls_sources = list(set(s.get('mlsSource') for s in sales if s.get('mlsSource')))
        print(f'[*] MLS Sources: {", ".join(mls_sources)}')

        # Calculate appreciation
        print(f'\n[*] Calculating appreciation...\n')

        result = analyze_appreciation(sales, period)

        # Display results
        print('=' * 80)
        print('APPRECIATION RESULTS')
        print('=' * 80)

        print(f'\n[*] Appreciation:')
        print(f'   Annual Rate:     {result["appreciation"]["annual"]}%')
        print(f'   Cumulative:      {result["appreciation"]["cumulative"]}%')
        print(f'   Trend:           {result["appreciation"]["trend"].upper()}')

        print(f'\n[*] Market Data:')
        print(f'   Start Price:     ${result["marketData"]["startMedianPrice"]:,}')
        print(f'   End Price:       ${result["marketData"]["endMedianPrice"]:,}')
        price_change = result["marketData"]["endMedianPrice"] - result["marketData"]["startMedianPrice"]
        print(f'   Price Change:    ${price_change:,}')
        print(f'   Total Sales:     {result["marketData"]["totalSales"]:,}')
        print(f'   Confidence:      {result["marketData"]["confidence"].upper()}')

        print(f'\n{"=" * 80}\n')

        # Success message
        print(f'[+] Test completed successfully!\n')

        # Sample data (if verbose)
        if verbose and sales:
            sample = sales[0]
            print(f'[*] Sample Sale:')
            print(f'   Address:      {sample.get("unparsedAddress") or sample.get("address") or "N/A"}')
            print(f'   Close Price:  ${sample.get("closePrice", 0):,}')
            print(f'   Close Date:   {sample.get("closeDate")}')
            print(f'   Beds/Baths:   {sample.get("bedroomsTotal", "?")}/{sample.get("bathroomsTotalDecimal", "?")}')
            print(f'   Sqft:         {sample.get("livingArea", 0):,}')
            print(f'   MLS Source:   {sample.get("mlsSource") or "N/A"}\n')

        client.close()

    except Exception as error:
        print(f'\n[X] Error: {error}\n')
        if verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)


# ============================================================================
# CLI ARGUMENT PARSING
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description='Analytics Test Script - Python Version',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  python src/scripts/test/test-analytics.py --city "Palm Desert"
  python src/scripts/test/test-analytics.py --city "Palm Desert" --period 3y
  python src/scripts/test/test-analytics.py --subdivision "Indian Wells Country Club" --verbose
  python src/scripts/test/test-analytics.py --county "Riverside" --period 10y

Requirements:
  - MongoDB must be running
  - unified_closed_listings collection must be seeded
  - .env.local must have MONGODB_URI set
        '''
    )

    parser.add_argument('--city', type=str, help='Test by city (e.g., "Palm Desert")')
    parser.add_argument('--subdivision', type=str, help='Test by subdivision (e.g., "Indian Wells Country Club")')
    parser.add_argument('--county', type=str, help='Test by county (e.g., "Riverside")')
    parser.add_argument('--period', type=str, choices=['1y', '3y', '5y', '10y'], default='5y',
                        help='Time period (default: 5y)')
    parser.add_argument('--verbose', '-v', action='store_true', help='Show detailed output')

    args = parser.parse_args()

    test_appreciation(args)


if __name__ == '__main__':
    main()
