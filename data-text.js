// ============================================================
//  DIVA ACADEMY – Banter, Recap, & Tutorial Text Pools
// ============================================================

export let banterPool = { generic: [], STARLET: [], DIVA: [], DJ: [], MOTHER: [] };
export let recapPool = { win: [], lose: [] };

export const TUTORIAL_TEXT = [
  'Welcome to Diva Academy. Here is how things work around here.',
  'Use WASD or Arrow Keys to move. Press E or Space to interact with NPCs and terminals.',
  'Each NPC challenges you to a face-off: pop culture trivia questions against the clock.',
  'Answer correctly to gain REP. Answer wrong and you lose REP. Reach your goal to win. Hit zero and it is over.',
  'Win streaks earn bonus REP. Speed matters too — answer fast for extra points.',
  'Explore the Academy, complete Orientation Week, and prove you belong on The Stage.'
];

export async function loadBanterPool() {
  try {
    const res = await fetch('assets/banter.json');
    if (res.ok) {
      banterPool = await res.json();
    }
  } catch (e) {
    console.warn('Failed to load banter pool:', e);
  }
}

export function getRandomBanter(tier) {
  const tierPool = banterPool[tier] || [];
  const genericPool = banterPool.generic || [];
  const all = [...tierPool, ...genericPool];
  if (all.length === 0) return null;
  return all[Math.floor(Math.random() * all.length)];
}

export async function loadRecapPool() {
  try {
    const res = await fetch('assets/recaps.json');
    if (res.ok) {
      recapPool = await res.json();
    }
  } catch (e) {
    console.warn('Failed to load recap pool:', e);
  }
}

export function getRandomRecap(won) {
  const pool = won ? recapPool.win : recapPool.lose;
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
