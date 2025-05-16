import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=".env.local")
ACCESS_TOKEN = os.getenv("SPARK_ACCESS_TOKEN")

# Spark API request setup
headers = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "Accept": "application/json"
}

# OData filter for Active listings in Palm Desert
# Adjust "StandardStatus" or "City" field names if your MLS uses different ones
url = (
    "https://api.sparkapi.com/v1/listings?"
    "$filter=City eq 'Palm Desert' and StandardStatus eq 'Active'"
    "&$select=ListingId"  # Only need to count, so minimize payload
)

response = requests.get(url, headers=headers)
data = response.json()

# Extract and count listings
if response.status_code == 200 and data.get("D", {}).get("Success"):
    count = data["D"]["Count"]
    print(f"✅ There are currently {count} active listings in Palm Desert.")
else:
    print("❌ Failed to fetch listing count:", data)
