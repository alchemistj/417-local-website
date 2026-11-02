/**
 * Header navigation. `requiresPost` hides an article link until that article exists in the
 * collection, so the menu never points at a missing page.
 */
export interface NavItem {
  label: string;
  href: string;
  requiresPost?: string;
}

export const NAV_ITEMS: NavItem[] = [
  // Same menu targets as the old WordPress site: menu links go to the pages that rank, not to archives.
  { label: "Discover Things to Do", href: "/best-things-to-do-in-springfield-mo/", requiresPost: "best-things-to-do-in-springfield-mo" },
  { label: "Food & Drink", href: "/category/food-and-drink/" },
  { label: "Events", href: "/events/" },
  { label: "Blog", href: "/blog/" },
  { label: "Grow Your Business", href: "/small-business-success/", requiresPost: "small-business-success" },
];

export const FOOTER_LINKS: { label: string; href: string }[] = [
  { label: "Home", href: "/" },
  { label: "Blog", href: "/blog/" },
  { label: "Events", href: "/events/" },
  { label: "Submit Your Event", href: "/submit-your-event/" },
  { label: "Contact Us", href: "/contact-us/" },
  { label: "Privacy Policy", href: "/privacy-policy/" },
  { label: "Terms and Conditions", href: "/terms-and-conditions/" },
];
