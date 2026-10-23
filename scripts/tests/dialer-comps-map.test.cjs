const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const root = 'F:/web-clients/joseph-sardella/jpsrealtor';
function load(name, dependencies = {}) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(root + '/src/lib/dialer/' + name + '.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
    { module, exports: module.exports, URLSearchParams, require: key => dependencies[key] });
  return module.exports;
}
const query = load('comparable-query');
const { comparableMapPoints, comparableMapBounds } = load('comparable-map', { './comparable-query': query });
const sales = [
  { listingKey: 'a', address: 'First sale', latitude: '33.67', longitude: '-116.30' },
  { listingKey: 'b', address: 'Missing point', latitude: null, longitude: null },
  { listingKey: 'c', address: 'Third sale', latitude: 33.68, longitude: -116.32 },
  { listingKey: 'd', address: 'Invalid point', latitude: 999, longitude: -116.3 },
];
const points = comparableMapPoints(sales);
assert.equal(points.length, 2);
assert.equal(points[1].number, 3, 'Map numbers must retain their sales-list position when coordinates are absent');
assert.equal(points[0].latitude, 33.67);
const bounds = comparableMapBounds([{ latitude: 33.66, longitude: -116.31 }, ...points]);
assert.equal(bounds[0][0], -116.32); assert.equal(bounds[0][1], 33.66);
assert.equal(bounds[1][0], -116.30); assert.equal(bounds[1][1], 33.68);
assert.equal(comparableMapBounds([]), null);
console.log('PASS: map uses real coordinates, excludes invalid points, preserves list numbering and fits subject plus sales.');

const { comparablePhotos, comparableFacts } = load('comparable-details');
const detail = { listingKey: 'closed-a', address: 'Recorded sale', poolYN: false, bedsTotal: 0, closeDate: 'invalid', primaryPhotoUrl: 'https://example.com/primary.jpg', media: [
  { Order: 2, Uri800: 'https://example.com/second.jpg', Caption: 'Second photo' },
  { Order: 1, Uri800: 'javascript:alert(1)' },
  { Order: 0, Uri800: 'https://example.com/primary.jpg' },
] };
assert.equal(comparablePhotos(detail).length, 2);
assert.equal(comparablePhotos(detail)[0].url, 'https://example.com/primary.jpg');
assert.equal(comparablePhotos(detail)[1].caption, 'Second photo');
const factMap = Object.fromEntries(comparableFacts(detail));
assert.equal(factMap.Pool, 'No'); assert.equal(factMap.Beds, 0);
assert.equal(factMap['Sold date'], 'Unavailable'); assert.equal(factMap['Year built'], 'Unavailable');
console.log('PASS: sold details preserve missing/zero/false facts and use deduplicated safe MLS image URLs.');
