import { REDIRECTS } from "./redirects";

export interface VercelRedirectRoute {
  src: string;
  status: 301 | 307 | 308;
  headers: { Location: string };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Turns the redirect map into Vercel Build Output routes.
 * "/old-page" and "/old-page/" collapse into one route matching both; "/event/:path*"
 * matches "/event" plus anything under it. Query strings are not matched and pass through.
 */
export function redirectRoutes(): VercelRedirectRoute[] {
  const seen = new Set<string>();
  const out: VercelRedirectRoute[] = [];
  for (const r of REDIRECTS) {
    let src: string;
    if (r.source.endsWith("/:path*")) {
      src = `^${escapeRegex(r.source.slice(0, -"/:path*".length))}(?:/.*)?$`;
    } else {
      src = `^${escapeRegex(r.source.replace(/(.)\/$/, "$1"))}/?$`;
    }
    if (seen.has(src)) continue;
    seen.add(src);
    out.push({ src, status: r.statusCode, headers: { Location: r.destination } });
  }
  return out;
}
