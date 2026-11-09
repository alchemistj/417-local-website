import { getCollection } from "astro:content";
import { assertListFileSlug, assertNoSlugCollision, listsIncludedInBuild, type ListSummary } from "./lists";
import { eventSectionRoutes } from "./eventRoutes";
import { getRecurring, getSiteEvents } from "./loadEvents";
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

export async function getListSummaries(): Promise<ListSummary[]> {
  const lists = await getCollection("lists");
  return lists.map((list) => {
    assertListFileSlug(list.id, list.data.slug);
    return {
      slug: list.id,
      title: list.data.title,
      seoTitle: list.data.seoTitle,
      description: list.data.description,
      updated: list.data.updated,
      status: list.data.status,
    };
  });
}

export async function getRouteRegistry(now: Date = new Date()): Promise<RouteEntry[]> {
  const posts = await getPostSummaries();
  const lists = await getListSummaries();
  const events = await getSiteEvents();
  const recurring = await getRecurring();
  assertNoSlugCollision(
    posts.map((post) => post.slug),
    lists.map((list) => list.slug),
  );
  return buildRoutes(posts, listsIncludedInBuild(lists), eventSectionRoutes(events, now, recurring));
}
