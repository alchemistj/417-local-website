# "Best of" business lists: template and hub (Nov 6, 2026)

Josh wants 417local to publish lists like "Best Roofers in Springfield, MO" and "Best HVAC Companies in Springfield, MO". This job builds the **template only**. No real list is published by this job: real lists are written later, approved by Josh in a review Doc, then added as data files.

Copy for the hub, the method page and the disclosure line is in `docs/best-of-hub-copy.json`. Place it verbatim. Josh reviews that copy before anything goes to production; build it as written.

## Rules the template must enforce

- **No review text, no ratings.** We never quote or paraphrase-in-quotes a Google review. Each business gets a summary written in our own words and a link to its Google listing. No star ratings, review counts or "checked on" dates anywhere on the page (Josh, Nov 6: they change too often to show).
- **No rating markup.** JSON-LD for list pages is an `ItemList` of `LocalBusiness` items with `name` and `url` only. No `aggregateRating`, no `review` (Google's review-snippet rules do not allow ratings taken from another site).
- **Disclosure on every list page**, from the copy file, linked to the method page.
- **Order is editorial.** Businesses render in the order of the data file. `ffClient` and `featured` never change the order.

## 1. Data: a `lists` content collection

`src/content/lists/<slug>.json`, one file per list, loaded like `events` (files starting with `_` are ignored). Schema in `src/lib/listSchema.ts`:

- `slug` comes from the file name and must match `^best-[a-z0-9-]+-in-springfield-mo$`.
- `status`: `"draft"` or `"published"`.
- `trade`: short label, e.g. `"Roofers"`.
- `title`, `seoTitle` (max 70), `description` (max 155), `h1`.
- `intro`: 1–3 paragraphs (strings).
- `criteria`: 3–6 short strings: what we looked at for this list.
- `published`, `updated`: dates.
- `faq` (optional): up to 6 `{ q, a }`.
- `businesses`: 3–15 items, each:
  - `name` (required)
  - `googleMapsUrl` (required, must start with `https://www.google.com/maps` or `https://maps.google.com`)
  - `summary` (required, 160–420 characters, our words). It must not contain `"`, `“` or `”`.
  - `bestFor` (optional, max 60 characters), e.g. "Storm damage and insurance claims"
  - `highlights` (optional, up to 4 short strings, max 80 characters each)
  - `website` (optional URL), `phone` (optional), `area` (optional, e.g. "Springfield, Nixa, Ozark")
  - `ffClient` (boolean, default `false`): the business is a Fluid Frame client
  - `featured` (boolean, default `false`): reserved for a later labeled "Featured Partner" box. Do not render anything for it yet.

Add one sample file, `src/content/lists/best-sample-roofers-in-springfield-mo.json`, with `status: "draft"` and five clearly fake businesses ("Sample Roofing Co. 1"…, `googleMapsUrl: "https://www.google.com/maps"`) so the template can be seen on the preview.

## 2. Draft vs published

- Published lists build everywhere.
- Draft lists build only when `VERCEL_ENV` is not `"production"` (Vercel previews and local dev). On those builds a draft page has `<meta name="robots" content="noindex, nofollow">` and a small visible "Draft (preview only)" bar at the top.
- Drafts never appear in the sitemap, `llms.txt`, the hub, or any link on a production build.

## 3. List page

URL `/<slug>/` at the site root, the same pattern as the existing best-of articles (e.g. `/best-breweries-in-springfield-mo/`). Posts and lists share the root, so build one set of static paths and fail the build (and a test) if a list slug equals a post slug.

Use the landing-page look (`kind: page` style). Order:
1. Breadcrumb: Home → Local Business Guide (`/springfield-mo-local-business-guide/`) → list. BreadcrumbList JSON-LD to match.
2. H1, then the intro paragraphs.
3. Disclosure line (copy file `disclosure`), with "How we pick" linking to `/how-we-pick/`. Shown on every list page.
4. "Last updated <Month D, YYYY>" from `updated`.
5. Numbered business cards, in file order. Each card: number and name (H2), `bestFor` if set, a "See reviews on Google" link to `googleMapsUrl` (opens in a new tab, `rel="noopener"`), `summary`, `highlights` as a short list, and buttons for website and phone when present. No star rating, review count or date on the card. Plain links: no tracking query strings.
6. "How we picked these" box: the list's `criteria`, plus a link to `/how-we-pick/`.
7. FAQ section when `faq` is present (FAQPage JSON-LD is fine).
8. The existing `CtaBand`.

Phone first: cards stack, buttons are at least 44px tall, nothing scrolls sideways at 360px.

## 4. Hub page

`/springfield-mo-local-business-guide/`, landing-page look. H1, intro and section lead from the copy file. A card grid of every **published** list, newest `updated` first (use or extend `ArticleCard`). If there are no published lists, the page still builds and shows the copy file's `emptyState` line. Add it to the sitemap and `llms.txt`.

Do **not** add it to the header menu or footer yet. Josh decides that on Sunday.

## 5. Method page

`/how-we-pick/`, plain page with the copy file's `howWePick` title, description and sections. Sitemap and `llms.txt` too.

## 6. Sitemap, llms.txt, schema

- Sitemap and `llms.txt`: the hub, the method page and every published list. Never drafts.
- List JSON-LD: `ItemList` (`itemListElement` of `ListItem` with `position` and `item: { "@type": "LocalBusiness", name, url? }` where `url` is the website if set), plus BreadcrumbList. No `aggregateRating`, no `review`.

## Tests

Add tests (same runner as the repo) that cover:
- the schema rejects: a summary containing a quotation mark, a bad slug, a `googleMapsUrl` that is not Google Maps, fewer than 3 businesses
- a draft list is excluded from a production build's pages, sitemap and `llms.txt`, and present (with noindex) on a non-production build
- a published list page has exactly one H1, the disclosure line, a link to `/how-we-pick/`, the businesses in file order, and JSON-LD with no `aggregateRating` or `review`
- `ffClient`/`featured` do not change the order and render nothing extra
- no list slug equals a post slug
- the hub lists only published lists and builds with zero published lists
- the list schema has no rating, review-count or checked-on fields, and a rendered list page contains no `★` and no "Google reviews (" text

Existing tests keep passing.

## Update (Nov 6, evening)

Josh decided against showing star ratings and review counts. Remove `rating`, `reviewCount` and `ratingCheckedOn` from the schema, the sample data, the card and the tests, and replace the 180-day freshness test as listed above. The list-level "Last updated" date stays.

## Not in scope

No real list content, no menu or footer changes, no changes to posts, events or the event export, no "Featured Partner" box, no data pipeline from the content factory (that is a later job).
