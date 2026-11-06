# Category cleanup, Food & Drink guide, and parity fixes (Nov 6, 2026)

Josh decided these on Nov 2 and Nov 6. Copy for the new guide page is in `docs/food-and-drink-guide-copy.json`; place it verbatim.

## 1. Remove the category archive pages

The `/category/<slug>/` pages are WordPress leftovers with zero search impressions. Remove them.

- Delete `src/pages/category/[slug].astro`.
- Redirects (301, both slash forms, through the existing `src/data/redirects.ts` system so they reach Vercel's build output):
  - `/category/food-and-drink/` → `/food-and-drink-springfield-mo/`
  - every other `/category/<slug>/` (do-something, small-business, springfield, blog, plus any slug, e.g. via a `/category/:path*` rule placed after the food-and-drink one) → `/blog/`
  - `/category/<slug>/page/<n>/` style URLs also land on `/blog/` (or the guide for food-and-drink).
- Remove category pages from `src/pages/sitemap.xml.ts`, `src/pages/llms.txt.ts` and anything that uses `categoryPath()` in `src/lib/routes.ts`. Keep the `category` field on posts: it still groups posts.
- `src/layouts/PostLayout.astro` breadcrumbs (and their BreadcrumbList JSON-LD) must not link a category page:
  - food-and-drink posts: Home → Food & Drink (`/food-and-drink-springfield-mo/`) → post
  - all other posts: Home → Blog (`/blog/`) → post

## 2. New Food & Drink guide page

- URL `/food-and-drink-springfield-mo/`, built as a normal page with the site's landing-page look (the `kind: page` template style), not an archive list.
- Title tag, meta description, H1, intro and section text from `docs/food-and-drink-guide-copy.json`.
- Two sections, each a card grid using the existing `ArticleCard`:
  - "Springfield food guides": `best-breweries-in-springfield-mo`, `best-food-trucks-in-springfield-mo`, `best-date-night-ideas-in-springfield-mo`, in that order.
  - "Local spots we've written about": every other post with `category: food-and-drink`, newest `updated` first. Build this list from the collection so new food posts appear automatically.
- Add it to the sitemap. Canonical is its own URL.
- Main menu: "Food & Drink" in `src/data/nav.ts` points to `/food-and-drink-springfield-mo/`.

## 3. Footer links

In `src/components/Footer.astro`, replace the categories column (`CATEGORIES.map(...)`) with links to the pages that rank, in this order:
- Things to Do → `/best-things-to-do-in-springfield-mo/`
- Things to Do With Kids → `/best-kids-activities-in-springfield-mo/`
- Date Night Ideas → `/best-date-night-ideas-in-springfield-mo/`
- Parks → `/best-parks-in-springfield-mo/`
- Breweries → `/best-breweries-in-springfield-mo/`
- Food & Drink → `/food-and-drink-springfield-mo/`
- Grow Your Business → `/small-business-success/`
Keep the column heading style; use the heading "Explore Springfield".

## 4. 404 page

`src/pages/404.astro` links `/category/food-and-drink/`. Point that link to `/food-and-drink-springfield-mo/` with the text "Food and drink". No category links anywhere on the site after this change.

## 5. Phone header: "Grow Your Business" bar

On the live WordPress site, phones show "Grow Your Business" as a full-width olive bar directly under the logo row, outside the menu. Match that: below the 860px breakpoint (or the header's existing mobile breakpoint), render the nav item with `cta: true` as a full-width bar under the logo row (olive `#a1b030` background, dark text, same font as the desktop button, at least 44px tall), and leave it out of the collapsed menu so it is not listed twice. Desktop is unchanged.

## 6. Small Business Success: free book paragraph

In `src/content/posts/small-business-success.md`, delete the paragraph that starts "If you're new here, start with the free book…". The book page was retired, so there is no way to get the book. Change nothing else in that article.

## 7. Food trucks card crop

The card for `best-food-trucks-in-springfield-mo` crops the hero photo through a child's face. Add an optional `heroPosition` field to the post schema (a CSS `object-position` value, default unchanged), use it in `ArticleCard` and the post hero, and set `heroPosition: "center 20%"` on that post. Check the crop on the homepage card, the blog list card and the guide page card at phone and desktop widths, and adjust the value if a face is still cut.

## Tests

Add or update tests so they cover:
- no built page contains a link to `/category/`
- `/category/food-and-drink/` and `/category/food-and-drink` redirect (301) to `/food-and-drink-springfield-mo/`; `/category/do-something/` and an unknown `/category/xyz/` redirect to `/blog/`
- the guide page builds, has exactly one H1, its title/description match the copy file, lists the three guides first, and lists every other food-and-drink post
- the nav "Food & Drink" href and the footer "Explore Springfield" links match section 3
- the sitemap has no `/category/` URL and does have the guide
- breadcrumbs on a food post and a non-food post match section 1
- the small-business-success page no longer contains "free book"
Existing tests keep passing.

## Not in scope

No other copy changes, no new articles, no changes to events or the event export, no changes to redirects other than the category ones.
