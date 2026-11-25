// Core constants, layout dimensions, timing rules, and warm warung palette for Warung Rush.

export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;
export const FIXED_STEP = 1 / 60;

export const SHIFT_DURATION = 180; // 3-minute shift in seconds

export const PLAYER_CONFIG = {
  radius: 22,
  speed: 310,
  dashSpeed: 560,
  dashDuration: 0.16,
  dashCooldown: 0.72,
  interactRadius: 84,
};

export const TIMING = {
  chopDuration: 1.4,
  chopTapBoost: 0.28,
  wokCookDuration: 4.2,
  grillCookDuration: 4.8,
  potCookDuration: 4.0,
  burnGraceDuration: 8.5,
  burnWarningStart: 3.5,
};

export const SCORING = {
  fastPatienceRatio: 0.62,
  goodPatienceRatio: 0.30,
  missedOrderPenalty: 10,
  streakBonuses: [1.0, 1.0, 1.15, 1.3, 1.5, 1.75, 2.0],
};

// Escalating waves over the 3-minute shift
export const SHIFT_WAVES = [
  {
    id: 'opening',
    label: 'OPENING',
    startAt: 0,
    maxOrders: 3,
    spawnInterval: 13.5,
    patienceScale: 1.05,
    menuTier: 1,
  },
  {
    id: 'lunch',
    label: 'LUNCH RUSH',
    startAt: 40,
    maxOrders: 4,
    spawnInterval: 10.5,
    patienceScale: 0.92,
    menuTier: 2,
  },
  {
    id: 'peak',
    label: 'PEAK RUSH',
    startAt: 95,
    maxOrders: 5,
    spawnInterval: 8.2,
    patienceScale: 0.80,
    menuTier: 3,
  },
  {
    id: 'lastcall',
    label: 'LAST CALL!',
    startAt: 145,
    maxOrders: 5,
    spawnInterval: 7.0,
    patienceScale: 0.72,
    menuTier: 3,
  },
];

// Walkable kitchen bounds (inside outer counter walls)
export const KITCHEN_BOUNDS = {
  left: 162,
  right: 1102,
  top: 256,
  bottom: 572,
};

// Warm Indonesian street-food warung visual palette
export const PALETTE = {
  backdrop: '#22140c',
  awningRed: '#b93122',
  awningCream: '#f6ead4',
  awningGold: '#e7a93c',
  floorLight: '#edd9b8',
  floorDark: '#dfbe91',
  floorGrout: '#c59e6d',
  woodTop: '#9c6234',
  woodFront: '#6f411f',
  woodTrim: '#cfa06b',
  woodDark: '#472711',
  steelTop: '#6b757d',
  steelLight: '#96a2ab',
  steelDark: '#3f474e',
  bananaLeaf: '#4a8c3f',
  bananaLeafLight: '#68b055',
  ticketPaper: '#fdf6e3',
  ticketBorder: '#d7be93',
  pandanGreen: '#2fa85b',
  turmericAmber: '#e69b1e',
  chiliRed: '#d93829',
  coinGold: '#f7c531',
  coinRim: '#b8760b',
  inkDark: '#2b180c',
  inkMuted: '#6d4c33',
};
