import { describe, expect, it } from "vitest";
import { eventAction } from "../src/lib/eventAction";
import { eventSchema, type EventData } from "../src/lib/eventSchema";

const registration = "https://tickets.example.com/register";
const source = "https://venue.example.com/event";

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
    registration_url: registration,
    source_urls: [source],
    ...partial,
  });
}

describe("event action button", () => {
  it.each([
    ["tickets", "Get tickets", registration],
    ["register", "Register", registration],
    ["rsvp", "RSVP", registration],
    ["signup", "Sign up", registration],
  ] as const)("%s uses the registration link and a directions link", (action_type, label, href) => {
    const action = eventAction(ev({ action_type }));
    expect(action.label).toBe(label);
    expect(action.href).toBe(href);
    expect(action.secondary?.label).toBe("Get directions");
    expect(action.secondary?.href).toMatch(/^https:\/\/www\.google\.com\/maps\/search\/\?/);
    expect(action.label).not.toMatch(/learn more|click here/i);
  });

  it("falls back to the first source URL when registration is missing", () => {
    for (const action_type of ["tickets", "register", "rsvp", "signup"] as const) {
      expect(eventAction(ev({ action_type, registration_url: null })).href).toBe(source);
    }
  });

  it("show_up sends people to the map and keeps event details as the small link", () => {
    const action = eventAction(ev({ action_type: "show_up" }));
    expect(action.label).toBe("Get directions");
    expect(action.href).toMatch(/^https:\/\/www\.google\.com\/maps\/search\/\?/);
    expect(action.href).toContain(encodeURIComponent("Juanita K. Hammons Hall"));
    expect(action.secondary).toEqual({ label: "Event details", href: source });
  });

  it("door shows the price text beside a directions button", () => {
    const action = eventAction(ev({ action_type: "door", price: "$15 at the door", registration_url: null }));
    expect(action.label).toBe("Get directions");
    expect(action.href).toMatch(/^https:\/\/www\.google\.com\/maps\/search\/\?/);
    expect(action.priceText).toBe("$15 at the door");
    expect(action.secondary).toBeUndefined();
  });

  it("hours points at the source", () => {
    const action = eventAction(ev({ action_type: "hours", registration_url: null }));
    expect(action.label).toBe("See hours and vendors");
    expect(action.href).toBe(source);
    expect(action.secondary?.label).toBe("Get directions");
  });

  it("uses event details when action_type is details or missing", () => {
    for (const action_type of ["details", undefined] as const) {
      const action = eventAction(ev({ action_type, venue: "Library Center", registration_url: "https://tickets.example.com/ignore" }));
      expect(action.label).toBe("Event details");
      expect(action.href).toBe(source);
      expect(action.secondary?.label).toBe("Get directions");
    }
  });

  it("uses registration when a details event has no source URL", () => {
    const action = eventAction(ev({ action_type: "details", source_urls: [] }));
    expect(action.href).toBe(registration);
  });
});

describe("ticket inference", () => {
  const base = { id: "x", slug: "x", title: "Show", start: "2026-11-12T19:00:00-06:00", categories: [], city: "Springfield" };
  it("sends a ticketed venue with unknown pricing to Get tickets", () => {
    const event = eventSchema.parse({ ...base, title: "Larry Fleet", venue: "Gillioz Theatre", is_free: null });
    expect(eventAction(event).label).toBe("Get tickets");
  });
  it("treats a $ price as tickets and a free library event as details", () => {
    expect(eventAction(eventSchema.parse({ ...base, price: "$25" })).label).toBe("Get tickets");
    const free = eventSchema.parse({ ...base, venue: "Library Center", is_free: true, source_urls: ["https://thelibrary.org/e"] });
    expect(eventAction(free).label).toBe("Event details");
  });
  it("never infers tickets for is_free true and keeps explicit action types", () => {
    expect(eventAction(eventSchema.parse({ ...base, venue: "Gillioz Theatre", is_free: true })).label).toBe("Event details");
    expect(eventAction(eventSchema.parse({ ...base, venue: "Gillioz Theatre", action_type: "rsvp" })).label).toBe("RSVP");
  });
  it("recognises ticketing hosts", () => {
    const event = eventSchema.parse({ ...base, registration_url: "https://www.ticketmaster.com/e/1" });
    expect(eventAction(event).label).toBe("Get tickets");
  });
});
