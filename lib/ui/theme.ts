/**
 * Design tokens.
 *
 * The palette is fixed to three brand colours:
 *   #26A1DA  sky   — interactive accent, focus, links, live indicators
 *   #025094  deep  — brand, primary surfaces, user turns, primary actions
 *   #FFFFFF  paper — content surfaces
 *
 * Everything else is a neutral or a state colour derived to sit with them.
 * Semantic state colours (verified / review due / stale) are deliberately not
 * brand blues: a freshness indicator that reads as "brand" defeats FR-64.
 *
 * ── ON THE NEUTRALS ────────────────────────────────────────────────────────
 * The greys are not pure greys. Each carries a small amount of the deep hue, so
 * that a border beside a brand surface reads as part of the same family rather
 * than as a foreign grey laid on top. This is the difference between a palette
 * and a list of colours, and it is most visible where neutrals and brand meet:
 * source card rules, the composer border, sidebar dividers.
 *
 * ── ON ELEVATION ───────────────────────────────────────────────────────────
 * Shadows are tinted with the ink hue rather than black. A black shadow over a
 * blue-tinted page reads as dirt; a hue-matched one reads as depth. They are
 * kept shallow deliberately — NFR-15 targets low-end Android, and large blurred
 * shadows are the cheapest way to make a page scroll badly on those devices.
 */
export const T = {
  sky: "#26A1DA",
  skyDeep: "#1B87BB",
  skyWash: "#EAF6FC",
  skyLine: "#BFE2F4",

  deep: "#025094",
  deepHover: "#01427B",
  deepWash: "#EDF3F9",

  paper: "#FFFFFF",
  page: "#F4F8FB",

  ink: "#0B2237",
  inkSoft: "#4E657C",
  inkFaint: "#8399AC",

  line: "#DDE7EF",
  lineSoft: "#EDF2F7",

  green: "#0F7B55",
  greenWash: "#E8F6F0",

  /**
   * Notice — replaces the former amber. Used for the escalation callout, the
   * internal-view warning, and the "review due" freshness state.
   *
   * `notice` is the specified #4295F5 and is used for borders, icons, and fills,
   * where contrast requirements are lower. `noticeText` is the same hue darkened
   * to clear 4.5:1 against white for the small type these callouts use — #4295F5
   * measures about 3.0:1, which fails WCAG AA below 18.66px bold, and every one
   * of these labels is smaller than that. Two tokens rather than one is what
   * keeps the brand colour visible without making the words hard to read.
   */
  notice: "#4295F5",
  noticeText: "#1A5FBF",
  noticeWash: "#EEF5FE",
  noticeLine: "#C7DEFB",

  red: "#A32121",
  redWash: "#FBEDED",
  redLine: "#EFC9C9",

  /** Ink-tinted elevation. See the note above on why these stay shallow. */
  shadowSm: "0 1px 2px rgba(11,34,55,0.05)",
  shadowMd: "0 1px 2px rgba(11,34,55,0.04), 0 4px 12px rgba(11,34,55,0.06)",
  shadowLg: "0 2px 4px rgba(11,34,55,0.04), 0 12px 32px rgba(11,34,55,0.10)",

  /** Focus ring, as a shadow, for controls that cannot take an outline cleanly. */
  ringSky: "0 0 0 3px rgba(38,161,218,0.18)",
} as const;

/**
 * Height of the deep brand bar across the top of the app. The sidebar lockup and
 * the main header are separate elements that abut, so they share this rather than
 * each carrying padding that happens to agree today.
 */
export const BRAND_BAR_HEIGHT = 56;

export const fontStack =
  "'Kantumruy Pro', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";

export const monoStack =
  "'IBM Plex Mono', ui-monospace, 'Cascadia Mono', Consolas, monospace";
