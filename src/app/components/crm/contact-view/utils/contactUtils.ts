import type { Contact } from '../types';

export function getDisplayName(contact: Contact): string {
  return [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'Unknown Contact';
}

export function getFullAddress(contact: Contact): string {
  if (!contact.address) return '';
  return [contact.address.street, contact.address.city, contact.address.state, contact.address.zip]
    .filter(Boolean)
    .join(', ');
}

export function getCoordinates(contact: Contact): { latitude?: number; longitude?: number } {
  const latitude = parseFloat((contact as any).latitude || (contact as any).lat);
  const longitude = parseFloat((contact as any).longitude || (contact as any).long || (contact as any).lng);

  return {
    latitude: !isNaN(latitude) ? latitude : undefined,
    longitude: !isNaN(longitude) ? longitude : undefined
  };
}

export function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function isRental(comp: any): boolean {
  const status = (comp.standardStatus || comp.status || '').toLowerCase();
  return status.includes('lease') || status.includes('rent');
}

export function getMarkerColor(comp: any): string {
  return isRental(comp) ? 'text-blue-500' : 'text-green-500';
}

export function getTransactionLabel(comp: any): string {
  return isRental(comp) ? 'Recently Rented' : 'Recently Sold';
}
