import { existsSync, readdirSync, readFileSync } from "node:fs";
import { z } from "astro/zod";
import { eventAction } from "./eventAction";
import { buildEventIcs, googleCalendarUrl } from "./eventCalendar";
import { eventSchema, type EventData } from "./eventSchema";
import { chicagoYmd, formatDayHeading } from "./events";
import { cityDisplayName, slugify } from "./eventPaths";
import { absoluteUrl } from "./site";

/**
 * event-radar writes recurring items here. The schema stays loose so a newer export still builds.
 * `id` and `title` are the only fields a series page cannot do without.
 */
export const recurringSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    venue: z.any().nullish(),
    address: z.any().nullish(),
    city: z.string().nullish(),
    city_slug: z.string().nullish(),
    categories: z.array(z.string()).optional().default([]),
    rule: z.any().nullish(),
    // event-radar writes `{ from: "MM-DD", to: "MM-DD" }`; older files used a plain string.
    season: z
      .union([z.string(), z.object({ from: z.string().nullish(), to: z.string().nullish() }).passthrough()])
      .nullish()
      .transform((value) => seasonLabel(value)),
    url: z.string().nullish(),
    next_dates: z.array(z.string()).optional().default([]),
    active: z.boolean().nullish(),
    verified: z.boolean().nullish(),
  })
  .passthrough();

export type RecurringItem = z.infer<typeof recurringSchema>;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "March–October" from `{ from: "03-14", to: "10-31" }`; a string season passes through. */
export function seasonLabel(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (typeof value !== "object") return null;
  const record = value as { from?: unknown; to?: unknown };
  const month = (raw: unknown) => {
    const match = typeof raw === "string" ? raw.match(/^(\d{1,2})-\d{1,2}$/) : null;
    const index = match ? Number(match[1]) - 1 : -1;
    return index >= 0 && index < 12 ? MONTHS[index] : "";
  };
  const from = month(record.from);
  const to = month(record.to);
  if (from && to) return from === to ? from : `${from}–${to}`;
  return from || to || null;
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Missing and empty folders both mean there are no series. Invalid JSON still throws. */
export function readRecurringDir(dir: string): RecurringItem[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json") && !name.startsWith("_"))
    .map((name) => recurringSchema.parse(JSON.parse(readFileSync(`${dir}/${name}`, "utf8")) as unknown))
    .filter((item) => item.active !== false);
}

export function recurringPlace(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && "name" in value && typeof (value as { name?: unknown }).name === "string") {
    return (value as { name: string }).name.trim();
  }
  return "";
}

export function recurringCitySlug(item: RecurringItem): string {
  const provided = item.city_slug?.trim();
  if (provided) return provided;
  const city = item.city?.trim();
  return city ? slugify(city) : "springfield";
}

export function seriesSlug(item: RecurringItem): string {
  return slugify(item.id) || slugify(item.title) || "series";
}

export function isMonthlySeries(item: RecurringItem): boolean {
  const rule = item.rule;
  if (typeof rule === "string") return /\bmonth/i.test(rule);
  if (rule && typeof rule === "object") {
    const record = rule as Record<string, unknown>;
    const frequency = String(record.frequency ?? record.freq ?? record.cadence ?? "");
    return /month/i.test(frequency);
  }
  return false;
}

export function seriesPath(item: RecurringItem): string {
  const section = isMonthlySeries(item) ? "monthly" : "weekly";
  return `/events/${recurringCitySlug(item)}/${section}/${seriesSlug(item)}/`;
}

function formatRule(rule: unknown): string {
  if (typeof rule === "string") return rule.trim();
  if (!rule || typeof rule !== "object") return "";
  const record = rule as Record<string, unknown>;
  for (const key of ["label", "text", "summary", "description"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  const frequency = typeof record.frequency === "string" ? record.frequency : typeof record.freq === "string" ? record.freq : "";
  const weekday = typeof record.weekday === "string" ? record.weekday : typeof record.byday === "string" ? record.byday : typeof record.day === "string" ? record.day : "";
  const start = typeof record.start === "string" ? record.start : typeof record.start_time === "string" ? record.start_time : "";
  const end = typeof record.end === "string" ? record.end : typeof record.end_time === "string" ? record.end_time : "";
  const time = start && end ? `${start}–${end}` : start;
  const every = /month/i.test(frequency) ? "Every month" : frequency ? `Every ${frequency}` : weekday ? "Every" : "";
  return [every, weekday, time].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

/** "Every Saturday, 9 AM–1 PM, March–October" from `rule` plus `season`. */
export function recurringWhen(item: RecurringItem): string {
  const rule = formatRule(item.rule);
  const season = item.season?.trim() ?? "";
  if (rule && season && !rule.toLowerCase().includes(season.toLowerCase())) return `${rule}, ${season}`;
  return rule || season;
}

/** Weekday from the rule text, otherwise the weekday of the first next date. */
export function recurringWeekday(item: RecurringItem): number | null {
  const extra = item.rule && typeof item.rule === "object" ? JSON.stringify(item.rule) : "";
  const text = `${recurringWhen(item)} ${extra}`.toLowerCase();
  const found = WEEKDAYS.findIndex((name) => text.includes(name));
  if (found >= 0) return found;
  const next = item.next_dates.find((value) => /^\d{4}-\d{2}-\d{2}/.test(value));
  const match = next ? /^(\d{4})-(\d{2})-(\d{2})/.exec(next) : null;
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))).getUTCDay();
}

export interface WeekdayGroup {
  weekday: string;
  items: RecurringItem[];
}

export function groupSeriesByWeekday(items: RecurringItem[]): WeekdayGroup[] {
  const buckets = new Map<number, RecurringItem[]>();
  const flexible: RecurringItem[] = [];
  for (const item of items) {
    if (item.active === false) continue;
    const day = recurringWeekday(item);
    if (day === null) {
      flexible.push(item);
      continue;
    }
    const list = buckets.get(day) ?? [];
    list.push(item);
    buckets.set(day, list);
  }
  const groups = [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([day, list]) => ({
      weekday: WEEKDAY_LABELS[day] ?? "Weekly",
      items: list.sort((a, b) => a.title.localeCompare(b.title)),
    }));
  if (flexible.length > 0) {
    groups.push({ weekday: "Flexible", items: flexible.sort((a, b) => a.title.localeCompare(b.title)) });
  }
  return groups;
}

export function upcomingDates(item: RecurringItem, now: Date, limit = 8): string[] {
  const today = chicagoYmd(now);
  return [...item.next_dates]
    .map((value) => value.trim())
    .filter((value) => /^\d{4}-\d{2}-\d{2}/.test(value) && value.slice(0, 10) >= today)
    .sort((a, b) => a.localeCompare(b))
    .slice(0, limit);
}

export function recurringOnDate(items: RecurringItem[], city: string, date: string): RecurringItem[] {
  return items
    .filter((item) => item.active !== false && recurringCitySlug(item) === city && item.next_dates.some((value) => value.slice(0, 10) === date))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function seriesAsEvent(item: RecurringItem, start: string): EventData {
  const venue = recurringPlace(item.venue);
  const address = recurringPlace(item.address);
  return eventSchema.parse({
    id: item.id,
    slug: seriesSlug(item),
    title: item.title,
    start,
    timezone: "America/Chicago",
    ...(venue ? { venue } : {}),
    ...(address ? { address } : {}),
    city: item.city?.trim() || cityDisplayName(recurringCitySlug(item)),
    categories: item.categories,
    source_urls: item.url?.trim() ? [item.url.trim()] : [],
    description: recurringWhen(item),
  });
}

/** Markets use the hours action label. Everything else uses the details label. */
export function seriesAction(item: RecurringItem): { label: string; href: string } | null {
  const href = item.url?.trim() ?? "";
  if (!href) return null;
  const market = /market/i.test(`${item.title} ${item.categories.join(" ")}`);
  const event = seriesAsEvent(item, "2026-01-01");
  event.action_type = market ? "hours" : "details";
  event.source_urls = [href];
  const action = eventAction(event);
  return action.href ? { label: action.label, href: action.href } : null;
}

export function seriesMapsUrl(item: RecurringItem): string {
  const city = item.city?.trim() || cityDisplayName(recurringCitySlug(item));
  const query = [recurringPlace(item.venue), recurringPlace(item.address), city, "MO"].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function formatSeriesDate(value: string): string {
  const day = value.slice(0, 10);
  const heading = `${formatDayHeading(day)}, ${day.slice(0, 4)}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return heading;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return heading;
  const clock = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  }).format(new Date(time));
  return `${heading} · ${clock}`;
}

export function seriesMeta(items: RecurringItem[]): Map<string, { title: string; description: string }> {
  const meta = new Map<string, { title: string; description: string }>();
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  for (const item of items) {
    if (item.active === false) continue;
    const city = cityDisplayName(recurringCitySlug(item));
    let title = `${item.title} · Weekly in ${city} | 417 Local`;
    if (titles.has(title)) title = `${item.title} (${seriesSlug(item)}) · Weekly in ${city} | 417 Local`;
    titles.add(title);
    const when = recurringWhen(item);
    const venue = recurringPlace(item.venue);
    let description = `Recurring in ${city}, MO: ${item.title}${when ? `. ${when}` : ""}${venue ? ` at ${venue}` : ""}.`;
    if (descriptions.has(description)) description = `${description} (${seriesSlug(item)})`;
    descriptions.add(description);
    meta.set(item.id, { title, description });
  }
  return meta;
}

export function assertUniqueSeriesPaths(items: RecurringItem[]): void {
  const seen = new Map<string, string>();
  for (const item of items) {
    if (item.active === false) continue;
    const path = seriesPath(item);
    const previous = seen.get(path);
    if (previous) throw new Error(`Two series share ${path}: ${previous} and ${item.id}`);
    seen.set(path, item.id);
  }
}

export function seriesIcsBody(item: RecurringItem, now = new Date()): string | null {
  const [start] = upcomingDates(item, now, 1);
  if (!start) return null;
  return buildEventIcs(seriesAsEvent(item, start), { pageUrl: absoluteUrl(seriesPath(item)) });
}

export function seriesGoogleUrl(item: RecurringItem, now = new Date()): string | null {
  const [start] = upcomingDates(item, now, 1);
  if (!start) return null;
  return googleCalendarUrl(seriesAsEvent(item, start), { pageUrl: absoluteUrl(seriesPath(item)) });
}
