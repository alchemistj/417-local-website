import { getCollection } from "astro:content";
import type { EventData } from "./eventSchema";
import { upcomingFromEntries } from "./events";

/** Upcoming events at build time, soonest first. Rebuild the site daily to drop past events. */
export async function getUpcomingEvents(now: Date = new Date()): Promise<EventData[]> {
  const entries = await getCollection("events");
  return upcomingFromEntries(
    entries.map((entry) => ({ id: entry.id, data: entry.data as EventData })),
    now,
  );
}
