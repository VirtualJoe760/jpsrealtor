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
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-6 text-sm text-gray-300">
        {beds !== undefined && (
          <div>
            <span className="font-semibold block text-gray-300">Bedrooms</span>
            {beds}
          </div>
        )}
        {baths !== undefined && (
          <div>
            <span className="font-semibold block text-gray-300">Full Baths</span>
            {baths}
          </div>
        )}
        {halfBaths !== undefined && halfBaths > 0 && (
          <div>
            <span className="font-semibold block text-gray-300">Half Baths</span>
            {halfBaths}
          </div>
        )}
        {sqft !== undefined && (
          <div>
            <span className="font-semibold block text-gray-300">Square Feet</span>
            {sqft.toLocaleString()}
          </div>
        )}
        {yearBuilt !== undefined && (
          <div>
            <span className="font-semibold block text-gray-300">Year Built</span>
            {yearBuilt}
          </div>
        )}
      </div>
    )
  }
  