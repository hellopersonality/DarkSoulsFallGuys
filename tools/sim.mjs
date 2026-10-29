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

let problems = 0;
const events = {};
const engine = createEngine({ clientWidth: 1280, clientHeight: 720 }, {
  death: c => { events.death = (events.death || 0) + 1; events.cause = c; },
  goal: () => { events.goal = true; },
  bonfire: () => { events.bonfire = (events.bonfire || 0) + 1; },
  soul: () => { events.soul = (events.soul || 0) + 1; },
  retrieved: () => { events.retrieved = true; },
  note: () => {}, sound: () => {},
});

for (const st of STAGES) {
  for (const k in events) delete events[k];
  try {
    engine.load(st);
    const P = engine.player;
    const spawn = P.pos.clone();
    // 1) stand still for 10 s: nothing should kill you at spawn
    for (let i = 0; i < 600; i++) engine.step(1 / 60, { mx: 0, mz: 0, lookX: 0, lookY: 0, jumpPressed: false, jumpHeld: false });
    if (events.death) { console.log(`${st.id}: ✗ died standing at spawn (${events.cause})`); problems++; }
    const drift = Math.hypot(P.pos.x - spawn.x, P.pos.z - spawn.z);
    if (Math.abs(P.pos.y - spawn.y) > 0.05 || drift > 0.05) { console.log(`${st.id}: ✗ spawn not stable (moved ${drift.toFixed(2)}, dy ${(P.pos.y - spawn.y).toFixed(2)})`); problems++; }
    // 2) run forward jumping for 20 s (exercises hazards, deaths, respawns)
    let deaths = 0;
    for (let i = 0; i < 1200; i++) {
      engine.step(1 / 60, { mx: Math.sin(i / 90) * 0.3, mz: 1, lookX: 0, lookY: 0, jumpPressed: i % 40 === 0, jumpHeld: i % 40 < 20 });
      if (P.dead) { deaths++; for (let k = 0; k < 30; k++) engine.step(1 / 60, null); engine.respawn(); }
      for (const v of [P.pos.x, P.pos.y, P.pos.z, P.vel.x, P.vel.y, P.vel.z]) if (!Number.isFinite(v)) throw new Error('non-finite player state');
    }
    // 3) bonfire spawns stable, respawn and reset work
    for (const b of engine.world.bonfires) {
      engine.world.checkpoint = b; engine.respawn();
      for (let i = 0; i < 240; i++) engine.step(1 / 60, { mx: 0, mz: 0, lookX: 0, lookY: 0, jumpPressed: false, jumpHeld: false });
      if (P.dead || Math.abs(P.pos.y - b.spawn.y) > 0.05) { console.log(`${st.id}: ✗ bonfire spawn at ${b.spawn.x},${b.spawn.z} unsafe (dead=${P.dead})`); problems++; P.dead = false; }
    }
    engine.resetStage();
    // 4) teleport onto the goal: it must trigger
    const g = engine.world.goal.pos;
    P.pos.set(g.x, g.y + 0.5, g.z); P.vel.set(0, 0, 0);
    for (let i = 0; i < 30 && !events.goal; i++) engine.step(1 / 60, { mx: 0, mz: 0, lookX: 0, lookY: 0, jumpPressed: false, jumpHeld: false });
    if (!events.goal) { console.log(`${st.id}: ✗ goal did not trigger`); problems++; }
    console.log(`${st.id} ${st.name.padEnd(24)} ok — ${engine.world.solids.length} solids, scripted run: ${deaths} deaths, souls ${events.soul || 0}`);
  } catch (e) {
    console.log(`${st.id}: ✗ ${e.stack.split('\n').slice(0, 3).join(' | ')}`); problems++;
  }
}
console.log(problems ? `\n${problems} problem(s)` : '\nAll stages ran clean.');
process.exit(problems ? 1 : 0);
