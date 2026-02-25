/**
 * Shared data-cleaning utilities for phonetics and meanings.
 * Pure functions — no DB dependencies, no side effects.
 */

import type { Definition, Meaning, PhoneticItem } from "./types.ts";

/** From a list of PhoneticItems with the same type, pick the best one. */
function pickBestPhonetic(items: PhoneticItem[]): PhoneticItem {
  return items.reduce((best, cur) => {
    if (!best.audioUrl && cur.audioUrl) return cur;
    if (best.audioUrl && !cur.audioUrl) return best;
    return cur.text.length >= best.text.length ? cur : best;
  });
}

/**
 * Filter phonetics to us/uk only, deduplicate within each type.
 * Prefers items with audioUrl, then longest text.
 */
export function cleanPhonetics(items: PhoneticItem[]): PhoneticItem[] {
  const us = items.filter((p) => p.type === "us");
  const uk = items.filter((p) => p.type === "uk");

  const result: PhoneticItem[] = [];
  if (us.length) result.push(pickBestPhonetic(us));
  if (uk.length) result.push(pickBestPhonetic(uk));
  return result;
}

/** Score a meaning by data completeness. Higher = preferred on deduplication. */
function scoreMeaning(m: Meaning): number {
  let score = 0;
  for (const def of m.definitions) {
    if (def.example) score += 2;
    if (def.translations?.length) score += 1;
    score += 0.5; // base bonus per definition
  }
  if (m.synonyms?.length) score += 1;
  if (m.antonyms?.length) score += 1;
  return score;
}

/** Sort definitions: examples first, then translations, then longer text. */
function rankDefinitions(defs: Definition[]): Definition[] {
  return [...defs].sort((a, b) => {
    const aScore = (a.example ? 2 : 0) + (a.translations?.length ? 1 : 0);
    const bScore = (b.example ? 2 : 0) + (b.translations?.length ? 1 : 0);
    if (bScore !== aScore) return bScore - aScore;
    return (b.text?.length ?? 0) - (a.text?.length ?? 0);
  });
}

/**
 * Deduplicate meanings by partOfSpeech:
 * - Group by partOfSpeech
 * - Keep highest-scoring meaning per POS
 * - Merge synonyms/antonyms from discarded meanings into winner
 */
export function mergeMeaningsByPos(meanings: Meaning[]): Meaning[] {
  if (meanings.length === 0) return [];

  const byPos = new Map<string, Meaning[]>();
  for (const m of meanings) {
    const group = byPos.get(m.partOfSpeech) ?? [];
    group.push(m);
    byPos.set(m.partOfSpeech, group);
  }

  const result: Meaning[] = [];
  for (const group of byPos.values()) {
    if (group.length === 1) {
      result.push(group[0]!);
      continue;
    }

    // Sort descending by score; first = winner
    group.sort((a, b) => scoreMeaning(b) - scoreMeaning(a));
    const [winner, ...losers] = group as [Meaning, ...Meaning[]];

    // Merge synonyms/antonyms from losers into winner
    const synonyms = new Set(winner.synonyms ?? []);
    const antonyms = new Set(winner.antonyms ?? []);
    for (const loser of losers) {
      (loser.synonyms ?? []).forEach((s) => synonyms.add(s));
      (loser.antonyms ?? []).forEach((a) => antonyms.add(a));
    }

    result.push({
      ...winner,
      synonyms: [...synonyms],
      antonyms: [...antonyms],
    });
  }

  return result;
}

/**
 * Sort definitions by quality and return top `max`.
 * Quality order: has example > has translations > longer text.
 */
export function trimDefinitions(defs: Definition[], max = 2): Definition[] {
  if (defs.length <= max) return defs;
  return rankDefinitions(defs).slice(0, max);
}
