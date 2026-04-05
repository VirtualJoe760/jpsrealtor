"use client";

import { CMAComp, CMASubject } from "@/lib/cma/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import { useTheme } from "@/app/contexts/ThemeContext";

export default function SqftComparisonBar({
  subject,
  comps,
}: {
  subject: CMASubject;
  comps: CMAComp[];
}) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const data = [
    { name: "Subject", sqft: subject.livingArea, fill: isLight ? "#3b82f6" : "#60a5fa" },
    ...comps.map(c => ({
      name: c.address.split(",")[0].replace(/^\d+\s+/, "").substring(0, 15),
      sqft: c.livingArea,
      fill: isLight ? "#10b981" : "#34d399",
    })),
  ];

  if (data.length < 2) return null;

  return (
    <div className="w-full h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 40 }} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#e5e7eb" : "#333"} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: isLight ? "#6b7280" : "#9ca3af" }}
            tickFormatter={(v) => v.toLocaleString()}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 10, fill: isLight ? "#6b7280" : "#9ca3af" }}
            width={100}
          />
          <Tooltip
            contentStyle={{
              background: isLight ? "#fff" : "#1a1a2e",
              border: `1px solid ${isLight ? "#e5e7eb" : "#333"}`,
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: number) => `${value.toLocaleString()} sqft`}
          />
          <ReferenceLine x={subject.livingArea} stroke={isLight ? "#3b82f6" : "#60a5fa"} strokeDasharray="3 3" />
          <Bar dataKey="sqft" radius={[0, 4, 4, 0]} name="Living Area (sqft)">
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

