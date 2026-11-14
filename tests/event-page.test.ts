import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { eventCityName } from "../src/lib/eventPaths";
import { eventMetaDescription, eventPlaceLine } from "../src/lib/eventPage";
import { eventSchema, type EventData } from "../src/lib/eventSchema";
import { placeName } from "../src/lib/events";
import { readSiteEvents } from "./helpers/events";

function ev(partial: Partial<EventData> = {}): EventData {
  return eventSchema.parse({
    id: "evt",
    slug: "downtown-show",
    title: "Downtown Show",
    start: "2026-12-19T19:30:00-06:00",
    venue: "Juanita K. Hammons Hall",
    address: "901 S. National Ave.",
    city: "Springfield",
    state: "MO",
    ...partial,
  });
}

describe("event place line", () => {
  it("does not append the city and state when the address already has them", () => {
    expect(
      eventPlaceLine(
        "Springfield Botanical Gardens",
        "2400 S Scenic Avenue, Springfield, MO",
        "Springfield",
        "MO",
      ),
    ).toBe("Springfield Botanical Gardens, 2400 S Scenic Avenue, Springfield, MO");
  });

  it("adds the city and state when the street address omits them", () => {
    expect(eventPlaceLine("Juanita K. Hammons Hall", "901 S. National Ave.", "Springfield", "MO")).toBe(
      "Juanita K. Hammons Hall, 901 S. National Ave., Springfield, MO",
    );
  });

  it("does not repeat a venue that is already the start of the address", () => {
    expect(eventPlaceLine("305 E Talmage", "305 E Talmage, Springfield, MO", "Springfield", "MO")).toBe(
      "305 E Talmage, Springfield, MO",
    );
  });

  it("keeps a venue whose name starts with the city", () => {
    expect(
      eventPlaceLine("Springfield Expo Center", "635 E St Louis Ave, Springfield, MO", "Springfield", "MO"),
    ).toBe("Springfield Expo Center, 635 E St Louis Ave, Springfield, MO");
  });

  it("drops a trailing city and state the export already repeated", () => {
    expect(
      eventPlaceLine(
        "Ozark Empire Fair",
        "Fairgrounds Arena, Springfield, MO 65803, United States, Springfield, MO",
        "Springfield",
        "MO",
      ),
    ).toBe("Ozark Empire Fair, Fairgrounds Arena, Springfield, MO 65803, United States");
  });

  it("shows each exported address once, without a doubled trailing city and state", () => {
    for (const event of readSiteEvents()) {
      const city = eventCityName(event);
      const state = typeof event.state === "string" && event.state.trim() ? event.state.trim() : "MO";
      const line = eventPlaceLine(placeName(event.venue), placeName(event.address), city, state);
      const doubled = new RegExp(`, ${city}, ${state}, ${city}, ${state}$`, "i");
      expect(line, event.slug).not.toMatch(doubled);
    }
  });
});

describe("event meta description", () => {
  it("ends on a sentence or a word and stays within 155 characters", () => {
    const longSentence = `${"Word ".repeat(40)}and then more. Second sentence stays off.`;
    const cut = eventMetaDescription(ev({ description: longSentence }));
    expect(cut.length).toBeLessThanOrEqual(155);
    expect(cut.endsWith("…")).toBe(false);
    expect(cut.endsWith("...")).toBe(false);
    expect(longSentence.startsWith(cut)).toBe(true);
    expect(cut.endsWith(" ")).toBe(false);
    expect(/[.!?]$/.test(cut) || longSentence[cut.length] === " ").toBe(true);

    const twoSentences =
      "Garden Story Time is a kids and outdoors event at Springfield Botanical Gardens, and it is for all ages. It takes place on Thursday, November 19, 2026 at 10:00 AM.";
    expect(eventMetaDescription(ev({ description: twoSentences }))).toBe(
      "Garden Story Time is a kids and outdoors event at Springfield Botanical Gardens, and it is for all ages.",
    );
  });

  it("keeps every exported description on a sentence or word, with no cut-off ellipsis", () => {
    const seen = new Map<string, string>();
    for (const event of readSiteEvents()) {
      const description = eventMetaDescription(event);
      expect(description.length, event.slug).toBeLessThanOrEqual(155);
      expect(description.endsWith("…"), event.slug).toBe(false);
      expect(description.endsWith("..."), event.slug).toBe(false);
      const source = (event.description ?? "").replace(/\s+/g, " ").trim();
      if (source && description !== source) {
        expect(source.startsWith(description), event.slug).toBe(true);
        const next = source[description.length] ?? "";
        // A sentence end, or a word boundary (the next source character is space or punctuation we trimmed).
        expect(/[.!?]$/.test(description) || /[\s,;:–—-]/.test(next), `${event.slug}: ${description}`).toBe(true);
      }
      const title = event.title.trim().toLowerCase();
      const previous = seen.get(description);
      if (previous !== undefined) expect(previous, event.slug).toBe(title);
      else seen.set(description, title);
    }
  });
});

describe("event page template", () => {
  it("uses the layout breadcrumb and keeps directions in the action row", () => {
    const src = readFileSync(new URL("../src/pages/events/[city]/[event].astro", import.meta.url), "utf8");
    expect(src).toContain("titleBand={false}");
    expect(src).toContain("eventPlaceLine");
    expect(src).not.toContain("addressLine");
    expect(src).toMatch(/\{event\.description && <p>\{event\.description\}<\/p>\}/);
    const actions = src.slice(src.indexOf('class="event-actions"'));
    expect(actions.indexOf("{action.label}")).toBeGreaterThan(-1);
    expect(actions.indexOf("{action.label}")).toBeLessThan(actions.indexOf("{action.secondary.label}"));
    expect(actions.indexOf("{action.secondary.label}")).toBeLessThan(actions.indexOf("<AddToCalendar"));
  });
});
