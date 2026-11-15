// math-utils.js — small pure helpers: clamping, angles, a seeded RNG, and
// the segment geometry the refraction code and the hit tests share.

// Seeded RNG (mulberry32) — deterministic when the URL carries ?seed=, so
// screenshot mode renders identically on every run.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The game's live RNG. Engine reseeds it at boot (from ?seed= or the clock).
let rng = mulberry32(1);

function rand(a, b) {
  return a + rng() * (b - a);
}

function randInt(a, b) {
  return Math.floor(rand(a, b + 1));
}

function pick(arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function dist2(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

function dist(ax, ay, bx, by) {
  return Math.sqrt(dist2(ax, ay, bx, by));
}

// Shortest distance from point (px,py) to segment (x1,y1)-(x2,y2).
function segDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
  t = clamp(t, 0, 1);
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.sqrt(dist2(px, py, cx, cy));
}

// Smallest signed angle from a to b, in (-PI, PI].
function angleDiff(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

// Ray (ox,oy) + t*(dx,dy) against a circle: returns the smallest t >= 0 of
// the hit, or -1 when the ray misses. Used to find the prism a beam hits.
function rayCircle(ox, oy, dx, dy, cx, cy, r) {
  const ex = cx - ox;
  const ey = cy - oy;
  const tca = ex * dx + ey * dy;
  if (tca < 0) return -1;
  const d2 = ex * ex + ey * ey - tca * tca;
  if (d2 > r * r) return -1;
  return tca - Math.sqrt(r * r - d2);
}
