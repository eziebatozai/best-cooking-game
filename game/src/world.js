// Core game simulation state, chef movement/pathing, appliance timers, particles, and shift flow.

import { PLAYER_CONFIG, SHIFT_DURATION, TIMING } from './config.js';
import { createRng } from './random.js';
import { canChopItem, createIngredientItem, getChoppedResult } from './ingredients.js';
import {
  computeWalkPath,
  createKitchenStations,
  findNearestStation,
  interactWithStation,
  resolveChefPosition,
} from './kitchen.js';
import { createOrderManager, getWaveForElapsed, spawnOrder, stepOrders } from './orders.js';

export const MODE_TITLE = 'title';
export const MODE_PLAYING = 'playing';
export const MODE_PAUSED = 'paused';
export const MODE_ENDED = 'ended';

export function createWorld(seed = 1) {
  const world = {
    seed,
    rng: createRng(seed),
    mode: MODE_TITLE,
    elapsed: 0,
    timeLeft: SHIFT_DURATION,
    bestScore: 0,
    stations: createKitchenStations(),
    orders: createOrderManager(),
    player: {
      x: 640,
      y: 318,
      vx: 0,
      vy: 0,
      facingX: 0,
      facingY: -1,
      held: null,
      dashTimer: 0,
      dashCooldown: 0,
      walkCycle: 0,
      chopAnim: 0,
      isChopping: false,
      waypoints: [],
      pendingStationId: null,
      autoChopStationId: null,
    },
    particles: [],
    popups: [],
    events: [],
    hoveredStationId: null,
    nearestStationId: null,
    shakeTimer: 0,
    customerWavePhase: 0,
  };
  return world;
}

export function resetWorld(world, seed = world.seed) {
  const best = Math.max(world.bestScore, world.orders.totalCoins);
  const fresh = createWorld(seed);
  Object.assign(world, fresh);
  world.bestScore = best;
  world.mode = MODE_PLAYING;
  // Seed initial starter orders so the order board is immediately alive
  spawnOrder(world.orders, 0, world.rng, 'nasi_goreng');
  spawnOrder(world.orders, 0, world.rng, 'sate_ayam');
  world.orders.spawnTimer = 6.5;
  return world;
}

export function spawnParticle(world, spec) {
  if (world.particles.length > 140) world.particles.shift();
  world.particles.push({
    x: spec.x,
    y: spec.y,
    vx: spec.vx ?? 0,
    vy: spec.vy ?? -35,
    size: spec.size ?? 5,
    color: spec.color ?? '#ffffff',
    alpha: spec.alpha ?? 1,
    life: spec.life ?? 0.65,
    maxLife: spec.life ?? 0.65,
    kind: spec.kind ?? 'circle',
  });
}

export function spawnPopup(world, x, y, text, color = '#f7c531', scale = 1) {
  world.popups.push({
    x,
    y,
    text,
    color,
    scale,
    life: 1.35,
    maxLife: 1.35,
  });
}

export function setWalkTarget(world, x, y, stationId = null) {
  const { player } = world;
  player.waypoints = computeWalkPath(player.x, player.y, x, y);
  player.pendingStationId = stationId;
  player.autoChopStationId = null;
}

export function triggerDash(world) {
  const { player } = world;
  if (world.mode !== MODE_PLAYING) return false;
  if (player.dashCooldown > 0) return false;
  player.dashTimer = PLAYER_CONFIG.dashDuration;
  player.dashCooldown = PLAYER_CONFIG.dashCooldown;
  for (let i = 0; i < 6; i += 1) {
    spawnParticle(world, {
      x: player.x + (world.rng.next() - 0.5) * 14,
      y: player.y + 14,
      vx: -player.facingX * (40 + world.rng.next() * 50) + (world.rng.next() - 0.5) * 35,
      vy: -player.facingY * (40 + world.rng.next() * 50) + (world.rng.next() - 0.5) * 35,
      size: 4 + world.rng.next() * 4,
      color: '#f5e6cc',
      life: 0.35,
    });
  }
  world.events.push({ type: 'dash' });
  return true;
}

export function triggerInteract(world, explicitStation = null) {
  if (world.mode !== MODE_PLAYING) return false;
  const station = explicitStation ?? findNearestStation(world.stations, world.player);
  if (!station) return false;
  const acted = interactWithStation(world, station, true);
  if (acted && station.type === 'chop' && station.item && canChopItem(station.item)) {
    world.player.autoChopStationId = station.id;
  }
  return acted;
}

function updateStations(world, dt) {
  const { stations, events, rng } = world;
  for (const station of stations) {
    if (station.servedTimer > 0) {
      station.servedTimer = Math.max(0, station.servedTimer - dt);
      if (station.servedTimer === 0) station.servedVisual = null;
    }
    if (station.bellFlash > 0) {
      station.bellFlash = Math.max(0, station.bellFlash - dt * 2.2);
    }

    if (station.type !== 'wok' && station.type !== 'pot' && station.type !== 'grill') continue;
    if (!station.item || station.cookState === 'idle' || station.cookState === 'burnt') continue;

    const sx = station.x + station.w * 0.5;
    const sy = station.y + station.h * 0.48;

    if (station.cookState === 'cooking') {
      station.progress += dt;
      // Steam / sizzle / ember particles while cooking
      if (rng.next() < dt * 9) {
        const isGrill = station.type === 'grill';
        const isPot = station.type === 'pot';
        spawnParticle(world, {
          x: sx + (rng.next() - 0.5) * 34,
          y: sy + (rng.next() - 0.5) * 14,
          vx: (rng.next() - 0.5) * 16,
          vy: isGrill ? -32 - rng.next() * 24 : -26 - rng.next() * 20,
          size: isPot ? 5 + rng.next() * 4 : 3.5 + rng.next() * 3.5,
          color: isGrill ? (rng.next() < 0.35 ? '#ff942e' : '#e6dfd5') : '#fff8eb',
          alpha: 0.72,
          life: 0.7,
        });
      }
      if (station.progress >= station.duration) {
        station.progress = station.duration;
        station.item = createIngredientItem(station.resultId);
        station.cookState = 'done';
        station.burnTimer = 0;
        events.push({ type: 'cook_done', x: sx, y: sy, appliance: station.type, itemId: station.item.id });
      }
    } else if (station.cookState === 'done' || station.cookState === 'burning') {
      station.burnTimer += dt;
      if (station.burnTimer >= TIMING.burnWarningStart && station.cookState === 'done') {
        station.cookState = 'burning';
        events.push({ type: 'burn_warning', x: sx, y: sy });
      }
      if (rng.next() < dt * (station.cookState === 'burning' ? 11 : 5)) {
        spawnParticle(world, {
          x: sx + (rng.next() - 0.5) * 28,
          y: sy - 6,
          vx: (rng.next() - 0.5) * 18,
          vy: -34 - rng.next() * 20,
          size: station.cookState === 'burning' ? 6.5 : 4.5,
          color: station.cookState === 'burning' ? '#4a403a' : '#fff5d9',
          alpha: 0.75,
          life: 0.8,
        });
      }
      if (station.burnTimer >= TIMING.burnGraceDuration) {
        station.item = createIngredientItem('burnt');
        station.cookState = 'burnt';
        world.shakeTimer = 0.22;
        events.push({ type: 'food_burnt', x: sx, y: sy });
      }
    }
  }
}

function updateChefMovement(world, dt, inputState) {
  const { player, stations } = world;
  let moveX = inputState.moveX;
  let moveY = inputState.moveY;

  // Manual keyboard movement cancels click-to-walk pathing
  if (Math.abs(moveX) > 0.01 || Math.abs(moveY) > 0.01) {
    player.waypoints = [];
    player.pendingStationId = null;
    player.autoChopStationId = null;
  } else if (player.waypoints.length > 0) {
    const wp = player.waypoints[0];
    const dx = wp.x - player.x;
    const dy = wp.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 8) {
      player.x = wp.x;
      player.y = wp.y;
      player.waypoints.shift();
      if (player.waypoints.length === 0 && player.pendingStationId) {
        const targetStation = stations.find((s) => s.id === player.pendingStationId);
        player.pendingStationId = null;
        if (targetStation) {
          player.facingX = targetStation.facingX;
          player.facingY = targetStation.facingY;
          triggerInteract(world, targetStation);
        }
      }
    } else {
      moveX = dx / dist;
      moveY = dy / dist;
    }
  }

  if (player.dashTimer > 0) player.dashTimer = Math.max(0, player.dashTimer - dt);
  if (player.dashCooldown > 0) player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  if (player.chopAnim > 0) player.chopAnim = Math.max(0, player.chopAnim - dt);

  const mag = Math.hypot(moveX, moveY);
  if (mag > 0.01) {
    const nx = moveX / mag;
    const ny = moveY / mag;
    player.facingX = nx;
    player.facingY = ny;
    const speed = player.dashTimer > 0 ? PLAYER_CONFIG.dashSpeed : PLAYER_CONFIG.speed;
    player.vx = nx * speed;
    player.vy = ny * speed;
    const nextPos = resolveChefPosition(player.x + player.vx * dt, player.y + player.vy * dt);
    player.x = nextPos.x;
    player.y = nextPos.y;
    player.walkCycle += dt * (player.dashTimer > 0 ? 18 : 11);
  } else {
    player.vx = 0;
    player.vy = 0;
  }

  const nearest = findNearestStation(stations, player);
  world.nearestStationId = nearest ? nearest.id : null;

  // Continuous chopping while holding Space/E OR after clicking a chopping board with food on it
  player.isChopping = false;
  let chopStation = null;
  if (inputState.interactHeld && nearest && nearest.type === 'chop' && nearest.item && canChopItem(nearest.item)) {
    chopStation = nearest;
  } else if (player.autoChopStationId) {
    const st = stations.find((s) => s.id === player.autoChopStationId);
    if (st && st.item && canChopItem(st.item) && Math.hypot(st.standX - player.x, st.standY - player.y) < 42) {
      chopStation = st;
    } else {
      player.autoChopStationId = null;
    }
  }

  if (chopStation) {
    player.isChopping = true;
    player.facingX = chopStation.facingX;
    player.facingY = chopStation.facingY;
    const prevTick = Math.floor(chopStation.progress * 5);
    chopStation.progress += dt;
    const nextTick = Math.floor(chopStation.progress * 5);
    if (nextTick > prevTick) {
      player.chopAnim = 0.16;
      world.events.push({
        type: 'chop_hit',
        x: chopStation.x + chopStation.w * 0.5,
        y: chopStation.y + chopStation.h * 0.45,
        itemId: chopStation.item.id,
      });
    }
    if (chopStation.progress >= chopStation.duration) {
      chopStation.item = getChoppedResult(chopStation.item);
      chopStation.progress = 0;
      chopStation.duration = 0;
      player.autoChopStationId = null;
      world.events.push({
        type: 'chop_done',
        x: chopStation.x + chopStation.w * 0.5,
        y: chopStation.y + chopStation.h * 0.45,
        itemId: chopStation.item.id,
      });
    }
  }
}

function handleVisualEvents(world) {
  const { events, rng } = world;
  for (const ev of events) {
    if (ev.type === 'chop_hit') {
      const bitColor = ev.itemId === 'chicken' ? '#f2b8a6' : '#5bc44d';
      for (let i = 0; i < 4; i += 1) {
        spawnParticle(world, {
          x: ev.x + (rng.next() - 0.5) * 16,
          y: ev.y,
          vx: (rng.next() - 0.5) * 90,
          vy: -45 - rng.next() * 55,
          size: 3.5,
          color: i === 0 && ev.itemId === 'veggies' ? '#e34234' : bitColor,
          life: 0.35,
        });
      }
    } else if (ev.type === 'chop_done') {
      spawnPopup(world, ev.x, ev.y - 26, 'CHOPPED!', '#6ae07f', 0.9);
    } else if (ev.type === 'cook_done') {
      spawnPopup(world, ev.x, ev.y - 28, 'READY!', '#ffd54f', 0.95);
      for (let i = 0; i < 8; i += 1) {
        const ang = (i / 8) * Math.PI * 2;
        spawnParticle(world, {
          x: ev.x,
          y: ev.y,
          vx: Math.cos(ang) * 65,
          vy: Math.sin(ang) * 55 - 15,
          size: 4,
          color: '#ffdf6b',
          life: 0.48,
        });
      }
    } else if (ev.type === 'dish_complete') {
      spawnPopup(world, ev.x, ev.y - 28, 'PLATED!', '#6ef28c', 1.0);
    } else if (ev.type === 'order_served') {
      const tipStr = ev.tip > 0 ? ` (+${ev.tip} TIP)` : '';
      spawnPopup(world, ev.x, ev.y - 24, `+${ev.totalEarned}${tipStr}`, '#ffe052', 1.2);
      for (let i = 0; i < 14; i += 1) {
        const ang = (i / 14) * Math.PI * 2;
        spawnParticle(world, {
          x: ev.x,
          y: ev.y,
          vx: Math.cos(ang) * (60 + rng.next() * 60),
          vy: Math.sin(ang) * (50 + rng.next() * 50) - 35,
          size: 4.5,
          color: i % 2 === 0 ? '#ffd53d' : '#fff3b0',
          life: 0.65,
        });
      }
    } else if (ev.type === 'order_expired') {
      spawnPopup(world, 340, 146, `MISSED -${ev.penalty}`, '#ff6b57', 1.05);
      world.shakeTimer = 0.2;
    } else if (ev.type === 'food_burnt') {
      spawnPopup(world, ev.x, ev.y - 28, 'BURNT!', '#ff624d', 1.05);
    } else if (ev.type === 'wrong_dish') {
      spawnPopup(world, ev.x, ev.y - 24, 'NO ORDER!', '#ff8c69', 0.95);
    }
  }
}

export function stepWorld(world, dt, inputState = { moveX: 0, moveY: 0, interactHeld: false }) {
  world.events = [];
  world.customerWavePhase += dt;

  if (world.shakeTimer > 0) {
    world.shakeTimer = Math.max(0, world.shakeTimer - dt);
  }

  // Update floating particles & popups even on end/title transitions
  for (let i = world.particles.length - 1; i >= 0; i -= 1) {
    const p = world.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) world.particles.splice(i, 1);
  }
  for (let i = world.popups.length - 1; i >= 0; i -= 1) {
    const pop = world.popups[i];
    pop.y -= 34 * dt;
    pop.life -= dt;
    if (pop.life <= 0) world.popups.splice(i, 1);
  }

  if (world.mode !== MODE_PLAYING) {
    return world.events;
  }

  world.elapsed += dt;
  world.timeLeft = Math.max(0, SHIFT_DURATION - world.elapsed);

  updateChefMovement(world, dt, inputState);
  updateStations(world, dt);
  stepOrders(world.orders, dt, world.elapsed, world.rng, world.events);
  handleVisualEvents(world);

  if (world.timeLeft <= 0) {
    world.mode = MODE_ENDED;
    world.bestScore = Math.max(world.bestScore, world.orders.totalCoins);
    world.events.push({ type: 'shift_end', score: world.orders.totalCoins });
  }

  return world.events;
}

export function getCurrentWave(world) {
  return getWaveForElapsed(world.elapsed);
}
