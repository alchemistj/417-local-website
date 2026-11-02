import { getCollection } from "astro:content";
import type { EventData } from "./eventSchema";
import { isUpcoming, sortByStart } from "./events";

/** Upcoming events at build time, soonest first. Rebuild the site daily to drop past events. */
export async function getUpcomingEvents(now: Date = new Date()): Promise<EventData[]> {
  const all = (await getCollection("events")).map((e) => e.data as EventData);
  return sortByStart(all.filter((e) => isUpcoming(e, now)));
}
