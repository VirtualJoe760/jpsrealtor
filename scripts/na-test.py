#!/usr/bin/env python3
"""
DIAGNOSTIC: Find "Not Applicable" SFR in Palm Desert 92260
Output: F:\web-clients\joseph-sardella\jpsrealtor\local-logs\na-test-results.json
"""

import os
import sys
import json
from datetime import datetime
from typing import List, Dict, Any

from pymongo import MongoClient
from dotenv import load_dotenv

# --------------------------------------------------------------------------- #
# Load .env (from project root)
# --------------------------------------------------------------------------- #
env_path = os.path.join(os.path.dirname(__file__), "..", ".env.local")
load_dotenv(env_path)

MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    sys.exit("Error: MONGODB_URI not found in .env.local")

# --------------------------------------------------------------------------- #
# Fixed output path
# --------------------------------------------------------------------------- #
OUTPUT_DIR = r"F:\web-clients\joseph-sardella\jpsrealtor\local-logs"
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "na-test-results.json")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# --------------------------------------------------------------------------- #
# Helper
# --------------------------------------------------------------------------- #
def price_bracket(price: float | None) -> str:
    if not price or price <= 0:
        return "Unknown"
    limits = [
        (300_000, "$0-299K"), (500_000, "$300-499K"), (700_000, "$500-699K"),
        (1_000_000, "$700-999K"), (1_500_000, "$1M-1.5M"), (2_000_000, "$1.5M-2M"),
        (3_000_000, "$2M-3M"), (5_000_000, "$3M-5M"), (10_000_000, "$5M-10M")
    ]
    for limit, label in limits:
        if price < limit:
            return label
    return "$10M+"

# --------------------------------------------------------------------------- #
def main() -> None:
    print("\n" + "="*80)
    print("DIAGNOSTIC: NOT APPLICABLE SFR – PALM DESERT 92260")
    print("="*80 + "\n")

    client = MongoClient(MONGODB_URI)
    db = client.get_database()
    coll = db["listings"]
    print(f"Connected → {db.name}.{coll.name}\n")

    # ------------------------------------------------------------------- #
    # 1. EXACT QUERY
    # ------------------------------------------------------------------- #
    exact_query = {
        "subdivisionName": {"$regex": "^Not Applicable$", "$options": "i"},
        "city": {"$regex": "^Palm Desert$", "$options": "i"},
        "postalCode": "92260",
        "propertySubType": {"$regex": "Single Family", "$options": "i"},
        "propertyType": "A",
        "standardStatus": "Active",
    }

    print("RUNNING EXACT QUERY:")
    for k, v in exact_query.items():
        print(f"   {k}: {v}")
    print()

    results = list(coll.find(exact_query))
    print(f"Exact matches → {len(results)}\n")

    # ------------------------------------------------------------------- #
    # 2. FALLBACK: Any NA variant
    # ------------------------------------------------------------------- #
    if not results:
        print("No exact matches → trying FALLBACK (N/A, null, etc.)…\n")
        fallback_query = exact_query.copy()
        fallback_query["subdivisionName"] = {
            "$in": ["Not Applicable", "not applicable", "N/A", "n/a", "NA", "na", "", None]
        }
        results = list(coll.find(fallback_query))
        print(f"Fallback matches → {len(results)}\n")

    # ------------------------------------------------------------------- #
    # 3. BROAD: All SFR in 92260
    # ------------------------------------------------------------------- #
    if not results:
        print("Still nothing → broadening to ALL SFR in 92260…\n")
        broad_query = {
            "city": {"$regex": "^Palm Desert$", "$options": "i"},
            "postalCode": "92260",
            "propertySubType": {"$regex": "Single Family", "$options": "i"},
            "propertyType": "A",
            "standardStatus": "Active",
        }
        broad = list(coll.find(broad_query))
        print(f"Broad SFR count → {len(broad)}\n")

        # Subdivision distribution
        subdiv_cnt: Dict[str, int] = {}
        for doc in broad:
            sub = doc.get("subdivisionName") or "‹null›"
            subdiv_cnt[sub] = subdiv_cnt.get(sub, 0) + 1

        print("SUBDIVISION DISTRIBUTION (top 20):")
        for sub, cnt in sorted(subdiv_cnt.items(), key=lambda x: x[1], reverse=True)[:20]:
            print(f"   {sub!r}: {cnt}")
        print("\n'Not Applicable' missing? → Check MLS ingestion pipeline.")
    else:
        broad = results  # Use exact/fallback results for processing

    # ------------------------------------------------------------------- #
    # 4. PROCESS RESULTS
    # ------------------------------------------------------------------- #
    processed: List[Dict[str, Any]] = []
    for idx, doc in enumerate(results, 1):
        price = doc.get("listPrice") or doc.get("currentPrice")
        entry = {
            "index": idx,
            "listingKey": doc.get("listingKey"),
            "address": doc.get("unparsedAddress") or doc.get("address"),
            "street": doc.get("streetName"),
            "subdivision": doc.get("subdivisionName"),
            "price": price,
            "bracket": price_bracket(price),
            "beds": doc.get("bedsTotal") or doc.get("bedroomsTotal"),
            "baths": doc.get("bathroomsTotalInteger"),
            "sqft": doc.get("livingArea"),
            "lat": doc.get("latitude"),
            "lon": doc.get("longitude"),
            "status": doc.get("standardStatus"),
            "propertyType": doc.get("propertyType"),
        }
        processed.append(entry)

        print(f"{idx}. {entry['address']}")
        print(f"   Sub: {entry['subdivision']}")
        print(f"   Price: ${entry['price']:,.0f} ({entry['bracket']})" if entry['price'] else "   Price: N/A")
        print(f"   Beds/Baths: {entry['beds']}/{entry['baths']} • {entry['sqft']:,} sqft")
        print(f"   Coords: ({entry['lat']}, {entry['lon']})\n")

    # ------------------------------------------------------------------- #
    # 5. STREET GROUPING
    # ------------------------------------------------------------------- #
    streets: Dict[str, List[Dict]] = {}
    for p in processed:
        streets.setdefault(p.get("street") or "‹unknown›", []).append(p)

    print("\nSTREET GROUPING:")
    for st, lst in sorted(streets.items(), key=lambda x: len(x[1]), reverse=True):
        print(f"\n{st} – {len(lst)} listing(s)")
        for p in lst:
            print(f"   • {p['address']}  ${p['price']:,.0f} ({p['bracket']})" if p['price'] else f"   • {p['address']}")

    # ------------------------------------------------------------------- #
    # 6. SAVE TO FIXED PATH
    # ------------------------------------------------------------------- #
    output_payload = {
        "generatedAt": datetime.utcnow().isoformat() + "Z",
        "query": exact_query,
        "totalFound": len(processed),
        "results": processed,
        "streetSummary": {s: len(l) for s, l in streets.items()},
        "diagnostics": {
            "exactMatches": len(list(coll.find(exact_query))),
            "fallbackMatches": len(list(coll.find({**exact_query, "subdivisionName": {"$in": ["N/A", "", None]}}))),
            "broadSFRCount": len(list(coll.find({
                "city": {"$regex": "^Palm Desert$", "$options": "i"},
                "postalCode": "92260",
                "propertySubType": {"$regex": "Single Family", "$options": "i"},
                "propertyType": "A",
                "standardStatus": "Active",
            })))
        }
    }

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output_payload, f, indent=2, ensure_ascii=False)

    print(f"\nSUCCESS: Results saved to:")
    print(f"   {OUTPUT_PATH}")
    print(f"   Total listings: {len(processed)}")
    print(f"   Unique streets: {len(streets)}")

    client.close()
    print("\n" + "="*80)
    print("DIAGNOSTIC COMPLETE")
    print("="*80)


if __name__ == "__main__":
    main()