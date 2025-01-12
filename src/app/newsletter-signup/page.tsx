import VariableHero from "@/components/VariableHero";
import Contact from "@/components/contact/Contact";
import type { Metadata } from "next";

export async function generateMetadata() {
  return {
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
          url: "/joey/about.png", // Replace with the full URL if hosted externally
          alt: "Picture of Joseph Sardella",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Newsletter Signup | Joseph Sardella | JPSREALTOR",
      description:
        "Subscribe to stay informed about the latest real estate trends and updates in Coachella Valley. Weekly updates with valuable content, no spam.",
      images: ["/joey/about.png"], // Replace with the full URL if hosted externally
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function NewsletterSignupPage() {
  const navigateToHome = () => {
    window.location.href = "https://jpsrealtor.com/";
  };

  return (
    <div className="bg-black text-white min-h-screen flex flex-col">
      {/* Hero Section */}
      <VariableHero
        backgroundImage="/joey/about.png" // Replace with your actual default hero image path
        heroContext="Signup for my Newletter"
        description="Take your Real Estate knowledge to the next level!"
      />

      {/* Content Section */}
      <div className="flex flex-col items-center justify-center flex-grow px-6 py-20">
        <div className="max-w-3xl mb-10">
          <h2 className="md:text-3xl lg:text-5xl text-2xl font-bold leading-snug mb-6">
            Local & National Real Estate News & Trends you need to know about!
          </h2>
          <p className="md:text-lg sm:text-base leading-relaxed">
            When you subscribe to my Newsletter you will get all the latest information about the Coachella Valley straight from my website into your email. I'm not one to spam and send a bunch of annoying emails. When you signup you will get a few emails from me right away mainly just confirming you are signed up.
          </p>
          <p className="md:text-lg sm:text-base text-yellow-200 mt-3 leading-relaxed">
          <strong>Make sure you open the confirmation email and click the button to confirm your subscription after filling out this form.</strong>
          </p>
          <p className="md:text-lg sm:text-base mt-3 leading-relaxed">
          I will send you a couple more emails in the next few days telling you cool features about my website and how to take advantage of them. Once a week I send a Coachella Valley update email which will contain links to my recent blog posts(I'm not emailing you after everytime I post, I'm not into spam).
          </p>
          <p className="md:text-lg sm:text-base mt-2 leading-relaxed">
           Every now and then I will send an email asking about Real Estate goals and neighborhoods of interest, feel free to ingore them if you want, or fill them out if its been on your mind. You will love the content you recieve as it will be a range of topics from national real estate trends, to local events and local market updates.
          </p>
        </div>
        <Contact />
      </div>
    </div>
  );
}
