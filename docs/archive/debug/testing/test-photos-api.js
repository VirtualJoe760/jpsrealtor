require('dotenv').config({ path: '.env.local' });

const listingKey = '20251101190017459373000000';
const mlsId = '20190211172710340762000000';
const accessToken = process.env.SPARK_ACCESS_TOKEN;

const url = `https://replication.sparkapi.com/v1/listings?_filter=MlsId Eq '${mlsId}' And ListingKey Eq '${listingKey}'&_expand=Photos&_limit=1`;

console.log('Testing Spark API...');
console.log('URL:', url);
console.log('');

fetch(url, {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'X-SparkApi-User-Agent': 'jpsrealtor.com',
    'Accept': 'application/json'
  }
})
.then(res => {
  console.log('Status:', res.status);
  return res.json();
})
.then(data => {
  console.log('');
  console.log('Response structure:');
  console.log('- Success:', data.D?.Success);
  console.log('- Results length:', data.D?.Results?.length);

  if (data.D?.Results?.[0]) {
    const listing = data.D.Results[0];

    console.log('');
    console.log('Available top-level keys:');
    console.log(Object.keys(listing));

    console.log('');
    console.log('StandardFields keys:');
    console.log(Object.keys(listing.StandardFields || {}));

    const media = listing.StandardFields?.Media || [];
    const photos = listing.StandardFields?.Photos || [];

    console.log('');
    console.log('- Media count:', media.length);
    console.log('- Photos count:', photos.length);

    if (photos.length > 0) {
      console.log('');
      console.log('First photo from Photos array:');
      const photo = photos[0];
      console.log(JSON.stringify(photo, null, 2));
    } else if (media.length > 0) {
      console.log('');
      console.log('First item from Media array:');
      console.log(JSON.stringify(media[0], null, 2));
    } else {
      console.log('');
      console.log('⚠️ No photos found in either Media or Photos array');
    }
  } else {
    console.log('');
    console.log('❌ No listing found in results');
  }
})
.catch(err => console.error('Error:', err.message));
