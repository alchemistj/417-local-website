import { describe, expect, it } from "vitest";
import { weekendPicks } from "../src/lib/weekendPicks";
import { readEventDir } from "./helpers/events";
import { ROOT } from "./helpers/posts";

const all = readEventDir(`${ROOT}src/content/events`);
const now = new Date("2026-11-26T15:00:00-06:00");

describe("weekendPicks", () => {
  it("picks at most 3 distinct, non-junk Springfield events for Nov 27-29", () => {
    const picks = weekendPicks(all, "springfield", now);
    expect(picks.length).toBeGreaterThan(0);
    expect(picks.length).toBeLessThanOrEqual(3);
    expect(new Set(picks.map((p) => p.title)).size).toBe(picks.length);
    for (const pick of picks) {
      expect(["2026-11-27", "2026-11-28", "2026-11-29"]).toContain(pick.start.slice(0, 10));
      expect(pick.title).not.toMatch(/black friday|small business saturday/i);
    }
  });

  it("returns nothing for a city with no weekend events", () => {
    expect(weekendPicks(all, "nowhere", now)).toEqual([]);
  });
});
