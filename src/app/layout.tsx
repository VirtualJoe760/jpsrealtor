import type { Metadata } from "next";
import "./globals.css";
import "@fontsource/raleway"; // Importing Raleway
import Footer from "./components/Footer";
import Navbar from "./components/navbar/Navbar";

export const metadata: Metadata = {
  title: "Joseph Sardella | Coachella Valley Realtor",
  description: "Experience exceptional real estate services with Joseph Sardella, your trusted Coachella Valley Realtor specializing in buying, selling, and investing in the local market.",
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        
          <Navbar />
          {children}
          <Footer />
        
      </body>
    </html>
  );
}
