"use client";

import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";

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

interface ListPriceVsExpiredProps {
  chartTitle: string;
  chartDescription: string;
  data: {
    category: string; // e.g., "Average", "Median", "Min", "Max"
    closedPrice: number;
    expiredPrice: number;
  }[];
}

const chartConfig = {
  closedPrice: {
    label: "Closed List Price",
    color: "hsl(var(--chart-1))",
  },
  expiredPrice: {
    label: "Expired List Price",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export function ListPriceVsExpired({ chartTitle, chartDescription, data }: ListPriceVsExpiredProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{chartTitle}</CardTitle>
        <CardDescription>{chartDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
            data={data}
            margin={{ top: 10, left: 10, right: 10, bottom: 10 }}
            width={600}
            height={300}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="category"
              type="category"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(value) => `$${value.toLocaleString()}`}
              axisLine={false}
            />
            <Tooltip content={<ChartTooltipContent />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="closedPrice"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              activeDot={{ r: 8 }}
            />
            <Line
              type="monotone"
              dataKey="expiredPrice"
              stroke="#ff4325"
              strokeWidth={2}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 mx-auto font-medium leading-none">
          Tracking closed vs. expired list prices across metrics.
        </div>
      </CardFooter>
    </Card>
  );
}
