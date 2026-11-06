import { existsSync, readdirSync, readFileSync } from "node:fs";
import type { ListSummary } from "../../src/lib/lists";
import { ROOT } from "./posts";

export const LISTS_DIR = `${ROOT}src/content/lists`;

export interface RawList {
  slug: string;
  data: {
    slug: string;
    status: "draft" | "published";
    title: string;
    seoTitle: string;
    description: string;
    updated: string;
    businesses: { name: string; ratingCheckedOn: string; ffClient?: boolean; featured?: boolean }[];
    [key: string]: unknown;
  };
}

/** Every src/content/lists/*.json except files that start with "_". */
export function readLists(): RawList[] {
  if (!existsSync(LISTS_DIR)) return [];
  return readdirSync(LISTS_DIR)
    .filter((name) => name.endsWith(".json") && !name.startsWith("_"))
    .sort()
    .map((name) => ({
      slug: name.replace(/\.json$/, ""),
      data: JSON.parse(readFileSync(`${LISTS_DIR}/${name}`, "utf8")) as RawList["data"],
    }));
}

export function readListSummaries(): ListSummary[] {
  return readLists().map((list) => ({
    slug: list.slug,
    title: list.data.title,
    seoTitle: list.data.seoTitle,
    description: list.data.description,
    updated: new Date(list.data.updated),
    status: list.data.status,
  }));
}
