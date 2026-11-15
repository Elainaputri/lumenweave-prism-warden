// prism-optics.js — tri-chromatic refraction: the heart of the game.
// A beam fired from the Aether Loom travels until it hits a Refraction
// Prism; the prism splits it into angled sub-beams and each bounce shifts
// the chromatic phase (Cyan slows, Amber ignites, Magenta arcs lightning).
// Sub-beams can chain to a nearby prism, so three well-placed prisms turn
// one beam into a web of light. Pure geometry — no state of its own: the
// engine owns the prisms array and asks for the beam path each frame.

// Place a prism at (x, y). At most PRISM.max are active; placing one more
// repositions the oldest, so the player is always rearranging, never hoarding.
function placePrism(prisms, x, y, now) {
  const p = { x: clamp(x, 30, W - 30), y: clamp(y, 30, H - 30), angle: 0, placedAt: now, flash: 1 };
  if (prisms.length < PRISM.max) {
    prisms.push(p);
  } else {
    let oldest = 0;
    for (let i = 1; i < prisms.length; i++) {
      if (prisms[i].placedAt < prisms[oldest].placedAt) oldest = i;
    }
    prisms[oldest] = p;
  }
  return p;
}

// Trace one beam from (ox, oy) along `angle` and return its segments.
// A segment ends at a prism hit (then it splits), at an arena wall, or at
// beam range. Depth caps the recursion so a prism triangle cannot loop
// forever; `visited` stops the same prism being hit twice by one beam.
function traceBeam(prisms, ox, oy, angle, depth, visited, out) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let bestT = PLAYER.beamRange;
  let bestPrism = -1;
  for (let i = 0; i < prisms.length; i++) {
    if (visited.indexOf(i) !== -1) continue;
    const t = rayCircle(ox, oy, dx, dy, prisms[i].x, prisms[i].y, PRISM.r + 4);
    if (t >= 0 && t < bestT) {
      bestT = t;
      bestPrism = i;
    }
  }
  // Clip the segment to the arena rectangle so beams stop at the glass.
  const wallT = wallDistance(ox, oy, dx, dy);
  if (wallT >= 0 && wallT < bestT) {
    bestT = wallT;
    bestPrism = -1;
  }
  const x2 = ox + dx * bestT;
  const y2 = oy + dy * bestT;
  out.push({ x1: ox, y1: oy, x2: x2, y2: y2, phase: depth % 3, depth: depth });
  if (bestPrism === -1 || depth >= PRISM.maxDepth) return out;
  prisms[bestPrism].flash = 1;
  const nextVisited = visited.concat([bestPrism]);
  // Split: two sub-beams angled either side of the incoming beam.
  traceBeam(prisms, prisms[bestPrism].x, prisms[bestPrism].y, angle + PRISM.splitAngle, depth + 1, nextVisited, out);
  traceBeam(prisms, prisms[bestPrism].x, prisms[bestPrism].y, angle - PRISM.splitAngle, depth + 1, nextVisited, out);
  // Chain: a prism close enough to this one catches a straight relay beam.
  for (let i = 0; i < prisms.length; i++) {
    if (i === bestPrism || visited.indexOf(i) !== -1) continue;
    const d = dist(prisms[bestPrism].x, prisms[bestPrism].y, prisms[i].x, prisms[i].y);
    if (d < PRISM.chainRange) {
      const a = Math.atan2(prisms[i].y - prisms[bestPrism].y, prisms[i].x - prisms[bestPrism].x);
      traceBeam(prisms, prisms[bestPrism].x, prisms[bestPrism].y, a, depth + 1, nextVisited, out);
      break;
    }
  }
  return out;
}

// Distance along the ray to the arena's glass walls (40px margin), or -1.
function wallDistance(ox, oy, dx, dy) {
  let best = -1;
  const m = 40;
  if (dx > 0.0001) best = (W - m - ox) / dx;
  else if (dx < -0.0001) best = (m - ox) / dx;
  if (dy > 0.0001) {
    const t = (H - m - oy) / dy;
    if (t >= 0 && (best < 0 || t < best)) best = t;
  } else if (dy < -0.0001) {
    const t = (m - oy) / dy;
    if (t >= 0 && (best < 0 || t < best)) best = t;
  }
  return best;
}

// Apply one beam segment's damage to every enemy it touches, and return how
// many it hit. `onHit` receives (enemy, phase, damage) so the engine can
// apply the chromatic effects and the floating numbers.
function damageBeamSegment(seg, enemies, dps, dt, onHit) {
  let hits = 0;
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    if (segDist(e.x, e.y, seg.x1, seg.y1, seg.x2, seg.y2) < e.r + 7) {
      const dmg = dps * dt;
      onHit(e, seg.phase, dmg);
      hits++;
    }
  }
  return hits;
}
