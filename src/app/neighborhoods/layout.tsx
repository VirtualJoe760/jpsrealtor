/**
 * Navless Layout for Neighborhoods
 * No traditional navigation - seamless, immersive experience
 */

export default function NeighborhoodsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-black">
      {children}
    </div>
  );
}
