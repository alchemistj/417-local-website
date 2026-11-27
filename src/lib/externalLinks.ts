/** Hosts that count as 417 Local itself; links to them stay in the same tab. */
const OWN_HOSTS = new Set(["417local.com", "www.417local.com"]);

const ANCHOR = /<a\b[^>]*>/gi;
const HREF = /\shref\s*=\s*(?:"([^"]*)"|'([^']*)')/i;
const TARGET = /\starget\s*=/i;
const REL = /\srel\s*=\s*(?:"([^"]*)"|'([^']*)')/i;

/** True when an href leaves 417 Local (absolute http(s) or protocol-relative to another host). */
export function isExternalHref(href: string): boolean {
  const match = /^(?:https?:)?\/\/([^/?#:]+)/i.exec(href.trim());
  if (!match) return false;
  return !OWN_HOSTS.has(match[1]!.toLowerCase());
}

/** Gives one opening <a> tag target="_blank" and rel="noopener" when it points off-site. */
export function externalizeAnchor(tag: string): string {
  const href = HREF.exec(tag);
  if (!href || !isExternalHref(href[1] ?? href[2] ?? "")) return tag;
  let out = tag;
  const rel = REL.exec(out);
  if (rel) {
    const values = (rel[1] ?? rel[2] ?? "").split(/\s+/).filter(Boolean);
    if (!values.includes("noopener")) out = out.replace(rel[0], ` rel="${[...values, "noopener"].join(" ")}"`);
  } else {
    out = out.replace(/\s*\/?>$/, (end) => ` rel="noopener"${end}`);
  }
  if (!TARGET.test(out)) out = out.replace(/\s*\/?>$/, (end) => ` target="_blank"${end}`);
  return out;
}

/** Applies externalizeAnchor to every link in a page of HTML. */
export function externalizeLinks(html: string): string {
  return html.replace(ANCHOR, externalizeAnchor);
}
