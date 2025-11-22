# AI Console Documentation

## Overview

The AI Console is a comprehensive system that gives our AI assistant complete understanding of all available endpoints, investment formulas, and real estate analysis tools.

## Components

### 1. Endpoint Documentation (`/api/ai/console/endpoints.json`)

Complete documentation of all available API endpoints organized by category:

- **Listings**: Search and retrieve property data
- **Location**: Match user queries to cities/subdivisions
- **Analysis**: Market statistics and trends
- **Investment**: Mortgage rates and financial data
- **User**: Favorites and preferences

### 2. Investment Formulas (`/api/ai/console/formulas.json`)

Industry-standard real estate investment calculations:

#### Key Investment Metrics

- **Cap Rate**: Measures rate of return on investment property
- **Cash-on-Cash Return**: Cash income earned on cash invested
- **1% Rule**: Quick screening tool for rental properties
- **GRM (Gross Rent Multiplier)**: Years to pay off property with gross rent
- **DSCR**: Ability to cover mortgage payments
- **Monthly Cash Flow**: Net monthly income after expenses
- **ROI**: Overall return including appreciation and income

#### CMA Metrics

- **Median Price Per Sqft**: Standard comparison across properties
- **Average Days on Market**: Market competitiveness indicator
- **Price Reductions**: Percentage of listings with reductions
- **Absorption Rate**: Months to sell all inventory
- **Sales Price to List Price**: Negotiation power indicator

### 3. CMA Generator API (`/api/ai/cma`)

Real-time Comparative Market Analysis generation.

#### Features:
- Analyzes comparable properties within specified radius
- Calculates market metrics (price/sqft, DOM, trends)
- Provides investment analysis with multiple formulas
- Estimates property value based on comparables
- Includes market context and recommendations

#### Example Request:

```json
POST /api/ai/cma
{
  "subjectProperty": "123-main-st-corona-ca-92882",
  "radius": 1,
  "bedroomRange": 1,
  "bathroomRange": 1,
  "sqftRange": 0.2,
  "maxComps": 10,
  "includeInvestmentAnalysis": true,
  "assumptions": {
    "downPaymentPercent": 20,
    "interestRate": 7.0,
    "loanTermYears": 30,
    "estimatedRent": 3000
  }
}
```

#### Response Includes:
- Subject property details
- Comparable properties array
- CMA metrics (median/avg price per sqft, DOM, etc.)
- Estimated value with variance analysis
- Investment analysis with all key metrics
- Market context and recommendations

### 4. AI Console API (`/api/ai/console`)

Provides the AI with complete system documentation.

#### Endpoints:

- `GET /api/ai/console?type=endpoints` - Get endpoint documentation
- `GET /api/ai/console?type=formulas` - Get investment formulas
- `GET /api/ai/console?type=all` - Get complete console (default)

## Integration with Chat System

The chat system (`/api/chat/stream`) now automatically injects the AI Console system prompt, which includes:

1. **Complete API documentation** - AI knows all available endpoints
2. **Investment formulas** - AI can calculate all metrics
3. **Best practices** - Guidelines for responses
4. **Example interactions** - How to handle common requests
5. **Market context** - Current benchmarks and indicators

## Usage Examples

### Property Search with Investment Analysis

```
User: "Find investment properties in Corona under $500k"

AI Process:
1. Use /api/chat/match-location for "Corona"
2. Use /api/mls-listings with bounds + filters
3. Calculate price per sqft for each
4. Evaluate against 1% Rule
5. Present top candidates with quick analysis
```

### Generate CMA

```
User: "Can you do a CMA for 123 Main St?"

AI Process:
1. Get property details via /api/mls-listings/[slug]
2. Call /api/ai/cma with property info
3. Present CMA metrics (comparables, price/sqft, DOM)
4. Provide estimated value range
5. Include market context
```

### Investment Property Analysis

```
User: "Analyze this as a rental property"

AI Process:
1. Get property details and price
2. Estimate rental income (or ask user)
3. Calculate Cap Rate, CoC Return, DSCR, Cash Flow
4. Evaluate against benchmarks
5. Provide clear recommendation with assumptions
6. Note risks and remind to consult advisors
```

## Investment Calculation Examples

### Cap Rate Calculation
```
Property Price: $400,000
Annual Rent: $36,000 (12 × $3,000)
Annual Expenses: $12,000 (taxes, insurance, maintenance, HOA)
Annual NOI: $24,000

Cap Rate = ($24,000 ÷ $400,000) × 100 = 6.0%
Rating: Good (4-10% range, higher is better)
```

### Cash-on-Cash Return
```
Property Price: $400,000
Down Payment (20%): $80,000
Closing Costs (3%): $12,000
Total Cash Invested: $92,000

Annual Rent: $36,000
Annual Expenses: $12,000
Annual Mortgage (P&I): $19,200
Annual Cash Flow: $4,800

CoC Return = ($4,800 ÷ $92,000) × 100 = 5.22%
Rating: Fair (8-12% is good range)
```

### 1% Rule Test
```
Property Price: $400,000
Monthly Rent: $3,000

1% Threshold: $400,000 × 0.01 = $4,000
Actual Rent: $3,000

Result: FAILS 1% Rule
Note: Property may still work, but worth deeper analysis
```

## Market Indicators

### Days on Market (DOM)
- **< 30 days**: Seller's market (high demand)
- **30-60 days**: Balanced market
- **> 60 days**: Buyer's market (negotiation power)

### Inventory Levels
- **< 3 months**: Low inventory, seller advantage
- **3-6 months**: Balanced market
- **> 6 months**: High inventory, buyer advantage

### Price Reductions
- **< 15%**: Highly competitive market
- **15-30%**: Moderately competitive
- **> 30%**: Less competitive, room to negotiate

## Best Practices for AI

1. **Always state assumptions** - Interest rate, down payment, expenses
2. **Explain metrics** - Don't just give numbers, explain what they mean
3. **Provide context** - Compare to benchmarks (is 6% cap rate good?)
4. **Be transparent** - Note limitations and data gaps
5. **Recommend professionals** - Always suggest consulting advisors
6. **Format clearly** - Use $ formatting, percentages, clean layout
7. **Verify locations** - Always use match-location API first

## System Prompt Updates

The AI now automatically receives:
- Current date for context
- All endpoint documentation
- All investment formulas with ranges
- Market indicators and benchmarks
- Example interaction patterns
- Best practice guidelines

## Future Enhancements

- [ ] Save custom formulas per user
- [ ] Historical market trend analysis
- [ ] Automated property scoring system
- [ ] Portfolio analysis tools
- [ ] Comparative city/neighborhood rankings
- [ ] Predictive analytics for appreciation
- [ ] Tax benefit calculators
- [ ] Renovation ROI estimators

## Testing the System

### Test CMA Generation:
```bash
curl -X POST http://localhost:3000/api/ai/cma \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Corona",
    "bedroomRange": 1,
    "bathroomRange": 1,
    "sqftRange": 0.2,
    "maxComps": 5,
    "includeInvestmentAnalysis": true
  }'
```

### Test AI Console:
```bash
curl http://localhost:3000/api/ai/console?type=all
```

### Test Enhanced Chat:
The chat system now automatically includes AI Console context in every conversation.

## Support

For questions or enhancements, refer to:
- `/src/app/api/ai/console/` - Console configuration
- `/src/app/api/ai/cma/` - CMA generator
- `/src/app/api/chat/stream/` - Enhanced chat with AI console
