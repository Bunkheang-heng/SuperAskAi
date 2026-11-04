/**
 * Shared marketing-shell and auth copy. Landing page sections live in
 * lib/ui/landing.ts. Kept separate from chat UI strings so the citizen
 * assistant and the public site can evolve independently.
 */

export type Lang = "km" | "en";

export type Copy = { km: string; en: string };

export function t(copy: Copy, lang: Lang): string {
  return copy[lang];
}

export const MARKETING = {
  login: { km: "ចូលគណនី", en: "Log in" } satisfies Copy,
  register: { km: "បង្កើតគណនី", en: "Create account" } satisfies Copy,
  email: "info@superask.kh",

  // Auth
  loginHeadline: {
    km: "សួរអំពីសេវាសាធារណៈប្រកបដោយប្រភពផ្លូវការ",
    en: "Ask about government services with official sources",
  } satisfies Copy,
  loginHint: {
    km: "ចូលគណនី SuperAsk របស់អ្នក",
    en: "Log in to your SuperAsk account",
  } satisfies Copy,
  registerHeadline: {
    km: "បង្កើតគណនី SuperAsk",
    en: "Create your SuperAsk account",
  } satisfies Copy,
  registerHint: {
    km: "បំពេញព័ត៌មានខាងក្រោមដើម្បីចាប់ផ្តើម",
    en: "Fill in the details below to get started",
  } satisfies Copy,
  emailLabel: { km: "អាសយដ្ឋានអ៊ីម៉ែល", en: "Email address" } satisfies Copy,
  emailPlaceholder: {
    km: "ឧ. sokha@email.com",
    en: "e.g. sokha@email.com",
  } satisfies Copy,
  passwordLabel: { km: "ពាក្យសម្ងាត់", en: "Password" } satisfies Copy,
  passwordPlaceholder: {
    km: "យ៉ាងហោចណាស់ ៨ តួអក្សរ",
    en: "At least 8 characters",
  } satisfies Copy,
  confirmLabel: {
    km: "បញ្ជាក់ពាក្យសម្ងាត់",
    en: "Confirm password",
  } satisfies Copy,
  nameLabel: { km: "ឈ្មោះ", en: "Full name" } satisfies Copy,
  namePlaceholder: { km: "ឧ. សុខា", en: "e.g. Sokha" } satisfies Copy,
  noAccount: {
    km: "មិនទាន់មានគណនីទេ?",
    en: "Don't have an account?",
  } satisfies Copy,
  hasAccount: {
    km: "មានគណនីរួចហើយ?",
    en: "Already have an account?",
  } satisfies Copy,
  continueGuest: {
    km: "បន្តដោយមិនចូលគណនី",
    en: "Continue without an account",
  } satisfies Copy,
} as const;
