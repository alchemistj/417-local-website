import type { EventData } from "./eventSchema";
import { formatPrice, placeName } from "./events";
import { mapsSearchUrl } from "./eventPaths";

export interface EventActionLink {
  label: string;
  href: string;
}

export interface EventAction {
  /** Verb-first button label. */
  label: string;
  /** Main button destination. Empty when the export has nowhere to send the visitor. */
  href: string;
  /** Small second link, when this action type has one. */
  secondary?: EventActionLink;
  /** Door price, shown beside the button rather than as a link. */
  priceText?: string;
}

function clean(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function firstSource(event: EventData): string {
  return event.source_urls.find((url) => clean(url)) ?? "";
}

/** Registration link, then the first source URL. */
function registrationOrSource(event: EventData): string {
  return clean(event.registration_url) || firstSource(event);
}

/** Source URL, then registration, then the organizer site. */
function sourceLink(event: EventData): string {
  return firstSource(event) || clean(event.registration_url) || clean(event.organizer?.website);
}

function directions(event: EventData): EventActionLink {
  return { label: "Get directions", href: mapsSearchUrl(event) };
}

const TICKET_HOSTS = [
  "ticketmaster", "livenation", "axs.com", "etix", "eventbrite", "seetickets", "ticketweb", "tixr", "dice.fm",
  "showclix", "universe.com", "vbotickets", "ludus", "thundertix", "tix.com", "gillioz", "hammonshall",
  "missouristate.edu/tickets", "tickets.missouristate", "greatsouthernbankarena", "gsbarena", "landerstheatre",
  "springfieldlittletheatre", "springfieldsymphony",
];

/** Rooms that sell tickets for nearly everything they host. */
export const TICKETED_VENUES = [
  "gillioz theatre",
  "juanita k hammons hall",
  "great southern bank arena",
  "hammons field",
  "landers theatre",
  "springfield little theatre",
  "ozarks amphitheater",
  "shrine mosque",
  "old glory center",
  "springfield expo",
];

function normName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function priceString(event: EventData): string {
  const price = event.price;
  if (typeof price === "number") return price > 0 ? `$${price}` : "";
  if (typeof price === "string") return price;
  return "";
}

/** True when the event needs a ticket. Explicit is_free true is never ticketed. */
export function requiresTickets(event: EventData): boolean {
  if (event.is_free === true) return false;
  const price = priceString(event).trim();
  if (/\$\s*\d|tickets?\b/i.test(price)) return true;
  if (/^\d+(\.\d+)?$/.test(price) && Number(price) > 0) return true;
  const urls = [event.registration_url, ...event.source_urls].map((url) => clean(url).toLowerCase()).filter(Boolean);
  if (urls.some((url) => TICKET_HOSTS.some((host) => url.includes(host)))) return true;
  const venue = normName(placeName(event.venue));
  return venue !== "" && TICKETED_VENUES.some((name) => venue.includes(name));
}

/**
 * The one action-button map. Wording changes belong on the label lines below.
 * Outbound links are rendered with rel="noopener" and no new tab.
 */
export function eventAction(event: EventData): EventAction {
  const kind = clean(event.action_type) || (requiresTickets(event) ? "tickets" : "details");
  const maps = mapsSearchUrl(event);
  const source = sourceLink(event);

  switch (kind) {
    case "tickets":
      return { label: "Get tickets", href: registrationOrSource(event), secondary: directions(event) };
    case "register":
      return { label: "Register", href: registrationOrSource(event), secondary: directions(event) };
    case "rsvp":
      return { label: "RSVP", href: registrationOrSource(event), secondary: directions(event) };
    case "signup":
      return { label: "Sign up", href: registrationOrSource(event), secondary: directions(event) };
    case "show_up":
      return {
        label: "Get directions",
        href: maps,
        secondary: source ? { label: "Event details", href: source } : undefined,
      };
    case "door": {
      const priceText = formatPrice(event);
      return { label: "Get directions", href: maps, priceText: priceText || undefined };
    }
    case "hours":
      return { label: "See hours and vendors", href: source, secondary: directions(event) };
    default:
      return { label: "Event details", href: source, secondary: directions(event) };
  }
}
