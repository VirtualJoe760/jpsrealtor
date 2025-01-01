"use client";

import { TrendingUp } from "lucide-react";
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

interface SaleListPriceMetricsProps {
  chartTitle: string;
  chartDescription: string;
  data: {
    category: string; // e.g., "Average", "Median", "Min", "Max"
    salePrice: number;
    listPrice: number;
  }[];
}

const chartConfig = {
  salePrice: {
    label: "Sale Price",
    color: "hsl(var(--chart-1))",
  },
  listPrice: {
    label: "List Price",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export function SaleListPriceMetrics({ chartTitle, chartDescription, data }: SaleListPriceMetricsProps) {
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
            layout="horizontal"
            margin={{ top: 10, left: 10, right: 10, bottom: 10 }}
            width={600}
            height={400}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="category"
              type="category"
              tickLine={false}
              axisLine={false}
            />
            <YAxis type="number" tickFormatter={(value) => `$${value.toLocaleString()}`} />
            <Tooltip />
            <Legend />
            <Bar dataKey="salePrice" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="listPrice" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 mx-auto font-medium leading-none">
          Comparison of sale and list price metrics.
        </div>
      </CardFooter>
    </Card>
  );
}
