import React from "react";
import { SalesVsExpired } from "@/app/components/charts/SalesVsExpired";
import { PriceRangeChart } from "@/app/components/charts/PriceRangeChart";
import { DaysOnMarket } from "@/app/components/charts/DaysOnMarket";
import { SaleListPriceMetrics } from "@/app/components/charts/SaleListPriceMetrics";
import { HighVsLowSalePriceChart } from "@/app/components/charts/HighVsLowSalePriceChart";

interface QuarterlyAnalysisProps {
  areaData: Record<string, any>;
  quarter: string; // e.g., "Q1 2024"
}

export const QuarterlyAnalysis: React.FC<QuarterlyAnalysisProps> = ({ areaData, quarter }) => {
  if (!areaData || Object.keys(areaData).length === 0) {
    return <p>No data available for {quarter}.</p>;
  }

  return (
    <div>
      {/* First Grid: Expired vs Closed and Closed by Price Range */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(areaData).map(([area, data]) => {
          if (!data) {
            return null;
          }

          const salesVsExpiredData = [
            { category: "Closed", value: data.total_sales ?? 0, fill: "hsl(var(--chart-1))" },
            { category: "Expired", value: data.expired_listings ?? 0, fill: "hsl(var(--chart-2))" },
          ];

          return (
            <SalesVsExpired
              key={`${area}-sales-expired`}
              chartTitle={`Expired vs. Closed Listings - ${data.area}`}
              chartDescription={`Comparison of closed and expired listings for ${data.area}`}
              data={salesVsExpiredData}
            />
          );
        })}

        {Object.entries(areaData).map(([area, data]) => {
          if (!data) return null;

          const priceRangeData = [
            { range: "Under $500k", closed: data.price_ranges?.under_500k ?? 0 },
            { range: "$500k-$1M", closed: data.price_ranges?.["500k_to_1m"] ?? 0 },
            { range: "$1M-$2M", closed: data.price_ranges?.["1m_to_2m"] ?? 0 },
            { range: "Over $2M", closed: data.price_ranges?.over_2m ?? 0 },
          ];

          return (
            <PriceRangeChart
              key={`${area}-price-range`}
              chartTitle={`Closed Sales by Price Range - ${data.area}`}
              chartDescription={`${data.area} - ${quarter}`}
              chartFooter="Shows the distribution of closed sales by price range."
              data={priceRangeData}
            />
          );
        })}
      </div>

      {/* Second Grid: Days on Market */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
        {Object.entries(areaData).map(([area, data]) => {
          if (!data) return null;

          const domMetrics = data.closed_data_metrics?.days_on_market || {
            average: 0,
            median: 0,
            min: 0,
            max: 0,
          };

          const chartData = [
            { category: "Average", value: domMetrics.average },
            { category: "Median", value: domMetrics.median },
            { category: "Min", value: domMetrics.min },
            { category: "Max", value: domMetrics.max },
          ];

          return (
            <DaysOnMarket
              key={`${area}-days-on-market`}
              chartTitle={`Days on Market - ${data.area}`}
              chartDescription="Visualizing average, median, and range of days on market."
              data={chartData}
              chartFooter="If min is 0, it represents an off-market listing was sold."
            />
          );
        })}
      </div>

      {/* Third Grid: Sale vs. List Price and High vs. Low Sale Price */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
        {Object.entries(areaData).map(([area, data]) => {
          if (!data) return null;

          const saleListPriceData = [
            {
              category: "Average",
              salePrice: data.closed_data_metrics?.sale_price?.average ?? 0,
              listPrice: data.closed_data_metrics?.list_price?.average ?? 0,
            },
            {
              category: "Median",
              salePrice: data.closed_data_metrics?.sale_price?.median ?? 0,
              listPrice: data.closed_data_metrics?.list_price?.median ?? 0,
            },
            {
              category: "Min",
              salePrice: data.closed_data_metrics?.sale_price?.min ?? 0,
              listPrice: data.closed_data_metrics?.list_price?.min ?? 0,
            },
            {
              category: "Max",
              salePrice: data.closed_data_metrics?.sale_price?.max ?? 0,
              listPrice: data.closed_data_metrics?.list_price?.max ?? 0,
            },
          ];

          return (
            <SaleListPriceMetrics
              key={`${area}-sale-list-price`}
              chartTitle={`Sale vs. List Price Metrics - ${data.area}`}
              chartDescription="Comparing average, median, min, and max values for sale and list prices."
              data={saleListPriceData}
            />
          );
        })}

        {Object.entries(areaData).map(([area, data]) => {
          if (!data) return null;

          const highLowSalePriceData = [
            { category: "High Sale Price", value: data.highest_sale_price ?? 0 },
            { category: "Low Sale Price", value: data.lowest_sale_price ?? 0 },
          ];

          return (
            <HighVsLowSalePriceChart
              key={`${area}-high-low-sale-price`}
              chartTitle={`High vs. Low Sale Price - ${data.area}`}
              chartDescription="Visualizing the highest and lowest sale prices."
              data={highLowSalePriceData}
            />
          );
        })}
      </div>
    </div>
  );
};
