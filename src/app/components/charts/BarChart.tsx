"use client";

import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

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

// Import the data file
import southPalmSpringsData from "@/app/constants/comps/2024/palm-springs/q1/south-palm-springs.json";

// Prepare chart data
const chartData = [
  { metric: "Average List Price", closed: southPalmSpringsData.closed_data_metrics.list_price.average, expired: southPalmSpringsData.expired_data_metrics.list_price.average },
  { metric: "Median List Price", closed: southPalmSpringsData.closed_data_metrics.list_price.median, expired: southPalmSpringsData.expired_data_metrics.list_price.median },
  { metric: "Days on Market", closed: southPalmSpringsData.closed_data_metrics.days_on_market.average, expired: southPalmSpringsData.expired_data_metrics.days_on_market.average },
  { metric: "Price/SqFt", closed: southPalmSpringsData.closed_data_metrics.sale_price_per_sqft.average, expired: southPalmSpringsData.expired_data_metrics.list_price_per_sqft.average },
];

const chartConfig = {
  closed: {
    label: "Closed",
    color: "hsl(var(--chart-1))",
  },
  expired: {
    label: "Expired",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export function SouthPalmSpringsBarChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparison: Closed vs Expired Metrics</CardTitle>
        <CardDescription>South Palm Springs - Q1 2024</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="metric"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dashed" />}
            />
            <Bar dataKey="closed" fill="var(--color-closed)" radius={4} />
            <Bar dataKey="expired" fill="var(--color-expired)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          Trends show differences between closed and expired metrics{" "}
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Data from Q1 2024 for South Palm Springs.
        </div>
      </CardFooter>
    </Card>
  );
}
