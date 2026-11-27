import { describe, expect, it } from "vitest";
import { externalizeAnchor, externalizeLinks, isExternalHref } from "../src/lib/externalLinks";

describe("external links open in a new tab", () => {
  it("knows which links leave 417 Local", () => {
    expect(isExternalHref("https://www.basspro.com/")).toBe(true);
    expect(isExternalHref("//allevents.in/x")).toBe(true);
    expect(isExternalHref("https://417local.com/events/")).toBe(false);
    expect(isExternalHref("https://www.417local.com/")).toBe(false);
    expect(isExternalHref("/events/springfield/")).toBe(false);
    expect(isExternalHref("mailto:hi@417local.com")).toBe(false);
    expect(isExternalHref("#top")).toBe(false);
  });

  it("adds target and noopener to off-site links only", () => {
    expect(externalizeAnchor('<a href="https://basspro.com/">')).toBe('<a href="https://basspro.com/" rel="noopener" target="_blank">');
    expect(externalizeAnchor('<a href="/events/">')).toBe('<a href="/events/">');
  });

  it("keeps existing rel values and an existing target", () => {
    expect(externalizeAnchor('<a href="https://x.com" rel="nofollow sponsored" class="b">')).toBe(
      '<a href="https://x.com" rel="nofollow sponsored noopener" class="b" target="_blank">',
    );
    expect(externalizeAnchor('<a target="_blank" rel="noopener" href="https://x.com">')).toBe('<a target="_blank" rel="noopener" href="https://x.com">');
  });

  it("rewrites every link in a page and leaves other tags alone", () => {
    const html = '<p><a href="https://a.com">A</a> <a href="/b/">B</a> <abbr title="x">C</abbr></p>';
    expect(externalizeLinks(html)).toBe('<p><a href="https://a.com" rel="noopener" target="_blank">A</a> <a href="/b/">B</a> <abbr title="x">C</abbr></p>');
  });
});
