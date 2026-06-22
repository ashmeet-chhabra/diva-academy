// ============================================================
//  DIVA ACADEMY – Input & Screen Manager
// ============================================================

import { setPaused, transitioning, setTransitioning } from './engine-state.js';
import { ScreenShake, Juice } from './engine-gfx.js';

export const keys = {};

// Register keyboard listeners
document.addEventListener('keydown', e => { keys[e.key] = true; });
document.addEventListener('keyup', e => { keys[e.key] = false; });

export function dirPressed() {
  if (keys.ArrowUp || keys.w || keys.W || keys._up) return 'up';
  if (keys.ArrowDown || keys.s || keys.S || keys._down) return 'down';
  if (keys.ArrowLeft || keys.a || keys.A || keys._left) return 'left';
  if (keys.ArrowRight || keys.d || keys.D || keys._right) return 'right';
  return null;
}

// ─── Screens & Dom Caching ───────────────────────────────────
export const screens = {};
const screenIds = [
  'title', 'settings', 'game', 'pause', 'faceoff', 'result',
  'hangman', 'collab', 'gameover', 'customize', 'perks',
  'quote', 'howtoplay', 'active-perks'
];

screenIds.forEach(id => {
  screens[id] = document.getElementById('screen-' + id);
});

export function showScreen(name) {
  // Clear dialogue if open (defined globally or imported)
  const dialogueBox = document.getElementById('dialogue-box');
  if (dialogueBox) dialogueBox.classList.add('hidden');
  
  ScreenShake.reset();
  Juice.flashAlpha = 0;
  Juice.zoomScale = 1;
  
  // Clear transition overlay
  const overlay = document.getElementById('transition-overlay');
  if (overlay) overlay.classList.remove('active');
  setTransitioning(false);
  
  Object.values(screens).forEach(s => {
    if (s) s.classList.remove('active');
  });
  
  if (screens[name]) {
    screens[name].classList.add('active');
  }
  window.gameState = name;
}

// ─── Menu Keyboard Navigation ────────────────────────────────
document.addEventListener('keydown', (e) => {
  const menuStates = ['title', 'settings', 'pause', 'gameover', 'perks', 'howtoplay', 'customize', 'active-perks'];
  if (!menuStates.includes(window.gameState)) return;

  // Only intercept navigation keys
  if (!['ArrowUp', 'ArrowDown', 'w', 's', 'W', 'S', 'Enter', ' '].includes(e.key)) return;

  // Skip if actively typing in inputs
  if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT')) {
    if (e.key === 'Enter') document.activeElement.blur();
    return;
  }

  const currentScreen = screens[window.gameState];
  if (!currentScreen) return;

  // Find visible, focusable buttons, inputs, selects
  const focusables = Array.from(currentScreen.querySelectorAll('button, input, select')).filter(el => {
    const style = window.getComputedStyle(el);
    return el.offsetParent !== null && style.display !== 'none' && style.visibility !== 'hidden' && !el.disabled;
  });

  if (focusables.length === 0) return;

  e.preventDefault();
  let currentIndex = focusables.indexOf(document.activeElement);

  if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
    const nextIndex = (currentIndex + 1) % focusables.length;
    focusables[nextIndex].focus();
  } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
    const prevIndex = (currentIndex - 1 + focusables.length) % focusables.length;
    focusables[prevIndex].focus();
  } else if (e.key === 'Enter' || e.key === ' ') {
    if (currentIndex !== -1) {
      focusables[currentIndex].click();
    } else {
      focusables[0].focus();
    }
  }
});

// Setup mobile on-screen D-pad
export function initMobileDPad() {
  document.querySelectorAll('#dpad button').forEach(btn => {
    const dir = btn.dataset.dir;
    btn.addEventListener('pointerdown', () => { keys['_' + dir] = true; });
    btn.addEventListener('pointerup', () => { keys['_' + dir] = false; });
    btn.addEventListener('pointerleave', () => { keys['_' + dir] = false; });
  });
}
