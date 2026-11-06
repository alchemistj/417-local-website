import { readdirSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EXPLORE_LINKS, NAV_ITEMS } from "../src/data/nav";
import { FOOD_GUIDE } from "../src/data/staticPages";
import { FOOD_GUIDE_FEATURED, groupFoodPosts } from "../src/lib/foodGuide";
import { postCrumbs } from "../src/lib/routes";
import copy from "../docs/food-and-drink-guide-copy.json";
import { ROOT, postSummaries, readPosts } from "./helpers/posts";

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = `${dir}/${name}`;
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(astro|md|ts)$/.test(name)) out.push(full);
  }
  return out;
}

describe("category cleanup", () => {
  it("keeps the guide copy on the route and in the menu", () => {
    expect(FOOD_GUIDE).toMatchObject({
      path: copy.path,
      title: copy.seoTitle,
      description: copy.description,
    });
    expect(NAV_ITEMS.find((item) => item.label === "Food & Drink")?.href).toBe("/food-and-drink-springfield-mo/");
    expect(EXPLORE_LINKS).toEqual([
      { label: "Things to Do", href: "/best-things-to-do-in-springfield-mo/" },
      { label: "Things to Do With Kids", href: "/best-kids-activities-in-springfield-mo/" },
      { label: "Date Night Ideas", href: "/best-date-night-ideas-in-springfield-mo/" },
      { label: "Parks", href: "/best-parks-in-springfield-mo/" },
      { label: "Breweries", href: "/best-breweries-in-springfield-mo/" },
      { label: "Food & Drink", href: "/food-and-drink-springfield-mo/" },
      { label: "Grow Your Business", href: "/small-business-success/" },
    ]);
  });

  it("breadcrumbs a food post to the guide and any other post to the blog", () => {
    expect(postCrumbs({ slug: "best-breweries-in-springfield-mo", title: "Breweries", category: "food-and-drink" })).toEqual([
      { name: "Home", path: "/" },
      { name: "Food & Drink", path: "/food-and-drink-springfield-mo/" },
      { name: "Breweries", path: "/best-breweries-in-springfield-mo/" },
    ]);
    expect(postCrumbs({ slug: "best-parks-in-springfield-mo", title: "Parks", category: "do-something" })).toEqual([
      { name: "Home", path: "/" },
      { name: "Blog", path: "/blog/" },
      { name: "Parks", path: "/best-parks-in-springfield-mo/" },
    ]);
  });

  it("lists the three guides first and every other food post after that", () => {
    const food = postSummaries().filter((post) => post.category === "food-and-drink");
    const { featured, rest } = groupFoodPosts(food);
    expect(featured.map((post) => post.slug)).toEqual([...FOOD_GUIDE_FEATURED]);
    const expected = food
      .filter((post) => !(FOOD_GUIDE_FEATURED as readonly string[]).includes(post.slug))
      .sort((a, b) => b.updated.getTime() - a.updated.getTime() || a.title.localeCompare(b.title));
    expect(rest.map((post) => post.slug)).toEqual(expected.map((post) => post.slug));
    expect(featured.length + rest.length).toBe(food.length);
  });

  it("retires the free-book paragraph and sets the food-truck crop", () => {
    const success = readPosts().find((post) => post.slug === "small-business-success");
    expect(success?.body.toLowerCase()).not.toContain("free book");
    const trucks = readPosts().find((post) => post.slug === "best-food-trucks-in-springfield-mo");
    expect(trucks?.data.heroPosition).toBe("center 20%");
  });

  it("leaves /category/ only in the redirect map", () => {
    const hits = sourceFiles(`${ROOT}src`).filter((file) => !file.endsWith("/src/data/redirects.ts") && readFileSync(file, "utf8").includes("/category/"));
    expect(hits).toEqual([]);
  });
});
