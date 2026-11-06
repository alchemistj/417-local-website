import { describe, expect, it } from "vitest";
import { redirectRoutes } from "../src/data/vercelRoutes";

const routes = redirectRoutes();
const match = (path: string) => routes.find((r) => new RegExp(r.src).test(path));

describe("Vercel redirect routes", () => {
  it("redirects old events-plugin URLs to /events/", () => {
    expect(match("/venue/village-pottery-cafe/")?.headers.Location).toBe("/events/");
    expect(match("/event/food-truck-night-at-turners-station/2026-04-07/")?.headers.Location).toBe("/events/");
    expect(match("/organizer/hold-fast-brewing/")?.headers.Location).toBe("/events/");
  });

  it("matches retired pages with and without the trailing slash", () => {
    expect(match("/001-hannah-vale")?.status).toBe(301);
    expect(match("/001-hannah-vale/")?.headers.Location).toBe("/small-business-success/");
  });

  it("keeps old short links as 307s to their original targets", () => {
    const a2 = match("/a2/");
    expect(a2?.status).toBe(307);
    expect(a2?.headers.Location).toMatch(/^https:\/\//);
  });

  it("redirects category archives, food first, with and without a slash", () => {
    for (const path of ["/category/food-and-drink", "/category/food-and-drink/", "/category/food-and-drink/page/2/"]) {
      const hit = match(path);
      expect(hit?.status, path).toBe(301);
      expect(hit?.headers.Location, path).toBe("/food-and-drink-springfield-mo/");
    }
    for (const path of ["/category/do-something/", "/category/xyz", "/category/springfield/page/4/"]) {
      expect(match(path)?.headers.Location, path).toBe("/blog/");
      expect(match(path)?.status, path).toBe(301);
    }
  });

  it("never captures live pages", () => {
    for (const path of ["/", "/events/", "/events/springfield-business-events/", "/blog/", "/best-parks-in-springfield-mo/", "/food-and-drink-springfield-mo/"]) {
      expect(match(path), path).toBeUndefined();
    }
  });
});
