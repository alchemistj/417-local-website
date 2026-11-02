import { describe, expect, it } from "vitest";
import { CATEGORY_SLUGS } from "../src/data/categories";
import { STATIC_PAGES } from "../src/data/staticPages";
import { blogPageCount, blogPagePath, buildRoutes, type PostSummary } from "../src/lib/routes";
import { postSummaries } from "./helpers/posts";

const fake = (n: number): PostSummary[] =>
  Array.from({ length: n }, (_, i) => ({
    slug: `post-${i}`,
    title: `Post ${i}`,
    seoTitle: `Post ${i} | MO`,
    description: "d",
    updated: new Date(2026, 0, 1 + i),
    category: CATEGORY_SLUGS[i % CATEGORY_SLUGS.length],
    kind: "post",
  }));

describe("route registry", () => {
  for (const [label, posts] of [
    ["synthetic posts", fake(30)],
    ["real posts", postSummaries()],
  ] as const) {
    it(`has unique paths with leading and trailing slashes (${label})`, () => {
      const paths = buildRoutes(posts).map((r) => r.path);
      expect(new Set(paths).size).toBe(paths.length);
      for (const p of paths) {
        expect(p, p).toMatch(/^\/(?:[a-z0-9_-]+\/)*$/);
      }
    });
  }

  it("includes every static page, the five category archives and one route per post", () => {
    const paths = new Set(buildRoutes(fake(3)).map((r) => r.path));
    for (const p of STATIC_PAGES) expect(paths.has(p.path)).toBe(true);
    for (const c of CATEGORY_SLUGS) expect(paths.has(`/category/${c}/`)).toBe(true);
    for (let i = 0; i < 3; i += 1) expect(paths.has(`/post-${i}/`)).toBe(true);
  });

  it("paginates the blog at 12 per page", () => {
    expect(blogPageCount(0)).toBe(1);
    expect(blogPageCount(12)).toBe(1);
    expect(blogPageCount(13)).toBe(2);
    expect(blogPagePath(1)).toBe("/blog/");
    expect(blogPagePath(3)).toBe("/blog/page/3/");
    const paths = buildRoutes(fake(30)).map((r) => r.path);
    expect(paths).toContain("/blog/page/2/");
    expect(paths).toContain("/blog/page/3/");
    expect(paths).not.toContain("/blog/page/4/");
  });

  it("keeps the thank-you page out of the index", () => {
    const thanks = buildRoutes([]).find((r) => r.path === "/thank-you/");
    expect(thanks?.indexable).toBe(false);
  });

  it("gives every route a unique title", () => {
    const titles = buildRoutes(fake(5)).map((r) => r.title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});
