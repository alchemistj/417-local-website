# 417local.com rebuild on Astro: build spec

The owner is Josh (Fluid Frame Marketing). 417local.com is a Springfield, MO local guide, currently on WordPress at Rocket.net. This repo is its replacement: a static Astro site on Vercel. Business events come later as JSON files written by the event-radar engine into `src/content/events/`.

Follow `docs/sop/astro-full-build-rules.md` and `docs/sop/astro-first-frame-and-pagespeed.md` where they apply. Those SOPs were written for service businesses. Ignore the parts that don't fit a local guide: cities and services, phone/NAP, the sticky call bar, trust bar, call tracking and schedulers. Use 417local's branding (logo, colors, name) from the live site, but not its layout. We are not matching the old design.

## Stack (from SOP Rule 1)
- Astro 5, `output: "static"`, `@astrojs/vercel`, `trailingSlash: "always"`, `build.inlineStylesheets: "always"`. Node 22. Tailwind CSS 4 via `@tailwindcss/vite`. TypeScript strict.
- Zero client JS by default. The mobile menu uses a tiny `<script>` or `<details>`.
- Scripts: `dev`, `build`, `preview`, `check` (astro check), `lint`, `test` (vitest). Commit the lockfile.
- Content lives in the repo as files, never a database. Images are local files optimized at build time. No hot-linked WordPress images.

## URLs (keep every existing one)
- Articles stay at the root: `/<slug>/`, exactly the old WordPress slug with a trailing slash.
- `/blog/`: index of all articles, newest-updated first, paginated at `/blog/page/2/` and so on.
- `/category/<slug>/`: category archives. The slugs are `do-something` (Things to Do), `food-and-drink` (Food & Drink), `small-business` (Small Business), `springfield` (Springfield) and `blog` (Blog).
- `/events/`: the events hub. It reads `src/content/events/*.json` (the schema is in event-radar's `engine/export/schema.ts`; build a matching zod schema), and shows an empty state when there are none. Sub-pages:
  - `/events/springfield-business-events/` (parent)
  - `/events/springfield-business-events/networking/`
  - `/events/springfield-business-events/entrepreneurship/`
  - `/events/springfield-business-events/professional-development/`

  Business categories in the JSON are `networking`, `entrepreneurship` and `professional-development`.
- Static pages, carried over from the live site with their wording tidied: `/contact-us/`, `/privacy-policy/`, `/terms-and-conditions/`, `/submit-your-event/`, `/thank-you/`, `/get-started/`. Forms post to the Fluid Frame Forms intake (SOP Rule 14). Use `siteKey: "417local"`, and form keys `contact` and `submit-event`. Leave a TODO in the code if a key needs confirming.
- `/` is the homepage: curated, undated tiles linking the best articles by category (Things to Do, Food & Drink, Outdoors and Parks, Small Business, Events). There is no auto-dated feed.
- Redirects: `docs/build/redirects-seed.json` lists the retired pages and the old events-plugin patterns. Keep one data file, generate `vercel.json` from it, and add a test (SOP Rule 15). Old `/wp-content/uploads/...` image URLs with more than 5 impressions redirect to the article that used them.

## Articles: content collection `posts`
One Markdown file per article: `src/content/posts/<slug>.md`. Images go in `src/content/posts/images/<slug>/` and are referenced with relative paths, so Astro optimizes them. Frontmatter:

```yaml
title: "H1 text"                 # AP-style title case, no year unless the content is truly dated
seoTitle: "Title tag, <= 60 chars" # keep the main keyword the old title ranked for
description: "Meta description, <= 155 chars"
published: 2021-07-14            # original publish date (from the live page)
updated: 2026-11-02
category: do-something           # one of the category slugs above (use the old post's main WP category)
heroImage: ./images/<slug>/hero.jpg   # optional
heroAlt: "Describe the image"
kind: post                       # "page" for best-things-to-do-in-springfield-mo and small-business-success
```

The body is Markdown: H2/H3, paragraphs (3–4 lines max), lists, links, images with alt text and simple tables. No raw HTML, embeds or shortcodes. Internal links use trailing slashes and must point to final URLs: if a link targets a retired page, use its redirect target from `redirects-seed.json`.

Article layout: H1, a "Updated November 2026" line (don't show the old publish date), hero image, then the body inside the 900px content width. Add Article and BreadcrumbList JSON-LD, plus 3 related articles from the same category.

## Rewrite rules for article content (Sonnet agents)
For each article in your batch (`docs/build/batch-N.json`):
- **Read the live page:**
  - `curl -sL -A "Mozilla/5.0" https://417local.com/<slug>/`
  - Get the title tag, meta description, H1, body, images, publish date and category.
  - WebFetch may fail DNS, so use curl.
- **Apply the plan:** the `plan` field is the owner's approved option from the content audit. When it says `(not audited)`, do a light refresh.
- **Rewrite in a clear, friendly local-guide voice.**
  - Keep every section that is still accurate.
  - Keep the topics and keywords the page ranks for, keep about the same length or longer, and keep the H2 structure close to the original.
  - Remove stale items: closed businesses, past dates and old prices. Use "check their site" wording instead of prices you can't confirm.
  - Never invent facts, prices, hours, addresses or quotes. If something can't be confirmed, leave it out or hedge it.
  - Never mention "this website", "this page" or "this post".
  - Don't say "updated" in the body; the layout shows the date.
  - No hype words (ultimate, epic, amazing), and go light on em dashes.
- **Images:**
  - Download each image the article uses (prefer the largest original, not `-300x200` sizes) into `src/content/posts/images/<slug>/` with descriptive lowercase filenames.
  - Write real alt text.
  - Skip tracking pixels, icons and ads.
- **External links:** keep them only when they still resolve (`curl -sI`). Drop dead ones.
- **Output:** write the `.md` file only. Don't touch other folders, and don't run `npm`.

## Checks before the PR is marked ready
`npm run check`, `npm run lint`, `npm test`, `npm run build` and `git diff --check` must all pass. Tests cover:
- the collection schema
- one H1 per page
- unique titles and descriptions
- every old kept URL building at the same path
- `vercel.json` matching the redirect data
- no internal links to pages that don't exist
- no links to retired URLs

The PageSpeed and first-frame gates run on the Vercel preview, once the Vercel project exists.
