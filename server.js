require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ──────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

// ─── Vertex AI Config ───────────────────────────────────────
const API_KEY = process.env.GOOGLE_API_KEY;
const MODEL_ID = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const API_ENDPOINT = 'https://aiplatform.googleapis.com';

async function callGemini(prompt, maxRetries = 2) {
  if (!API_KEY) {
    throw new Error('GOOGLE_API_KEY not configured');
  }

  const url = `${API_ENDPOINT}/v1/publishers/google/models/${MODEL_ID}:generateContent?key=${API_KEY}`;

  const body = {
    contents: [{
      role: 'user',
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json'
    }
  };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`Vertex AI error (${res.status}):`, errText);
        if (attempt < maxRetries) continue;
        throw new Error(`Vertex AI returned ${res.status}`);
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('No text in response');

      return JSON.parse(text);
    } catch (e) {
      if (attempt < maxRetries) continue;
      throw e;
    }
  }
}

// ─── API Endpoints ──────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', hasApiKey: !!API_KEY, model: MODEL_ID });
});

// Generate questions
app.post('/api/generate-questions', async (req, res) => {
  try {
    const { count = 20, consumed = [] } = req.body;

    const consumedBlock = consumed.length > 0
      ? `\n\nAVOID these existing question topics (do NOT repeat or closely paraphrase any of these):\n${consumed.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
      : '';

    const prompt = `Generate exactly ${count} pop culture trivia questions about LGBTQ+ icons, queer history in pop culture, iconic divas, and pop music/film moments important to queer culture.

Each question MUST be factual and verifiable. Do NOT invent fake facts.

Return a JSON array with this exact format:
[
  {
    "q": "Question text here?",
    "choices": ["Wrong answer", "Correct answer", "Wrong answer", "Wrong answer"],
    "answer": 1,
    "cat": "music"
  }
]

Rules:
- answer (0-3) must point to the CORRECT choice
- choices array must have exactly 4 items
- All 4 choices must be distinct — no duplicate options
- cat must be one of: "music", "film", "fashion", "trivia"
- Questions should be about REAL people, REAL events, and VERIFIED facts
- music: songs, albums, artists, tours, music history
- film: movies, TV shows, actors, directors
- fashion: iconic looks, designers, red carpet moments
- trivia: queer culture, ballroom, pride history, LGBTQ+ milestones
- Vary difficulty: some easy, some medium, some hard
- Mix categories: roughly equal distribution across the 4 categories
- Questions must be in English only${consumedBlock}

Return ONLY the JSON array, no other text.`;

    const questions = await callGemini(prompt);

    if (!Array.isArray(questions)) {
      throw new Error('Response is not an array');
    }

    // Validate each question
    const valid = questions.filter(q => {
      if (!q.q || typeof q.q !== 'string') return false;
      if (!Array.isArray(q.choices) || q.choices.length !== 4) return false;
      if (typeof q.answer !== 'number' || q.answer < 0 || q.answer > 3) return false;
      if (!['music', 'film', 'fashion', 'trivia'].includes(q.cat)) return false;
      // Check for duplicate choices
      const normalized = q.choices.map(c => c.trim().toLowerCase());
      if (new Set(normalized).size !== 4) return false;
      return true;
    });

    res.json({ questions: valid, total: valid.length });
  } catch (e) {
    console.error('Question generation error:', e.message);
    res.status(500).json({ error: e.message, questions: [] });
  }
});

// Generate NPC banter
app.post('/api/generate-banter', async (req, res) => {
  try {
    const { npcName, tier, playerName, rep, defeated = [], room } = req.body;

    const prompt = `Write 3 short dialogue lines for a pop culture trivia game NPC.

Character: ${npcName} (tier: ${tier})
Player: ${playerName} (REP: ${rep})
Room: ${room}
Player has defeated: ${defeated.length > 0 ? defeated.join(', ') : 'nobody yet'}

The NPC should be:
- Confident, pop-culture-literate, competitive but not over-the-top
- Reference their tier level (${tier}) in personality
- If player has high REP (>150), acknowledge they're good but still challenge them
- If player has low REP (<80), be encouraging but slightly condescending
- If player has defeated someone, reference it

Tone: Fun, competitive, campy when it fits — but never dramatic or self-important. Think trash-talk between friends at a trivia night, not a movie trailer.

Return a JSON array of exactly 3 strings (dialogue lines):
["line1", "line2", "line3"]

Each line should be 1-2 sentences. No emojis. English only.`;

    const lines = await callGemini(prompt);

    if (!Array.isArray(lines) || lines.length < 2) {
      throw new Error('Invalid banter response');
    }

    res.json({ lines: lines.slice(0, 3) });
  } catch (e) {
    console.error('Banter generation error:', e.message);
    res.status(500).json({ error: e.message, lines: null });
  }
});

// Generate run recap
app.post('/api/generate-recap', async (req, res) => {
  try {
    const { playerName, rep, won, npcsDefeated = 0, questionsAnswered = 0 } = req.body;

    const prompt = `Write a 3-line post-game recap for a pop culture trivia game.

Player: ${playerName}
Result: ${won ? 'WON' : 'LOST'} (REP: ${rep})
NPCs defeated: ${npcsDefeated}
Questions answered: ${questionsAnswered}

Write exactly 3 lines:
- Line 1: Brief reaction to the result
- Line 2: Observation about their performance (reference stats if relevant)
- Line 3: Closing thought (encouraging if lost, matter-of-fact if won)

Tone: Honest, straightforward, a little fun. Avoid being dramatic or over-the-top. No "crown", "icon", "legend", "transcended", or similar grandiose language. Think a friend commenting on your game, not a narrator in an epic movie. No emojis. English only.

Return a JSON array of exactly 3 strings:
["line1", "line2", "line3"]`;

    const lines = await callGemini(prompt);

    if (!Array.isArray(lines) || lines.length < 3) {
      throw new Error('Invalid recap response');
    }

    res.json({ lines: lines.slice(0, 3) });
  } catch (e) {
    console.error('Recap generation error:', e.message);
    res.status(500).json({ error: e.message, lines: null });
  }
});

// ─── Fake Quote Generation (Turing Challenge) ───────────────
app.post('/api/generate-fake-quotes', async (req, res) => {
  if (!API_KEY) return res.status(503).json({ error: 'No API key configured', quotes: [] });
  const { realQuotes = [], count = 5 } = req.body;
  const prompt = `You are a pop culture trivia designer. Generate exactly ${count} fake pop culture quotes.
To guarantee that these quotes are not accidentally real, you must base them on the existing real quotes provided below.

For each fake quote:
1. Select one of the real quotes from the list below.
2. Modify a significant portion of it (change key nouns, adjectives, verbs, or the context) so that it completely changes the meaning.
3. Make the result sound slightly questionable or campy, but still plausible enough to fool someone (not too absurd or obviously robotic).
4. Keep them short (under 20 words).

Here is the list of real quotes to modify:
${realQuotes.slice(0, 30).map((q, idx) => `${idx + 1}. "${q}"`).join('\n')}

Return a JSON array of objects, where each object has a "text" field containing the fake quote. Example:
[
  {"text": "Modified fake quote here"},
  {"text": "Another modified fake quote"}
]

Return ONLY the raw JSON array. No markdown blocks, no formatting wrappers (like \`\`\`json), no introduction, and no explanations.`;

  try {
    const quotes = await callGemini(prompt);
    if (!Array.isArray(quotes)) {
      throw new Error('Response is not an array');
    }
    const valid = quotes.filter(q => q.text && typeof q.text === 'string' && q.text.length > 10 && q.text.length < 200);
    res.json({ quotes: valid.slice(0, count) });
  } catch (e) {
    console.error('Fake quote generation error:', e.message);
    res.status(500).json({ error: e.message, quotes: [] });
  }
});

// ─── Start Server ───────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Diva Academy server running on http://localhost:${PORT}`);
  console.log(`API key configured: ${!!API_KEY}`);
  console.log(`Model: ${MODEL_ID}`);
});
