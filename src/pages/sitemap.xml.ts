import type { APIRoute } from "astro";
import { getRouteRegistry } from "../lib/loadRoutes";
import { absoluteUrl } from "../lib/site";

export const GET: APIRoute = async () => {
  const routes = (await getRouteRegistry()).filter((r) => r.indexable);
  const urls = routes
    .map((r) => `  <url><loc>${absoluteUrl(r.path)}</loc>${r.lastmod ? `<lastmod>${r.lastmod}</lastmod>` : ""}</url>`)
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
