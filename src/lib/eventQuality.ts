import type { EventData } from "./eventSchema";
import { eventChicagoDate } from "./events";

/**
 * Site-side junk filter. The event JSON is robot data and is never edited; these rules decide what the
 * site lists. A hidden event keeps its own page (noindex) but leaves every list and the sitemap.
 */
export type JunkReason = "store-promo" | "resort-guests" | "online-only" | "duplicate";

function venueText(event: EventData): string {
  const part = (value: EventData["venue"]) => (!value ? "" : typeof value === "string" ? value : value.name ?? "");
  return `${part(event.venue)} ${part(event.address)}`;
}

function norm(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const SOFT_PROMO = /\bblack friday\b|\bcyber monday\b/i;
const PROMO_TITLE = /\bdoorbusters?\b|\bbargains?\b|\bclearance\b|\d+\s*%\s*off|\bpercent off\b|\b(?:flash|yard|bake|moving|estate|warehouse|holiday|christmas|winter|fall|spring|summer)\s+sale\b|\bsale\b/i;
const DISTRICT = /\b(?:downtown|district|weekend|c-street|historic|square|main street|old town)\b/i;
const SMALL_BIZ = /small business saturday/i;

/** A store promo (Black Friday bargains, % off, doorbusters, a single shop's Small Business Saturday). */
export function isStorePromo(event: EventData): boolean {
  const title = event.title;
  if (SMALL_BIZ.test(title)) return !DISTRICT.test(title);
  if (PROMO_TITLE.test(title)) return true;
  if (!SOFT_PROMO.test(title)) return false;
  // A gig that happens to fall on Black Friday is still a show.
  return !/\b(?:with|presents|live|concert|band|tour)\b/i.test(title);
}

/** Softer holiday shopping promos (Small Business Saturday, Black Friday) that survive the junk filter, for pick scoring. */
export function isHolidayStorePromo(event: EventData): boolean {
  return /small business|black friday|shop (?:local|small)|shopping/i.test(event.title);
}

const RESORT_TEXT = /big cedar|top of the rock|wilderness club|\bridgedale\b/i;
const GUEST_ONLY = /\b(?:resort|registered|lodge|hotel|overnight|in-house|staying)\s+guests\b|\bguests only\b|\bguest-only\b|\bexclusive to guests\b/i;

/** Big Cedar Lodge programming and other resort guest-only activities. */
export function isResortGuestEvent(event: EventData): boolean {
  const venue = venueText(event);
  const all = `${event.title} ${venue} ${event.description ?? ""} ${event.city ?? ""}`;
  if (RESORT_TEXT.test(all)) return true;
  return GUEST_ONLY.test(`${venue} ${event.description ?? ""}`);
}

const ONLINE_PLACE = /\b(?:zoom|virtual|webinar|online)\b/i;
const ONLINE_DESC = /\bzoom\b|\bwebinars?\b|\bvirtual (?:session|event|meeting|class|workshop|summit|conference)\b|\bonline (?:session|only|event|class|workshop|webinar|meeting)\b|\blivestream(?:ed)? only\b|\bheld online\b/i;

/** Online-only events and webinars. They are not local things to do. */
export function isOnlineOnly(event: EventData): boolean {
  if (ONLINE_PLACE.test(`${event.title} ${venueText(event)}`)) return true;
  return ONLINE_DESC.test(event.description ?? "");
}

function withoutDuplicateCheck(event: EventData): JunkReason | null {
  if (isStorePromo(event)) return "store-promo";
  if (isResortGuestEvent(event)) return "resort-guests";
  if (isOnlineOnly(event)) return "online-only";
  return null;
}

function citySlug(event: EventData): string {
  return norm(event.city_slug ?? event.city ?? "");
}

function keepRank(event: EventData): number {
  return (event.time_tbd || /^\d{4}-\d{2}-\d{2}$/.test(event.start) ? 0 : 2) + (venueText(event).trim() ? 1 : 0);
}

/** Reason each hidden event is hidden, keyed by event id. */
export function junkReasons(events: EventData[]): Map<string, JunkReason> {
  const reasons = new Map<string, JunkReason>();
  const best = new Map<string, EventData>();
  for (const event of events) {
    const own = withoutDuplicateCheck(event);
    if (own) {
      reasons.set(event.id, own);
      continue;
    }
    const key = `${norm(event.title)}|${eventChicagoDate(event)}|${citySlug(event)}`;
    const current = best.get(key);
    if (!current) {
      best.set(key, event);
    } else if (keepRank(event) > keepRank(current)) {
      reasons.set(current.id, "duplicate");
      best.set(key, event);
    } else {
      reasons.set(event.id, "duplicate");
    }
  }
  return reasons;
}

export function filterJunk(events: EventData[]): EventData[] {
  const reasons = junkReasons(events);
  return events.filter((event) => !reasons.has(event.id));
}

const SMALL_WORDS = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "in", "of", "on", "or", "the", "to", "vs", "with"]);
const KEEP_UPPER = new Set(["bbq", "dj", "kc", "mo", "msu", "usa", "vip", "tv", "pbs", "sgf", "ozarks", "lgbtq", "ymca", "ffa", "pta", "aaa", "nfl", "nba", "uso", "ii", "iii", "iv"]);

function titleCaseWord(word: string, first: boolean): string {
  const lower = word.toLowerCase();
  if (/\d/.test(word)) return word;
  if (KEEP_UPPER.has(lower) && lower !== "ozarks") return word.toUpperCase();
  if (!first && SMALL_WORDS.has(lower)) return lower;
  return lower.replace(/(^|['’\-])([a-z])/g, (_m, pre: string, ch: string) => (pre === "'" || pre === "’" ? pre + ch : pre + ch.toUpperCase()));
}

function isAllCaps(title: string): boolean {
  if (/[a-z]/.test(title)) return false;
  return /[A-Z]{4,}/.test(title);
}

/** Display title: no emoji, no repeated punctuation, ALL CAPS to Title Case. Slugs and URLs never change. */
export function displayTitle(title: string): string {
  let text = title
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Modifier}\u200d\ufe0f\u20e3]/gu, " ")
    .replace(/[.…]{2,}/g, ".")
    .replace(/([!?,;:*~_=–—-])\1+/g, "$1")
    .replace(/([!?])[!?]+/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[\s,;:*~_=–—-]+$/g, "")
    .trim();
  if (isAllCaps(text)) {
    let first = true;
    text = text.replace(/[A-Za-z0-9][A-Za-z0-9'’]*/g, (word) => {
      const out = titleCaseWord(word, first);
      first = false;
      return out;
    });
  }
  return text || title.trim();
}

/** The event with its display title. The slug, path and id are untouched. */
export function withDisplayTitle(event: EventData): EventData {
  const title = displayTitle(event.title);
  return title === event.title ? event : { ...event, title };
}
