import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { eventSchema } from "./lib/eventSchema";
import { listSchema } from "./lib/listSchema";
import { makePostSchema } from "./lib/postSchema";

const posts = defineCollection({
  // Files starting with "_" (samples, drafts) are ignored.
  loader: glob({ pattern: ["*.md", "!_*"], base: "./src/content/posts" }),
  schema: ({ image }) => makePostSchema(() => image()),
});

const events = defineCollection({
  loader: glob({ pattern: ["*.json", "!_*"], base: "./src/content/events" }),
  schema: eventSchema,
});

const lists = defineCollection({
  loader: glob({
    pattern: ["*.json", "!_*"],
    base: "./src/content/lists",
    // The file name is the slug. A `slug` field in the JSON must not replace it.
    generateId: ({ entry }) => entry.replace(/\\/g, "/").replace(/\.json$/, "").split("/").pop() ?? entry,
  }),
  schema: listSchema,
});

export const collections = { posts, events, lists };
