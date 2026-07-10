import type { Metadata } from "next";
import ListingsBrowser from "@/components/ListingsBrowser";

export const metadata: Metadata = {
  title: "Homes for sale",
  description: "Search live MLS listings with filters and an interactive map.",
};

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const { city } = await searchParams;
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Homes for sale</h1>
      <ListingsBrowser initialCity={city || ""} />
    </div>
  );
}
