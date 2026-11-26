/**
 * Networking groups that meet every week or month in the Springfield area.
 * Every line here comes from the group's own website, fetched on `checkedOn`.
 * `when` and `cost` are filled only when the source says so. Leave them out otherwise.
 */
export interface NetworkingGroup {
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
    name: "Springfield Area Chamber of Commerce: Business After Hours",
    what: "The Chamber's networking event for members, hosted at a new location each month, with food and drink specials and door prizes.",
    when: "Monthly, 4 to 6 p.m.",
    url: "https://www.springfieldchamber.com/networking-events/",
    sourceUrl: "https://www.springfieldchamber.com/networking-events/",
    checkedOn: "2026-11-25",
  },
  {
    name: "Springfield Area Chamber of Commerce: Biz Blitz",
    what: "A Chamber event that helps you meet new people and make connections faster.",
    when: "Quarterly, with a morning edition at 7:30 a.m. (breakfast provided) and an afternoon edition at 4 p.m.",
    url: "https://www.springfieldchamber.com/networking-events/",
    sourceUrl: "https://www.springfieldchamber.com/networking-events/",
    checkedOn: "2026-11-25",
  },
  {
    name: "The Network: Coffee & Connect",
    what: "A regular event series from The Network, the Chamber's group for Springfield professionals under 40.",
    cost: "Membership dues cover entry to all regular monthly events.",
    url: "https://thenetworkspringfield.com/",
    sourceUrl: "https://thenetworkspringfield.com/about/",
    checkedOn: "2026-11-25",
  },
  {
    name: "We&Co Huddles",
    what: "Small referral groups of 8 to 12 Springfield and Joplin professionals who share a target audience but do not compete.",
    when: "Each Huddle meets twice a month.",
    cost: "Your first visit is free.",
    url: "https://weandco.com/",
    sourceUrl: "https://weandco.com/",
    checkedOn: "2026-11-25",
  },
  {
    name: "MEGA 417",
    what: "A multi-chapter business networking group that accepts one professional per category in each chapter.",
    when: "12 chapters, each meeting on a weekly or monthly schedule.",
    url: "https://mega417.com/",
    sourceUrl: "https://mega417.com/",
    checkedOn: "2026-11-25",
  },
  {
    name: "Courageous Business Connect",
    what: "A Springfield business community with weekly meetings at several area locations and no attendance policy or category exclusivity.",
    when: "Weekly, Monday through Friday, at different Springfield-area locations.",
    cost: "Visit up to 3 meetings on a trial basis, then choose a monthly or yearly membership.",
    url: "https://courageousbusinessconnect.com/",
    sourceUrl: "https://courageousbusinessconnect.com/join/",
    checkedOn: "2026-11-25",
  },
];
