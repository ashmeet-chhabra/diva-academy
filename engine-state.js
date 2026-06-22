// ============================================================
//  DIVA ACADEMY – Engine State Manager (Settings, Player, Save/Load)
// ============================================================

import { ROOMS } from './data-rooms.js';

export const T = 48; // Tile size

export const Settings = {
  goalRep: 200,
  playerName: 'Starlet',
  startRep: 100,
  crtEnabled: true
};

export const Player = {
  tx: 7,
  ty: 6,
  px: 0,
  py: 0,
  targetPx: 0,
  targetPy: 0,
  moving: false,
  facing: 'down',
  rep: Settings.startRep,
  walkFrame: 0,
  stepTimer: 0,
  clutchUsedThisRun: false
};

export const PlayerStyle = {
  dress: 'pink',
  hair: 'purple'
};

export let currentRoomId = 'lobby';
export let currentRoom = ROOMS[currentRoomId];
export let paused = false;
export let transitioning = false;

export function setPaused(val) { paused = val; }
export function setTransitioning(val) { transitioning = val; }
export function setCurrentRoomId(val) {
  currentRoomId = val;
  currentRoom = ROOMS[val];
}

export const SAVE_KEY = 'divaAcademySave.v1';
export const QUEST_STEPS = [
  'Talk to Glitter Nova in the Grand Lobby.',
  'Win a Starlet face-off to prove your basics.',
  'Enter Hangman Hall for your first class.',
  'Complete one Hangman challenge.',
  'Find Pop Connect through The Stage.',
  'Complete one Pop Connect chain.',
  'Challenge MOTHER Eternia on The Stage.',
  'Orientation complete — explore the VIP Lounge.'
];

export const WorldState = {
  rank: 'Fresh Face',
  questStep: 0,
  trophies: [],
  flags: {},
  roomVisits: {},
  defeated: {}
};

export const RIVAL = {
  name: 'Vex Vivienne',
  tier: 'DIVA',
  color: '#c084fc',
  currentRoom: null,
  active: false,
  defeats: 0,
  spawnCounter: 0,
  SPAWN_INTERVAL: 3,
  MAX_DEFEATS: 3
};

export const PERKS = [
  { id: 'tough', name: 'Thick Skin', desc: 'Start each run with +30 REP', cost: 50 },
  { id: 'grace', name: 'Grace', desc: 'First wrong answer each run is forgiven', cost: 80 },
  { id: 'haste', name: 'Haste', desc: '+3s on face-off timer', cost: 60 },
  { id: 'clutch', name: 'Clutch', desc: 'Survive at 0 REP once per run', cost: 120 },
  { id: 'insight', name: 'Insight', desc: 'See question category before answering', cost: 40 },
];

export const PermState = {
  bank: 0,
  purchased: [],
  totalRuns: 0
};

export function hasTrophy(name) {
  return WorldState.trophies.includes(name);
}

export function addTrophy(name) {
  if (!hasTrophy(name)) {
    WorldState.trophies.push(name);
  }
}

export function hasPerk(id) {
  return PermState.purchased.includes(id);
}

export function savePermState() {
  try {
    localStorage.setItem('divaAcademyPerm.v1', JSON.stringify(PermState));
  } catch (e) {}
}

export function loadPermState() {
  try {
    const raw = localStorage.getItem('divaAcademyPerm.v1');
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data) Object.assign(PermState, data);
  } catch (e) {}
}

export function saveGame() {
  try {
    const data = {
      version: 1,
      settings: Settings,
      player: {
        rep: Player.rep,
        room: currentRoomId,
        tx: Player.tx,
        ty: Player.ty,
        style: PlayerStyle,
        clutchUsed: Player.clutchUsedThisRun
      },
      world: WorldState,
      rival: {
        defeats: RIVAL.defeats,
        active: RIVAL.active,
        currentRoom: RIVAL.currentRoom,
        spawnCounter: RIVAL.spawnCounter
      }
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Save failed');
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return false;
    Object.assign(Settings, data.settings || {});
    if (data.world) {
      WorldState.rank = data.world.rank || 'Fresh Face';
      WorldState.questStep = Number.isFinite(data.world.questStep) ? data.world.questStep : 0;
      WorldState.trophies = Array.isArray(data.world.trophies) ? data.world.trophies : [];
      WorldState.flags = Object.assign({}, WorldState.flags, data.world.flags || {});
      WorldState.roomVisits = Object.assign({}, WorldState.roomVisits, data.world.roomVisits || {});
      WorldState.defeated = Object.assign({}, WorldState.defeated, data.world.defeated || {});
    }
    
    currentRoomId = data.player?.room && ROOMS[data.player.room] ? data.player.room : 'lobby';
    currentRoom = ROOMS[currentRoomId];
    
    Player.rep = Number.isFinite(data.player?.rep) ? data.player.rep : Settings.startRep;
    Player.tx = Number.isFinite(data.player?.tx) ? data.player.tx : currentRoom.playerStart.tx;
    Player.ty = Number.isFinite(data.player?.ty) ? data.player.ty : currentRoom.playerStart.ty;
    Player.px = Player.tx * T;
    Player.py = Player.ty * T;
    Player.targetPx = Player.px;
    Player.targetPy = Player.py;
    Player.clutchUsedThisRun = data.player?.clutchUsed || false;
    
    if (data.player?.style) {
      Object.assign(PlayerStyle, data.player.style);
    }
    
    RIVAL.defeats = data.rival?.defeats || 0;
    RIVAL.active = data.rival?.active || false;
    RIVAL.currentRoom = data.rival?.currentRoom || null;
    RIVAL.spawnCounter = data.rival?.spawnCounter || 0;
    
    if (RIVAL.active && RIVAL.currentRoom && ROOMS[RIVAL.currentRoom]) {
      const room = ROOMS[RIVAL.currentRoom];
      if (!room.npcs.some(n => n.name === RIVAL.name)) {
        room.npcs.push({
          name: RIVAL.name,
          tier: RIVAL.tier,
          tx: 5,
          ty: 4
        });
      }
    }
    return true;
  } catch (err) {
    console.warn('Load failed');
    return false;
  }
}

export function resetGame() {
  localStorage.removeItem(SAVE_KEY);
  localStorage.removeItem('divaAcademyPerm.v1');
  localStorage.removeItem('divaAcademyQuoteConsumed');
  localStorage.removeItem('divaAcademySeedQuestions.v1');
  localStorage.removeItem('divaAcademyConsumedQuestions.v1');

  Object.assign(PermState, { bank: 0, purchased: [], totalRuns: 0 });
  Object.assign(PlayerStyle, { dress: 'pink', hair: 'purple' });

  WorldState.rank = 'Fresh Face';
  WorldState.questStep = 0;
  WorldState.trophies = [];
  WorldState.flags = {};
  WorldState.roomVisits = {};
  WorldState.defeated = {};

  RIVAL.active = false;
  RIVAL.defeats = 0;
  RIVAL.spawnCounter = 0;
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && data.settings) {
        Object.assign(Settings, data.settings);
      }
    }
  } catch (e) {}
}

// ─── Quest Step Updated & Start Dialogue Hooks ───────────────
export let onQuestStepUpdated = null;
export function setQuestStepUpdatedHook(fn) {
  onQuestStepUpdated = fn;
}

export let onStartDialogue = null;
export function setStartDialogueHook(fn) {
  onStartDialogue = fn;
}

export function triggerStartDialogue(speaker, lines, actions) {
  if (onStartDialogue) onStartDialogue(speaker, lines, actions);
}

export function setQuestStep(step) {
  if (step > WorldState.questStep) {
    WorldState.questStep = Math.min(step, QUEST_STEPS.length - 1);
    if (WorldState.questStep >= 7) {
      WorldState.rank = 'Rising Diva';
      addTrophy('Orientation Complete');
    }
    if (onQuestStepUpdated) onQuestStepUpdated();
    saveGame();
    showQuestNotification(QUEST_STEPS[WorldState.questStep]);
  }
}

export function showQuestNotification(stepText) {
  const toast = document.getElementById('room-toast');
  if (!toast) return;
  const titleEl = toast.querySelector('#room-toast-title');
  const subEl = toast.querySelector('#room-toast-subtitle');
  if (titleEl) titleEl.textContent = 'Quest Updated';
  if (subEl) subEl.textContent = stepText;
  toast.classList.add('active');
  clearTimeout(showQuestNotification._timer);
  showQuestNotification._timer = setTimeout(() => toast.classList.remove('active'), 3000);
}

export function removeRivalFromRoom() {
  if (!RIVAL.currentRoom) return;
  const room = ROOMS[RIVAL.currentRoom];
  room.npcs = room.npcs.filter(n => n.name !== RIVAL.name);
}

export function onRivalDefeated() {
  RIVAL.defeats++;
  RIVAL.active = false;
  removeRivalFromRoom();
  if (RIVAL.defeats >= RIVAL.MAX_DEFEATS) {
    addTrophy('Rival Vanquished');
    triggerStartDialogue('Diva Academy', [
      'Vex Vivienne has been defeated for the last time.',
      'She retreats from the Academy. Her run here is over.',
      'Trophy Unlocked: Rival Vanquished'
    ]);
  } else {
    triggerStartDialogue('Vex Vivienne', [
      `You got me this time... but I'll be back.`,
      `${RIVAL.MAX_DEFEATS - RIVAL.defeats} more to go before I'm done with you.`
    ]);
  }
}

export function onRivalPlayerLost() {
  RIVAL.active = false;
  removeRivalFromRoom();
  RIVAL.spawnCounter = 0;
}

export const runStats = { startTime: 0, questionsAnswered: 0, npcsDefeated: 0 };

export function resetRunStats() {
  runStats.startTime = Date.now();
  runStats.questionsAnswered = 0;
  runStats.npcsDefeated = 0;
}
