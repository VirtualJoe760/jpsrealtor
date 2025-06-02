// src/app/components/mls/ListingDescription.tsx

type ListingDescriptionProps = {
    remarks?: string
  }
  
  export default function ListingDescription({ remarks }: ListingDescriptionProps) {
    if (!remarks) return null
  
    return (
      <div className="prose max-w-none text-gray-300 mb-10">
        <h2 className="text-xl text-white font-semibold mb-2">Property Description</h2>
        <p>{remarks}</p>
      </div>
    )
  }
  