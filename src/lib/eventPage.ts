import {
  BUSINESS_EVENT_CATEGORIES,
  GENERAL_EVENT_CATEGORY_LABELS,
  isGeneralEventCategory,
  type EventData,
} from "./eventSchema";
import { eventAction } from "./eventAction";
import { formatChicagoOffset, isAllDayEvent } from "./eventCalendar";
import { eventCardImagePath, eventCityName, eventCitySlug, eventPath } from "./eventPaths";
import { absoluteUrl } from "./site";
import {
  DEFAULT_TIMEZONE,
  eventChicagoDate,
  formatPrice,
  isDateOnly,
  isUpcoming,
  placeName,
  primaryCategory,
  sortByStart,
} from "./events";

const BRAND = " | 417 Local";

function chicagoParts(event: EventData): { date: Date; timeZone: string } {
  const timeZone = isDateOnly(event.start) ? "UTC" : event.timezone || DEFAULT_TIMEZONE;
  const value = isDateOnly(event.start) ? `${event.start}T00:00:00Z` : event.start;
  return { date: new Date(value), timeZone };
}

/** "Dec 19, 2026" in America/Chicago (date-only values stay on that calendar day). */
export function formatShortDate(event: EventData): string {
  const { date, timeZone } = chicagoParts(event);
  if (Number.isNaN(date.getTime())) return eventChicagoDate(event);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone,
  }).format(date);
}

/** "Sat, Dec 19, 2026 · 7:30 PM", or the date plus "Time not listed" when `time_tbd`. */
export function formatEventWhen(event: EventData): string {
  const { date, timeZone } = chicagoParts(event);
  if (Number.isNaN(date.getTime())) return event.start;
  const day = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone,
  }).format(date);
  if (isAllDayEvent(event)) return `${day} · Time not listed`;
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(date);
  return `${day} · ${time}`;
}

function normalizeSpace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** A period, question mark, or exclamation that ends a sentence, not "St." or "Q.". */
function lastSentenceEnd(text: string, max: number): number {
  let end = -1;
  const limit = Math.min(text.length, max);
  for (let i = 0; i < limit; i++) {
    const ch = text[i];
    if (ch !== "." && ch !== "!" && ch !== "?") continue;
    if (ch === "." && (text[i - 1] === "." || text[i + 1] === ".")) continue;
    const before = text.slice(0, i);
    if (ch === "." && /(?:^|\s)[A-Za-z]$/.test(before)) continue;
    if (ch === "." && /\b[A-Za-z]\.[A-Za-z]$/.test(before)) continue;
    if (ch === "." && /\b(?:Mr|Mrs|Ms|Dr|St|Jr|Sr|vs|etc)$/i.test(before)) continue;
    const rest = text.slice(i + 1);
    if (rest.length > 0 && !/^\s+[A-Z"“]/.test(rest)) continue;
    end = i + 1;
  }
  return end;
}

/**
 * Keep a meta description on a whole sentence, or a whole word when the first sentence
 * itself is longer than `max`. Never end on a cut-off ellipsis.
 */
function clampMeta(text: string, max = 155): string {
  const clean = normalizeSpace(text);
  if (clean.length <= max) return clean;
  const sentence = lastSentenceEnd(clean, max);
  if (sentence > 0) return clean.slice(0, sentence).trim();
  const cut = clean.slice(0, max + 1);
  const space = cut.lastIndexOf(" ");
  const words = (space > 0 ? cut.slice(0, space) : cut.slice(0, max)).replace(/[\s,;:–—-]+$/, "");
  return words;
}

/** "SPRINGFIELD SYMPHONY: A Holiday Christmas" -> "Springfield Symphony: A Holiday Christmas". Short all-caps words (MSU, SBC) stay. */
const KEEP_CAPS = new Set(["MSU", "SBC", "YMCA", "OTC", "USA", "NBA", "NFL", "BBQ", "DJ", "MO", "ICON", "JQH", "OC", "SGF"]);

export function tameShoutyTitle(title: string): string {
  const clean = title.replace(/\s+/g, " ").trim();
  const shouty = clean.match(/\b[A-Z][A-Z'’]{2,}\b/g)?.filter((word) => !KEEP_CAPS.has(word)) ?? [];
  // One capitalized acronym is normal; two or more all-caps words means the source is shouting.
  if (shouty.length < 2 && !shouty.some((word) => word.length >= 5)) return clean;
  return clean.replace(/\b[A-Z][A-Z'’]{2,}\b/g, (word) =>
    KEEP_CAPS.has(word) ? word : word.charAt(0) + word.slice(1).toLowerCase(),
  );
}

/** Cut at a word boundary, never mid-word. */
function clampWords(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s:–—,-]+$/, "")}…`;
}

/**
 * `{Title} in Springfield, MO · Dec 19, 2026 | 417 Local`, kept to 60 characters by dropping the city first, then
 * shortening the event name at a word boundary. The date and the brand always stay.
 */
export function eventPageTitle(event: EventData): string {
  const name = tameShoutyTitle(event.title);
  const tail = ` · ${formatShortDate(event)}${BRAND}`;
  const withCity = ` in ${eventCityName(event)}, MO${tail}`;
  if (name.length + withCity.length <= 60) return `${name}${withCity}`;
  if (name.length + tail.length <= 60) return `${name}${tail}`;
  return `${clampWords(name, 60 - tail.length)}${tail}`;
}

/** Meta description from the write-up, 155 characters or fewer, ending on a sentence or a word. */
export function eventMetaDescription(event: EventData): string {
  const writeup = event.description?.trim();
  if (writeup) return clampMeta(writeup);
  return clampMeta(
    `${event.title} in ${eventCityName(event)}, MO on ${formatShortDate(event)}. Confirm details with the organizer.`,
  );
}

function hasStateToken(text: string, state: string): boolean {
  if (/\bmissouri\b/i.test(text)) return true;
  if (!state) return false;
  return new RegExp(`\\b${escapeRegExp(state)}\\b`, "i").test(text);
}

/** A comma-separated piece that is the city itself, not a venue whose name starts with the city. */
function isCityPart(part: string, city: string): boolean {
  const value = part.trim().toLowerCase();
  const name = city.trim().toLowerCase();
  if (!name || !value.startsWith(name)) return false;
  const rest = value.slice(name.length).trim();
  if (!rest) return true;
  return /^(?:mo|missouri)?\s*\d{5}(?:-\d{4})?$/.test(rest) || /^(?:mo|missouri)$/.test(rest);
}

function isStatePart(part: string, state: string): boolean {
  const value = part.trim().toLowerCase();
  if (value === "us" || value === "usa" || value === "united states") return false;
  if (value === "missouri" || value.startsWith("missouri ")) return true;
  const token = state.trim().toLowerCase();
  return Boolean(token) && (value === token || value.startsWith(`${token} `));
}

/**
 * Drop a trailing ", City, ST" when that city was already named earlier in the line,
 * so the page does not read "Springfield, MO, Springfield, MO".
 */
function dropRepeatedTrailingLocality(line: string, city: string, state: string): string {
  const parts = line.split(",").map((part) => part.trim()).filter(Boolean);
  if (!city.trim() || parts.length < 2) return line;
  let end = parts.length;
  const cityCount = () => parts.slice(0, end).filter((part) => isCityPart(part, city)).length;
  while (cityCount() >= 2 && end > 1) {
    if (isStatePart(parts[end - 1] ?? "", state)) end -= 1;
    if (end > 0 && isCityPart(parts[end - 1] ?? "", city)) {
      end -= 1;
      continue;
    }
    break;
  }
  return parts.slice(0, end).join(", ");
}

/**
 * Venue plus street address, with the city and state added only when the address
 * does not already include them. The venue is left off when the address already starts with it.
 */
export function eventPlaceLine(venue: string, address: string, city: string, state: string): string {
  const place = normalizeSpace(venue);
  const street = normalizeSpace(address).replace(/\s+,/g, ",").replace(/,\s*/g, ", ");
  const cityName = city.trim();
  const stateName = state.trim();
  let line = street;
  const hasCity = Boolean(cityName) && line.toLowerCase().includes(cityName.toLowerCase());
  const hasState = hasStateToken(line, stateName);
  if (!hasCity && !hasState && (cityName || stateName)) {
    const locality = [cityName, stateName].filter(Boolean).join(", ");
    line = line ? `${line}, ${locality}` : locality;
  } else if (hasCity && !hasState && stateName) {
    line = line ? `${line}, ${stateName}` : stateName;
  } else if (!hasCity && hasState && cityName) {
    line = line ? `${line}, ${cityName}` : cityName;
  }
  if (place && !line.toLowerCase().includes(place.toLowerCase())) {
    line = line ? `${place}, ${line}` : place;
  }
  return dropRepeatedTrailingLocality(line, cityName, stateName);
}

export function categoryLabel(slug: string): string {
  if (isGeneralEventCategory(slug)) return GENERAL_EVENT_CATEGORY_LABELS[slug];
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function isBusinessCategory(slug: string): boolean {
  return (BUSINESS_EVENT_CATEGORIES as readonly string[]).includes(slug);
}

function dayNumber(ymd: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86_400_000;
}

/** Other events in the same city whose Chicago date is within 3 days of this one. */
export function nearbyEvents(event: EventData, events: EventData[], now: Date, limit = 4): EventData[] {
  const origin = dayNumber(eventChicagoDate(event));
  const city = eventCitySlug(event);
  if (origin === null) return [];
  return sortByStart(
    events.filter((other) => {
      if (other.id === event.id || eventCitySlug(other) !== city || !isUpcoming(other, now)) return false;
      const day = dayNumber(eventChicagoDate(other));
      return day !== null && Math.abs(day - origin) <= 3;
    }),
  ).slice(0, limit);
}

/** Upcoming events in the same city and category, skipping any already chosen. */
export function moreInCategory(event: EventData, events: EventData[], now: Date, skip: EventData[] = [], limit = 4): EventData[] {
  const category = primaryCategory(event);
  if (!category) return [];
  const city = eventCitySlug(event);
  const skipped = new Set([event.id, ...skip.map((item) => item.id)]);
  return sortByStart(
    events.filter((other) => other.categories.includes(category) && eventCitySlug(other) === city && !skipped.has(other.id) && isUpcoming(other, now)),
  ).slice(0, limit);
}

/** Up to 4 upcoming events at the same venue, filled out with the same category. */
export function relatedUpcoming(event: EventData, events: EventData[], now: Date, limit = 4): EventData[] {
  const city = eventCitySlug(event);
  const venue = placeName(event.venue).trim().toLowerCase();
  const category = primaryCategory(event);
  const upcoming = events.filter((other) => other.id !== event.id && eventCitySlug(other) === city && isUpcoming(other, now));
  const sameVenue = venue ? upcoming.filter((other) => placeName(other.venue).trim().toLowerCase() === venue) : [];
  const sameCategory = category
    ? upcoming.filter((other) => other.categories.includes(category) && !sameVenue.includes(other))
    : [];
  return sortByStart([...sameVenue, ...sameCategory]).slice(0, limit);
}

export function sourceCredit(event: EventData): string {
  const organizer = event.organizer?.name?.trim();
  let from = organizer || "";
  if (!from) {
    const url = event.source_urls.find((item) => item.trim()) || event.registration_url || event.organizer?.website || "";
    if (url) {
      try {
        from = new URL(url).hostname.replace(/^www\./, "");
      } catch {
        from = "";
      }
    }
  }
  if (!from) from = "the organizer";
  return `Details from ${from}. Confirm times and tickets with the organizer before you go.`;
}

/** A number when the export states one, including 0 for a free listing. Null when the price is unknown. */
export function knownPriceAmount(event: EventData): number | null {
  if (typeof event.price === "number" && Number.isFinite(event.price)) return event.price;
  if (typeof event.price === "string") {
    const text = event.price.trim();
    if (/^free$/i.test(text)) return 0;
    if (/^0+(?:\.0+)?$/.test(text)) return 0;
    const match = text.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
    if (match) return Number(match[1]);
  }
  if (event.is_free === true || event.free === true) return 0;
  return null;
}

function timedStart(event: EventData): Date | null {
  if (isAllDayEvent(event) || isDateOnly(event.start)) return null;
  const time = Date.parse(event.start);
  return Number.isNaN(time) ? null : new Date(time);
}

function jsonLdEnd(event: EventData, start: Date | null): string | undefined {
  if (isAllDayEvent(event)) {
    const day = eventChicagoDate(event);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
    if (!match) return undefined;
    const next = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + 1));
    return next.toISOString().slice(0, 10);
  }
  if (event.end && !isDateOnly(event.end)) {
    const time = Date.parse(event.end);
    if (!Number.isNaN(time)) return formatChicagoOffset(new Date(time));
  }
  if (!start) return undefined;
  return formatChicagoOffset(new Date(start.getTime() + 2 * 60 * 60 * 1000));
}

export function eventJsonLd(event: EventData): Record<string, unknown> {
  const path = eventPath(event);
  const pageUrl = absoluteUrl(path);
  const start = timedStart(event);
  const startDate = start ? formatChicagoOffset(start) : eventChicagoDate(event);
  const city = (typeof event.city === "string" && event.city.trim()) || eventCityName(event);
  const state = (typeof event.state === "string" && event.state.trim()) || "MO";
  const venue = placeName(event.venue);
  const address = placeName(event.address);
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate,
    endDate: jsonLdEnd(event, start),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: pageUrl,
    description: event.description?.trim() || eventMetaDescription(event),
    location: {
      "@type": "Place",
      ...(venue ? { name: venue } : {}),
      address: {
        "@type": "PostalAddress",
        ...(address ? { streetAddress: address } : {}),
        addressLocality: city,
        addressRegion: state,
        addressCountry: "US",
      },
    },
  };
  data.image = absoluteUrl(eventCardImagePath(event));
  const organizer = event.organizer?.name?.trim();
  if (organizer) {
    data.organizer = {
      "@type": "Organization",
      name: organizer,
      ...(event.organizer?.website?.trim() ? { url: event.organizer.website.trim() } : {}),
    };
  }
  const price = knownPriceAmount(event);
  const offerUrl = eventAction(event).href;
  if (price !== null && offerUrl) {
    data.offers = {
      "@type": "Offer",
      price: String(price),
      priceCurrency: "USD",
      url: offerUrl,
      availability: "https://schema.org/InStock",
    };
  }
  if (!data.endDate) delete data.endDate;
  return data;
}

export function eventBreadcrumbLd(crumbs: { name: string; path: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

/** Price text for the page. Blank when the export does not state one. */
export function eventPriceText(event: EventData): string {
  return formatPrice(event);
}
