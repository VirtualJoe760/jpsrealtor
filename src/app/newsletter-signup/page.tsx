// src/app/newsletter-signup/page.tsx
"use client";

import VariableHero from "@/components/VariableHero";
import Contact from "@/components/contact/Contact";
import { useTheme } from "@/app/contexts/ThemeContext";
import SpaticalBackground from "@/app/components/backgrounds/SpaticalBackground";

export default function NewsletterSignupPage() {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  return (
    <SpaticalBackground showGradient={true}>
      <div className="min-h-screen flex flex-col">
        {/* Hero Section */}
        <VariableHero
          backgroundImage="/joey/about.png"
          heroContext="Signup for my Newsletter"
          description="Take your Real Estate knowledge to the next level!"
        />

        {/* Content Section */}
        <div className="flex flex-col items-center justify-center flex-grow px-6 py-20">
          <div className="max-w-3xl mb-10">
            <h2 className={`md:text-3xl lg:text-5xl text-2xl font-bold leading-snug mb-6 ${
              isLight ? "text-gray-900" : "text-white"
            }`}>
              Local & National Real Estate News & Trends you need to know about!
            </h2>
            <p className={`md:text-lg sm:text-base leading-relaxed ${
              isLight ? "text-gray-700" : "text-gray-200"
            }`}>
              When you subscribe to my Newsletter you will get all the latest information about the Coachella Valley straight from my website into your email. I'm not one to spam and send a bunch of annoying emails. When you signup you will get a few emails from me right away mainly just confirming you are signed up.
            </p>
            <p className={`md:text-lg sm:text-base mt-3 leading-relaxed font-semibold ${
              isLight ? "text-amber-600" : "text-yellow-200"
            }`}>
              Make sure you open the confirmation email and click the button to confirm your subscription after filling out this form.
            </p>
            <p className={`md:text-lg sm:text-base mt-3 leading-relaxed ${
              isLight ? "text-gray-700" : "text-gray-200"
            }`}>
              I will send you a couple more emails in the next few days telling you cool features about my website and how to take advantage of them. Once a week I send a Coachella Valley update email which will contain links to my recent blog posts (I'm not emailing you after every time I post, I'm not into spam).
            </p>
            <p className={`md:text-lg sm:text-base mt-2 leading-relaxed ${
              isLight ? "text-gray-700" : "text-gray-200"
            }`}>
              Every now and then I will send an email asking about Real Estate goals and neighborhoods of interest, feel free to ignore them if you want, or fill them out if it's been on your mind. You will love the content you receive as it will be a range of topics from national real estate trends, to local events and local market updates.
            </p>
          </div>
          <Contact />
        </div>
      </div>
    </SpaticalBackground>
  );
}
