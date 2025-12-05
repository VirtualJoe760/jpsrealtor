#!/usr/bin/env python3
"""
Get All MLS IDs from Spark Data Share

Based on Diego's email (June 6, 2025):
"To get the list of all MLSs/data sources that participate in this data share,
you can use the /standardfields resource to pull metadata for the 'MlsId' field"

Endpoint: https://replication.sparkapi.com/v1/standardfields/MlsId

Usage:
    python src/scripts/mls/get-all-mls-ids.py
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
STANDARDFIELDS_URL = "https://replication.sparkapi.com/v1/standardfields/MlsId"
LISTINGS_URL = "https://replication.sparkapi.com/v1/listings"
ACCESS_TOKEN = os.getenv("SPARK_ACCESS_TOKEN")
LOCAL_LOGS_DIR = Path(__file__).resolve().parents[3] / "local-logs"
LOCAL_LOGS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_FILE = LOCAL_LOGS_DIR / "mls_datashare_complete.json"


def get_all_mls_ids():
    """
    Fetch all MLS IDs from Spark data share using /standardfields/MlsId endpoint
    Per Diego's guidance
    """

    if not ACCESS_TOKEN:
        print("[ERROR] SPARK_ACCESS_TOKEN is missing in .env.local")
        exit(1)

    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Accept": "application/json"
    }

    print("=" * 80)
    print("Fetching MLS Data Share List from Spark API")
    print("=" * 80)
    print(f"\nEndpoint: {STANDARDFIELDS_URL}")
    print("Method: Per Diego's email (June 6, 2025)\n")

    try:
        # Fetch MLS list from standardfields endpoint
        response = requests.get(STANDARDFIELDS_URL, headers=headers, timeout=15)

        if response.status_code != 200:
            print(f"[ERROR] HTTP {response.status_code}: {response.text}")
            exit(1)

        data = response.json()

        if not data.get("D", {}).get("Success"):
            print("[ERROR] API returned Success=false")
            exit(1)

        # Extract FieldList from response
        results = data.get("D", {}).get("Results", [])

        if not results:
            print("[ERROR] No results in response")
            exit(1)

        mls_data = results[0].get("MlsId", {})
        field_list = mls_data.get("FieldList", [])

        if not field_list:
            print("[ERROR] No FieldList found in response")
            exit(1)

        print(f"[OK] Found {len(field_list)} MLS association(s) in data share\n")
        print("=" * 80)

        # Process each MLS
        mls_results = []

        for idx, mls in enumerate(field_list, 1):
            mls_name = mls.get("Name")
            mls_id = mls.get("Value")
            applies_to = mls.get("AppliesTo", [])

            print(f"\n{idx}. {mls_name}")
            print(f"   MLS ID: {mls_id}")
            print(f"   Property Types: {', '.join(applies_to)}")

            # Test active listing count
            print(f"   Testing access...", end=" ", flush=True)
            active_count = get_active_listing_count(mls_id, headers)

            if active_count is not None:
                print(f"[OK] {active_count:,} active listings")
                status = "accessible"
            else:
                print(f"[WARN] No access or no active listings")
                status = "inaccessible"

            # Example filter URL
            filter_url = f"{LISTINGS_URL}?_filter=MlsId eq '{mls_id}'"
            print(f"   Filter: {filter_url}")

            mls_results.append({
                "name": mls_name,
                "mls_id": mls_id,
                "short_name": generate_short_name(mls_name),
                "property_types": applies_to,
                "active_listings": active_count,
                "status": status,
                "filter_url": filter_url
            })

        print("\n" + "=" * 80)

        # Save results
        save_results(mls_results, field_list)

        # Print summary
        print_summary(mls_results)

        return mls_results

    except Exception as e:
        print(f"\n[ERROR] {e}")
        exit(1)


def get_active_listing_count(mls_id, headers):
    """
    Get count of active listings for a specific MLS

    Args:
        mls_id: 26-digit MLS identifier
        headers: Request headers with auth

    Returns:
        int: Count of active listings, or None if inaccessible
    """
    count_url = (
        f"{LISTINGS_URL}"
        f"?_filter=MlsId eq '{mls_id}' and StandardStatus eq 'Active'"
        f"&_pagination=count"
    )

    try:
        response = requests.get(count_url, headers=headers, timeout=10)

        if response.status_code == 200:
            data = response.json()
            total_rows = data.get("D", {}).get("Pagination", {}).get("TotalRows", 0)
            return total_rows if total_rows > 0 else None
        else:
            return None

    except Exception:
        return None


def generate_short_name(mls_name):
    """Generate a short code-friendly name for MLS"""
    # Remove special characters and convert to uppercase
    short = mls_name.replace("®", "").replace("Association of ", "")
    short = short.replace("REALTORS", "").replace("Realtors", "")
    short = short.strip()

    # Convert to uppercase and replace spaces with underscores
    short = short.upper().replace(" ", "_")

    # Remove common words
    short = short.replace("MULTIPLE_LISTING_SERVICE", "MLS")
    short = short.replace("_MLS_MLS", "_MLS")

    return short


def save_results(mls_results, field_list):
    """Save MLS data to JSON file"""

    accessible = [m for m in mls_results if m['status'] == 'accessible']
    total_listings = sum(m['active_listings'] or 0 for m in accessible)

    output = {
        "discovered_at": "2025-12-04T04:50:00Z",
        "source": "Spark Replication API - /v1/standardfields/MlsId",
        "method": "Per Diego Hernandez email (June 6, 2025)",
        "total_mls_count": len(mls_results),
        "accessible_count": len(accessible),
        "total_active_listings": total_listings,
        "mls_associations": mls_results,
        "unified_fetch_config": {
            "description": "Use these MLS_IDS in unified-fetch.py",
            "MLS_IDS": {
                m['short_name']: m['mls_id']
                for m in mls_results
            }
        },
        "raw_field_list": field_list
    }

    try:
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2)

        print(f"\n>>> Results saved to: {OUTPUT_FILE}")

    except Exception as e:
        print(f"\n[ERROR] Failed to save results: {e}")


def print_summary(mls_results):
    """Print summary of discovered MLSs"""

    accessible = [m for m in mls_results if m['status'] == 'accessible']
    inaccessible = [m for m in mls_results if m['status'] == 'inaccessible']

    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)

    print(f"\nTotal MLS Associations: {len(mls_results)}")
    print(f"  Accessible: {len(accessible)}")
    print(f"  Inaccessible/Empty: {len(inaccessible)}")

    if accessible:
        total_listings = sum(m['active_listings'] or 0 for m in accessible)
        print(f"\nTotal Active Listings Available: {total_listings:,}")

        print("\n" + "-" * 80)
        print("ACCESSIBLE MLS ASSOCIATIONS")
        print("-" * 80)

        for m in accessible:
            print(f"\n  {m['name']}")
            print(f"    ID: {m['mls_id']}")
            print(f"    Active Listings: {m['active_listings']:,}")
            print(f"    Short Name: {m['short_name']}")

    if inaccessible:
        print("\n" + "-" * 80)
        print("INACCESSIBLE MLS ASSOCIATIONS")
        print("-" * 80)

        for m in inaccessible:
            print(f"\n  {m['name']}")
            print(f"    ID: {m['mls_id']}")
            print(f"    Status: No active listings or no access")

    # Generate code snippet
    print("\n" + "=" * 80)
    print("CODE SNIPPET FOR unified-fetch.py")
    print("=" * 80)
    print("\nMLS_IDS = {")

    for m in accessible:
        print(f'    "{m["short_name"]}": "{m["mls_id"]}",  # {m["active_listings"]:,} listings')

    print("}\n")

    # Usage examples
    print("=" * 80)
    print("USAGE EXAMPLES")
    print("=" * 80)

    if accessible:
        first_mls = accessible[0]
        print(f"\n# Fetch from {first_mls['name']} only:")
        print(f'python unified-fetch.py --mls {first_mls["short_name"]}')

        if len(accessible) > 1:
            print(f"\n# Fetch from multiple MLSs:")
            mls_names = " ".join([m["short_name"] for m in accessible[:2]])
            print(f'python unified-fetch.py --mls {mls_names}')

        print(f"\n# Fetch from ALL accessible MLSs:")
        print(f'python unified-fetch.py')

    print("\n" + "=" * 80 + "\n")


if __name__ == "__main__":
    get_all_mls_ids()
