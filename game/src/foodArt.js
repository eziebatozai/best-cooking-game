// Procedural 2D canvas illustrations for every ingredient, condiment, mid-assembly plate, and Indonesian dish.

import { PALETTE } from './config.js';
import { getItemDef } from './ingredients.js';
import { getRecipe, inferTargetRecipe } from './recipes.js';

function drawRoundedPill(ctx, x, y, w, h, r) {
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

export function drawBananaLeafPlate(ctx, cx, cy, r = 24, glowing = false) {
  ctx.save();
  if (glowing) {
    ctx.shadowColor = '#ffd54f';
    ctx.shadowBlur = 14;
  }
  // Ceramic plate shadow & rim
  ctx.fillStyle = 'rgba(30, 14, 5, 0.28)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 4, r + 2, r * 0.88, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f8f2e4';
  ctx.strokeStyle = glowing ? '#f5b82e' : '#c9b99b';
  ctx.lineWidth = glowing ? 3 : 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r, r * 0.86, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Inner ceramic ring
  ctx.strokeStyle = '#dfd0b4';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 0.78, r * 0.67, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Traditional woven banana leaf liner
  ctx.fillStyle = PALETTE.bananaLeaf;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 0.72, r * 0.58, -0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.bananaLeafLight;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.58, cy + r * 0.14);
  ctx.lineTo(cx + r * 0.58, cy - r * 0.14);
  ctx.stroke();
  ctx.restore();
}

export function drawIngredientArt(ctx, itemId, cx, cy, scale = 1) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  switch (itemId) {
    case 'rice': {
      // Fluffy white steamed rice mound
      ctx.fillStyle = '#e8dec8';
      ctx.beginPath();
      ctx.ellipse(0, 5, 17, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fffaf0';
      ctx.beginPath();
      ctx.arc(0, 0, 13, Math.PI, 0);
      ctx.ellipse(0, 2, 15, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e5dac3';
      for (const [gx, gy] of [[-6, -3], [4, -4], [-2, 2], [7, 1], [-8, 3]]) {
        ctx.fillRect(gx, gy, 3, 1.5);
      }
      break;
    }
    case 'noodles': {
      // Curly raw yellow egg noodles nest
      ctx.strokeStyle = '#d19722';
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      for (let i = -2; i <= 2; i += 1) {
        ctx.beginPath();
        ctx.moveTo(-13, i * 4);
        ctx.bezierCurveTo(-5, i * 4 - 5, 5, i * 4 + 5, 13, i * 4);
        ctx.stroke();
      }
      ctx.strokeStyle = '#f8d468';
      ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i += 1) {
        ctx.beginPath();
        ctx.moveTo(-12, i * 4 - 1);
        ctx.bezierCurveTo(-4, i * 4 - 6, 6, i * 4 + 4, 12, i * 4 - 1);
        ctx.stroke();
      }
      break;
    }
    case 'chicken': {
      // Fresh raw chicken cut
      ctx.fillStyle = '#d98a77';
      ctx.beginPath();
      ctx.ellipse(0, 2, 16, 11, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f6c3b3';
      ctx.beginPath();
      ctx.ellipse(-2, -1, 13, 8.5, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fce0d6';
      ctx.beginPath();
      ctx.ellipse(-5, -3, 6, 3.5, -0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'chopped_chicken': {
      // Neatly diced chicken cubes
      const cubes = [[-9, -5], [2, -6], [9, 1], [-8, 4], [1, 4], [-1, -1]];
      for (const [bx, by] of cubes) {
        ctx.fillStyle = '#d98a77';
        ctx.fillRect(bx - 4, by - 2.5, 8.5, 7);
        ctx.fillStyle = '#f7c9b9';
        ctx.fillRect(bx - 4, by - 4, 8, 5.5);
      }
      break;
    }
    case 'veggies': {
      // Bok choy stalk + red chili pepper
      ctx.fillStyle = '#3c8f38';
      ctx.beginPath();
      ctx.ellipse(-5, -3, 11, 7, -0.5, 0, Math.PI * 2);
      ctx.ellipse(4, -5, 10, 6.5, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#70c960';
      ctx.beginPath();
      ctx.ellipse(-3, -4, 7, 4, -0.4, 0, Math.PI * 2);
      ctx.fill();
      // White bok choy stems
      ctx.fillStyle = '#eef5d8';
      ctx.fillRect(-5, 2, 10, 8);
      // Red bird's-eye chili
      ctx.strokeStyle = '#df2e24';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(4, 6);
      ctx.quadraticCurveTo(11, 8, 14, 1);
      ctx.stroke();
      break;
    }
    case 'chopped_veggies': {
      // Fresh chopped scallions, bok choy ribbons, and chili slices
      const greens = [[-9, -4], [-3, -7], [5, -5], [9, 2], [-7, 5], [2, 5], [-1, 0]];
      for (const [gx, gy] of greens) {
        ctx.fillStyle = '#48b842';
        ctx.beginPath();
        ctx.arc(gx, gy, 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#9be884';
        ctx.beginPath();
        ctx.arc(gx - 0.8, gy - 0.8, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const [rx, ry] of [[-4, 2], [6, -1], [0, -4]]) {
        ctx.fillStyle = '#e63327';
        ctx.beginPath();
        ctx.arc(rx, ry, 2.7, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'egg': {
      // Speckled brown farm egg
      ctx.fillStyle = '#c49664';
      ctx.beginPath();
      ctx.ellipse(0, 1, 10.5, 13.5, 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#edd2ad';
      ctx.beginPath();
      ctx.ellipse(-1.5, -1, 8.5, 11.5, 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff5e4';
      ctx.beginPath();
      ctx.ellipse(-4, -5, 2.6, 4.2, 0.25, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'fried_rice': {
      // Caramelized kecap-manis Nasi Goreng mound
      ctx.fillStyle = '#9e5320';
      ctx.beginPath();
      ctx.ellipse(0, 3, 17, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#cc7a33';
      ctx.beginPath();
      ctx.ellipse(0, -1, 15, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e6a555';
      for (const [rx, ry] of [[-7, -3], [4, -4], [-3, 2], [7, 1], [0, -1]]) {
        ctx.fillRect(rx, ry, 3.2, 1.8);
      }
      // Scallion & chili flecks
      ctx.fillStyle = '#5ac94c';
      ctx.fillRect(-5, 0, 3, 2);
      ctx.fillRect(4, 2, 3, 2);
      ctx.fillStyle = '#e03324';
      ctx.fillRect(1, -5, 2.8, 2);
      break;
    }
    case 'fried_egg': {
      // Crisp-edged sunny-side-up egg
      ctx.fillStyle = '#d9b589';
      ctx.beginPath();
      ctx.ellipse(0, 1, 15, 12, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fffef9';
      ctx.beginPath();
      ctx.ellipse(0, 0, 13.5, 10.5, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f5a814';
      ctx.beginPath();
      ctx.arc(1, -0.5, 5.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd966';
      ctx.beginPath();
      ctx.arc(-0.8, -2.2, 2.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'wok_chicken': {
      // Sweet-soy glazed spiced chicken pieces
      const pieces = [[-8, -4], [3, -5], [8, 2], [-7, 4], [1, 4], [-1, -1]];
      for (const [px, py] of pieces) {
        ctx.fillStyle = '#7d3912';
        ctx.beginPath();
        ctx.ellipse(px, py + 1, 5.2, 4, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#c46c2b';
        ctx.beginPath();
        ctx.ellipse(px - 0.8, py - 0.8, 4.4, 3.2, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'boiled_noodles': {
      // Steaming golden broth noodles
      ctx.fillStyle = '#d99e26';
      ctx.beginPath();
      ctx.ellipse(0, 2, 16, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffdf78';
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      for (let i = -2; i <= 2; i += 1) {
        ctx.beginPath();
        ctx.moveTo(-11, i * 3.5);
        ctx.bezierCurveTo(-4, i * 3.5 - 4, 4, i * 3.5 + 4, 11, i * 3.5);
        ctx.stroke();
      }
      break;
    }
    case 'wok_noodles': {
      // Rich dark kecap stir-fried noodles
      ctx.fillStyle = '#6e3410';
      ctx.beginPath();
      ctx.ellipse(0, 2, 16, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#cc7b2b';
      ctx.lineWidth = 2.8;
      ctx.lineCap = 'round';
      for (let i = -2; i <= 2; i += 1) {
        ctx.beginPath();
        ctx.moveTo(-12, i * 3.5);
        ctx.bezierCurveTo(-4, i * 3.5 - 4, 4, i * 3.5 + 4, 12, i * 3.5);
        ctx.stroke();
      }
      ctx.fillStyle = '#e03a28';
      ctx.fillRect(-3, -2, 3, 2);
      ctx.fillStyle = '#5ec44b';
      ctx.fillRect(4, 1, 3, 2);
      break;
    }
    case 'grilled_sate': {
      // 3 smoky grilled chicken skewers on bamboo sticks
      for (const oy of [-7, 0, 7]) {
        ctx.strokeStyle = '#d4b483';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-16, oy + 3);
        ctx.lineTo(16, oy - 3);
        ctx.stroke();
        for (const ox of [-7, 0, 7]) {
          ctx.fillStyle = '#8f3c14';
          ctx.beginPath();
          ctx.ellipse(ox, oy - ox * 0.16, 4.4, 3.1, -0.18, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#c46325';
          ctx.beginPath();
          ctx.ellipse(ox - 0.6, oy - ox * 0.16 - 0.6, 2.8, 1.8, -0.18, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case 'peanut_sauce': {
      // Rich peanut sauce cup with crushed peanuts
      ctx.fillStyle = '#5c310e';
      ctx.beginPath();
      ctx.arc(0, 1, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a86224';
      ctx.beginPath();
      ctx.arc(0, 0, 10.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dfb176';
      for (const [nx, ny] of [[-4, -2], [3, -3], [0, 3], [5, 2], [-3, 4]]) {
        ctx.fillRect(nx, ny, 2.4, 2);
      }
      break;
    }
    case 'sambal': {
      // Fiery red Indonesian chili sambal dish
      ctx.fillStyle = '#7a120a';
      ctx.beginPath();
      ctx.arc(0, 1, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dc2d1f';
      ctx.beginPath();
      ctx.arc(0, 0, 10.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff9a62';
      for (const [sx, sy] of [[-3, -2], [3, 2], [2, -4], [-4, 3]]) {
        ctx.beginPath();
        ctx.arc(sx, sy, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'burnt': {
      // Charred black lump
      ctx.fillStyle = '#1f1c1b';
      ctx.beginPath();
      ctx.ellipse(0, 2, 15, 11, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3b3533';
      ctx.beginPath();
      ctx.ellipse(-3, -2, 9, 6, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ff6b4a';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-5, -4);
      ctx.lineTo(5, 5);
      ctx.moveTo(5, -4);
      ctx.lineTo(-5, 5);
      ctx.stroke();
      break;
    }
    default: {
      const def = getItemDef(itemId);
      ctx.fillStyle = def?.color ?? '#ddd';
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawPlatedDish(ctx, dishId, cx, cy, scale = 1, glowing = false) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  if (dishId === 'mie_ayam') {
    // Traditional Indonesian ceramic noodle bowl
    if (glowing) {
      ctx.shadowColor = '#ffd54f';
      ctx.shadowBlur = 14;
    }
    ctx.fillStyle = 'rgba(30, 14, 5, 0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 5, 25, 21, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fbf6ec';
    ctx.strokeStyle = '#c43225';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, 23, 19.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Golden chicken broth
    ctx.fillStyle = '#d99824';
    ctx.beginPath();
    ctx.ellipse(0, 0, 18.5, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Noodles + braised chicken + bok choy
    drawIngredientArt(ctx, 'boiled_noodles', -2, 2, 0.85);
    drawIngredientArt(ctx, 'wok_chicken', 7, -4, 0.65);
    drawIngredientArt(ctx, 'chopped_veggies', -8, -5, 0.65);
    ctx.restore();
    return;
  }

  // Banana-leaf ceramic plate for rice/noodle/sate dishes
  drawBananaLeafPlate(ctx, 0, 0, 24, glowing);

  if (dishId === 'nasi_goreng') {
    drawIngredientArt(ctx, 'fried_rice', -3, 2, 0.95);
    drawIngredientArt(ctx, 'chopped_veggies', 9, 5, 0.55);
    drawIngredientArt(ctx, 'fried_egg', 5, -5, 0.72);
    // Crisp pink/cream kerupuk shrimp cracker + cucumber slices
    ctx.fillStyle = '#f7d5b5';
    ctx.strokeStyle = '#d49a6a';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(-12, -8, 7, 5, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#73c95b';
    ctx.beginPath();
    ctx.arc(-11, 8, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d9f5c6';
    ctx.beginPath();
    ctx.arc(-11, 8, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (dishId === 'mie_goreng') {
    drawIngredientArt(ctx, 'wok_noodles', -2, 2, 0.96);
    drawIngredientArt(ctx, 'chopped_veggies', -9, -5, 0.62);
    drawIngredientArt(ctx, 'fried_egg', 7, -4, 0.7);
  } else if (dishId === 'sate_ayam') {
    drawIngredientArt(ctx, 'rice', -11, 5, 0.58);
    drawIngredientArt(ctx, 'peanut_sauce', 10, 6, 0.64);
    drawIngredientArt(ctx, 'grilled_sate', 0, -4, 0.98);
  } else if (dishId === 'nasi_spesial') {
    drawIngredientArt(ctx, 'fried_rice', -4, 3, 0.94);
    drawIngredientArt(ctx, 'wok_chicken', -9, -5, 0.66);
    drawIngredientArt(ctx, 'fried_egg', 6, -5, 0.70);
    drawIngredientArt(ctx, 'sambal', 11, 6, 0.52);
    // Kerupuk garnish
    ctx.fillStyle = '#f7d5b5';
    ctx.beginPath();
    ctx.ellipse(0, 12, 6, 3.8, 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Draws a plate item (empty, mid-assembly with visual components + missing-ingredient pips, or completed ready dish).
 */
export function drawPlateItem(ctx, plate, cx, cy, activeOrders = [], scale = 1, showLabel = true) {
  if (!plate || plate.kind !== 'plate') return;

  if (plate.dishId) {
    drawPlatedDish(ctx, plate.dishId, cx, cy, scale, true);
    if (showLabel) {
      const recipe = getRecipe(plate.dishId);
      const label = `SERVE: ${(recipe?.name ?? 'DISH').toUpperCase()}`;
      ctx.save();
      ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
      const textW = ctx.measureText(label).width;
      const badgeW = Math.max(96, Math.ceil(textW + 16));
      const badgeH = 19;
      drawRoundedPill(ctx, cx - badgeW / 2, cy - 39 * scale, badgeW, badgeH, 9);
      ctx.fillStyle = '#1d7a3c';
      ctx.fill();
      ctx.strokeStyle = '#ffd54f';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = '#fff9db';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, cx, cy - 39 * scale + badgeH / 2 + 0.5);
      ctx.restore();
    }
    return;
  }

  // Empty or mid-assembly plate
  drawBananaLeafPlate(ctx, cx, cy, 23 * scale, false);
  const offsets = [
    [-6, 3],
    [7, -4],
    [0, -7],
    [8, 6],
  ];
  plate.components.forEach((compId, idx) => {
    const [ox, oy] = offsets[idx % offsets.length];
    drawIngredientArt(ctx, compId, cx + ox * scale, cy + oy * scale, 0.72 * scale);
  });

  if (showLabel && plate.components.length > 0) {
    const target = inferTargetRecipe(plate.components, activeOrders);
    if (target) {
      ctx.save();
      const total = target.ingredients.length;
      const pillW = Math.max(82, total * 22 + 24);
      const pillH = 22;
      const px = cx - pillW / 2;
      const py = cy - 41 * scale;
      drawRoundedPill(ctx, px, py, pillW, pillH, 9);
      ctx.fillStyle = 'rgba(43, 24, 12, 0.90)';
      ctx.fill();
      ctx.strokeStyle = '#f2b84b';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Draw checklist pips (green check for plated, hollow amber dot for still needed)
      const startX = cx - ((total - 1) * 20) / 2;
      target.ingredients.forEach((reqId, idx) => {
        const has = plate.components.includes(reqId);
        const dotX = startX + idx * 20;
        const dotY = py + pillH / 2;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 6.5, 0, Math.PI * 2);
        ctx.fillStyle = has ? '#2fa85b' : '#4a2e1b';
        ctx.fill();
        ctx.strokeStyle = has ? '#9ef0b8' : '#f2b84b';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        ctx.fillStyle = has ? '#ffffff' : '#f7d58b';
        ctx.font = 'bold 8.5px "Trebuchet MS", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(has ? '✓' : '?', dotX, dotY + 0.5);
      });
      ctx.restore();
    }
  }
}

export function drawHeldOrStationItem(ctx, item, cx, cy, activeOrders = [], scale = 1, showLabel = true) {
  if (!item) return;
  if (item.kind === 'plate') {
    drawPlateItem(ctx, item, cx, cy, activeOrders, scale, showLabel);
  } else {
    drawIngredientArt(ctx, item.id, cx, cy, scale);
  }
}
