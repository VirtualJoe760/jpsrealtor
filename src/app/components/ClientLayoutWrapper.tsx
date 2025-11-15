// app/components/ClientLayoutWrapper.tsx
"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";
import Navbar from "./navbar/Navbar";
import { Providers } from "../providers";
import MetaPixel from "../../components/MetaPixel";

export default function ClientLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideFooter = pathname?.startsWith("/mls-listings");

  return (
    <Providers>
      <MetaPixel />
      <Navbar />
      {children}
      {!hideFooter && <Footer />}
    </Providers>
  );
}
