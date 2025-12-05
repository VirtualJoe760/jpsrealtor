#!/usr/bin/env python3
"""
Test Closed Listings Query for CMA Data

Tests fetching closed listings from the past 5 years for CMA analysis.
"""

import os
import json
import requests
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime, timedelta

# Load environment
env_path = Path(__file__).resolve().parents[3] / ".env.local"
load_dotenv(dotenv_path=env_path)

ACCESS_TOKEN = os.getenv("SPARK_ACCESS_TOKEN")

# Calculate 5 years ago
five_years_ago = (datetime.now() - timedelta(days=365*5)).strftime("%Y-%m-%d")

print("="*80)
print("TESTING CLOSED LISTINGS - LAST 5 YEARS")
print("="*80)
print(f"Date filter: CloseDate Ge {five_years_ago}")
print()

url = "https://replication.sparkapi.com/v1/listings"

headers = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "Accept": "application/json"
}

MLS_ID_GPS = "20190211172710340762000000"

# Test 1: Just Closed status (no date filter)
print("Test 1: All Closed listings (GPS MLS)")
print("-" * 40)

params1 = {
    "_filter": f"MlsId Eq '{MLS_ID_GPS}' And StandardStatus Eq 'Closed'",
    "_limit": 10
}

try:
    response = requests.get(url, params=params1, headers=headers, timeout=15)

    if response.status_code == 200:
        data = response.json()
        results = data.get("D", {}).get("Results", [])
        pagination = data.get("D", {}).get("Pagination", {})
        total_rows = pagination.get("TotalRows", 0)

        print(f"[OK] Success! Found {len(results)} results in this batch")
        print(f"Total available: {total_rows:,} closed listings")

        if results:
            sample = results[0].get("StandardFields", {})
            close_price = sample.get("ClosePrice")
            print(f"Sample CloseDate: {sample.get('CloseDate')}")
            print(f"Sample ClosePrice: ${close_price:,}" if close_price else "ClosePrice: None")
            print(f"Sample Address: {sample.get('UnparsedAddress')}")
    else:
        print(f"[ERROR] HTTP {response.status_code}")
        error_data = response.json().get("D", {})
        print(f"Message: {error_data.get('Message', 'Unknown error')}")

except Exception as e:
    print(f"[ERROR] Exception: {e}")

print()

# Test 2: Closed with date filter
print("Test 2: Closed listings (last 5 years)")
print("-" * 40)

params2 = {
    "_filter": f"MlsId Eq '{MLS_ID_GPS}' And StandardStatus Eq 'Closed' And CloseDate Ge {five_years_ago}",
    "_limit": 10
}

try:
    response = requests.get(url, params=params2, headers=headers, timeout=15)

    if response.status_code == 200:
        data = response.json()
        results = data.get("D", {}).get("Results", [])
        pagination = data.get("D", {}).get("Pagination", {})
        total_rows = pagination.get("TotalRows", 0)

        print(f"[OK] Success! Found {len(results)} results in this batch")
        print(f"Total available: {total_rows:,} closed listings (5 years)")

        if results:
            # Get date range
            close_dates = [r.get("StandardFields", {}).get("CloseDate")
                          for r in results
                          if r.get("StandardFields", {}).get("CloseDate")]

            if close_dates:
                close_dates_sorted = sorted(close_dates, reverse=True)
                print(f"Date range in sample:")
                print(f"  Newest: {close_dates_sorted[0]}")
                print(f"  Oldest: {close_dates_sorted[-1]}")
    else:
        print(f"[ERROR] HTTP {response.status_code}")
        error_data = response.json().get("D", {})
        print(f"Message: {error_data.get('Message', 'Unknown error')}")

except Exception as e:
    print(f"[ERROR] Exception: {e}")

print()

# Test 3: Estimate across all 8 MLSs
print("="*80)
print("ESTIMATE: CLOSED LISTINGS ACROSS ALL 8 MLSs (LAST 5 YEARS)")
print("="*80)

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

total_closed = 0

for mls_name, mls_id in MLS_IDS.items():
    params_count = {
        "_filter": f"MlsId Eq '{mls_id}' And StandardStatus Eq 'Closed' And CloseDate Ge {five_years_ago}",
        "_limit": 1
    }

    try:
        response = requests.get(url, params=params_count, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            pagination = data.get("D", {}).get("Pagination", {})
            total_rows = pagination.get("TotalRows", 0)
            total_closed += total_rows
            print(f"{mls_name:20s}: {total_rows:>8,} closed listings")
    except Exception as e:
        print(f"{mls_name:20s}: Error - {e}")

print("-" * 40)
print(f"{'TOTAL':20s}: {total_closed:>8,} closed listings")
print()

# Calculate multiplier vs active listings
active_listings = 87604  # From mls_datashare_complete.json
if total_closed > 0:
    multiplier = total_closed / active_listings
    print(f"Active listings: {active_listings:,}")
    print(f"Closed listings (5 years): {total_closed:,}")
    print(f"Multiplier: {multiplier:.1f}x")
    print(f"Total database size: {active_listings + total_closed:,} listings")

print("\n" + "="*80)
