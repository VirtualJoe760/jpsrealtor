import os
import json
import time
import requests
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime, timedelta, UTC
from typing import Dict, Any, List

# ──────────────────────────────────────────────────────────────
# 🌎 ENV SETUP
# ──────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = PROJECT_ROOT / ".env.local"
load_dotenv(dotenv_path=ENV_PATH)

ACCESS_TOKEN = os.getenv("SPARK_ACCESS_TOKEN") or os.getenv("SPARK_OAUTH_KEY")
if not ACCESS_TOKEN:
    raise ValueError("❌ Missing SPARK_ACCESS_TOKEN in .env.local")

HEADERS = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "Accept": "application/json",
}

SPARK_API_BASE = "https://replication.sparkapi.com/v1/listings"

# ──────────────────────────────────────────────────────────────
# 📁 PATHS
# ──────────────────────────────────────────────────────────────
PROJECT_DATE = datetime.now().strftime("%Y-%m-%d")

LOG_DIR = PROJECT_ROOT / "local-logs" / "content" / "luxury-listings" / PROJECT_DATE
LOG_DIR.mkdir(parents=True, exist_ok=True)

PHOTOS_DIR = LOG_DIR / "listing-photos"
PHOTOS_DIR.mkdir(parents=True, exist_ok=True)

INDEX_FILE = LOG_DIR / "index.json"
INPUT_FILE = PROJECT_ROOT / "local-logs" / "flattened_all_listings_preserved.json"

# ──────────────────────────────────────────────────────────────
# 🧩 HELPERS
# ──────────────────────────────────────────────────────────────
def parse_date(date_str):
    if not date_str:
        return None
    try:
        return datetime.fromisoformat(date_str.replace("Z", ""))
    except Exception:
        try:
            return datetime.strptime(date_str.split("T")[0], "%Y-%m-%d")
        except Exception:
            return None

def is_recent(date_str, days=7):
    d = parse_date(date_str)
    return d and d >= datetime.now() - timedelta(days=days)

def choose_best_uri(photo: Dict[str, Any]) -> str:
    for key in ["Uri1280", "Uri1024", "UriLarge", "Uri800", "Uri640", "Uri300"]:
        if photo.get(key):
            return photo[key]
    return ""

def load_index() -> Dict[str, Any]:
    if INDEX_FILE.exists():
        with open(INDEX_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

def save_index(index: Dict[str, Any]) -> None:
    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2, ensure_ascii=False)

# ──────────────────────────────────────────────────────────────
# 💾 PHOTO DOWNLOAD (ONLY FROM SPARK)
# ──────────────────────────────────────────────────────────────
def fetch_listing_photos(listing_key: str, retries: int = 3) -> List[Dict[str, Any]]:
    url = f"{SPARK_API_BASE}/{listing_key}/photos"
    for attempt in range(retries):
        try:
            res = requests.get(url, headers=HEADERS, timeout=10)
            if res.status_code == 200:
                return res.json().get("D", {}).get("Results", [])
            if res.status_code in (403, 404):
                return []
            if res.status_code == 429 or "over rate" in res.text.lower():
                wait = 3 + attempt * 2
                print(f"⏳ Rate limited, retrying in {wait}s...")
                time.sleep(wait)
                continue
        except Exception as e:
            if attempt == retries - 1:
                print(f"❌ Photo fetch failed for {listing_key}: {e}")
            time.sleep(2 ** attempt)
    return []

def download_listing_photos(listing_key: str, folder_name: str, limit: int = 15) -> List[str]:
    photos = fetch_listing_photos(listing_key)
    if not photos:
        print(f"⚠️ No photos found for {listing_key}")
        return []

    photos = photos[:limit]
    folder = PHOTOS_DIR / folder_name
    folder.mkdir(parents=True, exist_ok=True)

    saved = []
    for i, p in enumerate(photos, start=1):
        url = choose_best_uri(p)
        if not url:
            continue
        filename = f"{i:02d}.jpg"
        path = folder / filename
        if path.exists():
            saved.append(filename)
            continue
        try:
            r = requests.get(url, timeout=10)
            if r.ok:
                with open(path, "wb") as f:
                    f.write(r.content)
                saved.append(filename)
            else:
                print(f"⚠️ Bad status {r.status_code} for {url}")
        except Exception as e:
            print(f"⚠️ Error downloading {url}: {e}")
        time.sleep(0.3)
    return saved

# ──────────────────────────────────────────────────────────────
# 🚀 MAIN LOGIC
# ──────────────────────────────────────────────────────────────
def main():
    if not INPUT_FILE.exists():
        raise FileNotFoundError(f"❌ Input file not found: {INPUT_FILE}")

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        all_listings = json.load(f)

    # Filter for luxury (>=2M) and recent listings
    candidates = [
        l for l in all_listings
        if (l.get("listPrice") or 0) >= 2_000_000
        and is_recent(l.get("onMarketDate") or l.get("originalOnMarketTimestamp"))
    ]

    print(f"🏠 Found {len(candidates)} luxury listings in the last 7 days")

    # Save the *full* local objects, not trimmed
    run_id = datetime.now().strftime("%Y%m%d-%H%M%S")
    lux_json = LOG_DIR / f"luxury_listings_{run_id}.json"
    with open(lux_json, "w", encoding="utf-8") as f:
        json.dump(candidates, f, indent=2, ensure_ascii=False)
    print(f"💾 Saved full local listing data → {lux_json}")

    # Prompt user for photo sync
    skip = input("⏭️ Skip already-downloaded photos? (y/n): ").strip().lower() == "y"
    index = load_index()
    run_key = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%S")
    index[run_key] = []

    for l in candidates:
        slug_address = l.get("slugAddress")
        listing_key = str(l.get("listingKey") or l.get("slug"))
        if not slug_address:
            print(f"⚠️ Missing slugAddress for {listing_key}, skipping.")
            continue

        folder = PHOTOS_DIR / slug_address
        if skip and folder.exists() and any(folder.iterdir()):
            print(f"⏭️ Skipping {slug_address} (already downloaded)")
            continue
        elif not skip and folder.exists():
            print(f"🧹 Clearing existing folder for {slug_address}")
            for f in folder.glob("*"):
                f.unlink()

        print(f"📸 Fetching photos for {slug_address}...")
        files = download_listing_photos(listing_key, slug_address)
        if not files:
            continue

        entry = {
            "listingKey": listing_key,
            "slugAddress": slug_address,
            "photoCount": len(files),
            "folder": str(folder.relative_to(PROJECT_ROOT)),
            "files": files,
        }
        index[run_key].append(entry)
        print(f"✅ Saved {len(files)} photos → {folder}")
        print("──────────────────────────────")

    save_index(index)
    print(f"🪵 Index updated: {INDEX_FILE}")

# ──────────────────────────────────────────────────────────────
# 🏁 ENTRY POINT
# ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("⛔ Interrupted by user.")
    except Exception as e:
        print(f"❌ Unhandled error: {e}")
