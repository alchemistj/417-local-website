import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import { externalizeLinks } from "../lib/externalLinks";

/** Site-wide rule: every link that leaves 417 Local opens in a new tab (events, lists, fixed pages, posts). */
export function externalLinks(): AstroIntegration {
  return {
    name: "external-links",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        let changed = 0;
        for (const file of await htmlFiles(fileURLToPath(dir))) {
          const html = await readFile(file, "utf8");
          const next = externalizeLinks(html);
          if (next !== html) {
            await writeFile(file, next);
            changed++;
          }
        }
        logger.info(`External links: ${changed} pages set to open off-site links in a new tab.`);
      },
    },
  };
}

async function htmlFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(root, { withFileTypes: true, recursive: true })) {
    if (entry.isFile() && entry.name.endsWith(".html")) out.push(join(entry.parentPath, entry.name));
  }
  return out;
}
