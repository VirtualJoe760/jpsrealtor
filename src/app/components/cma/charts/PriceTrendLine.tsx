"use client";

import { CMAComp } from "@/lib/cma/types";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useTheme } from "@/app/contexts/ThemeContext";

export default function PriceTrendLine({ closedComps }: { closedComps: CMAComp[] }) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const data = closedComps
    .filter(c => c.closePrice && c.date)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(c => ({
      date: new Date(c.date).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      price: c.closePrice!,
      ppsf: c.salePricePerSqft || 0,
    }));

  if (data.length < 2) return null;

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#e5e7eb" : "#333"} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: isLight ? "#6b7280" : "#9ca3af" }} />
          <YAxis
            tick={{ fontSize: 11, fill: isLight ? "#6b7280" : "#9ca3af" }}
            tickFormatter={(v) => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}K`}
          />
          <Tooltip
            contentStyle={{
              background: isLight ? "#fff" : "#1a1a2e",
              border: `1px solid ${isLight ? "#e5e7eb" : "#333"}`,
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: number) => `$${value.toLocaleString()}`}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke={isLight ? "#3b82f6" : "#60a5fa"}
            strokeWidth={2}
            dot={{ fill: isLight ? "#3b82f6" : "#60a5fa", r: 4 }}
            name="Sale Price"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
