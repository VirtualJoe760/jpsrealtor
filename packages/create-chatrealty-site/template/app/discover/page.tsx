import { searchListings } from "@/lib/chatrealty";
import SwipeDeck from "@/components/SwipeDeck";

export const dynamic = "force-dynamic";

export const metadata = { title: "Discover" };

// Swipe-to-save discovery. Pulls a batch of listings and hands them to the
// client deck; likes save to favorites (localStorage) like the heart button.
export default async function DiscoverPage() {
  const { items } = await searchListings({ limit: 30 });

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Discover homes</h1>
        <p className="mt-1 text-sm text-gray-500">
          Swipe through listings — save the ones you love.
        </p>
      </div>
      {items.length === 0 ? (
        <p className="text-center text-sm text-gray-500">No listings to show right now.</p>
      ) : (
        <SwipeDeck listings={items} />
      )}
    </div>
  );
}
