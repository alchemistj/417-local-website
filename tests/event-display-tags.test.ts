import { describe, expect, it } from "vitest";
import { eventSchema, type EventData } from "../src/lib/eventSchema";
import { eventDisplayTags } from "../src/lib/eventDisplayTags";

function ev(partial: Partial<EventData> & Pick<EventData, "id" | "title">): EventData {
  return eventSchema.parse({ slug: partial.id, start: "2026-12-02T18:00:00-06:00", categories: [], city: "Springfield", state: "MO", ...partial });
}

describe("eventDisplayTags", () => {
  it("shows niches with links for a B2B event, and Business only when asked", () => {
    const e = ev({ id: "acls-t", title: "ACLS Course", categories: ["professional-development"] });
    const tags = eventDisplayTags(e);
    expect(tags[0]).toMatchObject({ kind: "niche", href: "/business-events/springfield-mo/healthcare-training/" });
    expect(tags.some((t) => t.kind === "audience")).toBe(false);
    expect(eventDisplayTags(e, { showAudience: true })[0]).toMatchObject({ label: "Business", kind: "audience" });
  });
  it("shows topic and format for a B2C event, never a business niche", () => {
    const e = ev({ id: "santa-t", title: "Breakfast with Santa", categories: ["networking"] });
    const tags = eventDisplayTags(e);
    expect(tags.every((t) => t.kind !== "niche")).toBe(true);
    expect(tags[0].kind).toBe("topic");
  });
});
