// src/app/success/page.tsx
import VariableHero from "@/components/VariableHero";
import BackButton from "@/components/BackButton";

export default function SuccessPage() {
    const handleBack = () => {
      const referrer = sessionStorage.getItem("referrer");
      if (referrer) {
        window.location.href = referrer; // Navigate back to the saved referrer
      } else {
        window.history.back(); // Fallback to history.back() if no referrer
      }
    };
  return (
    <div className="bg-black text-white min-h-screen flex flex-col">
      {/* Hero Section */}
      <VariableHero
        backgroundImage="/joey/about.png" // Replace with your actual default hero image path
        heroContext="I’ll Be in Touch Shortly!"
        description=""
      />

      {/* Content Section */}
      <div className="flex flex-col items-center justify-center flex-grow px-6 py-20">
        <div className="text-center max-w-3xl">
          <h2 className="text-4xl font-bold leading-snug mb-6">
            Thank you for reaching out!
          </h2>
          <p className="text-lg leading-relaxed">
            I’m excited to connect with you soon and assist you in finding your dream home here in
            the stunning Coachella Valley. <strong>In a moment you will recieve a confirmation email for your subscription to the newsletter. Make sure you click the confirmation button.</strong> Together, we’ll make your real estate journey smooth,
            successful, and truly enjoyable.
          </p>
          <div className="mt-8">
            <BackButton />
          </div>
        </div>
      </div>
    </div>
  );
}
