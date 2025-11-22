"use client";

import React from "react";
import dynamic from "next/dynamic";
import CountyGrid from "@/app/components/neighborhoods/CountyGrid";

const SoCalCountySVGMap = dynamic(
  () => import("@/app/components/neighborhoods/SoCalCountySVGMap"),
  { ssr: false }
);

const NeighborhoodsPage: React.FC = () => {
  return (
    <>
      {/* Mobile View - Modern Grid */}
      <div className="block md:hidden" data-page="neighborhoods">
        <CountyGrid />
      </div>

      {/* Desktop View - Interactive Map */}
      <div className="hidden md:block w-full h-screen overflow-hidden" data-page="neighborhoods">
        <SoCalCountySVGMap />
      </div>
    </>
  );
};

export default NeighborhoodsPage;
