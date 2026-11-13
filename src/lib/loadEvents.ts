import { getCollection } from "astro:content";
import { dedupeSameDayEvents } from "./calendarView";
import type { EventData } from "./eventSchema";
import { isEventContentId, isUpcoming, sortByStart } from "./events";
import { type RecurringItem } from "./recurring";

function asEvents(entries: { id: string; data: EventData }[]): EventData[] {
  return entries.filter((entry) => isEventContentId(entry.id)).map((entry) => entry.data);
}

/**
 * Events from the export. Passed events stay in the export for their own pages; lists filter them out.
 * Two files for the same title, place and day collapse to one event.
 */
export async function getSiteEvents(): Promise<EventData[]> {
  const current = await getCollection("events");
  return dedupeSameDayEvents(asEvents(current.map((entry) => ({ id: entry.id, data: entry.data as EventData }))));
}

/** Upcoming events at build time, soonest first. */
export async function getUpcomingEvents(now: Date = new Date()): Promise<EventData[]> {
  return sortByStart((await getSiteEvents()).filter((event) => isUpcoming(event, now)));
}

/** Active recurring series. An empty or missing collection builds as no series. */
export async function getRecurring(): Promise<RecurringItem[]> {
  const entries = await getCollection("recurring");
  return entries.map((entry) => entry.data as RecurringItem).filter((item) => item.active !== false);
}
