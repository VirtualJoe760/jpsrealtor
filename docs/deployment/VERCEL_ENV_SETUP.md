# Vercel Environment Variables Setup

To fix the Market Stats display on production, you need to add these environment variables to your Vercel project:

## Required Environment Variables

### 1. API_NINJA_KEY
- **Source:** API Ninjas (https://api-ninjas.com/)
- **Used for:** Current mortgage rates (CA specific)
- **Value:** Your API Ninjas API key

### 2. FRED_API_KEY
- **Source:** Federal Reserve Economic Data (https://fred.stlouisfed.org/docs/api/api_key.html)
- **Used for:** Historical mortgage rates and economic indicators
- **Value:** Your FRED API key

## How to Add to Vercel

1. Go to your Vercel project dashboard
2. Click on "Settings"
3. Click on "Environment Variables"
4. Add each variable:
   - Name: `API_NINJA_KEY`
   - Value: [your API Ninjas key]
   - Environments: Production, Preview, Development

   - Name: `FRED_API_KEY`
   - Value: [your FRED API key]
   - Environments: Production, Preview, Development

5. Redeploy your application (or trigger a new deployment)

## Verification

After adding the env vars and redeploying, the Market Stats component should display:
- Current 30-year mortgage rate
- Current 15-year mortgage rate
- Current 5/1 ARM rate
- Historical rate trends (past 12 months)
- Economic indicators (inflation, unemployment, etc.)

## API Endpoints Being Called

- `https://api.api-ninjas.com/v1/mortgagerate?state=CA`
- `https://api.stlouisfed.org/fred/series/observations?series_id=MORTGAGE30US`
- `https://api.stlouisfed.org/fred/series/observations?series_id=MORTGAGE15US`
- Various other FRED endpoints for economic data

## Local Testing

Your local `.env.local` file should have:
```
API_NINJA_KEY=your_key_here
FRED_API_KEY=your_key_here
```

These work locally but Vercel needs them configured separately in the dashboard.
