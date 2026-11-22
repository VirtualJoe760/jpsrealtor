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

interface ListingScheduleSource {
  listingId?: string;
  OpenHouses?: { Date?: string; StartTime?: string; EndTime?: string }[];
}

export async function loadListingOpenHouses(listingKey: string, preloaded?: ListingScheduleSource) {
  const listing = preloaded ?? await UnifiedListing.findOne({ listingKey })
    .select("listingId OpenHouses").maxTimeMS(2000).lean();
  if (!listing) return [];

  const rows = listing.listingId
    ? await OpenHouse.find({ listingId: listing.listingId }).select("date startTime endTime")
        .sort({ date: 1, startTime: 1, endTime: 1 }).maxTimeMS(2000).lean()
    : [];
  const source = rows.length ? rows : (listing.OpenHouses ?? []).map((event) => ({
    date: event.Date, startTime: event.StartTime, endTime: event.EndTime,
  }));
  const events = new Map<string, ListingOpenHouse>();
  for (const row of source) {
    const date = row.date?.slice(0, 10);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
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
