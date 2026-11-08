import {
  BUSINESS_EVENT_CATEGORIES,
  GENERAL_EVENT_CATEGORY_LABELS,
  isGeneralEventCategory,
  type EventData,
} from "./eventSchema";
import { eventAction } from "./eventAction";
import { formatChicagoOffset, isAllDayEvent } from "./eventCalendar";
import { eventCityName, eventCitySlug, eventPath } from "./eventPaths";
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

function clampText(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

/** `{Title} in Springfield, MO · Dec 19, 2026 | 417 Local`, shortened to 60 characters. */
export function eventPageTitle(event: EventData): string {
  const tail = ` in ${eventCityName(event)}, MO · ${formatShortDate(event)}${BRAND}`;
  const budget = 60 - tail.length;
  let name = event.title.replace(/\s+/g, " ").trim();
  if (budget < 1) return clampText(`${formatShortDate(event)}${BRAND}`, 60);
  if (name.length > budget) {
    name = `${name.slice(0, Math.max(1, budget - 1)).trimEnd()}…`;
    if (name.length > budget) name = `${name.slice(0, Math.max(1, budget - 1)).trimEnd()}…`;
  }
  return `${name}${tail}`;
}

/** Meta description from the write-up, 155 characters or fewer. */
export function eventMetaDescription(event: EventData): string {
  const writeup = event.description?.trim();
  if (writeup) return clampText(writeup, 155);
  return clampText(
    `${event.title} in ${eventCityName(event)}, MO on ${formatShortDate(event)}. Confirm details with the organizer.`,
    155,
  );
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
  const image = event.image_url?.trim();
  // WordPress and Supabase URLs are hotlinks. The rest of the site does not publish them.
  if (image && !/wp-content|supabase\.co/i.test(image)) data.image = image;
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
