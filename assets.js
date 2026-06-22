// ============================================================
//  DIVA ACADEMY – Asset & Sprite Loader
// ============================================================

export const Sprites = {
  player: null,
  npcs: {},
  tileset: null,
  decor: {},
  loaded: false,
  loading: false
};

export function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn('Failed to load:', url);
      resolve(null);
    };
    img.src = url;
  });
}

export function darkenColor(hex, amount) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgb(${Math.floor(r*amount)},${Math.floor(g*amount)},${Math.floor(b*amount)})`;
}

export function lightenColor(hex, amount) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgb(${Math.min(255,Math.floor(r+(255-r)*amount))},${Math.min(255,Math.floor(g+(255-g)*amount))},${Math.min(255,Math.floor(b+(255-b)*amount))})`;
}

export async function loadSprites() {
  if (Sprites.loading || Sprites.loaded) return;
  Sprites.loading = true;
  
  const basePath = 'assets/';
  
  // Set to null to use dynamic vector custom styles (allows unlocked hair/dress customizations)
  Sprites.player = null;
  
  // Load NPC sprites
  const npcNames = ['starlet', 'diva', 'dj', 'mother'];
  for (const name of npcNames) {
    Sprites.npcs[name] = await loadImage(basePath + `sprites/npc-${name}.png`);
  }
  
  // Load tileset
  Sprites.tileset = await loadImage(basePath + 'tiles/indoor.png');
  
  // Load decor sprites
  const decorNames = ['plant', 'chandelier', 'banner', 'speaker', 'spotlight', 'couch', 'table', 'painting', 'lamp'];
  for (const name of decorNames) {
    Sprites.decor[name] = await loadImage(basePath + `sprites/decor-${name}.png`);
  }
  
  Sprites.loaded = true;
  Sprites.loading = false;
}
