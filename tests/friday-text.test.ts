import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { eventListTime } from "../src/lib/calendarView";
import { eventSchema, type EventData } from "../src/lib/eventSchema";
import { eventSectionRoutes } from "../src/lib/eventRoutes";
import { eventPath } from "../src/lib/eventPaths";
import { listRowPlace } from "../src/lib/eventPage";
import {
  comingFridayYmd,
  fridayShortfall,
  fridayTextPage,
  hasNonListingSource,
  isAdultsOnlyEvent,
  isEveningFriendly,
  isListingSiteUrl,
  isSeriesOrRecurringClass,
  pickFridayEvents,
} from "../src/lib/fridayText";
import { absoluteUrl } from "../src/lib/site";
import { readRecurringDir } from "../src/lib/recurring";
import { readSiteEvents } from "./helpers/events";
import { ROOT } from "./helpers/posts";

const NOW = new Date("2026-11-15T18:00:00.000Z");
const FRIDAY = "2026-11-20T22:00:00.000Z";

function event(overrides: Record<string, unknown> & { id: string; title: string; start?: string }): EventData {
  return eventSchema.parse({
    slug: overrides.id,
    start: FRIDAY,
    venue: "The Library Center",
    city_slug: "springfield",
    categories: ["community"],
    source_urls: ["https://www.springfieldmo.gov/event"],
    description: "",
    ...overrides,
  });
}

describe("coming Friday in America/Chicago", () => {
  const cases: [string, string, string][] = [
    ["Sunday", "2026-11-15T18:00:00.000Z", "2026-11-20"],
    ["Monday", "2026-11-16T18:00:00.000Z", "2026-11-20"],
    ["Tuesday", "2026-11-17T18:00:00.000Z", "2026-11-20"],
    ["Wednesday", "2026-11-18T18:00:00.000Z", "2026-11-20"],
    ["Thursday", "2026-11-19T18:00:00.000Z", "2026-11-20"],
    ["Friday 8 PM Central", "2026-11-21T02:00:00.000Z", "2026-11-20"],
    ["Saturday", "2026-11-21T18:00:00.000Z", "2026-11-27"],
  ];

  for (const [label, instant, friday] of cases) {
    it(`uses ${friday} on ${label}`, () => {
      expect(comingFridayYmd(new Date(instant))).toBe(friday);
    });
  }
});

describe("family and evening filters", () => {
  it("drops 21+, ages 21, wine, beer tasting, bar crawl, and rave", () => {
    const blocked = [
      event({ id: "plus", title: "Late Show", description: "Must be 21+ to attend." }),
      event({ id: "ages", title: "Tasting Room", description: "Ages 21 and older." }),
      event({ id: "wine", title: "Wine & Jazz Series" }),
      event({ id: "beer", title: "Friday Flights", description: "A beer tasting on the square." }),
      event({ id: "crawl", title: "Downtown bar crawl" }),
      event({ id: "rave", title: "Synapse - Rave at the Where House" }),
    ];
    for (const item of blocked) expect(isAdultsOnlyEvent(item), item.id).toBe(true);
    const brewery = event({ id: "brewery", title: "Brewery Tour", description: "Root beer floats for kids." });
    expect(isAdultsOnlyEvent(brewery)).toBe(false);
    expect(pickFridayEvents([...blocked, brewery], [], NOW).map((item) => item.id)).toEqual(["brewery"]);
  });

  it("keeps 4 PM and all-day festivals or markets, and drops earlier or ordinary all-day listings", () => {
    const atFour = event({ id: "four", title: "Four", start: "2026-11-20T22:00:00.000Z" });
    const before = event({ id: "before", title: "Before", start: "2026-11-20T21:59:00.000Z" });
    const fair = event({ id: "fair", title: "Art Fair", start: "2026-11-20", categories: ["festivals"], time_tbd: true });
    const market = event({ id: "market", title: "Holiday Market", start: "2026-11-20", categories: ["community"] });
    const morningFair = event({ id: "morning", title: "Morning Festival", start: "2026-11-20T15:00:00.000Z", categories: ["festivals"] });
    const cleanup = event({ id: "cleanup", title: "Park Cleanup", start: "2026-11-20", categories: ["outdoors"] });
    expect(isEveningFriendly(atFour)).toBe(true);
    expect(isEveningFriendly(before)).toBe(false);
    expect(isEveningFriendly(fair)).toBe(true);
    expect(isEveningFriendly(market)).toBe(true);
    expect(isEveningFriendly(morningFair)).toBe(false);
    expect(isEveningFriendly(cleanup)).toBe(false);
    expect(pickFridayEvents([atFour, before, fair, market, morningFair, cleanup], [], NOW).map((item) => item.id)).toEqual(["fair", "market", "four"]);
  });
});

describe("sources, series, and pick order", () => {
  it("treats allevents, happeningnext, and eventbrite as listing sites", () => {
    expect(isListingSiteUrl("https://allevents.in/springfield/show/1")).toBe(true);
    expect(isListingSiteUrl("https://www.happeningnext.com/event/show")).toBe(true);
    expect(isListingSiteUrl("https://www.eventbrite.com/e/show-tickets-1")).toBe(true);
    expect(isListingSiteUrl("https://www.hammonshall.com/viewshow.aspx?ID=4067")).toBe(false);
    const official = event({ id: "official", title: "Official" });
    const listed = event({
      id: "listed",
      title: "Listed",
      source_urls: ["https://allevents.in/springfield/show/1"],
      registration_url: "https://www.eventbrite.com/e/show-tickets-1",
      organizer: { website: "https://happeningnext.com/event/show" },
    });
    const mixed = event({
      id: "mixed",
      title: "Mixed",
      registration_url: "https://www.eventbrite.com/e/show-tickets-1",
      source_urls: ["https://gillioztheatre.com/show"],
    });
    expect(hasNonListingSource(official)).toBe(true);
    expect(hasNonListingSource(listed)).toBe(false);
    expect(hasNonListingSource(mixed)).toBe(true);
  });

  it("drops series and recurring classes", () => {
    const series = event({ id: "series", title: "Caving Cadets Homeschool Series" });
    const yoga = event({ id: "yoga", title: "Friday Yoga", categories: ["classes-and-workshops"] });
    const again = event({ id: "again", title: "Trivia Night", start: "2026-11-27T23:00:00.000Z" });
    const trivia = event({ id: "trivia", title: "Trivia Night" });
    const workshop = event({ id: "wreath", title: "Wreath Workshop", categories: ["classes-and-workshops"] });
    expect(isSeriesOrRecurringClass(series)).toBe(true);
    expect(isSeriesOrRecurringClass(yoga)).toBe(true);
    expect(isWeeklySeries(trivia, again)).toBe(true);
    expect(pickFridayEvents([series, yoga, trivia, again, workshop], [], NOW).map((item) => item.id)).toEqual(["wreath"]);
  });

  it("ranks an official source ahead of a listing, then a significant one-off, and stops at 3", () => {
    const listingShow = event({
      id: "listing-show",
      title: "Listing Festival",
      start: "2026-11-20",
      categories: ["festivals"],
      source_urls: ["https://allevents.in/springfield/festival/1"],
      registration_url: "https://allevents.in/springfield/festival/1",
    });
    const ordinary = event({ id: "ordinary", title: "Library Talk", start: "2026-11-20T22:30:00.000Z" });
    const musicEarly = event({
      id: "music-early",
      title: "Early Set",
      start: "2026-11-20T22:00:00.000Z",
      categories: ["live-music"],
      action_type: "tickets",
      venue: "Gillioz Theatre",
    });
    const musicMid = event({
      id: "music-mid",
      title: "Middle Set",
      start: "2026-11-20T23:00:00.000Z",
      categories: ["live-music"],
      action_type: "tickets",
      venue: "Gillioz Theatre",
    });
    const musicLate = event({
      id: "music-late",
      title: "Late Set",
      start: "2026-11-21T00:00:00.000Z",
      categories: ["live-music"],
      action_type: "tickets",
      venue: "Gillioz Theatre",
    });
    const play = event({
      id: "play",
      title: "Opening Night",
      start: "2026-11-21T01:00:00.000Z",
      categories: ["arts-and-theater"],
      action_type: "tickets",
      venue: "Gillioz Theatre",
    });
    const joplin = event({ id: "joplin", title: "Joplin Lights", city_slug: "joplin", categories: ["festivals"], start: "2026-11-20" });
    const picked = pickFridayEvents([listingShow, ordinary, musicEarly, musicMid, musicLate, play, joplin], [], NOW);
    expect(picked.map((item) => item.id)).toEqual(["music-early", "play", "music-mid"]);
    expect(picked).toHaveLength(3);
    expect(fridayShortfall(2)).toBe("Only 2 real events qualified for this Friday.");
    expect(fridayShortfall(0)).toBe("No events qualified for this Friday.");
  });

  it("puts the official event ahead of a significant listing-only event", () => {
    const talk = event({ id: "talk", title: "Library Talk" });
    const fair = event({
      id: "fair",
      title: "Art Fair",
      start: "2026-11-20",
      categories: ["festivals"],
      source_urls: ["https://happeningnext.com/event/art-fair"],
      registration_url: null,
    });
    expect(pickFridayEvents([fair, talk], [], NOW).map((item) => item.id)).toEqual(["talk", "fair"]);
  });
});

describe("text block", () => {
  it("numbers real events with a cleaned place and an absolute 417local.com link", () => {
    const show = event({
      id: "show",
      title: "Ozark Jubilee",
      venue: "157 Park Central Square, Springfield, MO, United States, Missouri 65806",
      address: "157 Park Central Square, Springfield, MO, United States, Missouri 65806",
    });
    const page = fridayTextPage([show], [], NOW);
    const place = listRowPlace(show);
    expect(place).not.toMatch(/United States/i);
    expect(page.heading).toBe("Friday, November 20");
    expect(page.h1).toBe("This Friday in Springfield");
    expect(page.text).toBe(
      [
        "This Friday in Springfield (Nov 20):",
        `1) Ozark Jubilee, ${place}, ${eventListTime(show)}. ${absoluteUrl(eventPath(show))}`,
      ].join("\n"),
    );
    expect(page.text).toContain("https://417local.com/events/springfield/");
    expect(page.text).not.toMatch(/^2\)/m);
    expect(page.intro[1]).toBe("Only 1 real event qualified for this Friday.");
    expect(page.events).toHaveLength(1);
  });

  it("does not invent a third line when fewer events qualify", () => {
    const page = fridayTextPage([], [], NOW);
    expect(page.events).toEqual([]);
    expect(page.text).toBe("This Friday in Springfield (Nov 20):");
    expect(page.intro[1]).toBe("No events qualified for this Friday.");
  });
});

describe("exported Springfield events for Friday, November 20, 2026", () => {
  const events = readSiteEvents();
  const recurring = readRecurringDir(`${ROOT}src/content/recurring`);
  const page = fridayTextPage(events, recurring, NOW);

  it("picks at most 3 real Friday events and says when the week is short", () => {
    expect(page.events.length).toBeLessThanOrEqual(3);
    expect(page.events.map((item) => item.title)).toEqual([
      "MATT MATHEWS: Not What I Ordered World Tour",
      "Art of the Ozarks Fine Art Fair",
    ]);
    expect(page.text).toBe(
      [
        "This Friday in Springfield (Nov 20):",
        `1) MATT MATHEWS: Not What I Ordered World Tour, Juanita K. Hammons Hall for the Performing Arts, 7:00 PM. ${absoluteUrl("/events/springfield/matt-mathews-not-what-i-ordered-2026-11-20/")}`,
        `2) Art of the Ozarks Fine Art Fair, Springfield Expo Center, Time TBA. ${absoluteUrl("/events/springfield/art-of-ozarks-fine-art-fair-2026-11-20/")}`,
      ].join("\n"),
    );
    expect(page.intro[1]).toMatch(/^Only 2 real events qualified/);
    const titles = page.events.map((item) => item.title).join("\n");
    expect(titles).not.toMatch(/rave|wine|series|S\.T\.A\.B\.L\.E|Caving/i);
  });

  it("adds the page to the route registry", () => {
    const route = eventSectionRoutes(events, NOW, recurring).find((item) => item.path === "/this-friday-in-springfield/");
    expect(route?.indexable).toBe(true);
    expect(route?.title).toBe(page.title);
    expect(route?.description).toBe(page.description);
  });
});

function isWeeklySeries(first: EventData, second: EventData): boolean {
  return isSeriesOrRecurringClass(first, [first, second], []);
}

const builtPage = `${ROOT}dist/this-friday-in-springfield/index.html`;

describe.skipIf(!existsSync(builtPage))("built Friday text page", () => {
  it("ships one h1, the copy button, inlined CSS, and no external font", () => {
    const html = readFileSync(builtPage, "utf8");
    expect((html.match(/<h1[\s>]/g) ?? []).length).toBe(1);
    expect(html).toContain(">This Friday in Springfield<");
    expect(html).toContain(">Copy text<");
    expect(html).toContain("navigator.clipboard");
    expect(html).toContain("selectNodeContents");
    expect(html).toContain("Copied");
    expect(html).toContain('id="friday-text"');
    expect(html).toContain('href="/things-to-do-in-springfield-mo-this-weekend/"');
    expect(html).toContain('href="/events/springfield/"');
    const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].reduce((total, match) => total + (match[1]?.length ?? 0), 0);
    expect(css).toBeLessThan(30 * 1024);
    expect(html).not.toMatch(/fonts\.googleapis\.com|rel="stylesheet"/);
    expect(html).toMatch(/min-height:\s*48px/);
  });
});
