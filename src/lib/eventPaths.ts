import { BUSINESS_EVENT_CATEGORIES, GENERAL_EVENT_CATEGORIES, type EventData } from "./eventSchema";
import { eventChicagoDate, placeName } from "./events";

/** Cities the 417 hub names even before each one has events. */
export const KNOWN_CITY_SLUGS = ["springfield", "republic", "joplin"] as const;

const CITY_NAMES: Record<string, string> = {
  springfield: "Springfield",
  republic: "Republic",
  joplin: "Joplin",
};

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function cityDisplayName(slug: string): string {
  return CITY_NAMES[slug] ?? slug.split("-").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

/** `city_slug` from the export, otherwise a slug of the city, otherwise Springfield. */
export function eventCitySlug(event: EventData): string {
  const provided = event.city_slug?.trim();
  if (provided) return provided;
  const city = typeof event.city === "string" ? cityText(event.city) : "";
  return city ? slugify(city) : "springfield";
}

export function eventCityName(event: EventData): string {
  return cityDisplayName(eventCitySlug(event));
}

/** `public_slug` from the export, otherwise `{slug}-{yyyy-mm-dd}` using the Chicago start date. */
export function eventPublicSlug(event: EventData): string {
  const provided = event.public_slug?.trim();
  if (provided) return provided;
  const date = eventChicagoDate(event) || event.start.slice(0, 10);
  return `${event.slug}-${date}`;
}

function withTrailingSlash(path: string): string {
  const trimmed = path.trim();
  const prefixed = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return prefixed.endsWith("/") ? prefixed : `${prefixed}/`;
}

/** `path` from the export, otherwise `/events/{city_slug}/{public_slug}/`. */
export function eventPath(event: EventData): string {
  const provided = event.path?.trim();
  if (provided) return withTrailingSlash(provided);
  return `/events/${eventCitySlug(event)}/${eventPublicSlug(event)}/`;
}

/** The `[city]` and `[event]` params for an event page. The path wins when the export set one. */
export function eventRouteParams(event: EventData): { city: string; event: string } {
  const parts = eventPath(event).split("/").filter(Boolean);
  if (parts[0] === "events" && parts[1] && parts[2]) return { city: parts[1], event: parts[2] };
  return { city: eventCitySlug(event), event: eventPublicSlug(event) };
}

export function reservedEventSlugs(events: EventData[] = []): Set<string> {
  const cities = new Set<string>(KNOWN_CITY_SLUGS);
  for (const event of events) cities.add(eventCitySlug(event));
  return new Set([
    "springfield-business-events",
    "this-weekend",
    "weekly",
    "monthly",
    ...GENERAL_EVENT_CATEGORIES,
    ...BUSINESS_EVENT_CATEGORIES,
    ...cities,
  ]);
}

/** Fails the build when an event slug would take a city, category, or other reserved address. */
export function assertNoReservedEventSlug(events: EventData[]): void {
  const reserved = reservedEventSlugs(events);
  const collisions: string[] = [];
  for (const event of events) {
    const slug = eventRouteParams(event).event;
    if (reserved.has(slug)) collisions.push(`${event.id} (${slug})`);
  }
  if (collisions.length > 0) {
    throw new Error(`Event slug collides with a reserved address: ${collisions.join(", ")}`);
  }
}

export function assertUniqueEventPaths(events: EventData[]): void {
  const seen = new Map<string, string>();
  for (const event of events) {
    const path = eventPath(event);
    const previous = seen.get(path);
    if (previous) throw new Error(`Two events share ${path}: ${previous} and ${event.id}`);
    seen.set(path, event.id);
  }
}

function cityText(value: string): string {
  return value.trim();
}

/** Google Maps search for the venue and address. */
export function mapsSearchUrl(event: EventData): string {
  const city = (typeof event.city === "string" && event.city.trim()) || eventCityName(event);
  const state = (typeof event.state === "string" && event.state.trim()) || "MO";
  const query = [placeName(event.venue), placeName(event.address), city, state].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export interface VenuePost {
  slug: string;
  title: string;
}

/**
 * A blog post whose title or slug is the venue itself. Mentions inside a longer guide do not count.
 * Returns the post path, or null when we should link the venue name to Google Maps instead.
 */
export function venueGuidePath(venue: string, posts: VenuePost[]): string | null {
  const name = venue.trim();
  const slug = slugify(name);
  if (!name || !slug) return null;
  const lower = name.toLowerCase();
  const hit = posts.find((post) => {
    if (post.slug === slug || post.slug.startsWith(`${slug}-`)) return true;
    const title = post.title.trim().toLowerCase();
    return title === lower || title.startsWith(`${lower} `) || title.startsWith(`${lower},`) || title.startsWith(`${lower}:`) || title.startsWith(`${lower} (`);
  });
  return hit ? `/${hit.slug}/` : null;
}

/** Current export wins over the archive when both contain the same event id. */
export function mergeEvents(archived: EventData[], current: EventData[]): EventData[] {
  const byId = new Map<string, EventData>();
  for (const event of archived) byId.set(event.id, event);
  for (const event of current) byId.set(event.id, event);
  return [...byId.values()];
}
