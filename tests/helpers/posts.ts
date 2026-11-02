import { readdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import type { PostSummary } from "../../src/lib/routes";

export const ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const POSTS_DIR = `${ROOT}src/content/posts`;
export const DIST_DIR = `${ROOT}dist`;

export interface RawPost {
  slug: string;
  data: Record<string, unknown>;
  body: string;
}

/** Reads every src/content/posts/*.md (ignoring files that start with "_"). */
export function readPosts(): RawPost[] {
  if (!existsSync(POSTS_DIR)) return [];
  return readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .sort()
    .map((f) => {
      const raw = readFileSync(`${POSTS_DIR}/${f}`, "utf8");
      const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
      if (!match) throw new Error(`${f}: missing frontmatter`);
      return { slug: f.replace(/\.md$/, ""), data: parse(match[1]) as Record<string, unknown>, body: match[2] };
    });
}

export function postSummaries(): PostSummary[] {
  return readPosts().map((p) => ({
    slug: p.slug,
    title: String(p.data.title),
    seoTitle: String(p.data.seoTitle),
    description: String(p.data.description),
    updated: new Date(String(p.data.updated)),
    category: p.data.category as PostSummary["category"],
    kind: (p.data.kind as PostSummary["kind"]) ?? "post",
  }));
}
