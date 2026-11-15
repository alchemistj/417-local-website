# 417local.com launch package

Moving 417local.com from the old WordPress host to the new Astro site on Vercel (project `417-local-website`, preview https://417-local-website.vercel.app).
Prepared Sunday Nov 15, 2026 (Central). This is a document only. Nothing has been launched and no setting has been changed.
All times are US Central. Anything that needs Josh's registrar login is marked **Josh**.

## Read this first: four gaps found while checking the preview

1. **No analytics on the new site yet.** `src/layouts/BaseLayout.astro` says GA4/GTM are "added later". There is nothing to compare traffic against after launch until FF Reports/GA4 tracking is added and tested. Must be done before T-1.
2. **No `/about/` page.** It returns 404 on the preview. Do not point `/author/*` at it. The pages that exist are `/how-we-pick/` and `/contact-us/`.
3. **22 old image URLs return 403** (details in section 1). These are worth 42 impressions and 0 clicks over 16 months. Low risk, but a one-line rule fixes them.
4. **Sitemap URL differs from the old site.** New site: `https://417local.com/sitemap.xml`. Old site: `/sitemap_index.xml`. Old Search Console sitemap entry must be replaced (section 5).

## 1. Redirect map

Source: `redirect-map.csv` (every old URL with Search Console impressions, Jul 2025 to Nov 2026). Site total over the 16 months: 3,189 clicks, 493,217 impressions.

### 1a. Counts

| Status | URLs | Clicks | Impressions |
|---|---|---|---|
| keep (same URL on new site) | 67 | 2,876 | 454,616 |
| redirect-existing (exact 301) | 9 | 47 | 10,014 |
| redirect-pattern (`/event/*`, `/venue/*`, `/organizer/*` to `/events/`) | 671 | 266 | 28,545 |
| UNMAPPED | 23 | 0 | 42 |
| **Total** | **770** | **3,189** | **493,217** |

Pattern rows break down as: 531 `/event/`, 85 `/venue/`, 50 `/organizer/`, 4 `/wp-content/uploads/` (the four image rules already in `redirects.ts`), 1 `/events_/`.
Rules live in `src/data/redirects.ts`; `vercel.json` is generated from it (`npm run redirects`). Add new rules in `redirects.ts`, not by hand in `vercel.json`. `vercel.json` also has the `www.417local.com` to `https://417local.com/` 301.

### 1b. Top 30 URLs by impressions: old to new, verified on the preview

Checked with `curl -s -o /dev/null -w '%{http_code} %{redirect_url}'` against the preview on Nov 15, 2026. "200" means the same URL serves directly (keep). Every one of the 30 behaves as the map says.

| # | Old URL | Clicks | Impr. | Map status | New URL | Preview result |
|---|---|---|---|---|---|---|
| 1 | `/best-kids-activities-in-springfield-mo/` | 616 | 87,879 | keep | same | 200 |
| 2 | `/best-things-to-do-in-springfield-mo/` | 109 | 53,206 | keep | same | 200 |
| 3 | `/best-seo-in-springfield-mo/` | 17 | 41,897 | keep | same | 200 |
| 4 | `/best-date-night-ideas-in-springfield-mo/` | 468 | 36,986 | keep | same | 200 |
| 5 | `/busiek-state-forest-and-wildlife-area/` | 212 | 29,075 | keep | same | 200 |
| 6 | `/best-fall-festivals-in-springfield-mo/` | 385 | 23,355 | keep | same | 200 |
| 7 | `/berry-farms-sw-mo/` | 119 | 20,030 | keep | same | 200 |
| 8 | `/` | 159 | 15,326 | keep | same | 200 |
| 9 | `/events/` | 178 | 15,049 | keep | same | 200 |
| 10 | `/art-classes-in-springfield/` | 44 | 14,525 | keep | same | 200 |
| 11 | `/pine-garden-review-springfield-mo-chinese-food-restaurant/` | 27 | 14,434 | keep | same | 200 |
| 12 | `/dance-classes-springfield-mo/` | 33 | 14,164 | keep | same | 200 |
| 13 | `/largest-fork-springfield-mo/` | 65 | 11,125 | keep | same | 200 |
| 14 | `/the-flea-springfield-mo/` | 42 | 9,279 | keep | same | 200 |
| 15 | `/down-south-fried-fish-co/` | 29 | 8,916 | redirect-existing | `/best-food-trucks-in-springfield-mo/` | 301 to `/best-food-trucks-in-springfield-mo/` |
| 16 | `/chicago-cheesesteak-co-in-springfield/` | 10 | 7,720 | keep | same | 200 |
| 17 | `/how-to-connect-site-to-google/` | 1 | 7,512 | keep | same | 200 |
| 18 | `/best-hiking-and-walking-trails-in-springfield/` | 23 | 6,877 | keep | same | 200 |
| 19 | `/best-parks-in-springfield-mo/` | 17 | 6,745 | keep | same | 200 |
| 20 | `/galloway-village-springfield-mo/` | 137 | 6,277 | keep | same | 200 |
| 21 | `/best-breweries-in-springfield-mo/` | 3 | 4,927 | keep | same | 200 |
| 22 | `/best-food-trucks-in-springfield-mo/` | 16 | 3,198 | keep | same | 200 |
| 23 | `/best-summer-camps-springfield-mo/` | 74 | 3,104 | keep | same | 200 |
| 24 | `/pickleball-in-springfield-mo/` | 8 | 2,652 | keep | same | 200 |
| 25 | `/sequiota-park-springfield/` | 9 | 2,490 | keep | same | 200 |
| 26 | `/how-is-the-frozen-mudpuddle-from-mudhouse-coffee/` | 30 | 2,440 | keep | same | 200 |
| 27 | `/city-butcher-springfield-mo/` | 8 | 1,756 | keep | same | 200 |
| 28 | `/venue/village-pottery-cafe/` | 51 | 1,700 | redirect-pattern | `/events/` | 301 to `/events/` |
| 29 | `/event/rk-gun-show-in-springfield-2021/` | 0 | 1,697 | redirect-pattern | `/events/` | 301 to `/events/` |
| 30 | `/venue/4-by-4-brewing-company/` | 2 | 1,364 | redirect-pattern | `/events/` | 301 to `/events/` |

Notes:
- Same URL without the trailing slash (for example `/best-kids-activities-in-springfield-mo`) returns 308 to the slash version. Fine.
- The preview answers on its own hostname, so the `www` to apex rule and the real host cannot be tested until the domain is attached (section 3).
- These checks were a one-time spot check. The full run (all 770 URLs) is a scripted step in section 2.

### 1c. The 23 unmapped URLs (42 impressions, 0 clicks)

| URL group | Count | Impr. | Preview today | Recommendation |
|---|---|---|---|---|
| `/author/carla/` | 1 | 14 | 404 | Add `/author/:path*` to `/blog/` (the existing `/author/sigafus` and `/author/team` rules already go to `/blog/`). Do not use `/about/`: that page does not exist. |
| `/free-music-class-springfield/` | 1 | 1 | not checked | Check if the page exists in the new build. If not, 301 to `/blog/`. |
| `/wp-content/uploads/...` images | 21 | 27 | 403 | See below. |

Count note: the CSV has 21 image rows plus the one page, 22 non-author rows, which matches your "22 images" if the page is counted with them.

**Images.** `redirects.ts` already sends 4 old image URLs to their article, and those work (checked: `bass-pro-shops-in-springfield-mo.jpg` gives 301 to `/best-things-to-do-in-springfield-mo/`). Recommended fix for the rest:
1. Add a last-in-order catch-all `/wp-content/uploads/:path*` to `/blog/` (or `/`). An image URL that lands on a page is a "soft" answer, but with 1 to 3 impressions each it only needs to stop returning 403.
2. Better and still cheap: map the ones whose file name names the article. From the file names:
   - `cave-at-sequoia-park.jpg`, `boulders-at-sequiota-park-in-Springfield.jpg` to `/sequiota-park-springfield/`
   - `kids-on-catepillar-at-springfield-botanical-gardens.jpg`, `Chesterfield-park-in-Springfield.jpg`, `pond-at-doling-park.jpg`, `playgrounds-and-more-at-Meador-Park.jpg` to `/best-parks-in-springfield-mo/` (Josh to confirm which post used each)
   - `fountains-at-jordan-valley-park.jpg` to `/jordan-valley-park/`
   - `Pine-Garden-Chinese-Restaurant.png`, `Pine-Garden-Menu-300x169.png` to `/pine-garden-review-springfield-mo-chinese-food-restaurant/`
   - `galloway-village-springfield-mo-scaled.jpg` to `/galloway-village-springfield-mo/`
   - `Art-Classes-in-Springfield-scaled.jpg` to `/art-classes-in-springfield/`
   - `2021-summer-camps-springfield-mo-scaled.jpg`, `ymca-summer-camps-springfield-mo-1024x592.jpg` to `/best-summer-camps-springfield-mo/`
   - `hiking-trail-in-the-woods-at-Busiek.jpg` to `/busiek-state-forest-and-wildlife-area/`
   - `people-playing-pickleball-at-meador.jpg` to `/pickleball-in-springfield-mo/`
   - `fried-fish-and-fries.jpg` to `/best-food-trucks-in-springfield-mo/`
   - `trailhead-at-Frisco-Highline-Trail.jpg` to `/best-hiking-and-walking-trails-in-springfield/`
   - Leave the rest (`20170521_162718-scaled.jpg`, `20190107_153746-1024x576.jpg`, `From-A-Police-Impound...`, `ladies-night-out-village-pottery-republic-mo-scaled.jpg`) to the catch-all.
3. Real question for Josh: images on the new site. If the new pages use new image paths, the old `/wp-content/uploads/` paths exist nowhere else, and other websites hot-linking them will break. Keep the full WordPress uploads folder in the backup (section 2).

### 1d. Old Springfield event and venue URLs: `/events/` or `/events/springfield/`?

Recommendation: **keep `/events/` as the default for the 671 pattern URLs. Do not switch the whole pattern to `/events/springfield/`.**
- Both pages return 200 on the preview, so either works technically.
- The old site's events were not all Springfield. Example in the top 30: `/venue/village-pottery-cafe/` is a Republic, MO business (the old post `ladies-night-out-village-pottery-republic-mo` shows it). A Springfield target would be wrong for it, and `/events/republic/` exists (200).
- `/events/` is the hub that links to all five city hubs, so it is right when we cannot tell the city.
- Most of these URLs are 2021 to 2022 events that no longer exist. Google will treat a mass redirect to one page as a soft 404 over time. That is fine: they earn 266 clicks across 671 URLs, and the value is in not showing errors to people.
- Cheap improvement: hand-map the top 10 to 15 `/venue/*` and `/organizer/*` URLs by impressions (for example Village Pottery Cafe, 4 by 4 Brewing Company, Hold Fast Brewing) to the right city hub, for example `/events/springfield/` for the two Springfield breweries once Josh confirms the city. I did not verify city for each one. Do this only after the pattern rule is working.

### 1e. Old URLs that are not in Search Console: crawl step

Search Console only lists URLs that got an impression. WordPress may have more (old redirects, pages, tags, feeds, PDFs).
**T-1 (the day before launch), do this crawl and diff:**
1. Save the sitemap list: fetch `https://417local.com/sitemap_index.xml` and every child sitemap listed in it (posts, pages, events, categories, authors).
2. Save as `old-urls-YYYY-MM-DD.txt` (path only, lowercase).
3. Diff it against the `old_path` column in `redirect-map.csv`. Anything in the sitemap but not in the CSV is "unseen".
4. Run each unseen URL against the preview. Anything that is not a 200 or a 301 is a gap: add a rule in `redirects.ts`, run `npm run redirects`, deploy to preview, re-test.
5. Also crawl the old homepage and main menu links with a link checker, to catch URLs not in any sitemap.
6. Keep the old URL list. It is the permanent test list for the 72-hour watch.
The old WordPress is still live until cutover, so this crawl must run against the old host before DNS changes. Do not run it after cutover (it would then hit the new site).

## 2. Pre-launch checklist (T-3 days to T-0)

Day-of-week matters because of Josh's Sabbath (Friday sundown to Saturday nightfall). Do not schedule work for Josh in that window. Examples for the common choices:

| Launch day | T-3 | T-2 | T-1 | Note |
|---|---|---|---|---|
| Sunday | Thu | Fri (before sundown) | Sat (Sabbath) | T-1 tasks must move to Friday morning. Not recommended. |
| Monday | Fri (before sundown) | Sat (Sabbath) | Sun | T-2 tasks move to Friday or Sunday. |
| Tuesday | Sat (Sabbath) | Sun | Mon | T-3 tasks move to Thu or Fri. |
| Wednesday | Sun | Mon | Tue | Clean prep, but +72h watch falls on Sat (see section 5). |

Mark each item with who does it. "Claude" means a Claude Code session working from this document. Nothing here changes a setting until the person named runs it.

### T-3
- [ ] **Content freeze on WordPress.** Josh: announce that no new posts, edits or events go on WordPress from now. Anything new goes in the new site's content instead. If an urgent change is needed, make it in both places.
- [ ] **Fix the four gaps** at the top: add analytics, redirect for `/author/:path*`, image rule, decide on `/about/`. (Claude, in `redirects.ts`; deploy to preview.)
- [ ] Confirm which hostname is canonical (open question 3). The code assumes `https://417local.com` (no www): `astro.config` has `site: "https://417local.com"`, the sitemap and robots use it, and `vercel.json` redirects www to apex. If Josh picks www, those need changing; stop and ask first.
- [ ] Decide launch day and time (open question 2).

### T-2
- [ ] **Final backup of WordPress, kept.** Database export and the full `wp-content/uploads` folder, plus themes and plugins list. Store a copy off the old host (Josh's cloud storage) and write the file names and date here. Keep it until the old host is cancelled, and for at least a further 90 days (a number to confirm with Josh, not a rule of the site). The backup must happen after the content freeze so it matches the final state. **Josh** if the backup needs the old host's login.
- [ ] **Write down the current DNS records** (section 3, step 0) as a screenshot and text. **Josh** (registrar login).
- [ ] **Lower DNS TTL to 300 seconds** (5 minutes) on the records that will change. Do this at least 24 hours before the cutover, longer than the old TTL if the old TTL is higher (for example, if the old TTL is 24 hours, lower it 24 hours or more ahead). **Josh**. Record what the old TTL was.
- [ ] **Full redirect test by script.** Run every `old_path` in `redirect-map.csv` against the preview and compare to the expected status and target. Expected result: 67 keep give 200, 9 exact and 671 pattern give 301 to the listed target, and the new unmapped rules give 301. Save the output. Zero unexpected results is the gate. (Claude. `url-qa.sh` in the scratchpad checks the URL patterns; the CSV loop is a separate script to write from the curl command above.)

### T-1
- [ ] **Crawl the old sitemap and diff** (section 1e). Add rules, re-test.
- [ ] **sitemap.xml and robots.txt on the new site.** Preview today: `/sitemap.xml` returns 200 with 652 `<loc>` entries, all written as `https://417local.com/...`. `/robots.txt` returns `Allow: /` and `Sitemap: https://417local.com/sitemap.xml`. Check there is no `noindex` anywhere on the preview that would carry over (view page source of 5 pages). `/sitemap-index.xml` returns 404; the new site uses `/sitemap.xml` only.
- [ ] **Search Console property.** Check the existing 417local.com property (domain or URL-prefix) and that Josh's account owns it. If the current property is a URL-prefix for `https://417local.com/`, it keeps working since the host does not change. If www is chosen, add that property too. Do not delete the property. **Josh** (Google login).
- [ ] **Analytics and FF Reports tracking on.** Add and test on the preview. GA4 and GTM must fire after page load plus 3 seconds (SOP rule 16 noted in `BaseLayout.astro`). Write down the baseline: last 28 days of clicks, impressions and traffic per day, and the top-10 page positions (section 5). The 16-month total (3,189 clicks) averages about 199 clicks a month, which is only a long-run reference; the pre-launch 28 days is the real baseline.
- [ ] **Forms working.** `/submit-your-event/` returns 200 and `/contact-us/` returns 200 on the preview. Submit a real test on each, confirm the message arrives where Josh expects (GHL, email, or a database), and that the thank-you page `/thank-you/` shows. Check spam protection and that the sender address works from the real domain. (Claude + Josh to confirm inbox.)
- [ ] **404 page.** `/this-is-404/` returns a real 404 status on the preview, with `src/pages/404.astro`. Check it has a search or link to `/events/` and `/blog/`.
- [ ] **Core Web Vitals spot check.** Run the PageSpeed check on 5 pages: `/`, `/events/`, `/best-kids-activities-in-springfield-mo/`, `/best-things-to-do-in-springfield-mo/`, `/best-date-night-ideas-in-springfield-mo/` (mobile). Use the `reports-pagespeed` skill. Write the scores down. Fix anything red before launch; do not hold launch for amber.
- [ ] **Spot check 10 pages by eye**, phone and desktop: images, internal links, event pages, maps, the event cards.
- [ ] **Confirm the Vercel project is on the right plan** and has no Preview Protection on the production domain. (Josh or Claude read-only check.)
- [ ] **Go / no-go.** Josh says go or no-go by end of day.

### T-0
Launch-day runbook in section 4.

## 3. DNS cutover on a Vercel-hosted domain

The domain is registered somewhere Josh logs into (open question 1). The new site is on Vercel. Two ways to point the domain at Vercel: keep DNS at the registrar and add records there (A/CNAME), or move nameservers to Vercel. This plan uses **records at the registrar** because it is the smallest change and the easiest to undo. Do not change nameservers unless Josh asks.

Vercel's current default values, from Vercel's docs (confirm against what the project's Domains page shows on the day, because Vercel may show a different value for this project):
- Apex `417local.com`: **A record `76.76.21.21`**
- `www`: **CNAME `cname.vercel-dns.com`**

### Step 0: write down the old records (before T-0, T-2). **Josh**
Open the registrar DNS page. For `417local.com` copy every record exactly (type, name, value, TTL), including MX (email), TXT (SPF, DKIM, DMARC, Google/Search Console verification), and any A, AAAA, CNAME for the old WordPress host. Screenshot it and paste the text into the table below. Do not leave this blank at cutover.

| Type | Name | Value | TTL | Purpose |
|---|---|---|---|---|
| A | `@` | (fill in: old host IP) | (fill in) | WordPress |
| AAAA | `@` | (fill in, if any) | | |
| CNAME or A | `www` | (fill in) | | WordPress |
| MX | `@` | (fill in) | | Email. Do not touch. |
| TXT | `@` | (fill in) | | SPF, Google verification. Do not touch. |
| (any others) | | | | |

Only the A/AAAA/CNAME records for `@` and `www` change at cutover. MX and TXT stay exactly as they are, so email keeps working.

### Step 1: add the domains to the Vercel project (can be done early; it does not move traffic)
In Vercel, project `417-local-website`, Settings, Domains: add `417local.com` and `www.417local.com`. Vercel will show "Invalid configuration" until the DNS points to it. That is expected and harmless. Set `417local.com` as the primary and have `www.417local.com` redirect to it (this matches the existing `vercel.json` rule). (Claude or Josh; Josh's Vercel login.) Do not do this until Josh says so.

### Step 2: change DNS at the registrar. **Josh** (at the time in section 4)
1. Delete or edit the existing `@` A record (and any `@` AAAA) so the only apex address record is `A @ 76.76.21.21`.
2. Change the `www` record to `CNAME www cname.vercel-dns.com` (remove any old A for www).
3. Set TTL 300 on the new records.
4. Save. Tell Claude the exact time saved (Central).

### Step 3: check propagation and SSL (Claude)
- `dig +short 417local.com @8.8.8.8` and `@1.1.1.1` should return `76.76.21.21`. `dig +short www.417local.com` should return a Vercel CNAME target.
- Vercel Domains page: both domains show "Valid configuration".
- SSL is issued automatically by Vercel once DNS points at it, normally within minutes. Check: `curl -sI https://417local.com/ | head -5` returns 200 and no certificate error; `curl -sI https://www.417local.com/` returns 301 to `https://417local.com/`.
- If a certificate is not issued after 30 minutes with DNS correct, check for a CAA record at the registrar that blocks Let's Encrypt, then ask Vercel support. If it is still not fixed after 60 minutes, roll back.
- Different networks update at different times. Test from the phone on mobile data too.

### Rollback: exact steps. **Josh**
Trigger: see thresholds in section 5. Rollback is a DNS change only. The old WordPress host stays running and untouched during the whole window.
1. At the registrar, restore the records from the Step 0 table exactly: put back the old `@` A (and AAAA) and the old `www` record, remove `76.76.21.21` and `cname.vercel-dns.com`.
2. Leave MX and TXT alone.
3. Keep TTL 300. With TTL 300, most people see the old site again within about 5 to 15 minutes (some resolvers hold longer).
4. Check: `dig +short 417local.com @8.8.8.8` returns the old IP; the page loads from WordPress.
5. Do not remove the domain from the Vercel project; it does no harm. Tell Claude, who writes what failed.
6. WordPress content freeze stays until the next attempt; if edits were made on the new site meanwhile, note them.
Rollback only works if the old host is still paid for and the content on it is unchanged. That is why the old host stays up (open question 4).

## 4. Launch-day runbook

Josh picks a Sun, Mon, Tue or Wed. Never Fri or Sat. Start mid-morning Central. Times below are Central; shift all of them by the same amount if Josh starts at a different time. Best choice: **Monday or Tuesday** (the +72h check does not land on the Sabbath, and the T-1 prep does not fall on it for Tuesday).

Launch day = T-0. Start = 10:00 AM Central.

| Time (Central) | Who | Action |
|---|---|---|
| 9:30 AM | Claude | Run the full redirect script against the preview one last time. Check preview `/`, `/events/`, `/robots.txt`, `/sitemap.xml`. Any failure: stop and tell Josh. |
| 9:45 AM | Josh | Confirm go. Confirm the Step 0 old DNS records are written down and the backup exists. Log in to the registrar. |
| 10:00 AM | Josh | Add `417local.com` and `www.417local.com` to the Vercel project if not already added (Vercel login). Note the records Vercel shows; they must match section 3. |
| 10:15 AM | Josh | Change DNS at the registrar (section 3, step 2). Write down the save time. |
| 10:20 AM | Claude | Start `dig` checks every 2 minutes on 8.8.8.8 and 1.1.1.1. |
| 10:30 AM | Claude | Vercel shows Valid configuration for both. SSL check. `curl` the home page, `/events/`, `/best-kids-activities-in-springfield-mo/`, `www` redirect. |
| 10:45 AM | Claude | Run the full redirect script against `https://417local.com`. Compare to the preview results. Any mismatch: fix or roll back. |
| 11:00 AM | Josh + Claude | Check on a phone using mobile data: home, a post, `/events/`, an old `/event/` URL, `/submit-your-event/`, `/contact-us/`. Submit a test form. |
| 11:15 AM | Claude | Confirm analytics and FF Reports see the test visit. Confirm no 5xx in Vercel runtime logs. |
| 11:30 AM | Go or roll back decision | Josh decides. If rollback: section 3, Rollback. |
| 11:45 AM | Josh | In Search Console: remove the old sitemap (`sitemap_index.xml`), submit `https://417local.com/sitemap.xml`. Use URL Inspection on `/`, `/events/` and the top 3 posts and click "Request indexing". |
| 12:00 PM | Claude | First log of results in the watch table (section 5). Send Josh the short status. |
| 1:00 PM (+about 3h) | Claude | Redirect spot check of 10 URLs, Vercel logs for 404s and 5xx. |
| 3:00 PM | Claude | Same check. Write the status note to Josh. |
| 5:00 PM | Claude | End-of-day check and status. Rollback is still possible overnight. Josh confirms the old host stays on. |
| Evening | Claude | If Josh is on Sunday, Monday, Tuesday or Wednesday evening, no work for Josh. Claude does checks without needing him. |

Josh is not needed after 11:45 AM unless a rollback triggers. Send him one status message at about 12:00 PM, one at about 5:00 PM.

## 5. 72-hour watch plan

"T" = the time Josh saved the DNS change (written down in Central). Offsets count from there. If a check lands in Josh's Sabbath (Friday sundown to Saturday nightfall), Claude still does the check but does not message Josh until after nightfall unless it is a rollback condition. A Wednesday launch puts +72h on Saturday; Monday or Tuesday avoids this.

### What to check, and when

| When | Redirects | Vercel logs | Search Console | Traffic vs baseline | Rankings |
|---|---|---|---|---|---|
| **+1h** | Run the full 770-URL script on the live domain. Expect all as in the preview. `www` gives 301 to apex. | Runtime errors (any 5xx). 404 count. | Nothing yet. | FF Reports and analytics show live visits. | Skip. |
| **+6h** | Re-run the top 30 plus 20 random pattern URLs. | 404 list: group by path. Any old URL in it that is in the map is a bug; any not in the map goes on the fix list. | Check the sitemap was accepted (status Success, not Couldn't fetch). | Compare sessions per hour to the same weekday and hour in the baseline. | Skip. |
| **+24h** | Full 770-URL script again. | Top 20 404s by hits. Fix list updated and deployed. | Pages report: new "Not found (404)", "Redirect error", "Blocked by robots.txt" or "Crawled, currently not indexed" entries. Crawl stats: any spike in server errors. | Clicks and sessions vs the 28-day baseline, per day. | Check the top 10 pages (below) in Search Console Performance: average position and clicks. |
| **+48h** | Top 30 + new rules. | 404 and 5xx trend, down or flat. | Sitemap: discovered URL count vs the 652 entries in the file. Coverage trend. | Day 2 vs baseline. | Top 10 pages again. |
| **+72h** | Full 770-URL script, last run. | 404 and 5xx summary for 72h. | Coverage summary, any manual action or security issue (should be none). | Day 3 vs baseline and 3-day total. | Top 10 pages. Write the final report. |

Search Console data lags by about 2 days, so +24h and +48h numbers there are partial. Say that in the report rather than reading drops into them.

**Top 10 pages to track** (the 10 with the most clicks in the 16-month data):
1. `/best-kids-activities-in-springfield-mo/` (616 clicks, 87,879 impr.)
2. `/best-date-night-ideas-in-springfield-mo/` (468, 36,986)
3. `/best-fall-festivals-in-springfield-mo/` (385, 23,355)
4. `/busiek-state-forest-and-wildlife-area/` (212, 29,075)
5. `/events/` (178, 15,049)
6. `/` (159, 15,326)
7. `/galloway-village-springfield-mo/` (137, 6,277)
8. `/berry-farms-sw-mo/` (119, 20,030)
9. `/best-things-to-do-in-springfield-mo/` (109, 53,206)
10. `/best-summer-camps-springfield-mo/` (74, 3,104)

Record each page's average position in the 28 days before launch as the baseline. The `gsc/pages.csv` positions (for example kids activities 11.7, date night 10.5) are 16-month averages, not the baseline.

### Thresholds (these are my proposal; Josh can change them)

**Roll back** (Josh restores DNS, section 3) if any of these holds for 30 minutes at +1h to +6h:
- The home page or `/events/` returns 5xx, a certificate error, or the wrong site.
- Over 10% of the top 30 URLs fail the redirect script and a fix cannot be deployed within 30 minutes.
- Forms do not work and no workaround (an email link) can be put up within 30 minutes.
- Vercel is down or the domain does not validate after 60 minutes.

**Fix the same day (no rollback)**:
- Any old URL in the map that returns 404 or the wrong target.
- More than 50 404 hits a day on a single missing path or a group of paths with a common prefix: add a rule.
- A top-10 page missing from the sitemap, noindexed, or canonical pointing wrong.
- Analytics not recording.

**Watch, do not rush**:
- Traffic down up to about 30% in the first 3 days vs baseline. Rankings often wobble for a few days after a host or CMS change. This is a general SEO rule of thumb, not a measurement of this site. If a top-10 page is down more than about 30% after day 3 with no cause in the logs, check its redirect, canonical, content parity (did the text or images change versus WordPress?), and speed.
- Fewer impressions for the old `/event/`, `/venue/` pages: expected. They redirect to `/events/`.
- Traffic does not recover by day 7 to 14: escalate. Compare changed content, titles, headings and internal links against the old pages.
- Do not submit a Change of Address in Search Console: the domain is not changing.

### Who does what

| Who | Tasks |
|---|---|
| **Josh** | Registrar login for DNS changes and rollback. Search Console login for sitemap submit. Go / no-go and rollback calls. Confirm forms land in his inbox. |
| **Claude Code session** | Redirect scripts, Vercel log reading, 404 triage, adding rules to `redirects.ts`, deploys to Vercel, reading Search Console exports Josh shares, the status notes. Per the working rules: a push notification and an email to Josh at every finished piece and every blocker. |
| **FF Reports** | Traffic baseline and daily comparison (once tracking is on; see gap 1). |

Reporting: a short note to Josh at +1h, +6h, +24h, +48h, +72h in plain words: what was checked, what passed, what failed, what is being fixed, whether rollback is on the table.

## 6. Open questions for Josh

1. **Registrar.** Which registrar holds 417local.com DNS, and can you log in? Who else has access? Is DNS at the registrar or at another provider (for example the old host)? Without this, nothing in section 3 can happen.
2. **Launch day.** Which of Sunday, Monday, Tuesday or Wednesday? I suggest Monday or Tuesday, starting 10:00 AM Central (section 4). Avoid Thursday Nov 26 (Thanksgiving) and the days around it if that matters to you.
3. **www or apex?** The code is built for `https://417local.com` (no www) with `www` redirecting to it. Is that right? If you want www as the main address, the sitemap, robots, canonical tags and redirect rule all change.
4. **How long to keep the old WordPress host?** It is the rollback path. Suggest at least 30 days after launch, and keep the database and uploads backup after that. This is a suggestion, not something I measured. What does the host cost per month and when does it renew?
5. **Analytics.** The new site has no tracking yet. Which tool: GA4, GTM, FF Reports, or all? Who has the IDs?
6. **`/about/`.** Do you want an About page built, or should `/author/*` go to `/blog/`? I assumed `/blog/`.
7. **Forms.** Where should `/submit-your-event/` and `/contact-us/` messages go (email address or GHL)?
8. **Image URLs.** Are the 22 old uploaded-image URLs worth individual mappings, or just a catch-all to `/blog/`?
9. **Email on the domain.** Does 417local.com email use MX records at the registrar? We must leave those alone.
10. **Old pages with no new match.** Section 1e's crawl may find some. OK to send them to `/blog/` or `/`?

## Files used
- `/tmp/claude-0/-home-user/8bafa722-2c0d-593e-9265-5e84dd5a1cfb/scratchpad/l417/redirect-map.csv`
- `/tmp/claude-0/-home-user/8bafa722-2c0d-593e-9265-5e84dd5a1cfb/scratchpad/l417/gsc/pages.csv`
- `/home/user/417-local-website/vercel.json`, `/home/user/417-local-website/src/data/redirects.ts`, `/home/user/417-local-website/docs/url-keyword-plan-2026-11-13.md`
