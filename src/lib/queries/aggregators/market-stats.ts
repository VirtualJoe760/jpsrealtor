/**
 * Market Stats Aggregator
 *
 * Calculates aggregated statistics from listings using MongoDB aggregation.
 * Provides efficient stats calculation at the database level.
 */

import UnifiedListing from '@/models/unified-listing';
import { combineFilters, type CombinedFilters } from '../filters';

export interface MarketStats {
  totalListings: number;
  avgPrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  avgPricePerSqft?: number;
  medianPricePerSqft?: number;
  avgDaysOnMarket?: number;
  medianDaysOnMarket?: number;
  inventoryByPropertyType?: Record<string, number>;
  inventoryByPriceRange?: Record<string, number>;
  avgBeds?: number;
  avgBaths?: number;
  avgSqft?: number;
}

/**
 * Get comprehensive market stats for a location using MongoDB aggregation
 */
export async function getMarketStats(filters: CombinedFilters): Promise<MarketStats> {
  const query = combineFilters(filters);

  const pipeline: any[] = [
    { $match: query },
    {
      $group: {
        _id: null,
        totalListings: { $sum: 1 },
        avgPrice: { $avg: '$listPrice' },
        minPrice: { $min: '$listPrice' },
        maxPrice: { $max: '$listPrice' },
        avgPricePerSqft: {
          $avg: {
            $cond: [
              { $gt: ['$livingArea', 0] },
              { $divide: ['$listPrice', '$livingArea'] },
              null,
            ],
          },
        },
        avgDaysOnMarket: { $avg: '$daysOnMarket' },
        avgBeds: { $avg: { $ifNull: ['$bedroomsTotal', '$bedsTotal'] } },
        avgBaths: { $avg: '$bathroomsTotalDecimal' },
        avgSqft: { $avg: '$livingArea' },
        prices: { $push: '$listPrice' },
        pricesPerSqft: {
          $push: {
            $cond: [
              { $gt: ['$livingArea', 0] },
              { $divide: ['$listPrice', '$livingArea'] },
              null,
            ],
          },
        },
        daysOnMarketList: { $push: '$daysOnMarket' },
      },
    },
    {
      $project: {
        totalListings: 1,
        avgPrice: { $round: ['$avgPrice', 0] },
        minPrice: 1,
        maxPrice: 1,
        avgPricePerSqft: { $round: ['$avgPricePerSqft', 0] },
        avgDaysOnMarket: { $round: ['$avgDaysOnMarket', 0] },
        avgBeds: { $round: ['$avgBeds', 1] },
        avgBaths: { $round: ['$avgBaths', 1] },
        avgSqft: { $round: ['$avgSqft', 0] },
        medianPrice: {
          $arrayElemAt: [
            {
              $sortArray: {
                input: { $filter: { input: '$prices', as: 'p', cond: { $ne: ['$$p', null] } } },
                sortBy: 1,
              },
            },
            {
              $floor: {
                $divide: [
                  {
                    $size: {
                      $filter: { input: '$prices', as: 'p', cond: { $ne: ['$$p', null] } },
                    },
                  },
                  2,
                ],
              },
            },
          ],
        },
        medianPricePerSqft: {
          $arrayElemAt: [
            {
              $sortArray: {
                input: {
                  $filter: { input: '$pricesPerSqft', as: 'p', cond: { $ne: ['$$p', null] } },
                },
                sortBy: 1,
              },
            },
            {
              $floor: {
                $divide: [
                  {
                    $size: {
                      $filter: { input: '$pricesPerSqft', as: 'p', cond: { $ne: ['$$p', null] } },
                    },
                  },
                  2,
                ],
              },
            },
          ],
        },
        medianDaysOnMarket: {
          $arrayElemAt: [
            {
              $sortArray: {
                input: {
                  $filter: { input: '$daysOnMarketList', as: 'd', cond: { $ne: ['$$d', null] } },
                },
                sortBy: 1,
              },
            },
            {
              $floor: {
                $divide: [
                  {
                    $size: {
                      $filter: {
                        input: '$daysOnMarketList',
                        as: 'd',
                        cond: { $ne: ['$$d', null] },
                      },
                    },
                  },
                  2,
                ],
              },
            },
          ],
        },
      },
    },
  ];

  const [stats] = await UnifiedListing.aggregate(pipeline);

  return (
    stats || {
      totalListings: 0,
      avgPrice: 0,
      medianPrice: 0,
      minPrice: 0,
      maxPrice: 0,
    }
  );
}

/**
 * Get inventory breakdown by property type
 */
export async function getInventoryByPropertyType(
  filters: CombinedFilters
): Promise<Record<string, number>> {
  const query = combineFilters(filters);

  const breakdown = await UnifiedListing.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$propertySubType',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  return breakdown.reduce(
    (acc, item) => {
      acc[item._id || 'Unknown'] = item.count;
      return acc;
    },
    {} as Record<string, number>
  );
}

/**
 * Get inventory breakdown by price range
 */
export async function getInventoryByPriceRange(
  filters: CombinedFilters
): Promise<Record<string, number>> {
  const query = combineFilters(filters);

  const breakdown = await UnifiedListing.aggregate([
    { $match: query },
    {
      $bucket: {
        groupBy: '$listPrice',
        boundaries: [0, 250000, 500000, 750000, 1000000, 1500000, 2000000, 5000000, 10000000],
        default: '10M+',
        output: {
          count: { $sum: 1 },
        },
      },
    },
  ]);

  const labels: Record<number, string> = {
    0: 'Under $250K',
    250000: '$250K-$500K',
    500000: '$500K-$750K',
    750000: '$750K-$1M',
    1000000: '$1M-$1.5M',
    1500000: '$1.5M-$2M',
    2000000: '$2M-$5M',
    5000000: '$5M-$10M',
  };

  return breakdown.reduce(
    (acc, item) => {
      const label = typeof item._id === 'number' ? labels[item._id] : item._id;
      acc[label] = item.count;
      return acc;
    },
    {} as Record<string, number>
  );
}

/**
 * Get price distribution percentiles
 */
export async function getPricePercentiles(
  filters: CombinedFilters
): Promise<{ p25: number; p50: number; p75: number; p90: number }> {
  const query = combineFilters(filters);

  const [result] = await UnifiedListing.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        prices: { $push: '$listPrice' },
      },
    },
    {
      $project: {
        sortedPrices: {
          $sortArray: {
            input: { $filter: { input: '$prices', as: 'p', cond: { $ne: ['$$p', null] } } },
            sortBy: 1,
          },
        },
        count: {
          $size: { $filter: { input: '$prices', as: 'p', cond: { $ne: ['$$p', null] } } },
        },
      },
    },
    {
      $project: {
        p25: {
          $arrayElemAt: ['$sortedPrices', { $floor: { $multiply: ['$count', 0.25] } }],
        },
        p50: {
          $arrayElemAt: ['$sortedPrices', { $floor: { $multiply: ['$count', 0.5] } }],
        },
        p75: {
          $arrayElemAt: ['$sortedPrices', { $floor: { $multiply: ['$count', 0.75] } }],
        },
        p90: {
          $arrayElemAt: ['$sortedPrices', { $floor: { $multiply: ['$count', 0.9] } }],
        },
      },
    },
  ]);

  return result || { p25: 0, p50: 0, p75: 0, p90: 0 };
}
