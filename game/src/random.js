// A small seeded random number generator (mulberry32): the same seed gives the same
// game, which is what makes the screenshot scenes repeatable.

export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * One-dimensional value noise: a smooth, deterministic height for any distance, built
 * from hashed lattice points so the same seed always draws the same mountains.
 */
export function createNoise(seed) {
  const hash = (i) => {
    let h = (i * 374761393 + seed * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (((h ^ (h >>> 16)) >>> 0) / 4294967296) * 2 - 1;
  };
  const smooth = (t) => t * t * (3 - 2 * t);
  return function noise(x) {
    const i = Math.floor(x);
    const f = x - i;
    return hash(i) * (1 - smooth(f)) + hash(i + 1) * smooth(f);
  };
}
