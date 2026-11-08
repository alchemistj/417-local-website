import { cityHubPage, cityWeekendPage, generalCategoryPage } from "../data/staticPages";
import { GENERAL_EVENT_CATEGORIES, isGeneralEventCategory, type EventData, type GeneralEventCategory } from "./eventSchema";
import {
  eventChicagoDate,
  isIndexableEvent,
  isListedEvent,
  isUpcoming,
  sortByStart,
} from "./events";
import { eventMetaDescription, eventPageTitle } from "./eventPage";
import { KNOWN_CITY_SLUGS, assertNoReservedEventSlug, assertUniqueEventPaths, eventCitySlug, eventPath } from "./eventPaths";
import type { RouteEntry } from "./routes";

function sortCitySlugs(slugs: Iterable<string>): string[] {
  const order = new Map<string, number>(KNOWN_CITY_SLUGS.map((slug, index) => [slug, index]));
  return [...slugs].sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99) || a.localeCompare(b));
}

export function citiesWithEvents(events: EventData[]): string[] {
  return sortCitySlugs(new Set(events.map((event) => eventCitySlug(event))));
}

function eventsInCity(events: EventData[], citySlug: string): EventData[] {
  return events.filter((event) => eventCitySlug(event) === citySlug);
}

/**
 * Category pages for a city that still has an event in that category.
 * An event stays listed until 30 days after its date, so the page does too.
 */
export function listedCategories(events: EventData[], now: Date): GeneralEventCategory[] {
  const listed = events.filter((event) => isListedEvent(event, now));
  return GENERAL_EVENT_CATEGORIES.filter((slug) => listed.some((event) => event.categories.includes(slug)));
}

/** City category pages. Empty categories are omitted. */
export function generalCategoryRoutes(events: EventData[], now: Date = new Date()): RouteEntry[] {
  const routes: RouteEntry[] = [];
  for (const city of citiesWithEvents(events)) {
    for (const slug of listedCategories(eventsInCity(events, city), now)) {
      const meta = generalCategoryPage(slug, city);
      routes.push({
        path: meta.path,
        type: "static",
        title: meta.title,
        description: meta.description,
        indexable: true,
      });
    }
  }
  return routes;
}

function cityHubRoutes(events: EventData[]): RouteEntry[] {
  return citiesWithEvents(events).map((city) => {
    const meta = cityHubPage(city);
    return { path: meta.path, type: "static" as const, title: meta.title, description: meta.description, indexable: true };
  });
}

function cityWeekendRoutes(events: EventData[]): RouteEntry[] {
  return citiesWithEvents(events).map((city) => {
    const meta = cityWeekendPage(city);
    return { path: meta.path, type: "static" as const, title: meta.title, description: meta.description, indexable: true };
  });
}

function eventPageRoutes(events: EventData[], now: Date): RouteEntry[] {
  return sortByStart(events).map((event) => {
    const updated = event.updated_at ? Date.parse(event.updated_at) : Number.NaN;
    return {
      path: eventPath(event),
      type: "event" as const,
      title: eventPageTitle(event),
      description: eventMetaDescription(event),
      lastmod: Number.isNaN(updated) ? eventChicagoDate(event) : new Date(updated).toISOString().slice(0, 10),
      indexable: isIndexableEvent(event, now),
      sitemap: isListedEvent(event, now),
      llms: isUpcoming(event, now),
    };
  });
}

/** City hubs, city category pages, This Weekend pages, and one route per event. */
export function eventSectionRoutes(events: EventData[], now: Date = new Date()): RouteEntry[] {
  assertNoReservedEventSlug(events);
  assertUniqueEventPaths(events);
  return [...cityHubRoutes(events), ...cityWeekendRoutes(events), ...generalCategoryRoutes(events, now), ...eventPageRoutes(events, now)];
}

export function categoryPagePath(citySlug: string, category: string): string | null {
  if (isGeneralEventCategory(category)) return generalCategoryPage(category, citySlug).path;
  return null;
}
