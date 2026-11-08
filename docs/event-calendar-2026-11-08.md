# The calendar view: month grid, day pages, lists grouped by day, chips everywhere (Nov 8, 2026)

Approved by Josh, Nov 8, 2026. This is PR 3 of 3; event pages and `/events/{city}/` addresses shipped in PR #6.

Josh's feedback on the current events pages: "it does not feel like an event calendar at all," and he loses the
other categories as soon as he opens one. This PR makes it feel like a calendar. **The one-off events should stand
out.** Weekly things such as trivia, markets and classes stay findable but never crowd the special events out.

## 1. Lists show upcoming events only

- City hubs, category pages, This Weekend, day pages and the month grid list **upcoming events only**.
  - Today `src/pages/events/[city]/index.astro`, `listedCategories` and the category blocks on the event page use
    `isListedEvent`, which keeps events listed for 30 days after their date. Switch those lists to `isUpcoming`.
  - Keep `isListedEvent` only for the sitemap, and keep `isIndexableEvent` as it is.
  - A category page exists only when the city has at least one upcoming event in it.
- **Why:** event-radar #13 (merging after this PR) keeps exporting events for 30 days after their date, so their
  pages can say "This event has passed." Those events must not show up in lists.
- **Archive copy:** remove the build-time `src/content/past-events/` copy (`shouldArchiveEvent` and the loader
  merge). It doesn't survive Vercel builds, and #13 replaces it. Keep the passed-event behaviour on the event page.

## 2. Category chips on every events page

- **One component, `EventChips.astro`.** It's a row of pill links:
  - first "All events" (the city hub), then each category that has upcoming events in that city;
  - the current one highlighted with `aria-current="page"`;
  - Business events last (`/events/springfield-business-events/`).
- **Where it shows:** the city hub, every city category page, This Weekend, the month grid, day pages and event pages (under
  the breadcrumb).
- **On phones** the row scrolls sideways in one line, with no wrapping into a block.
- Every category page also gets a "← All Springfield events" text link under the H1.

## 3. City hub layout (`/events/springfield/`)

From top to bottom:

1. **H1, a short intro and the chips.**
2. **Date strip.** "Today · Tomorrow · This weekend · Next 7 days · Pick a date." Each shows a count, such as
   "Sat 14 · 9 events".
   - "Pick a date" opens the month grid.
   - On phones it's a swipeable row of the next 14 days (weekday, date and count), each linking to its day page.
3. **This weekend:** up to 6 one-off events from Friday through Sunday, then a "See all of this weekend" link.
4. **Don't miss this month:** up to 6 standout one-off events in the next 30 days. A standout event meets at least one of these:
   - it's in `festivals` or `holiday`;
   - its venue is one of the big venues (Great Southern Bank Arena, Juanita K. Hammons Hall, Gillioz Theatre, Hammons Field);
   - its `action_type` is `tickets` and it's in `live-music`, `comedy` or `arts-and-theater`.

   Sort them by date. The block clears itself because it only uses upcoming events; hide it if nothing qualifies.
5. **Upcoming:** all one-off events for the next 14 days, grouped by day (section 5), then "See the full calendar".
6. **Weekly happenings:** a compact list of recurring items (section 7), with "See all weekly happenings".

## 4. Month grid (`/events/{city}/calendar/` and `/events/{city}/calendar/{yyyy-mm}/`)

- **Months built:** `/events/springfield/calendar/` shows the current month. Static month pages are built for the current month
  and the next 3, with previous and next links (no link before the current month or after the last built month).
- **The grid:** Sunday to Saturday. Each day cell shows:
  - the day number, which links to the day page;
  - up to 3 one-off event titles (short title, linking to the event page);
  - "+N more" when there are more one-offs;
  - a separate small chip, **"+N weekly"**, counting the recurring items on that day and linking to the day page's weekly section.
- **Today** has a visible outline. Past days in the current month are dimmed and list nothing.
- **Phones:** under 640px, show an agenda list instead of the 7-column grid: one row per day that has anything, with the same
  content. Use CSS only for the switch; no JavaScript framework.
- **Title tag:** "Springfield, MO Events Calendar · December 2026 | 417 Local".

## 5. Day pages (`/events/{city}/{yyyy-mm-dd}/`)

- **Which days:** build a page for every day from today through the last built month that has at least one event or weekly item.
- **H1:** "Events in Springfield on Saturday, December 19". Then the chips, then the one-off events sorted by time, then
  "Weekly happenings this day".
- **Previous and next day links.**
- **Reserved words:** a bare date (`^\d{4}-\d{2}-\d{2}$`) and `calendar` join the reserved-words list in the build
  check. Event slugs always end in a date but always have words before it, so they don't collide. The check must fail on any collision.

## 6. One way to show a list of events

Replace the paragraph-style `EventList` rows everywhere events are listed (except the event page's write-up). The new format:

- **Grouped by day** under a sticky day header ("Saturday, Nov 14"), sorted by start time, then title. This also fixes the
  Nutcracker showing after Saturday events.
- **Compact rows:**
  - time on the left ("7:30 PM", or "All day" or "Time TBA");
  - then the title (linking to the event page) and "Venue · City" on one line;
  - then small tags: up to 2 category labels, plus "Free" only when `is_free === true`.
- **No write-up paragraph in lists.** It lives on the event page.
- **Filter toggles:** on the hub, category pages and day pages, add "Free" and "Kids" toggles. They're plain progressive-enhancement
  JavaScript: a small inline script that hides rows without `data-free="true"` or `data-kids="true"`. Without JavaScript,
  everything shows. "Kids" covers `kids` and `family`.

## 7. Weekly happenings

- **Data:** the event-radar export now writes recurring items to `src/content/recurring/*.json`, with fields `id`, `title`, `venue`,
  `address`, `city`, `categories`, `rule`, `season`, `url`, `next_dates`, `active` and `verified`. Add a content collection
  with a permissive schema. The folder may be empty or missing; the build must still pass.
- **Series pages** (`/events/{city}/weekly/{id}/`, or `/monthly/` when the rule is monthly):
  - H1 with the title;
  - when ("Every Saturday, 9 AM–1 PM, March–October"), venue and address with Get directions;
  - the next 8 dates;
  - a "Visit their site" button (action wording `hours` for markets, `details` otherwise);
  - Add to calendar for the next date (reuse the PR #6 helpers);
  - the chips.
- **Weekly happenings page** at `/events/{city}/weekly/`: every active series in that city, grouped by weekday.
- **Never in one-off lists:** recurring items never appear in the one-off lists (This Weekend, Don't miss, Upcoming).
  They show only in the weekly sections and the "+N weekly" chips.

## Don't

- No changes to event-radar.
- No accounts or "My ideas" button yet.
- No venue or organizer pages.
- Don't rename or move any address that PR #6 created.

## Done when

- **Checks:** `npm run build`, `npm test`, `npm run check`, lint and `git diff --check` all pass.
- **New tests:**
  - the upcoming-only lists (a passed event exported within 30 days isn't listed anywhere, but its page builds);
  - the month grid (correct weekday alignment for Nov 2026 and Feb 2027, the "+N more" and "+N weekly" counts);
  - day page routes and the reserved-word check with dates and `calendar`;
  - the Don't miss rule;
  - grouping and sort order (the Nutcracker Friday 7 PM sorts before Saturday events);
  - chips on every events page type, with `aria-current` on the right chip;
  - an empty or missing recurring folder.
- **Spot-check in the build:**
  - `/events/springfield/`;
  - `/events/springfield/calendar/`;
  - `/events/springfield/2026-12-19/`;
  - `/events/springfield/live-music/` (chips present, "All events" first);
  - a 390px-wide screenshot of the hub and of the calendar, if you can take one.
