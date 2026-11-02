export const CATEGORY_SLUGS = [
  "do-something",
  "food-and-drink",
  "small-business",
  "springfield",
  "blog",
] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export interface Category {
  slug: CategorySlug;
  name: string;
  /** Full <title> text for the archive page. */
  title: string;
  /** Meta description and intro line for the archive page. */
  description: string;
}

export const CATEGORIES: Category[] = [
  {
    slug: "do-something",
    title: "Things to Do in Springfield, MO | 417 Local",
    name: "Things to Do",
    description: "Activities, outings and ideas for things to do in Springfield, MO and the 417 area.",
  },
  {
    slug: "food-and-drink",
    title: "Food & Drink in Springfield, MO | 417 Local",
    name: "Food & Drink",
    description: "Restaurants, food trucks, coffee, breweries and local eats in Springfield, MO and the 417.",
  },
  {
    slug: "small-business",
    title: "Small Business Guides and Stories | 417 Local",
    name: "Small Business",
    description: "Stories, guides and how-tos for small business owners in Springfield, MO and the 417.",
  },
  {
    slug: "springfield",
    title: "Springfield, MO Local Guides | 417 Local",
    name: "Springfield",
    description: "Local guides and community features from around Springfield, MO.",
  },
  {
    slug: "blog",
    title: "More From the 417 Local Blog",
    name: "Blog",
    description: "More local guides and community features from 417 Local.",
  },
];

export function categoryName(slug: CategorySlug): string {
  return CATEGORIES.find((c) => c.slug === slug)?.name ?? slug;
}
