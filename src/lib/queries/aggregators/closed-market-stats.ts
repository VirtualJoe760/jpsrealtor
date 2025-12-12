/**
 * Closed Market Stats Aggregator
 *
 * Calculates aggregated statistics from closed/sold listings.
 * Used for historical market analysis and appreciation calculations.
 */

import UnifiedClosedListing from '@/models/unified-closed-listing';
import type { ClosedListingsFilters } from './closed-listings';

export interface ClosedMarketStats {
  totalSales: number;
  avgClosePrice: number;
  medianClosePrice: number;
  minClosePrice: number;
  maxClosePrice: number;
  avgPricePerSqft?: number;
  medianPricePerSqft?: number;
  avgDaysOnMarket?: number;
  medianDaysOnMarket?: number;
  salesByMonth?: Record<string, number>;
  avgBeds?: number;
  avgBaths?: number;
  avgSqft?: number;
}

/**
 * Build query for closed listings
 */
function buildClosedQuery(filters: ClosedListingsFilters): any {
  const query: any = {
    standardStatus: 'Closed',
    closePrice: { $exists: true, $ne: null, $gt: 0 },
    closeDate: { $exists: true, $ne: null },
  };

  // Location filters
  if (filters.city) query.city = { $regex: new RegExp(`^${filters.city}$`, 'i') };
  if (filters.subdivision) query.subdivisionName = { $regex: new RegExp(filters.subdivision, 'i') };
  if (filters.zip) query.postalCode = filters.zip;
  if (filters.county) query.countyOrParish = { $regex: new RegExp(filters.county, 'i') };

  // Time filters
  if (filters.startDate || filters.endDate || filters.yearsBack) {
    const dateQuery: any = {};

    if (filters.yearsBack) {
      const yearsAgo = new Date();
      yearsAgo.setFullYear(yearsAgo.getFullYear() - filters.yearsBack);
      dateQuery.$gte = yearsAgo;
    } else if (filters.startDate) {
      dateQuery.$gte = filters.startDate;
    }

    if (filters.endDate) {
      dateQuery.$lte = filters.endDate;
    }

    query.closeDate = dateQuery;
  }

  // Property filters
  if (filters.propertyType) query.propertyType = filters.propertyType;
  if (filters.propertySubType) {
    query.propertySubType = { $regex: new RegExp(filters.propertySubType as string, 'i') };
  }
  if (filters.minBeds) query.bedroomsTotal = { $gte: filters.minBeds };
  if (filters.minBaths) query.bathroomsTotalDecimal = { $gte: filters.minBaths };
  if (filters.minSqft) query.livingArea = { $gte: filters.minSqft };
  if (filters.maxPrice) query.closePrice.$lte = filters.maxPrice;
  if (filters.minPrice) query.closePrice.$gte = filters.minPrice;

  return query;
}

/**
 * Get comprehensive market stats for closed listings
 */
export async function getClosedMarketStats(
  filters: ClosedListingsFilters
): Promise<ClosedMarketStats> {
  const query = buildClosedQuery(filters);

  const pipeline: any[] = [
    { $match: query },
    {
      $group: {
        _id: null,
        totalSales: { $sum: 1 },
        avgClosePrice: { $avg: '$closePrice' },
        minClosePrice: { $min: '$closePrice' },
        maxClosePrice: { $max: '$closePrice' },
        avgPricePerSqft: {
          $avg: {
            $cond: [
              { $gt: ['$livingArea', 0] },
              { $divide: ['$closePrice', '$livingArea'] },
              null,
            ],
          },
        },
        avgDaysOnMarket: { $avg: '$daysOnMarket' },
        avgBeds: { $avg: { $ifNull: ['$bedroomsTotal', '$bedsTotal'] } },
        avgBaths: { $avg: '$bathroomsTotalDecimal' },
        avgSqft: { $avg: '$livingArea' },
        prices: { $push: '$closePrice' },
        pricesPerSqft: {
          $push: {
            $cond: [
              { $gt: ['$livingArea', 0] },
              { $divide: ['$closePrice', '$livingArea'] },
              null,
            ],
          },
        },
        daysOnMarketList: { $push: '$daysOnMarket' },
      },
    },
    {
      $project: {
        totalSales: 1,
        avgClosePrice: { $round: ['$avgClosePrice', 0] },
        minClosePrice: 1,
        maxClosePrice: 1,
        avgPricePerSqft: { $round: ['$avgPricePerSqft', 0] },
        avgDaysOnMarket: { $round: ['$avgDaysOnMarket', 0] },
        avgBeds: { $round: ['$avgBeds', 1] },
        avgBaths: { $round: ['$avgBaths', 1] },
        avgSqft: { $round: ['$avgSqft', 0] },
        medianClosePrice: {
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
                  { $size: { $filter: { input: '$prices', as: 'p', cond: { $ne: ['$$p', null] } } } },
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
                      $filter: { input: '$daysOnMarketList', as: 'd', cond: { $ne: ['$$d', null] } },
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

  const [stats] = await UnifiedClosedListing.aggregate(pipeline);

  return (
    stats || {
      totalSales: 0,
      avgClosePrice: 0,
      medianClosePrice: 0,
      minClosePrice: 0,
      maxClosePrice: 0,
    }
  );
}

/**
 * Get sales volume by month for trend analysis
 */
export async function getSalesByMonth(
  filters: ClosedListingsFilters
): Promise<Record<string, number>> {
  const query = buildClosedQuery(filters);

  const pipeline = [
    { $match: query },
    {
      $group: {
        _id: {
          year: { $year: '$closeDate' },
          month: { $month: '$closeDate' },
        },
        count: { $sum: 1 },
        avgPrice: { $avg: '$closePrice' },
      },
    },
    { $sort: { '_id.year': -1 as const, '_id.month': -1 as const } },
  ];

  const results = await UnifiedClosedListing.aggregate(pipeline);

  return results.reduce(
    (acc, item) => {
      const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      acc[key] = item.count;
      return acc;
    },
    {} as Record<string, number>
  );
}
