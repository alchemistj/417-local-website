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

// The file name is the entry. A repeated `slug` (a weekly class) must not collapse the occurrences.
const eventFileId = ({ entry }: { entry: string }) =>
  entry.replace(/\\/g, "/").replace(/\.json$/, "").split("/").pop() ?? entry;

const events = defineCollection({
  // Files starting with "_" (including the engine's _export-meta.json) are not events.
  loader: glob({
    pattern: ["*.json", "!_*"],
    base: "./src/content/events",
    generateId: eventFileId,
  }),
  schema: eventSchema,
});

const pastEvents = defineCollection({
  // A build copies an event here when its date is within two days, so the page survives the next export.
  loader: glob({
    pattern: ["*.json", "!_*"],
    base: "./src/content/past-events",
    generateId: eventFileId,
  }),
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

export const collections = { posts, events, pastEvents, lists };
