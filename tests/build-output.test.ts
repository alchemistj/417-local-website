/**
 * Checks the built site in dist/. Run `npm run build` first; without a build these tests are skipped.
 * `npm run verify` builds and then runs the whole suite.
 */
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import eventsCopy from "../docs/events-pages-copy.json";
import { REDIRECTS, RETIRED_SLUGS, sourceMatches } from "../src/data/redirects";
import { GENERAL_EVENT_CATEGORIES } from "../src/lib/eventSchema";
import { builtMonths, monthLabel, monthPageTitle, runCanonicalPath } from "../src/lib/calendarView";
import { cityWeekendPage } from "../src/data/staticPages";
import { WEEKEND_INTRO } from "../src/data/weekendCities";
import { eventSectionRoutes, listedCategories } from "../src/lib/eventRoutes";
import { WEEKEND_CITY_SLUGS, cityDisplayName, eventCitySlug, eventPath } from "../src/lib/eventPaths";
import { thisWeekendView } from "../src/lib/events";
import { uniqueUpcomingEvents } from "../src/lib/calendarView";
import { readRecurringDir } from "../src/lib/recurring";
import { listsIncludedInBuild } from "../src/lib/lists";
import { buildRoutes } from "../src/lib/routes";
import { readSiteEvents } from "./helpers/events";
import batch1 from "../docs/build/batch-1.json";
import batch2 from "../docs/build/batch-2.json";
import batch3 from "../docs/build/batch-3.json";
import batch4 from "../docs/build/batch-4.json";
import copy from "../docs/food-and-drink-guide-copy.json";
import { EXPLORE_LINKS } from "../src/data/nav";
import { groupFoodPosts } from "../src/lib/foodGuide";
import { DIST_DIR, postSummaries, ROOT } from "./helpers/posts";
import { readListSummaries } from "./helpers/lists";
import { decode, htmlFiles, routeOf } from "./helpers/html";

const built = existsSync(`${DIST_DIR}/index.html`);
const SITE = "https://417local.com";
const builtAt = new Date();

const siteEvents = built ? readSiteEvents() : [];

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
const registry = built
  ? buildRoutes(postSummaries(), listsIncludedInBuild(readListSummaries()), eventSectionRoutes(siteEvents, builtAt, readRecurringDir(`${ROOT}src/content/recurring`)))
  : [];
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

  it("never hides a page behind .atf without the .atf-ready marker", () => {
    for (const page of pages) {
      if (/class="atf"/.test(page.html)) expect(page.html, page.route).toMatch(/class="atf-ready"/);
    }
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
      const previous = descriptions.get(desc as string);
      if (previous) {
        const here = siteEvents.find((item) => eventPath(item) === p.route);
        const there = siteEvents.find((item) => eventPath(item) === previous);
        const sameTitle = Boolean(here && there && here.title.trim().toLowerCase() === there.title.trim().toLowerCase());
        expect(sameTitle, `duplicate description on ${p.route} and ${previous}`).toBe(true);
      } else {
        descriptions.set(desc as string, p.route);
      }
      titles.set(title as string, p.route);
    }
  });

  it("has a canonical tag on the canonical host, valid JSON-LD and no stray noindex", () => {
    for (const p of pages) {
      // A later performance of a run points at the run's first upcoming page.
      const event = siteEvents.find((item) => eventPath(item) === p.route);
      const canonicalRoute = event ? runCanonicalPath(event, siteEvents, builtAt) : p.route;
      expect(p.html, p.route).toContain(`<link rel="canonical" href="${SITE}${canonicalRoute}">`);
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
    expect(locs.sort()).toEqual(registry.filter((r) => r.indexable && r.sitemap !== false).map((r) => `${SITE}${r.path}`).sort());
    expect(locs).not.toContain(`${SITE}/thank-you/`);
    expect(locs.some((loc) => loc.includes("/this-weekend/"))).toBe(false);
    for (const slug of WEEKEND_CITY_SLUGS) {
      expect(locs).toContain(`${SITE}/things-to-do-in-${slug}-mo-this-weekend/`);
    }
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

  it("shows a breadcrumb on events pages and keeps it off the rest of the site", () => {
    const listPaths = new Set(registry.filter((r) => r.type === "list").map((r) => r.path));
    const eventsShell = (route: string) =>
      route.startsWith("/events/") || /^\/things-to-do-in-[a-z0-9-]+-mo-this-weekend\/$/.test(route);
    for (const p of pages) {
      if (listPaths.has(p.route) || eventsShell(p.route)) continue;
      expect(p.html, p.route).not.toMatch(/aria-label="Breadcrumb"|class="breadcrumbs"/);
    }
    for (const route of ["/events/", "/events/springfield/", "/things-to-do-in-springfield-mo-this-weekend/"]) {
      const html = pages.find((p) => p.route === route)?.html ?? "";
      expect(html, route).toMatch(/<nav class="crumbs" aria-label="Breadcrumb"/);
      expect(html, route).toContain(">Home<");
      expect(html, route).toContain(">Events<");
      expect(html, route).toContain('"@type":"BreadcrumbList"');
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

  it("shows the 417 events hub and an empty state when no city has events", () => {
    const hub = pages.find((p) => p.route === "/events/")?.html ?? "";
    expect(decode(hub.match(/<title>([^<]*)<\/title>/)?.[1] ?? "")).toBe(eventsCopy.region.seoTitle);
    if (hub.includes('href="/events/springfield/"') || hub.includes('href="/events/republic/"')) return;
    expect(decode(hub)).toContain(eventsCopy.region.emptyState);
  });

  it("builds city hubs, this weekend, and category pages under /events/{city}/", () => {
    const expectCopy = (html: string, route: string, seoTitle: string, description: string, h1: string, intro: readonly string[]) => {
      expect((html.match(/<h1[\s>]/g) ?? []).length, route).toBe(1);
      expect(decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? ""), route).toBe(seoTitle);
      expect(decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? ""), route).toBe(description);
      const text = decode(html);
      expect(text, route).toContain(`>${h1}<`);
      for (const paragraph of intro) expect(text, route).toContain(paragraph);
    };

    const hub = pages.find((p) => p.route === "/events/")?.html ?? "";
    expectCopy(hub, "/events/", eventsCopy.region.seoTitle, eventsCopy.region.description, eventsCopy.region.h1, eventsCopy.region.intro);
    expect(decode(hub)).toContain("Don't miss across Southwest Missouri: the next 4 weeks");
    expect(decode(hub)).toContain("More towns");
    const hero = hub.slice(hub.indexOf('aria-label="Southwest Missouri cities"'), hub.indexOf('id="dont-miss-heading"'));
    const heroHubs = [...hero.matchAll(/href="(\/events\/[a-z0-9-]+\/)"/g)].map((match) => match[1]);
    expect(heroHubs.filter((href, index) => heroHubs.indexOf(href) === index).slice(0, 5)).toEqual(
      WEEKEND_CITY_SLUGS.map((slug) => `/events/${slug}/`),
    );
    for (const slug of WEEKEND_CITY_SLUGS) {
      expect(hub, slug).toContain(`href="/things-to-do-in-${slug}-mo-this-weekend/"`);
      expect(hub, slug).toContain(`${cityDisplayName(slug)} events`);
    }
    expect(hub).toContain('href="/events/springfield/"');
    expect(hub).toContain('href="/events/springfield-business-events/"');
    expect(hub).not.toContain('href="/events/this-weekend/"');
    expect(hub).not.toContain('href="/events/live-music/"');

    const springfield = siteEvents.filter((event) => eventCitySlug(event) === "springfield");
    const cityHub = pages.find((p) => p.route === "/events/springfield/")?.html ?? "";
    expectCopy(cityHub, "/events/springfield/", eventsCopy.hub.seoTitle, eventsCopy.hub.description, eventsCopy.hub.h1, eventsCopy.hub.intro);
    expect(decode(cityHub)).toContain(eventsCopy.hub.businessLink);

    const headings = [...cityHub.matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/g)].map((m) => decode(m[1].replace(/<[^>]+>/g, "")));
    expect(headings.some((text) => /this weekend/i.test(text))).toBe(false);
    expect(cityHub).toContain('href="/things-to-do-in-springfield-mo-this-weekend/"');
    const unique = uniqueUpcomingEvents(springfield, [], "springfield", builtAt);
    if (unique.length > 0) expect(headings).toContain(eventsCopy.hub.upcomingHeading);
    for (const event of unique) expect(decode(cityHub)).toContain(event.title);

    const builtCategories = listedCategories(springfield, builtAt);
    for (const slug of GENERAL_EVENT_CATEGORIES) {
      const href = `href="/events/springfield/${slug}/"`;
      if (builtCategories.includes(slug)) expect(cityHub).toContain(href);
      else expect(cityHub).not.toContain(href);
    }

    const weekendPage = pages.find((p) => p.route === "/things-to-do-in-springfield-mo-this-weekend/");
    expect(weekendPage, "/things-to-do-in-springfield-mo-this-weekend/").toBeTruthy();
    const weekendHtml = weekendPage!.html;
    expectCopy(
      weekendHtml,
      "/things-to-do-in-springfield-mo-this-weekend/",
      eventsCopy.thisWeekend.seoTitle,
      cityWeekendPage("springfield", siteEvents, builtAt).description,
      eventsCopy.thisWeekend.h1,
      eventsCopy.thisWeekend.intro,
    );
    const crumbs = [...weekendHtml.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      .map((match) => JSON.parse(match[1]) as { "@type"?: string; itemListElement?: { name: string; item: string }[] })
      .find((data) => data["@type"] === "BreadcrumbList");
    expect(crumbs?.itemListElement?.map((item) => item.name)).toEqual(["Home", "Events", "Springfield", eventsCopy.thisWeekend.h1]);
    expect(crumbs?.itemListElement?.map((item) => item.item)).toEqual([
      `${SITE}/`,
      `${SITE}/events/`,
      `${SITE}/events/springfield/`,
      `${SITE}/things-to-do-in-springfield-mo-this-weekend/`,
    ]);

    const joplin = pages.find((page) => page.route === "/things-to-do-in-joplin-mo-this-weekend/");
    expect(joplin, "joplin weekend page").toBeTruthy();
    const joplinText = decode(joplin!.html);
    expect(joplinText).toContain(WEEKEND_INTRO.joplin);
    expect(joplinText).not.toContain(WEEKEND_INTRO.springfield);
    expect(joplinText).toContain(">Things to Do in Joplin, MO This Weekend<");
    expect(joplin!.html).toContain(`<link rel="canonical" href="${SITE}/things-to-do-in-joplin-mo-this-weekend/">`);
    for (const page of pages) {
      expect(page.html, page.route).not.toMatch(/href="\/events\/[^"]*this-weekend\/"/);
    }

    const view = thisWeekendView(springfield, builtAt);
    const weekendText = decode(weekendHtml);
    expect(weekendText).toContain("Worth the drive this weekend");
    expect(weekendHtml).not.toMatch(/href="\/events\/[^"]*this-weekend\/"/);
    if (view.mode === "weekend") {
      expect(weekendText).not.toContain(eventsCopy.thisWeekend.emptyState);
      for (const group of view.groups) {
        expect(weekendText).toContain(group.heading);
        for (const event of group.events) expect(weekendText).toContain(event.title);
      }
    } else {
      expect(weekendText).toContain(eventsCopy.thisWeekend.emptyState);
      for (const event of view.fallback) expect(weekendText).toContain(event.title);
    }

    for (const slug of GENERAL_EVENT_CATEGORIES) {
      const route = `/events/springfield/${slug}/`;
      const page = pages.find((item) => item.route === route);
      const wanted = builtCategories.includes(slug);
      expect(Boolean(page), route).toBe(wanted);
      expect(routeSet.has(route), route).toBe(wanted);
      if (!page) continue;
      const pageCopy = eventsCopy.categories[slug];
      expectCopy(page.html, route, pageCopy.seoTitle, pageCopy.description, pageCopy.h1, pageCopy.intro);
      const categoryCrumbs = [...page.html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
        .map((match) => JSON.parse(match[1]) as { "@type"?: string; itemListElement?: { name: string }[] })
        .find((data) => data["@type"] === "BreadcrumbList");
      expect(categoryCrumbs?.itemListElement?.map((item) => item.name)).toEqual(["Home", "Events", "Springfield", pageCopy.h1]);
    }
  });

  it("builds the symphony page, a time-not-listed page, and calendar files", () => {
    const symphony = siteEvents.find((event) => event.slug === "springfield-symphony-a-holiday-christmas");
    const story = siteEvents.find((event) => event.slug === "garden-story-time");
    const tbd = siteEvents.find((event) => event.time_tbd === true);
    expect(symphony && story && tbd).toBeTruthy();

    const symphonyRoute = eventPath(symphony!);
    const symphonyHtml = pages.find((page) => page.route === symphonyRoute)?.html ?? "";
    expect(symphonyHtml).toContain("Add to calendar");
    expect(symphonyHtml).toContain("20261219T193000%2F20261219T213000");
    expect(symphonyHtml).toContain("ctz=America%2FChicago");
    expect(symphonyHtml).toContain(`${symphonyRoute}event.ics`);
    expect(symphonyHtml).not.toContain('target="_blank"');
    expect(symphonyHtml).toContain('rel="noopener"');
    expect(symphonyHtml).toContain('"@type":"Event"');
    expect(symphonyHtml).toContain("2026-12-19T19:30:00-06:00");
    const ics = readFileSync(`${DIST_DIR}${symphonyRoute}event.ics`, "utf8");
    expect(ics).toContain("DTSTART;TZID=America/Chicago:20261219T193000");
    expect(ics).toContain("DTEND;TZID=America/Chicago:20261219T213000");
    expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true);

    const storyHtml = pages.find((page) => page.route === eventPath(story!))?.html ?? "";
    expect(storyHtml).toContain(">Event details<");
    expect(storyHtml).toContain('rel="noopener"');

    const tbdRoute = eventPath(tbd!);
    const tbdHtml = decode(pages.find((page) => page.route === tbdRoute)?.html ?? "");
    expect(tbdHtml).toContain("Time TBD");
    const tbdIcs = readFileSync(`${DIST_DIR}${tbdRoute}event.ics`, "utf8");
    expect(tbdIcs).toContain("DTSTART;VALUE=DATE:");
  });

  it("builds the calendar, a day page, and category chips", () => {
    const chipNav = (html: string) => html.split('aria-label="Event categories"')[1]?.split("</nav>")[0] ?? "";
    const chips = (html: string) =>
      [...chipNav(html).matchAll(/<a\b([^>]*)>([^<]*)<\/a>/g)].map((match) => ({
        attrs: match[1],
        label: decode(match[2]),
        current: match[1].includes('aria-current="page"'),
      }));

    const hub = pages.find((page) => page.route === "/events/springfield/")?.html ?? "";
    const hubChips = chips(hub);
    expect(hubChips[0]?.label).toBe("All events");
    expect(hubChips[0]?.current).toBe(true);
    expect(hubChips.at(-1)?.label).toBe("Business events");
    expect(hub).toContain('class="date-strip"');
    expect(hub).toContain('class="date-days"');
    expect(hub).not.toContain('class="month-grid"');

    const [current] = builtMonths(builtAt);
    expect(current).toBeTruthy();
    const calendar = pages.find((page) => page.route === "/events/springfield/calendar/");
    expect(calendar, "/events/springfield/calendar/").toBeTruthy();
    const calendarHtml = calendar!.html;
    expect(decode(calendarHtml.match(/<title>([^<]*)<\/title>/)?.[1] ?? "")).toBe(
      monthPageTitle("Springfield", monthLabel(current!.year, current!.month)),
    );
    expect(calendarHtml).toContain('class="month-grid"');
    expect(calendarHtml).toContain('class="month-agenda"');
    expect(chips(calendarHtml)[0]?.label).toBe("All events");
    expect(chips(calendarHtml).some((chip) => chip.current)).toBe(false);

    const day = pages.find((page) => page.route === "/events/springfield/2026-12-19/");
    expect(day, "/events/springfield/2026-12-19/").toBeTruthy();
    expect(decode(day!.html)).toContain("Events in Springfield on Saturday, December 19");
    const nearby = day!.html.split('aria-label="Nearby days"')[1]?.split("</nav>")[0] ?? "";
    if (nearby.includes("←")) {
      expect(nearby).toMatch(/← (Mon|Tue|Wed|Thu|Fri|Sat|Sun), /);
      expect(nearby).not.toMatch(/← (Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),/);
    }
    expect(chips(day!.html)[0]?.label).toBe("All events");

    const music = pages.find((page) => page.route === "/events/springfield/live-music/");
    if (music) {
      const musicChips = chips(music.html);
      expect(musicChips[0]?.label).toBe("All events");
      expect(musicChips.find((chip) => chip.label === "Live Music")?.current).toBe(true);
      expect(decode(music.html)).toContain("← All Springfield events");
    }

    const weekend = pages.find((page) => page.route === "/things-to-do-in-springfield-mo-this-weekend/");
    expect(weekend).toBeTruthy();
    expect(chips(weekend!.html)[0]?.label).toBe("All events");
    expect(chips(weekend!.html).some((chip) => chip.current)).toBe(false);
  });
});
