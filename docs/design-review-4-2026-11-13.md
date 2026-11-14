# Design review 4: Branson, Joplin, Lebanon, Bolivar (production https://417-local-website.vercel.app, checked Sat Nov 14 2026)
Screenshots: design4/<hub|wk>_<city>-<mobile|desk>-<full|top>.png (16 pages x 2 viewports). Script: s4run.js, ev5.js; raw text/links: design4/out.json.

## Mechanics (all cities)
- 204 unique internal links curled: all 200. No horizontal scroll at 390 or 1280 (scrollWidth = clientWidth on all 16 pages). Zero tap targets under 44px.
- Every hub has the weekend link as a white pill button in the hero, directly under the intro. Every hub has "Don't miss: the next 4 weeks" above "Coming up in <city>". No past events seen (earliest Nov 13 items are runs that started Friday and still run).
- Weekend pages: city-specific intros, no Springfield wording; "Worth the drive this weekend" has city + drive time on every row (Branson 5, Joplin 3, Lebanon 5, Bolivar 4).

## Verdicts
- Branson: PASS WITH FIXES. Hub fine. Weekend page is thin (Fri 1, Sat 0, Sun 1) and Worth the drive carries it. Local data is one-source (Big Cedar Lodge / Worman House / Grandview) with no theater/show listings.
- Joplin: PASS WITH FIXES. Richest local data. Weekend page 3 local rows plus a recurring food box and a game night. Don't miss is a dump of 10 local items, not curated.
- Lebanon: PASS. Best weekend page (6 rows, both days). Don't miss lists mostly small items (Christmas Cards, Holiday Meal Pickup) but all are dated one-offs.
- Bolivar: PASS WITH FIXES. 4 Saturday events, Fri and Sun empty; Don't miss contains recurring or camp items.

## Findings, ranked
1. Source quality (spot-check 3 event pages per city, "Event details/Register" link):
   - Branson: all official (bigcedar.com/activity/...). Official but all one organizer.
   - Lebanon: 2 official (visitlebanonmo.org library events), 1 listing (allevents.in Holiday Bulb Workshop).
   - Joplin: 3 of 3 listing (happeningnext.com), including Christmas Carol at Connect2Culture, whose organizer site exists.
   - Bolivar: 3 of 3 listing (happeningnext.com).
   Joplin and Bolivar have no official or organizer link on any sampled page. Consider "Source: HappeningNext" labeling or preferring organizer URLs. (hub_joplin-desk-full.png, hub_bolivar-desk-full.png)
2. Branson Don't miss repeats multi-day runs as separate rows: Holiday Family Bingo (Nov 17 and 24), Treats and Trivia (Nov 24 and Dec 1), Character Brunch (Nov 22 and 28) and Stars Above the Ozarks (in Coming up, Nov 13 and Dec 4). Each pair links to the same page. These read as series, which the brief said to exclude. Show once with "Runs Nov 17-24". (hub_branson-desk-full.png)
3. Don't miss is not curated on Joplin (10 rows, Nerd Poker, Mommy and Me, Santa Photos), Lebanon (10), Bolivar (10, includes Fall Break Camp, Wild Turkey Wednesday, Doormat painting, Church Decorating Night). It duplicates the first rows of Coming up instead of highlighting. Cap at 5 and favor festivals, markets, concerts.
4. Branson weekend page: "Nothing listed for Saturday yet." on Saturday itself, and the hub says "Sat 14 · 0 events". The Worth the drive list fills the gap, but the page promises Branson things to do and has two items (wk_branson-desk-full.png).
5. Weekend intros are generic and echo the H1 ("Things to do in Branson, MO this weekend run from theater shows to the strip..."). "theater shows to the strip" promises content the list does not have. Lebanon and Bolivar read better. (wk_branson-mobile-top.png)
6. Mobile hub hero: weekend pill wraps to 2 lines ("Things to do in Branson, MO this weekend") at full width, then a small "Calendar" pill; clunky but usable. Shorten the label to "This weekend in Branson" (hub_branson-mobile-top.png). Category chip row is a sideways scroller, clipped at the right edge.
7. Past-day wording: Joplin and Lebanon weekend pages say "Nothing listed for Friday yet." on Saturday (carried from review 3, S4).
8. Category and time oddities on Branson: Character Brunch tagged "Networking", Treats and Trivia "Professional Development", Thanksgiving Buffet "Live Music"; times 8:00 AM brunch / 8:00 PM bingo / 9:00 AM trivia look suspect. Joplin hub tags Nerd Poker, Mommy and Me, Santa Photos as "Festivals/Community". Bolivar tags nearly everything "Community Events, Family Events".
9. Joplin location strings still carry a ZIP in one row ("610 W F Street, 64801" on the event page) and the maps query contains "United States, Joplin, MO, Joplin, MO". Visible text mostly clean on the lists.
10. Other-city labeling works: "in Joplin · about 1 hr 45 min" on the Branson hub and Bolivar hub. Branson's Christmas on the Ridge row links to the Joplin event page (correct).

## Data gaps
- Branson: Saturday Nov 14 has 0 local events; only 13 events in 4 weeks, almost all Big Cedar Lodge, Worman House or Grandview Conference Center. No Branson Landing, theaters, Silver Dollar City or Titanic listings.
- Bolivar: Friday and Sunday empty this weekend. Hub Fri 13 = 0 events; 14 events in 4 weeks.
- Joplin: Friday empty; Sunday has only a game night; Saturday's local list includes a recurring food box distribution.
- Lebanon: Friday empty; ok otherwise.
- Cross-city: Worth the drive uses the same 5 Nov 14 events on every page (Christmas on the Ridge, Fall Festival, Battle of the Rims, Holiday Market, Symphony), and none is Sunday. No other-city Friday or Sunday picks.
- Source monoculture: Joplin and Bolivar 100 percent HappeningNext in the sample; Branson 100 percent bigcedar.com.
