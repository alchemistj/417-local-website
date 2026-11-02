import { describe, expect, it, vi } from "vitest";
import {
  FORM_KEYS,
  LEAD_URL,
  SITE_KEY,
  buildLeadBody,
  customField,
  submitLead,
  type AttemptState,
  type LeadEnv,
  type LeadInput,
} from "../src/lib/formsLead";

const prodEnv: LeadEnv = {
  hostname: "417local.com",
  href: "https://417local.com/contact-us/?utm_source=fb&utm_campaign=fall",
  search: "?utm_source=fb&utm_campaign=fall",
  referrer: "https://www.google.com/",
};

const input: LeadInput = {
  formKey: FORM_KEYS.submitEvent,
  name: " Jane Smith ",
  email: "jane@example.com",
  message: "Details",
  honeypot: "",
  customFields: { event_title: customField("Event title", "Fall Fest ") },
};

const UUID = "123e4567-e89b-42d3-a456-426614174000";

let idCounter = 0;

function deps(response: () => Promise<Response>, state: AttemptState = { attemptId: null }, env = prodEnv) {
  return {
    fetchImpl: vi.fn(response) as unknown as typeof fetch,
    newId: () => `id-${(idCounter += 1)}`,
    now: () => Date.parse("2026-11-02T12:00:10Z"),
    env,
    state,
  };
}

const json = (status: number, body: unknown) => () =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

describe("buildLeadBody", () => {
  it("matches the intake contract and uses human labels in customFields", () => {
    const body = buildLeadBody(input, "abc", prodEnv, Date.parse("2026-11-02T12:00:00Z"), Date.parse("2026-11-02T12:00:10Z"));
    expect(body).toMatchObject({
      siteKey: SITE_KEY,
      formKey: "submit-event",
      clientSubmissionId: "abc",
      name: "Jane Smith",
      email: "jane@example.com",
      honeypot: "",
      formStartedAt: "2026-11-02T12:00:00.000Z",
      submittedAt: "2026-11-02T12:00:10.000Z",
      pageUrl: prodEnv.href,
      referrer: "https://www.google.com/",
      utm: { source: "fb", medium: "", campaign: "fall", term: "", content: "" },
    });
    expect(body.customFields.event_title).toEqual({ label: "Event title", value: "Fall Fest", type: "text" });
  });

  it("uses the agreed site and form keys", () => {
    expect(SITE_KEY).toBe("417local");
    expect(FORM_KEYS).toEqual({ contact: "contact", submitEvent: "submit-event" });
  });
});

describe("submitLead", () => {
  it("never posts from localhost or a preview host", async () => {
    for (const hostname of ["localhost", "417-local-website.vercel.app", "www.417local.com"]) {
      const d = deps(json(200, { ok: true, id: UUID }), { attemptId: null }, { ...prodEnv, hostname });
      expect(await submitLead(input, 0, d)).toEqual({ kind: "not_production" });
      expect(d.fetchImpl).not.toHaveBeenCalled();
    }
  });

  it("posts JSON straight to the intake with no credentials or custom headers", async () => {
    const d = deps(json(200, { ok: true, id: UUID, conversionEligible: true }));
    const result = await submitLead(input, 0, d);
    expect(result).toEqual({ kind: "success", id: UUID, conversion: true });
    const [url, init] = (d.fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(LEAD_URL);
    expect(init.credentials).toBe("omit");
    expect(Object.keys(init.headers).sort()).toEqual(["Accept", "Content-Type"]);
  });

  it("reuses the same clientSubmissionId on retry and resets it after success", async () => {
    const state: AttemptState = { attemptId: null };
    const ids: string[] = [];
    const record = (r: () => Promise<Response>) => {
      const d = deps(r, state);
      const original = d.fetchImpl as unknown as ReturnType<typeof vi.fn>;
      return { d, ids: () => ids.push(JSON.parse(original.mock.calls[0][1].body).clientSubmissionId) };
    };
    const a = record(json(503, { ok: false }));
    expect((await submitLead(input, 0, a.d)).kind).toBe("unconfirmed");
    a.ids();
    const b = record(json(429, { ok: false }));
    expect((await submitLead(input, 0, b.d)).kind).toBe("unconfirmed");
    b.ids();
    const c = record(json(200, { ok: true, id: UUID }));
    expect((await submitLead(input, 0, c.d)).kind).toBe("success");
    c.ids();
    expect(new Set(ids).size).toBe(1);
    expect(state.attemptId).toBeNull();
    const next = record(json(200, { ok: true, id: UUID }));
    await submitLead(input, 0, next.d);
    next.ids();
    expect(new Set(ids).size).toBe(2);
  });

  it("does not count a duplicate or quarantined lead as a conversion", async () => {
    const dup = await submitLead(input, 0, deps(json(200, { ok: true, id: UUID, duplicate: true, conversionEligible: true })));
    expect(dup).toEqual({ kind: "success", id: UUID, conversion: false });
    const spam = await submitLead(input, 0, deps(json(200, { ok: true, id: UUID, conversionEligible: false })));
    expect(spam).toEqual({ kind: "success", id: UUID, conversion: false });
  });

  it("only succeeds on ok:true with a real UUID id", async () => {
    expect((await submitLead(input, 0, deps(json(200, { ok: true })))).kind).toBe("unconfirmed");
    expect((await submitLead(input, 0, deps(json(200, { ok: true, id: "nope" })))).kind).toBe("unconfirmed");
  });

  it("maps 400 to invalid (and drops the id) but 403, 5xx, saved:true and network errors to unconfirmed", async () => {
    const state: AttemptState = { attemptId: null };
    expect((await submitLead(input, 0, deps(json(400, { ok: false }), state))).kind).toBe("invalid");
    expect(state.attemptId).toBeNull();
    for (const [status, body] of [[403, { ok: false }], [500, { ok: false }], [400, { ok: false, saved: true }]] as const) {
      const s: AttemptState = { attemptId: null };
      expect((await submitLead(input, 0, deps(json(status, body), s))).kind).toBe("unconfirmed");
      expect(s.attemptId).not.toBeNull();
    }
    expect((await submitLead(input, 0, deps(() => Promise.reject(new Error("offline"))))).kind).toBe("unconfirmed");
    expect((await submitLead(input, 0, deps(() => Promise.resolve(new Response("<html>", { status: 502 }))))).kind).toBe("unconfirmed");
  });
});
