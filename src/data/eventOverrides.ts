import type { EventOverride } from "../lib/eventTaxonomy";

/**
 * Hand fixes to the taxonomy, keyed by event id. The robot's event JSON is never edited, so a fix
 * here survives the next export. Add a line only when the rules in `eventTaxonomy.ts` get an event
 * wrong, and say why in `note`.
 */
export const EVENT_OVERRIDES: Record<string, EventOverride> = {
  // The Rogersville Area Chamber hosts it, but it is a public Friday-night fun run.
  "fb69caec-6db4-469b-b38d-90ea99869f87": {
    audience: "B2C",
    topic: "Outdoors & Sports",
    format: "Game or Race",
    note: "Chamber-hosted public fun run, not a member event",
  },
  // A shopping weekend on Historic C-Street. Same call as Small Business Saturday.
  "37fdb15f-741e-4502-9e11-49474d0ad8ef": {
    audience: "B2C",
    topic: "Community",
    format: "Market",
    note: "Small Business Weekend is shopping, like Small Business Saturday",
  },
};
