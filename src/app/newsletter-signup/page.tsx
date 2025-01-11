"use client"; // Add this at the top to make this a Client Component

import VariableHero from "@/components/VariableHero";
import Contact from "@/components/contact/Contact";

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
          <h2 className="text-5xl font-bold leading-snug mb-6">
            Local & National Real Estate News & Trends you need to know about!
          </h2>
          <p className="text-lg leading-relaxed">
            When you subscribe to my Newsletter you will get all the latest information about the Coachella Valley straight from my website into your email. I'm not one to spam and send a bunch of annoying emails. When you signup you will get a few emails from me right away mainly just confirming you are signed up.
          </p>
          <p className="text-xl mt-3 leading-relaxed">
          <strong>Make sure you open the confirmation email and confirm your subscription after filling out this form.</strong>
          </p>
          <p className="text-lg mt-3 leading-relaxed">
          I will send you a couple more emails in the next few days telling you cool features about my website and how to take advantage of them. Once a week I send a Coachella Valley update email which will contain links to my recent blog posts(I'm not emailing you after everytime I post, I'm not into spam).
          </p>
          <p className="text-lg mt-2 leading-relaxed">
           Every now and then I will send an email asking about Real Estate goals and neighborhoods of interest, feel free to ingore them if you want, or fill them out if its been on your mind. You will love the content you recieve as it will be a range of topics from national real estate trends, to local events and local market updates.
          </p>
        </div>
        <hr />
        <Contact />
      </div>
    </div>
  );
}
