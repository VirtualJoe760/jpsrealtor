import subprocess
import sys
from pathlib import Path

# ──────────────────────────────────────────────────────────────────────────────
# CONFIG
# ──────────────────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent
CRMLS_DIR = BASE_DIR / "crmls"
GPS_DIR = BASE_DIR
CLOSED_GPS_DIR = BASE_DIR / "closed" / "gps"
CLOSED_CRMLS_DIR = BASE_DIR / "closed" / "crmls"
EXPIRED_GPS_DIR = BASE_DIR / "expired" / "gps"
EXPIRED_CRMLS_DIR = BASE_DIR / "expired" / "crmls"
EXPIRED_CLEANUP_SCRIPT = BASE_DIR / "expired" / "cleanup.py"

# Active listings (GPS & CRMLS)
# Closed listings (GPS & CRMLS)
# Expired/Cancelled listings (GPS & CRMLS) for lead generation
SCRIPT_PIPELINES = [
    # Active Listings
    ("CRMLS Active", CRMLS_DIR, [
        "fetch.py",
        "flatten.py",
        "seed.py",
        "cache_photos.py",
        "update.py",
    ]),
    ("GPS Active", GPS_DIR, [
        "fetch.py",
        "flatten.py",
        "seed.py",
        "cache_photos.py",
        "update.py",
    ]),
    # Closed Listings
    ("GPS Closed", CLOSED_GPS_DIR, [
        "fetch.py",
        "flatten.py",
        "seed.py",
    ]),
    ("CRMLS Closed", CLOSED_CRMLS_DIR, [
        "fetch.py",
        "flatten.py",
        "seed.py",
    ]),
    # Expired/Cancelled Listings (Lead Generation)
    ("GPS Expired", EXPIRED_GPS_DIR, [
        "fetch.py",
        "flatten.py",
        "seed.py",
        "cache_photos.py",
    ]),
    ("CRMLS Expired", EXPIRED_CRMLS_DIR, [
        "fetch.py",
        "flatten.py",
        "seed.py",
        "cache_photos.py",
    ]),
]

# ──────────────────────────────────────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────────────────────────────────────

def main():
    print("\n🏠  JPS Realtor MLS Pipeline\n")

    for mls_name, working_dir, scripts in SCRIPT_PIPELINES:
        print(f"\n{'='*60}")
        print(f"🏢  Starting {mls_name} MLS Pipeline")
        print(f"{'='*60}\n")

        for script in scripts:
            path = working_dir / script
            print(f"➡️  Running {mls_name}/{script}...")
            result = subprocess.run([sys.executable, str(path)], cwd=working_dir)
            if result.returncode != 0:
                print(f"❌ {mls_name}/{script} failed (exit code {result.returncode}). Stopping pipeline.")
                sys.exit(result.returncode)
            print(f"✅ {mls_name}/{script} completed successfully.\n")

        print(f"✅ {mls_name} pipeline completed successfully.\n")

    # Run cleanup script for expired listings (removes listings > 90 days old)
    print(f"\n{'='*60}")
    print(f"🧹  Running Expired Listings Cleanup")
    print(f"{'='*60}\n")
    print(f"➡️  Running cleanup.py...")
    result = subprocess.run([sys.executable, str(EXPIRED_CLEANUP_SCRIPT)], cwd=EXPIRED_CLEANUP_SCRIPT.parent)
    if result.returncode != 0:
        print(f"⚠️  Cleanup script failed (exit code {result.returncode}). Continuing anyway.")
    else:
        print(f"✅ Cleanup completed successfully.\n")

    print("🎉 All MLS pipelines finished successfully.")

if __name__ == "__main__":
    main()
