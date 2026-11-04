/**
 * Design tokens — follows the SuperAsk Figma (blue → teal).
 *
 *   #046EC5  blue  — brand, primary actions, user turns, links
 *   #64E8C7  teal  — "verified" accent, gradient end
 *   #FFFFFF  paper — content surfaces
 *
 * The signature brand surface is the 135° blue → teal gradient (T.gradient).
 * Teal is a light colour: it is used for dots, fills and the gradient, never
 * for small text on white. Text that needs to read as "verified" uses
 * T.tealText, which keeps the hue but clears WCAG AA on white.
 *
 * Semantic state colours (verified / review due / stale) stay distinct from
 * the brand blue: a freshness indicator that reads as "brand" defeats FR-64.
 *
 * Shadows are kept shallow deliberately — NFR-15 targets low-end Android, and
 * large blurred shadows are the cheapest way to make a page scroll badly.
 */
export const T = {
  sky: "#046EC5",
  skyDeep: "#035A9F",
  skyWash: "#EFF6FF",
  skyLine: "#BBDFFC",

  deep: "#046EC5",
  deepHover: "#035A9F",
  deepWash: "#F0F9FF",

  teal: "#64E8C7",
  tealText: "#0A7D63",
  tealWash: "#ECFDF7",

  /** Dark surfaces: chat sidebar, features band. */
  slate: "#1E2939",
  /** Footer. */
  night: "#030712",

  paper: "#FFFFFF",
  page: "#F8FAFC",
  /** Chat canvas behind the message cards. */
  canvas: "#EEF2F7",
  /** Alternate marketing section background. */
  mist: "#FAFBFC",

  ink: "#101828",
  inkSoft: "#4A5565",
  inkFaint: "#99A1AF",

  line: "#E8EDF2",
  lineSoft: "#F1F5F9",
  lineStrong: "#D0D5DD",

  green: "#0A7D63",
  greenWash: "#ECFDF7",

  /** Notice — amber, for callouts, escalation and review-due indicators. */
  notice: "#F79009",
  noticeText: "#B54708",
  noticeWash: "#FFFAEB",
  noticeLine: "#FEDF89",

  red: "#D92D20",
  redWash: "#FEF3F2",
  redLine: "#FECDCA",

  gradient: "linear-gradient(135deg,#046EC5,#64E8C7)",

  shadowSm: "0 1px 4px rgba(0,0,0,0.07)",
  shadowMd: "0 2px 8px rgba(0,0,0,0.07)",
  shadowLg: "0 8px 32px rgba(4,110,197,0.12)",

  /** Focus ring, as a shadow, tinted with brand blue. */
  ringSky: "0 0 0 3px rgba(4,110,197,0.18)",
} as const;

/** Height of the top bar in the chat app. */
export const BRAND_BAR_HEIGHT = 56;

export const fontStack =
  "'Inter', 'Noto Sans Khmer', system-ui, -apple-system, 'Segoe UI', sans-serif";

export const monoStack =
  "'IBM Plex Mono', ui-monospace, 'Cascadia Mono', Consolas, monospace";
