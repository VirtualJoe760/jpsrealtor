#!/usr/bin/env node
import fs from 'fs';

const file = 'src/app/components/chat/ListingCarousel.tsx';
let content = fs.readFileSync(file, 'utf8');

// Make url optional in interface
content = content.replace(/  url: string;/, '  url?: string;');

// Add fallback URL in Link href - replace broken line first
content = content.replace(
  /href=\{listing\.url \|\| \}/,
  'href={listing.url || `/mls-listings/${listing.slugAddress || listing.slug || listing.id}`}'
);

// If that didn't work, try the original pattern
if (!content.includes('listing.slugAddress ||')) {
  content = content.replace(
    /href=\{listing\.url\}/,
    'href={listing.url || `/mls-listings/${listing.slugAddress || listing.slug || listing.id}`}'
  );
}

fs.writeFileSync(file, content);
console.log('✅ Fixed ListingCarousel.tsx');
console.log('   - Made url field optional');
console.log('   - Added fallback URL generation');
