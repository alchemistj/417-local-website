import { describe, expect, it } from "vitest";
import { eventSchema, type EventData } from "../src/lib/eventSchema";
import { eventSectionRoutes } from "../src/lib/eventRoutes";
import {
  assertNoReservedEventSlug,
  eventCitySlug,
  eventPath,
  eventPublicSlug,
  reservedEventSlugs,
  venueGuidePath,
} from "../src/lib/eventPaths";
import { calendarDaysAfter, isIndexableEvent, isListedEvent } from "../src/lib/events";
import { eventMetaDescription, eventPageTitle } from "../src/lib/eventPage";
import { readSiteEvents } from "./helpers/events";

const wednesday = new Date("2026-11-04T18:00:00Z");

function ev(partial: Partial<EventData> & Pick<EventData, "id" | "title" | "start">): EventData {
  return eventSchema.parse({ slug: partial.slug ?? partial.id, categories: [], ...partial });
}

describe("event slug fallback", () => {
  it("builds city, public slug and path from the Chicago date when the export omits them", () => {
    const symphony = ev({
      id: "symphony",
      slug: "springfield-symphony-a-holiday-christmas",
      title: "SPRINGFIELD SYMPHONY: A Holiday Christmas",
      start: "2026-12-20T01:30:00+00:00",
      city: "Springfield",
    });
    expect(eventCitySlug(symphony)).toBe("springfield");
    expect(eventPublicSlug(symphony)).toBe("springfield-symphony-a-holiday-christmas-2026-12-19");
    expect(eventPath(symphony)).toBe("/events/springfield/springfield-symphony-a-holiday-christmas-2026-12-19/");
  });

  it("uses Springfield when the city is blank", () => {
    const event = ev({ id: "gillioz", slug: "larry-fleet", title: "Larry Fleet", start: "2026-11-13", city: "" });
    expect(eventCitySlug(event)).toBe("springfield");
    expect(eventPath(event)).toBe("/events/springfield/larry-fleet-2026-11-13/");
  });

  it("keeps path, public_slug and city_slug from the export", () => {
    const event = ev({
      id: "given",
      slug: "old-slug",
      title: "Given",
      start: "2026-12-01T18:00:00-06:00",
      city: "Springfield",
      city_slug: "republic",
      public_slug: "custom-name-2026-12-01",
      path: "/events/republic/custom-name-2026-12-01",
    });
    expect(eventCitySlug(event)).toBe("republic");
    expect(eventPublicSlug(event)).toBe("custom-name-2026-12-01");
    expect(eventPath(event)).toBe("/events/republic/custom-name-2026-12-01/");
  });
});

describe("reserved event slugs", () => {
  it("rejects reserved words, category slugs, business slugs and city slugs", () => {
    for (const slug of [
      "this-weekend",
      "weekly",
      "monthly",
      "springfield-business-events",
      "live-music",
      "comedy",
      "classes-and-workshops",
      "networking",
      "springfield",
      "republic",
      "joplin",
    ]) {
      expect(() => assertNoReservedEventSlug([ev({ id: slug, title: slug, start: "2026-12-01", public_slug: slug })]), slug).toThrow(/reserved/i);
    }
    expect(reservedEventSlugs().has("film")).toBe(true);
    expect(() => assertNoReservedEventSlug([ev({ id: "ok", title: "OK", start: "2026-12-01", public_slug: "garden-story-time-2026-11-19" })])).not.toThrow();
  });

  it("reserves a city slug that shows up on an event", () => {
    const nixa = ev({ id: "nixa-show", title: "Nixa Show", start: "2026-12-01", city: "Nixa", public_slug: "nixa-show-2026-12-01" });
    const clash = ev({ id: "clash", title: "Clash", start: "2026-12-02", city: "Springfield", public_slug: "nixa" });
    expect(() => assertNoReservedEventSlug([nixa, clash])).toThrow(/nixa/);
  });
});

describe("past event window", () => {
  it("lists an event on the sitemap for 30 days and indexes it for 90", () => {
    const on = (start: string) => ev({ id: start, title: start, start });
    expect(calendarDaysAfter(on("2026-11-04T18:00:00-06:00"), wednesday)).toBe(0);
    expect(calendarDaysAfter(on("2026-10-06T20:00:00-05:00"), wednesday)).toBe(29);
    expect(calendarDaysAfter(on("2026-10-05T20:00:00-05:00"), wednesday)).toBe(30);
    expect(isListedEvent(on("2026-10-06T20:00:00-05:00"), wednesday)).toBe(true);
    expect(isListedEvent(on("2026-10-05T20:00:00-05:00"), wednesday)).toBe(false);
    expect(isIndexableEvent(on("2026-08-07T12:00:00-05:00"), wednesday)).toBe(true);
    expect(isIndexableEvent(on("2026-08-06T12:00:00-05:00"), wednesday)).toBe(false);
  });

  it("drops a 30-day-old event from the sitemap and a 90-day-old event from the index", () => {
    const recent = ev({ id: "recent", title: "Recent Show", start: "2026-10-06T20:00:00-05:00", categories: ["live-music"] });
    const stale = ev({ id: "stale", title: "Stale Show", start: "2026-08-06T12:00:00-05:00", categories: ["sports"] });
    const upcoming = ev({ id: "soon", title: "Soon Show", start: "2026-11-20T20:00:00-06:00", categories: ["family"] });
    const routes = eventSectionRoutes([recent, stale, upcoming], wednesday);
    const byId = (id: string) => routes.find((route) => route.type === "event" && route.path.includes(id));
    expect(byId("recent")).toMatchObject({ indexable: true, sitemap: true, llms: false });
    expect(byId("stale")).toMatchObject({ indexable: false, sitemap: false, llms: false });
    expect(byId("soon")).toMatchObject({ indexable: true, sitemap: true, llms: true });
    expect(routes.map((route) => route.path)).not.toContain("/events/springfield/live-music/");
    expect(routes.map((route) => route.path)).toContain("/events/springfield/family/");
    expect(routes.map((route) => route.path)).not.toContain("/events/springfield/sports/");
  });
});

describe("event page titles", () => {
  it("keeps every exported event title within 60 characters and every description within 155", () => {
    const events = readSiteEvents();
    const titles = events.map((event) => eventPageTitle(event));
    const descriptions = events.map((event) => eventMetaDescription(event));
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
    for (const title of titles) expect(title.length).toBeLessThanOrEqual(60);
    for (const description of descriptions) expect(description.length).toBeLessThanOrEqual(155);
    const symphony = events.find((event) => event.slug === "springfield-symphony-a-holiday-christmas");
    expect(symphony).toBeTruthy();
    expect(eventPageTitle(symphony!)).toContain("Dec 19, 2026");
    expect(eventPageTitle(symphony!)).toContain("| 417 Local");
  });
});

describe("venue links", () => {
  it("links a venue to a post about that place and otherwise leaves it for maps", () => {
    const posts = [
      { slug: "jordan-valley-park", title: "Jordan Valley Park (Springfield.) 7 Reasons to Go Any Time of Year!" },
      { slug: "best-kids-activities-in-springfield-mo", title: "21 Best Things to Do with Kids in Springfield" },
    ];
    expect(venueGuidePath("Jordan Valley Park", posts)).toBe("/jordan-valley-park/");
    expect(venueGuidePath("Springfield Botanical Gardens", posts)).toBeNull();
  });
});
