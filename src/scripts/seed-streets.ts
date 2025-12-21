// src/scripts/seed-streets.ts
// Seed major streets for Coachella Valley cities

import dbConnect from "@/lib/mongoose";
import StreetBoundary from "@/models/StreetBoundary";

const COACHELLA_VALLEY_STREETS = [
  // La Quinta
  {
    cityId: "la-quinta",
    streetName: "Washington Street",
    normalizedName: "washington",
    direction: "north-south" as const,
    coordinates: { longitude: -116.310 }
  },
  {
    cityId: "la-quinta",
    streetName: "Adams Street",
    normalizedName: "adams",
    direction: "north-south" as const,
    coordinates: { longitude: -116.275 }
  },
  {
    cityId: "la-quinta",
    streetName: "Jefferson Street",
    normalizedName: "jefferson",
    direction: "north-south" as const,
    coordinates: { longitude: -116.245 }
  },
  {
    cityId: "la-quinta",
    streetName: "Madison Street",
    normalizedName: "madison",
    direction: "north-south" as const,
    coordinates: { longitude: -116.215 }
  },
  {
    cityId: "la-quinta",
    streetName: "Monroe Street",
    normalizedName: "monroe",
    direction: "north-south" as const,
    coordinates: { longitude: -116.185 }
  },
  {
    cityId: "la-quinta",
    streetName: "Highway 111",
    normalizedName: "highway-111",
    direction: "east-west" as const,
    coordinates: { latitude: 33.663 }
  },
  {
    cityId: "la-quinta",
    streetName: "Avenue 50",
    normalizedName: "avenue-50",
    direction: "east-west" as const,
    coordinates: { latitude: 33.643 }
  },
  {
    cityId: "la-quinta",
    streetName: "Avenue 52",
    normalizedName: "avenue-52",
    direction: "east-west" as const,
    coordinates: { latitude: 33.623 }
  },

  // Palm Desert
  {
    cityId: "palm-desert",
    streetName: "Washington Street",
    normalizedName: "washington",
    direction: "north-south" as const,
    coordinates: { longitude: -116.365 }
  },
  {
    cityId: "palm-desert",
    streetName: "Portola Avenue",
    normalizedName: "portola",
    direction: "north-south" as const,
    coordinates: { longitude: -116.385 }
  },
  {
    cityId: "palm-desert",
    streetName: "Cook Street",
    normalizedName: "cook",
    direction: "north-south" as const,
    coordinates: { longitude: -116.405 }
  },
  {
    cityId: "palm-desert",
    streetName: "Monterey Avenue",
    normalizedName: "monterey",
    direction: "north-south" as const,
    coordinates: { longitude: -116.425 }
  },
  {
    cityId: "palm-desert",
    streetName: "Highway 111",
    normalizedName: "highway-111",
    direction: "east-west" as const,
    coordinates: { latitude: 33.743 }
  },
  {
    cityId: "palm-desert",
    streetName: "Country Club Drive",
    normalizedName: "country-club",
    direction: "east-west" as const,
    coordinates: { latitude: 33.733 }
  },
  {
    cityId: "palm-desert",
    streetName: "Frank Sinatra Drive",
    normalizedName: "frank-sinatra",
    direction: "east-west" as const,
    coordinates: { latitude: 33.763 }
  },

  // Indian Wells
  {
    cityId: "indian-wells",
    streetName: "Washington Street",
    normalizedName: "washington",
    direction: "north-south" as const,
    coordinates: { longitude: -116.340 }
  },
  {
    cityId: "indian-wells",
    streetName: "Highway 111",
    normalizedName: "highway-111",
    direction: "east-west" as const,
    coordinates: { latitude: 33.713 }
  },
  {
    cityId: "indian-wells",
    streetName: "Miles Avenue",
    normalizedName: "miles",
    direction: "north-south" as const,
    coordinates: { longitude: -116.355 }
  },

  // Rancho Mirage
  {
    cityId: "rancho-mirage",
    streetName: "Bob Hope Drive",
    normalizedName: "bob-hope",
    direction: "north-south" as const,
    coordinates: { longitude: -116.415 }
  },
  {
    cityId: "rancho-mirage",
    streetName: "Monterey Avenue",
    normalizedName: "monterey",
    direction: "north-south" as const,
    coordinates: { longitude: -116.445 }
  },
  {
    cityId: "rancho-mirage",
    streetName: "Highway 111",
    normalizedName: "highway-111",
    direction: "east-west" as const,
    coordinates: { latitude: 33.773 }
  },
  {
    cityId: "rancho-mirage",
    streetName: "Dinah Shore Drive",
    normalizedName: "dinah-shore",
    direction: "east-west" as const,
    coordinates: { latitude: 33.783 }
  },

  // Palm Springs
  {
    cityId: "palm-springs",
    streetName: "Indian Canyon Drive",
    normalizedName: "indian-canyon",
    direction: "north-south" as const,
    coordinates: { longitude: -116.545 }
  },
  {
    cityId: "palm-springs",
    streetName: "Palm Canyon Drive",
    normalizedName: "palm-canyon",
    direction: "north-south" as const,
    coordinates: { longitude: -116.545 }
  },
  {
    cityId: "palm-springs",
    streetName: "Gene Autry Trail",
    normalizedName: "gene-autry",
    direction: "north-south" as const,
    coordinates: { longitude: -116.515 }
  },
  {
    cityId: "palm-springs",
    streetName: "Ramon Road",
    normalizedName: "ramon",
    direction: "east-west" as const,
    coordinates: { latitude: 33.813 }
  },
  {
    cityId: "palm-springs",
    streetName: "Vista Chino",
    normalizedName: "vista-chino",
    direction: "east-west" as const,
    coordinates: { latitude: 33.833 }
  },

  // Indio
  {
    cityId: "indio",
    streetName: "Monroe Street",
    normalizedName: "monroe",
    direction: "north-south" as const,
    coordinates: { longitude: -116.215 }
  },
  {
    cityId: "indio",
    streetName: "Jackson Street",
    normalizedName: "jackson",
    direction: "north-south" as const,
    coordinates: { longitude: -116.185 }
  },
  {
    cityId: "indio",
    streetName: "Highway 111",
    normalizedName: "highway-111",
    direction: "east-west" as const,
    coordinates: { latitude: 33.723 }
  },
  {
    cityId: "indio",
    streetName: "Avenue 42",
    normalizedName: "avenue-42",
    direction: "east-west" as const,
    coordinates: { latitude: 33.683 }
  },

  // Cathedral City
  {
    cityId: "cathedral-city",
    streetName: "Date Palm Drive",
    normalizedName: "date-palm",
    direction: "north-south" as const,
    coordinates: { longitude: -116.465 }
  },
  {
    cityId: "cathedral-city",
    streetName: "Perez Road",
    normalizedName: "perez",
    direction: "north-south" as const,
    coordinates: { longitude: -116.485 }
  },
  {
    cityId: "cathedral-city",
    streetName: "Ramon Road",
    normalizedName: "ramon",
    direction: "east-west" as const,
    coordinates: { latitude: 33.803 }
  },

  // Desert Hot Springs
  {
    cityId: "desert-hot-springs",
    streetName: "Palm Drive",
    normalizedName: "palm",
    direction: "north-south" as const,
    coordinates: { longitude: -116.505 }
  },
  {
    cityId: "desert-hot-springs",
    streetName: "Pierson Boulevard",
    normalizedName: "pierson",
    direction: "east-west" as const,
    coordinates: { latitude: 33.963 }
  },
];

async function seedStreets() {
  try {
    console.log("🌐 Connecting to database...");
    await dbConnect();

    console.log("🗑️  Clearing existing street boundaries...");
    await StreetBoundary.deleteMany({});

    console.log(`📍 Seeding ${COACHELLA_VALLEY_STREETS.length} street boundaries...`);
    await StreetBoundary.insertMany(COACHELLA_VALLEY_STREETS);

    console.log("✅ Street boundaries seeded successfully!");
    console.log("\nSummary:");

    // Show summary by city
    const cities = [...new Set(COACHELLA_VALLEY_STREETS.map(s => s.cityId))];
    for (const cityId of cities) {
      const count = COACHELLA_VALLEY_STREETS.filter(s => s.cityId === cityId).length;
      console.log(`  - ${cityId}: ${count} streets`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding streets:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedStreets();
}

export default seedStreets;
