/**
 * Navless Layout for Neighborhoods
 * No traditional navigation - seamless, immersive experience
 */

import SpaticalBackground from "@/app/components/backgrounds/SpaticalBackground";

export default function NeighborhoodsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SpaticalBackground className="h-screen w-screen overflow-auto" showGradient={true}>
      <div className="min-h-screen">
        {children}
      </div>
    </SpaticalBackground>
  );
}
