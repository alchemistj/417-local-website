import type { EventData } from "./eventSchema";
import { eventAction } from "./eventAction";
import { eventCityName, eventPublicSlug } from "./eventPaths";
import { DEFAULT_TIMEZONE, eventChicagoDate, eventHasClockTime, isDateOnly, placeName } from "./events";

const CHICAGO_VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  "TZID:America/Chicago",
  "X-LIC-LOCATION:America/Chicago",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:-0600",
  "TZOFFSETTO:-0500",
  "TZNAME:CDT",
  "DTSTART:19700308T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:-0500",
  "TZOFFSETTO:-0600",
  "TZNAME:CST",
  "DTSTART:19701101T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

/** `time_tbd`, or any event with no clock time (markets, festivals, and other dateless listings). */
export function isAllDayEvent(event: EventData): boolean {
  if (event.time_tbd === true) return true;
  return !eventHasClockTime(event);
}

interface ZonedParts {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
  /** `GMT-06:00` style, when the formatter provides it. */
  offsetName: string;
}

export function zonedParts(date: Date, timeZone = DEFAULT_TIMEZONE): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZoneName: "longOffset",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  let hour = get("hour");
  if (hour === "24") hour = "00";
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour,
    minute: get("minute"),
    second: get("second"),
    offsetName: get("timeZoneName"),
  };
}

/** Minutes east of UTC for an instant in America/Chicago. CST is -360, CDT is -300. */
export function chicagoOffsetMinutes(date: Date): number {
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(zonedParts(date).offsetName);
  if (!match) throw new Error(`Could not read the Chicago offset for ${date.toISOString()}`);
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3]));
}

/** `YYYY-MM-DDTHH:mm:ss-06:00` in America/Chicago. */
export function formatChicagoOffset(date: Date): string {
  const parts = zonedParts(date);
  const match = /GMT([+-]\d{2}:\d{2})/.exec(parts.offsetName);
  if (!match) throw new Error(`Could not read the Chicago offset for ${date.toISOString()}`);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${match[1]}`;
}

function wallStamp(date: Date): string {
  const parts = zonedParts(date);
  return `${parts.year}${parts.month}${parts.day}T${parts.hour}${parts.minute}${parts.second}`;
}

function compactDate(ymd: string): string {
  return ymd.replace(/-/g, "");
}

function nextCalendarDate(ymd: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return ymd;
  const shifted = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + 1));
  return shifted.toISOString().slice(0, 10);
}

function startInstant(event: EventData): Date {
  const value = isDateOnly(event.start) ? `${event.start}T12:00:00Z` : event.start;
  const time = Date.parse(value);
  if (Number.isNaN(time)) throw new Error(`Event ${event.id} has an unreadable start: ${event.start}`);
  return new Date(time);
}

function endInstant(event: EventData, start: Date): Date {
  if (event.end && !isDateOnly(event.end)) {
    const time = Date.parse(event.end);
    if (!Number.isNaN(time)) return new Date(time);
  }
  return new Date(start.getTime() + 2 * 60 * 60 * 1000);
}

export function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\r\n|\n|\r/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

/** Fold one logical ICS line at 75 octets, per RFC 5545. Continuation lines start with a space. */
export function foldIcsLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let offset = 0;
  let budget = 75;
  while (offset < bytes.length) {
    let end = Math.min(offset + budget, bytes.length);
    if (end < bytes.length) {
      while (end > offset && (bytes[end] & 0b1100_0000) === 0b1000_0000) end -= 1;
    }
    if (end === offset) end = Math.min(offset + budget, bytes.length);
    chunks.push(decoder.decode(bytes.slice(offset, end)));
    offset = end;
    budget = 74;
  }
  return chunks.map((chunk, index) => (index === 0 ? chunk : ` ${chunk}`)).join("\r\n");
}

function icsDocument(lines: string[]): string {
  return `${lines.map((line) => foldIcsLine(line)).join("\r\n")}\r\n`;
}

function formatUtcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function eventLocationText(event: EventData): string {
  const city = (typeof event.city === "string" && event.city.trim()) || eventCityName(event);
  const state = (typeof event.state === "string" && event.state.trim()) || "MO";
  return [placeName(event.venue), placeName(event.address), city, state].filter(Boolean).join(", ");
}

function shortWriteup(event: EventData): string {
  const text = event.description?.replace(/\s+/g, " ").trim() ?? "";
  if (text.length <= 180) return text;
  return `${text.slice(0, 179).trimEnd()}…`;
}

export interface CalendarLinkInput {
  pageUrl: string;
  /** Used as DTSTAMP. Tests pass a fixed instant. */
  stamp?: Date;
}

/** Google Calendar template link. Timed events use local wall times; all-day events use dates. */
export function googleCalendarUrl(event: EventData, input: CalendarLinkInput): string {
  const params = new URLSearchParams();
  params.set("action", "TEMPLATE");
  params.set("text", event.title);
  params.set("ctz", DEFAULT_TIMEZONE);
  params.set("location", eventLocationText(event));
  const actionHref = eventAction(event).href;
  const details = [shortWriteup(event), actionHref, input.pageUrl].filter(Boolean).join("\n");
  params.set("details", details);

  if (isAllDayEvent(event)) {
    const start = compactDate(eventChicagoDate(event));
    const end = compactDate(nextCalendarDate(eventChicagoDate(event)));
    params.set("dates", `${start}/${end}`);
  } else {
    const start = startInstant(event);
    const end = endInstant(event, start);
    params.set("dates", `${wallStamp(start)}/${wallStamp(end)}`);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** A VCALENDAR document for one event. Line endings are CRLF and long lines are folded. */
export function buildEventIcs(event: EventData, input: CalendarLinkInput): string {
  const stamp = formatUtcStamp(input.stamp ?? new Date());
  const uid = `${eventPublicSlug(event)}@417local.com`;
  const description = [event.description?.trim(), input.pageUrl].filter(Boolean).join("\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//417 Local//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...CHICAGO_VTIMEZONE,
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
  ];

  if (isAllDayEvent(event)) {
    const day = eventChicagoDate(event);
    lines.push(`DTSTART;VALUE=DATE:${compactDate(day)}`);
    lines.push(`DTEND;VALUE=DATE:${compactDate(nextCalendarDate(day))}`);
  } else {
    const start = startInstant(event);
    const end = endInstant(event, start);
    lines.push(`DTSTART;TZID=${DEFAULT_TIMEZONE}:${wallStamp(start)}`);
    lines.push(`DTEND;TZID=${DEFAULT_TIMEZONE}:${wallStamp(end)}`);
  }

  lines.push(
    `SUMMARY:${escapeIcsText(event.title)}`,
    `LOCATION:${escapeIcsText(eventLocationText(event))}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `URL:${input.pageUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  );
  return icsDocument(lines);
}
