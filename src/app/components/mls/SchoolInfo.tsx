// src/app/components/mls/SchoolInfo.tsx
import { IListing } from '@/models/listings';

interface Props {
  listing: IListing;
  className?: string;
}

export default function SchoolInfo({ listing, className = '' }: Props) {
  console.log("🔍 SchoolInfo listing:", listing);

  const hasSchools = listing.elementarySchool || listing.middleSchool || listing.highSchool || listing.schoolDistrict;

  if (!hasSchools) return null;

  return (
    <section className={`mt-10 ${className}`}>
      <h2 className="text-xl font-semibold mb-4">Nearby Schools</h2>
      <ul className="list-disc list-inside text-sm text-gray-300">
        {listing.schoolDistrict && <li><strong>District:</strong> {listing.schoolDistrict}</li>}
        {listing.elementarySchool && <li><strong>Elementary:</strong> {listing.elementarySchool}</li>}
        {listing.middleSchool && <li><strong>Middle:</strong> {listing.middleSchool}</li>}
        {listing.highSchool && <li><strong>High:</strong> {listing.highSchool}</li>}
      </ul>
    </section>
  );
}