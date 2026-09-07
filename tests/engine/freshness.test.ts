import { describe, it, expect } from "vitest";
import {
  freshnessOf,
  ministryFreshnessScore,
  STALE_NOTICE,
} from "@/lib/engine/freshness";
import type { Chunk } from "@/lib/types";

/**
 * FR-26, FR-52, FR-64, M-05. Freshness is computed from the review date on the
 * content version, not from when the answer was generated — a test that used
 * the real clock would drift into failure on its own, so `now` is injected.
 */

const NOW = new Date("2026-08-27T00:00:00Z");

function chunk(over: Partial<Chunk> = {}): Chunk {
  return {
    id: "X-1",
    ministry: "Ministry of Public Works and Transport",
    ministryKm: "ក្រសួងសាធារណការ និងដឹកជញ្ជូន",
    doc: "Driver's Licence",
    instrument: "Prakas No. 047 SK",
    article: "Not cited on source page",
    effective: "2017-01-27",
    verified: "2026-07-31",
    reviewDue: "2027-01-31",
    geoScope: "KH",
    sensitivity: "public",
    text: "The renewal fee is 30,000 riel.",
    keywords: [],
    questions: [],
    ...over,
  };
}

describe("freshnessOf", () => {
  it("is fresh when the review date is more than 30 days away", () => {
    expect(freshnessOf(chunk({ reviewDue: "2027-01-31" }), NOW)).toBe("fresh");
  });

  it("is due inside the 30-day window", () => {
    expect(freshnessOf(chunk({ reviewDue: "2026-09-10" }), NOW)).toBe("due");
  });

  it("is stale once the review date has passed (FR-26)", () => {
    expect(freshnessOf(chunk({ reviewDue: "2026-08-26" }), NOW)).toBe("stale");
  });

  it("treats an unparseable review date as stale, not as fresh", () => {
    // Failing open here would silently present unreviewed content as current.
    expect(freshnessOf(chunk({ reviewDue: "not a date" }), NOW)).toBe("stale");
    expect(freshnessOf(chunk({ reviewDue: "" }), NOW)).toBe("stale");
  });

  it("is due exactly one day before the review date", () => {
    expect(freshnessOf(chunk({ reviewDue: "2026-08-28" }), NOW)).toBe("due");
  });

  it("is fresh exactly 31 days out and due at 29", () => {
    expect(freshnessOf(chunk({ reviewDue: "2026-09-27" }), NOW)).toBe("fresh");
    expect(freshnessOf(chunk({ reviewDue: "2026-09-25" }), NOW)).toBe("due");
  });
});

describe("ministryFreshnessScore (M-05)", () => {
  it("scores the share of content verified within 90 days", () => {
    const scores = ministryFreshnessScore(
      [
        chunk({ id: "A", ministry: "MPWT", verified: "2026-08-01" }),
        chunk({ id: "B", ministry: "MPWT", verified: "2026-07-01" }),
        chunk({ id: "C", ministry: "MPWT", verified: "2025-01-01" }),
      ],
      NOW,
    );
    const mpwt = scores.get("MPWT")!;
    expect(mpwt.total).toBe(3);
    expect(mpwt.verified).toBe(2);
    expect(mpwt.score).toBeCloseTo(2 / 3);
  });

  it("scores each ministry separately", () => {
    const scores = ministryFreshnessScore(
      [
        chunk({ id: "A", ministry: "MPWT", verified: "2026-08-01" }),
        chunk({ id: "B", ministry: "MOI", verified: "2024-01-01" }),
      ],
      NOW,
    );
    expect(scores.get("MPWT")!.score).toBe(1);
    expect(scores.get("MOI")!.score).toBe(0);
  });

  it("excludes superseded content (FR-18, FR-58)", () => {
    const scores = ministryFreshnessScore(
      [
        chunk({ id: "A", ministry: "MPWT", verified: "2026-08-01" }),
        chunk({ id: "B", ministry: "MPWT", verified: "2020-01-01", superseded: true }),
      ],
      NOW,
    );
    expect(scores.get("MPWT")!.total).toBe(1);
    expect(scores.get("MPWT")!.score).toBe(1);
  });

  it("returns an empty map for an empty corpus rather than dividing by zero", () => {
    expect(ministryFreshnessScore([], NOW).size).toBe(0);
  });

  it("does not count an unparseable verified date as recently verified", () => {
    const scores = ministryFreshnessScore(
      [chunk({ id: "A", ministry: "MPWT", verified: "unknown" })],
      NOW,
    );
    expect(scores.get("MPWT")!.verified).toBe(0);
  });
});

describe("STALE_NOTICE", () => {
  it("is present in both languages (FR-08)", () => {
    expect(STALE_NOTICE.en.length).toBeGreaterThan(0);
    expect(STALE_NOTICE.km.length).toBeGreaterThan(0);
  });

  it("tells the citizen to confirm with the responsible office (FR-26)", () => {
    expect(STALE_NOTICE.en).toMatch(/confirm with the responsible office/i);
  });
});
