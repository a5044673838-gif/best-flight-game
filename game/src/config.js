// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical
// area; the renderer scales it to the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720, horizonY: 330 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const LIVES = 3;

/** Altitude, in feet: the floor the terrain can reach, and the ceiling. */
export const ALT = { min: 60, max: 1200 };

/** Knots shown at level 1, and how many knots each level adds. */
export const SPEED = { base: 220, perLevel: 14 };

/** How fast the world rushes at the plane, in depth units a second, at level 1. */
export const RUSH = { base: 26, perLevel: 1.6 };

/** Lateral position runs -1..1 across the valley; altitude is in feet. */
export const PLANE = {
  lateralSpeed: 0.85,
  climbSpeed: 300,
  bankMax: 0.55,
  headingTurn: 16,
  invulnerable: 2.0,
  crashMargin: 30,
};

/** Rings float ahead; z counts down from SPAWN_Z to 0, where the plane is. */
export const RING = {
  spawnZ: 140,
  worldRadius: 95,
  lateralReach: 0.34,
  altReach: 120,
  points: 100,
  minAltAboveTerrain: 170,
  maxAlt: 950,
};

/** Seconds of play per level; speeds stop growing at the last level. */
export const LEVEL = { seconds: 25, max: 10 };

export const PALETTE = {
  skyTop: '#0b2a5b',
  skyMid: '#3f7ec2',
  skyLow: '#bcd9ee',
  sun: '#fff3c4',
  sunGlow: 'rgba(255, 240, 180, 0.35)',
  cloud: 'rgba(255, 255, 255, 0.85)',
  cloudShade: 'rgba(210, 225, 240, 0.7)',
  ridgeFar: '#7d8fb5',
  ridgeMid: '#4c5e82',
  ridgeNear: '#232c3d',
  ground: '#3d4a2f',
  groundFar: '#5d6b4a',
  runway: '#3a3f4a',
  runwayEdge: '#e8e4d0',
  ring: '#39e6ff',
  ringGlow: 'rgba(57, 230, 255, 0.55)',
  ringHit: '#7dff9a',
  jetBody: '#cfd8e2',
  jetDark: '#5d6b7d',
  jetAccent: '#ff7a1a',
  jetGlass: '#1d3a5f',
  flame: '#ffb347',
  panel: '#141a24',
  panelEdge: '#2b3547',
  hudText: '#eef3f8',
  hudMuted: '#9fb0c3',
  hudWarn: '#ffb347',
  hudDanger: '#ff5d5d',
  overlay: 'rgba(8, 12, 20, 0.62)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'ridge-runner.best';
