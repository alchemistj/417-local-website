import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildEventIcs, chicagoOffsetMinutes, foldIcsLine, googleCalendarUrl, isAllDayEvent } from "../src/lib/eventCalendar";
import { eventSchema, type EventData } from "../src/lib/eventSchema";

const stamp = new Date("2026-11-08T22:05:00Z");
const pageUrl = "https://417local.com/events/springfield/example/";

function ev(partial: Partial<EventData> & Pick<EventData, "id" | "title" | "start">): EventData {
  return eventSchema.parse({
    slug: partial.slug ?? partial.id,
    timezone: "America/Chicago",
    venue: "Juanita K. Hammons Hall for the Performing Arts",
    address: "901 S. National Ave.",
    city: "Springfield",
    state: "MO",
    categories: [],
    ...partial,
  });
}

function unfold(ics: string): string[] {
  return ics.replace(/\r\n[ \t]/g, "").replace(/\n$/, "").split("\r\n");
}

const symphony = ev({
  id: "symphony",
  slug: "springfield-symphony-a-holiday-christmas",
  title: "SPRINGFIELD SYMPHONY: A Holiday Christmas",
  description: "A holiday concert at Hammons Hall.",
  start: "2026-12-20T01:30:00+00:00",
  end: null,
});

describe("ics time zone", () => {
  it("keeps 7:30 PM Central on the wall clock and adds two hours when there is no end", () => {
    expect(chicagoOffsetMinutes(new Date("2026-12-20T01:30:00Z"))).toBe(-360);
    const lines = unfold(buildEventIcs(symphony, { pageUrl, stamp }));
    expect(lines).toContain("BEGIN:VTIMEZONE");
    expect(lines).toContain("TZID:America/Chicago");
    expect(lines).toContain("DTSTART;TZID=America/Chicago:20261219T193000");
    expect(lines).toContain("DTEND;TZID=America/Chicago:20261219T213000");
    expect(lines).toContain("UID:springfield-symphony-a-holiday-christmas-2026-12-19@417local.com");
    expect(lines).toContain("DTSTAMP:20261108T220500Z");
    expect(lines.find((line) => line.startsWith("DESCRIPTION"))).toContain(pageUrl);
    expect(lines).toContain(`URL:${pageUrl}`);
  });

  it("keeps the local time across the November and March daylight-saving boundaries", () => {
    const november = ev({
      id: "nov",
      title: "November Show",
      start: "2026-11-02T01:30:00Z",
      end: null,
    });
    const march = ev({
      id: "mar",
      title: "March Show",
      start: "2026-03-09T00:30:00Z",
      end: null,
    });
    expect(chicagoOffsetMinutes(new Date("2026-11-02T01:30:00Z"))).toBe(-360);
    expect(chicagoOffsetMinutes(new Date("2026-03-09T00:30:00Z"))).toBe(-300);
    const novLines = unfold(buildEventIcs(november, { pageUrl, stamp }));
    const marLines = unfold(buildEventIcs(march, { pageUrl, stamp }));
    expect(novLines).toContain("DTSTART;TZID=America/Chicago:20261101T193000");
    expect(novLines).toContain("DTEND;TZID=America/Chicago:20261101T213000");
    expect(marLines).toContain("DTSTART;TZID=America/Chicago:20260308T193000");
    expect(marLines).toContain("DTEND;TZID=America/Chicago:20260308T213000");
  });

  it("uses the provided end instead of adding two hours", () => {
    const timed = ev({
      id: "timed",
      title: "Timed",
      start: "2026-12-20T01:30:00Z",
      end: "2026-12-20T03:00:00Z",
    });
    const lines = unfold(buildEventIcs(timed, { pageUrl, stamp }));
    expect(lines).toContain("DTEND;TZID=America/Chicago:20261219T210000");
  });
});

describe("ics all-day events", () => {
  it("writes a date-only event when time_tbd is set", () => {
    const event = ev({
      id: "tbd",
      title: "Time TBD",
      start: "2026-11-14",
      time_tbd: true,
      categories: ["outdoors"],
    });
    expect(isAllDayEvent(event)).toBe(true);
    const vevent = buildEventIcs(event, { pageUrl, stamp }).split("BEGIN:VEVENT")[1] ?? "";
    expect(vevent).toContain("DTSTART;VALUE=DATE:20261114");
    expect(vevent).toContain("DTEND;VALUE=DATE:20261115");
    expect(vevent).not.toContain("TZID");
  });

  it("treats a festival or market with no clock time as all-day and keeps a timed festival on the clock", () => {
    const market = ev({ id: "market", title: "Farmers Market", start: "2026-11-14", categories: ["festivals"] });
    const timed = ev({
      id: "fair",
      title: "Festival Concert",
      start: "2026-11-14T19:00:00-06:00",
      categories: ["festivals"],
    });
    expect(isAllDayEvent(market)).toBe(true);
    expect(isAllDayEvent(timed)).toBe(false);
    expect(unfold(buildEventIcs(timed, { pageUrl, stamp }))).toContain("DTSTART;TZID=America/Chicago:20261114T190000");
  });
});

describe("ics text", () => {
  it("escapes commas, semicolons, backslashes and newlines", () => {
    const event = ev({
      id: "punct",
      title: "Fun, games; prizes \\ wow",
      description: "Line one\nLine two, still",
      start: "2026-12-19T19:30:00-06:00",
    });
    const lines = unfold(buildEventIcs(event, { pageUrl, stamp }));
    expect(lines).toContain("SUMMARY:Fun\\, games\\; prizes \\\\ wow");
    const description = lines.find((line) => line.startsWith("DESCRIPTION"));
    expect(description).toContain("Line one\\nLine two\\, still");
    expect(description).toContain(pageUrl);
    const location = lines.find((line) => line.startsWith("LOCATION")) ?? "";
    expect(location).toContain("\\,");
  });

  it("folds long lines at 75 octets and unfolds back to the original text", () => {
    const long = `${"A".repeat(180)}, more`;
    const event = ev({
      id: "long",
      title: "Long",
      description: long,
      start: "2026-12-19T19:30:00-06:00",
    });
    const ics = buildEventIcs(event, { pageUrl, stamp });
    expect(ics).toContain("\r\n ");
    for (const line of ics.split("\r\n")) {
      if (line.length === 0) continue;
      expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
    }
    const description = unfold(ics).find((line) => line.startsWith("DESCRIPTION")) ?? "";
    expect(description).toContain(long.replace(/,/g, "\\,"));
    expect(foldIcsLine(`DESCRIPTION:${"B".repeat(90)}`)).toContain("\r\n ");
  });
});

describe("google calendar link", () => {
  it("builds a template link with Chicago wall times for the 7:30 PM concert", () => {
    const url = new URL(googleCalendarUrl(symphony, { pageUrl }));
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe(symphony.title);
    expect(url.searchParams.get("dates")).toBe("20261219T193000/20261219T213000");
    expect(url.searchParams.get("ctz")).toBe("America/Chicago");
    expect(url.searchParams.get("location")).toContain("Juanita K. Hammons Hall for the Performing Arts");
    expect(url.searchParams.get("location")).toContain("Springfield");
    expect(url.searchParams.get("details")).toContain(pageUrl);
    expect(url.searchParams.get("details")).toContain("A holiday concert");
  });

  it("uses exclusive date values for an all-day event", () => {
    const event = ev({ id: "tbd", title: "Time TBD", start: "2026-11-14", time_tbd: true });
    const url = new URL(googleCalendarUrl(event, { pageUrl }));
    expect(url.searchParams.get("dates")).toBe("20261114/20261115");
    expect(url.searchParams.get("ctz")).toBe("America/Chicago");
  });
});

describe("exported symphony file", () => {
  it("matches the 7:30 PM Central example in the content export", () => {
    const raw = JSON.parse(
      readFileSync(new URL("../src/content/events/2026-12-19-springfield-symphony-a-holiday-christmas.json", import.meta.url), "utf8"),
    ) as unknown;
    const event = eventSchema.parse(raw);
    const lines = unfold(buildEventIcs(event, { pageUrl, stamp }));
    expect(lines).toContain("DTSTART;TZID=America/Chicago:20261219T193000");
    expect(lines).toContain("DTEND;TZID=America/Chicago:20261219T213000");
  });
});
