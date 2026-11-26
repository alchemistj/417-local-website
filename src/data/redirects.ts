import seed from "../../docs/build/redirects-seed.json";
import shortlinks from "../../docs/build/shortlinks.json";
import { OLD_BUSINESS_PATHS, businessHubPath, businessNichePath } from "../lib/businessPaths";
import { WEEKEND_CITY_SLUGS, cityWeekendPath } from "../lib/eventPaths";

/**
 * The one redirect map (SOP Rule 15). `npm run redirects` writes vercel.json from it and a test
 * checks the two agree. Add new redirects here, never to vercel.json by hand.
 */
export interface Redirect {
  source: string;
  destination: string;
  statusCode: 301 | 307;
}

const retiredTo: Record<string, string> = seed.retired_to;
const patterns: Record<string, string> = seed.patterns;

function bothSlashForms(slug: string): string[] {
  const clean = slug.replace(/^\/+|\/+$/g, "");
  return [`/${clean}`, `/${clean}/`];
}

/** "/event/*" in the seed becomes Vercel's "/event/:path*" syntax. */
function toVercelPattern(pattern: string): string {
  if (!pattern.endsWith("/*")) throw new Error(`Unsupported redirect pattern: ${pattern}`);
  return `${pattern.slice(0, -2)}/:path*`;
}

const extraRetired: Record<string, string> = {
  "author/sigafus": "/blog/",
  "author/team": "/blog/",
  // The events plugin's booking page. /events/ itself is a real page now.
  "events/my-bookings": "/events/",
};

// Old WordPress image URLs that still earn impressions point to the article that used them.
const imageRedirects: Record<string, string> = {
  "/wp-content/uploads/2021/07/bass-pro-shops-in-springfield-mo.jpg": "/best-things-to-do-in-springfield-mo/",
  "/wp-content/uploads/2021/07/playground-at-McBride-Park.jpg": "/best-parks-in-springfield-mo/",
  "/wp-content/uploads/2021/04/largest-fork-springfield-mo.jpg": "/largest-fork-springfield-mo/",
  "/wp-content/uploads/2021/07/playground-and-stream-at-sequiota.jpeg": "/sequiota-park-springfield/",
};

export function buildRedirects(): Redirect[] {
  const out: Redirect[] = [];
  const seen = new Set<string>();
  const add = (source: string, destination: string, statusCode: 301 | 307 = 301) => {
    if (seen.has(source)) return;
    seen.add(source);
    out.push({ source, destination, statusCode });
  };

  for (const [slug, dest] of Object.entries({ ...retiredTo, ...extraRetired })) {
    for (const source of bothSlashForms(slug)) add(source, dest);
  }
  for (const [pattern, dest] of Object.entries(patterns)) add(toVercelPattern(pattern), dest);
  for (const [source, dest] of Object.entries(imageRedirects)) add(source, dest);
  // Launch package (Nov 14): every other old WordPress upload and author page
  // get a home instead of a 403/404. These come after the specific rules above.
  add("/wp-content/uploads/:path*", "/");
  add("/author/:path*", "/blog/");
  // City-first event URLs. Flat category pages moved under Springfield.
  // food-and-drink has no page in this export, so it is not redirected at a missing address.
  // The five weekend cities 301 to the flat keyword URL. The other cities 301 to their hub.
  const movedEventPages: Record<string, string> = {
    "events/this-weekend": "/things-to-do-in-springfield-mo-this-weekend/",
  };
  for (const city of WEEKEND_CITY_SLUGS) {
    movedEventPages[`events/${city}/this-weekend`] = cityWeekendPath(city);
  }
  // Ridgedale is Big Cedar Lodge resort programming only, which the junk filter hides, so it has no hub to redirect to.
  for (const city of ["republic", "lake-ozark", "nixa", "ozark", "rogersville"]) {
    movedEventPages[`events/${city}/this-weekend`] = `/events/${city}/`;
  }
  for (const slug of ["live-music", "arts-and-theater", "festivals", "family", "sports", "outdoors", "community", "holiday"]) {
    movedEventPages[`events/${slug}`] = `/events/springfield/${slug}/`;
  }
  // Business events moved to /business-events/springfield-mo/ (hub, niche pages, group pages).
  // The pass-1 networking page never went live, but it is redirected anyway.
  const businessMoves: Record<string, string> = {
    [OLD_BUSINESS_PATHS.hub]: businessHubPath("springfield", "MO"),
    [OLD_BUSINESS_PATHS.networking]: businessNichePath("springfield", "MO", "networking"),
    [OLD_BUSINESS_PATHS.entrepreneurship]: businessNichePath("springfield", "MO", "small-business-and-entrepreneurs"),
    [OLD_BUSINESS_PATHS.professionalDevelopment]: businessNichePath("springfield", "MO", "certifications-and-training"),
    [OLD_BUSINESS_PATHS.pass1Networking]: businessNichePath("springfield", "MO", "networking"),
  };
  for (const [old, dest] of Object.entries(businessMoves)) movedEventPages[old.replace(/^\/+|\/+$/g, "")] = dest;
  for (const [slug, dest] of Object.entries(movedEventPages)) {
    for (const source of bothSlashForms(slug)) add(source, dest);
  }
  // Old Pretty Links short links (affiliate, booking and giveaway links). They were 307s on WordPress; keep them temporary.
  for (const [slug, dest] of Object.entries(shortlinks as Record<string, string>)) {
    for (const source of bothSlashForms(slug)) add(source, dest, 307);
  }
  // Retired category archives. The food rule is first so /category/:path* does not swallow
  // the guide, including old /category/food-and-drink/page/n/ URLs. Both slash forms match.
  add("/category/food-and-drink/:path*", "/food-and-drink-springfield-mo/");
  add("/category/:path*", "/blog/");
  return out;
}

export const REDIRECTS: Redirect[] = buildRedirects();

/** Root slugs that no longer exist. No article may use one, and no page may link to one. */
export const RETIRED_SLUGS: string[] = Object.keys({ ...retiredTo, ...extraRetired });

/** True when a Vercel-style source ("/x" or "/x/:path*") matches the path. */
export function sourceMatches(source: string, path: string): boolean {
  const normalized = path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
  if (source.endsWith("/:path*")) {
    const prefix = source.slice(0, -"/:path*".length);
    return normalized === prefix || normalized.startsWith(`${prefix}/`);
  }
  const src = source.length > 1 && source.endsWith("/") ? source.slice(0, -1) : source;
  return normalized === src;
}
