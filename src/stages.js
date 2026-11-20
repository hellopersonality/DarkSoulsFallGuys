// Ashen Gauntlet — stage data. Pure data + small helpers; no three.js here so the level checker can load it.
// Conventions: the course runs toward -z. A part's p[1] is the TOP surface height (for blades/arrows it is the height they fly at).
// Reach on flat ground (edge to edge): single jump ~7 m, double jump ~12 m, with dash / slide-jump ~18 m.
// `tempo` speeds up every hazard in the stage (1 = authored speed).

const box = (x, y, z, w, h, d, o = {}) => ({ t: 'box', p: [x, y, z], s: [w, h, d], ...o });
const crumble = (x, y, z, w = 3, d = 3, o = {}) => ({ t: 'crumble', p: [x, y, z], s: [w, 1, d], ...o });
const mover = (x, y, z, w, d, move, speed = 1, phase = 0, o = {}) => ({ t: 'mover', p: [x, y, z], s: [w, o.h ?? 0.6, d], move, speed, phase, ...o });
const blink = (x, y, z, w, d, cycle, on, offset) => ({ t: 'blink', p: [x, y, z], s: [w, 0.6, d], cycle, on, offset });
const bounce = (x, y, z, w, d, power) => ({ t: 'bounce', p: [x, y, z], s: [w, 0.6, d], power });
const soul = (x, y, z) => ({ t: 'soul', p: [x, y, z] });
const note = (x, y, z, text) => ({ t: 'note', p: [x, y, z], text });
const bonfire = (x, y, z, spawn, o = {}) => ({ t: 'bonfire', p: [x, y, z], spawn, ...o });
const lantern = (x, y, z, spawn, o = {}) => ({ t: 'lantern', p: [x, y, z], spawn, ...o });
const light = (x, y, z, o = {}) => ({ t: 'light', p: [x, y, z], ...o });
const pendulum = (x, y, z, o = {}) => ({ t: 'pendulum', p: [x, y, z], ...o });
const spinner = (x, y, z, o = {}) => ({ t: 'spinner', p: [x, y, z], ...o });
const vent = (x, y, z, o = {}) => ({ t: 'vent', p: [x, y, z], ...o });
const crusher = (x, y, z, o = {}) => ({ t: 'crusher', p: [x, y, z], ...o });
const arrows = (x, y, z, dir, o = {}) => ({ t: 'arrows', p: [x, y, z], dir, ...o });
const wind = (x, y, z, s, dir, o = {}) => ({ t: 'wind', p: [x, y, z], s, dir, ...o });
const goal = (x, y, z, kind = 'gate', o = {}) => ({ t: 'goal', p: [x, y, z], kind, ...o });
// a half-lowered portcullis: its underside sits 1 m above the floor, so you must slide beneath it
const gate = (x, y, z, w, d = 1.2) => box(x, y + 2.2, z, w, 1.2, d, { mat: 'wall', unsafe: true });
// stairs climbing toward -z: n steps starting at the edge z0, each `rise` higher and `depth` long
const stairs = (x, y0, z0, n, rise, depth, w, o = {}) =>
  Array.from({ length: n }, (_, i) => box(x, y0 + rise * (i + 1), z0 - depth * (i + 0.5), w, o.h ?? 1.2, depth, o));
// a row of merlons (solid battlements) along one side of a wall walk
const merlons = (x, y, z0, z1, every = 2.5) => {
  const out = []; for (let z = z0; z > z1; z -= every) out.push(box(x, y + 1.1, z, 0.6, 1.1, 1.2, { mat: 'pillar' })); return out;
};

export const BIOMES = [
  { id: 'town', name: 'Emberwick', sub: 'The town beneath the castle' },
  { id: 'castle', name: 'Castle Duskmoor', sub: 'Halls of iron and fire' },
  { id: 'summit', name: 'The Duskmoor Summit', sub: 'Where the storm lives' },
];

export const STAGES = [
  /* ============================================================ 1-1 */
  {
    id: '1-1', biome: 'town', name: 'Lowtown Market', seed: 11, killY: -6, tempo: 1.1, decor: { floor: 'water', level: -3.5, ground: -3.5 },
    parts: [
      box(0, 0, 0, 16, 2, 14),
      bonfire(-4, 0, 3, [-2, 0, 4], { start: true }),
      note(2, 0, -3, 'Jump, then jump again in the air.'),
      box(0, 0.6, -10.5, 5, 1, 4, { mat: 'wood' }),
      box(3, 1.4, -16, 4, 1, 4, { mat: 'wood' }),
      box(-1, 2.0, -21.5, 4, 1, 4, { mat: 'wood' }),
      note(-2, 2.0, -21.5, 'Rotten planks, then a long leap. Jump twice.'),
      crumble(-1, 2.0, -27, 6, 4),
      soul(-0.5, 4.6, -33.8),
      box(0, 2.4, -45.5, 8, 1, 14),
      lantern(2.8, 2.4, -40, [1.6, 2.4, -40.2]),
      note(-2.4, 2.4, -40, 'Beams ahead. Shift on the ground to slide beneath.'),
      spinner(0, 2.4, -44.5, { r: 3.8, speed: 1.3, high: true }),
      pendulum(0, 3.3, -50, { L: 8, amp: 1.0, speed: 1.6, style: 'sign', r: 1.0 }),
      stairs(0, 2.4, -52.5, 10, 0.45, 2, 6),
      { t: 'roller', from: [0, 6.9, -71.5], to: [0, 2.4, -52.5], lanes: [-1.5, 1.5], every: 1.6, speed: 6.5, r: 0.7, kind: 'barrel' },
      box(0, 6.9, -77.5, 10, 1.2, 8),
      bonfire(3.5, 6.9, -76.5, [2, 6.9, -75.5]),
      note(-2, 6.9, -75.5, 'Rooftops. Never stop moving.'),
      box(8, 7.4, -86, 3, 1, 3, { mat: 'wood' }), soul(8, 8.4, -86),
      box(-4, 7.5, -86, 5, 1, 5, { mat: 'wood' }),
      crumble(-8, 8.2, -91.5, 3, 3), soul(-8, 9.2, -91.5),
      box(-6, 9.0, -97, 4, 1, 4, { mat: 'wood' }),
      lantern(-7.4, 9.0, -97.6, [-6, 9.0, -97]),
      mover(-1, 9.0, -102.5, 3, 3, [3, 0, 0], 1.0),
      box(2, 9.5, -108, 5, 1, 5, { mat: 'wood' }), soul(2, 12.5, -112),
      box(2, 9.5, -119, 12, 1.2, 8),
      goal(2, 9.5, -121, 'gate'),
      light(5, 4.5, -40), light(-4, 9, -74), light(6, 12, -117),
    ],
  },
  /* ============================================================ 1-2 */
  {
    id: '1-2', biome: 'town', name: 'Highstreet Rooftops', seed: 23, killY: -6, tempo: 1.15, decor: { floor: 'water', level: -3.5, ground: -3.5 },
    parts: [
      box(0, 0, 0, 12, 2, 12),
      bonfire(-3, 0, 3, [-1.5, 0, 4], { start: true }),
      note(1.5, 0, -4, 'Hay ahead. It sends you skyward.'),
      bounce(0, 0.6, -9, 3, 3, 18),
      box(0, 4.0, -15, 8, 1, 5, { mat: 'wood' }),
      box(0, 4, -25, 12, 1, 12),
      spinner(0, 4, -25, { r: 5.4, speed: 1.5, arms: 2 }),
      soul(-5, 5, -20), soul(5, 5, -30),
      { t: 'conveyor', p: [0, 4, -42], s: [4, 1, 20], dir: [0, 1], speed: 3.6 },
      pendulum(0, 4.9, -38, { L: 9, amp: 1.0, speed: 1.6 }),
      pendulum(0, 4.9, -46, { L: 9, amp: 1.0, speed: 1.6, phase: 1.6 }),
      box(0, 4, -57, 10, 1, 8),
      bonfire(-3, 4, -56, [-1.5, 4, -55]),
      note(2.5, 4, -55, 'Too far to leap. Jump, jump again, then Shift to dash.'),
      soul(0, 6.5, -68),
      box(0, 4.5, -77, 6, 1, 5, { mat: 'wood' }),
      lantern(2.4, 4.5, -78.8, [0, 4.5, -77]),
      crumble(0, 5.0, -84, 3, 3),
      crumble(-4, 5.5, -89, 3, 3), soul(-4, 6.5, -89),
      crumble(-8, 6.0, -94, 3, 3),
      bounce(-8, 6.6, -99.5, 3, 3, 19),
      box(-8, 10, -112, 4, 1, 20),
      note(-7, 10, -104, 'Arrows ahead. Keep moving.'),
      arrows(-2, 11, -107, [-1, 0], { every: 1.6, speed: 17, range: 12 }),
      arrows(-2, 11, -112, [-1, 0], { every: 1.6, speed: 17, range: 12, offset: 0.55 }),
      arrows(-2, 11, -117, [-1, 0], { every: 1.6, speed: 17, range: 12, offset: 1.1 }),
      soul(-8, 13, -126),
      box(-8, 10, -136, 10, 1, 8),
      goal(-8, 10, -138, 'gate'),
      light(6, 7, -25), light(-4, 7, -57), light(-12, 13, -132),
    ],
  },
  /* ============================================================ 1-3 */
  {
    id: '1-3', biome: 'town', name: 'The Drawbridge', seed: 37, killY: -3, tempo: 1.2, decor: { floor: 'water', level: -1.5, ground: -1.5 },
    parts: [
      box(0, 0, 0, 12, 2, 10),
      bonfire(-3, 0, 2, [-1.5, 0, 3], { start: true }),
      note(2, 0, -3, 'Floating crates. They will not wait.'),
      mover(-2, 0.3, -8, 2.4, 2.4, [0, 0.5, 0], 1.3, 0),
      mover(2, 0.3, -12.5, 2.4, 2.4, [0, 0.5, 0], 1.1, 1.5), soul(2, 1.6, -12.5),
      mover(-2, 0.3, -17, 2.4, 2.4, [0, 0.5, 0], 1.5, 3),
      mover(1.5, 0.3, -21.5, 2.4, 2.4, [0, 0.5, 0], 1.2, 4.5),
      box(0, 1, -26, 14, 1.5, 8), soul(5, 2, -24),
      lantern(5.6, 1, -28.6, [4.2, 1, -27.4]),
      note(-3, 1, -28, 'The bridge rises and falls. Time your crossing.'),
      mover(0, 1, -34, 6, 4.5, [0, 2.2, 0], 1.0, 0, { dwell: true }),
      mover(0, 1, -39.5, 6, 4.5, [0, 2.2, 0], 1.0, 2.1, { dwell: true }), soul(0, 5.2, -39.5),
      mover(0, 1, -45, 6, 4.5, [0, 2.2, 0], 1.0, 4.2, { dwell: true }),
      arrows(-10, 2.6, -34, [1, 0], { every: 2.2, speed: 16, range: 22 }),
      arrows(10, 2.6, -45, [-1, 0], { every: 2.2, speed: 16, range: 22, offset: 1.1 }),
      box(0, 3.2, -52, 14, 1.5, 10), soul(6, 4.2, -50),
      bonfire(-5, 3.2, -50, [-3.5, 3.2, -49]),
      note(3, 3.2, -55, 'Do not stop beneath the iron. Slide.'),
      box(0, 3.2, -66, 4, 1.5, 18),
      box(-2.6, 9.2, -66, 1.2, 6, 18, { mat: 'wall' }),
      box(2.6, 9.2, -66, 1.2, 6, 18, { mat: 'wall' }),
      crusher(0, 3.2, -61, { s: [4, 3, 2.5], rise: 3.6, cycle: 2.4, offset: 0 }),
      crusher(0, 3.2, -66, { s: [4, 3, 2.5], rise: 3.6, cycle: 2.4, offset: 0.8 }),
      crusher(0, 3.2, -71, { s: [4, 3, 2.5], rise: 3.6, cycle: 2.4, offset: 1.6 }),
      box(0, 3.2, -84, 16, 1.5, 18),
      lantern(7, 3.2, -76, [5.6, 3.2, -76.2]),
      ...[-6, -2, 2, 6].flatMap((x, c) => [-79, -84, -89].map((z, r) =>
        vent(x, 3.2, z, { r: 1.2, cycle: 2.7, on: 1.2, offset: -((c + r) % 3) * 0.9 }))),
      soul(0, 4.6, -84),
      stairs(0, 3.2, -93, 8, 0.45, 2, 6),
      { t: 'roller', from: [0, 6.8, -108], to: [0, 3.2, -93], lanes: [-1.5, 1.5], every: 1.8, speed: 7, r: 0.85, kind: 'boulder' },
      note(2, 6.8, -108.4, 'The moat. Leap twice.'),
      soul(0, 9.5, -113.8),
      box(0, 6.8, -122.5, 12, 1.5, 8), soul(-5, 7.8, -121),
      goal(0, 6.8, -125.5, 'door', { r: 2.6 }),
      light(-6, 5, -26), light(0, 7, -52), light(-7, 6, -84), light(7, 6, -84),
    ],
  },
  /* ============================================================ 2-1 */
  {
    id: '2-1', biome: 'castle', name: 'The Great Hall', seed: 41, killY: -8, tempo: 1.25, decor: { supports: true, floor: 'lava', level: -6 },
    parts: [
      box(0, 0, 0, 12, 2, 10),
      bonfire(-3, 0, 2, [-1.5, 0, 3], { start: true }),
      note(2, 0, -3, 'Pressure plates. Do not stop. Sliding is faster.'),
      box(0, 0, -14, 6, 2, 18),
      ...[-8, -12, -16, -20].map(z => ({ t: 'spikes', p: [0, 0, z], s: [5.8, 3.8], trap: true, delay: 0.65, up: 1.0, reset: 0.8 })),
      soul(2, 1, -12),
      lantern(2.4, 0, -22.4, [1, 0, -22.4]),
      note(-2, 0, -22.6, 'The floor comes and goes. Watch the glow.'),
      blink(0, 0, -26.5, 3.5, 3.5, 3, 1.9, 0),
      blink(-3, 0.5, -31, 3.5, 3.5, 3, 1.9, -0.6), soul(-3, 1.5, -31),
      blink(0, 1.0, -35.5, 3.5, 3.5, 3, 1.9, -1.2),
      blink(3, 1.5, -40, 3.5, 3.5, 3, 1.9, -1.8),
      box(0, 1.5, -49, 14, 1.5, 14),
      spinner(0, 1.5, -49, { r: 6, speed: 1.8, arms: 2, high: true }),
      soul(5, 2.5, -55), soul(-5, 2.5, -55),
      bonfire(-6, 1.5, -43.5, [-5, 1.5, -43]),
      note(4.5, 1.5, -44, 'Over the blades or under them. Your choice.'),
      box(0, 1.5, -61, 3, 1.5, 10),
      box(0, 1.5, -80, 3, 1.5, 10),
      pendulum(0, 2.4, -59, { L: 9, amp: 1.0, speed: 1.8, phase: 0 }),
      pendulum(0, 3.6, -70.5, { L: 9, amp: 1.0, speed: 1.8, phase: 1.2 }),
      pendulum(0, 2.4, -78, { L: 9, amp: 1.0, speed: 1.8, phase: 2.4 }),
      pendulum(0, 2.4, -83, { L: 9, amp: 1.0, speed: 1.8, phase: 3.6 }),
      soul(0, 4.6, -70.5),
      box(0, 1.5, -88.5, 3, 1.5, 3),
      lantern(1.2, 1.5, -88.9, [0, 1.5, -88.5]),
      mover(0, 4.0, -93, 3, 3, [0, 2.5, 0], 1.0, 0, { dwell: true }),
      box(0, 6.5, -100, 10, 1.5, 8), soul(4, 7.5, -98),
      goal(0, 6.5, -102, 'door', { r: 2.6 }),
      light(0, 8, -18), light(0, 9, -49), light(0, 8, -70), light(0, 11, -99),
    ],
  },
  /* ============================================================ 2-2 */
  (() => {
    const C = [0, -20], RAD = 8, parts = [];
    const at = (i) => { const a = i * Math.PI / 6; return [RAD * Math.sin(a), C[1] + RAD * Math.cos(a), a]; };
    parts.push(box(0, 0, -6, 10, 2, 8));
    parts.push(bonfire(-3, 0, -3.5, [-1.5, 0, -3], { start: true }));
    parts.push(note(2, 0, -4, 'Up is the only way out. Some steps are missing.'));
    parts.push(box(0, 24, -20, 4, 34, 4, { mat: 'pillar' }));
    const blinkSet = new Set([5, 18, 21]), crumbleSet = new Set([2, 3]), moverSet = new Set([13, 14, 15, 16]), missing = new Set([7, 19]);
    for (let i = 0; i < 24; i++) {
      if (i === 12 || missing.has(i)) continue;
      const [x, z, a] = at(i), top = 0.9 * (i + 1);
      if (crumbleSet.has(i)) parts.push(crumble(x, top, z, 3.2, 3.2));
      else if (blinkSet.has(i)) parts.push(blink(x, top, z, 3.2, 3.2, 2.6, 1.8, -0.5 * i));
      else if (moverSet.has(i)) parts.push(mover(x, top, z, 3.2, 3.2, [Math.sin(a) * 1.2, 0, Math.cos(a) * 1.2], 1.4, i));
      else parts.push(box(x, top, z, 3.2, 0.8, 3.2));
      if (i === 8 || i === 10) parts.push(crusher(x, top, z, { s: [3.2, 2.5, 3.2], rise: 3.0, cycle: 2.4, offset: i * 0.3 }));
      if ([4, 9, 15, 20].includes(i)) parts.push(arrows(Math.sin(a) * 2.6, top + 1.0, C[1] + Math.cos(a) * 2.6, [Math.sin(a), Math.cos(a)], { every: 2.0, speed: 15, range: 10, offset: i * 0.2 }));
      if ([6, 11, 14].includes(i)) parts.push(soul(x, top + 1, z));
      if (i === 6 || i === 17) parts.push(lantern(x + Math.sin(a) * 1.1, top, z + Math.cos(a) * 1.1, [x, top, z], { yaw: a - Math.PI / 2 }));
    }
    // souls over the missing steps
    for (const i of missing) { const [x, z] = at(i); parts.push(soul(x, 0.9 * (i + 1) + 2, z)); }
    // halfway landing (i = 12) with a bonfire
    parts.push(box(0, 11.7, -12, 6, 1, 6));
    parts.push(bonfire(-1.5, 11.7, -10.5, [0.5, 11.7, -10.5], { yaw: -Math.PI / 2 }));
    parts.push(wind(0, 17.5, -20, [30, 7, 30], 'radial', { center: C, force: 3.5, cycle: 4, on: 1.4 }));
    // exit (i = 24)
    parts.push(box(0, 22.5, -11, 8, 1.5, 6));
    parts.push(goal(0, 22.5, -9.5, 'gate'));
    parts.push(light(10, 6, -20), light(-10, 14, -20), light(0, 20, -32));
    return { id: '2-2', biome: 'castle', name: 'The Rising Keep', seed: 53, killY: -8, tempo: 1.25, decor: { tower: { c: C, r: 14, h: 48 }, floor: 'pit' }, parts };
  })(),
  /* ============================================================ 2-3 */
  {
    id: '2-3', biome: 'castle', name: 'The Clockwork Gallery', seed: 67, killY: -8, tempo: 1.3, decor: { supports: true, floor: 'goop', level: -6 },
    parts: [
      box(0, 0, 0, 10, 2, 8),
      bonfire(-3, 0, 2, [-1.5, 0, 3], { start: true }),
      note(2, 0, -2.5, 'The floor fights you. So does the ceiling.'),
      { t: 'conveyor', p: [0, 0, -17], s: [4, 2, 26], dir: [0, 1], speed: 3.4 },
      crusher(0, 0, -11, { s: [4, 3, 2.5], rise: 3.4, cycle: 2.3, offset: 0 }),
      crusher(0, 0, -17, { s: [4, 3, 2.5], rise: 3.4, cycle: 2.3, offset: 0.77 }),
      crusher(0, 0, -23, { s: [4, 3, 2.5], rise: 3.4, cycle: 2.3, offset: 1.53 }),
      box(0, 0, -39.5, 12, 2, 13),
      mover(0, 2.0, -38.5, 3, 3, [4.5, 0, 0], 1.6, 0, { h: 2 }),
      mover(0, 2.0, -43.5, 3, 3, [4.5, 0, 0], 1.6, Math.PI, { h: 2 }),
      soul(4.5, 1, -45.2),
      box(0, 0, -52.5, 8, 2, 6),
      bonfire(-2.5, 0, -52, [-1, 0, -51]),
      note(2.5, 0, -51, 'The gears turn faster. Leap twice between them.'),
      box(-4, 0.5, -64.5, 6, 1.5, 6), spinner(-4, 0.5, -64.5, { r: 2.6, speed: 2.4, arms: 2 }),
      box(3, 1.0, -79, 6, 1.5, 6), spinner(3, 1.0, -79, { r: 2.6, speed: -2.4, arms: 2, high: true }), soul(3, 4.0, -71.5),
      box(-3, 1.5, -93.5, 6, 1.5, 6), spinner(-3, 1.5, -93.5, { r: 2.6, speed: 2.8, arms: 2 }), soul(-3, 4.5, -86),
      lantern(-5.6, 1.5, -91.0, [-5.5, 1.5, -91.2]),
      blink(0, 2.4, -100, 3, 3, 2.6, 1.6, 0),
      blink(1.5, 3.3, -104, 3, 3, 2.6, 1.6, -0.5), soul(1.5, 4.3, -104),
      blink(-1.5, 4.2, -108, 3, 3, 2.6, 1.6, -1.0),
      blink(1.5, 5.1, -112, 3, 3, 2.6, 1.6, -1.5),
      box(0, 5.1, -123.5, 3, 1.5, 20),
      lantern(1.2, 5.1, -114.2, [0, 5.1, -114.4]),
      arrows(-6, 6.1, -117.5, [1, 0], { every: 1.7, speed: 18, range: 13 }),
      arrows(6, 6.1, -123.5, [-1, 0], { every: 1.7, speed: 18, range: 13, offset: 0.6 }),
      arrows(-6, 6.1, -129.5, [1, 0], { every: 1.7, speed: 18, range: 13, offset: 1.2 }),
      note(1, 5.1, -132.6, 'The last gap. Everything you have.'),
      soul(0, 7.5, -140.5),
      box(0, 5.1, -151.5, 8, 1.5, 8),
      goal(0, 5.1, -153.5, 'door', { r: 2.6 }),
      light(0, 7, -17), light(0, 6, -40), light(0, 7, -79), light(0, 10, -123),
    ],
  },
  /* ============================================================ 3-1 */
  {
    id: '3-1', biome: 'summit', name: 'The Ramparts', seed: 71, killY: 2, tempo: 1.3, decor: { floor: 'storm', level: 3.5 },
    parts: [
      box(0, 10, 0, 8, 2, 8),
      bonfire(-2, 10, 2, [-1, 10, 3], { start: true }),
      note(1.5, 10, -2.5, 'Wind ahead. Slide under the gates.'),
      box(0, 10, -20, 4, 2, 32),
      merlons(2.3, 10, -6, -35),
      gate(0, 10, -14, 4), gate(0, 10, -28, 4),
      wind(0, 10, -20, [10, 4, 32], [-1, 0], { force: 4.0, cycle: 3.6, on: 1.5 }),
      box(0, 10, -42, 10, 2, 10), soul(-3.5, 11, -42),
      lantern(3.5, 10, -41, [2.5, 10, -40]),
      crumble(0, 10, -53, 3, 3),
      crumble(1.2, 10, -61, 3, 3), soul(1.2, 12.5, -57),
      crumble(-1.2, 10, -69, 3, 3),
      box(0, 10, -78, 10, 2, 10), soul(4, 11, -78),
      bonfire(-3, 10, -76, [-1.5, 10, -75]),
      note(2, 10, -81, 'Arrows, wind, a gate. Then the long jump.'),
      box(0, 10, -100, 4, 2, 34),
      merlons(-2.3, 10, -84, -116),
      gate(0, 10, -102, 4),
      wind(0, 10, -97, [10, 4, 26], [1, 0], { force: 4.0, cycle: 3.2, on: 1.3, offset: 1 }),
      ...[-90, -96, -108, -114].map((z, i) => arrows(-5, 11, z, [1, 0], { every: 1.9, speed: 17, range: 12, offset: i * 0.5 })),
      soul(0, 11, -94),
      lantern(1.2, 10, -115.8, [0, 10, -116]),
      soul(0, 12.5, -123.5),
      stairs(0, 10, -130, 10, 0.45, 2, 4),
      { t: 'roller', from: [0, 14.5, -149], to: [0, 10, -130], lanes: [0], every: 2.2, speed: 6.5, r: 0.8, kind: 'boulder' },
      box(0, 14.5, -155, 10, 2, 10),
      goal(0, 14.5, -157, 'gate'),
      light(0, 13, -42), light(0, 13, -78), light(0, 17, -155),
    ],
  },
  /* ============================================================ 3-2 */
  {
    id: '3-2', biome: 'summit', name: 'The Bell Tower', seed: 83, killY: 12, tempo: 1.35, decor: { floor: 'storm', level: 13.5 },
    parts: [
      box(0, 20, 0, 8, 2, 8),
      bonfire(-2, 20, 2, [-1, 20, 3], { start: true }),
      note(1.5, 20, -2.5, 'A narrow way. A broken beam. A long fall.'),
      box(0, 20, -7.5, 1.4, 1, 7),
      box(0, 20, -22, 1.4, 1, 7), soul(0, 22.5, -15),
      wind(0, 20, -15, [8, 4, 22], [1, 0], { force: 2.5, cycle: 3.4, on: 1.1 }),
      box(0, 20, -30, 8, 2, 8),
      lantern(2.5, 20, -31.5, [1.5, 20, -30]),
      box(0, 20, -46, 1.6, 1, 20), soul(0, 21.2, -46),
      pendulum(0, 21.2, -42, { L: 8, amp: 0.9, speed: 1.3, style: 'bell', r: 1.5 }),
      pendulum(0, 21.2, -50, { L: 8, amp: 0.9, speed: 1.3, phase: 1.6, style: 'bell', r: 1.5 }),
      box(0, 20, -61, 8, 2, 8),
      bonfire(-2.5, 20, -60, [-1, 20, -59]),
      blink(2.5, 21, -68, 3, 3, 3, 1.8, 0),
      blink(-2.5, 22, -72, 3, 3, 3, 1.8, -0.6),
      blink(2.5, 23, -76, 3, 3, 3, 1.8, -1.2),
      blink(-2.5, 24, -80, 3, 3, 3, 1.8, -1.8),
      blink(2.5, 25, -84, 3, 3, 3, 1.8, -2.4), soul(2.5, 26, -84),
      box(0, 25, -98, 4, 2, 22),
      lantern(1.2, 25, -87.6, [0, 25, -87.8]),
      crusher(0, 25, -92, { s: [4, 3, 2.5], rise: 3.4, cycle: 2.3, offset: 0 }),
      crusher(0, 25, -98, { s: [4, 3, 2.5], rise: 3.4, cycle: 2.3, offset: 0.75 }),
      crusher(0, 25, -104, { s: [4, 3, 2.5], rise: 3.4, cycle: 2.3, offset: 1.5 }),
      soul(0, 26, -98),
      note(1, 25, -108.4, 'Leap, leap again, and dash.'),
      soul(0, 27.5, -115.5),
      box(0, 25, -129, 10, 2, 14), soul(4, 26, -124),
      vent(-2.5, 25, -125, { style: 'lightning', r: 1.2, cycle: 2.6, on: 0.45, offset: 0 }),
      vent(2.5, 25, -129, { style: 'lightning', r: 1.2, cycle: 2.6, on: 0.45, offset: -0.87 }),
      vent(-1, 25, -132, { style: 'lightning', r: 1.2, cycle: 2.6, on: 0.45, offset: -1.73 }),
      goal(0, 25, -134.5, 'gate'),
      light(0, 23, -30), light(0, 23, -61), light(0, 28, -98),
    ],
  },
  /* ============================================================ 3-3 */
  {
    id: '3-3', biome: 'summit', name: 'The Spire', seed: 97, killY: 22, tempo: 1.4, decor: { floor: 'vortex', level: 23.5 },
    parts: [
      box(0, 30, 0, 8, 2, 8),
      bonfire(-2, 30, 2, [-1, 30, 3], { start: true }),
      note(1.5, 30, -2.5, 'The top. Nothing is kind here.'),
      crumble(0, 30.5, -6.5, 2.6, 2.6),
      crumble(1.5, 31, -10.3, 2.6, 2.6),
      crumble(0, 31.5, -14.1, 2.6, 2.6),
      crumble(1.5, 32, -17.9, 2.6, 2.6), soul(1.5, 33, -17.9),
      crumble(0, 32.5, -21.7, 2.6, 2.6),
      wind(0, 30, -14, [10, 6, 20], [-1, 0], { force: 3.5, cycle: 3, on: 1.1 }),
      box(0, 33, -27, 6, 2, 6),
      lantern(2, 33, -28.2, [1, 33, -27]),
      blink(0, 33.5, -33, 3, 3, 3.2, 2.2, 0),
      blink(0, 34, -37.5, 3, 3, 3.2, 2.2, -0.7), soul(0, 35.4, -37.5),
      blink(0, 34.5, -42, 3, 3, 3.2, 2.2, -1.4),
      pendulum(0, 34.4, -33, { L: 9, amp: 1.0, speed: 1.9 }),
      pendulum(0, 35.4, -42, { L: 9, amp: 1.0, speed: 1.9, phase: 1.5 }),
      mover(0, 35.3, -48.5, 3, 3, [3.2, 0, 0], 1.0, 0),
      mover(0, 36, -54, 3, 3, [-3.2, 0, 0], 1.0, 0.5),
      mover(0, 36.8, -59.5, 3, 3, [3.2, 0, 0], 1.2, 1), soul(0, 38.2, -59.5),
      arrows(7, 37.3, -51, [-1, 0], { every: 2.0, speed: 17, range: 16 }),
      arrows(7, 37.3, -57, [-1, 0], { every: 2.0, speed: 17, range: 16, offset: 1 }),
      box(0, 37, -66, 8, 2, 8),
      bonfire(-2.5, 37, -65, [-1, 37, -64]),
      { t: 'conveyor', p: [0, 37, -80], s: [3, 1, 20], dir: [0, 1], speed: 3.8 },
      crusher(0, 37, -75, { s: [3, 3, 2.5], rise: 3.4, cycle: 2.3, offset: 0 }),
      gate(0, 37, -80, 3),
      crusher(0, 37, -85, { s: [3, 3, 2.5], rise: 3.4, cycle: 2.3, offset: 1.1 }),
      soul(0, 38, -85),
      bounce(0, 37.6, -93, 3, 3, 19),
      box(0, 41.5, -99, 6, 1.5, 5),
      lantern(2, 41.5, -100.6, [0.5, 41.5, -99]),
      box(0, 41.5, -109, 10, 1.5, 10),
      spinner(0, 41.5, -109, { r: 4.6, speed: 2.0, arms: 2, high: true }),
      vent(3.5, 41.5, -106.5, { style: 'lightning', r: 1.1, cycle: 3, on: 0.45, offset: 0 }),
      vent(-3.5, 41.5, -111.5, { style: 'lightning', r: 1.1, cycle: 3, on: 0.45, offset: -1.5 }),
      soul(4, 42.5, -112.6),
      blink(-1.5, 42.4, -117.5, 3, 3, 2.8, 1.7, 0),
      blink(1.5, 43.3, -121.5, 3, 3, 2.8, 1.7, -0.6),
      blink(-1.5, 44.2, -125.5, 3, 3, 2.8, 1.7, -1.2),
      blink(1.5, 45.1, -129.5, 3, 3, 2.8, 1.7, -1.8),
      wind(0, 42, -123.5, [12, 6, 16], [1, 0], { force: 3, cycle: 3.5, on: 1.2, offset: 1 }),
      soul(0, 47.5, -138),
      box(0, 45.1, -149, 8, 2, 8),
      goal(0, 45.1, -150.5, 'beacon'),
      light(0, 35, -27), light(0, 40, -66), light(0, 45, -109),
    ],
  },
];
