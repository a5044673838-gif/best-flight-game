// Keyboard and pointer input. Held keys give steering and climb; one-shot presses
// (start or restart, pause) are queued as bit flags and taken once by the loop, so a
// press between two frames is never lost and never counted twice. The pointer steers
// too: hold the mouse or a finger and the plane follows it.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(target) {
  let left = false;
  let right = false;
  let up = false;
  let down = false;
  let actions = 0;
  let pointerX = null;
  let pointerY = null;
  let pointerHeld = false;

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (UP.has(event.code)) up = true;
    else if (DOWN.has(event.code)) down = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
  });
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => {
    left = false;
    right = false;
    up = false;
    down = false;
    pointerHeld = false;
    pointerX = null;
    pointerY = null;
  });

  target.addEventListener('pointerdown', (event) => {
    pointerHeld = true;
    pointerX = event.clientX;
    pointerY = event.clientY;
    actions |= ACTION_CONFIRM;
  });
  window.addEventListener('pointermove', (event) => {
    if (!pointerHeld) return;
    pointerX = event.clientX;
    pointerY = event.clientY;
  });
  window.addEventListener('pointerup', () => {
    pointerHeld = false;
    pointerX = null;
    pointerY = null;
  });

  return {
    /** -1 for left, 1 for right, 0 for neither or both; pointer steers toward itself. */
    steer() {
      const keys = (right ? 1 : 0) - (left ? 1 : 0);
      if (keys !== 0 || pointerX === null) return keys;
      const rect = target.getBoundingClientRect();
      const rel = (pointerX - rect.left) / rect.width - 0.5;
      return Math.max(-1, Math.min(1, rel * 3));
    },
    /** -1 for down, 1 for up; pointer steers toward itself. */
    climb() {
      const keys = (up ? 1 : 0) - (down ? 1 : 0);
      if (keys !== 0 || pointerY === null) return keys;
      const rect = target.getBoundingClientRect();
      const rel = (pointerY - rect.top) / rect.height - 0.5;
      return Math.max(-1, Math.min(1, -rel * 3));
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
