// ============================================================
//  DIVA ACADEMY – Minigames
//  1. Hangman  – guess the pop star name letter by letter
//  2. Pop Connect – link two artists through a chain of collabs
// ============================================================

import { T, Player, Settings, currentRoom } from './engine-state.js';
import { showScreen } from './engine-input.js';
import { resizeCanvas, updateHUD } from './engine-gfx.js';
import { shuffleArray } from './questions.js';
import AudioManager from './audio.js';

export let onMinigameClosed = null;
export function setOnMinigameClosedHook(fn) {
  onMinigameClosed = fn;
}

// ─── HANGMAN ─────────────────────────────────────────────────
const HANGMAN_STARS = [
  { name: 'BEYONCE',          hint: 'Queen Bey, Lemonade legend' },
  { name: 'RIHANNA',          hint: 'Fenty founder & barbadian icon' },
  { name: 'MADONNA',          hint: 'Queen of Pop, Material Girl' },
  { name: 'SHAKIRA',          hint: 'Her hips don\'t lie' },
  { name: 'ADELE',            hint: 'Rolling in the Deep' },
  { name: 'DOJA CAT',         hint: 'Say So, Planet Her' },
  { name: 'LIZZO',            hint: 'Truth Hurts, About Damn Time' },
  { name: 'DUA LIPA',         hint: 'Levitating, Future Nostalgia' },
  { name: 'SZA',              hint: 'SOS, Ctrl' },
  { name: 'CARDI B',          hint: 'Bodak Yellow, WAP' },
  { name: 'LADY GAGA',        hint: 'Little Monsters, Bad Romance' },
  { name: 'BILLIE EILISH',    hint: 'Bad Guy, green-hair era' },
  { name: 'ARIANA GRANDE',    hint: 'Thank U Next, ponytail icon' },
  { name: 'TAYLOR SWIFT',     hint: 'Eras Tour, Swift Nation' },
  { name: 'NICKI MINAJ',      hint: 'Super Bass, Anaconda' },
  { name: 'MARIAH CAREY',     hint: 'Whistle register queen' },
  { name: 'KYLIE MINOGUE',    hint: 'Spinning Around, Princess of Pop' },
  { name: 'JANET JACKSON',    hint: 'Rhythm Nation, Miss Jackson' },
  { name: 'DIANA ROSS',       hint: 'The Supremes, Upside Down' },
  { name: 'LANA DEL REY',     hint: 'Summertime Sadness, Video Games' },
  { name: 'LORDE',            hint: 'Royals, Melodrama' },
  { name: 'KATY PERRY',       hint: 'Roar, California Gurls' },
  { name: 'KESHA',            hint: 'Tik Tok, Rainbow era' },
  { name: 'TROYE SIVAN',      hint: 'Rush, queer icon of pop' },
  { name: 'FRANK OCEAN',      hint: 'Blonde, Channel Orange' },
  { name: 'SAM SMITH',        hint: 'Stay With Me, non-binary icon' },
  { name: 'KIM PETRAS',       hint: 'Unholy, trans pop pioneer' },
  { name: 'JANELLE MONAE',    hint: 'Dirty Computer, pansexual futurist' },
];

// Max 6 wrong guesses before game over
const MAX_WRONG = 6;
const HANGMAN_REP_WIN  = 20;
const HANGMAN_REP_LOSE = 15;

let hangmanState = null;

export function startHangman() {
  const star = HANGMAN_STARS[Math.floor(Math.random() * HANGMAN_STARS.length)];
  const word = star.name;
  const letters = new Set(word.replace(/ /g, '').split(''));

  hangmanState = {
    word,
    hint: star.hint,
    guessed: new Set(),
    wrong: 0,
    letters,
    done: false,
    wordMode: false
  };

  document.getElementById('hm-hint').textContent = `Hint: ${star.hint}`;
  document.getElementById('hm-feedback').textContent = '';
  document.getElementById('hm-result').textContent = '';
  document.getElementById('hm-result').className = '';
  document.getElementById('btn-hm-return').style.display = 'none';
  renderHangman();
}

function renderHangman() {
  const hs = hangmanState;
  const wordEl = document.getElementById('hm-word');
  wordEl.innerHTML = hs.word.split('').map(ch => {
    if (ch === ' ') return '<span class="hm-space"> </span>';
    if (!hs.wordMode && hs.guessed.has(ch)) return `<span class="hm-letter revealed">${ch}</span>`;
    return '<span class="hm-letter blank">_</span>';
  }).join('');

  document.getElementById('hm-wrong-count').textContent = `${hs.wrong} / ${MAX_WRONG} wrong`;
  drawGallows(hs.wrong);
  renderHangmanKeyboard();
}

function drawGallows(wrongCount) {
  const c = document.getElementById('hm-canvas');
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  g.clearRect(0, 0, W, H);

  g.strokeStyle = '#c084fc';
  g.lineWidth = 3;
  g.lineCap = 'round';

  // Gallows frame
  g.beginPath();
  g.moveTo(20, H - 10); g.lineTo(W - 20, H - 10);
  g.moveTo(60, H - 10); g.lineTo(60, 20);
  g.moveTo(60, 20);     g.lineTo(W - 50, 20);
  g.moveTo(W - 50, 20); g.lineTo(W - 50, 50);
  g.stroke();

  const cx = W - 50;
  const headY = 65;

  g.strokeStyle = '#f472b6';
  if (wrongCount >= 1) {
    g.beginPath(); g.arc(cx, headY, 16, 0, Math.PI * 2); g.stroke();
  }
  if (wrongCount >= 2) {
    g.beginPath(); g.moveTo(cx, headY + 16); g.lineTo(cx, headY + 54); g.stroke();
  }
  if (wrongCount >= 3) {
    g.beginPath(); g.moveTo(cx, headY + 26); g.lineTo(cx - 22, headY + 44); g.stroke();
  }
  if (wrongCount >= 4) {
    g.beginPath(); g.moveTo(cx, headY + 26); g.lineTo(cx + 22, headY + 44); g.stroke();
  }
  if (wrongCount >= 5) {
    g.beginPath(); g.moveTo(cx, headY + 54); g.lineTo(cx - 20, headY + 76); g.stroke();
  }
  if (wrongCount >= 6) {
    g.beginPath(); g.moveTo(cx, headY + 54); g.lineTo(cx + 20, headY + 76); g.stroke();
    // Sad face
    g.strokeStyle = '#f87171';
    g.beginPath();
    g.arc(cx - 6, headY - 3, 2, 0, Math.PI * 2);
    g.arc(cx + 6, headY - 3, 2, 0, Math.PI * 2);
    g.stroke();
    g.beginPath(); g.arc(cx, headY + 8, 6, 0, Math.PI); g.stroke();
  }
}

function renderHangmanKeyboard() {
  const hs = hangmanState;
  const kbEl = document.getElementById('hm-keyboard');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  kbEl.innerHTML = '';
  alphabet.split('').forEach(ch => {
    const btn = document.createElement('button');
    btn.className = 'hm-key';
    btn.textContent = ch;
    const isGuessed = hs.guessed.has(ch);
    const isWrong   = isGuessed && !hs.letters.has(ch);
    const isCorrect = isGuessed && hs.letters.has(ch);
    if (!hs.wordMode) {
      if (isWrong)   btn.classList.add('wrong');
      if (isCorrect) btn.classList.add('correct');
    }
    if (isGuessed || hs.done) btn.disabled = true;
    btn.addEventListener('click', () => guessLetter(ch));
    kbEl.appendChild(btn);
  });
}

document.addEventListener('keydown', e => {
  if (window.gameState !== 'hangman') return;
  const ch = e.key.toUpperCase();
  if (ch.length === 1 && ch >= 'A' && ch <= 'Z' && !hangmanState.done) {
    guessLetter(ch);
  }
});

function guessLetter(ch) {
  const hs = hangmanState;
  if (hs.done || hs.guessed.has(ch)) return;
  hs.guessed.add(ch);

  if (hs.letters.has(ch)) {
    document.getElementById('hm-feedback').textContent = `✓ "${ch}" is in the name!`;
    document.getElementById('hm-feedback').style.color = 'var(--success)';
  } else {
    hs.wrong++;
    document.getElementById('hm-feedback').textContent = `✗ No "${ch}" here.`;
    document.getElementById('hm-feedback').style.color = 'var(--danger)';
  }

  const allRevealed = [...hs.letters].every(l => hs.guessed.has(l));
  if (allRevealed) {
    hs.done = true;
    renderHangman();
    Player.rep = Math.min(Player.rep + HANGMAN_REP_WIN, Settings.goalRep);
    document.getElementById('hm-result').textContent = `You got it! +${HANGMAN_REP_WIN} REP`;
    document.getElementById('hm-result').className = 'rep-gain';
    document.getElementById('btn-hm-return').style.display = '';
    updateHUD();
    window.onMinigameComplete?.('hangman', true);
    return;
  }
  if (hs.wrong >= MAX_WRONG) {
    hs.done = true;
    renderHangman();
    Player.rep = Math.max(0, Player.rep - HANGMAN_REP_LOSE);
    document.getElementById('hm-result').textContent = `The answer was: ${hs.word}  -${HANGMAN_REP_LOSE} REP`;
    document.getElementById('hm-result').className = 'rep-loss';
    document.getElementById('btn-hm-return').style.display = '';
    updateHUD();
    window.onMinigameComplete?.('hangman', false);
    return;
  }

  renderHangman();
}

const HANGMAN_WORD_BONUS = 30;  // REP for correct whole-word guess
const HANGMAN_WORD_PENALTY = 25; // REP lost for wrong whole-word guess

function guessWord() {
  const hs = hangmanState;
  if (!hs || hs.done) return;
  const input = document.getElementById('hm-word-input');
  const guess = input.value.trim().toUpperCase();
  input.value = '';
  if (!guess) return;
  hs.wordMode = true;

  if (guess === hs.word) {
    // Correct whole-word guess — bonus REP
    hs.done = true;
    renderHangman();
    Player.rep = Math.min(Player.rep + HANGMAN_WORD_BONUS, Settings.goalRep);
    document.getElementById('hm-result').textContent = `Correct! The whole name! +${HANGMAN_WORD_BONUS} REP`;
    document.getElementById('hm-result').className = 'rep-gain';
    document.getElementById('hm-feedback').textContent = '';
    document.getElementById('btn-hm-return').style.display = '';
    updateHUD();
    window.onMinigameComplete?.('hangman', true);
  } else {
    // Wrong whole-word guess — extra penalty
    hs.wrong += 2;
    document.getElementById('hm-feedback').textContent = `✗ "${guess}" is not the name. −${HANGMAN_WORD_PENALTY} REP`;
    document.getElementById('hm-feedback').style.color = 'var(--danger)';
    Player.rep = Math.max(0, Player.rep - HANGMAN_WORD_PENALTY);
    updateHUD();

    if (hs.wrong >= MAX_WRONG) {
      hs.done = true;
      renderHangman();
      document.getElementById('hm-result').textContent = `The answer was: ${hs.word}  -${HANGMAN_WORD_PENALTY} REP`;
      document.getElementById('hm-result').className = 'rep-loss';
      document.getElementById('btn-hm-return').style.display = '';
      window.onMinigameComplete?.('hangman', false);
    } else {
      renderHangman();
    }
  }
}

function closeHangman() {
  if (hangmanState === null) return;
  hangmanState = null;
  // Move player away from terminal within bounds
  const newTy = Math.min(Player.ty + 2, currentRoom.rows - 1);
  Player.ty = newTy;
  Player.py = Player.ty * T;
  Player.targetPy = Player.py;
  showScreen('game');
  resizeCanvas();
  AudioManager.startExploration();
  if (onMinigameClosed) onMinigameClosed();
}

document.getElementById('btn-hm-skip')?.addEventListener('click', closeHangman);
document.getElementById('btn-hm-return')?.addEventListener('click', closeHangman);
document.getElementById('btn-hm-guess-word')?.addEventListener('click', guessWord);
document.getElementById('hm-word-input')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); guessWord(); }
});


// ─── POP CONNECT – Collab Chain ───────────────────────────────

// Undirected collab graph — SYMMETRIC (every edge listed both ways)
const COLLAB_GRAPH = {
  "Alicia Keys": [
    "Drake",
    "Jay-Z",
    "Kendrick Lamar",
    "Khalid",
    "SZA"
  ],
  "Anderson .Paak": [
    "Bruno Mars",
    "Kendrick Lamar"
  ],
  "Ariana Grande": [
    "Doja Cat",
    "Justin Bieber",
    "Lady Gaga",
    "Megan Thee Stallion",
    "Nicki Minaj",
    "The Weeknd"
  ],
  "Bad Bunny": [
    "Cardi B",
    "Drake"
  ],
  "Bebe Rexha": [
    "David Guetta",
    "G-Eazy",
    "Martin Garrix"
  ],
  "Beyoncé": [
    "Ed Sheeran",
    "Jay-Z",
    "Kanye West",
    "Kendrick Lamar",
    "Lady Gaga",
    "Megan Thee Stallion",
    "Nicki Minaj",
    "Shakira"
  ],
  "Billie Eilish": [
    "Justin Bieber",
    "Khalid"
  ],
  "Billy Ray Cyrus": [
    "Lil Nas X",
    "Miley Cyrus"
  ],
  "Bradley Cooper": [
    "Lady Gaga"
  ],
  "Brendon Urie": [
    "Taylor Swift"
  ],
  "Britney Spears": [
    "Elton John",
    "Iggy Azalea"
  ],
  "Bruno Mars": [
    "Anderson .Paak",
    "Cardi B",
    "Travie McCoy"
  ],
  "Calvin Harris": [
    "Dua Lipa",
    "Pharrell Williams",
    "Rihanna",
    "Sam Smith"
  ],
  "Cardi B": [
    "Bad Bunny",
    "Bruno Mars",
    "Megan Thee Stallion"
  ],
  "DaBaby": [
    "Dua Lipa",
    "Megan Thee Stallion"
  ],
  "Daft Punk": [
    "Pharrell Williams",
    "The Weeknd"
  ],
  "David Guetta": [
    "Bebe Rexha",
    "Lil Wayne",
    "Nicki Minaj"
  ],
  "Disclosure": [
    "Khalid",
    "Sam Smith"
  ],
  "Doja Cat": [
    "Ariana Grande",
    "Megan Thee Stallion",
    "Nicki Minaj",
    "SZA",
    "The Weeknd"
  ],
  "Dolly Parton": [
    "Kenny Rogers",
    "Miley Cyrus"
  ],
  "Drake": [
    "Alicia Keys",
    "Bad Bunny",
    "Future",
    "Jay-Z",
    "Kanye West",
    "Lil Wayne",
    "Nicki Minaj",
    "Rihanna",
    "Travis Scott"
  ],
  "Dua Lipa": [
    "Calvin Harris",
    "DaBaby",
    "Elton John",
    "Megan Thee Stallion",
    "Miley Cyrus"
  ],
  "Ed Sheeran": [
    "Beyoncé",
    "Elton John",
    "Eminem",
    "Future",
    "Justin Bieber",
    "Khalid",
    "Taylor Swift",
    "Travis Scott"
  ],
  "Elton John": [
    "Britney Spears",
    "Dua Lipa",
    "Ed Sheeran",
    "Lady Gaga"
  ],
  "Eminem": [
    "Ed Sheeran",
    "Lil Wayne",
    "Rihanna"
  ],
  "Future": [
    "Drake",
    "Ed Sheeran",
    "Taylor Swift",
    "Travis Scott"
  ],
  "G-Eazy": [
    "Bebe Rexha"
  ],
  "Iggy Azalea": [
    "Britney Spears"
  ],
  "Jack Harlow": [
    "Lil Nas X"
  ],
  "Jay-Z": [
    "Alicia Keys",
    "Beyoncé",
    "Drake",
    "Justin Timberlake",
    "Kanye West",
    "Mariah Carey",
    "Pharrell Williams",
    "Rihanna"
  ],
  "Justin Bieber": [
    "Ariana Grande",
    "Billie Eilish",
    "Ed Sheeran",
    "Mariah Carey",
    "Nicki Minaj",
    "Travis Scott"
  ],
  "Justin Timberlake": [
    "Jay-Z",
    "Madonna",
    "Pharrell Williams"
  ],
  "Kanye West": [
    "Beyoncé",
    "Drake",
    "Jay-Z",
    "Kendrick Lamar",
    "Lil Wayne",
    "Paul McCartney",
    "Rihanna",
    "Travis Scott"
  ],
  "Kendrick Lamar": [
    "Alicia Keys",
    "Anderson .Paak",
    "Beyoncé",
    "Kanye West",
    "Rihanna",
    "SZA",
    "Travis Scott"
  ],
  "Kenny Rogers": [
    "Dolly Parton"
  ],
  "Khalid": [
    "Alicia Keys",
    "Billie Eilish",
    "Disclosure",
    "Ed Sheeran",
    "Normani"
  ],
  "Kim Petras": [
    "Sam Smith"
  ],
  "Lady Gaga": [
    "Ariana Grande",
    "Beyoncé",
    "Bradley Cooper",
    "Elton John",
    "Tony Bennett"
  ],
  "Lil Nas X": [
    "Billy Ray Cyrus",
    "Jack Harlow"
  ],
  "Lil Wayne": [
    "David Guetta",
    "Drake",
    "Eminem",
    "Kanye West",
    "Nicki Minaj",
    "Travis Scott"
  ],
  "Madonna": [
    "Justin Timberlake",
    "Maluma",
    "Nicki Minaj"
  ],
  "Maluma": [
    "Madonna",
    "Shakira",
    "The Weeknd"
  ],
  "Mariah Carey": [
    "Jay-Z",
    "Justin Bieber",
    "Whitney Houston"
  ],
  "Martin Garrix": [
    "Bebe Rexha"
  ],
  "Megan Thee Stallion": [
    "Ariana Grande",
    "Beyoncé",
    "Cardi B",
    "DaBaby",
    "Doja Cat",
    "Dua Lipa",
    "Nicki Minaj"
  ],
  "Michael Jackson": [
    "Paul McCartney"
  ],
  "Miley Cyrus": [
    "Billy Ray Cyrus",
    "Dolly Parton",
    "Dua Lipa"
  ],
  "Nicki Minaj": [
    "Ariana Grande",
    "Beyoncé",
    "David Guetta",
    "Doja Cat",
    "Drake",
    "Justin Bieber",
    "Lil Wayne",
    "Madonna",
    "Megan Thee Stallion"
  ],
  "Normani": [
    "Khalid",
    "Sam Smith"
  ],
  "Paul McCartney": [
    "Kanye West",
    "Michael Jackson",
    "Rihanna"
  ],
  "Pharrell Williams": [
    "Calvin Harris",
    "Daft Punk",
    "Jay-Z",
    "Justin Timberlake"
  ],
  "Post Malone": [
    "Travis Scott"
  ],
  "Rihanna": [
    "Calvin Harris",
    "Drake",
    "Eminem",
    "Jay-Z",
    "Kanye West",
    "Kendrick Lamar",
    "Paul McCartney"
  ],
  "SZA": [
    "Alicia Keys",
    "Doja Cat",
    "Kendrick Lamar",
    "Travis Scott"
  ],
  "Sam Smith": [
    "Calvin Harris",
    "Disclosure",
    "Kim Petras",
    "Normani"
  ],
  "Shakira": [
    "Beyoncé",
    "Maluma",
    "Wyclef Jean"
  ],
  "Taylor Swift": [
    "Brendon Urie",
    "Ed Sheeran",
    "Future"
  ],
  "The Weeknd": [
    "Ariana Grande",
    "Daft Punk",
    "Doja Cat",
    "Maluma",
    "Travis Scott"
  ],
  "Tony Bennett": [
    "Lady Gaga"
  ],
  "Travie McCoy": [
    "Bruno Mars"
  ],
  "Travis Scott": [
    "Drake",
    "Ed Sheeran",
    "Future",
    "Justin Bieber",
    "Kanye West",
    "Kendrick Lamar",
    "Lil Wayne",
    "Post Malone",
    "SZA",
    "The Weeknd"
  ],
  "Whitney Houston": [
    "Mariah Carey"
  ],
  "Wyclef Jean": [
    "Shakira"
  ]
};

// BFS to find shortest path
function bfsPath(start, end) {
  if (start === end) return [start];
  const queue = [[start]];
  const visited = new Set([start]);
  while (queue.length) {
    const path = queue.shift();
    const node = path[path.length - 1];
    for (const neighbor of (COLLAB_GRAPH[node] || [])) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      const newPath = [...path, neighbor];
      if (neighbor === end) return newPath;
      queue.push(newPath);
    }
  }
  return null;
}

// Generate a puzzle: pick two artists whose shortest path is exactly `hops` steps
function generateCollabPuzzle(targetHops = 3) {
  const artists = Object.keys(COLLAB_GRAPH).filter(a => (COLLAB_GRAPH[a]?.length || 0) >= 2);
  let attempts = 0;
  while (attempts++ < 200) {
    const a = artists[Math.floor(Math.random() * artists.length)];
    const b = artists[Math.floor(Math.random() * artists.length)];
    if (a === b) continue;
    const path = bfsPath(a, b);
    if (path && path.length - 1 === targetHops) {
      return { start: a, end: b, solution: path, hops: targetHops };
    }
  }
  return {
    start: 'Lady Gaga',
    end: 'Bebe Rexha',
    solution: ['Lady Gaga', 'Ariana Grande', 'Miley Cyrus', 'Dolly Parton', 'Bebe Rexha'],
    hops: 4
  };
}

const COLLAB_REP_WIN  = 30;
const COLLAB_REP_LOSS = 12;

let collabState = null;

export function startCollabGame() {
  const hops = Math.random() < 0.5 ? 2 : 3;
  const puzzle = generateCollabPuzzle(hops);
  collabState = {
    puzzle,
    hops,
    playerChain: [puzzle.start],
    currentStep: 0,
    middleCount: hops - 1,
    wrong: 0,
    done: false
  };

  document.getElementById('pc-start-artist').textContent = puzzle.start;
  document.getElementById('pc-end-artist').textContent   = puzzle.end;
  document.getElementById('pc-hint').textContent =
    `Find ${hops === 2 ? '1 artist' : '2 artists'} who link them through real collaborations.`;
  document.getElementById('pc-feedback').textContent = '';
  document.getElementById('pc-result').textContent = '';
  document.getElementById('pc-result').className = '';
  document.getElementById('btn-pc-return').style.display = 'none';
  const skipBtn = document.getElementById('btn-pc-skip');
  if (skipBtn) skipBtn.style.display = '';

  renderCollabChain();
  renderCollabChoices();
}

function renderCollabChain() {
  const cs = collabState;
  const chainEl = document.getElementById('pc-chain');
  chainEl.innerHTML = '';

  const totalSlots = cs.hops + 1; // start + middles + end
  for (let i = 0; i < totalSlots; i++) {
    const slot = document.createElement('div');
    slot.className = 'pc-slot';

    if (i === 0) {
      slot.classList.add('filled');
      slot.textContent = cs.puzzle.start;
    } else if (i === totalSlots - 1) {
      slot.classList.add('end');
      slot.textContent = cs.puzzle.end;
    } else {
      if (i <= cs.playerChain.length - 1) {
        slot.classList.add('filled');
        slot.textContent = cs.playerChain[i];
      } else {
        slot.classList.add('empty');
        slot.textContent = i === cs.playerChain.length ? '?' : '···';
      }
    }

    chainEl.appendChild(slot);
    if (i < totalSlots - 1) {
      const arrow = document.createElement('div');
      arrow.className = 'pc-arrow';
      arrow.textContent = '→';
      chainEl.appendChild(arrow);
    }
  }
}

function hasPathOfLength(start, end, steps, visited) {
  if (steps === 0) return start === end;
  if (steps < 0) return false;
  
  const neighbors = COLLAB_GRAPH[start] || [];
  for (const neighbor of neighbors) {
    if (visited.has(neighbor)) continue;
    visited.add(neighbor);
    if (hasPathOfLength(neighbor, end, steps - 1, visited)) {
      visited.delete(neighbor);
      return true;
    }
    visited.delete(neighbor);
  }
  return false;
}

function renderCollabChoices() {
  const cs = collabState;
  const choicesEl = document.getElementById('pc-choices');
  if (!choicesEl) return;
  choicesEl.innerHTML = '';
  if (cs.done) return;

  const fromArtist = cs.playerChain[cs.playerChain.length - 1];
  const endArtist = cs.puzzle.end;
  const remainingHops = cs.hops - cs.playerChain.length;
  const fromNeighbors = COLLAB_GRAPH[fromArtist] || [];

  // Find ALL valid choices that lead to the target endArtist in exactly remainingHops
  const validChoices = fromNeighbors.filter(n => {
    if (n === endArtist) return false;
    if (cs.playerChain.includes(n)) return false;
    const visited = new Set(cs.playerChain);
    visited.add(n);
    return hasPathOfLength(n, endArtist, remainingHops, visited);
  });

  // If no valid choices exist (fallback - should be mathematically impossible but safe), use BFS solution
  if (validChoices.length === 0) {
    const bfsSol = cs.puzzle.solution[cs.playerChain.length];
    if (bfsSol) validChoices.push(bfsSol);
  }

  // Pick correct answer(s) to display (up to 2 correct options)
  const displayedCorrect = shuffleArray(validChoices).slice(0, Math.min(2, validChoices.length));

  // Build high-fidelity distractors:
  // 1. "Plausible but invalid neighbors" (real neighbors of fromArtist that are invalid/lead to dead ends)
  const nearDistractors = fromNeighbors.filter(n => n !== endArtist && !cs.playerChain.includes(n) && !validChoices.includes(n));

  // 2. "End-side distractors" (neighbors of endArtist that don't connect to current artist)
  const endNeighbors = (COLLAB_GRAPH[endArtist] || []).filter(Boolean);
  const farDistractors = endNeighbors.filter(n => n !== fromArtist && !cs.playerChain.includes(n) && !validChoices.includes(n) && !fromNeighbors.includes(n));

  // 3. Generic distractors
  const allArtists = Object.keys(COLLAB_GRAPH);
  const genericDistractors = allArtists.filter(a => a !== fromArtist && a !== endArtist && !cs.playerChain.includes(a) && !validChoices.includes(a) && !fromNeighbors.includes(a) && !endNeighbors.includes(a));

  const numDistractorsNeeded = Math.max(0, 6 - displayedCorrect.length);
  const shuffledNear = shuffleArray(nearDistractors);
  const shuffledFar = shuffleArray(farDistractors);
  const shuffledGeneric = shuffleArray(genericDistractors);

  const chosenDistractors = [];
  // Sample up to 2 near distractors
  const nearCount = Math.min(2, shuffledNear.length);
  chosenDistractors.push(...shuffledNear.slice(0, nearCount));

  // Sample up to 2 far distractors
  const farCount = Math.min(2, shuffledFar.length);
  chosenDistractors.push(...shuffledFar.slice(0, farCount));

  // Fill the remaining spots with generic
  const remainingNeeded = numDistractorsNeeded - chosenDistractors.length;
  chosenDistractors.push(...shuffledGeneric.slice(0, remainingNeeded));

  const choices = shuffleArray([...displayedCorrect, ...chosenDistractors]);

  // Safety fallback: if somehow no choices were built, show at least the BFS solution
  if (choices.length === 0 && cs.puzzle.solution) {
    const bfsFallback = cs.puzzle.solution[cs.playerChain.length];
    if (bfsFallback) choices.push(bfsFallback);
  }

  choices.forEach(artist => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn pc-choice';
    btn.textContent = artist;
    btn.addEventListener('click', () => handleCollabChoice(artist, validChoices, nearDistractors, btn));
    choicesEl.appendChild(btn);
  });
}

// Accepts any valid artist and handles smart feedback based on why a choice was wrong
function handleCollabChoice(chosen, validChoices, nearDistractors, btn) {
  const cs = collabState;
  document.querySelectorAll('.pc-choice').forEach(b => b.disabled = true);

  const feedback = document.getElementById('pc-feedback');
  const skipBtn = document.getElementById('btn-pc-skip');
  const isValid = validChoices.includes(chosen);

  if (isValid) {
    btn.classList.add('correct');
    cs.playerChain.push(chosen);
    const prevArtist = cs.playerChain[cs.playerChain.length - 2];
    feedback.textContent = `✓ ${chosen} collabed with ${prevArtist}!`;
    feedback.style.color = 'var(--success)';

    renderCollabChain();

    // Check if chain is complete (all middles filled)
    if (cs.playerChain.length === cs.hops + 1) {
      // Verify last link connects to end
      const lastMid = cs.playerChain[cs.playerChain.length - 1];
      const endNeighbors = COLLAB_GRAPH[lastMid] || [];
      if (endNeighbors.includes(cs.puzzle.end)) {
        cs.done = true;
        cs.playerChain.push(cs.puzzle.end);
        renderCollabChain();
        Player.rep = Math.min(Player.rep + COLLAB_REP_WIN, Settings.goalRep);
        document.getElementById('pc-result').textContent = `Chain complete! +${COLLAB_REP_WIN} REP`;
        document.getElementById('pc-result').className = 'rep-gain';
        
        if (skipBtn) skipBtn.style.display = 'none';
        document.getElementById('btn-pc-return').style.display = '';
        
        updateHUD();
        window.onMinigameComplete?.('collab', true);
        return;
      } else {
        // Fallback: shouldn't happen, but close gracefully
        console.error('Pop Connect: endNeighbors check failed unexpectedly for', lastMid, '->', cs.puzzle.end);
        cs.done = true;
        
        const choicesEl = document.getElementById('pc-choices');
        if (choicesEl) choicesEl.innerHTML = '';
        if (feedback) feedback.textContent = '';
        
        document.getElementById('pc-result').textContent = `Something went wrong. One valid path: ${cs.puzzle.solution.join(' → ')}`;
        document.getElementById('pc-result').className = 'rep-loss';
        
        if (skipBtn) skipBtn.style.display = 'none';
        document.getElementById('btn-pc-return').style.display = '';
        
        window.onMinigameComplete?.('collab', false);
        return;
      }
    }
    setTimeout(renderCollabChoices, 900);
  } else {
    // Immediate strike out on wrong answer
    cs.done = true;
    btn.classList.add('wrong');
    
    // Highlight all valid answers green
    document.querySelectorAll('.pc-choice').forEach(b => {
      if (validChoices.includes(b.textContent)) b.classList.add('correct');
    });
    
    Player.rep = Math.max(0, Player.rep - COLLAB_REP_LOSS);

    // Dynamic, educational feedback explaining why they failed
    const prevArtist = cs.playerChain[cs.playerChain.length - 1];
    if (nearDistractors.includes(chosen)) {
      feedback.textContent = `✗ ${chosen} collabed with ${prevArtist}, but leads to a dead end! −${COLLAB_REP_LOSS} REP`;
    } else {
      feedback.textContent = `✗ ${chosen} has not collaborated with ${prevArtist}! −${COLLAB_REP_LOSS} REP`;
    }
    feedback.style.color = 'var(--danger)';
    updateHUD();

    // Hide Leave Corner button immediately so player can only click Return when ready
    if (skipBtn) skipBtn.style.display = 'none';

    // Wait 1.8s to let them digest the mistake, then clear panel and show final path + return button
    setTimeout(() => {
      const choicesEl = document.getElementById('pc-choices');
      if (choicesEl) choicesEl.innerHTML = '';
      if (feedback) feedback.textContent = '';

      const sol = cs.puzzle.solution;
      document.getElementById('pc-result').textContent = `Chain broken. One valid path: ${sol.join(' → ')}`;
      document.getElementById('pc-result').className = 'rep-loss';
      
      document.getElementById('btn-pc-return').style.display = '';
      window.onMinigameComplete?.('collab', false);
    }, 1800);
  }
}

function closeCollabGame() {
  if (collabState === null) return;
  collabState = null;
  // Move player away from terminal within bounds
  const newTy = Math.min(Player.ty + 2, currentRoom.rows - 1);
  Player.ty = newTy;
  Player.py = Player.ty * T;
  Player.targetPy = Player.py;
  showScreen('game');
  resizeCanvas();
  AudioManager.startExploration();
  if (onMinigameClosed) onMinigameClosed();
}

document.getElementById('btn-pc-skip')?.addEventListener('click', closeCollabGame);
document.getElementById('btn-pc-return')?.addEventListener('click', closeCollabGame);
