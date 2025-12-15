/**
 * Time Filter Builder
 *
 * Builds MongoDB queries for time-based filters.
 * Supports filtering by days on market, listing date, and open houses.
 */

export interface TimeFilter {
  maxDaysOnMarket?: number;
  listedAfter?: Date | string; // Accept both Date and string - MongoDB field is stored as string
  hasOpenHouse?: boolean;
}

/**
 * Build MongoDB query object from time filters
 */
export function buildTimeQuery(filter: TimeFilter): any {
  const query: any = {};

  // Days on market filter
  if (filter.maxDaysOnMarket !== undefined) {
    query.daysOnMarket = { $lte: filter.maxDaysOnMarket };
  }

  // Listed after date (new/updated listings)
  // IMPORTANT: Use modificationTimestamp instead of onMarketDate
  // - onMarketDate: Original listing date (never changes)
  // - modificationTimestamp: Last update date (includes price changes, back on market, etc.)
  // This matches FlexMLS "new this week" which includes both new AND updated listings
  if (filter.listedAfter) {
    // If listedAfter is just a date (YYYY-MM-DD), append timestamp for proper comparison
    const dateFilter = typeof filter.listedAfter === 'string' && !filter.listedAfter.includes('T')
      ? `${filter.listedAfter}T00:00:00Z`
      : filter.listedAfter;

    query.modificationTimestamp = { $gte: dateFilter };
  }

  // Has open house
  if (filter.hasOpenHouse !== undefined) {
    if (filter.hasOpenHouse) {
      // Has at least one open house
      query.openHouses = { $exists: true, $ne: [], $not: { $size: 0 } };
    } else {
      // No open houses
      query.$or = [
        { openHouses: { $exists: false } },
        { openHouses: null },
        { openHouses: [] },
        { openHouses: { $size: 0 } },
      ];
    }
  }

  return query;
}
