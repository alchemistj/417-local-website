import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NETWORKING_GROUPS } from "../src/data/networkingGroups";
import { REDIRECTS, sourceMatches } from "../src/data/redirects";
import { BUSINESS_EVENTS, BUSINESS_NETWORKING, STATIC_PAGES, cityWeekendCopy, cityWeekendPage } from "../src/data/staticPages";
import { NAV_ITEMS } from "../src/data/nav";
import { weekendTitleRange } from "../src/lib/calendarView";
import { eventSectionRoutes } from "../src/lib/eventRoutes";
import { WEEKEND_CITY_SLUGS, isReservedEventSlug } from "../src/lib/eventPaths";
import { NOINDEX_EVENT_CATEGORIES, eventSchema, type EventData } from "../src/lib/eventSchema";
import { buildRoutes } from "../src/lib/routes";
import { DIST_DIR } from "./helpers/posts";

const wednesday = new Date("2026-11-25T23:00:00Z"); // Wed Nov 25, 2026, 5 PM Chicago

function ev(partial: Partial<EventData> & Pick<EventData, "id" | "title" | "start">): EventData {
  return eventSchema.parse({ slug: partial.slug ?? partial.id, categories: [], ...partial });
}

describe("weekend title and H1", () => {
  it("puts the Friday to Sunday range in the title and H1 of all five cities", () => {
    expect(weekendTitleRange(wednesday)).toBe("Nov 27–29");
    expect(cityWeekendPage("springfield", [], wednesday).title).toBe("Things to Do in Springfield, MO This Weekend (Nov 27–29)");
    for (const city of WEEKEND_CITY_SLUGS) {
      const page = cityWeekendPage(city, [], wednesday);
      const copy = cityWeekendCopy(city, wednesday);
      expect(page.title).toContain("(Nov 27–29)");
      expect(page.title.length).toBeLessThanOrEqual(60);
      expect(copy.h1).toContain("(Nov 27–29)");
      expect(page.description).toContain("Fri Nov 27 to Sun Nov 29");
      expect(copy.intro.join(" ")).toContain("updated weekly");
      expect(page.path).toBe(`/things-to-do-in-${city}-mo-this-weekend/`);
    }
  });

  it("names the second month only when the weekend crosses a month end", () => {
    expect(weekendTitleRange(new Date("2026-12-29T18:00:00Z"))).toBe("Jan 1\u20133");
    expect(weekendTitleRange(new Date("2026-05-27T18:00:00Z"))).toBe("May 29–31");
    expect(weekendTitleRange(new Date("2026-07-29T18:00:00Z"))).toBe("Jul 31–Aug 2");
  });

  it("links to the weekend page from the main menu", () => {
    expect(NAV_ITEMS.find((item) => item.label === "This Weekend")?.href).toBe("/things-to-do-in-springfield-mo-this-weekend/");
  });
});

describe("business networking page", () => {
  const bySource = Object.fromEntries(REDIRECTS.map((redirect) => [redirect.source, redirect]));

  it("lives at /events/springfield/business-networking/ with the agreed title", () => {
    expect(BUSINESS_NETWORKING.path).toBe("/events/springfield/business-networking/");
    expect(BUSINESS_NETWORKING.title).toBe("Business Networking Events in Springfield, MO (This Week and Every Month)");
    expect(BUSINESS_EVENTS.map((page) => page.path)).toContain(BUSINESS_NETWORKING.path);
    expect(STATIC_PAGES.find((page) => page.path === BUSINESS_NETWORKING.path)?.indexable).not.toBe(false);
  });

  it("reserves the slug so an event cannot take the address", () => {
    expect(isReservedEventSlug("business-networking")).toBe(true);
  });

  it("301s both old URLs, in both slash forms, to the new page", () => {
    for (const old of ["networking", "entrepreneurship"]) {
      for (const form of [`/events/springfield-business-events/${old}`, `/events/springfield-business-events/${old}/`]) {
        expect(bySource[form], form).toMatchObject({ destination: BUSINESS_NETWORKING.path, statusCode: 301 });
      }
    }
  });

  it("does not redirect away a live page", () => {
    const routes = buildRoutes([], [], eventSectionRoutes([], wednesday)).map((route) => route.path);
    for (const redirect of REDIRECTS) {
      for (const path of routes) expect(sourceMatches(redirect.source, path), `${redirect.source} swallows ${path}`).toBe(false);
    }
  });

  it("keeps the business events hub and the networking page out of each other's way", () => {
    expect(BUSINESS_EVENTS[0].path).toBe("/events/springfield-business-events/");
    expect(BUSINESS_EVENTS.map((page) => page.path)).not.toContain("/events/springfield-business-events/networking/");
  });

  it("lists only groups with an official source, checked on 2026-11-25", () => {
    expect(NETWORKING_GROUPS.length).toBeGreaterThan(0);
    for (const group of NETWORKING_GROUPS) {
      expect(group.url).toMatch(/^https:\/\//);
      expect(group.sourceUrl).toMatch(/^https:\/\//);
      expect(group.checkedOn).toBe("2026-11-25");
      expect(group.what.length).toBeGreaterThan(10);
    }
  });
});

describe("thin pages stay out of Google", () => {
  const passed = ev({ id: "passed-show", title: "Passed Show", start: "2026-11-10T19:00:00-06:00", categories: ["live-music"] });
  const upcoming = ev({ id: "upcoming-show", title: "Upcoming Show", start: "2026-11-28T19:00:00-06:00", categories: ["live-music", "film", "family"] });
  const routes = eventSectionRoutes([passed, upcoming], wednesday);
  const find = (path: string) => routes.find((route) => route.path === path);

  it("marks an ended event page noindex and an upcoming one indexable", () => {
    expect(find("/events/springfield/passed-show-2026-11-10/")).toMatchObject({ indexable: false });
    expect(find("/events/springfield/upcoming-show-2026-11-28/")).toMatchObject({ indexable: true });
  });

  it("marks every dated day page noindex", () => {
    const days = routes.filter((route) => /^\/events\/[a-z-]+\/\d{4}-\d{2}-\d{2}\/$/.test(route.path));
    expect(days.length).toBeGreaterThan(0);
    for (const day of days) expect(day.indexable, day.path).toBe(false);
  });

  it("marks the thin category pages noindex and keeps the others indexable", () => {
    expect([...NOINDEX_EVENT_CATEGORIES]).toEqual(["film", "sports", "outdoors", "food-and-drink", "community", "classes-and-workshops"]);
    expect(find("/events/springfield/film/")).toMatchObject({ indexable: false });
    expect(find("/events/springfield/live-music/")).toMatchObject({ indexable: true });
    expect(find("/events/springfield/family/")).toMatchObject({ indexable: true });
  });

  it("leaves professional development out of the sitemap but keeps the page", () => {
    const page = STATIC_PAGES.find((p) => p.path === "/events/springfield-business-events/professional-development/");
    expect(page?.indexable).toBe(false);
    const registry = buildRoutes([], [], routes);
    const entry = registry.find((route) => route.path === page?.path);
    expect(entry).toMatchObject({ indexable: false });
  });

  it("keeps all of them out of the registry's sitemap set", () => {
    const sitemap = buildRoutes([], [], routes).filter((route) => route.indexable && route.sitemap !== false).map((route) => route.path);
    expect(sitemap).not.toContain("/events/springfield/passed-show-2026-11-10/");
    expect(sitemap).not.toContain("/events/springfield/film/");
    expect(sitemap).not.toContain("/events/springfield/2026-11-28/");
    expect(sitemap).toContain("/events/springfield/business-networking/");
    expect(sitemap).toContain("/events/springfield/upcoming-show-2026-11-28/");
  });
});

const built = existsSync(`${DIST_DIR}/index.html`);
describe.skipIf(!built)("built pages", () => {
  const read = (path: string) => readFileSync(`${DIST_DIR}${path}index.html`, "utf8");
  const robots = /<meta name="robots" content="noindex, follow"\s*\/?>/;

  it("renders the networking page and noindexes the thin ones", () => {
    const html = read("/events/springfield/business-networking/");
    expect(html).toMatch(/<h1[^>]*>Business Networking Events in Springfield, MO<\/h1>/);
    expect(html).toContain("Founders and small-business owner events");
    expect(html).toContain("Networking groups that meet every week or month");
    expect(html).not.toMatch(/name="robots"/);
    expect(read("/events/springfield-business-events/professional-development/")).toMatch(robots);
  });

  it("keeps ended events and day pages out of the sitemap", () => {
    const sitemap = readFileSync(`${DIST_DIR}/sitemap.xml`, "utf8");
    expect(sitemap).toContain("/events/springfield/business-networking/");
    expect(sitemap).not.toMatch(/\/events\/[a-z-]+\/\d{4}-\d{2}-\d{2}\//);
    expect(sitemap).not.toContain("/events/springfield-business-events/professional-development/");
    for (const slug of NOINDEX_EVENT_CATEGORIES) expect(sitemap).not.toContain(`/events/springfield/${slug}/`);
  });
});
