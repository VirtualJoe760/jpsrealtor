#!/usr/bin/env python3
"""Add Unified MLS Phase 1 tasks to Trello Developer Tasks list"""

import os
import requests
from pathlib import Path
from dotenv import load_dotenv
import time

env_path = Path(__file__).resolve().parents[2] / ".env.local"
load_dotenv(dotenv_path=env_path)

API_KEY = os.getenv("TRELLO_API_KEY")
TOKEN = os.getenv("TRELLO_TOKEN")

# chatRealty board
BOARD_ID = "69306ffbea0dff86f77a62d5"
# Developer Tasks list
DEV_TASKS_LIST_ID = "69307001f0815b7abe500828"

BASE_URL = "https://api.trello.com/1"

def create_card(name, desc):
    """Create a card in Developer Tasks list"""
    url = f"{BASE_URL}/cards"
    params = {
        "key": API_KEY,
        "token": TOKEN,
        "name": name,
        "desc": desc,
        "idList": DEV_TASKS_LIST_ID
    }

    response = requests.post(url, params=params)
    if response.status_code == 200:
        print(f"  [OK] Created: {name}")
        return True
    else:
        print(f"  [ERR] Failed: {name} - {response.text[:100]}")
        return False

print("="*80)
print("ADDING UNIFIED MLS TASKS TO TRELLO")
print("="*80)
print(f"Board: chatRealty ({BOARD_ID})")
print(f"List: Developer Tasks ({DEV_TASKS_LIST_ID})")
print()

# Phase 1: Quick Wins
print("\nPhase 1: Quick Wins (Week 1)")
print("-"*40)

tasks = [
    ("UNIFIED MLS: Enhance flatten.py", """Add mlsSource, mlsId, propertyTypeName, Media fields

CHECKLIST:
- [ ] Add PROPERTY_TYPE_NAMES mapping
- [ ] Update flatten_listing() signature
- [ ] Add mlsSource/mlsId fields
- [ ] Add propertyTypeName
- [ ] Preserve Media array
- [ ] Test with sample listing

FILES: src/scripts/mls/backend/flatten.py
REF: docs/FLATTEN_PY_ANALYSIS.md"""),

    ("UNIFIED MLS: Add PropertyType D (Land)", """Update fetch filters to include Land listings

CHANGE:
From: "PropertyType Eq 'A' Or... 'C'"
To: "PropertyType Eq 'A' Or... 'C' Or PropertyType Eq 'D'"

EXPECTED: +1,700 Land listings

CHECKLIST:
- [ ] Update fetch.py (line 52)
- [ ] Update crmls/fetch.py (line 52)
- [ ] Test with GPS MLS
- [ ] Verify Land listings returned"""),

    ("UNIFIED MLS: Fix SkipToken Pagination Bug (CRITICAL)", """CRITICAL BUG - Using listing ID as skiptoken causes missed records

WRONG: skiptoken = batch[-1].get("Id")
CORRECT: skiptoken = response_data.get("SkipToken")

CHECKLIST:
- [ ] Update fetch.py (line 71)
- [ ] Update crmls/fetch.py (line 71)
- [ ] Test with >1000 listings
- [ ] Verify no duplicates

FILES: Both fetch scripts
REF: docs/MLS_FETCH_IMPROVEMENTS.md"""),

    ("UNIFIED MLS: Add _expand=Media to Fetch", """Embed photo URLs in listing data

ADD: &_expand=Media to fetch URL

BENEFIT: Deprecate cache_photos.py

CHECKLIST:
- [ ] Add to fetch.py
- [ ] Add to crmls/fetch.py
- [ ] Verify Media array in response
- [ ] Test with/without photos"""),

    ("UNIFIED MLS: Create unified-fetch.py", """Single script for all 8 MLSs

FEATURES:
- All 8 MLS associations
- PropertyType A,B,C,D
- Correct SkipToken pagination
- _expand=Media
- Progress logging

CHECKLIST:
- [ ] Create script
- [ ] Add all 8 MLS IDs
- [ ] Implement pagination
- [ ] Test with GPS only first

FILES: NEW src/scripts/mls/backend/unified-fetch.py
REF: docs/UNIFIED_MLS_ARCHITECTURE.md"""),
]

for name, desc in tasks:
    create_card(name, desc)
    time.sleep(0.5)  # Rate limiting

print("\n" + "="*80)
print("[OK] Phase 1 tasks added to Developer Tasks!")
print("="*80)
print("\nView board: https://trello.com/b/69306ffbea0dff86f77a62d5/chatrealty")
print()
