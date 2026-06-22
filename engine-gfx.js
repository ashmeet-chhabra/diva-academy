// ============================================================
//  DIVA ACADEMY – Graphics & Rendering Engine
// ============================================================

import { T, Player, Settings, WorldState, currentRoom, currentRoomId, hasTrophy, PlayerStyle, QUEST_STEPS } from './engine-state.js';
import { Sprites, darkenColor, lightenColor } from './assets.js';
import { TIERS } from './data-rooms.js';

export const canvas = document.getElementById('gameCanvas');
export const ctx = canvas.getContext('2d');

export let roomEntryTime = 0;
export const NPC_ENTRANCE_DURATION = 800; // ms

export function setRoomEntryTime(val) {
  roomEntryTime = val;
}

export function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

// ─── Screen Shake System ─────────────────────────────────────
export const ScreenShake = {
  intensity: 0,
  decay: 0.92,
  offsetX: 0,
  offsetY: 0,
  
  trigger(intensity = 8) {
    this.intensity = Math.min(this.intensity + intensity, 20);
  },
  
  update() {
    if (this.intensity > 0.5) {
      this.offsetX = (Math.random() - 0.5) * this.intensity;
      this.offsetY = (Math.random() - 0.5) * this.intensity;
      this.intensity *= this.decay;
    } else {
      this.intensity = 0;
      this.offsetX = 0;
      this.offsetY = 0;
    }
  },
  
  apply() {
    ctx.translate(this.offsetX, this.offsetY);
  },
  
  reset() {
    this.intensity = 0;
    this.offsetX = 0;
    this.offsetY = 0;
  }
};

// ─── Juice Effects ───────────────────────────────────────────
export const Juice = {
  flashAlpha: 0,
  flashColor: '#fff',
  
  flash(color = '#fff', alpha = 0.3) {
    this.flashColor = color;
    this.flashAlpha = alpha;
  },
  
  updateFlash() {
    if (this.flashAlpha > 0) {
      this.flashAlpha *= 0.85;
      if (this.flashAlpha < 0.01) this.flashAlpha = 0;
    }
  },
  
  drawFlash() {
    if (this.flashAlpha > 0) {
      ctx.fillStyle = this.flashColor;
      ctx.globalAlpha = this.flashAlpha;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
    }
  },
  
  zoomScale: 1,
  zoomTarget: 1,
  
  punch(scale = 1.1) {
    this.zoomScale = scale;
    this.zoomTarget = 1;
  },
  
  updateZoom() {
    this.zoomScale += (this.zoomTarget - this.zoomScale) * 0.15;
    if (Math.abs(this.zoomScale - this.zoomTarget) < 0.001) {
      this.zoomScale = this.zoomTarget;
    }
  }
};

// ─── Camera ──────────────────────────────────────────────────
export function getCam() {
  const mapW = currentRoom.cols * T;
  const mapH = currentRoom.rows * T;
  
  const zoomX = canvas.width / mapW;
  const zoomY = canvas.height / mapH;
  const zoom = Math.max(1, Math.min(zoomX, zoomY, 2.5));
  
  const scaledW = canvas.width / zoom;
  const scaledH = canvas.height / zoom;
  let cx = Player.px + T/2 - scaledW/2;
  let cy = Player.py + T/2 - scaledH/2;
  cx = Math.max(0, Math.min(cx, mapW - scaledW));
  cy = Math.max(0, Math.min(cy, mapH - scaledH));
  if (mapW < scaledW) cx = -(scaledW - mapW) / 2;
  if (mapH < scaledH) cy = -(scaledH - mapH) / 2;
  return { x: cx, y: cy, zoom };
}

// ─── Objective UI ────────────────────────────────────────────
export function updateObjectiveUI() {
  const rankEl = document.getElementById('objective-rank');
  const titleEl = document.getElementById('objective-title');
  const textEl = document.getElementById('objective-text');
  const trophyEl = document.getElementById('trophy-row');
  if (!rankEl || !titleEl || !textEl || !trophyEl) return;
  rankEl.textContent = WorldState.rank;
  titleEl.textContent = 'Orientation Week';
  textEl.textContent = QUEST_STEPS[WorldState.questStep] || 'Explore Diva Academy.';
  trophyEl.innerHTML = WorldState.trophies.map(b => `<span class="trophy-chip">${b}</span>`).join('');
}

// ─── HUD ─────────────────────────────────────────────────────
export function updateHUD() {
  const pct = Math.min(100, Math.max(0, (Player.rep / Settings.goalRep) * 100));
  const bar = document.getElementById('hud-rep-bar');
  if (bar) bar.style.width = pct + '%';
  const label = document.getElementById('hud-rep-label');
  if (label) label.textContent = `${Player.rep} / ${Settings.goalRep} REP`;
  const nameEl = document.getElementById('hud-name');
  if (nameEl) nameEl.textContent = Settings.playerName;
  const roomEl = document.getElementById('hud-room');
  if (roomEl) roomEl.textContent = "LOC: " + currentRoom.name;
  const spotlightEl = document.getElementById('hud-spotlight');
  if (spotlightEl) spotlightEl.classList.toggle('active', !!WorldState.flags.spotlightActive);
  updateObjectiveUI();
}

// ─── Customization Colors ────────────────────────────────────
export const CUSTOM_OPTIONS = {
  dress: {
    label: 'Dress Color',
    options: [
      { id: 'pink', color: '#ec4899', name: 'Rose', unlocked: true },
      { id: 'gold', color: '#fbbf24', name: 'Gold Rush', unlocked: false, require: 'MOTHER Eternia' },
      { id: 'purple', color: '#7c3aed', name: 'Nightshade', unlocked: false, require: 'DJ Chromatic' },
      { id: 'cyan', color: '#38bdf8', name: 'Ocean', unlocked: false, require: 'MOTHER Soleil' },
      { id: 'green', color: '#34d399', name: 'Emerald', unlocked: false, require: 'Sequin Savage' },
    ]
  },
  hair: {
    label: 'Hair Color',
    options: [
      { id: 'purple', color: '#7c3aed', name: 'Violet', unlocked: true },
      { id: 'blonde', color: '#fbbf24', name: 'Blonde', unlocked: false, require: 'Glitter Nova' },
      { id: 'red', color: '#ef4444', name: 'Crimson', unlocked: false, require: 'Vox Minuet' },
      { id: 'white', color: '#e2e8f0', name: 'Platinum', unlocked: false, require: 'Petal Vanguard' },
    ]
  }
};

export function getCustomDressColor() {
  const cat = CUSTOM_OPTIONS.dress;
  const opt = cat.options.find(o => o.id === PlayerStyle.dress);
  return opt ? opt.color : '#ec4899';
}

export function getCustomHairColor() {
  const cat = CUSTOM_OPTIONS.hair;
  const opt = cat.options.find(o => o.id === PlayerStyle.hair);
  return opt ? opt.color : '#7c3aed';
}

// ─── Drawing Helpers ─────────────────────────────────────────
export function drawSpriteFrame(img, dx, dy, dir, frame, scale = 1) {
  if (!img) return false;
  const frameW = 32, frameH = 32;
  const sx = frame * frameW;
  const sy = dir * frameH;
  ctx.drawImage(img, sx, sy, frameW, frameH, dx, dy, frameW * scale, frameH * scale);
  return true;
}

export function drawTileSprite(tileIndex, dx, dy, scale = 1) {
  if (!Sprites.tileset) return false;
  const frameW = 32, frameH = 32;
  const col = tileIndex % 8;
  const row = Math.floor(tileIndex / 8);
  ctx.drawImage(Sprites.tileset, col * frameW, row * frameH, frameW, frameH, dx, dy, frameW * scale, frameH * scale);
  return true;
}

// ─── Tile Drawing ────────────────────────────────────────────
const WALL_HEIGHT = 20;

export function drawTile(tx, ty, sx, sy, t) {
  const tile = currentRoom.tiles[ty]?.[tx];
  if (tile === undefined) return;

  const tileScale = T / 32;
  
  switch (tile) {
    case 1:
      if (drawTileSprite(1, sx, sy, tileScale)) break;
      ctx.fillStyle = '#1a1230'; ctx.fillRect(sx, sy, T, T);
      ctx.fillStyle = '#2d2048'; ctx.fillRect(sx, sy, T, T - WALL_HEIGHT);
      ctx.fillStyle = 'rgba(192,132,252,0.08)'; ctx.fillRect(sx, sy, T, 2);
      ctx.fillStyle = '#120e20'; ctx.fillRect(sx, sy + T - WALL_HEIGHT, T, WALL_HEIGHT);
      break;

    case 0:
      if (drawTileSprite(0, sx, sy, tileScale)) break;
      ctx.fillStyle = '#1e1838'; ctx.fillRect(sx, sy, T, T);
      ctx.fillStyle = '#231d42'; ctx.fillRect(sx + 1, sy + 1, T - 2, T - 2);
      break;

    case 3:
      if (drawTileSprite(2, sx, sy, tileScale)) break;
      ctx.fillStyle = '#2a1440'; ctx.fillRect(sx, sy, T, T);
      ctx.fillStyle = '#351a50'; ctx.fillRect(sx + 3, sy + 3, T - 6, T - 6);
      break;

    case 4:
      if (Sprites.tileset) {
        drawTileSprite(3, sx, sy, tileScale);
        const glow = 0.04 + 0.04 * Math.sin(t * 0.005 + tx * ty * 0.3);
        ctx.fillStyle = (tx + ty) % 2 === 0
          ? `rgba(192,132,252,${glow})`
          : `rgba(244,114,182,${glow})`;
        ctx.fillRect(sx + 2, sy + 2, T - 4, T - 4);
      } else {
        const phase = Math.sin(t * 0.003 + (tx + ty) * 1.2);
        ctx.fillStyle = phase > 0 ? '#2a1060' : '#1e0a4a';
        ctx.fillRect(sx, sy, T, T);
        const glow = 0.04 + 0.04 * Math.sin(t * 0.005 + tx * ty * 0.3);
        ctx.fillStyle = (tx + ty) % 2 === 0
          ? `rgba(192,132,252,${glow})`
          : `rgba(244,114,182,${glow})`;
        ctx.fillRect(sx + 2, sy + 2, T - 4, T - 4);
      }
      break;

    case 5:
      if (Sprites.tileset) {
        drawTileSprite(4, sx, sy, tileScale);
      } else {
        ctx.fillStyle = '#1e1838'; ctx.fillRect(sx, sy, T, T);
        ctx.fillStyle = '#3d2060'; ctx.fillRect(sx + 4, sy + 4, T - 8, T - 8);
      }
      break;
  }
}

// ─── Decor Drawing ───────────────────────────────────────────
export function drawDecor(d, sx, sy, t) {
  const sprite = Sprites.decor[d.type];
  
  if (sprite) {
    ctx.drawImage(sprite, sx, sy, T, T);
    
    if (d.type === 'chandelier') {
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.2 * Math.sin(t*0.003+i)})`;
        ctx.fillRect(sx + 16 + i * 4, sy + 14, 2, 6);
      }
    } else if (d.type === 'spotlight') {
      const beam = 0.1 + 0.06 * Math.sin(t * 0.002);
      ctx.fillStyle = `rgba(251,191,36,${beam})`;
      ctx.fillRect(sx+10, sy+0, 28, 10);
    } else if (d.type === 'lamp') {
      const la = 0.06 + 0.03 * Math.sin(t * 0.002);
      ctx.fillStyle = `rgba(251,191,36,${la})`;
      ctx.fillRect(sx+6, sy+0, 36, 20);
    }
    return;
  }
  
  switch (d.type) {
    case 'plant':
      ctx.fillStyle = '#5c3a1a'; ctx.fillRect(sx+18, sy+30, 12, 14);
      ctx.fillStyle = '#7c4a2a'; ctx.fillRect(sx+16, sy+28, 16, 4);
      ctx.fillStyle = '#22c55e'; ctx.fillRect(sx+14, sy+12, 20, 18);
      ctx.fillStyle = '#16a34a'; ctx.fillRect(sx+18, sy+8, 12, 10);
      ctx.fillStyle = '#4ade80'; ctx.fillRect(sx+20, sy+10, 4, 4);
      break;
    case 'chandelier':
      ctx.fillStyle = '#fbbf24'; ctx.fillRect(sx+14, sy+4, 20, 6);
      ctx.fillStyle = '#f59e0b'; ctx.fillRect(sx+18, sy+10, 12, 4);
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.2 * Math.sin(t*0.003+i)})`;
        ctx.fillRect(sx + 16 + i * 4, sy + 14, 2, 6);
      }
      break;
    case 'banner':
      ctx.fillStyle = '#6b21a8'; ctx.fillRect(sx+18, sy+4, 12, 28);
      ctx.fillStyle = '#c084fc'; ctx.fillRect(sx+20, sy+8, 8, 4);
      ctx.fillStyle = '#fbbf24'; ctx.fillRect(sx+20, sy+20, 8, 2);
      break;
    case 'speaker':
      ctx.fillStyle = '#1a1a2e'; ctx.fillRect(sx+14, sy+8, 20, 32);
      ctx.fillStyle = '#333'; ctx.fillRect(sx+16, sy+10, 16, 28);
      ctx.fillStyle = '#555'; ctx.fillRect(sx+19, sy+14, 10, 10);
      ctx.fillStyle = '#222'; ctx.fillRect(sx+21, sy+16, 6, 6);
      ctx.fillStyle = '#f472b6'; ctx.fillRect(sx+22, sy+30, 4, 2);
      break;
    case 'spotlight':
      ctx.fillStyle = '#444'; ctx.fillRect(sx+22, sy+16, 4, 20);
      ctx.fillStyle = '#666'; ctx.fillRect(sx+16, sy+8, 16, 10);
      const beam = 0.1 + 0.06 * Math.sin(t * 0.002);
      ctx.fillStyle = `rgba(251,191,36,${beam})`;
      ctx.fillRect(sx+10, sy+0, 28, 10);
      break;
    case 'couch':
      ctx.fillStyle = '#4a1942'; ctx.fillRect(sx+6, sy+18, 36, 20);
      ctx.fillStyle = '#6b2460'; ctx.fillRect(sx+8, sy+20, 32, 14);
      ctx.fillStyle = '#5a1d50'; ctx.fillRect(sx+6, sy+16, 8, 22);
      ctx.fillStyle = '#5a1d50'; ctx.fillRect(sx+34, sy+16, 8, 22);
      break;
    case 'table':
      ctx.fillStyle = '#5c3a1a'; ctx.fillRect(sx+12, sy+20, 24, 16);
      ctx.fillStyle = '#7c4a2a'; ctx.fillRect(sx+12, sy+18, 24, 4);
      ctx.fillStyle = '#f472b6'; ctx.fillRect(sx+20, sy+14, 8, 6);
      ctx.fillStyle = '#fff'; ctx.fillRect(sx+21, sy+15, 3, 2);
      break;
    case 'painting':
      ctx.fillStyle = '#fbbf24'; ctx.fillRect(sx+12, sy+6, 24, 20);
      const hue = (d.tx * 73) % 360;
      ctx.fillStyle = `hsl(${hue},50%,25%)`; ctx.fillRect(sx+14, sy+8, 20, 16);
      ctx.fillStyle = `hsl(${(hue+90)%360},60%,45%)`; ctx.fillRect(sx+16, sy+10, 8, 8);
      ctx.fillStyle = `hsl(${(hue+180)%360},50%,40%)`; ctx.fillRect(sx+26, sy+12, 6, 10);
      break;
    case 'lamp':
      ctx.fillStyle = '#444'; ctx.fillRect(sx+22, sy+18, 4, 24);
      ctx.fillStyle = '#fbbf24'; ctx.fillRect(sx+16, sy+8, 16, 12);
      const la = 0.06 + 0.03 * Math.sin(t * 0.002);
      ctx.fillStyle = `rgba(251,191,36,${la})`; ctx.fillRect(sx+6, sy+0, 36, 20);
      break;
    case 'bookshelf':
      ctx.fillStyle = '#5c3a1a'; ctx.fillRect(sx+10, sy+4, 24, 36);
      ctx.fillStyle = '#7c4a2a'; ctx.fillRect(sx+12, sy+6, 20, 32);
      ctx.fillStyle = '#c084fc'; ctx.fillRect(sx+13, sy+8, 6, 8);
      ctx.fillStyle = '#f472b6'; ctx.fillRect(sx+20, sy+8, 5, 8);
      ctx.fillStyle = '#fbbf24'; ctx.fillRect(sx+26, sy+8, 4, 8);
      ctx.fillStyle = '#6b21a8'; ctx.fillRect(sx+13, sy+18, 7, 8);
      ctx.fillStyle = '#f59e0b'; ctx.fillRect(sx+21, sy+18, 5, 8);
      ctx.fillStyle = '#ec4899'; ctx.fillRect(sx+27, sy+18, 3, 8);
      break;
    case 'desk':
      ctx.fillStyle = '#5c3a1a'; ctx.fillRect(sx+6, sy+18, 28, 16);
      ctx.fillStyle = '#7c4a2a'; ctx.fillRect(sx+6, sy+16, 28, 4);
      ctx.fillStyle = '#5c3a1a'; ctx.fillRect(sx+8, sy+34, 4, 10);
      ctx.fillStyle = '#5c3a1a'; ctx.fillRect(sx+28, sy+34, 4, 10);
      ctx.fillStyle = '#e2e8f0'; ctx.fillRect(sx+14, sy+10, 12, 8);
      break;
  }
}

// ─── NPC Drawing ─────────────────────────────────────────────
export function drawNPC(npc, sx, sy, highlight, t) {
  const tier = TIERS[npc.tier];
  const bob = Math.sin(t * 0.003 + npc.tx * 2) * 2;

  const timeSinceEntry = t - roomEntryTime;
  const distFromSpawn = Math.abs(npc.tx - Player.tx) + Math.abs(npc.ty - Player.ty);
  const entranceDelay = distFromSpawn * 80;
  const entranceProgress = Math.min(1, Math.max(0, (timeSinceEntry - entranceDelay) / NPC_ENTRANCE_DURATION));
  const entranceEase = 1 - Math.pow(1 - entranceProgress, 3);
  const entranceSlide = (1 - entranceEase) * 20;

  ctx.save();
  ctx.globalAlpha *= entranceEase;
  ctx.translate(0, entranceSlide);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.ellipse(sx+T/2, sy+T-4, 14, 5, 0, 0, Math.PI*2); ctx.fill();

  const tierKey = npc.tier.toLowerCase();
  const npcSprite = Sprites.npcs[tierKey];
  
  if (npcSprite) {
    ctx.drawImage(npcSprite, sx, sy + bob, T, T);
  } else {
    const bodyY = sy + 10 + bob;
    ctx.fillStyle = tier.color;
    ctx.fillRect(sx+14, bodyY+14, 20, 18);
    ctx.fillStyle = tier.dark;
    ctx.fillRect(sx+14, bodyY+14, 5, 18);

    ctx.fillStyle = '#fde68a';
    ctx.fillRect(sx+16, bodyY+2, 16, 14);
    ctx.fillStyle = tier.color;
    ctx.fillRect(sx+15, bodyY-2, 18, 6);
    ctx.fillRect(sx+13, bodyY+2, 5, 10);
    ctx.fillRect(sx+30, bodyY+2, 5, 10);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(sx+19, bodyY+7, 3, 3);
    ctx.fillRect(sx+26, bodyY+7, 3, 3);
    ctx.fillStyle = '#fff';
    ctx.fillRect(sx+19, bodyY+7, 1, 1);
    ctx.fillRect(sx+26, bodyY+7, 1, 1);

    if (npc.tier === 'MOTHER') {
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(sx+17, bodyY-5, 14, 4);
      ctx.fillRect(sx+18, bodyY-8, 3, 3);
      ctx.fillRect(sx+23, bodyY-9, 3, 4);
      ctx.fillRect(sx+28, bodyY-8, 3, 3);
    } else if (npc.tier === 'DJ') {
      ctx.fillStyle = '#333';
      ctx.fillRect(sx+13, bodyY+4, 4, 6);
      ctx.fillRect(sx+31, bodyY+4, 4, 6);
      ctx.fillRect(sx+15, bodyY, 18, 3);
    }
  }

  if (highlight) {
    ctx.strokeStyle = npc.isRival ? '#ef4444' : tier.color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10; ctx.shadowColor = npc.isRival ? '#ef4444' : tier.color;
    ctx.strokeRect(sx+10, sy+6+bob, 28, 36);
    ctx.shadowBlur = 0;
  }

  if (npc.isRival) {
    ctx.save();
    ctx.globalAlpha = 0.15 + 0.1 * Math.sin(t * 0.005);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath(); ctx.ellipse(sx+T/2, sy+T/2, 22, 22, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  ctx.restore();

  ctx.font = '600 10px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = npc.isRival ? '#ef4444' : tier.color;
  const nameLabel = npc.isRival ? npc.name.split(' ')[0] + ' (Rival)' : npc.name.split(' ')[0];
  ctx.fillText(nameLabel, sx+T/2, sy+T+10);
}

// ─── Terminal Drawing ────────────────────────────────────────
export function drawTerminal(term, sx, sy, highlight, t) {
  const col = term.type === 'hangman' ? '#38bdf8' : '#34d399';
  ctx.fillStyle = '#14142a'; ctx.fillRect(sx+10, sy+10, 28, 28);
  ctx.fillStyle = '#1c1c3a'; ctx.fillRect(sx+12, sy+12, 24, 20);
  
  const flk = highlight ? 1 : 0.6 + 0.4*Math.sin(t*0.005);
  ctx.save(); ctx.globalAlpha = flk;
  ctx.fillStyle = col; ctx.fillRect(sx+14, sy+14, 20, 16);
  ctx.restore();
  
  ctx.font = 'bold 14px Outfit, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = col;
  ctx.fillText(term.icon || '?', sx+T/2, sy+22);
  
  ctx.fillStyle = '#333'; ctx.fillRect(sx+16, sy+34, 16, 4);
  
  ctx.font = '600 9px Outfit, sans-serif';
  ctx.fillStyle = col; ctx.textAlign = 'center';
  ctx.fillText(term.name, sx+T/2, sy+T+10);
  
  if (highlight) {
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.shadowBlur = 8; ctx.shadowColor = col;
    ctx.strokeRect(sx+8, sy+8, 32, 32);
    ctx.shadowBlur = 0;
  }
}

// ─── Player Drawing ──────────────────────────────────────────
export function drawPlayer(sx, sy, t) {
  const bob = Player.moving ? Math.sin(Player.stepTimer * 0.3) * 2 : Math.sin(t*0.003);
  const wf = Math.floor(Player.walkFrame) % 4;

  const timeSinceEntry = t - roomEntryTime;
  if (timeSinceEntry < 1000) {
    const sparkleProgress = timeSinceEntry / 1000;
    const sparkleAlpha = Math.sin(sparkleProgress * Math.PI) * 0.6;
    ctx.save();
    ctx.globalAlpha = sparkleAlpha;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + t * 0.005;
      const dist = 20 + sparkleProgress * 15;
      const sparkleX = sx + T/2 + Math.cos(angle) * dist;
      const sparkleY = sy + T/2 + Math.sin(angle) * dist;
      const sparkleSize = 2 + Math.sin(t * 0.01 + i) * 1;
      ctx.fillStyle = i % 2 === 0 ? '#fbbf24' : '#f472b6';
      ctx.fillRect(sparkleX - sparkleSize/2, sparkleY - sparkleSize/2, sparkleSize, sparkleSize);
    }
    ctx.restore();
  }

  if (timeSinceEntry < 2500) {
    const arrowProgress = timeSinceEntry / 2500;
    const arrowAlpha = Math.min(1, Math.sin(arrowProgress * Math.PI) * 1.8);
    
    ctx.save();
    ctx.globalAlpha = arrowAlpha;
    
    const arrowY = sy - 24 + Math.sin(t * 0.01) * 3;
    const arrowX = sx + T/2;
    
    ctx.fillStyle = '#fbbf24';
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ec4899';
    
    ctx.beginPath();
    ctx.moveTo(arrowX - 8, arrowY - 12);
    ctx.lineTo(arrowX + 8, arrowY - 12);
    ctx.lineTo(arrowX, arrowY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    ctx.font = 'bold 9px Outfit, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#000';
    ctx.fillText('YOU', arrowX, arrowY - 16);
    
    ctx.restore();
  }

  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.ellipse(sx+T/2, sy+T-2, 12, 5, 0, 0, Math.PI*2); ctx.fill();

  if (Sprites.player) {
    const dirMap = { down: 0, left: 1, right: 2, up: 3 };
    const dir = dirMap[Player.facing] || 0;
    const frame = Player.moving ? wf : 0;
    drawSpriteFrame(Sprites.player, sx, sy + bob - 8, dir, frame);
    return;
  }

  const by = sy + 6 + bob;
  const dressColor = getCustomDressColor();
  const hairColor = getCustomHairColor();

  ctx.fillStyle = hairColor;
  ctx.fillRect(sx+12, by-2, 24, 8);
  ctx.fillRect(sx+10, by+4, 6, 14);
  ctx.fillRect(sx+32, by+4, 6, 14);

  ctx.fillStyle = dressColor; ctx.fillRect(sx+14, by+16, 20, 16);
  ctx.fillStyle = darkenColor(dressColor, 0.6); ctx.fillRect(sx+14, by+16, 5, 16);
  ctx.fillRect(sx+11, by+26, 26, 8);
  ctx.fillStyle = lightenColor(dressColor, 0.2); ctx.fillRect(sx+13, by+28, 22, 4);
  
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(sx + 20 + (wf%2)*4, by+20, 2, 2);
  ctx.fillRect(sx + 26 - (wf%2)*3, by+24, 2, 2);

  ctx.fillStyle = '#fde68a';
  const armSwing = Player.moving ? Math.sin(Player.stepTimer*0.4)*3 : 0;
  ctx.fillRect(sx+11, by+16+armSwing, 4, 12);
  ctx.fillRect(sx+33, by+16-armSwing, 4, 12);

  ctx.fillStyle = '#fef3c7'; ctx.fillRect(sx+15, by+2, 18, 16);
  ctx.fillStyle = '#fde68a'; ctx.fillRect(sx+16, by+3, 16, 14);
  
  ctx.fillStyle = 'rgba(251,113,133,0.4)';
  ctx.fillRect(sx+15, by+11, 4, 3);
  ctx.fillRect(sx+29, by+11, 4, 3);
  
  const eo = {down:[0,0],up:[0,-2],left:[-2,0],right:[2,0]}[Player.facing];
  ctx.fillStyle = '#1e1b4b';
  ctx.fillRect(sx+19+eo[0], by+8+eo[1], 3, 4);
  ctx.fillRect(sx+26+eo[0], by+8+eo[1], 3, 4);
  ctx.fillStyle = '#fff';
  ctx.fillRect(sx+19+eo[0], by+8+eo[1], 1, 1);
  ctx.fillRect(sx+26+eo[0], by+8+eo[1], 1, 1);
  ctx.fillStyle = '#be185d'; ctx.fillRect(sx+22, by+14, 4, 1);

  ctx.fillStyle = hairColor;
  ctx.fillRect(sx+14, by, 20, 5);
  ctx.fillStyle = lightenColor(hairColor, 0.3); ctx.fillRect(sx+16, by, 6, 3);

  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(sx+17, by-4, 14, 3);
  ctx.fillRect(sx+19, by-7, 3, 3);
  ctx.fillRect(sx+23, by-8, 3, 4);
  ctx.fillRect(sx+27, by-7, 3, 3);
  ctx.fillStyle = dressColor; ctx.fillRect(sx+24, by-7, 2, 2);

  ctx.fillStyle = '#fde68a';
  if (Player.moving) {
    const lo = [[0,0],[2,-1],[-1,0],[1,1]][wf];
    ctx.fillRect(sx+18+lo[0], by+32, 4, 7);
    ctx.fillRect(sx+26-lo[0], by+32, 4, 7);
  } else {
    ctx.fillRect(sx+18, by+32, 4, 7);
    ctx.fillRect(sx+26, by+32, 4, 7);
  }
  ctx.fillStyle = dressColor;
  ctx.fillRect(sx+17, by+38, 6, 3);
  ctx.fillRect(sx+25, by+38, 6, 3);
}

// ─── Lighting Overlay ────────────────────────────────────────
export function drawLighting(cam, t) {
  ctx.fillStyle = 'rgba(5,5,15,0.35)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const light of currentRoom.lights) {
    const lx = light.x * T + T/2 - cam.x;
    const ly = light.y * T + T/2 - cam.y;
    const r = light.radius * (light.flicker ? (1 + 0.05*Math.sin(t*0.008)) : 1);
    const grad = ctx.createRadialGradient(lx, ly, 0, lx, ly, r);
    grad.addColorStop(0, light.color);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(lx - r, ly - r, r * 2, r * 2);
  }
  const plx = Player.px + T/2 - cam.x;
  const ply = Player.py + T/2 - cam.y;
  const pg = ctx.createRadialGradient(plx, ply, 0, plx, ply, 80);
  pg.addColorStop(0, 'rgba(244,114,182,0.06)');
  pg.addColorStop(1, 'transparent');
  ctx.fillStyle = pg;
  ctx.fillRect(plx-80, ply-80, 160, 160);
  ctx.restore();
}

// ─── Sparkle Particles ───────────────────────────────────────
export const sparkles = [];
export function initSparkles() {
  sparkles.length = 0;
  for (let i = 0; i < 20; i++) {
    sparkles.push({
      x: Math.random() * currentRoom.cols * T,
      y: Math.random() * currentRoom.rows * T,
      phase: Math.random() * Math.PI * 2,
      speed: 0.003 + Math.random() * 0.004
    });
  }
}

export function drawSparkles(cam, t) {
  for (const s of sparkles) {
    const alpha = Math.max(0, Math.sin(t * s.speed + s.phase));
    if (alpha < 0.5) continue;
    const sx = s.x - cam.x;
    const sy = s.y - cam.y;
    if (sx < -5 || sx > canvas.width+5 || sy < -5 || sy > canvas.height+5) continue;
    ctx.fillStyle = `rgba(255,255,255,${alpha * 0.6})`;
    ctx.fillRect(sx, sy-2, 1, 5);
    ctx.fillRect(sx-2, sy, 5, 1);
  }
}

// ─── Burst Particles ─────────────────────────────────────────
export const bursts = [];

export function spawnBurst(wx, wy, color, n) {
  for (let i = 0; i < n; i++) bursts.push({
    x:wx, y:wy, vx:(Math.random()-0.5)*5, vy:(Math.random()-1.5)*4,
    life:1, decay:0.02+Math.random()*0.02, size:3+Math.random()*4, color
  });
}

export function updateBursts() {
  for (let i=bursts.length-1; i>=0; i--) {
    const p=bursts[i]; p.x+=p.vx; p.y+=p.vy; p.vy+=0.1; p.life-=p.decay;
    if(p.life<=0) bursts.splice(i,1);
  }
}

export function drawBursts(cam) {
  for (const p of bursts) {
    ctx.save(); ctx.globalAlpha=p.life;
    ctx.fillStyle=p.color;
    ctx.fillRect(p.x-cam.x, p.y-cam.y, p.size*p.life, p.size*p.life);
    ctx.restore();
  }
}

// ─── Door Helpers ────────────────────────────────────────────
export function getDoorDirection(door) {
  const room = currentRoom;
  const tiles = room.tiles;
  if (door.ty > 0 && tiles[door.ty - 1]?.[door.tx] === 1) return 'up';
  if (door.tx > 0 && tiles[door.ty]?.[door.tx - 1] === 1) return 'left';
  if (door.ty < room.rows - 1 && tiles[door.ty + 1]?.[door.tx] === 1) return 'down';
  if (door.tx < room.cols - 1 && tiles[door.ty]?.[door.tx + 1] === 1) return 'right';
  return 'down';
}

export function getGroupedDoors() {
  const grouped = [];
  const doors = currentRoom.doors || [];
  const visited = new Set();
  
  for (let i = 0; i < doors.length; i++) {
    if (visited.has(i)) continue;
    
    const d1 = doors[i];
    const group = [d1];
    visited.add(i);
    
    let foundNew = true;
    while (foundNew) {
      foundNew = false;
      for (let j = 0; j < doors.length; j++) {
        if (visited.has(j)) continue;
        const d2 = doors[j];
        if (d2.target === d1.target) {
          const isAdjacent = group.some(member => 
            (Math.abs(member.tx - d2.tx) <= 1 && member.ty === d2.ty) ||
            (Math.abs(member.ty - d2.ty) <= 1 && member.tx === d2.tx)
          );
          if (isAdjacent) {
            group.push(d2);
            visited.add(j);
            foundNew = true;
          }
        }
      }
    }
    grouped.push(group);
  }
  return grouped;
}

export function drawDoorGlow(group, cam, t) {
  const d1 = group[0];
  const dir = getDoorDirection(d1);
  const glowIntensity = 0.3 + 0.2 * Math.sin(t * 0.004);
  const locked = group.some(d => d.requiresTrophy && !hasTrophy(d.requiresTrophy));
  const color = locked ? '139,127,170' : '251,191,36';
  
  const minTx = Math.min(...group.map(d => d.tx));
  const maxTx = Math.max(...group.map(d => d.tx));
  const minTy = Math.min(...group.map(d => d.ty));
  const maxTy = Math.max(...group.map(d => d.ty));
  
  const width = (maxTx - minTx + 1) * T;
  const height = (maxTy - minTy + 1) * T;
  const sx = minTx * T - cam.x;
  const sy = minTy * T - cam.y;

  ctx.save();
  ctx.globalAlpha = glowIntensity;
  ctx.strokeStyle = `rgba(${color},0.8)`;
  ctx.lineWidth = 2;
  ctx.shadowBlur = 8;
  ctx.shadowColor = `rgba(${color},0.5)`;
  
  const glowOffset = 3;
  const pulse = Math.sin(t * 0.004) * 2;
  
  switch (dir) {
    case 'down':
      ctx.beginPath();
      ctx.moveTo(sx + glowOffset, sy + glowOffset + pulse);
      ctx.lineTo(sx + width - glowOffset, sy + glowOffset + pulse);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx + glowOffset, sy + glowOffset + pulse);
      ctx.lineTo(sx + glowOffset, sy + height/2);
      ctx.moveTo(sx + width - glowOffset, sy + glowOffset + pulse);
      ctx.lineTo(sx + width - glowOffset, sy + height/2);
      ctx.stroke();
      break;
    case 'up':
      ctx.beginPath();
      ctx.moveTo(sx + glowOffset, sy + height - glowOffset - pulse);
      ctx.lineTo(sx + width - glowOffset, sy + height - glowOffset - pulse);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx + glowOffset, sy + height - glowOffset - pulse);
      ctx.lineTo(sx + glowOffset, sy + height/2);
      ctx.moveTo(sx + width - glowOffset, sy + height - glowOffset - pulse);
      ctx.lineTo(sx + width - glowOffset, sy + height/2);
      ctx.stroke();
      break;
    case 'left':
      ctx.beginPath();
      ctx.moveTo(sx + width - glowOffset - pulse, sy + glowOffset);
      ctx.lineTo(sx + width - glowOffset - pulse, sy + height - glowOffset);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx + width - glowOffset - pulse, sy + glowOffset);
      ctx.lineTo(sx + width/2, sy + glowOffset);
      ctx.moveTo(sx + width - glowOffset - pulse, sy + height - glowOffset);
      ctx.lineTo(sx + width/2, sy + height - glowOffset);
      ctx.stroke();
      break;
    case 'right':
      ctx.beginPath();
      ctx.moveTo(sx + glowOffset + pulse, sy + glowOffset);
      ctx.lineTo(sx + glowOffset + pulse, sy + height - glowOffset);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx + glowOffset + pulse, sy + glowOffset);
      ctx.lineTo(sx + width/2, sy + glowOffset);
      ctx.moveTo(sx + glowOffset + pulse, sy + height - glowOffset);
      ctx.lineTo(sx + width/2, sy + height - glowOffset);
      ctx.stroke();
      break;
  }
  
  ctx.restore();
}

export function drawDoorLabels(cam, t) {
  const groups = getGroupedDoors();
  
  for (const group of groups) {
    const d1 = group[0];
    drawDoorGlow(group, cam, t);

    const avgTx = group.reduce((sum, d) => sum + d.tx, 0) / group.length;
    const avgTy = group.reduce((sum, d) => sum + d.ty, 0) / group.length;
    
    const dx = Math.abs(avgTx - Player.tx);
    const dy = Math.abs(avgTy - Player.ty);
    if (dx > 3 || dy > 3) continue;

    const minTx = Math.min(...group.map(d => d.tx));
    const maxTx = Math.max(...group.map(d => d.tx));
    const minTy = Math.min(...group.map(d => d.ty));
    const maxTy = Math.max(...group.map(d => d.ty));
    
    const width = (maxTx - minTx + 1) * T;
    const height = (maxTy - minTy + 1) * T;
    
    const sx = minTx * T - cam.x;
    const sy = minTy * T - cam.y;
    
    const dir = getDoorDirection(d1);
    const centerX = sx + width / 2;
    const centerY = sy + height / 2;
    
    let labelX = centerX;
    let labelY;
    let arrowChar;
    const bounce = Math.sin(t*0.005)*2;
    
    switch(dir) {
      case 'down':
        labelY = sy - 16 + bounce;
        arrowChar = '↓';
        break;
      case 'up':
        labelY = sy + height + 20 + bounce;
        arrowChar = '↑';
        break;
      case 'left':
        labelX = sx + width + 10;
        labelY = sy + height / 2 + bounce;
        arrowChar = '←';
        break;
      case 'right':
        labelX = sx - 10;
        labelY = sy + height / 2 + bounce;
        arrowChar = '→';
        break;
    }
    
    ctx.font = '600 11px Outfit, sans-serif';
    ctx.textAlign = 'center';
    
    const locked = group.some(d => d.requiresTrophy && !hasTrophy(d.requiresTrophy));
    const label = locked ? `${d1.label} · locked` : d1.label;
    const tw = ctx.measureText(label).width;
    
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    const pillWidth = tw + 16;
    const pillHeight = 20;
    ctx.fillRect(labelX - pillWidth/2, labelY - pillHeight/2, pillWidth, pillHeight);
    
    ctx.strokeStyle = locked ? 'rgba(139,127,170,0.4)' : 'rgba(251,191,36,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(labelX - pillWidth/2, labelY - pillHeight/2, pillWidth, pillHeight);
    
    ctx.fillStyle = locked ? '#8b7faa' : '#fbbf24';
    ctx.fillText(label, labelX, labelY + 4);
    
    ctx.font = '600 14px Outfit, sans-serif';
    ctx.fillText(arrowChar, centerX, centerY + 5);
  }
}

export function drawPrompt(entity, cam, t) {
  const sx = entity.tx * T - cam.x + T/2;
  const sy = entity.ty * T - cam.y - 12;
  const bounce = Math.sin(t*0.006)*2;
  ctx.font = 'bold 10px Outfit, sans-serif';
  ctx.textAlign = 'center';
  const label = entity.tier ? '[ E ] Battle' : '[ E ] Play';
  const tw = ctx.measureText(label).width;
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(sx-tw/2-6, sy-7+bounce, tw+12, 16);
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(label, sx, sy+3+bounce);
}

export function showPerkActivation(text) {
  const toast = document.getElementById('perk-toast');
  if (!toast) return;
  toast.textContent = text;
  toast.classList.add('active');
  clearTimeout(showPerkActivation._timer);
  showPerkActivation._timer = setTimeout(() => toast.classList.remove('active'), 2000);
}
