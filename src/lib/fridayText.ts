import type { EventData } from "./eventSchema";
import { isAllDayEvent, zonedParts } from "./eventCalendar";
import {
  CLASS_TITLE_PATTERN,
  eventListTime,
  isSignificantOneOff,
  isWeeklyOrMonthlySeries,
} from "./calendarView";
import { listRowPlace } from "./eventPage";
import { eventCitySlug, eventPath } from "./eventPaths";
import { addDaysToYmd, chicagoDateParts, chicagoYmd, eventChicagoDate, eventHasClockTime, formatDayHeading, primaryCategory, sortByStart } from "./events";
import type { RecurringItem } from "./recurring";
import { absoluteUrl } from "./site";

export const FRIDAY_TEXT_PATH = "/this-friday-in-springfield/";

const ADULTS_ONLY = /\b21\s*\+|\bages\s+21\b|\bwine\b|beer tasting|bar crawl|\brave\b/i;
const FESTIVAL_OR_MARKET = /\b(?:festivals?|markets?)\b/i;
const EVENING_MINUTES = 16 * 60;

/**
 * The coming Friday in America/Chicago.
 * On Friday, that day. Saturday through Thursday, the next Friday.
 */
export function comingFridayYmd(now: Date): string {
  const { weekday } = chicagoDateParts(now);
  const daysUntilFriday = (5 - weekday + 7) % 7;
  return addDaysToYmd(chicagoYmd(now), daysUntilFriday);
}

/** "Nov 20" from a `YYYY-MM-DD` calendar date. */
export function shortMonthDay(ymdDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymdDate);
  if (!match) return ymdDate;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  const month = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(date);
  return `${month} ${date.getUTCDate()}`;
}

/** Titles and descriptions that are 21+ nights, not a family Friday. */
export function isAdultsOnlyEvent(event: EventData): boolean {
  return ADULTS_ONLY.test(`${event.title}\n${event.description ?? ""}`);
}

/** allevents.in, happeningnext.com, and eventbrite listing pages. */
export function isListingSiteUrl(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (host === "allevents.in" || host.endsWith(".allevents.in")) return true;
  if (host === "happeningnext.com" || host.endsWith(".happeningnext.com")) return true;
  return host.split(".").includes("eventbrite");
}

function sourceUrls(event: EventData): string[] {
  const website = event.organizer && typeof event.organizer.website === "string" ? event.organizer.website : "";
  return [event.registration_url ?? "", ...event.source_urls, website].map((url) => url.trim()).filter(Boolean);
}

/** A registration link, source, or organizer site that is not a listing page. */
export function hasNonListingSource(event: EventData): boolean {
  return sourceUrls(event).some((url) => {
    try {
      new URL(url);
    } catch {
      return false;
    }
    return !isListingSiteUrl(url);
  });
}

function isFestivalOrMarket(event: EventData): boolean {
  return event.categories.includes("festivals") || FESTIVAL_OR_MARKET.test(event.title);
}

/** Minutes from midnight in America/Chicago, or null when the listing has no clock time. */
function clockMinutes(event: EventData): number | null {
  if (event.time_tbd === true || !eventHasClockTime(event)) return null;
  const time = Date.parse(event.start);
  if (Number.isNaN(time)) return null;
  const parts = zonedParts(new Date(time), "America/Chicago");
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
}

/** Start at 4 PM Central or later, or an all-day festival or market. */
export function isEveningFriendly(event: EventData): boolean {
  const minutes = clockMinutes(event);
  if (minutes !== null && minutes >= EVENING_MINUTES) return true;
  return isAllDayEvent(event) && isFestivalOrMarket(event);
}

/** A weekly or monthly series, a title that says "series", or a class-program title. */
export function isSeriesOrRecurringClass(event: EventData, peers: EventData[] = [], recurring: RecurringItem[] = []): boolean {
  if (/\bseries\b/i.test(event.title)) return true;
  if (CLASS_TITLE_PATTERN.test(event.title)) return true;
  return isWeeklyOrMonthlySeries(event, peers, recurring);
}

function categoryKey(event: EventData): string {
  return primaryCategory(event) ?? "uncategorized";
}

function isFridayCandidate(event: EventData, friday: string, peers: EventData[], recurring: RecurringItem[]): boolean {
  if (eventCitySlug(event) !== "springfield") return false;
  if (eventChicagoDate(event) !== friday) return false;
  if (!isEveningFriendly(event)) return false;
  if (isAdultsOnlyEvent(event)) return false;
  if (isSeriesOrRecurringClass(event, peers, recurring)) return false;
  return true;
}

/**
 * Official sources ahead of listing-only events, significant one-offs ahead of the rest,
 * then a different category when one is still available. At most 3. Never pads.
 */
export function pickFridayEvents(events: EventData[], recurring: RecurringItem[], now: Date): EventData[] {
  const friday = comingFridayYmd(now);
  const context = { peers: events, recurring, now };
  const ranked = sortByStart(events.filter((event) => isFridayCandidate(event, friday, events, recurring)));
  const tierOf = (event: EventData) => (hasNonListingSource(event) ? 0 : 2) + (isSignificantOneOff(event, context) ? 0 : 1);
  const picked: EventData[] = [];
  const chosen = new Set<string>();
  const used = new Set<string>();
  for (const tier of [0, 1, 2, 3]) {
    const group = ranked.filter((event) => tierOf(event) === tier);
    while (picked.length < 3) {
      const remaining = group.filter((event) => !chosen.has(event.id));
      const next = remaining.find((event) => !used.has(categoryKey(event))) ?? remaining[0];
      if (!next) break;
      picked.push(next);
      chosen.add(next.id);
      used.add(categoryKey(next));
    }
  }
  return picked;
}

function fridayLine(event: EventData, index: number): string {
  const venue = listRowPlace(event);
  const when = eventListTime(event);
  const url = absoluteUrl(eventPath(event));
  const middle = venue ? `${event.title}, ${venue}, ${when}` : `${event.title}, ${when}`;
  return `${index + 1}) ${middle}. ${url}`;
}

/** The text Josh can paste. Real events only, so a short week stays short. */
export function fridayMessage(events: EventData[], now: Date, picked = pickFridayEvents(events, [], now)): string {
  const friday = comingFridayYmd(now);
  const lines = [`This Friday in Springfield (${shortMonthDay(friday)}):`, ...picked.map(fridayLine)];
  return lines.join("\n");
}

export function fridayShortfall(count: number): string {
  if (count >= 3) return "Three real events, ready to copy and text.";
  if (count === 0) return "No events qualified for this Friday.";
  const noun = count === 1 ? "event" : "events";
  return `Only ${count} real ${noun} qualified for this Friday.`;
}

export interface FridayTextModel {
  path: string;
  title: string;
  description: string;
  h1: string;
  heading: string;
  intro: string[];
  text: string;
  events: EventData[];
  emptyMessage: string;
}

export function fridayTextPage(events: EventData[], recurring: RecurringItem[], now: Date): FridayTextModel {
  const friday = comingFridayYmd(now);
  const picked = pickFridayEvents(events, recurring, now);
  const heading = formatDayHeading(friday);
  const names = picked.map((event) => event.title).join("; ");
  return {
    path: FRIDAY_TEXT_PATH,
    title: "This Friday in Springfield | 417 Local",
    description: names
      ? `Copy-ready text for this Friday in Springfield (${shortMonthDay(friday)}): ${names}.`
      : `Copy-ready text for this Friday in Springfield (${shortMonthDay(friday)}). No events qualified.`,
    h1: "This Friday in Springfield",
    heading,
    intro: [heading, fridayShortfall(picked.length)],
    text: fridayMessage(events, now, picked),
    events: picked,
    emptyMessage: "No events qualified for this Friday.",
  };
}
