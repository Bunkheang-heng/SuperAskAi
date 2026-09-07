import { describe, it, expect } from "vitest";
import {
  seeksRationale,
  explainsRationale,
  rationaleGap,
} from "@/lib/engine/rationale";

/**
 * The failure this module exists to stop: a citizen asked why the late penalty
 * exists, and the answer restated the rule as its own justification. Every
 * clause was supported, so the FR-15 gate passed it — verification checks that
 * claims are SUPPORTED, not that they are INFORMATIVE, and a tautology is
 * perfectly supported.
 */

describe("seeksRationale", () => {
  it.each([
    "why is there a late fee",
    "but why though",
    "how come the penalty applies",
    "for what reason is this required",
    "what is the reason for the late fee",
    "what's the purpose of the family book",
    "the rationale behind this rule",
    "what is it for",
  ])("detects English rationale-seeking: %s", (q) => {
    expect(seeksRationale(q)).toBe(true);
  });

  it.each([
    "ហេតុអ្វីបានជាមានការពិន័យយឺតយ៉ាវ",
    "មូលហេតុអ្វី",
    "ម្តេចបានជាត្រូវបង់ថ្លៃ",
  ])("detects Khmer rationale-seeking (FR-08): %s", (q) => {
    expect(seeksRationale(q)).toBe(true);
  });

  it("detects romanised Khmer 'why'", () => {
    expect(seeksRationale("het avei trauv bang thlai")).toBe(true);
  });

  it.each([
    "how do i renew my driving licence",
    "what documents do i need",
    "where is the office",
    "what is the fee",
  ])("does not fire on a procedure question: %s", (q) => {
    expect(seeksRationale(q)).toBe(false);
  });
});

describe("explainsRationale", () => {
  it.each([
    "The deadline exists in order to keep the register accurate.",
    "The fee is charged so that the service can be maintained.",
    "This requirement is intended to prevent fraud.",
    "The purpose of the inspection is road safety.",
    "The penalty applies because late registration burdens the register.",
    "The cap aims to protect consumers.",
    "Photographs are required to ensure identity can be confirmed.",
  ])("finds a purpose clause: %s", (text) => {
    expect(explainsRationale(text)).toBe(true);
  });

  it.each([
    "To renew a driving licence, bring the old licence and an identity card.",
    "A licence expired for more than 30 days is subject to a daily penalty.",
    "Registration must occur within 30 days of the birth.",
    "The fee is 30,000 riel, payable at the counter.",
  ])("does not mistake procedural infinitives for a reason: %s", (text) => {
    expect(explainsRationale(text)).toBe(false);
  });
});

describe("rationaleGap", () => {
  it("is true when the citizen asks why and the source only states the rule", () => {
    // The exact MPWT-DL-008 shape from the module docstring.
    expect(
      rationaleGap("why is there a late fee", [
        "If the licence has been expired for more than 30 days, a penalty of 500 riel per day applies.",
      ]),
    ).toBe(true);
  });

  it("is false when the source does give a reason", () => {
    expect(
      rationaleGap("why is there a late fee", [
        "A daily penalty applies in order to discourage late renewal and keep the register current.",
      ]),
    ).toBe(false);
  });

  it("is false when the citizen did not ask for a reason", () => {
    expect(
      rationaleGap("what is the late fee", [
        "A penalty of 500 riel per day applies.",
      ]),
    ).toBe(false);
  });

  it("is true when there are no sources at all to carry a reason", () => {
    expect(rationaleGap("why is there a late fee", [])).toBe(true);
  });

  it("is satisfied by any one source in the set explaining", () => {
    expect(
      rationaleGap("why is this required", [
        "A penalty of 500 riel per day applies.",
        "The requirement exists to prevent fraudulent applications.",
      ]),
    ).toBe(false);
  });

  it("is scoped to the sources passed in — the caller must pass only the top source", () => {
    // Passing the whole candidate set defeats the check: a stray purpose clause
    // in an unrelated low-ranked chunk reports the reason as found. This test
    // pins the behaviour so the call site's narrowing stays load-bearing.
    const strayNbcChunk =
      "Interest rate caps exist to protect consumers from excessive charges.";
    const topSource =
      "If the licence has been expired for more than 30 days, a penalty applies.";

    expect(rationaleGap("why is there a late fee", [topSource])).toBe(true);
    expect(rationaleGap("why is there a late fee", [topSource, strayNbcChunk])).toBe(
      false,
    );
  });
});
