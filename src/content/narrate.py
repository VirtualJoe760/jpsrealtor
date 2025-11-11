import os
import requests
import wave
import contextlib
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# ─────────────────────────────────────────────
# 🌎 ENV SETUP
# ─────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = PROJECT_ROOT / ".env.local"
load_dotenv(dotenv_path=ENV_PATH)

API_KEY = os.getenv("ELEVENLABS_API_KEY")
VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "27790b4c-43de-4b69-bf6a-6677bf99f820")

if not API_KEY:
    raise ValueError("❌ Missing ELEVENLABS_API_KEY in .env.local")

# ─────────────────────────────────────────────
# 📁 DIRECTORIES
# ─────────────────────────────────────────────
TODAY = datetime.now().strftime("%Y-%m-%d")
BASE_DIR = PROJECT_ROOT / "local-logs" / "content" / "luxury-listings" / TODAY
SCRIPTS_DIR = BASE_DIR / "scripts"
OUTPUT_DIR = BASE_DIR / "narrations"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ─────────────────────────────────────────────
# 🎤 ELEVENLABS CONFIG
# ─────────────────────────────────────────────
API_URL = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
HEADERS = {
    "xi-api-key": API_KEY,
    "Accept": "audio/wav",
    "Content-Type": "application/json"
}

TTS_SETTINGS = {
    "model_id": "eleven_turbo_v2",
    "voice_settings": {
        "stability": 0.45,
        "similarity_boost": 0.85,
        "style": 0.4,
        "use_speaker_boost": True
    }
}

# ─────────────────────────────────────────────
# 🧩 UTILITIES
# ─────────────────────────────────────────────
def get_audio_duration(wav_path: Path) -> float:
    """Return duration (in seconds) of a .wav file."""
    try:
        with contextlib.closing(wave.open(str(wav_path), "r")) as wf:
            frames = wf.getnframes()
            rate = wf.getframerate()
            duration = frames / float(rate)
            return round(duration, 2)
    except Exception:
        return 0.0


def generate_narration(script_path: Path, output_path: Path):
    """Send text to ElevenLabs and save as WAV."""
    with open(script_path, "r", encoding="utf-8") as f:
        text = f.read().strip()

    if not text:
        print(f"⚠️ Empty script skipped: {script_path.name}")
        return None

    payload = {**TTS_SETTINGS, "text": text}

    try:
        response = requests.post(API_URL, headers=HEADERS, json=payload, timeout=120)
        if response.status_code != 200:
            print(f"❌ Error {response.status_code} for {script_path.name}: {response.text}")
            return None

        with open(output_path, "wb") as f:
            f.write(response.content)

        duration = get_audio_duration(output_path)
        print(f"✅ Saved narration → {output_path.name} ({duration}s)")
        return duration

    except Exception as e:
        print(f"❌ Failed to generate narration for {script_path.name}: {e}")
        return None

# ─────────────────────────────────────────────
# 🚀 MAIN
# ─────────────────────────────────────────────
def main():
    txt_files = sorted(SCRIPTS_DIR.glob("*.txt"))
    total_scripts = len(txt_files)

    if total_scripts == 0:
        print(f"⚠️ No cleaned scripts found in {SCRIPTS_DIR}")
        return

    print(f"\n📜 Found {total_scripts} cleaned scripts in {SCRIPTS_DIR}\n")

    try:
        limit = int(input("🧮 How many scripts would you like to generate narrations for? (enter 0 for all): ").strip())
    except ValueError:
        limit = 0

    if limit <= 0 or limit > total_scripts:
        limit = total_scripts

    print(f"\n🎙️ Generating narrations for {limit} script(s) using Joey Sardella voice...\n")

    durations = []
    total_seconds = 0
    processed = 0

    for script in txt_files[:limit]:
        out_file = OUTPUT_DIR / (script.stem + ".wav")
        if out_file.exists():
            duration = get_audio_duration(out_file)
            print(f"⏭️ Skipping {out_file.name} (already exists, {duration}s)")
            durations.append((script.stem, duration))
            total_seconds += duration
            continue

        duration = generate_narration(script, out_file)
        if duration:
            durations.append((script.stem, duration))
            total_seconds += duration
        processed += 1

    # ─────────────────────────────────────────────
    # 🧾 SUMMARY TABLE
    # ─────────────────────────────────────────────
    print("\n──────────────────────────────")
    print("🎧 Narration Summary:")
    print("──────────────────────────────")
    for name, duration in durations:
        print(f"{name:<60} {duration:>6}s")

    print("──────────────────────────────")
    print(f"🕓 Total Narration Time: {round(total_seconds / 60, 2)} minutes ({round(total_seconds, 1)} seconds)")
    print(f"📊 Total Scripts Processed: {processed} / {limit}")
    print(f"📁 Files saved in: {OUTPUT_DIR}")
    print("──────────────────────────────\n")

# ─────────────────────────────────────────────
if __name__ == "__main__":
    main()
