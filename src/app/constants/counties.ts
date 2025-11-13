export interface CountyCity {
  name: string;
  id: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  description?: string;
  population?: number;
}

export interface County {
  name: string;
  slug: string;
  center: [number, number];
  description: string;
  cities: CountyCity[];
}

export const soCalCounties: County[] = [
  {
    name: "Riverside County",
    slug: "riverside",
    center: [-117.0, 33.7],
    description: "Diverse communities from inland valleys to mountain retreats, featuring cities like Riverside, Corona, Temecula, and Murrieta.",
    cities: [
      { name: "Riverside", id: "riverside-city", coordinates: { latitude: 33.9806, longitude: -117.3755 }, population: 314998 },
      { name: "Corona", id: "corona", coordinates: { latitude: 33.8753, longitude: -117.5664 }, population: 157136 },
      { name: "Moreno Valley", id: "moreno-valley", coordinates: { latitude: 33.9425, longitude: -117.2297 }, population: 208634 },
      { name: "Murrieta", id: "murrieta", coordinates: { latitude: 33.5539, longitude: -117.2139 }, population: 116759 },
      { name: "Temecula", id: "temecula", coordinates: { latitude: 33.4936, longitude: -117.1484 }, population: 110003 },
      { name: "Menifee", id: "menifee", coordinates: { latitude: 33.6772, longitude: -117.1848 }, population: 102527 },
      { name: "Lake Elsinore", id: "lake-elsinore", coordinates: { latitude: 33.6681, longitude: -117.3273 }, population: 70265 },
      { name: "Hemet", id: "hemet", coordinates: { latitude: 33.7475, longitude: -116.9719 }, population: 89833 },
      { name: "Perris", id: "perris", coordinates: { latitude: 33.7825, longitude: -117.2286 }, population: 78700 },
    ]
  },
  {
    name: "San Diego County",
    slug: "san-diego",
    center: [-117.0, 33.0],
    description: "Beautiful coastal communities, perfect year-round weather, and world-class beaches. From downtown high-rises to beachfront homes, San Diego has it all.",
    cities: [
      { name: "San Diego", id: "san-diego-city", coordinates: { latitude: 32.7157, longitude: -117.1611 }, population: 1386932 },
      { name: "Chula Vista", id: "chula-vista", coordinates: { latitude: 32.6401, longitude: -117.0842 }, population: 275487 },
      { name: "Oceanside", id: "oceanside", coordinates: { latitude: 33.1959, longitude: -117.3795 }, population: 174068 },
      { name: "Escondido", id: "escondido", coordinates: { latitude: 33.1192, longitude: -117.0864 }, population: 151038 },
      { name: "Carlsbad", id: "carlsbad", coordinates: { latitude: 33.1581, longitude: -117.3506 }, population: 114746 },
      { name: "El Cajon", id: "el-cajon", coordinates: { latitude: 32.7948, longitude: -116.9625 }, population: 103249 },
      { name: "Vista", id: "vista", coordinates: { latitude: 33.2000, longitude: -117.2425 }, population: 101638 },
      { name: "San Marcos", id: "san-marcos", coordinates: { latitude: 33.1434, longitude: -117.1661 }, population: 94833 },
      { name: "Encinitas", id: "encinitas", coordinates: { latitude: 33.0370, longitude: -117.2920 }, population: 62671 },
      { name: "National City", id: "national-city", coordinates: { latitude: 32.6781, longitude: -117.0992 }, population: 61342 },
      { name: "La Mesa", id: "la-mesa", coordinates: { latitude: 32.7678, longitude: -117.0231 }, population: 61121 },
      { name: "Santee", id: "santee", coordinates: { latitude: 32.8384, longitude: -116.9739 }, population: 60037 },
      { name: "Poway", id: "poway", coordinates: { latitude: 32.9628, longitude: -117.0359 }, population: 49417 },
      { name: "La Jolla", id: "la-jolla", coordinates: { latitude: 32.8328, longitude: -117.2713 }, population: 46781 },
      { name: "Del Mar", id: "del-mar", coordinates: { latitude: 32.9595, longitude: -117.2653 }, population: 4133 },
    ]
  },
  {
    name: "Orange County",
    slug: "orange",
    center: [-117.8, 33.7],
    description: "Beautiful beaches, family-friendly communities, and thriving business centers. Orange County combines coastal lifestyle with urban sophistication.",
    cities: [
      { name: "Anaheim", id: "anaheim", coordinates: { latitude: 33.8366, longitude: -117.9143 }, population: 346824 },
      { name: "Santa Ana", id: "santa-ana", coordinates: { latitude: 33.7455, longitude: -117.8677 }, population: 310227 },
      { name: "Irvine", id: "irvine", coordinates: { latitude: 33.6846, longitude: -117.8265 }, population: 307670 },
      { name: "Huntington Beach", id: "huntington-beach", coordinates: { latitude: 33.6603, longitude: -117.9992 }, population: 198711 },
      { name: "Garden Grove", id: "garden-grove", coordinates: { latitude: 33.7739, longitude: -117.9415 }, population: 171644 },
      { name: "Orange", id: "orange-city", coordinates: { latitude: 33.7879, longitude: -117.8531 }, population: 139911 },
      { name: "Fullerton", id: "fullerton", coordinates: { latitude: 33.8704, longitude: -117.9242 }, population: 143617 },
      { name: "Costa Mesa", id: "costa-mesa", coordinates: { latitude: 33.6411, longitude: -117.9187 }, population: 112174 },
      { name: "Mission Viejo", id: "mission-viejo", coordinates: { latitude: 33.6000, longitude: -117.6720 }, population: 93305 },
      { name: "Westminster", id: "westminster", coordinates: { latitude: 33.7513, longitude: -117.9940 }, population: 90857 },
      { name: "Newport Beach", id: "newport-beach", coordinates: { latitude: 33.6189, longitude: -117.9289 }, population: 85239 },
      { name: "Laguna Niguel", id: "laguna-niguel", coordinates: { latitude: 33.5225, longitude: -117.7076 }, population: 64355 },
      { name: "Laguna Beach", id: "laguna-beach", coordinates: { latitude: 33.5427, longitude: -117.7854 }, population: 23032 },
      { name: "San Clemente", id: "san-clemente", coordinates: { latitude: 33.4270, longitude: -117.6120 }, population: 64293 },
      { name: "Dana Point", id: "dana-point", coordinates: { latitude: 33.4672, longitude: -117.6981 }, population: 33107 },
    ]
  },
  {
    name: "Los Angeles County",
    slug: "los-angeles",
    center: [-118.3, 34.0],
    description: "The entertainment capital of the world with diverse neighborhoods from downtown lofts to beach communities and hillside estates.",
    cities: [
      { name: "Los Angeles", id: "los-angeles-city", coordinates: { latitude: 34.0522, longitude: -118.2437 }, population: 3898747 },
      { name: "Long Beach", id: "long-beach", coordinates: { latitude: 33.7701, longitude: -118.1937 }, population: 466742 },
      { name: "Glendale", id: "glendale", coordinates: { latitude: 34.1425, longitude: -118.2551 }, population: 196543 },
      { name: "Santa Clarita", id: "santa-clarita", coordinates: { latitude: 34.3917, longitude: -118.5426 }, population: 228673 },
      { name: "Pasadena", id: "pasadena", coordinates: { latitude: 34.1478, longitude: -118.1445 }, population: 138699 },
      { name: "Torrance", id: "torrance", coordinates: { latitude: 33.8358, longitude: -118.3406 }, population: 143592 },
      { name: "Pomona", id: "pomona", coordinates: { latitude: 34.0551, longitude: -117.7499 }, population: 151713 },
      { name: "El Monte", id: "el-monte", coordinates: { latitude: 34.0686, longitude: -118.0276 }, population: 113475 },
      { name: "Downey", id: "downey", coordinates: { latitude: 33.9401, longitude: -118.1332 }, population: 111772 },
      { name: "Inglewood", id: "inglewood", coordinates: { latitude: 33.9617, longitude: -118.3531 }, population: 107762 },
      { name: "Beverly Hills", id: "beverly-hills", coordinates: { latitude: 34.0736, longitude: -118.4004 }, population: 32903 },
      { name: "Santa Monica", id: "santa-monica", coordinates: { latitude: 34.0195, longitude: -118.4912 }, population: 93076 },
      { name: "Manhattan Beach", id: "manhattan-beach", coordinates: { latitude: 33.8847, longitude: -118.4109 }, population: 35506 },
      { name: "Redondo Beach", id: "redondo-beach", coordinates: { latitude: 33.8492, longitude: -118.3884 }, population: 66748 },
      { name: "Malibu", id: "malibu", coordinates: { latitude: 34.0259, longitude: -118.7798 }, population: 12645 },
    ]
  },
  {
    name: "San Bernardino County",
    slug: "san-bernardino",
    center: [-116.5, 34.5],
    description: "California's largest county by area, featuring mountain communities, high desert cities, and growing residential areas.",
    cities: [
      { name: "San Bernardino", id: "san-bernardino-city", coordinates: { latitude: 34.1083, longitude: -117.2898 }, population: 222101 },
      { name: "Fontana", id: "fontana", coordinates: { latitude: 34.0922, longitude: -117.4350 }, population: 208393 },
      { name: "Rancho Cucamonga", id: "rancho-cucamonga", coordinates: { latitude: 34.1064, longitude: -117.5931 }, population: 177603 },
      { name: "Ontario", id: "ontario", coordinates: { latitude: 34.0633, longitude: -117.6509 }, population: 175265 },
      { name: "Victorville", id: "victorville", coordinates: { latitude: 34.5362, longitude: -117.2928 }, population: 134810 },
      { name: "Hesperia", id: "hesperia", coordinates: { latitude: 34.4264, longitude: -117.3009 }, population: 99818 },
      { name: "Chino", id: "chino", coordinates: { latitude: 34.0122, longitude: -117.6889 }, population: 91733 },
      { name: "Chino Hills", id: "chino-hills", coordinates: { latitude: 33.9898, longitude: -117.7320 }, population: 78411 },
      { name: "Upland", id: "upland", coordinates: { latitude: 34.0975, longitude: -117.6484 }, population: 79040 },
      { name: "Redlands", id: "redlands", coordinates: { latitude: 34.0556, longitude: -117.1825 }, population: 71035 },
      { name: "Apple Valley", id: "apple-valley", coordinates: { latitude: 34.5008, longitude: -117.1859 }, population: 75791 },
      { name: "Yucaipa", id: "yucaipa", coordinates: { latitude: 34.0336, longitude: -117.0431 }, population: 54542 },
      { name: "Big Bear Lake", id: "big-bear-lake", coordinates: { latitude: 34.2439, longitude: -116.9114 }, population: 5159 },
    ]
  },
  {
    name: "Ventura County",
    slug: "ventura",
    center: [-119.0, 34.4],
    description: "Coastal beauty meets suburban comfort with charming beach towns, agricultural areas, and family-friendly communities.",
    cities: [
      { name: "Oxnard", id: "oxnard", coordinates: { latitude: 34.1975, longitude: -119.1771 }, population: 202063 },
      { name: "Thousand Oaks", id: "thousand-oaks", coordinates: { latitude: 34.1706, longitude: -118.8376 }, population: 126966 },
      { name: "Simi Valley", id: "simi-valley", coordinates: { latitude: 34.2694, longitude: -118.7815 }, population: 126356 },
      { name: "Ventura", id: "ventura-city", coordinates: { latitude: 34.2746, longitude: -119.2290 }, population: 110763 },
      { name: "Camarillo", id: "camarillo", coordinates: { latitude: 34.2164, longitude: -119.0376 }, population: 70741 },
      { name: "Moorpark", id: "moorpark", coordinates: { latitude: 34.2856, longitude: -118.8820 }, population: 36443 },
      { name: "Port Hueneme", id: "port-hueneme", coordinates: { latitude: 34.1478, longitude: -119.1951 }, population: 22354 },
      { name: "Santa Paula", id: "santa-paula", coordinates: { latitude: 34.3542, longitude: -119.0593 }, population: 30657 },
      { name: "Fillmore", id: "fillmore", coordinates: { latitude: 34.3989, longitude: -118.9181 }, population: 16419 },
    ]
  },
  {
    name: "Santa Barbara County",
    slug: "santa-barbara",
    center: [-120.0, 34.6],
    description: "Stunning coastal and wine country living with Spanish-inspired architecture, pristine beaches, and rolling vineyard hills.",
    cities: [
      { name: "Santa Barbara", id: "santa-barbara-city", coordinates: { latitude: 34.4208, longitude: -119.6982 }, population: 88665 },
      { name: "Santa Maria", id: "santa-maria", coordinates: { latitude: 34.9530, longitude: -120.4357 }, population: 107263 },
      { name: "Lompoc", id: "lompoc", coordinates: { latitude: 34.6391, longitude: -120.4579 }, population: 43834 },
      { name: "Goleta", id: "goleta", coordinates: { latitude: 34.4358, longitude: -119.8276 }, population: 32690 },
      { name: "Carpinteria", id: "carpinteria", coordinates: { latitude: 34.3987, longitude: -119.5185 }, population: 13264 },
      { name: "Buellton", id: "buellton", coordinates: { latitude: 34.6136, longitude: -120.1926 }, population: 5161 },
      { name: "Solvang", id: "solvang", coordinates: { latitude: 34.5958, longitude: -120.1376 }, population: 6126 },
    ]
  },
  {
    name: "Imperial County",
    slug: "imperial",
    center: [-115.5, 33.0],
    description: "Agricultural heartland and desert communities near the Mexican border, offering affordable living and wide-open spaces.",
    cities: [
      { name: "El Centro", id: "el-centro", coordinates: { latitude: 32.7920, longitude: -115.5630 }, population: 44322 },
      { name: "Calexico", id: "calexico", coordinates: { latitude: 32.6789, longitude: -115.4989 }, population: 38633 },
      { name: "Brawley", id: "brawley", coordinates: { latitude: 32.9787, longitude: -115.5303 }, population: 26209 },
      { name: "Imperial", id: "imperial-city", coordinates: { latitude: 32.8473, longitude: -115.5694 }, population: 17890 },
      { name: "Calipatria", id: "calipatria", coordinates: { latitude: 33.1253, longitude: -115.5142 }, population: 7460 },
      { name: "Holtville", id: "holtville", coordinates: { latitude: 32.8112, longitude: -115.3803 }, population: 6702 },
      { name: "Westmorland", id: "westmorland", coordinates: { latitude: 33.0373, longitude: -115.6217 }, population: 2225 },
    ]
  },
  {
    name: "Coachella Valley",
    slug: "coachella-valley",
    center: [-116.3, 33.7],
    description: "Desert paradise known for world-class golf, luxury resorts, music festivals, and stunning mountain views. From Palm Springs to Indio, the Coachella Valley offers year-round sunshine and desert living at its finest.",
    cities: [
      { name: "Palm Springs", id: "palm-springs", coordinates: { latitude: 33.8303, longitude: -116.5453 }, population: 48518 },
      { name: "Palm Desert", id: "palm-desert", coordinates: { latitude: 33.7225, longitude: -116.3761 }, population: 53369 },
      { name: "La Quinta", id: "la-quinta", coordinates: { latitude: 33.6634, longitude: -116.3100 }, population: 41667 },
      { name: "Indio", id: "indio", coordinates: { latitude: 33.7206, longitude: -116.2156 }, population: 91761 },
      { name: "Rancho Mirage", id: "rancho-mirage", coordinates: { latitude: 33.7397, longitude: -116.4125 }, population: 18228 },
      { name: "Indian Wells", id: "indian-wells", coordinates: { latitude: 33.7153, longitude: -116.3419 }, population: 5357 },
      { name: "Cathedral City", id: "cathedral-city", coordinates: { latitude: 33.7797, longitude: -116.4653 }, population: 55011 },
      { name: "Desert Hot Springs", id: "desert-hot-springs", coordinates: { latitude: 33.9611, longitude: -116.5017 }, population: 29857 },
      { name: "Coachella", id: "coachella", coordinates: { latitude: 33.6803, longitude: -116.1739 }, population: 46324 },
      { name: "Thousand Palms", id: "thousand-palms", coordinates: { latitude: 33.8175, longitude: -116.3903 }, population: 7293 },
      { name: "Bermuda Dunes", id: "bermuda-dunes", coordinates: { latitude: 33.7489, longitude: -116.2766 }, population: 7536 },
      { name: "Thermal", id: "thermal", coordinates: { latitude: 33.6406, longitude: -116.1392 }, population: 2865 },
    ]
  },
  {
    name: "High Desert / Joshua Tree",
    slug: "high-desert",
    center: [-116.3, 34.4],
    description: "Rugged desert beauty with wide-open spaces, stunning rock formations, and clear starry nights. From Joshua Tree National Park to thriving desert communities, this region offers affordable living and outdoor adventure.",
    cities: [
      { name: "Victorville", id: "victorville", coordinates: { latitude: 34.5362, longitude: -117.2928 }, population: 134810 },
      { name: "Hesperia", id: "hesperia", coordinates: { latitude: 34.4264, longitude: -117.3009 }, population: 99818 },
      { name: "Apple Valley", id: "apple-valley", coordinates: { latitude: 34.5008, longitude: -117.1859 }, population: 75791 },
      { name: "Yucca Valley", id: "yucca-valley", coordinates: { latitude: 34.1142, longitude: -116.4322 }, population: 21738 },
      { name: "Twentynine Palms", id: "twentynine-palms", coordinates: { latitude: 34.1355, longitude: -116.0542 }, population: 26748 },
      { name: "Joshua Tree", id: "joshua-tree", coordinates: { latitude: 34.1347, longitude: -116.3128 }, population: 7414 },
      { name: "Barstow", id: "barstow", coordinates: { latitude: 34.8958, longitude: -117.0228 }, population: 25415 },
      { name: "Adelanto", id: "adelanto", coordinates: { latitude: 34.5828, longitude: -117.4092 }, population: 38046 },
    ]
  },
];

// Helper function to find a county by slug
export function findCountyBySlug(slug: string): County | undefined {
  return soCalCounties.find(county => county.slug === slug);
}

// Helper function to check if a slug is a county
export function isCountySlug(slug: string): boolean {
  return soCalCounties.some(county => county.slug === slug);
}

// Helper function to get all city IDs across all counties
export function getAllCityIds(): string[] {
  return soCalCounties.flatMap(county => county.cities.map(city => city.id));
}

// Helper function to find a city by ID and return city data with county name
export function findCityById(cityId: string): { city: CountyCity; countyName: string } | null {
  for (const county of soCalCounties) {
    const city = county.cities.find((c) => c.id === cityId);
    if (city) {
      return { city, countyName: county.name };
    }
  }
  return null;
}

// Helper function to find a city by name and return city data with county name
export function findCityByName(cityName: string): { city: CountyCity; countyName: string } | null {
  const normalizedSearch = cityName.toLowerCase().trim();
  for (const county of soCalCounties) {
    const city = county.cities.find((c) => c.name.toLowerCase() === normalizedSearch);
    if (city) {
      return { city, countyName: county.name };
    }
  }
  return null;
}
