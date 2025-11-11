import os
import json
import requests
from datetime import datetime
from pathlib import Path

# ──────────────────────────────────────────────────────────────
# 📁 PATHS
# ──────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parents[2]
TODAY = datetime.now().strftime("%Y-%m-%d")

LUX_DIR = PROJECT_ROOT / "local-logs" / "content" / "luxury-listings" / TODAY
LUX_DIR.mkdir(parents=True, exist_ok=True)

PROMPT_FILE = PROJECT_ROOT / "src" / "content" / "prompt" / "script.txt"

SCRIPTS_DIR = LUX_DIR / "scripts"
SCRIPTS_DIR.mkdir(parents=True, exist_ok=True)

INDEX_FILE = SCRIPTS_DIR / "scripts_index.json"

# ──────────────────────────────────────────────────────────────
# ⚙️ SETTINGS
# ──────────────────────────────────────────────────────────────
OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL = "llama3.1"
TEMPERATURE = 0.8

# ──────────────────────────────────────────────────────────────
# 🧩 HELPERS
# ──────────────────────────────────────────────────────────────
def load_latest_luxury_json():
    lux_files = sorted(LUX_DIR.glob("luxury_listings_*.json"), reverse=True)
    if not lux_files:
        raise FileNotFoundError(f"❌ No luxury_listings_*.json found in {LUX_DIR}")
    latest = lux_files[0]
    print(f"🗂️ Using data from {latest.name}")
    with open(latest, "r", encoding="utf-8") as f:
        return json.load(f)

def load_prompt_template() -> str:
    if not PROMPT_FILE.exists():
        raise FileNotFoundError(f"❌ Missing prompt file: {PROMPT_FILE}")
    with open(PROMPT_FILE, "r", encoding="utf-8") as f:
        return f.read().strip()

def load_index():
    if INDEX_FILE.exists():
        with open(INDEX_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

def save_index(index):
    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2, ensure_ascii=False)

def generate_with_ollama(system_prompt: str, listing_data: dict) -> str:
    payload = {
        "model": MODEL,
        "options": {"temperature": TEMPERATURE},
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(listing_data, ensure_ascii=False, indent=2)}
        ],
        "stream": False
    }

    res = requests.post(OLLAMA_URL, json=payload)
    if not res.ok:
        raise RuntimeError(f"Ollama API error: {res.status_code} {res.text}")

    data = res.json()
    return data.get("message", {}).get("content", "").strip()

# ──────────────────────────────────────────────────────────────
# 🚀 MAIN
# ──────────────────────────────────────────────────────────────
def main():
    listings = load_latest_luxury_json()
    template = load_prompt_template()
    index = load_index()
    run_key = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    index[run_key] = []

    for l in listings:
        slug = l.get("slugAddress") or l.get("address")
        if not slug:
            print(f"⚠️ Skipping listing missing slugAddress: {l.get('listingKey')}")
            continue

        out_file = SCRIPTS_DIR / f"{slug}.txt"
        if out_file.exists():
            print(f"⏭️ Skipping {slug} (already generated)")
            continue

        listing_data = {
            "unparsedAddress": l.get("unparsedAddress") or l.get("address"),
            "slugAddress": l.get("slugAddress"),
            "city": l.get("city"),
            "currentPricePublic": l.get("currentPricePublic") or l.get("listPrice"),
            "bedsTotal": l.get("bedsTotal"),
            "bathsTotal": l.get("bathsTotal") or l.get("bathroomsTotalDecimal"),
            "buildingAreaTotal": l.get("buildingAreaTotal") or l.get("livingArea"),
            "poolYN": l.get("poolYN"),
            "spaYN": l.get("spaYN"),
            "yearBuilt": l.get("yearBuilt"),
            "view": l.get("view"),
            "subdivisionName": l.get("subdivisionName"),
            "publicRemarks": l.get("publicRemarks") or l.get("remarks"),
        }

        print(f"🧠 Generating script for {slug}...")
        try:
            response = generate_with_ollama(template, listing_data)
            with open(out_file, "w", encoding="utf-8") as f:
                f.write(response)
            index[run_key].append({
                "slugAddress": slug,
                "listingKey": l.get("listingKey"),
                "output": str(out_file.relative_to(LUX_DIR))
            })
            print(f"✅ Saved script → {out_file}")
        except Exception as e:
            print(f"❌ Failed to generate {slug}: {e}")

    save_index(index)
    print(f"🪵 Index updated: {INDEX_FILE}")

# ──────────────────────────────────────────────────────────────
# 🏁 ENTRY
# ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("⛔ Interrupted by user.")
    except Exception as e:
        print(f"❌ Unhandled error: {e}")
