// Order board queue, escalating shift waves, patience countdowns, and tip/streak scoring.

import { SCORING, SHIFT_WAVES } from './config.js';
import { getRecipe, getRecipesForTier } from './recipes.js';

export function getWaveForElapsed(elapsed) {
  let current = SHIFT_WAVES[0];
  for (const wave of SHIFT_WAVES) {
    if (elapsed >= wave.startAt) current = wave;
  }
  return current;
}

export function createOrderManager() {
  return {
    orders: [],
    nextOrderId: 1,
    spawnTimer: 1.5,
    servedCount: 0,
    missedCount: 0,
    totalCoins: 0,
    totalTips: 0,
    streak: 0,
    bestStreak: 0,
    lastServeBanner: null,
  };
}

export function spawnOrder(manager, elapsed, rng, forcedDishId = null) {
  const wave = getWaveForElapsed(elapsed);
  if (!forcedDishId && manager.orders.length >= wave.maxOrders) return null;

  let recipe;
  if (forcedDishId) {
    recipe = getRecipe(forcedDishId);
  } else {
    const pool = getRecipesForTier(wave.menuTier);
    // Slightly prefer variety over duplicating the most recent order
    const lastDish = manager.orders.length > 0 ? manager.orders[manager.orders.length - 1].dishId : null;
    const varied = pool.filter((r) => r.id !== lastDish);
    recipe = rng.pick(varied.length > 0 && rng.next() < 0.72 ? varied : pool);
  }
  if (!recipe) return null;

  const maxPatience = Math.round(recipe.patience * wave.patienceScale);
  const order = {
    id: manager.nextOrderId++,
    dishId: recipe.id,
    name: recipe.name,
    ingredients: [...recipe.ingredients],
    patience: maxPatience,
    maxPatience,
    baseCoins: recipe.baseCoins,
    maxTip: recipe.maxTip,
    age: 0,
    pulse: 0,
  };
  manager.orders.push(order);
  return order;
}

export function stepOrders(manager, dt, elapsed, rng, events) {
  const wave = getWaveForElapsed(elapsed);

  // Update active order patience timers
  for (let i = manager.orders.length - 1; i >= 0; i -= 1) {
    const order = manager.orders[i];
    order.age += dt;
    order.patience -= dt;
    if (order.patience / order.maxPatience < 0.28) {
      order.pulse += dt * 7;
    }
    if (order.patience <= 0) {
      manager.orders.splice(i, 1);
      manager.missedCount += 1;
      manager.streak = 0;
      manager.totalCoins = Math.max(0, manager.totalCoins - SCORING.missedOrderPenalty);
      events.push({ type: 'order_expired', dishName: order.name, penalty: SCORING.missedOrderPenalty });
    }
  }

  // Spawn new orders as pressure builds
  manager.spawnTimer -= dt;
  const shouldForceMinimum = manager.orders.length < (elapsed < 25 ? 2 : 3);
  if (manager.orders.length < wave.maxOrders && (manager.spawnTimer <= 0 || shouldForceMinimum)) {
    const created = spawnOrder(manager, elapsed, rng);
    if (created) {
      events.push({ type: 'order_new', order: created });
      manager.spawnTimer = shouldForceMinimum
        ? Math.min(3.5, wave.spawnInterval * 0.45)
        : wave.spawnInterval * (0.85 + rng.next() * 0.3);
    }
  }

  if (manager.lastServeBanner) {
    manager.lastServeBanner.timer -= dt;
    if (manager.lastServeBanner.timer <= 0) {
      manager.lastServeBanner = null;
    }
  }
}

/**
 * Matches a plated dish against the most urgent matching order on the board,
 * awarding coins, speed tip, and streak bonus.
 */
export function serveDishOrder(manager, dishId, elapsed) {
  let bestIndex = -1;
  let lowestPatience = Infinity;
  for (let i = 0; i < manager.orders.length; i += 1) {
    const order = manager.orders[i];
    if (order.dishId === dishId && order.patience < lowestPatience) {
      lowestPatience = order.patience;
      bestIndex = i;
    }
  }
  if (bestIndex === -1) return null;

  const [order] = manager.orders.splice(bestIndex, 1);
  const ratio = Math.max(0, Math.min(1, order.patience / order.maxPatience));
  const wave = getWaveForElapsed(elapsed);
  const lastCallBoost = wave.id === 'lastcall' ? 1.5 : 1.0;

  let rating = 'SERVED';
  let tip = 0;
  if (ratio >= SCORING.fastPatienceRatio) {
    rating = 'FAST SERVE!';
    manager.streak += 1;
    tip = Math.round(order.maxTip * (0.75 + 0.25 * ratio) * lastCallBoost);
  } else if (ratio >= SCORING.goodPatienceRatio) {
    rating = 'NICE SERVE';
    manager.streak += 1;
    tip = Math.round(order.maxTip * 0.5 * lastCallBoost);
  } else {
    rating = 'JUST IN TIME';
    manager.streak = 0;
    tip = 0;
  }

  manager.bestStreak = Math.max(manager.bestStreak, manager.streak);
  const streakIdx = Math.min(manager.streak, SCORING.streakBonuses.length - 1);
  const multiplier = SCORING.streakBonuses[streakIdx];
  const baseEarned = Math.round(order.baseCoins * multiplier);
  const totalEarned = baseEarned + tip;

  manager.servedCount += 1;
  manager.totalCoins += totalEarned;
  manager.totalTips += tip;
  manager.lastServeBanner = {
    dishName: order.name,
    coins: totalEarned,
    tip,
    rating,
    streak: manager.streak,
    timer: 2.6,
  };

  return {
    order,
    baseEarned,
    tip,
    totalEarned,
    rating,
    streak: manager.streak,
    multiplier,
  };
}
