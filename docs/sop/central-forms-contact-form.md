# SOP: Client website contact form on Central Forms

Status: draft v0.1, 20 Oct 2026, for Josh's review. Written after taking Window Dudes through
the full path on Oct 20. Checked against Central Forms `origin/main` at `510a84f` (PR #44), Window
Dudes `cursor/wd-central-forms-only` (`8773255`) and SRA `cursor/sra-central-forms-only`
(`d3c4900`). Anything marked "(verify)" was not provable from code.

Who uses it: an agent (Cursor or Claude) building a new Astro client site, and the architect
writing its build card. Hand the agent this file. Central Forms is the shared lead intake at
`https://forms.fluidframemarketing.com` (repo `ff-contact-and-forms-filtering`).

## 1. The promise
- Every real inquiry is **stored in Central Forms before the visitor sees success**.
- The client gets **one clean email** per inquiry, plus Josh's BCC where it is configured.
- If the client uses a CRM (JobNimbus, ServiceTitan), Central Forms creates the record.
  The website never talks to the CRM.
- A retry or double-click with the same `clientSubmissionId` creates nothing new: no second
  row, email, CRM record or conversion.
- Spam is never dropped. It is stored and sent to the review inbox
  (`support@fluidframemarketing.com`), never to the client (`src/filter/route.ts`,
  `docs/quarantine-review-delivery.md`).
- Stuck or failed deliveries page Slack (`FORMS_ALERT_SLACK_WEBHOOK_URL`; kinds
  `delivery_failed`, `delivery_interrupted`, `delivery_ambiguous` in `src/lib/exceptionCases.ts`).
- **No client-owned Supabase or other client database.** The site stores nothing itself.

## 2. Architecture
```
Browser on https://www.client.com
  └─ POST JSON ──> https://forms.fluidframemarketing.com/api/lead
                     ├─ Origin check (exact match, per destination)
                     ├─ validate, classify (deliver_client | quarantine_review)
                     ├─ store row (contact_form_submissions)  ← before any reply
                     ├─ Postmark email (client, or support@ for review)
                     └─ CRM adapter, if the client has one
```
- The browser posts **directly** to Central Forms. CORS allows only `POST, OPTIONS` and the
  headers `Content-Type` and `Accept` (`src/lib/cors.ts`). Don't add custom headers.
- **Origin must be on the destination's allow-list, as an exact string**: scheme + host, no
  path, no trailing slash (`forms_form_origins` check). `https://client.com` and
  `https://www.client.com` are different origins. Either redirect apex to www before the form
  loads (Window Dudes does this) or register both.
- **A request with no `Origin` header is rejected with 403** in production
  (`api/lead.ts`; `ALLOW_NO_ORIGIN_REQUESTS` must never be set there). So a server relay
  from the website's own API that doesn't forward Origin fails. Don't build one for production.
- Each form has two destinations: `preview` and `production`. The production runtime refuses
  preview destinations and the preview runtime refuses production ones
  (`destinationRejectedByRouting` in `src/admin/registry.ts`).
- The preview runtime is isolated. Recipients must be `.test` or `.invalid`, and the only
  Postmark token is the literal `POSTMARK_API_TEST`, so no real email goes out
  (`docs/forms-admin.md` "Isolated safety", `docs/forms-env-contract.md` "Not-live intake rule").
- An **inactive production destination refuses new leads** (400, reason `inactive`) and
  stores nothing (`docs/window-dudes-production-sender.md`).

## 3. Registering the client in Central Forms
**Every database write and every Central Forms production env change needs Josh's explicit
approval first.** Write the SQL or the env list, show it to Josh, wait for a yes.

The registry lives in the dedicated Forms Supabase project (`wvdoqpuxwbeaefworrhp`).
`/admin` is a future UI and is *not* the onboarding path (`docs/forms-admin.md`). Tables, from
`docs/schema.sql`:

| Table | What goes in it |
|---|---|
| `forms_clients` | `client_key` (immutable, e.g. `window-dudes`), display name (used in the email subject) |
| `forms_sites` | `site_key` (e.g. `window-dudes-website`) |
| `forms_forms` | `form_key` (usually `main-contact`), `requires_client_submission_id`, filter mode, review recipient |
| `forms_form_destinations` | one row per environment: `inquiry_recipient`, `notification_bcc`, `activation_status` (`inactive`/`active`), `unfinished_inquiry_capture` |
| `forms_form_origins` | exact origins per destination; an origin can belong to only one destination |
| `forms_mail_profiles`, `forms_secrets` | Postmark profile and encrypted token per client and environment |

Order:
1. Client, site, form. Use the existing graph migrations as templates
   (`docs/schema-migration-ben-davis-preview-graph-20260927.sql`,
   `...-window-dudes-preview-graph-20260928.sql`).
2. **Preview destination first**: `.test` recipient, the site's preview origin, active.
3. **Production destination: inactive** with the real recipient, `notification_bcc`, and the
   production origins (`https://www.client.com`, plus apex if it isn't redirected). An active
   destination must have a recipient (DB check).
4. After any destination or origin edit, run `select public.forms_bump_registry_epoch();`.
   The registry cache otherwise holds old values for up to 15 s per instance.
5. Postmark token. Two paths exist today:
   - Generic database client: token stored encrypted in `forms_secrets` and pointed to by
     `forms_mail_profiles`. BCC = `INTERNAL_LEAD_BCC_EMAIL` env **plus** `notification_bcc`
     (`databaseMailProfile` / `resolveLeadEmailRecipients`).
   - Dedicated env token `POSTMARK_TOKEN_<CLIENT>` (Ben Davis, Window Dudes, Greene): needs a
     Central Forms code change (`src/lib/dedicatedClientMail.ts`, `MAIL_PROFILES` in
     `src/config/forms.ts`, `src/lib/envContract.ts`) and a Vercel env var. BCC comes from
     `notification_bcc` only.
   Which path a new client gets is Josh's call (verify).

## 4. Form code requirements
### 4a. Request body (`src/lib/validate.ts`)
| Field | Rule |
|---|---|
| `siteKey`, `formKey` | required |
| `clientSubmissionId` | UUID v1–8. **One per logical inquiry, reused on every retry.** Required when the form has `requires_client_submission_id` |
| `name` ≤200, `email` ≤320, `phone` ≤50, `message` ≤5000 | phone **or** email required; email must be valid |
| `formStartedAt`, `submittedAt` | required ISO timestamps. Under 2 s apart = "timing" spam signal |
| `honeypot` | the hidden field's value. Filled = spam signal. Neither signal rejects; both feed review |
| `pageUrl` ≤2000, `referrer` ≤2000 or null | |
| `utm` | `{ source, medium, campaign, term, content }` |
| `customFields` | ≤100 keys; key ≤64, label ≤120, value ≤2000 |
| `attribution` | optional (Reports / split testing) |
| whole body | ≤100,000 bytes |

### 4b. customFields carry human labels
The email prints each custom field as `Label: value` under "Additional details"
(`buildLeadEmailText` / `buildLeadEmailHtml` in `src/lib/postmark.ts`). Empty values and the
keys `formSource` and `clientSubmissionId` are skipped. So send only what the client should
read, labelled the way they'd say it. Booleans become "Yes"/"No". Technical values go in
`rawPayload`, not `customFields`. From Window Dudes `src/lib/previewFormsLead.ts`:
```ts
customFields: {
  serviceNeeded: { label: "Service needed", value: "Window replacement", type: "text" },
  address:       { label: "Address",        value: "123 Main St",        type: "text" },
  city:          { label: "City",           value: "Springfield",        type: "text" },
  smsConsent:    { label: "SMS consent",    value: "No",                 type: "text" },
  contactType:   { label: "Contact type",   value: "Homeowner",          type: "text" },
}
```
### 4c. Subject line (required format)
Every client lead email uses **`Your <Client display name> Website inquiry — <Visitor name>`**,
for example `Your Window Dudes Website inquiry — Jane Smith` (`visitorInquirySubject` in
`src/filter/subjects.ts`; Greene Planet and Window Dudes use it).
- **Keep the visitor's name.** It makes each inquiry its own Gmail thread instead of grouping
  every lead into one conversation.
- **Never put "lead" in a client-facing subject.** Clients reply to the visitor from this email,
  so the visitor would see "Re: …" with that word in it.
- Older legacy clients (SRA, Luecke's) still use `Your <Client> Inquiry (Website Contact)`
  with no name. New sites use the format above.

### 4d. Responses and what the site does
| Response | Meaning | Site does |
|---|---|---|
| 200 `ok:true`, `id` (UUID) | stored | show success, reset form, new `clientSubmissionId` next time |
| …and `duplicate:true` | same inquiry already stored | success, **no conversion** |
| …and `conversionEligible:true`, `duplicate` not true | real new lead | fire the existing conversion once, `transaction_id` = `id` |
| 400 `ok:false` | invalid or unknown form/inactive destination | "please check the fields, or call {phone}" |
| 403 | origin not allowed | same failure UX; this is a config bug, fix the registry |
| 429 | rate limited | "please wait a minute, or call {phone}"; keep the id |
| 503, or `ok:false` with `saved:true` | stored but delivery not confirmed, or service down | "could not confirm, please call {phone}"; keep input and id |
| network error, timeout, unparseable JSON | unknown | same as 503 |

Success only on `ok === true` **and** a real UUID `id`. A quarantined lead returns `ok:true`
with `conversionEligible:false`; show success, fire nothing.

### 4e. Compact submit function
```ts
const LEAD_URL = "https://forms.fluidframemarketing.com/api/lead";
const PROD_HOSTS = ["www.client.com"]; // exact; apex redirects to www
let attemptId: string | null = null;    // reused across retries of one inquiry

export async function submitLead(form: HTMLFormElement, startedAt: number) {
  if (!PROD_HOSTS.includes(location.hostname)) return { kind: "not_production" } as const;
  attemptId ??= crypto.randomUUID();
  const d = new FormData(form);
  const t = (k: string) => String(d.get(k) ?? "").trim();
  const q = new URLSearchParams(location.search);
  const body = {
    siteKey: "client-website", formKey: "main-contact", clientSubmissionId: attemptId,
    name: t("name"), email: t("email"), phone: t("phone"), message: t("message"),
    honeypot: t("website_url"),
    formStartedAt: new Date(startedAt).toISOString(), submittedAt: new Date().toISOString(),
    pageUrl: location.href, referrer: document.referrer || null,
    utm: { source: q.get("utm_source") ?? "", medium: q.get("utm_medium") ?? "",
           campaign: q.get("utm_campaign") ?? "", term: q.get("utm_term") ?? "",
           content: q.get("utm_content") ?? "" },
    customFields: { service: { label: "Service needed", value: t("service"), type: "text" } },
  };
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 45_000);
  try {
    const res = await fetch(LEAD_URL, { method: "POST", mode: "cors", credentials: "omit",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body), signal: ctl.signal });
    const json = await res.json().catch(() => null);
    if (res.ok && json?.ok === true && /^[0-9a-f-]{36}$/i.test(json.id ?? "")) {
      if (!json.duplicate && json.conversionEligible === true) fireConversion(json.id);
      attemptId = null;
      return { kind: "success" } as const;
    }
    if (res.status === 400 && json?.ok === false && !json.saved) {
      attemptId = null;                 // nothing stored; next attempt is new
      return { kind: "invalid" } as const;
    }
    return { kind: "unconfirmed" } as const; // 403/429/5xx/saved-but-failed: keep attemptId
  } catch { return { kind: "unconfirmed" } as const; }
  finally { clearTimeout(timer); }
}
```
`fireConversion(id)` calls the site's existing conversion event with `transaction_id: id`,
once per id (Window Dudes also remembers fired ids in `sessionStorage`). Central Forms has a
35 s request deadline (`src/lib/deadline.ts`), so keep the client timeout above that.

### 4f. Other rules
- On "unconfirmed", **keep everything the visitor typed** and show the phone number as a
  `tel:` link.
- No-JS: the submit button starts `disabled`, a "Form loading… or call {phone}" line shows
  until the script binds, and a `<noscript>` says "This form needs JavaScript. Call us at
  {phone}." (Window Dudes `LeadForm.astro`).
- **localhost, preview and any other host never post to production Central Forms.** Gate on
  an exact production-host list (Window Dudes `astroLeadSubmitUrl`). Never put `localhost` on a
  production destination.
- Preview builds test against the Central Forms preview runtime. Window Dudes and Ben Davis
  do this through a preview-only same-origin relay (`api/preview-forms-lead`) that must never
  run in production (verify the pattern with Josh for each new site).

## 5. Optional: unfinished-inquiry capture
Per-client opt-in (`unfinished_inquiry_capture` on the destination, off by default). The form
posts name/phone/email (never the message) to `/api/lead-draft` on blur, with the same
`clientSubmissionId`. If no real submit arrives within 30 minutes, the client gets an
"Unfinished website inquiry" email telling them to call, not text. Fire-and-forget; never
delay the real submit. Show a one-line notice near the form. Spec:
`ff-contact-and-forms-filtering/docs/unfinished-inquiry-client.md`. Greene Planet's
`cursor/unfinished-inquiry` branch is the reference.

## 6. CRM
- Window Dudes → JobNimbus, inside Central Forms. Runs only when
  `JOBNIMBUS_ENABLED_WINDOW_DUDES` is exactly `true` and `JOBNIMBUS_API_KEY_WINDOW_DUDES` is
  set (`docs/window-dudes-jobnimbus-parity.md`).
- SRA and Luecke's → ServiceTitan (`crmProvider: "servicetitan"` in `src/config/forms.ts`,
  `docs/sra-servicetitan-lead-delivery.md`). Production enablement status: (verify).
- CRM runs only after the client email is sent, and never for quarantined, preview-test or
  acceptance rows.
- **A new client's CRM needs a Central Forms code change** (new adapter + env names). Never
  wire a CRM from the website.

## 7. Test order (mandatory, in this order)
Test emails go only to `josh@fluidframemarketing.com` or `support@fluidframemarketing.com`.
**Never to the client.**

1. **Site tests.** Unit and e2e on the site: body shape, labels, host gate, retry keeps the
   id, success/failure UX, conversion fires once.
2. **Preview destination.** Submit from the site preview to the Central Forms preview runtime.
   Confirm the row is stored (test mode, `.test` recipient) and a same-id replay returns
   `duplicate:true`.
3. **Production, support@ only.** With Josh's OK: set the production destination's
   `inquiry_recipient` to `support@fluidframemarketing.com`, clear `notification_bcc`, activate
   it, bump the epoch. Post one lead with the real production origin (from the live host, or
   from Node with an explicit `Origin: https://www.client.com` header, as the Luecke probe
   does). Open the email yourself and check every line: subject (§4c format, with the
   visitor's name), Name/Phone/Email, Message,
   Additional details labels, no audit or debug text. Resubmit the same body: expect
   `duplicate:true` and **no** second email. For a generic database client the
   `INTERNAL_LEAD_BCC_EMAIL` copy still goes out (verify its value is Josh's address).
4. **Josh's inbox.** Switch the recipient to `josh@fluidframemarketing.com`, send one more, and
   ask Josh to check it on his phone. Wait for his reply.
5. **CRM** (if any). Only after Josh says yes: enable the CRM switch, send one lead, ask Josh to
   find the record in the CRM and delete it.
6. **Restore.** Real `inquiry_recipient` and `notification_bcc` back, destination **inactive**,
   epoch bumped. Clean up test rows (section 8, trap 6).
7. **Flip.** Josh merges the site PR and changes DNS. Activate the production destination at
   that moment, bump the epoch, send nothing to the client, and watch the first real lead.

## 8. Traps from Window Dudes (symptom → cause → rule)
1. **Relay rejected.** 403 from production → the site's server relayed the POST without an
   `Origin` header → browser posts direct; no production relay.
2. **Site read its own Supabase.** Site code looked for an `intake_mode` column in the client's
   Supabase that didn't exist → the site had a client database dependency → the site reads no
   database. Central Forms decides everything.
3. **Wrong destination with no origin.** Scheduled senders picked the first destination, which
   was the inactive one → registry picked `destinations[0]` → fixed: it now picks the active
   destination this runtime serves (`resolveIntakeConfig`). Re-test if you touch it.
4. **Hidden per-client sender fence.** Production refused with `production_sender_inactive`
   in the app, and the database function `forms_wd_ensure_provider_effects` only allowed
   preview → two client-specific fences (fixed in PRs #41 and #43) → new clients use the
   standard path. If a client has its own ledger, prove it end to end in production.
5. **Email body was the ledger audit text.** The client got the audit record, not the lead →
   the Window Dudes path sent the snapshot body → fixed in PR #44 → always open the real
   email and read it.
6. **Stuck test rows paged Slack.** Test rows left `pending` raised `delivery_interrupted` →
   rows nobody would send → mark test rows done after testing. With Josh's OK: a never-started
   `pending` email row gets `email_delivery_status = 'skipped'` with a short
   `notification_error`; open provider effects get `status = 'skipped_not_configured'`,
   `last_error = 'ff_internal_test_lead_no_crm'` (only rows with `send_started_at is null`;
   the effect clock and started rows are immutable by trigger).
7. **Test leads would reach the CRM.** Window Dudes plans JobNimbus effects even while the
   switch is off and retries them when it turns on → test leads would sync later → mark test
   rows' effects done (trap 6) **before** enabling the CRM, then send a fresh lead for the CRM
   test.
8. **BCC silently dropped.** Greene's destination had `notification_bcc` set, but the Greene mail
   path ignored every BCC (fixed in Central Forms PR #47) → after any recipient/BCC change, send one
   test and confirm a Delivery event for **every** address (To and BCC), not just that the email sent.
9. **Client mailer not set up for production.** Ben Davis returned `delivery_failed`: "Referenced mail
   secret does not belong to this client…" because its production mail profile has no stored token
   → before the support@ test, confirm the client's Postmark path works in production (env token or
   connected `forms_mail_profiles` row); decide it with Josh in §3 step 5.
10. **Deploy not live.** A merged Central Forms PR built on Vercel production but didn't serve
   → production deploy on merge was not auto-promoted → request the promote, then check
   `buildSha` at `https://forms.fluidframemarketing.com/api/health` equals the merge SHA.

## 9. Never
- Never send a test to a client inbox. Only josh@ or support@.
- Never point a site at a client database, or add Supabase to a site.
- Never commit secrets, tokens, or `.env` files. siteKey/formKey are not secrets.
- Never enable a CRM before Josh has verified a test record.
- Never change GTM, tag timing or conversion tags. That's the Google Ads manager's job. Only
  fire the existing conversion on success.
- Never change Central Forms code from a website task. Open a separate Central Forms PR.
- Never write to the Forms database or Central Forms production env without Josh's yes.
- Never put `localhost` or a preview URL on a production destination.
- Never activate a production destination before the flip, except for the test in §7.3.

## 10. Launch checklist
- [ ] Client, site, form registered; keys match the site code
- [ ] Preview destination active with `.test` recipient; production destination inactive
- [ ] Production origins exact (www, and apex if not redirected); epoch bumped
- [ ] Postmark path chosen with Josh; token in place (no value in git)
- [ ] Site posts direct from the browser; host gate blocks localhost and preview
- [ ] Body matches §4a; `clientSubmissionId` reused on retry
- [ ] customFields have human labels; no technical values in them
- [ ] Subject is `Your <Client> Website inquiry — <Visitor name>`, no "lead"
- [ ] Success only on `ok:true` + UUID `id`; failure UX keeps input and shows the phone
- [ ] Conversion fires once, only when `ok && !duplicate && conversionEligible`, `transaction_id` = `id`
- [ ] No-JS message with phone number
- [ ] Site unit/e2e tests pass
- [ ] Preview test stored; duplicate replay returned `duplicate:true`
- [ ] Production test to support@ read by eye; duplicate sent nothing
- [ ] Josh confirmed the josh@ test email
- [ ] CRM test record verified and deleted by Josh (if CRM)
- [ ] Test rows marked done; no open Slack exception
- [ ] Real recipient and BCC restored; destination inactive
- [ ] Central Forms `/api/health` `buildSha` matches the expected merge
- [ ] At the flip: destination activated, epoch bumped, first real lead watched
