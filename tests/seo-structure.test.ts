import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NETWORKING_GROUPS } from "../src/data/networkingGroups";
import { REDIRECTS, sourceMatches } from "../src/data/redirects";
import { BUSINESS_EVENTS_HUB, cityWeekendCopy, cityWeekendPage } from "../src/data/staticPages";
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

describe("business events section", () => {
  const bySource = Object.fromEntries(REDIRECTS.map((redirect) => [redirect.source, redirect]));

  it("has the hub at /business-events/springfield-mo/", () => {
    expect(BUSINESS_EVENTS_HUB.path).toBe("/business-events/springfield-mo/");
  });

  it("reserves the old slug so an event cannot take the address", () => {
    expect(isReservedEventSlug("business-networking")).toBe(true);
  });

  it("301s the pass-1 networking page to the new networking page", () => {
    for (const form of ["/events/springfield/business-networking", "/events/springfield/business-networking/"]) {
      expect(bySource[form], form).toMatchObject({ destination: "/business-events/springfield-mo/networking/", statusCode: 301 });
    }
  });

  it("does not redirect away a live page", () => {
    const routes = buildRoutes([], [], eventSectionRoutes([], wednesday)).map((route) => route.path);
    for (const redirect of REDIRECTS) {
      for (const path of routes) expect(sourceMatches(redirect.source, path), `${redirect.source} swallows ${path}`).toBe(false);
    }
  });

  it("lists only groups with an official source, checked on 2026-11-25 or 2026-11-26", () => {
    expect(NETWORKING_GROUPS.length).toBeGreaterThan(0);
    for (const group of NETWORKING_GROUPS) {
      expect(group.url).toMatch(/^https:\/\//);
      expect(group.sourceUrl).toMatch(/^https:\/\//);
      expect(["2026-11-25", "2026-11-26"]).toContain(group.checkedOn);
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

  it("keeps all of them out of the registry's sitemap set", () => {
    const sitemap = buildRoutes([], [], routes).filter((route) => route.indexable && route.sitemap !== false).map((route) => route.path);
    expect(sitemap).not.toContain("/events/springfield/passed-show-2026-11-10/");
    expect(sitemap).not.toContain("/events/springfield/film/");
    expect(sitemap).not.toContain("/events/springfield/2026-11-28/");
    expect(sitemap).toContain("/events/springfield/upcoming-show-2026-11-28/");
  });
});

const built = existsSync(`${DIST_DIR}/index.html`);
describe.skipIf(!built)("built pages", () => {
  const read = (path: string) => readFileSync(`${DIST_DIR}${path}index.html`, "utf8");
  const robots = /<meta name="robots" content="noindex, follow"\s*\/?>/;

  it("renders the networking niche page and the hub", () => {
    const html = read("/business-events/springfield-mo/networking/");
    expect(html).toMatch(/<h1[^>]*>Business Networking Events in Springfield, MO<\/h1>/);
    expect(html).toContain("Groups that meet every week or month");
    expect(html).not.toMatch(/name="robots"/);
    expect(read("/business-events/springfield-mo/")).toContain("Browse by topic");
  });

  it("keeps ended events and day pages out of the sitemap", () => {
    const sitemap = readFileSync(`${DIST_DIR}/sitemap.xml`, "utf8");
    expect(sitemap).toContain("/business-events/springfield-mo/networking/");
    expect(sitemap).not.toMatch(/\/events\/[a-z-]+\/\d{4}-\d{2}-\d{2}\//);
    for (const slug of NOINDEX_EVENT_CATEGORIES) expect(sitemap).not.toContain(`/events/springfield/${slug}/`);
  });
});
