// Test the photo API endpoint
const listingKey = '20251101190017459373000000';
const url = `http://localhost:3000/api/listings/${listingKey}/photos`;

console.log('Testing photo API endpoint...');
console.log('URL:', url);
console.log('');

fetch(url)
  .then(res => {
    console.log('Status:', res.status);
    return res.json();
  })
  .then(data => {
    console.log('');
    console.log('Response:');
    console.log('- listingKey:', data.listingKey);
    console.log('- mlsSource:', data.mlsSource);
    console.log('- count:', data.count);
    console.log('- photos.length:', data.photos?.length);

    if (data.photos && data.photos.length > 0) {
      console.log('');
      console.log('First photo:');
      console.log(JSON.stringify(data.photos[0], null, 2));

      console.log('');
      console.log('✅ SUCCESS! Photos are loading correctly');
    } else {
      console.log('');
      console.log('❌ No photos in response');
    }
  })
  .catch(err => console.error('Error:', err.message));
