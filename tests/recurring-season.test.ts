import { describe, expect, it } from "vitest";
import { recurringSchema, recurringWeekday, recurringWhen, seasonLabel } from "../src/lib/recurring";

describe("recurring season", () => {
  it("turns the engine's { from, to } season into month names", () => {
    expect(seasonLabel({ from: "03-14", to: "10-31" })).toBe("March–October");
    expect(seasonLabel({ from: "11-01", to: "11-30" })).toBe("November");
  });

  it("keeps a string season and allows none", () => {
    expect(seasonLabel("March–October")).toBe("March–October");
    expect(seasonLabel(null)).toBeNull();
    expect(seasonLabel(undefined)).toBeNull();
  });

  it("parses an exported file with an object season", () => {
    const item = recurringSchema.parse({
      id: "c-street-saturday-market",
      title: "C-Street City Market",
      rule: { freq: "weekly", byday: ["SA"], start_time: "09:00", end_time: "14:00" },
      season: { from: "03-14", to: "10-31" },
    });
    expect(item.season).toBe("March–October");
    expect(recurringWhen(item)).toBe("Every Saturday, 9 AM–2 PM, March–October");
    expect(recurringWeekday(item)).toBe(6);
  });

  it("maps other byday codes and keeps minutes that are not on the hour", () => {
    const item = recurringSchema.parse({
      id: "tuesday-trivia",
      title: "Tuesday Trivia",
      rule: { freq: "weekly", byday: ["TU"], start_time: "18:30", end_time: "20:00" },
    });
    expect(recurringWhen(item)).toBe("Every Tuesday, 6:30 PM–8 PM");
    expect(recurringWeekday(item)).toBe(2);
  });
});
