export interface School {
    id: string;
    name: string;
    type: string; // e.g., "Public", "Private", "Charter"
    address: string;
    city: string;
    state: string;
    zip: string;
    rating: number | null; // Optional field for rating
    distance: number | null; // Optional field for distance
  }
  