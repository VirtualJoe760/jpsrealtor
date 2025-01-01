"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface HighVsLowSalePriceProps {
  chartTitle: string;
  chartDescription: string;
  data: {
    category: string; // e.g., "High Sale Price", "Low Sale Price"
    value: number;
  }[];
}

const chartConfig = {
  value: {
    label: "Sale Price",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function HighVsLowSalePriceChart({
  chartTitle,
  chartDescription,
  data,
}: HighVsLowSalePriceProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{chartTitle}</CardTitle>
        <CardDescription>{chartDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, left: 10, right: 10, bottom: 10 }}
            width={600}
            height={300}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              type="number"
              tickFormatter={(value) => `$${value.toLocaleString()}`}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
            />
            <YAxis
              dataKey="category"
              type="category"
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<ChartTooltipContent />} />
            <Legend />
            <Bar
              dataKey="value"
              fill="hsl(var(--chart-1))"
              radius={[0, 0, 4, 4]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex gap-2 mx-auto font-medium leading-none">
          Highlights of the highest and lowest sale prices.
        </div>
      </CardFooter>
    </Card>
  );
}
