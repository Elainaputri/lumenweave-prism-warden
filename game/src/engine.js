// engine.js — the game itself: state, input, the main loop, combat,
// cycles, the boss fight, scoring, and the deterministic screenshot mode
// (?shot=title|play|intense|gameover|victory&seed=1) used for the entry's renders.

// ---- State ----

function freshState() {
  return {
    state: 'title', // title | play | paused | victory | over
    time: 0,
    frozen: false, // screenshot mode: render one frozen frame
    coreHp: CORE.hpMax,
    energy: PLAYER.energyMax,
    score: 0,
    combo: 0,
    multiplier: 1,
    maxCombo: 0,
    maxMultiplier: 1,
    resonance: 0,
    cycle: 0,
    queue: [],
    cycleTotal: 1,
    enemies: [],
    boss: null,
    prisms: [],
    bolts: [],
    orbs: [],
    particles: [],
    texts: [],
    beamSegs: [],
    beaming: false,
    beamHoldT: 0,
    convergenceT: 0,
    dashCd: 0,
    dashT: 0,
    shake: 0,
    hitStop: 0,
    banner: '',
    bannerT: 0,
    intermissionT: 0,
    chimeCd: 0,
    shotsFired: 0,
    shotsHit: 0,
    ricochetKills: 0,
    cyclesCleared: 0,
    prismsPlaced: 0,
    player: {
      x: CX,
      y: CY + 140,
      vx: 0,
      vy: 0,
      aim: -Math.PI / 2,
      hull: PLAYER.hullMax,
      dead: false,
      respawnT: 0,
      invulnT: 0,
      lastHurt: -9,
    },
    mouse: { x: CX, y: CY - 120, left: false, pressT: 0 },
    keys: {},
    audio: new AudioEngine(),
  };
}

let G = freshState();
let canvas = null;
let ctx = null;

// ---- Run control ----

function startRun() {
  const audio = G.audio;
  G = freshState();
  G.audio = audio;
  G.state = 'play';
  startCycle(0);
}

function startCycle(n) {
  G.cycle = n;
  G.queue = buildQueue(n);
  G.cycleTotal = G.queue.length + (n === 4 ? 1 : 0);
  G.banner = CYCLES[n].name;
  G.bannerT = 2.6;
  if (n === 4) {
    G.boss = makeBoss();
    G.audio.horn();
  }
}

function nextCycle() {
  G.cyclesCleared = G.cycle + 1;
  if (G.cycle >= 4) return;
  startCycle(G.cycle + 1);
}

function endRun(victory) {
  G.state = victory ? 'victory' : 'over';
  G.beaming = false;
  G.beamSegs = []; // no stray beam across the end screen
  G.banner = ''; // no stale cycle banner over the end screen
  G.bannerT = 0;
  G.audio.beamStop();
  if (victory) {
    G.audio.shatter();
    burst(G.particles, CX, CY, COL.amber, 60, 320, 1.4, 1);
  }
}

// ---- Combat helpers ----

function addScore(base, x, y, label) {
  const gained = base * G.multiplier;
  G.score += gained;
  G.texts.push(makeFloatText(x, y - 10, '+' + gained, '#ffe9a8', 16));
  if (label) G.texts.push(makeFloatText(x, y - 30, label, COL.dim, 12));
}

function registerKill(e, ricochet) {
  G.combo += 1;
  G.maxCombo = Math.max(G.maxCombo, G.combo);
  G.multiplier = Math.min(COMBO_MAX, 1 + Math.floor(G.combo / COMBO_STEP));
  G.maxMultiplier = Math.max(G.maxMultiplier, G.multiplier);
  G.resonance = Math.min(100, G.resonance + RESONANCE_PER_KILL);
  if (ricochet) G.ricochetKills += 1;
  addScore(e.score, e.x, e.y, G.multiplier > 1 ? 'x' + G.multiplier : '');
  burst(G.particles, e.x, e.y, enemyColor(e.kind), 14, 200, 0.7, 1);
  G.audio.chime(G.combo);
}

function damageEnemy(e, dmg, fromAngle, ricochet) {
  if (e.hp <= 0) return;
  // Mirror Sentinels: a frontal hit is mostly deflected — flank them,
  // ideally with a prism ricochet coming from another direction.
  if (e.kind === 'sentinel' && fromAngle !== null) {
    if (Math.abs(angleDiff(e.facing, fromAngle)) < 1.0) {
      dmg *= 0.2;
      G.texts.push(makeFloatText(e.x, e.y - e.r - 6, 'SHIELDED', COL.cyan, 12));
    }
  }
  e.hp -= dmg;
  e.flash = 1;
  if (e.hp <= 0) registerKill(e, ricochet);
}

function applyChromatic(e, phase, now) {
  const ph = PHASES[phase];
  if (ph.slow < 1) e.slowUntil = now + 2;
  if (ph.burn > 0) {
    e.burnUntil = now + 3;
    e.burnDps = ph.burn;
  }
  if (ph.arc > 0) {
    // Magenta arcs lightning to up to 2 nearby enemies.
    let chained = 0;
    for (const o of G.enemies) {
      if (o === e || o.hp <= 0 || chained >= ph.arc) continue;
      if (dist(e.x, e.y, o.x, o.y) < 150) {
        o.hp -= 12;
        o.flash = 1;
        G.texts.push(makeFloatText(o.x, o.y - o.r - 4, '12', COL.magenta, 13));
        if (o.hp <= 0) registerKill(o, true);
        chained++;
      }
    }
  }
}

function hurtCore(dmg, x, y) {
  G.coreHp -= dmg;
  G.combo = 0;
  G.multiplier = 1;
  G.shake = Math.max(G.shake, 9);
  G.audio.coreHit();
  burst(G.particles, x, y, COL.danger, 16, 240, 0.8, 1);
  G.texts.push(makeFloatText(x, y - 20, '-' + dmg + ' CORE', COL.danger, 15));
  if (G.coreHp <= 0) {
    G.coreHp = 0;
    endRun(false);
  }
}

function hurtPlayer(dmg) {
  const p = G.player;
  if (p.invulnT > 0 || p.dashT > 0 || p.dead) return;
  p.hull -= dmg;
  p.invulnT = 0.7;
  p.lastHurt = G.time;
  G.shake = Math.max(G.shake, 6);
  if (p.hull <= 0) {
    p.hull = 0;
    p.dead = true;
    p.respawnT = 2;
    G.combo = 0;
    G.multiplier = 1;
    burst(G.particles, p.x, p.y, COL.cyan, 30, 300, 1, 1);
    G.audio.shatter();
  }
}

// ---- Player actions ----

function fireBolt() {
  const p = G.player;
  if (p.dead || G.energy < PLAYER.boltEnergy) return;
  G.energy -= PLAYER.boltEnergy;
  G.bolts.push(makeBolt(p.x + Math.cos(p.aim) * 20, p.y + Math.sin(p.aim) * 20, p.aim));
  G.shotsFired += 1;
  G.audio.shoot();
}

function doDash() {
  const p = G.player;
  if (G.dashCd > 0 || p.dead) return;
  let dx = 0;
  let dy = 0;
  if (G.keys['arrowup'] || G.keys['w']) dy -= 1;
  if (G.keys['arrowdown'] || G.keys['s']) dy += 1;
  if (G.keys['arrowleft'] || G.keys['a']) dx -= 1;
  if (G.keys['arrowright'] || G.keys['d']) dx += 1;
  if (dx === 0 && dy === 0) {
    dx = Math.cos(p.aim);
    dy = Math.sin(p.aim);
  }
  const len = Math.sqrt(dx * dx + dy * dy);
  p.vx = (dx / len) * PLAYER.dashSpeed;
  p.vy = (dy / len) * PLAYER.dashSpeed;
  p.dashT = PLAYER.dashTime;
  p.invulnT = Math.max(p.invulnT, PLAYER.dashIframes);
  G.dashCd = PLAYER.dashCooldown;
  G.audio.dash();
  burst(G.particles, p.x, p.y, COL.cyan, 10, 160, 0.5, 0);
  // Radial knockback pulse: shove nearby enemies away and hurt them.
  for (const e of G.enemies) {
    const d = dist(p.x, p.y, e.x, e.y);
    if (d < PLAYER.dashPulseR + e.r) {
      const a = Math.atan2(e.y - p.y, e.x - p.x);
      e.x += Math.cos(a) * 46;
      e.y += Math.sin(a) * 46;
      damageEnemy(e, PLAYER.dashPulseDmg, null, false);
    }
  }
}

function doConvergence() {
  if (G.resonance < 100 || G.convergenceT > 0 || G.prisms.length < 2) return;
  G.resonance = 0;
  G.convergenceT = 4;
  G.audio.convergence();
  G.shake = Math.max(G.shake, 5);
  G.texts.push(makeFloatText(CX, CY - 90, 'SOLAR CONVERGENCE', COL.magenta, 22));
}

// ---- Boss ----

function updateBoss(dt) {
  const b = G.boss;
  if (!b || b.hp <= 0) return;
  b.t += dt;
  const slow = b.slowUntil > G.time ? PHASES[0].slow : 1;
  b.orbitAngle += BOSS.orbitSpeed * slow * dt;
  if (b.burnUntil > G.time) b.hp -= b.burnDps * dt;
  const segs = bossSegments(b);
  b.x = segs[0].x;
  b.y = segs[0].y;
  b.facing = b.orbitAngle + Math.PI / 2;
  // Solar-flare sweep: telegraph, then a rotating damage sector.
  b.flareIn -= dt;
  if (b.flareState === 0 && b.flareIn <= 0) {
    b.flareState = 1;
    b.flareT = BOSS.flareTelegraph;
    b.flareAngle = Math.atan2(G.player.y - CY, G.player.x - CX);
    G.audio.horn();
  } else if (b.flareState === 1) {
    b.flareT -= dt;
    if (b.flareT <= 0) {
      b.flareState = 2;
      b.flareT = BOSS.flareSweep;
    }
  } else if (b.flareState === 2) {
    b.flareT -= dt;
    b.flareAngle += 1.1 * dt;
    const p = G.player;
    if (!p.dead) {
      const pa = Math.atan2(p.y - CY, p.x - CX);
      const pd = dist(p.x, p.y, CX, CY);
      if (pd > 70 && Math.abs(angleDiff(pa, b.flareAngle)) < 0.32) hurtPlayer(22);
    }
    if (b.flareT <= 0) {
      b.flareState = 0;
      b.flareIn = BOSS.flareEvery;
    }
  }
  // Minion spawns from the serpent's head.
  b.spawnIn -= dt;
  if (b.spawnIn <= 0) {
    b.spawnIn = BOSS.spawnEvery;
    for (let i = 0; i < 3; i++) {
      G.enemies.push(makeEnemy('mote', b.x + rand(-40, 40), b.y + rand(-40, 40)));
    }
  }
  if (b.hp <= 0) {
    b.hp = 0;
    G.hitStop = 0.09;
    G.shake = 14;
    burst(G.particles, b.x, b.y, COL.danger, 50, 380, 1.6, 1);
    burst(G.particles, b.x, b.y, COL.amber, 40, 300, 1.4, 2);
    G.cyclesCleared = 5;
    endRun(true);
  }
}

// A point hit against the boss: nodes first (they are the weak points),
// then the serpent's body. Returns true when something was hit.
function hitBoss(x, y, dmg, fromAngle) {
  const b = G.boss;
  if (!b || b.hp <= 0) return false;
  const segs = bossSegments(b);
  for (const n of b.nodes) {
    if (n.dead) continue;
    const s = segs[n.seg];
    if (dist(x, y, s.x, s.y) < 16) {
      n.hp -= dmg;
      if (n.hp <= 0) {
        n.dead = true;
        b.hp -= BOSS.nodeDmg;
        G.hitStop = 0.025; // 25ms hit-stop on node destruction
        G.shake = Math.max(G.shake, 10);
        G.score += 500 * G.multiplier;
        G.audio.shatter();
        burst(G.particles, s.x, s.y, '#ffd76a', 26, 320, 1, 1);
        G.texts.push(makeFloatText(s.x, s.y - 20, 'NODE SHATTERED', '#ffd76a', 17));
        if (b.hp <= 0) updateBoss(0);
      }
      return true;
    }
  }
  for (const s of segs) {
    if (dist(x, y, s.x, s.y) < s.r) {
      b.hp -= dmg;
      b.flash = 1;
      return true;
    }
  }
  return false;
}

// ---- Update ----

function update(dt) {
  G.time += dt;
  const p = G.player;
  if (G.bannerT > 0) G.bannerT -= dt;
  if (G.chimeCd > 0) G.chimeCd -= dt;
  G.shake = Math.max(0, G.shake - dt * 26);
  if (G.dashCd > 0) G.dashCd -= dt;
  if (G.dashT > 0) G.dashT -= dt;
  if (p.invulnT > 0) p.invulnT -= dt;

  // Player respawn.
  if (p.dead) {
    p.respawnT -= dt;
    if (p.respawnT <= 0) {
      p.dead = false;
      p.hull = PLAYER.hullMax;
      p.x = CX;
      p.y = CY + 140;
      p.vx = 0;
      p.vy = 0;
      p.invulnT = 1.2;
    }
  }

  // Movement: WASD / arrows with inertia.
  if (!p.dead) {
    let ax = 0;
    let ay = 0;
    if (G.keys['arrowup'] || G.keys['w']) ay -= 1;
    if (G.keys['arrowdown'] || G.keys['s']) ay += 1;
    if (G.keys['arrowleft'] || G.keys['a']) ax -= 1;
    if (G.keys['arrowright'] || G.keys['d']) ax += 1;
    if (ax !== 0 || ay !== 0) {
      const len = Math.sqrt(ax * ax + ay * ay);
      p.vx += (ax / len) * PLAYER.accel * dt;
      p.vy += (ay / len) * PLAYER.accel * dt;
    }
    const damp = Math.exp(-PLAYER.damping * dt);
    p.vx *= damp;
    p.vy *= damp;
    const sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (sp > PLAYER.maxSpeed && G.dashT <= 0) {
      p.vx = (p.vx / sp) * PLAYER.maxSpeed;
      p.vy = (p.vy / sp) * PLAYER.maxSpeed;
    }
    p.x = clamp(p.x + p.vx * dt, 24, W - 24);
    p.y = clamp(p.y + p.vy * dt, 24, H - 24);
    p.aim = Math.atan2(G.mouse.y - p.y, G.mouse.x - p.x);
    if (G.time - p.lastHurt > 3 && p.hull < PLAYER.hullMax) {
      p.hull = Math.min(PLAYER.hullMax, p.hull + PLAYER.hullRegen * dt);
    }
  }

  // Firing: a tap fires a Solar Bolt; holding past 0.18s channels the beam.
  G.beaming = false;
  if (G.mouse.left && !p.dead) {
    G.beamHoldT += dt;
    if (G.beamHoldT > 0.18 && G.energy > 1) {
      G.beaming = true;
      G.energy = Math.max(0, G.energy - PLAYER.beamDrain * dt);
      G.audio.beamStart();
    }
  } else {
    G.beamHoldT = 0;
    G.audio.beamStop();
  }
  if (!G.beaming) {
    G.energy = Math.min(PLAYER.energyMax, G.energy + PLAYER.energyRecharge * dt);
    G.beamSegs = [];
  } else {
    const segs = traceBeam(G.prisms, p.x, p.y, p.aim, 0, [], []);
    G.beamSegs = segs;
    let prismTouched = false;
    for (const s of segs) {
      if (s.depth > 0) prismTouched = true;
      damageBeamSegment(s, G.enemies, PLAYER.beamDps, dt, function (e, phase, dmg) {
        damageEnemy(e, dmg, null, s.depth > 0);
        applyChromatic(e, phase, G.time);
      });
      // The beam also bites the boss and its nodes.
      const b = G.boss;
      if (b && b.hp > 0) {
        if (segDist(b.x, b.y, s.x1, s.y1, s.x2, s.y2) < 40) {
          b.hp -= PLAYER.beamDps * dt;
          applyChromatic(b, s.phase, G.time);
        }
      }
    }
    if (prismTouched && G.chimeCd <= 0) {
      G.audio.chime(G.combo);
      G.chimeCd = 0.3;
    }
  }

  // Convergence web: every edge between prisms burns what it touches.
  if (G.convergenceT > 0) {
    G.convergenceT -= dt;
    const ps = G.prisms;
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        for (const e of G.enemies) {
          if (e.hp > 0 && segDist(e.x, e.y, ps[i].x, ps[i].y, ps[j].x, ps[j].y) < e.r + 10) {
            damageEnemy(e, 130 * dt, null, true);
          }
        }
      }
    }
  }

  // Spawn queue.
  if (G.queue.length > 0) {
    G.queue[0].at -= dt;
    while (G.queue.length > 0 && G.queue[0].at <= 0) {
      const s = G.queue.shift();
      const pos = edgeSpawn();
      G.enemies.push(makeEnemy(s.kind, pos.x, pos.y));
    }
  }

  // Enemies.
  for (const e of G.enemies) updateEnemy(e, dt, G.time, G.orbs, CX, CY);
  updateBoss(dt);

  // Bolts.
  for (let i = G.bolts.length - 1; i >= 0; i--) {
    const b = G.bolts[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0 || b.x < 0 || b.x > W || b.y < 0 || b.y > H;
    if (!dead) {
      for (const e of G.enemies) {
        if (e.hp > 0 && dist(b.x, b.y, e.x, e.y) < e.r + 4) {
          G.shotsHit += 1;
          damageEnemy(e, PLAYER.boltDmg, Math.atan2(b.vy, b.vx), false);
          G.audio.hit();
          dead = true;
          break;
        }
      }
    }
    if (!dead && hitBoss(b.x, b.y, PLAYER.boltDmg, Math.atan2(b.vy, b.vx))) {
      G.shotsHit += 1;
      dead = true;
    }
    if (dead) G.bolts.splice(i, 1);
  }

  // Enemy orbs.
  for (let i = G.orbs.length - 1; i >= 0; i--) {
    const o = G.orbs[i];
    o.x += o.vx * dt;
    o.y += o.vy * dt;
    o.life -= dt;
    let dead = o.life <= 0;
    if (!dead && dist(o.x, o.y, CX, CY) < CORE_R + o.r) {
      hurtCore(5, o.x, o.y);
      dead = true;
    }
    if (!dead && !p.dead && dist(o.x, o.y, p.x, p.y) < p.r + o.r) {
      hurtPlayer(10);
      dead = true;
    }
    if (dead) G.orbs.splice(i, 1);
  }

  // Enemies reaching the core, or ramming the player.
  for (let i = G.enemies.length - 1; i >= 0; i--) {
    const e = G.enemies[i];
    if (e.hp <= 0) {
      G.enemies.splice(i, 1);
      continue;
    }
    if (dist(e.x, e.y, CX, CY) < CORE_R + e.r) {
      hurtCore(e.coreDmg, e.x, e.y);
      G.enemies.splice(i, 1);
      continue;
    }
    if (!p.dead && dist(e.x, e.y, p.x, p.y) < e.r + p.r) {
      if (p.dashT > 0) {
        const a = Math.atan2(e.y - p.y, e.x - p.x);
        e.x += Math.cos(a) * 30;
        e.y += Math.sin(a) * 30;
        damageEnemy(e, PLAYER.dashPulseDmg, null, false);
      } else {
        hurtPlayer(8);
        damageEnemy(e, 12, null, false);
        const a = Math.atan2(e.y - p.y, e.x - p.x);
        e.x += Math.cos(a) * 18;
        e.y += Math.sin(a) * 18;
      }
    }
  }

  // Particles and floating text.
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const pt = G.particles[i];
    pt.life -= dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 0.98;
    pt.vy *= 0.98;
    pt.rot += pt.vr * dt;
    if (pt.life <= 0) G.particles.splice(i, 1);
  }
  for (let i = G.texts.length - 1; i >= 0; i--) {
    const t = G.texts[i];
    t.life -= dt;
    t.y -= 34 * dt;
    if (t.life <= 0) G.texts.splice(i, 1);
  }
  for (const pr of G.prisms) {
    pr.angle += dt * 0.4;
    if (pr.flash > 0) pr.flash = Math.max(0, pr.flash - dt * 2.5);
  }

  // Cycle cleared? Brief intermission, then the next Astral Cycle.
  if (G.state === 'play' && G.intermissionT <= 0 && cycleCleared(G.queue, G.enemies, G.boss)) {
    if (G.cycle < 4) {
      G.intermissionT = 3;
      G.banner = 'Cycle Cleared — the weave holds';
      G.bannerT = 2.6;
    }
  }
  if (G.intermissionT > 0) {
    G.intermissionT -= dt;
    if (G.intermissionT <= 0) nextCycle();
  }
}

// ---- Screenshot mode (deterministic renders for the entry) ----

// A simple scripted pilot so ?shot= renders show real gameplay, not an
// empty arena: aim at the nearest enemy, fire bolts, channel the beam
// through the prisms, and dash when the cooldown is ready.
function autoPilot(dt) {
  const p = G.player;
  let best = null;
  let bestD = Infinity;
  for (const e of G.enemies) {
    const d = dist(p.x, p.y, e.x, e.y);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  const target = best || G.boss;
  if (target) {
    G.mouse.x = target.x;
    G.mouse.y = target.y;
    p.aim = Math.atan2(target.y - p.y, target.x - p.x);
    // Strafe in a slow circle so the ship is never static.
    const a = G.time * 0.7;
    G.keys['w'] = Math.sin(a) > 0.3;
    G.keys['s'] = Math.sin(a) < -0.3;
    G.keys['a'] = Math.cos(a) < -0.3;
    G.keys['d'] = Math.cos(a) > 0.3;
    // Alternate: bolt volleys, then a held beam through the prisms.
    if (Math.floor(G.time * 2) % 2 === 0) {
      G.mouse.left = true;
      G.beamHoldT = 0.3; // already past the tap threshold: beam channels
    } else {
      G.mouse.left = false;
      G.beamHoldT = 0;
      if (G.shotsFired < Math.floor(G.time * 5)) fireBolt();
    }
    if (G.dashCd <= 0 && bestD < 140) doDash();
  }
}

function simulate(seconds) {
  const step = 1 / 60;
  const n = Math.round(seconds / step);
  for (let i = 0; i < n; i++) {
    autoPilot(step);
    update(step);
    if (G.state !== 'play') break;
  }
  G.mouse.left = false;
  G.beaming = false;
  G.beamSegs = G.prisms.length ? traceBeam(G.prisms, G.player.x, G.player.y, G.player.aim, 0, [], []) : [];
}

function setupShot(shot) {
  if (shot === 'title') {
    G.state = 'title';
  } else if (shot === 'play') {
    // Early gameplay, refraction on show: two prisms staged within chain
    // range (283 < 300) so the beam splits through both and bites the
    // opening wave, sparks and all.
    startRun();
    placePrism(G.prisms, CX - 170, CY - 90, 0);
    placePrism(G.prisms, CX + 110, CY - 130, 1);
    G.prismsPlaced = 2;
    simulate(6);
    // Freeze a live split beam. Aim at the nearest enemy; if the wave is
    // already cleared, aim through the first prism instead, so the frozen
    // frame always shows a real refraction split, never a plain beam.
    let best = null;
    let bestD = Infinity;
    for (const e of G.enemies) {
      const d = dist(G.player.x, G.player.y, e.x, e.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    if (best) {
      G.player.aim = Math.atan2(best.y - G.player.y, best.x - G.player.x);
    } else if (G.prisms.length) {
      G.player.aim = Math.atan2(G.prisms[0].y - G.player.y, G.prisms[0].x - G.player.x);
    }
    G.beamSegs = traceBeam(G.prisms, G.player.x, G.player.y, G.player.aim, 0, [], []);
    let touched = false;
    for (const s of G.beamSegs) if (s.depth > 0) touched = true;
    if (!touched && G.prisms.length) {
      G.player.aim = Math.atan2(G.prisms[0].y - G.player.y, G.prisms[0].x - G.player.x);
      G.beamSegs = traceBeam(G.prisms, G.player.x, G.player.y, G.player.aim, 0, [], []);
    }
    // Stage the wave ON the refracted beams: one mote on each of the first
    // two post-prism segments, so the split light is visibly biting targets.
    let staged = 0;
    for (const s of G.beamSegs) {
      if (staged >= 2) break;
      if (s.depth < 1) continue;
      const mx = clamp((s.x1 + s.x2) / 2, 60, W - 60);
      const my = clamp((s.y1 + s.y2) / 2, 60, H - 60);
      G.enemies.push(makeEnemy('mote', mx, my));
      burst(G.particles, mx, my, COL.cyan, 6, 120, 0.6, 1);
      staged++;
    }
    for (const p of G.prisms) burst(G.particles, p.x, p.y, COL.cyan, 8, 140, 0.6, 1);
    if (best) G.texts.push(makeFloatText(best.x, best.y - 24, '+100', '#ffe9a8', 16));
    G.combo = 3;
    G.multiplier = 2;
    G.resonance = 24;
  } else if (shot === 'intense') {
    // The boss fight: Cycle V, the Eclipse Leviathan on its orbit with its
    // minions, three prisms live and a beam mid-channel — the busiest frame.
    startRun();
    startCycle(4);
    placePrism(G.prisms, CX - 170, CY - 90, 0);
    placePrism(G.prisms, CX + 150, CY - 110, 1);
    placePrism(G.prisms, CX + 40, CY + 170, 2);
    G.prismsPlaced = 3;
    simulate(11);
    G.combo = 14;
    G.multiplier = 4;
    G.resonance = 64;
    // Keep a beam visibly live in the frozen frame, aimed at the Leviathan.
    if (G.boss && G.boss.hp > 0) {
      G.player.aim = Math.atan2(G.boss.y - G.player.y, G.boss.x - G.player.x);
      G.beamSegs = traceBeam(G.prisms, G.player.x, G.player.y, G.player.aim, 0, [], []);
    }
  } else if (shot === 'gameover') {
    startRun();
    placePrism(G.prisms, CX - 160, CY - 80, 0);
    simulate(7);
    G.score = 12480;
    G.maxCombo = 23;
    G.maxMultiplier = 6;
    G.ricochetKills = 41;
    G.shotsFired = 120;
    G.shotsHit = 86;
    G.cyclesCleared = 3;
    G.prismsPlaced = 9;
    G.coreHp = 0;
    endRun(false);
  } else if (shot === 'victory') {
    // Victory, render-checked: the Leviathan falls and the Core burns
    // bright again. Same boss staging as 'intense', then the run ends in
    // victory with the core restored (it survived) and full-run stats.
    startRun();
    startCycle(4);
    placePrism(G.prisms, CX - 170, CY - 90, 0);
    placePrism(G.prisms, CX + 150, CY - 110, 1);
    placePrism(G.prisms, CX + 40, CY + 170, 2);
    G.prismsPlaced = 3;
    simulate(11);
    G.score = 18640;
    G.maxCombo = 31;
    G.maxMultiplier = 8;
    G.ricochetKills = 57;
    G.shotsFired = 150;
    G.shotsHit = 118;
    G.cyclesCleared = 5;
    G.prismsPlaced = 12;
    G.coreHp = CORE.hpMax;
    if (G.boss) G.boss.hp = 0;
    endRun(true);
  } else {
    return;
  }
  G.frozen = true;
}

// ---- Main loop ----

let lastT = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  const now = ts / 1000;
  let dt = Math.min(0.033, now - (lastT || now));
  lastT = now;
  if (G.frozen) {
    drawGame(ctx, G);
    return;
  }
  if (G.hitStop > 0) {
    G.hitStop -= dt;
    drawGame(ctx, G);
    return;
  }
  if (G.state === 'play') update(dt);
  else G.time += dt; // menus keep their slow ambient motion
  drawGame(ctx, G);
}

// ---- Input ----

function bindInput() {
  window.addEventListener('keydown', function (e) {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].indexOf(k) !== -1) e.preventDefault();
    G.audio.unlock();
    if (k === 'm') {
      G.audio.setMuted(!G.audio.muted);
      return;
    }
    if (k === 'p' || k === 'escape') {
      if (G.state === 'play') G.state = 'paused';
      else if (G.state === 'paused') G.state = 'play';
      return;
    }
    if (k === 'enter') {
      if (G.state === 'title' || G.state === 'victory' || G.state === 'over') startRun();
      return;
    }
    if (k === ' ' || k === 'shift') {
      if (G.state === 'play') doDash();
      return;
    }
    if (k === 'q') {
      if (G.state === 'play') doConvergence();
      return;
    }
    if (k === 'e') {
      if (G.state === 'play') {
        placePrism(G.prisms, G.mouse.x, G.mouse.y, G.time);
        G.prismsPlaced += 1;
        G.audio.chime(2);
      }
      return;
    }
    if (k === 'r' && (G.state === 'paused' || G.state === 'over' || G.state === 'victory')) {
      startRun();
      return;
    }
    G.keys[k] = true;
  });
  window.addEventListener('keyup', function (e) {
    G.keys[e.key.toLowerCase()] = false;
  });
  window.addEventListener('blur', function () {
    G.keys = {};
    G.mouse.left = false;
  });

  function mousePos(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * W,
      y: ((e.clientY - r.top) / r.height) * H,
    };
  }
  canvas.addEventListener('mousemove', function (e) {
    const m = mousePos(e);
    G.mouse.x = m.x;
    G.mouse.y = m.y;
  });
  canvas.addEventListener('mousedown', function (e) {
    G.audio.unlock();
    const m = mousePos(e);
    G.mouse.x = m.x;
    G.mouse.y = m.y;
    if (G.state === 'title' || G.state === 'victory' || G.state === 'over') {
      startRun();
      return;
    }
    if (G.state !== 'play') return;
    if (e.button === 2) {
      placePrism(G.prisms, m.x, m.y, G.time);
      G.prismsPlaced += 1;
      G.audio.chime(2);
    } else if (e.button === 0) {
      G.mouse.left = true;
      G.mouse.pressT = G.time;
      G.beamHoldT = 0;
      fireBolt();
    }
  });
  window.addEventListener('mouseup', function (e) {
    if (e.button === 0) {
      G.mouse.left = false;
      G.beamHoldT = 0;
    }
  });
  canvas.addEventListener('contextmenu', function (e) {
    e.preventDefault();
  });
}

// ---- Boot ----

function boot() {
  canvas = document.getElementById('game');
  ctx = canvas.getContext('2d');
  const params = new URLSearchParams(window.location.search);
  const seed = parseInt(params.get('seed') || '0', 10);
  rng = mulberry32(seed || (Date.now() % 2147483647));
  bindInput();
  // Read-only debug handle for automated play-testing (state, never control).
  window.__lumenweave = {
    snapshot: function () {
      return {
        state: G.state,
        score: G.score,
        combo: G.combo,
        coreHp: G.coreHp,
        energy: Math.round(G.energy),
        cycle: G.cycle,
        enemies: G.enemies.length,
        prisms: G.prisms.length,
        bossHp: G.boss ? G.boss.hp : null,
        resonance: Math.round(G.resonance),
        shotsFired: G.shotsFired,
      };
    },
  };
  const shot = params.get('shot');
  if (shot) setupShot(shot);
  requestAnimationFrame(frame);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
