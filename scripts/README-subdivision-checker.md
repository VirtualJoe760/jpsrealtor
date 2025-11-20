# Subdivision Listing Checker Utility

A command-line tool to check how many listings exist in a subdivision, broken down by property type (for sale, for rent, multi-family).

Available in both **JavaScript (Node.js)** and **Python** versions.

## Features

- 🏠 **For Sale listings** - Shows count, price range, and average price
- 🏘️ **For Rent listings** - Shows count, price range, and average rent
- 🏢 **Multi-Family properties** - Shows count, price range, and average price
- 📊 **Statistics** - Price ranges and averages for each category
- 🎨 **Color-coded output** - Easy-to-read terminal display
- 🔄 **Interactive mode** - Check multiple subdivisions in one session
- 📝 **Logging** (Python only) - Automatic logging to `local-logs/testing/`

## Prerequisites

### For JavaScript Version
- Node.js installed
- Development server running on `localhost:3000` (or specify custom URL)

### For Python Version
- Python 3.7+ installed
- Required packages: `requests`
  ```bash
  pip install requests
  ```
- Development server running on `localhost:3000` (or specify custom URL)

## Usage

### JavaScript Version

#### Method 1: Interactive Mode
Run the script without arguments and it will prompt you for input:

```bash
node scripts/check-subdivision-listings.js
```

#### Method 2: Direct Command
Pass the subdivision name as a command-line argument:

```bash
node scripts/check-subdivision-listings.js "Palm Desert Country Club"
```

#### Method 3: Custom API URL
If your server is running on a different port or domain:

```bash
BASE_URL=http://localhost:3001 node scripts/check-subdivision-listings.js "Palm Desert Country Club"
```

### Python Version

#### Method 1: Interactive Mode
Run the script without arguments and it will prompt you for input:

```bash
python scripts/check-subdivision-listings.py
```

#### Method 2: Direct Command
Pass the subdivision name as a command-line argument:

```bash
python scripts/check-subdivision-listings.py "Palm Desert Country Club"
```

#### Method 3: Custom API URL
If your server is running on a different port or domain:

```bash
BASE_URL=http://localhost:3001 python scripts/check-subdivision-listings.py "Palm Desert Country Club"
```

Or on Windows:
```powershell
$env:BASE_URL="http://localhost:3001"
python scripts/check-subdivision-listings.py "Palm Desert Country Club"
```

## Example Output

```
╔════════════════════════════════════════════════════════╗
║      Subdivision Listing Checker Utility              ║
╚════════════════════════════════════════════════════════╝

🔍 Searching for listings in: Palm Desert Country Club
📡 Using API: http://localhost:3000

============================================================
Subdivision: Palm Desert Country Club
============================================================

📊 Total Listings: 8

🏠 For Sale: 5
   Price Range: $350,000 - $875,000
   Avg Price: $612,000

🏘️  For Rent: 2
   Price Range: $2,500 - $3,200
   Avg Price: $2,850

🏢 Multi-Family: 1
   Price Range: $1,200,000 - $1,200,000
   Avg Price: $1,200,000

============================================================

Check another subdivision? (y/n):
```

## How It Works

1. **Search** - Queries the `/api/chat/search-listings` endpoint with the subdivision name
2. **Analyze** - Categorizes listings based on `propertyType` and `listingType` fields
3. **Display** - Shows formatted results with counts and statistics
4. **Log** (Python only) - Saves detailed logs to `local-logs/testing/subdivision_checker_YYYYMMDD_HHMMSS.log`

### Property Classification

- **For Sale**: Listings with `listingType` containing "sale" or no listing type
- **For Rent**: Listings with `listingType` containing "rent" or "lease"
- **Multi-Family**: Listings with `propertyType` containing "multi", "apartment", or "duplex"
- **Other**: Any listings that don't fit the above categories

### Logging (Python Version)

The Python version automatically logs all operations to timestamped files in `local-logs/testing/`:

```
local-logs/testing/
  └── subdivision_checker_20250119_143022.log
```

Logs include:
- Search requests and responses
- API calls and status codes
- Individual listing classifications
- Price calculations
- Errors and exceptions with stack traces

## Troubleshooting

### "Error: API request failed: 405 Method Not Allowed"
Make sure your development server is running:
```bash
npm run dev
```

### "Error: fetch failed"
Check that the server is accessible at the URL:
```bash
curl http://localhost:3000/api/health
```

### No results found
- Verify the subdivision name is spelled correctly
- Check that the subdivision exists in your database
- Try using the exact name as it appears in the database

## Tips

- **Use quotes** for subdivision names with spaces: `"Palm Desert Country Club"`
- **Check multiple** subdivisions by answering "yes" when prompted
- **Pipe output** to a file for record-keeping: `node scripts/check-subdivision-listings.js "..." > results.txt`

## Integration

This script can be imported as a module in other Node.js scripts:

```javascript
const { searchSubdivision, analyzeListings } = require('./scripts/check-subdivision-listings');

// Use in your own scripts
const result = await searchSubdivision('Palm Desert Country Club');
const analysis = analyzeListings(result.listings);
console.log(`Found ${analysis.forSale.length} properties for sale`);
```

## Future Enhancements

Possible additions:
- Export results to CSV/JSON
- Batch mode (check multiple subdivisions from a file)
- Historical data comparison
- Email/Slack notifications for inventory changes
- Filter by price range, bedrooms, bathrooms, etc.

## Support

For issues or questions, check the main project documentation or contact the development team.
