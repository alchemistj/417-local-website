import type { EventData } from "./eventSchema";
import { filterJunk, isHolidayStorePromo } from "./eventQuality";
import { classifyEvent, isTrainingCourse } from "./eventTaxonomy";
import { eventCitySlug } from "./eventPaths";
import { eventChicagoDate, eventHasClockTime, isUpcoming, placeName, startAlreadyPassed, weekendDateStrings } from "./events";

const SHOWY = /\b(festival|fest|concert|symphony|orchestra|opera|ballet|musical|show|parade|lights|tour|nutcracker|annual|tribute|live)\b/i;
const SHOW_CATEGORIES = ["festivals", "live-music", "arts-and-theater", "comedy"];

/** The venue is a street address (starts with a house number), not a named place. */
export function hasNamedVenue(event: EventData): boolean {
  const name = placeName(event.venue).trim();
  if (!name) return false;
  return !/^\d+\s/.test(name);
}

export function pickScore(event: EventData): number {
  let score = 0;
  if (eventHasClockTime(event) && event.time_tbd !== true) score += 2;
  if (hasNamedVenue(event)) score += 2;
  if (SHOWY.test(event.title) || event.categories.some((c) => SHOW_CATEGORIES.includes(c))) score += 3;
  if (classifyEvent(event).free) score += 1;
  if (isHolidayStorePromo(event)) score -= 4;
  return score;
}

/** Up to `limit` hand-free picks: this weekend's upcoming B2C events in the city, best score first. */
export function weekendPicks(events: EventData[], city: string, now: Date, limit = 3): EventData[] {
  const dates = new Set(weekendDateStrings(now));
  const pool = filterJunk(events).filter((event) => (
    eventCitySlug(event) === city
    && dates.has(eventChicagoDate(event))
    && isUpcoming(event, now)
    && !startAlreadyPassed(event, now)
    && classifyEvent(event).audience === "B2C"
    && !isTrainingCourse(event)
  ));
  const seen = new Set<string>();
  return pool
    .map((event) => ({ event, score: pickScore(event) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || Date.parse(a.event.start) - Date.parse(b.event.start) || a.event.title.localeCompare(b.event.title))
    .map((item) => item.event)
    .filter((event) => {
      const key = event.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

