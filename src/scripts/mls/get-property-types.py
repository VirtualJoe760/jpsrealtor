#!/usr/bin/env python3
"""
Get PropertyType Mappings for All MLS Associations

Uses Spark API to fetch PropertyType definitions for each MLS.
This discovers the mapping of codes (A, B, C, etc.) to property type names
for each MLS association.

Based on: https://sparkplatform.com/docs/api_services/property_types
Endpoint: /v1/mls/<MlsId>/propertytypes

Usage:
    python src/scripts/mls/get-property-types.py
"""

import os
import json
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).resolve().parents[3] / ".env.local"
load_dotenv(dotenv_path=env_path)

# Configuration
BASE_URL = "https://sparkapi.com/v1"
ACCESS_TOKEN = os.getenv("SPARK_ACCESS_TOKEN")
LOCAL_LOGS_DIR = Path(__file__).resolve().parents[3] / "local-logs"
LOCAL_LOGS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_FILE = LOCAL_LOGS_DIR / "mls_property_types_complete.json"

# All 8 MLS IDs from data share
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


def get_property_types_for_mls(mls_id, mls_name):
    """
    Fetch PropertyType definitions for a specific MLS

    Args:
        mls_id: 26-digit MLS identifier
        mls_name: Short name (e.g., "GPS", "CRMLS")

    Returns:
        dict: PropertyType data or None if error
    """

    if not ACCESS_TOKEN:
        print("[ERROR] SPARK_ACCESS_TOKEN is missing in .env.local")
        return None

    # Endpoint: /v1/mls/<MlsId>/propertytypes
    url = f"{BASE_URL}/mls/{mls_id}/propertytypes"

    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "X-SparkApi-User-Agent": "JPSRealtor",
        "Accept": "application/json"
    }

    print(f"\n{'='*80}")
    print(f"Fetching PropertyTypes for: {mls_name}")
    print(f"{'='*80}")
    print(f"URL: {url}")

    try:
        response = requests.get(url, headers=headers, timeout=15)

        if response.status_code != 200:
            print(f"[ERROR] HTTP {response.status_code}: {response.text[:200]}")
            return None

        data = response.json()

        if not data.get("D", {}).get("Success"):
            print(f"[ERROR] API returned Success=false")
            return None

        results = data.get("D", {}).get("Results", [])

        if not results:
            print(f"[WARN] No PropertyTypes returned for {mls_name}")
            return None

        print(f"[OK] Found {len(results)} PropertyType(s)")

        # Parse and display property types
        property_types = []

        for idx, prop_type in enumerate(results, 1):
            # Extract key fields
            code = prop_type.get("MlsCode")  # A, B, C, etc.
            name = prop_type.get("MlsName")  # "Residential", "Land", etc.
            enabled = prop_type.get("Enabled", False)
            prop_class = prop_type.get("PropertyClass")

            print(f"\n  {idx}. Code '{code}' - {name}")
            print(f"     Property Class: {prop_class}")
            print(f"     Enabled: {'Yes' if enabled else 'No'}")

            property_types.append({
                "code": code,
                "name": name,
                "enabled": enabled,
                "propertyClass": prop_class,
                "fullData": prop_type
            })

        return {
            "mlsId": mls_id,
            "mlsName": mls_name,
            "propertyTypes": property_types
        }

    except Exception as e:
        print(f"[ERROR] Failed to fetch PropertyTypes for {mls_name}: {e}")
        return None


def main():
    """Fetch PropertyTypes for all 8 MLS associations"""

    print("="*80)
    print("Fetching PropertyType Mappings for All MLS Associations")
    print("="*80)
    print(f"\nTotal MLSs: {len(MLS_IDS)}")

    all_mls_property_types = []

    for mls_short_name, mls_id in MLS_IDS.items():
        result = get_property_types_for_mls(mls_id, mls_short_name)

        if result:
            all_mls_property_types.append(result)

    # Save results
    output = {
        "discovered_at": "2025-12-04T05:30:00Z",
        "source": "Spark API - /v1/mls/<MlsId>/propertytypes",
        "total_mls_count": len(all_mls_property_types),
        "mls_property_types": all_mls_property_types
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
    print_summary(all_mls_property_types)


def print_summary(all_data):
    """Print summary of PropertyType mappings across all MLSs"""

    print("\n" + "="*80)
    print("SUMMARY: PropertyType Mappings by MLS")
    print("="*80)

    for mls_data in all_data:
        mls_name = mls_data["mlsName"]
        prop_types = mls_data["propertyTypes"]

        # Filter to enabled only
        enabled_types = [pt for pt in prop_types if pt["enabled"]]

        print(f"\n{mls_name}:")
        print("-" * 40)

        if enabled_types:
            for pt in enabled_types:
                print(f"  {pt['code']} = {pt['name']}")
        else:
            print("  (No enabled property types)")

    # Print unified fetch filter template
    print("\n" + "="*80)
    print("FILTER TEMPLATES FOR unified-fetch.py")
    print("="*80)

    print("\nper-MLS filter configuration:")
    print("```python")
    print("MLS_PROPERTY_TYPES = {")

    for mls_data in all_data:
        mls_name = mls_data["mlsName"]
        enabled_codes = [pt["code"] for pt in mls_data["propertyTypes"] if pt["enabled"]]

        print(f"    '{mls_name}': {enabled_codes},")

    print("}")
    print("```")

    # Check if all MLSs use same codes
    print("\n" + "="*80)
    print("CROSS-MLS ANALYSIS")
    print("="*80)

    # Build code→name mapping per MLS
    code_mappings = {}
    for mls_data in all_data:
        mls_name = mls_data["mlsName"]
        code_mappings[mls_name] = {
            pt["code"]: pt["name"]
            for pt in mls_data["propertyTypes"]
            if pt["enabled"]
        }

    # Find all unique codes
    all_codes = set()
    for mappings in code_mappings.values():
        all_codes.update(mappings.keys())

    print(f"\nAll PropertyType codes found: {sorted(all_codes)}")

    # Check consistency
    print("\nCode consistency check:")
    for code in sorted(all_codes):
        names_for_code = set()
        mls_with_code = []

        for mls_name, mappings in code_mappings.items():
            if code in mappings:
                names_for_code.add(mappings[code])
                mls_with_code.append(mls_name)

        if len(names_for_code) == 1:
            print(f"  '{code}' = {list(names_for_code)[0]} (consistent across {len(mls_with_code)} MLSs)")
        else:
            print(f"  '{code}' = INCONSISTENT! {dict(zip(mls_with_code, [code_mappings[m][code] for m in mls_with_code]))}")

    print("\n" + "="*80 + "\n")


if __name__ == "__main__":
    main()
