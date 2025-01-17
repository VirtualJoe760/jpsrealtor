// src/app/book-appointment/page.tsx
import VariableHero from "@/components/VariableHero";
import TidyCalEmbed from "@/components/TidyCalEmbed";

export const metadata = {
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
    author: "Joseph Sardella",
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
  

export default function BookAppointmentPage() {
  return (
    <>
    <VariableHero
          backgroundImage="/misc/real-estate/front-yard/front-yard_00017_.png"
          heroContext="Book Your Free Real Estate Consultation"
          description="Take the first step toward achieving your real estate goals."
        />
      {/* Content Section */}
      <div className="flex-grow flex flex-col items-center justify-start px-12 py-24 bg-white">
        <div className="max-w-3xl w-full text-center">
          <h2 className="text-5xl text-black font-bold mb-4">Book an Appointment</h2>
        </div>
      </div>
      <div className="w-full flex-grow">
          <TidyCalEmbed path="josephsardella/free-real-estate-consultation" />
        </div>
    </>
  );
}
