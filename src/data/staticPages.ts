import bestOfCopy from "../../docs/best-of-hub-copy.json";
import eventsCopy from "../../docs/events-pages-copy.json";
import foodGuideCopy from "../../docs/food-and-drink-guide-copy.json";
import { GENERAL_EVENT_CATEGORY_LABELS, type GeneralEventCategory } from "../lib/eventSchema";
import { cityDisplayName, cityWeekendPath } from "../lib/eventPaths";

/**
 * Every non-article route and its SEO text. The route registry, sitemap, llms.txt and the page
 * templates all read from here, so they cannot disagree.
 */
export interface StaticPageMeta {
  path: string;
  /** Full <title> text. */
  title: string;
  description: string;
  /** Short label used in llms.txt. */
  label: string;
  /** false = noindex and left out of the sitemap. */
  indexable?: boolean;
}

export const HOME: StaticPageMeta = {
  path: "/",
  title: "Featuring Local Businesses, Nonprofits, Creators & Events in 417",
  description:
    "Discover things to do, places to eat and small businesses worth knowing in Springfield, MO and the 417 area, plus local events.",
  label: "Home",
};

export const BLOG: StaticPageMeta = {
  path: "/blog/",
  title: "Springfield, MO Local Guides and Articles | 417 Local",
  description: "Every 417 Local guide in one place: things to do, food and drink, local businesses and more in Springfield, MO.",
  label: "All articles",
};

export const FOOD_GUIDE: StaticPageMeta = {
  path: foodGuideCopy.path,
  title: foodGuideCopy.seoTitle,
  description: foodGuideCopy.description,
  label: "Food & Drink",
};

export const LOCAL_BUSINESS_GUIDE: StaticPageMeta = {
  path: bestOfCopy.hub.path,
  title: bestOfCopy.hub.seoTitle,
  description: bestOfCopy.hub.description,
  label: "Local Business Guide",
};

export const HOW_WE_PICK: StaticPageMeta = {
  path: bestOfCopy.howWePick.path,
  title: bestOfCopy.howWePick.seoTitle,
  description: bestOfCopy.howWePick.description,
  label: "How We Pick",
};

export const EVENTS_HUB: StaticPageMeta = {
  path: "/events/",
  title: eventsCopy.region.seoTitle,
  description: eventsCopy.region.description,
  label: "Events",
};

function cityCopy(text: string, citySlug: string): string {
  if (citySlug === "springfield") return text;
  return text.replaceAll("Springfield", cityDisplayName(citySlug));
}

export function cityHubPage(citySlug: string): StaticPageMeta {
  const name = cityDisplayName(citySlug);
  return {
    path: `/events/${citySlug}/`,
    title: cityCopy(eventsCopy.hub.seoTitle, citySlug),
    description: cityCopy(eventsCopy.hub.description, citySlug),
    label: name,
  };
}

export function cityWeekendPage(citySlug: string): StaticPageMeta {
  return {
    path: cityWeekendPath(citySlug),
    title: cityCopy(eventsCopy.thisWeekend.seoTitle, citySlug),
    description: cityCopy(eventsCopy.thisWeekend.description, citySlug),
    label: citySlug === "springfield" ? "This weekend" : `This weekend in ${cityDisplayName(citySlug)}`,
  };
}

export interface CityPageCopy {
  h1: string;
  intro: readonly string[];
  emptyState: string;
}

export function cityHubCopy(citySlug: string): CityPageCopy & { upcomingHeading: string; businessLink: string } {
  return {
    h1: cityCopy(eventsCopy.hub.h1, citySlug),
    intro: eventsCopy.hub.intro.map((paragraph) => cityCopy(paragraph, citySlug)),
    emptyState: cityCopy(eventsCopy.hub.emptyState, citySlug),
    upcomingHeading: cityCopy(eventsCopy.hub.upcomingHeading, citySlug),
    businessLink: eventsCopy.hub.businessLink,
  };
}

export function cityWeekendCopy(citySlug: string): CityPageCopy {
  return {
    h1: cityCopy(eventsCopy.thisWeekend.h1, citySlug),
    intro: eventsCopy.thisWeekend.intro.map((paragraph) => cityCopy(paragraph, citySlug)),
    emptyState: cityCopy(eventsCopy.thisWeekend.emptyState, citySlug),
  };
}

export function generalCategoryPage(slug: GeneralEventCategory, citySlug = "springfield"): StaticPageMeta {
  const page = eventsCopy.categories[slug];
  return {
    path: `/events/${citySlug}/${slug}/`,
    title: cityCopy(page.seoTitle, citySlug),
    description: cityCopy(page.description, citySlug),
    label: GENERAL_EVENT_CATEGORY_LABELS[slug],
  };
}

export function generalCategoryCopy(slug: GeneralEventCategory, citySlug = "springfield"): CityPageCopy {
  const page = eventsCopy.categories[slug];
  return {
    h1: cityCopy(page.h1, citySlug),
    intro: page.intro.map((paragraph) => cityCopy(paragraph, citySlug)),
    emptyState: cityCopy(page.emptyState, citySlug),
  };
}

export const BUSINESS_EVENTS: StaticPageMeta[] = [
  {
    path: "/events/springfield-business-events/",
    title: "Springfield, MO Business Events | 417 Local",
    description: "Upcoming business events in Springfield, MO: networking, entrepreneurship and professional development.",
    label: "Business events",
  },
  {
    path: "/events/springfield-business-events/networking/",
    title: "Springfield, MO Networking Events | 417 Local",
    description: "Upcoming networking events in Springfield, MO for professionals, owners and job seekers.",
    label: "Networking events",
  },
  {
    path: "/events/springfield-business-events/entrepreneurship/",
    title: "Springfield, MO Entrepreneurship Events | 417 Local",
    description: "Upcoming entrepreneurship events in Springfield, MO for founders, startups and side hustles.",
    label: "Entrepreneurship events",
  },
  {
    path: "/events/springfield-business-events/professional-development/",
    title: "Springfield, MO Professional Development Events | 417 Local",
    description: "Upcoming workshops, classes and training events in Springfield, MO to build your career and skills.",
    label: "Professional development events",
  },
];

export const CONTACT: StaticPageMeta = {
  path: "/contact-us/",
  title: "Contact Us | 417 Local",
  description: "Have an idea, suggestion or a burning desire to collab? Send 417 Local a message and we'll respond within 2 business days.",
  label: "Contact us",
};

export const PRIVACY: StaticPageMeta = {
  path: "/privacy-policy/",
  title: "Privacy Policy | 417 Local",
  description: "How 417 Local collects, uses and protects visitor information, including log files, cookies and advertising partners.",
  label: "Privacy policy",
};

export const TERMS: StaticPageMeta = {
  path: "/terms-and-conditions/",
  title: "Terms and Conditions | 417 Local",
  description: "The rules for using 417local.com, including cookies, licensing, comments and linking to 417 Local.",
  label: "Terms and conditions",
};

export const SUBMIT_EVENT: StaticPageMeta = {
  path: "/submit-your-event/",
  title: "Submit Your Event | 417 Local",
  description: "Tell us about your Springfield, MO area event and we'll consider it for the 417 Local events page.",
  label: "Submit your event",
};

export const THANK_YOU: StaticPageMeta = {
  path: "/thank-you/",
  title: "Thank You | 417 Local",
  description: "Thanks for contacting 417 Local.",
  label: "Thank you",
  indexable: false,
};

export const GET_STARTED: StaticPageMeta = {
  path: "/get-started/",
  title: "Get Started With a Reviews Consultation | 417 Local",
  description: "Book a 30 minute call to see the roadmap for better reviews and more sales for your small business.",
  label: "Get started",
};

export const STATIC_PAGES: StaticPageMeta[] = [
  HOME,
  BLOG,
  FOOD_GUIDE,
  LOCAL_BUSINESS_GUIDE,
  HOW_WE_PICK,
  EVENTS_HUB,
  ...BUSINESS_EVENTS,
  CONTACT,
  PRIVACY,
  TERMS,
  SUBMIT_EVENT,
  THANK_YOU,
  GET_STARTED,
];
