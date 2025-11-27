import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book Your Free Real Estate Consultation | Joseph Sardella",
  description:
    "Schedule your free real estate consultation with Joseph Sardella. Let's take the first step toward achieving your real estate goals in the Coachella Valley.",
  keywords: [
    "real estate consultation",
    "free consultation",
    "Coachella Valley real estate",
    "book real estate appointment",
    "Joseph Sardella",
    "real estate expert",
    "real estate advisor",
  ],
  openGraph: {
    title: "Book Your Free Real Estate Consultation | Joseph Sardella",
    description:
      "Take the first step toward achieving your real estate goals. Book your free consultation with Joseph Sardella, your trusted Coachella Valley realtor.",
    url: "https://www.jpsrealtor.com/book-appointment",
    images: [
      {
        url: "/misc/real-estate/front-yard/front-yard_00017_.png",
        alt: "Front Yard Real Estate View",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Book Your Free Real Estate Consultation | Joseph Sardella",
    description:
      "Schedule your free real estate consultation with Joseph Sardella. Let's achieve your real estate goals in the Coachella Valley.",
    images: ["/misc/real-estate/front-yard/front-yard_00017_.png"],
  },
};

export default function BookAppointmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
