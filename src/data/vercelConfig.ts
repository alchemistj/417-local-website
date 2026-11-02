import { REDIRECTS } from "./redirects";

/**
 * The full vercel.json, derived from the redirect data. The `scripts/write-vercel-json.ts`
 * script writes it and tests/vercel-json.test.ts checks the file matches.
 */
export function buildVercelConfig() {
  return {
    trailingSlash: true,
    redirects: [
      // One hop from the non-canonical host to the canonical one (SOP Rule 15).
      {
        source: "/(.*)",
        has: [{ type: "host", value: "www.417local.com" }],
        destination: "https://417local.com/$1",
        statusCode: 301,
      },
      ...REDIRECTS,
    ],
    headers: [
      {
        source: "/_astro/(.*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ],
  };
}
