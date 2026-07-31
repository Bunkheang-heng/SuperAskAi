/**
 * Knowledge base loader and index cache.
 *
 * The KB is read from data/ at first use and the derived indexes are held in
 * module scope for the process lifetime. Reindexing is a matter of building a
 * fresh instance and swapping the reference, which is what makes NFR-10
 * (reindex without service interruption) achievable: readers keep the old
 * index until the new one is complete.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Chunk } from "@/lib/types";
import { Bm25Index } from "@/lib/retrieval/bm25";
import { VectorIndex } from "@/lib/retrieval/embed";

const DATA_DIR = join(process.cwd(), "data");

interface CuratedAnswer {
  id: string;
  match: string[];
  /** See MatchMode in lib/engine/curated.ts. Defaults to "phrase". */
  matchMode?: "phrase" | "whole";
  answer: { en: string; km: string };
  citations: string[];
}

/** An official term explained in plain language. See lib/engine/glossary.ts. */
export interface GlossaryTerm {
  id: string;
  term: { en: string; km: string };
  /** Surface forms, either script. Matched whole-word for Latin. */
  match: string[];
  definition: { en: string; km: string };
}

export interface Facility {
  id: string;
  ministry: string;
  name: string;
  nameKm: string;
  service: string[];
  province: string;
  address: string;
  hours: string;
  phone: string;
  keywords: string[];
}

export interface Kb {
  chunks: Chunk[];
  byId: Map<string, Chunk>;
  bm25: Bm25Index;
  vectors: VectorIndex;
  curated: CuratedAnswer[];
  glossary: GlossaryTerm[];
  aliases: Record<string, string[]>;
  facilities: Facility[];
  emergency: Array<{ label: string; labelKm: string; number: string }>;
  support: { name: string; address: string; hours: string; phone: string };
  builtAt: string;
}

function readJson<T>(...segments: string[]): T {
  return JSON.parse(readFileSync(join(DATA_DIR, ...segments), "utf8")) as T;
}

function build(): Kb {
  const kbDir = join(DATA_DIR, "kb");
  const files = readdirSync(kbDir).filter((f) => f.endsWith(".json"));

  const chunks: Chunk[] = [];
  for (const file of files) {
    const doc = readJson<{
      ministry: string;
      ministryKm: string;
      chunks: Array<Omit<Chunk, "ministry" | "ministryKm">>;
    }>("kb", file);

    for (const c of doc.chunks) {
      chunks.push({ ...c, ministry: doc.ministry, ministryKm: doc.ministryKm });
    }
  }

  const curatedFile = readJson<{ answers: CuratedAnswer[] }>("curated.json");
  const glossaryFile = readJson<{ terms: GlossaryTerm[] }>("glossary.json");
  const aliasFile = readJson<{ aliases: Record<string, string[]> }>(
    "aliases.json",
  );
  const facilityFile = readJson<{
    facilities: Facility[];
    emergency: { numbers: Array<{ label: string; labelKm: string; number: string }> };
    support: { name: string; address: string; hours: string; phone: string };
  }>("facilities.json");

  return {
    chunks,
    byId: new Map(chunks.map((c) => [c.id, c])),
    bm25: new Bm25Index(chunks),
    vectors: new VectorIndex(chunks),
    curated: curatedFile.answers,
    glossary: glossaryFile.terms,
    aliases: aliasFile.aliases,
    facilities: facilityFile.facilities,
    emergency: facilityFile.emergency.numbers,
    support: facilityFile.support,
    builtAt: new Date().toISOString(),
  };
}

let cache: Kb | null = null;

export function getKb(): Kb {
  if (!cache) cache = build();
  return cache;
}

/** Rebuild the indexes and swap atomically (NFR-10). */
export function reindex(): Kb {
  const next = build();
  cache = next;
  return next;
}
