import { z } from "astro/zod";

/**
 * Matches the event-radar export (`engine/export/schema.ts`). Core fields are required;
 * everything else is optional so a newer or older export still builds.
 * TODO: confirm field shapes against event-radar's schema.ts once the first export lands.
 */
export const BUSINESS_EVENT_CATEGORIES = ["networking", "entrepreneurship", "professional-development"] as const;

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
    organizer: z.object({ name: z.string().optional(), website: z.string().nullish() }).passthrough().nullish(),
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
