import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { eventRun, runRangeLabel } from "./calendarView";
import { eventCardCacheKey, eventCardModel, type EventCardModel } from "./eventCard";
import { categoryIconSvg } from "./eventCardIcons";
import { eventCardImagePath } from "./eventPaths";
import { eventSchema, type EventData } from "./eventSchema";

const require = createRequire(import.meta.url);

type SatoriFont = { name: string; data: Buffer; weight: 400 | 700; style: "normal" };
type Satori = (
  element: unknown,
  options: { width: number; height: number; fonts: SatoriFont[] },
) => Promise<string>;

const satori = (require("satori") as { default: Satori }).default;
const decompress = require("wawoff2").decompress as (input: Buffer) => Promise<Uint8Array>;

const CACHE_DIR = join(process.cwd(), ".cache/event-cards");
const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;

interface FlexNode {
  type: string;
  props: {
    style?: Record<string, string | number>;
    children?: string | FlexNode | FlexNode[];
    src?: string;
    width?: number;
    height?: number;
  };
}

interface FontSet {
  fonts: SatoriFont[];
  files: string[];
}

let fontsPromise: Promise<FontSet> | null = null;

async function openSans(weight: 400 | 700): Promise<Buffer> {
  const file = require.resolve(`@fontsource/open-sans/files/open-sans-latin-${weight}-normal.woff2`);
  return Buffer.from(await decompress(readFileSync(file)));
}

function loadFonts(): Promise<FontSet> {
  if (!fontsPromise) {
    fontsPromise = (async () => {
      const regular = await openSans(400);
      const bold = await openSans(700);
      const dir = join(CACHE_DIR, "fonts");
      mkdirSync(dir, { recursive: true });
      const regularPath = join(dir, "open-sans-400.ttf");
      const boldPath = join(dir, "open-sans-700.ttf");
      writeFileSync(regularPath, regular);
      writeFileSync(boldPath, bold);
      const fonts: SatoriFont[] = [
        { name: "Open Sans", data: regular, weight: 400, style: "normal" },
        { name: "Open Sans", data: bold, weight: 700, style: "normal" },
      ];
      return { fonts, files: [regularPath, boldPath] };
    })();
  }
  return fontsPromise;
}

function block(text: string, style: Record<string, string | number>): FlexNode {
  return { type: "div", props: { style, children: text } };
}

/** The share picture: the card, without the header-only price line. */
export function eventCardNode(model: EventCardModel): FlexNode {
  const text: FlexNode[] = [];
  if (model.category) {
    text.push(block(model.category, {
      fontSize: 22,
      fontWeight: 700,
      letterSpacing: 3,
      textTransform: "uppercase",
      color: "#ffffff",
    }));
  }
  text.push(block(model.title, {
    width: 760,
    marginTop: model.category ? 14 : 0,
    fontSize: 52,
    fontWeight: 700,
    lineHeight: 1.15,
    lineClamp: 3,
    color: "#ffffff",
  }));
  if (model.runLabel) {
    text.push(block(model.runLabel, { marginTop: 18, fontSize: 28, fontWeight: 400, color: "#ffffff" }));
  }
  if (model.venueLine) {
    text.push(block(model.venueLine, {
      marginTop: "auto",
      paddingTop: 20,
      fontSize: 28,
      fontWeight: 400,
      lineHeight: 1.3,
      lineClamp: 2,
      color: "#ffffff",
      width: 760,
    }));
  }
  const icon = `data:image/svg+xml,${encodeURIComponent(categoryIconSvg(model.palette.id))}`;
  return {
    type: "div",
    props: {
      style: {
        width: `${CARD_WIDTH}px`,
        height: `${CARD_HEIGHT}px`,
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        backgroundImage: `linear-gradient(135deg, ${model.palette.from} 0%, ${model.palette.to} 100%)`,
        color: "#ffffff",
        fontFamily: "Open Sans",
        padding: "48px",
        position: "relative",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              width: 268,
              height: 534,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              backgroundColor: "rgba(0,0,0,0.18)",
              borderRadius: 20,
              padding: "28px",
              flexShrink: 0,
            },
            children: [
              block(model.month, { fontSize: 26, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#ffffff" }),
              block(model.day, { marginTop: 6, fontSize: 108, fontWeight: 700, lineHeight: 0.9, color: "#ffffff" }),
              block(model.schedule, { marginTop: 14, fontSize: 24, fontWeight: 400, color: "#ffffff" }),
            ],
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              width: 800,
              height: 534,
              marginLeft: 36,
            },
            children: text,
          },
        },
        {
          type: "img",
          props: {
            src: icon,
            width: 188,
            height: 188,
            style: { position: "absolute", top: "36px", left: "964px", opacity: 0.13 },
          },
        },
      ],
    },
  };
}

export async function renderEventCardPng(model: EventCardModel): Promise<Buffer> {
  const { fonts, files } = await loadFonts();
  const svg = await satori(eventCardNode(model), { width: CARD_WIDTH, height: CARD_HEIGHT, fonts });
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: CARD_WIDTH },
    font: { loadSystemFonts: false, fontFiles: files, defaultFontFamily: "Open Sans" },
  });
  return Buffer.from(resvg.render().asPng());
}

export function readEventDirectory(dir: string): EventData[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json") && !name.startsWith("_"))
    .map((name) => eventSchema.parse(JSON.parse(readFileSync(join(dir, name), "utf8")) as unknown));
}

/** Model used for the share image. The price line stays on the page header. */
export function eventShareModel(event: EventData, events: EventData[], now: Date): EventCardModel {
  return eventCardModel(event, { runRange: runRangeLabel(eventRun(event, events, now)), price: "" });
}

/**
 * Writes one PNG per event under `outDir` (the public directory, or dist).
 * Unchanged cards are copied from `.cache/event-cards`.
 */
export async function writeEventCardImages(options: { outDir: string; eventsDir: string; now?: Date }): Promise<{ rendered: number; cached: number }> {
  const events = readEventDirectory(options.eventsDir);
  const now = options.now ?? new Date();
  rmSync(join(options.outDir, "event-cards"), { recursive: true, force: true });
  mkdirSync(CACHE_DIR, { recursive: true });
  let rendered = 0;
  let cached = 0;
  for (const event of events) {
    const model = eventShareModel(event, events, now);
    const cacheFile = join(CACHE_DIR, `${eventCardCacheKey(model)}.png`);
    if (!existsSync(cacheFile)) {
      try {
        writeFileSync(cacheFile, await renderEventCardPng(model));
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(`Event card image failed for ${event.id} (${event.title}): ${reason}`, { cause: error });
      }
      rendered += 1;
    } else {
      cached += 1;
    }
    const dest = join(options.outDir, eventCardImagePath(event).replace(/^\//, ""));
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(cacheFile, dest);
  }
  return { rendered, cached };
}
