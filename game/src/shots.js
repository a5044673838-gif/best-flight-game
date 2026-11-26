// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by a simple autopilot
// (aim for the next ring's lateral position and altitude), so the frame is what a short
// game really looks like and the same seed always gives the same frame.

import { STEP } from './config.js';
import { EVENT_OVER } from './flight.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 24;
const END_LIMIT_SECONDS = 600;

/** Steer and climb toward the nearest ring; the end scene's pilot flies low instead. */
function autopilot(state, careless) {
  const ring = state.ringsAhead.reduce((a, b) => (a.z < b.z ? a : b));
  const dx = ring.x - state.x;
  const dAlt = ring.alt - state.alt;
  const steer = careless ? 0 : Math.max(-1, Math.min(1, dx * 2.2));
  const climb = careless ? -0.4 : Math.max(-1, Math.min(1, dAlt / 260));
  return { steer, climb };
}

/**
 * Set `flight` to the named scene (start, play or end; any other name is start) and
 * return the screen to draw over it and the best score to show.
 */
export function stageShot(name, flight) {
  flight.reset();
  if (name !== 'play' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) {
      const { steer, climb } = autopilot(flight.state, false);
      flight.step(STEP, steer, climb, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const careless = name === 'end';
  const limit = careless ? END_LIMIT_SECONDS : PLAY_SECONDS;
  let over = false;
  for (let i = 0; i < limit / STEP; i += 1) {
    const { steer, climb } = autopilot(flight.state, careless);
    if (flight.step(STEP, steer, climb, false) & EVENT_OVER) {
      over = true;
      break;
    }
  }
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: 0 };
}
