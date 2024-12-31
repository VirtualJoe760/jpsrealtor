"use client";

import React, { useState, useEffect } from "react";
import VariableHero from "@/components/VariableHero";
import AddDataUserModal from "@/components/AddDataUserModal";
import { fetchSchoolsByCity } from "@/utils/fetchSchoolsByCity";
import { coachellaValleyCities } from "@/constants/cities";
import SchoolCard from "@/components/SchoolCard";

export default function SchoolsPage({ params }: { params: { cityId: string } }) {
  const { cityId } = params;

  // Find city data
  const city = coachellaValleyCities.find((c) => c.id === cityId);

  if (!city) {
    return <p>City not found</p>;
  }

  if (!city.coordinates) {
    return <p>Coordinates not found for this city.</p>;
  }

  const { latitude, longitude } = city.coordinates;

  // States
  const [schools, setSchools] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<any | null>(null);

  // Fetch schools on component mount
  useEffect(() => {
    async function loadSchools() {
      try {
        const schoolData = await fetchSchoolsByCity(latitude, longitude);
        setSchools(schoolData);
      } catch (error) {
        console.error("Error fetching schools:", error);
      }
    }
    loadSchools();
  }, [latitude, longitude]);

  // Filter schools based on search term
  const filteredSchools = schools.filter((school) =>
    school.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* Hero Section */}
      <VariableHero
        backgroundImage={`/city-images/${city.id}.jpg`}
        heroContext={city.name}
        description={`Discover schools in and around ${city.name}, including public, private, and charter options.`}
      />

      {/* Search Section */}
      <section className="mx-auto max-w-7xl px-6 sm:px-12 lg:px-36 py-12">
        <h1 className="text-4xl font-bold mb-6 text-white">
          Schools in {city.name} and Nearby Areas
        </h1>
        <div className="relative mb-8">
          <input
            type="text"
            placeholder="Search schools..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 border border-gray-500 rounded-md shadow-sm bg-black text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
          />
        </div>

        {/* Schools List */}
        {filteredSchools.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {filteredSchools.map((school) => (
              <SchoolCard
                key={school.id}
                id={school.id}
                name={school.name}
                address={school.address}
                rating={school.rating}
                photoReference={school.photos?.[0]?.photo_reference || null}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-300">No schools found for your search.</p>
        )}
      </section>

      {/* Modal */}
      <AddDataUserModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedSchool(null);
        }}
        onSubmit={(formData) => {
          console.log("User submitted:", formData);
          setIsModalOpen(false);
        }}
      />
    </>
  );
}
