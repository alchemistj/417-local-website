import { sortByUpdated } from "./routes";

/** The three guides that open the Food & Drink page, in display order. */
export const FOOD_GUIDE_FEATURED = [
  "best-breweries-in-springfield-mo",
  "best-food-trucks-in-springfield-mo",
  "best-date-night-ideas-in-springfield-mo",
] as const;

export interface FoodGuidePost {
  slug: string;
  title: string;
  updated: Date;
}

/**
 * Split food-and-drink posts into the three featured guides and the rest.
 * The rest is newest `updated` first. Pass only food-and-drink posts.
 */
export function groupFoodPosts<T extends FoodGuidePost>(posts: T[]): { featured: T[]; rest: T[] } {
  const bySlug = new Map(posts.map((post) => [post.slug, post]));
  const featured = FOOD_GUIDE_FEATURED.map((slug) => {
    const post = bySlug.get(slug);
    if (!post) throw new Error(`Food & Drink guide is missing ${slug}`);
    return post;
  });
  const skip = new Set<string>(FOOD_GUIDE_FEATURED);
  const rest = sortByUpdated(posts.filter((post) => !skip.has(post.slug)));
  return { featured, rest };
}
