"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/app/contexts/ThemeContext";

interface MarketStat {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  format?: "currency" | "number" | "percent";
}

function AnimatedCounter({ stat, visible }: { stat: MarketStat; visible: boolean }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const duration = 1500;
    const start = performance.now();
    const target = stat.value;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [visible, stat.value]);

  let formatted: string;
  if (stat.format === "currency") {
    if (display >= 1000000) formatted = `${(display / 1000000).toFixed(display % 100000 === 0 ? 1 : 2)}M`;
    else if (display >= 1000) formatted = `${(display / 1000).toFixed(0)}K`;
    else formatted = display.toLocaleString();
  } else {
    formatted = display.toLocaleString();
  }

  return (
    <span>
      {stat.prefix || ""}{formatted}{stat.suffix || ""}
    </span>
  );
}

export default function MarketSnapshot({ cityId, cityName }: { cityId: string; cityName: string }) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const [stats, setStats] = useState<MarketStat[]>([]);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/cities/${cityId}/stats`)
      .then(r => r.ok ? r.json() : null)
      .then(raw => {
        if (!raw) return;
        // API may nest under "stats" or return flat
        const data = raw.stats || raw;
        const results: MarketStat[] = [];
        if (data.medianPrice) results.push({ label: "Median Price", value: data.medianPrice, prefix: "$", format: "currency" });
        if (data.listingCount) results.push({ label: "Active Listings", value: data.listingCount, format: "number" });
        if (data.avgPrice) results.push({ label: "Average Price", value: data.avgPrice, prefix: "$", format: "currency" });
        if (data.avgDaysOnMarket) results.push({ label: "Avg Days on Market", value: data.avgDaysOnMarket, format: "number" });
        if (data.priceRange?.max) results.push({ label: "Price Range", value: data.priceRange.max, prefix: "Up to $", format: "currency" });
        setStats(results.slice(0, 4));
      })
      .catch(() => {});
  }, [cityId]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (stats.length === 0) return null;

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
    >
      <h2 className={`text-2xl md:text-3xl font-bold text-center mb-8 ${isLight ? "text-gray-900" : "text-white"}`}>
        {cityName} Market at a Glance
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={`rounded-2xl p-5 text-center backdrop-blur-xl border transition-all duration-500 ${
              isLight
                ? "bg-white/80 border-gray-200 shadow-lg"
                : "bg-white/5 border-white/10 shadow-xl"
            }`}
            style={{ transitionDelay: `${i * 100}ms` }}
          >
            <div className={`text-3xl md:text-4xl font-extrabold mb-1 ${isLight ? "text-gray-900" : "text-white"}`}>
              <AnimatedCounter stat={stat} visible={visible} />
            </div>
            <div className={`text-xs font-medium uppercase tracking-wider ${isLight ? "text-gray-500" : "text-gray-400"}`}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
