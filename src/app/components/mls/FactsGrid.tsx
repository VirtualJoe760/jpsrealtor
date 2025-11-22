"use client";

import { useThemeClasses } from "@/app/contexts/ThemeContext";

type FactsGridProps = {
    beds?: number
    baths?: number
    halfBaths?: number
    sqft?: number
    yearBuilt?: number
  }

  export default function FactsGrid({
    beds,
    baths,
    halfBaths,
    sqft,
    yearBuilt,
  }: FactsGridProps) {
    const { textSecondary } = useThemeClasses();

    return (
      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-4 my-6 text-sm ${textSecondary}`}>
        {beds !== undefined && (
          <div>
            <span className={`font-semibold block ${textSecondary}`}>Bedrooms</span>
            {beds}
          </div>
        )}
        {baths !== undefined && (
          <div>
            <span className={`font-semibold block ${textSecondary}`}>Full Baths</span>
            {baths}
          </div>
        )}
        {halfBaths !== undefined && halfBaths > 0 && (
          <div>
            <span className={`font-semibold block ${textSecondary}`}>Half Baths</span>
            {halfBaths}
          </div>
        )}
        {sqft !== undefined && (
          <div>
            <span className={`font-semibold block ${textSecondary}`}>Square Feet</span>
            {sqft.toLocaleString()}
          </div>
        )}
        {yearBuilt !== undefined && (
          <div>
            <span className={`font-semibold block ${textSecondary}`}>Year Built</span>
            {yearBuilt}
          </div>
        )}
      </div>
    )
  }
