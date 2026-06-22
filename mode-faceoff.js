// ============================================================
//  DIVA ACADEMY – Face-Off (Trivia Battle Mode)
// ============================================================

import { T, Player, Settings, WorldState, saveGame, hasPerk, runStats, setQuestStep, onRivalDefeated, onRivalPlayerLost, triggerStartDialogue } from './engine-state.js';
import { TIERS } from './data-rooms.js';
import { showScreen } from './engine-input.js';
import { ScreenShake, Juice, updateHUD, showPerkActivation, spawnBurst } from './engine-gfx.js';
import { getRandomQuestions, markConsumed, CAT_LABELS } from './questions.js';
import AudioManager from './audio.js';

const FACEOFF_TIME = 12;
const FAST_BONUS_THRESHOLD = 6;
const FAST_BONUS_REP = 3;
const STREAK_FIRE = 3;
const STREAK_FIRE_BONUS = 5;
const STREAK_UNSTOPPABLE = 5;
const STREAK_UNSTOPPABLE_BONUS = 10;


export let faceoffState = null;

export const FaceoffCanvas = {
  canvas: null,
  ctx: null,
  animFrame: null,
  particles: [],
  spotlightAngle: 0,
  npcBob: 0,
  npcReaction: 0,
  npcReactionTimer: 0,

  init() {
    this.canvas = document.getElementById('faceoffCanvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },

  start() {
    this.stop(); // cancel any existing loop first
    this.resize();
    this.particles = [];
    this.spotlightAngle = 0;
    this.npcBob = 0;
    this.npcReaction = 0;
    this.npcReactionTimer = 0;
    this.loop();
  },

  stop() {
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
  },

  loop() {
    this.render();
    this.animFrame = requestAnimationFrame(() => this.loop());
  },

  triggerReaction(type) {
    this.npcReaction = type === 'correct' ? 1 : -1;
    this.npcReactionTimer = 20;
    const count = type === 'correct' ? 15 : 8;
    const color = type === 'correct' ? '#22c55e' : '#ef4444';
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: this.canvas.width / 2,
        y: this.canvas.height * 0.35,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 1.5) * 4,
        life: 1,
        decay: 0.02 + Math.random() * 0.02,
        size: 3 + Math.random() * 5,
        color
      });
    }
  },

  render() {
    const c = this.ctx;
    if (!c) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const t = performance.now();

    c.clearRect(0, 0, W, H);

    // Dark stage background
    const bgGrad = c.createRadialGradient(W/2, H*0.3, 0, W/2, H*0.3, H*0.8);
    bgGrad.addColorStop(0, 'rgba(139,92,246,0.12)');
    bgGrad.addColorStop(0.5, 'rgba(10,10,18,0.95)');
    bgGrad.addColorStop(1, '#0a0a12');
    c.fillStyle = bgGrad;
    c.fillRect(0, 0, W, H);

    // Spotlight beams
    this.spotlightAngle += 0.003;
    const spotColors = ['rgba(251,191,36,0.06)', 'rgba(192,132,252,0.05)', 'rgba(244,114,182,0.04)'];
    for (let i = 0; i < 3; i++) {
      const angle = this.spotlightAngle + (i * Math.PI * 2 / 3);
      const sx = W/2 + Math.cos(angle) * W * 0.25;
      const ex = W/2 + Math.cos(angle + 0.3) * W * 0.15;
      c.beginPath();
      c.moveTo(sx, 0);
      c.lineTo(ex, H * 0.7);
      c.lineTo(W/2, H * 0.7);
      c.closePath();
      c.fillStyle = spotColors[i];
      c.fill();
    }

    // Stage floor glow
    const floorGrad = c.createRadialGradient(W/2, H*0.75, 0, W/2, H*0.75, W*0.4);
    floorGrad.addColorStop(0, 'rgba(192,132,252,0.08)');
    floorGrad.addColorStop(1, 'transparent');
    c.fillStyle = floorGrad;
    c.fillRect(0, H*0.5, W, H*0.5);

    // NPC portrait (large, centered)
    this.npcBob = Math.sin(t * 0.002) * 6;
    if (this.npcReactionTimer > 0) {
      this.npcReactionTimer--;
      this.npcReaction *= 0.9;
    } else {
      this.npcReaction = 0;
    }

    const npcX = W / 2;
    const npcY = H * 0.35 + this.npcBob;
    const npcR = Math.min(W, H) * 0.12;

    // NPC glow ring
    c.beginPath();
    c.arc(npcX, npcY, npcR + 8, 0, Math.PI * 2);
    c.strokeStyle = `rgba(192,132,252,${0.3 + 0.15 * Math.sin(t * 0.004)})`;
    c.lineWidth = 3;
    c.shadowBlur = 20;
    c.shadowColor = 'rgba(192,132,252,0.4)';
    c.stroke();
    c.shadowBlur = 0;

    // NPC circle background
    const npcBgGrad = c.createRadialGradient(npcX, npcY, 0, npcX, npcY, npcR);
    npcBgGrad.addColorStop(0, 'rgba(28,28,58,0.9)');
    npcBgGrad.addColorStop(1, 'rgba(20,20,42,0.95)');
    c.beginPath();
    c.arc(npcX, npcY, npcR, 0, Math.PI * 2);
    c.fillStyle = npcBgGrad;
    c.fill();

    // NPC emoji
    c.font = `${npcR * 1.2}px serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.save();
    if (this.npcReaction !== 0) {
      c.translate(npcX + this.npcReaction * 8, npcY);
      c.rotate(this.npcReaction * 0.1);
      c.translate(-npcX, -npcY);
    }
    if (faceoffState) {
      c.fillText(faceoffState.tier.emoji, npcX, npcY);
    }
    c.restore();

    // Sparkle particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.life -= p.decay;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      c.save();
      c.globalAlpha = p.life;
      c.fillStyle = p.color;
      c.fillRect(p.x, p.y, p.size * p.life, p.size * p.life);
      c.restore();
    }

    // Ambient sparkles
    for (let i = 0; i < 8; i++) {
      const sx = (Math.sin(t * 0.001 + i * 2.1) * 0.5 + 0.5) * W;
      const sy = (Math.cos(t * 0.0013 + i * 1.7) * 0.5 + 0.5) * H;
      const alpha = Math.max(0, Math.sin(t * 0.003 + i * 0.8)) * 0.4;
      if (alpha > 0.1) {
        c.fillStyle = `rgba(255,255,255,${alpha})`;
        c.fillRect(sx, sy - 2, 1, 5);
        c.fillRect(sx - 2, sy, 5, 1);
      }
    }

    // Vignette
    const vigGrad = c.createRadialGradient(W/2, H/2, W*0.3, W/2, H/2, W*0.7);
    vigGrad.addColorStop(0, 'transparent');
    vigGrad.addColorStop(1, 'rgba(0,0,0,0.4)');
    c.fillStyle = vigGrad;
    c.fillRect(0, 0, W, H);
  }
};

export function startFaceOff(npc) {
  const tier = TIERS[npc.tier];
  const questions = getRandomQuestions(tier.questions);
  if (!questions || questions.length === 0) {
    triggerStartDialogue(npc.name, ['The question pool is empty. Add more questions in Settings and try again.']);
    return;
  }
  faceoffState = {
    npc, tier,
    questions,
    current: 0, correct: 0, wrong: 0,
    streak: 0, bestStreak: 0,
    timeLeft: FACEOFF_TIME,
    timerInterval: null,
    bonusRep: 0,
    graceUsed: false
  };
  AudioManager.startFaceOffTrack();
  showScreen('faceoff');
  FaceoffCanvas.start();
  renderFaceOffScreen();
}

export function renderFaceOffScreen() {
  const fs = faceoffState;
  document.getElementById('faceoff-npc-art').textContent = fs.tier.emoji;
  document.getElementById('faceoff-npc-name').textContent = fs.npc.name;
  const trophy = document.getElementById('faceoff-tier-trophy');
  if (trophy) {
    trophy.textContent = fs.tier.label;
    trophy.className = fs.tier.trophy;
  }
  const repPreview = document.getElementById('faceoff-rep-preview');
  if (repPreview) {
    repPreview.textContent = `Win: +${fs.tier.repWin} REP | Wrong: −${fs.tier.repLoss} REP each`;
  }
  renderQuestion();
}

export function renderQuestion() {
  if (faceoffState.current >= faceoffState.questions.length) {
    endFaceOff();
    return;
  }
  const q = faceoffState.questions[faceoffState.current];
  const catLabel = CAT_LABELS[q.cat] || '';
  const showCat = hasPerk('insight') ? (catLabel ? '· ' + catLabel : '') : '';
  const progress = document.getElementById('faceoff-progress');
  if (progress) {
    progress.textContent = `Question ${faceoffState.current+1} / ${faceoffState.questions.length} ${showCat}`;
  }
  const questionEl = document.getElementById('faceoff-question');
  if (questionEl) {
    questionEl.textContent = q.q;
  }
  const feedback = document.getElementById('faceoff-feedback');
  if (feedback) {
    feedback.textContent = '';
  }
  const el = document.getElementById('faceoff-choices');
  if (el) {
    el.innerHTML = '';
    q.choices.forEach((c, i) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = c;
      btn.addEventListener('click', () => answerFaceOff(i, q.answer, btn));
      el.appendChild(btn);
    });
  }
  updateStreakUI();
  startTimer();
}

export function startTimer() {
  stopTimer();
  const maxTime = FACEOFF_TIME + (hasPerk('haste') ? 3 : 0);
  faceoffState.timeLeft = maxTime;
  faceoffState.maxTime = maxTime;
  renderTimer();
  faceoffState.timerInterval = setInterval(() => {
    faceoffState.timeLeft = Math.max(0, faceoffState.timeLeft - 0.1);
    renderTimer();
    if (faceoffState.timeLeft <= 0) {
      stopTimer();
      timeUp();
    }
  }, 100);
}

export function stopTimer() {
  if (faceoffState.timerInterval) {
    clearInterval(faceoffState.timerInterval);
    faceoffState.timerInterval = null;
  }
}

export function renderTimer() {
  const fs = faceoffState;
  const maxTime = fs.maxTime || FACEOFF_TIME;
  const pct = (fs.timeLeft / maxTime) * 100;
  const fill = document.getElementById('faceoff-timer-fill');
  const label = document.getElementById('faceoff-timer-label');
  if (fill) {
    fill.style.width = pct + '%';
    fill.classList.remove('warning', 'danger');
    if (pct <= 25) fill.classList.add('danger');
    else if (pct <= 50) fill.classList.add('warning');
  }
  if (label) {
    label.textContent = Math.ceil(fs.timeLeft);
  }
}

export function timeUp() {
  const fs = faceoffState;
  const correct = fs.questions[fs.current].answer;
  document.querySelectorAll('.choice-btn').forEach(b => {
    b.disabled = true;
  });
  const correctBtn = document.querySelectorAll('.choice-btn')[correct];
  if (correctBtn) {
    correctBtn.classList.add('correct');
  }
  fs.wrong++;
  fs.streak = 0;
  const fb = document.getElementById('faceoff-feedback');
  if (fb) {
    fb.textContent = 'Time up! ' + fs.questions[fs.current].choices[correct];
    fb.style.color = 'var(--danger)';
  }
  FaceoffCanvas.triggerReaction('wrong');
  ScreenShake.trigger(8);
  Juice.flash('#ef4444', 0.2);
  AudioManager.playSFX('wrong');
  fs.current++;
  setTimeout(renderQuestion, 1500);
}

export function updateStreakUI() {
  const el = document.getElementById('faceoff-streak-label');
  if (!el) return;
  const s = faceoffState.streak;
  if (s >= STREAK_UNSTOPPABLE) {
    el.textContent = `UNSTOPPABLE! (${s} streak)`;
    el.className = 'unstoppable';
  } else if (s >= STREAK_FIRE) {
    el.textContent = `ON FIRE! (${s} streak)`;
    el.className = 'on-fire';
  } else if (s >= 2) {
    el.textContent = `${s} streak`;
    el.className = '';
  } else {
    el.textContent = '';
    el.className = '';
  }
}

export function answerFaceOff(chosen, correct, btn) {
  stopTimer();
  document.querySelectorAll('.choice-btn').forEach(b => {
    b.disabled = true;
  });
  const correctBtn = document.querySelectorAll('.choice-btn')[correct];
  if (correctBtn) {
    correctBtn.classList.add('correct');
  }
  const fb = document.getElementById('faceoff-feedback');
  const fs = faceoffState;
  const q = fs.questions[fs.current];
  const catLabel = CAT_LABELS[q.cat] || '';
  const insightTag = hasPerk('insight') && catLabel ? ` [${catLabel}]` : '';
  
  if (chosen === correct) { 
    fs.correct++;
    fs.streak++;
    if (fs.streak > fs.bestStreak) fs.bestStreak = fs.streak;
    btn.classList.add('correct');
    let bonusText = '';
    if (fs.timeLeft >= FAST_BONUS_THRESHOLD) {
      fs.bonusRep += FAST_BONUS_REP;
      bonusText = ` +${FAST_BONUS_REP} fast bonus!`;
    }
    if (fs.streak === STREAK_FIRE) {
      fs.bonusRep += STREAK_FIRE_BONUS;
      bonusText += ` ON FIRE! +${STREAK_FIRE_BONUS}!`;
      Juice.flash('#fbbf24', 0.2);
    } else if (fs.streak === STREAK_UNSTOPPABLE) {
      fs.bonusRep += STREAK_UNSTOPPABLE_BONUS;
      bonusText += ` UNSTOPPABLE! +${STREAK_UNSTOPPABLE_BONUS}!`;
      Juice.flash('#f472b6', 0.25);
    }
    if (fb) {
      fb.textContent = '✓ Correct!' + insightTag + bonusText;
      fb.style.color = 'var(--success)';
    }
    FaceoffCanvas.triggerReaction('correct');
    ScreenShake.trigger(4);
    Juice.flash('#22c55e', 0.15);
    Juice.punch(1.05);
    AudioManager.playSFX('correct');
  } else { 
    const isGrace = hasPerk('grace') && !fs.graceUsed;
    if (isGrace) {
      fs.graceUsed = true;
      if (fb) {
        fb.textContent = 'Grace! (first wrong forgiven) — ' + q.choices[correct];
        fb.style.color = 'var(--success)';
      }
      showPerkActivation('Grace activated — wrong answer forgiven!');
    } else {
      fs.wrong++;
      fs.streak = 0;
      btn.classList.add('wrong'); 
      if (fb) {
        fb.textContent = '✗ ' + q.choices[correct] + insightTag; 
        fb.style.color = 'var(--danger)';
      }
    }
    FaceoffCanvas.triggerReaction(isGrace ? 'correct' : 'wrong');
    ScreenShake.trigger(isGrace ? 2 : 8);
    Juice.flash(isGrace ? '#22c55e' : '#ef4444', isGrace ? 0.1 : 0.2);
    AudioManager.playSFX(isGrace ? 'correct' : 'wrong');
  }
  updateStreakUI();
  fs.current++;
  setTimeout(renderQuestion, 1200);
}

export function endFaceOff() {
  stopTimer();
  FaceoffCanvas.stop();
  const fs = faceoffState;
  const allCorrect = fs.correct === fs.questions.length;
  let repChange, title, body, icon;
  
  if (allCorrect) { 
    repChange = fs.tier.repWin + fs.bonusRep;
    title = 'Perfect!';
    body = `${fs.correct}/${fs.questions.length} correct against ${fs.npc.name}.${fs.bonusRep > 0 ? ` (+${fs.bonusRep} bonus)` : ''}`;
    icon = 'W';
    spawnBurst(Player.px + T/2, Player.py + T/2, '#fbbf24', 20);
    ScreenShake.trigger(12);
    Juice.flash('#fbbf24', 0.3);
    Juice.punch(1.15);
    AudioManager.playVictory();
  } else if (fs.correct > 0) { 
    repChange = -(fs.wrong * fs.tier.repLoss) + fs.bonusRep;
    title = 'Close One';
    body = `${fs.correct}/${fs.questions.length} correct.${fs.bonusRep > 0 ? ` (+${fs.bonusRep} bonus)` : ''}`;
    icon = '-';
    ScreenShake.trigger(3);
    Juice.flash('#ec4899', 0.1);
  } else { 
    repChange = -(fs.tier.repLoss * fs.questions.length);
    title = 'Defeated';
    body = `${fs.npc.name} got you on that one.`;
    icon = 'X';
    ScreenShake.trigger(10);
    Juice.flash('#ef4444', 0.25);
  }
  
  let spotlightUsed = false;
  if (repChange > 0 && WorldState.flags.spotlightActive) {
    repChange = Math.ceil(repChange * 1.5);
    WorldState.flags.spotlightActive = false;
    showPerkActivation('Spotlight — 1.5x REP used!');
    spotlightUsed = true;
  }
  
  Player.rep = Math.max(0, Math.min(Player.rep + repChange, Settings.goalRep));
  
  if (Player.rep <= 0 && hasPerk('clutch') && !Player.clutchUsedThisRun) {
    Player.rep = 1;
    Player.clutchUsedThisRun = true;
    title = 'Clutch Save!';
    body = 'You survived at 1 REP. Make it count.';
    icon = 'S';
    showPerkActivation('Clutch activated — you survive at 1 REP!');
    ScreenShake.trigger(6);
    Juice.flash('#22c55e', 0.25);
  }
  
  if (allCorrect) {
    WorldState.defeated[fs.npc.name] = true;
    if (fs.npc.tier === 'STARLET' && WorldState.questStep === 1) setQuestStep(2);
    if (fs.npc.name === 'MOTHER Eternia' && WorldState.questStep === 6) setQuestStep(7);
    if (fs.npc.isRival) onRivalDefeated();
    
    if (['DIVA', 'DJ', 'MOTHER'].includes(fs.npc.tier) && !WorldState.flags.spotlightActive) {
      WorldState.flags.spotlightActive = true;
      if (spotlightUsed) {
        setTimeout(() => showPerkActivation('Spotlight earned — 1.5x REP on next face-off!'), 2200);
      } else {
        showPerkActivation('Spotlight earned — 1.5x REP on next face-off!');
      }
    }
  } else if (fs.npc.isRival) {
    onRivalPlayerLost();
  }
  
  saveGame();
  markConsumed(fs.questions);
  runStats.questionsAnswered += fs.questions.length;
  if (allCorrect) runStats.npcsDefeated++;
  
  document.getElementById('result-icon').textContent = icon;
  document.getElementById('result-title').textContent = title;
  document.getElementById('result-body').textContent = body;
  
  const repEl = document.getElementById('result-rep-change');
  if (repEl) {
    repEl.textContent = repChange >= 0 ? `+${repChange} REP` : `${repChange} REP`;
    repEl.className = repChange >= 0 ? 'rep-gain' : 'rep-loss';
  }
  
  faceoffState = null;
  AudioManager.fadeOut(() => AudioManager.startExploration());
  showScreen('result');
  updateHUD();
}
