// ============================================================
//  DIVA ACADEMY – Room Maps & NPC Tier Configurations
// ============================================================

export const TIERS = {
  STARLET: { label:'Starlet', trophy:'trophy-starlet', questions:1, repWin:10, repLoss:5,  emoji:'🌟', color:'#f472b6', dark:'#9d174d' },
  DIVA:    { label:'Diva',    trophy:'trophy-diva',    questions:2, repWin:20, repLoss:10, emoji:'💅', color:'#c084fc', dark:'#6b21a8' },
  DJ:      { label:'DJ',      trophy:'trophy-dj',      questions:3, repWin:35, repLoss:18, emoji:'🎧', color:'#38bdf8', dark:'#0369a1' },
  MOTHER:  { label:'Mother',  trophy:'trophy-mother',  questions:4, repWin:55, repLoss:28, emoji:'👑', color:'#fbbf24', dark:'#92400e' }
};

export const ROOMS = {
  "lobby": {
    "name": "Grand Lobby",
    "cols": 14,
    "rows": 10,
    "tiles": [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,3,3,3,0,0,0,0,0,0,3,3,3,1],
      [1,3,3,0,0,0,0,0,0,0,0,3,3,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,3,3,0,0,0,0,0,0,0,0,3,3,1],
      [1,3,3,3,0,0,5,5,0,0,3,3,3,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    "npcs": [
      {
        "name": "Glitter Nova",
        "tier": "STARLET",
        "tx": 3,
        "ty": 4,
      },
      {
        "name": "Vox Minuet",
        "tier": "STARLET",
        "tx": 10,
        "ty": 4,
      }
    ],
    "terminals": [],
    "doors": [
      {
        "tx": 6,
        "ty": 8,
        "target": "stage",
        "targetTx": 7,
        "targetTy": 8,
        "label": "The Stage"
      },
      {
        "tx": 7,
        "ty": 8,
        "target": "stage",
        "targetTx": 8,
        "targetTy": 8,
        "label": "The Stage"
      },
      {
        "tx": 1,
        "ty": 5,
        "target": "hangman",
        "targetTx": 8,
        "targetTy": 7,
        "label": "Hangman Hall"
      },
      {
        "tx": 12,
        "ty": 5,
        "target": "vip",
        "targetTx": 3,
        "targetTy": 5,
        "label": "VIP Lounge",
        "requiresTrophy": "Orientation Complete"
      },
      {
        "tx": 3,
        "ty": 8,
        "target": "archives",
        "targetTx": 5,
        "targetTy": 7,
        "label": "Archives"
      }
    ],
    "lights": [
      {
        "x": 7,
        "y": 3,
        "radius": 180,
        "color": "rgba(251,191,36,0.12)",
        "flicker": true
      },
      {
        "x": 3,
        "y": 6,
        "radius": 100,
        "color": "rgba(192,132,252,0.08)"
      },
      {
        "x": 11,
        "y": 6,
        "radius": 100,
        "color": "rgba(56,189,248,0.08)"
      }
    ],
    "decor": [
      {
        "tx": 7,
        "ty": 2,
        "type": "chandelier"
      },
      {
        "tx": 2,
        "ty": 3,
        "type": "plant"
      },
      {
        "tx": 11,
        "ty": 3,
        "type": "plant"
      },
      {
        "tx": 5,
        "ty": 2,
        "type": "banner"
      },
      {
        "tx": 9,
        "ty": 2,
        "type": "banner"
      }
    ],
    "playerStart": {
      "tx": 7,
      "ty": 6
    }
  },
  "stage": {
    "name": "The Stage",
    "cols": 14,
    "rows": 10,
    "tiles": [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,4,4,4,4,4,4,4,4,4,4,1,1],
      [1,1,4,4,4,4,4,4,4,4,4,4,1,1],
      [1,1,4,4,4,4,4,4,4,4,4,4,1,1],
      [1,1,0,0,0,0,0,0,0,0,0,0,1,1],
      [1,1,0,0,0,0,0,0,0,0,0,0,1,1],
      [1,1,0,0,0,0,0,0,0,0,0,0,1,1],
      [1,1,0,0,0,0,5,5,0,0,0,0,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    "npcs": [
      {
        "name": "MOTHER Eternia",
        "tier": "MOTHER",
        "tx": 6,
        "ty": 3,
      },
      {
        "name": "DJ Chromatic",
        "tier": "DJ",
        "tx": 9,
        "ty": 5,
      }
    ],
    "terminals": [],
    "doors": [
      {
        "tx": 6,
        "ty": 8,
        "target": "lobby",
        "targetTx": 6,
        "targetTy": 7,
        "label": "Lobby"
      },
      {
        "tx": 7,
        "ty": 8,
        "target": "lobby",
        "targetTx": 7,
        "targetTy": 7,
        "label": "Lobby"
      },
      {
        "tx": 11,
        "ty": 5,
        "target": "collab",
        "targetTx": 3,
        "targetTy": 4,
        "label": "Pop Connect"
      }
    ],
    "lights": [
      {
        "x": 7,
        "y": 3,
        "radius": 200,
        "color": "rgba(251,191,36,0.18)",
        "flicker": true
      },
      {
        "x": 4,
        "y": 3,
        "radius": 120,
        "color": "rgba(244,114,182,0.1)"
      },
      {
        "x": 10,
        "y": 3,
        "radius": 120,
        "color": "rgba(139,92,246,0.1)"
      }
    ],
    "decor": [
      {
        "tx": 3,
        "ty": 2,
        "type": "speaker"
      },
      {
        "tx": 10,
        "ty": 2,
        "type": "speaker"
      },
      {
        "tx": 7,
        "ty": 1,
        "type": "spotlight"
      },
      {
        "tx": 5,
        "ty": 1,
        "type": "spotlight"
      },
      {
        "tx": 9,
        "ty": 1,
        "type": "spotlight"
      }
    ],
    "playerStart": {
      "tx": 7,
      "ty": 7
    }
  },
  "vip": {
    "name": "VIP Lounge",
    "cols": 14,
    "rows": 10,
    "tiles": [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,3,3,3,3,3,3,3,3,1,1,1],
      [1,1,1,3,3,3,3,3,3,3,3,1,1,1],
      [1,1,1,3,3,0,0,0,0,3,3,1,1,1],
      [1,1,1,0,0,0,0,0,0,0,0,1,1,1],
      [1,1,1,5,0,0,0,0,0,0,0,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    "npcs": [
      {
        "name": "MOTHER Soleil",
        "tier": "MOTHER",
        "tx": 7,
        "ty": 4,
      },
      {
        "name": "Petal Vanguard",
        "tier": "DIVA",
        "tx": 9,
        "ty": 6,
      }
    ],
    "terminals": [],
    "doors": [
      {
        "tx": 3,
        "ty": 7,
        "target": "lobby",
        "targetTx": 11,
        "targetTy": 5,
        "label": "Lobby"
      }
    ],
    "lights": [
      {
        "x": 7,
        "y": 4,
        "radius": 160,
        "color": "rgba(56,189,248,0.12)"
      },
      {
        "x": 4,
        "y": 5,
        "radius": 90,
        "color": "rgba(251,191,36,0.08)"
      },
      {
        "x": 10,
        "y": 5,
        "radius": 90,
        "color": "rgba(251,191,36,0.08)"
      }
    ],
    "decor": [
      {
        "tx": 5,
        "ty": 3,
        "type": "couch"
      },
      {
        "tx": 8,
        "ty": 3,
        "type": "couch"
      },
      {
        "tx": 7,
        "ty": 3,
        "type": "table"
      },
      {
        "tx": 3,
        "ty": 3,
        "type": "plant"
      },
      {
        "tx": 10,
        "ty": 3,
        "type": "plant"
      }
    ],
    "playerStart": {
      "tx": 6,
      "ty": 6
    }
  },
  "hangman": {
    "name": "Hangman Hall",
    "cols": 14,
    "rows": 10,
    "tiles": [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,0,0,0,0,0,0,0,0,1,1,1],
      [1,1,1,0,0,0,0,0,0,0,0,1,1,1],
      [1,1,1,0,0,0,0,0,0,0,0,1,1,1],
      [1,1,1,0,0,0,0,0,0,0,0,1,1,1],
      [1,1,1,0,0,0,0,0,0,0,0,1,1,1],
      [1,1,1,0,0,0,0,0,5,0,0,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    "npcs": [
      {
        "name": "Sequin Savage",
        "tier": "DIVA",
        "tx": 5,
        "ty": 4,
      }
    ],
    "terminals": [
      {
        "name": "Hangman",
        "type": "hangman",
        "tx": 7,
        "ty": 3,
        "icon": "H"
      }
    ],
    "doors": [
      {
        "tx": 8,
        "ty": 7,
        "target": "lobby",
        "targetTx": 2,
        "targetTy": 5,
        "label": "Lobby"
      }
    ],
    "lights": [
      {
        "x": 7,
        "y": 4,
        "radius": 180,
        "color": "rgba(56,189,248,0.12)"
      }
    ],
    "decor": [
      {
        "tx": 4,
        "ty": 2,
        "type": "painting"
      },
      {
        "tx": 9,
        "ty": 2,
        "type": "painting"
      },
      {
        "tx": 7,
        "ty": 2,
        "type": "lamp"
      }
    ],
    "playerStart": {
      "tx": 7,
      "ty": 5
    }
  },
  "collab": {
    "name": "Pop Connect",
    "cols": 14,
    "rows": 10,
    "tiles": [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,0,0,0,0,0,0,0,0,1,1,1],
      [1,1,1,0,0,0,0,0,0,0,0,1,1,1],
      [1,1,1,0,0,0,0,0,0,0,0,1,1,1],
      [1,1,1,0,0,0,0,0,0,0,0,1,1,1],
      [1,1,1,0,0,0,0,0,0,0,0,1,1,1],
      [1,1,1,5,0,0,0,0,0,0,0,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    "npcs": [
      {
        "name": "Lux Ferreira",
        "tier": "DJ",
        "tx": 8,
        "ty": 4,
      }
    ],
    "terminals": [
      {
        "name": "Pop Connect",
        "type": "collab",
        "tx": 7,
        "ty": 3,
        "icon": "C"
      }
    ],
    "doors": [
      {
        "tx": 3,
        "ty": 7,
        "target": "stage",
        "targetTx": 10,
        "targetTy": 5,
        "label": "Stage"
      }
    ],
    "lights": [
      {
        "x": 7,
        "y": 4,
        "radius": 180,
        "color": "rgba(52,211,153,0.12)"
      }
    ],
    "decor": [
      {
        "tx": 5,
        "ty": 2,
        "type": "painting"
      },
      {
        "tx": 9,
        "ty": 2,
        "type": "painting"
      },
      {
        "tx": 7,
        "ty": 1,
        "type": "lamp"
      }
    ],
    "playerStart": {
      "tx": 7,
      "ty": 5
    }
  },
  "archives": {
    "name": "Archives",
    "cols": 14,
    "rows": 10,
    "tiles": [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,0,0,0,0,0,0,0,0,1,1,1],
      [1,1,1,0,0,0,0,0,0,0,0,1,1,1],
      [1,1,1,0,0,0,0,0,0,0,0,1,1,1],
      [1,1,1,0,0,0,0,0,0,0,0,1,1,1],
      [1,1,1,0,0,0,0,0,0,0,0,1,1,1],
      [1,1,1,0,0,5,0,0,0,0,0,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    "npcs": [
      {
        "name": "Alan",
        "tier": "DJ",
        "tx": 7,
        "ty": 5,
      }
    ],
    "terminals": [],
    "doors": [
      {
        "tx": 5,
        "ty": 8,
        "target": "lobby",
        "targetTx": 3,
        "targetTy": 8,
        "label": "Lobby"
      }
    ],
    "lights": [
      {
        "x": 7,
        "y": 5,
        "radius": 160,
        "color": "rgba(34,197,94,0.12)"
      },
      {
        "x": 4,
        "y": 4,
        "radius": 90,
        "color": "rgba(251,191,36,0.08)"
      },
      {
        "x": 10,
        "y": 4,
        "radius": 90,
        "color": "rgba(251,191,36,0.08)"
      }
    ],
    "decor": [
      {
        "tx": 4,
        "ty": 2,
        "type": "painting"
      },
      {
        "tx": 9,
        "ty": 2,
        "type": "painting"
      },
      {
        "tx": 7,
        "ty": 2,
        "type": "lamp"
      },
      {
        "tx": 3,
        "ty": 3,
        "type": "bookshelf"
      },
      {
        "tx": 10,
        "ty": 3,
        "type": "bookshelf"
      },
      {
        "tx": 7,
        "ty": 4,
        "type": "desk"
      }
    ],
    "playerStart": {
      "tx": 5,
      "ty": 7
    }
  }
};
