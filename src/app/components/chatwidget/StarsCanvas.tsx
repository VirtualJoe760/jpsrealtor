"use client";

import { useRef, Suspense, useState } from "react";
import dynamic from "next/dynamic";

// Dynamically import Three.js components only on client
const ThreeStars = dynamic(
  () => import("./ThreeStars").catch(() => {
    // Fallback if import fails
    return { default: () => null };
  }),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full absolute inset-0 z-0 bg-gradient-to-b from-gray-900 via-purple-900/20 to-black" />
    ),
  }
);

export default function StarsCanvas() {
  return (
    <div className="w-full h-full absolute inset-0 z-0">
      <ThreeStars />
    </div>
  );
}
