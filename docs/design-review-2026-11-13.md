# 417 Local events pages: design review (Nov 13, 2026)

Reviewed https://417-local-website.vercel.app, read-only. Screenshots at 390px (iPhone 14 preset, 3x) and 1280px in /tmp/claude-0/-home-user/8bafa722-2c0d-593e-9265-5e84dd5a1cfb/scratchpad/l417/design (full-page PNGs named <page>-m.png / <page>-d.png; cropped <page>-<m|d>-top.png). Raw numbers: scratchpad/l417/metrics.json.

Pages: /events/, /events/springfield/, weekend (/events/springfield/this-weekend/ 301s to /things-to-do-in-springfield-mo-this-weekend/), /events/joplin/, /events/bolivar/, event /events/springfield/garden-story-time-2026-11-19/, /events/springfield/family/, /events/springfield/calendar/, series /events/springfield/weekly/c-street-saturday-market/, /events/springfield/weekly/, day /events/springfield/2026-11-14/.

## What passed
- No horizontal page scroll at 390px on any page (scrollWidth = 390). Chip and date-strip rows scroll sideways inside their own container, as specced.
- No "417 Local" text, no photos, no star ratings inside any card or list row (the only "star" hits were "Star Trek" and "starting"). Cards are typographic.
- No "this website / this page / this site" wording in page bodies.
- One H1 per page. Day headings in lists are 16px (small, as asked).
- All 259 internal links found on these pages return 200. Event .ics (200, text/calendar) and the og share PNG on the preview domain (200) work.
- Event page order: header card, description, address, buttons, chips, more events. The buttons come after the description.
- Header and footer are identical on every page.

## BLOCKERS (0)
None. Nothing is broken enough to stop a launch. B1 below is the closest.

## SHOULD-FIX (8)

### S1. Series pages say "Every weekly 09:00–14:00" (wrong copy, 24-hour time)
- Pages: series page and /weekly/ index; 390 and 1280. Shown in the hero line, the meta description ("Every weekly 09:00–14:00, March–October") and every weekly list row.
- Spec (event-calendar, section 7): "when ("Every Saturday, 9 AM–1 PM, March–October")".
- Cause: the recurring JSON rule is an object (`freq: weekly, byday: [SA], start_time: 09:00, end_time: 14:00`). `formatRule` builds "Every " + freq and ignores the `byday` array. It also leaves the times as 24-hour strings.
- Screenshots: weekly-m.png, weekly-m-top.png, weeklyindex-m.png, weeklyindex-d.png
- Source: src/lib/recurring.ts (`formatRule`, `recurringWhen`)
- Fix: map SA to Saturday (and so on), format times as "9 AM–2 PM", and say "Every Saturday". Add a unit test on the JSON shape the engine really writes.

### S2. Weekly happenings list runs the title into the description
- Page: /events/springfield/weekly/, 390 and 1280. It reads "C-Street City MarketEvery weekly 09:00–14:00 ..." with no gap or separator.
- Spec: compact list, grouped by weekday.
- Screenshot: weeklyindex-m.png
- Source: src/components/WeeklyList.astro. The `event-place` span has a leading space inside a block that collapses it, and the anchor has no separator. Use " · " or put the detail on its own line.

### S3. The city hub order and sections do not match the spec
- Page: /events/springfield/ (also Joplin and Bolivar), 390 and 1280.
- Spec (event-calendar, section 3), top to bottom: "3. Coming up: unique one-off events for the next 28 days... 4. Don't miss this month ... 5. Upcoming: all one-off events for the next 14 days ... then 'See the full calendar'. 6. Weekly happenings ... with 'See all weekly happenings'".
- Actual: "Don't miss this month" comes first, then "Coming up in Springfield", then a single list. There is no separate 14-day "Upcoming" block. The standout events are listed twice, in Don't miss and again in Coming up, one scroll apart (springfield-d-top.png, first 1,500px). The weekly link says "Weekly classes and regulars" instead of "See all weekly happenings".
- Also the "Free" and "Kids" filter toggles sit above Don't miss and look the same as the category chips, so they read as two category rows (springfield-m-b.png).
- Screenshots: springfield-d-top.png, springfield-m-b.png
- Source: src/pages/events/[city]/index.astro (lines 60–85), src/lib/calendarView.ts, src/components/EventFilters.astro
- Fix: reorder to the spec, drop standouts from Coming up (or confirm with Josh that duplication is intended), and restyle the filters as a quiet toggle with a "Show only:" label.

### S4. No visible breadcrumb on any events page
- Pages: every page reviewed, 390 and 1280. A BreadcrumbList JSON-LD exists, but no breadcrumb is on screen.
- Spec (all-events): "Breadcrumbs and BreadcrumbList JSON-LD: Home → Events → page". Spec (calendar): chips on "event pages (under the breadcrumb)". Today the event page puts the chips below the action buttons, not under a breadcrumb.
- Screenshot: detail-d-top.png
- Source: src/layouts/EventsLayout.astro (the JSON-LD is built at about line 33; no markup). Event page: src/pages/events/[city]/[event].astro.

### S5. Event page address line repeats the city and state, and "Get directions" shows twice
- Page: /events/springfield/garden-story-time-2026-11-19/, 390 and 1280. It reads "Springfield Botanical Gardens, 2400 S Scenic Avenue, Springfield, MO, Springfield, MO Get directions", and the button row then has a second "Get directions".
- Spec: "An address line with a 'Get directions' link". The action table gives "Get directions" as one small second link.
- Cause: the export address already ends in "Springfield, MO". `addressLine` appends the city and state again.
- Screenshots: detail-m-top.png, detail-d-top.png
- Source: src/pages/events/[city]/[event].astro (lines 146–154, 247–250). Drop city and state when the address already contains them. Keep one directions link (the button), or the line, not both.

### S6. Tap targets under 44px on every list and the calendar
- Pages: every list page at 390. Title links in event rows are 22px high (about 190x22). Calendar day links are 25px high and the cell titles 22px. "← All Springfield events" and the weekly "Get directions" are 22px. Footer links are 38px high. Date-strip pills and chips measure fine. Counts at 390: hub 47 in main, calendar 72.
- Spec: no tap-target rule in the docs; the brief for this review asks for at least 44px.
- Screenshots: springfield-m-b.png, calendar-m-b.png (mobile agenda rows are 3x-scale text lines with no padding)
- Source: src/styles/global.css (`.event-title`/row link styles near lines 360–380), src/components/MonthBoard.astro, src/components/Footer.astro. Make the whole row, not just the inline title, the link target, or add 11px block padding to link rows (the footer list items too).

### S7. The calendar page: weekly chip is not a chip, desktop text is tiny, duplicate rows
- Page: /events/springfield/calendar/, 390 and 1280.
- Spec (section 4): "a separate small chip, '+N weekly'". On both views it renders as bold text on the same line as "+3 more" ("+3 more +1 weekly"), with no pill, so it reads as one phrase (calendar-m-b.png, calendar-d-top.png).
- Desktop cell titles are about 11–12px and cut off with ellipses. The mobile agenda also truncates every title with an ellipsis even though there is room to wrap.
- The same event shows twice on one day (Cinema Sundays: Matilda on Nov 15; two files, slug "...-2026-11-15" and "...-2026-11-15-2"). "Acc Rec Ceramics" and "Acc Rec Bowling" fill almost every weekday cell: titles that repeat on many dates are left out of the hub's Coming up list per spec, but the grid still lists them, so they crowd out the special events ("The one-off events should stand out").
- Also: a large empty gap under the chips in the blue band, and the "December 2026 →" link floats alone on the right.
- Source: src/components/MonthBoard.astro, src/lib/calendarView.ts, src/lib/eventCalendar.ts, global.css. The duplicate event is data; the loader can dedupe on title + start + venue.

### S8. Inconsistent page headers across the events pages
- Pages: city hubs (Springfield, Joplin, Bolivar) get a dark photo hero with the "This weekend" and "Calendar" buttons. Everything else (/events/, categories, weekend, calendar, day, weekly, series, event page) gets a flat blue band, and the event page has no band at all. The hero heights and the position of the chips differ (chips sit on the band, under the hero, or below the buttons).
- Screenshots: springfield-m-top.png vs family-m-top.png vs montage1.png and montage2.png (side by side)
- Source: src/layouts/EventsLayout.astro, src/pages/events/[city]/index.astro. Choose one header treatment for the pages under /events/{city}/ and share it.

## NITS (9)
- N1. /events/ intro says "Springfield, Republic and Joplin are the cities we list today", but the page lists 11 cities (Bolivar, Branson, Lake Ozark, Lebanon, Nixa, Ozark, Ridgedale, Rogersville ...). Copy is verbatim from docs/events-pages-copy.json, so the copy file is stale. Page events-m.png. Source: src/pages/events/index.astro and the copy file.
- N2. The weekend page is now a flat URL, so the spec's /events/springfield/this-weekend/ is a 301 to /things-to-do-in-springfield-mo-this-weekend/. This is deliberate (src/data/redirects.ts line 62) but event-pages-2026-11-08.md still says the old address. Update the doc. The weekend page also has no "This weekend" chip highlighted and uses the blue band (weekend-m.png).
- N3. Event page, mobile: the date block sits in a row with the time ("NOV 19 Thu · 10:00 AM") above the text. The card spec says "On mobile (≤640px), stack the date block above the text." It is close, but it is not the block seen on desktop (detail-m-top.png). Source: the card header in src/pages/events/[city]/[event].astro.
- N4. Event write-up is a generated sentence ("is a kids and outdoors event at ..., and it is for all ages. It takes place on Thursday...") and the meta description ends in a mid-sentence "…". Wording is data-driven; the template could use the description only if it is not just the date and address.
- N5. Category tags on some rows look wrong: "Wonders of Wildlife Stream Cleanup" is tagged Networking and Arts and Theater. That is a classification problem in the export, not the site.
- N6. Date-tile month label is 10.9px and tag labels 12.8px (#4d5961 on white, passes AA at about 7:1). Fine on contrast, but the 10.9px month is small. Source: global.css `.date-tile-month`.
- N7. Day page: the previous and next day links wrap into two lines each at 390 ("← Friday, / November 13"), and sit at different heights (day-m.png). Use short labels ("← Fri, Nov 13").
- N8. Heading levels: the weekly day groups on the hub use an H2 ("Saturday") inside the "Weekly happenings" H2. Make the day an H3. Source: src/components/WeeklyList.astro.
- N9. The og:image for events points at https://417local.com/event-cards/..., which 404s until cutover (the preview domain serves it fine). Fine pre-launch; verify after the domain switch. On desktop the chip row clips its last chip at the container edge with no fade (springfield-d-top.png); the spec says the sideways scroll is for phones.

## Batches (independent file sets, can go to separate builders in parallel)

Batch A: series and weekly (S1, S2, N8)
- Files: src/lib/recurring.ts, src/components/WeeklyList.astro, src/components/SeriesPage.astro, plus a test in tests/ for the rule shape.
- No overlap with the other batches.

Batch B: event page (S4 event part, S5, N3, N4)
- Files: src/pages/events/[city]/[event].astro, src/lib/eventPage.ts, and the event-card header styles if they are scoped there.

Batch C: hub, calendar and lists (S3, S6 list and calendar part, S7)
- Files: src/pages/events/[city]/index.astro, src/lib/calendarView.ts, src/lib/eventCalendar.ts, src/components/{MonthBoard,DateStrip,EventFilters,EventList}.astro, src/lib/loadEvents.ts (dedupe).
- Note: S6 touches global.css; if two batches both need it, have batch C own the row and calendar rules and batch D own the footer and layout rules.

Batch D: layout and shell (S4 breadcrumb part, S8, S6 footer part, N1, N2, N7, N9)
- Files: src/layouts/EventsLayout.astro, src/components/{EventChips,Footer}.astro, src/pages/events/index.astro, docs/events-pages-copy.json, docs/event-pages-2026-11-08.md, day page (src/components/DayPage.astro).
- Do S4/S8 first inside D because the breadcrumb slot goes in the layout that batch B's event page uses; B should only pass props and not edit the layout.

Counts: 0 blocker, 8 should-fix, 9 nit.
