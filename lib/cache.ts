// lib/cache.ts
//
// A small in-memory cache for the expensive read routes.
//
// The leaderboard, team table, weekly challenges and stats all
// recompute from every activity of every participant. With ~90 people
// opening the app several times a day that's thousands of identical
// recalculations, and it was consuming the whole Vercel CPU allowance.
//
// Nobody needs their own private recalculation of a shared leaderboard.
// One computation per minute, shared by everyone, is the same answer.
//
// Two caveats worth knowing:
//
//  1. Vercel runs several instances and each holds its own copy, so the
//     saving is large but not total.
//  2. This is memory, not storage — a cold start begins empty, which is
//     correct behaviour rather than a problem.

type Entry = { value: unknown; expires: number };

const store = new Map<string, Entry>();

/** Bump this to invalidate everything at once — see clearAll below. */
let generation = 0;

const MAX_ENTRIES = 60;

function prune() {
  if (store.size <= MAX_ENTRIES) return;
  const now = Date.now();
  for (const [k, v] of store) {
    if (v.expires < now) store.delete(k);
  }
  // Still too big: drop the oldest insertions
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
}

/**
 * Run `compute` at most once every `ttlSeconds` for a given key.
 *
 * Concurrent callers during the window get the cached value rather than
 * each starting their own computation.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  compute: () => Promise<T>
): Promise<T> {
  const fullKey = `${generation}:${key}`;
  const hit = store.get(fullKey);

  if (hit && hit.expires > Date.now()) {
    return hit.value as T;
  }

  const value = await compute();

  store.set(fullKey, {
    value,
    expires: Date.now() + ttlSeconds * 1000,
  });
  prune();

  return value;
}

/**
 * Throw everything away.
 *
 * Called after a sync writes new activities, so someone who taps
 * refresh and switches to the leaderboard sees their points straight
 * away rather than waiting out the TTL.
 */
export function clearAll() {
  generation++;
  store.clear();
}
