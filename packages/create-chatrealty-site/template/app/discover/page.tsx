import { searchListings } from "@/lib/chatrealty";
import DiscoverClient from "@/components/DiscoverClient";

export const dynamic = "force-dynamic";

export const metadata = { title: "Discover" };

// Swipe-to-save discovery. Populates AS-IS with a fresh batch by default;
// the client's Refine control lets the visitor discover in a specific area
// with specifics in mind (beds, pool, price). Likes save to favorites.
export default async function DiscoverPage() {
  const { items } = await searchListings({ limit: 30 });

  return (
    <div>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Discover homes</h1>
        <p className="mt-1 text-sm text-gray-500">
          Swipe through listings — save the ones you love.
        </p>
      </div>
      {items.length === 0 ? (
        <p className="text-center text-sm text-gray-500">No listings to show right now.</p>
      ) : (
        <DiscoverClient initial={items} />
      )}
    </div>
  );
}
