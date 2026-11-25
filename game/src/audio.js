// Procedural WebAudio synthesizer for Warung Rush (chop, sizzle, ding, coin, burn, gamelan finish).

export function createAudioEngine() {
  let ctx = null;
  let noiseBuffer = null;
  let muted = false;
  let sizzleCooldown = 0;

  function ensureContext() {
    if (muted) return null;
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!ctx) {
      try {
        ctx = new AudioCtx();
      } catch {
        return null;
      }
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    if (!noiseBuffer && ctx) {
      const len = Math.floor(ctx.sampleRate * 0.45);
      noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    return ctx;
  }

  function playTone(freq, duration, type = 'sine', volume = 0.14, delay = 0, endFreq = null) {
    const audio = ensureContext();
    if (!audio) return;
    const now = audio.currentTime + delay;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function playNoise(duration, filterFreq, q, volume = 0.12, delay = 0) {
    const audio = ensureContext();
    if (!audio || !noiseBuffer) return;
    const now = audio.currentTime + delay;
    const src = audio.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = audio.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFreq, now);
    filter.Q.setValueAtTime(q, now);
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(audio.destination);
    src.start(now);
    src.stop(now + duration + 0.02);
  }

  return {
    get muted() {
      return muted;
    },
    unlock() {
      ensureContext();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    playChop() {
      playTone(230, 0.065, 'triangle', 0.16, 0, 95);
      playNoise(0.055, 1900, 1.8, 0.13, 0);
    },
    playSizzle() {
      playNoise(0.28, 3600, 0.9, 0.10, 0);
      playNoise(0.22, 5400, 1.4, 0.06, 0.05);
    },
    playDing() {
      playTone(1046.5, 0.42, 'sine', 0.15, 0);
      playTone(2093.0, 0.28, 'sine', 0.07, 0);
      playTone(1568.0, 0.22, 'triangle', 0.05, 0.01);
    },
    playCoin() {
      playTone(880, 0.12, 'sine', 0.14, 0);
      playTone(1318.5, 0.22, 'sine', 0.16, 0.075);
      playTone(1760, 0.26, 'triangle', 0.09, 0.15);
    },
    playPickup() {
      playTone(420, 0.07, 'triangle', 0.10, 0, 580);
    },
    playPlace() {
      playTone(300, 0.07, 'triangle', 0.10, 0, 210);
    },
    playWarning() {
      playTone(620, 0.09, 'square', 0.06, 0);
      playTone(620, 0.09, 'square', 0.06, 0.13);
    },
    playBurn() {
      playNoise(0.32, 950, 0.8, 0.14, 0);
      playTone(165, 0.26, 'sawtooth', 0.08, 0, 82);
    },
    playTrash() {
      playTone(190, 0.11, 'sine', 0.11, 0, 110);
      playNoise(0.09, 800, 1.2, 0.08, 0);
    },
    playDash() {
      playNoise(0.11, 1400, 0.9, 0.07, 0);
    },
    playShiftEnd() {
      // Warm Indonesian pentatonic (slendro-inspired) closing chime
      const notes = [523.25, 587.33, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        playTone(freq, 0.52, 'sine', 0.13, idx * 0.11);
        playTone(freq * 2, 0.25, 'triangle', 0.04, idx * 0.11);
      });
    },
    handleWorldEvents(events, dt, hasActiveCooker) {
      if (sizzleCooldown > 0) sizzleCooldown = Math.max(0, sizzleCooldown - dt);
      if (hasActiveCooker && sizzleCooldown <= 0) {
        this.playSizzle();
        sizzleCooldown = 0.55;
      }
      for (const ev of events) {
        switch (ev.type) {
          case 'chop_hit':
            this.playChop();
            break;
          case 'chop_done':
            this.playDing();
            break;
          case 'cook_start':
            this.playSizzle();
            break;
          case 'cook_done':
          case 'dish_complete':
            this.playDing();
            break;
          case 'order_served':
            this.playCoin();
            break;
          case 'pickup':
            this.playPickup();
            break;
          case 'place':
          case 'plate_add':
            this.playPlace();
            break;
          case 'burn_warning':
          case 'wrong_dish':
          case 'order_expired':
            this.playWarning();
            break;
          case 'food_burnt':
            this.playBurn();
            break;
          case 'trash':
            this.playTrash();
            break;
          case 'dash':
            this.playDash();
            break;
          case 'shift_end':
            this.playShiftEnd();
            break;
          default:
            break;
        }
      }
    },
  };
}
