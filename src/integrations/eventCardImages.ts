import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import { writeEventCardImages } from "../lib/eventCardImage";

/** Builds the 1200×630 event card PNGs into `public/event-cards` before the site is served or copied. */
export function eventCardImages(): AstroIntegration {
  let publicDir = "";
  const eventsDir = fileURLToPath(new URL("../content/events", import.meta.url));
  return {
    name: "event-card-images",
    hooks: {
      "astro:config:done": ({ config }) => {
        publicDir = fileURLToPath(config.publicDir);
      },
      "astro:build:start": ({ logger }) => writeCards(publicDir, eventsDir, logger),
      "astro:server:start": ({ logger }) => writeCards(publicDir, eventsDir, logger),
    },
  };
}

async function writeCards(publicDir: string, eventsDir: string, logger: { info: (message: string) => void }): Promise<void> {
  if (!publicDir) throw new Error("Event card images ran before the public directory was known.");
  const stats = await writeEventCardImages({ outDir: publicDir, eventsDir });
  logger.info(`Event cards: ${stats.rendered} rendered, ${stats.cached} from cache.`);
}
