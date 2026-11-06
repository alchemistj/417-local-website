/**
 * Checks the built site in dist/. Run `npm run build` first; without a build these tests are skipped.
 * `npm run verify` builds and then runs the whole suite.
 */
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { REDIRECTS, RETIRED_SLUGS, sourceMatches } from "../src/data/redirects";
import { listsIncludedInBuild } from "../src/lib/lists";
import { buildRoutes } from "../src/lib/routes";
import batch1 from "../docs/build/batch-1.json";
import batch2 from "../docs/build/batch-2.json";
import batch3 from "../docs/build/batch-3.json";
import batch4 from "../docs/build/batch-4.json";
import copy from "../docs/food-and-drink-guide-copy.json";
import { EXPLORE_LINKS } from "../src/data/nav";
import { groupFoodPosts } from "../src/lib/foodGuide";
import { DIST_DIR, postSummaries } from "./helpers/posts";
import { readListSummaries } from "./helpers/lists";
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
const registry = built ? buildRoutes(postSummaries(), listsIncludedInBuild(readListSummaries())) : [];
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
      const expectNoindex = registry.find((r) => r.path === p.route)?.indexable === false;
      expect(noindex, `${p.route} noindex`).toBe(expectNoindex);
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
    expect(locs.some((loc) => loc.includes("/category/"))).toBe(false);
    expect(locs).toContain(`${SITE}/food-and-drink-springfield-mo/`);
    expect(readFileSync(`${DIST_DIR}/robots.txt`, "utf8")).toContain(`Sitemap: ${SITE}/sitemap.xml`);
    const llms = readFileSync(`${DIST_DIR}/llms.txt`, "utf8");
    expect(llms.startsWith("# 417 Local")).toBe(true);
    expect(llms).not.toContain("/category/");
    expect(llms).toContain(`${SITE}/food-and-drink-springfield-mo/`);
    for (const r of registry.filter((r) => r.type === "post")) expect(llms).toContain(`${SITE}${r.path}`);
  });

  it("links no page to a /category/ URL", () => {
    for (const p of allPages) expect(p.html, p.route).not.toMatch(/\/category\//);
  });

  it("builds the Food & Drink guide from the copy file", () => {
    const page = pages.find((p) => p.route === "/food-and-drink-springfield-mo/");
    expect(page, "guide page").toBeTruthy();
    const html = page!.html;
    expect((html.match(/<h1[\s>]/g) ?? []).length).toBe(1);
    const text = decode(html);
    expect(decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "")).toBe(copy.seoTitle);
    expect(html.match(/<meta name="description" content="([^"]*)"/)?.[1]).toBe(copy.description);
    expect(html).toContain(`<link rel="canonical" href="${SITE}${copy.path}">`);
    expect(text).toContain(`>${copy.h1}<`);
    for (const paragraph of copy.intro) expect(text).toContain(paragraph);
    for (const section of copy.sections) {
      expect(text).toContain(section.heading);
      expect(text).toContain(section.lead);
    }
    const hrefs = [...html.matchAll(/class="card-title"[\s\S]*?<a href="([^"]+)"/g)].map((m) => m[1]);
    const grouped = groupFoodPosts(postSummaries().filter((p) => p.category === "food-and-drink"));
    expect(hrefs).toEqual([...grouped.featured, ...grouped.rest].map((p) => `/${p.slug}/`));
  });

  it("points the nav and the Explore Springfield footer at the ranking pages", () => {
    const home = pages.find((p) => p.route === "/")?.html ?? "";
    const header = home.slice(home.indexOf("<header"), home.indexOf("</header>") + "</header>".length);
    const desktop = header.match(/<nav class="nav-desktop"[\s\S]*?<\/nav>/)?.[0] ?? "";
    const menu = header.match(/<details class="menu-mobile"[\s\S]*?<\/details>/)?.[0] ?? "";
    expect(desktop).toContain('href="/food-and-drink-springfield-mo/"');
    expect(desktop).toContain("Food &amp; Drink");
    expect(desktop).toContain("Grow Your Business");
    expect(menu).not.toContain("Grow Your Business");
    expect(header).toMatch(/class="nav-cta-bar"[^>]*>[\s\S]*Grow Your Business/);
    const footer = home.slice(home.indexOf("<footer"));
    const column = footer.split("Explore Springfield")[1]?.split("<h2>")[0] ?? "";
    const links = [...column.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)].map((m) => ({
      href: m[1],
      label: decode(m[2]),
    }));
    expect(links).toEqual(EXPLORE_LINKS);
  });

  it("breadcrumbs point food posts at the guide and other posts at the blog", () => {
    const items = (route: string) => {
      const html = pages.find((p) => p.route === route)?.html ?? "";
      for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
        const data = JSON.parse(m[1]) as { "@type"?: string; itemListElement?: { name: string; item: string }[] };
        if (data["@type"] === "BreadcrumbList") return data.itemListElement ?? [];
      }
      return [];
    };
    const food = items("/best-breweries-in-springfield-mo/");
    expect(food.map((c) => c.name)).toEqual(["Home", "Food & Drink", "Best Breweries in Springfield MO: Top Locally Crafted Beer"]);
    expect(food.map((c) => c.item)).toEqual([
      `${SITE}/`,
      `${SITE}/food-and-drink-springfield-mo/`,
      `${SITE}/best-breweries-in-springfield-mo/`,
    ]);
    const other = items("/best-parks-in-springfield-mo/");
    expect(other.map((c) => c.name)).toEqual(["Home", "Blog", "Top Parks in Springfield MO: Find Nature Attractions and Fun, Fast!"]);
    expect(other[1]?.item).toBe(`${SITE}/blog/`);
    expect(other.some((c) => c.item.includes("/category/"))).toBe(false);
  });

  it("drops the retired free-book paragraph and keeps the food-truck crop", () => {
    const success = pages.find((p) => p.route === "/small-business-success/")?.html ?? "";
    expect(success.toLowerCase()).not.toContain("free book");
    for (const route of ["/", "/food-and-drink-springfield-mo/", "/best-food-trucks-in-springfield-mo/"]) {
      expect(pages.find((p) => p.route === route)?.html ?? "", route).toContain("--hero-pos: center 20%");
    }
    const blogCard = pages.find((p) => p.route.startsWith("/blog/") && p.html.includes('href="/best-food-trucks-in-springfield-mo/"'));
    expect(blogCard, "food truck card on a blog page").toBeTruthy();
    expect(blogCard!.html).toContain("--hero-pos: center 20%");
  });

  it("has no visible breadcrumb on any page but keeps BreadcrumbList JSON-LD on articles", () => {
    const listPaths = new Set(registry.filter((r) => r.type === "list").map((r) => r.path));
    for (const p of pages) {
      if (listPaths.has(p.route)) continue;
      expect(p.html, p.route).not.toMatch(/aria-label="Breadcrumb"|class="breadcrumbs"/);
    }
    const kids = pages.find((p) => p.route === "/best-kids-activities-in-springfield-mo/")?.html ?? "";
    expect(kids).toContain('"@type":"BreadcrumbList"');
  });

  it("builds the homepage hero as a real inline <img> first in <body>, with the parse marker and no preload", () => {
    const home = pages.find((p) => p.route === "/")?.html ?? "";
    const body = home.slice(home.indexOf("<body"));
    const firstImg = body.search(/<img[\s>]/);
    expect(firstImg).toBeGreaterThan(-1);
    expect(body.slice(0, firstImg)).not.toMatch(/<header|<h1|<nav/);
    expect(body).toMatch(/<img[^>]*class="atf-photo"[^>]*src="data:image\/avif;base64,[^"]+"[^>]*fetchpriority="high"/);
    expect(body.indexOf('class="atf-ready"')).toBeGreaterThan(body.indexOf("<h1"));
    expect(home).not.toMatch(/rel="preload"/);
  });

  it("renders landing pages without an Updated line or a top photo, and articles with both", () => {
    for (const slug of ["best-things-to-do-in-springfield-mo", "small-business-success"]) {
      const html = pages.find((p) => p.route === `/${slug}/`)?.html ?? "";
      expect(html, slug).not.toMatch(/class="byline"|class="article-top"/);
    }
    const post = pages.find((p) => p.route === "/best-breweries-in-springfield-mo/")?.html ?? "";
    expect(post).toMatch(/class="byline">Updated /);
    expect(post).toContain("Read Next");
  });

  it("shows the events empty state when there are no events", () => {
    const hub = pages.find((p) => p.route === "/events/")?.html ?? "";
    if (hub.includes('class="event-list"')) return; // events exist, nothing to check
    expect(hub).toContain("New Springfield business events are added every week. Check back soon or");
    expect(hub).toContain('<a href="/submit-your-event/">submit yours</a>');
  });
});
