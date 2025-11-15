# Database Scripts

Python scripts for querying and analyzing the listings database.

## Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Ensure `.env.local` exists in the project root with `MONGODB_URI` configured.

## Scripts

### `na-test.py`

Queries "Not Applicable" (non-HOA) properties in Palm Desert, 92260.

**Purpose:** Analyze grouping and distribution of non-HOA Single Family Residential properties to debug the swipe queue micro-neighborhood feature.

**Usage:**
```bash
python scripts/na-test.py
```

**Query Criteria:**
- Subdivision: "Not Applicable" (and variations)
- City: Palm Desert
- Postal Code: 92260
- Property SubType: Single Family Residential
- Property Type: A (Sale)
- Status: Active

**Output:**
- Console logs with property details
- JSON file: `local-logs/na-test-results.json`
- Grouping analysis by street name

**Output Format:**
```json
{
  "query": { ... },
  "executedAt": "2025-11-15T...",
  "totalResults": 42,
  "results": [
    {
      "index": 1,
      "address": "73183 Willow Street, Palm Desert, CA 92260",
      "streetName": "Willow",
      "listPrice": 529000,
      ...
    }
  ],
  "streetGrouping": {
    "Willow": 3,
    "Goldflower": 2,
    ...
  }
}
```
