/**
 * Price Filter Builder
 *
 * Builds MongoDB queries for price-based filters.
 */

export interface PriceFilter {
  minPrice?: number;
  maxPrice?: number;
  minPricePerSqft?: number;
  maxPricePerSqft?: number;
}

/**
 * Build MongoDB query object from price filters
 */
export function buildPriceQuery(filter: PriceFilter): any {
  const query: any = {};

  // Price range filter
  if (filter.minPrice !== undefined || filter.maxPrice !== undefined) {
    const priceQuery: any = {};
    if (filter.minPrice !== undefined) priceQuery.$gte = filter.minPrice;
    if (filter.maxPrice !== undefined) priceQuery.$lte = filter.maxPrice;
    query.listPrice = priceQuery;
  }

  // Price per sqft filter (calculated field)
  // This requires a $expr aggregation expression
  if (filter.minPricePerSqft !== undefined || filter.maxPricePerSqft !== undefined) {
    const conditions: any[] = [];

    // Ensure livingArea exists and is > 0
    conditions.push({ $gt: ['$livingArea', 0] });

    // Calculate price per sqft and compare
    if (filter.minPricePerSqft !== undefined) {
      conditions.push({
        $gte: [{ $divide: ['$listPrice', '$livingArea'] }, filter.minPricePerSqft],
      });
    }

    if (filter.maxPricePerSqft !== undefined) {
      conditions.push({
        $lte: [{ $divide: ['$listPrice', '$livingArea'] }, filter.maxPricePerSqft],
      });
    }

    query.$expr = { $and: conditions };
  }

  return query;
}
