"use client";
import React, { useState } from "react";
import VariableHero from "@/components/VariableHero";
import AddDataUserModal from "@/components/AddDataUserModal";
import { coachellaValleyCities } from "@/constants/cities";
import { notFound } from "next/navigation";
import { Hoa } from "@/types/hoa";
import hoaData from "@/constants/hoa";

export default function HoaContactInfoPage({ params }: { params: { cityId: string } }) {
  const { cityId } = params;

  // Find city data
  const city = coachellaValleyCities.find((c) => c.id === cityId);

  if (!city) {
    notFound();
  }

  // Get HOA data for the city dynamically using the index.ts structure
  const cityHoaData = (hoaData[cityId as keyof typeof hoaData] || []) as Hoa[];

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

  // Filtered HOA based on search term
  const filteredHoa = searchTerm
    ? cityHoaData.filter((hoa: Hoa) =>
        hoa["Subdivision/Countryclub"]
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase())
      )
    : [];

  return (
    <>
      {/* Hero Section */}
      <VariableHero
        backgroundImage={`/city-images/${city.id}.jpg`}
        heroContext={city.name}
        description={`View HOA contact information for subdivisions in ${city.name}.`}
      />

      {/* Search and List Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-4xl font-bold mb-6 text-white">HOA Contact Information in {city.name}</h1>

        {/* Search Bar */}
        <div className="relative mb-8">
          <input
            type="text"
            placeholder="Search HOA..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 border border-gray-500 rounded-md shadow-sm bg-black text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
          />
        </div>

        {/* Show Filtered HOA Preview */}
        {filteredHoa.length > 0 && (
          <div className="mb-8 p-4 bg-gray-800 rounded-lg shadow-lg">
            {filteredHoa.map((hoa: Hoa) => (
              <details key={hoa.id} className="p-4 bg-gray-900 rounded-lg shadow-lg" open>
                <summary className="text-xl font-bold text-white cursor-pointer">
                  {hoa["Subdivision/Countryclub"] || "N/A"}
                </summary>
                <div className="mt-2">
                  <p className="text-gray-300 mb-2">
                    <strong>Management Company:</strong> {hoa["Management Company"] || "N/A"}
                  </p>
                  <p className="text-gray-300 mb-2">
                    <strong>Address:</strong> {hoa["Address"] || "N/A"}
                  </p>
                  <p className="text-gray-300 mb-2">
                    <strong>City, State, Zip:</strong> {hoa["City, State, Zip"] || "N/A"}
                  </p>
                  <p className="text-gray-300 mb-2">
                    <strong>Phone:</strong> {hoa["Phone"] || "N/A"}
                  </p>
                  <p className="text-gray-300">
                    <strong>Fax:</strong> {hoa["Fax"] || "N/A"}
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
              </details>
            ))}
          </div>
        )}

        {/* Full HOA List */}
        <div className="grid grid-cols-1 gap-4">
          {cityHoaData.map((hoa: Hoa) => (
            <details key={hoa.id} className="p-4 bg-gray-800 rounded-lg shadow-lg">
              <summary className="text-xl font-bold text-white cursor-pointer">
                {hoa["Subdivision/Countryclub"] || "N/A"}
              </summary>
              <div className="mt-2">
                <p className="text-gray-300 mb-2">
                  <strong>Management Company:</strong> {hoa["Management Company"] || "N/A"}
                </p>
                <p className="text-gray-300 mb-2">
                  <strong>Address:</strong> {hoa["Address"] || "N/A"}
                </p>
                <p className="text-gray-300 mb-2">
                  <strong>City, State, Zip:</strong> {hoa["City, State, Zip"] || "N/A"}
                </p>
                <p className="text-gray-300 mb-2">
                  <strong>Phone:</strong> {hoa["Phone"] || "N/A"}
                </p>
                <p className="text-gray-300">
                  <strong>Fax:</strong> {hoa["Fax"] || "N/A"}
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
            </details>
          ))}
        </div>

        {/* Modal */}
        <AddDataUserModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedHoa(null);
          }}
          onSubmit={handleSubmit}
        />
      </section>
    </>
  );
}
