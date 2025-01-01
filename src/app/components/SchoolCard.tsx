import React from "react";

interface SchoolCardProps {
  id: string;
  name: string;
  address: string;
  gradeLevel: string;
  photoUrl: string;
  logoUrl: string;
}

export default function SchoolCard({ id, name, address, gradeLevel, photoUrl, logoUrl }: SchoolCardProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <img src={photoUrl} alt={`${name} Photo`} className="w-full h-32 object-cover rounded-md mb-4" />
      <img src={logoUrl} alt={`${name} Logo`} className="w-16 h-16 object-contain mb-4" />
      <h2 className="text-lg font-bold mb-2">{name}</h2>
      <p className="text-sm text-gray-600">{gradeLevel}</p>
      <p className="text-sm text-gray-500">{address}</p>
    </div>
  );
}
