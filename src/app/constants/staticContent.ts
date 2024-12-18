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
      body: `As a Coachella Valley native, I bring a deep-rooted passion for real estate and a lifetime of local knowledge to my clients.`,
      link: {
        text: "Joseph's Real Estate Insights",
        href: "/insights",
      },
      imageUrl: "/misc/bento-1.jpg",
    },
    {
      heading: "A Legacy of Real Estate",
      description: "Decades of Experience in the Desert",
      body: `Carrying on a family legacy of real estate that began in the 1970s, Joseph grew up in Indian Wells Country Club.`,
      link: {
        text: "Explore The Desert",
        href: "/neighborhoods",
      },
      imageUrl: "/misc/bento-2.png",
    },
    {
      heading: "Technical Expertise",
      description: "Real Estate in the Digital Age",
      body: `With a strong technical background in computers, software, and digital marketing, Joseph leverages tools to connect buyers and sellers effectively.`,
      link: {
        text: "Contact Joseph Today",
        href: "/contact",
      },
      imageUrl: "/misc/bento-3.png",
    },
    {
      heading: "Ready to see some houses?",
      description: "See listings in the Coachella Valley.",
      body: `Ready to buy your dream home? Discover expert insights on Joseph's blog to guide you through every step.`,
      link: {
        text: "View Listings",
        href: "/listings",
      },
      imageUrl: "/misc/bento-4.jpg",
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

// INSIGHTS SECTION
export const insightsCategoriesContent = {
  heading: "Explore Real Estate Insights & Advice",
  description:
    "Stay informed and confident throughout your real estate journey. From market trends to practical tips, discover expert insights tailored to your needs.",
  categories: [
    {
      id: 1,
      title: "Articles",
      href: "/insights/articles",
      imageUrl:
        "/misc/back-yard_00001_.png",
      altText: "An open book with charts representing knowledge and insights.",
      description:
        "Explore in-depth articles covering economics, market statistics, trends, and insights that go beyond the Coachella Valley.",
    },
    {
      id: 2,
      title: "Market Insights",
      href: "/insights/market-insights",
      imageUrl:
        "/misc/front-yard_00001_.png",
      altText: "Graphs and charts showcasing Coachella Valley market trends.",
      description:
        "Discover insights focused on the Coachella Valley market, including housing trends, neighborhood highlights, and local statistics.",
    },
    {
      id: 3,
      title: "Real Estate Tips",
      href: "/insights/real-estate-tips",
      imageUrl:
        "/misc/bathroom_00001_.png",
      altText: "A real estate agent reviewing a home buying guide.",
      description:
        "Practical tips and advice on navigating real estate transactions, from buying and selling to maximizing your investment.",
    },
  ],
};

// CATEGORIES CONTENT

// SECTION BLOG PAGE CONTENT

export const categoriesPageContent = {
  title: (section: string) => `${section.replace('-', ' ')}`,
  description: (section: string) =>
    `I'm dedicated to more than just helping you buy or sell properties. I strive to provide valuable insights and expert advice through our blog. Whether you're navigating the real estate market, staying informed on local trends, or seeking tips for property investment, our ${section.replace('-', ' ')} insights are tailored to empower you with the knowledge to make confident decisions for your real estate journey.`,
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
