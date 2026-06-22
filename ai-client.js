// ============================================================
//  DIVA ACADEMY – AI Client
//  Frontend fetch wrapper for backend AI endpoints.
//  Gracefully degrades when backend is offline.
// ============================================================

import { getConsumedTexts } from './questions.js';

export const AIClient = (() => {
  const BASE_URL = window.location.origin;
  let backendOnline = null; // null = unknown, true/false after first check

  async function checkHealth() {
    try {
      const res = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        backendOnline = data.status === 'ok';
        return backendOnline;
      }
    } catch(e) {}
    backendOnline = false;
    return false;
  }

  function isOnline() {
    return backendOnline === true;
  }

  async function generateQuestions(count = 20) {
    if (!await checkHealth()) return null;
    try {
      const consumed = getConsumedTexts();
      const res = await fetch(`${BASE_URL}/api/generate-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count, consumed })
      });
      if (!res.ok) throw new Error('Server error');
      const data = await res.json();
      return data.questions || null;
    } catch(e) {
      console.warn('AI question generation failed:', e.message);
      return null;
    }
  }

  async function generateBanter(npcName, tier, playerName, rep, defeated, room) {
    if (!await checkHealth()) return null;
    try {
      const res = await fetch(`${BASE_URL}/api/generate-banter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ npcName, tier, playerName, rep, defeated, room })
      });
      if (!res.ok) throw new Error('Server error');
      const data = await res.json();
      return data.lines || null;
    } catch(e) {
      console.warn('AI banter generation failed:', e.message);
      return null;
    }
  }

  async function generateRecap(playerName, rep, won, npcsDefeated, questionsAnswered) {
    if (!await checkHealth()) return null;
    try {
      const res = await fetch(`${BASE_URL}/api/generate-recap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName, rep, won, npcsDefeated, questionsAnswered })
      });
      if (!res.ok) throw new Error('Server error');
      const data = await res.json();
      return data.lines || null;
    } catch(e) {
      console.warn('AI recap generation failed:', e.message);
      return null;
    }
  }

  async function generateFakeQuotes(realQuotes, count) {
    if (!await checkHealth()) return null;
    try {
      const res = await fetch(`${BASE_URL}/api/generate-fake-quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ realQuotes, count })
      });
      if (!res.ok) throw new Error('Server error');
      const data = await res.json();
      return data.quotes || null;
    } catch(e) {
      console.warn('AI fake quote generation failed:', e.message);
      return null;
    }
  }

  return {
    checkHealth,
    isOnline,
    generateQuestions,
    generateBanter,
    generateRecap,
    generateFakeQuotes
  };
})();

export default AIClient;
