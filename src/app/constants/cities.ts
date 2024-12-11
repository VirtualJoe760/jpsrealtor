export interface City {
    name: string;
    population: number;
    id: string;
    heading: string;
    description: string;
    body: string;
    keywords: {
      main: string[];
      secondary: string[];
    };
  }
  
  export const coachellaValleyCities: City[] = [
    {
      name: "Coachella Valley",
      population: 235839,
      id: "coachella-valley",
      heading: "Explore Homes in the Heart of Coachella Valley",
      description: "Discover real estate opportunities across the stunning Coachella Valley. From luxury estates to modern homes, find your ideal residence.",
      body: "The Coachella Valley offers diverse and vibrant communities surrounded by beautiful desert landscapes. With a range of homes available, from upscale properties to more affordable options, there's something for everyone looking to settle in this unique region.",
      keywords: {
        main: ["Coachella Valley homes", "real estate Coachella Valley", "Coachella Valley property sales"],
        secondary: ["luxury homes Coachella Valley", "buy homes Coachella Valley", "real estate listings Coachella Valley"]
      }
    },
    {
      name: "Palm Springs",
      population: 48518,
      id: "palm-springs",
      heading: "Palm Springs Real Estate and Homes for Sale",
      description: "Find your dream home in Palm Springs, a community known for its stylish living and unique architecture.",
      body: "Palm Springs combines scenic desert views with a lively, modern lifestyle. Explore a variety of homes available, from mid-century modern designs to luxurious estates.",
      keywords: {
        main: ["Palm Springs real estate", "homes for sale Palm Springs", "Palm Springs property"],
        secondary: ["luxury homes Palm Springs", "buy house Palm Springs", "Palm Springs real estate listings"]
      }
    },
    {
      name: "Palm Desert",
      population: 53369,
      id: "palm-desert",
      heading: "Homes for Sale in Palm Desert",
      description: "Discover your next home in Palm Desert, where luxury meets comfort in the beautiful Coachella Valley.",
      body: "Known for its luxury residences and amenities, Palm Desert is an ideal place to find high-quality homes with easy access to shopping, dining, and scenic attractions.",
      keywords: {
        main: ["Palm Desert homes", "Palm Desert real estate", "homes for sale Palm Desert"],
        secondary: ["luxury property Palm Desert", "buy home Palm Desert", "Palm Desert real estate listings"]
      }
    },
    {
      name: "La Quinta",
      population: 41667,
      id: "la-quinta",
      heading: "La Quinta Real Estate and Property Listings",
      description: "Explore beautiful homes in La Quinta, a desert community known for its charm and serene lifestyle.",
      body: "La Quinta offers a variety of home styles, from cozy desert abodes to upscale properties near scenic golf courses, catering to all tastes.",
      keywords: {
        main: ["La Quinta real estate", "homes for sale La Quinta", "La Quinta property"],
        secondary: ["buy home La Quinta", "La Quinta property listings", "real estate La Quinta"]
      }
    },
    {
      name: "Indio",
      population: 91761,
      id: "indio",
      heading: "Find Your Home in Indio",
      description: "Indio offers a range of housing options ideal for families, professionals, and retirees alike.",
      body: "Indio combines cultural richness with affordability, making it an attractive place to buy a home in the Coachella Valley.",
      keywords: {
        main: ["Indio homes", "Indio real estate", "homes for sale Indio"],
        secondary: ["Indio property", "buy home Indio", "Indio real estate listings"]
      }
    },
    {
      name: "Rancho Mirage",
      population: 18228,
      id: "rancho-mirage",
      heading: "Rancho Mirage Real Estate and Luxury Living",
      description: "Discover the luxury homes and exclusive communities of Rancho Mirage, a premier Coachella Valley destination.",
      body: "Rancho Mirage is renowned for its upscale living, offering high-end properties with stunning views and proximity to top amenities.",
      keywords: {
        main: ["Rancho Mirage real estate", "luxury homes Rancho Mirage", "Rancho Mirage property"],
        secondary: ["buy home Rancho Mirage", "real estate listings Rancho Mirage", "Rancho Mirage luxury properties"]
      }
    },
    {
      name: "Indian Wells",
      population: 5357,
      id: "indian-wells",
      heading: "Exclusive Real Estate in Indian Wells",
      description: "Explore elegant properties in Indian Wells, a prestigious community with exceptional amenities and scenic beauty.",
      body: "Indian Wells offers luxurious living options for those seeking refined elegance and comfort in the Coachella Valley.",
      keywords: {
        main: ["Indian Wells real estate", "homes for sale Indian Wells", "Indian Wells luxury homes"],
        secondary: ["buy home Indian Wells", "Indian Wells property listings", "real estate Indian Wells"]
      }
    },
    {
        name: "Cathedral City",
        population: 55011,
        id: "cathedral-city",
        heading: "Cathedral City Real Estate and Homes for Sale",
        description: "Explore homes in Cathedral City, a vibrant and welcoming community within the Coachella Valley.",
        body: "Cathedral City offers a range of real estate options, from affordable single-family homes to spacious estates, ideal for families and individuals alike.",
        keywords: {
          main: ["Cathedral City homes", "Cathedral City real estate", "homes for sale Cathedral City"],
          secondary: ["property listings Cathedral City", "buy home Cathedral City", "real estate Cathedral City"]
        }
      },
      {
        name: "Desert Hot Springs",
        population: 29857,
        id: "desert-hot-springs",
        heading: "Desert Hot Springs Real Estate and Investment Opportunities",
        description: "Find affordable homes and investment properties in Desert Hot Springs, a community known for its natural hot springs and unique desert setting.",
        body: "Desert Hot Springs offers a variety of affordable and investment-friendly properties, attracting those looking for a quiet desert lifestyle or a smart investment.",
        keywords: {
          main: ["Desert Hot Springs homes", "Desert Hot Springs real estate", "homes for sale Desert Hot Springs"],
          secondary: ["buy property Desert Hot Springs", "investment property Desert Hot Springs", "real estate listings Desert Hot Springs"]
        }
      },
      {
        name: "Coachella",
        population: 46324,
        id: "coachella",
        heading: "Explore Real Estate in Coachella",
        description: "Discover homes for sale in Coachella, a community with rich culture and diverse real estate options.",
        body: "The city of Coachella offers a welcoming atmosphere with a range of housing options, from family-friendly homes to newer developments, perfect for diverse buyers.",
        keywords: {
          main: ["Coachella homes", "real estate Coachella", "homes for sale Coachella"],
          secondary: ["buy home Coachella", "property listings Coachella", "real estate Coachella Valley"]
        }
      },
      {
        name: "Thousand Palms",
        population: 7293,
        id: "thousand-palms",
        heading: "Thousand Palms Real Estate and Property Listings",
        description: "Find your next home in Thousand Palms, a tranquil desert community offering affordable housing and scenic views.",
        body: "Thousand Palms provides a peaceful living environment with affordable housing options and proximity to larger Coachella Valley cities.",
        keywords: {
          main: ["Thousand Palms homes", "Thousand Palms real estate", "homes for sale Thousand Palms"],
          secondary: ["property listings Thousand Palms", "buy home Thousand Palms", "real estate Thousand Palms"]
        }
      },
      {
        name: "Bermuda Dunes",
        population: 7536,
        id: "bermuda-dunes",
        heading: "Luxury Homes and Real Estate in Bermuda Dunes",
        description: "Explore homes in Bermuda Dunes, a community known for its country club lifestyle and luxury properties.",
        body: "Bermuda Dunes offers luxurious residences with access to country club amenities, ideal for those seeking a refined desert lifestyle.",
        keywords: {
          main: ["Bermuda Dunes homes", "Bermuda Dunes real estate", "luxury homes Bermuda Dunes"],
          secondary: ["buy home Bermuda Dunes", "country club homes Bermuda Dunes", "real estate Bermuda Dunes"]
        }
      },
      {
        name: "Mecca",
        population: 8866,
        id: "mecca",
        heading: "Affordable Real Estate in Mecca",
        description: "Discover affordable housing options in Mecca, a community with a unique desert charm.",
        body: "Mecca offers affordable housing and a quiet lifestyle, appealing to those seeking a peaceful desert community.",
        keywords: {
          main: ["Mecca homes", "Mecca real estate", "homes for sale Mecca"],
          secondary: ["affordable housing Mecca", "buy home Mecca", "real estate listings Mecca"]
        }
      },
      {
        name: "Thermal",
        population: 2865,
        id: "thermal",
        heading: "Real Estate Opportunities in Thermal",
        description: "Find homes and land for sale in Thermal, a community known for its agricultural richness and open landscapes.",
        body: "Thermal offers spacious properties and open landscapes, ideal for those looking for rural living or agricultural investment opportunities.",
        keywords: {
          main: ["Thermal homes", "real estate Thermal", "land for sale Thermal"],
          secondary: ["agricultural properties Thermal", "buy land Thermal", "real estate listings Thermal"]
        }
      }      
  ];
  