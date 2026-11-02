import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { REDIRECTS, RETIRED_SLUGS, sourceMatches } from "../src/data/redirects";
import { buildVercelConfig } from "../src/data/vercelConfig";
import { buildRoutes } from "../src/lib/routes";
import seed from "../docs/build/redirects-seed.json";
import { ROOT, postSummaries } from "./helpers/posts";

const livePaths = buildRoutes(postSummaries()).map((r) => r.path);

describe("vercel.json", () => {
  it("exists and matches the redirect data exactly (run `npm run redirects` to refresh)", () => {
    const file = `${ROOT}vercel.json`;
    expect(existsSync(file)).toBe(true);
    expect(JSON.parse(readFileSync(file, "utf8"))).toEqual(buildVercelConfig());
  });

  it("redirects www to the apex in one hop with a 301", () => {
    const [first] = buildVercelConfig().redirects as { has?: unknown; destination: string; statusCode: number }[];
    expect(first.has).toEqual([{ type: "host", value: "www.417local.com" }]);
    expect(first.destination).toBe("https://417local.com/$1");
    expect(first.statusCode).toBe(301);
  });
});

describe("redirect data", () => {
  const sources = REDIRECTS.map((r) => r.source);

  it("has unique sources", () => {
    expect(new Set(sources).size).toBe(sources.length);
  });

  it("has both slash forms for every retired slug", () => {
    for (const slug of Object.keys(seed.retired_to)) {
      expect(sources, slug).toContain(`/${slug}`);
      expect(sources, slug).toContain(`/${slug}/`);
    }
  });

  it("converts wildcard patterns to Vercel :path* syntax", () => {
    for (const pattern of Object.keys(seed.patterns)) {
      expect(sources).toContain(`${pattern.slice(0, -2)}/:path*`);
    }
    expect(sources.some((s) => s.includes("*") && !s.endsWith(":path*"))).toBe(false);
  });

  it("includes the author archives and the four image redirects", () => {
    expect(sources).toEqual(expect.arrayContaining(["/author/sigafus/", "/author/team/", "/author/sigafus", "/author/team"]));
    const byImage = Object.fromEntries(REDIRECTS.map((r) => [r.source, r.destination]));
    expect(byImage["/wp-content/uploads/2021/07/bass-pro-shops-in-springfield-mo.jpg"]).toBe("/best-things-to-do-in-springfield-mo/");
    expect(byImage["/wp-content/uploads/2021/07/playground-at-McBride-Park.jpg"]).toBe("/best-parks-in-springfield-mo/");
    expect(byImage["/wp-content/uploads/2021/04/largest-fork-springfield-mo.jpg"]).toBe("/largest-fork-springfield-mo/");
    expect(byImage["/wp-content/uploads/2021/07/playground-and-stream-at-sequiota.jpeg"]).toBe("/sequiota-park-springfield/");
  });

  it("redirects the old events plugin URLs but never the real events pages", () => {
    expect(sources).toEqual(
      expect.arrayContaining(["/events/categories/:path*", "/events/locations/:path*", "/events/tags/:path*", "/events_/:path*", "/events/my-bookings/"]),
    );
    expect(sources).not.toContain("/events/");
    expect(sources).not.toContain("/events");
    expect(sources.filter((s) => s.startsWith("/events/springfield-business-events"))).toEqual([]);
  });

  it("never matches a live route", () => {
    for (const r of REDIRECTS) {
      for (const path of livePaths) {
        expect(sourceMatches(r.source, path), `${r.source} would swallow live route ${path}`).toBe(false);
      }
    }
  });

  it("never lets an article use a retired slug", () => {
    const posts = postSummaries().map((p) => p.slug);
    for (const slug of RETIRED_SLUGS) expect(posts, slug).not.toContain(slug);
  });

  it("sends every on-site redirect to a page that exists", () => {
    for (const r of REDIRECTS) {
      // Old short links (affiliate, booking, giveaway) point off-site on purpose.
      if (/^https?:\/\//.test(r.destination)) continue;
      expect(livePaths, `${r.source} -> ${r.destination}`).toContain(r.destination.split("?")[0]);
    }
  });

  it("keeps old short links as temporary redirects", () => {
    const offSite = REDIRECTS.filter((r) => /^https?:\/\//.test(r.destination));
    expect(offSite.length).toBeGreaterThan(0);
    for (const r of offSite) expect(r.statusCode, r.source).toBe(307);
  });
});
