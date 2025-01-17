// src/app/book-appointment/page.tsx
import VariableHero from "@/components/VariableHero";
import TidyCalEmbed from "@/components/TidyCalEmbed";

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
