#!/usr/bin/env python3
"""
Subdivision Listing Checker

This utility checks how many listings exist in a subdivision,
broken down by property type (for sale, for rent, multi-family).

Usage:
    python scripts/check-subdivision-listings.py
    OR
    python scripts/check-subdivision-listings.py "Palm Desert Country Club"
"""

import os
import sys
import json
import logging
import requests
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# ANSI color codes for pretty output
class Colors:
    RESET = '\033[0m'
    BRIGHT = '\033[1m'
    CYAN = '\033[36m'
    GREEN = '\033[32m'
    YELLOW = '\033[33m'
    RED = '\033[31m'
    BLUE = '\033[34m'
    MAGENTA = '\033[35m'

# Base URL - adjust if running on different environment
BASE_URL = os.getenv('BASE_URL', 'http://localhost:3000')

# Setup logging
LOG_DIR = Path(__file__).parent.parent / 'local-logs' / 'testing'
LOG_DIR.mkdir(parents=True, exist_ok=True)

# Create timestamped log file
timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
log_file = LOG_DIR / f'subdivision_checker_{timestamp}.log'

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)


def get_subdivision_slug(subdivision_name: str) -> Optional[str]:
    """
    Get subdivision slug by searching the subdivisions API

    Args:
        subdivision_name: Name of the subdivision

    Returns:
        Subdivision slug if found, None otherwise
    """
    url = f"{BASE_URL}/api/subdivisions"

    try:
        params = {'search': subdivision_name, 'limit': 1}
        response = requests.get(url, params=params, timeout=10)

        if response.ok:
            data = response.json()
            subdivisions = data.get('subdivisions', [])
            if subdivisions and len(subdivisions) > 0:
                slug = subdivisions[0].get('slug')
                logger.info(f"Found subdivision slug: {slug}")
                return slug

        logger.warning(f"No subdivision found with name: {subdivision_name}")
        return None

    except Exception as e:
        logger.error(f"Failed to get subdivision slug: {str(e)}")
        return None


def search_subdivision(subdivision_name: str, property_type: Optional[str] = None) -> Dict:
    """
    Search for listings in a subdivision using the subdivision listings API
    (same endpoint used by subdivision pages)

    Args:
        subdivision_name: Name of the subdivision to search
        property_type: Optional property type filter (not used currently)

    Returns:
        Dictionary with success status, count, and listings
    """
    logger.info(f"Searching subdivision: {subdivision_name}")

    # First, get the subdivision slug
    slug = get_subdivision_slug(subdivision_name)

    if not slug:
        return {
            'success': False,
            'error': f"Subdivision '{subdivision_name}' not found. Try checking the exact name.",
            'count': 0,
            'listings': [],
            'subdivision': None,
        }

    # Use the subdivision listings endpoint (same as subdivision pages)
    url = f"{BASE_URL}/api/subdivisions/{slug}/listings"

    # Get all pages of listings
    params = {
        'page': '1',
        'limit': '100',  # Get 100 per page
    }

    logger.debug(f"API URL: {url}")
    logger.debug(f"Query params: {params}")

    try:
        all_listings = []
        subdivision_info = None
        page = 1

        while True:
            params['page'] = str(page)
            response = requests.get(url, params=params, timeout=30)

            logger.info(f"API Response Status (page {page}): {response.status_code}")

            if not response.ok:
                if page == 1:
                    error_msg = f"API request failed: {response.status_code} {response.reason}"
                    logger.error(error_msg)
                    return {
                        'success': False,
                        'error': error_msg,
                        'count': 0,
                        'listings': [],
                        'subdivision': None,
                    }
                else:
                    # If subsequent pages fail, just return what we have
                    break

            data = response.json()
            listings = data.get('listings', [])
            pagination = data.get('pagination', {})

            if page == 1:
                subdivision_info = data.get('subdivision')
                logger.info(f"Subdivision: {subdivision_info.get('name')} - {subdivision_info.get('city')}, {subdivision_info.get('region')}")

            all_listings.extend(listings)
            logger.info(f"Page {page}: Retrieved {len(listings)} listings (total so far: {len(all_listings)})")

            # Check if there are more pages
            total_pages = pagination.get('pages', 1)
            if page >= total_pages:
                break

            page += 1

        logger.info(f"Found {len(all_listings)} total listings")

        return {
            'success': True,
            'count': len(all_listings),
            'listings': all_listings,
            'subdivision': subdivision_info,
        }

    except requests.exceptions.RequestException as e:
        error_msg = f"Request failed: {str(e)}"
        logger.error(error_msg)
        return {
            'success': False,
            'error': error_msg,
            'count': 0,
            'listings': [],
            'subdivision': None,
        }
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return {
            'success': False,
            'error': error_msg,
            'count': 0,
            'listings': [],
            'subdivision': None,
        }


def analyze_listings(listings: List[Dict]) -> Dict[str, List[Dict]]:
    """
    Analyze listings by property category using MLS propertyType codes

    PropertyType codes (from MLS data):
    - A = Residential (Sale)
    - B = Residential Lease (Rental)
    - C = Multi-Family

    Args:
        listings: List of listing dictionaries

    Returns:
        Dictionary with categorized listings
    """
    analysis = {
        'forSale': [],
        'forRent': [],
        'multiFamily': [],
        'other': [],
    }

    logger.info(f"Analyzing {len(listings)} listings")

    for listing in listings:
        # Use propertyType field (standard MLS codes)
        prop_type = listing.get('propertyType', '').strip().upper()
        prop_subtype = (listing.get('propertySubType') or '').lower()

        # Get address (subdivision API uses different field names)
        address = listing.get('address') or listing.get('unparsedAddress') or 'N/A'

        logger.debug(f"Analyzing listing: {address} - "
                    f"propertyType={prop_type}, propertySubType={prop_subtype}")

        # PropertyType "B" = Residential Lease (Rental)
        if prop_type == 'B':
            analysis['forRent'].append(listing)
            logger.debug(f"Classified as for rent (propertyType=B): {address}")
        # PropertyType "C" = Multi-Family
        elif prop_type == 'C':
            analysis['multiFamily'].append(listing)
            logger.debug(f"Classified as multi-family (propertyType=C): {address}")
        # PropertyType "A" = Residential (Sale) - or fallback check propertySubType
        elif prop_type == 'A' or 'single family' in prop_subtype or 'condo' in prop_subtype:
            analysis['forSale'].append(listing)
            logger.debug(f"Classified as for sale (propertyType=A): {address}")
        # Fallback: check propertySubType for rental keywords
        elif any(term in prop_subtype for term in ['rental', 'lease']):
            analysis['forRent'].append(listing)
            logger.debug(f"Classified as for rent (propertySubType): {address}")
        # Fallback: check propertySubType for multi-family keywords
        elif any(term in prop_subtype for term in ['multi', 'apartment', 'duplex']):
            analysis['multiFamily'].append(listing)
            logger.debug(f"Classified as multi-family (propertySubType): {address}")
        # Default to for sale if unclear
        else:
            analysis['forSale'].append(listing)
            logger.debug(f"Classified as for sale (default): {address}")

    logger.info(f"Analysis complete - For Sale: {len(analysis['forSale'])}, "
                f"For Rent: {len(analysis['forRent'])}, "
                f"Multi-Family: {len(analysis['multiFamily'])}, "
                f"Other: {len(analysis['other'])}")

    return analysis


def get_price_range(listings: List[Dict]) -> str:
    """Get price range for a set of listings"""
    if not listings:
        return 'N/A'

    # Support both 'price' and 'listPrice' field names
    prices = sorted([l.get('listPrice', 0) or l.get('price', 0) for l in listings if (l.get('listPrice', 0) or l.get('price', 0)) > 0])

    if not prices:
        return 'N/A'

    min_price = format_price(prices[0])
    max_price = format_price(prices[-1])

    return f"{min_price} - {max_price}"


def get_average_price(listings: List[Dict]) -> str:
    """Get average price for a set of listings"""
    if not listings:
        return 'N/A'

    # Support both 'price' and 'listPrice' field names
    prices = [l.get('listPrice', 0) or l.get('price', 0) for l in listings if (l.get('listPrice', 0) or l.get('price', 0)) > 0]

    if not prices:
        return 'N/A'

    avg = sum(prices) / len(prices)
    return format_price(round(avg))


def format_price(price: int) -> str:
    """Format price as currency"""
    return f"${price:,}"


def display_results(subdivision_name: str, total_count: int, analysis: Dict[str, List[Dict]]):
    """
    Display results with color formatting

    Args:
        subdivision_name: Name of the subdivision
        total_count: Total number of listings
        analysis: Categorized listings analysis
    """
    c = Colors

    print()
    print('=' * 60)
    print(f"{c.BRIGHT}{c.CYAN}Subdivision: {subdivision_name}{c.RESET}")
    print('=' * 60)
    print()

    logger.info(f"Displaying results for: {subdivision_name}")
    logger.info(f"Total listings: {total_count}")

    if total_count == 0:
        msg = "⚠️  No listings found in this subdivision"
        print(f"{c.YELLOW}{msg}{c.RESET}")
        logger.warning(msg)
        print()
        return

    print(f"{c.BRIGHT}📊 Total Listings: {c.GREEN}{total_count}{c.RESET}\n")

    # For Sale
    for_sale_count = len(analysis['forSale'])
    print(f"{c.BRIGHT}{c.GREEN}🏠 For Sale:{c.RESET} {for_sale_count}")
    logger.info(f"For Sale: {for_sale_count}")

    if for_sale_count > 0:
        price_range = get_price_range(analysis['forSale'])
        avg_price = get_average_price(analysis['forSale'])
        print(f"   Price Range: {price_range}")
        print(f"   Avg Price: {avg_price}")
        logger.info(f"For Sale - Price Range: {price_range}, Avg: {avg_price}")
    print()

    # For Rent
    for_rent_count = len(analysis['forRent'])
    print(f"{c.BRIGHT}{c.BLUE}🏘️  For Rent:{c.RESET} {for_rent_count}")
    logger.info(f"For Rent: {for_rent_count}")

    if for_rent_count > 0:
        price_range = get_price_range(analysis['forRent'])
        avg_price = get_average_price(analysis['forRent'])
        print(f"   Price Range: {price_range}")
        print(f"   Avg Price: {avg_price}")
        logger.info(f"For Rent - Price Range: {price_range}, Avg: {avg_price}")
    print()

    # Multi-Family
    multi_family_count = len(analysis['multiFamily'])
    print(f"{c.BRIGHT}{c.MAGENTA}🏢 Multi-Family:{c.RESET} {multi_family_count}")
    logger.info(f"Multi-Family: {multi_family_count}")

    if multi_family_count > 0:
        price_range = get_price_range(analysis['multiFamily'])
        avg_price = get_average_price(analysis['multiFamily'])
        print(f"   Price Range: {price_range}")
        print(f"   Avg Price: {avg_price}")
        logger.info(f"Multi-Family - Price Range: {price_range}, Avg: {avg_price}")
    print()

    # Other/Unknown
    other_count = len(analysis['other'])
    if other_count > 0:
        print(f"{c.BRIGHT}{c.YELLOW}❓ Other:{c.RESET} {other_count}")
        logger.info(f"Other: {other_count}")
        print()

    print('=' * 60)
    print()


def prompt_user(question: str) -> str:
    """Prompt user for input"""
    c = Colors
    try:
        return input(f"{c.YELLOW}{question}{c.RESET}").strip()
    except (EOFError, KeyboardInterrupt):
        print()
        return ''


def main():
    """Main function"""
    c = Colors

    logger.info("=" * 60)
    logger.info("Subdivision Listing Checker - Session Started")
    logger.info(f"Log file: {log_file}")
    logger.info("=" * 60)

    print(f"{c.BRIGHT}{c.CYAN}")
    print('╔════════════════════════════════════════════════════════╗')
    print('║      Subdivision Listing Checker Utility              ║')
    print('╚════════════════════════════════════════════════════════╝')
    print(c.RESET)

    # Get subdivision name from command line or prompt
    subdivision_name = sys.argv[1] if len(sys.argv) > 1 else None

    if not subdivision_name:
        subdivision_name = prompt_user('Enter subdivision name: ')

    if not subdivision_name:
        error_msg = "No subdivision name provided"
        print(f"{c.RED}❌ {error_msg}{c.RESET}")
        logger.error(error_msg)
        sys.exit(1)

    print(f"\n{c.CYAN}🔍 Searching for listings in: {c.BRIGHT}{subdivision_name}{c.RESET}")
    print(f"{c.CYAN}📡 Using API: {BASE_URL}{c.RESET}")
    print(f"{c.CYAN}📝 Logging to: {log_file}{c.RESET}\n")

    # Search for all listings in the subdivision
    result = search_subdivision(subdivision_name)

    if not result['success']:
        print(f"{c.RED}❌ Error: {result['error']}{c.RESET}")
        logger.error(f"Search failed: {result['error']}")
        sys.exit(1)

    # Analyze listings by type
    analysis = analyze_listings(result['listings'])

    # Display results
    display_results(subdivision_name, result['count'], analysis)

    # Ask if user wants to check another subdivision
    again = prompt_user('Check another subdivision? (y/n): ')

    if again.lower() in ['y', 'yes']:
        print('\n')
        logger.info("User requested another search")
        main()  # Recursive call
    else:
        print(f"{c.GREEN}✅ Done!{c.RESET}\n")
        logger.info("Session ended by user")
        logger.info("=" * 60)
        sys.exit(0)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}⚠️  Interrupted by user{Colors.RESET}")
        logger.warning("Session interrupted by user (Ctrl+C)")
        sys.exit(0)
    except Exception as e:
        print(f"{Colors.RED}Fatal error: {str(e)}{Colors.RESET}")
        logger.error(f"Fatal error: {str(e)}", exc_info=True)
        sys.exit(1)
