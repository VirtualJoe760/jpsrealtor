#!/usr/bin/env python3
"""READ-ONLY diagnostic: characterize low-priced 'sale' (propertyType A/Residential)
active listings in unified_listings. No writes."""
import os
from pathlib import Path
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parents[5] / ".env.local")
client = MongoClient(os.getenv("MONGODB_URI"), serverSelectionTimeoutMS=10000)
db = client.get_database()
col = db["unified_listings"]

print("=== distinct propertyType values (raw) ===")
print(col.distinct("propertyType"))

print("\n=== distinct propertyTypeName values (raw) ===")
print(col.distinct("propertyTypeName"))

# Sale-coded = A or Residential
sale_codes = ["A", "Residential"]
base = {"propertyType": {"$in": sale_codes}, "standardStatus": "Active"}

print("\n=== total Active sale-coded listings ===")
print(col.count_documents(base))

low = {**base, "listPrice": {"$lt": 10000}}
print("\n=== Active sale-coded with listPrice < 10000 ===")
n_low = col.count_documents(low)
print(n_low)

print("\n=== breakdown by propertySubType (listPrice<10000) ===")
for r in col.aggregate([
    {"$match": low},
    {"$group": {"_id": "$propertySubType", "count": {"$sum": 1},
                "minP": {"$min": "$listPrice"}, "maxP": {"$max": "$listPrice"}}},
    {"$sort": {"count": -1}},
]):
    print(f"  {str(r['_id']):<30} count={r['count']:<6} price[{r['minP']}-{r['maxP']}]")

print("\n=== breakdown by mlsSource (listPrice<10000) ===")
for r in col.aggregate([
    {"$match": low},
    {"$group": {"_id": "$mlsSource", "count": {"$sum": 1}}},
    {"$sort": {"count": -1}},
]):
    print(f"  {str(r['_id']):<25} count={r['count']}")

print("\n=== top cities (listPrice<10000) ===")
for r in col.aggregate([
    {"$match": low},
    {"$group": {"_id": "$city", "count": {"$sum": 1}}},
    {"$sort": {"count": -1}},
    {"$limit": 20},
]):
    print(f"  {str(r['_id']):<25} count={r['count']}")

print("\n=== price histogram buckets (listPrice<10000) ===")
for r in col.aggregate([
    {"$match": low},
    {"$bucket": {"groupBy": "$listPrice",
                 "boundaries": [0, 100, 500, 1000, 2000, 3000, 5000, 10000],
                 "default": "other", "output": {"count": {"$sum": 1}}}},
]):
    print(f"  bucket >= {r['_id']}: {r['count']}")

# How many low-price sale-coded ALSO look rental-ish: subType contains Lease/Rental, or have a leasey flag
print("\n=== low-price records whose publicRemarks/subType hint rental ===")
rentalish = col.count_documents({**low, "$or": [
    {"propertySubType": {"$regex": "lease|rental", "$options": "i"}},
    {"propertyTypeName": {"$regex": "lease|rental", "$options": "i"}},
]})
print(f"  rental-hinting subType/typeName: {rentalish}")

# Sample 15 records with key fields
print("\n=== 15 sample records ===")
for d in col.find(low, {"listingKey": 1, "propertyType": 1, "propertySubType": 1,
                        "propertyTypeName": 1, "listPrice": 1, "originalListPrice": 1,
                        "city": 1, "mlsSource": 1, "unparsedAddress": 1,
                        "bedsTotal": 1, "daysOnMarket": 1}).limit(15):
    print(f"  {d.get('listingKey')} | {d.get('mlsSource')} | {d.get('propertyType')}/{d.get('propertySubType')} "
          f"| ${d.get('listPrice')} (orig ${d.get('originalListPrice')}) | {d.get('city')} | {d.get('unparsedAddress')}")

client.close()
