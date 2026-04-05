"use client";

import { CMAComp } from "@/lib/cma/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useTheme } from "@/app/contexts/ThemeContext";

export default function DaysOnMarketBar({ comps }: { comps: CMAComp[] }) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const data = comps
    .filter(c => c.daysOnMarket >= 0)
    .map(c => ({
      name: c.address.split(",")[0].replace(/^\d+\s+/, "").substring(0, 15),
      days: c.daysOnMarket,
    }));

  if (data.length < 2) return null;

  return (
    <div className="w-full h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#e5e7eb" : "#333"} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: isLight ? "#6b7280" : "#9ca3af" }}
            angle={-35}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 11, fill: isLight ? "#6b7280" : "#9ca3af" }} />
          <Tooltip
            contentStyle={{
              background: isLight ? "#fff" : "#1a1a2e",
              border: `1px solid ${isLight ? "#e5e7eb" : "#333"}`,
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: number) => `${value} days`}
          />
          <Bar dataKey="days" fill={isLight ? "#8b5cf6" : "#a78bfa"} radius={[4, 4, 0, 0]} name="Days on Market" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
