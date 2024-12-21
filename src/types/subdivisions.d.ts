declare module '@/constants/subdivisions' {
    interface Subdivision {
      id: number;
      name: string;
      description: string;
      photo: string;
      features: string[];
      location: string;
      coordinates: { latitude: number; longitude: number };
      keywords: string[];
      slug: string;
    }
  
    type SubdivisionKey =
      | 'bermuda-dunes-neighborhoods'
      | 'cathedral-city-neighborhoods'
      | 'coachella-neighborhoods'
      | 'desert-hot-springs-neighborhoods'
      | 'indian-wells-neighborhoods'
      | 'indio-neighborhoods'
      | 'la-quinta-neighborhoods'
      | 'palm-desert-neighborhoods'
      | 'palm-springs-neighborhoods'
      | 'rancho-mirage-neighborhoods'
      | 'thermal-neighborhoods'
      | 'thousand-palms-neighborhoods';
  
    const subdivisions: Record<SubdivisionKey, Subdivision[]>;
    export default subdivisions;
  }
  