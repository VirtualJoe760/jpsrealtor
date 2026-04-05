"use client";

import { CMAComp, CMASubject } from "@/lib/cma/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useTheme } from "@/app/contexts/ThemeContext";

export default function PricePerSqftBar({
  subject,
  closedComps,
}: {
  subject: CMASubject;
  closedComps: CMAComp[];
}) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const data = closedComps
    .filter(c => c.listPricePerSqft > 0 && (c.salePricePerSqft || 0) > 0)
    .map(c => ({
      name: c.address.split(",")[0].replace(/^\d+\s+/, "").substring(0, 15),
      "List $/SqFt": c.listPricePerSqft,
      "Sale $/SqFt": c.salePricePerSqft || 0,
    }));

  // Add subject
  data.unshift({
    name: "Subject",
    "List $/SqFt": subject.pricePerSqft,
    "Sale $/SqFt": 0,
  });

  if (data.length < 2) return null;

  return (
    <div className="w-full h-[300px]">
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
          <YAxis
            tick={{ fontSize: 11, fill: isLight ? "#6b7280" : "#9ca3af" }}
            tickFormatter={(v) => `$${v}`}
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
          <Legend wrapperStyle={{ fontSize: "11px" }} />
          <Bar dataKey="List $/SqFt" fill={isLight ? "#3b82f6" : "#60a5fa"} radius={[4, 4, 0, 0]} />
          <Bar dataKey="Sale $/SqFt" fill={isLight ? "#10b981" : "#34d399"} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
