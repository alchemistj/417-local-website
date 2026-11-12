import { createHash } from "node:crypto";
import { eventListTime } from "./calendarView";
import { categoryLabel } from "./eventPage";
import { eventCityName } from "./eventPaths";
import type { EventData } from "./eventSchema";
import { DEFAULT_TIMEZONE, isDateOnly, placeName, primaryCategory } from "./events";

/**
 * Muted category colors for the typographic card. White text on every stop
 * clears WCAG AA (4.5:1). Unknown categories use `neutral`.
 */
export const CARD_PALETTE_IDS = [
  "live-music",
  "arts-and-theater",
  "family",
  "holiday",
  "festivals",
  "sports",
  "outdoors",
  "community",
  "food-and-drink",
  "comedy",
  "film",
  "business",
  "neutral",
] as const;

export type CardPaletteId = (typeof CARD_PALETTE_IDS)[number];

export interface CardPalette {
  id: CardPaletteId;
  from: string;
  to: string;
  /** Solid tile color. Same family as the gradient, dark enough for white text. */
  solid: string;
}

export const CARD_PALETTES: Record<CardPaletteId, CardPalette> = {
  "live-music": { id: "live-music", from: "#5a3d52", to: "#3c2838", solid: "#4a3344" },
  "arts-and-theater": { id: "arts-and-theater", from: "#3d4566", to: "#2a314c", solid: "#343c5a" },
  family: { id: "family", from: "#2f5c58", to: "#1e3e3c", solid: "#274e4b" },
  holiday: { id: "holiday", from: "#3d5344", to: "#28382e", solid: "#334638" },
  festivals: { id: "festivals", from: "#6a4636", to: "#4a3024", solid: "#5a3c2e" },
  sports: { id: "sports", from: "#3a5166", to: "#283848", solid: "#324656" },
  outdoors: { id: "outdoors", from: "#4a5538", to: "#323a26", solid: "#3e482f" },
  community: { id: "community", from: "#3e5564", to: "#2a3b46", solid: "#344856" },
  "food-and-drink": { id: "food-and-drink", from: "#684536", to: "#472e24", solid: "#583b2e" },
  comedy: { id: "comedy", from: "#68404a", to: "#472b34", solid: "#583640" },
  film: { id: "film", from: "#454b58", to: "#2e333c", solid: "#3a404a" },
  business: { id: "business", from: "#3d4e5a", to: "#2a3640", solid: "#34424c" },
  neutral: { id: "neutral", from: "#4a5560", to: "#323a42", solid: "#3e474f" },
};

/** Kids shares the family palette. Business categories share one palette. */
const PALETTE_BY_CATEGORY: Record<string, CardPaletteId> = {
  "live-music": "live-music",
  "arts-and-theater": "arts-and-theater",
  family: "family",
  kids: "family",
  holiday: "holiday",
  festivals: "festivals",
  sports: "sports",
  outdoors: "outdoors",
  community: "community",
  "food-and-drink": "food-and-drink",
  comedy: "comedy",
  film: "film",
  networking: "business",
  entrepreneurship: "business",
  "professional-development": "business",
};

export function cardPaletteForCategory(slug: string | null | undefined): CardPalette {
  const id = (slug && PALETTE_BY_CATEGORY[slug]) || "neutral";
  return CARD_PALETTES[id];
}

export interface EventCardDate {
  month: string;
  day: string;
  weekday: string;
}

function cardZone(event: EventData): { date: Date; timeZone: string } | null {
  if (isDateOnly(event.start)) {
    const date = new Date(`${event.start}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? null : { date, timeZone: "UTC" };
  }
  const date = new Date(event.start);
  if (Number.isNaN(date.getTime())) return null;
  return { date, timeZone: event.timezone || DEFAULT_TIMEZONE };
}

/** Month, day number, and weekday for the card and the list tile. */
export function eventCardDate(event: EventData): EventCardDate {
  const zoned = cardZone(event);
  if (!zoned) return { month: "", day: "", weekday: "" };
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    weekday: "short",
    timeZone: zoned.timeZone,
  }).formatToParts(zoned.date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return { month: value("month"), day: value("day"), weekday: value("weekday") };
}

/** A clock time is listed. Date-only and `time_tbd` events have no time. */
export function eventCardHasTime(event: EventData): boolean {
  if (event.time_tbd === true) return false;
  if (isDateOnly(event.start) || !event.start.includes("T")) return false;
  return !Number.isNaN(Date.parse(event.start));
}

/** "Thu · 8:00 PM", or "Time TBD" when the event has no time. */
export function eventCardSchedule(event: EventData): string {
  if (!eventCardHasTime(event)) return "Time TBD";
  const { weekday } = eventCardDate(event);
  const time = eventListTime(event);
  return weekday ? `${weekday} · ${time}` : time;
}

export interface EventCardModel {
  palette: CardPalette;
  month: string;
  day: string;
  schedule: string;
  category: string;
  title: string;
  runLabel: string | null;
  price: string;
  venueName: string;
  cityName: string;
  venueLine: string;
}

export interface EventCardOptions {
  /** From `runRangeLabel`, such as "Nov 27–29". */
  runRange?: string | null;
  /** Header-only price line. The share image leaves this blank. */
  price?: string | null;
}

export function eventCardModel(event: EventData, options: EventCardOptions = {}): EventCardModel {
  const date = eventCardDate(event);
  const venueName = placeName(event.venue).replace(/\s+/g, " ").trim();
  const cityName = eventCityName(event);
  const range = options.runRange?.replace(/\s+/g, " ").trim();
  const slug = primaryCategory(event);
  return {
    palette: cardPaletteForCategory(slug),
    month: date.month,
    day: date.day,
    schedule: eventCardSchedule(event),
    category: slug ? categoryLabel(slug).toLocaleUpperCase("en-US") : "",
    title: event.title.replace(/\s+/g, " ").trim(),
    runLabel: range ? `Runs ${range}` : null,
    price: options.price?.replace(/\s+/g, " ").trim() ?? "",
    venueName,
    cityName,
    venueLine: [venueName, cityName].filter(Boolean).join(" · "),
  };
}

/** Every string the card paints, in reading order. */
export function eventCardText(model: EventCardModel): string[] {
  return [model.month, model.day, model.schedule, model.category, model.title, model.runLabel, model.price, model.venueLine].filter(
    (line): line is string => Boolean(line),
  );
}

/** Bump when the picture changes but the event fields do not. */
export const EVENT_CARD_RENDER_VERSION = "2";

/** Cache key for the share image. Price is header-only, so it is not part of the picture. */
export function eventCardCacheKey(model: EventCardModel): string {
  const payload = JSON.stringify({
    v: EVENT_CARD_RENDER_VERSION,
    month: model.month,
    day: model.day,
    schedule: model.schedule,
    category: model.category,
    title: model.title,
    runLabel: model.runLabel,
    venueLine: model.venueLine,
    from: model.palette.from,
    to: model.palette.to,
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 24);
}
