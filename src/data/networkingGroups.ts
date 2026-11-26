/**
 * Networking groups that meet every week or month in the Springfield area.
 * Every line here comes from the group's own website, fetched on `checkedOn`.
 * `when` and `cost` are filled only when the source says so. Leave them out otherwise.
 */
export interface NetworkingGroup {
  /** URL slug of the group page. Entries that share a slug are programs of one group. */
  slug: string;
  /** Name of the group, shown as the page H1. */
  groupName: string;
  citySlug: string;
  state: string;
  /** B2B niche pages that list the group. */
  niches: readonly string[];
  /** Matches an event's title and organizer name to this group. */
  match?: RegExp;
  name: string;
  /** One sentence: what the group is. */
  what: string;
  /** When it meets, only if the source states it. */
  when?: string;
  /** Cost or membership, only if the source states it. */
  cost?: string;
  /** Official link shown to readers. */
  url: string;
  /** The page the facts were read from. */
  sourceUrl: string;
  checkedOn: string;
}

export const NETWORKING_GROUPS: NetworkingGroup[] = [
  {
    slug: "springfield-area-chamber",
    groupName: "Springfield Area Chamber of Commerce",
    citySlug: "springfield",
    state: "MO",
    niches: ["chamber-of-commerce", "networking"],
    match: /springfield area chamber|good morning, springfield|business after hours|biz blitz/i,
    name: "Springfield Area Chamber of Commerce: Business After Hours",
    what: "The Chamber's networking event for members, hosted at a new location each month, with food and drink specials and door prizes.",
    when: "Monthly, 4 to 6 p.m.",
    url: "https://www.springfieldchamber.com/networking-events/",
    sourceUrl: "https://www.springfieldchamber.com/networking-events/",
    checkedOn: "2026-11-25",
  },
  {
    slug: "springfield-area-chamber",
    groupName: "Springfield Area Chamber of Commerce",
    citySlug: "springfield",
    state: "MO",
    niches: ["chamber-of-commerce", "networking"],
    name: "Springfield Area Chamber of Commerce: Biz Blitz",
    what: "A Chamber event that helps you meet new people and make connections faster.",
    when: "Quarterly, with a morning edition at 7:30 a.m. (breakfast provided) and an afternoon edition at 4 p.m.",
    url: "https://www.springfieldchamber.com/networking-events/",
    sourceUrl: "https://www.springfieldchamber.com/networking-events/",
    checkedOn: "2026-11-25",
  },
  {
    slug: "the-network",
    groupName: "The Network",
    citySlug: "springfield",
    state: "MO",
    niches: ["networking"],
    match: /\bthe network\b|coffee (&|and) connect/i,
    name: "The Network: Coffee & Connect",
    what: "A regular event series from The Network, the Chamber's group for Springfield professionals under 40.",
    cost: "Membership dues cover entry to all regular monthly events.",
    url: "https://thenetworkspringfield.com/",
    sourceUrl: "https://thenetworkspringfield.com/about/",
    checkedOn: "2026-11-25",
  },
  {
    slug: "we-and-co",
    groupName: "We&Co",
    citySlug: "springfield",
    state: "MO",
    niches: ["networking", "small-business-and-entrepreneurs"],
    match: /we ?& ?co\b|we and co\b/i,
    name: "We&Co Huddles",
    what: "Small referral groups of 8 to 12 Springfield and Joplin professionals who share a target audience but do not compete.",
    when: "Each Huddle meets twice a month.",
    cost: "Your first visit is free.",
    url: "https://weandco.com/",
    sourceUrl: "https://weandco.com/",
    checkedOn: "2026-11-25",
  },
  {
    slug: "mega-417",
    groupName: "MEGA 417",
    citySlug: "springfield",
    state: "MO",
    niches: ["networking"],
    match: /mega ?417/i,
    name: "MEGA 417",
    what: "A multi-chapter business networking group that accepts one professional per category in each chapter.",
    when: "12 chapters, each meeting on a weekly or monthly schedule.",
    url: "https://mega417.com/",
    sourceUrl: "https://mega417.com/",
    checkedOn: "2026-11-25",
  },
  {
    slug: "courageous-business-connect",
    groupName: "Courageous Business Connect",
    citySlug: "springfield",
    state: "MO",
    niches: ["networking", "small-business-and-entrepreneurs"],
    match: /courageous business connect/i,
    name: "Courageous Business Connect",
    what: "A Springfield business community with weekly meetings at several area locations and no attendance policy or category exclusivity.",
    when: "Weekly, Monday through Friday, at different Springfield-area locations.",
    cost: "Visit up to 3 meetings on a trial basis, then choose a monthly or yearly membership.",
    url: "https://courageousbusinessconnect.com/",
    sourceUrl: "https://courageousbusinessconnect.com/join/",
    checkedOn: "2026-11-25",
  },
  {
    slug: "open-sgf",
    groupName: "Open SGF",
    citySlug: "springfield",
    state: "MO",
    niches: ["tech-and-developers"],
    match: /open sgf/i,
    name: "Open SGF",
    what: "A volunteer group of designers and developers in Springfield that builds technology for the local community.",
    when: "A weekly Code Night and a monthly Code & Demo Night.",
    url: "https://www.meetup.com/open-sgf/",
    sourceUrl: "https://www.meetup.com/open-sgf/",
    checkedOn: "2026-11-26",
  },
  {
    slug: "springfield-devs",
    groupName: "Springfield Devs",
    citySlug: "springfield",
    state: "MO",
    niches: ["tech-and-developers"],
    match: /springfield devs|sgfdevs/i,
    name: "Springfield Devs",
    what: "A group for anyone with a fondness for software development, covering any and all things dev.",
    when: "A monthly Dev Night, typically the first Wednesday evening.",
    url: "https://www.meetup.com/sgfdevs/",
    sourceUrl: "https://www.meetup.com/sgfdevs/",
    checkedOn: "2026-11-26",
  },
  {
    slug: "springfield-women-in-technology",
    groupName: "Springfield Women in Technology",
    citySlug: "springfield",
    state: "MO",
    niches: ["tech-and-developers", "women-in-business"],
    match: /women in tech/i,
    name: "Springfield Women in Technology",
    what: "A group for anyone committed to expanding the number of women and gender minorities in technology, with connections, collaboration and learning on technical subjects.",
    url: "https://www.meetup.com/springfield-women-in-technology/",
    sourceUrl: "https://www.meetup.com/springfield-women-in-technology/",
    checkedOn: "2026-11-26",
  },
  {
    slug: "ai-for-real-estate-agents-mastermind",
    groupName: "AI for Real Estate Agents Mastermind",
    citySlug: "springfield",
    state: "MO",
    niches: ["real-estate", "ai"],
    match: /ai for real estate agents/i,
    name: "AI for Real Estate Agents Mastermind",
    what: "A monthly, in-person mastermind for real estate agents who want practical ways to use AI to serve clients and grow their business.",
    when: "The first Tuesday of every month, 7:30 to 9:00 a.m.",
    cost: "Free to attend.",
    url: "https://www.meetup.com/ai-for-real-estate-agents-mastermind/",
    sourceUrl: "https://www.meetup.com/ai-for-real-estate-agents-mastermind/",
    checkedOn: "2026-11-26",
  },
];
