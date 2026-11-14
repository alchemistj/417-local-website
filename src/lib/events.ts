import {
  BUSINESS_EVENT_CATEGORIES,
  GENERAL_EVENT_CATEGORIES,
  type EventData,
  type GeneralEventCategory,
} from "./eventSchema";

export const DEFAULT_TIMEZONE = "America/Chicago";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function isDateOnly(value: string): boolean {
  return DATE_ONLY.test(value);
}

/** True when the start value includes a clock time, not just a calendar date. */
export function eventHasClockTime(event: EventData): boolean {
  return !isDateOnly(event.start);
}

function endMs(event: EventData): number {
  const ref = event.end || event.start;
  const t = Date.parse(ref);
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return DATE_ONLY.test(ref) ? t + 24 * 60 * 60 * 1000 : t;
}

export function isUpcoming(event: EventData, now: Date): boolean {
  return endMs(event) >= now.getTime();
}

/**
 * The start is already in the past at `now`. A date-only or "Time TBA" listing
 * stays up for its whole Chicago day. A timed listing drops once that clock time has passed,
 * even when the end is still ahead.
 */
export function startAlreadyPassed(event: EventData, now: Date): boolean {
  if (isDateOnly(event.start) || event.time_tbd === true) {
    return eventChicagoDate(event) < chicagoYmd(now);
  }
  const time = Date.parse(event.start);
  if (Number.isNaN(time)) return false;
  return time < now.getTime();
}

export function sortByStart(events: EventData[]): EventData[] {
  return [...events].sort((a, b) => Date.parse(a.start) - Date.parse(b.start) || a.title.localeCompare(b.title));
}

export function isBusinessEvent(event: EventData): boolean {
  return event.categories.some((c) => (BUSINESS_EVENT_CATEGORIES as readonly string[]).includes(c));
}

export function inCategory(events: EventData[], category: string): EventData[] {
  return events.filter((e) => e.categories.includes(category));
}

export function formatEventDate(event: EventData): string {
  const timeZone = event.timezone || DEFAULT_TIMEZONE;
  const t = Date.parse(event.start);
  if (Number.isNaN(t)) return event.start;
  if (DATE_ONLY.test(event.start)) {
    return new Date(t).toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  }
  return new Date(t).toLocaleString("en-US", {
    weekday: "short", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone,
  });
}

export function placeName(value: EventData["venue"]): string {
  if (!value) return "";
  return typeof value === "string" ? value : (value.name ?? "");
}

/**
 * A price line only when the export has a real price or `is_free` / `free` is true.
 * A missing price is left blank. It is never guessed as "Free".
 */
export function formatPrice(event: EventData): string {
  if (event.free) return "Free";
  const p = event.price;
  if (typeof p === "number") return p > 0 ? `$${p}` : "";
  if (typeof p === "string") {
    const text = p.trim();
    if (text && !/^0+(?:\.0+)?$/.test(text)) return text;
  }
  if (event.is_free === true) return "Free";
  return "";
}

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Collection ids come from the file name. `_export-meta` is the engine's manifest, not an event. */
export function isEventContentId(id: string): boolean {
  const base = id.split(/[/\\]/).pop() ?? id;
  return base.length > 0 && !base.startsWith("_");
}

export function upcomingFromEntries(entries: { id: string; data: EventData }[], now: Date): EventData[] {
  const all = entries.filter((entry) => isEventContentId(entry.id)).map((entry) => entry.data);
  return sortByStart(all.filter((event) => isUpcoming(event, now)));
}

interface CalendarDate {
  year: number;
  month: number;
  day: number;
  weekday: number;
}

export function chicagoDateParts(date: Date): CalendarDate {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: DEFAULT_TIMEZONE,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((part) => [part.type, part.value]));
  const weekday = WEEKDAYS[parts.weekday ?? ""];
  if (weekday === undefined || !parts.year || !parts.month || !parts.day) {
    throw new Error(`Could not read an America/Chicago date from ${date.toISOString()}`);
  }
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), weekday };
}

function ymd(date: { year: number; month: number; day: number }): string {
  const month = String(date.month).padStart(2, "0");
  const day = String(date.day).padStart(2, "0");
  return `${date.year}-${month}-${day}`;
}

function addCalendarDays(date: CalendarDate, days: number): CalendarDate {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
  };
}

/** America/Chicago calendar date for an instant, as `YYYY-MM-DD`. */
export function chicagoYmd(now: Date): string {
  return ymd(chicagoDateParts(now));
}

/** Shift a `YYYY-MM-DD` calendar date by a number of days. */
export function addDaysToYmd(ymdDate: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymdDate);
  if (!match) return ymdDate;
  return ymd(addCalendarDays({
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    weekday: 0,
  }, days));
}

/**
 * Friday through Sunday in America/Chicago.
 * Monday–Thursday use the coming weekend. Friday–Sunday use the weekend already underway.
 */
export function weekendDateStrings(now: Date): [string, string, string] {
  const today = chicagoDateParts(now);
  const fridayOffset = today.weekday === 0 ? -2 : 5 - today.weekday;
  const friday = addCalendarDays(today, fridayOffset);
  return [ymd(friday), ymd(addCalendarDays(friday, 1)), ymd(addCalendarDays(friday, 2))];
}

/** Calendar date of the event start. Date-only values stay as written; instants use America/Chicago. */
export function eventChicagoDate(event: EventData): string {
  if (DATE_ONLY.test(event.start)) return event.start;
  const time = Date.parse(event.start);
  if (Number.isNaN(time)) return "";
  return ymd(chicagoDateParts(new Date(time)));
}

function calendarDayNumber(ymdDate: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymdDate);
  if (!match) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86_400_000;
}

/** Chicago calendar days from the event date to `now`. Negative when the event is still ahead. */
export function calendarDaysAfter(event: EventData, now: Date): number {
  const eventDay = calendarDayNumber(eventChicagoDate(event));
  const today = calendarDayNumber(ymd(chicagoDateParts(now)));
  if (eventDay === null || today === null) return Number.POSITIVE_INFINITY;
  return today - eventDay;
}

/** The sitemap keeps an event until 30 days after its date. Lists use `isUpcoming`. */
export function isListedEvent(event: EventData, now: Date): boolean {
  return calendarDaysAfter(event, now) < 30;
}

/** The event page stays indexable until 90 days after its date. */
export function isIndexableEvent(event: EventData, now: Date): boolean {
  return calendarDaysAfter(event, now) < 90;
}

/** The first category is the one used in breadcrumbs and the "more in this category" block. */
export function primaryCategory(event: EventData): string | null {
  return event.categories[0] ?? null;
}

export function formatDayHeading(ymdDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymdDate);
  if (!match) return ymdDate;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export interface WeekendDayGroup {
  date: string;
  heading: string;
  events: EventData[];
}

/** Groups events whose Chicago start date falls on that weekend. Omits days with none. */
export function groupWeekendEvents(events: EventData[], now: Date): WeekendDayGroup[] {
  const dates = weekendDateStrings(now);
  return dates
    .map((date) => ({
      date,
      heading: formatDayHeading(date),
      events: sortByStart(events.filter((event) => eventChicagoDate(event) === date)),
    }))
    .filter((group) => group.events.length > 0);
}

/**
 * Friday–Sunday for a weekend page, in America/Chicago.
 * A day already before today's Chicago date is left off once the weekend has started.
 */
export function weekendPageDays(events: EventData[], now: Date): WeekendDayGroup[] {
  const today = chicagoYmd(now);
  return weekendDateStrings(now)
    .filter((date) => date >= today)
    .map((date) => ({
      date,
      heading: formatDayHeading(date),
      events: sortByStart(events.filter((event) => isUpcoming(event, now) && eventChicagoDate(event) === date)),
    }));
}

/** One line for weekend days that are still ahead and have no events. Past days are not named. */
export function emptyWeekendDaysLine(days: WeekendDayGroup[]): string {
  const names = days.filter((day) => day.events.length === 0).map((day) => day.heading.split(",")[0] || day.heading);
  if (names.length === 0) return "";
  if (names.length === 1) return `Nothing listed for ${names[0]} yet.`;
  if (names.length === 2) return `Nothing listed for ${names[0]} or ${names[1]} yet.`;
  return `Nothing listed for ${names.slice(0, -1).join(", ")}, or ${names[names.length - 1]} yet.`;
}

/** Seven Chicago calendar days starting today, by the event's Chicago start date. */
export function nextSevenDayEvents(events: EventData[], now: Date): EventData[] {
  const today = chicagoDateParts(now);
  const start = ymd(today);
  const end = ymd(addCalendarDays(today, 6));
  return sortByStart(events.filter((event) => {
    const date = eventChicagoDate(event);
    return date >= start && date <= end;
  }));
}

export interface ThisWeekendView {
  mode: "weekend" | "fallback";
  groups: WeekendDayGroup[];
  fallback: EventData[];
}

export function thisWeekendView(events: EventData[], now: Date): ThisWeekendView {
  const upcoming = events.filter((event) => isUpcoming(event, now));
  const groups = groupWeekendEvents(upcoming, now);
  if (groups.length > 0) return { mode: "weekend", groups, fallback: [] };
  return { mode: "fallback", groups: [], fallback: nextSevenDayEvents(upcoming, now) };
}

export function hubWeekendPreview(events: EventData[], now: Date, limit = 6): EventData[] {
  const upcoming = events.filter((event) => isUpcoming(event, now));
  return groupWeekendEvents(upcoming, now).flatMap((group) => group.events).slice(0, limit);
}

export function generalCategoriesWithUpcoming(events: EventData[], now: Date): GeneralEventCategory[] {
  const upcoming = events.filter((event) => isUpcoming(event, now));
  return GENERAL_EVENT_CATEGORIES.filter((slug) => upcoming.some((event) => event.categories.includes(slug)));
}
