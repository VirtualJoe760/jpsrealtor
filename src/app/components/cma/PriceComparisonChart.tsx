// src/app/components/cma/PriceComparisonChart.tsx
"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useTheme } from "@/app/contexts/ThemeContext";
import type { ComparableProperty, SubjectProperty } from "@/types/cma";
import { formatChartCurrency } from "@/utils/cma/chartData";

interface PriceComparisonChartProps {
  subject: SubjectProperty;
  comparables: ComparableProperty[];
  className?: string;
}

export default function PriceComparisonChart({
  subject,
  comparables,
  className = "",
}: PriceComparisonChartProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  // Prepare data
  const data = [
    {
      name: "Subject",
      price: subject.soldPrice || subject.listPrice,
      pricePerSqFt: subject.pricePerSqFt || 0,
      isSubject: true,
    },
    ...comparables.slice(0, 9).map((comp, index) => ({
      name: `Comp ${index + 1}`,
      price: comp.soldPrice || comp.listPrice,
      pricePerSqFt: comp.pricePerSqFt || 0,
      status: comp.standardStatus,
      similarity: comp.similarity,
    })),
  ];

  const chartColors = {
    subject: isLight ? "#3B82F6" : "#60A5FA", // Blue
    sold: isLight ? "#10B981" : "#34D399", // Green
    active: isLight ? "#F59E0B" : "#FBBF24", // Orange
    grid: isLight ? "#E5E7EB" : "#374151",
    text: isLight ? "#374151" : "#D1D5DB",
    tooltip: isLight ? "#FFFFFF" : "#1F2937",
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;

    return (
      <div
        className={`rounded-lg border p-3 shadow-lg ${
          isLight
            ? "bg-white border-gray-300"
            : "bg-gray-900 border-gray-700"
        }`}
      >
        <p className={`font-semibold mb-2 ${isLight ? "text-gray-900" : "text-white"}`}>
          {data.name}
        </p>
        <div className="space-y-1 text-sm">
          <p className={isLight ? "text-gray-700" : "text-gray-300"}>
            Price: <span className="font-semibold">{formatChartCurrency(data.price)}</span>
          </p>
          {data.pricePerSqFt > 0 && (
            <p className={isLight ? "text-gray-700" : "text-gray-300"}>
              $/SqFt: <span className="font-semibold">${data.pricePerSqFt}</span>
            </p>
          )}
          {data.status && (
            <p className={isLight ? "text-gray-700" : "text-gray-300"}>
              Status: <span className="font-semibold">{data.status}</span>
            </p>
          )}
          {data.similarity !== undefined && (
            <p className={isLight ? "text-gray-700" : "text-gray-300"}>
              Match: <span className="font-semibold">{data.similarity}%</span>
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={100}
            tick={{ fill: chartColors.text, fontSize: 12 }}
          />
          <YAxis
            tickFormatter={(value) => formatChartCurrency(value)}
            tick={{ fill: chartColors.text, fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: "20px" }}
            iconType="circle"
          />
          <Bar
            dataKey="price"
            name="Price"
            radius={[8, 8, 0, 0]}
            fill={chartColors.subject}
            shape={(props: any) => {
              const { x, y, width, height, payload } = props;
              let fill = chartColors.active;

              if (payload.isSubject) {
                fill = chartColors.subject;
              } else if (payload.status === "Closed") {
                fill = chartColors.sold;
              }

              return (
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill={fill}
                  rx={8}
                  ry={8}
                />
              );
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
