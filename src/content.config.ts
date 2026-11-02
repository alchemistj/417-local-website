import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { makePostSchema } from "./lib/postSchema";
import { eventSchema } from "./lib/eventSchema";

const posts = defineCollection({
  // Files starting with "_" (samples, drafts) are ignored.
  loader: glob({ pattern: ["*.md", "!_*"], base: "./src/content/posts" }),
  schema: ({ image }) => makePostSchema(() => image()),
});

const events = defineCollection({
  loader: glob({ pattern: ["*.json", "!_*"], base: "./src/content/events" }),
  schema: eventSchema,
});

export const collections = { posts, events };
