// Headless smoke test: loads every stage through the real engine (with a three.js stand-in) and plays scripted input.
// Run: node tools/sim.mjs
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

const stubURL = pathToFileURL(new URL('./three-stub.mjs', import.meta.url).pathname).href;
register('data:text/javascript,' + encodeURIComponent(`
  export async function resolve(spec, ctx, next) {
    if (spec.startsWith('https://cdn.jsdelivr.net/npm/three')) return { url: ${JSON.stringify(stubURL)}, shortCircuit: true };
    return next(spec, ctx);
  }`));

const ctx2d = new Proxy({}, { get: (t, k) => k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {} });
globalThis.window = { devicePixelRatio: 1, innerWidth: 1280, innerHeight: 720, addEventListener() {} };
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx2d }) };

const { createEngine } = await import('../src/engine.js');
const { STAGES } = await import('../src/stages.js');
const { reach: reachChecker } = await import('./validate.mjs?lib');

let problems = 0;
const events = {};
const engine = createEngine({ clientWidth: 1280, clientHeight: 720 }, {
  death: c => { events.death = (events.death || 0) + 1; events.cause = c; },
  goal: () => { events.goal = true; },
  bonfire: () => { events.bonfire = (events.bonfire || 0) + 1; },
  soul: () => { events.soul = (events.soul || 0) + 1; },
  retrieved: () => { events.retrieved = true; },
  note: () => {}, sound: () => {}, lantern: () => {},
});

const idle = { mx: 0, mz: 0, lookX: 0, lookY: 0, jumpPressed: false, jumpHeld: false, dashPressed: false };

// ---- movement calibration: the real engine must jump as far as the level checker assumes
{
  const flat = { id: 'calib', biome: 'castle', killY: -50, tempo: 1, parts: [
    { t: 'box', p: [0, 0, 0], s: [10, 2, 600] }, { t: 'bonfire', p: [3, 0, 290], spawn: [0, 0, 290], start: true } ] };
  const { PHYS } = await import('../src/phys.js');
  // plan: { slide, dashAt (s after takeoff), doubleLate (double jump just before landing) }
  const measure = (plan) => {
    engine.load(flat);
    const P = engine.player;
    for (let i = 0; i < 60; i++) engine.step(1 / 60, { ...idle, mz: 1 });      // get up to speed
    let z0 = null, y0 = 0, t = 0, slid = false, dashed = false, doubled = false;
    for (let i = 0; i < 400; i++) {
      const inp = { ...idle, mz: 1, jumpHeld: true };
      if (plan.slide && !slid) { inp.dashPressed = true; slid = true; }
      else if (z0 === null && P.grounded && (!plan.slide || i > 1)) inp.jumpPressed = true;
      if (z0 !== null) {
        t += 1 / 60;
        if (plan.dashAt !== undefined && !dashed && t >= plan.dashAt) { inp.dashPressed = true; dashed = true; }
        if (plan.doubleLate && !doubled && P.vel.y < 0 && P.pos.y - y0 < 0.35 && t > 0.2) { inp.jumpPressed = true; doubled = true; }
        if (plan.doubleAt !== undefined && !doubled && t >= plan.doubleAt) { inp.jumpPressed = true; doubled = true; }
      }
      engine.step(1 / 60, inp);
      if (z0 === null && !P.grounded) { z0 = P.pos.z; y0 = P.pos.y; }
      if (z0 !== null && P.grounded) return z0 - P.pos.z;
    }
    return NaN;
  };
  const single = measure({}), dbl = measure({ doubleLate: true }), full = measure({ slide: true, doubleAt: 0.56, dashAt: 1.08 });
  const chk = { single: reachChecker(0, 0), double: reachChecker(0, 1), full: reachChecker(0, 2) };
  console.log(`engine jump distance on flat ground: single ${single.toFixed(1)} m, double ${dbl.toFixed(1)} m, slide-jump+double+dash ${full.toFixed(1)} m`);
  console.log(`level checker assumes (best timing):  single ${chk.single.toFixed(1)} m, double ${chk.double.toFixed(1)} m, full ${chk.full.toFixed(1)} m`);
  // the checker must never assume more than the engine can do (small slack for frame timing)
  for (const [k, v] of [['single', single], ['double', dbl], ['full', full]]) if (!(v >= chk[k] - 0.6)) { console.log(`✗ ${k} jump: engine ${v.toFixed(2)} m < checker ${chk[k].toFixed(2)} m`); problems++; }
  // slide must fit under a 1 m high gate, standing must not
  const gateStage = { id: 'gate', biome: 'castle', killY: -50, tempo: 1, parts: [
    { t: 'box', p: [0, 0, 0], s: [10, 2, 60] }, { t: 'box', p: [0, 2.2, 0], s: [10, 1.2, 1.2], unsafe: true }, { t: 'bonfire', p: [3, 0, 8], spawn: [0, 0, 8], start: true } ] };
  engine.load(gateStage); let P = engine.player;
  for (let i = 0; i < 120; i++) engine.step(1 / 60, { ...idle, mz: 1 });
  const walked = P.pos.z;
  engine.load(gateStage); P = engine.player;
  for (let i = 0; i < 120; i++) engine.step(1 / 60, { ...idle, mz: 1, dashPressed: i === 30 });
  const slid = P.pos.z;
  console.log(`gate test: walking stops at z=${walked.toFixed(2)}, sliding reaches z=${slid.toFixed(2)}`);
  if (!(walked > 0.5 && slid < -1.5)) { console.log('✗ slide gate does not behave'); problems++; }
}

for (const st of STAGES) {
  for (const k in events) delete events[k];
  try {
    engine.load(st);
    const P = engine.player;
    const spawn = P.pos.clone();
    // 1) stand still for 10 s: nothing should kill you at spawn
    for (let i = 0; i < 600; i++) engine.step(1 / 60, idle);
    if (events.death) { console.log(`${st.id}: ✗ died standing at spawn (${events.cause})`); problems++; }
    const drift = Math.hypot(P.pos.x - spawn.x, P.pos.z - spawn.z);
    if (Math.abs(P.pos.y - spawn.y) > 0.05 || drift > 0.05) { console.log(`${st.id}: ✗ spawn not stable (moved ${drift.toFixed(2)}, dy ${(P.pos.y - spawn.y).toFixed(2)})`); problems++; }
    // 2) run forward jumping, double jumping, dashing and sliding for 20 s (exercises hazards, deaths, respawns)
    let deaths = 0;
    for (let i = 0; i < 1200; i++) {
      engine.step(1 / 60, { mx: Math.sin(i / 90) * 0.3, mz: 1, lookX: 0, lookY: 0, jumpPressed: i % 40 === 0 || i % 40 === 18, jumpHeld: i % 40 < 20, dashPressed: i % 40 === 26 || i % 97 === 5 });
      if (P.dead) { deaths++; for (let k = 0; k < 30; k++) engine.step(1 / 60, null); engine.respawn(); }
      for (const v of [P.pos.x, P.pos.y, P.pos.z, P.vel.x, P.vel.y, P.vel.z]) if (!Number.isFinite(v)) throw new Error('non-finite player state');
    }
    // 3) every bonfire and lantern spawn is stable and safe
    for (const b of [...engine.world.bonfires, ...engine.world.lanterns]) {
      engine.world.checkpoint = b; engine.respawn();
      for (let i = 0; i < 300; i++) engine.step(1 / 60, idle);
      if (P.dead || Math.abs(P.pos.y - b.spawn.y) > 0.05) { console.log(`${st.id}: ✗ ${b.kind || 'bonfire'} spawn at ${b.spawn.x},${b.spawn.z} unsafe (dead=${P.dead})`); problems++; P.dead = false; }
    }
    engine.resetStage();
    // 4) teleport onto the goal: it must trigger
    const g = engine.world.goal.pos;
    P.pos.set(g.x, g.y + 0.5, g.z); P.vel.set(0, 0, 0);
    for (let i = 0; i < 30 && !events.goal; i++) engine.step(1 / 60, idle);
    if (!events.goal) { console.log(`${st.id}: ✗ goal did not trigger`); problems++; }
    console.log(`${st.id} ${st.name.padEnd(24)} ok — ${engine.world.solids.length} solids, ${engine.world.lanterns.length} lanterns, scripted run: ${deaths} deaths, souls ${events.soul || 0}`);
  } catch (e) {
    console.log(`${st.id}: ✗ ${e.stack.split('\n').slice(0, 3).join(' | ')}`); problems++;
  }
}
console.log(problems ? `\n${problems} problem(s)` : '\nAll stages ran clean.');
process.exit(problems ? 1 : 0);
