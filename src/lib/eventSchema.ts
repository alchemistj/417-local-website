import { z } from "astro/zod";

/**
 * Matches the event-radar export (`engine/export/schema.ts`). Core fields are required;
 * everything else is optional so a newer or older export still builds.
 * TODO: confirm field shapes against event-radar's schema.ts once the first export lands.
 */
export const BUSINESS_EVENT_CATEGORIES = ["networking", "entrepreneurship", "professional-development"] as const;

/**
 * General Springfield events. Labels are the copy-file H1 with " in Springfield, MO" removed.
 * The schema still accepts any category string, so an unknown slug does not fail the build.
 */
export const GENERAL_EVENT_CATEGORIES = [
  "live-music",
  "arts-and-theater",
  "festivals",
  "family",
  "food-and-drink",
  "sports",
  "outdoors",
  "community",
  "holiday",
] as const;

export type GeneralEventCategory = (typeof GENERAL_EVENT_CATEGORIES)[number];

export const GENERAL_EVENT_CATEGORY_LABELS: Record<GeneralEventCategory, string> = {
  "live-music": "Live Music",
  "arts-and-theater": "Arts and Theater",
  festivals: "Festivals",
  family: "Family Events",
  "food-and-drink": "Food and Drink",
  sports: "Sports",
  outdoors: "Outdoor Events",
  community: "Community Events",
  holiday: "Holiday Events",
};

export function isGeneralEventCategory(slug: string): slug is GeneralEventCategory {
  return (GENERAL_EVENT_CATEGORIES as readonly string[]).includes(slug);
}

const textOrObject = z.union([z.string(), z.object({ name: z.string().optional() }).passthrough()]);

export const eventSchema = z
  .object({
    id: z.string().min(1),
    slug: z.string().min(1),
    title: z.string().min(1),
    seo_title: z.string().optional(),
    description: z.string().optional(),
    start: z.string().min(1),
    end: z.string().nullish(),
    timezone: z.string().optional(),
    venue: textOrObject.nullish(),
    address: textOrObject.nullish(),
    city: z.string().nullish(),
    state: z.string().nullish(),
    organizer: z.object({ name: z.string().nullish(), website: z.string().nullish() }).passthrough().nullish(),
    categories: z.array(z.string()).default([]),
    price: z.union([z.string(), z.number(), z.object({}).passthrough()]).nullish(),
    free: z.boolean().nullish(),
    registration_url: z.string().nullish(),
    image_url: z.string().nullish(),
    source_urls: z.array(z.string()).default([]),
    updated_at: z.string().nullish(),
  })
  .passthrough();

export type EventData = z.infer<typeof eventSchema>;
