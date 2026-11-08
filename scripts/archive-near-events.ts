/**
 * Copies an event into src/content/past-events when its Chicago date is within 2 days.
 * The copy stays after a later export drops the event, so the page can remain up.
 */
import { copyFileSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { eventSchema } from "../src/lib/eventSchema";
import { shouldArchiveEvent } from "../src/lib/events";

const sourceDir = fileURLToPath(new URL("../src/content/events/", import.meta.url));
const targetDir = fileURLToPath(new URL("../src/content/past-events/", import.meta.url));
mkdirSync(targetDir, { recursive: true });

const now = new Date();
let copied = 0;
for (const name of readdirSync(sourceDir)) {
  if (!name.endsWith(".json") || name.startsWith("_")) continue;
  const parsed = eventSchema.safeParse(JSON.parse(readFileSync(`${sourceDir}/${name}`, "utf8")) as unknown);
  if (!parsed.success || !shouldArchiveEvent(parsed.data, now)) continue;
  copyFileSync(`${sourceDir}/${name}`, `${targetDir}/${name}`);
  copied += 1;
}
console.log(`Archived ${copied} event(s) within 2 days of ${now.toISOString().slice(0, 10)}.`);
