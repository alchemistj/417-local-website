import { readdirSync, statSync } from "node:fs";

/** Every .html file under dir, as absolute paths. */
export function htmlFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = `${dir}/${name}`;
    if (statSync(full).isDirectory()) out.push(...htmlFiles(full));
    else if (name.endsWith(".html")) out.push(full);
  }
  return out;
}

/** "/x/index.html" under dist -> "/x/" */
export function routeOf(dist: string, file: string): string {
  return file.slice(dist.length).replace(/index\.html$/, "");
}

export function decode(s: string): string {
  return s
    .replace(/&#38;|&amp;/g, "&")
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
