import React from "react";
import VariableHero from "@/components/VariableHero";
import {
  desertSandsUnifiedSchoolDistrict,
  palmSpringsUnifiedSchoolDistrict,
  coachellaValleyUnifiedSchoolDistrict,
  SchoolDistrict,
  School,
} from "@/constants/schoolDataset";
import { Metadata } from "next";

const districts: { [key: string]: SchoolDistrict } = {
  psusd: palmSpringsUnifiedSchoolDistrict,
  dsusd: desertSandsUnifiedSchoolDistrict,
  cvusd: coachellaValleyUnifiedSchoolDistrict,
};

// Metadata function
export async function generateMetadata({ params }: { params: { cityId: string; district: string } }): Promise<Metadata> {
  const { cityId, district } = params;

  const selectedDistrict = districts[district];
  if (!selectedDistrict) {
    return {
      title: "District Not Found | JPS Realtor",
      description: "School district data not found for this area.",
    };
  }

  const keywords = [
    `${selectedDistrict.name} schools`,
    `${selectedDistrict.name} elementary schools`,
    `${selectedDistrict.name} middle schools`,
    `${selectedDistrict.name} high schools`,
    `${cityId} school district`,
  ].join(", ");

  return {
    title: `Schools in ${selectedDistrict.name} | JPS Realtor`,
    description: `Discover schools in the ${selectedDistrict.name}, including elementary, middle, and high schools. Learn more about education options in the area.`,
    keywords,
    metadataBase: new URL("https://jpsrealtor.com"),
    openGraph: {
      title: `Schools in ${selectedDistrict.name} | JPS Realtor`,
      description: `Explore ${selectedDistrict.name} schools and find the best educational opportunities in the area, including elementary, middle, and high schools.`,
      url: `https://jpsrealtor.com/neighborhoods/${cityId}/school-district/${district}`,
      images: [
        {
          url: `/city-images/${cityId}.jpg`,
          alt: `Schools in ${selectedDistrict.name}`,
        },
      ],
    },
  };
}

// District Schools Page
export default function DistrictSchoolsPage({ params }: { params: { cityId: string; district: string } }) {
  const { cityId, district } = params;

  const selectedDistrict = districts[district];

  if (!selectedDistrict) {
    return <p>District not found</p>;
  }

  return (
    <>
      {/* Hero Section */}
      <VariableHero
        backgroundImage={`/city-images/${cityId}.jpg`}
        heroContext={`${selectedDistrict.name} Schools`}
        description={`Explore the schools in the ${selectedDistrict.name}, including elementary, middle, and high schools.`}
      />

      <section className="mx-auto max-w-7xl px-6 sm:px-12 lg:px-36 py-12">
        <h1 className="text-4xl font-bold mb-6 text-white">Schools in {selectedDistrict.name}</h1>

        <h2 className="text-2xl font-semibold text-white mb-4">Elementary Schools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {selectedDistrict.schools.Elementary.map((school: School) => (
            <div key={school.id} className="border-white border p-6 rounded-lg shadow-md">
              <img
                src={`/images/SchoolDataset/Images/${school.slug}.jpg`}
                alt={school.name}
                className="w-full h-32 object-cover mb-4 rounded-md"
              />
              <h3 className="text-lg font-bold text-white mb-2">{school.name}</h3>
              <p className="text-gray-300 mb-2">{school.address}</p>
              <a
                href={school.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                Visit School Website
              </a>
            </div>
          ))}
        </div>

        <h2 className="text-2xl font-semibold text-white mb-4 mt-8">Middle Schools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {selectedDistrict.schools.Middle.map((school: School) => (
            <div key={school.id} className="border-white border p-6 rounded-lg shadow-md">
              <img
                src={`/images/SchoolDataset/Images/${school.slug}.jpg`}
                alt={school.name}
                className="w-full h-32 object-cover mb-4 rounded-md"
              />
              <h3 className="text-lg font-bold text-white mb-2">{school.name}</h3>
              <p className="text-gray-300 mb-2">{school.address}</p>
              <a
                href={school.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                Visit School Website
              </a>
            </div>
          ))}
        </div>

        <h2 className="text-2xl font-semibold text-white mb-4 mt-8">High Schools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {selectedDistrict.schools.HighSchool.map((school: School) => (
            <div key={school.id} className="border-white border p-6 rounded-lg shadow-md">
              <img
                src={`/images/SchoolDataset/Images/${school.slug}.jpg`}
                alt={school.name}
                className="w-full h-32 object-cover mb-4 rounded-md"
              />
              <h3 className="text-lg font-bold text-white mb-2">{school.name}</h3>
              <p className="text-gray-300 mb-2">{school.address}</p>
              <a
                href={school.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                Visit School Website
              </a>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
