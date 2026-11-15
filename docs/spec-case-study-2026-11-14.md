# Spec: case-study page draft, "How we're rebuilding 417 Local in the open"

Preview only. Route: /rebuilding-417-local/ with `noindex` until Josh approves (add `<meta name="robots" content="noindex">` and keep it out of sitemap.xml and llms.txt).
Source outline: docs/case-study-outline-2026-11-14.md. Plain, direct words; no hype; never say "this website/page"; never name the SMS platform.

## Sections
1. Why we're doing this: 417 Local is Fluid Frame's open lab for SEO, GEO (answers in AI search), split testing and reporting. Every method runs here first, in public.
2. Where it started (baseline, Google Search Console, Jul 11, 2025 – Nov 10, 2026, 16 months, URL-prefix property https://417local.com/):
   - 3,189 clicks and 493,217 impressions across 770 pages; no content updates in years.
   - Top pages: best-kids-activities (616 clicks / 87,879 impressions, avg position 11.7), best-date-night-ideas (468 / 36,986, 10.5), best-fall-festivals (385 / 23,355, 12.0), /events/ (178 / 15,049, 19.8).
   - "things to do in springfield mo": 14,028 impressions at position 8 with 23 clicks.
   - "this weekend" searches: about 2,840 impressions across 288 queries, mostly position 18–60.
   - Old site: WordPress with 54 posts, 22 pages and 932 old event URLs last touched in 2021–2022.
   Render these as a small stat row plus a short table; no charts needed.
3. What we changed: rebuilt on Astro; daily event engine that reads official sources and publishes approved events for Springfield, Branson, Joplin, Lebanon and Bolivar; one "things to do this weekend" page per city; a Southwest Missouri events hub; every old URL with impressions kept or redirected (67 kept, 680 redirected); annual-event posts keep the original writer's words with yearly date refreshes; a design-review gate before anything ships.
4. What we'll measure (from FF Reports, weekly): clicks, impressions, CTR and position for the top 20 pages and for the "things to do in springfield mo" and "this weekend" query groups; indexed pages; Core Web Vitals; event pages published per week; split tests run and their results.
5. What's next: launch date (TBD), first split tests, monthly updates on this page.
Byline: Fluid Frame. Date: "Started November 2026". A small "Updated" date at the top.

## Checks
Uses the existing page layout and tokens; inlined CSS under the 30 KB budget; tests for noindex and sitemap exclusion; npm ci, npm test, npm run build, git diff --check.
