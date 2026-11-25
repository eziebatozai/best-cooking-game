// Entry point for Warung Rush: wires canvas, simulation loop, keyboard/mouse input, WebAudio, and renderer.

import { FIXED_STEP } from './config.js';
import { createAudioEngine } from './audio.js';
import { createInputController } from './input.js';
import { renderGame } from './render.js';
import { stageShotScene } from './shots.js';
import { createWorld, MODE_PLAYING, stepWorld } from './world.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const seedParam = Number(params.get('seed'));
const initialSeed = Number.isFinite(seedParam) && seedParam > 0 ? Math.floor(seedParam) : 1;
const shotName = params.get('shot');

const world = createWorld(initialSeed);
const audio = createAudioEngine();

let lastTransform = { scale: 1, offsetX: 0, offsetY: 0 };
const input = createInputController(canvas, world, audio, () => lastTransform);

// Expose minimal read-only inspection hook for automated play-testing without affecting gameplay
window.__WARUNG_STATE__ = () => ({
  mode: world.mode,
  elapsed: world.elapsed,
  timeLeft: world.timeLeft,
  coins: world.orders.totalCoins,
  served: world.orders.servedCount,
  orders: world.orders.orders.map((o) => ({ id: o.id, dishId: o.dishId, patience: Math.round(o.patience) })),
  player: {
    x: Math.round(world.player.x),
    y: Math.round(world.player.y),
    held: world.player.held,
    isChopping: world.player.isChopping,
  },
  stations: world.stations.map((s) => ({
    id: s.id,
    type: s.type,
    item: s.item,
    cookState: s.cookState,
    progress: Number(s.progress.toFixed(2)),
  })),
});

let lastStatusText = '';
function syncAccessibleStatus() {
  const text =
    world.mode === MODE_PLAYING
      ? `Warung Rush: ${world.orders.totalCoins} coins, ${world.orders.servedCount} dishes served, ${Math.ceil(world.timeLeft)} seconds left.`
      : `Warung Rush: ${world.mode}, score ${world.orders.totalCoins} coins.`;
  if (text !== lastStatusText && statusEl) {
    statusEl.textContent = text;
    lastStatusText = text;
  }
}

if (shotName) {
  stageShotScene(world, shotName);
  lastTransform = renderGame(ctx, canvas, world, audio);
  syncAccessibleStatus();
} else {
  // Show a lively warm kitchen behind the title screen
  stageShotScene(world, 'cover');
  world.mode = 'title';

  let lastTime = performance.now();
  let accumulator = 0;

  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    accumulator += dt;

    while (accumulator >= FIXED_STEP) {
      const moveState = input.readMoveState();
      const events = stepWorld(world, FIXED_STEP, moveState);
      const hasCooker =
        world.mode === MODE_PLAYING &&
        world.stations.some((s) => s.cookState === 'cooking');
      audio.handleWorldEvents(events, FIXED_STEP, hasCooker);
      accumulator -= FIXED_STEP;
    }

    lastTransform = renderGame(ctx, canvas, world, audio);
    syncAccessibleStatus();
    window.requestAnimationFrame(frame);
  }

  window.requestAnimationFrame(frame);
}
