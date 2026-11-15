# QA of 12 refresh drafts (417 Local annual-event posts)

Checked Sun Nov 15, 2026 (UTC). Method: originals fetched with curl from 417local.com and diffed sentence by sentence against each draft (links, bold and CHECK markers stripped). Every bolded factual change was checked against the cited official page with curl. Every link in the drafts was fetched. Plain curl only. Raw files are in `l417/orig/` and `l417/src/`.

## Overall

- **ffaw.org: no link to it in any draft or any original.** No spam-domain risk.
- **The drafts do not break the "keep the writer's words" rule much.** Changes are mostly dates, years and links. Exceptions are listed per draft.
- **The main problem is placeholders.** Seven drafts replace real dates with the literal text `[Date to be confirmed: the organizer hasn't posted 2027 dates yet]`. That text would go live in the body. Six of them have no usable 2027 content, so they are not ready until organizers post dates (around Jan to Mar 2027 for spring events).
- **"Sources" claims that did not hold up:**
  - Seymour Apple Festival *has* posted 2027 dates; the fall draft says none have.
  - Shamrocks and Shenanigans *has* a 2027 listing at the post's own RunSignup link; the St Patrick's draft says none was found.
  - Pizza Night: millsapfarms.com/pizza-club gives a standing season (Thursdays, May to October); the draft says none was found.
  - Draft says somo.org "returns 200"; plain curl gets 403 (see Polar Plunge).
  - Draft says finleyfarmsmo.com returns 403; it returned 200 for me.
- **I could not reach:** secure.somo.org, somo.org (403 to curl), millsapfarm.csasignup.com, kaptains.org over http, littlebeausbackyard.com, sacriverstables.com, ozarkdance.com, Facebook pages (login wall). I did not try to get around the 403 or the login walls.

## Verdicts

| Draft | Verdict |
|---|---|
| turkey-trot-springfield-mo | **Not ready** |
| wingapalooza-springfield-mo | **Ready after small fixes** |
| somo-polar-plunge | **Not ready** |
| mom-prom-in-buffalo-mo | **Not ready (retire or retitle as a 2021 post)** |
| pizza-nights-at-millsap-farm | **Ready after small fixes** |
| things-to-do-valentines-day | **Not ready** |
| st-patricks-day-springfield-mo | **Not ready** |
| easter-activities-417-land | **Not ready** |
| james-river-float-series-springfield-mo | **Not ready** |
| berry-farms-sw-mo | **Ready after small fixes** |
| best-fall-festivals-in-springfield-mo | **Not ready** |
| best-summer-camps-springfield-mo | **Not ready** |

---

## 1. turkey-trot-springfield-mo: NOT READY

**Writer's words.** Beyond dated details:
- "Running Together- Virtually" became "Running Together- **In Person**".
- "Springfield is rockin out the Trot virtually this year." became "in person this year: Thursday, Nov. 26, 2026, at 8 a.m. in downtown Springfield".
- The update sentence is long, and it announces that the rest of the post is "flagged for rewriting". That is editor-facing, not reader-facing.

**Fact checks** (parkboard.org/TurkeyTrot, 200):
- 32nd edition: verified. "The 32nd Annual Thanksgiving Day Turkey Trot 5K Run/Walk".
- Thu Nov 26, 2026, 8 a.m., downtown Springfield: verified. "takes place Thursday, Nov. 26, 8 a.m. in downtown Springfield, rain or shine".
- Packet pickup Wed Nov 25: verified. "Packet pick-up is Wednesday, Nov. 25, 8 a.m.- 5:30 p.m. and Race Day, 6-7:15 a.m., at Springfield Expo Center, 635 E. St Louis".
- Registration link (parkboard.org/TurkeyTrot) and the other two original links (parkboard.org/439/Scholarships, dcoonline.com): all 200.

**Blocking problem.** The body is now self-contradictory. It says "in person this year" and then says "run ... all of that 5K sometime during Thanksgiving weekend", "upload your run times ... by midnight on Sunday, November 29th" and "there will not be a mass gathering". All three are 2020 virtual-race text (the live post is dated Nov 24, 2020). The draft flags them but leaves them in.

**Fixes needed:**
1. Remove or rewrite the "five routes / any time over Thanksgiving weekend" paragraph.
2. Remove or rewrite the "upload by midnight Sunday Nov 29" paragraph.
3. Remove "Even though there will not be a mass gathering ... this year".
4. Revert "In Person" to the original wording, or retitle. The headline "Still On! Here's How…" is a 2020 pandemic headline.
5. CHECK items:
   - **Resolved, Nov 25 pickup hours:** the official page says 8 a.m. to 5:30 p.m. at the Expo Center. Quote above.
   - **Resolved, food donation:** the page says "Please bring seven nonperishable food items to donate to Ozarks Food Harvest". The post says "bringing along some food". Optional update.
   - **Not resolvable, free t-shirt:** the FAQ lists "When/where do I get my t-shirt and race packet?" but the answer text is not in the HTML. Prices are $45 adults / $40 kids 12 and under.
   - **Not resolvable, five routes:** the page has a "Race Route" section with a PDF map; I could not see a route count.
   - **Not resolvable, retitle:** editor decision.
6. The official page still carries stale "On-site2020 Virtual Turkey Trot" text in its heading. That is harmless, but it is not a signal of a virtual race.

## 2. wingapalooza-springfield-mo: READY AFTER SMALL FIXES

**Writer's words.**
- The lead sentence was rebuilt. Original: "Wingapalooza 2026 is Saturday, November 7 at the Springfield Expo Center." Draft: "Wingapalooza is held at the Springfield Expo Center; [Date to be confirmed...]".
- Poker tense was changed to past, which is fine.
- The update sentence is long, with an added Chili Cook-Off pointer.

**Fact checks:**
- wingapalooza.com: 2026 date verified. "NOVEMBER 7th, 2026". Friday poker verified. "Friday Nov 6 Poker Toruanment". $25 online / $30 at the door at Hy-Vee and Rapid Roberts: verified ("Online Discounted $25 ($30 day of at door) Also Available at Hyvee &Rapid Roberts").
- No 2027 date posted on the site.
- Hours "11 a.m. to 5 p.m.": **not found** as stated. The site shows the 2026 anthem at 11:25 and awards at 5:00. This is original text, unchanged.
- sertomachilicookoff.com: verified. "February 20th 2027 / Expo Center, Springfield MO", with a Poker tournament listed for the Friday night.
- "same Sertoma clubs": partly supported. The chili site has a Sertoma menu tab and says "Supporting the Boys and Girls Clubs of Springfield Mo for 40 Years". The Wingapalooza site's Sertoma page says "Helping the Boys & Girls Clubs of Springfield Since 1941". Neither page explicitly says the same clubs run both.

**Fixes needed:**
1. Do not publish the bracketed `[Date to be confirmed...]` text. Replace it with plain wording, e.g. "The 2027 date has not been announced yet."
2. Restore the original lead sentence structure: "Wingapalooza 2026 was Saturday, November 7 at the Springfield Expo Center."
3. Remove "Doors run" present tense, or past-tense it.
4. Title: leave year-free only if the editor accepts it; the post was published Nov 1, 2026.
5. Optionally soften "the same Sertoma clubs'" to "Sertoma's".
6. Remaining CHECK items (6):
   - Items 1 to 4 and 6 (retitle, venue/hours/prices, outlets): not resolvable until Sertoma posts the 2027 event.
   - Item 5 (2027 poker night): not resolvable.

## 3. somo-polar-plunge: NOT READY

**Writer's words.** Edits are limited to dated pieces, an "update" line, "This year's" changed to "The next", and the removal of "2021". "March, 6" became the placeholder.

**Fact checks:**
- somo.org: curl gets **403** (not 200 as the draft says). Nothing could be verified. The CSV says "no Springfield 2027 date" on the Polar Plunge calendar page; I could not confirm that.
- secure.somo.org (Rolla and Lake of the Ozark Polar Bear Strut links, fr_id=1600 and fr_id=1598): host unreachable from here. These are unchanged 2021 links and are likely dead.

**Blocking problems:**
- The only new facts are placeholders. The post now has no date, no registration URL (the "Go here to get started" link was changed to the somo.org home page), and two 2021 links left.
- The "beginning of March" sentence and "venue", "age 10+", "$75 minimum" are 2021 details with no source.

**Fixes needed:** Hold until somo.org posts the 2027 Springfield Plunge. Then replace the date, registration link, venue and minimums from that page. Remove or re-verify the Rolla and Lake of the Ozark Struts. CHECK items 1 to 5: none can be resolved from here.

## 4. mom-prom-in-buffalo-mo: NOT READY (retire or retitle as a past event)

**Writer's words.** Changes are dates and "last year" to "in 2020". The draft adds the update sentence "this post covers the first Mom Prom, listed for March 6, 2021".

**Fact checks:**
- The Eventbrite link (200) shows: "Buffalo MO, Mom prom Tickets, Saturday, March 6, 2021 • 6 PM - 9 PM", "Event ended", "Ticket sales have ended".
- The Facebook event link returns a login shell.
- No 2026 or 2027 Buffalo Mom Prom was found (CSV, unverified).

**Blocking problem.** The body still reads as a future event ("hosting their first annual Mom Prom", "I'll see you there on [Date to be confirmed]", "hurry up, because they only have a limited number of tickets") and links to an ended ticket page. A reader would think there is an upcoming event.

**Fix:** Do not refresh. Either retire the post, or retitle it as the 2021 event and past-tense the body. CHECK items 1 to 6: none are resolvable; no organizer source exists.

## 5. pizza-nights-at-millsap-farm: READY AFTER SMALL FIXES

**Writer's words.** Body is byte-for-byte the original. The only addition is the one-sentence update line, so this meets the rule.

**Fact checks** (millsapfarms.com/pizza-club, 200):
- Live-music, buffet-style and Horno wood-fired oven details: verified. "Nearly every Thursday night, May through October from 6 - 8pm"; "served buffet style"; "New Mexico style Horno wood-fired earthen oven".
- Picnic tables: not found. The page says "Bring along some chairs, or a picnic blanket to sit on, as seating is limited".
- Reservation link: live. The "Get Tickets" button leads to ticketing. millsapfarm.csasignup.com is unreachable from here.

**Fixes needed:**
1. Replace the update line's placeholder. The official page states a standing season, so the line can say: "Pizza Nights run nearly every Thursday, May through October, 6 to 8 p.m. (5 to 7:30 p.m. starting in October); check the Millsap Farms Pizza Club page for the 2027 lineup." Quote: "Starting in October, pizza club times are 5 -7:30pm due to Daylight Savings."
2. Optional: the page's live-music schedule lists 2026 dates, so do not copy any dates.
3. CHECK item 1 (ambiance): the live music and buffet are confirmed; picnic tables and "seats by the fire" are not. CHECK item 2 (link): the `millsapfarms.com/pizza-club` link is live and current; keep it.

## 6. things-to-do-valentines-day: NOT READY

**Writer's words.** Only dates were replaced and an update line added. Good. But the 2027 update line says "each date below is marked to be confirmed".

**Fact checks** (all six links return 200 to curl, so the draft's "403" claim for Finley is wrong):
- Beer, Wine, Cheese & Chocolate Festival: **resolvable.** ozarkempirefair.com says "the 14th Annual Beer Wine Cheese & Chocolate Festival on February 6, 2027. ... guests 21 and older" and "VIP Pairings Dinner ... Friday before the Festival, February 5, 2027"; tickets on Stubwire.com from "December 14, 2026". The draft left this as "no date" and "not checked".
- Soulfire Marriage Conference: soulfireministries.org has a "Soulfire Marriage Conference 2027" page ("retro themed prom!", dinner, worship, speakers) but no date in the page HTML. Date not found.
- Finley Farms (finleyfarmsmo.com/happenings): no Valentine's or Couple's Cocktails class listed. Not found.
- Art Zone Nixa, Fair Grove chamber (the site is now a Shopify page; "on the right hand side" no longer applies), Midnight Rodeo: no 2027 info or Valentine's listing found.

**Fixes needed:**
1. Add Feb 6, 2027 for the festival (source above).
2. Remove or resolve the other five placeholders. A six-item roundup with five "to be confirmed" lines is not publishable. Hold or cut to confirmed events.
3. Fix the Fair Grove "right hand side" note.
4. Remaining CHECK items 1 to 4 and 6: not resolvable now.

## 7. st-patricks-day-springfield-mo: NOT READY

**Writer's words.** In the Springfield Brewing Company section, "Wednesday through Saturday you can stop by" became "On the dates above you can stop by", a reword that points at a placeholder. The heading "2022 St. Patrick's Day Parade" lost its year, but the section still says "Unfortunately, 417 land's epic St. Patrick's Day Parade will not be held this year", a 2022 statement.

**Fact checks:**
- **Contradicted:** the draft says no 2026 or 2027 Fleet Feet race was found. The post's own RunSignup link now shows "Shamrock Shuffle | Fleet Feet Springfield", "Sat March 13, 2027". It reads: "4th Annual Shamrock Shuffle presented by Saucony ... 5k, 15k, or the Beer Mile presented by Springfield Brew Co. ... March 13th, 2027 in Downtown Springfield". Times: "15k: 8:00am, 5k: 8:10am, Beer Mile 10:00am". Packet pickup "Friday, March 12th, 2027 3:00pm-6:00pm @Fleet Feet Springfield". Prices $40 (5k), $60 (15k), $25 (beer mile). So this event is **resolvable now**, but it is a renamed event, so the section needs rewriting.
- Springfield parade: itsalldowntown.com says "returns to Downtown Springfield on Saturday, March 14, 2026", "12:00 pm - 6:00 pm". The CSV note "2 p.m." is not on that page. No 2027 date.
- Dead links (404): artzonenixa.com event-details pages (both), crawlwith.us/springfield/stpattys, plus 403 for springbike.org and dublinspass.com. Country Roads and Facebook pages load, but I did not verify content. kaptains.org loads over https (200) but not http.
- Country Roads square.site page loads, with title only.

**Fixes needed:** Rewrite the Fleet Feet section from the RunSignup page. Fix or remove the 404 links (Art Zone x2, crawlwith.us). Rewrite or cut the parade section. Fix "On the dates above". Hold the remaining events (all unverified).

## 8. easter-activities-417-land: NOT READY

**Writer's words.** Dates only (all nine replaced). Fine in principle.

**Fact checks:**
- Discovery Center link now goes to discoverycenter.org/event/indoor-egg-hunt-2026/: "Saturday, April 4 ... free with admission". 2026, not 2027. The draft's "free with the general admission" CHECK is right.
- Dead or broken: orymca.org/pat-jones-easter-egg-hunt (404); artzonenixa.com storytime page (404); the OC civicplus link redirects to a login page; the Nixa Parks link goes to a splash page (403 on follow); littlebeausbackyard.com did not respond.
- Facebook event links load (login shell only).

**Blocking problem.** Nine events, nine placeholders, four links dead, none confirmable. Easter 2027 is Mar 28. Hold until organizers post.

CHECK items 1 to 9: none resolvable.

## 9. james-river-float-series-springfield-mo: NOT READY

**Writer's words.** Dates replaced with "month + placeholder"; seven dead 37 North trip links removed (route names kept). Fine, but the post still describes a monthly series as current.

**Fact checks:**
- The sign-up link (37northexpeditions.com/all-trips?category=James%20River%20Series) redirects to /all-adventures. That page lists only Buffalo River, Illinois River and similar trips; **no James River series appears.** The seven original trip pages return 404 (checked one).
- jamesriverbasin.org (the likely JRBP site): unreachable from here.

**Blocking problem.** There is no evidence the series still exists. The body says "The float series will be one Saturday a month from April through October" and "Go sign up here" to a page that no longer shows it. Retire the post or hold until JRBP or 37 North announces 2027.

CHECK items 1 to 4: none resolvable.

## 10. berry-farms-sw-mo: READY AFTER SMALL FIXES

**Writer's words.** Edits beyond dates and one update sentence:
- Missouri Berries: "New to the scene for 2022 is Missouri Berries!" became "Under new ownership is Missouri Berries!"; "the Rogers family of four are ready to open" became "opened ... and it is now owned by Randy and Johnelle Little"; the 50,000-plants sentence was swapped for a new sentence.
- IronGate: "Four, that's right, FOUR" became "Three ... THREE"; raspberries dropped; "mid May" became "May (2027: strawberries May through June, blackberries mid-June through July, blueberries late June through July)".
- Gardener's: "Back for their second year of strawberry u-pick" became "Offering strawberry u-pick".
Each of these is a factual correction, but together they go well past "dated details plus one update sentence". The Missouri Berries ownership change is a real update and could stay as the single update sentence.

**Fact checks:**
- Missouri Berries (about page, 200): verified. "Randy and Johnelle Little, previous owners of PFI Western Store, are the new owners of Missouri Berries." "They planted over 6,000 blueberry bushes and 25,000 strawberry plants". So the old "50,000 strawberry plants" claim is **contradicted**, and removing it is right. FAQ: "a 4 acre strawberry field, a 6 acre blueberry field, a 2 acre blackberry field". The kept "40 acre farm" is **not found**. "Fresh fruit donuts, slushies": **not found**; the FAQ says only "The concession trailer will be open on the weekends".
- IronGate (200): verified. "Strawberries 2027 Season May through June"; "Blueberries 2027 Season Late June through July"; "Blackberries 2027 Season Mid-June through July"; "Strawberries, blueberries, and blackberries"; no raspberries. "Local honey and fresh seasonal produce": **not found**.
- Gardener's Orchard (200): verified up; strawberries listed among You-Pick crops; family name Gradinariu. "Second year" line was a 2022 statement, so removal is right.
- Persimmon Hill (200): up; June to August picking, gooseberries: not found.
- Hummingbird (200): JavaScript only, nothing readable.
- Facebook-only farms (Peace Lane, Horton's, Brown's, Black and Blue, High's, Boz's): login wall; status unknown.

**Fixes needed:**
1. Title: "12" (post lists 11) and "[2022]" are stale. Set a count and drop or update the year.
2. Remove "40 acre farm" and "fresh fruit donuts, slushies" (not on the site), or keep but accept that they are unconfirmed.
3. The intro still says "and raspberries" while IronGate dropped them; reconcile.
4. Keep the "Four/Three" change and drop the capitalization change ("THREE" is fine).
5. Consider reverting the Missouri Berries opening sentence to closer to the writer's wording, moving ownership into the one update line.

## 11. best-fall-festivals-in-springfield-mo: NOT READY

**Writer's words.** Only date lines changed (about 22 placeholders), plus the update line. Excellent adherence. The body still says "this year" and keeps 2024 programs.

**Fact checks:**
- **Contradicted:** the update line says "the organizers haven't posted 2027 festival dates yet". seymourapplefestival.com says "September 9-11, 2027" and "Join Us in 2027!". Sept 9 2027 is a Thursday, matching the Thursday to Saturday pattern. Use it.
- Japanese Fall Festival (peacethroughpeople.org): 2026 dates only, "2026 Japanese Fall Festival – September 11-13". No 2027 date.
- Apple Butter Makin' Days (mtvchamber.com): "Vendor applications for 2027 will open March 1"; 2026 was Saturday Oct 10 (parade). No 2027 date.
- Republic Pumpkin Daze: "October 2 & 3, 2026". Shepherd's PumpkinFest: "2026 season runs September 12 through October 31". Neither has 2027.
- Wingapalooza: 2027 not posted.

**Dead links left in the draft (flagged, not fixed):** 4csertoma.com/oktoberfest (404), countryroads.farm/fall-fun-missouri (404), graycampbellfarmstead.org/index.html (404). The Rocky Horror etix link (2024 one-night screening) also remains.

**Fixes needed:**
1. Insert Sept 9 to 11, 2027 for Seymour and correct the update line.
2. Replace the 22 bracketed placeholders with plain wording or cut the unconfirmed events. Hold the post until more 2027 dates exist.
3. Remove the Rocky Horror section (one-night 2024 event).
4. Fix or remove the three 404 links.
5. Resolve the "27" vs "THIRTY" mismatch (flagged by the drafter).
6. CHECK item 11 (Chili Cook-Off cross-link): the verified date is Sat Feb 20, 2027 (see Wingapalooza section). CHECK items 1 to 10, 12, 13: not resolvable now.

## 12. best-summer-camps-springfield-mo: NOT READY

**Writer's words.**
- Cub Creek cost, Wakonda sentence and cost, and replaced links are the only edits, plus the update line.
- The Wakonda sentence was reworded: "dozens of week-long summer camp options, for kids 3rd-6th grade..." became "seven week-long overnight sessions (June 13 through Aug. 6, 2027), for kids ages 7-17". Factual, but a rewrite.
- Two links were replaced with the literal text `[link removed]` in the body (Village Pottery Cafe).

**Fact checks (changed facts):**
- Cub Creek (dates-rates page, 200): verified. "Week 1 June 6th 2027 - June 12th 2027 $1695" through "Week 9 ... $1695". Note the page also says "A non-refundable deposit of $100 per week" and "On March 1, the required deposit increases to $500 per week".
- Camp Wakonda (200): verified. "Traditional Camp (Ages 7-17)"; sessions run "June 13 - June 18" through "August 1 - August 6"; "Tier A ... December 1st – Returning families: $780; January 1st – Early Bird: $820; March 1st – Open Registration: $850". The page also lists CIT at $1,080 to $1,150 and mini camps at $315 to $345, so "$780-$850 per week" is for the traditional camp only. (One session line on the page reads "July 11 - July 23", an apparent typo on their site.)
- The Summit (200): verified. "REGISTRATION FOR SUMMER 2027 WILL OPEN IN EARLY WINTER."
- The OC (200): "2027 Registration TBD"; "Junior Journeys: Finishing K - Finishing 2nd" and "Riverside Adventures: Finishing 3rd - Finishing 6th". The post says K through **10th grade**: **contradicted** (page tops out at 6th). Prices on the page: "AFM: $142, MM: $162" for a whole week, plus "$35" registration fee.
- YMCA (200): "Kindergarten – 6th Grade", "On-site at participating schools". The post's "two YMCA locations, downtown and south Springfield" and "12 week-long day camps" are not on the page.
- Dickerson Park Zoo (200): "classes and camps available for tots to teens". The post says "they don't have technical camps", which is at odds with that tagline.
- SPARC (200): "summer camps" mentioned. Camp list not confirmed.
- Wonders of Wildlife (200): summer 2027 not posted; the page shows Dec 2026 to Jan 2027 winter camps at $160 to $240, so the post's "$110+" cannot be confirmed.

**Dead or unreachable links still in the body:**
- codeninjas.com/mo-springfield/camps (404), and Code Ninjas has no Springfield on its Missouri list (Columbia, Nixa, etc.). Likely closed.
- springfieldarts.org/node/3203 (404; Southern Missouri Arts Connection).
- Village Pottery Cafe: likely closed (domain redirects to an unrelated site). The section has `[link removed]` text.
- sacriverstables.com and ozarkdance.com: unreachable.
- The AR Workshop link carries a `utm_...summer_camp_2025` tracking tail; clean it.

**Fixes needed:**
1. Retitle: "19+ ... 2022" (the post lists 21 camps).
2. Remove the Code Ninjas, Village Pottery Cafe, and (likely) Ozark Dance Academy and Sac River Stables sections, or at least remove the dead links; do not leave `[link removed]` in copy.
3. Fix OC grades (K to 6th) and the YMCA location/count claims.
4. Fix or remove the springfieldarts.org link.
5. Wakonda: note the cost depends on registration date (already in the draft) and that $780 to $850 is traditional camp only.
6. Prices and ages for Dance Mission, Discovery Center, Springfield Ballet, Springfield Little Theatre, Warrior Sports, AR Workshop remain 2022 values; the camp pages show 2026 (Discovery Center: "$300 nonmember/ $270 member"; Warrior Sports: "$179 per child"). Either update from those pages or add "check the camp's page for current prices".

---

## Cross-draft notes

- **Placeholder policy:** decide how an unknown date should read to the public ("2027 date not announced yet"). The bracketed string as written is an editor note.
- **Timing:** for spring events (Easter, St Patrick's Day, Valentine's, Polar Plunge, Mom Prom, float series), organizers have mostly not posted 2027 yet. Holding the refresh until Jan to Mar 2027 avoids publishing dateless posts.
- **Resolvable-now list (all from official pages):** Turkey Trot pickup hours; Seymour Apple Festival Sept 9 to 11, 2027; Beer, Wine, Cheese & Chocolate Festival Feb 6, 2027; Shamrock Shuffle Mar 13, 2027; Millsap Pizza Night standing season (Thursdays May to October).

---

## After fixes (Sun Nov 15, 2026, UTC)

Fixes applied to all 12 drafts in `l417/refresh/`. Every new fact was re-checked with plain curl on the official page and quoted in that draft's header. No bracketed placeholder or CHECK text remains in any post body except the retired Mom Prom draft (body left unchanged by instruction). No link to ffaw.org anywhere.

| Draft | After-fixes verdict | Note |
|---|---|---|
| turkey-trot-springfield-mo | **Ready (time-sensitive: publish before Thu Nov 26)** | 2020-virtual paragraphs rewritten to the in-person 2026 race; Nov 25 pickup 8 a.m. to 5:30 p.m. at Springfield Expo Center. Editor still decides whether to retitle ("Still On!") |
| wingapalooza-springfield-mo | **Ready** | Original lead restored (past tense); update points to the Feb 20, 2027 Chili Cook-Off |
| pizza-nights-at-millsap-farm | **Ready** | Standing season (Thursdays, May to October, 6 to 8 p.m.) from the official page |
| berry-farms-sw-mo | **Ready** | Title now 11, no year; unverified claims removed; Facebook-only farms unverified |
| best-fall-festivals-in-springfield-mo | **Ready** | Seymour set to Sept 9 to 11, 2027; Rocky Horror and dead links removed; other dates neutral |
| best-summer-camps-springfield-mo | **Ready** | Code Ninjas and 404 links removed; OC corrected to K to 6th; check Ozark Dance, Sac River, Village Pottery sections (likely dead or closed) |
| st-patricks-day-springfield-mo | **Ready** | Shamrock Shuffle Mar 13, 2027 added; dead links removed; parade neutral |
| things-to-do-valentines-day | **Hold (optional)** | Technically clean, with Feb 6, 2027 festival added, but only 1 of 6 events has a 2027 date; consider waiting for Dec/Jan listings |
| easter-activities-417-land | **Hold** | Refresh when organizers post 2027 dates (expected Jan to Mar) |
| james-river-float-series-springfield-mo | **Hold** | Series may no longer run; refresh when 2027 dates are posted |
| somo-polar-plunge | **Hold** | Refresh when somo.org posts the 2027 Springfield plunge |
| mom-prom-in-buffalo-mo | **Retire** | Last held 2021; already 301s to /blog/ on the new site |
