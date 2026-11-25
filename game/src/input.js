// Keyboard (WASD/Arrows, Space/E, Q/Shift, P/Esc, M) and Mouse (click-to-station & UI buttons) controls.

import { CANVAS_HEIGHT, CANVAS_WIDTH } from './config.js';
import { findStationAtPoint } from './kitchen.js';
import { MODE_ENDED, MODE_PAUSED, MODE_PLAYING, MODE_TITLE, resetWorld, setWalkTarget, triggerDash, triggerInteract } from './world.js';

export const UI_BUTTONS = {
  start: { x: 486, y: 492, w: 308, h: 64 },
  restart: { x: 486, y: 540, w: 308, h: 62 },
  resume: { x: 498, y: 392, w: 284, h: 56 },
  mute: { x: 1196, y: 26, w: 28, h: 28 },
  pause: { x: 1230, y: 26, w: 28, h: 28 },
};

function pointInRect(px, py, rect) {
  return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
}

export function createInputController(canvas, world, audio, getRenderTransform) {
  const keys = new Set();
  const pointer = { x: -1, y: -1, inside: false };

  function toCanvasCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const transform = getRenderTransform();
    const sx = (clientX - rect.left - transform.offsetX) / transform.scale;
    const sy = (clientY - rect.top - transform.offsetY) / transform.scale;
    return {
      x: Math.max(0, Math.min(CANVAS_WIDTH, sx)),
      y: Math.max(0, Math.min(CANVAS_HEIGHT, sy)),
    };
  }

  function onKeyDown(event) {
    const code = event.code;
    if (
      code === 'ArrowUp' || code === 'ArrowDown' || code === 'ArrowLeft' || code === 'ArrowRight' ||
      code === 'Space' || code === 'KeyW' || code === 'KeyA' || code === 'KeyS' || code === 'KeyD' ||
      code === 'KeyE' || code === 'KeyQ' || code === 'KeyP' || code === 'KeyM' ||
      code === 'Enter' || code === 'Escape' || code === 'ShiftLeft' || code === 'ShiftRight'
    ) {
      event.preventDefault();
    }

    audio.unlock();

    if (code === 'KeyM' && !event.repeat) {
      audio.toggleMute();
      return;
    }

    if ((code === 'KeyP' || code === 'Escape') && !event.repeat) {
      if (world.mode === MODE_PLAYING) world.mode = MODE_PAUSED;
      else if (world.mode === MODE_PAUSED) world.mode = MODE_PLAYING;
      return;
    }

    if (world.mode === MODE_TITLE && (code === 'Space' || code === 'Enter') && !event.repeat) {
      resetWorld(world, world.seed + 1);
      audio.playDing();
      return;
    }

    if (world.mode === MODE_ENDED && (code === 'Space' || code === 'Enter' || code === 'KeyR') && !event.repeat) {
      resetWorld(world, world.seed + 1);
      audio.playDing();
      return;
    }

    if (world.mode === MODE_PAUSED && (code === 'Space' || code === 'Enter') && !event.repeat) {
      world.mode = MODE_PLAYING;
      return;
    }

    keys.add(code);

    if (world.mode === MODE_PLAYING && !event.repeat) {
      if (code === 'Space' || code === 'KeyE') {
        triggerInteract(world);
      } else if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyQ') {
        triggerDash(world);
      }
    }
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function onPointerMove(event) {
    const pos = toCanvasCoords(event.clientX, event.clientY);
    pointer.x = pos.x;
    pointer.y = pos.y;
    pointer.inside = true;
    if (world.mode === MODE_PLAYING) {
      const station = findStationAtPoint(world.stations, pos.x, pos.y);
      world.hoveredStationId = station ? station.id : null;
    } else {
      world.hoveredStationId = null;
    }
  }

  function onPointerDown(event) {
    if (event.button !== 0) return;
    audio.unlock();
    const pos = toCanvasCoords(event.clientX, event.clientY);
    pointer.x = pos.x;
    pointer.y = pos.y;

    // Top-right HUD utility buttons
    if (pointInRect(pos.x, pos.y, UI_BUTTONS.mute)) {
      audio.toggleMute();
      return;
    }
    if (world.mode === MODE_PLAYING || world.mode === MODE_PAUSED) {
      if (pointInRect(pos.x, pos.y, UI_BUTTONS.pause)) {
        world.mode = world.mode === MODE_PLAYING ? MODE_PAUSED : MODE_PLAYING;
        return;
      }
    }

    if (world.mode === MODE_TITLE) {
      resetWorld(world, world.seed + 1);
      audio.playDing();
      return;
    }

    if (world.mode === MODE_PAUSED) {
      if (pointInRect(pos.x, pos.y, UI_BUTTONS.resume)) {
        world.mode = MODE_PLAYING;
      }
      return;
    }

    if (world.mode === MODE_ENDED) {
      if (pointInRect(pos.x, pos.y, UI_BUTTONS.restart)) {
        resetWorld(world, world.seed + 1);
        audio.playDing();
      }
      return;
    }

    // Playing: click any station to walk directly there and interact, or click floor to move
    const station = findStationAtPoint(world.stations, pos.x, pos.y);
    if (station) {
      const dist = Math.hypot(station.standX - world.player.x, station.standY - world.player.y);
      if (dist <= 44) {
        world.player.facingX = station.facingX;
        world.player.facingY = station.facingY;
        triggerInteract(world, station);
      } else {
        setWalkTarget(world, station.standX, station.standY, station.id);
      }
    } else if (pos.y > 152 && pos.y < 670) {
      setWalkTarget(world, pos.x, pos.y, null);
    }
  }

  function onBlur() {
    keys.clear();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);

  return {
    pointer,
    readMoveState() {
      const left = keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0;
      const right = keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0;
      const up = keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0;
      const down = keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0;
      return {
        moveX: right - left,
        moveY: down - up,
        interactHeld: keys.has('Space') || keys.has('KeyE'),
      };
    },
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
    },
  };
}
