// src/app/campaign/direct-mail/page.tsx
import VariableHero from "@/components/VariableHero";
import YouTubeEmbed from "@/components/YouTubeEmbed";
import Contact from "@/components/contact/Contact";

export const metadata = {
  title: "Fill Out the Form Below for Your Ultimate Seller's Guide",
  description:
    "Discover the secrets to a successful home sale! Fill out the form below to receive your Ultimate Home Seller's Guide and maximize your property's value.",
  keywords: [
    "home seller's guide",
    "real estate tips",
    "sell your home fast",
    "maximize home value",
    "Coachella Valley real estate",
    "Joseph Sardella",
  ],
  author: "Joseph Sardella",
  openGraph: {
    title: "Fill Out the Form Below for Your Ultimate Seller's Guide",
    description:
      "Unlock expert advice and strategies to sell your home with confidence. Get your free Ultimate Home Seller's Guide now.",
    images: [
      {
        url: "/joey/about.png",
        alt: "Joseph Sardella - Ultimate Home Seller's Guide",
      },
    ],
  },
};

export default function DirectMailPage() {
  return (
    <div className="bg-black text-white min-h-screen flex flex-col">
      {/* Hero Section */}
      <VariableHero
        backgroundImage="/misc/real-estate/kitchen/kitchen_00027_.png"
        heroContext="Get The Ultimate Home Seller's Guide"
        description="Scroll down and fill out the form to recieve your copy of the ultimate sellers guide."
      />
        
      {/* YouTube Video */}
      <div className="flex justify-center px-6 py-10">
        <div className="w-full max-w-3xl">
          <YouTubeEmbed
            videoId="r-STgxW2A1E"
            title="List your home with JPS Realtor"
            autoplay={true}
          />
        </div>
      </div>

      {/* Content Section */}
      <div className="flex flex-col items-center justify-center flex-grow px-6 py-20">
        <div className="max-w-3xl">
          <h2 className="text-5xl font-bold leading-snug mb-6">
            Unlock Your Path to a Successful Home Sale
          </h2>
          <p className="text-lg leading-relaxed mb-8">
            Selling your home doesn’t have to be stressful. With my proven strategies and expert
            advice, you can navigate the process confidently and achieve the best results.
          </p>
          <p className="text-lg leading-relaxed mb-8">
            I’ve created <strong>The Ultimate Home Seller's Guide</strong>, an essential resource
            that gives you the tools and tips to maximize your property’s value. From staging your
            home to crafting a compelling listing and negotiating offers, this guide has everything
            you need for a seamless home sale.
          </p>
          <p className="text-lg leading-relaxed mb-8">
            Fill out the form below to get your free copy and start your journey to selling your
            home with confidence. Once you’ve submitted the form, be sure to confirm your
            subscription via email to access the guide. Then book your appointment to meet for coffee on me.
          </p>
          <hr />
          <p className="text-lg leading-relaxed mt-8 italic">
            Your next chapter starts here. Let’s make it a successful one.
          </p>
        </div>
      </div>

      {/* Contact Section */}
      <Contact />
    </div>
  );
}
