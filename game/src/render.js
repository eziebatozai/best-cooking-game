// Full 2D canvas renderer for Warung Rush: warung kitchen, order board, timers, chef, HUD, and overlays.

import { CANVAS_HEIGHT, CANVAS_WIDTH, PALETTE, TIMING } from './config.js';
import { canChopItem, getItemDef } from './ingredients.js';
import { getRecipe } from './recipes.js';
import { getStationActionHint } from './kitchen.js';
import { getCurrentWave, MODE_ENDED, MODE_PAUSED, MODE_PLAYING, MODE_TITLE } from './world.js';
import { UI_BUTTONS } from './input.js';
import { drawBananaLeafPlate, drawHeldOrStationItem, drawIngredientArt, drawPlatedDish } from './foodArt.js';

function roundRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

function formatClock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function drawFloorAndLighting(ctx, world) {
  // Warm dark exterior frame
  ctx.fillStyle = PALETTE.backdrop;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Tiled terracotta & cream warung kitchen floor
  const fx = 28;
  const fy = 148;
  const fw = CANVAS_WIDTH - 56;
  const fh = 524;
  ctx.save();
  roundRect(ctx, fx, fy, fw, fh, 14);
  ctx.clip();

  const tile = 44;
  for (let y = fy; y < fy + fh; y += tile) {
    for (let x = fx; x < fx + fw; x += tile) {
      const alt = (Math.floor((x - fx) / tile) + Math.floor((y - fy) / tile)) % 2 === 0;
      ctx.fillStyle = alt ? PALETTE.floorLight : PALETTE.floorDark;
      ctx.fillRect(x, y, tile, tile);
      ctx.strokeStyle = 'rgba(145, 102, 58, 0.22)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, tile, tile);
    }
  }

  // Warm overhead woven bamboo pendant lamp light pools
  for (const [lx, ly, lr] of [[310, 310, 230], [640, 415, 290], [990, 340, 240]]) {
    const grad = ctx.createRadialGradient(lx, ly, 16, lx, ly, lr);
    grad.addColorStop(0, 'rgba(255, 224, 150, 0.24)');
    grad.addColorStop(1, 'rgba(255, 200, 120, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(fx, fy, fw, fh);
  }

  // Subtle peak-rush amber edge warmth
  const wave = getCurrentWave(world);
  if (wave.id === 'peak' || wave.id === 'lastcall') {
    const pulse = 0.08 + 0.04 * Math.sin(world.customerWavePhase * 4.5);
    const edgeGrad = ctx.createRadialGradient(640, 410, 260, 640, 410, 680);
    edgeGrad.addColorStop(0, 'rgba(235, 90, 30, 0)');
    edgeGrad.addColorStop(1, `rgba(225, 72, 24, ${pulse.toFixed(3)})`);
    ctx.fillStyle = edgeGrad;
    ctx.fillRect(fx, fy, fw, fh);
  }

  ctx.restore();

  // Outer kitchen timber border
  ctx.strokeStyle = PALETTE.woodDark;
  ctx.lineWidth = 5;
  roundRect(ctx, fx, fy, fw, fh, 14);
  ctx.stroke();
}

function drawTopAwningAndOrderBoard(ctx, world, audio) {
  // Awning timber backboard
  ctx.fillStyle = '#311b0e';
  ctx.fillRect(0, 0, CANVAS_WIDTH, 148);

  // Decorative Indonesian batik-inspired gold border stripe at bottom of header
  ctx.fillStyle = PALETTE.woodFront;
  ctx.fillRect(0, 140, CANVAS_WIDTH, 8);
  ctx.fillStyle = PALETTE.awningGold;
  for (let x = 8; x < CANVAS_WIDTH; x += 26) {
    ctx.beginPath();
    ctx.moveTo(x, 144);
    ctx.lineTo(x + 8, 140);
    ctx.lineTo(x + 16, 144);
    ctx.lineTo(x + 8, 148);
    ctx.closePath();
    ctx.fill();
  }

  // Red & cream warung awning scallops across top edge
  const stripeW = 40;
  for (let x = 0; x < CANVAS_WIDTH; x += stripeW) {
    ctx.fillStyle = (Math.floor(x / stripeW) % 2 === 0) ? PALETTE.awningRed : PALETTE.awningCream;
    ctx.fillRect(x, 0, stripeW, 12);
  }

  // Left Warung Signboard
  roundRect(ctx, 14, 18, 152, 114, 10);
  ctx.fillStyle = '#5c2c14';
  ctx.fill();
  ctx.strokeStyle = PALETTE.awningGold;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = '#ffd66b';
  ctx.font = 'bold 21px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('WARUNG', 90, 48);
  ctx.fillStyle = '#fff5dc';
  ctx.font = 'bold 24px "Trebuchet MS", sans-serif';
  ctx.fillText('RUSH', 90, 74);

  ctx.fillStyle = '#f2b866';
  ctx.font = 'bold 10.5px "Trebuchet MS", sans-serif';
  ctx.fillText('JAKARTA STREET STALL', 90, 101);

  // Order rail bar
  ctx.fillStyle = '#734221';
  ctx.fillRect(178, 18, 780, 7);
  ctx.fillStyle = '#b8854e';
  ctx.fillRect(178, 18, 780, 2);

  // Order Board Tickets (up to 5)
  const orders = world.orders.orders;
  const cardW = 148;
  const cardH = 116;
  const cardGap = 9;
  const startX = 180;
  const startY = 21;

  if (orders.length === 0) {
    ctx.fillStyle = 'rgba(255, 240, 210, 0.35)';
    ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ORDER BOARD — WAITING FOR CUSTOMERS...', 568, 78);
  }

  orders.slice(0, 5).forEach((order, idx) => {
    const cx = startX + idx * (cardW + cardGap);
    const cy = startY;
    const recipe = getRecipe(order.dishId);
    const ratio = Math.max(0, Math.min(1, order.patience / order.maxPatience));
    const urgent = ratio < 0.28;
    const wobble = urgent ? Math.sin(order.pulse) * 1.5 : 0;

    ctx.save();
    ctx.translate(cx + cardW / 2, cy + cardH / 2);
    if (urgent) ctx.rotate(wobble * 0.015);
    ctx.translate(-cardW / 2, -cardH / 2);

    // Ticket paper shadow & body
    ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
    roundRect(ctx, 3, 4, cardW, cardH, 8);
    ctx.fill();

    ctx.fillStyle = urgent ? '#fff0eb' : PALETTE.ticketPaper;
    ctx.strokeStyle = urgent ? PALETTE.chiliRed : PALETTE.ticketBorder;
    ctx.lineWidth = urgent ? 2.4 : 1.5;
    roundRect(ctx, 0, 0, cardW, cardH, 8);
    ctx.fill();
    ctx.stroke();

    // Colored header strip
    ctx.save();
    roundRect(ctx, 0, 0, cardW, 25, 8);
    ctx.clip();
    ctx.fillStyle = recipe?.accent ?? '#b93122';
    ctx.fillRect(0, 0, cardW, 25);
    ctx.restore();

    // Brass hanging clip
    ctx.fillStyle = '#d49a38';
    roundRect(ctx, cardW / 2 - 12, -4, 24, 9, 3);
    ctx.fill();

    // Dish Name
    ctx.fillStyle = '#fff9ec';
    ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(order.name.toUpperCase(), 8, 13);

    // Coin payout tag
    ctx.fillStyle = '#ffe57f';
    ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`+${order.baseCoins}`, cardW - 7, 13);

    // Mini plated dish preview on left
    drawPlatedDish(ctx, order.dishId, 28, 56, 0.72, false);

    // Ingredient step checklist on right
    const hints = recipe?.stepsHint ?? [];
    ctx.textAlign = 'left';
    ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
    hints.forEach((hint, hIdx) => {
      const hy = 37 + hIdx * 15;
      const reqId = order.ingredients[hIdx];
      const def = getItemDef(reqId);
      ctx.fillStyle = def?.color ?? '#8c5a32';
      ctx.beginPath();
      ctx.arc(62, hy, 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#5c3c24';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.fillStyle = PALETTE.inkDark;
      ctx.fillText(hint, 70, hy + 0.5);
    });

    // Patience timer bar at bottom of ticket
    const barX = 8;
    const barY = cardH - 17;
    const barW = cardW - 16;
    const barH = 10;
    roundRect(ctx, barX, barY, barW, barH, 5);
    ctx.fillStyle = '#dfd1b8';
    ctx.fill();

    const barColor =
      ratio > 0.55 ? PALETTE.pandanGreen : ratio > 0.28 ? PALETTE.turmericAmber : PALETTE.chiliRed;
    if (ratio > 0) {
      roundRect(ctx, barX, barY, Math.max(8, barW * ratio), barH, 5);
      ctx.fillStyle = barColor;
      ctx.fill();
    }

    // Seconds remaining pill
    ctx.fillStyle = PALETTE.inkDark;
    ctx.font = 'bold 9.5px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.ceil(order.patience)}s`, cardW - 9, barY - 6);

    ctx.restore();
  });

  // Right HUD Panel: Shift Timer, Wave Indicator, Coins & Streak
  const hudX = 966;
  const hudY = 16;
  const hudW = 300;
  const hudH = 116;
  roundRect(ctx, hudX, hudY, hudW, hudH, 10);
  ctx.fillStyle = '#422312';
  ctx.fill();
  ctx.strokeStyle = '#a86b35';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Shift Timer block
  const lowTime = world.timeLeft <= 30 && world.mode === MODE_PLAYING;
  const timerFlash = lowTime && Math.sin(world.customerWavePhase * 9) > 0;
  roundRect(ctx, hudX + 10, hudY + 10, 114, 54, 8);
  ctx.fillStyle = timerFlash ? '#8f1f14' : '#261309';
  ctx.fill();
  ctx.strokeStyle = lowTime ? '#ff624d' : '#c98a42';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.fillStyle = '#e8c48c';
  ctx.font = 'bold 9.5px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SHIFT TIMER', hudX + 67, hudY + 22);

  ctx.fillStyle = lowTime ? '#ff8b78' : '#fff5dd';
  ctx.font = 'bold 26px "Trebuchet MS", monospace';
  ctx.fillText(formatClock(world.timeLeft), hudX + 67, hudY + 46);

  // Coins Earned block
  roundRect(ctx, hudX + 130, hudY + 10, 92, 54, 8);
  ctx.fillStyle = '#261309';
  ctx.fill();
  ctx.strokeStyle = '#d49d2a';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.fillStyle = '#e8c48c';
  ctx.font = 'bold 9.5px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('COINS', hudX + 176, hudY + 22);

  // Coin icon + score
  ctx.fillStyle = PALETTE.coinGold;
  ctx.beginPath();
  ctx.arc(hudX + 148, hudY + 45, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.coinRim;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.fillStyle = '#7a4b00';
  ctx.font = 'bold 9.5px "Trebuchet MS", sans-serif';
  ctx.fillText('Rp', hudX + 148, hudY + 46);

  ctx.fillStyle = '#ffe57f';
  ctx.font = 'bold 21px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(String(world.orders.totalCoins), hudX + 162, hudY + 46);

  // Wave phase + Streak bar along bottom of HUD
  const wave = getCurrentWave(world);
  const waveColor =
    wave.id === 'lastcall' ? '#d93829' : wave.id === 'peak' ? '#d96b27' : wave.id === 'lunch' ? '#c98f1e' : '#2f8a52';
  roundRect(ctx, hudX + 10, hudY + 74, 134, 30, 7);
  ctx.fillStyle = waveColor;
  ctx.fill();
  ctx.fillStyle = '#fff9eb';
  ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(wave.label, hudX + 77, hudY + 90);

  // Streak / Served readout
  roundRect(ctx, hudX + 152, hudY + 74, 138, 30, 7);
  ctx.fillStyle = world.orders.streak >= 2 ? '#80450f' : '#2b160b';
  ctx.fill();
  ctx.strokeStyle = world.orders.streak >= 2 ? '#ffd54f' : '#6e4221';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = world.orders.streak >= 2 ? '#ffe57f' : '#d6b78f';
  ctx.font = 'bold 11.5px "Trebuchet MS", sans-serif';
  const streakText =
    world.orders.streak >= 2
      ? `STREAK x${world.orders.streak}  (${world.orders.servedCount}✓)`
      : `SERVED: ${world.orders.servedCount}`;
  ctx.fillText(streakText, hudX + 221, hudY + 90);

  // Crisp vector Mute & Pause icon buttons neatly aligned inside right HUD
  drawUtilityButton(ctx, UI_BUTTONS.mute, 'sound', audio.muted);
  drawUtilityButton(ctx, UI_BUTTONS.pause, 'pause', world.mode === MODE_PAUSED);
}

function drawUtilityButton(ctx, rect, kind, active) {
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 7);
  ctx.fillStyle = '#5c3219';
  ctx.fill();
  ctx.strokeStyle = '#c48d52';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  ctx.save();
  ctx.fillStyle = '#fff3d6';
  ctx.strokeStyle = '#fff3d6';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  if (kind === 'sound') {
    // Speaker cone
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - 3);
    ctx.lineTo(cx - 3, cy - 3);
    ctx.lineTo(cx + 2, cy - 7);
    ctx.lineTo(cx + 2, cy + 7);
    ctx.lineTo(cx - 3, cy + 3);
    ctx.lineTo(cx - 7, cy + 3);
    ctx.closePath();
    ctx.fill();
    if (active) {
      ctx.strokeStyle = '#ff7b6b';
      ctx.beginPath();
      ctx.moveTo(cx + 4, cy - 4);
      ctx.lineTo(cx + 9, cy + 4);
      ctx.moveTo(cx + 9, cy - 4);
      ctx.lineTo(cx + 4, cy + 4);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(cx + 3, cy, 4.5, -0.65, 0.65);
      ctx.stroke();
    }
  } else if (active) {
    // Play triangle
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy - 6);
    ctx.lineTo(cx + 6, cy);
    ctx.lineTo(cx - 4, cy + 6);
    ctx.closePath();
    ctx.fill();
  } else {
    // Pause bars
    ctx.fillRect(cx - 5, cy - 6, 3.5, 12);
    ctx.fillRect(cx + 1.5, cy - 6, 3.5, 12);
  }
  ctx.restore();
}

function drawCounterBase(ctx, station, topColor, frontColor, highlight) {
  // Drop shadow
  ctx.fillStyle = 'rgba(30, 14, 5, 0.28)';
  roundRect(ctx, station.x + 3, station.y + 6, station.w, station.h, 10);
  ctx.fill();

  // Front bevel
  ctx.fillStyle = frontColor;
  roundRect(ctx, station.x, station.y, station.w, station.h, 10);
  ctx.fill();

  // Top work surface
  ctx.fillStyle = topColor;
  roundRect(ctx, station.x + 3, station.y + 3, station.w - 6, station.h - 14, 8);
  ctx.fill();

  // Subtle wood highlight line
  ctx.strokeStyle = 'rgba(255, 240, 210, 0.25)';
  ctx.lineWidth = 1.2;
  roundRect(ctx, station.x + 4, station.y + 4, station.w - 8, station.h - 16, 7);
  ctx.stroke();

  if (highlight) {
    ctx.save();
    ctx.strokeStyle = '#ffe05c';
    ctx.lineWidth = 3.2;
    ctx.shadowColor = '#ffd54f';
    ctx.shadowBlur = 10;
    roundRect(ctx, station.x - 1, station.y - 1, station.w + 2, station.h + 2, 11);
    ctx.stroke();
    ctx.restore();
  }
}

function drawStationLabel(ctx, station, text, yOffset = -7) {
  ctx.fillStyle = '#fff5dc';
  ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, station.x + station.w / 2, station.y + station.h + yOffset);
}

function drawProgressBar(ctx, x, y, w, h, ratio, color, bg = '#26140b') {
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = '#fff0cc';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  const clamped = Math.max(0, Math.min(1, ratio));
  if (clamped > 0) {
    roundRect(ctx, x + 2, y + 2, Math.max(6, (w - 4) * clamped), h - 4, (h - 4) / 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

function drawStation(ctx, station, world) {
  const isHighlighted =
    world.mode === MODE_PLAYING &&
    (world.nearestStationId === station.id || world.hoveredStationId === station.id);
  const cx = station.x + station.w / 2;
  const cy = station.y + station.h / 2 - 5;

  if (station.type === 'serve') {
    drawCounterBase(ctx, station, '#c48342', '#7a451c', isHighlighted);

    // Street-facing serving window opening with red/cream awning edge
    ctx.fillStyle = '#381e10';
    roundRect(ctx, station.x + 10, station.y + 7, station.w - 20, 22, 6);
    ctx.fill();
    for (let sx = station.x + 12; sx < station.x + station.w - 16; sx += 16) {
      ctx.fillStyle = (Math.floor(sx / 16) % 2 === 0) ? PALETTE.awningRed : PALETTE.awningCream;
      ctx.fillRect(sx, station.y + 7, 14, 7);
    }

    // Waiting street customer peeking through the window
    const bob = Math.sin(world.customerWavePhase * 3 + (station.id === 'serve_1' ? 0 : 2)) * 2;
    ctx.fillStyle = station.id === 'serve_1' ? '#2c6e73' : '#8f3a54';
    ctx.beginPath();
    ctx.arc(cx - 26, station.y + 22 + bob, 9, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#d9a173';
    ctx.beginPath();
    ctx.arc(cx - 26, station.y + 15 + bob, 6.5, 0, Math.PI * 2);
    ctx.fill();

    // Brass service bell on counter
    ctx.fillStyle = station.bellFlash > 0 ? '#fff28c' : '#e6b235';
    ctx.beginPath();
    ctx.arc(station.x + station.w - 22, cy + 8, 9, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#8c5d11';
    ctx.fillRect(station.x + station.w - 32, cy + 8, 20, 3.5);

    // Recently served dish displayed proudly on the window pass!
    if (station.servedVisual) {
      drawPlatedDish(ctx, station.servedVisual, cx + 6, cy + 6, 0.84, true);
    } else {
      ctx.fillStyle = 'rgba(255, 245, 220, 0.45)';
      ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PASS DISH', cx + 4, cy + 12);
    }
    drawStationLabel(ctx, station, station.label);
    return;
  }

  if (station.type === 'plate') {
    drawCounterBase(ctx, station, '#b57b45', PALETTE.woodFront, isHighlighted);
    // Clean placemat outline
    ctx.strokeStyle = 'rgba(255, 244, 214, 0.45)';
    ctx.lineWidth = 1.4;
    roundRect(ctx, station.x + 18, station.y + 10, station.w - 36, station.h - 28, 8);
    ctx.stroke();
    if (station.item) {
      drawHeldOrStationItem(ctx, station.item, cx, cy, world.orders.orders, 1.0, true);
    } else {
      drawBananaLeafPlate(ctx, cx, cy, 22, false);
    }
    drawStationLabel(ctx, station, station.label);
    return;
  }

  if (station.type === 'crate') {
    drawCounterBase(ctx, station, '#8f582b', '#5c3314', isHighlighted);
    // Slatted wooden market crate interior
    ctx.fillStyle = '#633919';
    roundRect(ctx, station.x + 12, station.y + 9, station.w - 24, station.h - 26, 7);
    ctx.fill();
    ctx.strokeStyle = '#b8804a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Abundant ingredients piled in the crate
    drawIngredientArt(ctx, station.itemId, cx - 10, cy + 1, 0.84);
    drawIngredientArt(ctx, station.itemId, cx + 10, cy - 2, 0.84);
    drawIngredientArt(ctx, station.itemId, cx, cy + 3, 0.96);
    drawStationLabel(ctx, station, station.label);
    return;
  }

  if (station.type === 'condiment') {
    drawCounterBase(ctx, station, '#a86d3b', PALETTE.woodFront, isHighlighted);
    // Earthenware warung bumbu jar
    ctx.fillStyle = '#5c2e16';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 3, 24, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    drawIngredientArt(ctx, station.itemId, cx, cy, 1.35);
    // Small wooden spoon handle sticking out
    ctx.strokeStyle = '#e0b375';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + 10, cy - 6);
    ctx.lineTo(cx + 26, cy - 16);
    ctx.stroke();
    drawStationLabel(ctx, station, station.label);
    return;
  }

  if (station.type === 'chop') {
    drawCounterBase(ctx, station, '#a86e3b', PALETTE.woodFront, isHighlighted);
    // Thick maple/teak butcher cutting board
    ctx.fillStyle = '#e3be88';
    ctx.strokeStyle = '#87572a';
    ctx.lineWidth = 2;
    roundRect(ctx, station.x + 18, station.y + 10, station.w - 36, station.h - 28, 7);
    ctx.fill();
    ctx.stroke();
    // Wood grain lines
    ctx.strokeStyle = 'rgba(135, 87, 42, 0.26)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(station.x + 26, station.y + 24);
    ctx.lineTo(station.x + station.w - 26, station.y + 24);
    ctx.moveTo(station.x + 26, station.y + 42);
    ctx.lineTo(station.x + station.w - 26, station.y + 42);
    ctx.stroke();

    if (station.item) {
      drawHeldOrStationItem(ctx, station.item, cx - 2, cy, world.orders.orders, 1.12, true);
      if (canChopItem(station.item) && station.progress > 0) {
        const ratio = station.progress / Math.max(0.01, station.duration);
        drawProgressBar(ctx, station.x + 16, station.y - 14, station.w - 32, 13, ratio, '#3cd16e');
      }
      // Animated cleaver blade chopping right over the item!
      if (canChopItem(station.item) && world.player.isChopping && world.player.chopAnim > 0) {
        const swing = Math.sin(world.player.chopAnim * 28) * 0.45;
        ctx.save();
        ctx.translate(cx + 16, cy - 6);
        ctx.rotate(-0.5 + swing);
        ctx.fillStyle = '#dce4eb';
        ctx.strokeStyle = '#52606b';
        ctx.lineWidth = 1.5;
        ctx.fillRect(-16, -9, 24, 14);
        ctx.strokeRect(-16, -9, 24, 14);
        ctx.fillStyle = '#6b3e1d';
        ctx.fillRect(8, -5, 13, 6);
        ctx.restore();
      }
    } else {
      // Resting cleaver icon on empty chopping board
      ctx.fillStyle = '#cfd8df';
      ctx.strokeStyle = '#63727d';
      ctx.lineWidth = 1.3;
      ctx.fillRect(cx - 14, cy - 8, 22, 12);
      ctx.strokeRect(cx - 14, cy - 8, 22, 12);
      ctx.fillStyle = '#6b3e1d';
      ctx.fillRect(cx + 8, cy - 5, 12, 5.5);
    }
    drawStationLabel(ctx, station, station.label);
    return;
  }

  if (station.type === 'wok' || station.type === 'pot' || station.type === 'grill') {
    drawCounterBase(ctx, station, PALETTE.steelTop, PALETTE.steelDark, isHighlighted);
    const active = station.cookState === 'cooking' || station.cookState === 'done' || station.cookState === 'burning';
    const flicker = 0.75 + 0.25 * Math.sin(world.customerWavePhase * 18 + station.y);

    if (station.type === 'wok') {
      // Burner flame glow under cast-iron wok
      if (active) {
        ctx.fillStyle = `rgba(255, 138, 28, ${(0.55 * flicker).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(cx, cy, 37, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#4fc3ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, 32, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Wok wooden handle
      ctx.fillStyle = '#733e1a';
      roundRect(ctx, station.x + 8, cy - 5, 22, 10, 4);
      ctx.fill();
      // Cast-iron wok bowl
      ctx.fillStyle = '#252a2e';
      ctx.strokeStyle = '#4e5861';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx + 4, cy, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#343b40';
      ctx.beginPath();
      ctx.arc(cx + 4, cy, 23, 0, Math.PI * 2);
      ctx.fill();
    } else if (station.type === 'pot') {
      // Simmering chicken broth stockpot
      ctx.fillStyle = '#8b99a3';
      ctx.strokeStyle = '#cfdbe3';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 31, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Golden simmering broth
      ctx.fillStyle = active ? '#e6a825' : '#c98e20';
      ctx.beginPath();
      ctx.arc(cx, cy, 24, 0, Math.PI * 2);
      ctx.fill();
      // Simmer bubbles
      if (active) {
        ctx.strokeStyle = 'rgba(255, 248, 210, 0.75)';
        ctx.lineWidth = 1.4;
        const r1 = 4 + ((world.customerWavePhase * 12) % 8);
        ctx.beginPath();
        ctx.arc(cx - 7, cy - 4, r1 * 0.55, 0, Math.PI * 2);
        ctx.arc(cx + 8, cy + 5, (12 - r1) * 0.45, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      // Indonesian Charcoal Sate Grill (Panggangan)
      ctx.fillStyle = '#2e2521';
      roundRect(ctx, station.x + 14, station.y + 12, station.w - 28, station.h - 32, 8);
      ctx.fill();
      // Glowing charcoal embers
      ctx.fillStyle = active ? `rgba(255, 96, 24, ${(0.85 * flicker).toFixed(2)})` : '#8a3518';
      roundRect(ctx, station.x + 20, station.y + 18, station.w - 40, station.h - 44, 5);
      ctx.fill();
      // Grill metal bars
      ctx.strokeStyle = '#3b3735';
      ctx.lineWidth = 3;
      for (let gx = station.x + 26; gx <= station.x + station.w - 26; gx += 12) {
        ctx.beginPath();
        ctx.moveTo(gx, station.y + 15);
        ctx.lineTo(gx, station.y + station.h - 23);
        ctx.stroke();
      }
    }

    // Food inside appliance
    if (station.item) {
      drawHeldOrStationItem(ctx, station.item, cx + (station.type === 'wok' ? 4 : 0), cy, world.orders.orders, 1.05, false);

      if (station.cookState === 'cooking') {
        const ratio = station.progress / Math.max(0.01, station.duration);
        drawProgressBar(ctx, station.x + 10, station.y - 12, station.w - 20, 13, ratio, '#3cd16e');
      } else if (station.cookState === 'done') {
        const graceRatio = 1 - station.burnTimer / TIMING.burnGraceDuration;
        drawProgressBar(ctx, station.x + 10, station.y - 12, station.w - 20, 13, graceRatio, '#ffd54f');
        ctx.fillStyle = '#2fa85b';
        roundRect(ctx, cx - 28, station.y + 5, 56, 16, 7);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('DONE!', cx, station.y + 14);
      } else if (station.cookState === 'burning') {
        const burnRatio = Math.max(0, 1 - station.burnTimer / TIMING.burnGraceDuration);
        drawProgressBar(ctx, station.x + 10, station.y - 12, station.w - 20, 13, burnRatio, '#ff3b28');
        if (Math.sin(world.customerWavePhase * 16) > -0.2) {
          ctx.fillStyle = '#d9281c';
          roundRect(ctx, cx - 32, station.y + 5, 64, 17, 7);
          ctx.fill();
          ctx.fillStyle = '#fff3b0';
          ctx.font = 'bold 10.5px "Trebuchet MS", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('! BURN !', cx, station.y + 14);
        }
      }
    }
    drawStationLabel(ctx, station, station.label);
    return;
  }

  if (station.type === 'trash') {
    drawCounterBase(ctx, station, '#5d656c', '#383e42', isHighlighted);
    ctx.fillStyle = '#8c2d23';
    roundRect(ctx, cx - 24, cy - 18, 48, 36, 8);
    ctx.fill();
    ctx.strokeStyle = '#d9766a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffe5e0';
    ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BIN', cx, cy + 2);
    drawStationLabel(ctx, station, station.label);
    return;
  }

  // General Prep / Pass Counter
  drawCounterBase(ctx, station, PALETTE.woodTop, PALETTE.woodFront, isHighlighted);
  if (station.item) {
    drawHeldOrStationItem(ctx, station.item, cx, cy, world.orders.orders, 1.05, true);
  }
  drawStationLabel(ctx, station, station.label);
}

function drawChef(ctx, world) {
  const { player } = world;
  const bob = Math.sin(player.walkCycle) * 2.2;
  const angle = Math.atan2(player.facingY, player.facingX);

  ctx.save();
  ctx.translate(player.x, player.y);

  // Soft floor shadow
  ctx.fillStyle = 'rgba(28, 12, 4, 0.32)';
  ctx.beginPath();
  ctx.ellipse(0, 17, 22, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  // Animated stepping shoes
  const stepOff = Math.sin(player.walkCycle) * 5;
  ctx.fillStyle = '#3b2416';
  ctx.beginPath();
  ctx.ellipse(-8, 13 + stepOff * 0.4, 6.5, 4.5, 0, 0, Math.PI * 2);
  ctx.ellipse(8, 13 - stepOff * 0.4, 6.5, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body (warm teal batik shirt + crisp cream apron)
  ctx.fillStyle = '#1f6e6c';
  ctx.strokeStyle = '#134241';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 2 + bob * 0.4, 19, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Apron front
  ctx.fillStyle = '#faf2df';
  ctx.beginPath();
  ctx.ellipse(player.facingX * 4, 4 + player.facingY * 4 + bob * 0.4, 12, 9.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = '#d99e6e';
  ctx.strokeStyle = '#694022';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, -10 + bob * 0.6, 13.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Hair cap
  ctx.fillStyle = '#241711';
  ctx.beginPath();
  ctx.arc(0, -13 + bob * 0.6, 13, Math.PI * 0.95, Math.PI * 2.05);
  ctx.fill();

  // Traditional Indonesian red & gold batik headband (ikat kepala)
  ctx.strokeStyle = '#c73222';
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.arc(0, -11 + bob * 0.6, 13.2, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();
  ctx.strokeStyle = '#f5c242';
  ctx.lineWidth = 1.4;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.arc(0, -11 + bob * 0.6, 13.2, Math.PI * 1.08, Math.PI * 1.92);
  ctx.stroke();
  ctx.setLineDash([]);

  // Eyes facing movement direction
  const ex = Math.cos(angle) * 4.5;
  const ey = Math.sin(angle) * 3.5;
  ctx.fillStyle = '#1f120b';
  ctx.beginPath();
  ctx.arc(ex - 3.5, -8 + ey + bob * 0.6, 1.9, 0, Math.PI * 2);
  ctx.arc(ex + 3.5, -8 + ey + bob * 0.6, 1.9, 0, Math.PI * 2);
  ctx.fill();

  // Held ingredient or gleaming plated dish out in front of chef
  if (player.held) {
    const hx = player.facingX * 26;
    const hy = player.facingY * 22 - 4 + bob * 0.5;
    // Small chef hands gripping the item
    ctx.fillStyle = '#d99e6e';
    ctx.beginPath();
    ctx.arc(hx - 10, hy + 4, 4.5, 0, Math.PI * 2);
    ctx.arc(hx + 10, hy + 4, 4.5, 0, Math.PI * 2);
    ctx.fill();
    drawHeldOrStationItem(ctx, player.held, hx, hy, world.orders.orders, 0.95, true);
  }

  ctx.restore();
}

function drawParticlesAndPopups(ctx, world) {
  for (const p of world.particles) {
    const ratio = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = ratio * p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (0.45 + 0.55 * ratio), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const pop of world.popups) {
    const ratio = Math.max(0, pop.life / pop.maxLife);
    ctx.save();
    ctx.globalAlpha = Math.min(1, ratio * 1.4);
    ctx.font = `bold ${Math.round(18 * pop.scale)}px "Trebuchet MS", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(34, 15, 5, 0.92)';
    ctx.strokeText(pop.text, pop.x, pop.y);
    ctx.fillStyle = pop.color;
    ctx.fillText(pop.text, pop.x, pop.y);
    ctx.restore();
  }
}

function drawFooterBar(ctx, world) {
  ctx.fillStyle = '#29160b';
  ctx.fillRect(0, 678, CANVAS_WIDTH, 42);
  ctx.fillStyle = '#6e4120';
  ctx.fillRect(0, 678, CANVAS_WIDTH, 2);

  // Contextual action hint on the left
  const activeStation = world.stations.find(
    (s) => s.id === (world.hoveredStationId ?? world.nearestStationId),
  );
  const hint = activeStation ? getStationActionHint(activeStation, world.player.held) : 'Move to a crate or click any station';

  roundRect(ctx, 18, 685, 310, 28, 7);
  ctx.fillStyle = '#472613';
  ctx.fill();
  ctx.strokeStyle = '#c48947';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.fillStyle = '#ffe58f';
  ctx.font = 'bold 12.5px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`ACTION: ${hint}`, 30, 699);

  // Controls guide on the right
  ctx.fillStyle = '#e3caa4';
  ctx.font = '12.5px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(
    'WASD / Arrows: Move   •   Space / E: Interact & Chop   •   Q / Shift: Dash   •   Mouse Click: Auto-Walk & Act   •   P: Pause',
    CANVAS_WIDTH - 22,
    699,
  );
}

function drawTitleOverlay(ctx) {
  ctx.fillStyle = 'rgba(20, 10, 5, 0.62)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const cx = CANVAS_WIDTH / 2;
  const cardW = 660;
  const cardH = 440;
  const x = cx - cardW / 2;
  const y = 148;

  roundRect(ctx, x, y, cardW, cardH, 18);
  ctx.fillStyle = '#fdf3dc';
  ctx.fill();
  ctx.strokeStyle = '#b93122';
  ctx.lineWidth = 5;
  ctx.stroke();

  // Header ribbon
  roundRect(ctx, x + 20, y + 20, cardW - 40, 82, 12);
  ctx.fillStyle = '#5c2812';
  ctx.fill();
  ctx.fillStyle = '#ffd54f';
  ctx.font = 'bold 42px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('WARUNG RUSH', cx, y + 52);
  ctx.fillStyle = '#f5d9a6';
  ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
  ctx.fillText('INDONESIAN STREET-FOOD KITCHEN  •  3-MINUTE SERVICE SHIFT', cx, y + 84);

  // Featured dishes preview row
  const previewDishes = [
    { id: 'nasi_goreng', label: 'Nasi Goreng', sub: 'Wok Rice + Chop Veg + Egg' },
    { id: 'sate_ayam', label: 'Sate Ayam', sub: 'Grill Chkn + Peanut + Rice' },
    { id: 'mie_ayam', label: 'Mie Ayam', sub: 'Pot Mie + Wok Chkn + Veg' },
  ];
  previewDishes.forEach((dish, idx) => {
    const dx = x + 122 + idx * 208;
    const dy = y + 178;
    drawPlatedDish(ctx, dish.id, dx, dy, 1.18, false);
    ctx.fillStyle = PALETTE.inkDark;
    ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
    ctx.fillText(dish.label, dx, dy + 42);
    ctx.fillStyle = PALETTE.inkMuted;
    ctx.font = '11.5px "Trebuchet MS", sans-serif';
    ctx.fillText(dish.sub, dx, dy + 60);
  });

  // Short gameplay instructions
  ctx.fillStyle = '#4a2b17';
  ctx.font = 'bold 13.5px "Trebuchet MS", sans-serif';
  ctx.fillText('Grab crates  →  Chop on island  →  Cook on Wok / Pot / Grill  →  Plate & Serve!', cx, y + 290);
  ctx.fillStyle = '#734b2f';
  ctx.font = '13px "Trebuchet MS", sans-serif';
  ctx.fillText('Play with WASD/Arrows + Space/E (Q to Dash) or click any station with your mouse.', cx, y + 314);

  // Start button
  const btn = UI_BUTTONS.start;
  roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 14);
  ctx.fillStyle = '#258a49';
  ctx.fill();
  ctx.strokeStyle = '#ffd54f';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px "Trebuchet MS", sans-serif';
  ctx.fillText('OPEN WARUNG', btn.x + btn.w / 2, btn.y + btn.h / 2 + 1);
}

function drawPauseOverlay(ctx) {
  ctx.fillStyle = 'rgba(20, 10, 5, 0.58)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const cx = CANVAS_WIDTH / 2;
  roundRect(ctx, cx - 200, 250, 400, 224, 16);
  ctx.fillStyle = '#fdf3dc';
  ctx.fill();
  ctx.strokeStyle = '#9c5a23';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = PALETTE.inkDark;
  ctx.font = 'bold 30px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SHIFT PAUSED', cx, 308);
  ctx.fillStyle = PALETTE.inkMuted;
  ctx.font = '14px "Trebuchet MS", sans-serif';
  ctx.fillText('Press P, Esc, or click below to resume.', cx, 348);

  const btn = UI_BUTTONS.resume;
  roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 12);
  ctx.fillStyle = '#258a49';
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
  ctx.fillText('RESUME SHIFT', btn.x + btn.w / 2, btn.y + btn.h / 2 + 1);
}

function drawEndOverlay(ctx, world) {
  ctx.fillStyle = 'rgba(22, 11, 5, 0.68)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const cx = CANVAS_WIDTH / 2;
  const cardW = 610;
  const cardH = 490;
  const x = cx - cardW / 2;
  const y = 132;

  roundRect(ctx, x, y, cardW, cardH, 18);
  ctx.fillStyle = '#fdf4de';
  ctx.fill();
  ctx.strokeStyle = '#d4952a';
  ctx.lineWidth = 5;
  ctx.stroke();

  // Header
  roundRect(ctx, x + 22, y + 20, cardW - 44, 72, 12);
  ctx.fillStyle = '#5c2812';
  ctx.fill();
  ctx.fillStyle = '#ffd54f';
  ctx.font = 'bold 34px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SHIFT COMPLETE!', cx, y + 56);

  // Star rating & Chef Rank
  const score = world.orders.totalCoins;
  const stars = score >= 520 ? 3 : score >= 280 ? 2 : score >= 100 ? 1 : 0;
  const rank =
    stars === 3 ? 'WARUNG MASTER CHEF' : stars === 2 ? 'WOK SPECIALIST' : stars === 1 ? 'STREET-FOOD COOK' : 'APPRENTICE COOK';

  for (let i = 0; i < 3; i += 1) {
    const sx = cx + (i - 1) * 58;
    const sy = y + 128;
    ctx.fillStyle = i < stars ? '#f5b822' : '#d6c7a8';
    ctx.font = '44px "Trebuchet MS", sans-serif';
    ctx.fillText('★', sx, sy);
  }
  ctx.fillStyle = '#9c4019';
  ctx.font = 'bold 16px "Trebuchet MS", sans-serif';
  ctx.fillText(rank, cx, y + 166);

  // Big Score Box
  roundRect(ctx, cx - 170, y + 188, 340, 74, 12);
  ctx.fillStyle = '#381e0f';
  ctx.fill();
  ctx.strokeStyle = '#f2b838';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = '#e8c48c';
  ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
  ctx.fillText('TOTAL COINS EARNED', cx, y + 207);
  ctx.fillStyle = '#ffe052';
  ctx.font = 'bold 38px "Trebuchet MS", sans-serif';
  ctx.fillText(`Rp ${score}`, cx, y + 240);

  // Breakdown stats grid
  const stats = [
    { label: 'DISHES SERVED', val: String(world.orders.servedCount) },
    { label: 'TIPS EARNED', val: `+${world.orders.totalTips}` },
    { label: 'BEST STREAK', val: `x${Math.max(1, world.orders.bestStreak)}` },
    { label: 'MISSED ORDERS', val: String(world.orders.missedCount) },
  ];
  stats.forEach((st, idx) => {
    const sx = x + 32 + idx * 140;
    const sy = y + 282;
    roundRect(ctx, sx, sy, 126, 74, 10);
    ctx.fillStyle = '#f2e4c4';
    ctx.fill();
    ctx.strokeStyle = '#d4bc8e';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#734b2f';
    ctx.font = 'bold 10.5px "Trebuchet MS", sans-serif';
    ctx.fillText(st.label, sx + 63, sy + 24);
    ctx.fillStyle = PALETTE.inkDark;
    ctx.font = 'bold 24px "Trebuchet MS", sans-serif';
    ctx.fillText(st.val, sx + 63, sy + 52);
  });

  // High score line
  ctx.fillStyle = '#6e4729';
  ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
  ctx.fillText(`BEST SHIFT RECORD: Rp ${Math.max(world.bestScore, score)}`, cx, y + 382);

  // Restart button
  const btn = UI_BUTTONS.restart;
  roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 14);
  ctx.fillStyle = '#258a49';
  ctx.fill();
  ctx.strokeStyle = '#ffd54f';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px "Trebuchet MS", sans-serif';
  ctx.fillText('PLAY AGAIN', btn.x + btn.w / 2, btn.y + btn.h / 2 + 1);
}

export function renderGame(ctx, canvas, world, audio) {
  const dpr = window.devicePixelRatio || 1;
  const viewW = canvas.clientWidth || CANVAS_WIDTH;
  const viewH = canvas.clientHeight || CANVAS_HEIGHT;
  const targetW = Math.round(viewW * dpr);
  const targetH = Math.round(viewH * dpr);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }

  const scale = Math.min(viewW / CANVAS_WIDTH, viewH / CANVAS_HEIGHT);
  const offsetX = (viewW - CANVAS_WIDTH * scale) / 2;
  const offsetY = (viewH - CANVAS_HEIGHT * scale) / 2;

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = PALETTE.backdrop;
  ctx.fillRect(0, 0, viewW, viewH);

  // Subtle screen shake on burn or missed order
  const shakeX = world.shakeTimer > 0 ? Math.sin(world.shakeTimer * 65) * 4 : 0;
  const shakeY = world.shakeTimer > 0 ? Math.cos(world.shakeTimer * 52) * 3 : 0;
  ctx.translate(offsetX + shakeX * scale, offsetY + shakeY * scale);
  ctx.scale(scale, scale);

  drawFloorAndLighting(ctx, world);
  drawTopAwningAndOrderBoard(ctx, world, audio);

  // Draw stations in visual depth order (top & sides first, then chef if behind island, etc.)
  for (const station of world.stations) {
    if (station.y < 370) drawStation(ctx, station, world);
  }
  if (world.player.y < 395) {
    drawChef(ctx, world);
  }
  for (const station of world.stations) {
    if (station.y >= 370) drawStation(ctx, station, world);
  }
  if (world.player.y >= 395) {
    drawChef(ctx, world);
  }

  // Click-to-walk target ring indicator
  if (world.mode === MODE_PLAYING && world.player.waypoints.length > 0) {
    const dest = world.player.waypoints[world.player.waypoints.length - 1];
    ctx.strokeStyle = 'rgba(255, 224, 92, 0.72)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(dest.x, dest.y, 12 + Math.sin(world.customerWavePhase * 10) * 2.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawParticlesAndPopups(ctx, world);
  drawFooterBar(ctx, world);

  if (world.mode === MODE_TITLE) {
    drawTitleOverlay(ctx);
  } else if (world.mode === MODE_PAUSED) {
    drawPauseOverlay(ctx);
  } else if (world.mode === MODE_ENDED) {
    drawEndOverlay(ctx, world);
  }

  ctx.restore();
  return { scale, offsetX, offsetY };
}
