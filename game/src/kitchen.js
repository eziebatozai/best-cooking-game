// Kitchen station layout, collision geometry, waypoint pathing, and station interactions.

import { KITCHEN_BOUNDS, PLAYER_CONFIG, TIMING } from './config.js';
import {
  canChopItem,
  canCookAtAppliance,
  createIngredientItem,
  createPlateItem,
  getChoppedResult,
  getCookedResultId,
  isPlateableIngredient,
} from './ingredients.js';
import { canAddToPlate, getRecipe, matchCompletedRecipe } from './recipes.js';
import { serveDishOrder } from './orders.js';

export const ISLAND_OBSTACLE = {
  x: 428,
  y: 374,
  w: 424,
  h: 82,
};

function makeStation(spec) {
  return {
    id: spec.id,
    type: spec.type,
    label: spec.label,
    x: spec.x,
    y: spec.y,
    w: spec.w,
    h: spec.h,
    standX: spec.standX,
    standY: spec.standY,
    facingX: spec.facingX ?? 0,
    facingY: spec.facingY ?? -1,
    itemId: spec.itemId ?? null,
    item: spec.item ?? null,
    // Active process state (chopping or cooking)
    progress: 0,
    duration: 0,
    cookState: 'idle', // idle | cooking | done | burning | burnt
    burnTimer: 0,
    resultId: null,
    // Serving window recent dish showcase
    servedVisual: null,
    servedTimer: 0,
    bellFlash: 0,
  };
}

export function createKitchenStations() {
  return [
    // Top Counter Row: Serving Windows, Plating Counters, and Pass Counter
    makeStation({
      id: 'serve_1', type: 'serve', label: 'SERVE WINDOW',
      x: 166, y: 158, w: 138, h: 86, standX: 235, standY: 274, facingX: 0, facingY: -1,
    }),
    makeStation({
      id: 'serve_2', type: 'serve', label: 'SERVE WINDOW',
      x: 312, y: 158, w: 138, h: 86, standX: 381, standY: 274, facingX: 0, facingY: -1,
    }),
    makeStation({
      id: 'plate_1', type: 'plate', label: 'PLATING 1',
      x: 468, y: 158, w: 146, h: 86, standX: 541, standY: 274, facingX: 0, facingY: -1,
      item: createPlateItem(),
    }),
    makeStation({
      id: 'plate_2', type: 'plate', label: 'PLATING 2',
      x: 622, y: 158, w: 146, h: 86, standX: 695, standY: 274, facingX: 0, facingY: -1,
      item: createPlateItem(),
    }),
    makeStation({
      id: 'plate_3', type: 'plate', label: 'PLATING 3',
      x: 776, y: 158, w: 146, h: 86, standX: 849, standY: 274, facingX: 0, facingY: -1,
      item: createPlateItem(),
    }),
    makeStation({
      id: 'counter_top', type: 'counter', label: 'PASS COUNTER',
      x: 930, y: 158, w: 152, h: 86, standX: 1006, standY: 274, facingX: 0, facingY: -1,
    }),

    // Left Counter Column: Fresh Ingredient Crates
    makeStation({
      id: 'crate_rice', type: 'crate', label: 'RICE', itemId: 'rice',
      x: 36, y: 164, w: 112, h: 88, standX: 184, standY: 274, facingX: -1, facingY: 0,
    }),
    makeStation({
      id: 'crate_noodles', type: 'crate', label: 'NOODLES', itemId: 'noodles',
      x: 36, y: 262, w: 112, h: 88, standX: 184, standY: 306, facingX: -1, facingY: 0,
    }),
    makeStation({
      id: 'crate_chicken', type: 'crate', label: 'CHICKEN', itemId: 'chicken',
      x: 36, y: 360, w: 112, h: 88, standX: 184, standY: 404, facingX: -1, facingY: 0,
    }),
    makeStation({
      id: 'crate_veggies', type: 'crate', label: 'VEGGIES', itemId: 'veggies',
      x: 36, y: 458, w: 112, h: 88, standX: 184, standY: 502, facingX: -1, facingY: 0,
    }),
    makeStation({
      id: 'crate_egg', type: 'crate', label: 'EGGS', itemId: 'egg',
      x: 36, y: 556, w: 112, h: 88, standX: 184, standY: 554, facingX: -1, facingY: 0,
    }),

    // Center Work Island: Two Chopping Boards + Ingredient Counter
    makeStation({
      id: 'chop_1', type: 'chop', label: 'CHOP BOARD',
      x: 428, y: 374, w: 136, h: 82, standX: 496, standY: 344, facingX: 0, facingY: 1,
    }),
    makeStation({
      id: 'island_counter', type: 'counter', label: 'PREP COUNTER',
      x: 572, y: 374, w: 136, h: 82, standX: 640, standY: 344, facingX: 0, facingY: 1,
    }),
    makeStation({
      id: 'chop_2', type: 'chop', label: 'CHOP BOARD',
      x: 716, y: 374, w: 136, h: 82, standX: 784, standY: 344, facingX: 0, facingY: 1,
    }),

    // Right Counter Column: Woks, Broth Pot, and Charcoal Sate Grill
    makeStation({
      id: 'wok_1', type: 'wok', label: 'WOK 1',
      x: 1122, y: 168, w: 122, h: 110, standX: 1084, standY: 274, facingX: 1, facingY: 0,
    }),
    makeStation({
      id: 'wok_2', type: 'wok', label: 'WOK 2',
      x: 1122, y: 288, w: 122, h: 110, standX: 1084, standY: 343, facingX: 1, facingY: 0,
    }),
    makeStation({
      id: 'pot_1', type: 'pot', label: 'BROTH POT',
      x: 1122, y: 408, w: 122, h: 110, standX: 1084, standY: 463, facingX: 1, facingY: 0,
    }),
    makeStation({
      id: 'grill_1', type: 'grill', label: 'SATE GRILL',
      x: 1122, y: 528, w: 122, h: 110, standX: 1084, standY: 554, facingX: 1, facingY: 0,
    }),

    // Bottom Counter Row: Condiments, Ingredient Counters, and Trash
    makeStation({
      id: 'sauce_peanut', type: 'condiment', label: 'PEANUT SAUCE', itemId: 'peanut_sauce',
      x: 196, y: 584, w: 146, h: 82, standX: 269, standY: 554, facingX: 0, facingY: 1,
    }),
    makeStation({
      id: 'sauce_sambal', type: 'condiment', label: 'SAMBAL', itemId: 'sambal',
      x: 354, y: 584, w: 146, h: 82, standX: 427, standY: 554, facingX: 0, facingY: 1,
    }),
    makeStation({
      id: 'counter_bot_1', type: 'counter', label: 'COUNTER',
      x: 512, y: 584, w: 146, h: 82, standX: 585, standY: 554, facingX: 0, facingY: 1,
    }),
    makeStation({
      id: 'counter_bot_2', type: 'counter', label: 'COUNTER',
      x: 670, y: 584, w: 146, h: 82, standX: 743, standY: 554, facingX: 0, facingY: 1,
    }),
    makeStation({
      id: 'trash_1', type: 'trash', label: 'TRASH',
      x: 848, y: 584, w: 132, h: 82, standX: 914, standY: 554, facingX: 0, facingY: 1,
    }),
  ];
}

export function getStationById(stations, id) {
  return stations.find((s) => s.id === id) ?? null;
}

export function findStationAtPoint(stations, px, py) {
  for (const station of stations) {
    if (px >= station.x && px <= station.x + station.w && py >= station.y && py <= station.y + station.h) {
      return station;
    }
  }
  return null;
}

/**
 * Resolves circle-vs-bounds and circle-vs-island collisions so the chef glides smoothly along counters.
 */
export function resolveChefPosition(x, y) {
  const r = PLAYER_CONFIG.radius;
  let nx = Math.max(KITCHEN_BOUNDS.left + r, Math.min(KITCHEN_BOUNDS.right - r, x));
  let ny = Math.max(KITCHEN_BOUNDS.top + r, Math.min(KITCHEN_BOUNDS.bottom - r, y));

  const obs = ISLAND_OBSTACLE;
  const closestX = Math.max(obs.x, Math.min(obs.x + obs.w, nx));
  const closestY = Math.max(obs.y, Math.min(obs.y + obs.h, ny));
  const dx = nx - closestX;
  const dy = ny - closestY;
  const distSq = dx * dx + dy * dy;
  if (distSq < r * r) {
    const dist = Math.sqrt(distSq);
    if (dist > 0.001) {
      const push = r - dist;
      nx += (dx / dist) * push;
      ny += (dy / dist) * push;
    } else {
      // Deep inside island: push out vertically to nearest lane
      ny = ny < obs.y + obs.h / 2 ? obs.y - r : obs.y + obs.h + r;
    }
  }
  return { x: nx, y: ny };
}

/**
 * Computes a short obstacle-avoiding path from (sx, sy) to (tx, ty) around the central prep island.
 */
export function computeWalkPath(sx, sy, tx, ty) {
  const target = resolveChefPosition(tx, ty);
  const obs = ISLAND_OBSTACLE;
  const pad = PLAYER_CONFIG.radius + 10;
  const minX = obs.x - pad;
  const maxX = obs.x + obs.w + pad;
  const minY = obs.y - pad;
  const maxY = obs.y + obs.h + pad;

  // Helper: check if axis-aligned bounding box of segment overlaps inflated island
  const segMinX = Math.min(sx, target.x);
  const segMaxX = Math.max(sx, target.x);
  const segMinY = Math.min(sy, target.y);
  const segMaxY = Math.max(sy, target.y);
  const overlapsX = segMaxX > minX && segMinX < maxX;
  const overlapsY = segMaxY > minY && segMinY < maxY;

  if (!overlapsX || !overlapsY) {
    return [target];
  }

  // Case 1: crossing vertically from top lane to bottom lane (or vice versa)
  const crossesVertically =
    (sy <= minY && target.y >= maxY) || (sy >= maxY && target.y <= minY);
  if (crossesVertically) {
    const leftX = minX - 16;
    const rightX = maxX + 16;
    const leftCost = Math.abs(sx - leftX) + Math.abs(target.x - leftX);
    const rightCost = Math.abs(sx - rightX) + Math.abs(target.x - rightX);
    const detourX = leftCost <= rightCost ? leftX : rightX;
    const midY = (minY + maxY) * 0.5;
    return [
      resolveChefPosition(detourX, sy < midY ? minY - 6 : maxY + 6),
      resolveChefPosition(detourX, target.y < midY ? minY - 6 : maxY + 6),
      target,
    ];
  }

  // Case 2: entering top/bottom lane from left/right side corridor (avoid brushing island corner)
  const midY = (minY + maxY) * 0.5;
  const laneY = target.y < midY ? minY - 6 : maxY + 6;
  if ((sx <= minX || sx >= maxX) && sy > minY && sy < maxY) {
    return [resolveChefPosition(sx, laneY), target];
  }
  if ((target.x <= minX || target.x >= maxX) && target.y > minY && target.y < maxY) {
    return [resolveChefPosition(target.x, sy < midY ? minY - 6 : maxY + 6), target];
  }

  return [target];
}

/**
 * Finds the best reachable station near the chef, favoring the direction the chef faces.
 */
export function findNearestStation(stations, player) {
  const reach = PLAYER_CONFIG.interactRadius;
  let best = null;
  let bestScore = Infinity;

  for (const station of stations) {
    const cx = Math.max(station.x, Math.min(station.x + station.w, player.x));
    const cy = Math.max(station.y, Math.min(station.y + station.h, player.y));
    const dx = cx - player.x;
    const dy = cy - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist > reach) continue;

    // Small preference for stations in front of the chef's facing direction
    const len = dist || 1;
    const dot = (dx / len) * player.facingX + (dy / len) * player.facingY;
    const score = dist - dot * 18;
    if (score < bestScore) {
      bestScore = score;
      best = station;
    }
  }
  return best;
}

/**
 * Returns a short, player-friendly action prompt for hovering or standing near a station.
 */
export function getStationActionHint(station, heldItem) {
  if (!station) return '';
  switch (station.type) {
    case 'crate':
    case 'condiment':
      if (!heldItem) return `Grab ${station.label}`;
      if (heldItem.kind === 'plate' && !heldItem.dishId && canAddToPlate(heldItem.components, station.itemId)) {
        return `Add ${station.label} to Plate`;
      }
      return 'Hands Full';
    case 'chop':
      if (station.item && canChopItem(station.item)) return 'Chop (Hold / Tap Space)';
      if (station.item && !heldItem) return 'Pick Up Chopped';
      if (!station.item && heldItem && canChopItem(heldItem)) return 'Place to Chop';
      return 'Chopping Board';
    case 'wok':
    case 'pot':
    case 'grill':
      if (station.item) {
        if (station.cookState === 'cooking') return 'Cooking...';
        if (station.cookState === 'burnt') return !heldItem ? 'Remove Burnt' : 'Hands Full';
        if (heldItem && heldItem.kind === 'plate' && !heldItem.dishId && canAddToPlate(heldItem.components, station.item.id)) {
          return 'Scoop onto Plate';
        }
        return !heldItem ? 'Take Cooked Food' : 'Hands Full';
      }
      if (heldItem && canCookAtAppliance(heldItem, station.type)) return `Cook at ${station.label}`;
      return station.label;
    case 'plate': {
      const plate = station.item;
      if (plate && plate.kind === 'plate') {
        if (plate.dishId) return !heldItem ? `Pick Up ${getRecipe(plate.dishId)?.name ?? 'Dish'}` : 'Ready to Serve!';
        if (heldItem && isPlateableIngredient(heldItem) && canAddToPlate(plate.components, heldItem.id)) {
          return 'Add to Plate';
        }
        if (!heldItem && plate.components.length > 0) return 'Pick Up Plate';
      }
      if (!plate && heldItem && heldItem.kind === 'plate') return 'Set Plate Down';
      return 'Plating Station';
    }
    case 'counter':
      if (!station.item && heldItem) return 'Place on Counter';
      if (station.item && !heldItem) return 'Pick Up';
      if (station.item && station.item.kind === 'plate' && !station.item.dishId && heldItem && isPlateableIngredient(heldItem) && canAddToPlate(station.item.components, heldItem.id)) {
        return 'Add to Plate';
      }
      return 'Counter';
    case 'serve':
      if (heldItem && heldItem.kind === 'plate' && heldItem.dishId) {
        return `Serve ${getRecipe(heldItem.dishId)?.name ?? 'Dish'}!`;
      }
      return 'Serve Plated Dishes';
    case 'trash':
      return heldItem ? 'Discard Item' : 'Trash Bin';
    default:
      return station.label;
  }
}

function addComponentToPlate(plate, ingredientId) {
  if (!canAddToPlate(plate.components, ingredientId)) return false;
  plate.components.push(ingredientId);
  const done = matchCompletedRecipe(plate.components);
  if (done) {
    plate.dishId = done.id;
  }
  return true;
}

function getCookDuration(applianceType) {
  if (applianceType === 'grill') return TIMING.grillCookDuration;
  if (applianceType === 'pot') return TIMING.potCookDuration;
  return TIMING.wokCookDuration;
}

/**
 * Executes a single player interaction with `station`, updating chef held item, station state,
 * orders, and returning event records for audio and particles.
 */
export function interactWithStation(world, station, isTap = true) {
  if (!station) return false;
  const { player, orders, events } = world;
  const held = player.held;
  const sx = station.x + station.w * 0.5;
  const sy = station.y + station.h * 0.5;

  // Crate or Condiment Jar
  if (station.type === 'crate' || station.type === 'condiment') {
    if (!held) {
      player.held = createIngredientItem(station.itemId);
      events.push({ type: 'pickup', x: sx, y: sy, itemId: station.itemId });
      return true;
    }
    // Quick convenience: dip a mid-assembly plate directly into Rice/Peanut/Sambal!
    if (held.kind === 'plate' && !held.dishId && addComponentToPlate(held, station.itemId)) {
      events.push({ type: held.dishId ? 'dish_complete' : 'plate_add', x: sx, y: sy, dishId: held.dishId });
      return true;
    }
    return false;
  }

  // Chopping Board
  if (station.type === 'chop') {
    if (!station.item && held && canChopItem(held)) {
      station.item = held;
      station.progress = 0;
      station.duration = TIMING.chopDuration;
      player.held = null;
      events.push({ type: 'place', x: sx, y: sy });
      return true;
    }
    if (station.item && canChopItem(station.item)) {
      // Tap boost on every press!
      if (isTap) {
        station.progress += TIMING.chopTapBoost;
        player.chopAnim = 0.22;
        events.push({ type: 'chop_hit', x: sx, y: sy, itemId: station.item.id });
        if (station.progress >= station.duration) {
          station.item = getChoppedResult(station.item);
          station.progress = 0;
          station.duration = 0;
          events.push({ type: 'chop_done', x: sx, y: sy, itemId: station.item.id });
        }
      }
      return true;
    }
    if (station.item && !held) {
      player.held = station.item;
      station.item = null;
      station.progress = 0;
      events.push({ type: 'pickup', x: sx, y: sy });
      return true;
    }
    // Scoop chopped veggies directly onto a held plate
    if (
      station.item &&
      held &&
      held.kind === 'plate' &&
      !held.dishId &&
      isPlateableIngredient(station.item) &&
      addComponentToPlate(held, station.item.id)
    ) {
      station.item = null;
      station.progress = 0;
      events.push({ type: held.dishId ? 'dish_complete' : 'plate_add', x: sx, y: sy, dishId: held.dishId });
      return true;
    }
    return false;
  }

  // Cooking Appliances: Wok, Broth Pot, Charcoal Grill
  if (station.type === 'wok' || station.type === 'pot' || station.type === 'grill') {
    if (!station.item && held && canCookAtAppliance(held, station.type)) {
      station.item = held;
      station.resultId = getCookedResultId(held, station.type);
      station.duration = getCookDuration(station.type);
      station.progress = 0;
      station.cookState = 'cooking';
      station.burnTimer = 0;
      player.held = null;
      events.push({ type: 'cook_start', x: sx, y: sy, appliance: station.type });
      return true;
    }
    if (station.item && station.cookState !== 'cooking') {
      // Scoop cooked food straight onto a held plate
      if (
        station.cookState !== 'burnt' &&
        held &&
        held.kind === 'plate' &&
        !held.dishId &&
        isPlateableIngredient(station.item) &&
        addComponentToPlate(held, station.item.id)
      ) {
        station.item = null;
        station.cookState = 'idle';
        station.progress = 0;
        station.burnTimer = 0;
        station.resultId = null;
        events.push({ type: held.dishId ? 'dish_complete' : 'plate_add', x: sx, y: sy, dishId: held.dishId });
        return true;
      }
      // Or pick up with empty hands
      if (!held) {
        player.held = station.item;
        station.item = null;
        station.cookState = 'idle';
        station.progress = 0;
        station.burnTimer = 0;
        station.resultId = null;
        events.push({ type: 'pickup', x: sx, y: sy });
        return true;
      }
    }
    return false;
  }

  // Plating Stations (always replenish a fresh banana-leaf plate when picked up!)
  if (station.type === 'plate') {
    if (!station.item) {
      if (held && held.kind === 'plate') {
        station.item = held;
        player.held = null;
        events.push({ type: 'place', x: sx, y: sy });
        return true;
      }
      station.item = createPlateItem();
    }
    const plate = station.item;
    if (held && isPlateableIngredient(held) && !plate.dishId && addComponentToPlate(plate, held.id)) {
      player.held = null;
      events.push({
        type: plate.dishId ? 'dish_complete' : 'plate_add',
        x: sx,
        y: sy,
        dishId: plate.dishId,
      });
      return true;
    }
    // Swap or pick up plate
    if (!held && (plate.dishId || plate.components.length > 0)) {
      player.held = plate;
      station.item = createPlateItem(); // Fresh banana-leaf plate ready immediately
      events.push({ type: 'pickup', x: sx, y: sy });
      return true;
    }
    // Place a held plate onto an empty fresh plate slot
    if (held && held.kind === 'plate' && plate.components.length === 0 && !plate.dishId) {
      station.item = held;
      player.held = null;
      events.push({ type: 'place', x: sx, y: sy });
      return true;
    }
    return false;
  }

  // General Prep / Pass Counters
  if (station.type === 'counter') {
    if (!station.item && held) {
      station.item = held;
      player.held = null;
      events.push({ type: 'place', x: sx, y: sy });
      return true;
    }
    if (station.item && !held) {
      player.held = station.item;
      station.item = null;
      events.push({ type: 'pickup', x: sx, y: sy });
      return true;
    }
    if (
      station.item &&
      station.item.kind === 'plate' &&
      !station.item.dishId &&
      held &&
      isPlateableIngredient(held) &&
      addComponentToPlate(station.item, held.id)
    ) {
      player.held = null;
      events.push({
        type: station.item.dishId ? 'dish_complete' : 'plate_add',
        x: sx,
        y: sy,
        dishId: station.item.dishId,
      });
      return true;
    }
    if (
      held &&
      held.kind === 'plate' &&
      !held.dishId &&
      station.item &&
      isPlateableIngredient(station.item) &&
      addComponentToPlate(held, station.item.id)
    ) {
      station.item = null;
      events.push({
        type: held.dishId ? 'dish_complete' : 'plate_add',
        x: sx,
        y: sy,
        dishId: held.dishId,
      });
      return true;
    }
    return false;
  }

  // Serving Window
  if (station.type === 'serve') {
    if (held && held.kind === 'plate' && held.dishId) {
      const result = serveDishOrder(orders, held.dishId, world.elapsed);
      if (result) {
        station.servedVisual = held.dishId;
        station.servedTimer = 3.2;
        station.bellFlash = 1.0;
        player.held = null;
        events.push({
          type: 'order_served',
          x: sx,
          y: sy - 10,
          ...result,
        });
        return true;
      }
      events.push({ type: 'wrong_dish', x: sx, y: sy, dishId: held.dishId });
      return false;
    }
    return false;
  }

  // Trash Bin
  if (station.type === 'trash') {
    if (held) {
      player.held = null;
      events.push({ type: 'trash', x: sx, y: sy });
      return true;
    }
    return false;
  }

  return false;
}
