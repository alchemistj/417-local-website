import { NETWORKING_GROUPS } from "../data/networkingGroups";
import { EVENT_OVERRIDES } from "../data/eventOverrides";
import type { EventData, GeneralEventCategory } from "./eventSchema";
import { BUSINESS_EVENT_CATEGORIES, GENERAL_EVENT_CATEGORIES } from "./eventSchema";

/**
 * Build-time event taxonomy. The robot's event JSON is never edited. Every event is sorted here
 * from its title, description, organizer, venue and old categories, then `eventOverrides.ts` fixes
 * the ones the rules get wrong. The same rules are meant to be ported into Event Radar later.
 *
 * B2C (Eventbrite style): one topic and one format. B2B (Meetup style): one or more niches, plus
 * the recurring group that hosts the event, when it has one.
 */
export type Audience = "B2B" | "B2C";

export const B2C_TOPICS = [
  "Music & Nightlife",
  "Arts & Culture",
  "Family & Kids",
  "Food & Drink",
  "Outdoors & Sports",
  "Community",
] as const;
export type B2cTopic = (typeof B2C_TOPICS)[number];

export const B2C_FORMATS = [
  "Festival or Fair",
  "Concert or Show",
  "Class or Workshop",
  "Market",
  "Party",
  "Tour",
  "Game or Race",
  "Other",
] as const;
export type B2cFormat = (typeof B2C_FORMATS)[number];

/** The fixed B2B niche list. Each niche is one page per city. */
export const B2B_NICHES = [
  "networking",
  "chamber-of-commerce",
  "small-business-and-entrepreneurs",
  "tech-and-developers",
  "ai",
  "real-estate",
  "healthcare-training",
  "certifications-and-training",
  "women-in-business",
  "faith-and-business",
  "marketing",
  "career-and-job-fairs",
] as const;
export type B2bNiche = (typeof B2B_NICHES)[number];

export function isB2bNiche(value: string): value is B2bNiche {
  return (B2B_NICHES as readonly string[]).includes(value);
}

export interface EventTaxonomy {
  audience: Audience;
  /** B2C only. */
  topic?: B2cTopic;
  /** B2C only. */
  format?: B2cFormat;
  /** B2B only. The first niche is the primary one. */
  niches: B2bNiche[];
  /** B2B only. Slugs of the recurring groups that host the event. */
  groups: string[];
  /** Filter, not a topic. */
  free: boolean;
  /** Filter, not a topic. */
  holiday: boolean;
  source: "rules" | "override";
}

export interface EventOverride {
  audience?: Audience;
  topic?: B2cTopic;
  format?: B2cFormat;
  niches?: B2bNiche[];
  groups?: string[];
  note?: string;
}

// ---------------------------------------------------------------------------------------------
// Step 1: audience
// ---------------------------------------------------------------------------------------------

/** Things that look like business events in the old categories or the description, but are not. */
const B2C_FIRST: RegExp[] = [
  /small business (saturday|weekend)/i,
  /\b(santa|mrs\.? claus|grinch|character breakfast)\b/i,
  /new friends|\bsingles\b|speed social/i,
  /\b(wreath|ornaments?|charcuterie|terrarium|cookie decorating|doormat|quilt|pressed flower)\b/i,
  /book (club|cabal)|sound bath|paranormal|jiu-jitsu|\bmma\b|winter jam/i,
  /turkey trot|\b5k\b|fun run|drumstick dash/i,
  /public meeting|action plan/i,
  /thanksgiving (brunch|buffet|feast|day|meal)|holiday meal/i,
  /fellowship gathering|coffee club/i,
  /commencement|christmas parade|open house/i,
];

interface NicheRule {
  niche: B2bNiche;
  /** Matches title, description, organizer and venue. */
  test: RegExp;
  /** Only adds the niche to an event that is already B2B. Never makes an event B2B on its own. */
  modifier?: boolean;
  /** Reads only the title and organizer. For niches whose words show up in unrelated descriptions. */
  titleOnly?: boolean;
}

const NICHE_RULES: NicheRule[] = [
  { niche: "networking", test: /networking|\bmixer\b|mastermind|roundtable|\bhuddle\b|referral|business (mixer|after hours)|good morning, springfield|state of the community|faith at work/i },
  { niche: "chamber-of-commerce", test: /chamber of commerce|chamber (gives|party)|\bchamber\b.*\b(party|luncheon|mixer|after hours)\b/i },
  { niche: "small-business-and-entrepreneurs", titleOnly: true, test: /entrepreneur|startup|start-up|small[- ]business owners?|business owners?|from fog to focus|passion with profession/i },
  { niche: "tech-and-developers", test: /developers?|\bdevs\b|open sgf|code night|software|\bcoding\b|hackathon|women in tech/i },
  { niche: "ai", test: /\bai\b|artificial intelligence|machine learning|chatgpt/i },
  { niche: "real-estate", titleOnly: true, test: /real estate|realtors?\b|\bthe agent playbook\b|licensed agent/i },
  { niche: "healthcare-training", test: /\b(acls|bls|nrp|pals)\b|s\.t\.a\.b\.l\.e|fetal monitoring|stroke conference|awhonn|provider course|\bce credits?\b|cox ?health education/i },
  { niche: "certifications-and-training", test: /\bpmp\b|\bpmi\b|certification (training|course|class)|exam prep|continuing education/i },
  { niche: "women-in-business", test: /\bwomen\b|\bwoman\b/i, modifier: true },
  { niche: "faith-and-business", test: /faith at work/i },
  { niche: "marketing", test: /marketing (workshop|meetup|summit|class|mastermind)|digital marketing|\bseo\b/i },
  { niche: "career-and-job-fairs", test: /job fair|career fair|career night|hiring event/i },
];

/** Words that make an event a business one without naming a niche. They set B2B and add `networking`. */
const BUSINESS_NETWORKING_HINT = /business networking|business audience|professional networking/i;

// ---------------------------------------------------------------------------------------------
// Step 2a: B2C topic and format
// ---------------------------------------------------------------------------------------------

const TITLE_TOPICS: [RegExp, B2cTopic][] = [
  [/\b(santa|mrs\.? claus|grinch|kids|children|story ?time|character breakfast|playhouse)\b/i, "Family & Kids"],
  [/\b(5k|trot|dash|fun run|\brun\b|race|tournament|hike|bike)\b/i, "Outdoors & Sports"],
  [/\b(buffet|brunch|feast|dinner|breakfast|pancakes|coffee|brew|tasting|wine|meal|cookie|foodies)\b/i, "Food & Drink"],
  [/\b(concert|live music|karaoke|jam|dj|tour)\b/i, "Music & Nightlife"],
  [/\b(theat(er|re)|ballet|nutcracker|gallery|museum|comedy|film|movie|symphony|book|art|paint)\b/i, "Arts & Culture"],
];

const CATEGORY_TOPICS: [string, B2cTopic][] = [
  ["live-music", "Music & Nightlife"],
  ["arts-and-theater", "Arts & Culture"],
  ["comedy", "Arts & Culture"],
  ["film", "Arts & Culture"],
  ["family", "Family & Kids"],
  ["kids", "Family & Kids"],
  ["food-and-drink", "Food & Drink"],
  ["sports", "Outdoors & Sports"],
  ["outdoors", "Outdoors & Sports"],
];

/** The old city category page a B2C topic maps to when an event has no usable old category. */
const TOPIC_DEFAULT_CATEGORY: Record<B2cTopic, GeneralEventCategory> = {
  "Music & Nightlife": "live-music",
  "Arts & Culture": "arts-and-theater",
  "Family & Kids": "family",
  "Food & Drink": "food-and-drink",
  "Outdoors & Sports": "outdoors",
  Community: "community",
};

function b2cTopic(event: EventData, text: string): B2cTopic {
  for (const [pattern, topic] of TITLE_TOPICS) if (pattern.test(event.title)) return topic;
  for (const [category, topic] of CATEGORY_TOPICS) if (event.categories.includes(category)) return topic;
  for (const [pattern, topic] of TITLE_TOPICS) if (pattern.test(text)) return topic;
  return "Community";
}

function b2cFormat(event: EventData, text: string): B2cFormat {
  const title = event.title;
  const cats = event.categories;
  if (/\b(5k|trot|dash|fun run|race|tournament|trivia)\b/i.test(title)) return "Game or Race";
  if (/\b(class|workshop|seminar|lesson|diy|paint|decorating|wreath|sound bath)\b/i.test(title)) return "Class or Workshop";
  if (/\b(market|marketplace|bazaar|craft show|flea|small business saturday)\b/i.test(title)) return "Market";
  if (cats.includes("live-music") || cats.includes("comedy") || cats.includes("arts-and-theater") || cats.includes("film")) {
    if (!/\b(party|breakfast|brunch|dinner|buffet|feast|pancakes)\b/i.test(title)) return "Concert or Show";
  }
  if (/\b(tour|trail|trolley|guided)\b/i.test(title)) return "Tour";
  if (/\b(festival|fair|parade|carnival|lights)\b/i.test(title) || cats.includes("festivals")) return "Festival or Fair";
  if (/\b(party|social|club|breakfast|brunch|dinner|buffet|feast|pancakes|santa|claus|gathering|open house|get together)\b/i.test(title)) return "Party";
  if (/\b(concert|show|performance|play|musical|story ?time)\b/i.test(text)) return "Concert or Show";
  return "Other";
}

// ---------------------------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------------------------

function organizerName(event: EventData): string {
  return event.organizer?.name?.trim() ?? "";
}

function venueText(event: EventData): string {
  const v = event.venue;
  if (!v) return "";
  return typeof v === "string" ? v : (v.name ?? "");
}

function eventText(event: EventData): string {
  return [event.title, event.description ?? "", organizerName(event), venueText(event)].join(" ");
}

function isFree(event: EventData): boolean {
  if (event.free === true || event.is_free === true) return true;
  const p = event.price;
  return typeof p === "string" && /^\s*free\s*$/i.test(p);
}

const HOLIDAY = /christmas|santa|claus|grinch|thanksgiving|turkey|holiday|hanukkah|new year|halloween|valentine|easter|independence day|giving tuesday|wreath|ornament|nutcracker/i;

function isHoliday(event: EventData): boolean {
  return event.categories.includes("holiday") || HOLIDAY.test(event.title);
}

function groupsFor(event: EventData): string[] {
  const hay = `${event.title} ${organizerName(event)}`;
  const slugs: string[] = [];
  for (const group of NETWORKING_GROUPS) {
    if (group.match?.test(hay) && !slugs.includes(group.slug)) slugs.push(group.slug);
  }
  return slugs;
}

function ruleNiches(event: EventData): B2bNiche[] {
  const text = eventText(event);
  const head = `${event.title} ${organizerName(event)}`;
  const matches = (rule: NicheRule) => rule.test.test(rule.titleOnly ? head : text);
  const core = NICHE_RULES.filter((rule) => !rule.modifier && matches(rule)).map((rule) => rule.niche);
  const hint = BUSINESS_NETWORKING_HINT.test(text);
  if (core.length === 0 && !hint) return [];
  const niches = new Set<B2bNiche>(core);
  if (hint) niches.add("networking");
  for (const rule of NICHE_RULES) if (rule.modifier && matches(rule)) niches.add(rule.niche);
  return B2B_NICHES.filter((niche) => niches.has(niche));
}

function applyOverride(base: EventTaxonomy, override: EventOverride): EventTaxonomy {
  const audience = override.audience ?? base.audience;
  const next: EventTaxonomy = { ...base, audience, source: "override" };
  if (audience === "B2B") {
    next.niches = override.niches ?? base.niches;
    if (next.niches.length === 0) next.niches = ["networking"];
    next.groups = override.groups ?? base.groups;
    delete next.topic;
    delete next.format;
  } else {
    next.niches = [];
    next.groups = [];
    next.topic = override.topic ?? base.topic ?? "Community";
    next.format = override.format ?? base.format ?? "Other";
  }
  return next;
}

const cache = new WeakMap<EventData, EventTaxonomy>();

export function classifyEvent(event: EventData): EventTaxonomy {
  const hit = cache.get(event);
  if (hit) return hit;
  const text = eventText(event);
  const b2cByRule = B2C_FIRST.some((pattern) => pattern.test(event.title) || pattern.test(`${event.title} ${event.description ?? ""}`));
  const niches = b2cByRule ? [] : ruleNiches(event);
  const audience: Audience = niches.length > 0 ? "B2B" : "B2C";
  const base: EventTaxonomy = {
    audience,
    niches,
    groups: audience === "B2B" ? groupsFor(event) : [],
    free: isFree(event),
    holiday: isHoliday(event),
    source: "rules",
  };
  if (audience === "B2C") {
    base.topic = b2cTopic(event, text);
    base.format = b2cFormat(event, text);
  }
  const override = EVENT_OVERRIDES[event.id];
  const result = override ? applyOverride(base, override) : base;
  cache.set(event, result);
  return result;
}

export function isB2b(event: EventData): boolean {
  return classifyEvent(event).audience === "B2B";
}

export function isB2c(event: EventData): boolean {
  return classifyEvent(event).audience === "B2C";
}

/**
 * The old city category pages an event belongs to. B2B events are on none of them. A B2C event keeps
 * its general categories; one with none (a Santa breakfast the robot tagged "networking") falls back
 * to the page its B2C topic maps to.
 */
export function generalCategoriesOf(event: EventData): GeneralEventCategory[] {
  const tax = classifyEvent(event);
  if (tax.audience === "B2B") return [];
  const own = GENERAL_EVENT_CATEGORIES.filter((slug) => event.categories.includes(slug));
  if (own.length > 0) return own;
  // Only an event the robot tagged as a business one needs a new home. Others keep no category page.
  if (!event.categories.some((c) => (BUSINESS_EVENT_CATEGORIES as readonly string[]).includes(c))) return [];
  return [TOPIC_DEFAULT_CATEGORY[tax.topic ?? "Community"]];
}

export function inGeneralCategory(event: EventData, category: string): boolean {
  return (generalCategoriesOf(event) as string[]).includes(category);
}
