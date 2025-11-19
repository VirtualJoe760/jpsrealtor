/**
 * Navless Layout for Chat Interface
 * No traditional navigation - seamless, immersive experience
 */

export default function ChatLayout({
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
