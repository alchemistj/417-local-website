import { getCollection } from "astro:content";
import { buildRoutes, type PostSummary, type RouteEntry } from "./routes";

export async function getPostSummaries(): Promise<PostSummary[]> {
  const posts = await getCollection("posts");
  return posts.map((p) => ({
    slug: p.id,
    title: p.data.title,
    seoTitle: p.data.seoTitle,
    description: p.data.description,
    updated: p.data.updated,
    category: p.data.category,
    kind: p.data.kind,
  }));
}

export async function getRouteRegistry(): Promise<RouteEntry[]> {
  return buildRoutes(await getPostSummaries());
}
