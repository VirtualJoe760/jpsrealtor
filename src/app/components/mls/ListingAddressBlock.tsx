// src/app/components/mls/ListingAddressBlock.tsx

type ListingAddressBlockProps = {
    address: string
    city: string
    state: string
    zip: string
    subdivision?: string
    listingId: string
  }
  
  export default function ListingAddressBlock({
    address,
    city,
    state,
    zip,
    subdivision,
    listingId,
  }: ListingAddressBlockProps) {
    return (
      <div className="mb-6 text-sm text-gray-600">
        <p className="font-semibold text-lg text-gray-900">{address}</p>
        <p>
          {city}, {state} {zip}
        </p>
        {subdivision && <p>Subdivision: {subdivision}</p>}
        <p className="text-xs mt-1">MLS#: {listingId}</p>
      </div>
    )
  }
  