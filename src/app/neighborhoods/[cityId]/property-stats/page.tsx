import React from "react";
import { Metadata } from "next";
import VariableHero from "@/components/VariableHero";
import AboutBento from "@/components/AboutBento";

export const metadata: Metadata = {
  title: "About Joseph Sardella | Coachella Valley Realtor",
  description:
    "Learn more about Joseph Sardella, a dedicated Coachella Valley Realtor with a unique blend of local expertise and modern technology. Discover his journey and passion for real estate.",
  keywords: [
    "Joseph Sardella",
    "Coachella Valley Realtor",
    "real estate expert",
    "Indian Wells real estate",
    "modern real estate solutions",
    "Obsidian Real Estate Group",
    "real estate Coachella Valley",
    "desert homes for sale",
    "luxury real estate",
    "real estate in Indian Wells",
    "Coachella Valley real estate expertise",
  ],
  openGraph: {
    title: "About Joseph Sardella | Coachella Valley Realtor",
    description:
      "Discover the story of Joseph Sardella, a seasoned Coachella Valley Realtor blending local expertise with innovative real estate solutions.",
    url: "/about",
    images: [
      {
        url: `/joey/about.png`,
        alt: "About Joseph Sardella",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Joseph Sardella | Coachella Valley Realtor",
    description:
      "Learn about Joseph Sardella's expertise in Coachella Valley real estate and his journey as a trusted Realtor.",
    images: [`/joey/about.png`],
  },
};

const page = () => {
  return (
    <div>
      <VariableHero
        backgroundImage={`/joey/about.png`}
        heroContext=" "
        description=""
        alignment="center"
      />

      {/* Bio Section */}
      <section className="max-w-4xl mx-auto py-12 px-4">
        <h2 className="text-6xl font-bold mb-6">Who is Joseph Sardella?</h2>
        <hr className="my-5" />
        <p className="mb-4 text-xl">
          Born and raised in Indian Wells Country Club, Joseph Sardella grew up
          in a household where real estate was a way of life. His parents,
          active in the local market since the early 1970s, spent years fixing
          and flipping homes, particularly in Indian Wells, giving Joseph a
          unique perspective on the industry from a young age.
        </p>
        <p className="mb-4 text-xl">
          As a young adult, Joseph pursued opportunities in the technology
          sector, starting with Apple Retail, Direct Sports Network, and
          consulting for Coachella Valley Country Clubs such as Toscana Country
          Club & Big Horn Country Club. His roles in technology allowed him to
          develop a deep understanding of software, customer engagement, and
          problem-solving—skills that would later become invaluable in his real
          estate career. Despite his success in tech, Joseph’s heart was always
          in real estate, and in 2019, he earned his license, turning a lifelong
          dream into reality.
        </p>
        <p className="mb-4 text-xl">
          Today, Joseph is a key member of eXp’s Obsidian Real Estate Group,
          contributing to a team managing 8 figures in property listings. With
          his unique blend of local knowledge and technological expertise,
          Joseph delivers modern, efficient solutions for buyers and sellers
          alike. He is passionate about helping clients navigate the unique
          real estate landscape of the Coachella Valley, ensuring their
          experiences are smooth, informed, and rewarding.
        </p>
        <p className="mb-4 text-xl">
          Outside of his career, Joseph enjoys staying active at the gym,
          exploring the valley’s breathtaking hiking trails, and cheering on
          the Firebirds at games with his friends. Approachable, knowledgeable,
          and innovative, Joseph is proud to call the Coachella Valley home and
          to play a role in shaping its future.
        </p>
        <hr className="mt-20" />
      </section>
      <AboutBento />
    </div>
  );
};

export default page;
