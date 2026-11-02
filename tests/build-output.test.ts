/**
 * Checks the built site in dist/. Run `npm run build` first; without a build these tests are skipped.
 * `npm run verify` builds and then runs the whole suite.
 */
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { REDIRECTS, RETIRED_SLUGS, sourceMatches } from "../src/data/redirects";
import { buildRoutes } from "../src/lib/routes";
import batch1 from "../docs/build/batch-1.json";
import batch2 from "../docs/build/batch-2.json";
import batch3 from "../docs/build/batch-3.json";
import batch4 from "../docs/build/batch-4.json";
import { DIST_DIR, postSummaries } from "./helpers/posts";
import { decode, htmlFiles, routeOf } from "./helpers/html";

const built = existsSync(`${DIST_DIR}/index.html`);
const SITE = "https://417local.com";

interface Page {
  route: string;
  html: string;
}

const allPages: Page[] = built
  ? htmlFiles(DIST_DIR).map((file) => ({ route: routeOf(DIST_DIR, file), html: readFileSync(file, "utf8") }))
  : [];
// The 404 page is served by Vercel for unknown paths; it is not a route, so it is checked on its own below.
const notFound = allPages.find((p) => p.route === "/404.html");
const pages: Page[] = allPages.filter((p) => p.route !== "/404.html");
const registry = built ? buildRoutes(postSummaries()) : [];
const routeSet = new Set(registry.map((r) => r.path));

function internalTarget(href: string): string | null {
  const clean = decode(href).trim();
  if (clean.startsWith(SITE)) return clean.slice(SITE.length).split(/[?#]/)[0] || "/";
  if (clean.startsWith("/") && !clean.startsWith("//")) return clean.split(/[?#]/)[0];
  return null;
}

describe.skipIf(!built)("built site", () => {
  it("builds exactly the pages in the route registry", () => {
    const built = pages.map((p) => p.route).sort();
    expect(built).toEqual([...routeSet].sort());
  });

  it("builds a noindex 404 page with one <h1>", () => {
    expect(notFound, "dist/404.html").toBeTruthy();
    expect((notFound!.html.match(/<h1[\s>]/g) ?? []).length).toBe(1);
    expect(notFound!.html).toMatch(/<meta name="robots" content="noindex/);
  });

  it("has exactly one <h1> on every page", () => {
    for (const p of pages) {
      expect((p.html.match(/<h1[\s>]/g) ?? []).length, p.route).toBe(1);
    }
  });

  it("has a unique <title> and a unique meta description on every page", () => {
    const titles = new Map<string, string>();
    const descriptions = new Map<string, string>();
    for (const p of pages) {
      const title = p.html.match(/<title>([^<]+)<\/title>/)?.[1];
      const desc = p.html.match(/<meta name="description" content="([^"]*)"/)?.[1];
      expect(title, `${p.route} title`).toBeTruthy();
      expect(desc, `${p.route} description`).toBeTruthy();
      expect(titles.get(title as string), `duplicate title on ${p.route}`).toBeUndefined();
      expect(descriptions.get(desc as string), `duplicate description on ${p.route}`).toBeUndefined();
      titles.set(title as string, p.route);
      descriptions.set(desc as string, p.route);
    }
  });

  it("has a canonical tag on the canonical host, valid JSON-LD and no stray noindex", () => {
    for (const p of pages) {
      expect(p.html, p.route).toContain(`<link rel="canonical" href="${SITE}${p.route}">`);
      for (const m of p.html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
        expect(() => JSON.parse(m[1]), `${p.route} JSON-LD`).not.toThrow();
      }
      const noindex = /<meta name="robots" content="noindex/.test(p.html);
      expect(noindex, `${p.route} noindex`).toBe(p.route === "/thank-you/");
    }
  });

  it("has no internal link to a retired slug, a redirected URL or a page that does not exist", () => {
    const problems: string[] = [];
    for (const p of pages) {
      for (const m of p.html.matchAll(/<a\s[^>]*?href="([^"]*)"/g)) {
        const target = internalTarget(m[1]);
        if (target === null) continue;
        const hasExtension = /\.[a-z0-9]+$/i.test(target);
        if (hasExtension) {
          if (!existsSync(`${DIST_DIR}${target}`)) problems.push(`${p.route} -> ${target} (missing file)`);
          continue;
        }
        const bare = target.replace(/^\/|\/$/g, "");
        if (RETIRED_SLUGS.includes(bare)) problems.push(`${p.route} -> ${target} (retired)`);
        else if (REDIRECTS.some((r) => sourceMatches(r.source, target))) problems.push(`${p.route} -> ${target} (redirected)`);
        else if (!routeSet.has(target)) problems.push(`${p.route} -> ${target} (no such route)`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("serves every kept article at its old slug", () => {
    const slugs = [...batch1, ...batch2, ...batch3, ...batch4].map((a) => a.slug);
    const missing = slugs.filter((s) => !routeSet.has(`/${s}/`));
    expect(missing).toEqual([]);
  });

  it("links no hot-linked WordPress or third-party image hosts and no Supabase", () => {
    for (const p of pages) {
      expect(p.html, p.route).not.toContain("supabase.co");
      expect(p.html, p.route).not.toMatch(/wp-content/);
      for (const m of p.html.matchAll(/<img\s[^>]*?src="([^"]*)"/g)) {
        expect(m[1].startsWith("http"), `${p.route} img ${m[1]}`).toBe(false);
      }
    }
  });

  it("keeps inlined CSS under 30 KB and ships no external stylesheet or font", () => {
    for (const p of pages) {
      const css = [...p.html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].reduce((n, m) => n + m[1].length, 0);
      expect(css, `${p.route} css bytes`).toBeLessThan(30 * 1024);
      expect(p.html, p.route).not.toMatch(/<link[^>]+rel="stylesheet"/);
      expect(p.html, p.route).not.toMatch(/fonts\.googleapis\.com|rel="preload"/);
    }
  });

  it("renders both forms in the server HTML with a honeypot and the agreed keys", () => {
    const contact = pages.find((p) => p.route === "/contact-us/")?.html ?? "";
    const submit = pages.find((p) => p.route === "/submit-your-event/")?.html ?? "";
    expect(contact).toContain('data-form-key="contact"');
    expect(submit).toContain('data-form-key="submit-event"');
    for (const html of [contact, submit]) {
      expect(html).toContain('name="website_url"');
      expect(html).toMatch(/<form[^>]*data-lead-form/);
    }
  });

  it("generates sitemap.xml, robots.txt and llms.txt from the registry", () => {
    const sitemap = readFileSync(`${DIST_DIR}/sitemap.xml`, "utf8");
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs.sort()).toEqual(registry.filter((r) => r.indexable).map((r) => `${SITE}${r.path}`).sort());
    expect(locs).not.toContain(`${SITE}/thank-you/`);
    expect(readFileSync(`${DIST_DIR}/robots.txt`, "utf8")).toContain(`Sitemap: ${SITE}/sitemap.xml`);
    const llms = readFileSync(`${DIST_DIR}/llms.txt`, "utf8");
    expect(llms.startsWith("# 417 Local")).toBe(true);
    for (const r of registry.filter((r) => r.type === "post")) expect(llms).toContain(`${SITE}${r.path}`);
  });

  it("shows the events empty state when there are no events", () => {
    const hub = pages.find((p) => p.route === "/events/")?.html ?? "";
    if (hub.includes('class="event-list"')) return; // events exist, nothing to check
    expect(hub).toContain("New Springfield business events are added every week. Check back soon or");
    expect(hub).toContain('<a href="/submit-your-event/">submit yours</a>');
  });
});
