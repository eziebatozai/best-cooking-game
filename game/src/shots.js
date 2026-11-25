// Deterministic live-simulation scene runner behind ?shot=cover|chop|rush|end.
// Every shot advances the real game simulation with genuine chef actions and station timers.

import { FIXED_STEP, SHIFT_DURATION } from './config.js';
import { getStationById } from './kitchen.js';
import { spawnOrder } from './orders.js';
import {
  MODE_ENDED,
  MODE_PLAYING,
  resetWorld,
  setWalkTarget,
  stepWorld,
  triggerInteract,
} from './world.js';

function advanceSeconds(world, seconds, inputState = { moveX: 0, moveY: 0, interactHeld: false }) {
  const steps = Math.round(seconds / FIXED_STEP);
  for (let i = 0; i < steps; i += 1) {
    stepWorld(world, FIXED_STEP, inputState);
  }
}

function walkAndAct(world, stationId) {
  const st = getStationById(world.stations, stationId);
  if (!st) return;
  setWalkTarget(world, st.standX, st.standY, st.id);
  for (let i = 0; i < 420; i += 1) {
    stepWorld(world, FIXED_STEP);
    if (world.player.waypoints.length === 0 && !world.player.pendingStationId) break;
  }
}

function placeAndChopUntilDone(world, stationId) {
  const st = getStationById(world.stations, stationId);
  if (!st) return;
  walkAndAct(world, stationId); // places raw item and starts auto-chop
  for (let i = 0; i < 160; i += 1) {
    stepWorld(world, FIXED_STEP, { moveX: 0, moveY: 0, interactHeld: true });
    if (st.item && st.item.id.startsWith('chopped_')) break;
  }
}

function waitForCookDone(world, stationId, maxSec = 7) {
  const st = getStationById(world.stations, stationId);
  const maxSteps = Math.round(maxSec / FIXED_STEP);
  for (let i = 0; i < maxSteps; i += 1) {
    stepWorld(world, FIXED_STEP);
    if (st && (st.cookState === 'done' || st.cookState === 'burning')) break;
  }
}

/**
 * Stages one of four authentic gameplay snapshots by executing real kitchen actions:
 * - cover: full kitchen, 4 orders on board, ingredients on counters, Nasi Goreng mid-assembly (Plating 1),
 *          a gleaming Sate Ayam plate ready to serve (Plating 2), active Wok + Pot timers, and clear Shift Timer.
 * - chop:  chef actively chopping chicken on the center island with progress bar, cleaver swing & chop sparks.
 * - rush:  peak 5-order service rush, multiple active cookers, just-served dish + coin popup, chef carrying Nasi Goreng.
 * - end:   end-of-shift report screen after real dishes served and coins/tips earned.
 */
export function stageShotScene(world, shotName) {
  resetWorld(world, 7);
  world.mode = MODE_PLAYING;

  if (shotName === 'cover') {
    // 1) Prepare a complete Sate Ayam plated & READY TO SERVE on Plating 2
    walkAndAct(world, 'crate_chicken');
    placeAndChopUntilDone(world, 'chop_1');
    walkAndAct(world, 'chop_1'); // pick up chopped chicken
    walkAndAct(world, 'grill_1'); // grill sate
    walkAndAct(world, 'crate_rice');
    walkAndAct(world, 'plate_2'); // steamed rice -> Plating 2
    waitForCookDone(world, 'grill_1');
    walkAndAct(world, 'grill_1'); // take fresh grilled sate (never burnt!)
    walkAndAct(world, 'plate_2'); // grilled sate -> Plating 2
    walkAndAct(world, 'sauce_peanut');
    walkAndAct(world, 'plate_2'); // peanut sauce -> Sate Ayam READY TO SERVE on Plating 2!

    // 2) Assemble Nasi Goreng MID-ASSEMBLY on Plating 1 (Wok Rice + Chopped Veg, awaiting Fried Egg)
    walkAndAct(world, 'crate_rice');
    walkAndAct(world, 'wok_1'); // fry rice
    walkAndAct(world, 'crate_veggies');
    placeAndChopUntilDone(world, 'chop_1');
    walkAndAct(world, 'chop_1'); // pick up chopped veggies
    walkAndAct(world, 'plate_1'); // chopped veggies -> Plating 1
    waitForCookDone(world, 'wok_1');
    walkAndAct(world, 'wok_1'); // take golden wok fried rice
    walkAndAct(world, 'plate_1'); // Nasi Goreng is now 2/3 MID-ASSEMBLY on Plating 1!

    // 3) Place visible fresh ingredients on the counters (island + bottom + pass counter)
    walkAndAct(world, 'crate_veggies');
    walkAndAct(world, 'island_counter');
    walkAndAct(world, 'crate_chicken');
    walkAndAct(world, 'counter_bot_1');
    walkAndAct(world, 'crate_rice');
    walkAndAct(world, 'counter_top');

    // 4) Start active cooking timers right now (Egg frying in Wok 1 + Noodles simmering in Broth Pot!)
    walkAndAct(world, 'crate_noodles');
    walkAndAct(world, 'pot_1');
    walkAndAct(world, 'crate_egg');
    walkAndAct(world, 'wok_1');

    // 5) Refresh the 4 orders on the board and position the chef cleanly in the center lane
    world.orders.orders = [];
    spawnOrder(world.orders, 48, world.rng, 'nasi_goreng');
    spawnOrder(world.orders, 48, world.rng, 'sate_ayam');
    spawnOrder(world.orders, 48, world.rng, 'mie_ayam');
    spawnOrder(world.orders, 48, world.rng, 'mie_goreng');
    world.orders.orders[0].patience = 42;
    world.orders.orders[1].patience = 50;
    world.orders.orders[2].patience = 56;
    world.orders.orders[3].patience = 28;
    world.orders.totalCoins = 165;
    world.orders.servedCount = 3;
    world.orders.streak = 2;
    world.elapsed = 56;
    world.timeLeft = SHIFT_DURATION - world.elapsed;

    // Walk chef to the center-top aisle so Wok 1 & Pot 1 are mid-cook (~60%) with rising steam!
    setWalkTarget(world, 636, 304, null);
    advanceSeconds(world, 1.85);
    world.player.waypoints = [];
    world.player.facingX = 0.25;
    world.player.facingY = -0.96;
    return;
  }

  if (shotName === 'chop') {
    // Stage a lively kitchen with ingredients on counter, active wok & grill, and chef mid-chop on Chopping Board 1!
    walkAndAct(world, 'crate_veggies');
    walkAndAct(world, 'island_counter');
    walkAndAct(world, 'crate_rice');
    walkAndAct(world, 'wok_1');
    walkAndAct(world, 'crate_chicken');
    walkAndAct(world, 'chop_1'); // places chicken on chop_1 and starts auto-chopping
    // Advance ~0.92s so progress bar is ~65%, knife is mid-swing, chop particles fly, and Wok 1 is actively frying!
    advanceSeconds(world, 0.92, { moveX: 0, moveY: 0, interactHeld: true });
    world.player.chopAnim = 0.14;
    world.orders.totalCoins = 95;
    world.orders.servedCount = 2;
    world.elapsed = 34;
    world.timeLeft = SHIFT_DURATION - world.elapsed;
    return;
  }

  if (shotName === 'rush') {
    // Peak Rush: assemble Sate Ayam (Plating 1) + Nasi Goreng (Plating 2), serve Sate Ayam, rush Nasi Goreng!
    walkAndAct(world, 'crate_chicken');
    placeAndChopUntilDone(world, 'chop_1');
    walkAndAct(world, 'chop_1');
    walkAndAct(world, 'grill_1');
    walkAndAct(world, 'crate_rice');
    walkAndAct(world, 'plate_1');
    waitForCookDone(world, 'grill_1');
    walkAndAct(world, 'grill_1');
    walkAndAct(world, 'plate_1');
    walkAndAct(world, 'sauce_peanut');
    walkAndAct(world, 'plate_1'); // Sate Ayam ready on Plating 1!

    // Prep chopped veggies FIRST so woks never overcook while assembling Nasi Goreng on Plating 2
    walkAndAct(world, 'crate_veggies');
    placeAndChopUntilDone(world, 'chop_2');
    walkAndAct(world, 'chop_2');
    walkAndAct(world, 'plate_2');
    walkAndAct(world, 'crate_rice');
    walkAndAct(world, 'wok_1');
    walkAndAct(world, 'crate_egg');
    walkAndAct(world, 'wok_2');
    waitForCookDone(world, 'wok_1');
    walkAndAct(world, 'wok_1');
    walkAndAct(world, 'plate_2');
    waitForCookDone(world, 'wok_2');
    walkAndAct(world, 'wok_2');
    walkAndAct(world, 'plate_2'); // Nasi Goreng ready on Plating 2!

    // Stage Mie Ayam mid-assembly on Plating 3 + active cookers sizzling simultaneously!
    walkAndAct(world, 'crate_veggies');
    placeAndChopUntilDone(world, 'chop_1');
    walkAndAct(world, 'chop_1');
    walkAndAct(world, 'plate_3');

    walkAndAct(world, 'crate_chicken');
    placeAndChopUntilDone(world, 'chop_2');
    walkAndAct(world, 'chop_2');
    walkAndAct(world, 'grill_1');
    walkAndAct(world, 'crate_noodles');
    walkAndAct(world, 'pot_1');
    walkAndAct(world, 'crate_rice');
    walkAndAct(world, 'wok_1');

    // Set peak rush 5-order board right before serving Sate Ayam!
    world.orders.orders = [];
    spawnOrder(world.orders, 118, world.rng, 'sate_ayam');
    spawnOrder(world.orders, 118, world.rng, 'nasi_goreng');
    spawnOrder(world.orders, 118, world.rng, 'mie_ayam');
    spawnOrder(world.orders, 118, world.rng, 'nasi_spesial');
    spawnOrder(world.orders, 118, world.rng, 'mie_goreng');
    world.orders.orders[0].patience = 44;
    world.orders.orders[1].patience = 11; // urgent red pulsing ticket!
    world.orders.orders[2].patience = 26;
    world.orders.orders[3].patience = 46;
    world.orders.orders[4].patience = 34;
    world.orders.totalCoins = 340;
    world.orders.totalTips = 96;
    world.orders.servedCount = 6;
    world.orders.streak = 3;
    world.elapsed = 118;
    world.timeLeft = SHIFT_DURATION - world.elapsed;

    // Serve Sate Ayam at Serving Window 1 -> spawns glowing served dish, bell flash & +coin/+tip popup!
    walkAndAct(world, 'plate_1');
    walkAndAct(world, 'serve_1');
    spawnOrder(world.orders, 118, world.rng, 'sate_ayam');

    // Grab the completed Nasi Goreng from Plating 2 and dash toward Serving Window 2!
    walkAndAct(world, 'plate_2');
    setWalkTarget(world, 456, 294, null);
    advanceSeconds(world, 0.36);
    world.player.waypoints = [];
    world.player.facingX = -0.92;
    world.player.facingY = -0.38;
    return;
  }

  if (shotName === 'end') {
    // Run a real dish serve then finish the shift for an authentic End Screen over a busy kitchen
    walkAndAct(world, 'crate_chicken');
    placeAndChopUntilDone(world, 'chop_1');
    walkAndAct(world, 'chop_1');
    walkAndAct(world, 'grill_1');
    walkAndAct(world, 'crate_rice');
    walkAndAct(world, 'plate_1');
    waitForCookDone(world, 'grill_1');
    walkAndAct(world, 'grill_1');
    walkAndAct(world, 'plate_1');
    walkAndAct(world, 'sauce_peanut');
    walkAndAct(world, 'plate_1');
    walkAndAct(world, 'plate_1');
    walkAndAct(world, 'serve_1');

    world.orders.totalCoins = 585;
    world.orders.totalTips = 172;
    world.orders.servedCount = 10;
    world.orders.bestStreak = 5;
    world.orders.missedCount = 1;
    world.bestScore = 585;
    world.elapsed = SHIFT_DURATION;
    world.timeLeft = 0;
    world.mode = MODE_ENDED;
    triggerInteract(world);
  }
}
