"use client";

import { CMAComp } from "@/lib/cma/types";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useTheme } from "@/app/contexts/ThemeContext";

export default function SalePriceRatioPie({ closedComps }: { closedComps: CMAComp[] }) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const withRatio = closedComps.filter(c => c.salePriceToListRatio != null && c.salePriceToListRatio > 0);
  if (withRatio.length < 2) return null;

  const above = withRatio.filter(c => c.salePriceToListRatio! > 1.0).length;
  const atList = withRatio.filter(c => c.salePriceToListRatio! >= 0.97 && c.salePriceToListRatio! <= 1.0).length;
  const below = withRatio.filter(c => c.salePriceToListRatio! < 0.97).length;

  const data = [
    { name: "Above List", value: above },
    { name: "At List (97-100%)", value: atList },
    { name: "Below List", value: below },
  ].filter(d => d.value > 0);

  const COLORS = isLight
    ? ["#10b981", "#3b82f6", "#ef4444"]
    : ["#34d399", "#60a5fa", "#f87171"];

  return (
    <div className="w-full h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            innerRadius={40}
            dataKey="value"
            label={({ name, value }) => `${name}: ${value}`}
            labelLine={false}
          >
            {data.map((_, idx) => (
              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: isLight ? "#fff" : "#1a1a2e",
              border: `1px solid ${isLight ? "#e5e7eb" : "#333"}`,
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
