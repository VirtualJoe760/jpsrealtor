const assert = require('node:assert/strict');
const fs = require('node:fs'); const vm = require('node:vm'); const ts = require('typescript');
const root = 'F:/web-clients/joseph-sardella/jpsrealtor';
function load(file, deps, fetcher) { const module = { exports: {} }; vm.runInNewContext(ts.transpileModule(fs.readFileSync(root + '/src/' + file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { module, exports: module.exports, require: key => deps[key], URL, URLSearchParams, Date, Set, AbortSignal, TextDecoder, console, fetch: fetcher || (async () => { throw new Error('Tests must not use the network'); }) }); return module.exports; }
const discovery = load('lib/property-photo-discovery.ts', { cheerio: require('cheerio') });
const address = { street: '123 Palm Court', city: 'La Quinta', state: 'CA', zip: '92253' };
assert.equal(discovery.addressKey(address), discovery.addressKey({ ...address, street: '123 Palm Ct.' }));
assert.equal(discovery.allowedPropertyPage('https://www.zillow.com/homedetails/123'), true);
for (const url of ['http://www.zillow.com/a', 'https://zillow.com.attacker.test/a', 'https://localhost/a', 'https://www.redfin.com:8443/a', 'https://user@www.redfin.com/a']) assert.equal(discovery.allowedPropertyPage(url), false);
const html = '<title>123 Palm Ct, La Quinta, CA 92253</title><meta property="og:image" content="https://photos.zillowstatic.com/house.jpg">';
assert.equal(discovery.extractPropertyPhotos(html, 'https://www.zillow.com/homedetails/123', address).length, 1);
assert.equal(discovery.extractPropertyPhotos(html.replace('123 Palm', '124 Palm'), 'https://www.zillow.com/homedetails/123', address).length, 0);
assert.equal(discovery.extractPropertyPhotos(html.replace('Palm Ct,', 'Palm Ct Unit 2,'), 'https://www.zillow.com/homedetails/123', address).length, 0);
assert.equal(discovery.extractPropertyPhotos(html.replace('https://photos.zillowstatic.com/house.jpg', 'http://127.0.0.1/private'), 'https://www.zillow.com/homedetails/123', address).length, 0);
assert.equal(discovery.extractPropertyPhotos('<title>Nearby houses</title><img src="https://photos.zillowstatic.com/house.jpg">', 'https://www.zillow.com/homedetails/123', address).length, 0);
let cache = null, crawlCount = 0, seeded = [], storedAddress = { ...address };
const photo = { url:'https://photos.zillowstatic.com/house.jpg', source:'zillow.com', sourcePage:'https://www.zillow.com/homedetails/123', caption:'123 Palm Ct', discoveredAt: new Date(), order:0 };
const chain = value => ({ lean: async () => value, limit() { return this; }, select() { return this; }, maxTimeMS() { return this; } });
const cacheModel = {
 collection: { createIndex: async () => {} },
 findOne: () => chain(cache),
 updateOne: async (_, update) => { if (update.$setOnInsert && !cache) cache = { addressKey: discovery.addressKey(address), photos: [] }; if (update.$set) Object.assign(cache, update.$set); if (update.$unset) Object.keys(update.$unset).forEach(key => delete cache[key]); },
 findOneAndUpdate: async (_, update) => { if (cache.leaseUntil > new Date()) return null; Object.assign(cache, update.$set); return cache; },
};
const targetModel = { findOne: () => chain({ address: storedAddress }), updateOne: async (query, update) => seeded.push({ query, update }) };
let nativeTimeout = false;
const nativeModel = { find: () => { const query = chain([]); if (nativeTimeout) query.lean = async () => { throw { code:50 }; }; return query; } };
const service = load('lib/property-photo-service.ts', {
 'node:crypto': { default: { randomUUID: () => 'lease-token' } },
 '@/models/Contact': { __esModule: true, default: targetModel },
 '@/models/unified-listing': { __esModule:true, default:nativeModel }, '@/models/unified-closed-listing': { __esModule:true, default:nativeModel },
 '@/models/PropertyPhotoCache': { __esModule:true, default:cacheModel },
 './property-photo-discovery': { ...discovery, crawlPropertyPhotos: async () => { crawlCount++; return { photos:[photo], message:'Matched' }; } },
});
(async () => {
 let networkCalls = [];
 const crawler = load('lib/property-photo-discovery.ts', { cheerio:require('cheerio') }, async (url, options) => {
   networkCalls.push(url);
   return options?.method === 'HEAD' ? new Response(null, { headers:{ 'Content-Type':'image/jpeg' } }) : new Response(html);
 });
 assert.equal((await crawler.crawlPropertyPhotos(address,'https://www.zillow.com/homedetails/123')).photos.length,1);
 assert.equal(networkCalls.length,2,'Only the verified image is checked after matching the page');
 networkCalls=[];
 const redirected = load('lib/property-photo-discovery.ts', { cheerio:require('cheerio') }, async url => { networkCalls.push(url); return new Response(null,{ status:302,headers:{Location:'https://127.0.0.1/private'} }); });
 assert.equal((await redirected.crawlPropertyPhotos(address,'https://www.zillow.com/homedetails/123')).photos.length,0);
 assert.equal(networkCalls.length,1,'Redirects must not reach internal or unapproved hosts');
 let authorized = false, ownerFilter, delegated = [], contactFound = true;
 const route = load('app/api/crm/contacts/[id]/property-images/route.ts', {
  'next/server': { NextResponse:require('next/server').NextResponse },
  'next-auth': { getServerSession:async () => authorized ? { user:{ id:'owner' } } : null },
  '@/app/api/auth/[...nextauth]/route': { authOptions:{} }, '@/lib/mongodb': { default:async () => {} },
  '@/models/Contact': { default:{ findOne: query => { ownerFilter=query; return chain(contactFound ? { _id:'a'.repeat(24),address } : null); } } },
  '@/models/unified-closed-listing': { default:{ findOne: () => chain(null) } },
  '@/lib/property-photo-discovery':discovery,
  '@/lib/property-photo-service': { listingAddress:service.listingAddress,resolvePropertyPhotos:async (...args) => { delegated.push(args); return {success:true,images:[]}; } },
 });
 const context = {params:Promise.resolve({id:'a'.repeat(24)})};
 const req = body => ({json:async () => body,nextUrl:new URL('https://app.test/api')});
 assert.equal((await route.POST(req({}),context)).status,401); assert.equal(delegated.length,0);
 authorized=true; contactFound=false; assert.equal((await route.POST(req({}),context)).status,404);
 contactFound=true; assert.equal((await route.POST(req({sourceUrl:'http://127.0.0.1/private'}),context)).status,400); assert.equal(delegated.length,0);
 assert.equal((await route.GET(req({}),context)).status,200); assert.equal(delegated[0][2],false); assert.equal(ownerFilter.userId,'owner');
 assert.equal((await route.POST(req({sourceUrl:'https://www.zillow.com/homedetails/123'}),context)).status,200); assert.equal(delegated[1][2],true);
 const target = { model:targetModel, id:'target', userId:'owner' };
 assert.equal((await service.resolvePropertyPhotos(address,target,false)).images.length,0); assert.equal(crawlCount,0); assert.equal(seeded.length,0);
 assert.equal((await service.resolvePropertyPhotos(address,target,true)).images.length,1); assert.equal(crawlCount,1); assert.equal(seeded.length,1); assert.equal(seeded[0].query.userId,'owner'); assert.equal(seeded[0].update.$set.externalPhotos[0].sourcePage,photo.sourcePage);
 await service.resolvePropertyPhotos(address,target,true); assert.equal(crawlCount,1,'Cached matches must avoid another crawl');
 storedAddress = { ...address, street:'999 Other St' }; const before = seeded.length; await service.resolvePropertyPhotos(address,target,true); assert.equal(seeded.length,before,'Changed contacts must not receive old-address photos');
 cache = { photos:[], retryAfter:new Date(Date.now()+3600000), message:'Blocked' }; await service.resolvePropertyPhotos(address,target,true); assert.equal(crawlCount,1,'Negative cache prevents repeated blocked-source requests');
 cache=null; nativeTimeout=true; storedAddress={...address}; const countBeforeTimeout=crawlCount; await service.resolvePropertyPhotos(address,target,true); assert.equal(crawlCount,countBeforeTimeout+1,'MLS timeout must fall through to web discovery');
 require('tsx/cjs');
 const Contact = require(root + '/src/models/Contact.ts').default;
 const Closed = require(root + '/src/models/unified-closed-listing.ts').default;
 for (const Model of [Contact,Closed]) assert.equal(new Model({ externalPhotos:[photo] }).toObject().externalPhotos[0].sourcePage,photo.sourcePage,'Mongoose must persist declared photo provenance');
 console.log('PASS: exact-address/unit matching, URL allowlists, no unrelated image fallback, cache reuse, provenance/schema persistence, owner filters, address-change race and negative-cache cooldown. No live writes.');
})().catch(error => { console.error(error); process.exitCode=1; });
