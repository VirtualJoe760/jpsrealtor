"use client";

import React, { useState } from "react";
import VariableHero from "@/components/VariableHero";
import AddDataUserModal from "@/components/AddDataUserModal";
import masterHoaData from "@/constants/hoa/master_hoa_data_verified.json"; // Import the master HOA data
import { coachellaValleyCities } from "@/constants/cities";
import { Hoa } from "@/types/hoa";

// Utility function to transform raw HOA data into the Hoa interface
function transformHoaData(rawData: any[]): Hoa[] {
  return rawData.map((item) => ({
    "Subdivision/Countryclub": item["Subdivision/Countryclub"] || "Unknown",
    "Management Company": item["Management Company"] || "Unknown",
    Address: item.Address || "Unknown Address",
    "City, State, Zip": item["City, State, Zip"] || "Unknown",
    Phone: item.Phone || null,
    Fax: item.Fax || null,
    City: item.City || "Unknown City",
    State: item.State || "Unknown State",
    Zip: item.Zip || "00000",
    id: item.id || `unknown-${Math.random().toString(36).substring(2, 10)}`,
    count: item.count || 0,
    slug: item.slug || item["Subdivision/Countryclub"].toLowerCase().replace(/\s+/g, "-"),
  }));
}

// Transform the raw HOA data
const hoaData: Hoa[] = transformHoaData(masterHoaData);

export default function HoaContactInfoPage({ params }: { params: { cityId: string } }) {
  const { cityId } = params;

  // Find city data
  const city = coachellaValleyCities.find((c) => c.id === cityId);

  if (!city) {
    return <p>City not found</p>;
  }

  // State for search
  const [searchTerm, setSearchTerm] = useState("");

  // State for modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHoa, setSelectedHoa] = useState<Hoa | null>(null);

  const handleSubmit = async (formData: {
    name: string;
    email: string;
    resident: string;
    message: string;
  }) => {
    try {
      const response = await fetch("/api/hoa-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, hoa: selectedHoa }),
      });

      if (response.ok) {
        alert("Thank you for helping us update our data!");
        setIsModalOpen(false);
        setSelectedHoa(null);
      } else {
        alert("Failed to submit the update. Please try again later.");
      }
    } catch (error) {
      console.error("Error submitting update:", error);
    }
  };

  // Filter HOAs dynamically based on search term or city
  const filteredHoa = hoaData.filter(
    (hoa) =>
      hoa["Subdivision/Countryclub"]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hoa.City.toLowerCase() === city.name.toLowerCase()
  );

  return (
    <>
      {/* Hero Section */}
      <VariableHero
        backgroundImage={`/city-images/${city.id}.jpg`}
        heroContext={city.name}
        description={`Explore HOA contact information for subdivisions in and around ${city.name}.`}
      />

      {/* Search Section */}
      <section className="mx-auto max-w-7xl px-6 sm:px-12 lg:px-36 py-12">
        <h1 className="text-4xl font-bold mb-6 text-white">
          HOA Contact Information for {city.name} and Nearby Areas
        </h1>
        <div className="relative mb-8">
          <input
            type="text"
            placeholder="Search HOA..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 border border-gray-500 rounded-md shadow-sm bg-black text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
          />
        </div>

        {/* HOA List */}
        {filteredHoa.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredHoa.map((hoa) => (
              <div key={hoa.id} className="bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-white">{hoa["Subdivision/Countryclub"]}</h2>
                <p className="text-gray-300">
                  <strong>Management Company:</strong> {hoa["Management Company"] || "N/A"}
                </p>
                <p className="text-gray-300">
                  <strong>Address:</strong> {hoa.Address || "N/A"}
                </p>
                <p className="text-gray-300">
                  <strong>City:</strong> {hoa.City || "N/A"}
                </p>
                <p className="text-gray-300">
                  <strong>Phone:</strong> {hoa.Phone || "N/A"}
                </p>
                <p className="text-gray-300">
                  <strong>Fax:</strong> {hoa.Fax || "N/A"}
                </p>
                <div className="mt-4 text-center">
                  <p className="my-2">Do we have missing or incorrect data?</p>
                  <button
                    onClick={() => {
                      setSelectedHoa(hoa);
                      setIsModalOpen(true);
                    }}
                    className="px-6 py-2 bg-gray-700 text-white font-bold rounded-md hover:bg-gray-600"
                  >
                    Update Information
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-300">No HOA data found for your search.</p>
        )}
      </section>

      {/* Modal */}
      <AddDataUserModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedHoa(null);
        }}
        onSubmit={handleSubmit}
      />
    </>
  );
}
