# Spec: "This Friday in Springfield" text

Preview only. Route: /this-friday-in-springfield/ (indexable is fine; add to sitemap).
Purpose: Josh copies a short text for his family every week: 3 real things happening this Friday in Springfield, each with time, place and one link.

## Data and rules
- Built from the exported Springfield events (same loader as the hubs). "This Friday" = the coming Friday in America/Chicago (on a Friday, that day; on Saturday–Thursday, the next Friday).
- Pick 3: evening-friendly (start 4 PM or later, or all-day festivals/markets), family-friendly first (exclude 21+ items: titles/descriptions mentioning 21+, "ages 21", wine, beer tasting, bar crawl, rave), significant one-offs preferred (reuse isSignificantOneOff), then variety of categories. No series/recurring classes. Events with an official source URL (not a listing site such as allevents.in, happeningnext.com, eventbrite listing pages count as listing sites) rank ahead of listing-only events.
- If fewer than 3 qualify, show what's real and say so; never pad.

## Page
- H1 "This Friday in Springfield" and the date ("Friday, November 20").
- A plain-text block (pre-wrapped) exactly as it would be texted, under 320 characters if possible:
  "This Friday in Springfield (Nov 20):\n1) <title>, <venue>, <time>. <short url>\n2) ...\n3) ..."
  Use the event's page URL on the site (absolute, 417local.com host via absoluteUrl) as the link.
- A "Copy text" button (small inline script, navigator.clipboard with a select-text fallback) at least 44px tall; shows "Copied" for 2 seconds.
- Below: the 3 events as normal rows linking to their pages, then a link to the Springfield weekend page and the hub.

## Checks
Tests for the Friday date math (each weekday, including Friday 8 PM Central = Saturday 02:00 UTC), the 21+ filter, the pick order, and the <=3 rule. Inlined CSS under the 30 KB budget. npm ci, npm test, npm run build, git diff --check.
