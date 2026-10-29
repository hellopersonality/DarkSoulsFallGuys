// Level checker: proves each stage's goal, bonfires and souls can be reached with the real jump physics.
// Run: node tools/validate.mjs
import { STAGES } from '../src/stages.js';
import { PHYS } from '../src/phys.js';

const { R, STEP, MOVE, JUMP, GRAV } = PHYS;
const g = -GRAV;
const apexOf = v => (v * v) / (2 * g);
// horizontal reach for a jump with launch speed v that lands dy higher (dy may be negative)
function reach(dy, v = JUMP) {
  const h = apexOf(v);
  if (dy > h - 0.05) return -1;
  const tUp = v / g, tDown = Math.sqrt((2 * (h - dy)) / g);
  return MOVE * (tUp + tDown);
}

function landables(stage) {
  const out = [];
  for (const p of stage.parts.flat(3)) {
    const [x, y, z] = p.p || [0, 0, 0];
    const add = (w, d, topLo, topHi, extra = {}) => out.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, topLo, topHi, t: p.t, ...extra });
    if (['box', 'crumble', 'blink', 'conveyor'].includes(p.t)) add(p.s[0], p.s[2], y, y);
    else if (p.t === 'bounce') add(p.s[0], p.s[2], y, y, { bounce: p.power });
    else if (p.t === 'log') add(p.axis === 'x' ? p.len : 1.3, p.axis === 'x' ? 1.3 : p.len, y, y);
    else if (p.t === 'mover') {
      const [ax, ay, az] = p.move;
      out.push({ minX: x - p.s[0] / 2 - Math.abs(ax), maxX: x + p.s[0] / 2 + Math.abs(ax), minZ: z - p.s[2] / 2 - Math.abs(az), maxZ: z + p.s[2] / 2 + Math.abs(az), topLo: y - Math.abs(ay), topHi: y + Math.abs(ay), t: 'mover' });
    }
  }
  return out;
}
const gapXZ = (a, b) => Math.hypot(Math.max(0, a.minX - b.maxX, b.minX - a.maxX), Math.max(0, a.minZ - b.maxZ, b.minZ - a.maxZ));
const contains = (r, x, z, m = 0) => x >= r.minX - m && x <= r.maxX + m && z >= r.minZ - m && z <= r.maxZ + m;

let failures = 0;
for (const st of STAGES) {
  const L = landables(st);
  const parts = st.parts.flat(3);
  const start = parts.find(p => p.t === 'bonfire' && p.start);
  const s0 = L.findIndex(r => contains(r, start.spawn[0], start.spawn[2]) && Math.abs(r.topHi - start.spawn[1]) < 0.01);
  if (s0 < 0) { console.log(`${st.id}: spawn not on a platform`); failures++; continue; }
  // BFS, tracking the tightest jump needed to get to each platform
  const best = new Array(L.length).fill(Infinity); best[s0] = 0;
  const from = new Array(L.length).fill(-1);
  let changed = true;
  while (changed) {
    changed = false;
    for (let a = 0; a < L.length; a++) {
      if (best[a] === Infinity) continue;
      for (let b = 0; b < L.length; b++) {
        if (a === b) continue;
        const A = L[a], B = L[b];
        const gap = gapXZ(A, B);
        const dy = B.topLo - A.topHi;  // most favourable timing
        let tight = Infinity;
        if (gap <= 2 * R && dy <= STEP) tight = 0;
        else {
          const v = A.bounce ? A.bounce : JUMP;
          const r = reach(dy, v);
          if (r > 0) { const lim = r + 2 * R; if (gap <= lim) tight = gap / lim; }
          if (A.bounce) { const r2 = reach(dy); if (r2 > 0 && gap <= r2 + 2 * R) tight = Math.min(tight, gap / (r2 + 2 * R)); }
        }
        const cost = Math.max(best[a], tight);
        if (cost < best[b] - 1e-9) { best[b] = cost; from[b] = a; changed = true; }
      }
    }
  }
  const problems = [];
  const reachableAt = (x, y, z, m, headroom) => L.some((r, i) => best[i] < Infinity && contains(r, x, z, m) && y - r.topHi <= headroom && y - r.topLo >= -0.5);
  const goalP = parts.find(p => p.t === 'goal');
  const gIdx = L.findIndex((r, i) => best[i] < Infinity && contains(r, goalP.p[0], goalP.p[2], 1.5) && Math.abs(r.topHi - goalP.p[1]) < 0.6);
  if (gIdx < 0) problems.push('GOAL UNREACHABLE');
  for (const b of parts.filter(p => p.t === 'bonfire')) if (!reachableAt(b.p[0], b.p[1], b.p[2], 0.3, 0.6)) problems.push(`bonfire at ${b.p} unreachable`);
  for (const s of parts.filter(p => p.t === 'soul')) if (!reachableAt(s.p[0], s.p[1], s.p[2], 0.9, apexOf(JUMP) + 0.8 + 0.9)) problems.push(`soul at ${s.p} unreachable`);
  // tightest jump on the route to the goal
  let worst = 0, chain = [];
  if (gIdx >= 0) { for (let i = gIdx; i >= 0 && i !== s0; i = from[i]) chain.push(i); worst = best[gIdx]; }
  const orphan = L.map((r, i) => best[i] === Infinity ? `${r.t}@[${((r.minX + r.maxX) / 2).toFixed(1)},${r.topHi},${((r.minZ + r.maxZ) / 2).toFixed(1)}]` : null).filter(Boolean);
  const nSouls = parts.filter(p => p.t === 'soul').length, nFires = parts.filter(p => p.t === 'bonfire').length;
  console.log(`${st.id} ${st.name.padEnd(24)} route ${chain.length + 1} platforms, tightest jump ${(worst * 100).toFixed(0)}% of max | souls ${nSouls} | bonfires ${nFires}${orphan.length ? ' | unreachable: ' + orphan.join(' ') : ''}`);
  for (const p of problems) { console.log('   ✗ ' + p); failures++; }
}
console.log(failures ? `\n${failures} problem(s)` : '\nAll stages completable.');
process.exit(failures ? 1 : 0);
