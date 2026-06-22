// ============================================================
//  DIVA ACADEMY – Lean Main Game Orchestrator
// ============================================================

import {
  T, Settings, Player, PlayerStyle, currentRoomId, currentRoom,
  paused, transitioning, setPaused, setTransitioning, setCurrentRoomId,
  WorldState, RIVAL, PERKS, PermState, hasTrophy, addTrophy,
  hasPerk, saveGame, loadGame, savePermState, loadPermState,
  loadSettings, runStats, resetRunStats, setQuestStepUpdatedHook, setStartDialogueHook,
  setQuestStep, removeRivalFromRoom, onRivalDefeated, onRivalPlayerLost,
  resetGame
} from './engine-state.js';

import { ROOMS, TIERS } from './data-rooms.js';

import {
  banterPool, recapPool, TUTORIAL_TEXT,
  loadBanterPool, getRandomBanter, loadRecapPool, getRandomRecap
} from './data-text.js';

import {
  canvas, ctx, resizeCanvas, getCam, updateObjectiveUI, updateHUD,
  CUSTOM_OPTIONS, getCustomDressColor, getCustomHairColor,
  drawTile, drawDecor, drawNPC, drawTerminal, drawPlayer,
  drawLighting, initSparkles, drawSparkles, updateBursts, drawBursts,
  getGroupedDoors, drawDoorLabels, drawPrompt, showPerkActivation,
  roomEntryTime, setRoomEntryTime, ScreenShake, Juice, getDoorDirection
} from './engine-gfx.js';

import { keys, dirPressed, screens, showScreen, initMobileDPad } from './engine-input.js';

import { startFaceOff, FaceoffCanvas, faceoffState } from './mode-faceoff.js';
import { startQuoteChallenge, loadQuotes, updateQuotePoolStatus, loadQuoteConsumed, quotePool } from './mode-turing.js';
import { startHangman, startCollabGame, setOnMinigameClosedHook } from './minigames.js';

import { loadQuestionBank, resetQuestionPool, isPoolLow, getPoolStatus, addManualQuestion, addGeneratedQuestions } from './questions.js';
import { loadSprites } from './assets.js';
import AudioManager from './audio.js';
import AIClient from './ai-client.js';

// ─── Dialogue State ──────────────────────────────────────────
let activeDialogue = null;
let gameLoopRunning = false;

export function startDialogue(speaker, lines, actions = []) {
  activeDialogue = { speaker, lines, actions, index: 0, selectedAction: 0 };
  renderDialogue();
}

function renderDialogue() {
  if (!activeDialogue) return;
  const box = document.getElementById('dialogue-box');
  const speaker = document.getElementById('dialogue-speaker');
  const text = document.getElementById('dialogue-text');
  const actions = document.getElementById('dialogue-actions');
  if (box) box.classList.remove('hidden');
  if (speaker) speaker.textContent = activeDialogue.speaker;
  if (text) text.textContent = activeDialogue.lines[activeDialogue.index];
  if (actions) {
    actions.innerHTML = '';
    const lastLine = activeDialogue.index >= activeDialogue.lines.length - 1;
    if (!lastLine) {
      const next = document.createElement('button');
      next.className = 'btn-primary';
      next.textContent = 'Next';
      next.addEventListener('click', advanceDialogue);
      actions.appendChild(next);
    } else if (activeDialogue.actions.length) {
      activeDialogue.actions.forEach((action, i) => {
        const btn = document.createElement('button');
        btn.className = action.primary ? 'btn-primary' : 'btn-secondary';
        if (i === activeDialogue.selectedAction) btn.classList.add('selected');
        btn.textContent = action.label;
        btn.addEventListener('click', () => {
          const handler = action.handler;
          closeDialogue();
          if (handler) handler();
        });
        actions.appendChild(btn);
      });
    } else {
      const ok = document.createElement('button');
      ok.className = 'btn-primary';
      ok.textContent = 'OK';
      ok.addEventListener('click', closeDialogue);
      actions.appendChild(ok);
    }
  }
}

function advanceDialogue() {
  if (!activeDialogue) return;
  if (activeDialogue.index < activeDialogue.lines.length - 1) {
    activeDialogue.index++;
    renderDialogue();
  } else if (!activeDialogue.actions.length) {
    closeDialogue();
  } else {
    const btns = document.querySelectorAll('#dialogue-actions button');
    const selected = btns[activeDialogue.selectedAction];
    if (selected) selected.click();
  }
}

function selectDialogueAction(dir) {
  if (!activeDialogue || !activeDialogue.actions.length) return;
  const lastLine = activeDialogue.index >= activeDialogue.lines.length - 1;
  if (!lastLine) return;
  activeDialogue.selectedAction = Math.max(0, Math.min(activeDialogue.selectedAction + dir, activeDialogue.actions.length - 1));
  renderDialogue();
}

function closeDialogue() {
  activeDialogue = null;
  const box = document.getElementById('dialogue-box');
  if (box) box.classList.add('hidden');
}

document.getElementById('btn-dialogue-next')?.addEventListener('click', advanceDialogue);

// Install early handlers to hook dialogues and quest updates in engine-state.js
setQuestStepUpdatedHook(updateObjectiveUI);
setStartDialogueHook(startDialogue);

// ─── Overworld Mechanisms ────────────────────────────────────
function showRoomToast(title, subtitle = 'Diva Academy') {
  const toast = document.getElementById('room-toast');
  if (!toast) return;
  const questNotificationTimerActive = document.getElementById('room-toast')?.classList.contains('active');
  if (questNotificationTimerActive) {
    setTimeout(() => showRoomToast(title, subtitle), 2000);
    return;
  }
  const titleEl = document.getElementById('room-toast-title');
  const subEl = document.getElementById('room-toast-subtitle');
  if (titleEl) titleEl.textContent = title;
  if (subEl) subEl.textContent = subtitle;
  toast.classList.add('active');
  clearTimeout(showRoomToast._timer);
  showRoomToast._timer = setTimeout(() => toast.classList.remove('active'), 1800);
}

async function getNpcDialogue(npc) {
  if (npc.name === 'Glitter Nova' && !WorldState.flags.metGlitterNova) {
    WorldState.flags.metGlitterNova = true;
    setQuestStep(1);
    return [
      'Fresh face! Welcome to Diva Academy — where references are curriculum and confidence is extra credit.',
      'Your first goal is simple: survive a friendly pop quiz face-off. Win one Starlet match and you earn your first real campus clout.',
      'No pressure. Actually, some pressure. The good kind. Ready to train?'
    ];
  }
  if (npc.name === 'Alan') {
    return [
      'Ah, a visitor. I\'ve been studying the quotes of legends — real and fabricated. The line between them is thinner than you think.',
      'I call it the Turing Challenge. Can you tell a real quote from a fake? And if it\'s real... do you know who actually said it?',
      'Two layers of truth. The imitation game has never been more fun. Ready to play?'
    ];
  }
  const aiLines = await AIClient.generateBanter(
    npc.name, npc.tier, Settings.playerName,
    Player.rep, npc.name in WorldState.defeated, currentRoom?.name
  );
  if (aiLines && aiLines.length > 0) return aiLines;
  const banter = getRandomBanter(npc.tier);
  if (banter) return banter;
  const byTier = {
    STARLET: ['I keep the basics sharp. Lyrics, eras, red carpets — the essentials.', 'Beat me and you prove you can hang in the hallway.'],
    DIVA: ['This room has standards, darling. I ask fewer questions than Mother, but I expect taste.', 'Show me your pop memory is more than vibes.'],
    DJ: ['I hear every remix, feature, sample, and whispered bridge.', 'If you know the connections, you know the culture.'],
    MOTHER: ['Child, this isn\'t regular trivia. This is Mother\'s test.', 'Bring knowledge, nerve, and a clean answer sheet.']
  };
  return byTier[npc.tier] || ['Ready?'];
}

function canChallengeNpc(npc) {
  if (npc.name === 'MOTHER Eternia' && WorldState.questStep < 6) {
    startDialogue('MOTHER Eternia', [
      'Not yet, darling.',
      'Orientation has a sequence: Hangman Hall, Pop Connect, then Mother. Come back when your references have roots.'
    ]);
    return false;
  }
  return true;
}

async function startNpcInteraction(npc) {
  Juice.punch(1.03);
  AudioManager.playSFX('interact');
  
  if (npc.isRival) {
    const rivalLines = [
      `Well, well... ${Settings.playerName}. Thought you could avoid me?`,
      `I'm Vex Vivienne, and this Academy isn't big enough for both of us.`,
      `Let's settle this right now.`
    ];
    startDialogue(RIVAL.name, rivalLines, [
      { label: 'Face-Off', primary: true, handler: () => startFaceOff(npc) },
      { label: 'Run Away', primary: false, handler: () => {
        Player.rep = Math.max(0, Player.rep - 5);
        updateHUD();
        startDialogue('Vex Vivienne', ['Coward. −5 REP for running.']);
      }}
    ]);
    return;
  }
  
  if (npc.name === 'Alan') {
    const alanLines = await getNpcDialogue(npc);
    startDialogue(npc.name, alanLines, [
      { label: 'Turing Challenge', primary: true, handler: () => startQuoteChallenge(npc) },
      { label: 'Not yet', primary: false }
    ]);
    return;
  }
  
  const lines = await getNpcDialogue(npc);
  startDialogue(npc.name, lines, [
    { label: 'Face-Off', primary: true, handler: () => { if (canChallengeNpc(npc)) startFaceOff(npc); } },
    { label: 'Not yet', primary: false }
  ]);
}

function startTerminalInteraction(term) {
  const details = term.type === 'hangman'
    ? ['Hangman Hall trains recall under pressure. Guess the artist name before the curtain drops.', 'Win the class and your Orientation Week record updates.']
    : ['Pop Connect is collaboration theory: link artists through real features and shared tracks.', 'Correct chains prove you understand how pop culture talks to itself.'];
  startDialogue(term.name, details, [
    { label: 'Begin', primary: true, handler: () => {
      AudioManager.startFaceOffTrack();
      if (term.type === 'hangman') { showScreen('hangman'); startHangman(); }
      else { showScreen('collab'); startCollabGame(); }
    }},
    { label: 'Leave', primary: false }
  ]);
}

function maybeSpawnRival() {
  if (RIVAL.active || RIVAL.defeats >= RIVAL.MAX_DEFEATS) return;
  RIVAL.spawnCounter++;
  if (RIVAL.spawnCounter < RIVAL.SPAWN_INTERVAL) return;
  RIVAL.spawnCounter = 0;
  
  const roomIds = Object.keys(ROOMS).filter(r => r !== currentRoomId && r !== 'hangman' && r !== 'collab');
  if (roomIds.length === 0) return;
  RIVAL.currentRoom = roomIds[Math.floor(Math.random() * roomIds.length)];
  RIVAL.active = true;
  
  const room = ROOMS[RIVAL.currentRoom];
  if (!room.npcs.some(n => n.name === RIVAL.name)) {
    let spawnTx = Math.floor(room.cols / 2);
    let spawnTy = Math.floor(room.rows / 2);
    for (let attempt = 0; attempt < 30; attempt++) {
      const testTx = 2 + Math.floor(Math.random() * (room.cols - 4));
      const testTy = 2 + Math.floor(Math.random() * (room.rows - 4));
      const tile = room.tiles[testTy]?.[testTx];
      if (tile === 0 || tile === 3 || tile === 4) {
        const occupied = room.npcs.some(n => n.tx === testTx && n.ty === testTy) ||
                         (room.terminals || []).some(t => t.tx === testTx && t.ty === testTy);
        if (!occupied) { spawnTx = testTx; spawnTy = testTy; break; }
      }
    }
    room.npcs.push({
      name: RIVAL.name,
      tier: RIVAL.tier,
      tx: spawnTx,
      ty: spawnTy,
      isRival: true
    });
  }
}

// ─── Input Hooks ─────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (activeDialogue) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      selectDialogueAction(-1);
      return;
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      selectDialogueAction(1);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'e' || e.key === 'E') {
      e.preventDefault();
      advanceDialogue();
      return;
    }
  }
  if (window.gameState !== 'game') return;
  if (e.key === 'e' || e.key === 'E' || e.key === ' ') tryInteract();
});

function isWalkable(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= currentRoom.cols || ty >= currentRoom.rows) return false;
  const tile = currentRoom.tiles[ty][tx];
  if (tile === 1) return false;
  if (currentRoom.npcs.some(n => n.tx === tx && n.ty === ty)) return false;
  if (currentRoom.terminals?.some(t => t.tx === tx && t.ty === ty)) return false;
  return true;
}

function processMovement(dt) {
  if (transitioning || activeDialogue) return;
  if (Player.moving) {
    const dx = Player.targetPx - Player.px;
    const dy = Player.targetPy - Player.py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 3.5;
    if (dist <= speed) {
      Player.px = Player.targetPx;
      Player.py = Player.targetPy;
      Player.moving = false;
      checkDoor();
    } else {
      Player.px += (dx / dist) * speed;
      Player.py += (dy / dist) * speed;
      Player.stepTimer += dt;
      Player.walkFrame += 0.12;
    }
    return;
  }
  Player.stepTimer += dt;
  if (Player.stepTimer < 110) return;
  Player.stepTimer = 0;

  const dir = dirPressed();
  if (!dir) return;
  Player.facing = dir;
  const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
  const ntx = Player.tx + d[0];
  const nty = Player.ty + d[1];
  if (isWalkable(ntx, nty)) {
    Player.tx = ntx;
    Player.ty = nty;
    Player.targetPx = ntx * T;
    Player.targetPy = nty * T;
    Player.moving = true;
  }
}

function onRoomEntered(roomId) {
  setRoomEntryTime(performance.now());
  WorldState.roomVisits[roomId] = true;
  if (roomId === 'hangman' && WorldState.questStep === 2) setQuestStep(3);
  if (roomId === 'collab' && WorldState.questStep === 4) setQuestStep(5);
  maybeSpawnRival();
}

function checkDoor() {
  const door = currentRoom.doors.find(d => d.tx === Player.tx && d.ty === Player.ty);
  if (!door) return;
  if (door.requiresTrophy && !hasTrophy(door.requiresTrophy)) {
    startDialogue('Academy Door', [
      `The ${door.label} is invitation-only for now.`,
      `Earn the ${door.requiresTrophy} trophy during Orientation Week to unlock this wing.`
    ]);
    return;
  }
  transitionToRoom(door.target, door.targetTx, door.targetTy);
}

function transitionToRoom(roomId, tx, ty) {
  setTransitioning(true);
  AudioManager.playSFX('door');
  
  const currentDoor = currentRoom.doors.find(d => d.target === roomId);
  const transDir = currentDoor ? getDoorDirection(currentDoor) : 'down';
  
  const gameCanvas = document.getElementById('gameCanvas');
  const overlayEl = document.getElementById('transition-overlay');
  
  if (gameCanvas) {
    gameCanvas.style.transition = 'transform 0.3s ease-in';
    switch(transDir) {
      case 'down': gameCanvas.style.transform = 'translateY(-100%)'; break;
      case 'up': gameCanvas.style.transform = 'translateY(100%)'; break;
      case 'left': gameCanvas.style.transform = 'translateX(100%)'; break;
      case 'right': gameCanvas.style.transform = 'translateX(-100%)'; break;
    }
  }
  
  setTimeout(() => {
    setCurrentRoomId(roomId);
    Player.tx = tx; Player.ty = ty;
    Player.px = tx*T; Player.py = ty*T;
    Player.targetPx = Player.px; Player.targetPy = Player.py;
    Player.moving = false;
    initSparkles();
    onRoomEntered(roomId);
    updateHUD();
    showRoomToast(currentRoom.name, 'Diva Academy');
    saveGame();
    setTimeout(() => {
      if (gameCanvas) {
        gameCanvas.style.transition = 'transform 0.3s ease-out';
        gameCanvas.style.transform = 'translate(0, 0)';
      }
      if (overlayEl) overlayEl.classList.remove('active');
      setTransitioning(false);
      setTimeout(() => {
        if (gameCanvas) {
          gameCanvas.style.transition = '';
          gameCanvas.style.transform = '';
        }
      }, 300);
    }, 300);
  }, 300);
}

// ─── Interaction ─────────────────────────────────────────────
function getNearbyEntity() {
  const dirVec = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const facing = dirVec[Player.facing] || [0, 1];
  
  const scoreEntity = (e) => {
    const dx = e.tx - Player.tx;
    const dy = e.ty - Player.ty;
    const dist = Math.abs(dx) + Math.abs(dy);
    if (dist > 2 || dist === 0) return -1;
    const dot = dx * facing[0] + dy * facing[1];
    if (dot > 0) return 10 - dist;
    if (dot === 0) return 5 - dist;
    return 2 - dist;
  };
  
  const all = [];
  for (const e of (currentRoom.npcs || [])) {
    const s = scoreEntity(e);
    if (s >= 0) all.push({ entity: e, score: s, type: 'npc' });
  }
  for (const e of (currentRoom.terminals || [])) {
    const s = scoreEntity(e);
    if (s >= 0) all.push({ entity: e, score: s, type: 'terminal' });
  }
  
  if (!all.length) return null;
  all.sort((a, b) => b.score - a.score || (a.type === 'npc' ? -1 : 1));
  return all[0].entity;
}

function tryInteract() {
  if (activeDialogue) {
    advanceDialogue();
    return;
  }
  const entity = getNearbyEntity();
  if (!entity) return;
  if (entity.tier) {
    startNpcInteraction(entity);
  } else if (entity.type === 'hangman') {
    startTerminalInteraction(entity);
  } else if (entity.type === 'collab') {
    startTerminalInteraction(entity);
  }
}

canvas.addEventListener('click', () => {
  if (window.gameState === 'game') tryInteract();
});

document.getElementById('btn-result-continue')?.addEventListener('click', () => {
  activeDialogue = null;
  showScreen('game');
  resizeCanvas();
  AudioManager.startExploration();
  checkEnd();
  lastTime = performance.now();
  if (!gameLoopRunning) requestAnimationFrame(gameLoop);
});

window.onMinigameComplete = function(type, won) {
  if (won && type === 'hangman' && WorldState.questStep === 3) setQuestStep(4);
  if (won && type === 'collab' && WorldState.questStep === 5) setQuestStep(6);
  saveGame();
  updateHUD();
};

setOnMinigameClosedHook(() => {
  lastTime = performance.now();
  if (!gameLoopRunning) requestAnimationFrame(gameLoop);
  checkGameEndCondition();
});

// ─── Customization UI ────────────────────────────────────────
function isCustomUnlocked(option) {
  if (option.unlocked) return true;
  if (option.require && WorldState.defeated[option.require]) return true;
  return false;
}

function refreshCustomUnlocks() {
  for (const cat of Object.values(CUSTOM_OPTIONS)) {
    for (const opt of cat.options) {
      if (!opt.unlocked && opt.require && WorldState.defeated[opt.require]) {
        opt.unlocked = true;
      }
    }
  }
}

function renderCustomizeScreen() {
  refreshCustomUnlocks();
  const container = document.getElementById('custom-sections');
  if (!container) return;
  container.innerHTML = '';
  for (const [catKey, cat] of Object.entries(CUSTOM_OPTIONS)) {
    const section = document.createElement('div');
    section.className = 'custom-category';
    const label = document.createElement('label');
    label.textContent = cat.label;
    section.appendChild(label);
    const row = document.createElement('div');
    row.className = 'custom-options';
    for (const opt of cat.options) {
      const swatch = document.createElement('div');
      swatch.className = 'custom-swatch';
      swatch.style.background = opt.color;
      swatch.title = opt.name;
      const unlocked = isCustomUnlocked(opt);
      if (!unlocked) swatch.classList.add('locked');
      if (PlayerStyle[catKey] === opt.id) swatch.classList.add('active');
      if (unlocked) {
        swatch.addEventListener('click', () => {
          PlayerStyle[catKey] = opt.id;
          saveGame();
          renderCustomizeScreen();
        });
      }
      row.appendChild(swatch);
    }
    section.appendChild(row);
    container.appendChild(section);
  }
}

// ─── Perk Shop UI ────────────────────────────────────────────
function renderPerkShop() {
  document.getElementById('perm-rep-display').textContent = PermState.bank;
  const list = document.getElementById('perk-list');
  if (!list) return;
  list.innerHTML = '';
  for (const perk of PERKS) {
    const owned = hasPerk(perk.id);
    const canAfford = PermState.bank >= perk.cost;
    const item = document.createElement('div');
    item.className = 'perk-item' + (owned ? ' purchased' : (!canAfford ? ' cant-afford' : ''));
    item.innerHTML = `
      <div class="perk-info">
        <div class="perk-name">${perk.name}</div>
        <div class="perk-desc">${perk.desc}</div>
      </div>
      <div class="perk-cost">${owned ? '✓ Owned' : perk.cost + ' REP'}</div>
      ${!owned ? '<button class="perk-buy"' + (!canAfford ? ' disabled' : '') + '>Buy</button>' : ''}
    `;
    if (!owned && canAfford) {
      item.querySelector('.perk-buy').addEventListener('click', () => {
        buyPerk(perk.id);
        renderPerkShop();
      });
    }
    list.appendChild(item);
  }
}

function buyPerk(id) {
  const perk = PERKS.find(p => p.id === id);
  if (!perk || hasPerk(id) || PermState.bank < perk.cost) return false;
  PermState.bank -= perk.cost;
  PermState.purchased.push(id);
  savePermState();
  return true;
}

function applyPerks() {
  if (hasPerk('tough')) Player.rep += 30;
}

// ─── Active Perks UI ──────────────────────────────────────────
let perksOpenedFromHUD = false;

document.getElementById('btn-mute')?.addEventListener('click', () => {
  const btn = document.getElementById('btn-mute');
  const nowMuted = !AudioManager.isMuted();
  AudioManager.setMuted(nowMuted);
  if (btn) {
    btn.textContent = nowMuted ? '🔇' : '♫';
    btn.style.color = nowMuted ? 'var(--danger)' : 'var(--text)';
  }
  if (!nowMuted) {
    if (window.gameState === 'game') {
      AudioManager.startExploration();
    }
  }
});

document.getElementById('btn-hud-perks')?.addEventListener('click', () => {
  perksOpenedFromHUD = true;
  setPaused(true);
  renderActivePerks();
  showScreen('active-perks');
});

document.getElementById('btn-active-perks')?.addEventListener('click', () => {
  perksOpenedFromHUD = false;
  renderActivePerks();
  showScreen('active-perks');
});

document.getElementById('btn-active-perks-back')?.addEventListener('click', () => {
  if (perksOpenedFromHUD) {
    setPaused(false);
    showScreen('game');
    resizeCanvas();
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  } else {
    showScreen('pause');
  }
});

function renderActivePerks() {
  const list = document.getElementById('active-perks-list');
  if (!list) return;
  list.innerHTML = '';
  const owned = PERKS.filter(p => hasPerk(p.id));
  if (owned.length === 0) {
    list.innerHTML = '<div class="no-perks-msg">No perks purchased yet. Visit the Perk Shop after a run to buy some.</div>';
    return;
  }
  for (const perk of owned) {
    const item = document.createElement('div');
    item.className = 'active-perk-item';
    item.innerHTML = `<div class="perk-name">${perk.name}</div><div class="perk-desc">${perk.desc}</div>`;
    list.appendChild(item);
  }
}

// ─── Pause & Resume System ───────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') togglePause();
});
document.getElementById('btn-pause').addEventListener('click', togglePause);
document.getElementById('btn-resume').addEventListener('click', togglePause);
document.getElementById('btn-quit-title').addEventListener('click', () => {
  setPaused(false);
  AudioManager.fadeOut();
  showScreen('title');
});
document.getElementById('btn-reset-game')?.addEventListener('click', () => {
  if (!confirm('This will erase all progress. Are you sure?')) return;
  resetGame();
  setPaused(false);
  AudioManager.fadeOut();
  showScreen('title');
});
document.getElementById('btn-customize').addEventListener('click', () => {
  renderCustomizeScreen();
  showScreen('customize');
});
document.getElementById('btn-custom-back').addEventListener('click', () => {
  showScreen('pause');
});

function togglePause() {
  if (window.gameState === 'game') {
    setPaused(true);
    const statsEl = document.getElementById('pause-stats');
    if (statsEl) {
      statsEl.textContent = `${Player.rep} / ${Settings.goalRep} REP · ${currentRoom.name}`;
    }
    showScreen('pause');
  } else if (window.gameState === 'pause') {
    setPaused(false);
    showScreen('game');
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  }
}

// ─── Game Loop ───────────────────────────────────────────────
export let lastTime = 0;

export function gameLoop(timestamp) {
  if (window.gameState !== 'game' || paused) { gameLoopRunning = false; return; }
  gameLoopRunning = true;
  const dt = timestamp - lastTime;
  lastTime = timestamp;

  processMovement(dt);
  updateBursts();
  ScreenShake.update();
  Juice.updateFlash();
  Juice.updateZoom();

  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cam = getCam();

  ctx.save();
  ScreenShake.apply();
  
  if (cam.zoom !== 1) {
    ctx.scale(cam.zoom, cam.zoom);
  }
  
  if (Juice.zoomScale !== 1) {
    ctx.translate(canvas.width/2, canvas.height/2);
    ctx.scale(Juice.zoomScale, Juice.zoomScale);
    ctx.translate(-canvas.width/2, -canvas.height/2);
  }

  const visW = canvas.width / cam.zoom + T*2;
  const visH = canvas.height / cam.zoom + T*2;
  for (let ty = 0; ty < currentRoom.rows; ty++) {
    for (let tx = 0; tx < currentRoom.cols; tx++) {
      const sx = tx*T - cam.x, sy = ty*T - cam.y;
      if (sx > visW || sx < -T || sy > visH || sy < -T) continue;
      drawTile(tx, ty, sx, sy, timestamp);
    }
  }

  for (const d of currentRoom.decor||[]) {
    const sx = d.tx*T - cam.x, sy = d.ty*T - cam.y;
    drawDecor(d, sx, sy, timestamp);
  }

  const nearby = getNearbyEntity();
  const entities = [
    ...currentRoom.npcs.map(n => ({...n, _type:'npc', _sy:n.ty*T-cam.y})),
    ...(currentRoom.terminals||[]).map(t => ({...t, _type:'term', _sy:t.ty*T-cam.y})),
    { _type:'player', _sy:Player.py-cam.y, tx:Player.tx, ty:Player.ty }
  ].sort((a,b) => a._sy - b._sy);

  for (const e of entities) {
    const sx = e.tx*T - cam.x, sy = e.ty*T - cam.y;
    if (e._type==='npc') drawNPC(e, sx, sy, nearby===currentRoom.npcs.find(n=>n.tx===e.tx&&n.ty===e.ty), timestamp);
    else if (e._type==='term') drawTerminal(e, sx, sy, nearby===currentRoom.terminals.find(t=>t.tx===e.tx&&t.ty===e.ty), timestamp);
    else drawPlayer(Player.px-cam.x, Player.py-cam.y, timestamp);
  }

  if (nearby) drawPrompt(nearby, cam, timestamp);
  drawDoorLabels(cam, timestamp);

  drawLighting(cam, timestamp);

  drawSparkles(cam, timestamp);
  drawBursts(cam);

  ctx.restore();

  Juice.drawFlash();

  requestAnimationFrame(gameLoop);
}

window.gameLoop = gameLoop;
window.addEventListener('resize', () => { if(window.gameState==='game') resizeCanvas(); });

// ─── Game Over & Credits ─────────────────────────────────────
function getRunSummary() {
  const elapsed = Math.floor((Date.now() - runStats.startTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  return {
    time: `${minutes}m ${seconds}s`,
    questions: runStats.questionsAnswered,
    npcs: runStats.npcsDefeated,
    rooms: Object.keys(WorldState.roomVisits).length
  };
}

function showVictoryCredits() {
  const credits = document.getElementById('victory-credits');
  if (!credits) return;
  credits.classList.add('active');
  setTimeout(() => credits.classList.remove('active'), 6000);
}

function checkEnd() {
  if (Player.rep <= 0) gameOver(false);
  else if (Player.rep >= Settings.goalRep) gameOver(true);
}
window.checkGameEndCondition = checkEnd;

function gameOver(won) {
  AudioManager.fadeOut();
  const earned = Player.rep;
  PermState.bank += earned;
  PermState.totalRuns++;
  savePermState();
  
  const titleEl = document.getElementById('gameover-title');
  const bodyEl = document.getElementById('gameover-body');
  const bankEl = document.getElementById('gameover-rep-earned');
  
  if (titleEl) titleEl.textContent = won ? 'You Did It' : 'Eliminated';
  if (bodyEl) {
    bodyEl.textContent = won
      ? `${Settings.goalRep} REP. You made it through the Academy, ${Settings.playerName}.`
      : 'REP hit zero. Try again.';
  }
  if (bankEl) bankEl.textContent = `+${earned} REP added to your permanent bank`;

  const summary = getRunSummary();
  const summaryEl = document.getElementById('gameover-summary');
  if (summaryEl) {
    summaryEl.innerHTML = `<div class="summary-grid">` +
      `<div><span class="summary-label">Time</span><span class="summary-value">${summary.time}</span></div>` +
      `<div><span class="summary-label">NPCs Defeated</span><span class="summary-value">${summary.npcs}</span></div>` +
      `<div><span class="summary-label">Questions Answered</span><span class="summary-value">${summary.questions}</span></div>` +
      `<div><span class="summary-label">Rooms Visited</span><span class="summary-value">${summary.rooms}</span></div>` +
      `</div>`;
  }

  const recapEl = document.getElementById('gameover-recap');
  if (recapEl) {
    recapEl.textContent = '';
    const recap = getRandomRecap(won);
    if (recap) {
      recapEl.textContent = recap;
    }
    AIClient.generateRecap(Settings.playerName, earned, won, summary.npcs, summary.questions).then(lines => {
      if (lines && lines.length >= 3) {
        recapEl.textContent = lines.join(' ');
      }
    }).catch(() => {});
  }

  showScreen('gameover');
  if (won) {
    AudioManager.playVictory();
    showVictoryCredits();
    setTimeout(() => {
      ScreenShake.trigger(12);
      Juice.flash('#fbbf24', 0.35);
      Juice.punch(1.15);
    }, 200);
  } else {
    AudioManager.playGameOver();
  }
}

document.getElementById('btn-restart').addEventListener('click', () => resetPlay(false));
document.getElementById('btn-go-title').addEventListener('click', () => { AudioManager.fadeOut(); showScreen('title'); });
document.getElementById('btn-perk-shop').addEventListener('click', () => {
  renderPerkShop();
  showScreen('perks');
});
document.getElementById('btn-perks-back').addEventListener('click', () => {
  showScreen('gameover');
});

function resetPlay(loadSaved = false) {
  const loaded = loadSaved && loadGame();
  if (!loaded) {
    // Fresh run state reset
    WorldState.rank = 'Fresh Face';
    WorldState.questStep = 0;
    WorldState.trophies = [];
    WorldState.flags = {};
    WorldState.roomVisits = {};
    WorldState.defeated = {};
    
    // Clean up temporary NPCs like Vex from all rooms
    Object.values(ROOMS).forEach(r => {
      r.npcs = r.npcs.filter(n => n.name !== RIVAL.name);
    });
    RIVAL.active = false;
    RIVAL.defeats = 0;
    RIVAL.spawnCounter = 0;

    setCurrentRoomId('lobby');
    Player.tx = currentRoom.playerStart.tx;
    Player.ty = currentRoom.playerStart.ty;
    Player.px = Player.tx * T;
    Player.py = Player.ty * T;
    Player.targetPx = Player.px;
    Player.targetPy = Player.py;
    Player.moving = false;
    Player.rep = Settings.startRep;
    Player.clutchUsedThisRun = false;
    
    applyPerks();
    resetRunStats();
    resetQuestionPool();
    saveGame();
  }
  
  initSparkles();
  onRoomEntered(currentRoomId);
  showScreen('game');
  resizeCanvas();
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
  updateHUD();
  
  if (!loadSaved) {
    startDialogue('Diva Academy', TUTORIAL_TEXT);
  }
}

// ─── Settings UI & Event Binding ─────────────────────────────
function applySettingsToUI() {
  const goalRepInput = document.getElementById('setting-goal-rep');
  const nameInput = document.getElementById('setting-name');
  const crtInput = document.getElementById('setting-crt');
  const pauseCrtInput = document.getElementById('pause-setting-crt');

  if (goalRepInput) goalRepInput.value = Settings.goalRep || 200;
  if (nameInput) nameInput.value = Settings.playerName || 'Starlet';
  if (crtInput) {
    crtInput.checked = !!Settings.crtEnabled;
  }
  if (pauseCrtInput) {
    pauseCrtInput.checked = !!Settings.crtEnabled;
  }

  if (Settings.crtEnabled) {
    document.body.classList.add('crt-active');
  } else {
    document.body.classList.remove('crt-active');
  }
}

function applySettingsAndStart() {
  Settings.goalRep = parseInt(document.getElementById('setting-goal-rep').value) || 200;
  Settings.playerName = document.getElementById('setting-name').value.trim() || 'Starlet';
  Settings.crtEnabled = document.getElementById('setting-crt')?.checked || false;
  applySettingsToUI();
  AudioManager.init();
  resetPlay(true);
  AudioManager.startExploration();
}

document.getElementById('btn-start').addEventListener('click', applySettingsAndStart);
document.getElementById('btn-settings').addEventListener('click', () => {
  applySettingsToUI();
  showScreen('settings');
});

const saveAndExitSettings = () => {
  Settings.goalRep = parseInt(document.getElementById('setting-goal-rep').value) || 200;
  Settings.playerName = document.getElementById('setting-name').value.trim() || 'Starlet';
  Settings.crtEnabled = document.getElementById('setting-crt')?.checked || false;
  applySettingsToUI();
  saveGame();
  showScreen('title');
};
document.getElementById('btn-settings-back').addEventListener('click', saveAndExitSettings);
document.getElementById('btn-settings-back-top')?.addEventListener('click', saveAndExitSettings);

const onCrtToggled = (e) => {
  Settings.crtEnabled = e.target.checked;
  applySettingsToUI();
  saveGame();
};
document.getElementById('setting-crt')?.addEventListener('change', onCrtToggled);
document.getElementById('pause-setting-crt')?.addEventListener('change', onCrtToggled);

// Question expanders

function initSettingsUI() {
  updatePoolStatusDisplay();

  const form = document.getElementById('manual-question-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = document.getElementById('mq-question').value;
      const correct = document.getElementById('mq-correct').value;
      const wrong1 = document.getElementById('mq-wrong1').value;
      const wrong2 = document.getElementById('mq-wrong2').value;
      const wrong3 = document.getElementById('mq-wrong3').value;
      const cat = document.getElementById('mq-category').value;

      if (!q || !correct || !wrong1 || !wrong2 || !wrong3) {
        document.getElementById('mq-status').textContent = 'Please fill in all fields.';
        document.getElementById('mq-status').className = 'form-status error';
        return;
      }

      addManualQuestion(q, correct, wrong1, wrong2, wrong3, cat);
      form.reset();
      document.getElementById('mq-status').textContent = 'Question added to pool.';
      document.getElementById('mq-status').className = 'form-status success';
      updatePoolStatusDisplay();
    });
  }

  const expandBtn = document.getElementById('btn-expand-pool');
  if (expandBtn) {
    expandBtn.addEventListener('click', async () => {
      expandBtn.disabled = true;
      expandBtn.textContent = 'Expanding...';
      document.getElementById('expand-status').textContent = '';

      const questions = await AIClient.generateQuestions(20);
      if (questions) {
        const added = addGeneratedQuestions(questions);
        document.getElementById('expand-status').textContent = `${added} new questions added to pool.`;
        document.getElementById('expand-status').className = 'form-status success';
        updatePoolStatusDisplay();
      } else {
        document.getElementById('expand-status').textContent = 'Backend offline or error. Try again later.';
        document.getElementById('expand-status').className = 'form-status error';
      }

      expandBtn.disabled = false;
      expandBtn.textContent = 'Expand Question Pool';
    });
  }

  const expandQuoteBtn = document.getElementById('btn-expand-quotes');
  if (expandQuoteBtn) {
    expandQuoteBtn.addEventListener('click', async () => {
      expandQuoteBtn.disabled = true;
      expandQuoteBtn.textContent = 'Generating...';
      document.getElementById('expand-quote-status').textContent = '';
      const realTexts = quotePool.filter(q => q.isReal).map(q => q.text);
      const fakeQuotes = await AIClient.generateFakeQuotes(realTexts, 5);
      if (fakeQuotes && fakeQuotes.length > 0) {
        let added = 0;
        for (const fq of fakeQuotes) {
          if (!quotePool.some(q => q.text === fq.text)) {
            quotePool.push({ text: fq.text, isReal: false, source: 'AI-generated fake' });
            added++;
          }
        }
        document.getElementById('expand-quote-status').textContent = `${added} fake quotes added to pool.`;
        document.getElementById('expand-quote-status').className = 'form-status success';
      } else {
        document.getElementById('expand-quote-status').textContent = 'Backend offline or error. Try again later.';
        document.getElementById('expand-quote-status').className = 'form-status error';
      }
      expandQuoteBtn.disabled = false;
      expandQuoteBtn.textContent = 'Expand Quote Pool';
      updateQuotePoolStatus();
    });
  }
}

function updatePoolStatusDisplay() {
  const status = getPoolStatus();
  const el = document.getElementById('pool-status-text');
  if (el) {
    el.textContent = `${status.available} questions available, ${status.consumed} used`;
  }
}

// ─── How to Play ────────────────────────────────────────────
document.getElementById('btn-how-to-play')?.addEventListener('click', () => showScreen('howtoplay'));
document.getElementById('btn-howtoplay-back')?.addEventListener('click', () => showScreen('title'));

document.getElementById('btn-toggle-objective')?.addEventListener('click', () => {
  const panel = document.getElementById('objective-panel');
  const btn = document.getElementById('btn-toggle-objective');
  if (!panel || !btn) return;
  const isCollapsed = panel.classList.toggle('collapsed');
  btn.textContent = isCollapsed ? '▶' : '◀';
  AudioManager.playSFX('interact');
});

// ─── Boot Initializer ────────────────────────────────────────
const MUSIC_TRACKS = [
  { name: 'lobby', url: 'assets/audio/lobby.mp3' },
  { name: 'faceoff', url: 'assets/audio/battle.mp3' },
  { name: 'victory', url: 'assets/audio/victory.mp3' },
  { name: 'gameover', url: 'assets/audio/gameover.wav' },
];

function checkLowPoolWarning() {
  if (isPoolLow()) {
    const warning = document.getElementById('pool-low-warning');
    if (warning) warning.classList.add('active');
  }
}

async function boot() {
  await loadSprites();
  FaceoffCanvas.init();
  loadPermState();
  await loadQuestionBank();
  await AudioManager.preloadTracks(MUSIC_TRACKS);
  await loadBanterPool();
  await loadRecapPool();
  loadQuoteConsumed();
  await loadQuotes();
  updateQuotePoolStatus();
  AIClient.checkHealth();
  initSettingsUI();
  loadSettings();
  initSparkles();
  resizeCanvas();
  initMobileDPad();
  showScreen('title');
  checkLowPoolWarning();
}

// Boot up!
boot();
