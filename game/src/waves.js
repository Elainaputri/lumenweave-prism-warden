// waves.js — the five Astral Cycles: what spawns, in what order, and when a
// cycle is done. Each cycle is a timed queue of spawn events; the engine
// drains the queue and the cycle ends when the queue is empty and every
// enemy (boss included) is dead.

// kind, count, gap (seconds between spawns of this group), firstDelay.
const CYCLES = [
  {
    name: 'Cycle I — First Light',
    groups: [
      { kind: 'mote', count: 8, gap: 0.9, delay: 0.5 },
      { kind: 'crawler', count: 4, gap: 1.6, delay: 4 },
      { kind: 'mote', count: 6, gap: 0.7, delay: 8 },
    ],
  },
  {
    name: 'Cycle II — Mirror Wall',
    groups: [
      { kind: 'mote', count: 8, gap: 0.8, delay: 0.5 },
      { kind: 'sentinel', count: 3, gap: 2.5, delay: 3 },
      { kind: 'crawler', count: 5, gap: 1.4, delay: 7 },
      { kind: 'sentinel', count: 2, gap: 2.5, delay: 12 },
    ],
  },
  {
    name: 'Cycle III — Rift Choir',
    groups: [
      { kind: 'weaver', count: 2, gap: 3, delay: 0.5 },
      { kind: 'mote', count: 10, gap: 0.6, delay: 3 },
      { kind: 'sentinel', count: 3, gap: 2.2, delay: 8 },
      { kind: 'weaver', count: 2, gap: 3, delay: 13 },
      { kind: 'crawler', count: 4, gap: 1.2, delay: 16 },
    ],
  },
  {
    name: 'Cycle IV — Obsidian Tide',
    groups: [
      { kind: 'juggernaut', count: 1, gap: 0, delay: 0.5 },
      { kind: 'mote', count: 12, gap: 0.55, delay: 2 },
      { kind: 'weaver', count: 2, gap: 3, delay: 6 },
      { kind: 'sentinel', count: 4, gap: 2, delay: 10 },
      { kind: 'juggernaut', count: 1, gap: 0, delay: 15 },
      { kind: 'crawler', count: 6, gap: 1.1, delay: 18 },
    ],
  },
  {
    name: 'Cycle V — The Eclipse Leviathan',
    groups: [
      { kind: 'mote', count: 6, gap: 0.8, delay: 1 },
      { kind: 'weaver', count: 2, gap: 3, delay: 6 },
    ],
  },
];

// Expand a cycle definition into a flat, time-sorted spawn queue.
function buildQueue(cycleIndex) {
  const queue = [];
  for (const g of CYCLES[cycleIndex].groups) {
    for (let i = 0; i < g.count; i++) {
      queue.push({ kind: g.kind, at: g.delay + i * g.gap });
    }
  }
  queue.sort(function (a, b) {
    return a.at - b.at;
  });
  return queue;
}

// A cycle is complete when its queue is drained and nothing hostile remains.
function cycleCleared(queue, enemies, boss) {
  if (queue.length > 0) return false;
  if (enemies.length > 0) return false;
  if (boss && boss.hp > 0) return false;
  return true;
}
