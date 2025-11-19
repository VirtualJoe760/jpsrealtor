"use client";

import React from "react";
import dynamic from "next/dynamic";

const SoCalCountySVGMap = dynamic(
  () => import("@/app/components/neighborhoods/SoCalCountySVGMap"),
  { ssr: false }
);

const NeighborhoodsPage: React.FC = () => {
  return (
    <div className="w-full h-[65vh] sm:h-[80vh] md:h-screen overflow-hidden">
      <SoCalCountySVGMap />
    </div>
  );
};

export default NeighborhoodsPage;
