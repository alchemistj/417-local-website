import { existsSync, readdirSync, readFileSync } from "node:fs";
import { eventSchema, type EventData } from "../../src/lib/eventSchema";
import { mergeEvents } from "../../src/lib/eventPaths";
import { ROOT } from "./posts";

export function readEventDir(dir: string): EventData[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json") && !name.startsWith("_"))
    .map((name) => eventSchema.parse(JSON.parse(readFileSync(`${dir}/${name}`, "utf8")) as unknown));
}

/** Export events plus the past-events archive. The export wins on a shared id. */
export function readSiteEvents(): EventData[] {
  return mergeEvents(readEventDir(`${ROOT}src/content/past-events`), readEventDir(`${ROOT}src/content/events`));
}
