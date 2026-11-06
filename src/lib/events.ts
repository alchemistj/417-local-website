import { BUSINESS_EVENT_CATEGORIES, type EventData } from "./eventSchema";

export const DEFAULT_TIMEZONE = "America/Chicago";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function endMs(event: EventData): number {
  const ref = event.end || event.start;
  const t = Date.parse(ref);
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return DATE_ONLY.test(ref) ? t + 24 * 60 * 60 * 1000 : t;
}

export function isUpcoming(event: EventData, now: Date): boolean {
  return endMs(event) >= now.getTime();
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

export function formatPrice(event: EventData): string {
  if (event.free) return "Free";
  const p = event.price;
  if (p === null || p === undefined || p === "") return "";
  if (typeof p === "number") return p === 0 ? "Free" : `$${p}`;
  if (typeof p === "string") return p;
  return "";
}
