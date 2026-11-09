import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineCollection } from "astro:content";
import { glob, type Loader } from "astro/loaders";
import { eventSchema } from "./lib/eventSchema";
import { listSchema } from "./lib/listSchema";
import { makePostSchema } from "./lib/postSchema";
import { recurringSchema } from "./lib/recurring";

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

const recurringDir = fileURLToPath(new URL("./content/recurring", import.meta.url));

/** An empty or missing `src/content/recurring` folder still builds. */
function recurringLoader(): Loader {
  if (!existsSync(recurringDir)) return { name: "recurring-empty", load: async () => {} };
  return glob({
    pattern: ["*.json", "!_*"],
    base: "./src/content/recurring",
    generateId: eventFileId,
  });
}

const recurring = defineCollection({
  loader: recurringLoader(),
  schema: recurringSchema,
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

export const collections = { posts, events, recurring, lists };
