/**
 * Client side of the Fluid Frame Forms (Central Forms) intake.
 * Follows docs/sop/central-forms-contact-form.md section 4 (body, retries, responses, host gate).
 */

export const LEAD_URL = "https://forms.fluidframemarketing.com/api/lead";

// TODO(Josh): confirm siteKey "417local" and the form keys "contact" / "submit-event" are registered in
// Central Forms, and that https://417local.com is on each destination's origin allow-list.
// The apex 417local.com is canonical (www redirects to it in vercel.json), so only the apex posts.
export const SITE_KEY = "417local";
export const FORM_KEYS = { contact: "contact", submitEvent: "submit-event" } as const;
export const PROD_HOSTS = ["417local.com"];
export const REQUEST_TIMEOUT_MS = 45_000;

export interface CustomField {
  label: string;
  value: string;
  type: "text";
}

export interface LeadInput {
  formKey: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  honeypot: string;
  customFields?: Record<string, CustomField>;
}

export interface LeadEnv {
  hostname: string;
  href: string;
  search: string;
  referrer: string;
}

export type LeadResult =
  | { kind: "success"; id: string; conversion: boolean }
  | { kind: "invalid" }
  | { kind: "unconfirmed" }
  | { kind: "not_production" };

/** Holds the id of the inquiry in flight so retries reuse it. */
export interface AttemptState {
  attemptId: string | null;
}

export function customField(label: string, value: string): CustomField {
  return { label, value: value.trim(), type: "text" };
}

export function buildLeadBody(
  input: LeadInput,
  attemptId: string,
  env: LeadEnv,
  startedAt: number,
  submittedAt: number,
) {
  const q = new URLSearchParams(env.search);
  return {
    siteKey: SITE_KEY,
    formKey: input.formKey,
    clientSubmissionId: attemptId,
    name: input.name.trim(),
    email: input.email.trim(),
    phone: (input.phone ?? "").trim(),
    message: input.message.trim(),
    honeypot: input.honeypot,
    formStartedAt: new Date(startedAt).toISOString(),
    submittedAt: new Date(submittedAt).toISOString(),
    pageUrl: env.href,
    referrer: env.referrer || null,
    utm: {
      source: q.get("utm_source") ?? "",
      medium: q.get("utm_medium") ?? "",
      campaign: q.get("utm_campaign") ?? "",
      term: q.get("utm_term") ?? "",
      content: q.get("utm_content") ?? "",
    },
    customFields: input.customFields ?? {},
  };
}

const UUID = /^[0-9a-f-]{36}$/i;

export interface SubmitDeps {
  fetchImpl: typeof fetch;
  newId: () => string;
  now: () => number;
  env: LeadEnv;
  state: AttemptState;
}

export async function submitLead(input: LeadInput, startedAt: number, deps: SubmitDeps): Promise<LeadResult> {
  const { fetchImpl, newId, now, env, state } = deps;
  if (!PROD_HOSTS.includes(env.hostname)) return { kind: "not_production" };

  state.attemptId ??= newId();
  const body = buildLeadBody(input, state.attemptId, env, startedAt, now());
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetchImpl(LEAD_URL, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      id?: string;
      duplicate?: boolean;
      conversionEligible?: boolean;
      saved?: boolean;
    } | null;

    if (res.ok && json?.ok === true && UUID.test(json.id ?? "")) {
      state.attemptId = null;
      return { kind: "success", id: json.id as string, conversion: !json.duplicate && json.conversionEligible === true };
    }
    if (res.status === 400 && json?.ok === false && !json.saved) {
      state.attemptId = null; // nothing was stored; the next attempt is a new inquiry
      return { kind: "invalid" };
    }
    return { kind: "unconfirmed" }; // 403 / 429 / 5xx / saved-but-failed: keep the id
  } catch {
    return { kind: "unconfirmed" };
  } finally {
    clearTimeout(timer);
  }
}

export const MESSAGES = {
  success: "Thanks! Your message was sent.",
  invalid: "Please check the fields and try again.",
  unconfirmed:
    "We couldn't confirm your message was sent. What you typed is still here. Please wait a minute and try again.",
  notProduction: "This preview doesn't send messages. Forms are only live on 417local.com.",
} as const;
