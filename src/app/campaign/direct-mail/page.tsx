// src/app/campaign/direct-mail/page.tsx
import VariableHero from "@/components/VariableHero";
import YouTubeEmbed from "@/components/YouTubeEmbed";
import Contact from "@/components/contact/Contact";

export default function DirectMailPage() {
  return (
    <div className="bg-black text-white min-h-screen flex flex-col">
      {/* Hero Section */}
      <VariableHero
        backgroundImage="/joey/about.png" // Same image as SuccessPage
        heroContext="Meet Joseph Sardella"
        description="I'm the agent who will bring you top dollar for your property."
      />

      {/* Content Section */}
      <div className="flex flex-col items-center justify-center flex-grow px-6 py-20">
        <div className="max-w-3xl">
          <h2 className="text-5xl font-bold leading-snug mb-6">
            It’s time to sell your house.
          </h2>
          <hr />
          <div className="my-8">
            <YouTubeEmbed 
              videoId="r-STgxW2A1E" 
              title="List your home with JPS Realtor"
              autoplay={true}
            />
          </div>
          <hr />
          <p className="text-lg leading-relaxed my-8">
            <strong>Hi there, my name is Joseph Sardella.</strong> I’ve been a proud Coachella Valley resident for over 30 years and a dedicated realtor who’s passionate about helping homeowners like you achieve their real estate goals. Thank you for taking the time to explore how I can assist you in selling your home.
          </p>
          <p className="text-lg leading-relaxed mb-8">
            Selling a home isn’t easy—it takes more than just putting up a sign and waiting for a buyer. Many agents will list your property, buy an ad, and host a few open houses, but working with me is a completely different experience. As part of eXp’s Obsidian Real Estate Group, one of the most successful teams in the desert, we closed over 100 transactions and generated $50 million in sales last year. What sets us apart is our relentless work ethic and innovative approach to marketing.
          </p>
          <p className="text-lg leading-relaxed mb-8">
            My background in technology gives me a unique advantage. Before real estate, I worked as a full-stack software engineer and graphic designer, which allows me to create cutting-edge marketing campaigns for my clients. We use tools like drones, AI, social media advertising, and YouTube to showcase homes and attract serious buyers. When your home is under contract, I collaborate with the best service professionals—title companies, escrow officers, home warranty providers, and more—to ensure every detail is handled smoothly.
          </p>
          <hr />
          <p className="my-8 italic">Fill out the contact form below, lets get started today.</p>
        </div>
      </div>

      {/* Contact Section */}
      <Contact />
    </div>
  );
}
