"use client";

import { TrendingUp } from "lucide-react";
import { Pie, PieChart, LabelList } from "recharts";

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

interface SalesVsExpiredProps {
  chartTitle: string;
  chartDescription: string;
  data: {
    category: string; // e.g., "Closed" or "Expired"
    value: number;
    fill: string; // Specific color for each slice
  }[];
}

// Create dynamic config for the chart
const createChartConfig = (data: SalesVsExpiredProps["data"]): ChartConfig =>
  data.reduce((acc, item) => {
    acc[item.category.toLowerCase()] = {
      label: item.category,
      color: item.fill,
    };
    return acc;
  }, {} as ChartConfig);

export function SalesVsExpired({ chartTitle, chartDescription, data }: SalesVsExpiredProps) {
  const chartConfig = createChartConfig(data);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{chartTitle}</CardTitle>
        <CardDescription>{chartDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px] [&_.recharts-text]:fill-background"
        >
          <PieChart>
            <ChartTooltip
              content={<ChartTooltipContent nameKey="category" />}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="category"
              outerRadius={80}
              innerRadius={50}
              label
            >
              <LabelList dataKey="category" position="outside" />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center mx-auto gap-2 font-medium leading-none">
          Closed Vs. Expired Listings <TrendingUp className="h-4 w-4" />
        </div>
      </CardFooter>
    </Card>
  );
}
