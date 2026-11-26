// The flight itself: where the plane is, how fast the world rushes at it, the rings
// ahead, and the mountains below. One fixed step at a time, no screen size in here.

import { ALT, LIVES, LEVEL, PLANE, RING, RUSH, SPEED } from './config.js';
import { createNoise } from './random.js';

export const EVENT_RING = 1;
export const EVENT_MISS = 2;
export const EVENT_CRASH = 4;
export const EVENT_OVER = 8;

const TAU = Math.PI * 2;

export function createFlight(random, seed) {
  const noiseLow = createNoise(seed ^ 0x51ab);
  const noiseHigh = createNoise(seed ^ 0x9e37);

  const state = {
    x: 0,
    alt: 520,
    heading: 90,
    bank: 0,
    speed: SPEED.base,
    distance: 0,
    elapsed: 0,
    level: 1,
    lives: LIVES,
    score: 0,
    rings: 0,
    missed: 0,
    combo: 0,
    bestCombo: 0,
    invulnerable: 0,
    travelled: 0,
    popup: null,
    ringsAhead: [],
    clouds: [],
  };

  /** Mountain height, in feet, at a travelled distance: two noise octaves, clamped. */
  function terrainHeight(d) {
    const h = 110 + 105 * noiseLow(d * 0.045) + 55 * noiseHigh(d * 0.13);
    return Math.max(40, h);
  }

  /** Ridge crest height for a lateral offset (-1..1) across the screen, right now. */
  function ridgeAt(lateral) {
    return terrainHeight(state.travelled + 18 + lateral * 26);
  }

  function spawnRing(z) {
    const ahead = terrainHeight(state.travelled + z);
    const alt = Math.min(
      RING.maxAlt,
      Math.max(ahead + RING.minAltAboveTerrain, ahead + 160 + random() * 420),
    );
    return { x: (random() * 2 - 1) * 0.78, alt, z };
  }

  function spawnCloud(z) {
    return {
      x: (random() * 2 - 1) * 1.5,
      alt: 620 + random() * 520,
      z: z ?? 10 + random() * 130,
      size: 0.6 + random() * 1.4,
    };
  }

  function reset() {
    state.x = 0;
    state.alt = 520;
    state.heading = 90;
    state.bank = 0;
    state.speed = SPEED.base;
    state.distance = 0;
    state.elapsed = 0;
    state.level = 1;
    state.lives = LIVES;
    state.score = 0;
    state.rings = 0;
    state.missed = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.invulnerable = 0;
    state.travelled = 0;
    state.ringsAhead = [spawnRing(55), spawnRing(100), spawnRing(140)];
    state.clouds = [];
    for (let i = 0; i < 14; i += 1) state.clouds.push(spawnCloud());
  }

  /**
   * Advance one fixed step. steer is -1..1, climb is -1..1 (up is positive).
   * demo means the title screen's autopilot flight: it never crashes.
   */
  function step(dt, steer, climb, demo) {
    state.elapsed += dt;
    state.level = Math.min(LEVEL.max, 1 + Math.floor(state.elapsed / LEVEL.seconds));
    state.speed = SPEED.base + (state.level - 1) * SPEED.perLevel;
    const rush = RUSH.base + (state.level - 1) * RUSH.perLevel;

    const targetBank = steer * PLANE.bankMax;
    state.bank += (targetBank - state.bank) * Math.min(1, dt * 8);
    state.heading = (state.heading + steer * PLANE.headingTurn * dt + 360) % 360;
    state.x = Math.max(-1, Math.min(1, state.x + (steer * PLANE.lateralSpeed + state.bank * 0.3) * dt));
    state.alt = Math.max(ALT.min, Math.min(ALT.max, state.alt + climb * PLANE.climbSpeed * dt));
    state.distance += (state.speed / 3600) * dt;
    state.travelled += rush * dt;
    if (state.invulnerable > 0) state.invulnerable -= dt;

    for (const cloud of state.clouds) {
      cloud.z -= rush * 0.55 * dt;
      if (cloud.z <= 2) Object.assign(cloud, spawnCloud(140));
    }

    let events = 0;
    for (const ring of state.ringsAhead) {
      ring.z -= rush * dt;
      if (ring.z > 0) continue;
      const dx = Math.abs(state.x - ring.x);
      const dAlt = Math.abs(state.alt - ring.alt);
      if (dx < RING.lateralReach && dAlt < RING.altReach) {
        state.combo += 1;
        state.bestCombo = Math.max(state.bestCombo, state.combo);
        const points = RING.points * state.combo;
        state.score += points;
        state.rings += 1;
        state.popup = { text: `+${points}`, until: state.elapsed + 1.2 };
        events |= EVENT_RING;
      } else {
        state.combo = 0;
        state.missed += 1;
        events |= EVENT_MISS;
      }
      Object.assign(ring, spawnRing(RING.spawnZ));
    }

    if (!demo && state.invulnerable <= 0) {
      const ground = terrainHeight(state.travelled);
      if (state.alt < ground + PLANE.crashMargin) {
        state.lives -= 1;
        state.combo = 0;
        state.invulnerable = PLANE.invulnerable;
        state.alt = Math.min(ALT.max, ground + 280);
        events |= EVENT_CRASH;
        if (state.lives <= 0) events |= EVENT_OVER;
      }
    }
    return events;
  }

  return { state, reset, step, terrainHeight, ridgeAt };
}
