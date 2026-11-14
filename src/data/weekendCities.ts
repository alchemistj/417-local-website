import type { EventData } from "../lib/eventSchema";
import { eventCityName, eventCitySlug } from "../lib/eventPaths";

/**
 * One sentence per weekend city. Kept here so Joplin never inherits Springfield's wording.
 * Plain on purpose: the sentence does not promise theaters, markets, or any other kind of event.
 * Each line says the guide is updated weekly.
 */
export const WEEKEND_INTRO: Record<string, string> = {
  springfield: "Making weekend plans in Springfield, MO? Here is what is on from Friday through Sunday, updated weekly.",
  branson: "Here is what is on in Branson, MO from Friday through Sunday, updated weekly.",
  joplin: "Here is what is on in Joplin, MO from Friday through Sunday, updated weekly.",
  lebanon: "Here is what is on in Lebanon, MO from Friday through Sunday, updated weekly.",
  bolivar: "Here is what is on in Bolivar, MO from Friday through Sunday, updated weekly.",
};

/**
 * Approximate highway time between city centers, rounded. Keys are the two slugs in alphabetical order.
 * Used only as "about N" on Worth the drive. Not a turn-by-turn route.
 */
const DRIVE_LABEL: Record<string, string> = {
  "bolivar|branson": "about 1 hr 15 min",
  "bolivar|joplin": "about 1 hr 30 min",
  "bolivar|lebanon": "about 50 min",
  "bolivar|springfield": "about 35 min",
  "branson|joplin": "about 1 hr 45 min",
  "branson|lebanon": "about 1 hr 45 min",
  "branson|springfield": "about 50 min",
  "joplin|lebanon": "about 2 hr",
  "joplin|springfield": "about 1 hr 15 min",
  "lebanon|springfield": "about 55 min",
};

export function driveBetween(fromSlug: string, toSlug: string): string {
  if (!fromSlug || fromSlug === toSlug) return "";
  return DRIVE_LABEL[[fromSlug, toSlug].sort().join("|")] ?? "";
}

/**
 * "in Joplin" or "in Joplin · about 1 hr 15 min" on another city's page.
 * The page's own city is blank, so a hub row does not read "Springfield · in Springfield".
 */
export function cityRowLabel(event: EventData, fromSlug = ""): string {
  const city = eventCitySlug(event);
  if (fromSlug && fromSlug === city) return "";
  const drive = fromSlug && fromSlug !== city ? driveBetween(fromSlug, city) : "";
  const name = `in ${eventCityName(event)}`;
  return drive ? `${name} · ${drive}` : name;
}

/** Copy used for a list row. city_slug stays so the event URL does not change. */
export function withCityLabel(event: EventData, fromSlug = ""): EventData {
  return { ...event, city_slug: eventCitySlug(event), city: cityRowLabel(event, fromSlug) };
}
