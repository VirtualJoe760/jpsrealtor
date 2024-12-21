export interface Hoa {
    "Subdivision/Countryclub": string;
    "Management Company": string;
    Address: string;
    "City, State, Zip": string;
    Phone: string | null;
    Fax: string | null;
    City: string;
    State: string;
    Zip: string;
    id: string;
    count: number;
    slug: string;
  }
  
  
  export type HoaData = {
    [key: string]: Hoa[];
  };