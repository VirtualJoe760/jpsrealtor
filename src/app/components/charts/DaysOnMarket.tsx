"use client";

import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

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

interface DaysOnMarketProps {
  chartTitle: string;
  chartDescription: string;
  chartFooter: string;
  data: {
    category: string;
    value: number;
  }[];
}

const chartConfig = {
  label: {
    color: "hsl(var(--background))",
  },
} satisfies ChartConfig;

export function DaysOnMarket({ chartTitle, chartDescription, chartFooter, data }: DaysOnMarketProps) {
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
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="category"
              type="category"
              tickLine={false}
              axisLine={false}
            />
            <XAxis type="number" />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Bar
              dataKey="value"
              fill="#ff4325"
              radius={[4, 4, 0, 0]}
            >
              <LabelList
                dataKey="value"
                position="right"
                offset={8}
                className="fill-foreground"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-3 mx-auto font-medium leading-none">
          {chartFooter}
        </div>
      </CardFooter>
    </Card>
  );
}
