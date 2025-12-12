/**
 * Time Filter Builder
 *
 * Builds MongoDB queries for time-based filters.
 * Supports filtering by days on market, listing date, and open houses.
 */

export interface TimeFilter {
  maxDaysOnMarket?: number;
  listedAfter?: Date;
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

  // Listed after date (new listings)
  if (filter.listedAfter) {
    query.onMarketDate = { $gte: filter.listedAfter };
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
