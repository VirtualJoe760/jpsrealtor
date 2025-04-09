"use client";

import VariableHero from "@/app/components/VariableHero";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function MarketingDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("marketing_authenticated");
    if (isAuthenticated !== "true") {
      router.push("/marketing");
    }
  }, [router]);

  return (
    <>
      <VariableHero
        backgroundImage={`/misc/back-yard_00001_.png`}
        heroContext="Marketing"
        description=" "
      />
      <main className="min-h-screen mx-12 px-8 py-12">
        <h1 className="text-3xl font-bold text-center mb-8">
          Choose your marketing
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <div
            onClick={() => router.push("/marketing/direct-mail")}
            className="w-40 h-40 flex items-center justify-center text-white text-center text-lg font-semibold cursor-pointer bg-slate-800 hover:bg-slate-400 rounded-2xl shadow-lg transition-colors"
          >
            Direct Mail
          </div>

          {/* Additional tiles go here */}
        </div>
      </main>
    </>
  );
}
