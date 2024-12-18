// HOME HERO SECTION

export const homeHeroContent = {
  heading: "Discover Your Dream Home in Coachella Valley",
  description:
    "Explore the finest real estate opportunities in Coachella Valley. From luxury estates to cozy family homes, find your perfect match in our vibrant communities.",
  ctaOne: {
    text: "Browse Listings",
    href: "/listings",
  },
  ctaTwo: {
    text: "Contact an Agent",
    href: "/contact",
  },
  heroImage: {
    src: "https://res.cloudinary.com/dcrue4vr6/image/upload/w_850,h_350,q_auto/v1729463634/real-estate-hero.jpg",
    alt: "Hero image of a modern Coachella Valley home",
    width: 850,
    height: 350,
  },
};

// ABOUT SECTION

export const aboutSectionContent = {
  title: "Meet Joseph Sardella",
  cards: [
    {
      heading: "Who is Joseph Sardella",
      description: "Your Coachella Valley Real Estate Expert",
      body: `As a Coachella Valley native, I bring a deep-rooted passion for real estate and a lifetime of local knowledge to my clients. Growing up in Indian Wells Country Club, I’ve watched the desert blossom into the oasis it is today. Since becoming an agent in 2019, I’ve proudly continued my family’s real estate legacy, which dates back to the 1970s.
      With a strong technical background in digital marketing and software, I provide modern, data-driven strategies for buyers, sellers, and investors alike. Outside of real estate, I enjoy hitting the gym, exploring the desert’s scenic hiking trails, playing golf, and enjoying dinner dates with my girlfriend, Kelly.
      Let’s work together to make your Coachella Valley real estate dreams a reality.`,
      link: {
        text: "Joseph's Real Estate Insights",
        href: "/insights",
      },
    },
    {
      heading: "A Legacy of Real Estate",
      description: "Decades of Experience in the Desert",
      body: `Carrying on a family legacy of real estate that began in the 1970s, Joseph grew up in Indian Wells Country Club and has witnessed the desert blossom into the oasis it is today. Since 2019, Joseph has helped clients discover the best neighborhoods the Coachella Valley has to offer.`,
      link: {
        text: "Explore The Desert",
        href: "/neighborhoods",
      },
    },
    {
      heading: "Technical Expertise",
      description: "Real Estate in the Digital Age",
      body: `With a strong technical background in computers, software, and digital marketing, Joseph leverages cutting-edge tools to connect buyers and sellers effectively. From targeted listings to comprehensive market insights, Joseph brings technology and tradition together to deliver exceptional results.`,
      link: {
        text: "Contact Joseph Today.",
        href: "/contact",
      },
    },
    {
      heading: "Ready to see some houses?",
      description: "See listings in the Coachella Valley.",
      body: `Ready to buy your dream home or explore the market? Discover expert insights on Joseph's blog to guide you through every step of the process. From tips on buying and selling to understanding the Coachella Valley market, you'll find everything you need to make confident real estate decisions.`,
      link: {
        text: "View Listings",
        href: "/listings",
      },
    },
  ],
};

// SERVICES HERO SECTION

export const servicesHeroContent = {
  heading: "Expert Real Estate Services in Coachella Valley",
  description:
    "Whether you're buying your first home, upgrading to a luxury property, or investing in real estate, our team is here to guide you every step of the way. Explore our comprehensive services designed to meet all your real estate needs.",
  features: [
    {
      name: "Local Market Expertise",
      description:
        "Our team knows the Coachella Valley inside and out, offering insights to help you make the best real estate decisions.",
      icon: "HomeIcon",
    },
    {
      name: "Comprehensive Listings",
      description:
        "Access a wide range of property listings, including off-market opportunities, to find your perfect home.",
      icon: "SearchIcon",
    },
    {
      name: "Buyer & Seller Support",
      description:
        "From negotiation to closing, we provide personalized support tailored to your goals.",
      icon: "HandshakeIcon",
    },
    {
      name: "Satisfaction Guaranteed",
      description:
        "We are committed to exceeding your expectations. Your real estate success is our top priority.",
      icon: "FaceSmileIcon",
    },
  ],
};

// TIPS SECTION

export const tipsCategoriesContent = {
  heading: "Explore Real Estate Tips & Advice",
  description:
    "Navigate your real estate journey with confidence. Explore expert advice on buying, selling, and everything in between.",
  categories: [
    {
      id: 1,
      title: "Buying Guides",
      href: "/tips/buying-guides",
      imageUrl:
        "https://images.unsplash.com/photo-1595814432314-90095f342694?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      altText: "A couple reviewing a real estate buying guide",
    },
    {
      id: 2,
      title: "Selling Tips",
      href: "/tips/selling-tips",
      imageUrl:
        "https://images.unsplash.com/photo-1607400201889-565b1ee75f8e?q=80&w=2669&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      altText: "A real estate agent staging a home for sale",
    },
    {
      id: 3,
      title: "Market Insights",
      href: "/tips/market-insights",
      imageUrl:
        "https://images.unsplash.com/photo-1561065091-4908548ee638?q=80&w=2448&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      altText: "Graphs and charts showcasing real estate market trends",
    },
  ],
};

// CITIES CONTENT

export const citiesPageContent = {
  hero: {
    backgroundImage:
      "https://res.cloudinary.com/dcrue4vr6/image/upload/v1729459742/coachella-valley.jpg",
    cityId: "coachella-valley",
  },
  sections: {
    serviceAreas: {
      heading: "Communities in Coachella Valley",
      description:
        "Explore the unique communities that make up the Coachella Valley. From luxury estates to family-friendly neighborhoods, there’s a perfect place for everyone.",
    },
  },
  cityNotFound: "City not found. Please check back later.",
};

// CITYPAGE CONTENT

export const cityPageContent = {
  cityNotFound: {
    message: "City not found.",
    backToCities: "Go back to communities.",
  },
};

// SERVICE ID CONTENT

export const servicePageContent = {
  serviceNotFound: {
    message: "Service not found.",
    backToServices: "Go back to services.",
  },
};
