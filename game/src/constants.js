// constants.js — arena size, palette, and every tuning number for the game.
// One place to tune: nothing else in the codebase hard-codes a balance value.

const W = 1280;
const H = 720;
const CX = 640; // arena centre x — the Chrono-Astrolabe Core sits here
const CY = 360; // arena centre y
const CORE_R = 46;
const ARENA_R = 330; // soft play-field radius; enemies spawn outside it

// Palette — obsidian-indigo night, brass astrolabe, tri-chromatic light.
const COL = {
  bg: '#070913',
  bg2: '#0b0f24',
  brass: '#c89d54',
  brassDim: 'rgba(200,157,84,0.35)',
  ink: '#e8ecff',
  dim: '#8b93b8',
  cyan: '#35e0ff',
  amber: '#ffb347',
  magenta: '#ff4fd8',
  core: '#ffe9a8',
  danger: '#ff5470',
  good: '#7dffb0',
};

// Chromatic phases, in bounce order: each prism bounce shifts the phase.
const PHASES = [
  { name: 'Cyan', color: COL.cyan, slow: 0.6, burn: 0, arc: 0 },
  { name: 'Amber', color: COL.amber, slow: 1, burn: 9, arc: 0 },
  { name: 'Magenta', color: COL.magenta, slow: 1, burn: 0, arc: 2 },
];

// Player (the Aether Loom).
const PLAYER = {
  r: 16,
  accel: 1500,
  maxSpeed: 340,
  damping: 3.2,
  hullMax: 100,
  hullRegen: 7,
  boltDmg: 14,
  boltSpeed: 920,
  boltCooldown: 0.16,
  boltEnergy: 3,
  beamDps: 46,
  beamDrain: 26, // aether per second while channelling
  beamRange: 760,
  energyMax: 100,
  energyRecharge: 20,
  dashCooldown: 2.4,
  dashSpeed: 980,
  dashTime: 0.16,
  dashIframes: 0.38,
  dashPulseR: 160,
  dashPulseDmg: 18,
};

// Prisms.
const PRISM = {
  max: 3,
  r: 15,
  chainRange: 300, // a refracted beam can hop to a prism this close
  splitAngle: 0.5, // radians either side of the incoming beam
  maxDepth: 3,
};

// Core.
const CORE = { hpMax: 100 };

// Scoring.
const COMBO_STEP = 4; // every 4 chained kills raises the multiplier by 1
const COMBO_MAX = 16;
const RESONANCE_PER_KILL = 8; // percent of Harmonic Resonance per shard

// Boss — THE ECLIPSE LEVIATHAN.
const BOSS = {
  hp: 1500,
  segments: 7,
  orbitR: 300,
  orbitSpeed: 0.32, // radians per second around the core
  nodeHp: 130,
  nodeDmg: 160, // damage to the boss when a node shatters
  flareEvery: 11,
  flareTelegraph: 1.3,
  flareSweep: 2.2,
  spawnEvery: 8,
};
