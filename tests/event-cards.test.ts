import { readFileSync } from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { eventRun, runRangeLabel } from "../src/lib/calendarView";
import {
  CARD_PALETTE_IDS,
  CARD_PALETTES,
  cardPaletteForCategory,
  eventCardCacheKey,
  eventCardModel,
  eventCardSchedule,
  eventCardText,
} from "../src/lib/eventCard";
import { CARD_ICONS } from "../src/lib/eventCardIcons";
import { renderEventCardPng } from "../src/lib/eventCardImage";
import { eventSchema, type EventData } from "../src/lib/eventSchema";
import { eventCardImagePath } from "../src/lib/eventPaths";
import { eventJsonLd } from "../src/lib/eventPage";
import { formatPrice, placeName } from "../src/lib/events";
import { readSiteEvents } from "./helpers/events";

function ev(partial: Partial<EventData> & Pick<EventData, "id" | "title" | "start">): EventData {
  return eventSchema.parse({ slug: partial.slug ?? partial.id, categories: [], city_slug: "springfield", ...partial });
}

function contrastOnWhite(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const channel = (value: number) => {
    const s = value / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
  return 1.05 / (luminance + 0.05);
}

describe("event card palette", () => {
  it("maps the twelve categories and sends anything else to neutral", () => {
    expect(cardPaletteForCategory("live-music").id).toBe("live-music");
    expect(cardPaletteForCategory("arts-and-theater").id).toBe("arts-and-theater");
    expect(cardPaletteForCategory("family").id).toBe("family");
    expect(cardPaletteForCategory("kids").id).toBe("family");
    expect(cardPaletteForCategory("holiday").id).toBe("holiday");
    expect(cardPaletteForCategory("festivals").id).toBe("festivals");
    expect(cardPaletteForCategory("sports").id).toBe("sports");
    expect(cardPaletteForCategory("outdoors").id).toBe("outdoors");
    expect(cardPaletteForCategory("community").id).toBe("community");
    expect(cardPaletteForCategory("food-and-drink").id).toBe("food-and-drink");
    expect(cardPaletteForCategory("comedy").id).toBe("comedy");
    expect(cardPaletteForCategory("film").id).toBe("film");
    expect(cardPaletteForCategory("networking").id).toBe("business");
    expect(cardPaletteForCategory("entrepreneurship").id).toBe("business");
    expect(cardPaletteForCategory("professional-development").id).toBe("business");
    expect(cardPaletteForCategory("classes-and-workshops").id).toBe("neutral");
    expect(cardPaletteForCategory("parade-day").id).toBe("neutral");
    expect(cardPaletteForCategory(null).id).toBe("neutral");
    expect(cardPaletteForCategory(undefined).id).toBe("neutral");
  });

  it("keeps white text at WCAG AA on every gradient stop and tile", () => {
    for (const id of CARD_PALETTE_IDS) {
      const palette = CARD_PALETTES[id];
      expect(CARD_ICONS[id].paths.length, id).toBeGreaterThan(0);
      for (const hex of [palette.from, palette.to, palette.solid]) {
        expect(contrastOnWhite(hex), `${id} ${hex}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe("event card labels", () => {
  const now = new Date("2026-11-12T15:00:00Z");

  it("says Time TBD when the event has no time", () => {
    const dated = ev({ id: "rims", title: "Battle of the Rims", start: "2026-11-14", time_tbd: true, categories: ["sports"], venue: "Springfield Expo" });
    expect(eventCardSchedule(dated)).toBe("Time TBD");
    const model = eventCardModel(dated);
    expect(model.month).toBe("Nov");
    expect(model.day).toBe("14");
    expect(model.schedule).toBe("Time TBD");
    expect(model.category).toBe("SPORTS");
    expect(model.venueLine).toBe("Springfield Expo · Springfield");

    const allDay = ev({ id: "market", title: "Saturday Market", start: "2026-11-14", categories: ["community"] });
    expect(eventCardModel(allDay).schedule).toBe("Time TBD");

    const flagged = ev({ id: "flagged", title: "Late Show", start: "2026-11-14T19:00:00-06:00", time_tbd: true });
    expect(eventCardModel(flagged).schedule).toBe("Time TBD");
  });

  it("shows the weekday and time when a clock time is listed", () => {
    const show = ev({
      id: "larry",
      title: "Larry Fleet",
      start: "2026-11-13T02:00:00Z",
      timezone: "America/Chicago",
      categories: ["live-music"],
      venue: "Gillioz Theatre",
    });
    const model = eventCardModel(show);
    expect(model.day).toBe("12");
    expect(model.month).toBe("Nov");
    expect(model.schedule).toBe("Thu · 8:00 PM");
    expect(model.category).toBe("LIVE MUSIC");
    expect(model.runLabel).toBeNull();
  });

  it("adds a run label for a multi-day run", () => {
    const nights = ["2026-11-27", "2026-11-28", "2026-11-29"].map((day) =>
      ev({
        id: `aglow-${day}`,
        title: "Gardens Aglow",
        start: `${day}T23:00:00Z`,
        timezone: "America/Chicago",
        venue: "Mizumoto Japanese Stroll Garden",
        categories: ["holiday"],
      }),
    );
    const first = nights[0] as EventData;
    const range = runRangeLabel(eventRun(first, nights, now));
    expect(range).toBe("Nov 27–29");
    expect(eventCardModel(first, { runRange: range }).runLabel).toBe("Runs Nov 27–29");
    expect(eventCardModel(first, { price: "Free" }).price).toBe("Free");
  });

  it("does not put 417 Local on a card", () => {
    const files = [
      "src/components/EventCard.astro",
      "src/lib/eventCard.ts",
      "src/lib/eventCardIcons.ts",
      "src/lib/eventCardImage.ts",
    ];
    for (const file of files) {
      expect(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), file).not.toContain("417 Local");
    }

    const events = readSiteEvents();
    for (const event of events) {
      const run = eventRun(event, events, now);
      const model = eventCardModel(event, { runRange: runRangeLabel(run), price: formatPrice(event) });
      const painted = eventCardText(model).join("\n");
      const sources = [event.title, placeName(event.venue), model.cityName, formatPrice(event), model.category].join("\n");
      if (!sources.includes("417 Local")) expect(painted, event.id).not.toContain("417 Local");
    }
  });

  it("uses the generated card as the Event image and ignores hotlinked photos", () => {
    const event = ev({
      id: "larry",
      slug: "larry-fleet",
      title: "Larry Fleet",
      start: "2026-11-13T02:00:00Z",
      path: "/events/springfield/larry-fleet-2026-11-12/",
      image_url: "https://gillioztheatre.com/wp-content/uploads/larry.jpeg",
    });
    expect(eventCardImagePath(event)).toBe("/event-cards/springfield/larry-fleet-2026-11-12.png");
    const data = eventJsonLd(event);
    expect(data.image).toBe("https://417local.com/event-cards/springfield/larry-fleet-2026-11-12.png");
    expect(JSON.stringify(data)).not.toContain("wp-content");
    expect(JSON.stringify(data)).not.toContain("417 Local");
  });

  it("keeps the same share-image cache key until the card content changes", () => {
    const event = ev({ id: "show", title: "Downtown Show", start: "2026-11-20T01:00:00Z", categories: ["comedy"], venue: "Gillioz Theatre" });
    const model = eventCardModel(event);
    expect(eventCardCacheKey(model)).toBe(eventCardCacheKey(eventCardModel(event)));
    expect(eventCardCacheKey(model)).not.toBe(eventCardCacheKey(eventCardModel({ ...event, title: "Uptown Show" })));
    expect(eventCardCacheKey(eventCardModel(event, { price: "$20" }))).toBe(eventCardCacheKey(model));
  });
});

describe("event card picture", () => {
  it("renders a 1200×630 PNG", async () => {
    const model = eventCardModel(ev({
      id: "show",
      title: "Larry Fleet",
      start: "2026-11-13T02:00:00Z",
      timezone: "America/Chicago",
      categories: ["live-music"],
      venue: "Gillioz Theatre",
    }));
    const png = await renderEventCardPng(model);
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    const meta = await sharp(png).metadata();
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(630);
    expect(meta.format).toBe("png");
    expect(eventCardText(model).join(" ")).not.toContain("417 Local");
  });
});

describe("event card layout", () => {
  it("clamps the title to three lines and uses a 72×56 date tile", () => {
    const css = readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");
    const card = readFileSync(new URL("../src/components/EventCard.astro", import.meta.url), "utf8");
    expect(css).toMatch(/-webkit-line-clamp:\s*3/);
    expect(css).toMatch(/\.date-tile\s*\{[^}]*width:\s*72px/);
    expect(css).toMatch(/\.date-tile\s*\{[^}]*height:\s*56px/);
    // Desktop card layout lives with the component so list pages stay under the inline CSS budget.
    expect(card).toMatch(/@media \(min-width: 641px\)/);
    const list = readFileSync(new URL("../src/components/EventList.astro", import.meta.url), "utf8");
    expect(list).toContain("date-tile");
    expect(list).toContain("event-when");
    expect(list).toContain("eventListTime");
    expect(list).not.toContain("description");
  });
});
