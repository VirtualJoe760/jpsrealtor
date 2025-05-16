import Listings from '@/components/mls/Listings';
import pool from '@/lib/db'; // assuming you've now centralized this

export const dynamic = 'force-dynamic';

async function getListings() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        id,
        unparsed_address,
        list_agent_name,
        list_office_name,
        standard_status,
        list_price,
        beds_total,
        baths_total,
        photo_url,
        modification_timestamp
      FROM listings
      ORDER BY modification_timestamp DESC
      LIMIT 20
    `);    
    return result.rows;
  } finally {
    client.release();
  }
}

export default async function MLSPage() {
  const listings = await getListings();

  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-4">Latest Listings</h1>
      <Listings listings={listings} />
    </main>
  );
}
