// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import vercel from "@astrojs/vercel";
import { rehypeAlternateImages } from "./src/lib/rehypeAlternateImages.mjs";
import { eventCardImages } from "./src/integrations/eventCardImages";

// https://astro.build/config
export default defineConfig({
  site: "https://417local.com",
  output: "static",
  adapter: vercel(),
  trailingSlash: "always",
  integrations: [eventCardImages()],
  build: { inlineStylesheets: "always", format: "directory" },
  markdown: { rehypePlugins: [rehypeAlternateImages] },
  // Cast: @tailwindcss/vite and Astro bundle different Vite type versions.
  vite: { plugins: [/** @type {any} */ (tailwindcss())] },
});
