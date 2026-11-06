# **FLUID FRAME — ASTRO FULL BUILD RULES**

Version 2026.10 · Full builds (multi-city, launch-ready). Read this file and `docs/sop/astro-first-frame-and-pagespeed.md` before writing any code.

You are building a production website for a local service business on the Fluid Frame Astro system. Josh decides direction. Claude plans, writes copy and reviews. Nothing merges to production without Josh.

Greene Planet Mold (`alchemistj/greene-planet-website`) is a source of tested code for the specific pieces this file points to (header scroll, deferred embeds, forms intake, route registry, redirect checks, city config). It is not a design reference. Do not copy its page layouts, section styling or templates beyond what this file says. When this file is silent on something visible, stop and ask Josh.

# **RULE 0 — SOURCES OF TRUTH**

## **0.1 Words come from Josh's copy files**

* All visible text comes from the copy files Josh provides (or Claude writes and Josh approves). Place it word for word. Do not write, reword, shorten, reorder or "improve" copy.
* If a section needs words the copy files don't have, stop and ask. Do not fill the gap.
* Store copy as data (JSON or typed TS data files under `src/data/`), never hardcoded inside components.

## **0.2 Facts come from the brief**

* Business facts, credentials, services, cities, phone numbers, reviews, photos and offers come only from the project brief.
* Never invent reviews, ratings, review counts, years in business, licenses, certifications, awards, warranties, guarantees, pricing, response times or "only company in town" claims.
* If a fact is missing, leave it out or mark it TBD in the data file. Never guess a reviewer's city.
* Reviews display as first name \+ last initial, with a city only when it is known for sure.
* No star ratings or review counts anywhere on the site: not in copy, the trust bar, stat blocks, badges, meta tags or structured data. Individual reviews only.
  * Why: the numbers change every week, so a number typed in at build time soon becomes untrue, and nobody wants to keep updating it.

## **0.3 No Supabase for content**

* Page content lives in the repo as plain data files. Builds never read from a database.
* The only external backend is the Fluid Frame Forms intake for the contact form (Rule 14).
* No Supabase for images either. Every image is a local file in the repo, optimized at build time and served from the site's own domain. No Supabase Storage, CMS/CDN image hosts or hot-linked WordPress uploads.
* Why: changing words should mean editing a file, not running SQL and regenerating snapshots.

# **RULE 1 — ARCHITECTURE**

* Astro 5, `output: "static"`, `@astrojs/vercel` adapter, `trailingSlash: "always"`, `build.inlineStylesheets: "always"`.
* Node 22\. Tailwind CSS 4 via `@tailwindcss/vite`. TypeScript strict.
* Pages are `.astro`. Ship zero client JavaScript by default. Use a small React island or a plain `<script>` only for real interactivity (header scroll, mobile menu, FAQ if not native `<details>`, embeds, form).
* One reusable template per page type (home, city home, service, contact, about, owner, FAQ). Never hand-build one-off copies of a page per city.
* Scripts: `dev`, `build`, `preview`, `check`, `lint`, `test`. Commit the lockfile.

# **RULE 2 — URLS AND CITIES**

The URL standard is city-first: `/springfield/roof-repair/`.

* Every service page: `/[city]/[service]/`. Lowercase, hyphens, trailing slash.
* Each city is a full section, like a franchise location: its own home (`/[city]/`, or `/` when the site home is that city's home), contact (`/[city]/contact/`), FAQ (`/[city]/faq/`) and service pages.
* Company pages are shared across cities: `/about/`, `/about-[owner-slug]/`, `/privacy-policy/`, `/terms/`.
* What `/` is depends on the client and the copy. Two models:
  * **Primary-city home:** `/` is the main city's home (Greene Planet: Springfield). Other cities' homes are `/[city]/`.
  * **Brand or regional home:** `/` is a hub for the whole company or region (SRA: Missouri roofing company over its brands; Elias: Eastern Costa Rica). Every city, including the main one, has its own home at `/[city]/`.
  * Josh picks the model in the brief. Either way, the city sections and URLs below don't change.
* Define cities once in `src/data/cityConfig.ts`: slug, name, state, display name, phone, service-area rows, launch status, and whether it shows in the city switcher. Never fork the header or footer per city. They read the active city from config.
* Each city has its own service catalog (some cities will offer fewer services), so menus and footers can differ per city. A city never links to a service page it doesn't have.
* Services with a page in that city are always linked. Services without one may be mentioned as plain text (body copy, or an unlinked "Also available" line styled so it clearly isn't a link), never linked to another city's page or to contact as a stand-in.
* City switcher: switching cities maps to the same service in the other city when it exists, otherwise to that city's home.

# **RULE 3 — ROUTE REGISTRY**

* One route registry (`src/lib/launchRouteRegistry.ts` in Greene Planet) lists every published URL.
* The sitemap, `llms.txt`, robots rules, internal-link checks and tests all read from it, so they cannot disagree.
* A page that is not in the registry is not published and not linked.

# **RULE 4 — LAYOUT AND DESIGN SYSTEM**

* Content width: one CSS variable, `--content-max: 900px`, with `--content-pad: 24px`. Every readable section uses it. No section-level `max-w-*` or pixel overrides.
  * Why: on Greene Planet, one-off widths drifted to 552–852px across sections.
  * Why 900px: two-column sections (Rule 4.2) need room for both columns. At 900px the photo column is about 360–400px and the text column about 460–500px.
* Full-width bands are fine for backgrounds (hero, color bands, footer). The content inside stays at the shared width.
* Colors: the brief's four colors only (dark, white, primary, accent), defined once as CSS variables.
* Contrast: all text meets WCAG AA (4.5:1 for normal text). If the accent color fails on light backgrounds (bright orange, yellow, light green), use a darker shade of it for small text there.
* Fonts: system fonts, or at most one self-hosted web font in one weight, with `font-display: swap` and **no preload**. Never load Google Fonts from Google. Fonts are Josh's call per site.
  * Why no preload: on SRA a font preload competed with the hero photo and made LCP worse. A downloaded font can re-wrap the headline on a slow phone when it arrives; device fonts avoid that if a site needs a fully still first frame (SOP §5).
* Typography: AP-style title case on H1–H3, no all-caps headings, no italics for emphasis, paragraphs 3–4 lines max.
* Mobile first. No horizontal scroll at any width. Tap targets at least 48px.

## **4.1 Body copy reads like an article, not a stack of cards**

* Body sections (an H2 with paragraphs) are plain text on the page background: H2, paragraphs, an image beside or between sections where the brief has one. Never put a body section inside a bordered, rounded or shadowed box.
* Cards are only for short, scannable items: what's included, related services. A card holds a title and at most one or two sentences.
* Never put a long run of sections in a row of boxes. Separate sections with spacing, an alternating tint band or an image instead.
  * Why: on Greene Planet's Springfield inspection page, every body section sits in its own bordered card, and the page turns into one huge wall of boxes.

## **4.2 Images sit beside the words; reviews run full width**

* **No full-width body images.** A photo below the hero never spans the full content width. It sits in a two-column section: text in one column, the photo in the other (about 40–45% of the content width on desktop).
  * Why: a full-width photo is a lot to scroll past and pulls attention away from the words. Photos are there to look good and point people to the copy.
* **Alternate sides.** The first two-column section has the photo on the right, the next on the left, then right again, down the whole page.
* **Match heights.** The photo is the same height as the text beside it (`object-fit: cover`, top-aligned). No empty space above or below either column.
* **Point to the words.** Choose or crop photos so the people or the main subject face or point toward the text column. Never pick a photo whose subject looks off the page.
* **How often.** About one two-column photo section per 300–400 words of copy. Never two in a row, and never the first section after the hero; a text section sets the context first.
* **Mobile.** Columns stack: text first, then the photo, at a modest height (about 4:3 or 16:10, never a tall full-screen photo).
* **Reviews are full-width bands.** Each review is its own band across the shared content width (900px), between two sections, never a side column in a two-column section.
  * Why: a review squeezed into a side column looks cramped and makes the layout funky.
  * **One exception:** in a two-column photo section, a review may sit under the paragraphs in the text column when it helps that column match the photo's height. A review is never the column on its own.
  * Reviews appear **one at a time**. Never group two or three reviews together, stacked or in a row.
  * **How often:** a real review every couple of sections, down the whole page. Place each one after the section whose claim it supports.
  * A review band is a fine break between two photo sections, so they never sit back to back.

## **4.3 Related services and the final CTA are their own bands**

* **Related services** (on service pages; on other pages where the copy has related links) comes before the FAQ. It is its own full-width band with a quiet tint of the brand color, clearly different from the sections around it.
* **Final CTA** is its own full-width band in a strong, contrasting brand color (primary or dark), different from the Related band and the footer. Headline, one or two sentences, the primary CTA button and click-to-call. It is always the last section before the footer, with nothing between them.
* Both bands run edge to edge. The content inside stays at the shared content width.
* Text and buttons on both bands meet WCAG AA contrast.

# **RULE 5 — HEADER**

* Two bars: a quiet top bar (city switcher "Serving \[City\] · Change location", plus About, FAQs, Contact) and the main bar (logo, 3–4 quick links to the most important services for that city, phone, primary CTA button).
* No "All Services" dropdown in the header. The full service list lives on the city home and in the footer.
* Quick links are per city, and the active link uses exact matching so a link to a city home doesn't light up on every page in that city.
* Hide on scroll, return on scroll up: both bars move together. Hide on scroll down past the header height, show again after about 10px of upward scroll. `transform` only (no layout shift, never `transition: all`), about 200ms, passive scroll listener with `requestAnimationFrame`, no animation under `prefers-reduced-motion`. Never hide while focus is in the header or the mobile menu is open.
* Mobile: logo, Call button and **always a hamburger menu button**. Never skip the hamburger, even on a small site.
* The hamburger menu holds the same links as the desktop header, no more and no less: the city switcher, the top-bar links (About, FAQs, Contact), the same 3–4 quick service links, the phone and the primary CTA. Same order, stacked for mobile.
* The hamburger is a real `<button>` with `aria-expanded` and `aria-controls` (or a native `<details>`), at least 48px, labeled "Menu" for screen readers, and it works with the keyboard.
* The logo is inline (SVG, or a ≤ 4KB inline image), never an external `src` above the fold.
* Nothing shown on first load uses `transition: all`. Transition only `transform`, `box-shadow`, `opacity` or `color`.
  * Why: on Greene Planet, `transition: all` animated visibility and the hero buttons appeared one frame late.

# **RULE 6 — STICKY MOBILE BOTTOM BAR**

* On phones (below `md`), a fixed bar at the bottom of the screen with two buttons: a call button (click-to-call, the city's number, label per Rule 7.2) and the primary CTA (for example Free Inspection).
* It stays on screen at all times on mobile and is hidden on desktop.
* Add bottom padding to the page so the bar never covers the footer or the last CTA.
* On a page that has the booking embed, the CTA button jumps to the embed (Rule 10).

# **RULE 7 — PHONE NUMBERS AND NAP**

## 7.1 The NAP number is the only number in the code

* Each city's **NAP phone number** (the one on that location's Google Business Profile, exactly) lives in `cityConfig.ts` and is the only phone number in the repo, the built HTML, JSON-LD, `llms.txt`, meta tags, the sitemap and any other file a crawler or LLM can read.
* Every phone action is a native `<a href="tel:...">` in E.164 format (`tel:+14175551234`, `tel:+50622223333` for Costa Rica), and in the server HTML it always dials the NAP number. Never a number or link that only appears after JavaScript runs.
* Where digits are shown, they are the NAP number as real text in the server HTML. Display format comes from the city config. Never invent or reformat a number into a different one.
* JSON-LD `telephone`, `llms.txt`, meta tags and the sitemap always use the NAP number. DNI never touches them (exclude them from the swap script's selectors).
* Tracking numbers never appear in the repo, copy files or build output.

## 7.2 A human never sees two different numbers

* On any page, every phone number a visitor can see (header, hamburger menu, bottom bar, hero, trust bar, CTA bands, body copy, footer, contact page) is the same number. Never a tracking number in one place and the NAP in another.
* Once a visitor has seen a number, it never changes for the rest of that page view.
* Mobile, above the fold (header, bottom bar, hero): call buttons show a short call label, not digits. The wording is a design choice per site (Call Now, Call Us, Call Dan and so on). The `tel:` link behind it starts as NAP and DNI swaps only the link, so nothing visible changes.
* Mobile footer and contact page: show the digits. Some visitors want the actual number, and it keeps the NAP visible on Google's mobile render. DNI finishes long before anyone scrolls there.
* Desktop: digits are shown everywhere, with the tracked-visit mask in 7.3.

## 7.3 Call tracking (DNI): source-based, masked only on tracked visits

* When a client uses call tracking (ServiceTitan, CallRail and similar), the script runs in the browser after load and swaps **every** visible number on the page, footer and contact page included, plus every `tel:` link, in place with the same width. The swapped number sticks for the whole session across pages.
* The DNI account must keep the NAP number for any visit with **no referrer and no tracking parameters**. That is how Googlebot and LLM crawlers arrive, so they always see NAP. Swap only for tracked sources: Google Ads `gclid`, Bing Ads, paid social, UTM-tagged campaigns, and organic search when Josh turns it on for that client. The same rules apply to every tracked source, organic included.
  * Why: Google renders JavaScript. If the default pool swaps every visit, Google's rendered page shows the tracking number and the NAP no longer matches the Business Profile.
* **Mask on tracked visits only.** A tiny inline script in `<head>`, before first paint, checks for a tracked source (tracking parameters, a search-engine or ad referrer where that source is enabled, or an existing DNI session cookie) and adds a class to `<html>`. Only then are the desktop digits blurred (CSS `filter: blur`, same box, no layout shift) until DNI swaps. Direct visits get a crisp NAP number with no mask, and so does every PageSpeed and first-frame test.
* **Timeout lock.** If DNI hasn't swapped within about 2.5 seconds, remove the mask, show NAP, and lock: DNI may not change any number on that page view after that. A late swap is exactly the "two numbers" moment this rule prevents.
* Never detect bots or user agents to show them a different number. That is cloaking. The source-based setup above gets the same result the legitimate way.
* SRA runs this pattern today (tracked-only mask, label on mobile). Match it on new builds.
* Changing DNI setup or behavior needs Josh's approval per client.

## 7.4 Gate

* Build test: every phone number in `dist` (HTML, JSON-LD, `llms.txt`, sitemap) matches that page's city NAP from the config. Any other number fails the build.
* Browser test on the preview, direct visit: load each city home with no referrer and no query string, wait 5 seconds. Every visible number and every `tel:` link is NAP, nothing was blurred, and JSON-LD is NAP.
* Browser test on the preview, tracked visit (where DNI is live): load with `?gclid=test` at 1440px and 390px. Exactly one distinct number is visible on the page (footer and contact page included), the desktop digits were masked until the swap, mobile above-the-fold buttons show the label, and JSON-LD is still NAP. Navigate to a second page: same single number.
* Timeout test: block the DNI script and load `?gclid=test`. The mask clears to NAP within about 2.5 seconds and no number changes after that.

# **RULE 8 — HERO**

The full how-to and the proof are in `docs/sop/astro-first-frame-and-pagespeed.md` (§2–§3). The short version:

* The hero photo is the **first element in `<body>`**, before the header, as a real `<img>`. Never a CSS background. Position it with plain `position: absolute`. No CSS anchor positioning.
* **One final photo, inlined once** in the HTML as a data URI at build time. AVIF, about 1280px wide for full-bleed desktop, **35–60KB** (aim for about 45KB). No small-to-sharp swap, no blur-up, no placeholder, no fade-in, no second mobile image. Fix the crop with `object-position`.
* `loading="eager"`, `fetchpriority="high"`, `decoding="sync"`, real width and height. **No `<link rel="preload">`** for the hero (it's already in the HTML).
* Hold the first screen until it has fully arrived: put a hidden marker right after the last above-the-fold element and hide the hero wrapper until the marker exists:
  `<span class="atf-ready" hidden></span>` and `.atf:not(:has(> .atf-ready)) { visibility: hidden; }`
  Keep the H1 close to the photo in the HTML (target ≤ 3KB between the `<img>` and the `<h1>`).
  * Why: the browser paints whatever has arrived at each network chunk. With the header first, phones painted the header on a blank page and the photo 0.1–0.8s later.
* Nothing paints ahead of the photo: no dark band or background color on `html`, `body` or the hero wrapper. A scrim may only sit after the `<img>` in source.
* Never pad the HTML or add filler to pass a test.
* Dark overlay for text contrast. No cropped heads.
* Hero holds the eyebrow, the only H1 on the page, a 1–2 sentence subhead, a click-to-call button and the primary CTA.
* Every image below the hero follows Rule 4.2 (two-column, alternating sides), is lazy-loaded with explicit dimensions, and is sized to the column it displays in (about 1.15× its largest displayed width, WebP or AVIF). Alt text describes what is actually in the photo.
* Never use a photo that shows something other than the page's subject without flagging it to Josh (for example a crawl space photo on an attic page).

# **RULE 9 — TRUST BAR**

* Directly under the hero on every page: the business's confirmed credentials (certifications, BBB rating if confirmed, owner-on-every-job type claims from the brief).
* Second line: "Serving \[City\] & \[Area\]" · the primary offer · "Call \[Owner\]: \[phone\]" as click-to-call.
* The same trust bar design on every city. Only the serving line changes.
* No star ratings or review counts (Rule 0.2).

# **RULE 10 — CTAS, SCHEDULERS AND EMBEDS**

* Every page has a primary CTA above the fold and at least one more lower down. Use the CTA wording from the brief. Never "Submit," "Click Here" or "Learn More."
* Schedulers and calendars (Thryv, TidyCal, Calendly), Google Maps, review widgets and any third-party iframe or script must not load on page load. Load them at the visitor's first scroll, wheel, touchstart, pointerdown or keydown, or when the embed enters the viewport, whichever comes first. Use passive, once listeners. No native `loading="lazy"` on top of that.
  * Why: PageSpeed's test never interacts, so the score stays clean, and real visitors still get the embed before they reach it.
* Server HTML never contains the third-party `src`. Include a `<noscript>` fallback link.
* Reserve the embed's height so nothing shifts when it loads.
* On a page that has the embed, every "Schedule" button on that page (hero, header, footer, mobile bar) links to the embed's anchor (for example `#schedule-inspection`). It does not reload the page. Set `scroll-margin-top` so the header never covers the heading.
* Place the booking embed high on the page that owns it (right after the opening section), not at the bottom.

# **RULE 11 — PAGE TEMPLATES**

## **Homepage (`/`)**

* The copy decides what it targets: the main service plus the primary city (for example "Mold Remediation & Removal in Springfield, MO"), or the company or region (brand/regional model, Rule 2).
* Primary-city model: the homepage is that city's home and the hub for the main service. Don't build a separate hub page that competes with it.
* Brand/regional model: the homepage links to every city home with descriptive anchor text, and to the main services where the copy calls for it.
* Every service page it covers is linked from the body with descriptive anchor text. Services without a page in that city follow Rule 2 (plain text, never a link to another city).
* Why Choose Us, a full-width review every couple of sections (Rule 4.2), FAQ (5–7), final CTA, as the copy provides.

## **City home (`/[city]/`)**

* The hub for that city. Service cards link to every service page that exists in that city, never to the contact page as a stand-in.

## **Service page**

Section order (Greene Planet `sales_v2`):

1. Hero
2. Trust bar
3. Opening decision frame (40–80 words: what, where, who it's for) \+ 4 decision bullets
4. What's included (cards)
5. Body sections answering real questions (cost drivers, process details, types, when to call)
6. Signs you need this
7. Process (numbered steps, title \+ one-sentence description, each description starting with a capital letter) beside a process image
8. Pricing and timing (only with real numbers from the brief)
9. Reviews: one at a time, a full-width band every couple of sections, each after the section it supports (Rule 4.2)
10. Related services (2–3, same city): its own full-width band (Rule 4.3)
11. FAQ (all answers present in the HTML, not loaded on click)
12. Service area (that city's list)
13. Final CTA: its own full-width band, the last section before the footer (Rule 4.3)

## **Contact, About, Owner, FAQ**

* Contact: phone as the main element, the form (Rule 14), service area, map only after approval and loaded per Rule 10\.
* About and Owner pages are shared across cities. Their copy must not name a single city when the page serves all of them (say "Southwest Missouri," not "Springfield").
* FAQ page per city.

# **RULE 12 — INTERNAL LINKING**

* Homepage → every service in that city (primary-city model) or every city home (brand/regional model). City home → every service in that city. Service pages → 2–3 related services in the same city and back to the city home. Footer → every service page in the active city.
* Internal links use trailing slashes everywhere (`/joplin/roof-repair/`, not `/joplin/roof-repair`).
* Links never cross into another city except through the city switcher.
* Never link to the client's old website.

# **RULE 13 — SEO AND AI-READABLE FILES**

* Canonical host: decide per client (Greene Planet uses `https://www.`). Redirect the other host with one 301\. Every canonical tag, Open Graph URL, sitemap entry and JSON-LD URL uses the canonical host.
* Every page: unique title (`[Service] in [City], [ST] | [Business]`), unique meta description (under \~155 characters), canonical tag, Open Graph title/description/url.
* JSON-LD from data: LocalBusiness/Organization (NAP matching the Google Business Profile exactly, phone per Rule 7, never a tracking number), Service on service pages, FAQPage when the page has FAQs, BreadcrumbList. No `aggregateRating` or `review` markup (Rule 0.2).
* `sitemap.xml`, `robots.txt` and `llms.txt` are generated from the route registry.
* Every service the business offers appears on the site, and none it doesn't offer. Google Business Profile work (services, citations, NAP cleanup) belongs to the separate SEO service, not the build.

# **RULE 14 — CONTACT FORM**

* Posts to the Fluid Frame Forms intake: `https://forms.fluidframemarketing.com/api/lead`, with the client's `siteKey`, `formKey` and a `clientSubmissionId`. Copy the Greene Planet `formsLead.ts` pattern. Never build a per-site Supabase function.
* Spam protection: honeypot field plus the intake's server-side checks. No visible CAPTCHA unless Josh asks.
* SMS consent checkbox optional and unchecked by default, with links to Privacy Policy, Terms and Text Messaging Terms. Compliance text is marked for human or legal review.
* The form renders in the server HTML (no blank box before JavaScript runs).

# **RULE 15 — REDIRECTS (PROTECT EXISTING RANKINGS)**

* Before launch, build the redirect map from three sources: the old site's sitemap, a Search Console Pages export (last 12 months) and any URLs on the Google Business Profile.
* Every old URL with impressions, clicks or backlinks gets a single 301 to its closest new page (a service page, not the homepage, when one fits). Old blog posts go to the matching service page.
* Add both slash forms of every source (`/old-page` and `/old-page/`) to `vercel.json`, plus a no-slash → slash redirect for every new canonical page. Keep the map in one data file with a test that checks `vercel.json` matches it.
* `http://` → `https://` and the non-canonical host → canonical host, one hop each.

# **RULE 16 — PERFORMANCE GATE**

* **PageSpeed Insights mobile**, median of 3 runs on the Vercel preview, on every page template: Performance 95+, Accessibility 100, Best Practices 100, SEO 100 before merge. After launch, the monitoring system keeps every page above 91. (Local Lighthouse is fine while iterating.)
* **First-frame check:** `node scripts/perf/first-frame-check.mjs --controls` prints `CONTROLS OK`, then `RUNS=5` on the preview for every hero layout passes every run on mobile and desktop. Lighthouse doesn't catch flicker: Greene scored 97–99 while still flickering on phones. A font-swap reflow Josh has accepted for the site (Rule 4) is the one allowed exception; note it in the PR.
* CLS 0. No layout shift from fonts, images, embeds or the header.
* Embeds and widgets make no requests during the test (Rule 10).
* Tags: the GTM container may load. The Google tag (GA4 + Ads), Bing UET and similar base tags fire on Window Loaded + 3 seconds or first interaction, whichever comes first. Conversion tags fire as normal. The Ads manager owns these settings. Developers never edit tags.
  * Verify: in the PageSpeed/Lighthouse network requests, `gtag/js` does not load in the first ~3 seconds.
  * Why: the Google tag running during load cost about 10 points. With the delay, SRA went from 72–85 to 96–99 and Luecke's from 65–71 to 96 (live).
* No heavy animation, no autoplay video, no unused dependencies. Favicon under 50KB.

# **RULE 17 — TESTS AND CHECKS**

Every PR runs and passes:

* `npm run check`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.
* A copy test: every string in the copy files appears in the built HTML, word for word.
* Route tests: the registry, sitemap, llms.txt, internal links and `vercel.json` redirects all agree. No internal link points to a page outside the registry. No link crosses cities.
* Every page has exactly one H1, a unique title and description, valid JSON-LD and no `noindex` (except preview hosts).
* A scripted browser check (Playwright) at 1440px and 390px: no horizontal scroll, the header hides and returns, at 390px a hamburger button is visible and opens a menu with the same links as the desktop header, the mobile bottom bar shows on phones only, schedule buttons jump to the embed, and embeds make no requests on load.

# **RULE 18 — WORKFLOW**

* Work on a branch with an open PR. Never commit to `main`, never force push, never merge without Josh.
* Be sensible with Vercel builds: batch small fixes into one push instead of pushing each one separately. Then confirm the preview actually built (Vercel can silently cancel or ignore a build), then verify on the preview, not only locally.
* Small fixes can be done directly. Say up front that it's a fast-lane fix and how big it is. Larger builds go to Cursor through FF Architect with a written spec and copy file.
* Write specs and decisions into `docs/` so the next session starts informed.
* Never game a check: no HTML padding, filler or test-only code paths to make a gate pass.

# **RULE 19 — LAUNCH CHECKLIST**

* All PRs merged, `main` deployed to Vercel production and checked on the production URL.
* Redirect map complete (Rule 15\) and spot-checked on the production deployment.
* Contact form submits end to end and the lead reaches the client.
* Domain DNS pointed to Vercel (often through the client's DNS holder). Confirm the old site is no longer served.
* Search Console: verify the new sitemap, request indexing for the homepage and city homes, and watch the Pages report for 404s for two weeks.
* Hand the site's service list to the SEO service so the Google Business Profile can match it.
* Site added to the PageSpeed monitoring system.

