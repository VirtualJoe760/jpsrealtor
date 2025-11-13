"use client";

import React, { useEffect, useState } from "react";

interface School {
  name: string;
  propertiesServed: number;
}

interface SchoolDistrict {
  name: string;
  propertiesServed: number;
}

interface SchoolsSectionProps {
  cityId: string;
}

export default function SchoolsSection({ cityId }: SchoolsSectionProps) {
  const [schoolDistricts, setSchoolDistricts] = useState<SchoolDistrict[]>([]);
  const [schools, setSchools] = useState<{
    elementary: School[];
    middle: School[];
    high: School[];
  }>({ elementary: [], middle: [], high: [] });
  const [loading, setLoading] = useState(true);
  const [cityName, setCityName] = useState("");

  useEffect(() => {
    async function fetchSchools() {
      try {
        const res = await fetch(`/api/cities/${cityId}/schools`);
        if (res.ok) {
          const data = await res.json();
          setSchoolDistricts(data.schoolDistricts || []);
          setSchools(data.schools || { elementary: [], middle: [], high: [] });
          setCityName(data.city);
        }
      } catch (error) {
        console.error("Error fetching schools:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSchools();
  }, [cityId]);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-700 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-800 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-800 rounded w-2/3"></div>
      </div>
    );
  }

  const hasData =
    schoolDistricts.length > 0 ||
    schools.elementary.length > 0 ||
    schools.middle.length > 0 ||
    schools.high.length > 0;

  if (!hasData) {
    return null; // Hide if no school data found
  }

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-white mb-4">Schools in {cityName}</h2>

      {/* School Districts */}
      {schoolDistricts.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-white mb-3">School Districts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schoolDistricts.map((district) => (
              <div
                key={district.name}
                className="bg-gradient-to-br from-gray-900 to-black border border-gray-700 rounded-lg p-4"
              >
                <h4 className="text-lg font-semibold text-white mb-1">{district.name}</h4>
                <p className="text-sm text-gray-400">
                  Serves <span className="font-semibold text-white">{district.propertiesServed}</span> properties
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schools by Type */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Elementary Schools */}
        {schools.elementary.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Elementary Schools</h3>
            <div className="space-y-2">
              {schools.elementary.map((school) => (
                <div
                  key={school.name}
                  className="bg-gradient-to-br from-gray-900 to-black border border-gray-700 rounded-lg p-3"
                >
                  <p className="text-white font-medium text-sm">{school.name}</p>
                  <p className="text-xs text-gray-400">
                    {school.propertiesServed} properties
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Middle Schools */}
        {schools.middle.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Middle Schools</h3>
            <div className="space-y-2">
              {schools.middle.map((school) => (
                <div
                  key={school.name}
                  className="bg-gradient-to-br from-gray-900 to-black border border-gray-700 rounded-lg p-3"
                >
                  <p className="text-white font-medium text-sm">{school.name}</p>
                  <p className="text-xs text-gray-400">
                    {school.propertiesServed} properties
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* High Schools */}
        {schools.high.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">High Schools</h3>
            <div className="space-y-2">
              {schools.high.map((school) => (
                <div
                  key={school.name}
                  className="bg-gradient-to-br from-gray-900 to-black border border-gray-700 rounded-lg p-3"
                >
                  <p className="text-white font-medium text-sm">{school.name}</p>
                  <p className="text-xs text-gray-400">
                    {school.propertiesServed} properties
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
