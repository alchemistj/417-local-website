import { existsSync, readdirSync, readFileSync } from "node:fs";
import { eventSchema, type EventData } from "../../src/lib/eventSchema";
import { ROOT } from "./posts";

export function readEventDir(dir: string): EventData[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json") && !name.startsWith("_"))
    .map((name) => eventSchema.parse(JSON.parse(readFileSync(`${dir}/${name}`, "utf8")) as unknown));
}

/** Events from the export. Lists drop passed events; their pages still build from this folder. */
export function readSiteEvents(): EventData[] {
  return readEventDir(`${ROOT}src/content/events`);
}
