import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import copy from "../docs/best-of-hub-copy.json";
import { HOW_WE_PICK, LOCAL_BUSINESS_GUIDE } from "../src/data/staticPages";
import { listBusinessSchema, listSchema, type ListBusiness } from "../src/lib/listSchema";
import {
  assertNoSlugCollision,
  breadcrumbLd,
  faqLd,
  listCrumbs,
  listIsBuilt,
  listItemListLd,
  listsIncludedInBuild,
  publishedOnly,
  splitDisclosure,
  visibleBusinesses,
} from "../src/lib/lists";
import { buildRoutes } from "../src/lib/routes";
import { absoluteUrl } from "../src/lib/site";
import { LISTS_DIR, readListSummaries, readLists } from "./helpers/lists";
import { decode } from "./helpers/html";
import { DIST_DIR, postSummaries } from "./helpers/posts";

const SUMMARY = "S".repeat(180);

function business(overrides: Partial<ListBusiness> = {}): ListBusiness {
  return {
    name: "Sample Roofing Co.",
    googleMapsUrl: "https://www.google.com/maps",
    summary: SUMMARY,
    ffClient: false,
    featured: false,
    ...overrides,
  };
}

function listData(overrides: Record<string, unknown> = {}) {
  return {
    slug: "best-sample-roofers-in-springfield-mo",
    status: "draft" as const,
    trade: "Roofers",
    title: "Best Sample Roofers in Springfield, MO",
    seoTitle: "Sample: Best Roofers in Springfield, MO | 417 Local",
    description: "A sample list used to check the schema.",
    h1: "Best Sample Roofers in Springfield, MO",
    intro: ["One paragraph of intro."],
    criteria: ["Rating", "Review patterns", "Service area"],
    published: "2026-11-06",
    updated: "2026-11-06",
    businesses: [business({ name: "One" }), business({ name: "Two" }), business({ name: "Three" })],
    ...overrides,
  };
}

function jsonKeys(value: unknown, found: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) jsonKeys(item, found);
    return found;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      found.add(key);
      jsonKeys(child, found);
    }
  }
  return found;
}

describe("list schema", () => {
  it("rejects a summary with a quotation mark, a bad slug, a non-Google Maps url, and fewer than 3 businesses", () => {
    expect(listSchema.safeParse(listData()).success).toBe(true);
    for (const mark of ['"', "“", "”"]) {
      const result = listSchema.safeParse(listData({
        businesses: [business({ summary: `${SUMMARY}${mark}` }), business({ name: "Two" }), business({ name: "Three" })],
      }));
      expect(result.success, mark).toBe(false);
    }
    expect(listSchema.safeParse(listData({ slug: "roofers" })).success).toBe(false);
    expect(listSchema.safeParse(listData({ slug: "best-Roofers-in-springfield-mo" })).success).toBe(false);
    expect(listSchema.safeParse(listData({
      businesses: [
        business({ googleMapsUrl: "https://example.com/maps" }),
        business({ name: "Two" }),
        business({ name: "Three" }),
      ],
    })).success).toBe(false);
    expect(listSchema.safeParse(listData({
      businesses: [business({ name: "One" }), business({ name: "Two" })],
    })).success).toBe(false);
  });

  it("accepts a Google Maps url on either host and ignores underscore files", () => {
    const maps = listSchema.safeParse(listData({
      businesses: [
        business({ googleMapsUrl: "https://maps.google.com/maps?q=sample" }),
        business({ name: "Two" }),
        business({ name: "Three" }),
      ],
    }));
    expect(maps.success).toBe(true);
    expect(existsSync(`${LISTS_DIR}/_ignored.json`)).toBe(true);
    expect(readLists().some((list) => list.slug.startsWith("_"))).toBe(false);
    for (const list of readLists()) {
      expect(list.slug).toBe(list.data.slug);
      const parsed = listSchema.safeParse(list.data);
      expect(parsed.success, parsed.success ? list.slug : parsed.error.message).toBe(true);
    }
  });
});

describe("draft and published lists", () => {
  const draft = {
    slug: "best-sample-roofers-in-springfield-mo",
    title: "Sample",
    seoTitle: "Sample: Best Roofers in Springfield, MO | 417 Local",
    description: "Draft sample.",
    updated: new Date("2026-11-06T00:00:00Z"),
    status: "draft" as const,
  };
  const published = {
    ...draft,
    slug: "best-hvac-in-springfield-mo",
    seoTitle: "Best HVAC in Springfield, MO | 417 Local",
    description: "A published list.",
    status: "published" as const,
  };

  it("keeps a draft out of production pages, the sitemap and llms.txt, and builds it noindex otherwise", () => {
    expect(listIsBuilt("draft", "production")).toBe(false);
    expect(listIsBuilt("published", "production")).toBe(true);
    expect(listIsBuilt("draft", "preview")).toBe(true);
    expect(listIsBuilt("draft", "")).toBe(true);
    expect(listIsBuilt("draft")).toBe(process.env.VERCEL_ENV !== "production");

    const production = buildRoutes([], listsIncludedInBuild([draft, published], "production"));
    const productionLists = production.filter((route) => route.type === "list");
    expect(productionLists.map((route) => route.path)).toEqual(["/best-hvac-in-springfield-mo/"]);
    expect(productionLists.every((route) => route.indexable)).toBe(true);
    expect(production.some((route) => route.path.includes("sample"))).toBe(false);

    const preview = buildRoutes([], listsIncludedInBuild([draft, published], "preview"));
    const draftRoute = preview.find((route) => route.path === "/best-sample-roofers-in-springfield-mo/");
    expect(draftRoute?.type).toBe("list");
    expect(draftRoute?.indexable).toBe(false);
    expect(preview.filter((route) => route.indexable).some((route) => route.path.includes("sample"))).toBe(false);
  });

  it("lists only published lists on the hub, including when there are zero", () => {
    expect(publishedOnly([])).toEqual([]);
    expect(publishedOnly([draft, published])).toEqual([published]);
    expect(publishedOnly(readListSummaries()).every((list) => list.status === "published")).toBe(true);
  });

  it("stores no rating, review count, or checked-on date", () => {
    const keys = Object.keys(listBusinessSchema.shape);
    expect(keys).not.toContain("rating");
    expect(keys).not.toContain("reviewCount");
    expect(keys).not.toContain("ratingCheckedOn");
    const parsed = listSchema.parse({
      ...listData(),
      businesses: [business({ name: "One" }), business({ name: "Two" }), business({ name: "Three" })].map((item) => ({
        ...item,
        rating: 4.8,
        reviewCount: 12,
        ratingCheckedOn: "2026-11-01",
      })),
    });
    for (const item of parsed.businesses) {
      expect(item).not.toHaveProperty("rating");
      expect(item).not.toHaveProperty("reviewCount");
      expect(item).not.toHaveProperty("ratingCheckedOn");
    }
  });
});

describe("list pages", () => {
  it("keeps file order when ffClient or featured is set and renders nothing for those flags", () => {
    const businesses = [
      business({ name: "Sample Roofing Co. 1", ffClient: false, featured: false, bestFor: "Storm damage and insurance claims" }),
      business({ name: "Sample Roofing Co. 2", ffClient: true, featured: false }),
      business({ name: "Sample Roofing Co. 3", ffClient: false, featured: true }),
      business({ name: "Sample Roofing Co. 4" }),
      business({ name: "Sample Roofing Co. 5", ffClient: true, featured: true, website: "https://example.com/five" }),
    ];
    const cards = visibleBusinesses(businesses);
    expect(cards.map((card) => card.name)).toEqual(businesses.map((item) => item.name));
    const rendered = JSON.stringify(cards);
    expect(rendered).not.toContain("ffClient");
    expect(rendered).not.toContain("featured");
    expect(rendered).not.toContain("Featured Partner");
    expect(rendered).not.toContain("★");
    expect(rendered).not.toContain("Google reviews (");
    expect(cards[0]?.bestFor).toBe("Storm damage and insurance claims");
    expect(cards[4]?.website).toBe("https://example.com/five");
    expect(cards[1]).not.toHaveProperty("bestFor");
  });

  it("builds ItemList JSON-LD with name and website only, plus breadcrumbs", () => {
    const businesses = [
      business({ name: "Alpha", website: "https://example.com/alpha" }),
      business({ name: "Beta" }),
    ];
    const ld = listItemListLd(businesses);
    expect(ld.itemListElement.map((item) => item.position)).toEqual([1, 2]);
    expect(ld.itemListElement.map((item) => item.item.name)).toEqual(["Alpha", "Beta"]);
    expect(ld.itemListElement[0]?.item.url).toBe("https://example.com/alpha");
    expect(ld.itemListElement[1]?.item).not.toHaveProperty("url");
    const keys = jsonKeys([ld, breadcrumbLd(listCrumbs({ slug: "best-hvac-in-springfield-mo", title: "Best HVAC" })), faqLd([{ q: "Q", a: "A" }])]);
    expect(keys.has("aggregateRating")).toBe(false);
    expect(keys.has("review")).toBe(false);
    expect(listCrumbs({ slug: "best-hvac-in-springfield-mo", title: "Best HVAC" })).toEqual([
      { name: "Home", path: "/" },
      { name: "Local Business Guide", path: "/springfield-mo-local-business-guide/" },
      { name: "Best HVAC", path: "/best-hvac-in-springfield-mo/" },
    ]);
  });

  it("shares no slug with a post", () => {
    const posts = postSummaries().map((post) => post.slug);
    const lists = readLists().map((list) => list.slug);
    expect(() => assertNoSlugCollision(posts, lists)).not.toThrow();
    expect(() => assertNoSlugCollision(["best-hvac-in-springfield-mo"], ["best-hvac-in-springfield-mo"])).toThrow(/collides/);
  });

  it("places the hub and method copy on their routes", () => {
    expect(LOCAL_BUSINESS_GUIDE).toMatchObject({
      path: copy.hub.path,
      title: copy.hub.seoTitle,
      description: copy.hub.description,
    });
    expect(HOW_WE_PICK).toMatchObject({
      path: copy.howWePick.path,
      title: copy.howWePick.seoTitle,
      description: copy.howWePick.description,
    });
    expect(splitDisclosure(copy.disclosure).link).toBe("How we pick");
  });
});

const built = existsSync(`${DIST_DIR}/index.html`);

describe.skipIf(!built)("built list pages", () => {
  const samplePath = "/best-sample-roofers-in-springfield-mo/";
  const production = process.env.VERCEL_ENV === "production";
  const readBuilt = (file: string) => (built ? readFileSync(file, "utf8") : "");
  const sitemap = readBuilt(`${DIST_DIR}/sitemap.xml`);
  const llms = readBuilt(`${DIST_DIR}/llms.txt`);
  const sampleFile = `${DIST_DIR}/best-sample-roofers-in-springfield-mo/index.html`;
  const hubHtml = readBuilt(`${DIST_DIR}/springfield-mo-local-business-guide/index.html`);
  const methodHtml = readBuilt(`${DIST_DIR}/how-we-pick/index.html`);

  it("keeps drafts out of the sitemap, llms.txt and the hub", () => {
    for (const list of readListSummaries().filter((item) => item.status === "draft")) {
      expect(sitemap).not.toContain(absoluteUrl(`/${list.slug}/`));
      expect(llms).not.toContain(absoluteUrl(`/${list.slug}/`));
      expect(hubHtml).not.toContain(`/${list.slug}/`);
    }
    for (const list of readListSummaries().filter((item) => item.status === "published")) {
      expect(sitemap).toContain(absoluteUrl(`/${list.slug}/`));
      expect(llms).toContain(absoluteUrl(`/${list.slug}/`));
      expect(hubHtml).toContain(`/${list.slug}/`);
    }
    expect(sitemap).toContain(absoluteUrl(copy.hub.path));
    expect(sitemap).toContain(absoluteUrl(copy.howWePick.path));
    expect(llms).toContain(absoluteUrl(copy.hub.path));
    expect(llms).toContain(absoluteUrl(copy.howWePick.path));
  });

  it("builds the hub from the copy file, with the empty state when nothing is published", () => {
    const text = decode(hubHtml);
    expect((hubHtml.match(/<h1[\s>]/g) ?? []).length).toBe(1);
    expect(text).toContain(copy.hub.h1);
    for (const paragraph of copy.hub.intro) expect(text).toContain(paragraph);
    expect(text).toContain(copy.hub.sectionLead);
    const published = publishedOnly(readListSummaries());
    if (published.length === 0) expect(text).toContain(copy.hub.emptyState);
    else expect(text).not.toContain(copy.hub.emptyState);
  });

  it("builds the method page from the copy file", () => {
    const text = decode(methodHtml);
    expect((methodHtml.match(/<h1[\s>]/g) ?? []).length).toBe(1);
    expect(text).toContain(copy.howWePick.h1);
    for (const section of copy.howWePick.sections) {
      expect(text).toContain(section.heading);
      expect(text).toContain(section.body);
    }
  });

  it("renders the list template with one h1, the disclosure, file order and rating-free JSON-LD", () => {
    if (production) {
      expect(existsSync(sampleFile), "draft list is absent on production").toBe(false);
      return;
    }
    expect(existsSync(sampleFile)).toBe(true);
    const html = readFileSync(sampleFile, "utf8");
    const text = decode(html);
    expect(html).toMatch(/<meta name="robots" content="noindex, nofollow"\s*\/?>/);
    expect(text).toContain("Draft (preview only)");
    expect((html.match(/<h1[\s>]/g) ?? []).length).toBe(1);
    expect(text).toContain(splitDisclosure(copy.disclosure).before);
    expect(html).toContain(`href="${copy.howWePick.path}"`);
    expect(text).toContain("How we pick");
    expect(text).toContain("Last updated ");
    expect(text).toContain("See reviews on Google");
    expect(text).not.toContain("★");
    expect(text).not.toContain("Google reviews (");
    expect(text).toContain("How we picked these");

    const sample = readLists().find((list) => list.slug === "best-sample-roofers-in-springfield-mo");
    expect(sample).toBeTruthy();
    const names = sample!.data.businesses.map((item) => item.name);
    let from = 0;
    for (const name of names) {
      const at = text.indexOf(name, from);
      expect(at, name).toBeGreaterThan(-1);
      from = at + name.length;
    }
    expect(text).not.toContain("Featured Partner");
    expect(text).not.toContain("ffClient");

    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => JSON.parse(match[1]) as unknown);
    const keys = jsonKeys(blocks);
    expect(keys.has("aggregateRating")).toBe(false);
    expect(keys.has("review")).toBe(false);
    const itemList = blocks.find((block) => (block as { "@type"?: string })["@type"] === "ItemList") as {
      itemListElement: { position: number; item: { "@type": string; name: string; url?: string } }[];
    };
    expect(itemList.itemListElement.map((item) => item.item.name)).toEqual(names);
    expect(itemList.itemListElement.map((item) => item.position)).toEqual(names.map((_, index) => index + 1));
    expect(itemList.itemListElement.every((item) => item.item["@type"] === "LocalBusiness")).toBe(true);
    expect(itemList.itemListElement[0]?.item.url).toBe("https://example.com/sample-roofing-1");
    expect(itemList.itemListElement[1]?.item).not.toHaveProperty("url");
    expect(text).toContain(samplePath);
  });
});
