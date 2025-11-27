// src/app/book-appointment/page.tsx
"use client";

import VariableHero from "@/components/VariableHero";
import TidyCalEmbed from "@/app/components/TidyCalEmbed";
import { useTheme } from "@/app/contexts/ThemeContext";
import SpaticalBackground from "@/app/components/backgrounds/SpaticalBackground";

export default function BookAppointmentPage() {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  // TidyCal path - using dark theme version
  const tidyCalPath = "josephsardella/free-real-estate-consultation";

  return (
    <div
      className="min-h-screen relative"
      style={isLight ? {
        background: '#e5e7eb',
      } : undefined}
    >
      {!isLight && <SpaticalBackground showGradient={true}><div className="absolute inset-0" /></SpaticalBackground>}

      {/* Subtle eXp logo pattern overlay for light mode - angled with floating animation */}
      {isLight && (
        <>
          <style jsx>{`
            @keyframes floatLogos {
              0%, 100% {
                transform: rotate(-15deg) scale(1.5) translate(0, 0);
              }
              25% {
                transform: rotate(-15deg) scale(1.5) translate(10px, -10px);
              }
              50% {
                transform: rotate(-15deg) scale(1.5) translate(20px, 0);
              }
              75% {
                transform: rotate(-15deg) scale(1.5) translate(10px, 10px);
              }
            }
          `}</style>
          <div
            className="absolute inset-0 overflow-hidden opacity-[0.05] pointer-events-none"
            style={{
              animation: 'floatLogos 30s ease-in-out infinite',
              transformOrigin: 'center center',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, 50px)',
                gridTemplateRows: 'repeat(auto-fill, 50px)',
                gap: '8px',
                width: '200%',
                height: '200%',
                marginLeft: '-50%',
                marginTop: '-50%',
              }}
            >
              {Array.from({ length: 800 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: '50px',
                    height: '50px',
                    backgroundImage: `url("/images/brand/exp-Realty-Logo-black.png")`,
                    backgroundSize: '30px 30px',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                  }}
                />
              ))}
            </div>
          </div>
        </>
      )}

      <div className="relative z-10">
        <VariableHero
          backgroundImage="/misc/real-estate/front-yard/front-yard_00017_.png"
          heroContext="Book Your Free Real Estate Consultation"
          description="Take the first step toward achieving your real estate goals."
        />

        {/* Content Section */}
        <div className="flex-grow flex flex-col items-center justify-start px-0 md:px-12">
          {/* Header bridge - matches TidyCal widget background */}
          <div
            className="w-full max-w-none md:max-w-4xl text-center pt-12 pb-8"
            style={{ backgroundColor: '#222529' }}
          >
            <h2 className="text-3xl md:text-5xl font-bold text-white">
              Book an Appointment
            </h2>
          </div>

          {/* TidyCal Container */}
          <div className="w-full max-w-none md:max-w-4xl">
            <TidyCalEmbed path={tidyCalPath} />
          </div>

          {/* Additional info below the calendar */}
          <div className="max-w-2xl w-full text-center mt-12 px-4 text-gray-300">
            <p className="text-sm">
              Can't find a time that works? Call me directly at{" "}
              <a
                href="tel:760-833-6334"
                className="font-semibold transition-colors text-emerald-400 hover:text-emerald-300"
              >
                (760) 833-6334
              </a>
              {" "}or email{" "}
              <a
                href="mailto:josephsardella@gmail.com"
                className="font-semibold transition-colors text-emerald-400 hover:text-emerald-300"
              >
                josephsardella@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
