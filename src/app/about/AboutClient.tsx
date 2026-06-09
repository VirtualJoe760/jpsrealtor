"use client";

// About page entry. Fetches the domain owner's public profile, normalizes it,
// and picks the layout: a cinematic scroll page on desktop/laptop, or a
// full-screen swipeable panel deck on mobile.

import { useEffect, useState } from "react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";
import { fetchAgentPublic } from "@/app/hooks/useAgentProfile";
import { getAboutData } from "./aboutShared";
import AboutDesktop from "./AboutDesktop";
import AboutMobile from "./AboutMobile";

export default function AboutClient() {
  const { currentTheme } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  // Optional ?view=mobile|desktop override (handy for previewing the other layout).
  const [forced, setForced] = useState<"mobile" | "desktop" | null>(null);

  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("view");
    if (v === "mobile" || v === "desktop") setForced(v);
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const host = typeof window !== "undefined" ? window.location.hostname : "";
    let sub = "";
    if (host.includes("chatrealty")) {
      const parts = host.split("chatrealty")[0]?.replace(/\.$/, "");
      const s = parts?.split(".").filter((x) => x && x !== "www").pop();
      if (s) sub = `?subdomain=${s}`;
    } else if (host.endsWith(".localhost")) {
      const s = host.split(".localhost")[0];
      if (s && s !== "www") sub = `?subdomain=${s}`;
    }
    fetchAgentPublic(sub)
      .then((data: any) => setAgent(data?.profile || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sub = isLight ? "text-gray-600" : "text-gray-300";
  const text = isLight ? "text-gray-900" : "text-white";

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className={`animate-pulse ${sub}`}>Loading…</div>
      </div>
    );
  }
  if (!agent) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
        <h1 className={`text-2xl font-bold ${text}`}>About</h1>
        <p className={`mt-2 ${sub}`}>This site isn&apos;t set up yet.</p>
      </div>
    );
  }

  const d = getAboutData(agent, isLight);
  const mobile = forced ? forced === "mobile" : isMobile;
  return mobile ? <AboutMobile d={d} /> : <AboutDesktop d={d} />;
}
