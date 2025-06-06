import json
import re
import unicodedata
from pathlib import Path

# Define paths
project_root = Path(__file__).resolve().parents[4]
input_path = project_root / "local-logs" / "all_listings_with_expansions.json"
output_path = project_root / "local-logs" / "flattened_all_listings_preserved.json"

def to_camel_case(s: str) -> str:
    parts = re.sub(r'(?<!^)(?=[A-Z])', '_', s).lower().split('_')
    return parts[0] + ''.join(word.capitalize() for word in parts[1:])

def simple_slugify(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^\w\s-]", "", value).strip().lower()
    return re.sub(r"[\s]+", "-", value)

def extract_bool_keys(d: dict) -> str | None:
    if not isinstance(d, dict):
        return None
    keys = [k for k, v in d.items() if v is True]
    return ", ".join(keys) if keys else None

def camelize_keys(obj):
    if isinstance(obj, dict):
        new_obj = {}
        for k, v in obj.items():
            if v in (None, "********", [], {}):
                continue
            camel_key = to_camel_case(k)
            if isinstance(v, dict) and all(isinstance(val, bool) for val in v.values()):
                flattened = extract_bool_keys(v)
                if flattened:
                    new_obj[camel_key] = flattened
            else:
                new_obj[camel_key] = camelize_keys(v)
        return new_obj
    elif isinstance(obj, list):
        return [camelize_keys(i) for i in obj]
    else:
        return obj

def flatten_listing(raw: dict) -> dict | None:
    # ✅ Grab listing key from StandardFields
    standard = raw.get("StandardFields", {})
    listing_key = standard.get("ListingKey")
    if not listing_key:
        return None

    output = {}

    # ✅ Merge standard fields first
    output.update(camelize_keys(standard))

    # ✅ Then top-level (raw), skipping StandardFields and empty junk
    for key, value in raw.items():
        if key == "StandardFields" or value in (None, "********", [], {}):
            continue
        camel_key = to_camel_case(key)
        if camel_key not in output:
            output[camel_key] = camelize_keys(value)

    # ✅ Set slugAddress from unparsed address
    unparsed = standard.get("UnparsedAddress") or raw.get("UnparsedAddress")
    slug_address = simple_slugify(unparsed) if unparsed else "unknown"

    # ✅ Ensure slug and slugAddress are the first keys
    final = {
        "slug": listing_key,
        "slugAddress": slug_address,
    }
    final.update(output)

    return final

def run():
    print(f"📄 Loading listings from {input_path}")
    with input_path.open(encoding="utf-8") as f:
        listings = json.load(f)

    # 🔍 Print first 3 listings' available keys for inspection
    print("\n🔍 Inspecting keys in first 3 listings...\n")
    for i, listing in enumerate(listings[:3]):
        print(f"📦 Listing {i+1}:")
        print("Top-level keys:", list(listing.keys()))
        standard = listing.get("StandardFields", {})
        listing_key = standard.get("ListingKey")
        if not listing_key:
            print(f"⚠️ Missing ListingKey on listing: {listing.get('Id', 'unknown id')}")

    flattened = []
    skipped = 0

    for item in listings:
        flat = flatten_listing(item)
        if flat:
            flattened.append(flat)
        else:
            skipped += 1

    with output_path.open("w", encoding="utf-8") as f:
        json.dump(flattened, f, indent=2)

    print(f"\n✅ Flattened {len(flattened)} listings to {output_path}")
    if skipped:
        print(f"⚠️ Skipped {skipped} listings with no ListingKey")

if __name__ == "__main__":
    run()
