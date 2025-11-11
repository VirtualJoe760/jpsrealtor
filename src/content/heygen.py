import os
import io
import time
import json
import shutil
import ffmpeg
import hashlib
import requests
from datetime import datetime
from pydub import AudioSegment
from pathlib import Path
from dotenv import load_dotenv
from questionary import select, confirm, text

# ─────────────────────────────────────────────
# 🌎 ENV & CONFIG
# ─────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = PROJECT_ROOT / ".env.local"
load_dotenv(dotenv_path=ENV_PATH)

HEYGEN_API_KEY = os.getenv("HEYGEN_API_KEY")
HEYGEN_AVATAR_ID = os.getenv("HEYGEN_AVATAR_ID")
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_SECRET = os.getenv("CLOUDINARY_SECRET")

if not HEYGEN_API_KEY or not HEYGEN_AVATAR_ID:
    raise ValueError("❌ Missing HEYGEN_API_KEY or HEYGEN_AVATAR_ID in .env.local")
if not CLOUDINARY_CLOUD_NAME or not CLOUDINARY_API_KEY or not CLOUDINARY_SECRET:
    raise ValueError("❌ Missing Cloudinary credentials in .env.local")

API_BASE = "https://api.heygen.com"
CLOUD_BASE = f"https://api.cloudinary.com/v1_1/{CLOUDINARY_CLOUD_NAME}/video"
MAX_AUDIO_SECONDS = 59
POLL_INTERVAL = 10
TIMEOUT = 900  # 15 min

# ─────────────────────────────────────────────
# 📁 PROMPTS & PATHS
# ─────────────────────────────────────────────
def choose_topic_and_date():
    content_dir = PROJECT_ROOT / "local-logs" / "content"
    topics = [d.name for d in content_dir.iterdir() if d.is_dir()]
    if not topics:
        raise FileNotFoundError("❌ No topics found under local-logs/content/")
    topic = select("📂 Choose a topic:", choices=topics).ask()

    topic_dir = content_dir / topic
    dates = [d.name for d in topic_dir.iterdir() if d.is_dir()]
    if not dates:
        raise FileNotFoundError(f"❌ No dated folders found in {topic_dir}")
    date = select("📅 Choose a date:", choices=sorted(dates, reverse=True)).ask()
    return topic, date, topic_dir / date

# ─────────────────────────────────────────────
# ☁️ CLOUDINARY HELPERS
# ─────────────────────────────────────────────
def cloudinary_signature(params: dict) -> str:
    """Generate Cloudinary SHA1 signature."""
    sorted_params = sorted(params.items())
    query = "&".join([f"{k}={v}" for k, v in sorted_params])
    sign_base = f"{query}{CLOUDINARY_SECRET}"
    return hashlib.sha1(sign_base.encode("utf-8")).hexdigest()

def upload_to_cloudinary(file_path: Path) -> tuple[str, str]:
    """Upload a file to Cloudinary and return (secure_url, public_id)."""
    print(f"☁️ Uploading {file_path.name} to Cloudinary...")
    timestamp = int(time.time())

    with open(file_path, "rb") as f:
        files = {"file": f}
        data = {
            "api_key": CLOUDINARY_API_KEY,
            "timestamp": timestamp,
            "signature": cloudinary_signature({"timestamp": timestamp}),
        }
        res = requests.post(f"{CLOUD_BASE}/upload", files=files, data=data, timeout=60)

    if not res.ok:
        raise RuntimeError(f"Cloudinary upload failed ({res.status_code}): {res.text}")

    result = res.json()
    print(f"✅ Uploaded → {result['secure_url']}")
    return result["secure_url"], result["public_id"]

def delete_from_cloudinary(public_id: str):
    """Delete asset from Cloudinary."""
    timestamp = int(time.time())
    sig = cloudinary_signature({"public_id": public_id, "timestamp": timestamp})
    data = {
        "public_id": public_id,
        "api_key": CLOUDINARY_API_KEY,
        "timestamp": timestamp,
        "signature": sig,
        "invalidate": True,
    }
    res = requests.post(f"{CLOUD_BASE}/destroy", data=data, timeout=30)
    if res.ok:
        print(f"🧹 Deleted Cloudinary asset → {public_id}")
    else:
        print(f"⚠️ Delete failed ({res.status_code}): {res.text}")

# ─────────────────────────────────────────────
# 🎙️ AUDIO HELPERS
# ─────────────────────────────────────────────
def split_audio_if_needed(audio_path: Path, temp_dir: Path, max_seconds=MAX_AUDIO_SECONDS):
    """Split long audio files into parts under 59s."""
    audio = AudioSegment.from_file(audio_path)
    duration = len(audio) / 1000
    if duration <= max_seconds:
        return [audio_path]

    parts = []
    slug = audio_path.stem
    chunks = int(duration // max_seconds) + 1
    for i in range(chunks):
        start_ms = i * max_seconds * 1000
        end_ms = min((i + 1) * max_seconds * 1000, len(audio))
        part = audio[start_ms:end_ms]
        part_path = temp_dir / f"{slug}_part_{i+1}.wav"
        part.export(part_path, format="wav")
        parts.append(part_path)
    return parts

# ─────────────────────────────────────────────
# 🎬 HEYGEN HELPERS
# ─────────────────────────────────────────────
def create_heygen_video(audio_url: str) -> str:
    payload = {
        "video_inputs": [
            {
                "character": {
                    "type": "avatar",
                    "avatar_id": HEYGEN_AVATAR_ID,
                    "avatar_style": "normal",
                },
                "voice": {"type": "audio", "audio_url": audio_url},
                "background": {"type": "color", "value": "#00FF00"},
            }
        ],
        "dimension": {"width": 1280, "height": 720},
    }
    res = requests.post(
        f"{API_BASE}/v2/video/generate",
        headers={"X-Api-Key": HEYGEN_API_KEY, "Content-Type": "application/json"},
        json=payload,
        timeout=60,
    )
    if not res.ok:
        raise RuntimeError(f"HeyGen creation failed ({res.status_code}): {res.text}")
    data = res.json()
    return data.get("data", {}).get("video_id")

def poll_heygen(video_id: str) -> str:
    """Poll HeyGen until video completes; return URL."""
    print(f"⏳ Polling HeyGen for video {video_id}...")
    start = time.time()
    while time.time() - start < TIMEOUT:
        res = requests.get(
            f"{API_BASE}/v1/video_status.get?video_id={video_id}",
            headers={"X-Api-Key": HEYGEN_API_KEY},
            timeout=30,
        )
        if not res.ok:
            print(f"⚠️ Poll error {res.status_code}, retrying...")
            time.sleep(POLL_INTERVAL)
            continue
        data = res.json().get("data", {})
        status = data.get("status")
        if status == "completed":
            print("✅ HeyGen video completed.")
            return data.get("video_url")
        if status == "failed":
            raise RuntimeError(f"❌ HeyGen video failed: {data}")
        print(f"⏳ Status: {status}")
        time.sleep(POLL_INTERVAL)
    raise TimeoutError("Timed out waiting for HeyGen completion")

# ─────────────────────────────────────────────
# 🧩 MAIN
# ─────────────────────────────────────────────
def main():
    topic, date, base_dir = choose_topic_and_date()
    narration_dir = base_dir / "narrations"
    temp_dir = base_dir / "temp_audio"
    videos_dir = base_dir / "videos"
    log_file = videos_dir / "render_log.json"

    temp_dir.mkdir(parents=True, exist_ok=True)
    videos_dir.mkdir(parents=True, exist_ok=True)

    narrations = sorted(narration_dir.glob("*.wav"))
    if not narrations:
        print(f"⚠️ No narrations found in {narration_dir}")
        return

    print(f"\n📜 Found {len(narrations)} narration(s) in {narration_dir}\n")
    skip_existing = confirm("⏭️ Skip videos that already exist?").ask()
    delete_after = confirm("🧹 Delete from Cloudinary after generation?").ask()

    limit_str = text("🧮 How many narrations to process? (0 = all):").ask()
    try:
        limit = int(limit_str)
    except ValueError:
        limit = 0
    if limit and limit < len(narrations):
        narrations = narrations[:limit]

    log = {"started": datetime.now().isoformat(), "topic": topic, "date": date, "entries": []}

    for idx, audio_path in enumerate(narrations, start=1):
        slug = audio_path.stem
        dest_folder = videos_dir / slug / "deep-fake"
        dest_folder.mkdir(parents=True, exist_ok=True)
        final_output = dest_folder / f"avatar-{slug}.mp4"

        if skip_existing and final_output.exists():
            print(f"⏭️ Skipping existing {slug}")
            continue

        parts = split_audio_if_needed(audio_path, temp_dir)
        first_part = parts[0]
        print(f"\n🎬 [{idx}/{len(narrations)}] Generating avatar for {slug}")

        try:
            audio_url, public_id = upload_to_cloudinary(first_part)
            video_id = create_heygen_video(audio_url)
            video_url = poll_heygen(video_id)

            print(f"⬇️ Downloading video for {slug}...")
            vid_data = requests.get(video_url, timeout=120)
            with open(final_output, "wb") as f:
                f.write(vid_data.content)
            print(f"✅ Completed → {final_output.name}")

            if delete_after:
                delete_from_cloudinary(public_id)

            log["entries"].append({
                "slug": slug,
                "status": "completed",
                "audio_url": audio_url,
                "video_url": video_url,
                "deleted": delete_after,
                "timestamp": datetime.now().isoformat(),
            })

        except Exception as e:
            print(f"❌ Error processing {slug}: {e}")
            log["entries"].append({
                "slug": slug,
                "status": "failed",
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
            })

        with open(log_file, "w", encoding="utf-8") as f:
            json.dump(log, f, indent=2, ensure_ascii=False)

    log["finished"] = datetime.now().isoformat()
    with open(log_file, "w", encoding="utf-8") as f:
        json.dump(log, f, indent=2, ensure_ascii=False)

    print("\n🎉 All tasks finished.")
    print(f"🪵 Log saved → {log_file}")

# ─────────────────────────────────────────────
if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n⛔ Interrupted by user.")
    except Exception as e:
        print(f"\n❌ Unhandled error: {e}")
