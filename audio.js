// ============================================================
//  DIVA ACADEMY – Web Audio Music Engine (Hybrid Native/WebAudio)
//  Procedural SFX via Web Audio; high-fidelity BGM via HTML5 Audio.
//  100% resilient across Safari, Chrome, and local servers.
// ============================================================

export const AudioManager = (() => {
  let ctx = null;
  let masterGain = null;
  const nodes = [];
  const tracks = {};
  let currentTrackName = null;
  let stingerTimeout = null;
  let activeFaders = [];
  let muted = false;

  function init() {
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(e => console.warn('Failed to resume AudioContext:', e));
      }
      return;
    }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.8, ctx.currentTime);
      masterGain.connect(ctx.destination);
    } catch(e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  function stopAll() {
    nodes.forEach(n => { try { n.stop(ctx.currentTime + 0.05); } catch(e){} });
    nodes.length = 0;
  }

  function fadeOut(cb) {
    if (currentTrackName && tracks[currentTrackName]) {
      fadeTrackVolume(tracks[currentTrackName], 0, 1000, () => {
        currentTrackName = null;
        if (cb) cb();
      });
    } else {
      if (cb) cb();
    }
  }

  function playSFX(type) {
    init();
    if (!ctx) return;
    const t = ctx.currentTime;

    switch(type) {
      case 'correct': {
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const env = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          env.gain.setValueAtTime(0, t + i * 0.08);
          env.gain.linearRampToValueAtTime(0.04, t + i * 0.08 + 0.02);
          env.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.2);
          osc.connect(env);
          env.connect(ctx.destination);
          osc.start(t + i * 0.08);
          osc.stop(t + i * 0.08 + 0.25);
        });
        break;
      }
      case 'wrong': {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        const lp = ctx.createBiquadFilter();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.3);
        lp.type = 'lowpass';
        lp.frequency.value = 800;
        env.gain.setValueAtTime(0.03, t);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(lp);
        lp.connect(env);
        env.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.4);
        break;
      }
      case 'interact': {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 800;
        env.gain.setValueAtTime(0.025, t);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc.connect(env);
        env.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.06);
        break;
      }
      case 'door': {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        const hp = ctx.createBiquadFilter();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(2000, t + 0.15);
        hp.type = 'highpass';
        hp.frequency.value = 500;
        env.gain.setValueAtTime(0.02, t);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(hp);
        hp.connect(env);
        env.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.25);
        break;
      }
      case 'levelup': {
        const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const env = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          env.gain.setValueAtTime(0, t + i * 0.06);
          env.gain.linearRampToValueAtTime(0.035, t + i * 0.06 + 0.02);
          env.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.4);
          osc.connect(env);
          env.connect(ctx.destination);
          osc.start(t + i * 0.06);
          osc.stop(t + i * 0.06 + 0.5);
        });
        break;
      }
    }
  }

  function fadeTrackVolume(audio, targetVolume, duration = 1000, cb) {
    if (!audio) { if (cb) cb(); return; }

    // Clear any active faders for this specific audio element
    activeFaders = activeFaders.filter(f => {
      if (f.audio === audio) { clearInterval(f.interval); return false; }
      return true;
    });

    const step = 0.01;
    const startVolume = audio.volume;
    const intervalTime = Math.max(20, Math.floor(duration / (Math.abs(targetVolume - startVolume) / step || 1)));

    if (targetVolume > 0) {
      audio.play().catch(() => {});
    }

    const interval = setInterval(() => {
      if (targetVolume > audio.volume) {
        audio.volume = Math.min(targetVolume, audio.volume + step);
      } else {
        audio.volume = Math.max(targetVolume, audio.volume - step);
      }

      if (audio.volume === targetVolume) {
        clearInterval(interval);
        activeFaders = activeFaders.filter(f => f.interval !== interval);
        if (targetVolume === 0) {
          audio.pause();
          audio.currentTime = 0;
        }
        if (cb) cb();
      }
    }, intervalTime);

    activeFaders.push({ audio, interval });
  }

  function preloadTrack(name, url) {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.loop = true;
      audio.volume = 0; // Start completely silent for faders

      let resolved = false;
      const done = () => {
        if (resolved) return;
        resolved = true;
        tracks[name] = audio;
        resolve(audio);
      };

      audio.oncanplay = done;
      audio.onloadedmetadata = done;
      audio.onerror = () => {
        console.warn(`Failed to preload track: ${name} from ${url}`);
        resolve(null);
      };
      audio.src = url;

      // Instant-resolve check: if browser already cached or loaded the metadata
      if (audio.readyState >= 2) {
        done();
      } else {
        // Fast polling check for cache hits
        const poll = setInterval(() => {
          if (audio.readyState >= 2) {
            clearInterval(poll);
            done();
          }
        }, 50);
        // Clean up polling after timeout
        setTimeout(() => {
          clearInterval(poll);
          done();
        }, 1000);
      }
    });
  }

  async function preloadTracks(trackList) {
    const promises = trackList.map(t => preloadTrack(t.name, t.url));
    await Promise.all(promises);
  }

  function playTrack(name, fadeIn = 1500, crossfade = 1000) {
    if (!tracks[name] || currentTrackName === name) return;

    init(); // Wake up Web Audio for SFX

    const oldTrackName = currentTrackName;
    currentTrackName = name;

    if (stingerTimeout) { clearTimeout(stingerTimeout); stingerTimeout = null; }

    // Crossfade: fade out the old track if playing
    if (oldTrackName && tracks[oldTrackName]) {
      fadeTrackVolume(tracks[oldTrackName], 0, crossfade);
    }

    // Fade in the new track
    const newAudio = tracks[name];
    if (newAudio) {
      newAudio.volume = 0;
      fadeTrackVolume(newAudio, 0.08, fadeIn); // Ramps up directly using comfortable 0.08 volume
    }
  }

  function stopTrack(fadeOut = 1000) {
    if (!currentTrackName || !tracks[currentTrackName]) return;
    fadeTrackVolume(tracks[currentTrackName], 0, fadeOut, () => {
      currentTrackName = null;
    });
  }

  function unlock() {
    // Gestured-play is absolutely critical to unlock modern browsers (iOS, Safari, Chrome)
    init();
    Object.keys(tracks).forEach(name => {
      const audio = tracks[name];
      if (!audio || name === currentTrackName) return; // Skip currently active playing track!
      try {
        audio.volume = 0;
        audio.play().then(() => {
          audio.pause();
          audio.currentTime = 0;
        }).catch(() => {});
      } catch(e) {}
    });
  }

  function startExploration() {
    if (muted) return;
    if (currentTrackName === 'lobby') return;
    stopAll();
    stopTrack(500);
    if (tracks['lobby']) {
      playTrack('lobby', 1500, 500);
    }
  }

  function startFaceOffTrack() {
    if (muted) return;
    stopAll();
    stopTrack(500);
    if (tracks['faceoff']) {
      playTrack('faceoff', 500, 300);
    }
  }

  function playVictory() {
    if (muted) return;
    stopTrack(300);
    if (stingerTimeout) { clearTimeout(stingerTimeout); stingerTimeout = null; }
    if (tracks['victory']) {
      playTrack('victory', 100, 300);
      stingerTimeout = setTimeout(() => { stopTrack(1000); stingerTimeout = null; }, 5000);
    }
  }

  function playGameOver() {
    if (muted) return;
    stopTrack(300);
    if (stingerTimeout) { clearTimeout(stingerTimeout); stingerTimeout = null; }
    if (tracks['gameover']) {
      playTrack('gameover', 100, 300);
      stingerTimeout = setTimeout(() => { stopTrack(1000); stingerTimeout = null; }, 5000);
    }
  }

  // ─── Mute System ──────────────────────────────────────────
  function setMuted(val) {
    muted = !!val;
    // Silence SFX via Web Audio master gain
    if (masterGain) {
      masterGain.gain.setTargetAtTime(muted ? 0 : 0.8, ctx.currentTime, 0.05);
    }
    // Silence BGM via HTML5 Audio
    Object.keys(tracks).forEach(name => {
      const audio = tracks[name];
      if (!audio) return;
      if (muted) {
        audio.volume = 0;
        audio.pause();
      }
    });
    if (muted) {
      currentTrackName = null;
    }
  }

  function isMuted() {
    return muted;
  }

  return {
    init, unlock, fadeOut, stopAll, playSFX,
    preloadTracks, playTrack, stopTrack,
    startExploration, startFaceOffTrack,
    playVictory, playGameOver,
    setMuted, isMuted
  };
})();

export default AudioManager;
