# Spec: Southwest Missouri events structure (Josh, Nov 13)

Read first: docs/url-keyword-plan-2026-11-13.md (in this PR). Previews only; nothing goes live.

## 1. /events/ = Southwest Missouri events
- H1 "Southwest Missouri Events". Title "Southwest Missouri Events: Springfield, Joplin, Branson & More | 417 Local".
- Hero (the first screen, not a link row): five large city entry cards in this order: Springfield, Branson, Joplin, Lebanon, Bolivar.
  Each card: city name, a one-line count ("42 events in the next 4 weeks", computed at build), this weekend's top event title,
  and two links: "<City> events" (hub) and "This weekend" (weekend page). Phone: stacked full-width cards, at least 44px tap targets.
  Desktop: Springfield large on the left, the other four in a 2x2 grid. Use existing site tokens/colors and typography; no new fonts.
- Under the hero: "Don't miss across Southwest Missouri: the next 4 weeks" (the significant-one-off rule below, all 5 cities, max 12, each row shows its city).
- Then a short "More towns" line linking the other city hubs that exist (Republic, Nixa, Ozark, etc.).
- Fix the intro copy: no hard-coded list of three cities.

## 2. This-weekend pages, one per city
- URL: /things-to-do-in-<city>-mo-this-weekend/ for springfield, branson, joplin, lebanon, bolivar (Springfield's already exists; generalize it).
- 301 /events/<city>/this-weekend/ to the flat URL for those five. For the other cities' /events/<city>/this-weekend/: 301 to their hub.
  Add these to src/data/redirects.ts and update sitemap/route registry so only the 5 flat URLs are listed.
- Window: the coming Friday–Sunday (America/Chicago). Monday–Thursday show the upcoming weekend; Friday–Sunday show the current one.
- Title: "Things to Do in <City>, MO This Weekend (<Mon D>–<D>) | 417 Local". H1: "Things to Do in <City> This Weekend".
- Sections: Friday / Saturday / Sunday lists for that city; then "Worth the drive this weekend": significant one-offs from the other 4 cities (show city + approx. drive), max 6.
- City-specific intro: one sentence per city, held in a small data file (no Springfield wording on Joplin's page). Say "updated weekly", not "daily".
- Self-canonical. Link back to the city hub and to /events/.

## 3. City hub "Don't miss: the next 4 weeks"
- Replace "Don't miss this month" on /events/<city>/ with "Don't miss: the next 4 weeks": significant one-offs today..+27 days in this city,
  plus significant one-offs from the other 4 cities (label each with its city), max 10, local first then by date.
- Add a prominent link to that city's this-weekend page near the top of the hub.

## 4. Significant one-off rule (one function, tested)
- isSignificantOneOff(event): isStandoutEvent(event) (existing rule: festivals/holiday, big venue, ticketed music/comedy/theater)
  AND not part of a weekly/monthly series AND not a class-like title (CLASS_TITLE_PATTERN) AND has an official/source URL.
- Cross-city: only the five cities above.

## Checks
- Tests for: weekend window on each weekday, the redirects, isSignificantOneOff, cross-city labeling, unique titles/descriptions.
- npm ci, npm test, npm run build, git diff --check.
