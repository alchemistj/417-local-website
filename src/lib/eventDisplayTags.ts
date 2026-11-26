import { NICHE_COPY } from "./businessEvents";
import { businessNichePath } from "./businessPaths";
import { eventCitySlug } from "./eventPaths";
import type { EventData } from "./eventSchema";
import { classifyEvent } from "./eventTaxonomy";

export interface EventDisplayTag {
  label: string;
  /** Set for B2B niche tags: the niche page in the event's city. */
  href?: string;
  kind: "audience" | "topic" | "format" | "niche" | "filter";
}

/**
 * The chips to show on an event row, from the build-time taxonomy (not the robot's raw categories).
 * B2C: topic, then format (skipped when "Other"), then Free and Holiday.
 * B2B: up to two niches with links, then Free. Pass `showAudience` on B2B pages to lead with "Business".
 */
export function eventDisplayTags(event: EventData, options: { showAudience?: boolean } = {}): EventDisplayTag[] {
  const tax = classifyEvent(event);
  const tags: EventDisplayTag[] = [];
  if (tax.audience === "B2B") {
    if (options.showAudience) tags.push({ label: "Business", kind: "audience" });
    const city = eventCitySlug(event);
    const state = event.state || "MO";
    for (const niche of tax.niches.slice(0, 2)) {
      tags.push({ label: NICHE_COPY[niche].label, href: businessNichePath(city, state, niche), kind: "niche" });
    }
  } else {
    if (tax.topic) tags.push({ label: tax.topic, kind: "topic" });
    if (tax.format && tax.format !== "Other") tags.push({ label: tax.format, kind: "format" });
    if (tax.holiday) tags.push({ label: "Holiday", kind: "filter" });
  }
  if (tax.free) tags.push({ label: "Free", kind: "filter" });
  return tags;
}
