import { LIST_SLUG_PATTERN, type ListBusiness, type ListData } from "./listSchema";
import { absoluteUrl } from "./site";

export const GUIDE_PATH = "/springfield-mo-local-business-guide/";
export const HOW_WE_PICK_PATH = "/how-we-pick/";
export const GUIDE_CRUMB = "Local Business Guide";
export const DRAFT_BANNER = "Draft (preview only)";
export const DRAFT_ROBOTS = "noindex, nofollow";

export interface ListSummary {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  updated: Date;
  status: ListData["status"];
}

/** Fields a business card is allowed to show. Flags are not included. */
export interface VisibleBusiness {
  name: string;
  bestFor?: string;
  mapsUrl: string;
  summary: string;
  highlights: string[];
  website?: string;
  phone?: string;
  tel?: string;
}

/** Drafts build on local dev and Vercel previews. Production builds skip them. */
export function listIsBuilt(status: ListData["status"], env: string | undefined = process.env.VERCEL_ENV): boolean {
  return status === "published" || env !== "production";
}

export function listsIncludedInBuild<T extends { status: ListData["status"] }>(
  lists: T[],
  env: string | undefined = process.env.VERCEL_ENV,
): T[] {
  return lists.filter((list) => listIsBuilt(list.status, env));
}

/** Hub, sitemap and llms.txt use this. Drafts are never included. */
export function publishedOnly<T extends { status: ListData["status"] }>(lists: T[]): T[] {
  return lists.filter((list) => list.status === "published");
}

export function assertListFileSlug(fileSlug: string, dataSlug: string): void {
  if (!LIST_SLUG_PATTERN.test(fileSlug)) {
    throw new Error(`List slug must match ${LIST_SLUG_PATTERN}: ${fileSlug}`);
  }
  if (fileSlug !== dataSlug) {
    throw new Error(`List file name ${fileSlug} does not match slug ${dataSlug}`);
  }
}

/** Posts and lists share /<slug>/. A collision fails the build. */
export function assertNoSlugCollision(postSlugs: readonly string[], listSlugs: readonly string[]): void {
  const posts = new Set(postSlugs);
  const hits = listSlugs.filter((slug) => posts.has(slug));
  if (hits.length > 0) throw new Error(`List slug collides with a post: ${hits.join(", ")}`);
}

export function formatLongDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** E.164 tel link. Ten-digit numbers are treated as US. */
export function telHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `tel:+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `tel:+${digits}`;
  return `tel:+${digits}`;
}

/** The copy file ends with the words that link to the method page. */
export function splitDisclosure(disclosure: string): { before: string; link: string } {
  const link = "How we pick";
  if (!disclosure.endsWith(link)) throw new Error("Disclosure copy must end with How we pick");
  return { before: disclosure.slice(0, -link.length).trimEnd(), link };
}

/**
 * File order, unchanged by ffClient or featured. The returned objects omit both flags
 * so a card cannot render them.
 */
export function visibleBusinesses(businesses: readonly ListBusiness[]): VisibleBusiness[] {
  return businesses.map((business) => {
    const card: VisibleBusiness = {
      name: business.name,
      mapsUrl: business.googleMapsUrl,
      summary: business.summary,
      highlights: business.highlights ?? [],
    };
    if (business.bestFor) card.bestFor = business.bestFor;
    if (business.website) card.website = business.website;
    if (business.phone) {
      card.phone = business.phone;
      card.tel = telHref(business.phone);
    }
    return card;
  });
}

export function listCrumbs(list: { slug: string; title: string }): { name: string; path: string }[] {
  return [
    { name: "Home", path: "/" },
    { name: GUIDE_CRUMB, path: GUIDE_PATH },
    { name: list.title, path: `/${list.slug}/` },
  ];
}

export function breadcrumbLd(crumbs: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

/** LocalBusiness name and url only. url is the business website when it has one. */
export function listItemListLd(businesses: readonly { name: string; website?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: businesses.map((business, index) => {
      const item: { "@type": "LocalBusiness"; name: string; url?: string } = {
        "@type": "LocalBusiness",
        name: business.name,
      };
      if (business.website) item.url = business.website;
      return { "@type": "ListItem" as const, position: index + 1, item };
    }),
  };
}

export function faqLd(faq: readonly { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}
