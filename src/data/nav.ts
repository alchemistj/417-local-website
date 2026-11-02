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
  { label: "Things to Do", href: "/category/do-something/" },
  { label: "Food & Drink", href: "/category/food-and-drink/" },
  { label: "Outdoors", href: "/best-parks-in-springfield-mo/", requiresPost: "best-parks-in-springfield-mo" },
  { label: "Small Business", href: "/category/small-business/" },
  { label: "Events", href: "/events/" },
  { label: "Blog", href: "/blog/" },
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
