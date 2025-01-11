"use client"; // Add this at the top to make this a Client Component

import VariableHero from "@/components/VariableHero";

export default function SubscribedPage() {
  const navigateToHome = () => {
    window.location.href = "https://jpsrealtor.com/";
  };

  return (
    <div className="bg-black text-white min-h-screen flex flex-col">
      {/* Hero Section */}
      <VariableHero
        backgroundImage="/joey/about.png" // Replace with your actual default hero image path
        heroContext="You Are Officially Subscribed!"
        description=""
      />

      {/* Content Section */}
      <div className="flex flex-col items-center justify-center flex-grow px-6 py-20">
        <div className="text-center max-w-3xl">
          <h2 className="text-4xl font-bold leading-snug mb-6">
            Did we just become best friends?
          </h2>
          <p className="text-lg leading-relaxed">
            Thank you for subscribing to the newsletter! I look forward to helping you explore the stunning Coachella Valley and guiding you toward finding your dream home. Together, we’ll make your real estate journey seamless, rewarding, and enjoyable.
          </p>
          <div className="mt-8">
            <button
              onClick={navigateToHome}
              className="px-6 py-3 bg-gray-700 text-white font-semibold rounded-md hover:bg-gray-600 transition-all duration-300"
            >
              Go to Home Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
