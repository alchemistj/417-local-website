# SOP: Astro first frame (no hero flicker) and mobile PageSpeed 91+

Status: draft v1.1, 20 Oct 2026, for Josh's review. It builds on "FF Astro Demos — Build Rules
and Hero Stability Standard" (v1, 18 Oct 2026) and on measurements from the Oct 19–20 speed
pass across SRA Roofing, Luecke's Roofing, Greene Planet, Window Dudes and Ben Davis. Where this
SOP and that standard overlap, they agree. This SOP adds the source-order rule (section 2), the
byte budget (section 3) and the tag findings (section 7), which the standard did not cover.

Who uses it: an architect writing a build or perf spec, and Cursor implementing one. Hand
Cursor this file and `scripts/perf/first-frame-check.mjs` with every Astro build card.

## 1. The promise
- A visitor on a slow phone sees the header, logo, hero photo, H1, subhead and main CTAs
  **together in the first frame**. After that, nothing above the fold changes: no white flash,
  no photo arriving late, no sharpening swap, no text jump.
- Mobile Lighthouse median **≥ 91** from 3 runs on the exact review URL, **with the client's
  real integrations enabled** (GTM, GA4, DNI, chat, scheduler). This number is in client
  contracts.
- Astro-first: static, prerendered HTML. No Vite/React SPA, no React Router, no Supabase
  front ends. A React island is allowed only for a genuinely interactive widget (a lead form
  is the usual case) and never owns the header, hero or page shell.

## 2. The rule that actually stops hero flicker: the photo comes first in `<body>`
Chromium paints whenever the HTML parser runs out of bytes. On a throttled phone the HTML
arrives in chunks, so **whatever is complete in the first chunk gets painted on its own**.
If the header comes before a large inline photo in the source, the first frame is "header
on a white page", and the hero lands 100–800 ms later. That is the flicker seen on SRA,
Luecke's, Greene Planet mobile, Window Dudes and Ben Davis.

An `<img>` tag cannot be painted until the parser has its closing `>`, which means the whole
data URI has arrived. So:

**Put the inline hero `<img>` first among paintable content in `<body>`.** Then put the header,
H1, subhead and CTAs right after it in source, and use CSS to place the header above the photo
and the text over it.

```astro
<body>
  <a class="skip-link" href="#main">Skip to content</a>  <!-- visually hidden until focus -->
  <div class="atf">
    <img class="atf-photo" src={heroDataUri} alt="" width="1280" height="800"
         loading="eager" decoding="sync" fetchpriority="high" data-ff-lcp-hero />
    <Header />            <!-- logo inline (SVG or ≤4 KB inline image) -->
    <section class="hero"><h1>…</h1><p>…</p><div class="ctas">…</div></section>
  </div>
  <main id="main">…</main>
</body>
```
```css
.atf { position: relative; }
.atf-photo { position: absolute; inset: var(--header-h) 0 auto 0; width: 100%;
             height: var(--hero-h); object-fit: cover; object-position: var(--hero-pos); }
header, .hero { position: relative; } /* stacks over the photo; no z-index games needed */
```

Measured with `first-frame-check.mjs`. The page is synthetic: a 64 px header plus a 70 vh photo
hero. Mobile is 390×844 at 4× CPU and 1.6 Mbps with 150 ms latency. Desktop is 1366×900.
There were 5 cold loads per case.

| Structure | Photo bytes | First-frame pass | Mobile FCP |
|---|---|---|---|
| Header, then inline photo (the usual order) | 13 KB | mobile 0/5, desktop 3/5 | ~210 ms |
| Header, then inline photo | 48 KB | 0/10 | ~210 ms |
| Header, then inline photo | 98 KB | 0/10 | ~210 ms |
| **Photo first, then header/H1/CTAs** | 13 KB | **10/10** | ~290 ms |
| **Photo first, then header/H1/CTAs** | 48 KB | **10/10** | ~520 ms |
| **Photo first, then header/H1/CTAs** | 98 KB | **10/10** | ~865 ms |

The usual order paints sooner, but the first paint is wrong. Photo-first delays the first paint
by roughly the time the photo's bytes take to arrive, and the first paint is the finished hero.
A render-blocking `<link rel="expect">` or a CSS-background photo in the head also produces a
complete first frame, at the same FCP cost. Both are forbidden by the build standard (a hold
that conceals late paint, and CSS background as sole photo delivery), and they are unnecessary
given the source-order rule.

Position the photo with plain `position: absolute` and a fixed `top` (the header height per
breakpoint as a CSS variable). **Do not use CSS anchor positioning** (`position-anchor`,
`anchor()`) to tie the photo to the hero box. Until the browser has parsed the anchor element,
the photo falls back to normal flow and paints at its natural size at the top of the page.
That broke Greene's first frame on mobile in the Oct 20 pass. Also keep large inline scripts
(island runtimes, tag bootstraps) out of the gap between the photo and the header/H1. Every
byte there delays the text.

Things to keep out of the space before the photo: any visible banner, announcement bar, cookie
bar or logo `<img>` with an external `src`. A visually hidden skip link is fine.

### 2a. Close the gap: gate the whole above-the-fold block on one parse marker
Photo-first fixes the order, but on a real site the header and hero copy after the photo can run
to several KB, and a network chunk can end in the middle of them. Greene showed the result on
Oct 20: a frame with the photo but no buttons, then a frame with a bare "▶ Details" where the
header's city-switcher `<details>` had only half arrived. A parse-keyed CSS gate removes that
window in every modern browser, with no timer and no JS:

```astro
<div class="atf">
  <img ... />                 <!-- photo first -->
  <section class="hero">…</section>
  <header>…</header>          <!-- or whichever order the layout needs -->
  <span class="atf-ready" hidden></span>   <!-- after the last above-the-fold element -->
  …rest of page…
</div>
```
```css
.atf:not(:has(> .atf-ready)) { visibility: hidden; }
```
The block stays invisible until the marker is parsed, then paints complete in one frame.
Browsers without `:has()` drop the rule and paint progressively, which is no worse than having
no gate. This is a hold, but scoped to the first screen, keyed only to parsing, and
cross-browser, unlike `rel=expect` (Chromium only) or timers and JS reveals (which can
stall). The FCP cost is the same as photo-first already pays.

Two traps found while proving it:
- **No `transition: all` above the fold.** When the gate opens, `visibility` transitions too,
  and Chrome keeps the element hidden for the first frame of that transition. Greene's hero
  buttons appeared one frame late until their transition was narrowed to
  `transform, box-shadow`. Tailwind's `transition-all` has the same problem; plain
  `transition` (colors, opacity, transform) does not.
- **Never pad the HTML to line up network chunks.** A Cursor run tried incompressible comment
  padding tuned per page. It passed under one throttle profile and is meaningless on real
  networks. The gate makes chunk boundaries irrelevant.

Proof on Greene `691f395` (local build, 5 runs × mobile and desktop × 4 routes): 40/40 PASS,
worst-frame MAE ≤ 1.1.

## 3. The hero photo: one final image, inlined once, on a byte budget
- **One final photo per page, inlined once as a data URI at build time.** No external hero
  srcset, no hero preload, no small-to-sharp swap, no LQIP or blur-up, no fade-in. (Build
  standard §3.)
- **Budget: 35–60 KB for the encoded photo.** Every 10 KB costs about 50 ms of mobile FCP and LCP
  under Lighthouse-style throttling, and the document weight counts toward Lighthouse "Total
  Blocking Time" parsing too. Aim for about 45 KB.
- Encode for the largest display size actually used: about 1280 px wide for full-bleed
  desktop, AVIF first (`sharp().avif({ quality: 45–55, effort: 9 })`), WebP fallback only if AVIF
  looks wrong. Inline one format, not both. Every Chromium, Safari and Firefox version we
  support decodes AVIF.
- Pick the crop with `object-position` per breakpoint. Do not ship a second mobile image,
  because two inline copies double the HTML.
- Check the quality by eye at 390 px (DPR 2) and 1440 px. If the image doesn't look good at
  60 KB, change the crop or the photo, or add a darker scrim. Don't raise the budget.
- Keep normal file URLs for `og:image` and social metadata, outside the hero path.
- Pages without a photo hero must be marked as such in the route manifest and carry no photo
  and no preload.

### 3a. Every image is a local file, processed at build time
- All site images (heroes, logos, body photos, team photos) live in the repo and are optimized
  by the Astro build (`astro:assets` or a build script), then served from the site's own
  domain under `/_astro/` or `/images/`.
- **No Supabase Storage, no CMS or CDN image hosts, no hot-linked WordPress uploads.** A remote
  image adds a DNS lookup, a TLS handshake and a fetch that can't be inlined or sized at build
  time, and it ties the site to a database it shouldn't need. On Oct 20 every Astro build
  (Greene, Ben Davis, Luecke's, SRA #98, Window Dudes #95) had zero Supabase URLs. Only the
  legacy Window Dudes Vite site still loads one.
- The only Supabase a site may touch is **Central Forms** (lead intake, server-side). Pages,
  content and images never read from Supabase at build time or in the browser.
- Gate: grep the built `dist` HTML and CSS for `supabase.co` and any non-site image host. Any
  hit fails the build.

## 4. Header and logo
- The logo must be in the first frame. Use an inline SVG when a clean vector exists. Otherwise
  inline a ≤ 4 KB AVIF/WebP sized to its display box at 2×. Never use an external logo
  `src` above the fold.
- The phone number and CTAs are plain HTML links in the header. They are not JS-rendered.
- **DNI phone swaps** (ServiceTitan and similar) follow `docs/sop/astro-full-build-rules.md`
  Rule 7. Render the **NAP number** as real text (never a tracking number). Mobile above-the-fold
  call buttons show a label, not digits, so nothing visible changes. On desktop the digits are
  blurred only on tracked visits (decided by an inline head script before first paint) until DNI
  swaps, with a ~2.5 s timeout that unmasks to NAP and locks. Direct visits, which is what
  Lighthouse and the frame check load, get no mask, so the first frame stays still. Changing DNI
  behavior needs Josh's approval per client.

## 5. Fonts
Fonts barely move the PageSpeed score. Window Dudes keeps Inter with `swap` and scores 96–100
on mobile with CLS 0. What a font changes is the look while the page loads on a slow phone, so
the font is Josh's call per site.
- **Allowed:** device fonts, or **one** self-hosted WOFF2 font (Latin subset, ≤ 25 KB per
  weight) with `font-display: swap`.
- **No font preloads.** On SRA they competed with the inline hero and made LCP worse.
- Do not use Google Fonts `<link>`s. They add a third-party connection and a render-blocking
  stylesheet.
- Know the tradeoff: when a downloaded font arrives it can change text width and re-wrap the
  headline on a slow phone (Window Dudes: 3 lines to 4). Lighthouse barely sees this, but
  the frame check (§8) does. Josh accepted it on Window Dudes.
- If a site needs a fully still first frame, use device fonts:
  ```css
  font-family: system-ui, -apple-system, "Segoe UI", "Noto Sans", Roboto, sans-serif;
  ```
  Greene test, Oct 20, 4 routes × mobile/desktop × 5 runs:
  | Variant | Frame check | Worst MAE |
  |---|---|---|
  | Open Sans 700 subset, embedded as data URI, `block` | mobile 20/20, desktop 15/20 | 4–6.8 |
  | Device fonts only | **40/40** | ≤ 1.4 |
- With a downloaded font, the frame-check gate in §8 applies to everything except the
  font-swap reflow when Josh has accepted it for that site. Note it in the PR.

## 6. JavaScript and CSS
- The page shell needs **zero client JS**. The menu toggle can be a `<details>` element or
  ≤ 1 KB of inline script. FAQ accordions use `<details>`.
- No Astro `ClientRouter` or view transitions, no smooth-scroll, no route fades.
- For an island, use `client:visible` or `client:idle`. Never use `client:load` above the fold.
  Remove `@astrojs/react` entirely when no route mounts React.
- Third-party embeds (scheduler, chat, Thryv, Roofle, maps, video) load on interaction or
  after `load` + idle, behind a same-size static facade. They never sit above the fold as
  iframes.
- CSS: all critical CSS inlined in `<head>` (Astro `inlineStylesheets: 'always'` or
  `'auto'`), total ≤ 30 KB, with no `@import` and no CSS-in-JS.
- Cache headers: hashed `/_astro/*` gets `max-age=31536000, immutable`. Non-hashed `/images/*`
  gets `max-age=86400, stale-while-revalidate=604800`. HTML gets `max-age=0, must-revalidate`.

## 7. Tags (GTM / GA4 / Ads / UET): the remaining 10 points
After sections 2–6, our Astro sites score **97–100** with tags blocked. With the client's real
GTM container and GA4 loading as normal, SRA and Luecke's drop to **82–89**. Measured on
Oct 19–20 by blocking hosts one at a time in Lighthouse:

| Site | Tags blocked | As served | Only `gtag/js` blocked (GTM container still loads) |
|---|---|---|---|
| SRA Roofing | 94–98 | 83–85 | 93–98 |
| Luecke's Roofing | 98–99 | 82–89 | 93–98 |

What this shows:
- The cost is the **Google tag library (`gtag/js`) executing during page load**: about 150–250 KB
  of JS and 300–600 ms of main-thread time on a throttled phone. It costs the same whether it is
  hard-coded or fired from GTM, so moving tags out of the container does not help.
- The GTM container itself is cheap. Keep it.
- The fix is **timing**. In GTM, fire the Google tag (GA4 config + Google Ads) on
  **Window Loaded + about 3 s, or first user interaction, whichever comes first**. Fire UET/Bing
  and Meta the same way. Conversion events (form submit, click-to-call) still fire normally,
  because they happen after interaction.
- We do not change tag timing in code or in a client's container ourselves. The Google Ads
  manager owns it. Our job is to hand them the measurements and the exact trigger change (see
  the message template in section 10).
- Attribution safety net: the Vercel log drain → Tinybird records every page load (with gclid
  and UTM), so a visitor who bounces in under 3 s is still in our data. Offline conversion
  import can cover it if the Ads manager wants that.
- Do not use Partytown or server-side tagging as a shortcut without the Ads manager's
  agreement. Both change measurement.

**Proven on Oct 20.** The Ads manager moved SRA's Google tag (GTM-MXQB35L2) to Window Loaded +
3 s. Mobile Lighthouse with every tag live, 3 runs each:

| SRA page | Before | After |
|---|---|---|
| Live sraroofs.com home (old site) | 72 / 85 / 74 | **96 / 97 / 97** |
| Astro build (PR #121) | 83–85 | **98 / 99 / 99** |
| Astro build (PR #98) | n/a | **98 / 98 / 95** |

`gtag/js` no longer loads during the measured window; only `gtm.js` and Bing do. Verify the
change by listing tag requests in the Lighthouse `network-requests` audit: `gtag/js?id=…`
must not appear in the first ~3 s. Luecke's (GTM-W8TNLVCK) was first reported changed the same day,
but both `gtag/js` IDs still loaded about 0.6 s after the container, so it had not taken
effect. That's why the verification step matters. After the Ads manager applied it on Oct 20,
`gtag/js` was gone from the measured window: live lueckesroofing.com went from 65–71 to
83 / 96 / 96, and the Astro build (PR #35) to 86 / 99 / 99 (the first run of each was a cold
first load). Bing UET still loads about 0.5 s after the container. It's light, but the same
trigger would remove it.

## 8. Gates (run before calling anything done)
1. `npm run build` (astro build). Test the `dist` output or the deployed review URL, never a
   dev server.
2. **First frame:** `node scripts/perf/first-frame-check.mjs --controls` must print
   `CONTROLS OK`. That proves the harness can still catch header-first, delayed-photo, swap and
   blank-frame defects. Then run `RUNS=5 node scripts/perf/first-frame-check.mjs <url>…` on
   every photo-hero layout at mobile and desktop. Every run must be `PASS`: the worst frame's
   MAE ≤ 5/255 against the settled frame over the top 60% of the viewport, with no blank frame
   after first paint. Save the JSON lines in the PR. Use `DUMP=<dir>` to keep the frames when
   something fails.
3. **PageSpeed Insights mobile**, 3 runs per page template on the exact review URL, median
   ≥ 91 with integrations enabled (the build rules ask 95+ before merge). Local Lighthouse is
   fine for iterating. Also report the tags-blocked median so the tag cost is visible.
   Record LCP, CLS, document bytes and hero bytes.
4. JS disabled: header, H1, CTAs and navigation all render and work.
5. Build-standard static gates (§5 there): one inline hero per photo route, the
   eager/high/sync attributes, no competing preload, no data-URI registry in client bundles.

The harness needs `playwright` and `jpeg-js` (and `sharp` for `--controls`). Point `CHROME` at
the installed Chromium. On the cloud containers use
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.

## 9. Forbidden (from the build standard, plus what we hit this week)
CSS background as the only photo delivery. A lazy or JS-injected hero. `useEffect`/src swaps.
Blur/LQIP-to-sharp swaps. Fade, zoom, parallax, carousel or video heroes. Opacity-zero pending
states. Body visibility holds, `rel=expect` render holds, decode gates, overlays and timers that
hide late paint. An external logo above the fold. Font preloads. `client:load` above the fold.
Header, footer or mobile CTA bar as React islands. Duplicate inline copies of the photo (CSS
background plus `img`). A frame test that compares only the first and last frames, or that
waits for `load`/`decode()` before capturing.

## 10. Templates
**Cursor perf card (prompt skeleton).** Verify the PR, branch and head SHA first, then implement
`docs/perf/SPEC-….md`. Follow ff-architect `docs/sop/astro-first-frame-and-pagespeed.md`
§2–§6. Do not change tags, DNI or the scheduler. Before pushing, run the repo's test commands,
`first-frame-check.mjs --controls`, and 5 runs per hero layout. Report the head SHA, the photo
bytes per page, the first-frame JSON and Lighthouse (tags on and tags blocked).

**Message to the Google Ads manager.** "Our pages score 94–99 on mobile PageSpeed with tags off
and 82–89 with them on. Blocking only the Google tag library (`gtag/js`) brings us back to
93–98. It's the tag's execution during load, so hard-coding instead of using the container
costs the same. Please keep the container and change the Google tag's trigger (GA4 config +
Ads) to Window Loaded + 3 s or first interaction, whichever comes first. Do the same for
UET/Bing if it's in there. Conversion events fire as before. Every page load is still logged
server-side (Vercel → Tinybird, with gclid/UTM), so short visits aren't lost."

## 11. Evidence from the Oct 19–20 pass
Lighthouse mobile here is local Lighthouse 13 on Chromium 1194, 3 runs each; it is not
PageSpeed Insights. Frame checks used `first-frame-check.mjs` at the profiles in §2.

| Site (PR) | Head measured | Lighthouse mobile | First frame | What it taught |
|---|---|---|---|---|
| SRA Roofing (sra-roofing-website #121) | `b2a07fe` | Tags on 83–85 (CI). Tags blocked 94–98. | FLICKER 12/12: header with logo on a white page, then the hero 0.1–0.3 s later | Shrinking the inline photo (128 → 38 KB) did not fix the order; header-first always flickers. Small-to-sharp swap added blank frames in CI. Tag timing is the last 10 points. |
| Luecke's (leuckes-landing-page-site #35) | `47aa295` | Tags on 85–88. Tags blocked 98. | Chrome PASS 12/12 using a `rel=expect` hold | A hold works in Chromium only. Safari and Firefox ignore it, and the swap pushes LCP about 0.7 s past FCP. |
| Greene Planet (greene-planet-website #99) | `10f1974` | 97–99 (no tags) | Desktop PASS. Mobile FLICKER: dark band, then the photo in normal flow, then text. | Photo-first needs plain `position:absolute` (§2) and no background placeholder painted ahead of the photo. Keep the H1 close to the photo in the HTML. Header, footer and mobile bar as Astro removed every non-form island. |
| Window Dudes (window-dudes #96 on #95) | `4d7d91f` | 98–100 (GA4 already deferred) | Desktop PASS. Mobile FLICKER from the font swap (H1 goes from 3 to 4 lines). | The photo was already right. Bold fallback metrics and `font-display: swap` caused the jump (§5). |
| Ben Davis (ben-davis-website #23) | `381b0b2` | 100/100/100; LCP 1.75 → 1.25 s | Mobile 4/5 PASS after the fonts fix. Desktop still FLICKER (external hero; step 2 pending). | 207 KB of TTF with `font-display: block` hid all text. WOFF2 subsets (21 KB) with `optional` fixed mobile text. |

The synthetic proof for §2, with negative controls, is in `scripts/perf/first-frame-check.mjs
--controls` plus the structure sweep recorded in the PR #408 description.
