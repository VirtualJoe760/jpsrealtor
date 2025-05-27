// app/whatever/page.tsx
import { getBighornListingsFromFile } from "@/utils/spark/bighornLocal";

export default async function BighornPage() {
  const listings = await getBighornListingsFromFile();

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h2 className="text-3xl font-bold mb-8 text-center">Listings in Bighorn</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {listings.map((listing, i) => {
          const fields = listing.StandardFields || {};
          const address = fields.UnparsedAddress || "No Address";
          const photo = fields.Photos?.[0]?.Uri300;

          return (
            <div key={listing.Id ?? i} className="border p-4 rounded-xl shadow-md">
              <h3 className="text-lg font-semibold mb-2">{address}</h3>
              {photo ? (
                <img
                  src={photo}
                  alt={`Photo of ${address}`}
                  className="w-full h-auto rounded-lg"
                />
              ) : (
                <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-500 rounded-lg">
                  No Photo Available
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

