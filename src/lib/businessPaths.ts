/** URL helpers for the B2B section. No imports, so data files can use them without a cycle. */
export const BUSINESS_EVENTS_BASE = "/business-events";

/** The city segment carries the state, because there are many Springfields: `springfield-mo`. */
export function cityStateSlug(citySlug: string, state: string): string {
  return `${citySlug}-${state.trim().toLowerCase()}`;
}

export function businessHubPath(citySlug: string, state: string): string {
  return `${BUSINESS_EVENTS_BASE}/${cityStateSlug(citySlug, state)}/`;
}

export function businessNichePath(citySlug: string, state: string, niche: string): string {
  return `${businessHubPath(citySlug, state)}${niche}/`;
}

export function businessGroupPath(citySlug: string, state: string, group: string): string {
  return `${businessHubPath(citySlug, state)}groups/${group}/`;
}

/** The old addresses of the business pages. All of them 301 into the new section (see redirects.ts). */
export const OLD_BUSINESS_PATHS = {
  hub: "/events/springfield-business-events/",
  networking: "/events/springfield-business-events/networking/",
  entrepreneurship: "/events/springfield-business-events/entrepreneurship/",
  professionalDevelopment: "/events/springfield-business-events/professional-development/",
  /** Pass 1 of PR #27 put the networking page here. It moved before it ever went live. */
  pass1Networking: "/events/springfield/business-networking/",
} as const;
