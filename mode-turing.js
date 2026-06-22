// ============================================================
//  DIVA ACADEMY – Quote Challenge (Turing Challenge)
// ============================================================

import { T, Player, Settings, WorldState, saveGame, hasPerk, runStats, triggerStartDialogue } from './engine-state.js';
import { showScreen } from './engine-input.js';
import { ScreenShake, Juice, updateHUD, showPerkActivation, resizeCanvas } from './engine-gfx.js';
import { shuffleArray } from './questions.js';
import AudioManager from './audio.js';

export let quoteState = null;
export let quoteTimer = null;
export let quoteTimerLeft = 0;
export let quoteConsumed = [];
export let quotePool = [];

const QUOTE_QUOTES_PER_SESSION = 2;
const QUOTE_LAYER1_TIME = 15;
const QUOTE_LAYER2_TIME = 12;

export async function loadQuotes() {
  try {
    const res = await fetch('assets/quotes.json');
    if (res.ok) quotePool = await res.json();
  } catch(e) {
    quotePool = [];
  }
}

export function updateQuotePoolStatus() {
  const el = document.getElementById('quote-pool-status');
  if (el) {
    el.textContent = `${quotePool.length} quotes loaded (consumed: ${quoteConsumed.length})`;
  }
}

export function getRandomQuotes(n) {
  if (!quotePool || quotePool.length === 0) return [];
  const limitN = Math.min(n, quotePool.length);
  const available = quotePool.filter(q => !quoteConsumed.includes(q.text));
  if (available.length < limitN) {
    quoteConsumed = quoteConsumed.slice(-10);
    saveQuoteConsumed();
    const secondCheck = quotePool.filter(q => !quoteConsumed.includes(q.text));
    if (secondCheck.length < limitN) {
      return shuffleArray([...quotePool]).slice(0, limitN);
    }
    return getRandomQuotes(limitN);
  }
  return shuffleArray([...available]).slice(0, limitN);
}

export function saveQuoteConsumed() {
  try {
    localStorage.setItem('divaAcademyQuoteConsumed', JSON.stringify(quoteConsumed));
  } catch(e) {}
}

export function loadQuoteConsumed() {
  try {
    quoteConsumed = JSON.parse(localStorage.getItem('divaAcademyQuoteConsumed')) || [];
  } catch(e) {
    quoteConsumed = [];
  }
}

export function startQuoteChallenge(npc) {
  const quotes = getRandomQuotes(QUOTE_QUOTES_PER_SESSION);
  if (!quotes || quotes.length === 0) {
    triggerStartDialogue(npc.name, ['The quote pool is empty. Expand it in Settings and try again.']);
    return;
  }
  quoteState = {
    npc, quotes, current: 0, correct: 0, wrong: 0,
    layer1Correct: 0, layer2Correct: 0, layer2Attempts: 0,
    totalRep: 0, graceUsed: false,
    spotlightActive: WorldState.flags.spotlightActive
  };
  AudioManager.playSFX('interact');
  showScreen('quote');
  renderQuoteLayer1();
}

export function renderQuoteLayer1() {
  if (quoteState.current >= quoteState.quotes.length) {
    endQuoteChallenge();
    return;
  }
  clearTypewriterTimer();
  const q = quoteState.quotes[quoteState.current];
  document.getElementById('quote-progress').textContent = `Quote ${quoteState.current + 1} / ${quoteState.quotes.length}`;
  document.getElementById('quote-layer-indicator').textContent = 'Layer 1 — Real or Fake?';
  document.getElementById('quote-text').textContent = '';
  document.getElementById('quote-source').textContent = '';
  document.getElementById('quote-feedback').textContent = '';
  document.getElementById('quote-l2-prompt').classList.add('hidden');
  document.getElementById('quote-l2-buttons').classList.add('hidden');
  document.getElementById('quote-buttons').classList.remove('hidden');
  document.querySelectorAll('.quote-btn').forEach(b => {
    b.disabled = false;
  });
  typewriteQuote(q.text);
  startQuoteTimer(QUOTE_LAYER1_TIME);
}

function clearTypewriterTimer() {
  if (quoteState && quoteState._typewriterTimer) {
    clearTimeout(quoteState._typewriterTimer);
    quoteState._typewriterTimer = null;
  }
}

export function typewriteQuote(text, i) {
  if (i === undefined) i = 0;
  if (!quoteState) return;
  const el = document.getElementById('quote-text');
  if (el && i <= text.length) {
    el.textContent = text.substring(0, i);
    const timer = setTimeout(() => typewriteQuote(text, i + 1), 30);
    quoteState._typewriterTimer = timer;
  }
}

export function startQuoteTimer(secs) {
  clearQuoteTimer();
  quoteTimerLeft = secs;
  const fill = document.getElementById('quote-timer-fill');
  const label = document.getElementById('quote-timer-label');
  if (fill) fill.style.width = '100%';
  if (label) label.textContent = secs;
  quoteTimer = setInterval(() => {
    quoteTimerLeft--;
    if (label) label.textContent = Math.max(0, quoteTimerLeft);
    if (fill) fill.style.width = `${(quoteTimerLeft / secs) * 100}%`;
    if (quoteTimerLeft <= 0) {
      clearQuoteTimer();
      answerQuoteTimeout();
    }
  }, 1000);
}

export function clearQuoteTimer() {
  if (quoteTimer) {
    clearInterval(quoteTimer);
    quoteTimer = null;
  }
}

export function answerQuoteTimeout() {
  document.querySelectorAll('.quote-btn').forEach(b => {
    b.disabled = true;
  });
  const fb = document.getElementById('quote-feedback');
  const q = quoteState.quotes[quoteState.current];
  if (fb) {
    if (q.isReal) {
      fb.textContent = `Time's up — that was real, said by ${q.realArtist}.`;
    } else {
      fb.textContent = `Time's up — that was completely made up.`;
    }
    fb.style.color = 'var(--red)';
  }
  quoteState.wrong++;
  setTimeout(nextQuote, 1500);
}

export function answerQuoteLayer1(chosenFake) {
  clearQuoteTimer();
  document.querySelectorAll('.quote-btn').forEach(b => {
    b.disabled = true;
  });
  const q = quoteState.quotes[quoteState.current];
  const fb = document.getElementById('quote-feedback');
  const isFake = !q.isReal;
  
  if (chosenFake === isFake) {
    quoteState.layer1Correct++;
    quoteState.correct++;
    let rep = 5;
    if (quoteState.spotlightActive) {
      rep = Math.ceil(rep * 1.5);
    }
    quoteState.totalRep += rep;
    Player.rep += rep;
    if (fb) {
      fb.textContent = `Correct! +${rep} REP`;
      fb.style.color = 'var(--green)';
    }
    if (q.isReal) {
      setTimeout(() => renderQuoteLayer2(q), 800);
    } else {
      const source = document.getElementById('quote-source');
      if (source) source.textContent = '(Completely fabricated)';
      setTimeout(nextQuote, 1200);
    }
  } else {
    quoteState.wrong++;
    quoteState.totalRep -= 5;
    Player.rep = Math.max(0, Player.rep - 5);
    if (fb) {
      fb.textContent = q.isReal ? `Wrong — that was real, said by ${q.realArtist}. −5 REP` : 'Wrong — that was completely made up. −5 REP';
      fb.style.color = 'var(--red)';
    }
    if (q.isReal) {
      const source = document.getElementById('quote-source');
      if (source) source.textContent = `— ${q.realArtist}`;
    }
    setTimeout(nextQuote, 1500);
  }
  updateHUD();
}

export function renderQuoteLayer2(q) {
  document.getElementById('quote-layer-indicator').textContent = 'Layer 2 — Attribution Check';
  document.getElementById('quote-l2-prompt').classList.remove('hidden');
  document.getElementById('quote-l2-artist').textContent = q.fakeArtist;
  document.getElementById('quote-buttons').classList.add('hidden');
  document.getElementById('quote-l2-buttons').classList.remove('hidden');
  document.getElementById('quote-feedback').textContent = '';
  document.querySelectorAll('.quote-btn').forEach(b => {
    b.disabled = false;
  });
  startQuoteTimer(QUOTE_LAYER2_TIME);
}

export function answerQuoteLayer2(chosenYes) {
  clearQuoteTimer();
  document.querySelectorAll('.quote-btn').forEach(b => {
    b.disabled = true;
  });
  const q = quoteState.quotes[quoteState.current];
  const fb = document.getElementById('quote-feedback');
  const correctYes = q.realArtist === q.fakeArtist;
  const correct = chosenYes ? correctYes : !correctYes;
  quoteState.layer2Attempts++;
  
  if (correct) {
    quoteState.layer2Correct++;
    quoteState.correct++;
    let rep = 5;
    if (quoteState.spotlightActive) {
      rep = Math.ceil(rep * 1.5);
    }
    quoteState.totalRep += rep;
    Player.rep += rep;
    if (fb) {
      fb.textContent = `Correct! +${rep} REP`;
      fb.style.color = 'var(--green)';
    }
    const source = document.getElementById('quote-source');
    if (source) source.textContent = `— ${q.realArtist}`;
  } else {
    quoteState.wrong++;
    quoteState.totalRep -= 5;
    Player.rep = Math.max(0, Player.rep - 5);
    if (fb) {
      fb.textContent = chosenYes
        ? `Wrong — ${q.realArtist} actually said it, not ${q.fakeArtist}. −5 REP`
        : `Wrong — ${q.realArtist} did say it. −5 REP`;
      fb.style.color = 'var(--red)';
    }
    const source = document.getElementById('quote-source');
    if (source) source.textContent = `— ${q.realArtist}`;
  }
  updateHUD();
  setTimeout(nextQuote, 1500);
}

export function nextQuote() {
  quoteState.current++;
  renderQuoteLayer1();
}

export function endQuoteChallenge() {
  clearQuoteTimer();
  clearTypewriterTimer();
  const qs = quoteState;
  const allCorrect = qs.wrong === 0 && qs.layer1Correct === qs.quotes.length;
  const repChange = qs.totalRep;

  let spotlightUsed = false;
  if (repChange > 0 && qs.spotlightActive) {
    WorldState.flags.spotlightActive = false;
    showPerkActivation('Spotlight — 1.5x REP used!');
    spotlightUsed = true;
  }

  let icon, title, body;
  if (allCorrect) {
    icon = '✓';
    title = 'Turing Master';
    body = `You saw through every illusion. ${qs.layer1Correct} real/fake calls correct${qs.layer2Attempts > 0 ? `, ${qs.layer2Correct}/${qs.layer2Attempts} attributions correct` : ''}.`;
  } else if (qs.layer1Correct > 0) {
    icon = '~';
    title = 'Close, But The Machine Won';
    body = `${qs.layer1Correct}/${qs.quotes.length} real/fake calls correct${qs.layer2Attempts > 0 ? `, ${qs.layer2Correct}/${qs.layer2Attempts} attributions correct` : ''}.`;
  } else {
    icon = '✗';
    title = 'The Imitation Won';
    body = `You couldn't tell truth from fiction this time.`;
  }
  
  for (const q of qs.quotes) {
    if (!quoteConsumed.includes(q.text)) quoteConsumed.push(q.text);
  }
  if (quoteConsumed.length > 100) quoteConsumed = quoteConsumed.slice(-100);
  saveQuoteConsumed();
  
  runStats.questionsAnswered += qs.quotes.length;
  if (allCorrect) {
    runStats.npcsDefeated++;
    if (!WorldState.flags.spotlightActive) {
      WorldState.flags.spotlightActive = true;
      if (spotlightUsed) {
        setTimeout(() => showPerkActivation('Spotlight earned — 1.5x REP on next face-off!'), 2200);
      } else {
        showPerkActivation('Spotlight earned — 1.5x REP on next face-off!');
      }
    }
  }
  
  document.getElementById('result-icon').textContent = icon;
  document.getElementById('result-title').textContent = title;
  document.getElementById('result-body').textContent = body;
  
  const repEl = document.getElementById('result-rep-change');
  if (repEl) {
    repEl.textContent = repChange >= 0 ? `+${repChange} REP` : `${repChange} REP`;
    repEl.className = repChange >= 0 ? 'rep-gain' : 'rep-loss';
  }
  
  quoteState = null;
  AudioManager.fadeOut(() => AudioManager.startExploration());
  showScreen('result');
  updateHUD();
}

// Quote challenge button listeners
document.getElementById('btn-quote-real').addEventListener('click', () => answerQuoteLayer1(false));
document.getElementById('btn-quote-fake').addEventListener('click', () => answerQuoteLayer1(true));
document.getElementById('btn-quote-yes').addEventListener('click', () => answerQuoteLayer2(true));
document.getElementById('btn-quote-no').addEventListener('click', () => answerQuoteLayer2(false));
