import os
import json
import requests
from dotenv import load_dotenv
from pathlib import Path

# ─────────────────────────────────────────────
# 🌎 ENV & PATHS
# ─────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parents[2]  # up to /jpsrealtor/
ENV_PATH = PROJECT_ROOT / ".env.local"
load_dotenv(dotenv_path=ENV_PATH)

api_key = os.getenv("HEYGEN_API_KEY")
if not api_key:
    raise SystemExit("❌ Missing HEYGEN_API_KEY in .env.local")

# Output directory for test responses
OUTPUT_DIR = PROJECT_ROOT / "local-logs" / "content"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_FILE = OUTPUT_DIR / "test-response.json"

# ─────────────────────────────────────────────
# 🚀 Fetch HeyGen Avatars
# ─────────────────────────────────────────────
print("📡 Fetching HeyGen avatars list...")

res = requests.get(
    "https://api.heygen.com/v2/avatars",
    headers={"X-Api-Key": api_key, "Accept": "application/json"},
)

print(f"Status Code: {res.status_code}")

# Try to decode JSON (handle non-JSON responses gracefully)
try:
    data = res.json()
except Exception as e:
    data = {"error": f"Failed to parse JSON: {e}", "text": res.text}

# ─────────────────────────────────────────────
# 💾 Save response to file
# ─────────────────────────────────────────────
with open(OUT_FILE, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"✅ Response written to {OUT_FILE}")

# ─────────────────────────────────────────────
# 🧾 Print summary of avatars if available
# ─────────────────────────────────────────────
avatars = data.get("data", [])
if avatars and isinstance(avatars, list):
    print(f"\n🎭 Found {len(avatars)} avatars:")
    for a in avatars:
        avatar_id = a.get("avatar_id")
        name = a.get("avatar_name") or a.get("name")
        print(f" → {avatar_id}  |  {name}")
else:
    print("\n⚠️ No avatars found or unauthorized request. Check your API key and plan.")
