import { unstable_cache } from "next/cache";
import { fetchListingOpenHouses } from "@/app/utils/spark/openHouses";
import OpenHouse from "@/models/openHouses";
import UnifiedListing from "@/models/unified-listing";

export interface ListingOpenHouse {
  date: string;
  startTime: string;
  endTime: string;
}

export function listingCalendarDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  return ["year", "month", "day"].map((type) => parts.find((part) => part.type === type)?.value).join("-");
}

export function openHouseChoice(event: ListingOpenHouse) {
  return JSON.stringify([event.date, event.startTime]);
}

interface SparkOpenHouse {
  Date?: string;
  StartTime?: string;
  EndTime?: string;
}

interface ListingScheduleSource {
  listingId?: string;
  OpenHouses?: SparkOpenHouse[];
}

function normalizeDate(value?: string) {
  const us = value?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const date = us
    ? [us[3], us[1].padStart(2, "0"), us[2].padStart(2, "0")].join("-")
    : value?.slice(0, 10);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  const parsed = new Date(date);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : undefined;
}

function sparkRows(events: SparkOpenHouse[]) {
  return events.map((event) => ({ date: event.Date, startTime: event.StartTime, endTime: event.EndTime }));
}

const readSparkSchedule = unstable_cache(
  async (listingKey: string) => sparkRows(await fetchListingOpenHouses(listingKey)),
  ["listing-post-spark-open-houses"],
  { revalidate: 300 },
);

export async function loadListingOpenHouses(listingKey: string, preloaded?: ListingScheduleSource) {
  const listing = preloaded ?? await UnifiedListing.findOne({ listingKey })
    .select("listingId OpenHouses").maxTimeMS(2000).lean();
  if (!listing) return [];

  const rows = listing.listingId
    ? await OpenHouse.find({ listingId: listing.listingId }).select("date startTime endTime")
        .sort({ date: 1, startTime: 1, endTime: 1 }).maxTimeMS(2000).lean()
    : [];
  const source = rows.length ? rows : sparkRows(listing.OpenHouses ?? []);
  const events = normalizeEvents(source);
  if (upcomingOpenHouses(events).length) return events;

  try {
    return normalizeEvents([...source, ...await readSparkSchedule(listingKey)]);
  } catch (error) {
    console.error("[listing-post] Spark open house schedule unavailable:", error);
    return events;
  }
}

function normalizeEvents(rows: { date?: string; startTime?: string; endTime?: string }[]) {
  const events = new Map<string, ListingOpenHouse>();
  for (const row of rows) {
    const date = normalizeDate(row.date);
    if (!date) continue;
    const event = { date, startTime: row.startTime || "", endTime: row.endTime || "" };
    events.set(openHouseChoice(event), event);
  }
  return [...events.values()].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
}

export function upcomingOpenHouses(events: ListingOpenHouse[]) {
  const today = listingCalendarDate();
  return events.filter((event) => event.date >= today);
}

export async function findUpcomingOpenHouse(listingKey: string, choice: unknown) {
  const events = upcomingOpenHouses(await loadListingOpenHouses(listingKey));
  return typeof choice === "string"
    ? events.find((event) => openHouseChoice(event) === choice)
    : events[0];
}
