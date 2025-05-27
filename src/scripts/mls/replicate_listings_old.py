import os
import time
import json
import requests
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone
import logging

# Load environment
env_path = Path(__file__).resolve().parents[3] / ".env.local"
load_dotenv(dotenv_path=env_path)
ACCESS_TOKEN = os.getenv("SPARK_ACCESS_TOKEN")

# Logging setup
LOGS_DIR = Path(__file__).resolve().parents[2] / "logs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)
log_file = LOGS_DIR / f"replication_{datetime.now(timezone.utc).strftime('%Y-%m-%d')}.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)

# Spark API setup
BASE_URL = "https://replication.sparkapi.com/v1/listings"
HEADERS = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "Accept": "application/json"
}
LIMIT = 1000
SELECT_FIELDS = [
    "ListingId", "ListingKey", "StandardStatus", "ListPrice",
    "PropertyType", "City", "StateOrProvince", "PostalCode",
    "BedroomsTotal", "BathroomsTotalInteger", "LivingArea",
    "ListingContractDate", "ModificationTimestamp"
]
select_query = ",".join(SELECT_FIELDS)

# Full replication with pagination via _skiptoken
def replicate_all_listings():
    logging.info("Starting full replication using _skiptoken pagination...")
    listings = []
    skiptoken = None
    page = 1

    while True:
        url = f"{BASE_URL}?_limit={LIMIT}&_select={select_query}"
        if skiptoken:
            url += f"&_skiptoken={skiptoken}"

        logging.info(f"Requesting page {page}: {url}")
        try:
            response = requests.get(url, headers=HEADERS)
            data = response.json()
        except Exception as e:
            logging.exception("Failed to request or parse response")
            break

        if response.status_code != 200 or not data.get("D", {}).get("Success"):
            logging.error(f"API error on page {page}: {json.dumps(data, indent=2)}")
            break

        batch = data["D"]["Results"]
        listings.extend(batch)
        logging.info(f"Page {page} - Retrieved {len(batch)} listings (Total so far: {len(listings)})")

        skiptoken = data["D"].get("Next")
        if not skiptoken:
            logging.info("No more pages to retrieve. Replication complete.")
            break

        page += 1
        time.sleep(0.1)  # polite pause between requests

    logging.info(f"Final total listings fetched: {len(listings)}")
    return listings

if __name__ == "__main__":
    replicate_all_listings()
