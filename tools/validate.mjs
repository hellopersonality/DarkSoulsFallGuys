// Level checker: proves each stage's goal, checkpoints and souls can be reached with the real movement
// (single jump, double jump, air dash, slide-jump), and reports which moves the route actually demands.
// Run: node tools/validate.mjs
import { STAGES } from '../src/stages.js';
import { PHYS } from '../src/phys.js';

const { R, STEP, MOVE, JUMP, JUMP2, GRAV, DASH, DASHT, DASHEND, SLIDE, AIRDECAY } = PHYS;
const LEVELS = ['single jump', 'double jump', 'dash / slide-jump'];

// one simulated jump: launch with (vx0, vy0), optional double jump at t2, optional dash at td.
function run(vx0, vy0, t2, td, dy) {
  const dt = 1 / 240;
  let x = 0, y = 0, vx = vx0, vy = vy0, t = 0, dashLeft = 0, usedJ = t2 < 0, usedD = td < 0;
  for (let i = 0; i < 720; i++) {
    if (!usedJ && t >= t2) { vy = JUMP2; usedJ = true; }
    if (!usedD && t >= td) { dashLeft = DASHT; usedD = true; vx = DASH; vy = 0; }
    const py = y;
    if (dashLeft > 0) { dashLeft -= dt; x += vx * dt; if (dashLeft <= 0) vx = Math.min(vx, MOVE * DASHEND); }
    else { vy = Math.max(vy + GRAV * dt, -36); vx = Math.max(MOVE, vx - AIRDECAY * dt); x += vx * dt; y += vy * dt; }
    t += dt;
    if (vy < 0 && py >= dy && y < dy) return x;
    if (vy < 0 && y < dy - 1) return -1;
  }
  return -1;
}
const cache = new Map();
// furthest horizontal travel that still lands dy higher, using moves up to `level`
export function reach(dy, level, vy0 = JUMP) {
  const key = `${Math.round(dy * 20)}|${level}|${vy0}`;
  if (cache.has(key)) return cache.get(key);
  let best = run(MOVE, vy0, -1, -1, dy);
  if (level >= 1) for (let t2 = 0.04; t2 < 1.3; t2 += 0.03) best = Math.max(best, run(MOVE, vy0, t2, -1, dy));
  if (level >= 2) {
    // slide-jump speed assumes the jump comes ~0.1 s into the slide, not on its first frame
    const starts = vy0 === JUMP ? [MOVE, MOVE + (SLIDE - MOVE) * 0.75] : [MOVE];
    for (const v0 of starts) for (let td = -1; td < 1.4; td += 0.04) for (let t2 = -1; t2 < 1.3; t2 += 0.04) {
      const a = td < 0 ? -1 : td, b = t2 < 0 ? -1 : t2;
      best = Math.max(best, run(v0, vy0, b, a, dy));
    }
  }
  cache.set(key, best);
  return best;
}

function landables(stage) {
  const out = [];
  for (const p of stage.parts.flat(3)) {
    const [x, y, z] = p.p || [0, 0, 0];
    const add = (w, d, topLo, topHi, extra = {}) => out.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, topLo, topHi, t: p.t, ...extra });
    if (['box', 'crumble', 'blink', 'conveyor'].includes(p.t)) add(p.s[0], p.s[2], y, y);
    else if (p.t === 'bounce') add(p.s[0], p.s[2], y, y, { bounce: p.power });
    else if (p.t === 'mover') {
      const [ax, ay, az] = p.move;
      out.push({ minX: x - p.s[0] / 2 - Math.abs(ax), maxX: x + p.s[0] / 2 + Math.abs(ax), minZ: z - p.s[2] / 2 - Math.abs(az), maxZ: z + p.s[2] / 2 + Math.abs(az), topLo: y - Math.abs(ay), topHi: y + Math.abs(ay), t: 'mover' });
    }
  }
  return out;
}
const gapXZ = (a, b) => Math.hypot(Math.max(0, a.minX - b.maxX, b.minX - a.maxX), Math.max(0, a.minZ - b.maxZ, b.minZ - a.maxZ));
const contains = (r, x, z, m = 0) => x >= r.minX - m && x <= r.maxX + m && z >= r.minZ - m && z <= r.maxZ + m;

// minimum move level needed to get from A to B (Infinity if impossible), and how tight it is at that level
function edge(A, B) {
  const gap = gapXZ(A, B), dy = B.topLo - A.topHi;
  if (gap <= 2 * R && dy <= STEP) return { level: 0, tight: 0 };
  for (let level = 0; level <= 2; level++) {
    const opts = A.bounce ? [A.bounce, JUMP] : [JUMP];
    for (const v of opts) {
      const r = reach(dy, level, v);
      if (r > 0 && gap <= r + 2 * R) return { level, tight: gap / (r + 2 * R) };
    }
  }
  return { level: Infinity, tight: Infinity };
}

// run the checks only when executed directly (the sim imports reach() from here)
if (import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) main();

function main() {
let failures = 0;
const t0 = Date.now();
for (const st of STAGES) {
  const L = landables(st);
  const parts = st.parts.flat(3);
  const start = parts.find(p => p.t === 'bonfire' && p.start);
  const s0 = L.findIndex(r => contains(r, start.spawn[0], start.spawn[2]) && Math.abs(r.topHi - start.spawn[1]) < 0.01);
  if (s0 < 0) { console.log(`${st.id}: spawn not on a platform`); failures++; continue; }
  const E = L.map(A => L.map(B => A === B ? null : edge(A, B)));
  // cheapest route: minimise the highest move level needed, then the tightest jump
  const best = L.map(() => [Infinity, Infinity]); best[s0] = [0, 0];
  const from = new Array(L.length).fill(-1);
  const better = (a, b) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1] - 1e-9);
  let changed = true;
  while (changed) {
    changed = false;
    for (let a = 0; a < L.length; a++) {
      if (best[a][0] === Infinity) continue;
      for (let b = 0; b < L.length; b++) {
        const e = E[a][b]; if (!e || e.level === Infinity) continue;
        const [la, ta] = best[a];
        const c = e.level > la ? [e.level, e.tight] : e.level === la ? [la, Math.max(ta, e.tight)] : [la, ta];
        if (better(c, best[b])) { best[b] = c; from[b] = a; changed = true; }
      }
    }
  }
  const problems = [];
  const reachableAt = (x, y, z, m, headroom) => L.some((r, i) => best[i][0] < Infinity && contains(r, x, z, m) && y - r.topHi <= headroom && y - r.topLo >= -0.5);
  const goalP = parts.find(p => p.t === 'goal');
  const gIdx = L.findIndex((r, i) => best[i][0] < Infinity && contains(r, goalP.p[0], goalP.p[2], 1.5) && Math.abs(r.topHi - goalP.p[1]) < 0.6);
  if (gIdx < 0) problems.push('GOAL UNREACHABLE');
  for (const b of parts.filter(p => p.t === 'bonfire' || p.t === 'lantern')) if (!reachableAt(b.p[0], b.p[1], b.p[2], 0.3, 0.6)) problems.push(`${b.t} at ${b.p} unreachable`);
  for (const b of parts.filter(p => p.t === 'bonfire' || p.t === 'lantern')) if (b.spawn && !reachableAt(b.spawn[0], b.spawn[1], b.spawn[2], -0.45, 0.05)) problems.push(`${b.t} spawn ${b.spawn} not on solid ground`);
  // a soul counts if it sits above a reachable platform, or inside the arc of a jump the route can make
  const inArc = ([x, y, z]) => {
    for (let a = 0; a < L.length; a++) {
      if (best[a][0] === Infinity) continue;
      for (let b = 0; b < L.length; b++) {
        const e = E[a][b]; if (!e || e.level === Infinity || best[b][0] === Infinity) continue;
        const A = L[a], B = L[b];
        const minX = Math.min(A.minX, B.minX) - 1, maxX = Math.max(A.maxX, B.maxX) + 1, minZ = Math.min(A.minZ, B.minZ) - 1, maxZ = Math.max(A.maxZ, B.maxZ) + 1;
        if (x < minX || x > maxX || z < minZ || z > maxZ) continue;
        if (y <= Math.max(A.topHi, B.topHi) + 3.8 && y >= Math.min(A.topLo, B.topLo) - 0.5) return true;
      }
    }
    return false;
  };
  for (const s of parts.filter(p => p.t === 'soul')) if (!reachableAt(s.p[0], s.p[1], s.p[2], 1.0, 5.2) && !inArc(s.p)) problems.push(`soul at ${s.p} unreachable`);
  // which moves the route demands
  const counts = [0, 0, 0];
  if (gIdx >= 0) for (let i = gIdx; i !== s0 && i >= 0; i = from[i]) { const e = E[from[i]][i]; if (e.level > 0 || e.tight > 0) counts[e.level]++; }
  const nSouls = parts.filter(p => p.t === 'soul').length, nFires = parts.filter(p => p.t === 'bonfire').length, nLan = parts.filter(p => p.t === 'lantern').length;
  const orphan = L.map((r, i) => best[i][0] === Infinity ? `${r.t}@[${((r.minX + r.maxX) / 2).toFixed(1)},${r.topHi},${((r.minZ + r.maxZ) / 2).toFixed(1)}]` : null).filter(Boolean);
  console.log(`${st.id} ${st.name.padEnd(24)} tempo ${st.tempo ?? 1.2} | route jumps: ${counts[0]} single, ${counts[1]} double, ${counts[2]} dash | souls ${nSouls} | bonfires ${nFires} + lanterns ${nLan}${orphan.length ? ' | unreachable: ' + orphan.join(' ') : ''}`);
  for (const p of problems) { console.log('   ✗ ' + p); failures++; }
}
console.log(`\nreach on flat ground: single ${(reach(0, 0) + 2 * R).toFixed(1)} m, double ${(reach(0, 1) + 2 * R).toFixed(1)} m, dash ${(reach(0, 2) + 2 * R).toFixed(1)} m  (${Date.now() - t0} ms)`);
console.log(failures ? `${failures} problem(s)` : 'All stages completable.');
process.exit(failures ? 1 : 0);
}
