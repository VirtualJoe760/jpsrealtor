// src/app/components/mls/FinancialSummary.tsx
import { IListing } from '@/models/listings';

interface Props {
  listing: IListing;
  className?: string;
}

export default function FinancialSummary({ listing, className = '' }: Props) {
  console.log("🔍 FinancialSummary listing:", listing);

  const hasFinancials = listing.hoaFee || listing.hoaFeeFrequency || listing.terms?.length || listing.landType;

  if (!hasFinancials) return null;

  return (
    <section className={`mt-10 ${className}`}>
      <h2 className="text-xl font-semibold mb-4">Financial Information</h2>
      <ul className="list-disc list-inside text-sm text-gray-300">
        {listing.hoaFee !== undefined && (
          <li><strong>HOA Fee:</strong> ${listing.hoaFee.toLocaleString()}</li>
        )}
        {listing.hoaFeeFrequency && (
          <li><strong>HOA Frequency:</strong> {listing.hoaFeeFrequency}</li>
        )}
        {listing.landType && <li><strong>Land Type:</strong> {listing.landType}</li>}
        {listing.terms && listing.terms.length > 0 && (
          <li><strong>Terms:</strong> {listing.terms.join(', ')}</li>
        )}
      </ul>
    </section>
  );
}
