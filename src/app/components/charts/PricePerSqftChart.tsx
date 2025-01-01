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

interface PricePerSqftProps {
  chartTitle: string;
  chartDescription: string;
  data: {
    category: string; // e.g., "Average", "Median", "Min", "Max"
    listPricePerSqft: number;
    salePricePerSqft: number;
  }[];
}

const chartConfig = {
  listPricePerSqft: {
    label: "List Price per Sqft",
    color: "hsl(var(--chart-1))",
  },
  salePricePerSqft: {
    label: "Sale Price per Sqft",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export function PricePerSqftChart({
  chartTitle,
  chartDescription,
  data,
}: PricePerSqftProps) {
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
            height={400}
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
              dataKey="listPricePerSqft"
              fill="hsl(var(--chart-1))"
              radius={[0, 0, 4, 4]}
            />
            <Bar
              dataKey="salePricePerSqft"
              fill="hsl(var(--chart-2))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex gap-2 mx-auto font-medium leading-none">
          Insights into price per square foot metrics.
        </div>
      </CardFooter>
    </Card>
  );
}
