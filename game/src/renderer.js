// renderer.js — everything drawn: the parallax starfield, the brass
// astrolabe, the core, the loom, prisms, beams, enemies, the boss, and the
// diegetic HUD plus every menu screen. All glow uses additive blending
// ('lighter') so overlapping light feels like light.

// Starfield, generated once from the seeded RNG so screenshots are stable.
let STARS = null;
function starfield() {
  if (STARS) return STARS;
  STARS = [];
  for (let i = 0; i < 170; i++) {
    STARS.push({
      x: rand(0, W),
      y: rand(0, H),
      r: rand(0.5, 1.8),
      layer: pick([0.2, 0.5, 1]),
      tw: rand(0, Math.PI * 2),
    });
  }
  return STARS;
}

function drawBackground(ctx, t) {
  const g = ctx.createRadialGradient(CX, CY, 80, CX, CY, 720);
  g.addColorStop(0, '#101736');
  g.addColorStop(0.55, COL.bg2);
  g.addColorStop(1, COL.bg);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (const s of starfield()) {
    const a = 0.25 + 0.55 * Math.abs(Math.sin(t * 0.6 * s.layer + s.tw));
    ctx.globalAlpha = a;
    ctx.fillStyle = '#cdd7ff';
    ctx.beginPath();
    ctx.arc(s.x + Math.sin(t * 0.02 * s.layer) * 6, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Slowly rotating brass astrolabe rings around the core.
  ctx.save();
  ctx.translate(CX, CY);
  ctx.rotate(t * 0.02);
  ctx.strokeStyle = COL.brassDim;
  ctx.lineWidth = 2;
  for (const r of [120, 190, 265]) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.rotate(-t * 0.05);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 258, Math.sin(a) * 258);
    ctx.lineTo(Math.cos(a) * 272, Math.sin(a) * 272);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCore(ctx, G, t) {
  const hpFrac = G.coreHp / CORE.hpMax;
  const pulse = 1 + Math.sin(t * 2.2) * 0.04;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(CX, CY, 10, CX, CY, 130);
  glow.addColorStop(0, 'rgba(255,233,168,0.55)');
  glow.addColorStop(0.4, 'rgba(200,157,84,0.18)');
  glow.addColorStop(1, 'rgba(200,157,84,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(CX, CY, 130, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  // Brass ring + glass orb; the orb drains from gold to red as it takes hits.
  ctx.strokeStyle = COL.brass;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(CX, CY, CORE_R * pulse, 0, Math.PI * 2);
  ctx.stroke();
  const orb = ctx.createRadialGradient(CX - 12, CY - 14, 4, CX, CY, CORE_R);
  const hot = hpFrac > 0.5 ? '255,233,168' : '255,110,110';
  orb.addColorStop(0, 'rgba(' + hot + ',0.95)');
  orb.addColorStop(1, 'rgba(120,80,30,0.9)');
  ctx.fillStyle = orb;
  ctx.beginPath();
  ctx.arc(CX, CY, CORE_R - 4, 0, Math.PI * 2);
  ctx.fill();
  // Tick marks show integrity at a glance.
  ctx.strokeStyle = 'rgba(7,9,19,0.7)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 10; i++) {
    if (i / 10 >= hpFrac) continue;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(CX + Math.cos(a) * (CORE_R - 12), CY + Math.sin(a) * (CORE_R - 12));
    ctx.lineTo(CX + Math.cos(a) * (CORE_R - 5), CY + Math.sin(a) * (CORE_R - 5));
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayer(ctx, G, t) {
  const p = G.player;
  if (p.dead) return;
  ctx.save();
  ctx.translate(p.x, p.y);
  // Afterimage trail while dashing.
  if (p.dashT > 0) {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = COL.cyan;
    ctx.beginPath();
    ctx.arc(-p.vx * 0.03, -p.vy * 0.03, p.r * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.rotate(p.aim);
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(53,224,255,0.25)';
  ctx.beginPath();
  ctx.arc(0, 0, 26 + Math.sin(t * 4) * 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  // The Aether Loom: a brass dart with a cyan heart.
  ctx.fillStyle = COL.brass;
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(-12, -11);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-12, 11);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COL.cyan;
  ctx.beginPath();
  ctx.arc(2, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Laser sightline preview: a short faint dash ahead of the ship, showing
  // the aim direction without drawing a line across the whole arena.
  ctx.save();
  ctx.strokeStyle = 'rgba(53,224,255,0.4)';
  ctx.setLineDash([4, 10]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(p.x + Math.cos(p.aim) * 26, p.y + Math.sin(p.aim) * 26);
  ctx.lineTo(p.x + Math.cos(p.aim) * 150, p.y + Math.sin(p.aim) * 150);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawPrism(ctx, p, t) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(255,255,255,' + (0.10 + p.flash * 0.25) + ')';
  ctx.beginPath();
  ctx.arc(0, 0, 26 + p.flash * 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.rotate(p.angle + t * 0.3);
  // Triangular glass prism with a tri-chromatic facet.
  const grad = ctx.createLinearGradient(-14, -10, 14, 12);
  grad.addColorStop(0, COL.cyan);
  grad.addColorStop(0.5, '#e8ecff');
  grad.addColorStop(1, COL.magenta);
  ctx.fillStyle = grad;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.moveTo(0, -17);
  ctx.lineTo(15, 11);
  ctx.lineTo(-15, 11);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawBeamSegments(ctx, segs, t) {
  if (!segs.length) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (const s of segs) {
    const col = PHASES[s.phase].color;
    const wob = Math.sin(t * 30 + s.depth * 2) * 1.2;
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2 + wob, s.y2);
    ctx.stroke();
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
    // Bright node where the beam bends.
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(s.x1, s.y1, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawConvergenceWeb(ctx, G, t) {
  const ps = G.prisms;
  if (ps.length < 2) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(ps[0].x, ps[0].y);
  for (let i = 1; i < ps.length; i++) ctx.lineTo(ps[i].x, ps[i].y);
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,79,216,0.10)';
  ctx.fill();
  ctx.restore();
}

function drawEnemy(ctx, e, t) {
  ctx.save();
  ctx.translate(e.x, e.y);
  const flash = e.flash > 0;
  const body = flash ? '#ffffff' : enemyColor(e.kind);
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = glowColor(e.kind);
  ctx.beginPath();
  ctx.arc(0, 0, e.r + 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.rotate(e.facing);
  ctx.fillStyle = body;
  ctx.strokeStyle = '#0b0f24';
  ctx.lineWidth = 2;
  if (e.kind === 'mote') {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + t * 2;
      const rr = i % 2 === 0 ? e.r : e.r * 0.55;
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  } else if (e.kind === 'crawler') {
    hexPath(ctx, e.r);
    ctx.fill();
    ctx.stroke();
  } else if (e.kind === 'sentinel') {
    ctx.fillRect(-e.r, -e.r, e.r * 2, e.r * 2);
    ctx.strokeRect(-e.r, -e.r, e.r * 2, e.r * 2);
    // Frontal shield arc — the side you must not shoot.
    ctx.strokeStyle = 'rgba(53,224,255,0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, e.r + 5, -0.9, 0.9);
    ctx.stroke();
  } else if (e.kind === 'weaver') {
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-e.r * 0.8, -e.r * 0.8, e.r * 1.6, e.r * 1.6);
    ctx.strokeStyle = COL.magenta;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, e.r + 6, t * 2, t * 2 + Math.PI * 1.4);
    ctx.stroke();
  } else if (e.kind === 'juggernaut') {
    hexPath(ctx, e.r);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#2a2f4a';
    hexPath(ctx, e.r * 0.55);
    ctx.fill();
  }
  ctx.restore();
  // HP bar for anything tougher than a mote.
  if (e.maxHp > 20 && e.hp < e.maxHp) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(e.x - 18, e.y - e.r - 12, 36, 5);
    ctx.fillStyle = COL.danger;
    ctx.fillRect(e.x - 18, e.y - e.r - 12, 36 * clamp(e.hp / e.maxHp, 0, 1), 5);
  }
  // Burn / slow status rings.
  if (e.burnUntil > 0) {
    ctx.strokeStyle = COL.amber;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r + 3, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function hexPath(ctx, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function enemyColor(kind) {
  if (kind === 'mote') return '#8a5cff';
  if (kind === 'crawler') return '#5c6b8a';
  if (kind === 'sentinel') return '#3fd2c0';
  if (kind === 'weaver') return '#b04fd8';
  return '#3a3f5c'; // juggernaut
}

function glowColor(kind) {
  if (kind === 'mote') return 'rgba(138,92,255,0.22)';
  if (kind === 'crawler') return 'rgba(92,107,138,0.18)';
  if (kind === 'sentinel') return 'rgba(63,210,192,0.20)';
  if (kind === 'weaver') return 'rgba(176,79,216,0.25)';
  return 'rgba(120,90,160,0.25)';
}

function drawBoss(ctx, boss, t) {
  const segs = bossSegments(boss);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const s of segs) {
    ctx.fillStyle = 'rgba(255,84,112,0.16)';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r + 10, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  // Flare telegraph: a warning sector before the sweep.
  if (boss.flareState === 1) {
    ctx.fillStyle = 'rgba(255,84,112,0.18)';
    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.arc(CX, CY, 560, boss.flareAngle - 0.5, boss.flareAngle + 0.5);
    ctx.closePath();
    ctx.fill();
  }
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = segs[i];
    ctx.fillStyle = i === 0 ? '#ff5470' : '#5c2440';
    ctx.strokeStyle = COL.brass;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Clockwork eye on the head.
    if (i === 0) {
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Armor nodes: glowing weak points riding the serpent.
  for (const n of boss.nodes) {
    if (n.dead) continue;
    const s = segs[n.seg];
    ctx.fillStyle = '#ffd76a';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#070913';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('◆', s.x, s.y + 1);
  }
  ctx.restore();
}

function drawParticles(ctx, particles) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of particles) {
    const a = clamp(p.life / p.maxLife, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    if (p.shape === 1) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.lineTo(p.size, p.size);
      ctx.lineTo(-p.size, p.size);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (p.shape === 2) {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (2 - a), 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * a + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawFloatTexts(ctx, texts) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const f of texts) {
    ctx.globalAlpha = clamp(f.life / 0.9, 0, 1);
    ctx.font = 'bold ' + f.size + 'px system-ui, sans-serif';
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.restore();
}

function drawOrbs(ctx, orbs) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const o of orbs) {
    ctx.fillStyle = 'rgba(176,79,216,0.5)';
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r + 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d9a0ff';
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBolts(ctx, bolts) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = '#ffe9a8';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (const b of bolts) {
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

// ---- HUD ----

function bar(ctx, x, y, w, h, frac, fill, label, text) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w * clamp(frac, 0, 1), h);
  ctx.strokeStyle = 'rgba(232,236,255,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = COL.ink;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y - 9);
  ctx.textAlign = 'right';
  ctx.fillText(text, x + w, y - 9);
}

function drawHUD(ctx, G) {
  ctx.save();
  // HUD safe zone: a dark band top and bottom, so beams, enemies and
  // particles crossing behind the HUD can never eat the text, whatever the
  // beam geometry does. The band is its own layer, under the text.
  const topGrad = ctx.createLinearGradient(0, 0, 0, 108);
  topGrad.addColorStop(0, 'rgba(7,9,19,0.72)');
  topGrad.addColorStop(1, 'rgba(7,9,19,0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, 108);
  const botGrad = ctx.createLinearGradient(0, H - 40, 0, H);
  botGrad.addColorStop(0, 'rgba(7,9,19,0)');
  botGrad.addColorStop(1, 'rgba(7,9,19,0.72)');
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, H - 40, W, 40);
  // Top-left: Core Integrity + Aether Energy.
  const coreFrac = G.coreHp / CORE.hpMax;
  bar(ctx, 24, 40, 220, 12, coreFrac, coreFrac > 0.5 ? COL.good : COL.danger, 'CORE INTEGRITY', Math.ceil(G.coreHp) + '%');
  const enFrac = G.energy / PLAYER.energyMax;
  bar(ctx, 24, 72, 220, 12, enFrac, COL.cyan, 'AETHER ENERGY', Math.floor(G.energy) + '');
  // Top-centre: cycle progress, and the boss bar on Cycle V.
  ctx.textAlign = 'center';
  ctx.fillStyle = COL.ink;
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(CYCLES[G.cycle].name.toUpperCase(), CX, 30);
  const total = G.cycleTotal || 1;
  const done = total - G.queue.length - G.enemies.length - (G.boss && G.boss.hp > 0 ? 1 : 0);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(CX - 140, 40, 280, 8);
  ctx.fillStyle = COL.brass;
  ctx.fillRect(CX - 140, 40, 280 * clamp(done / total, 0, 1), 8);
  if (G.boss && G.boss.hp > 0) {
    ctx.fillStyle = COL.danger;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('THE ECLIPSE LEVIATHAN', CX, 66);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(CX - 160, 74, 320, 9);
    ctx.fillStyle = COL.danger;
    ctx.fillRect(CX - 160, 74, 320 * clamp(G.boss.hp / G.boss.maxHp, 0, 1), 9);
  }
  // Top-right: score, combo, convergence.
  ctx.textAlign = 'right';
  ctx.fillStyle = COL.ink;
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText(G.score.toLocaleString('en-US'), W - 24, 32);
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillStyle = G.combo > 1 ? COL.amber : COL.dim;
  ctx.fillText('COMBO x' + G.multiplier + '  (' + G.combo + ')', W - 24, 54);
  const resFrac = G.resonance / 100;
  bar(ctx, W - 244, 86, 220, 12, resFrac, COL.magenta, 'HARMONIC RESONANCE [Q]', resFrac >= 1 ? 'READY' : Math.floor(G.resonance) + '%');
  // Bottom hints: dash cooldown + controls reminder.
  ctx.textAlign = 'left';
  ctx.fillStyle = COL.dim;
  ctx.font = '12px system-ui, sans-serif';
  const dashReady = G.dashCd <= 0;
  ctx.fillText(
    (dashReady ? '◆ DASH READY [Space]' : '◇ Dash ' + G.dashCd.toFixed(1) + 's') +
      '   ·   Right-click / E: prism   ·   M: mute   ·   P: pause',
    24,
    H - 16,
  );
  ctx.restore();
}

function drawBanner(ctx, G) {
  if (!G.banner) return;
  ctx.save();
  ctx.globalAlpha = clamp(G.bannerT, 0, 1);
  ctx.textAlign = 'center';
  ctx.fillStyle = COL.brass;
  ctx.font = 'bold 34px Georgia, serif';
  ctx.fillText(G.banner, CX, 150);
  ctx.restore();
}

// ---- Screens ----

function screenShell(ctx, title, sub, alpha) {
  ctx.fillStyle = 'rgba(7,9,19,' + (alpha === undefined ? 0.72 : alpha) + ')';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = COL.brass;
  ctx.font = 'bold 54px Georgia, serif';
  ctx.fillText(title, CX, 210);
  ctx.fillStyle = COL.ink;
  ctx.font = '20px Georgia, serif';
  ctx.fillText(sub, CX, 252);
}

// Title attract mode: a live refraction demo behind the title — three
// prisms orbit the Chrono-Astrolabe Core and split the light in real time
// (Cyan -> Amber -> Magenta). Presentation only: it reads G.time, so the
// frozen title shot is stable too, and the title text is drawn last, on
// top, so contrast never depends on where the prisms are.
function drawTitleDemo(ctx, G, t) {
  const demo = [];
  for (let i = 0; i < 3; i++) {
    const a = t * 0.22 + (i * Math.PI * 2) / 3;
    const r = 215 + i * 45;
    demo.push({
      x: CX + Math.cos(a) * r,
      y: CY + Math.sin(a) * r,
      angle: a,
      placedAt: 0,
      flash: 0.55 + 0.35 * Math.sin(t * 2 + i * 2.1),
    });
  }
  const segs = [];
  function link(x1, y1, x2, y2, phase, depth) {
    segs.push({ x1: x1, y1: y1, x2: x2, y2: y2, phase: phase, depth: depth });
  }
  link(CX, CY, demo[0].x, demo[0].y, 0, 0);
  link(demo[0].x, demo[0].y, demo[1].x, demo[1].y, 1, 1);
  link(demo[1].x, demo[1].y, demo[2].x, demo[2].y, 2, 2);
  const out = Math.atan2(demo[2].y - demo[1].y, demo[2].x - demo[1].x);
  link(demo[2].x, demo[2].y, demo[2].x + Math.cos(out + 0.45) * 190, demo[2].y + Math.sin(out + 0.45) * 190, 0, 3);
  link(demo[2].x, demo[2].y, demo[2].x + Math.cos(out - 0.45) * 190, demo[2].y + Math.sin(out - 0.45) * 190, 2, 3);
  drawBeamSegments(ctx, segs, t);
  for (const p of demo) drawPrism(ctx, p, t);
}

function drawTitle(ctx, G) {
  drawBackground(ctx, G.time);
  drawCore(ctx, G, G.time);
  drawTitleDemo(ctx, G, G.time);
  // A lighter scrim than the other screens (0.55): the demo light stays
  // visible around the text while the text itself stays sharp on top.
  screenShell(ctx, 'LUMENWEAVE', 'P R I S M   W A R D E N', 0.55);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = COL.dim;
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText('Defend the Chrono-Astrolabe Core across five Astral Cycles.', CX, 300);
  ctx.fillText('Bend photonic beams through Refraction Prisms — split the light, break the dark.', CX, 326);
  ctx.fillStyle = COL.ink;
  ctx.font = '15px system-ui, sans-serif';
  const lines = [
    'WASD / Arrows — move      Mouse — aim      Click — Solar Bolts      Hold — Prism Beam',
    'Right-click / E — place Prism (max 3)      Space — Phase-Dash      Q — Solar Convergence at 100%',
    'Cyan slows · Amber ignites · Magenta arcs lightning',
  ];
  lines.forEach(function (l, i) {
    ctx.fillText(l, CX, 380 + i * 26);
  });
  ctx.fillStyle = G.time % 1 < 0.6 ? COL.amber : COL.dim;
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('— CLICK OR PRESS ENTER TO BEGIN —', CX, 500);
  ctx.fillStyle = COL.dim;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('An original game · sound is procedural · M mutes · P pauses', CX, 640);
  ctx.restore();
}

function drawPause(ctx) {
  screenShell(ctx, 'PAUSED', 'The light holds its breath.');
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = COL.dim;
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('P / Esc — resume      M — mute      R — restart run', CX, 310);
  ctx.restore();
}

function statLines(ctx, G, y0) {
  const rows = [
    ['Final Score', G.score.toLocaleString('en-US')],
    ['Max Combo', 'x' + G.maxMultiplier + '  (' + G.maxCombo + ' chained kills)'],
    ['Ricochet Kills', String(G.ricochetKills)],
    ['Accuracy', G.shotsFired > 0 ? Math.round((100 * G.shotsHit) / G.shotsFired) + '%' : '—'],
    ['Cycles Cleared', String(G.cyclesCleared) + ' / 5'],
    ['Prisms Placed', String(G.prismsPlaced)],
  ];
  ctx.save();
  ctx.font = '17px system-ui, sans-serif';
  rows.forEach(function (r, i) {
    const y = y0 + i * 30;
    ctx.textAlign = 'right';
    ctx.fillStyle = COL.dim;
    ctx.fillText(r[0], CX - 12, y);
    ctx.textAlign = 'left';
    ctx.fillStyle = COL.ink;
    ctx.fillText(r[1], CX + 12, y);
  });
  ctx.restore();
}

function drawVictory(ctx, G) {
  screenShell(ctx, 'ASTRAL ASCENSION', 'The Eclipse Leviathan is unmade. The Core burns bright again.');
  statLines(ctx, G, 320);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = G.time % 1 < 0.6 ? COL.amber : COL.dim;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('— PLAY AGAIN [Enter] —', CX, 540);
  ctx.restore();
}

function drawGameOver(ctx, G) {
  screenShell(ctx, 'ASTROLABE SHATTERED', 'The Core has gone dark. The weave unravels… for now.');
  statLines(ctx, G, 320);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = G.time % 1 < 0.6 ? COL.amber : COL.dim;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('— RESTART [Enter] —', CX, 540);
  ctx.restore();
}

// Shattered-core dressing for the Game Over screen: a dim ember glow plus
// jagged cracks across the drained orb, so the backdrop is never empty
// dark. Fixed geometry (no per-frame randomness), so the frozen game-over
// shot is stable.
function drawCoreCracks(ctx, t) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const ember = 0.16 + 0.07 * Math.sin(t * 1.1);
  const glow = ctx.createRadialGradient(CX, CY, 10, CX, CY, 170);
  glow.addColorStop(0, 'rgba(255,84,112,' + ember + ')');
  glow.addColorStop(1, 'rgba(255,84,112,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(CX, CY, 170, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = 'rgba(20,6,12,0.85)';
  ctx.lineWidth = 2.5;
  // Cracks run past the orb's edge (to r≈78) so they show around the
  // stats text, not only behind it.
  const cracks = [0.3, 1.2, 2.1, 2.9, 3.8, 5.0];
  for (let i = 0; i < cracks.length; i++) {
    const a = cracks[i];
    const j1 = (i % 3) - 1;
    ctx.beginPath();
    ctx.moveTo(CX + Math.cos(a) * 8, CY + Math.sin(a) * 8);
    ctx.lineTo(CX + Math.cos(a + j1 * 0.22) * 30, CY + Math.sin(a + j1 * 0.22) * 30);
    ctx.lineTo(CX + Math.cos(a - j1 * 0.18) * 78, CY + Math.sin(a - j1 * 0.18) * 78);
    ctx.stroke();
  }
  // Glowing fissure rims, so the cracks read as hot splits, not scratches.
  ctx.strokeStyle = 'rgba(255,120,90,0.55)';
  ctx.lineWidth = 1;
  for (let i = 0; i < cracks.length; i++) {
    const a = cracks[i];
    const j1 = (i % 3) - 1;
    ctx.beginPath();
    ctx.moveTo(CX + Math.cos(a) * 8, CY + Math.sin(a) * 8);
    ctx.lineTo(CX + Math.cos(a + j1 * 0.22) * 30, CY + Math.sin(a + j1 * 0.22) * 30);
    ctx.lineTo(CX + Math.cos(a - j1 * 0.18) * 78, CY + Math.sin(a - j1 * 0.18) * 78);
    ctx.stroke();
  }
  // Faint embers drifting around the dead core.
  ctx.fillStyle = 'rgba(255,120,90,0.7)';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.4;
    const r = 70 + ((i * 37) % 90);
    const y = CY + Math.sin(a) * r + Math.sin(t * 0.7 + i) * 6;
    ctx.beginPath();
    ctx.arc(CX + Math.cos(a) * r, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Master draw: world first, then HUD, then the screen overlay for the state.
function drawGame(ctx, G) {
  ctx.save();
  if (G.shake > 0.2) {
    ctx.translate(rand(-G.shake, G.shake), rand(-G.shake, G.shake));
  }
  drawBackground(ctx, G.time);
  drawCore(ctx, G, G.time);
  if (G.state === 'over') drawCoreCracks(ctx, G.time);
  // Live entities render only while playing (or paused, frozen mid-run).
  // End screens ('over' / 'victory') show a clean backdrop: no stray
  // player, enemy, bolt, orb or prism sprites behind the stats overlay.
  if (G.state === 'play' || G.state === 'paused') {
    for (const p of G.prisms) drawPrism(ctx, p, G.time);
    drawBeamSegments(ctx, G.beamSegs, G.time);
    if (G.convergenceT > 0) drawConvergenceWeb(ctx, G, G.time);
    drawBolts(ctx, G.bolts);
    drawOrbs(ctx, G.orbs);
    for (const e of G.enemies) drawEnemy(ctx, e, G.time);
    if (G.boss && G.boss.hp > 0) drawBoss(ctx, G.boss, G.time);
    drawPlayer(ctx, G, G.time);
    drawParticles(ctx, G.particles);
    drawFloatTexts(ctx, G.texts);
  }
  ctx.restore();
  if (G.state === 'play' || G.state === 'paused') drawHUD(ctx, G);
  drawBanner(ctx, G);
  if (G.state === 'title') drawTitle(ctx, G);
  else if (G.state === 'paused') drawPause(ctx);
  else if (G.state === 'victory') drawVictory(ctx, G);
  else if (G.state === 'over') drawGameOver(ctx, G);
}
