import { getCollection } from "astro:content";
import type { EventData } from "./eventSchema";
import { isEventContentId, isListedEvent, isUpcoming, sortByStart } from "./events";
import { mergeEvents } from "./eventPaths";

function asEvents(entries: { id: string; data: EventData }[]): EventData[] {
  return entries.filter((entry) => isEventContentId(entry.id)).map((entry) => entry.data);
}

/** Events from the export plus the past-events archive. The export wins when an id is in both. */
export async function getSiteEvents(): Promise<EventData[]> {
  const current = await getCollection("events");
  const archived = await getCollection("pastEvents");
  return mergeEvents(
    asEvents(archived.map((entry) => ({ id: entry.id, data: entry.data as EventData }))),
    asEvents(current.map((entry) => ({ id: entry.id, data: entry.data as EventData }))),
  );
}

/** Upcoming events at build time, soonest first. */
export async function getUpcomingEvents(now: Date = new Date()): Promise<EventData[]> {
  return sortByStart((await getSiteEvents()).filter((event) => isUpcoming(event, now)));
}

/** Events that still belong on hubs, category pages and the sitemap (fewer than 30 days past). */
export async function getListedEvents(now: Date = new Date()): Promise<EventData[]> {
  return sortByStart((await getSiteEvents()).filter((event) => isListedEvent(event, now)));
}
