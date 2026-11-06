# All Springfield events: hub, This Weekend and category pages (Nov 6, 2026)

The event engine (`alchemistj/event-radar`, spec `docs/02-engine-general-events.md`) is expanding from business-only events to all Springfield events. It exports to this repo's `main` under `src/content/events/`, daily. This job builds the site side. Copy is in `docs/events-pages-copy.json`; place it verbatim.

## Event categories (export slugs)

Business (existing, unchanged pages under `/events/springfield-business-events/`): `networking`, `entrepreneurship`, `professional-development`.

General (new): `live-music`, `arts-and-theater`, `festivals`, `family`, `food-and-drink`, `sports`, `outdoors`, `community`, `holiday`.

- Add `GENERAL_EVENT_CATEGORIES` next to `BUSINESS_EVENT_CATEGORIES` in `src/lib/eventSchema.ts`, with a label for each (from the copy file's h1 without ", MO" is fine, or a short label like "Live Music").
- The schema keeps accepting any category string, so unknown future slugs never break the build.
- The engine also writes `src/content/events/_export-meta.json`. The loader already ignores files starting with `_`; confirm, and add a test.

## Pages

1. **`/events/` hub** (update): use the copy file's `hub` text. Order:
   - H1 and intro
   - "This Weekend" block (`weekendHeading`): up to 6 events happening this Friday through Sunday (America/Chicago, computed at build time; if today is Friday–Sunday, use the current weekend), with a "See everything this weekend" link to `/events/this-weekend/`. Hide the block if there are none.
   - A category link row: every general category that has at least one upcoming event, plus "Business events" linking to `/events/springfield-business-events/` with the `businessLink` sentence.
   - Then all upcoming events, as today.
2. **`/events/this-weekend/`** (new): `thisWeekend` copy. Events Friday through Sunday grouped under a heading per day ("Friday, November 13"). If there are none, show `emptyState` and the next 7 days of events instead.
3. **`/events/<slug>/` for each general category** (new): copy from `categories.<slug>`. Upcoming events in that category. Build a page only for categories that have at least 1 upcoming event at build time; categories with none are not built and are left out of the sitemap and the link row. Business category pages stay where they are.

All three use `EventsLayout` and the existing event card. Breadcrumbs and BreadcrumbList JSON-LD: Home → Events → page. Each event card keeps its existing Event JSON-LD if present.

## Sitemap and llms.txt

Add `/events/this-weekend/` and the built category pages. No change for business pages.

## Freshness

"This weekend" is computed at build time. The engine's daily `_export-meta.json` commit triggers a daily Vercel build, which keeps it current. No client-side JavaScript is needed.

## Tests

- general category pages build only when they have events, and appear in the sitemap only then
- `/events/this-weekend/` groups Friday–Sunday events by day using America/Chicago dates (test with fixed "now" values: a Wednesday, a Saturday, and a Sunday at 11 PM), and falls back to the next 7 days when empty
- the hub shows the weekend block only when there are weekend events, and links to each built category page
- `_export-meta.json` is not loaded as an event
- an event with an unknown category slug still builds
- every new page has exactly one H1 and its title/description match the copy file

Existing tests keep passing.

## Not in scope

No change to business event pages, posts, lists, nav or footer (Josh decides the menu later), and no engine changes.
