import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildMonthGrid, dateStrip, dontMissEvents, eventListTime, groupEventsByDay, monthNav } from "../src/lib/calendarView";
import { eventSchema, type EventData } from "../src/lib/eventSchema";
import { eventChips, eventSectionRoutes } from "../src/lib/eventRoutes";
import { assertNoReservedEventSlug, eventPath, isReservedEventSlug } from "../src/lib/eventPaths";
import { isListedEvent, isUpcoming, sortByStart } from "../src/lib/events";
import { readRecurringDir, recurringSchema, recurringWhen, type RecurringItem } from "../src/lib/recurring";

const sunday = new Date("2026-11-08T18:00:00Z"); // Sun Nov 8, 2026, 12:00 PM Chicago

function ev(partial: Partial<EventData> & Pick<EventData, "id" | "title" | "start">): EventData {
  return eventSchema.parse({ slug: partial.slug ?? partial.id, categories: [], city: "Springfield", ...partial });
}

function series(partial: Partial<RecurringItem> & Pick<RecurringItem, "id" | "title">): RecurringItem {
  return recurringSchema.parse({ categories: [], next_dates: [], city: "Springfield", active: true, ...partial });
}

describe("upcoming-only lists", () => {
  it("keeps a passed event's page and drops it from every list", () => {
    const passed = ev({
      id: "passed-show",
      title: "Passed Show",
      start: "2026-10-20T19:00:00-05:00",
      end: "2026-10-20T21:00:00-05:00",
      categories: ["live-music"],
    });
    const upcoming = ev({
      id: "upcoming-show",
      title: "Upcoming Show",
      start: "2026-11-20T19:00:00-06:00",
      categories: ["live-music"],
    });
    expect(isListedEvent(passed, sunday)).toBe(true);
    expect(isUpcoming(passed, sunday)).toBe(false);

    const routes = eventSectionRoutes([passed, upcoming], sunday);
    const paths = routes.map((route) => route.path);
    expect(routes.find((route) => route.path === eventPath(passed))).toMatchObject({ indexable: true, sitemap: true, llms: false });
    expect(paths).toContain(eventPath(upcoming));
    expect(paths).toContain("/events/springfield/live-music/");
    expect(paths).toContain("/events/springfield/2026-11-20/");
    expect(paths).not.toContain("/events/springfield/2026-10-20/");
    expect(dontMissEvents([passed, upcoming], sunday).map((event) => event.id)).toEqual([]);
    expect(groupEventsByDay([passed, upcoming].filter((event) => isUpcoming(event, sunday))).map((group) => group.events.map((event) => event.id))).toEqual([["upcoming-show"]]);
    expect(eventSectionRoutes([passed], sunday).some((route) => route.path === "/events/springfield/live-music/")).toBe(false);
  });
});

describe("month grid", () => {
  it("aligns November 2026 on Sunday and February 2027 on Monday", () => {
    const november = buildMonthGrid("springfield", 2026, 11, [], [], sunday);
    expect(november.weeks[0]?.[0]).toMatchObject({ date: "2026-11-01", inMonth: true, isPast: true });
    expect(november.weeks[1]?.[0]).toMatchObject({ date: "2026-11-08", isToday: true, isPast: false });

    const february = buildMonthGrid("springfield", 2027, 2, [], [], sunday);
    expect(february.weeks[0]?.[0]).toMatchObject({ date: "2027-01-31", inMonth: false });
    expect(february.weeks[0]?.[1]).toMatchObject({ date: "2027-02-01", inMonth: true });
    expect(february.weeks[0]?.every((cell) => !cell.isPast)).toBe(true);
  });

  it("counts +N more one-offs and +N weekly items, and hides past days", () => {
    const events = Array.from({ length: 5 }, (_, index) =>
      ev({
        id: `show-${index}`,
        title: `Show ${index}`,
        start: `2026-11-20T${String(15 + index).padStart(2, "0")}:00:00-06:00`,
      }),
    );
    events.push(ev({ id: "old", title: "Old Show", start: "2026-11-07T19:00:00-06:00" }));
    const recurring = [
      series({ id: "trivia", title: "Trivia", next_dates: ["2026-11-20", "2026-11-07"] }),
      series({ id: "market", title: "Market", next_dates: ["2026-11-20T09:00:00-06:00"] }),
    ];
    const grid = buildMonthGrid("springfield", 2026, 11, events, recurring, sunday);
    const cell = grid.weeks.flat().find((item) => item.date === "2026-11-20");
    expect(cell?.shown).toHaveLength(3);
    expect(cell?.shown.map((item) => item.title)).toEqual(["Show 0", "Show 1", "Show 2"]);
    expect(cell?.more).toBe(2);
    expect(cell?.weekly).toBe(2);
    expect(cell?.dayHref).toBe("/events/springfield/2026-11-20/");

    const past = grid.weeks.flat().find((item) => item.date === "2026-11-07");
    expect(past).toMatchObject({ isPast: true, shown: [], more: 0, weekly: 0, dayHref: null });
  });

  it("links the current month at /calendar/ and stops after the next 3 months", () => {
    const nav = monthNav("springfield", 2026, 11, sunday);
    expect(nav.prev).toBeNull();
    expect(nav.next?.href).toBe("/events/springfield/calendar/2026-12/");
    expect(monthNav("springfield", 2026, 12, sunday).prev?.href).toBe("/events/springfield/calendar/");
    expect(monthNav("springfield", 2027, 2, sunday).next).toBeNull();
    const paths = eventSectionRoutes([ev({ id: "show", title: "Show", start: "2026-11-20T19:00:00-06:00" })], sunday).map((route) => route.path);
    expect(paths).toContain("/events/springfield/calendar/");
    expect(paths).toContain("/events/springfield/calendar/2026-12/");
    expect(paths).toContain("/events/springfield/calendar/2027-02/");
    expect(paths).not.toContain("/events/springfield/calendar/2026-11/");
    expect(paths).not.toContain("/events/springfield/calendar/2027-03/");
  });
});

describe("day pages and reserved words", () => {
  it("builds a day route only when that day has something, and rejects calendar and bare dates", () => {
    const event = ev({ id: "show", title: "Show", start: "2026-12-19T19:30:00-06:00", categories: ["live-music"] });
    const routes = eventSectionRoutes([event], sunday).map((route) => route.path);
    expect(routes).toContain("/events/springfield/2026-12-19/");
    expect(routes).not.toContain("/events/springfield/2026-11-07/");

    expect(isReservedEventSlug("calendar")).toBe(true);
    expect(isReservedEventSlug("2026-12-19")).toBe(true);
    expect(isReservedEventSlug("the-nutcracker-2026-12-19")).toBe(false);
    expect(() => assertNoReservedEventSlug([ev({ id: "cal", title: "Calendar", start: "2026-12-01", public_slug: "calendar" })])).toThrow(/reserved/i);
    expect(() => assertNoReservedEventSlug([ev({ id: "date", title: "Date", start: "2026-12-19", public_slug: "2026-12-19" })])).toThrow(/reserved/i);
    expect(() => assertNoReservedEventSlug([event])).not.toThrow();
  });
});

describe("don't miss", () => {
  it("keeps festivals, holiday, big rooms, and ticketed music, comedy, or theater in the next 30 days", () => {
    const festival = ev({ id: "fest", title: "Fest", start: "2026-11-20", categories: ["festivals"], venue: "Park" });
    const holiday = ev({ id: "hol", title: "Hol", start: "2026-11-21", categories: ["holiday"] });
    const arena = ev({ id: "arena", title: "Game", start: "2026-11-22T19:00:00-06:00", categories: ["sports"], venue: "Great Southern Bank Arena" });
    const hall = ev({
      id: "hall",
      title: "Symphony",
      start: "2026-11-23T19:30:00-06:00",
      categories: ["arts-and-theater"],
      venue: "Juanita K. Hammons Hall for the Performing Arts",
    });
    const tickets = ev({ id: "tix", title: "Headline", start: "2026-11-24T20:00:00-06:00", categories: ["live-music"], action_type: "tickets", venue: "Club" });
    const comedy = ev({ id: "com", title: "Open Mic", start: "2026-11-25T20:00:00-06:00", categories: ["comedy"], action_type: "details" });
    const sportsTickets = ev({ id: "gym", title: "Scrimmage", start: "2026-11-26T19:00:00-06:00", categories: ["sports"], action_type: "tickets", venue: "Small Gym" });
    const later = ev({ id: "later", title: "New Year Fest", start: "2026-12-20", categories: ["festivals"] });
    const passed = ev({ id: "passed", title: "Old Fest", start: "2026-11-01", categories: ["festivals"] });
    const gillioz = ev({ id: "gillioz", title: "Movie", start: "2026-11-27T20:00:00-06:00", categories: ["film"], venue: "Gillioz Theatre" });
    const field = ev({ id: "field", title: "Ball", start: "2026-11-28T18:00:00-06:00", categories: ["sports"], venue: "Hammons Field" });

    expect(dontMissEvents([later, passed, sportsTickets, comedy, field, gillioz, tickets, hall, arena, holiday, festival], sunday).map((event) => event.id)).toEqual([
      "fest",
      "hol",
      "arena",
      "hall",
      "tix",
      "gillioz",
    ]);
    expect(dontMissEvents([field, festival, holiday, arena, hall, tickets, gillioz], sunday)).toHaveLength(6);
  });
});

describe("grouped event lists", () => {
  it("sorts the Nutcracker at Friday 7 PM before Saturday events", () => {
    const nutcracker = ev({ id: "nutcracker", title: "The Nutcracker", start: "2026-11-14T01:00:00Z" });
    const saturday = ev({ id: "market", title: "Saturday Market", start: "2026-11-14" });
    const saturdayNight = ev({ id: "late", title: "Late Show", start: "2026-11-15T02:00:00Z" });
    expect(sortByStart([nutcracker, saturday]).map((event) => event.id)).toEqual(["market", "nutcracker"]);
    const groups = groupEventsByDay([saturday, saturdayNight, nutcracker]);
    expect(groups.map((group) => [group.date, group.heading, group.events.map((event) => event.id)])).toEqual([
      ["2026-11-13", "Friday, November 13", ["nutcracker"]],
      ["2026-11-14", "Saturday, November 14", ["market", "late"]],
    ]);
    expect(eventListTime(nutcracker)).toBe("7:00 PM");
    expect(eventListTime(saturday)).toBe("All day");
    expect(eventListTime(ev({ id: "tbd", title: "TBD", start: "2026-11-14T19:00:00-06:00", time_tbd: true }))).toBe("Time TBA");
  });
});

describe("event chips", () => {
  it("leads with All events, highlights the current category, and ends with business events", () => {
    const events = [
      ev({ id: "music", title: "Show", start: "2026-11-20T20:00:00-06:00", categories: ["live-music"] }),
      ev({ id: "family", title: "Story Time", start: "2026-11-21T10:00:00-06:00", categories: ["family", "kids"] }),
      ev({ id: "passed", title: "Old Game", start: "2026-10-20T18:00:00-05:00", categories: ["sports"] }),
      ev({ id: "biz", title: "Mixer", start: "2026-11-22T18:00:00-06:00", categories: ["networking"] }),
    ];
    const music = eventChips("springfield", events, sunday, "/events/springfield/live-music/");
    expect(music.map((chip) => chip.label)).toEqual([
      "All events",
      "Live Music",
      "Family Events",
      "Kids' Events",
      "Business events",
    ]);
    expect(music.map((chip) => chip.href)).toEqual([
      "/events/springfield/",
      "/events/springfield/live-music/",
      "/events/springfield/family/",
      "/events/springfield/kids/",
      "/events/springfield-business-events/",
    ]);
    expect(music.filter((chip) => chip.current).map((chip) => chip.label)).toEqual(["Live Music"]);

    const hub = eventChips("springfield", events, sunday, "/events/springfield/");
    expect(hub[0]).toMatchObject({ label: "All events", current: true });
    expect(eventChips("springfield", events, sunday, "/events/springfield/this-weekend/").every((chip) => !chip.current)).toBe(true);
  });
});

describe("recurring folder", () => {
  it("treats an empty or missing folder as no series, and formats a weekly rule", () => {
    expect(readRecurringDir("/tmp/417-missing-recurring-folder")).toEqual([]);
    expect(readRecurringDir(mkdtempSync(join(tmpdir(), "recurring-empty-")))).toEqual([]);
    const config = readFileSync(new URL("../src/content.config.ts", import.meta.url), "utf8");
    expect(config).toContain("recurring-empty");
    expect(config).toContain("existsSync");
    expect(config).not.toContain("pastEvents");
    const pkg = readFileSync(new URL("../package.json", import.meta.url), "utf8");
    expect(pkg).not.toContain("archive-near-events");

    const market = series({
      id: "farmers-market",
      title: "Farmers Market",
      rule: "Every Saturday, 9 AM–1 PM",
      season: "March–October",
      categories: ["markets"],
      url: "https://example.com/market",
    });
    expect(recurringWhen(market)).toBe("Every Saturday, 9 AM–1 PM, March–October");
    const css = readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");
    expect(css).toMatch(/\.event-chips\s*\{[^}]*flex-wrap:\s*nowrap/);
    expect(css).toMatch(/@media \(max-width: 639px\)/);
    expect(css).toContain(".month-agenda");
    const board = readFileSync(new URL("../src/components/MonthBoard.astro", import.meta.url), "utf8");
    expect(board).toContain('class="month-grid"');
    expect(board).toContain('class="month-agenda"');
    const filters = readFileSync(new URL("../src/components/EventFilters.astro", import.meta.url), "utf8");
    expect(filters).toContain('data-filter="free"');
    expect(filters).toContain('data-filter="kids"');
    expect(filters).toContain("is:inline");
    const list = readFileSync(new URL("../src/components/EventList.astro", import.meta.url), "utf8");
    expect(list).toContain("data-free");
    expect(list).toContain("data-kids");
    expect(list).not.toContain("description");
  });

  it("builds a 14-day phone strip", () => {
    const strip = dateStrip(
      "springfield",
      [ev({ id: "today", title: "Today Show", start: "2026-11-08T20:00:00-06:00" })],
      [],
      sunday,
    );
    expect(strip.days).toHaveLength(14);
    expect(strip.days[0]).toMatchObject({ date: "2026-11-08", weekday: "Sun", day: 8 });
    expect(strip.ranges.map((item) => item.title)).toEqual(["Today", "Tomorrow", "This weekend", "Next 7 days", "Pick a date"]);
    expect(strip.ranges[0]?.detail).toContain("1 event");
    expect(strip.ranges[4]?.href).toBe("/events/springfield/calendar/");
  });
});
