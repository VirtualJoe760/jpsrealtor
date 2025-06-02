import os
import requests
import json
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).resolve().parents[3] / ".env.local"
load_dotenv(dotenv_path=env_path)

ACCESS_TOKEN = os.getenv("SPARK_ACCESS_TOKEN")
LISTING_KEY = "20250206061055758248000000"  # Replace with your ListingKey

HEADERS = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "Accept": "application/json"
}

# Output directory
output_dir = Path(__file__).resolve().parents[3] / "local-logs"
output_dir.mkdir(exist_ok=True)

def fetch_listing(listing_key):
    url = f"https://replication.sparkapi.com/v1/listings/{listing_key}?_expand=Photos"
    response = requests.get(url, headers=HEADERS)
    if response.status_code != 200:
        print(f"❌ Error: {response.status_code}")
        print(response.text)
        return None

    data = response.json()
    return data.get("D", {}).get("Results", [None])[0]


def main():
    listing = fetch_listing(LISTING_KEY)
    if listing:
        # ✅ Extract and print PublicRemarks
        remarks = listing.get("StandardFields", {}).get("PublicRemarks")
        if remarks:
            print("\n📝 Public Remarks:\n")
            print(remarks)
        else:
            print("⚠️ PublicRemarks not found for this listing.")

        # Save full listing for inspection
        output_path = output_dir / f"{LISTING_KEY}.json"
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(listing, f, indent=2)
        print(f"\n✅ Full listing saved to: {output_path}")
    else:
        print("❌ No listing found or empty response.")

if __name__ == "__main__":
    main()
