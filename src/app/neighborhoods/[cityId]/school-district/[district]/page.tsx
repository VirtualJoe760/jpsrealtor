"use client";

import React from "react";
import VariableHero from "@/components/VariableHero";
import {
  desertSandsUnifiedSchoolDistrict,
  palmSpringsUnifiedSchoolDistrict,
  coachellaValleyUnifiedSchoolDistrict,
  SchoolDistrict,
  School,
} from "@/constants/schoolDataset";

const districts: { [key: string]: SchoolDistrict } = {
  psusd: palmSpringsUnifiedSchoolDistrict,
  dsusd: desertSandsUnifiedSchoolDistrict,
  cvusd: coachellaValleyUnifiedSchoolDistrict,
};

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
            <div key={school.id} className="bg-gray-800 p-6 rounded-lg shadow-md">
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
            <div key={school.id} className="bg-gray-800 p-6 rounded-lg shadow-md">
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
            <div key={school.id} className="bg-gray-800 p-6 rounded-lg shadow-md">
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
