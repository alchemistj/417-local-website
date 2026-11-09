import { cityHubPage, cityWeekendPage, generalCategoryPage } from "../data/staticPages";
import {
  builtMonths,
  dayPageDates,
  dayPageDescription,
  dayPageTitle,
  eventsOnDate,
  monthPageModel,
} from "./calendarView";
import { GENERAL_EVENT_CATEGORIES, GENERAL_EVENT_CATEGORY_LABELS, isGeneralEventCategory, type EventData, type GeneralEventCategory } from "./eventSchema";
import {
  eventChicagoDate,
  isIndexableEvent,
  isListedEvent,
  isUpcoming,
  sortByStart,
} from "./events";
import { eventMetaDescription, eventPageTitle } from "./eventPage";
import { KNOWN_CITY_SLUGS, assertNoReservedEventSlug, assertUniqueEventPaths, cityDisplayName, eventCitySlug, eventPath } from "./eventPaths";
import { assertUniqueSeriesPaths, recurringOnDate, seriesMeta, seriesPath, type RecurringItem } from "./recurring";
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
 * Category pages for a city that has an upcoming event in that category.
 * A passed event stays on its own page and in the sitemap, and drops off the lists.
 */
export function listedCategories(events: EventData[], now: Date): GeneralEventCategory[] {
  const upcoming = events.filter((event) => isUpcoming(event, now));
  return GENERAL_EVENT_CATEGORIES.filter((slug) => upcoming.some((event) => event.categories.includes(slug)));
}

export interface EventChip {
  label: string;
  href: string;
  current: boolean;
}

/** All events, then each category with an upcoming event, then business events. */
export function eventChips(city: string, events: EventData[], now: Date, currentPath: string): EventChip[] {
  const cityEvents = events.filter((event) => eventCitySlug(event) === city);
  const chips: EventChip[] = [
    { label: "All events", href: `/events/${city}/`, current: false },
    ...listedCategories(cityEvents, now).map((slug) => ({
      label: GENERAL_EVENT_CATEGORY_LABELS[slug],
      href: `/events/${city}/${slug}/`,
      current: false,
    })),
    { label: "Business events", href: "/events/springfield-business-events/", current: false },
  ];
  return chips.map((chip) => ({ ...chip, current: chip.href === currentPath }));
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

function calendarRoutes(events: EventData[], recurring: RecurringItem[], now: Date): RouteEntry[] {
  const routes: RouteEntry[] = [];
  for (const city of citiesWithEvents(events)) {
    for (const month of builtMonths(now)) {
      const model = monthPageModel(city, month.year, month.month, events, recurring, now);
      routes.push({ path: model.path, type: "static", title: model.title, description: model.description, indexable: true });
    }
  }
  return routes;
}

function dayRoutes(events: EventData[], recurring: RecurringItem[], now: Date): RouteEntry[] {
  const routes: RouteEntry[] = [];
  for (const city of citiesWithEvents(events)) {
    const name = cityDisplayName(city);
    for (const date of dayPageDates(city, events, recurring, now)) {
      const dayEvents = eventsOnDate(events, city, date, now);
      const weekly = recurringOnDate(recurring, city, date).map((item) => item.title);
      routes.push({
        path: `/events/${city}/${date}/`,
        type: "static",
        title: dayPageTitle(name, date),
        description: dayPageDescription(name, date, dayEvents, weekly),
        indexable: true,
        llms: false,
      });
    }
  }
  return routes;
}

function weeklyIndexRoutes(events: EventData[]): RouteEntry[] {
  return citiesWithEvents(events).map((city) => {
    const name = cityDisplayName(city);
    return {
      path: `/events/${city}/weekly/`,
      type: "static" as const,
      title: `Weekly Happenings in ${name}, MO | 417 Local`,
      description: `Weekly happenings in ${name}, MO: markets, trivia, classes and other recurring events.`,
      indexable: true,
    };
  });
}

function seriesRoutes(recurring: RecurringItem[]): RouteEntry[] {
  assertUniqueSeriesPaths(recurring);
  const meta = seriesMeta(recurring);
  const routes: RouteEntry[] = [];
  for (const item of recurring) {
    if (item.active === false) continue;
    const info = meta.get(item.id);
    if (!info) continue;
    routes.push({ path: seriesPath(item), type: "static", title: info.title, description: info.description, indexable: true });
  }
  return routes;
}

/** City hubs, calendars, day pages, category pages, weekly happenings, and one route per event. */
export function eventSectionRoutes(events: EventData[], now: Date = new Date(), recurring: RecurringItem[] = []): RouteEntry[] {
  assertNoReservedEventSlug(events);
  assertUniqueEventPaths(events);
  return [
    ...cityHubRoutes(events),
    ...cityWeekendRoutes(events),
    ...generalCategoryRoutes(events, now),
    ...calendarRoutes(events, recurring, now),
    ...dayRoutes(events, recurring, now),
    ...weeklyIndexRoutes(events),
    ...seriesRoutes(recurring),
    ...eventPageRoutes(events, now),
  ];
}

export function categoryPagePath(citySlug: string, category: string): string | null {
  if (isGeneralEventCategory(category)) return generalCategoryPage(category, citySlug).path;
  return null;
}
