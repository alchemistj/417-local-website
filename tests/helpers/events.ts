import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dedupeSameDayEvents } from "../../src/lib/calendarView";
import { filterJunk, withDisplayTitle } from "../../src/lib/eventQuality";
import { eventSchema, type EventData } from "../../src/lib/eventSchema";
import { ROOT } from "./posts";

export function readEventDir(dir: string): EventData[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json") && !name.startsWith("_"))
    .map((name) => eventSchema.parse(JSON.parse(readFileSync(`${dir}/${name}`, "utf8")) as unknown));
}

/** Events from the export, with same-day title and place duplicates collapsed the way the loader does. */
export function readSiteEvents(): EventData[] {
  return filterJunk(dedupeSameDayEvents(readEventDir(`${ROOT}src/content/events`).map(withDisplayTitle)));
}

/** Every export event with display titles and same-day duplicates collapsed, junk included (hidden events keep a noindex page). */
export function readAllSiteEvents(): EventData[] {
  return dedupeSameDayEvents(readEventDir(`${ROOT}src/content/events`).map(withDisplayTitle));
}
