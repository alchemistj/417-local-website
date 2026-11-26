import { describe, expect, it } from "vitest";
import { REDIRECTS } from "../src/data/redirects";
import { NETWORKING_GROUPS } from "../src/data/networkingGroups";
import { BUSINESS_EVENTS_HUB } from "../src/data/staticPages";
import { businessCities, groupMeta, hubMeta, nicheMeta } from "../src/lib/businessEvents";
import { eventSchema, type EventData } from "../src/lib/eventSchema";
import { eventSectionRoutes, listedCategories } from "../src/lib/eventRoutes";
import { B2B_NICHES, classifyEvent, generalCategoriesOf } from "../src/lib/eventTaxonomy";

const now = new Date("2026-11-26T18:00:00Z");

function ev(partial: Partial<EventData> & Pick<EventData, "id" | "title">): EventData {
  return eventSchema.parse({ slug: partial.id, start: "2026-12-02T18:00:00-06:00", categories: [], ...partial });
}

describe("audience edge cases from the spec", () => {
  it("treats Small Business Saturday as B2C shopping", () => {
    const t = classifyEvent(ev({ id: "a", title: "Small Business Saturday in Downtown Springfield", categories: ["entrepreneurship"] }));
    expect(t.audience).toBe("B2C");
    expect(t.format).toBe("Market");
  });
  it("treats Foodies and Dinner with New Friends as B2C social", () => {
    const cats = ["networking", "entrepreneurship", "professional-development"];
    expect(classifyEvent(ev({ id: "b", title: "Foodies + New Friends: Springfield | Entrepreneurs Giving Back Edition", categories: cats })).audience).toBe("B2C");
    expect(classifyEvent(ev({ id: "c", title: "Curate Your Night: Springfield, MO | Dinner with New Friends", categories: cats })).audience).toBe("B2C");
  });
  it("treats Santa breakfasts as B2C family and keeps them off networking", () => {
    const santa = ev({ id: "d", title: "Pancakes with Santa at Big Whiskey's - Downtown", categories: ["networking"] });
    const t = classifyEvent(santa);
    expect(t).toMatchObject({ audience: "B2C", topic: "Family & Kids", niches: [] });
    expect(generalCategoriesOf(santa)).toEqual(["family"]);
    const cities = businessCities([santa], now);
    expect(cities.flatMap((c) => c.niches).every((n) => !n.events.includes(santa))).toBe(true);
  });
  it("treats chamber parties and Giving Tuesday as B2B chamber events", () => {
    const party = classifyEvent(ev({ id: "e", title: "Rogersville Chamber of Commerce Christmas Party", categories: ["networking", "family", "holiday"] }));
    expect(party.audience).toBe("B2B");
    expect(party.niches).toContain("chamber-of-commerce");
    const gt = classifyEvent(ev({ id: "f", title: "GIVING TUESDAY - Chamber Gives Back - Convoy of Hope", organizer: { name: "Republic Area Chamber of Commerce" } }));
    expect(gt).toMatchObject({ audience: "B2B" });
    expect(gt.niches).toContain("chamber-of-commerce");
  });
  it("treats a women-in-tech party as B2B with tech and women niches", () => {
    const t = classifyEvent(ev({ id: "g", title: "Springfield Women in Tech Holiday Party", organizer: { name: "Springfield Women In Technology" } }));
    expect(t.audience).toBe("B2B");
    expect(t.niches).toEqual(expect.arrayContaining(["tech-and-developers", "women-in-business"]));
    expect(t.groups).toEqual(["springfield-women-in-technology"]);
  });
  it("treats CoxHealth ACLS, BLS and NRP as B2B healthcare training, kept off B2C pages", () => {
    for (const title of ["ACLS Course", "BLS for Healthcare Providers", "NRP Advanced Provider Course"]) {
      const e = ev({ id: title, title, categories: ["professional-development"] });
      expect(classifyEvent(e)).toMatchObject({ audience: "B2B", niches: ["healthcare-training"] });
      expect(generalCategoriesOf(e)).toEqual([]);
    }
    const acls = ev({ id: "acls", title: "ACLS Course", categories: ["community"] });
    expect(listedCategories([acls], now)).toEqual([]);
  });
  it("treats the FY27 public meeting as B2C community and job fairs as B2B", () => {
    expect(classifyEvent(ev({ id: "h", title: "FY27 Action Plan Public Meeting - In Person", categories: ["professional-development"] }))).toMatchObject({ audience: "B2C", topic: "Community" });
    expect(classifyEvent(ev({ id: "i", title: "Springfield Job Fair - Springfield Career Fair" })).niches).toEqual(["career-and-job-fairs"]);
  });
  it("lets an override beat the rules by event id", () => {
    const run = ev({ id: "fb69caec-6db4-469b-b38d-90ea99869f87", title: "Christmas Lights Run", organizer: { name: "Rogersville Area Chamber of Commerce" } });
    expect(classifyEvent(run)).toMatchObject({ audience: "B2C", source: "override" });
  });
});

describe("B2B pages", () => {
  const events = [
    ev({ id: "n1", title: "Courageous Business Connect networking", organizer: { name: "Courageous Business Connect" } }),
    ev({ id: "n2", title: "Flourish Networking for Women" }),
    ev({ id: "n3", title: "Business networking breakfast", description: "A business networking event." }),
    ev({ id: "t1", title: "Code Night", organizer: { name: "Open SGF" } }),
    ev({ id: "j1", title: "December Faith at Work Luncheon", city_slug: "joplin" }),
  ];
  const [springfield] = businessCities(events, now).filter((c) => c.key === "springfield-mo");

  it("builds the city key with the state and only for cities with B2B events or groups", () => {
    expect(businessCities(events, now).map((c) => c.key).sort()).toEqual(["joplin-mo", "springfield-mo"]);
    expect(businessCities([ev({ id: "x", title: "Live Band" })], now).map((c) => c.key)).toEqual(["springfield-mo"]);
  });
  it("indexes a niche with 3 events or a group guide, otherwise noindex", () => {
    const joplin = businessCities(events, now).find((c) => c.key === "joplin-mo");
    expect(joplin?.niches.every((n) => nicheMeta(joplin, n).indexable === false)).toBe(true);
    const networking = springfield.niches.find((n) => n.niche === "networking");
    expect(networking?.events.length).toBeGreaterThanOrEqual(3);
    expect(nicheMeta(springfield, networking!).indexable).toBe(true);
    const women = springfield.niches.find((n) => n.niche === "women-in-business");
    expect(nicheMeta(springfield, women!).indexable).toBe(true); // group guide (Women in Tech)
  });
  it("indexes a group page with a verified site and an event or a stated schedule", () => {
    const network = springfield.groups.find((g) => g.slug === "the-network");
    expect(network?.events).toHaveLength(0);
    expect(groupMeta(springfield, network!).indexable).toBe(false);
    const openSgf = springfield.groups.find((g) => g.slug === "open-sgf");
    expect(groupMeta(springfield, openSgf!).indexable).toBe(true);
    const mega = springfield.groups.find((g) => g.slug === "mega-417");
    expect(groupMeta(springfield, mega!).indexable).toBe(true);
  });
  it("gives every page a unique title and description, with titles of 60 characters or fewer", () => {
    const metas = springfield.niches.map((n) => nicheMeta(springfield, n)).concat(springfield.groups.map((g) => groupMeta(springfield, g)), [hubMeta(springfield)]);
    expect(new Set(metas.map((m) => m.title)).size).toBe(metas.length);
    expect(new Set(metas.map((m) => m.description)).size).toBe(metas.length);
    for (const m of metas) expect(m.title.length, m.title).toBeLessThanOrEqual(60);
    expect(hubMeta(springfield).title).toBe(BUSINESS_EVENTS_HUB.title);
  });
  it("routes use /business-events/{city}-{state}/ and nothing outside the fixed niche list", () => {
    const paths = eventSectionRoutes(events, now).map((r) => r.path);
    expect(paths).toContain("/business-events/springfield-mo/");
    expect(paths).toContain("/business-events/springfield-mo/networking/");
    expect(paths).toContain("/business-events/springfield-mo/groups/open-sgf/");
    expect(paths).toContain("/business-events/joplin-mo/faith-and-business/");
    for (const n of springfield.niches) expect(B2B_NICHES).toContain(n.niche);
  });
  it("only lists groups with an https site and a source", () => {
    for (const g of NETWORKING_GROUPS) {
      expect(g.url).toMatch(/^https:\/\//);
      expect(g.sourceUrl).toMatch(/^https:\/\//);
    }
  });
});

describe("old business URLs", () => {
  const by = Object.fromEntries(REDIRECTS.map((r) => [r.source, r]));
  it("301s every old address into the new section, in both slash forms", () => {
    const cases: [string, string][] = [
      ["/events/springfield-business-events", "/business-events/springfield-mo/"],
      ["/events/springfield-business-events/networking", "/business-events/springfield-mo/networking/"],
      ["/events/springfield-business-events/entrepreneurship", "/business-events/springfield-mo/small-business-and-entrepreneurs/"],
      ["/events/springfield-business-events/professional-development", "/business-events/springfield-mo/certifications-and-training/"],
      ["/events/springfield/business-networking", "/business-events/springfield-mo/networking/"],
    ];
    for (const [src, dest] of cases) {
      for (const form of [src, `${src}/`]) expect(by[form], form).toMatchObject({ destination: dest, statusCode: 301 });
    }
  });
});
