import { describe, expect, it } from "vitest";
import { z } from "astro/zod";
import { makePostSchema } from "../src/lib/postSchema";
import { readPosts } from "./helpers/posts";

const schema = makePostSchema(() => z.string());

const sample = {
  title: "Best Things to Do in Springfield, MO",
  seoTitle: "Best Things to Do in Springfield, MO",
  description: "A short guide to the best things to do in Springfield, MO.",
  published: "2021-07-14",
  updated: "2026-11-02",
  category: "do-something",
  heroImage: "./images/sample/hero.jpg",
  heroAlt: "People walking at a park",
  kind: "page",
};

describe("posts frontmatter schema", () => {
  it("parses the spec's sample frontmatter and coerces dates", () => {
    const data = schema.parse(sample);
    expect(data.published).toBeInstanceOf(Date);
    expect(data.updated.toISOString().slice(0, 10)).toBe("2026-11-02");
    expect(data.kind).toBe("page");
  });

  it("defaults kind to post and makes the hero optional", () => {
    const { heroImage: _h, heroAlt: _a, kind: _k, ...rest } = sample;
    const data = schema.parse(rest);
    expect(data.kind).toBe("post");
    expect(data.heroImage).toBeUndefined();
  });

  it("rejects an unknown category, a long title tag or description, and a hero without alt", () => {
    expect(schema.safeParse({ ...sample, category: "events" }).success).toBe(false);
    expect(schema.safeParse({ ...sample, seoTitle: "x".repeat(91) }).success).toBe(false);
    expect(schema.safeParse({ ...sample, description: "x".repeat(156) }).success).toBe(false);
    expect(schema.safeParse({ ...sample, heroAlt: undefined }).success).toBe(false);
    expect(schema.safeParse({ ...sample, kind: "article" }).success).toBe(false);
  });

  it("accepts every article file that exists right now", () => {
    for (const post of readPosts()) {
      const result = schema.safeParse(post.data);
      expect(result.success, `${post.slug}: ${result.success ? "" : result.error.message}`).toBe(true);
    }
  });
});
