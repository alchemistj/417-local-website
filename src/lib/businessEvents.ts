import { NETWORKING_GROUPS, type NetworkingGroup } from "../data/networkingGroups";
import { businessGroupPath, businessHubPath, businessNichePath, cityStateSlug } from "./businessPaths";
import type { StaticPageMeta } from "../data/staticPages";
import { cityDisplayName, eventCitySlug } from "./eventPaths";
import type { EventData } from "./eventSchema";
import { isUpcoming, sortByStart } from "./events";
import type { RouteEntry } from "./routes";
import { B2B_NICHES, classifyEvent, type B2bNiche } from "./eventTaxonomy";

/** A niche page is indexed with this many upcoming events, or with a group guide. */
export const NICHE_MIN_EVENTS = 3;

interface NicheCopy {
  /** Page name before "in City, ST". Also the H1. */
  stem: string;
  /** Short label for navigation and breadcrumbs. */
  label: string;
  /** One sentence for the meta description, before the city. */
  blurb: string;
  intro: string;
}

export const NICHE_COPY: Record<B2bNiche, NicheCopy> = {
  networking: {
    stem: "Business Networking Events",
    label: "Networking",
    blurb: "Upcoming business networking events",
    intro: "Meet other professionals and business owners at networking events. Below are the events coming up, then the groups that meet every week or month.",
  },
  "chamber-of-commerce": {
    stem: "Chamber of Commerce Events",
    label: "Chamber of Commerce",
    blurb: "Upcoming chamber of commerce events, mixers and member gatherings",
    intro: "Chamber events are where members meet, network and hear what is happening in the local business community. These are the chamber events coming up.",
  },
  "small-business-and-entrepreneurs": {
    stem: "Small Business & Startup Events",
    label: "Small business and entrepreneurs",
    blurb: "Upcoming events for small-business owners, entrepreneurs and startups",
    intro: "Events for small-business owners, entrepreneurs and startup founders: meetups, sessions and groups built around running a business.",
  },
  "tech-and-developers": {
    stem: "Tech & Developer Meetups",
    label: "Tech and developers",
    blurb: "Upcoming tech and developer meetups, code nights and community events",
    intro: "Meetups for developers, designers and people who work in technology, from regular code nights to holiday parties.",
  },
  ai: {
    stem: "AI Meetups and Events",
    label: "AI",
    blurb: "Upcoming AI meetups and events for builders, business owners and the curious",
    intro: "Meetups and events about artificial intelligence, including groups that look at how AI fits a particular line of work.",
  },
  "real-estate": {
    stem: "Real Estate Agent Events",
    label: "Real estate",
    blurb: "Upcoming events for real estate agents and people starting in the field",
    intro: "Roundtables, masterminds and career events for real estate agents and the people thinking about becoming one.",
  },
  "healthcare-training": {
    stem: "Healthcare Training Courses",
    label: "Healthcare training",
    blurb: "Upcoming ACLS, BLS, NRP and other healthcare training courses and conferences",
    intro: "Certification and continuing-education courses for healthcare providers, such as ACLS, BLS and NRP, plus professional conferences.",
  },
  "certifications-and-training": {
    stem: "Certification & Training Classes",
    label: "Certifications and training",
    blurb: "Upcoming certification and professional training classes",
    intro: "Exam-prep and professional training classes, such as PMP, for people building their credentials.",
  },
  "women-in-business": {
    stem: "Women in Business Events",
    label: "Women in business",
    blurb: "Upcoming business and professional events for women",
    intro: "Networking and professional events built for women in business and in the professions.",
  },
  "faith-and-business": {
    stem: "Faith and Business Events",
    label: "Faith and business",
    blurb: "Upcoming faith and business luncheons and gatherings",
    intro: "Business luncheons and gatherings that bring faith and work together.",
  },
  marketing: {
    stem: "Marketing Meetups and Events",
    label: "Marketing",
    blurb: "Upcoming marketing meetups, workshops and events",
    intro: "Meetups and workshops on marketing, advertising and getting found online.",
  },
  "career-and-job-fairs": {
    stem: "Job Fairs and Career Events",
    label: "Career and job fairs",
    blurb: "Upcoming job fairs, career fairs and career nights",
    intro: "Job fairs, career fairs and career nights for people looking for work or a new field.",
  },
};

export function nicheLabel(niche: B2bNiche): string {
  return NICHE_COPY[niche].label;
}

/** The state of an event, as a two-letter code. The export leaves it blank for most events: that is Missouri. */
export function eventState(event: EventData): string {
  const raw = typeof event.state === "string" ? event.state.trim() : "";
  if (!raw) return "MO";
  if (raw.length === 2) return raw.toUpperCase();
  return raw.toLowerCase() === "missouri" ? "MO" : raw.slice(0, 2).toUpperCase();
}

/** `title`, with the site suffix added only when it keeps the title at 60 characters or fewer. */
export function withSiteSuffix(title: string, max = 60): string {
  const suffixed = `${title} | 417 Local`;
  return suffixed.length <= max ? suffixed : title;
}

export interface BusinessGroup {
  slug: string;
  name: string;
  /** The programs the group's source page describes. One entry for most groups. */
  entries: NetworkingGroup[];
  niches: B2bNiche[];
  events: EventData[];
  /** A verified site and an upcoming event, or a stated regular schedule. */
  indexable: boolean;
}

export interface BusinessNichePage {
  niche: B2bNiche;
  events: EventData[];
  groups: BusinessGroup[];
  indexable: boolean;
}

export interface BusinessCity {
  /** `springfield-mo`, the URL segment. */
  key: string;
  citySlug: string;
  state: string;
  cityName: string;
  events: EventData[];
  niches: BusinessNichePage[];
  groups: BusinessGroup[];
  indexable: boolean;
}

function groupsForCity(citySlug: string, state: string, upcoming: EventData[]): BusinessGroup[] {
  const bySlug = new Map<string, NetworkingGroup[]>();
  for (const entry of NETWORKING_GROUPS) {
    if (entry.citySlug !== citySlug || entry.state !== state) continue;
    bySlug.set(entry.slug, [...(bySlug.get(entry.slug) ?? []), entry]);
  }
  return [...bySlug.entries()].map(([slug, entries]) => {
    const events = upcoming.filter((event) => classifyEvent(event).groups.includes(slug));
    const verified = entries.every((entry) => entry.url.startsWith("https://") && entry.sourceUrl.startsWith("https://") && Boolean(entry.checkedOn));
    const scheduled = entries.some((entry) => Boolean(entry.when));
    return {
      slug,
      name: entries[0].groupName,
      entries,
      niches: [...new Set(entries.flatMap((entry) => entry.niches))].filter((niche): niche is B2bNiche => (B2B_NICHES as readonly string[]).includes(niche)),
      events,
      indexable: verified && (events.length >= 1 || scheduled),
    };
  });
}

/**
 * Every city with a B2B event or a group guide, with its niche and group pages. A niche page exists
 * when it has an upcoming event or a group. Cities with neither get no pages.
 */
export function businessCities(events: EventData[], now: Date): BusinessCity[] {
  const upcoming = sortByStart(events.filter((event) => isUpcoming(event, now) && classifyEvent(event).audience === "B2B"));
  const keys = new Map<string, { citySlug: string; state: string }>();
  for (const event of upcoming) {
    const citySlug = eventCitySlug(event);
    const state = eventState(event);
    keys.set(cityStateSlug(citySlug, state), { citySlug, state });
  }
  for (const group of NETWORKING_GROUPS) keys.set(cityStateSlug(group.citySlug, group.state), { citySlug: group.citySlug, state: group.state });

  const cities: BusinessCity[] = [];
  for (const [key, { citySlug, state }] of keys) {
    const cityEvents = upcoming.filter((event) => eventCitySlug(event) === citySlug && eventState(event) === state);
    const groups = groupsForCity(citySlug, state, cityEvents);
    const niches: BusinessNichePage[] = [];
    for (const niche of B2B_NICHES) {
      const nicheEvents = cityEvents.filter((event) => classifyEvent(event).niches.includes(niche));
      const nicheGroups = groups.filter((group) => group.niches.includes(niche));
      if (nicheEvents.length === 0 && nicheGroups.length === 0) continue;
      niches.push({ niche, events: nicheEvents, groups: nicheGroups, indexable: nicheEvents.length >= NICHE_MIN_EVENTS || nicheGroups.length > 0 });
    }
    cities.push({
      key,
      citySlug,
      state,
      cityName: cityDisplayName(citySlug),
      events: cityEvents,
      niches,
      groups,
      indexable: cityEvents.length >= NICHE_MIN_EVENTS || groups.length > 0,
    });
  }
  return cities.sort((a, b) => b.events.length - a.events.length || a.key.localeCompare(b.key));
}

export function businessCity(cities: BusinessCity[], key: string): BusinessCity | undefined {
  return cities.find((city) => city.key === key);
}

function place(city: BusinessCity): string {
  return `${city.cityName}, ${city.state}`;
}

export function hubMeta(city: BusinessCity): StaticPageMeta {
  return {
    path: businessHubPath(city.citySlug, city.state),
    title: withSiteSuffix(`Business Events in ${place(city)}`),
    description: `Upcoming business events in ${place(city)}: networking, chamber, tech, real estate, training and more, plus the groups behind them.`,
    label: "Business events",
    indexable: city.indexable,
  };
}

export function nicheMeta(city: BusinessCity, page: BusinessNichePage): StaticPageMeta {
  const copy = NICHE_COPY[page.niche];
  const tail = page.groups.length > 0 ? ", plus the groups that meet regularly" : "";
  return {
    path: businessNichePath(city.citySlug, city.state, page.niche),
    title: withSiteSuffix(`${copy.stem} in ${place(city)}`),
    description: `${copy.blurb} in ${place(city)}${tail}.`,
    label: copy.label,
    indexable: page.indexable,
  };
}

export function groupMeta(city: BusinessCity, group: BusinessGroup): StaticPageMeta {
  const what = group.entries[0].what;
  return {
    path: businessGroupPath(city.citySlug, city.state, group.slug),
    title: withSiteSuffix(`${group.name} in ${place(city)}`),
    description: `${what} See its next events and how to join.`.slice(0, 300),
    label: group.name,
    indexable: group.indexable,
  };
}

export function nicheH1(city: BusinessCity, niche: B2bNiche): string {
  return `${NICHE_COPY[niche].stem} in ${place(city)}`;
}

export function hubH1(city: BusinessCity): string {
  return `Business Events in ${place(city)}`;
}

/** The niche page a B2B event's breadcrumb points at: its first niche that has a page. */
export function eventNichePage(city: BusinessCity | undefined, event: EventData): BusinessNichePage | undefined {
  if (!city) return undefined;
  return classifyEvent(event).niches.map((niche) => city.niches.find((page) => page.niche === niche)).find(Boolean);
}

/** One route per hub, niche page and group page. Noindex pages stay out of the sitemap through `indexable`. */
export function businessEventRoutes(events: EventData[], now: Date): RouteEntry[] {
  const routes: RouteEntry[] = [];
  const push = (meta: StaticPageMeta) =>
    routes.push({ path: meta.path, type: "static", title: meta.title, description: meta.description, indexable: meta.indexable !== false, llms: meta.indexable !== false });
  for (const city of businessCities(events, now)) {
    push(hubMeta(city));
    for (const page of city.niches) push(nicheMeta(city, page));
    for (const group of city.groups) push(groupMeta(city, group));
  }
  return routes;
}
