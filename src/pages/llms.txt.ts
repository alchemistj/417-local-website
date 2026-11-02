import type { APIRoute } from "astro";
import { CATEGORIES } from "../data/categories";
import { getRouteRegistry } from "../lib/loadRoutes";
import { SITE_NAME, absoluteUrl } from "../lib/site";

const line = (title: string, path: string, description: string) =>
  `- [${title}](${absoluteUrl(path)}): ${description}`;

export const GET: APIRoute = async () => {
  const routes = (await getRouteRegistry()).filter((r) => r.indexable);
  const sections: string[] = [
    `# ${SITE_NAME}`,
    "",
    "> A local guide to Springfield, MO and the 417 area: things to do, food and drink, outdoors and parks, small business help and events.",
    "",
    "## Sections",
    ...routes.filter((r) => r.type === "static" || r.path === "/blog/").map((r) => line(r.title, r.path, r.description)),
    ...routes.filter((r) => r.type === "category").map((r) => line(r.title, r.path, r.description)),
  ];
  for (const c of CATEGORIES) {
    const posts = routes.filter((r) => r.type === "post" && r.category === c.slug);
    if (posts.length === 0) continue;
    sections.push("", `## ${c.name}`, ...posts.map((r) => line(r.title, r.path, r.description)));
  }
  return new Response(`${sections.join("\n")}\n`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
