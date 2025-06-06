from dotenv import load_dotenv
from pathlib import Path
import os
from pymongo import MongoClient

# Load environment variables from project root
project_root = Path(__file__).resolve().parents[4]
env_path = project_root / ".env.local"
load_dotenv(dotenv_path=env_path)

# Pull values
username = os.getenv("MONGODB_USER")
password = os.getenv("MONGODB_PASSWORD")
host = os.getenv("MONGODB_HOST")
db_name = os.getenv("MONGODB_DB", "test")
tls = os.getenv("MONGODB_TLS", "true")
auth_source = os.getenv("MONGODB_AUTHSOURCE", "admin")

# Check for required vars
if not all([username, password, host]):
    raise Exception("Missing one or more MongoDB env variables")

# Build URI
uri = f"mongodb+srv://{username}:{password}@{host}/{db_name}?tls={tls}&authSource={auth_source}"

# Connect and drop
client = MongoClient(uri)
db = client[db_name]

def drop_listings():
    if "listings" in db.list_collection_names():
        db.drop_collection("listings")
        print("🧼 'listings' collection dropped.")
    else:
        print("⚠️ Collection 'listings' does not exist.")

drop_listings()
client.close()
