import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Newsletter Signup | Joseph Sardella | JPSREALTOR",
  description:
    "Sign up for our newsletter and get the latest Coachella Valley real estate updates, national trends, local events, and market insights delivered straight to your inbox.",
  openGraph: {
    title: "Newsletter Signup | Joseph Sardella | JPSREALTOR",
    description:
      "Subscribe now to receive weekly Coachella Valley updates, national real estate trends, and tips for buyers, sellers, and investors. No spam—just valuable insights.",
    url: "https://jpsrealtor.com/newsletter-signup",
    images: [
      {
        url: "/joey/about.png",
        alt: "Picture of Joseph Sardella",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Newsletter Signup | Joseph Sardella | JPSREALTOR",
    description:
      "Subscribe to stay informed about the latest real estate trends and updates in Coachella Valley. Weekly updates with valuable content, no spam.",
    images: ["/joey/about.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function NewsletterSignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
