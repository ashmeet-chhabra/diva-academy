# Diva Academy

A pop culture trivia adventure. Walk through the Academy, challenge NPCs to trivia battles, and prove you know your stuff.

<img width="1337" height="862" alt="Screenshot 2026-06-22 101756" src="https://github.com/user-attachments/assets/d7df83cf-08f7-465e-8cc2-49046d58674e" />

## Quick Start

The game uses ES modules (`<script type="module">`), so it requires a static HTTP server — `file://` won't work in modern browsers.

**Without backend (fully offline):**

```bash
# Option A: using Node.js (if you have it installed)
npx serve diva-academy

# Option B: using Python
python -m http.server 8000 -d diva-academy

# Option C: using the built-in Express server without AI
cd diva-academy
npm install
npm start
# Open http://localhost:5000
```

**With backend (AI features enabled):**

```bash
cd diva-academy
npm install
cp .env.example .env
# Edit .env and add your Vertex AI API key
npm start
# Open http://localhost:5000
```

> Note: `npm start` serves both the game files and the AI backend endpoints from the same server. If you just want to play without AI, any static file server works.

## What's in the game

- 6 rooms to explore
- 4 NPC tiers (Starlet, Diva, DJ, Mother) with escalating difficulty
- 100 seed questions across music, film, fashion, and queer culture
- Turing Challenge — distinguish real pop culture quotes from AI-generated fakes
- Hangman and Pop Connect minigames (with look-ahead logic and an AI-grounded collaboration graph)
- Perk system with permanent upgrades
- Spotlight mechanic for bold play

## AI features (optional)

The backend uses Google Gemini via Vertex AI to generate:

- More questions (expands the pool)
- NPC dialogue (contextual banter)
- Post-game recaps
- Fake quotes for the Turing Challenge
- Pre-computed collaboration graphs (fully maps connection data via `update-collab-graph.js`)

All AI features degrade gracefully — the game works fully without them.

## Tech stack

- Vanilla HTML5 Canvas, CSS, JavaScript (no frameworks)
- Node.js/Express backend (optional)
- Google Gemini 2.5 Flash via Vertex AI REST API
- Web Audio API for procedural music

## Audio files

Place your audio files in `assets/audio/`:

| File | Used for |
|------|----------|
| `title.wav` | Title screen |
| `lobby.mp3` | Exploration |
| `battle.mp3` | Face-offs |
| `victory.mp3` | Win screen |
| `gameover.wav` | Game over |

The game falls back to procedural Web Audio if files are missing.
