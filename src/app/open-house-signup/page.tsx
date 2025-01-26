import VariableHero from "@/components/VariableHero";
import Contact from "@/components/contact/Contact";
import type { Metadata } from "next";

export async function generateMetadata() {
  return {
    title: "Open House Signup | Joseph Sardella | JPSREALTOR",
    description:
      "Sign up for our open house and receive Joseph Sardella's ultimate buyer's guide to the Coachella Valley, packed with expert insights and local tips.",
    openGraph: {
      title: "Open House Signup | Joseph Sardella | JPSREALTOR",
      description:
        "Join us for an open house and receive your ultimate buyer's guide to the Coachella Valley. Learn how to navigate the market with expert tips and insights.",
      url: "https://jpsrealtor.com/open-house-signup",
      images: [
        {
          url: "/misc/real-estate/front-yard/front-yard_00001_.png", // Replace with the full URL if hosted externally
          alt: "Picture of Joseph Sardella",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Open House Signup | Joseph Sardella | JPSREALTOR",
      description:
        "Sign up for our open house and get exclusive access to Joseph Sardella's ultimate buyer's guide to the Coachella Valley. Your real estate journey starts here.",
      images: ["/misc/real-estate/front-yard/front-yard_00001_.png"], // Replace with the full URL if hosted externally
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function OpenHouseSignupPage() {
  const navigateToHome = () => {
    window.location.href = "https://jpsrealtor.com/";
  };

  return (
    <div className="bg-black text-white min-h-screen flex flex-col">
      {/* Hero Section */}
      <VariableHero
        backgroundImage="/misc/real-estate/front-yard/front-yard_00001_.png" // Replace with your actual default hero image path
        heroContext="Sign Up for Our Open House"
        description="Get your exclusive guide to buying in the Coachella Valley!"
      />

      {/* Content Section */}
      <div className="flex flex-col items-center justify-center flex-grow px-6 py-20">
        <div className="max-w-3xl mb-10">
          <h2 className="md:text-3xl lg:text-5xl text-2xl font-bold leading-snug mb-6">
            Unlock Your Ultimate Buyer's Guide to the Coachella Valley
          </h2>
          <p className="md:text-lg sm:text-base leading-relaxed">
            Ready to explore your dream home in the Coachella Valley? Sign up for our open house and, as a thank-you, receive my exclusive buyer's guide to the area. This guide is filled with essential tips, local market insights, and everything you need to make informed decisions about your next home purchase.
          </p>
          <p className="md:text-lg sm:text-base text-yellow-200 mt-3 leading-relaxed">
            <strong>After filling out the form, check your email to confirm your subscription and download the guide!</strong>
          </p>
          <p className="md:text-lg sm:text-base mt-3 leading-relaxed">
            I’ll also send you a few follow-up emails with tips on navigating the Coachella Valley market, updates on local real estate trends, and features on what makes this area a fantastic place to call home.
          </p>
          <p className="md:text-lg sm:text-base mt-2 leading-relaxed">
            Whether you're a first-time buyer, seasoned investor, or just curious about the market, this guide is your roadmap to success in the Coachella Valley real estate market. Sign up today and start your journey toward finding your perfect home.
          </p>
        </div>
        <Contact />
      </div>
    </div>
  );
}
