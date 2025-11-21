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
    <div className="min-h-screen">
      {children}
    </div>
  );
}
