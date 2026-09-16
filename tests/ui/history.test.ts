import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { loadAll, save, remove, clearAll } from "@/lib/ui/history";
import type { StoredTurn } from "@/lib/ui/history";

/**
 * Device-local conversation history.
 *
 * The privacy property is the one under test: this must never reach the server.
 * The questions are about births, deaths, lost identity documents and money
 * owed, from an audience §5.1 describes as mobile-only and often on a shared
 * handset — so the two behaviours that matter are that storage stays local and
 * that clearing actually clears.
 *
 * Everything else is failure handling. Losing history is a minor inconvenience;
 * throwing on page load, or breaking the conversation the citizen is having
 * right now, is not acceptable.
 */

const KEY = "askgov.history.v1";
const LEGACY_KEY = "superask.history.v1";

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}

let storage: MemoryStorage;

function turns(text = "how do i renew my driving licence"): StoredTurn[] {
  return [{ role: "user", text }];
}

beforeEach(() => {
  storage = new MemoryStorage();
  vi.stubGlobal("window", { localStorage: storage });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("save and loadAll", () => {
  it("round-trips a conversation", () => {
    save("c1", turns());
    const list = loadAll();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("c1");
    expect(list[0].turns).toEqual(turns());
  });

  it("derives the title from the first citizen turn", () => {
    save("c1", [
      { role: "user", text: "how do i renew my driving licence" },
      { role: "assistant", response: { answer: "..." } as never },
    ]);
    expect(loadAll()[0].title).toBe("how do i renew my driving licence");
  });

  it("truncates a long title with an ellipsis", () => {
    const long = "a".repeat(80);
    save("c1", turns(long));
    const title = loadAll()[0].title;
    expect(title).toHaveLength(49);
    expect(title.endsWith("…")).toBe(true);
  });

  it("collapses whitespace in the title", () => {
    save("c1", turns("how   do  i\n\nrenew"));
    expect(loadAll()[0].title).toBe("how do i renew");
  });

  it("falls back to a placeholder title when no citizen turn has text", () => {
    save("c1", [{ role: "assistant", response: { answer: "..." } as never }]);
    expect(loadAll()[0].title).toBe("New question");
  });

  it("updates in place rather than duplicating on the same id", () => {
    save("c1", turns("first"));
    save("c1", [...turns("first"), { role: "user", text: "second" }]);
    const list = loadAll();
    expect(list).toHaveLength(1);
    expect(list[0].turns).toHaveLength(2);
  });

  it("puts the most recently saved conversation first", () => {
    save("c1", turns("first"));
    save("c2", turns("second"));
    expect(loadAll().map((c) => c.id)).toEqual(["c2", "c1"]);
  });

  it("ignores an empty turn list rather than storing a blank entry", () => {
    save("c1", []);
    expect(loadAll()).toEqual([]);
  });

  it("caps the list at 20 — a convenience, not an archive", () => {
    for (let i = 0; i < 30; i += 1) save(`c${i}`, turns(`question ${i}`));
    expect(loadAll()).toHaveLength(20);
  });

  it("drops the oldest when the cap is reached", () => {
    for (let i = 0; i < 25; i += 1) save(`c${i}`, turns(`question ${i}`));
    const ids = loadAll().map((c) => c.id);
    expect(ids).toContain("c24");
    expect(ids).not.toContain("c0");
  });
});

describe("remove and clearAll", () => {
  it("removes one conversation and leaves the rest", () => {
    save("c1", turns("first"));
    save("c2", turns("second"));
    remove("c1");
    expect(loadAll().map((c) => c.id)).toEqual(["c2"]);
  });

  it("is a no-op for an unknown id", () => {
    save("c1", turns());
    remove("nope");
    expect(loadAll()).toHaveLength(1);
  });

  it("clearAll deletes everything and returns an empty list", () => {
    save("c1", turns("first"));
    save("c2", turns("second"));
    expect(clearAll()).toEqual([]);
    expect(loadAll()).toEqual([]);
  });

  it("clearAll removes the key outright, not just its contents", () => {
    // On a shared handset the citizen who needs this needs it complete.
    save("c1", turns());
    clearAll();
    expect(storage.getItem(KEY)).toBeNull();
  });
});

describe("failure handling", () => {
  it("returns an empty list when there is no window at all (server render)", () => {
    vi.stubGlobal("window", undefined);
    expect(loadAll()).toEqual([]);
  });

  it("does not throw when saving with no window", () => {
    vi.stubGlobal("window", undefined);
    expect(() => save("c1", turns())).not.toThrow();
  });

  it("returns an empty list when storage access throws — blocked or private browsing", () => {
    vi.stubGlobal("window", {
      get localStorage(): never {
        throw new Error("SecurityError");
      },
    });
    expect(loadAll()).toEqual([]);
  });

  it("survives corrupt JSON in our key rather than throwing on page load", () => {
    storage.setItem(KEY, "{not json");
    expect(loadAll()).toEqual([]);
  });

  it("survives a non-array value in our key", () => {
    storage.setItem(KEY, JSON.stringify({ not: "an array" }));
    expect(loadAll()).toEqual([]);
  });

  it("filters out malformed entries instead of discarding the whole list", () => {
    storage.setItem(
      KEY,
      JSON.stringify([
        { id: "good", title: "t", at: 2, turns: [] },
        { id: 42, turns: [] },
        null,
        { title: "no id", at: 1 },
      ]),
    );
    expect(loadAll().map((c) => c.id)).toEqual(["good"]);
  });

  it("keeps the current conversation working when the quota is exceeded", () => {
    // History silently stops growing rather than breaking the conversation the
    // citizen is having right now.
    save("c1", turns("first"));
    vi.spyOn(storage, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => save("c2", turns("second"))).not.toThrow();
  });

  it("retries with a shorter list when the first write fails on quota", () => {
    for (let i = 0; i < 20; i += 1) save(`c${i}`, turns(`question ${i}`));

    const setItem = vi
      .spyOn(storage, "setItem")
      .mockImplementationOnce(() => {
        throw new Error("QuotaExceededError");
      });

    save("new", turns("new question"));

    expect(setItem).toHaveBeenCalledTimes(2);
    const retried = JSON.parse(setItem.mock.calls[1][1] as string);
    expect(retried.length).toBeLessThanOrEqual(10);
  });

  it("gives up quietly when the retry also fails", () => {
    save("c1", turns());
    vi.spyOn(storage, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => save("c2", turns("second"))).not.toThrow();
  });

  it("does not throw when clearAll cannot reach storage", () => {
    vi.spyOn(storage, "removeItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(clearAll()).toEqual([]);
  });
});

describe("the privacy property", () => {
  it("writes only to localStorage under one namespaced key", () => {
    save("c1", turns());
    expect(storage.getItem(KEY)).toBeTruthy();
  });

  it("moves conversations saved under the previous product key", () => {
    storage.setItem(
      LEGACY_KEY,
      JSON.stringify([{ id: "old", title: "t", at: 1, turns: turns() }]),
    );
    const list = loadAll();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("old");
    expect(storage.getItem(KEY)).toBeTruthy();
    expect(storage.getItem(LEGACY_KEY)).toBeNull();
  });

  it("makes no network call — the module imports no fetch client", () => {
    // Guarding the constraint the README states: history is never transmitted,
    // and the audit log (FR-55) is a separate redacted record that must not be
    // joined to this. A fetch appearing here would be the regression.
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    save("c1", turns());
    loadAll();
    remove("c1");
    clearAll();

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
