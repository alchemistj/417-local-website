/**
 * Homepage copy and curated tiles. Tiles link the best articles by category; there is no
 * auto-dated feed. Slugs that are not in the collection are skipped when the page builds.
 */
export const HOME_COPY = {
  h1: "Helping You Discover, or Create, Businesses and Missions You Love in 417",
  intro: [
    "The 417 community has so many beautiful people that work hard every day in their nonprofit services, businesses, various groups, events and more.",
    "With so much national and global competition and deep pockets, it's not easy to be a small fish in a big pond. 417 Local is the place to come together and show love for the 417 area.",
  ],
  primaryCta: { label: "Find Things to Do", href: "/category/do-something/" },
  secondaryCta: { label: "See Events", href: "/events/" },
  mission: [
    "We support the 417 area by highlighting businesses and events, and by offering training, help and services for local growth.",
    "As a community, when one of us does better, we all do better!",
  ],
  finalCta: {
    heading: "Share Your Event With 417 Local",
    body: "Hosting something in Springfield or the 417? Tell us about it and we'll consider it for the events page.",
    primary: { label: "Submit Your Event", href: "/submit-your-event/" },
    secondary: { label: "Contact Us", href: "/contact-us/" },
  },
} as const;

export interface HomeSection {
  id: string;
  heading: string;
  /** Post slugs, in display order. */
  slugs: string[];
  seeAll: { label: string; href: string };
}

export const HOME_SECTIONS: HomeSection[] = [
  {
    id: "things-to-do",
    heading: "Things to Do",
    slugs: [
      "best-things-to-do-in-springfield-mo",
      "best-kids-activities-in-springfield-mo",
      "best-date-night-ideas-in-springfield-mo",
    ],
    seeAll: { label: "More things to do", href: "/category/do-something/" },
  },
  {
    id: "food-and-drink",
    heading: "Food & Drink",
    slugs: ["best-breweries-in-springfield-mo", "best-food-trucks-in-springfield-mo"],
    seeAll: { label: "More food and drink", href: "/category/food-and-drink/" },
  },
  {
    id: "outdoors",
    heading: "Outdoors and Parks",
    slugs: ["busiek-state-forest-and-wildlife-area", "berry-farms-sw-mo", "best-parks-in-springfield-mo"],
    seeAll: { label: "More things to do outside", href: "/category/do-something/" },
  },
  {
    id: "small-business",
    heading: "Small Business",
    slugs: ["small-business-success", "best-seo-in-springfield-mo"],
    seeAll: { label: "More for small business", href: "/category/small-business/" },
  },
];

/** The Events tile: not an article, so it is plain data. */
export const HOME_EVENTS_TILE = {
  heading: "Events",
  body: "Business events, community happenings and more around Springfield, MO.",
  links: [
    { label: "All events", href: "/events/" },
    { label: "Springfield business events", href: "/events/springfield-business-events/" },
    { label: "Submit your event", href: "/submit-your-event/" },
  ],
};
