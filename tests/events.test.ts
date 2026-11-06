import { describe, expect, it } from "vitest";
import { eventSchema } from "../src/lib/eventSchema";
import { formatEventDate, formatPrice, inCategory, isBusinessEvent, isUpcoming, sortByStart } from "../src/lib/events";

const full = {
  id: "evt_123",
  slug: "downtown-networking-night",
  title: "Downtown Networking Night",
  seo_title: "Downtown Networking Night in Springfield, MO",
  description: "Meet other local professionals.",
  start: "2026-12-03T18:00:00-06:00",
  end: "2026-12-03T20:00:00-06:00",
  timezone: "America/Chicago",
  venue: "The Library Center",
  address: "4653 S Campbell Ave",
  city: "Springfield",
  state: "MO",
  organizer: { name: "Springfield Chamber", website: "https://example.com" },
  categories: ["networking"],
  price: "$10",
  free: false,
  registration_url: "https://example.com/register",
  image_url: "https://example.com/i.jpg",
  source_urls: ["https://example.com/source"],
  updated_at: "2026-11-01T12:00:00Z",
};

describe("events schema", () => {
  it("parses a full event-radar export", () => {
    expect(eventSchema.parse(full).slug).toBe("downtown-networking-night");
  });

  it("parses a minimal event: only core fields are required", () => {
    const min = eventSchema.parse({ id: "1", slug: "a", title: "A", start: "2026-12-03" });
    expect(min.categories).toEqual([]);
    expect(min.source_urls).toEqual([]);
  });

  it("rejects an event without a title or start", () => {
    expect(eventSchema.safeParse({ ...full, title: undefined }).success).toBe(false);
    expect(eventSchema.safeParse({ ...full, start: undefined }).success).toBe(false);
  });
});

describe("event helpers", () => {
  const ev = eventSchema.parse(full);

  it("keeps an event upcoming until its end time passes", () => {
    expect(isUpcoming(ev, new Date("2026-12-03T19:00:00-06:00"))).toBe(true);
    expect(isUpcoming(ev, new Date("2026-12-03T21:00:00-06:00"))).toBe(false);
  });

  it("treats a date-only event as upcoming through that whole day", () => {
    const day = eventSchema.parse({ id: "2", slug: "b", title: "B", start: "2026-12-03" });
    expect(isUpcoming(day, new Date("2026-12-03T23:00:00Z"))).toBe(true);
    expect(isUpcoming(day, new Date("2026-12-05T00:00:00Z"))).toBe(false);
  });

  it("sorts by start, filters by category and detects business events", () => {
    const later = eventSchema.parse({ ...full, id: "3", slug: "c", title: "C", start: "2026-12-10T18:00:00-06:00", categories: ["music"] });
    expect(sortByStart([later, ev]).map((e) => e.id)).toEqual(["evt_123", "3"]);
    expect(inCategory([ev, later], "networking")).toEqual([ev]);
    expect(isBusinessEvent(ev)).toBe(true);
    expect(isBusinessEvent(later)).toBe(false);
  });

  it("formats dates in the event's time zone and prices", () => {
    expect(formatEventDate(ev)).toContain("December 3, 2026");
    expect(formatEventDate(ev)).toContain("6:00 PM");
    expect(formatPrice(ev)).toBe("$10");
    expect(formatPrice({ ...ev, free: true })).toBe("Free");
  });
});
