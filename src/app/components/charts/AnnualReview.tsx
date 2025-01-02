import React from "react";

interface AnnualReviewProps {
  areaData: Record<string, any>;
  year: string; // e.g., "2024"
}

export const AnnualReview: React.FC<AnnualReviewProps> = ({ areaData, year }) => {
  return (
    <div>
      <h2 className="text-3xl font-bold mb-4">{year} Annual Review</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(areaData).map(([area, data]) => (
          <div key={area}>
            <h3 className="text-xl font-semibold">{area}</h3>
            <p>Total Sales: {data.total_sales}</p>
            <p>Expired Listings: {data.expired_listings}</p>
            <p>Highest Sale Price: ${data.highest_sale_price}</p>
            <p>Lowest Sale Price: ${data.lowest_sale_price}</p>
            {/* Add aggregated charts here as needed */}
          </div>
        ))}
      </div>
    </div>
  );
};
