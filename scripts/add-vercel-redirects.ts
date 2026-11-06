/**
 * Runs after `astro build`. With the Vercel adapter, Vercel serves the adapter's
 * Build Output (`.vercel/output/config.json`) and ignores the redirects in
 * vercel.json. This adds the one redirect map (src/data/redirects.ts) to the
 * front of that config's routes, so every old URL keeps its 301 (or 307 for
 * the old short links) on Vercel.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { redirectRoutes } from "../src/data/vercelRoutes";

const configPath = fileURLToPath(new URL("../.vercel/output/config.json", import.meta.url));

if (!existsSync(configPath)) {
  console.log("No .vercel/output/config.json (not a Vercel adapter build); skipping redirects.");
  process.exit(0);
}

const config = JSON.parse(readFileSync(configPath, "utf8")) as { routes?: unknown[] };
const routes = redirectRoutes();
config.routes = [...routes, ...(config.routes ?? [])];
writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
console.log(`Added ${routes.length} redirect routes to ${configPath}`);
