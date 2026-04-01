"use client";

import { useRef, Suspense, useState } from "react";
import dynamic from "next/dynamic";

// Dynamically import Three.js components only on client
const ThreeStars = dynamic(
  () => import("./ThreeStars").catch(() => {
    // Fallback if import fails - show subtle dark gradient
    return {
      default: () => (
        <div className="w-full h-full absolute inset-0 z-0 bg-gradient-to-b from-neutral-950 via-black/95 to-[#050507]" />
      )
    };
  }),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full absolute inset-0 z-0 bg-[#050507]" />
    ),
  }
);

export default function StarsCanvas() {
  return (
    <div className="w-full h-full absolute inset-0 z-0 bg-[#050507]">
      <ThreeStars />
    </div>
  );
}
