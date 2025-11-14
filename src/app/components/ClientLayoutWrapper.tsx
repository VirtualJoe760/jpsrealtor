// app/components/ClientLayoutWrapper.tsx
"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";
import Navbar from "./navbar/Navbar";
import { Providers } from "../providers";

export default function ClientLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideFooter = pathname?.startsWith("/mls-listings");

  return (
    <Providers>
      <Navbar />
      {children}
      {!hideFooter && <Footer />}
    </Providers>
  );
}
