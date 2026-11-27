import { describe, expect, it } from "vitest";
import { eventDescriptionBody, eventPlaceLine, venueIsJustAddress } from "../src/lib/eventPage";
import { readEventDir } from "./helpers/events";
import { ROOT } from "./helpers/posts";

const all = readEventDir(`${ROOT}src/content/events`);
const find = (title: string) => all.find((event) => event.title === title)!;

describe("event write-up without logistics", () => {
  it("drops the date, time TBD and address sentence the card already shows", () => {
    const bls = find("BLS for Healthcare Providers");
    const body = eventDescriptionBody(bls);
    expect(body).toContain("CPR");
    expect(body).not.toMatch(/TBD|1499 N\.? Jefferson|December 3/);
  });

  it("drops the address sentence for Courageous Business Connect", () => {
    const event = all.find((e) => e.title.startsWith("Courageous Business Connect"))!;
    const body = eventDescriptionBody(event);
    expect(body).not.toMatch(/Glenstone|to be determined/);
    expect(body.length).toBeGreaterThan(20);
  });

  it("keeps descriptive sentences and never empties a write-up", () => {
    const event = { ...find("BLS for Healthcare Providers"), description: "It takes place on December 3, 2026 (time TBD)." };
    expect(eventDescriptionBody(event)).toBe("It takes place on December 3, 2026.");
    for (const e of all) if (e.description) expect(eventDescriptionBody(e).length, e.title).toBeGreaterThan(0);
  });
});

describe("place line", () => {
  it("skips a venue that is only the street address", () => {
    expect(venueIsJustAddress("2725 N Glenstone Springfield MO", "2725 N Glenstone Ave, Springfield, MO 65803-4741, United States")).toBe(true);
    expect(venueIsJustAddress("Cox North Hospital", "1499 N. Jefferson Ave")).toBe(false);
    const line = eventPlaceLine("", "2725 N Glenstone Ave, Springfield, MO 65803-4741, United States", "Springfield", "MO");
    expect(line.match(/Glenstone/g)).toHaveLength(1);
  });
});
