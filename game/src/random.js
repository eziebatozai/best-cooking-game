// Deterministic pseudo-random generator (Mulberry32) so simulations and staged scenes are reproducible.

export function createRng(seed = 1) {
  let state = (seed >>> 0) || 1;
  return {
    next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    pick(list) {
      return list[Math.floor(this.next() * list.length)];
    },
  };
}
