import { describe, expect, it } from "vitest";
import { displayTitle, filterJunk, junkReasons, withDisplayTitle } from "../src/lib/eventQuality";
import { readEventDir } from "./helpers/events";
import { ROOT } from "./helpers/posts";

const all = readEventDir(`${ROOT}src/content/events`);
const byTitle = (title: string) => all.filter((event) => event.title === title);
const reasons = junkReasons(all);

function reasonOf(title: string, date?: string): string | undefined {
  const hits = byTitle(title).filter((event) => !date || event.start.startsWith(date));
  expect(hits.length, title).toBeGreaterThan(0);
  return reasons.get(hits[0]!.id);
}

describe("junk filter on current data", () => {
  it("hides store sales and promos", () => {
    expect(reasonOf("Black Friday Bargains")).toBe("store-promo");
    expect(reasonOf("2026 BLACK FRIDAY")).toBe("store-promo");
    expect(reasonOf("Erimish BLACK FRIDAY Pop Up Event")).toBe("store-promo");
    expect(reasonOf("Small Business Saturday", "2026-11-28")).toBe("store-promo");
  });

  it("keeps district-wide Small Business Saturday events and a Black Friday gig", () => {
    expect(reasonOf("Small Business Saturday in Downtown Springfield")).toBeUndefined();
    expect(reasonOf("C-STREET SMALL BUSINESS WEEKEND 2026")).toBeUndefined();
    const gig = all.find((event) => event.title.startsWith("Black Friday with Brutally Frank"));
    expect(gig && reasons.get(gig.id)).toBeUndefined();
  });

  it("hides Big Cedar Lodge resort activities", () => {
    expect(reasonOf("Mrs. Claus Welcome Table – Wilderness Club")).toBe("resort-guests");
    expect(reasonOf("Thanksgiving Weekend Welcome Table")).toBe("resort-guests");
    expect(reasonOf("Pour & Gourmet Tour")).toBe("resort-guests");
  });

  it("hides online-only events and webinars", () => {
    expect(reasonOf("From Fog To Focus")).toBe("online-only");
    expect(all.filter((event) => event.title.startsWith("Aligning Passion with Profession")).every((event) => reasons.get(event.id) === "online-only")).toBe(true);
  });

  it("keeps ordinary local events", () => {
    expect(reasonOf("Fishing Fridays")).toBeUndefined();
    expect(reasonOf("Christmas High Tea at The Marley House", "2026-12-19")).toBeUndefined();
  });

  it("collapses exact duplicates (same title, date, city) to one", () => {
    const sample = all.find((event) => !reasons.has(event.id))!;
    const twin = { ...sample, id: `${sample.id}-twin`, slug: `${sample.slug}-twin` };
    const out = filterJunk([sample, twin]);
    expect(out).toHaveLength(1);
    expect(junkReasons([sample, twin]).get(twin.id)).toBe("duplicate");
  });
});

describe("displayTitle", () => {
  it("title-cases ALL CAPS titles", () => {
    expect(displayTitle("C-STREET SMALL BUSINESS WEEKEND 2026")).toBe("C-Street Small Business Weekend 2026");
    expect(displayTitle("PIANO BATTLE")).toBe("Piano Battle");
    expect(displayTitle("DRUMSTICK DASH 2026")).toBe("Drumstick Dash 2026");
  });

  it("strips emoji and repeated punctuation", () => {
    expect(displayTitle("Christmas Party🎄Springfield Region")).toBe("Christmas Party Springfield Region");
    expect(displayTitle("BLACK FRIDAY🛒🤠💸✔️⭐️")).toBe("Black Friday");
    expect(displayTitle("NO SIGNAL….")).toBe("No Signal.");
    expect(displayTitle("Big Show!!!")).toBe("Big Show!");
  });

  it("leaves normal titles and codes alone, and never changes the slug", () => {
    expect(displayTitle("Gary & Betty 55th Anniversary Celebration")).toBe("Gary & Betty 55th Anniversary Celebration");
    expect(displayTitle("K9S:GSD-417")).toBe("K9S:GSD-417");
    const event = all.find((e) => e.title === "PIANO BATTLE")!;
    const shown = withDisplayTitle(event);
    expect(shown.title).toBe("Piano Battle");
    expect(shown.slug).toBe(event.slug);
    expect(shown.id).toBe(event.id);
  });
});
