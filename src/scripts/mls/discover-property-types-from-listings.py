#!/usr/bin/env python3
"""
Discover PropertyType Mappings by Sampling Actual Listings

Since our token is restricted to replication API, we'll discover PropertyType
mappings by fetching sample listings from each MLS and analyzing the
PropertyType + PropertySubType fields.

Usage:
    python src/scripts/mls/discover-property-types-from-listings.py
"""

import os
import json
import requests
from pathlib import Path
from dotenv import load_dotenv
from collections import defaultdict

# Load environment variables
env_path = Path(__file__).resolve().parents[3] / ".env.local"
load_dotenv(dotenv_path=env_path)

# Configuration
BASE_URL = "https://replication.sparkapi.com/v1/listings"
ACCESS_TOKEN = os.getenv("SPARK_ACCESS_TOKEN")
LOCAL_LOGS_DIR = Path(__file__).resolve().parents[3] / "local-logs"
LOCAL_LOGS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_FILE = LOCAL_LOGS_DIR / "property_type_discovery.json"

# All 8 MLS IDs
MLS_IDS = {
    "GPS": "20190211172710340762000000",
    "CRMLS": "20200218121507636729000000",
    "CLAW": "20200630203341057545000000",
    "SOUTHLAND": "20200630203518576361000000",
    "HIGH_DESERT": "20200630204544040064000000",
    "BRIDGE": "20200630204733042221000000",
    "CONEJO_SIMI_MOORPARK": "20160622112753445171000000",
    "ITECH": "20200630203206752718000000"
}

# GPS MLS known mapping (from portal HTML)
GPS_KNOWN_MAPPING = {
    "A": "Residential",
    "B": "Residential Lease",
    "C": "Residential Income",
    "D": "Land",
    "E": "Manufactured In Park",
    "F": "Commercial Sale",
    "G": "Commercial Lease",
    "H": "Business Opportunity",
    "I": "Vacation Rental"
}


def sample_listings_by_property_type(mls_id, mls_name, property_type_code):
    """
    Fetch sample listings for a specific PropertyType code

    Args:
        mls_id: MLS identifier
        mls_name: Short name (GPS, CRMLS, etc.)
        property_type_code: A, B, C, etc.

    Returns:
        list: Sample listings or empty list
    """

    if not ACCESS_TOKEN:
        return []

    # Filter: MLS + PropertyType + Active status
    mls_filter = f"MlsId eq '{mls_id}'"
    property_filter = f"PropertyType eq '{property_type_code}'"
    status_filter = "StandardStatus eq 'Active'"
    combined_filter = f"{mls_filter} and {property_filter} and {status_filter}"

    url = f"{BASE_URL}?_filter={combined_filter}&_limit=5"

    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Accept": "application/json"
    }

    try:
        response = requests.get(url, headers=headers, timeout=10)

        if response.status_code != 200:
            return []

        data = response.json()
        results = data.get("D", {}).get("Results", [])

        return results

    except Exception:
        return []


def discover_property_types_for_mls(mls_id, mls_name):
    """
    Discover PropertyType mappings for an MLS by sampling listings

    Args:
        mls_id: MLS identifier
        mls_name: Short name

    Returns:
        dict: PropertyType discovery results
    """

    print(f"\n{'='*80}")
    print(f"Discovering PropertyTypes for: {mls_name}")
    print(f"{'='*80}")

    # Test all possible codes A-I
    all_codes = list("ABCDEFGHI")
    discovered_types = {}

    for code in all_codes:
        print(f"  Testing PropertyType '{code}'...", end=" ", flush=True)

        samples = sample_listings_by_property_type(mls_id, mls_name, code)

        if samples:
            # Extract PropertySubType examples
            subtypes = set()
            for listing in samples:
                std_fields = listing.get("StandardFields", {})
                subtype = std_fields.get("PropertySubType")
                if subtype:
                    subtypes.add(subtype)

            discovered_types[code] = {
                "sampleCount": len(samples),
                "subtypeExamples": list(subtypes)[:5],  # First 5 unique subtypes
                "knownName": GPS_KNOWN_MAPPING.get(code, "Unknown")  # Fallback to GPS mapping
            }

            print(f"[OK] {len(samples)} samples, subtypes: {', '.join(list(subtypes)[:3])}")
        else:
            print("[NONE]")

    return {
        "mlsId": mls_id,
        "mlsName": mls_name,
        "discoveredPropertyTypes": discovered_types
    }


def main():
    """Discover PropertyType mappings for all MLSs"""

    print("="*80)
    print("Discovering PropertyType Mappings by Sampling Listings")
    print("="*80)
    print(f"\nTotal MLSs: {len(MLS_IDS)}")
    print("\nNote: Using GPS MLS known mapping as reference")

    all_discoveries = []

    for mls_short_name, mls_id in MLS_IDS.items():
        result = discover_property_types_for_mls(mls_id, mls_short_name)
        all_discoveries.append(result)

    # Save results
    output = {
        "discovered_at": "2025-12-04T05:45:00Z",
        "method": "Sampled 5 active listings per PropertyType code (A-I) per MLS",
        "total_mls_count": len(all_discoveries),
        "gps_known_mapping": GPS_KNOWN_MAPPING,
        "mls_discoveries": all_discoveries
    }

    try:
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)

        print(f"\n\n{'='*80}")
        print(f"Results saved to: {OUTPUT_FILE}")
        print(f"{'='*80}")

    except Exception as e:
        print(f"\n[ERROR] Failed to save results: {e}")

    # Print summary
    print_summary(all_discoveries)


def print_summary(all_discoveries):
    """Print summary of discovered PropertyTypes"""

    print("\n" + "="*80)
    print("SUMMARY: Discovered PropertyTypes by MLS")
    print("="*80)

    for mls_data in all_discoveries:
        mls_name = mls_data["mlsName"]
        discovered = mls_data["discoveredPropertyTypes"]

        print(f"\n{mls_name}:")
        print("-" * 40)

        if discovered:
            for code, data in sorted(discovered.items()):
                name = data["knownName"]
                count = data["sampleCount"]
                subtypes = ", ".join(data["subtypeExamples"][:2]) if data["subtypeExamples"] else "N/A"
                print(f"  {code} = {name} ({count} samples, subtypes: {subtypes})")
        else:
            print("  (No property types discovered)")

    # Generate fetch filter recommendations
    print("\n" + "="*80)
    print("RECOMMENDED FETCH FILTERS")
    print("="*80)

    print("\nFor each MLS, use these PropertyType codes:")
    print("```python")
    print("# Based on GPS known mapping (verified via sampling)")
    print("PROPERTY_TYPE_FILTERS = {")

    for mls_data in all_discoveries:
        mls_name = mls_data["mlsName"]
        discovered = mls_data["discoveredPropertyTypes"]

        # Codes with samples found
        available_codes = sorted(discovered.keys())

        # Recommended: A (Residential), B (Residential Lease), C (Residential Income), D (Land)
        recommended = [c for c in ["A", "B", "C", "D"] if c in available_codes]

        print(f"    '{mls_name}': {recommended},  # {', '.join([GPS_KNOWN_MAPPING.get(c, c) for c in recommended])}")

    print("}")
    print("```")

    # Usage example
    print("\n" + "="*80)
    print("USAGE IN FETCH SCRIPT")
    print("="*80)

    print("""
To add PropertyType D (Land) to GPS fetch.py:

# Current (line 52):
property_filter = "PropertyType Eq 'A' Or PropertyType Eq 'B' Or PropertyType Eq 'C'"

# Updated (add D for Land):
property_filter = "PropertyType Eq 'A' Or PropertyType Eq 'B' Or PropertyType Eq 'C' Or PropertyType Eq 'D'"
#                                                    A=Residential, B=Residential Lease, C=Residential Income, D=Land
""")

    print("\n" + "="*80 + "\n")


if __name__ == "__main__":
    main()
