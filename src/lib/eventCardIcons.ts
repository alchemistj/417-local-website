import type { CardPaletteId } from "./eventCard";

export interface CardIcon {
  paths: readonly string[];
  fillRule?: "evenodd";
}

/** Simple filled marks. Drawn for the card, not taken from an icon font or emoji. */
export const CARD_ICONS: Record<CardPaletteId, CardIcon> = {
  "live-music": {
    paths: [
      "M5.5 17.6a2.7 2.7 0 1 0 5.4 0 2.7 2.7 0 1 0-5.4 0z",
      "M13.4 15.2a2.7 2.7 0 1 0 5.4 0 2.7 2.7 0 1 0-5.4 0z",
      "M10.2 4.4h1.9v10.6h-1.9z",
      "M18.1 5.6h1.9v7h-1.9z",
      "M10.2 4.4h9.8v2.1H10.2z",
    ],
  },
  "arts-and-theater": {
    fillRule: "evenodd",
    paths: [
      "M4 4h16v16H4V4zm2.2 2.2v11.6h11.6V6.2H6.2z",
      "M8 14.6l2.4-3.1 1.8 2.1 2.2-2.8 2.6 3.8H8z",
    ],
  },
  family: {
    paths: [
      "M8.2 10.2a2.5 2.5 0 1 0 .01-5 2.5 2.5 0 0 0-.01 5z",
      "M16.4 10.6a2.1 2.1 0 1 0 .01-4.2 2.1 2.1 0 0 0-.01 4.2z",
      "M3.6 19.2c.5-3.1 2.4-4.6 4.6-4.6s4.1 1.5 4.6 4.6H3.6z",
      "M12.8 19.2c.35-2.4 1.7-3.6 3.5-3.6 1.7 0 3 1.1 3.4 3.6h-6.9z",
    ],
  },
  holiday: {
    paths: ["M12 2.2l2.15 6.55h6.9l-5.58 4.05 2.13 6.55L12 15.35 6.4 19.35l2.13-6.55L2.95 8.75h6.9L12 2.2z"],
  },
  festivals: {
    paths: ["M4.2 2.4h2.3V21H4.2V2.4z", "M6.5 3.2H19l-3.1 4.3L19 11.8H6.5V3.2z"],
  },
  sports: {
    paths: [
      "M8 3h8v6.4a4 4 0 0 1-8 0V3z",
      "M8 4.6H4.4v2.2A3.4 3.4 0 0 0 7.6 10H8V4.6z",
      "M16 4.6h3.6v2.2A3.4 3.4 0 0 1 16.4 10H16V4.6z",
      "M10.6 14.2h2.8V17H17v2.2H7V17h3.6v-2.8z",
    ],
  },
  outdoors: {
    paths: ["M1.8 19.6 8.6 8.2l3.8 5.2 2.7-3.6L22.2 19.6H1.8z", "M17.4 6.6a2.15 2.15 0 1 0 .01-4.3 2.15 2.15 0 0 0-.01 4.3z"],
  },
  community: {
    paths: [
      "M6.1 9.4a2 2 0 1 0 .01-4 2 2 0 0 0-.01 4z",
      "M12 8.4a2.35 2.35 0 1 0 .01-4.7 2.35 2.35 0 0 0-.01 4.7z",
      "M17.9 9.4a2 2 0 1 0 .01-4 2 2 0 0 0-.01 4z",
      "M2.8 19.4c.45-2.6 2-3.9 3.8-3.9 1.15 0 2.1.55 2.7 1.45.55-1.35 1.7-2.15 3.2-2.15 1.5 0 2.65.8 3.2 2.15.6-.9 1.55-1.45 2.7-1.45 1.8 0 3.35 1.3 3.8 3.9H2.8z",
    ],
  },
  "food-and-drink": {
    paths: [
      "M4.6 3.2h1.35V8h1.15V3.2h1.35V8h1.15V3.2H11v5.6c0 1.35-.9 2.2-2.3 2.45V20.6H6.9v-9.35C5.5 10.8 4.6 9.95 4.6 8.6V3.2z",
      "M13.4 3.4h6.4v6.2a3.2 3.2 0 0 1-6.4 0V3.4z",
      "M15.6 13.4h2v7.2h-2z",
    ],
  },
  comedy: {
    paths: [
      "M12 2.2a3.5 3.5 0 0 0-3.5 3.5v5.6a3.5 3.5 0 0 0 7 0V5.7A3.5 3.5 0 0 0 12 2.2z",
      "M6.8 10.8a1.35 1.35 0 0 0-2.7.15 7.4 7.4 0 0 0 6.2 7.15V20.2H7.4V22h9.2v-1.8h-2.9v-2.1a7.4 7.4 0 0 0 6.2-7.15 1.35 1.35 0 0 0-2.7-.15 4.7 4.7 0 0 1-9.4 0z",
    ],
  },
  film: {
    fillRule: "evenodd",
    paths: [
      "M4 3.2h16v17.6H4V3.2zm2.3 2.2v13.2h11.4V5.4H6.3zM4 7.2h2.3V9.4H4V7.2zm0 4h2.3v2.2H4V11.2zm0 4h2.3v2.2H4v-2.2zm13.7-8H20V9.4h-2.3V7.2zm0 4H20v2.2h-2.3v-2.2zm0 4H20v2.2h-2.3v-2.2z",
    ],
  },
  business: {
    paths: [
      "M9.4 6.8V5.2A1.6 1.6 0 0 1 11 3.6h2a1.6 1.6 0 0 1 1.6 1.6v1.6H20V20H4V6.8h5.4zm1.8 0h1.6V5.4h-1.6v1.4z",
      "M4 11.4h16v1.8H4v-1.8z",
    ],
  },
  neutral: {
    paths: [
      "M7 4.2h2.1v3.2H7V4.2z",
      "M14.9 4.2H17v3.2h-2.1V4.2z",
      "M5.2 6.2h13.6A1.6 1.6 0 0 1 20.4 7.8v11.2a1.6 1.6 0 0 1-1.6 1.6H5.2a1.6 1.6 0 0 1-1.6-1.6V7.8a1.6 1.6 0 0 1 1.6-1.6zm0 4.6v8.2h13.6v-8.2H5.2z",
    ],
  },
};

export function categoryIcon(id: CardPaletteId): CardIcon {
  return CARD_ICONS[id];
}

/** Standalone SVG markup for the share image. */
export function categoryIconSvg(id: CardPaletteId): string {
  const icon = CARD_ICONS[id];
  const rule = icon.fillRule ? ` fill-rule="${icon.fillRule}"` : "";
  const paths = icon.paths.map((d) => `<path${rule} d="${d}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white">${paths}</svg>`;
}
