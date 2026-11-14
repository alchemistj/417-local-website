# 417 Local relaunch plan

Draft. Search Console numbers are placeholders until the data arrives.

## Goal

Move 417local.com from the old WordPress site to the new Astro build without losing the search traffic the old site still earns. Then keep the site current: events refreshed daily, evergreen and annual posts refreshed on a schedule, and everything measured.

Today's site: WordPress with The Events Calendar plugin. 54 posts, 22 pages, 932 old event URLs (recurring-event occurrences last updated 2021 to 2022). It gets heavy impressions and has not been updated in years.

## What moves over and how

The new build (preview at https://417-local-website.vercel.app, not yet on the domain) has events hubs for Springfield, Joplin, Lebanon, Bolivar and Branson, plus category, this-weekend, calendar and event pages. They are fed by event-radar, which reads official event sources daily and exports approved events.

| Content | Count | Treatment |
|---|---|---|
| Evergreen posts | [after GSC review] of 54 | Keep the same URL. Refresh facts, links and images. |
| Annual-event posts | [after GSC review] of 54 | Keep the original writer's words. Refresh dates and details each year. Same URL. |
| Past one-off posts | [after GSC review] of 54 | 301 to the matching city or category hub. Retire (410 or 301 to the blog index) only if Search Console shows no impressions or links. |
| Pages | 22 | Keep the URL where a matching page exists in the new build. Otherwise 301 to the closest page. |
| Old event URLs (`/event/...`) | 932 | 301 to a city or category hub. No event is recreated from old data. |

Sort the 54 posts using [GSC: top 20 pages by impressions] and [GSC: top 20 pages by clicks]. High-impression posts get kept or refreshed before they get redirected.

## Redirect rules

- One redirect per old URL, one hop, 301.
- Old URL list is the source: `urls.csv` (post, page, tribe_events). Every row gets a destination, kept as a reviewed table before launch.
- `/event/<slug>/`: map to a hub by city when the slug or title names a city, otherwise the Springfield hub. Use a category hub when the category is clear (for example, markets, trivia, classes). [Rules to be confirmed after reviewing the 932 slugs.]
- `/events_/` and other plugin archive, month, list and feed URLs: 301 to `/events/`.
- Posts and pages that keep their URL need no redirect. Check trailing slashes match.
- Retired posts: decided from Search Console data, not by guess.
- No redirect chains, no redirects to a URL that itself redirects, no destination that returns 404.

## Tracking and testing

- Before launch: FF Reports baseline from Search Console, analytics and PageSpeed (mobile). Save: [GSC: top 20 pages by impressions], [GSC: total clicks and impressions, last 90 days], [PageSpeed: mobile score, home and one events page]. Without a saved baseline there is no before/after.
- At launch: FF Reports tracks the same pages weekly. Watch pages that were redirected.
- Forms: Central Forms handles the event-submission and contact forms.
- First split tests (FF Split Testing), one at a time, started after the first two weeks of stable data:
  1. Events hub: headline and intro wording.
  2. Submit-your-event call to action: placement and wording.
  3. Post title and meta description on one high-impression evergreen post.
- Each test states its goal and end condition before it starts.

## Launch checklist

- [ ] Preview QA on the Vercel URL: all page types, mobile and desktop, forms submit.
- [ ] Design-reviewer pass on the preview.
- [ ] Redirect table complete: all 54 + 22 + 932 rows have a destination.
- [ ] Redirects tested against the preview: status, one hop, destination returns 200.
- [ ] Sitemap generated and checked; robots.txt correct; `llms.txt` present.
- [ ] FF Reports baseline saved.
- [ ] Central Forms and FF Split Testing wired in and tested.
- [ ] Josh approves before DNS changes.
- [ ] DNS switch; confirm domain serves the new site.
- [ ] Submit sitemap in Search Console; check the Page indexing report.
- [ ] Spot-check 20 old URLs on the live domain.
- [ ] Check Search Console for 404s and redirect errors at day 1, day 7 and day 30.

## Risks

- **Traffic dip from redirects.** 932 event URLs pointing to hubs can read as soft 404s. Expect some loss from the old event URLs. Mitigate by mapping to the closest hub, and by judging results on the hubs and kept posts, not on old event URLs.
- **Wrong sort of posts.** Retiring a post that still earns clicks. Mitigate: retire only with Search Console data in hand.
- **Annual posts go stale again.** Put a yearly refresh date on each one.
- **Event data quality.** Radar reads official sources; a bad source can publish a wrong event. Keep the approval step and the "This event has passed" behaviour.
- **Search Console data late or incomplete.** The post sort waits for it. Launch does not go ahead without it.
- **Missed URLs.** Old plugin URLs not in `urls.csv` (feeds, archives, parameters). Mitigate with a catch-all to `/events/` and a 404 check after launch.
- **Tracking gaps.** If reports or tests are not wired in before launch, the case study loses its baseline.
