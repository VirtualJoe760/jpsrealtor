"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

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

// Define the props for the component
interface PriceRangeChartProps {
  chartTitle: string;
  chartDescription: string;
  chartFooter: string;
  data: {
    range: string;
    closed: number; // Ensure closed is always a number
  }[];
}

const chartConfig = {
  closed: {
    label: "Closed",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function PriceRangeChart({
  chartTitle,
  chartDescription,
  chartFooter,
  data,
}: PriceRangeChartProps) {
  // Add fallback for undefined closed values
  const sanitizedData = data.map((item) => ({
    range: item.range,
    closed: item.closed ?? 0, // Default to 0 if closed is undefined
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{chartTitle}</CardTitle>
        <CardDescription>{chartDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart data={sanitizedData}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="range"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <ChartTooltip
              cursor={{ fill: "rgba(255, 255, 255, 0.2)" }}
              content={<ChartTooltipContent indicator="dashed" />}
            />
            <Bar dataKey="closed" fill="var(--color-closed)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 text-md mx-auto font-medium leading-none">
        Shows the distribution of closed sales by price range.
        </div>
      </CardFooter>
    </Card>
  );
}
