import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import copy from "../docs/events-pages-copy.json";
import {
  GENERAL_EVENT_CATEGORIES,
  GENERAL_EVENT_CATEGORY_LABELS,
  eventSchema,
  type EventData,
} from "../src/lib/eventSchema";
import {
  eventChicagoDate,
  generalCategoriesWithUpcoming,
  groupWeekendEvents,
  hubWeekendPreview,
  isEventContentId,
  nextSevenDayEvents,
  thisWeekendView,
  upcomingFromEntries,
  weekendDateStrings,
} from "../src/lib/events";
import { generalCategoryRoutes } from "../src/lib/eventRoutes";

function ev(partial: Partial<EventData> & Pick<EventData, "id" | "title" | "start">): EventData {
  return eventSchema.parse({ slug: partial.slug ?? partial.id, categories: [], ...partial });
}

const wednesday = new Date("2026-11-04T18:00:00Z"); // Wed Nov 4, 2026, 12:00 PM Chicago
const saturday = new Date("2026-11-07T16:00:00Z"); // Sat Nov 7, 2026, 10:00 AM Chicago
const sundayNight = new Date("2026-11-09T05:00:00Z"); // Sun Nov 8, 2026, 11:00 PM Chicago

describe("general event categories", () => {
  it("labels each category from the copy H1 and builds a page only when it has an upcoming event", () => {
    expect([...GENERAL_EVENT_CATEGORIES].sort()).toEqual(Object.keys(copy.categories).sort());
    for (const slug of GENERAL_EVENT_CATEGORIES) {
      expect(copy.categories[slug].h1).toBe(`${GENERAL_EVENT_CATEGORY_LABELS[slug]} in Springfield, MO`);
    }

    const now = wednesday;
    const events = [
      ev({ id: "music", title: "Downtown Show", start: "2026-11-06T20:00:00-06:00", categories: ["live-music"] }),
      ev({ id: "both", title: "Park Concert", start: "2026-11-07T15:00:00-06:00", categories: ["live-music", "family"] }),
      ev({ id: "past", title: "Old Game", start: "2026-10-01T18:00:00-05:00", end: "2026-10-01T20:00:00-05:00", categories: ["sports"] }),
      ev({ id: "unknown", title: "Parade", start: "2026-11-08T12:00:00-06:00", categories: ["parade-day"] }),
      ev({ id: "biz", title: "Mixer", start: "2026-11-09T18:00:00-06:00", categories: ["networking"] }),
    ];
    expect(generalCategoriesWithUpcoming(events, now)).toEqual(["live-music", "family"]);
    const routes = generalCategoryRoutes(events, now);
    expect(routes.map((route) => route.path)).toEqual(["/events/springfield/live-music/", "/events/springfield/family/"]);
    expect(routes.map((route) => route.title)).toEqual([
      copy.categories["live-music"].seoTitle,
      copy.categories.family.seoTitle,
    ]);
    expect(routes.map((route) => route.description)).toEqual([
      copy.categories["live-music"].description,
      copy.categories.family.description,
    ]);
    expect(routes.every((route) => route.indexable)).toBe(true);
    const past = events.find((event) => event.id === "past");
    expect(past).toBeTruthy();
    expect(generalCategoryRoutes([past!], now)).toEqual([]);
  });

  it("still accepts an event whose category slug is not in the known lists", () => {
    const parsed = eventSchema.parse({
      id: "future",
      slug: "future-fair",
      title: "Future Fair",
      start: "2026-12-01T18:00:00-06:00",
      categories: ["future-slug"],
    });
    expect(parsed.categories).toEqual(["future-slug"]);
    expect(generalCategoriesWithUpcoming([parsed], wednesday)).toEqual([]);
    expect(generalCategoryRoutes([parsed], wednesday)).toEqual([]);
  });
});

describe("this weekend", () => {
  it("uses the Chicago Friday–Sunday window on a Wednesday, a Saturday, and a Sunday at 11 PM", () => {
    expect(weekendDateStrings(wednesday)).toEqual(["2026-11-06", "2026-11-07", "2026-11-08"]);
    expect(weekendDateStrings(saturday)).toEqual(["2026-11-06", "2026-11-07", "2026-11-08"]);
    expect(weekendDateStrings(sundayNight)).toEqual(["2026-11-06", "2026-11-07", "2026-11-08"]);

    const thursdayNightChicago = ev({
      id: "thu",
      title: "Thursday Late",
      start: "2026-11-06T05:00:00Z", // Thu Nov 5, 11:00 PM Chicago (already Friday in UTC)
    });
    const fridayEarly = ev({
      id: "fri-early",
      title: "Friday After Midnight",
      start: "2026-11-06T06:30:00Z", // Fri Nov 6, 12:30 AM Chicago
    });
    const friday = ev({
      id: "fri",
      title: "Friday Show",
      start: "2026-11-07T00:30:00Z", // Fri Nov 6, 6:30 PM Chicago
      end: "2026-11-08T02:00:00Z", // still underway Saturday morning; over before Sunday night
    });
    const saturdayEvent = ev({
      id: "sat",
      title: "Saturday Market",
      start: "2026-11-07",
    });
    const sundayChicago = ev({
      id: "sun",
      title: "Sunday Night",
      start: "2026-11-09T04:00:00Z", // Sun Nov 8, 10:00 PM Chicago (already Monday in UTC)
      end: "2026-11-09T05:30:00Z",
    });
    const mondayChicago = ev({
      id: "mon",
      title: "Monday Morning",
      start: "2026-11-09T06:00:00Z", // Mon Nov 9, 12:00 AM Chicago
    });

    expect(eventChicagoDate(thursdayNightChicago)).toBe("2026-11-05");
    expect(eventChicagoDate(fridayEarly)).toBe("2026-11-06");
    expect(eventChicagoDate(sundayChicago)).toBe("2026-11-08");
    expect(eventChicagoDate(mondayChicago)).toBe("2026-11-09");

    const fixtures = [thursdayNightChicago, fridayEarly, friday, saturdayEvent, sundayChicago, mondayChicago];

    const fromWednesday = thisWeekendView(fixtures, wednesday);
    expect(fromWednesday.mode).toBe("weekend");
    expect(fromWednesday.groups.map((group) => [group.heading, group.events.map((event) => event.id)])).toEqual([
      ["Friday, November 6", ["fri-early", "fri"]],
      ["Saturday, November 7", ["sat"]],
      ["Sunday, November 8", ["sun"]],
    ]);

    const fromSaturday = thisWeekendView(fixtures, saturday);
    expect(fromSaturday.mode).toBe("weekend");
    expect(fromSaturday.groups.map((group) => group.date)).toEqual(["2026-11-06", "2026-11-07", "2026-11-08"]);
    expect(fromSaturday.groups[0]?.events.map((event) => event.id)).toEqual(["fri"]);

    const fromSunday = thisWeekendView(fixtures, sundayNight);
    expect(fromSunday.mode).toBe("weekend");
    expect(fromSunday.groups).toEqual([
      expect.objectContaining({
        date: "2026-11-08",
        heading: "Sunday, November 8",
        events: [expect.objectContaining({ id: "sun" })],
      }),
    ]);
    expect(groupWeekendEvents(fixtures, sundayNight).map((group) => group.date)).toEqual(["2026-11-06", "2026-11-07", "2026-11-08"]);
  });

  it("falls back to the next 7 Chicago days when the weekend has no upcoming events", () => {
    const thursday = ev({ id: "thu", title: "Thursday Class", start: "2026-11-05T18:00:00-06:00" });
    const monday = ev({ id: "mon", title: "Monday Meetup", start: "2026-11-09T18:00:00-06:00" });
    const tooLate = ev({ id: "late", title: "Following Thursday", start: "2026-11-12T18:00:00-06:00" });
    const view = thisWeekendView([thursday, monday, tooLate], wednesday);
    expect(view.mode).toBe("fallback");
    expect(view.groups).toEqual([]);
    expect(view.fallback.map((event) => event.id)).toEqual(["thu", "mon"]);
    expect(nextSevenDayEvents([thursday, monday, tooLate], wednesday).map((event) => event.id)).toEqual(["thu", "mon"]);

    const friday = ev({ id: "fri", title: "Friday Show", start: "2026-11-06T19:00:00-06:00" });
    const withWeekend = thisWeekendView([thursday, friday], wednesday);
    expect(withWeekend.mode).toBe("weekend");
    expect(withWeekend.fallback).toEqual([]);
    expect(withWeekend.groups.map((group) => group.heading)).toEqual(["Friday, November 6"]);
  });
});

describe("events hub weekend block", () => {
  it("shows up to 6 weekend events and links only categories that have upcoming events", () => {
    const weekend = Array.from({ length: 7 }, (_, i) =>
      ev({
        id: `fri-${i}`,
        title: `Show ${i}`,
        start: `2026-11-06T${String(15 + i).padStart(2, "0")}:00:00-06:00`,
        categories: i === 0 ? ["live-music"] : ["sports"],
      }),
    );
    const preview = hubWeekendPreview(weekend, wednesday);
    expect(preview).toHaveLength(6);
    expect(preview.map((event) => event.id)).toEqual(["fri-0", "fri-1", "fri-2", "fri-3", "fri-4", "fri-5"]);
    expect(generalCategoriesWithUpcoming(weekend, wednesday)).toEqual(["live-music", "sports"]);

    const weekdayOnly = [ev({ id: "thu", title: "Thursday Class", start: "2026-11-05T18:00:00-06:00", categories: ["outdoors"] })];
    expect(hubWeekendPreview(weekdayOnly, wednesday)).toEqual([]);
    expect(generalCategoriesWithUpcoming(weekdayOnly, wednesday)).toEqual(["outdoors"]);
  });
});

describe("event export files", () => {
  it("does not load _export-meta.json as an event", () => {
    const config = readFileSync(new URL("../src/content.config.ts", import.meta.url), "utf8");
    const eventsBlock = config.slice(config.indexOf("const events"), config.indexOf("const lists"));
    expect(eventsBlock).toContain('"!_*"');
    expect(isEventContentId("_export-meta")).toBe(false);
    expect(isEventContentId("_export-meta.json")).toBe(false);
    expect(isEventContentId("2026-11-12-off-the-clock-social")).toBe(true);

    const now = new Date("2026-11-01T00:00:00Z");
    const meta = {
      id: "_export-meta",
      data: ev({ id: "meta", title: "Export meta", start: "2026-12-01", categories: ["live-music"] }),
    };
    const real = {
      id: "downtown-show",
      data: ev({ id: "show", title: "Downtown Show", start: "2026-12-01", categories: ["live-music"] }),
    };
    expect(upcomingFromEntries([meta, real], now).map((event) => event.id)).toEqual(["show"]);
  });
});
