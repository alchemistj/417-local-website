import type { EventData } from "./eventSchema";
import { requiresTickets, TICKETED_VENUES } from "./eventAction";
import { eventPath, eventCitySlug, cityDisplayName, cityWeekendPath, hasWeekendPage, WEEKEND_CITY_SLUGS } from "./eventPaths";
import {
  addDaysToYmd,
  chicagoDateParts,
  chicagoYmd,
  eventChicagoDate,
  eventHasClockTime,
  formatDayHeading,
  isDateOnly,
  isUpcoming,
  placeName,
  sortByStart,
  startAlreadyPassed,
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
    if (!isUpcoming(event, now) || startAlreadyPassed(event, now) || !isStandoutEvent(event)) return false;
    const date = eventChicagoDate(event);
    return date >= start && date <= end;
  })).slice(0, limit);
}

/** A title is a short run (a play, a two-weekend show) when it has at most this many upcoming dates... */
export const RUN_MAX_DATES = 10;
/** ...and the first and last of those dates are at most this many days apart. */
export const RUN_MAX_SPAN_DAYS = 21;

function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

const SHOW_CATEGORIES = new Set(["arts-and-theater", "live-music", "comedy", "festivals", "holiday", "film"]);
const CLASS_CATEGORIES = new Set(["fitness", "classes-and-workshops", "sports-league", "sports-league-type"]);
/** Titles that read like a weekly class or program, never a run. */
export const CLASS_TITLE_PATTERN = /\b(acc rec|aerobics|workout|fit|yoga|zumba|chi|toning|strength|core|boom|silversneakers|class|open studio|bowling|ceramics)\b/i;

/**
 * A recurring program or community listing, even when this week's title is unique
 * ("Cinema Sundays: Matilda", "Mahj Mondays", a food-box distribution, a job fair).
 */
export const SERIES_TITLE_PATTERN =
  /\b(?:cinema sundays|movie matinee|mahj|food box|job fair|career fair|game night|bazaar|distribution)\b|\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)s\b|\bthis (?:sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i;

function weekdayOf(ymd: string): number {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** True when these dates are few and close enough, and not one weekday over and over, to be a run. */
function isRunDates(dates: string[]): boolean {
  const sorted = [...new Set(dates)].filter(Boolean).sort();
  if (sorted.length === 0) return false;
  if (sorted.length > RUN_MAX_DATES) return false;
  if (daysBetween(sorted[0] as string, sorted[sorted.length - 1] as string) > RUN_MAX_SPAN_DAYS) return false;
  if (sorted.length >= 3 && new Set(sorted.map(weekdayOf)).size === 1) return false;
  return true;
}

function looksLikeClass(group: EventData[]): boolean {
  const first = group[0];
  if (!first) return true;
  return group.some((event) => event.categories.some((category) => CLASS_CATEGORIES.has(category))) || CLASS_TITLE_PATTERN.test(first.title);
}

function looksLikeShow(group: EventData[]): boolean {
  const first = group[0];
  if (!first) return false;
  if (group.some((event) => event.categories.some((category) => SHOW_CATEGORIES.has(category)))) return true;
  const venue = norm(placeName(first.venue));
  if (venue && TICKETED_VENUES.some((name) => venue.includes(norm(name)))) return true;
  return group.some((event) => requiresTickets(event));
}

/** 2 to 7 dates, each exactly one day after the last (a Mon-Fri play, a three-night festival). */
function isConsecutiveRun(dates: string[]): boolean {
  const sorted = [...new Set(dates)].filter(Boolean).sort();
  if (sorted.length < 2 || sorted.length > 7) return false;
  return sorted.every((date, index) => index === 0 || daysBetween(sorted[index - 1] as string, date) === 1);
}

/**
 * A group of same-title upcoming events is a run when it is not a class and either its dates are
 * consecutive days, or it looks like a show with few dates close together that are not one weekday.
 */
function isRunGroup(group: EventData[]): boolean {
  if (looksLikeClass(group)) return false;
  const dates = group.map((event) => eventChicagoDate(event));
  return isConsecutiveRun(dates) || (looksLikeShow(group) && isRunDates(dates));
}

/** Registration link, a source URL, or the organizer's site. */
export function hasOfficialSource(event: EventData): boolean {
  const website = event.organizer && typeof event.organizer.website === "string" ? event.organizer.website.trim() : "";
  return Boolean(event.registration_url?.trim() || event.source_urls.some((url) => url.trim()) || website);
}

export interface SignificantContext {
  peers?: EventData[];
  recurring?: RecurringItem[];
  /** When set, the 3-date series check counts only today through today + 27 days. */
  now?: Date;
}

/** Distinct Chicago dates for this title. With `now`, only the next 4 weeks count. */
function titleDateCount(event: EventData, peers: EventData[], now?: Date): number {
  const title = norm(event.title);
  const city = eventCitySlug(event);
  const start = now ? chicagoYmd(now) : "";
  const end = now ? addDaysToYmd(start, 27) : "";
  const dates = new Set<string>();
  const add = (item: EventData) => {
    if (eventCitySlug(item) !== city || norm(item.title) !== title) return;
    const date = eventChicagoDate(item);
    if (!date) return;
    if (now && (date < start || date > end)) return;
    dates.add(date);
  };
  add(event);
  for (const item of peers) add(item);
  return dates.size;
}

/** Same title as a weekly or monthly series, or the dates repeat beyond a short run. */
export function isWeeklyOrMonthlySeries(event: EventData, peers: EventData[] = [], recurring: RecurringItem[] = []): boolean {
  const title = norm(event.title);
  const city = eventCitySlug(event);
  if (recurring.some((item) => item.active !== false && recurringCitySlug(item) === city && norm(item.title) === title)) return true;
  const same = peers.filter((item) => eventCitySlug(item) === city && norm(item.title) === title);
  if (same.length < 2) return false;
  return !isRunGroup(same);
}

/**
 * Standout (festival, holiday, big room, or ticketed music, comedy, or theater),
 * not a weekly or monthly series, not a class-like or series-like title,
 * not a title with 3 or more dates in the next 4 weeks, and it has an official source URL.
 */
export function isSignificantOneOff(event: EventData, context: SignificantContext = {}): boolean {
  if (!isStandoutEvent(event)) return false;
  if (CLASS_TITLE_PATTERN.test(event.title) || SERIES_TITLE_PATTERN.test(event.title)) return false;
  if (!hasOfficialSource(event)) return false;
  const peers = context.peers ?? [];
  if (titleDateCount(event, peers, context.now) >= 3) return false;
  if (isWeeklyOrMonthlySeries(event, peers, context.recurring ?? [])) return false;
  return true;
}

/** Today through today + 27 days (28 Chicago dates), still upcoming, and not already started. */
export function isInNextFourWeeks(event: EventData, now: Date): boolean {
  if (!isUpcoming(event, now) || startAlreadyPassed(event, now)) return false;
  const date = eventChicagoDate(event);
  const start = chicagoYmd(now);
  return date >= start && date <= addDaysToYmd(start, 27);
}

function significantInCities(events: EventData[], recurring: RecurringItem[], now: Date, cities: readonly string[]): EventData[] {
  const allowed = new Set(cities);
  return events.filter((event) =>
    allowed.has(eventCitySlug(event))
    && isInNextFourWeeks(event, now)
    && isSignificantOneOff(event, { peers: events, recurring, now }),
  );
}

/** Significant one-offs across the five cities, soonest first, capped at 12. */
export function regionDontMiss(events: EventData[], recurring: RecurringItem[], now: Date, limit = 12): EventData[] {
  return sortByStart(significantInCities(events, recurring, now, WEEKEND_CITY_SLUGS)).slice(0, limit);
}

/**
 * This city's significant one-offs first (by date), then the other four cities' (by date).
 * A city outside the five still gets the five cities' one-offs after its own. Capped at 10.
 */
export function hubDontMiss(events: EventData[], recurring: RecurringItem[], city: string, now: Date, limit = 10): EventData[] {
  const local = sortByStart(significantInCities(events, recurring, now, [city]));
  const awaySlugs = WEEKEND_CITY_SLUGS.filter((slug) => slug !== city);
  const away = sortByStart(significantInCities(events, recurring, now, awaySlugs));
  return [...local, ...away].slice(0, limit);
}

/** Significant one-offs in the other four cities on the coming Friday–Sunday. Capped at 6. */
export function worthTheDrive(events: EventData[], recurring: RecurringItem[], city: string, now: Date, limit = 6): EventData[] {
  const [start, , end] = weekendDateStrings(now);
  const away = new Set(WEEKEND_CITY_SLUGS.filter((slug) => slug !== city));
  return sortByStart(events.filter((event) => {
    if (!away.has(eventCitySlug(event)) || !isUpcoming(event, now) || startAlreadyPassed(event, now)) return false;
    const date = eventChicagoDate(event);
    if (date < start || date > end) return false;
    return isSignificantOneOff(event, { peers: events, recurring, now });
  })).slice(0, limit);
}

export function fourWeekCount(events: EventData[], city: string, now: Date): number {
  return events.filter((event) => eventCitySlug(event) === city && isInNextFourWeeks(event, now)).length;
}

/** First upcoming event in this city on the coming Friday–Sunday. */
export function topWeekendEvent(events: EventData[], city: string, now: Date): EventData | null {
  const [start, , end] = weekendDateStrings(now);
  const list = events.filter((event) => {
    if (eventCitySlug(event) !== city || !isUpcoming(event, now) || startAlreadyPassed(event, now)) return false;
    const date = eventChicagoDate(event);
    return date >= start && date <= end;
  });
  list.sort((a, b) => eventChicagoDate(a).localeCompare(eventChicagoDate(b)) || Date.parse(a.start) - Date.parse(b.start) || a.title.localeCompare(b.title));
  return list[0] ?? null;
}

function shortWeekdayMonthDay(ymd: string): string {
  const [year, month, day] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(date).replace(",", "");
}

/** "Fri Nov 13 to Sun Nov 15". The date stays out of the title, H1, and URL. */
export function weekendRangeLabel(now: Date): string {
  const [friday, , sunday] = weekendDateStrings(now);
  return `${shortWeekdayMonthDay(friday)} to ${shortWeekdayMonthDay(sunday)}`;
}

/** Meta description, 155 characters or fewer. City name keeps the five pages distinct. */
export function weekendMetaDescription(citySlug: string, events: EventData[], now: Date): string {
  const name = cityDisplayName(citySlug);
  const range = weekendRangeLabel(now);
  const lead = `Things to do in ${name}, MO this weekend (${range}).`;
  const tail = "Free picks and big events nearby. Refreshed weekly.";
  const titles = topWeekendTitles(events, citySlug, now);
  const withTitles = titles.length > 0 ? `${lead} ${titles.join(", ")}. ${tail}` : `${lead} ${tail}`;
  const description = withTitles.length <= 155 ? withTitles : `${lead} ${tail}`;
  return description.length <= 155 ? description : `${description.slice(0, 152).trimEnd()}...`;
}

function topWeekendTitles(events: EventData[], city: string, now: Date): string[] {
  const [start, , end] = weekendDateStrings(now);
  return sortByStart(events.filter((event) => {
    if (eventCitySlug(event) !== city || !isUpcoming(event, now)) return false;
    const date = eventChicagoDate(event);
    return date >= start && date <= end;
  }))
    .slice(0, 2)
    .map((event) => event.title.replace(/&/g, "and").replace(/["<>]/g, "").replace(/\s+/g, " ").trim())
    .filter((title) => title.length > 0 && title.length <= 40);
}

function titleKey(event: EventData): string {
  return `${eventCitySlug(event)}|${norm(event.title)}`;
}

export interface EventRun {
  /** Upcoming performances at this venue, soonest first. */
  performances: EventData[];
  /** The earliest upcoming performance. Every row of the run links to its page. */
  canonical: EventData;
  /** First and last performance dates (YYYY-MM-DD). */
  firstDate: string;
  lastDate: string;
  /** More than one performance day. */
  multiDay: boolean;
}

/**
 * The run this event belongs to, or null when its title repeats too often or too far apart
 * (a weekly regular) or the event has no upcoming performance. Past performances are ignored.
 */
export function eventRun(event: EventData, events: EventData[], now: Date): EventRun | null {
  const key = titleKey(event);
  const sameTitle = events.filter((item) => isUpcoming(item, now) && titleKey(item) === key);
  if (sameTitle.length === 0 || !isRunGroup(sameTitle)) return null;
  const venue = norm(placeName(event.venue));
  const performances = sortByStart(sameTitle.filter((item) => norm(placeName(item.venue)) === venue));
  const canonical = performances[0];
  if (!canonical) return null;
  const dates = performances.map((item) => eventChicagoDate(item));
  const firstDate = dates[0] as string;
  const lastDate = dates.reduce((a, b) => (b > a ? b : a), firstDate);
  return { performances, canonical, firstDate, lastDate, multiDay: new Set(dates).size > 1 };
}

/** Where a list row for this event links: the run's earliest upcoming page, or the event's own page. */
export function runCanonicalPath(event: EventData, events: EventData[], now: Date): string {
  const run = eventRun(event, events, now);
  return run ? eventPath(run.canonical) : eventPath(event);
}

function shortMonthDay(ymd: string): { month: string; day: number } {
  const [year, month, day] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return { month: new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(date), day };
}

/** "Nov 13–22" or "Nov 28–Dec 2" for a multi-day run, otherwise null. */
export function runRangeLabel(run: EventRun | null): string | null {
  if (!run || !run.multiDay) return null;
  const first = shortMonthDay(run.firstDate);
  const last = shortMonthDay(run.lastDate);
  return first.month === last.month ? `${first.month} ${first.day}–${last.day}` : `${first.month} ${first.day}–${last.month} ${last.day}`;
}

/** "Fri Nov 13, 7:00 PM" for the Also playing line. */
export function performanceLabel(event: EventData): string {
  const zone = event.timezone || "America/Chicago";
  const time = Date.parse(event.start);
  if (isDateOnly(event.start) || Number.isNaN(time)) {
    const { month, day } = shortMonthDay(eventChicagoDate(event));
    return `${month} ${day}`;
  }
  const day = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: zone }).format(new Date(time)).replace(",", "");
  return event.time_tbd === true ? day : `${day}, ${eventListTime(event)}`;
}

/** Other upcoming performances of this event's run, soonest first. */
export function alsoPlaying(event: EventData, events: EventData[], now: Date): EventData[] {
  const run = eventRun(event, events, now);
  return run && run.multiDay ? run.performances.filter((item) => item.id !== event.id) : [];
}

/** Shows each run once (its first listed performance) and leaves out the run `exclude` belongs to. */
export function collapseRuns(list: EventData[], events: EventData[], now: Date, exclude?: EventData): EventData[] {
  const keyOf = (event: EventData): string => {
    const run = eventRun(event, events, now);
    return run && run.multiDay ? `run:${eventPath(run.canonical)}` : `id:${event.id}`;
  };
  const skip = exclude ? keyOf(exclude) : null;
  const seen = new Set<string>();
  return list.filter((event) => {
    const key = keyOf(event);
    if (key === skip || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Upcoming events for the hub list, from today through today + 27 days (28 days, US Central dates).
 * One-off events and short runs (see RUN_MAX_DATES and RUN_MAX_SPAN_DAYS) stay, a run on every
 * performance day. A title that repeats more often or over a longer stretch, or that matches an
 * active recurring series, is a weekly regular and is left out.
 */
export function uniqueUpcomingEvents(events: EventData[], recurring: RecurringItem[], city: string, now: Date, days = 28): EventData[] {
  const seriesTitles = new Set(
    recurring.filter((item) => item.active !== false && recurringCitySlug(item) === city).map((item) => norm(item.title)),
  );
  const cityUpcoming = events.filter((event) => eventCitySlug(event) === city && isUpcoming(event, now));
  const groups = new Map<string, EventData[]>();
  for (const event of cityUpcoming) {
    const key = norm(event.title);
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  const start = chicagoYmd(now);
  const end = addDaysToYmd(start, days - 1);
  return sortByStart(cityUpcoming.filter((event) => {
    const date = eventChicagoDate(event);
    if (date < start || date > end) return false;
    const key = norm(event.title);
    const group = groups.get(key) ?? [];
    // A title seen once is a one-off. Repeats must qualify as a run.
    return !seriesTitles.has(key) && (group.length <= 1 || isRunGroup(group));
  }));
}

/**
 * Hub "Coming up": unique one-offs for the next 28 days, without the standouts already
 * shown in Don't miss. A standout that did not fit the six-event cap stays here.
 */
export function comingUpEvents(events: EventData[], recurring: RecurringItem[], city: string, now: Date, featured?: EventData[]): EventData[] {
  const featuredIds = new Set((featured ?? dontMissEvents(events, now)).map((event) => event.id));
  return uniqueUpcomingEvents(events, recurring, city, now).filter((event) => !featuredIds.has(event.id));
}

function streetKey(value: string): string {
  const match = /(\d{2,})\s+([a-z]+(?:\s+[a-z]+){0,2})/.exec(value);
  return match ? `${match[1]} ${match[2]}` : "";
}

function samePlace(a: EventData, b: EventData): boolean {
  const nameA = norm(placeName(a.venue));
  const nameB = norm(placeName(b.venue));
  const addressA = norm(placeName(a.address));
  const addressB = norm(placeName(b.address));
  if (!nameA && !nameB && !addressA && !addressB) return true;
  if (nameA && nameA === nameB) return true;
  if (addressA && addressA === addressB) return true;
  const streetsA = [streetKey(nameA), streetKey(addressA)].filter(Boolean);
  const streetsB = [streetKey(nameB), streetKey(addressB)].filter(Boolean);
  if (streetsA.some((key) => streetsB.includes(key))) return true;
  if (nameA.length >= 8 && (nameB.includes(nameA) || addressB.includes(nameA))) return true;
  if (nameB.length >= 8 && (nameA.includes(nameB) || addressA.includes(nameB))) return true;
  return false;
}

function duplicateRank(event: EventData): number {
  let rank = 0;
  if (eventHasClockTime(event)) rank += 4;
  const name = norm(placeName(event.venue));
  if (name && !/^\d/.test(name)) rank += 2;
  const slug = event.public_slug ?? event.slug;
  if (!/-\d+$/.test(slug)) rank += 1;
  return rank;
}

/**
 * One row per event that shares a title, a place, and a start on the same Chicago day.
 * Keeps the copy with a clock time and a venue name when the export stored the same
 * event twice (a street address in one file, the venue name in the other).
 */
export function dedupeSameDayEvents(events: EventData[]): EventData[] {
  const kept: EventData[] = [];
  for (const event of events) {
    const title = norm(event.title);
    const city = eventCitySlug(event);
    const date = eventChicagoDate(event);
    const index = kept.findIndex((other) => (
      eventCitySlug(other) === city
      && norm(other.title) === title
      && eventChicagoDate(other) === date
      && samePlace(other, event)
    ));
    if (index === -1) {
      kept.push(event);
      continue;
    }
    const current = kept[index];
    if (current && duplicateRank(event) > duplicateRank(current)) kept[index] = event;
  }
  return kept;
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
  /** Repeating titles left out of the one-off slots so they do not crowd the day. */
  regulars: number;
  dayHref: string | null;
}

export interface MonthGrid {
  weeks: MonthCell[][];
  label: string;
  eventCount: number;
}

/** One-off ids through the last built month. Repeating titles and series matches are left out. */
function oneOffIds(city: string, events: EventData[], recurring: RecurringItem[], now: Date): Set<string> {
  const span = Math.max(1, daysBetween(chicagoYmd(now), lastBuiltYmd(now)) + 1);
  return new Set(uniqueUpcomingEvents(events, recurring, city, now, span).map((event) => event.id));
}

export function buildMonthGrid(city: string, year: number, month: number, events: EventData[], recurring: RecurringItem[], now: Date): MonthGrid {
  const today = chicagoYmd(now);
  const pageDates = new Set(dayPageDates(city, events, recurring, now));
  const cityEvents = events.filter((event) => eventCitySlug(event) === city && isUpcoming(event, now));
  const oneOffs = oneOffIds(city, events, recurring, now);
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
      const listed = dayEvents.filter((event) => oneOffs.has(event.id));
      const weekly = !inMonth || isPast ? 0 : recurringOnDate(recurring, city, date).length;
      week.push({
        date,
        day: Number(date.slice(8, 10)),
        inMonth,
        isToday: inMonth && date === today,
        isPast,
        shown: listed.slice(0, 3).map((event) => ({ href: runCanonicalPath(event, cityEvents, now), title: event.title })),
        more: Math.max(0, listed.length - 3),
        weekly,
        regulars: dayEvents.length - listed.length,
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
    { key: "weekend", title: "This weekend", detail: countLabel(weekendCount), href: hasWeekendPage(city) ? cityWeekendPath(city) : null },
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
