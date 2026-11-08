import { describe, expect, it } from "vitest";
import { eventPageTitle, tameShoutyTitle } from "../src/lib/eventPage";

const base = {
  id: "x",
  slug: "x",
  start: "2026-12-19T19:30:00-06:00",
  city: "Springfield",
  state: "MO",
  categories: ["live-music"],
  source_urls: ["https://example.com"],
} as const;

function title(t: string): string {
  return eventPageTitle({ ...base, title: t } as never);
}

describe("eventPageTitle", () => {
  it("keeps short titles whole with city, date and brand", () => {
    expect(title("Larry Fleet")).toBe("Larry Fleet in Springfield, MO · Dec 19, 2026 | 417 Local");
  });

  it("drops the city before cutting the event name, and keeps date and brand", () => {
    const t = title("SPRINGFIELD SYMPHONY: A Holiday Christmas");
    expect(t.length).toBeLessThanOrEqual(60);
    expect(t.startsWith("Springfield Symphony: A Holiday")).toBe(true);
    expect(t.endsWith(" · Dec 19, 2026 | 417 Local")).toBe(true);
    expect(t).not.toContain("S…");
  });

  it("cuts very long names at a word boundary", () => {
    const t = title("Small Business Planning and Funding: A National Veterans Small Business Week Workshop");
    expect(t.length).toBeLessThanOrEqual(60);
    expect(t.endsWith(" · Dec 19, 2026 | 417 Local")).toBe(true);
    const name = t.replace(" · Dec 19, 2026 | 417 Local", "");
    expect(name.endsWith("…")).toBe(true);
    expect("Small Business Planning and Funding: A National Veterans Small Business Week Workshop".startsWith(name.slice(0, -1))).toBe(true);
    expect(name.slice(0, -1).split(" ").every((w) => "Small Business Planning and Funding: A National Veterans".split(" ").includes(w))).toBe(true);
  });
});

describe("tameShoutyTitle", () => {
  it("title-cases shouty titles and keeps short acronyms", () => {
    expect(tameShoutyTitle("WYNONNA JUDD – The Hard Truth Tour")).toBe("Wynonna Judd – The Hard Truth Tour");
    expect(tameShoutyTitle("Disney's THE LION KING – Great Southern Bank Broadway Season")).toBe(
      "Disney's The Lion King – Great Southern Bank Broadway Season",
    );
    expect(tameShoutyTitle("MSU Bands in Concert")).toBe("MSU Bands in Concert");
    expect(tameShoutyTitle("ICON Concerts Presents Gary Owen")).toBe("ICON Concerts Presents Gary Owen");
  });
});
