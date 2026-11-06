import { z } from "astro/zod";

/**
 * One best-of list: `src/content/lists/<slug>.json`.
 * Summaries are our own words. Quotation marks are rejected so a Google review
 * cannot be pasted in. Star ratings and review counts are not stored or shown.
 */
export const LIST_SLUG_PATTERN = /^best-[a-z0-9-]+-in-springfield-mo$/;

const googleMapsUrl = z.string().refine(
  (url) => url.startsWith("https://www.google.com/maps") || url.startsWith("https://maps.google.com"),
  { message: "googleMapsUrl must start with https://www.google.com/maps or https://maps.google.com" },
);

const summary = z
  .string()
  .min(160)
  .max(420)
  .refine((text) => !/["“”]/.test(text), { message: "summary must not contain quotation marks" });

export const listBusinessSchema = z.object({
  name: z.string().min(1),
  googleMapsUrl,
  summary,
  bestFor: z.string().min(1).max(60).optional(),
  highlights: z.array(z.string().min(1).max(80)).max(4).optional(),
  website: z.string().url().optional(),
  phone: z.string().min(1).optional(),
  area: z.string().min(1).optional(),
  /** Fluid Frame client. Does not change order and is not rendered. */
  ffClient: z.boolean().default(false),
  /** Reserved for a later Featured Partner box. Does not change order and is not rendered. */
  featured: z.boolean().default(false),
});

export const listSchema = z.object({
  /** Must match the file name. The page URL is that slug. */
  slug: z.string().regex(LIST_SLUG_PATTERN, "slug must match best-<trade>-in-springfield-mo"),
  status: z.enum(["draft", "published"]),
  trade: z.string().min(1),
  title: z.string().min(1),
  seoTitle: z.string().min(1).max(70),
  description: z.string().min(1).max(155),
  h1: z.string().min(1),
  intro: z.array(z.string().min(1)).min(1).max(3),
  criteria: z.array(z.string().min(1)).min(3).max(6),
  published: z.coerce.date(),
  updated: z.coerce.date(),
  faq: z.array(z.object({ q: z.string().min(1), a: z.string().min(1) })).max(6).optional(),
  businesses: z.array(listBusinessSchema).min(3).max(15),
});

export type ListData = z.infer<typeof listSchema>;
export type ListBusiness = z.infer<typeof listBusinessSchema>;
