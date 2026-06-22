require('dotenv').config();
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GOOGLE_API_KEY;
const MODEL_ID = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const API_ENDPOINT = 'https://aiplatform.googleapis.com';

if (!API_KEY) {
  console.error("Error: GOOGLE_API_KEY not found in .env");
  process.exit(1);
}

const minigamesPath = path.join(__dirname, 'minigames.js');
const minigamesCode = fs.readFileSync(minigamesPath, 'utf8');

// Parse artists
const graphMatch = minigamesCode.match(/const COLLAB_GRAPH = (\{[\s\S]*?\});/);
if (!graphMatch) {
  console.error("Error: Could not find COLLAB_GRAPH in minigames.js");
  process.exit(1);
}

const currentGraph = eval('(' + graphMatch[1] + ')');
const artists = Object.keys(currentGraph).sort();

console.log(`Loaded ${artists.length} artists from minigames.js.`);

const prompt = `You are a music historian and pop culture archivist.
I have a list of exactly ${artists.length} music artists:
${JSON.stringify(artists, null, 2)}

Your task is to construct a highly accurate, 100% factual collaboration graph strictly between these ${artists.length} artists.
A "collaboration" means they have worked together on an officially released track (as lead artists, featured artists, duets, or official remixes).
Do NOT include live performances, unreleased songs, or tracks where they merely both appeared on a massive charity single (like "We Are the World") unless it is a genuine collaboration.

Rules:
1. Strictly only use the ${artists.length} artists listed above.
2. The output must be a single JSON object where the keys are the artist names, and the values are arrays of other artist names from this list whom they have collaborated with.
3. The graph must be undirected and symmetric: if A collaborated with B, then B must collaborate with A.
4. If an artist has no collaborations with any of the other ${artists.length} artists in the list, their array should be empty.
5. Double check every connection to ensure it is 100% real and factual in real world music history.

Return ONLY the JSON object. No Markdown block (no \`\`\`json), no introduction, no commentary. Just raw JSON.`;

async function main() {
  console.log("Calling Gemini to generate the factual collaboration graph...");
  const url = `${API_ENDPOINT}/v1/publishers/google/models/${MODEL_ID}:generateContent?key=${API_KEY}`;
  
  const body = {
    contents: [{
      role: 'user',
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json'
    }
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Vertex AI returned ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No text returned in response");

    let graph = JSON.parse(text);

    // Filter keys and arrays to only include our listed artists
    const cleanGraph = {};
    artists.forEach(a => {
      cleanGraph[a] = [];
    });

    // Populate and filter
    Object.keys(graph).forEach(key => {
      if (cleanGraph[key]) {
        const list = Array.isArray(graph[key]) ? graph[key] : [];
        list.forEach(val => {
          if (artists.includes(val) && val !== key && !cleanGraph[key].includes(val)) {
            cleanGraph[key].push(val);
          }
        });
      }
    });

    // Symmetrize
    let additions = 0;
    artists.forEach(a => {
      cleanGraph[a].forEach(b => {
        if (!cleanGraph[b].includes(a)) {
          cleanGraph[b].push(a);
          additions++;
        }
      });
    });

    // Sort arrays for clean output
    artists.forEach(a => {
      cleanGraph[a].sort();
    });

    console.log(`Symmetrization complete. Made ${additions} directional adjustments.`);

    // Format new COLLAB_GRAPH code
    const formattedGraph = "const COLLAB_GRAPH = " + JSON.stringify(cleanGraph, null, 2) + ";";

    // Write back to minigames.js
    const newCode = minigamesCode.replace(/const COLLAB_GRAPH = \{[\s\S]*?\};/, formattedGraph);
    fs.writeFileSync(minigamesPath, newCode, 'utf8');
    console.log("Successfully updated minigames.js with the AI-grounded collaboration graph!");

  } catch (e) {
    console.error("Error during execution:", e);
  }
}

main();
