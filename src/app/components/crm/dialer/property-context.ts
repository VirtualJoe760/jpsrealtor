import type { Contact } from '../contacts/types';

export interface DialerContact extends Contact {
  /** UI-only marker for a missing queue contact; never persisted to Contact. */
  dialerUnavailable?: boolean;
  phones?: { number: string; label?: string; isPrimary?: boolean }[];
  emails?: { address: string; label?: string; isPrimary?: boolean }[];
  latitude?: number; longitude?: number; lat?: number; lng?: number; long?: number;
  bedrooms?: number; bedroomsTotal?: number; bathrooms?: number; bathroomsFull?: number;
  bathroomsTotalDecimal?: number; sqft?: number; squareFeet?: number; yearBuilt?: number;
  propertyType?: string; lotSize?: string; purchasePrice?: number; purchaseDate?: string;
  homeValue?: number; assessedValue?: number; doNotContact?: boolean;
  noteHistory?: { content?: string; createdAt?: string }[];
}

export function propertyAddress(contact?: DialerContact) {
  const address = contact?.address;
  return [address?.street, address?.city, address?.state, address?.zip].filter(Boolean).join(', ');
}

// No guessed property IDs: research links search the exact address on each site.
export function propertyResearchLinks(address: string) {
  const query = encodeURIComponent(address);
  return [
    { label: 'Zillow', detail: 'Address search', href: `https://www.zillow.com/homes/${query}_rb/` },
    ...[{ label: 'Redfin', domain: 'redfin.com' }, { label: 'Realtor.com', domain: 'realtor.com' }, { label: 'Homes.com', domain: 'homes.com' }].map(site => ({
      label: site.label, detail: 'Search via Google',
      href: `https://www.google.com/search?q=${encodeURIComponent(`site:${site.domain} "${address}"`)}`,
    })),
    { label: 'Google Maps', detail: 'Map & Street View', href: `https://www.google.com/maps/search/?api=1&query=${query}` },
  ];
}

export function money(value?: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : '—';
}
