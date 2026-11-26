// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between four screens: title, play, paused and game over.
//
// ?seed=N fixes the rings and mountains. ?shot=start|play|end (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady for a
// screenshot.

import { BEST_KEY, LIVES, STEP } from './config.js';
import { createRandom } from './random.js';
import { createFlight, EVENT_CRASH, EVENT_OVER, EVENT_RING } from './flight.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './controls.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const flight = createFlight(createRandom(seed), seed);
const renderer = createRenderer(canvas, flight);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, flight);
  let painted = 0;
  function paint() {
    renderer.draw(flight.state, scene.screen, scene.best, performance.now() / 1000);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear screen changes and events.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    flight.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Flying. ${LIVES} lives. Thread the rings.`);
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (flight.state.score > best) {
      best = flight.state.score;
      saveBest(best);
    }
    announce(`Out of lives. Score ${flight.state.score}. Best ${best}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Flying.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      // Attract mode: the plane flies itself behind the title, and cannot crash.
      const ring = flight.state.ringsAhead.reduce((a, b) => (a.z < b.z ? a : b));
      const steer = Math.max(-1, Math.min(1, (ring.x - flight.state.x) * 2.2));
      const climb = Math.max(-1, Math.min(1, (ring.alt - flight.state.alt) / 260));
      flight.step(STEP, steer, climb, true);
      return;
    }
    const events = flight.step(STEP, input.steer(), input.climb(), false);
    if (events & EVENT_OVER) endGame();
    else if (events & EVENT_RING) announce(`Ring! Score ${flight.state.score}.`);
    else if (events & EVENT_CRASH) announce(flight.state.lives === 1 ? 'Terrain hit. 1 life left.' : `Terrain hit. ${flight.state.lives} lives left.`);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(flight.state, screen, best, now / 1000);
  }

  // Leaving the tab pauses a running game rather than letting rings pass unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Ridge Runner. Press Space or click to fly.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
