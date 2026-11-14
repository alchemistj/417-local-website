# Design review 2: SW Missouri events preview
Preview: 417-local-website-git-feat-sw-missou-276586-josh-lenzs-projects.vercel.app. Screenshots in design2/ (same folder), names `<page>-<mobile|desk>-<full|top>.png`; pages: events, spfd, wk_spfd, wk_joplin, wk_bolivar.
Source files are inferred (I did not read code): events/index.astro, the this-weekend page/component, [city]/index hub, the new city-copy data file.

## Verdict: FAIL on the hero (1 blocker), otherwise pass with fixes. 1 blocker, 6 should-fix, 5 nits.
Mechanics are solid: 167 internal links all 200; redirects correct; no horizontal scroll at 390 or 1280; every tap target >=44px; white-on-blue contrast fine; no "this website/page", no star ratings, "updated weekly" everywhere (the only "Stars" hit is an event title); no Springfield wording in Joplin/Bolivar intros.
Redirects: /events/joplin/this-weekend/ 301 -> /things-to-do-in-joplin-mo-this-weekend/ ; /events/nixa/this-weekend/ 301 -> /events/nixa/ ; springfield and ozark also 301 correctly. No-slash form is 308 then 301 (known platform behavior).

## Blocker
B1. /events/ hero reads as a link list in outlined boxes, not a designed entry point. (desk 1280, mobile 390; spec s1 "Springfield large... 2x2 grid", "not a link row"; events-desk-top.png, events-desk-crop.png, events-mobile-top.png; events/index.astro hero + CSS)
- Desktop: Springfield is only ~40px wider (302 vs 262) than the others, same type size, same outline, same two pills. It is a tall column with ~300px of empty blue under its buttons, so it looks like a layout bug, not a feature card. Branson/Joplin top row is 285px tall, Lebanon/Bolivar row 255px (heights differ by row, 3-line vs 2-line titles).
- Hierarchy is flat: city name is the only emphasis; the count and top-event title are the same size/weight/color, and the top event has no label, so "NUTCRACKER! Magical Christmas Ballet" reads as a stray line. Nothing says it is this weekend's pick.
- Two identical white outline pills stacked and centered in a left-aligned card; primary vs secondary action is indistinguishable. Pills are not full width, so alignment is ragged across cards.
- Intro above is two centered paragraphs (4 lines) pushing the cards down: on iPhone 14 the first card starts ~500px down and Branson is entirely below the fold. 5 cards stack to ~1400px before any content.
- Cards sit tight to the intro text (no gap) and hug the container edge.
Suggestions:
1. Make Springfield a real feature card spanning both grid rows (grid-template: 1.4fr 1fr 1fr; Springfield `grid-row: span 2`), bigger name (2.5rem), count as a big number ("86" at ~3rem with "events in the next 4 weeks" beneath), solid white/light card on the blue band with dark text, so it is visibly the lead. Anchor its buttons to the bottom (flex column, margin-top:auto) so no dead space.
2. Other four: white cards, equal fixed structure (name / count line / "This weekend: <title>" clamped to 2 lines with min-height / buttons pinned bottom) so heights match across both rows. `align-items: stretch`.
3. Label the pick: small uppercase eyebrow "TOP THIS WEEKEND" above the title (or a calendar-chip icon).
4. Actions: make the whole card the hub link (stretched ::after), "<City> events" as primary solid button, "This weekend" as secondary outline/text link with arrow; both full width on phone (48px tall).
5. Phone: shorten to one intro sentence and drop the "confirm times" paragraph under the cards (or move it to the footer of the section); use compact cards (count and city on one row: "Springfield  86 events") so 2 cards show above the fold. Consider a 2-col phone grid for the four small cities only if the titles clamp cleanly; otherwise stacked is fine.
6. Optional visual weight: a per-city accent color bar or the city's date-chip color from the event rows, or a small city icon; no new fonts per spec.

## Should-fix
S1. Past-day events shown as live. Today is Sat Nov 14; Fri Nov 13 items still render: "Worth the drive" lists NUTCRACKER (Fri 7pm) on all 3 weekend pages and the hub's "Don't miss" starts with it; the hero card for Springfield features it as "this weekend's top event". Spec window is Fri-Sun so Friday is in-window, but a done event as the lead pick is bad. Hide events already past (or at least do not choose past ones for the hero/top pick). wk_*, events, spfd.
S2. Cross-city "Worth the drive" does not apply the one-off rule cleanly: "Cinema Sundays: Matilda" (weekly series, Joplin page), "Holiday Shopping Bazaar", "November Saturday Food Box Distribution" (looks like a recurring community distribution, Joplin/Bolivar/Springfield pages), "Game night this Sunday at the Social BTB" (Springfield page), "Midwest Battle of the Rims" (3-date run). Spec s4 excludes series/class-like. Tighten isSignificantOneOff / series detection. wk_joplin-desk-full.png, wk_spfd-desk-full.png.
S3. Hub "Don't miss: the next 4 weeks" (spfd-desk-full.png) has no other-city rows (ten local rows fill the cap, fine per spec) but the local rows include non-significant items: "Mahj Mondays at the Gillioz", "Movie Matinee: Blue Hawaii", "Springfield Job Fair", "Cinema Sundays". Same rule fix as S2. Also the list repeats right below as "Upcoming" with the same events (duplicates the first screenful of that list). City labels read "Springfield · in Springfield" on a Springfield hub; show "in <city>" only on other-city rows (spec s3 "label each").
S4. Raw address strings leak into rows: "5594 W Junge Blvd. , Joplin, MO, United States, Missouri 64804", "4450 Scenic Ave, Bolivar, MO, United States, Missouri 65613", stray " , " and a duplicated "in Joplin". Appears on /events/, all weekend pages. Use venue name or "street, city" only; collapse when the city is the page's city. wk_joplin/wk_bolivar/events full shots; the shared event-row component.
S5. Doubled headings on weekend pages: "Friday, November 13 to Sunday, November 15" (H2) sits directly over "Friday, November 13" (H2), reading as a duplicate. Make the range a small eyebrow/H2 and days H3 or drop the range. Also two lone "Nothing listed for ..." lines (Bolivar Fri and Sun, Joplin Fri) feel thin; collapse empty days into one line ("Nothing listed for Friday or Sunday yet") or suggest the hub. wk_bolivar-desk-full.png.
S6. Category chip block (13-14 chips, 3 rows) dominates the weekend page header and pushes the day lists below the first screen on mobile; the weekend page should lead with Fri/Sat/Sun. Collapse chips under the list or into one scrollable row. Verify they link to city category pages (links all 200). wk_*-mobile-top.png.

## Nits
N1. Footer on every page says "Explore Springfield" and shows the Springfield address even on Joplin/Bolivar pages (site-wide, probably out of scope; flag to Josh).
N2. Hero intro: "4 weeks." orphans on desktop; "Lists are updated weekly" is fine copy but both paragraphs are centered body text at large size.
N3. "Don't miss across Southwest Missouri: the next 4 weeks" wraps to a 2-line H2 at 1280 with a one-word orphan ("weeks"); add text-wrap: balance.
N4. Weekend page "Full <City> events calendar" and "Southwest Missouri events" are two bare text links with big gaps; fine for spec but weak. Could be one row of buttons with the city pills.
N5. "Time TBA" appears on most rows; consider hiding it rather than repeating.

## Spec checklist
- Hero order Springfield, Branson, Joplin, Lebanon, Bolivar: yes. Count lines present (86/27/37/42/14): yes. Two links per card: yes. 44px taps: yes. Desktop large + 2x2: layout present but not visually "large" (B1).
- Under hero: Don't miss across SW Missouri with city on each row, then "More towns" chips (Republic, Lake Ozark, Nixa, Ozark, Ridgedale, Rogersville, Business events): yes. Intro no longer lists three cities: yes.
- Weekend pages: city intro, Fri/Sat/Sun, Worth the drive with city + drive time (Joplin to Lebanon about 2 hr; Bolivar to Springfield about 35 min, plausible), links to hub and /events/ plus other-city pills: yes. Max 6 respected.
- Hub: weekend link near top (white pill "Things to do in Springfield, MO this weekend" in hero, good), "Don't miss: the next 4 weeks": yes.
