// ============================================================
//  DIVA ACADEMY – Question System
//  Manages seed questions, consumed tracking, and manual adding.
// ============================================================

export const CAT_LABELS = {
  music: 'Music',
  film: 'Film & TV',
  fashion: 'Fashion',
  trivia: 'Queer Culture'
};

// ─── Storage Keys ────────────────────────────────────────────
const SEED_QUESTIONS_KEY = 'divaAcademySeedQuestions.v1';
const CONSUMED_QUESTIONS_KEY = 'divaAcademyConsumedQuestions.v1';
const MANUAL_QUESTIONS_KEY = 'divaAcademyManualQuestions.v1';

// ─── In-Memory State ────────────────────────────────────────
export let seedQuestions = [];
export let manualQuestions = [];
export let consumedTexts = [];

// ─── Shuffle Helper ─────────────────────────────────────────
export function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Persistence ────────────────────────────────────────────
export function loadSeedQuestions() {
  try {
    const raw = localStorage.getItem(SEED_QUESTIONS_KEY);
    if (raw) {
      seedQuestions = JSON.parse(raw);
      return;
    }
  } catch(e) {}
  seedQuestions = [];
}

export function saveSeedQuestions() {
  try { localStorage.setItem(SEED_QUESTIONS_KEY, JSON.stringify(seedQuestions)); } catch(e) {}
}

export function loadManualQuestions() {
  try {
    const raw = localStorage.getItem(MANUAL_QUESTIONS_KEY);
    if (raw) manualQuestions = JSON.parse(raw);
  } catch(e) { manualQuestions = []; }
}

export function saveManualQuestions() {
  try { localStorage.setItem(MANUAL_QUESTIONS_KEY, JSON.stringify(manualQuestions)); } catch(e) {}
}

export function loadConsumedQuestions() {
  try {
    const raw = localStorage.getItem(CONSUMED_QUESTIONS_KEY);
    if (raw) consumedTexts = JSON.parse(raw);
  } catch(e) { consumedTexts = []; }
}

export function saveConsumedQuestions() {
  try { localStorage.setItem(CONSUMED_QUESTIONS_KEY, JSON.stringify(consumedTexts)); } catch(e) {}
}

// ─── Pool Status ────────────────────────────────────────────
export function getPoolStatus() {
  const total = seedQuestions.length + manualQuestions.length;
  const available = getAvailableQuestions().length;
  const consumed = consumedTexts.length;
  return { total, available, consumed };
}

export function isPoolLow() {
  return getAvailableQuestions().length < 5;
}

export function getAvailableQuestions() {
  const consumedSet = new Set(consumedTexts);
  const all = [...seedQuestions, ...manualQuestions];
  return all.filter(q => !consumedSet.has(q.q));
}

// ─── Question Selection ─────────────────────────────────────
export function getRandomQuestions(n, cat) {
  let available = getAvailableQuestions();

  if (cat && cat !== 'mixed') {
    available = available.filter(q => q.cat === cat);
  }

  // If pool is too small, reset consumed (except for the current selection)
  if (available.length < n) {
    // Keep only the last 20 consumed to maintain some avoidance
    const keepConsumed = consumedTexts.slice(-20);
    consumedTexts = keepConsumed;
    saveConsumedQuestions();
    available = getAvailableQuestions();
    if (cat && cat !== 'mixed') {
      available = available.filter(q => q.cat === cat);
    }
  }

  return shuffleArray(available).slice(0, Math.min(n, available.length));
}

// ─── Consumption ────────────────────────────────────────────
export function markConsumed(questions) {
  for (const q of questions) {
    if (!consumedTexts.includes(q.q)) {
      consumedTexts.push(q.q);
    }
  }
  // Keep only last 200 to limit localStorage size
  if (consumedTexts.length > 200) {
    consumedTexts = consumedTexts.slice(consumedTexts.length - 200);
  }
  saveConsumedQuestions();
}

export function getConsumedTexts() {
  return consumedTexts.slice(-200);
}

// ─── Adding Questions ───────────────────────────────────────
export function addManualQuestion(q, correct, wrong1, wrong2, wrong3, cat) {
  const choices = shuffleArray([correct, wrong1, wrong2, wrong3]);
  const answerIdx = choices.indexOf(correct);
  const newQ = {
    q: q.trim(),
    choices,
    answer: answerIdx,
    cat: cat || 'trivia'
  };
  manualQuestions.push(newQ);
  saveManualQuestions();
  return newQ;
}

export function addGeneratedQuestions(questions) {
  // Validate and add AI-generated questions
  const valid = [];
  for (const q of questions) {
    if (!q.q || !q.choices || q.choices.length !== 4) continue;
    if (typeof q.answer !== 'number' || q.answer < 0 || q.answer > 3) continue;
    if (!['music', 'film', 'fashion', 'trivia'].includes(q.cat)) continue;
    // Check for duplicate choices
    const normalized = q.choices.map(c => c.trim().toLowerCase());
    if (new Set(normalized).size !== 4) continue;
    // Check for duplicates against existing pool
    const all = [...seedQuestions, ...manualQuestions];
    if (all.some(existing => existing.q === q.q)) continue;
    if (consumedTexts.includes(q.q)) continue;
    valid.push(q);
  }
  manualQuestions.push(...valid);
  saveManualQuestions();
  return valid.length;
}

// ─── Boot: Load from JSON file + localStorage ───────────────
export async function loadQuestionBank() {
  loadConsumedQuestions();
  loadManualQuestions();

  // Load seed questions from JSON file
  try {
    const res = await fetch('assets/questions-bank.json');
    if (res.ok) {
      seedQuestions = await res.json();
      saveSeedQuestions();
    } else {
      // Fallback: try localStorage
      loadSeedQuestions();
    }
  } catch(e) {
    // Fallback: try localStorage
    loadSeedQuestions();
  }
}

// ─── Random Category ────────────────────────────────────────
export function getRandomCategory() {
  const cats = ['music', 'film', 'fashion', 'trivia'];
  return cats[Math.floor(Math.random() * cats.length)];
}

// ─── Reset Pool (for new game) ──────────────────────────────
export function resetQuestionPool() {
  consumedTexts = [];
  saveConsumedQuestions();
}
