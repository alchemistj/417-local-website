# Event pages, city-first event URLs, action buttons and Add to calendar (Nov 8, 2026)

Approved by Josh, Nov 8, 2026. This is the second of three PRs.

| PR | Repo | What |
|---|---|---|
| 1 | event-radar #12 | Data fields this PR uses |
| 2 | this repo, this PR | Event pages and addresses |
| 3 | this repo, next PR | The calendar view (month grid, day groups, chips on every page) |

## What Josh decided

- **Events first, then the city.** Every event gets its own page on 417 Local. Nothing outside events gets a city folder;
  guides, best-of lists and blog posts keep their flat addresses, such as `/best-things-to-do-in-springfield-mo/`.
- **No venue pages and no organizer pages.** Where the venue name links, it goes to our blog post about that place if
  one exists. Otherwise it links to a Google Maps search for the venue and address.
- **The button says what the visitor actually does next.** It's chosen from `action_type` (table below).
- **Add to calendar** offers Google, Apple and a download.

## Addresses

| Page | Address |
|---|---|
| Whole-417 hub | `/events/` (exists; keep) |
| City hub | `/events/springfield/` |
| City category page | `/events/springfield/{category}/`, for example `/events/springfield/live-music/` |
| City This Weekend | `/events/springfield/this-weekend/` |
| One event (one date) | `/events/{city_slug}/{public_slug}/`, for example `/events/springfield/springfield-symphony-holiday-christmas-2026-12-19/` |
| Weekly or monthly series | `/events/{city_slug}/weekly/{series-slug}/` and `/events/{city_slug}/monthly/{series-slug}/`, from the recurring export in `src/content/recurring/` if present. If there's no recurring data, skip series pages for now. |
| Business events | `/events/springfield-business-events/` (exists; keep at this address, it may rank) |

**Moving the existing pages:**
- Today's `/events/{category}/` pages move to `/events/springfield/{category}/`.
- `/events/this-weekend/` moves to `/events/springfield/this-weekend/`.
- Add 301 redirects for both in `vercel.json`.

**Reserved words:** `springfield-business-events`, `this-weekend`, `weekly`, `monthly`, every city slug and every
category slug. They can never be an event slug. Add a build-time check that fails if one collides.

**Where the event fields come from:**
- Use `path`, `public_slug` and `city_slug` from the export when present; they come from event-radar PR 1.
- **Fallback while older export files exist:**
  - `city_slug` = slugify(city), or `springfield` when the city is blank;
  - `public_slug` = existing `slug` + `-` + the start date (yyyy-mm-dd);
  - `path` = `/events/{city_slug}/{public_slug}/`.
- Add `public_slug`, `city_slug`, `path` and `action_type` to `src/lib/eventSchema.ts` as optional fields.

**Categories:** add `comedy`, `film`, `kids` and `classes-and-workshops` to `GENERAL_EVENT_CATEGORIES`, with labels
"Comedy", "Movies and Film", "Kids' Events" and "Classes and Workshops". Build a category page only when that city
has at least one upcoming event in it.

## The event page

Template `src/pages/events/[city]/[event].astro`. Build pages only for events in the content collection; held
events are never exported, so they never get a page.

**Above the fold:**
- Title (H1), date and time ("Sat, Dec 19, 2026 · 7:30 PM", or "Time not listed" when `time_tbd`), venue and city.
- Price, only when the export has a real `price` or `is_free === true`. Never show "Free" otherwise.
- The main action button, plus Add to calendar.

**Then:**
- Our write-up (`description`).
- An address line with a "Get directions" link (Google Maps search URL from venue + address + city).
- **"More this weekend in Springfield":** up to 4 other events in the same city within 3 days.
- **"More {primary category} in Springfield":** up to 4 upcoming events.
- A small source credit: "Details from {organizer name or source domain}. Confirm times and tickets with the organizer before you go."

**JSON-LD `Event`** with: `name`, `startDate` (with offset), `endDate`, `eventStatus` (EventScheduled), `eventAttendanceMode`
(Offline), a `location` Place with an address, `description`, `image` when present, `organizer` when present,
and `offers` only when the price is known (`price`, `priceCurrency` USD, `url`).
Plus a BreadcrumbList: Events › Springfield › {primary category} › {event}.

**Title tag:** `{Event title} in Springfield, MO · {Mon D, YYYY} | 417 Local`, max 60 characters (shorten the title, keep
the date). Write a meta description of 155 characters or fewer from the write-up.

**After the date passes:**
- The page stays up at the same address, with a notice: "This event has passed."
- Show up to 4 upcoming events at the same venue or in the same category instead of the action button.
- Remove it from hubs, category pages and the sitemap 30 days after its date.
- Add `noindex` 90 days after its date.

How the site knows about past events depends on the export:
- If the export only carries upcoming events, keep a small `src/content/past-events/` archive: copy each event's JSON there on build when it's within 2 days of its date.
- If that's awkward, it's fine to keep only the notice behaviour for events still in the export. Say which you did in the report.

## Action button (from `action_type`)

| `action_type` | Main button | Link | Extra |
|---|---|---|---|
| `tickets` | Get tickets | `registration_url`, else first `source_urls` | Get directions as a small second link |
| `register` | Register | `registration_url`, else source | Get directions |
| `rsvp` | RSVP | `registration_url`, else source | Get directions |
| `signup` | Sign up | `registration_url`, else source | Get directions |
| `show_up` | Get directions | Maps link | "Event details" small link to source |
| `door` | Get directions | Maps link | Show the price text ("$15 at the door") next to it |
| `hours` | See hours and vendors | source | Get directions |
| `details` or missing | Event details | source | Get directions |

**Rules:**
- **Links out:** outbound links use `rel="noopener"` and open in the same tab.
- **Wording:** button text is a verb first and never "Learn more" or "Click here".
- **Where it lives:** put the mapping in one file (`src/lib/eventAction.ts`) so wording changes are one line.
- **Tests:** unit-test every row.

## Add to calendar

One "Add to calendar" button that opens a small menu (a `<details>` element; no framework). The menu has three items:
- **Google Calendar:** a link to `https://calendar.google.com/calendar/render?action=TEMPLATE` with the following parameters:
  - `text` (title);
  - `dates` (`YYYYMMDDTHHMMSS/YYYYMMDDTHHMMSS`);
  - `ctz=America/Chicago`;
  - `details` (a short write-up, the action link, and the 417 Local event page URL);
  - `location` (venue, address, city, MO).
- **Apple Calendar:** a link to the event's `.ics` file.
- **Download (.ics):** the same file, with a `download` attribute.

**The `.ics` file:**
- Generate it at build time per event at `{path}event.ics` (static endpoint, `text/calendar; charset=utf-8`).
- `VEVENT` fields: `UID` = `{public_slug}@417local.com` (permanent, so a re-download updates instead of duplicating), `DTSTAMP`, `DTSTART;TZID=America/Chicago`,
  `DTEND`, `SUMMARY`, `LOCATION`, `DESCRIPTION` (with the event page URL), `URL`.
- Include a `VTIMEZONE` for America/Chicago, and fold long lines per RFC 5545.

**Missing times:**
- **No end time:** start + 2 hours.
- **`time_tbd`, or markets and festivals with no time:** an all-day event (`DTSTART;VALUE=DATE`).

**Tests:** time zone (the 7:30 PM Central example), DST boundary (an event on Nov 1 and on Mar 8), no end time, all-day,
escaping commas and semicolons, and line folding.

## Hubs and lists

- `EventList.astro` links each event to its new page, not to the source. The source link moves to the event page.
- `/events/` stays the whole-417 hub and links to each city hub that has events (Springfield, Republic, Joplin for now).
- **Sitemap and `llms.txt`:** include city hubs, city category pages and upcoming event pages.

## Don't

- No changes to the event-radar repo.
- No venue or organizer pages.
- No accounts or "My ideas" yet (later).

## Done when

- `npm run build`, `npm run check` (if present), lint and tests all pass, and `git diff --check` is clean.
- Spot-check these in the build output:
  - the Symphony Dec 19 page, its `.ics` file and its Google link;
  - a `show_up` event (Garden Story Time);
  - a `time_tbd` event;
  - `/events/springfield/live-music/`;
  - the redirects from `/events/live-music/` and `/events/this-weekend/`.
