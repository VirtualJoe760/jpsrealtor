import React from "react";
import dynamic from "next/dynamic";
import { Metadata } from "next";

const SoCalCountySVGMap = dynamic(
  () => import("@/app/components/neighborhoods/SoCalCountySVGMap"),
  { ssr: false }
);

// Generate metadata for the Neighborhoods page
export const generateMetadata = (): Metadata => {
  return {
    title: "Southern California Neighborhoods | Explore Counties & Cities",
    description: "Discover real estate opportunities across Southern California. Explore neighborhoods, homes, and properties by county and city.",
  };
};

const NeighborhoodsPage: React.FC = () => {
  return (
    <div className="w-full h-[65vh] sm:h-[80vh] md:h-screen overflow-hidden">
      <SoCalCountySVGMap />
    </div>
  );
};

export default NeighborhoodsPage;
