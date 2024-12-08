import type { Metadata } from "next";
import "./globals.css";
import "@fontsource/raleway"; // Importing Raleway

import Navbar from "./components/navbar/Navbar";


export const metadata: Metadata = {
  title: "JPS Realtor",
  description: "Professional real estate services by Joey Sardella",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>
        <Navbar />
        {children}
        </body>
    </html>
  );
}
