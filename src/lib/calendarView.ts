import type { EventData } from "./eventSchema";
import { eventPath, eventCitySlug, cityDisplayName, cityWeekendPath } from "./eventPaths";
import {
  addDaysToYmd,
  chicagoDateParts,
  chicagoYmd,
  eventChicagoDate,
  formatDayHeading,
  isDateOnly,
  isUpcoming,
  placeName,
  sortByStart,
  weekendDateStrings,
  type WeekendDayGroup,
} from "./events";
import { recurringCitySlug, recurringOnDate, type RecurringItem } from "./recurring";

const BIG_VENUES = [
  "great southern bank arena",
  "juanita k hammons hall",
  "gillioz theatre",
  "hammons field",
];

const TICKET_CATEGORIES = new Set(["live-music", "comedy", "arts-and-theater"]);

function norm(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function isBigVenue(event: EventData): boolean {
  const name = norm(placeName(event.venue));
  if (!name) return false;
  return BIG_VENUES.some((venue) => name === venue || name.includes(venue));
}

/** Festivals, holiday events, the big rooms, or ticketed music, comedy and theater. */
export function isStandoutEvent(event: EventData): boolean {
  if (event.categories.some((category) => category === "festivals" || category === "holiday")) return true;
  if (isBigVenue(event)) return true;
  const tickets = (event.action_type ?? "").trim() === "tickets";
  return tickets && event.categories.some((category) => TICKET_CATEGORIES.has(category));
}

/** Standout one-off events from today through the following 29 days (30 days including today). */
export function dontMissEvents(events: EventData[], now: Date, limit = 6): EventData[] {
  const start = chicagoYmd(now);
  const end = addDaysToYmd(start, 29);
  return sortByStart(events.filter((event) => {
    if (!isUpcoming(event, now) || !isStandoutEvent(event)) return false;
    const date = eventChicagoDate(event);
    return date >= start && date <= end;
  })).slice(0, limit);
}

export function eventsOnDate(events: EventData[], city: string, date: string, now: Date): EventData[] {
  return sortByStart(events.filter((event) => eventCitySlug(event) === city && isUpcoming(event, now) && eventChicagoDate(event) === date));
}

export function eventsBetween(events: EventData[], city: string, now: Date, startOffset: number, endOffset: number): EventData[] {
  const start = addDaysToYmd(chicagoYmd(now), startOffset);
  const end = addDaysToYmd(chicagoYmd(now), endOffset);
  return sortByStart(events.filter((event) => {
    if (eventCitySlug(event) !== city || !isUpcoming(event, now)) return false;
    const date = eventChicagoDate(event);
    return date >= start && date <= end;
  }));
}

/** One-off events grouped by their Chicago start date, soonest day first, then start time and title. */
export function groupEventsByDay(events: EventData[]): WeekendDayGroup[] {
  const dates = [...new Set(events.map((event) => eventChicagoDate(event)).filter(Boolean))].sort();
  return dates.map((date) => ({
    date,
    heading: formatDayHeading(date),
    events: sortByStart(events.filter((event) => eventChicagoDate(event) === date)),
  }));
}

export function showsFreeTag(event: EventData): boolean {
  return event.is_free === true;
}

export function isKidsEvent(event: EventData): boolean {
  return event.categories.includes("kids") || event.categories.includes("family");
}

/** "7:30 PM", "All day", or "Time TBA". */
export function eventListTime(event: EventData): string {
  if (event.time_tbd === true) return "Time TBA";
  if (isDateOnly(event.start) || !event.start.includes("T")) return "All day";
  const time = Date.parse(event.start);
  if (Number.isNaN(time)) return "Time TBA";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: event.timezone || "America/Chicago",
  }).format(new Date(time));
}

export function shortEventTitle(title: string, max = 32): string {
  const clean = title.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > 12 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

export interface BuiltMonth {
  year: number;
  month: number;
}

/** The current Chicago month and the next 3. */
export function builtMonths(now: Date): BuiltMonth[] {
  const today = chicagoDateParts(now);
  const months: BuiltMonth[] = [];
  for (let offset = 0; offset < 4; offset += 1) {
    const shifted = new Date(Date.UTC(today.year, today.month - 1 + offset, 1));
    months.push({ year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 });
  }
  return months;
}

export function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function lastBuiltYmd(now: Date): string {
  const last = builtMonths(now).at(-1);
  if (!last) return chicagoYmd(now);
  return new Date(Date.UTC(last.year, last.month, 0)).toISOString().slice(0, 10);
}

export function monthPublicPath(city: string, year: number, month: number, now: Date): string {
  const [current] = builtMonths(now);
  if (current && current.year === year && current.month === month) return `/events/${city}/calendar/`;
  return `/events/${city}/calendar/${year}-${String(month).padStart(2, "0")}/`;
}

export function monthNav(city: string, year: number, month: number, now: Date): { prev: { href: string; label: string } | null; next: { href: string; label: string } | null } {
  const months = builtMonths(now);
  const index = months.findIndex((item) => item.year === year && item.month === month);
  const previous = index > 0 ? months[index - 1] : undefined;
  const following = index >= 0 ? months[index + 1] : undefined;
  return {
    prev: previous ? { href: monthPublicPath(city, previous.year, previous.month, now), label: monthLabel(previous.year, previous.month) } : null,
    next: following ? { href: monthPublicPath(city, following.year, following.month, now), label: monthLabel(following.year, following.month) } : null,
  };
}

/** Days from today through the last built month that have an upcoming event or a weekly item. */
export function dayPageDates(city: string, events: EventData[], recurring: RecurringItem[], now: Date): string[] {
  const today = chicagoYmd(now);
  const last = lastBuiltYmd(now);
  const dates = new Set<string>();
  for (const event of events) {
    if (eventCitySlug(event) !== city || !isUpcoming(event, now)) continue;
    const date = eventChicagoDate(event);
    if (date >= today && date <= last) dates.add(date);
  }
  for (const item of recurring) {
    if (item.active === false || recurringCitySlug(item) !== city) continue;
    for (const raw of item.next_dates) {
      const date = raw.slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(date) && date >= today && date <= last) dates.add(date);
    }
  }
  return [...dates].sort();
}

export function dayPageTitle(cityName: string, date: string): string {
  return `Events in ${cityName} on ${formatDayHeading(date)} | 417 Local`;
}

export function dayPageH1(cityName: string, date: string): string {
  return `Events in ${cityName} on ${formatDayHeading(date)}`;
}

export function dayPageDescription(cityName: string, date: string, events: EventData[], weeklyTitles: string[]): string {
  const heading = `${formatDayHeading(date)}, ${date.slice(0, 4)}`;
  const eventBit = events.length
    ? `${events.length} event${events.length === 1 ? "" : "s"}, including ${events.slice(0, 2).map((event) => event.title).join(" and ")}.`
    : "No one-off events.";
  const weeklyBit = weeklyTitles.length ? ` Weekly: ${weeklyTitles.slice(0, 2).join(" and ")}.` : "";
  return `Events on ${heading} in ${cityName}, MO. ${eventBit}${weeklyBit}`;
}

export function monthPageTitle(cityName: string, label: string): string {
  return `${cityName}, MO Events Calendar · ${label} | 417 Local`;
}

export function monthPageDescription(cityName: string, label: string, eventCount: number): string {
  const noun = eventCount === 1 ? "event" : "events";
  return `Calendar for ${label} in ${cityName}, MO, with ${eventCount} one-off ${noun}. Weekly happenings stay on their own chip.`;
}

export interface MonthCell {
  date: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  shown: { href: string; title: string }[];
  more: number;
  weekly: number;
  dayHref: string | null;
}

export interface MonthGrid {
  weeks: MonthCell[][];
  label: string;
  eventCount: number;
}

export function buildMonthGrid(city: string, year: number, month: number, events: EventData[], recurring: RecurringItem[], now: Date): MonthGrid {
  const today = chicagoYmd(now);
  const pageDates = new Set(dayPageDates(city, events, recurring, now));
  const cityEvents = events.filter((event) => eventCitySlug(event) === city && isUpcoming(event, now));
  const first = new Date(Date.UTC(year, month - 1, 1));
  const cursor = new Date(first);
  cursor.setUTCDate(1 - first.getUTCDay());
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  const lastDate = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  const weeks: MonthCell[][] = [];
  for (let guard = 0; guard < 6; guard += 1) {
    const week: MonthCell[] = [];
    for (let column = 0; column < 7; column += 1) {
      const date = cursor.toISOString().slice(0, 10);
      const inMonth = date.startsWith(monthKey);
      const isPast = inMonth && date < today;
      const dayEvents = !inMonth || isPast ? [] : sortByStart(cityEvents.filter((event) => eventChicagoDate(event) === date));
      const weekly = !inMonth || isPast ? 0 : recurringOnDate(recurring, city, date).length;
      week.push({
        date,
        day: Number(date.slice(8, 10)),
        inMonth,
        isToday: inMonth && date === today,
        isPast,
        shown: dayEvents.slice(0, 3).map((event) => ({ href: eventPath(event), title: shortEventTitle(event.title) })),
        more: Math.max(0, dayEvents.length - 3),
        weekly,
        dayHref: inMonth && !isPast && pageDates.has(date) ? `/events/${city}/${date}/` : null,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
    if (week.some((cell) => cell.inMonth && cell.date >= lastDate)) break;
  }
  const eventCount = weeks.flat().reduce((sum, cell) => sum + cell.shown.length + cell.more, 0);
  return { weeks, label: monthLabel(year, month), eventCount };
}

export interface MonthPageModel {
  year: number;
  month: number;
  path: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  label: string;
  grid: MonthGrid;
  prev: { href: string; label: string } | null;
  next: { href: string; label: string } | null;
}

export function monthPageModel(city: string, year: number, month: number, events: EventData[], recurring: RecurringItem[], now: Date): MonthPageModel {
  const name = cityDisplayName(city);
  const label = monthLabel(year, month);
  const grid = buildMonthGrid(city, year, month, events, recurring, now);
  const nav = monthNav(city, year, month, now);
  return {
    year,
    month,
    path: monthPublicPath(city, year, month, now),
    title: monthPageTitle(name, label),
    description: monthPageDescription(name, label, grid.eventCount),
    h1: `${label} in ${name}`,
    intro: "Pick a day to see what is happening. One-off events are listed on the day, and weekly happenings are counted on their own.",
    label: `${label} calendar`,
    grid,
    prev: nav.prev,
    next: nav.next,
  };
}

function countLabel(oneOff: number, weekly = 0): string {
  if (oneOff > 0) return `${oneOff} event${oneOff === 1 ? "" : "s"}`;
  if (weekly > 0) return `${weekly} weekly`;
  return "0 events";
}

function dayBits(ymd: string): { weekday: string; day: number } {
  const [year, month, day] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return {
    weekday: new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(date),
    day,
  };
}

export interface DateStripRange {
  key: string;
  title: string;
  detail: string;
  href: string | null;
}

export interface DateStripDay {
  date: string;
  weekday: string;
  day: number;
  label: string;
  href: string | null;
}

export interface DateStripModel {
  ranges: DateStripRange[];
  days: DateStripDay[];
}

export function dateStrip(city: string, events: EventData[], recurring: RecurringItem[], now: Date): DateStripModel {
  const today = chicagoYmd(now);
  const pages = new Set(dayPageDates(city, events, recurring, now));
  const hrefFor = (date: string) => (pages.has(date) ? `/events/${city}/${date}/` : null);
  const on = (date: string) => eventsOnDate(events, city, date, now).length;
  const weeklyOn = (date: string) => recurringOnDate(recurring, city, date).length;
  const tomorrow = addDaysToYmd(today, 1);
  const weekend = weekendDateStrings(now);
  const weekendCount = events.filter((event) => eventCitySlug(event) === city && isUpcoming(event, now) && weekend.includes(eventChicagoDate(event))).length;
  const next7 = eventsBetween(events, city, now, 0, 6).length;
  const next14 = eventsBetween(events, city, now, 0, 13);
  const [current] = builtMonths(now);
  const monthCount = current ? buildMonthGrid(city, current.year, current.month, events, recurring, now).eventCount : 0;
  const todayBits = dayBits(today);
  const tomorrowBits = dayBits(tomorrow);
  const ranges: DateStripRange[] = [
    { key: "today", title: "Today", detail: `${todayBits.weekday} ${todayBits.day} · ${countLabel(on(today), weeklyOn(today))}`, href: hrefFor(today) },
    { key: "tomorrow", title: "Tomorrow", detail: `${tomorrowBits.weekday} ${tomorrowBits.day} · ${countLabel(on(tomorrow), weeklyOn(tomorrow))}`, href: hrefFor(tomorrow) },
    { key: "weekend", title: "This weekend", detail: countLabel(weekendCount), href: cityWeekendPath(city) },
    { key: "week", title: "Next 7 days", detail: countLabel(next7), href: next14.length > 0 ? "#upcoming" : `/events/${city}/calendar/` },
    { key: "pick", title: "Pick a date", detail: countLabel(monthCount), href: `/events/${city}/calendar/` },
  ];
  const days: DateStripDay[] = [];
  for (let offset = 0; offset < 14; offset += 1) {
    const date = addDaysToYmd(today, offset);
    const bits = dayBits(date);
    days.push({
      date,
      weekday: bits.weekday,
      day: bits.day,
      label: countLabel(on(date), weeklyOn(date)),
      href: hrefFor(date),
    });
  }
  return { ranges, days };
}
