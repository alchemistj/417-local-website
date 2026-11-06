export const SITE_URL = "https://417local.com";
export const SITE_NAME = "417 Local";
export const POSTS_PER_PAGE = 12;

export const ORGANIZATION = {
  name: SITE_NAME,
  url: SITE_URL,
  sameAs: ["https://www.facebook.com/417local/", "https://www.instagram.com/417local/"],
  address: {
    streetAddress: "1650 E Battlefield Rd Suite 200B",
    addressLocality: "Springfield",
    addressRegion: "MO",
    postalCode: "65804",
    addressCountry: "US",
  },
} as const;

/** Absolute canonical URL for a site path such as "/blog/". */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
