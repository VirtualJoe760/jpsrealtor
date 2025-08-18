import os
import json
from pathlib import Path

# 🔧 Adjust this path to where your JSON files actually live
# e.g. src/app/constants/subdivisions/*.json
DATA_DIR = Path(__file__).resolve().parents[0]  # we're already inside /subdivisions

# File mapping from index.ts
files = {
    "bermuda-dunes-neighborhoods": "bermuda-dunes-neighborhoods.json",
    "cathedral-city-neighborhoods": "cathedral-city-neighborhoods.json",
    "coachella-neighborhoods": "coachella-neighborhoods.json",
    "desert-hot-springs-neighborhoods": "desert-hot-springs-neighborhoods.json",
    "indian-wells-neighborhoods": "indian-wells-neighborhoods.json",
    "indio-neighborhoods": "indio-neighborhoods.json",
    "la-quinta-neighborhoods": "la-quinta-neighborhoods.json",
    "palm-desert-neighborhoods": "palm-desert-neighborhoods.json",
    "palm-springs-neighborhoods": "palm-springs-neighborhoods.json",
    "rancho-mirage-neighborhoods": "rancho-mirage-neighborhoods.json",
    "thermal-neighborhoods": "thermal_neighborhoods.json",  # underscore is correct here
    "thousand-palms-neighborhoods": "thousand-palms-neighborhoods.json"
}

total = 0

print("📊 Subdivision Counts by File:\n")

for key, filename in files.items():
    filepath = DATA_DIR / filename
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
            count = len(data)
            total += count
            print(f"- {filename}: {count}")
    except FileNotFoundError:
        print(f"❌ File not found: {filename}")
    except json.JSONDecodeError:
        print(f"⚠️ Could not decode JSON in file: {filename}")

print(f"\n🧮 Total subdivisions across all files: {total}")
