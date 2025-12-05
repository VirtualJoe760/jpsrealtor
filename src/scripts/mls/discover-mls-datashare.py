#!/usr/bin/env python3
"""
Discover MLS IDs in Spark Data Share

Based on Diego's email (June 6, 2025):
"To get the list of all MLSs/data sources that participate in this data share,
you can use the /standardfields resource to pull metadata for the 'MlsId' field"

Usage:
    python src/scripts/mls/discover-mls-datashare.py

Output:
    - Prints all available MLS IDs
    - Saves results to local-logs/mls_datashare.json
    - Tests each MLS for active listings
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
STANDARD_API_URL = "https://sparkapi.com/v1/standardfields/MlsId"
REPLICATION_API_URL = "https://replication.sparkapi.com/v1/listings"
ACCESS_TOKEN = os.getenv("SPARK_ACCESS_TOKEN")
OAUTH_KEY = os.getenv("SPARK_OAUTH_KEY")
LOCAL_LOGS_DIR = Path(__file__).resolve().parents[3] / "local-logs"
LOCAL_LOGS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_FILE = LOCAL_LOGS_DIR / "mls_datashare.json"


def discover_mls_ids():
    """
    Discover all MLS IDs available in the data share

    Per Diego: "Use the /standardfields resource to pull metadata for the 'MlsId' field"
    URL: https://sparkapi.com/v1/standardfields/MlsId
    """

    if not ACCESS_TOKEN and not OAUTH_KEY:
        print("[ERROR] Missing Spark API credentials in .env.local")
        print("   Please ensure SPARK_ACCESS_TOKEN or SPARK_OAUTH_KEY is set.")
        exit(1)

    print("=" * 80)
    print("Discovering MLS IDs in Spark Data Share")
    print("=" * 80)
    print(f"\nEndpoint: {STANDARD_API_URL}\n")

    # Try different authentication methods
    auth_methods = []

    if OAUTH_KEY:
        auth_methods.append({
            "name": "OAuth Key",
            "headers": {
                "Authorization": f"OAuth {OAUTH_KEY}",
                "X-SparkApi-User-Agent": "JPSRealtor",
                "Accept": "application/json"
            }
        })

    if ACCESS_TOKEN:
        auth_methods.append({
            "name": "Bearer Token",
            "headers": {
                "Authorization": f"Bearer {ACCESS_TOKEN}",
                "X-SparkApi-User-Agent": "JPSRealtor",
                "Accept": "application/json"
            }
        })

    mls_list = None
    successful_auth = None

    # Try each authentication method
    for auth in auth_methods:
        print(f"Trying authentication: {auth['name']}...")

        try:
            response = requests.get(STANDARD_API_URL, headers=auth['headers'], timeout=15)

            if response.status_code == 200:
                data = response.json()

                if data.get("D", {}).get("Success"):
                    print(f"[OK] Authentication successful with {auth['name']}\n")
                    successful_auth = auth['name']

                    # Extract MLS list from FieldList
                    field_list = data.get("D", {}).get("FieldList", [])

                    if field_list:
                        mls_list = field_list
                        break
                    else:
                        print(f"[WARN] No FieldList found in response\n")
                else:
                    print(f"[WARN] API returned Success=false\n")

            elif response.status_code == 1021:
                print(f"[INFO] Endpoint restricted for {auth['name']}")
                print(f"       Message: {response.text}\n")

            else:
                print(f"[WARN] HTTP {response.status_code}: {response.text[:200]}\n")

        except Exception as e:
            print(f"[ERROR] {auth['name']} failed: {e}\n")

    # If standardfields endpoint doesn't work, try replication API method
    if not mls_list:
        print("=" * 80)
        print("Fallback: Discovering MLS IDs via Replication API Sample")
        print("=" * 80)
        print("\nFetching sample listings to extract unique MLS IDs...\n")

        mls_list = discover_via_replication_api()

    if not mls_list:
        print("\n[ERROR] Could not discover MLS IDs using any method.")
        print("\nTroubleshooting:")
        print("  1. Verify SPARK_ACCESS_TOKEN is valid")
        print("  2. Check if token has data share access")
        print("  3. Confirm token is for replication API (not standard API)")
        exit(1)

    # Process and display results
    print("\n" + "=" * 80)
    print(f"Found {len(mls_list)} MLS Association(s)")
    print("=" * 80 + "\n")

    results = []

    for idx, mls in enumerate(mls_list, 1):
        # Extract MLS ID and Name (field structure varies)
        mls_id = mls.get("Value") or mls.get("MlsId") or "Unknown"
        mls_name = mls.get("Label") or mls.get("Name") or mls.get("MlsName") or "Unknown"

        print(f"{idx}. {mls_name}")
        print(f"   MLS ID: {mls_id}")

        # Test if this MLS has active listings
        active_count = test_mls_access(mls_id, mls_name)

        if active_count is not None:
            print(f"   Active Listings: {active_count:,}")
            print(f"   Status: [OK] Accessible")
        else:
            print(f"   Status: [WARN] No access or no active listings")

        print(f"   Filter: _filter=MlsId Eq '{mls_id}'")
        print()

        results.append({
            "mls_id": mls_id,
            "mls_name": mls_name,
            "active_listings": active_count,
            "accessible": active_count is not None
        })

    # Save results
    save_results(results, successful_auth)

    # Print summary
    print_summary(results)


def discover_via_replication_api():
    """
    Fallback method: Fetch sample listings and extract unique MLS IDs
    """
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Accept": "application/json"
    }

    # Fetch sample of all active listings (no MLS filter)
    url = f"{REPLICATION_API_URL}?_filter=StandardStatus Eq 'Active'&_limit=1000"

    try:
        response = requests.get(url, headers=headers, timeout=15)

        if response.status_code != 200:
            print(f"[ERROR] Replication API returned {response.status_code}")
            return None

        data = response.json()
        listings = data.get("D", {}).get("Results", [])

        if not listings:
            print("[WARN] No listings returned from replication API")
            return None

        # Extract unique MLS IDs
        mls_map = {}

        for listing in listings:
            std_fields = listing.get("StandardFields", {})
            mls_id = std_fields.get("MlsId")
            mls_name = std_fields.get("MlsName") or std_fields.get("OriginatingSystemName") or "Unknown"

            if mls_id and mls_id not in mls_map:
                mls_map[mls_id] = mls_name

        # Convert to FieldList format
        field_list = [
            {"Value": mls_id, "Label": name}
            for mls_id, name in mls_map.items()
        ]

        print(f"[OK] Discovered {len(field_list)} unique MLS IDs from sample\n")
        return field_list

    except Exception as e:
        print(f"[ERROR] Replication API fallback failed: {e}")
        return None


def test_mls_access(mls_id, mls_name):
    """
    Test if MLS has active listings and return count

    Args:
        mls_id: MLS identifier (e.g., "20190211172710340762000000")
        mls_name: Human-readable MLS name

    Returns:
        int: Count of active listings, or None if inaccessible
    """
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Accept": "application/json"
    }

    # Get count of active listings for this MLS
    count_url = (
        f"{REPLICATION_API_URL}"
        f"?_filter=MlsId Eq '{mls_id}' And StandardStatus Eq 'Active'"
        f"&_pagination=count"
    )

    try:
        response = requests.get(count_url, headers=headers, timeout=10)

        if response.status_code == 200:
            data = response.json()
            total_rows = data.get("D", {}).get("Pagination", {}).get("TotalRows", 0)
            return total_rows
        else:
            return None

    except Exception as e:
        return None


def save_results(results, auth_method):
    """Save discovered MLS IDs to JSON file"""
    output = {
        "discovered_at": str(Path(__file__).stat().st_mtime),
        "authentication_method": auth_method,
        "total_mls_count": len(results),
        "mls_associations": results,
        "known_mls_mappings": {
            "GPS": "20190211172710340762000000",
            "CRMLS": "20200218121507636729000000"
        }
    }

    try:
        with open(OUTPUT_FILE, "w") as f:
            json.dump(output, f, indent=2)

        print(f"\n>>> Results saved to: {OUTPUT_FILE}")

    except Exception as e:
        print(f"\n[ERROR] Failed to save results: {e}")


def print_summary(results):
    """Print summary of discovered MLSs"""
    print("\n" + "=" * 80)
    print("Summary")
    print("=" * 80)

    accessible = [r for r in results if r['accessible']]
    inaccessible = [r for r in results if not r['accessible']]

    print(f"\nTotal MLSs Discovered: {len(results)}")
    print(f"  Accessible: {len(accessible)}")
    print(f"  Inaccessible/Empty: {len(inaccessible)}")

    if accessible:
        total_listings = sum(r['active_listings'] or 0 for r in accessible)
        print(f"\nTotal Active Listings: {total_listings:,}")

        print("\nAccessible MLSs:")
        for r in accessible:
            print(f"  - {r['mls_name']}: {r['active_listings']:,} listings")

    # Check known MLSs
    print("\n" + "=" * 80)
    print("Verification: Known MLS IDs")
    print("=" * 80)

    known_mls = {
        "GPS MLS": "20190211172710340762000000",
        "CRMLS": "20200218121507636729000000"
    }

    for name, mls_id in known_mls.items():
        found = next((r for r in results if r['mls_id'] == mls_id), None)

        if found:
            if found['accessible']:
                print(f"  [OK] {name}: {found['active_listings']:,} active listings")
            else:
                print(f"  [WARN] {name}: Found but no active listings")
        else:
            print(f"  [ERROR] {name}: NOT found in data share")

    print("\n" + "=" * 80)
    print("Next Steps")
    print("=" * 80)
    print("\n1. Update unified-fetch.py MLS_IDS dict with discovered IDs")
    print("2. Test fetching from each accessible MLS")
    print("3. Update documentation with MLS mappings")
    print("\nExample for unified-fetch.py:")
    print("\nMLS_IDS = {")
    for r in accessible:
        safe_name = r['mls_name'].replace(" ", "_").replace("/", "_").upper()
        print(f'    "{safe_name}": "{r["mls_id"]}",')
    print("}\n")


if __name__ == "__main__":
    discover_mls_ids()
