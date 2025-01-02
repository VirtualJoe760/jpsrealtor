import React from "react";
import VariableHero from "@/components/VariableHero";
import { coachellaValleyCities } from "@/constants/cities";

const districts = [
  {
    id: "psusd",
    name: "Palm Springs Unified School District",
    description: "Serving Palm Springs, Desert Hot Springs, Cathedral City, and nearby areas.",
  },
  {
    id: "dsusd",
    name: "Desert Sands Unified School District",
    description: "Covering La Quinta, Indian Wells, Palm Desert, and surrounding regions.",
  },
  {
    id: "cvusd",
    name: "Coachella Valley Unified School District",
    description: "Focused on Coachella, Thermal, Mecca, and the rural surrounding areas.",
  },
];

export async function generateMetadata({ params }: { params: { cityId: string } }) {
  const { cityId } = params;

  // Find city data
  const city = coachellaValleyCities.find((c) => c.id === cityId);
  if (!city) {
    return {
      title: "City Not Found | JPS Realtor",
      description: "City data not found for school districts in this area.",
    };
  }

  const keywords = districts
    .map((district) => district.name)
    .concat([`${city.name} school districts`, `Schools in ${city.name}`])
    .join(", ");

  return {
    title: `School Districts in ${city.name} | JPS Realtor`,
    description: `Explore the school districts serving ${city.name}, including Palm Springs Unified, Desert Sands Unified, and Coachella Valley Unified School Districts.`,
    keywords,
    metadataBase: new URL("https://jpsrealtor.com"),
    openGraph: {
      title: `School Districts in ${city.name} | JPS Realtor`,
      description: `Learn more about the school districts serving ${city.name} and surrounding areas, including available schools and district details.`,
      url: `https://jpsrealtor.com/neighborhoods/${cityId}/school-districts`,
      images: [
        {
          url: `/city-images/${city.id}.jpg`,
          alt: `School Districts in ${city.name}`,
        },
      ],
    },
  };
}

export default function SchoolDistrictPage({ params }: { params: { cityId: string } }) {
  const { cityId } = params;

  // Find city data
  const city = coachellaValleyCities.find((c) => c.id === cityId);

  if (!city) {
    return <p>City not found</p>;
  }

  return (
    <>
      {/* Hero Section */}
      <VariableHero
        backgroundImage={`/city-images/${city.id}.jpg`}
        heroContext={`School Districts in ${city.name}`}
        description={`Explore the school districts serving ${city.name} and the surrounding areas.`}
      />

      {/* Districts Section */}
      <section className="mx-auto max-w-7xl px-6 sm:px-12 lg:px-36 py-12">
        <h1 className="text-5xl font-bold mb-6 text-white">School Districts in {city.name}</h1>
        <p className="text-xl mb-8 leading-8">
          The Coachella Valley is served by three primary school districts, each offering distinct boundaries
          and communities. The Palm Springs Unified School District (PSUSD) serves areas such as Palm Springs, Desert Hot Springs, and Cathedral City. Desert Sands Unified School District (DSUSD) covers regions like La Quinta, Indian Wells, and Palm Desert, known for its high-rated schools and suburban charm. Coachella Valley Unified School District (CVUSD) encompasses Coachella, Thermal, and Mecca, providing education across more rural parts of the valley. For buyers and families, understanding these districts’ boundaries is crucial, as proximity to quality schools can significantly influence your real estate goals.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {districts.map((district) => (
            <div
              key={district.id}
              className="border-white border p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            >
              <h2 className="text-2xl font-bold text-white mb-2">{district.name}</h2>
              <p className="text-gray-300 mb-4">{district.description}</p>
              <a
                href={`/neighborhoods/${cityId}/school-district/${district.id}`}
                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-500"
              >
                View Schools
              </a>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
