# 417 Local events: URL pattern and keyword plan

Prepared Fri Nov 13, 2026 (Central) for Josh. Quality gate before the events rebuild.
Code read: `src/pages/events/**`, `src/pages/things-to-do-in-springfield-mo-this-weekend.astro`, `src/data/redirects.ts`, `src/data/staticPages.ts`, `src/lib/eventPaths.ts`, `src/lib/calendarView.ts`, `src/pages/sitemap.xml.ts`, `vercel.json`.
Live check: `https://417-local-website.vercel.app` via `url-qa.sh` (results at the bottom).
Search volumes: none invented. Search Console is not connected yet, so every ranking or volume claim is marked **[GSC pending]**.

## 1. Decision

Adopt the recommended structure, no strong reason found against it.

- One flat keyword URL per city: `/things-to-do-in-<city>-mo-this-weekend/`. One stable URL, rewritten weekly. Never a dated weekly URL.
- `/events/<city>/this-weekend/` 301s to it, for every city.
- Weekend pages for **5 cities only**: springfield, joplin, branson, bolivar, lebanon.

Why the flat form is right, from the autocomplete data (section 3): every city's top suggestion is "things to do **in** `<city>` mo this weekend", not "things to do this weekend in `<city>`". The existing Springfield URL already matches the dominant phrasing. Use that word order in every city's URL, H1 and title. Treat the "this weekend in `<city>`" order as a secondary variant (it still shows up for Springfield and Branson).

Two refinements to the recommendation, both small:

1. Event pages are self-canonical **except** repeat performances of the same show at the same venue, which canonical to the run's first page (existing behavior in `runCanonicalPath`, confirmed live: the three Midwest SPL Finals pages in Lebanon all canonical to the Nov 13 page). Keep it. Three near-identical pages would otherwise compete.
2. Dated day pages (`/events/<city>/YYYY-MM-DD/`) already exist. They are the one place dates appear in URLs. They are not evergreen pages, so they are allowed, but they must never target "this weekend" (section 6).

## 2. What is inconsistent today

| # | Finding | Evidence | Fix |
|---|---|---|---|
| 1 | Springfield weekend is flat, the other cities are nested | `cityWeekendPath()` in `eventPaths.ts` hardcodes `springfield`; `[city]/this-weekend.astro` filters Springfield out | One flat pattern for all 5 (section 4) |
| 2 | Legacy redirects exist only for Springfield | `redirects.ts` `movedEventPages` has `events/springfield/this-weekend` and `events/this-weekend` only | Add the 4 other cities, both slash forms |
| 3 | Weekend pages exist for 11 cities, not 5 | Sitemap on preview lists `/events/{republic,joplin,bolivar,branson,lake-ozark,lebanon,nixa,ozark,ridgedale,rogersville}/this-weekend/` | Build weekend pages for the 5. 301 the other 5 to their own hub |
| 4 | Weekend copy is one template with the city name swapped in | Joplin page intro still says "Downtown shows to family outings around the Ozarks" (`cityCopy()` is a string replace of "Springfield") | Per-city intro, 2 to 3 sentences of real local texture each, before launch |
| 5 | "Updated daily" in copy, but Josh's plan is weekly | Weekend intro, hub intro and `/events/` meta all say "updated daily" | Pick one truthful line, e.g. "Refreshed every Thursday" (needs Josh to confirm the actual schedule) |
| 6 | `/events/` is a flat list of 11 cities, no hero | `events/index.astro` renders a `<ul>` of `citiesWithEvents()` plus business events; meta says "Springfield, Republic or Joplin" | Hero plus the 5 city hubs. Other cities become secondary links |
| 7 | `KNOWN_CITY_SLUGS` and `CITY_NAMES` list springfield, republic, joplin | `eventPaths.ts` lines 5 to 11 | Replace with the 5 target cities. Others fall back to title-case, which works for "Lake Ozark" |
| 8 | Hubs have "Don't miss this month", not "next 4 weeks", and it is local only | Branson hub on preview | Rename, widen to 4 weeks, add big one-offs from the other 4 cities |
| 9 | Event slugs end in the date | e.g. `/events/lebanon/14th-annual-lebanon-turkey-trot-2026-11-26/`, and a messy one: `christmas-open-house-friday-november-13-saturday-november-14-2026-11-13` | Keep the date suffix (it keeps annual events unique year to year) but strip dates already in the title slug. Needs a cleanup pass, not a rebuild |
| 10 | No-slash URL takes two hops (308 then 301) | Live: `/events/springfield/this-weekend` 308 to the slash form, then 301 | Platform behavior with `trailingSlash: true`. Acceptable, only a warning in QA |
| 11 | A category and a city share one route file | `[city]/[event].astro` serves categories, day pages and events. Reserved-slug guard exists | Keep, and add `weekend` style slugs to the reserved list if used |
| 12 | Redirect source of truth drifts easily | `redirects.ts` header says edit the map, then `npm run redirects` regenerates `vercel.json` | Follow it. Never hand-edit `vercel.json` |

## 3. Keyword research (Google autocomplete, fetched Fri Nov 13, 2026)

Method: `curl` against `suggestqueries.google.com` (client=firefox), 8 seeds per city plus 4 regional seeds. Raw output: `autocomplete.txt`, condensed: `autocomplete-condensed.md` (same folder). Autocomplete shows what people type. It does not show volume. **[GSC pending]** for volume, impressions and current rankings.

### Patterns that held across cities

- Dominant order: **"things to do in `<city>` mo this weekend"**. "Things to do this weekend in `<city>` mo" resolves to it in Joplin, Bolivar and Lebanon.
- Modifiers that repeat in nearly every city: **for adults**, **free**, **with kids / for kids**, **for couples**, **tonight / today**, **on sunday**, **next weekend**.
- "events in `<city>` mo" most often completes to **this weekend**, then **today**, **tonight**, **this week**.
- "`<city>` mo events this weekend" completes to **things to do this weekend**, **free**, **calendar**, **downtown `<city>`**.
- "`<city>` mo festivals" completes to "festivals 2026", "fall festivals". For Joplin it returns almost nothing local. Treat festivals as a category page, not a main target.
- "`<city>` mo events november" returned nothing useful for Joplin, Bolivar and Lebanon. Do not build month pages for these. Use the "next 4 weeks" block instead.

### Per city

| City | Strongest signal | Notes |
|---|---|---|
| Springfield | Full family: this weekend, for adults, for kids, free, tonight, on sunday, `spfd`, next weekend, downtown, calendar of events | Deepest autocomplete of the five. "Fall festivals 2026" and "festival of lights" also appear |
| Joplin | this weekend for adults, for couples, free, with kids, "around Joplin", outdoor, "events calendar" | Good depth. "events near joplin mo this weekend" is a variant to cover in copy |
| Branson | this weekend for adults, for couples, free, thanksgiving weekend, next weekend, memorial / easter / labor day weekend | **Seasonal holiday-weekend variants are Branson-specific.** Thanksgiving weekend is Nov 26 to 29, so a section for it goes live now. Also "in november", "during christmas" |
| Bolivar | "things to do in bolivar mo this weekend", free, with kids, today, "events near bolivar mo" | **Shallow.** Few completions, and "bolivar mo festivals" returns Venezuela noise. Lowest-confidence page. Keep the "MO" in every title |
| Lebanon | this weekend for adults, free, kid friendly, "downtown lebanon mo events this weekend", "lebanon mo event calendar" | **Ambiguous name.** Completions include Mount Lebanon PA and Lebanon County. Always write "Lebanon, MO" in title, H1 and first sentence |
| Region | "southwest missouri events this weekend", "sw missouri events", "southwest missouri calendar of events", "things to do in southwest missouri this weekend", "events near springfield mo this weekend", "events around springfield mo this weekend" | "ozarks events this weekend" mostly returns Lake of the Ozarks, Ozark AL and Ozark AR. Do not target "ozarks" alone. Use it only as supporting text |

### Keyword assignment

| Page | Primary (one page owns it) | Secondary (same page, as H2s or body) |
|---|---|---|
| Weekend page | things to do in `<city>` mo this weekend | what to do this weekend in `<city>` mo, things to do this weekend in `<city>` mo, `<city>` mo events this weekend, free things to do in `<city>` mo this weekend, things to do in `<city>` mo this weekend for adults / for kids / for couples, things to do tonight, things to do on sunday, things to do next weekend |
| City hub | events in `<city>` mo | `<city>` mo events calendar, `<city>` mo events, upcoming events in `<city>`, `<city>` mo festivals, events in `<city>` mo november (only if GSC shows demand) |
| `/events/` | southwest missouri events | sw missouri events, southwest missouri calendar of events, events near springfield mo, things to do in southwest missouri |
| Event page | `<event name>` + `<city>` | `<event name>` tickets / schedule / date, venue name |

"Things to do in `<city>` mo" with no time modifier is a head term. It belongs to the evergreen blog guide (`/best-things-to-do-in-springfield-mo/` for Springfield). The weekend page must not try to win it.

## 4. URL table

`<City>` = display name. `<city>` = lowercase slug. All paths lowercase, trailing slash, hyphens only.

| Page type | Pattern | Example | Primary keyword | Secondary keywords | Title tag pattern (max 60 chars) | H1 pattern | Meta description pattern (max 155) | Canonical rule |
|---|---|---|---|---|---|---|---|---|
| Region catch-all | `/events/` | `/events/` | southwest missouri events | sw missouri events; southwest missouri calendar of events; events near springfield mo | `Southwest Missouri Events Calendar \| 417 Local` | `Southwest Missouri Events` | `What's on across Southwest Missouri: Springfield, Joplin, Branson, Bolivar and Lebanon. This weekend, the next 4 weeks and the big events worth a drive.` | Self |
| City hub | `/events/<city>/` | `/events/branson/` | events in `<city>` mo | `<city>` mo events calendar; `<city>` mo events; upcoming events in `<city>` | `Events in <City>, MO: Calendar and What's On \| 417 Local` | `Events in <City>, MO` | `Upcoming events in <City>, MO, plus the big events nearby worth the drive over the next 4 weeks. Weekly refresh. Confirm details with the organizer.` | Self |
| This-weekend page | `/things-to-do-in-<city>-mo-this-weekend/` | `/things-to-do-in-joplin-mo-this-weekend/` | things to do in `<city>` mo this weekend | what to do this weekend in `<city>` mo; `<city>` mo events this weekend; free; for adults; for kids; tonight; on sunday | `Things to Do in <City>, MO This Weekend \| 417 Local` | `Things to Do in <City>, MO This Weekend` | `Things to do in <City>, MO this weekend (<Fri Nov 13 to Sun Nov 15>): <top 2 events>, free picks and big events nearby. Refreshed weekly.` | Self. The date range lives in the description and an H2 only, never the title, H1 or URL |
| One-off event page | `/events/<city>/<event-slug>-<yyyy-mm-dd>/` | `/events/lebanon/14th-annual-lebanon-turkey-trot-2026-11-26/` | `<event name>` `<city>` | `<event name>` date, tickets, venue | `<Event> in <City>, MO · <Mon d>, <yyyy> \| 417 Local` (existing `eventPageTitle`, already length-fitted) | `<Event name>` | First 155 chars of the write-up, or `<Event> in <City>, MO on <date>. Confirm details with the organizer.` (existing) | Self. Repeat performances of one show at one venue canonical to the run's first page |
| Category page (existing) | `/events/<city>/<category>/` | `/events/springfield/family/` | `<category>` events in `<city>` mo | kids / family / live music variants | existing `generalCategoryPage` | existing | existing | Self |
| Day page (existing) | `/events/<city>/<yyyy-mm-dd>/` | `/events/springfield/2026-11-13/` | events in `<city>` on `<weekday, month day>` | none | existing `dayPageTitle` | existing | existing | Self. Never links with "this weekend" anchor text |
| Legacy weekend URL | `/events/<city>/this-weekend/` (and no-slash) | `/events/joplin/this-weekend/` | none | none | none | none | none | 301 to the flat URL. Never a 200 |

Each event page shows one prominent link to the official source (`registration_url` first, then `source_urls[0]`, then `organizer.website`). The existing `eventAction()` handles the button. The rebuild must make sure an event with none of the three is not published as a one-off (see QA item 14).

## 5. Redirects needed

Add to `movedEventPages` in `src/data/redirects.ts`, both slash forms (the helper `bothSlashForms` already does it), then run `npm run redirects`.

| Source | Destination | Status | Notes |
|---|---|---|---|
| `/events/springfield/this-weekend/` | `/things-to-do-in-springfield-mo-this-weekend/` | 301 | Already live |
| `/events/this-weekend/` | `/things-to-do-in-springfield-mo-this-weekend/` | 301 | Already live. Alternative: send to `/events/`. Keep Springfield, it matches the old behavior |
| `/events/joplin/this-weekend/` | `/things-to-do-in-joplin-mo-this-weekend/` | 301 | New. Currently a live 200 page |
| `/events/branson/this-weekend/` | `/things-to-do-in-branson-mo-this-weekend/` | 301 | New |
| `/events/bolivar/this-weekend/` | `/things-to-do-in-bolivar-mo-this-weekend/` | 301 | New |
| `/events/lebanon/this-weekend/` | `/things-to-do-in-lebanon-mo-this-weekend/` | 301 | New |
| `/events/republic/this-weekend/` | `/events/republic/` | 301 | Dropped weekend page. Same for `lake-ozark`, `nixa`, `ozark`, `ridgedale`, `rogersville` (5 more rows, 6 in total) |

Also:

- Delete the 'Springfield only' filter in `[city]/this-weekend.astro`, or delete the file. If the file stays, it must emit nothing (redirect-only). Prefer deleting it so the redirect map is the only owner of those URLs.
- Replace the `cityWeekendPath()` ternary with `/things-to-do-in-${slug}-mo-this-weekend/`.
- Move the flat page into a dynamic route (for example `src/pages/[slug].astro` already exists, so add the 5 weekend slugs there or add `things-to-do-in-[city]-mo-this-weekend.astro`). Check for a route clash with the existing `[slug].astro`.
- Do not 301 old event pages. Slugs do not change in this rebuild.
- Open question for Josh (section 8): where the other 6 cities' events show up.

## 6. Internal linking rules

| From | To | Rule |
|---|---|---|
| `/events/` | 5 city hubs | Hero, then 5 hub cards in fixed order: Springfield, Joplin, Branson, Bolivar, Lebanon |
| `/events/` | 5 weekend pages | A "This weekend" link on each hub card. This is the strongest internal link to the weekend pages |
| `/events/` | next-4-weeks block | Top 4 to 6 region-wide one-offs, each linking to its own event URL |
| City hub | its weekend page | Prominent link above the listings. Anchor text: "Things to do in `<City>`, MO this weekend" |
| City hub | `/events/` | Breadcrumb: Home, Events, `<City>` |
| City hub | other hubs | Footer row of the other 4 cities. Plain city names |
| City hub, "Don't miss: the next 4 weeks" | event pages | 4 to 6 significant one-offs: local ones first, then big ones from the other 4 cities (about 2 hours' drive). Each item links to the event's own URL, shows a short card (title, date, venue, city) and a "in `<City>`" label. No copied description |
| Weekend page | its hub | Link to `/events/<city>/` ("Full `<City>` events calendar") |
| Weekend page | event pages | Every listed event links to its event URL |
| Weekend page, "Worth the drive" | other cities' event pages | 2 to 4 big one-offs from the other cities. Link to the event page, not to the other city's weekend page |
| Weekend page | other weekend pages | One line near the bottom: "This weekend in Joplin, Branson, Bolivar, Lebanon". Short, same order everywhere |
| Event page | its city hub | Breadcrumb: Home, Events, `<City>`, event |
| Event page | its city weekend page | Only when the event falls on the upcoming weekend. Anchor text: "More things to do in `<City>` this weekend" |
| Event page | official source | One primary button to the official page, `rel="noopener"`. Always present on a published one-off |
| Event page | category and day pages | Existing "more in category" and "nearby" blocks stay |
| Any page showing another city's event | that event's URL | Link to `/events/<its-city>/<slug>/`. Do not render the event on this page as a new page, do not copy its description, do not add a second canonical |
| Blog evergreen guide (for example best things to do in Springfield) | weekend page | One contextual link: "see what's on this weekend" |
| Header or footer nav | `/events/` | Keep. Do not link 5 weekend pages from the global nav, they are linked from hubs |

Anchor-text rule: use the target page's own primary keyword for links to hubs and weekend pages. Vary only the modifier (free, kids). Never use "click here" or a bare date.

## 7. Cannibalization

| Risk | Pages involved | Rule that prevents it |
|---|---|---|
| Weekend page vs hub for "events in `<city>` mo this weekend" (the top completion for that seed) | `/things-to-do-in-<city>-mo-this-weekend/` vs `/events/<city>/` | The weekend page owns anything with "this weekend", "tonight", "sunday". The hub owns "events in `<city>`", "calendar", "upcoming". The hub does not use "this weekend" in its title, H1 or H2 (the link text is fine) |
| Weekend page vs evergreen blog guide for "things to do in `<city>` mo" | weekend page vs `/best-things-to-do-in-springfield-mo/` | The weekend page never optimizes for the bare head term. No "best of" language on weekend pages |
| Weekend page vs day pages | `/events/<city>/2026-11-14/` vs weekend page | Day pages never use "this weekend" in title, H1 or links. A day page may link up to the weekend page |
| Weekend page vs category pages | `/events/springfield/family/` vs "with kids this weekend" | Weekend page covers kids and free as H2s on the same page. No separate "kids this weekend" URL |
| Weekly rewrite vs history | one URL rewritten weekly | One stable URL. No dated or numbered weekend URLs, no archive pages for past weekends. Past events keep their own event pages |
| Today, tonight, next weekend variants | would tempt extra pages | No extra pages. Handle with sections on the weekend page ("Tonight", "Next weekend") |
| Nearby-city big events on another city's pages | event page vs hub and weekend cards | Cards link to the event's one URL. The event page is the only page with the full text |
| Event page vs official source | our page vs organizer's page | Our page adds local context (venue, parking, what else is on). Do not paste the organizer's description verbatim. Link to the source |
| Repeat performances of one show | 3 pages with the same title and venue | Canonical to the run's first page (existing). Listings still show each date |
| Region vs hubs | `/events/` vs `/events/<city>/` | `/events/` targets "southwest missouri events" only. It never targets a single city's keyword |
| Duplicate template copy | the 5 weekend pages share one intro | Per-city intro text. If intros stay near-identical, Google may fold the pages together. Fix before launch (section 2, item 4) |
| Thin pages | Bolivar, Lebanon on a quiet weekend | Minimum 3 listed items. Fill with "next 4 weeks" and nearby items. Keep indexable. Never flip noindex week to week |

## 8. Open questions for Josh

1. **The other 6 cities** (Republic, Lake Ozark, Nixa, Ozark, Ridgedale, Rogersville) have hubs and events today. Default in this plan: keep their hubs, drop their weekend pages, show their big events on the nearest of the 5 cities. Alternative: fold them into the 5 and 301 the hubs. This is a content decision, not a code one.
2. **Refresh schedule.** Copy currently says "updated daily". Weekly refresh needs a day and time. Suggested: Thursday evening Central, so the page is fresh before Friday. A single day is also the only honest claim in the copy.
3. **Bolivar** has the thinnest search demand signal of the five. Build it anyway (Josh's call), and review it first in Search Console. **[GSC pending]**
4. **"Next 4 weeks" selection rule:** "significant" needs a definition so it is not hand-picked every week. Suggested: `annual: true`, or attendance or ticketed flag, or a curated `featured` field. The data has `annual`. There is no size field.

## 9. URL-pattern QA checklist

Run `url-qa.sh <base>` for items 1 to 8 and 11. The rest are code or manual checks.

- [ ] 1. Every indexable URL has a trailing slash and no uppercase. (Script: hygiene check.)
- [ ] 2. No dates in evergreen URLs: hubs, `/events/`, weekend pages. Only event pages and day pages may carry dates.
- [ ] 3. Each of the 5 flat weekend URLs returns 200 with a self-referencing canonical.
- [ ] 4. Each legacy `/events/<city>/this-weekend/` (both slash forms) ends on its flat URL via 301. No-slash may take 308 then 301. Flag any chain longer than 2 hops.
- [ ] 5. No redirected URL appears in the sitemap. (Today the 10 nested `this-weekend` URLs are in it.)
- [ ] 6. Every indexable page appears in the sitemap exactly once. The 5 flat weekend URLs are in it. The 6 dropped weekend URLs are not.
- [ ] 7. Title is present on every page and 60 characters or fewer (the script warns above 65). Titles are unique across the site.
- [ ] 8. Canonical host is `https://417local.com` (not the preview host) and matches the page's own path, except repeat performances (to the run's first page).
- [ ] 9. Every old URL returns 200 or one 301 to a 200. Crawl the pre-rebuild sitemap (664 URLs on preview today) and confirm no 404 and no 301 chain.
- [ ] 10. `redirects.ts` and `vercel.json` agree (`npm run redirects`, plus the existing test). No hand edits to `vercel.json`.
- [ ] 11. `/events/` links all 5 hubs and all 5 weekend pages. Each hub links its weekend page. Each weekend page links its hub.
- [ ] 12. No page links to a redirected URL (grep built HTML for `/this-weekend/` under `/events/`).
- [ ] 13. Reserved slugs: no event slug equals a city, category, `this-weekend`, `weekend`, `weekly`, `monthly`, `calendar`, or a bare date (existing `assertNoReservedEventSlug`).
- [ ] 14. Every published one-off has an official source link. Build fails if `registration_url`, `source_urls` and `organizer.website` are all empty.
- [ ] 15. Weekend pages carry the weekly refresh date in visible text and in `lastmod`. The title and H1 stay static.
- [ ] 16. "Lebanon, MO" and "Bolivar, MO" appear in title, H1 and first paragraph (name ambiguity).
- [ ] 17. Event slugs have no date repeated inside the slug (for example `...-november-13-...-2026-11-13`).
- [ ] 18. A nearby-city card on another city's page links to the event's own URL and has no copied description.

## 10. QA results against the current preview

Run: `./url-qa.sh https://417-local-website.vercel.app`, Fri Nov 13, 2026 (23:33 UTC, about 5:33 PM Central). Full output: `qa-results-preview.txt`.

Result: 28 URL checks, **12 FAIL, all expected gaps in the target structure**. Nothing that works today broke.

| Area | Result |
|---|---|
| `/events/` | PASS: 200, self canonical, in sitemap. Title is "Events in the 417: Springfield and Nearby Cities" (differs from the target) |
| 5 city hubs | PASS x5: 200, self canonical, in sitemap. Titles are "`<City>`, MO Events Calendar" (target pattern differs) |
| Springfield flat weekend URL | PASS: 200, self canonical, in sitemap |
| Joplin, Branson, Bolivar, Lebanon flat weekend URLs | **FAIL x4: 404.** These pages do not exist yet. This is the main build work |
| `/events/springfield/this-weekend/` and `/events/this-weekend/` | PASS: 301 to the flat Springfield URL |
| `/events/springfield/this-weekend` (no slash) | PASS with warning: 308 then 301, 2 hops |
| `/events/<joplin, branson, bolivar, lebanon>/this-weekend/` | **FAIL x8 (4 slash, 4 no-slash):** live 200 pages with their own canonical, not redirects. The slash forms are also in the sitemap |
| One-off event pages (first dated event per city) | PASS x5: 200, self canonical, in sitemap |
| Day page `/events/springfield/2026-11-13/` | PASS (informational) |

Other live observations:

- The sitemap has 664 URLs, all on `https://417local.com`.
- The Midwest SPL Finals pages (3 dates) all canonical to the Nov 13 page. That is the intended run behavior.
- Josh's weekend-page title already matches the autocomplete phrasing for all cities ("Things to Do in Joplin, MO This Weekend | 417 Local").
- Hubs show "Don't miss this month", not "the next 4 weeks".

Files in this folder: `url-keyword-plan.md`, `url-qa.sh`, `qa-results-preview.txt`, `autocomplete.txt`, `autocomplete-condensed.md`, `autocomplete.sh`, `ac-condense.py`, `sitemap-preview.xml`.

## 9. Search Console findings (Jul 11, 2025 – Nov 10, 2026; added Nov 13)

- Site total: 3,189 clicks / 493,217 impressions across 770 pages.
- "This weekend" queries: 288 queries, about 2,840 impressions combined, almost all at position 18–60. Top: "springfield mo things to do this weekend" (308 impr, pos 43.7), "events in springfield mo this weekend" (234, pos 18.2), "417 events this weekend" (190, pos 9.3), "things to do in springfield mo this weekend" (110, pos 23.8). Real demand, currently barely ranking: a strong target for the weekend pages.
- The much bigger prize is the head term: "things to do in springfield mo" (14,028 impr, pos 8, 23 clicks), "things to do in springfield" (4,361, pos 27), "things to do in springfield missouri" (3,000, pos 9.3), "fun things to do in springfield mo" (2,725, pos 10). Those land on /best-things-to-do-in-springfield-mo/ (53,206 impr, 109 clicks). Its title/snippet and a link to the weekend page are the cheapest win on the site.
- "fall festivals near me" (3,609 impr, pos 5.4, 111 clicks) and "fall festivals near me this weekend" (258, pos 8.8): seasonal weekend intent; the weekend pages should surface festivals first in fall.
- /events/ itself: 178 clicks / 15,049 impressions at position 19.8.
- Top pages overall are evergreen guides, not events: best-kids-activities (616 clicks / 87.9k impr), best-date-night-ideas (468 / 37k), best-fall-festivals (385 / 23.4k), busiek-state-forest (212 / 29k). Refreshing these beats refreshing small annual posts.
