import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { REBUILDING } from "../src/data/staticPages";
import { redirectRoutes } from "../src/data/vercelRoutes";
import { buildRoutes } from "../src/lib/routes";
import { DIST_DIR } from "./helpers/posts";
import { decode } from "./helpers/html";

const PATH = "/rebuilding-417-local/";
const SITE = "https://417local.com";
const builtFile = `${DIST_DIR}/rebuilding-417-local/index.html`;
const built = existsSync(builtFile);

/** Baseline strings from docs/spec-case-study-2026-11-14.md. Do not reword the figures. */
const BASELINE = [
  "Jul 11, 2025 – Nov 10, 2026",
  "16 months",
  "https://417local.com/",
  "3,189 clicks and 493,217 impressions across 770 pages",
  "no content updates in years",
  "best-kids-activities",
  "616",
  "87,879",
  "11.7",
  "best-date-night-ideas",
  "468",
  "36,986",
  "10.5",
  "best-fall-festivals",
  "385",
  "23,355",
  "12.0",
  "/events/",
  "178",
  "15,049",
  "19.8",
  "14,028 impressions at position 8 with 23 clicks",
  "about 2,840 impressions across 288 queries, mostly position 18–60",
  "54 posts, 22 pages and 932 old event URLs last touched in 2021–2022",
  "67 kept, 680 redirected",
  "Why we're doing this",
  "Where it started",
  "What we changed",
  "What we'll measure",
  "What's next",
  "Fluid Frame's open lab",
  "Rebuilt on Astro.",
  "Launch date (TBD).",
  "Monthly updates.",
];

describe("case-study draft route", () => {
  it("registers /rebuilding-417-local/ as noindex so sitemap and llms.txt omit it", () => {
    expect(REBUILDING).toMatchObject({ path: PATH, indexable: false });
    const route = buildRoutes([]).find((entry) => entry.path === PATH);
    expect(route?.indexable).toBe(false);
    expect(buildRoutes([]).filter((entry) => entry.indexable).some((entry) => entry.path === PATH)).toBe(false);
  });

  it("is not a redirect", () => {
    const routes = redirectRoutes();
    expect(routes.find((route) => new RegExp(route.src).test(PATH))).toBeUndefined();
    expect(routes.find((route) => new RegExp(route.src).test("/rebuilding-417-local"))).toBeUndefined();
  });
});

describe.skipIf(!built)("built case-study draft", () => {
  const html = built ? readFileSync(builtFile, "utf8") : "";
  const text = decode(html);
  const main = text.slice(text.indexOf("<main"), text.indexOf("</main>"));

  it("is noindex, with one title and the draft banner", () => {
    expect(html).toMatch(/<meta name="robots" content="noindex"\s*\/?>/);
    expect(html).toContain(`<link rel="canonical" href="${SITE}${PATH}">`);
    expect(text).toContain("<title>How we're rebuilding 417 Local in the open | 417 Local</title>");
    expect((html.match(/<h1[\s>]/g) ?? []).length).toBe(1);
    expect(text).toContain("Preview only");
    expect(text).toContain("Updated November 15, 2026");
    expect(text).toContain("Fluid Frame");
    expect(text).toContain("Started November 2026");
  });

  it("keeps the baseline figures exactly as written in the spec", () => {
    for (const line of BASELINE) expect(main, line).toContain(line);
  });

  it("does not say “this website” or “this page”", () => {
    expect(main.toLowerCase()).not.toMatch(/this (website|page)/);
  });

  it("stays out of sitemap.xml and llms.txt", () => {
    const sitemap = readFileSync(`${DIST_DIR}/sitemap.xml`, "utf8");
    const llms = readFileSync(`${DIST_DIR}/llms.txt`, "utf8");
    expect(sitemap).not.toContain(`${SITE}${PATH}`);
    expect(sitemap).not.toContain(PATH);
    expect(llms).not.toContain(PATH);
    expect(llms).not.toContain("Rebuilding 417 Local");
  });

  it("adds no external stylesheet or font, and no anchors in the article", () => {
    expect(html).not.toMatch(/<link[^>]+rel="stylesheet"/);
    expect(html).not.toMatch(/fonts\.googleapis\.com/);
    expect(main).not.toMatch(/<a\s/);
  });
});
