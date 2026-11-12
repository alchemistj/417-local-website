# Event cards (typographic, no photos)

Josh approved Nov 11, 2026. Mockup: a date block, category color and icon, title, venue. No photos, no AI imagery, nothing taken from other sites, no per-event review.

## Build
1. **Card component.**
   - Left date block: month, big day number, weekday and time. Or "Time TBD" when the event has no time.
   - Right side, in this order: the category label in caps, the title (wrap to 3 lines, then ellipsis), then venue · city at the bottom. For runs, add "Runs Nov 27–29".
   - A faint large category icon in the top right, about 13% opacity. Use inline SVG, not emoji.
   - **Do not show "417 Local" anywhere on the card.** It must not read as if we host the event.
   - Use the site's fonts and tokens.
2. **Category palette.** About 12 categories, each with a muted gradient and an icon: live music, arts and theater, family and kids, holiday, festivals, sports, outdoors, community, food and drink, comedy, film, business.
   - Pick colors that sit well together so a long list doesn't look like a rainbow.
   - White text must pass WCAG AA contrast.
   - Unknown categories fall back to a neutral palette.
3. **Event page header.** Replace the top blue band on `/events/{city}/{event}/` with the card design, carrying the same information plus the price line.
   - On mobile (≤640px), stack the date block above the text.
   - Keep the description and action buttons below the header, as now.
4. **Share image.** At build time, generate a 1200×630 PNG of the card for each event (e.g. with satori and resvg, or the repo's existing OG tooling).
   - Set it as `og:image` / `twitter:image` (`summary_large_image`).
   - Set it as `image` in the Event JSON-LD.
   - Keep build time reasonable for about 300 events and cache by event content.
5. **Long lists.** Replace the time column in event rows with a small date tile (day number and month on the category color, about 72×56). Keep the time in the meta line. This applies on every list: hub, day pages, weekend page, categories and "More events".

## Checks
- `npm run check`, lint, build and test all pass.
- Add tests for the category to palette mapping, the TBD and run labels, and the absence of "417 Local" on cards.
- Take screenshots at 390px and 1280px of an event page and the hub, plus one generated share PNG.
