// Everything on screen: sky, sun and clouds, ridge layers, the terrain profile the
// plane flies over, the rings ahead, the jet itself, the HUD and the instrument strip,
// and the title, pause and game-over screens. All drawing is plain canvas 2D.

import { ALT, FIELD, FONT, PALETTE, RING } from './config.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_OVER = 3;

const W = FIELD.width;
const H = FIELD.height;
const CX = W / 2;
const HORIZON = FIELD.horizonY;
const PLANE_Y = 560;
const ZMAX = RING.spawnZ;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function createRenderer(canvas, flight) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
    canvas.width = Math.round(W * scale * (window.devicePixelRatio || 1));
    canvas.height = Math.round(H * scale * (window.devicePixelRatio || 1));
    canvas.style.width = `${Math.round(W * scale)}px`;
    canvas.style.height = `${Math.round(H * scale)}px`;
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  }
  window.addEventListener('resize', fit);
  fit();

  function project(x, alt, z, planeAlt, planeX) {
    const t = 1 - z / ZMAX;
    const persp = 0.1 + 0.9 * t;
    return {
      x: CX + (x - planeX) * 560 * persp + planeX * 80,
      y: HORIZON + (PLANE_Y - HORIZON) * persp - (alt - planeAlt) * 0.3 * persp,
      r: 20 + 140 * t,
      t,
    };
  }

  function drawSky(state) {
    const g = ctx.createLinearGradient(0, 0, 0, HORIZON + 60);
    g.addColorStop(0, PALETTE.skyTop);
    g.addColorStop(0.55, PALETTE.skyMid);
    g.addColorStop(1, PALETTE.skyLow);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, HORIZON + 60);
    // Sun, upper right, with a soft glow.
    ctx.save();
    ctx.fillStyle = PALETTE.sunGlow;
    ctx.beginPath();
    ctx.arc(1050, 110, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.sun;
    ctx.beginPath();
    ctx.arc(1050, 110, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawClouds(state) {
    for (const cloud of state.clouds) {
      const p = project(cloud.x, cloud.alt, cloud.z, state.alt, state.x);
      const s = cloud.size * (10 + 46 * p.t);
      ctx.fillStyle = PALETTE.cloud;
      ctx.globalAlpha = 0.35 + 0.5 * p.t;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, s, s * 0.36, 0, 0, Math.PI * 2);
      ctx.ellipse(p.x - s * 0.7, p.y + s * 0.1, s * 0.6, s * 0.26, 0, 0, Math.PI * 2);
      ctx.ellipse(p.x + s * 0.7, p.y + s * 0.08, s * 0.65, s * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  /** A distant ridge silhouette: crest from the noise, scaled and hazed by layer. */
  function drawRidge(state, scale, colour, lateralScale) {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.moveTo(0, HORIZON + 4);
    for (let x = 0; x <= W; x += 16) {
      const lateral = (x / W) * 2 - 1;
      const crest = flight.ridgeAt(lateral * lateralScale);
      const y = HORIZON + 4 - crest * 0.22 * scale;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, HORIZON + 4);
    ctx.closePath();
    ctx.fill();
  }

  /** The ground the plane flies over: a profile across the screen, dark below. */
  function drawGround(state) {
    const groundAt = (sx) => {
      const lateral = state.x + ((sx - CX) / CX) * 0.9;
      const crest = flight.ridgeAt(clamp(lateral, -1.4, 1.4));
      return PLANE_Y - (crest - state.alt) * 0.3;
    };
    // Valley floor first: the whole band below the horizon is terrain, not bare canvas.
    const floor = ctx.createLinearGradient(0, HORIZON, 0, H);
    floor.addColorStop(0, PALETTE.groundFar);
    floor.addColorStop(1, PALETTE.ground);
    ctx.fillStyle = floor;
    ctx.fillRect(0, HORIZON + 4, W, H - HORIZON - 4);
    ctx.fillStyle = PALETTE.ridgeNear;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 16) ctx.lineTo(x, groundAt(x));
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    // Valley floor tint where the ground is low and flat: a runway strip appears.
    const centreGround = groundAt(CX);
    if (centreGround > H - 60) {
      ctx.fillStyle = PALETTE.runway;
      ctx.beginPath();
      ctx.moveTo(CX - 26, H);
      ctx.lineTo(CX - 7, centreGround + 26);
      ctx.lineTo(CX + 7, centreGround + 26);
      ctx.lineTo(CX + 26, H);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = PALETTE.runwayEdge;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(CX - 7, centreGround + 26);
      ctx.lineTo(CX - 26, H);
      ctx.moveTo(CX + 7, centreGround + 26);
      ctx.lineTo(CX + 26, H);
      ctx.stroke();
      ctx.strokeStyle = '#f5f0dc';
      ctx.setLineDash([18, 22]);
      ctx.lineDashOffset = -(state.travelled * 14) % 40;
      ctx.beginPath();
      ctx.moveTo(CX, H);
      ctx.lineTo(CX, centreGround + 26);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawRings(state) {
    const sorted = [...state.ringsAhead].sort((a, b) => b.z - a.z);
    for (const ring of sorted) {
      const p = project(ring.x, ring.alt, ring.z, state.alt, state.x);
      if (p.r < 6) continue;
      ctx.save();
      ctx.globalAlpha = 0.45 + 0.55 * p.t;
      ctx.strokeStyle = PALETTE.ringGlow;
      ctx.lineWidth = Math.max(3, p.r * 0.16);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = PALETTE.ring;
      ctx.lineWidth = Math.max(2, p.r * 0.07);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.stroke();
      // Beacon light on top of the ring.
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y - p.r, Math.max(2, p.r * 0.09), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawJet(state, now) {
    const x = CX + state.x * 80;
    const y = PLANE_Y;
    const blink = state.invulnerable > 0 && Math.floor(now * 8) % 2 === 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(state.bank * 0.5);
    if (blink) ctx.globalAlpha = 0.35;
    // Engine flames.
    const flick = 10 + Math.random() * 8;
    ctx.fillStyle = PALETTE.flame;
    ctx.beginPath();
    ctx.moveTo(-16, 26);
    ctx.lineTo(-8, 26 + flick);
    ctx.lineTo(0, 26);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(16, 26);
    ctx.lineTo(8, 26 + flick);
    ctx.lineTo(0, 26);
    ctx.closePath();
    ctx.fill();
    // Swept wings.
    ctx.fillStyle = PALETTE.jetDark;
    ctx.beginPath();
    ctx.moveTo(-8, 6);
    ctx.lineTo(-86, 34);
    ctx.lineTo(-78, 44);
    ctx.lineTo(-6, 22);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8, 6);
    ctx.lineTo(86, 34);
    ctx.lineTo(78, 44);
    ctx.lineTo(6, 22);
    ctx.closePath();
    ctx.fill();
    // Tail fin and stabilisers.
    ctx.fillStyle = PALETTE.jetAccent;
    ctx.beginPath();
    ctx.moveTo(-4, -34);
    ctx.lineTo(-14, -58);
    ctx.lineTo(-2, -58);
    ctx.lineTo(6, -34);
    ctx.closePath();
    ctx.fill();
    // Fuselage, seen from behind.
    const body = ctx.createLinearGradient(-14, -60, 14, 30);
    body.addColorStop(0, '#e8eef4');
    body.addColorStop(0.6, PALETTE.jetBody);
    body.addColorStop(1, PALETTE.jetDark);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(0, -62);
    ctx.quadraticCurveTo(13, -30, 15, 4);
    ctx.quadraticCurveTo(15, 24, 8, 28);
    ctx.lineTo(-8, 28);
    ctx.quadraticCurveTo(-15, 24, -15, 4);
    ctx.quadraticCurveTo(-13, -30, 0, -62);
    ctx.closePath();
    ctx.fill();
    // Canopy glint.
    ctx.fillStyle = PALETTE.jetGlass;
    ctx.beginPath();
    ctx.ellipse(0, -38, 6, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    // Wingtip navigation lights.
    ctx.fillStyle = '#ff5d5d';
    ctx.beginPath();
    ctx.arc(-84, 38, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7dff9a';
    ctx.beginPath();
    ctx.arc(84, 38, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function hudBox(x, label, value, warn) {
    ctx.fillStyle = 'rgba(10, 16, 26, 0.55)';
    ctx.fillRect(x, 14, 132, 56);
    ctx.strokeStyle = warn ? PALETTE.hudDanger : PALETTE.panelEdge;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, 14, 132, 56);
    ctx.fillStyle = PALETTE.hudMuted;
    ctx.font = `600 11px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 10, 32);
    ctx.fillStyle = warn ? PALETTE.hudDanger : PALETTE.hudText;
    ctx.font = `700 22px ${FONT}`;
    ctx.fillText(value, x + 10, 58);
  }

  function drawHud(state, best) {
    const terrain = flight.terrainHeight(state.travelled);
    const lowTerrain = state.alt - terrain < 150;
    hudBox(16, 'ALTITUDE · FT', String(Math.round(state.alt)), lowTerrain);
    hudBox(160, 'SPEED · KTS', String(Math.round(state.speed)), false);
    hudBox(304, 'HEADING', `${String(Math.round(state.heading)).padStart(3, '0')}°`, false);
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.hudMuted;
    ctx.font = `600 11px ${FONT}`;
    ctx.fillText('SCORE', W - 16, 32);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = `700 26px ${FONT}`;
    ctx.fillText(String(state.score), W - 16, 60);
    ctx.fillStyle = PALETTE.hudMuted;
    ctx.font = `600 12px ${FONT}`;
    ctx.fillText(`RINGS ${state.rings} · BEST ${best} · ${state.distance.toFixed(1)} NM`, W - 16, 84);
    // Lives as small jets.
    for (let i = 0; i < state.lives; i += 1) {
      const lx = W - 30 - i * 26;
      ctx.fillStyle = PALETTE.jetAccent;
      ctx.beginPath();
      ctx.moveTo(lx, 100);
      ctx.lineTo(lx - 8, 112);
      ctx.lineTo(lx + 8, 112);
      ctx.closePath();
      ctx.fill();
    }
    if (lowTerrain) {
      ctx.fillStyle = state.invulnerable > 0 ? PALETTE.hudDanger : PALETTE.hudWarn;
      ctx.font = `700 20px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('▲ TERRAIN ▲', CX, 108);
    }
    if (state.combo > 1) {
      ctx.fillStyle = PALETTE.ringHit;
      ctx.font = `700 18px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(`COMBO ×${state.combo}`, CX, 132);
    }
    // Floating points popup right above the jet after a ring.
    if (state.popup && state.elapsed < state.popup.until) {
      const age = state.popup.until - state.elapsed;
      ctx.globalAlpha = Math.min(1, age / 0.4);
      ctx.fillStyle = PALETTE.ringHit;
      ctx.font = `800 26px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(state.popup.text, CX + state.x * 80, PLANE_Y - 110);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'left';
  }

  function drawInstruments(state) {
    const y0 = H - 92;
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(0, y0, W, 92);
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y0);
    ctx.lineTo(W, y0);
    ctx.stroke();
    // Artificial horizon: a circle split sky/ground, tilted by the bank.
    const ix = 120;
    const iy = y0 + 46;
    ctx.save();
    ctx.beginPath();
    ctx.arc(ix, iy, 34, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(ix, iy);
    ctx.rotate(-state.bank * 0.5);
    ctx.fillStyle = '#3f7ec2';
    ctx.fillRect(-34, -34, 68, 34);
    ctx.fillStyle = '#6b4a2a';
    ctx.fillRect(-34, 0, 68, 34);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-34, 0);
    ctx.lineTo(34, 0);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ix, iy, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = PALETTE.hudMuted;
    ctx.font = `600 11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('ATTITUDE', ix, y0 + 88);
    // Altimeter and speed tapes.
    const tape = (x, label, value, unit) => {
      ctx.fillStyle = PALETTE.hudMuted;
      ctx.font = `600 11px ${FONT}`;
      ctx.fillText(label, x, y0 + 18);
      ctx.fillStyle = PALETTE.hudText;
      ctx.font = `700 24px ${FONT}`;
      ctx.fillText(value, x, y0 + 48);
      ctx.fillStyle = PALETTE.hudMuted;
      ctx.font = `600 11px ${FONT}`;
      ctx.fillText(unit, x, y0 + 70);
    };
    tape(300, 'ALTITUDE', String(Math.round(state.alt)), 'FEET');
    tape(460, 'SPEED', String(Math.round(state.speed)), 'KNOTS');
    tape(620, 'LEVEL', String(state.level), `RINGS ${state.rings}`);
    // Throttle bar.
    ctx.fillStyle = PALETTE.hudMuted;
    ctx.font = `600 11px ${FONT}`;
    ctx.fillText('THROTTLE', 800, y0 + 18);
    ctx.fillStyle = '#202a3a';
    ctx.fillRect(800, y0 + 28, 180, 12);
    ctx.fillStyle = PALETTE.jetAccent;
    ctx.fillRect(800, y0 + 28, 180 * (0.55 + state.level * 0.04), 12);
    ctx.fillStyle = PALETTE.hudMuted;
    ctx.font = `600 11px ${FONT}`;
    ctx.fillText('RINGS FLY THROUGH TO SCORE — ARROWS/WASD TO FLY', 800, y0 + 70);
    ctx.textAlign = 'left';
  }

  function overlay(title, lines) {
    ctx.fillStyle = 'rgba(8, 12, 20, 0.78)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = `800 64px ${FONT}`;
    ctx.fillText(title, CX, 250);
    ctx.font = `400 20px ${FONT}`;
    ctx.fillStyle = PALETTE.hudMuted;
    let y = 300;
    for (const line of lines) {
      ctx.fillText(line, CX, y);
      y += 34;
    }
    ctx.textAlign = 'left';
  }

  function draw(state, screen, best, now) {
    drawSky(state);
    drawClouds(state);
    drawRidge(state, 0.35, PALETTE.ridgeFar, 0.4);
    drawRidge(state, 0.6, PALETTE.ridgeMid, 0.7);
    drawGround(state);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawRings(state);
    drawJet(state, now);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) {
      drawHud(state, best);
      drawInstruments(state);
    }
    // Crash flash while the plane is invulnerable after a hit — only while flying,
    // so it never tints the game-over screen.
    if (screen === SCREEN_PLAY && state.invulnerable > 1.6) {
      ctx.fillStyle = 'rgba(255, 60, 60, 0.18)';
      ctx.fillRect(0, 0, W, H);
    }
    if (screen === SCREEN_TITLE) {
      overlay('RIDGE RUNNER', [
        'Fly the valley. Thread the rings. Mind the mountains.',
        '← → or A / D steer · ↑ ↓ or W / S climb and dive · mouse steers too',
        'A ring is worth 100 × your combo. Three lives. Terrain is not forgiving.',
        `Best score: ${best}`,
        'Press SPACE or click to fly',
      ]);
    } else if (screen === SCREEN_PAUSED) {
      overlay('PAUSED', ['Press P or SPACE to keep flying']);
    } else if (screen === SCREEN_OVER) {
      overlay('OUT OF LIVES', [
        `Score ${state.score} · rings ${state.rings} · best combo ×${state.bestCombo} · ${state.distance.toFixed(1)} NM`,
        `Best score: ${best}`,
        'Press SPACE or click to fly again',
      ]);
    }
  }

  return { draw, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER };
}
