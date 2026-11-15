// entities.js — everything that moves: enemies, bolts, orbs, particles and
// floating combat text. The factory builds each enemy kind from one stat
// table; behaviour lives in updateEnemy, called once per frame by the engine.

// Base stats per enemy kind. Score is the base value before the combo
// multiplier; coreDmg is what the Astrolabe loses when one reaches it.
const ENEMY_STATS = {
  mote: { hp: 18, speed: 165, r: 11, score: 50, coreDmg: 4 },
  crawler: { hp: 42, speed: 62, r: 16, score: 80, coreDmg: 8 },
  sentinel: { hp: 95, speed: 78, r: 19, score: 150, coreDmg: 10 },
  weaver: { hp: 58, speed: 88, r: 15, score: 140, coreDmg: 6 },
  juggernaut: { hp: 330, speed: 42, r: 28, score: 400, coreDmg: 16 },
};

function makeEnemy(kind, x, y) {
  const s = ENEMY_STATS[kind];
  return {
    kind: kind,
    x: x,
    y: y,
    vx: 0,
    vy: 0,
    hp: s.hp,
    maxHp: s.hp,
    r: s.r,
    speed: s.speed,
    score: s.score,
    coreDmg: s.coreDmg,
    facing: Math.atan2(CY - y, CX - x),
    slowUntil: 0,
    burnUntil: 0,
    burnDps: 0,
    flash: 0,
    t: 0,
    teleportIn: rand(2.5, 4.5),
    shotIn: rand(1.5, 3),
    wobble: rand(0, Math.PI * 2),
  };
}

// Spawn point on the arena edge, in a random direction from the core.
function edgeSpawn() {
  const a = rand(0, Math.PI * 2);
  const r = ARENA_R + rand(20, 70);
  return { x: clamp(CX + Math.cos(a) * r, 24, W - 24), y: clamp(CY + Math.sin(a) * r, 24, H - 24) };
}

// The boss: a clockwork serpent of 7 segments orbiting the outer ring, with
// 3 destructible armor nodes riding segments 1, 3 and 5.
function makeBoss() {
  const nodes = [1, 3, 5].map(function (seg) {
    return { seg: seg, hp: BOSS.nodeHp, maxHp: BOSS.nodeHp, dead: false };
  });
  return {
    kind: 'leviathan',
    x: CX,
    y: CY - BOSS.orbitR,
    vx: 0,
    vy: 0,
    hp: BOSS.hp,
    maxHp: BOSS.hp,
    r: 34,
    speed: 0,
    score: 5000,
    coreDmg: 12,
    facing: 0,
    slowUntil: 0,
    burnUntil: 0,
    burnDps: 0,
    flash: 0,
    t: 0,
    teleportIn: 0,
    shotIn: 0,
    wobble: 0,
    orbitAngle: -Math.PI / 2,
    segments: [],
    nodes: nodes,
    flareIn: 6,
    flareState: 0, // 0 idle, 1 telegraph, 2 sweeping
    flareT: 0,
    flareAngle: 0,
    spawnIn: BOSS.spawnEvery,
  };
}

// Serpent segment positions: the head leads on the orbit and each segment
// trails behind it along the same circle.
function bossSegments(boss) {
  const segs = [];
  for (let i = 0; i < BOSS.segments; i++) {
    const a = boss.orbitAngle - i * 0.16;
    segs.push({ x: CX + Math.cos(a) * BOSS.orbitR, y: CY + Math.sin(a) * BOSS.orbitR, r: 30 - i * 2 });
  }
  return segs;
}

function makeParticle(x, y, color, speed, life, shape, size) {
  const a = rand(0, Math.PI * 2);
  const s = rand(speed * 0.3, speed);
  return {
    x: x,
    y: y,
    vx: Math.cos(a) * s,
    vy: Math.sin(a) * s,
    life: life,
    maxLife: life,
    size: size || rand(2, 4),
    color: color,
    shape: shape || 0,
    rot: rand(0, Math.PI * 2),
    vr: rand(-6, 6),
  };
}

function burst(particles, x, y, color, n, speed, life, shape) {
  for (let i = 0; i < n; i++) particles.push(makeParticle(x, y, color, speed, life * rand(0.6, 1.2), shape));
}

function makeFloatText(x, y, text, color, size) {
  return { x: x, y: y, text: text, color: color, life: 0.9, size: size || 15 };
}

function makeBolt(x, y, angle) {
  return {
    x: x,
    y: y,
    vx: Math.cos(angle) * PLAYER.boltSpeed,
    vy: Math.sin(angle) * PLAYER.boltSpeed,
    life: 1.1,
  };
}

function makeOrb(x, y, tx, ty) {
  const a = Math.atan2(ty - y, tx - x);
  const sp = 110;
  return { x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 9, life: 9 };
}

// Steer one enemy toward the core for dt seconds. Returns nothing; the
// engine reads the enemy's position and velocity afterwards.
function updateEnemy(e, dt, now, orbs, coreX, coreY) {
  e.t += dt;
  if (e.flash > 0) e.flash = Math.max(0, e.flash - dt * 5);
  // Amber burn ticks down here so every damage path shares one rule.
  if (e.burnUntil > now) {
    e.hp -= e.burnDps * dt;
  }
  const slow = e.slowUntil > now ? PHASES[0].slow : 1;
  const dx = coreX - e.x;
  const dy = coreY - e.y;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  const sp = e.speed * slow;
  let mx = (dx / d) * sp;
  let my = (dy / d) * sp;

  if (e.kind === 'mote') {
    // Fast swarmers wobble as they close in.
    const w = Math.sin(e.t * 5 + e.wobble) * 40;
    mx += (-dy / d) * w * 0.4;
    my += (dx / d) * w * 0.4;
  } else if (e.kind === 'weaver') {
    // Rift Weavers blink away and lob slow void orbs at the core.
    e.teleportIn -= dt;
    if (e.teleportIn <= 0) {
      e.teleportIn = rand(3.5, 5.5);
      const p = edgeSpawn();
      e.x = p.x;
      e.y = p.y;
    }
    e.shotIn -= dt;
    if (e.shotIn <= 0) {
      e.shotIn = rand(2.5, 4);
      orbs.push(makeOrb(e.x, e.y, coreX, coreY));
    }
  }
  // Sentinels and Juggernauts move straight; their flavour is in damage.
  e.vx = mx;
  e.vy = my;
  e.x += mx * dt;
  e.y += my * dt;
  e.facing = Math.atan2(my, mx);
}
