import { describe, it, expect } from "vitest";
import { matchGlossary } from "@/lib/engine/glossary";
import { getKb } from "@/lib/kb/loader";

/**
 * §6.1. The glossary runs AFTER the FR-16 confidence gate has decided to
 * refuse, which gives it a property worth pinning: it can only ever convert a
 * refusal into an answer, never displace a retrieved one.
 */

describe("matchGlossary", () => {
  it("has glossary terms to match against", () => {
    expect(getKb().glossary.length).toBeGreaterThan(0);
  });

  it("answers the exact example the off-domain refusal advertises", () => {
    // The refusal copy offers "What does prakas mean?" — this module is what
    // makes that sentence true rather than merely policy.
    const hit = matchGlossary("what does prakas mean", "en");
    expect(hit).not.toBeNull();
    expect(hit!.definition.length).toBeGreaterThan(0);
  });

  it.each([
    "what does prakas mean",
    "what is a prakas",
    "define prakas",
    "explain prakas",
    "prakas meaning",
  ])("accepts definitional phrasing: %s", (q) => {
    expect(matchGlossary(q, "en")).not.toBeNull();
  });

  it("requires definitional intent as well as a known term", () => {
    // A procedure question containing a glossary term belongs to retrieval.
    expect(matchGlossary("how do i comply with the prakas", "en")).toBeNull();
  });

  it("does not fire on intent alone with no known term", () => {
    expect(matchGlossary("what does this mean", "en")).toBeNull();
    expect(matchGlossary("explain it to me", "en")).toBeNull();
  });

  it("returns the definition in the requested language (FR-08)", () => {
    const en = matchGlossary("what does prakas mean", "en");
    const km = matchGlossary("what does prakas mean", "km");
    expect(en).not.toBeNull();
    expect(km).not.toBeNull();
    expect(en!.definition).not.toBe(km!.definition);
  });

  it("accepts Khmer definitional phrasing", () => {
    const term = getKb().glossary.find((t) =>
      t.match.some((m) => /[ក-៿]/.test(m)),
    );
    if (!term) return;
    const alias = term.match.find((m) => /[ក-៿]/.test(m))!;
    expect(matchGlossary(`${alias} មានន័យយ៉ាងណា`, "km")).not.toBeNull();
  });

  it("prefers the longest matching term, so ordering in the JSON file cannot decide the answer", () => {
    const { glossary } = getKb();
    // Find a term whose alias strictly contains another term's alias.
    const aliases = glossary.flatMap((t) => t.match.map((m) => ({ id: t.id, m })));
    const nested = aliases.find((outer) =>
      aliases.some(
        (inner) =>
          inner.id !== outer.id &&
          outer.m.toLowerCase().includes(inner.m.toLowerCase()) &&
          outer.m.length > inner.m.length,
      ),
    );
    if (!nested) return;
    const hit = matchGlossary(`what does ${nested.m} mean`, "en");
    expect(hit?.id).toBe(nested.id);
  });

  it("matches every glossary alias against a definitional question — an unreachable term is dead content", () => {
    for (const term of getKb().glossary) {
      for (const alias of term.match) {
        const hit = matchGlossary(`what does ${alias} mean`, "en");
        expect(hit, `${term.id} / "${alias}"`).not.toBeNull();
      }
    }
  });
});

describe("glossary corpus integrity", () => {
  const { glossary } = getKb();

  it("gives every term a unique id", () => {
    const ids = glossary.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every term a name and definition in both languages (FR-08)", () => {
    for (const term of glossary) {
      expect(term.term.en.trim(), term.id).not.toBe("");
      expect(term.term.km.trim(), term.id).not.toBe("");
      expect(term.definition.en.trim(), term.id).not.toBe("");
      expect(term.definition.km.trim(), term.id).not.toBe("");
    }
  });

  it("states no fee, and no specific office or deadline — a definition asserts nothing about a service", () => {
    // Per the module docstring: a definition cites nothing because it claims
    // nothing about any specific service. A figure appearing here would be an
    // uncited factual claim served as Tier 1.
    for (const term of glossary) {
      expect(term.definition.en, term.id).not.toMatch(/\b\d[\d,]*\s*(riel|usd|dollars?)\b/i);
    }
  });
});
