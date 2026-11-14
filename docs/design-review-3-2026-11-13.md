# Design review 3: SW Missouri events preview (commit 549c35c)
Preview: 417-local-website-git-feat-sw-missou-09d672 alias (deployment oayup1wvi, confirmed 549c35c and READY before shooting). Screenshots in design3/ (`<page>-<mobile|desk>-<full|top>.png`; pages events, spfd, wk_spfd, wk_joplin, wk_bolivar).

## Verdict: PASS WITH FIXES. 0 blockers, 4 should-fix, 4 nits.
Mechanics: 169 internal links all 200; no horizontal scroll at 390 or 1280; zero tap targets under 44px; no raw "United States / Missouri 6xxxx / stray ' , '" strings anywhere; no Joplin/Bolivar-specific Springfield copy in intros; Nutcracker/Friday items gone.

## Previous findings
- B1 hero: FIXED in substance. White cards on the blue band, Springfield is a lead card (bigger name, big "85", spans both rows on desktop), "THIS WEEKEND" eyebrow labels each pick, solid primary "<City> events" + outline "This weekend ->" secondary, full-width buttons, equal heights per row. Intro cut to one sentence, "confirm times" line moved below the hero. Mobile: Springfield full-width card then 2x2 of small cities; Springfield card, Branson/Joplin start above ~700px so the hero is the first thing seen. It reads as a designed entry point now (events-desk-top.png, events-mobile-top.png). Remaining polish below (S1, S2).
- S1 past events: FIXED. Friday items gone from hero, Don't miss, Worth the drive, day lists (wk_*).
- S2 series in Worth the drive: MOSTLY FIXED. Joplin/Bolivar/Springfield highlight lists now show one-offs only (Christmas on the Ridge, Fall Festival, Battle of the Rims, Symphony, Holiday Market). Cinema Sundays, Food Box, Bazaar not in highlights. Hub Don't miss: Mahj Mondays, Matinee, Job Fair, Cinema Sundays gone.
- S3 hub: city label "in Springfield" no longer on the Springfield hub (fixed). Don't miss still partly duplicates Upcoming (see S3 below).
- S4 raw addresses: FIXED (wk_joplin-desk-full.png, wk_bolivar-desk-full.png). Rows show "street, City" or venue; "in <city>" only on other-city rows.
- S5 doubled headings: FIXED. Range is now a small grey line "Fri Nov 13 to Sun Nov 15"; empty days collapsed to one line ("Nothing listed for Friday or Sunday yet").
- S6 chips: PARTLY. Chips now sit under the day lists, so the lists lead (fixed), but still 14-15 chips in 3 rows between lists and Worth the drive.
- N3 H2 orphan: not fixed ("Don't miss across Southwest / Missouri: the next 4 weeks" still 2 lines at 1280, balanced OK now). N1 Springfield footer on all city pages: unchanged (flag to Josh).

## Findings, ranked
S1. Desktop Springfield card has ~220px of dead white between "events in the next 4 weeks" and its buttons (events-desk-top.png). Buttons are pinned bottom as suggested, but the content is top-only so it looks stretched. Fill it (second/third top pick, the date chip, or a short "Also this weekend" list of 2 events) or drop the row-span and make the card a full-width banner above the 4 small cards.
S2. Mobile: titles in the four small cards are clamped to one line with ellipsis ("The Garden Chap...", "5TH ANNUAL...", "Beater with a..."), which reads broken (events-mobile-crop.png). Allow 2 lines, or go single column for them.
S3. Hub (spfd-desk-full.png): "Don't miss: the next 4 weeks" sits at the very bottom, after the entire 4-week Upcoming list (about 10,000px down), and repeats 5-8 of the same events. If it is meant as a highlight, move it above Upcoming; otherwise drop it on the Springfield hub.
S4. Past-day copy: "Nothing listed for Friday yet" on Saturday is odd wording for a day that already happened. Drop past days from that line (wk_joplin-desk-full.png, wk_bolivar-desk-full.png).
N1. Events page: the "Lists are updated weekly..." line now sits left-aligned in small grey below the hero while the intro is centered; fine, minor. (events-desk-full.png)
N2. Weekend H1 is printed twice in source order on mobile (breadcrumb last crumb repeats the H1 and wraps its arrow to a lonely second line, wk_bolivar-mobile-top.png). Shorten the last crumb to "This weekend".
N3. Joplin weekend page local list still has "November Saturday Food Box Distribution" and "Game night this Sunday at the Social BTB" (recurring-feeling, but local day lists, so acceptable).
N4. Springfield "THIS WEEKEND" eyebrow is ~11px; fine on contrast (blue on white) but small.
