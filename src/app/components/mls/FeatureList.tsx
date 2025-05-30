// src/app/components/mls/FeatureList.tsx

type FeatureListProps = {
    architecture?: string
    fireplaces?: number
    heating?: string
    cooling?: string
    pool?: boolean
    spa?: string
    view?: string
    furnished?: string
    hoaFee?: number
    hoaFreq?: string
  }
  
  export default function FeatureList({
    architecture,
    fireplaces,
    heating,
    cooling,
    pool,
    spa,
    view,
    furnished,
    hoaFee,
    hoaFreq,
  }: FeatureListProps) {
    const features = [
      architecture && `Style: ${architecture}`,
      fireplaces ? `Fireplaces: ${fireplaces}` : null,
      heating && `Heating: ${heating}`,
      cooling && `Cooling: ${cooling}`,
      pool && `Private Pool`,
      spa && `Spa: ${spa}`,
      view && `View: ${view}`,
      furnished && `Furnished: ${furnished}`,
      hoaFee && hoaFreq && `HOA: $${hoaFee.toLocaleString()} / ${hoaFreq}`,
    ].filter(Boolean)
  
    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Features & Amenities</h2>
        <ul className="list-disc list-inside text-gray-700 space-y-1">
          {features.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
    )
  }
  