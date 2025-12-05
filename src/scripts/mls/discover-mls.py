#!/usr/bin/env python3
"""
MLS Discovery Script

Purpose: Discover which MLS associations are accessible via Spark Replication API
Based on Diego's data share guidance

Usage:
    python src/scripts/mls/discover-mls.py
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

BASE_URL = "https://replication.sparkapi.com/v1/listings"
ACCESS_TOKEN = os.getenv("SPARK_ACCESS_TOKEN")

def discover_mls_associations():
    """Fetch a sample of listings and extract unique MLS IDs"""

    if not ACCESS_TOKEN:
        print("❌ ERROR: SPARK_ACCESS_TOKEN is missing in .env.local")
        return

    print("Discovering available MLS associations via Spark Replication API...\n")

    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Accept": "application/json"
    }

    # Fetch listings WITHOUT MLS filter to see all available MLSs
    # We'll fetch a sample and count unique MLS IDs
    url = f"{BASE_URL}?_limit=1000&_filter=StandardStatus Eq 'Active'"

    print(f"Fetching sample listings to discover MLS associations...")
    print(f"   URL: {url}\n")

    try:
        response = requests.get(url, headers=headers, timeout=15)

        if response.status_code != 200:
            print(f"❌ API Error {response.status_code}: {response.text}")
            return

        data = response.json()
        listings = data.get("D", {}).get("Results", [])

        if not listings:
            print("⚠️  No listings found. Check your API credentials.")
            return

        # Count MLS IDs
        mls_counts = defaultdict(lambda: {"count": 0, "name": None})

        for listing in listings:
            mls_id = listing.get("MlsId")
            mls_name = listing.get("MlsName") or listing.get("ListOfficeName", "Unknown")

            if mls_id:
                mls_counts[mls_id]["count"] += 1
                if not mls_counts[mls_id]["name"]:
                    mls_counts[mls_id]["name"] = mls_name

        # Display results
        print(f"\n>>> Found {len(mls_counts)} MLS association(s) in sample:\n")
        print("=" * 80)

        for index, (mls_id, data) in enumerate(sorted(mls_counts.items(), key=lambda x: x[1]["count"], reverse=True), 1):
            print(f"\n{index}. MLS ID: {mls_id}")
            print(f"   Listings in sample: {data['count']}")
            print(f"   Example MLS Name: {data['name']}")
            print(f"   Filter: _filter=MlsId Eq '{mls_id}'")

        print("\n" + "=" * 80)

        # Known MLS mappings
        print("\n>>> Known MLS ID Mappings (from your current data):\n")
        print("   GPS MLS:   20190211172710340762000000")
        print("   CRMLS:     20200218121507636729000000")

        # Verify known MLSs
        known_mlss = {
            "20190211172710340762000000": "GPS MLS",
            "20200218121507636729000000": "CRMLS"
        }

        print("\n>>> Verifying your current MLS access:\n")

        for mls_id, name in known_mlss.items():
            if mls_id in mls_counts:
                print(f"   [OK] {name}: Access confirmed ({mls_counts[mls_id]['count']} listings in sample)")
            else:
                print(f"   [WARN] {name}: Not found in sample (may not have active listings)")

        # Test individual MLS access
        print("\n>>> Testing individual MLS access...\n")

        for mls_id in mls_counts.keys():
            test_url = f"{BASE_URL}?_filter=MlsId Eq '{mls_id}' And StandardStatus Eq 'Active'&_limit=1"
            test_response = requests.get(test_url, headers=headers, timeout=10)

            if test_response.status_code == 200:
                test_data = test_response.json()
                count = len(test_data.get("D", {}).get("Results", []))
                if count > 0:
                    print(f"[OK] {mls_id}: Accessible")
                else:
                    print(f"[WARN] {mls_id}: No active listings")
            else:
                print(f"[ERROR] {mls_id}: Failed to access")

        # Recommendations
        print("\n>>> Next Steps:\n")
        print("1. Update your sync scripts to fetch from all discovered MLSs")
        print("2. Create a unified collection with standardized RESO field names:")
        print("   - BedroomsTotal (not bedsTotal/bedroomsTotal)")
        print("   - BathroomsTotalInteger (not bathroomsFull)")
        print("   - ListPrice (consistent across all MLSs)")
        print("   - StandardStatus (Active, Pending, Closed, Expired)")
        print("\n3. Example sync query for all MLSs:")
        print(f"   {BASE_URL}?_filter=StandardStatus Eq 'Active'&_limit=500")
        print("   This will fetch from ALL MLSs you have access to")
        print("\n4. Or filter by specific MLS:")
        for mls_id in list(mls_counts.keys())[:2]:
            print(f"   {BASE_URL}?_filter=MlsId Eq '{mls_id}'&_limit=500")

        # Save results to file
        output_file = Path(__file__).resolve().parents[3] / "local-logs" / "mls_discovery_results.json"
        output_file.parent.mkdir(parents=True, exist_ok=True)

        results = {
            "discovered_mls": [
                {
                    "mls_id": mls_id,
                    "sample_count": data["count"],
                    "example_name": data["name"]
                }
                for mls_id, data in mls_counts.items()
            ],
            "known_mls": known_mlss,
            "timestamp": str(Path(__file__).stat().st_mtime)
        }

        with open(output_file, "w") as f:
            json.dump(results, f, indent=2)

        print(f"\n>>> Results saved to: {output_file}")

    except requests.RequestException as e:
        print(f"\n[ERROR] Request error: {e}")
    except Exception as e:
        print(f"\n[ERROR] Unexpected error: {e}")

if __name__ == "__main__":
    discover_mls_associations()
    print("\n>>> MLS discovery complete!\n")
