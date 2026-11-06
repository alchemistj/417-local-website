import { categoryName, type CategorySlug } from "../data/categories";
import { STATIC_PAGES } from "../data/staticPages";
import { POSTS_PER_PAGE } from "./site";

/** The fields of a post the registry needs. Kept plain so tests can run without Astro. */
export interface PostSummary {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  updated: Date;
  category: CategorySlug;
  kind: "post" | "page";
}

export interface RouteEntry {
  path: string;
  type: "static" | "blog" | "post";
  title: string;
  description: string;
  lastmod?: string;
  indexable: boolean;
  category?: CategorySlug;
}

export function sortByUpdated<T extends { updated: Date; title: string }>(posts: T[]): T[] {
  return [...posts].sort((a, b) => b.updated.getTime() - a.updated.getTime() || a.title.localeCompare(b.title));
}

export function blogPageCount(postCount: number): number {
  return Math.max(1, Math.ceil(postCount / POSTS_PER_PAGE));
}

export function blogPagePath(page: number): string {
  return page <= 1 ? "/blog/" : `/blog/page/${page}/`;
}

export function postPath(slug: string): string {
  return `/${slug}/`;
}

/**
 * Article breadcrumbs. Food posts point at the Food & Drink guide; every other
 * post points at the blog. Category archive URLs are not linked.
 */
export function postCrumbs(post: { slug: string; title: string; category: CategorySlug }): { name: string; path: string }[] {
  const middle =
    post.category === "food-and-drink"
      ? { name: categoryName("food-and-drink"), path: "/food-and-drink-springfield-mo/" }
      : { name: "Blog", path: "/blog/" };
  return [
    { name: "Home", path: "/" },
    middle,
    { name: post.title, path: postPath(post.slug) },
  ];
}

/** Single source of truth for every published URL. */
export function buildRoutes(posts: PostSummary[]): RouteEntry[] {
  const routes: RouteEntry[] = STATIC_PAGES.map((p) => ({
    path: p.path,
    type: p.path === "/blog/" ? "blog" : "static",
    title: p.title,
    description: p.description,
    indexable: p.indexable !== false,
  }));

  for (let n = 2; n <= blogPageCount(posts.length); n += 1) {
    routes.push({
      path: blogPagePath(n),
      type: "blog",
      title: `Articles, Page ${n} | 417 Local`,
      description: `More 417 Local guides and articles, page ${n}.`,
      indexable: true,
    });
  }

  for (const p of sortByUpdated(posts)) {
    routes.push({
      path: postPath(p.slug),
      type: "post",
      title: p.seoTitle,
      description: p.description,
      lastmod: p.updated.toISOString().slice(0, 10),
      indexable: true,
      category: p.category,
    });
  }
  return routes;
}
