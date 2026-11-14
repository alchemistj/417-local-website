import { describe, expect, it } from "vitest";
import eventsCopy from "../docs/events-pages-copy.json";
import { REDIRECTS } from "../src/data/redirects";
import { cityWeekendPage } from "../src/data/staticPages";
import { cityRowLabel, driveBetween } from "../src/data/weekendCities";
import {
  eventRun,
  hasOfficialSource,
  hubDontMiss,
  isSignificantOneOff,
  regionDontMiss,
  runRangeLabel,
  topWeekendEvent,
  weekendMetaDescription,
  worthTheDrive,
} from "../src/lib/calendarView";
import { eventSchema, type EventData } from "../src/lib/eventSchema";
import { eventSectionRoutes } from "../src/lib/eventRoutes";
import { WEEKEND_CITY_SLUGS, cityWeekendPath, hasWeekendPage } from "../src/lib/eventPaths";
import { recurringSchema, type RecurringItem } from "../src/lib/recurring";
import { readSiteEvents } from "./helpers/events";

const sunday = new Date("2026-11-08T18:00:00Z"); // Sun Nov 8, 2026, 12:00 PM Chicago

function ev(partial: Partial<EventData> & Pick<EventData, "id" | "title" | "start">): EventData {
  return eventSchema.parse({
    slug: partial.slug ?? partial.id,
    categories: [],
    source_urls: [],
    registration_url: "https://example.com/events/" + (partial.id ?? "event"),
    ...partial,
  });
}

function series(partial: Partial<RecurringItem> & Pick<RecurringItem, "id" | "title">): RecurringItem {
  return recurringSchema.parse({ categories: [], next_dates: [], city: "Springfield", city_slug: "springfield", active: true, ...partial });
}

describe("isSignificantOneOff", () => {
  it("requires a standout, an official URL, and rejects class titles and series", () => {
    const fest = ev({ id: "fest", title: "Harvest Fest", start: "2026-11-20", categories: ["festivals"], city_slug: "springfield" });
    expect(isSignificantOneOff(fest)).toBe(true);
    expect(hasOfficialSource(fest)).toBe(true);

    const noUrl = ev({ id: "bare", title: "Harvest Fest", start: "2026-11-20", categories: ["festivals"], registration_url: "", source_urls: [] });
    expect(isSignificantOneOff(noUrl)).toBe(false);

    const siteOnly = ev({
      id: "site",
      title: "Holiday Market",
      start: "2026-11-21",
      categories: ["holiday"],
      registration_url: "",
      source_urls: [],
      organizer: { website: "https://example.com/market" },
    });
    expect(isSignificantOneOff(siteOnly)).toBe(true);

    const sourceOnly = ev({
      id: "source",
      title: "Town Festival",
      start: "2026-11-21",
      categories: ["festivals"],
      registration_url: "  ",
      source_urls: ["https://example.com/fest"],
    });
    expect(isSignificantOneOff(sourceOnly)).toBe(true);

    const yoga = ev({ id: "yoga", title: "Morning Yoga", start: "2026-11-20", categories: ["holiday"] });
    expect(isSignificantOneOff(yoga)).toBe(false);

    const ordinary = ev({ id: "mix", title: "Networking Mixer", start: "2026-11-20", categories: ["community"] });
    expect(isSignificantOneOff(ordinary)).toBe(false);

    const show = ev({
      id: "show",
      title: "Friday Show",
      start: "2026-11-13",
      categories: ["live-music"],
      action_type: "tickets",
      venue: "Local Room",
    });
    const encore = ev({ ...show, id: "encore", start: "2026-11-14" });
    expect(isSignificantOneOff(show, { peers: [show, encore] })).toBe(true);

    const weekly = ["2026-11-07", "2026-11-14", "2026-11-21", "2026-11-28"].map((start, index) =>
      ev({ id: `week-${index}`, title: "Saturday Festival", start, categories: ["festivals"], city_slug: "joplin" }),
    );
    expect(isSignificantOneOff(weekly[0]!, { peers: weekly })).toBe(false);

    const matched = ev({ id: "market", title: "Saturday Market", start: "2026-11-14", categories: ["festivals"], city_slug: "springfield" });
    const recurring = series({ id: "saturday-market", title: "Saturday Market", city_slug: "springfield" });
    expect(isSignificantOneOff(matched, { recurring: [recurring] })).toBe(false);
    expect(isSignificantOneOff(matched, { recurring: [series({ id: "other", title: "Saturday Market", city_slug: "joplin" })] })).toBe(true);
  });

  it("rejects series titles and any title with 3 or more dates in the window", () => {
    const titled = (title: string) => ev({ id: "series", title, start: "2026-11-15", categories: ["festivals"], city_slug: "springfield" });
    expect(isSignificantOneOff(titled("Cinema Sundays: Matilda"))).toBe(false);
    expect(isSignificantOneOff(titled("Mahj Mondays at the Gillioz"))).toBe(false);
    expect(isSignificantOneOff(titled("November Saturday Food Box Distribution"))).toBe(false);
    expect(isSignificantOneOff(titled("Holiday Shopping Bazaar"))).toBe(false);
    expect(isSignificantOneOff(titled("Game night this Sunday at the Social BTB on Sunday"))).toBe(false);
    expect(isSignificantOneOff(titled("Movie Matinee: Blue Hawaii"))).toBe(false);
    expect(isSignificantOneOff(titled("Springfield Job Fair - Springfield Career Fair"))).toBe(false);

    const saturday = new Date("2026-11-14T16:00:00Z");
    const rims = ["2026-11-14", "2026-11-15", "2026-11-21"].map((start, index) =>
      ev({
        id: `rims-${index}`,
        title: "Midwest Battle of the Rims: Thanksgiving Throwdown",
        start,
        categories: ["holiday"],
        city_slug: "springfield",
      }),
    );
    expect(isSignificantOneOff(rims[0]!, { peers: rims, now: saturday })).toBe(false);
    const twoNights = rims.slice(0, 2);
    expect(isSignificantOneOff(twoNights[0]!, { peers: twoNights, now: saturday })).toBe(true);
  });
});

describe("past starts stay out of the lead lists", () => {
  const saturdayMorning = new Date("2026-11-14T16:00:00Z");

  it("skips a Friday show that has started, and keeps a later one", () => {
    const nutcracker = ev({
      id: "nut",
      title: "NUTCRACKER! Magical Christmas Ballet",
      start: "2026-11-14T01:00:00+00:00",
      end: "2026-11-15T05:00:00+00:00",
      categories: ["holiday"],
      action_type: "tickets",
      venue: "Gillioz Theatre",
      city_slug: "springfield",
    });
    const saturdayShow = ev({
      id: "sat",
      title: "Saturday Concert",
      start: "2026-11-15T01:00:00+00:00",
      categories: ["live-music"],
      action_type: "tickets",
      city_slug: "joplin",
    });
    expect(topWeekendEvent([nutcracker], "springfield", saturdayMorning)).toBeNull();
    expect(topWeekendEvent([saturdayShow], "joplin", saturdayMorning)?.id).toBe("sat");
    expect(worthTheDrive([nutcracker, saturdayShow], [], "springfield", saturdayMorning).map((event) => event.id)).toEqual(["sat"]);
    expect(hubDontMiss([nutcracker], [], "springfield", saturdayMorning)).toEqual([]);
    expect(regionDontMiss([nutcracker], [], saturdayMorning)).toEqual([]);

    const fridayAllDay = ev({ id: "fri", title: "Friday Fest", start: "2026-11-13", categories: ["festivals"], city_slug: "bolivar" });
    const saturdayAllDay = ev({ id: "day", title: "Saturday Fest", start: "2026-11-14", categories: ["festivals"], city_slug: "bolivar" });
    expect(worthTheDrive([fridayAllDay, saturdayAllDay], [], "springfield", saturdayMorning).map((event) => event.id)).toEqual(["day"]);
  });
});

describe("cross-city don't miss", () => {
  it("keeps local one-offs first, then the other four cities, and labels each city", () => {
    const localLate = ev({ id: "local", title: "Joplin Fest", start: "2026-11-20", categories: ["festivals"], city_slug: "joplin" });
    const branson = ev({ id: "branson", title: "Branson Holiday Festival", start: "2026-11-14", categories: ["holiday"], city_slug: "branson" });
    const springfield = ev({ id: "springfield", title: "Springfield Fair", start: "2026-11-21", categories: ["festivals"], city_slug: "springfield" });
    const republic = ev({ id: "republic", title: "Republic Days", start: "2026-11-15", categories: ["festivals"], city_slug: "republic" });
    const friday = new Date("2026-11-13T18:00:00Z");
    const events = [springfield, branson, localLate, republic];
    expect(hubDontMiss(events, [], "joplin", friday).map((event) => event.id)).toEqual(["local", "branson", "springfield"]);
    expect(cityRowLabel(branson)).toBe("in Branson");
    expect(cityRowLabel(branson, "joplin")).toBe("in Branson · about 1 hr 45 min");
    expect(cityRowLabel(springfield, "springfield")).toBe("");
    expect(driveBetween("springfield", "bolivar")).toBe("about 35 min");
    expect(regionDontMiss(events, [], friday).map((event) => event.id)).toEqual(["branson", "local", "springfield"]);
    expect(worthTheDrive(events, [], "joplin", friday).map((event) => event.id)).toEqual(["branson"]);
  });

  it("spreads picks across Friday, Saturday and Sunday and across cities", () => {
    const fridayMorning = new Date("2026-11-13T15:00:00Z");
    const row = (id: string, title: string, start: string, city: string, extra: Partial<EventData> = {}) =>
      ev({ id, title, start, city_slug: city, categories: ["festivals"], ...extra });
    const events = [
      row("fri", "Friday Festival", "2026-11-13T18:00:00-06:00", "springfield"),
      row("sat-a", "Saturday Festival A", "2026-11-14", "springfield"),
      row("sat-b", "Saturday Festival B", "2026-11-14", "springfield"),
      row("sat-c", "Saturday Festival C", "2026-11-14", "springfield"),
      row("sat-d", "Saturday Market", "2026-11-14", "joplin", { categories: ["holiday"] }),
      row("sun", "Sunday Concert", "2026-11-15T15:00:00-06:00", "lebanon", { categories: ["live-music"], action_type: "tickets" }),
      row("home", "Branson Fest", "2026-11-14", "branson"),
    ];
    const ids = worthTheDrive(events, [], "branson", fridayMorning).map((event) => event.id);
    expect(ids).toContain("fri");
    expect(ids).toContain("sun");
    expect(ids).toContain("sat-d");
    expect(ids).not.toContain("home");
    expect(ids.filter((id) => id.startsWith("sat")).length).toBeLessThan(5);
  });

  it("collapses a repeated title at one venue and leaves out a 3-date series", () => {
    const saturday = new Date("2026-11-14T16:00:00Z");
    const bingo = [17, 24].map((day) =>
      ev({
        id: `bingo-${day}`,
        title: "Holiday Family Bingo",
        start: `2026-11-${day}T20:00:00-06:00`,
        categories: ["holiday"],
        venue: "Table Rock Event Room",
        city_slug: "branson",
      }),
    );
    const grinch = ["2026-11-18", "2026-11-25", "2026-12-02"].map((start) =>
      ev({
        id: `grinch-${start}`,
        title: "Grinch Takeover Kids' Club",
        start: `${start}T17:00:00-06:00`,
        categories: ["holiday"],
        venue: "Fun Mountain",
        city_slug: "branson",
      }),
    );
    const picked = hubDontMiss([...bingo, ...grinch], [], "branson", saturday);
    expect(picked.map((event) => event.id)).toEqual(["bingo-17"]);
    expect(runRangeLabel(eventRun(picked[0]!, [...bingo, ...grinch], saturday))).toBe("Nov 17–24");
  });

  it("ranks headline one-offs first and does not pad with weak local listings", () => {
    const saturday = new Date("2026-11-14T16:00:00Z");
    const fest = ev({ id: "fest", title: "Fall Festival", start: "2026-11-20", categories: ["festivals"], city_slug: "bolivar" });
    const weak = ["Doormat Painting", "Fall Break Camp", "Nerd Poker", "Mommy and Me!"].map((title, index) =>
      ev({
        id: `weak-${index}`,
        title,
        start: `2026-11-${String(15 + index).padStart(2, "0")}`,
        categories: ["festivals", "community"],
        city_slug: "bolivar",
      }),
    );
    const away = ev({
      id: "away",
      title: "Springfield Symphony",
      start: "2026-11-21T19:30:00-06:00",
      categories: ["live-music"],
      action_type: "tickets",
      venue: "Juanita K. Hammons Hall for the Performing Arts",
      city_slug: "springfield",
    });
    const ids = hubDontMiss([away, ...weak, fest], [], "bolivar", saturday).map((event) => event.id);
    expect(ids).toEqual(["fest", "away"]);
  });

  it("caps the region at 12 and a hub at 10", () => {
    const events = Array.from({ length: 14 }, (_, index) =>
      ev({
        id: `fest-${index}`,
        title: `Festival ${index}`,
        start: `2026-11-${String(14 + (index % 10)).padStart(2, "0")}`,
        categories: ["festivals"],
        city_slug: WEEKEND_CITY_SLUGS[index % WEEKEND_CITY_SLUGS.length],
      }),
    );
    expect(regionDontMiss(events, [], sunday)).toHaveLength(12);
    expect(hubDontMiss(events, [], "springfield", sunday).length).toBeLessThanOrEqual(10);
  });
});

describe("weekend URLs", () => {
  it("uses one flat path for the five cities and sends the others to their hub", () => {
    expect(hasWeekendPage("springfield")).toBe(true);
    expect(hasWeekendPage("republic")).toBe(false);
    for (const city of WEEKEND_CITY_SLUGS) {
      expect(cityWeekendPath(city)).toBe(`/things-to-do-in-${city}-mo-this-weekend/`);
    }
    expect(cityWeekendPath("nixa")).toBe("/events/nixa/");
    const bySource = Object.fromEntries(REDIRECTS.map((redirect) => [redirect.source, redirect.destination]));
    expect(bySource["/events/lebanon/this-weekend/"]).toBe("/things-to-do-in-lebanon-mo-this-weekend/");
    expect(bySource["/events/lebanon/this-weekend"]).toBe("/things-to-do-in-lebanon-mo-this-weekend/");
    expect(bySource["/events/ozark/this-weekend/"]).toBe("/events/ozark/");
    expect(bySource["/events/this-weekend/"]).toBe("/things-to-do-in-springfield-mo-this-weekend/");
  });

  it("gives the five weekend pages unique titles and descriptions", () => {
    const events = readSiteEvents();
    const now = new Date("2026-11-13T18:00:00Z");
    const pages = WEEKEND_CITY_SLUGS.map((city) => cityWeekendPage(city, events, now));
    const titles = pages.map((page) => page.title);
    const descriptions = pages.map((page) => page.description);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
    for (const page of pages) {
      expect(page.title.length).toBeLessThanOrEqual(60);
      expect(page.description.length).toBeLessThanOrEqual(155);
      expect(page.path.endsWith("/")).toBe(true);
    }
    expect(titles).not.toContain(eventsCopy.region.seoTitle);
    const routes = eventSectionRoutes(events, now);
    const routeTitles = routes.map((route) => route.title);
    expect(new Set(routeTitles).size).toBe(routeTitles.length);
    expect(routes.some((route) => route.path.includes("/this-weekend/"))).toBe(false);
    for (const city of WEEKEND_CITY_SLUGS) {
      expect(routes.map((route) => route.path)).toContain(cityWeekendPath(city));
    }
    const sample = weekendMetaDescription("bolivar", events, now);
    expect(sample).toContain("Bolivar, MO");
    expect(sample).toContain("Refreshed weekly.");
  });
});
