"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * shadcn-style Calendar — wraps react-day-picker v10.
 * Use `mode="single"` for a single date or `mode="range"` for a date range.
 *
 * Theme: works with the existing wizard's dark/light themes via Tailwind classes.
 */
export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-2",
        month: "flex flex-col gap-4",
        month_caption: "flex justify-center pt-1 relative items-center w-full",
        caption_label: "text-sm font-medium",
        nav: "flex items-center gap-1",
        button_previous: cn(
          "absolute left-1 top-1 size-7 inline-flex items-center justify-center rounded-md border border-input bg-transparent p-0 opacity-70 hover:opacity-100"
        ),
        button_next: cn(
          "absolute right-1 top-1 size-7 inline-flex items-center justify-center rounded-md border border-input bg-transparent p-0 opacity-70 hover:opacity-100"
        ),
        month_grid: "w-full border-collapse space-x-1",
        weekdays: "flex",
        weekday: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        week: "flex w-full mt-2",
        day: "relative p-0 text-center text-sm size-9",
        day_button: cn(
          "size-9 p-0 font-normal inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground"
        ),
        selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        range_start: "rounded-l-md !bg-primary !text-primary-foreground [&>button]:!bg-primary [&>button]:!text-primary-foreground",
        range_end:   "rounded-r-md !bg-primary !text-primary-foreground [&>button]:!bg-primary [&>button]:!text-primary-foreground",
        range_middle: "!rounded-none !bg-primary/25 [&>button]:!bg-transparent [&>button]:!text-foreground [&>button]:!rounded-none [&>button:hover]:!bg-primary/40",
        today: "bg-accent/50 text-accent-foreground",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...rest }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" {...rest} />
          ) : (
            <ChevronRight className="size-4" {...rest} />
          ),
      }}
      {...props}
    />
  );
}
