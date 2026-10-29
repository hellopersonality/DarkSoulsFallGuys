// Ashen Gauntlet — engine: world building from stage data, physics, hazards, camera, rendering.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

import { PHYS } from './phys.js';
export { PHYS };
const { R, H, STEP, MOVE, JUMP, GRAV } = PHYS;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wrapAngle = a => Math.atan2(Math.sin(a), Math.cos(a));
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/* ------------------------------------------------------------------ themes */
export const THEMES = {
  town: {
    skyTop: '#2b2440', skyBottom: '#d9845a', fog: 0x5e4446, fogDensity: 0.0085, exposure: 1.45,
    hemiSky: 0xffd2a8, hemiGround: 0x3a2a26, hemiI: 1.25, sun: 0xffb27a, sunI: 2.3, sunDir: [-0.5, 0.55, -1],
    fill: 0x8a9ad0, fillI: 0.55,
    stone: 0xcbb69a, pillar: 0xb2a088, wall: 0x6e5a4c, crumble: 0xc28a58, mover: 0x9a7048, roof: 0x8c4a36, bounce: 0xd8b860,
    blink: 0x9ad0ff, particles: { color: 0xffc070, count: 140, vel: [0.2, 0.6, 0], size: 0.09, spread: [40, 18, 40] },
  },
  castle: {
    skyTop: '#090b10', skyBottom: '#1c222c', fog: 0x171b22, fogDensity: 0.0105, exposure: 1.5,
    hemiSky: 0xa8b4cc, hemiGround: 0x2e2418, hemiI: 1.2, sun: 0xb8c6e0, sunI: 1.7, sunDir: [0.6, 1, 0.3],
    fill: 0xffc890, fillI: 0.6,
    stone: 0xb4b0a6, pillar: 0x9c968a, wall: 0x4a4a4c, crumble: 0xb48a62, mover: 0x8e7a62, roof: 0x3a3a40, bounce: 0x8a5a3a,
    blink: 0x7fb8ff, particles: { color: 0xffa050, count: 120, vel: [0, 0.8, 0], size: 0.08, spread: [36, 16, 36] },
  },
  summit: {
    skyTop: '#0b1020', skyBottom: '#4a5670', fog: 0x323c50, fogDensity: 0.0075, exposure: 1.5,
    hemiSky: 0xbccce6, hemiGround: 0x23283a, hemiI: 1.35, sun: 0xd4e0f4, sunI: 2.2, sunDir: [-0.4, 1, 0.5],
    fill: 0xffd6a8, fillI: 0.45,
    stone: 0xbcb8b0, pillar: 0xa29e96, wall: 0x50505a, crumble: 0xb88c66, mover: 0x8a8070, roof: 0x30343e, bounce: 0x7a8aa8,
    blink: 0xa8c8ff, particles: { color: 0xb8c8e8, count: 420, vel: [-4, -24, 1], size: 0.06, spread: [40, 26, 40] }, storm: true,
  },
};

/* ------------------------------------------------------------------ textures */
const texCache = {};
function canvasTex(key, w, h, draw, repeat = true) {
  if (texCache[key]) return texCache[key];
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return (texCache[key] = t);
}
const stoneTex = () => canvasTex('stone', 256, 256, (g) => {
  g.fillStyle = '#6b6258'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4500; i++) {
    const v = 70 + Math.random() * 70 | 0;
    g.fillStyle = `rgba(${v},${v - 6},${v - 14},${Math.random() * 0.35})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 5, 2 + Math.random() * 5);
  }
  g.strokeStyle = 'rgba(18,14,10,0.7)'; g.lineWidth = 3;
  for (let y = 0; y <= 256; y += 64) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke();
    for (let x = ((y / 64) % 2) * 64; x < 256; x += 128) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 64); g.stroke(); }
  }
});
const woodTex = () => canvasTex('wood', 256, 256, (g) => {
  g.fillStyle = '#7a5838'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) {
    g.fillStyle = `rgba(40,24,12,${0.25 + Math.random() * 0.2})`; g.fillRect(0, y, 256, 3);
    for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(30,18,8,0.15)'; g.fillRect(Math.random() * 256, y + Math.random() * 30, 30 + Math.random() * 60, 1); }
  }
});
const stripeTex = () => canvasTex('stripe', 64, 64, (g) => {
  g.fillStyle = '#5a4630'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#c9a050';
  g.beginPath(); g.moveTo(8, 40); g.lineTo(32, 16); g.lineTo(56, 40); g.lineTo(46, 40); g.lineTo(32, 26); g.lineTo(18, 40); g.closePath(); g.fill();
});
const runeTex = () => canvasTex('rune', 128, 64, (g) => {
  g.strokeStyle = '#ffb060'; g.lineWidth = 3; g.lineCap = 'round';
  for (let i = 0; i < 9; i++) { const x = 10 + i * 12; g.beginPath(); g.moveTo(x, 18 + Math.random() * 8); g.lineTo(x + 6 + Math.random() * 4, 42 + Math.random() * 8); g.stroke(); }
}, false);
function skyTex(top, bottom) {
  return canvasTex('sky' + top + bottom, 4, 256, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, top); gr.addColorStop(0.75, bottom); gr.addColorStop(1, bottom);
    g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  }, false);
}

function boxGeo(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) {
    const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] / 3, uv.getY(k) * dims[f][1] / 3);
  }
  return g;
}
const glowMat = (color, opacity = 0.85) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });

/* ------------------------------------------------------------------ engine */
export function createEngine(canvas, hooks = {}) {
  const emit = (name, ...a) => { if (hooks[name]) hooks[name](...a); };
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 500);
  function resize() {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize); resize();

  /* ---------- player model (reused across stages) */
  const PM = {
    armor: new THREE.MeshStandardMaterial({ color: 0x8a8172, metalness: 0.65, roughness: 0.45 }),
    helm: new THREE.MeshStandardMaterial({ color: 0x6a6256, metalness: 0.7, roughness: 0.4 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x3b3833, metalness: 0.7, roughness: 0.6 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x7a2420, roughness: 0.9, side: THREE.DoubleSide }),
    metal: new THREE.MeshStandardMaterial({ color: 0xa8a39a, metalness: 0.85, roughness: 0.3 }),
    black: new THREE.MeshBasicMaterial({ color: 0x050404 }),
  };
  const player = new THREE.Group();
  const body = new THREE.Group(); player.add(body);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.55, 6, 14), PM.armor); torso.position.y = 0.8; torso.castShadow = true; body.add(torso);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.05, 6, 18), PM.iron); belt.rotation.x = Math.PI / 2; belt.position.y = 0.72; body.add(belt);
  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12), PM.helm); helm.scale.set(1, 0.95, 1.05); helm.position.y = 1.36; helm.castShadow = true; body.add(helm);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.06, 0.12), PM.black); visor.position.set(0, 1.36, -0.34); body.add(visor);
  const plume = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.5), PM.cloth); plume.position.set(0, 1.76, 0.1); plume.rotation.x = 0.35; body.add(plume);
  const capeGeo = new THREE.PlaneGeometry(0.72, 0.95); capeGeo.translate(0, -0.47, 0);
  const cape = new THREE.Mesh(capeGeo, PM.cloth); cape.position.set(0, 1.18, 0.4); body.add(cape);
  const sword = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.95, 0.13), PM.metal); sword.position.set(0.12, 0.95, 0.47); sword.rotation.z = 0.6; body.add(sword);
  const legGeo = new THREE.CapsuleGeometry(0.12, 0.18, 4, 8); legGeo.translate(0, -0.15, 0);
  const legL = new THREE.Mesh(legGeo, PM.iron), legR = new THREE.Mesh(legGeo, PM.iron);
  legL.position.set(-0.18, 0.32, 0); legR.position.set(0.18, 0.32, 0); body.add(legL, legR);
  const playerParts = new Set();
  player.traverse(o => playerParts.add(o));

  /* ---------- state */
  let W = null;           // current world
  let time = 0;
  const P = {
    pos: V3(), vel: V3(), grounded: false, ground: null, coyote: 0, buffer: 0, face: 0, stun: 0, hitCd: 0,
    squash: 0, walk: 0, tumble: 0, holding: false, lastSafe: V3(), fallV: 0, dead: false, done: false,
  };
  const cam = { yaw: 0, pitch: 0.38, dist: 8.5, curDist: 8.5 };
  const camLook = V3();
  let cinematic = false;
  const ray = new THREE.Raycaster();
  const tmp = V3(), tmp2 = V3();

  /* ---------- world building */
  function dispose() {
    if (!W) return;
    W.scene.remove(player);
    W.scene.traverse(o => {
      if (playerParts.has(o)) return;
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
    });
    W = null;
  }

  function load(def) {
    dispose();
    const theme = THEMES[def.biome];
    const scene = new THREE.Scene();
    scene.background = skyTex(theme.skyTop, theme.skyBottom);
    scene.fog = new THREE.FogExp2(theme.fog, theme.fogDensity);
    renderer.toneMappingExposure = theme.exposure;

    const M = {
      stone: new THREE.MeshStandardMaterial({ map: stoneTex(), color: theme.stone, roughness: 0.95 }),
      pillar: new THREE.MeshStandardMaterial({ map: stoneTex(), color: theme.pillar, roughness: 0.95 }),
      wall: new THREE.MeshStandardMaterial({ map: stoneTex(), color: theme.wall, roughness: 1 }),
      crumble: new THREE.MeshStandardMaterial({ map: stoneTex(), color: theme.crumble, roughness: 1 }),
      wood: new THREE.MeshStandardMaterial({ map: woodTex(), color: 0xd0b090, roughness: 0.9 }),
      mover: new THREE.MeshStandardMaterial({ map: woodTex(), color: theme.mover, roughness: 0.85 }),
      roof: new THREE.MeshStandardMaterial({ color: theme.roof, roughness: 0.9, flatShading: true }),
      bounce: new THREE.MeshStandardMaterial({ color: theme.bounce, roughness: 1 }),
      metal: new THREE.MeshStandardMaterial({ color: 0xa39e93, metalness: 0.85, roughness: 0.3 }),
      iron: new THREE.MeshStandardMaterial({ color: 0x3b3833, metalness: 0.7, roughness: 0.6 }),
      bone: new THREE.MeshStandardMaterial({ color: 0xcfc4ad, roughness: 0.8 }),
      ash: new THREE.MeshStandardMaterial({ color: 0x2a221c, roughness: 1 }),
      window: new THREE.MeshBasicMaterial({ color: def.biome === 'castle' ? 0x6a8ac0 : 0xffb35a }),
      banner: new THREE.MeshStandardMaterial({ color: 0x7a1f1c, roughness: 0.9, side: THREE.DoubleSide }),
      water: new THREE.MeshStandardMaterial({ color: 0x1d2a2c, roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.92 }),
    };

    W = {
      def, theme, scene, M, solids: [], camMeshes: [], movers: [], crumbles: [], blinks: [], spinners: [], pendulums: [],
      vents: [], rollers: [], projectiles: [], turrets: [], crushers: [], spikes: [], winds: [], bonfires: [], orbs: [], notes: [],
      goal: null, lightBudget: 7, killY: def.killY ?? -12, checkpoint: null, stain: null, stainSouls: 0, souls: 0,
      bounds: { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity, minY: Infinity, maxY: -Infinity },
      flash: 0, nextFlash: 6, particles: null,
    };

    // lights
    const hemi = new THREE.HemisphereLight(theme.hemiSky, theme.hemiGround, theme.hemiI); scene.add(hemi); W.hemi = hemi;
    const sun = new THREE.DirectionalLight(theme.sun, theme.sunI);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 160 });
    sun.shadow.bias = -0.0008; scene.add(sun, sun.target); W.sun = sun;
    const fill = new THREE.DirectionalLight(theme.fill, theme.fillI); fill.position.set(10, 20, 30); scene.add(fill);
    W.torch = new THREE.PointLight(0xffb070, 14, 12, 2); scene.add(W.torch);

    for (const part of def.parts.flat(3)) build(part);
    buildDecor(def, theme);
    buildStain();
    buildParticles(theme);
    for (const s of W.solids) refreshBounds(s);

    scene.add(player);
    const start = W.bonfires.find(b => b.start) || W.bonfires[0];
    W.checkpoint = start;
    respawn(true);
    return W;
  }

  function track(x, y, z, w = 0, d = 0) {
    const b = W.bounds;
    b.minX = Math.min(b.minX, x - w / 2); b.maxX = Math.max(b.maxX, x + w / 2);
    b.minZ = Math.min(b.minZ, z - d / 2); b.maxZ = Math.max(b.maxZ, z + d / 2);
    b.minY = Math.min(b.minY, y); b.maxY = Math.max(b.maxY, y);
  }
  function lightBudget() { if (W.lightBudget <= 0) return false; W.lightBudget--; return true; }

  function addSolid(x, top, z, w, h, d, mat, o = {}) {
    const mesh = new THREE.Mesh(boxGeo(w, h, d), mat);
    mesh.position.set(x, top - h / 2, z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    if (o.hidden) mesh.visible = false;
    W.scene.add(mesh);
    const s = { mesh, w, h, d, active: true, delta: V3(), b: {}, safe: !!o.safe, home: mesh.position.clone(), drift: null, bounce: 0, kind: o.kind || 'box' };
    W.solids.push(s);
    if (!o.hidden) W.camMeshes.push(mesh);
    track(x, top, z, w, d);
    return s;
  }
  function refreshBounds(s) {
    const p = s.mesh.position, b = s.b;
    b.minX = p.x - s.w / 2; b.maxX = p.x + s.w / 2; b.minY = p.y - s.h / 2; b.maxY = p.y + s.h / 2;
    b.minZ = p.z - s.d / 2; b.maxZ = p.z + s.d / 2;
  }

  function build(o) {
    const M = W.M;
    const [x, y, z] = o.p || [0, 0, 0];
    switch (o.t) {
      case 'box': {
        const [w, h, d] = o.s;
        addSolid(x, y, z, w, h, d, M[o.mat || 'stone'], { safe: !o.unsafe });
        break;
      }
      case 'crumble': {
        const [w, h, d] = o.s || [3, 1, 3];
        const s = addSolid(x, y, z, w, h, d, M.crumble, { kind: 'crumble' });
        s.crumble = { state: 'solid', t: 0, vy: 0, delay: o.delay ?? 0.55 };
        W.crumbles.push(s);
        // cracks
        const crack = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.8, d * 0.8), new THREE.MeshBasicMaterial({ map: runeTex(), color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }));
        crack.rotation.x = -Math.PI / 2; crack.position.y = h / 2 + 0.01; s.mesh.add(crack);
        break;
      }
      case 'mover': {
        const [w, h, d] = o.s || [3, 0.6, 3];
        const s = addSolid(x, y, z, w, h, d, M.mover, { kind: 'mover' });
        s.move = o.move; s.speed = o.speed ?? 1; s.phase = o.phase ?? 0; s.dwell = !!o.dwell;
        const [ax, ay, az] = o.move; track(x + ax, y + ay, z + az, w, d); track(x - ax, y - ay, z - az, w, d);
        // iron trim
        const trim = new THREE.Mesh(boxGeo(w + 0.08, 0.12, d + 0.08), M.iron); trim.position.y = h / 2 - 0.05; s.mesh.add(trim);
        W.movers.push(s);
        break;
      }
      case 'log': {
        const len = o.len, axis = o.axis || 'z', r = o.r ?? 0.62;
        const w = axis === 'z' ? 1.3 : len, d = axis === 'z' ? len : 1.3;
        const s = addSolid(x, y, z, w, 1.2, d, M.wood, { hidden: true, kind: 'log' });
        const amp = o.amp ?? 2.5, speed = o.speed ?? 0.75, phase = o.phase ?? 0;
        s.logV = 0;
        s.drift = () => axis === 'z' ? [s.logV, 0] : [0, s.logV];
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 18), M.wood);
        const holder = new THREE.Group(); holder.position.set(x, y - r, z);
        if (axis === 'z') holder.rotation.x = Math.PI / 2; else holder.rotation.z = Math.PI / 2;
        holder.add(mesh); mesh.castShadow = true; mesh.receiveShadow = true;
        for (let i = 0; i < Math.floor(len / 2.4); i++) {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(r + 0.01, 0.05, 6, 18), M.iron);
          ring.position.y = -len / 2 + 1.2 + i * 2.4; ring.rotation.x = Math.PI / 2; mesh.add(ring);
        }
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.12, len - 0.2, 0.12), M.iron); strip.position.x = r - 0.03; mesh.add(strip);
        W.scene.add(holder); W.camMeshes.push(mesh);
        s.logMesh = mesh; s.logAmp = amp; s.logSpeed = speed; s.logPhase = phase; s.logR = r; s.logAxis = axis;
        W.movers.push(s);
        break;
      }
      case 'conveyor': {
        const [w, h, d] = o.s;
        const s = addSolid(x, y, z, w, h, d, M.stone, { kind: 'conveyor' });
        const [dx, dz] = o.dir; const sp = o.speed ?? 3;
        s.drift = () => [dx * sp, dz * sp];
        const t = stripeTex().clone(); t.needsUpdate = true;
        const along = Math.abs(dz) > Math.abs(dx);
        t.repeat.set(along ? w / 2 : d / 2, along ? d / 2 : w / 2);
        if (!along) t.rotation = Math.PI / 2;
        const belt = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.92, d * 0.98), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }));
        belt.rotation.x = -Math.PI / 2; belt.position.y = h / 2 + 0.02;
        if (along && dz > 0) belt.rotation.z = Math.PI; // arrows point along travel
        if (!along && dx < 0) belt.rotation.z = Math.PI;
        s.mesh.add(belt);
        s.beltTex = t; s.beltSpeed = sp / 2;
        W.movers.push(s);
        break;
      }
      case 'bounce': {
        const [w, h, d] = o.s || [3, 0.6, 3];
        const s = addSolid(x, y, z, w, h, d, M.bounce, { kind: 'bounce' });
        s.bounce = o.power ?? 15;
        const top = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.25, d * 0.9), new THREE.MeshStandardMaterial({ color: 0xe6c870, roughness: 1, emissive: 0x3a2a08 }));
        top.position.y = h / 2 + 0.1; s.mesh.add(top); s.pad = top;
        break;
      }
      case 'blink': {
        const [w, h, d] = o.s || [3, 0.6, 3];
        const mat = new THREE.MeshStandardMaterial({ map: stoneTex(), color: W.theme.blink, emissive: W.theme.blink, emissiveIntensity: 0.25, roughness: 0.6, transparent: true, opacity: 1 });
        const s = addSolid(x, y, z, w, h, d, mat, { kind: 'blink' });
        s.blink = { cycle: o.cycle ?? 3, on: o.on ?? 2, offset: o.offset ?? 0, mat };
        W.blinks.push(s);
        break;
      }
      case 'spinner': {
        const sp = { c: V3(x, y + 0.55, z), r: o.r ?? 4, w: o.speed ?? 1.6, a: o.phase ?? 0, arms: o.arms ?? 1, h: o.high ? 1.0 : 0.55 };
        sp.c.y = y + sp.h;
        const g = new THREE.Group(); g.position.copy(sp.c); W.scene.add(g);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, sp.h * 2 + 0.2, 14), W.M.iron); hub.castShadow = true; g.add(hub);
        for (let k = 0; k < sp.arms; k++) {
          const bar = new THREE.Mesh(new THREE.BoxGeometry(sp.r * 2, 0.32, 0.35), W.M.metal);
          bar.rotation.y = k * Math.PI / 2; bar.castShadow = true; g.add(bar);
          for (const sx of [-1, 1]) {
            const tip = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 4), W.M.metal);
            tip.rotation.z = -sx * Math.PI / 2; tip.position.x = sx * (sp.r + 0.25); bar.add(tip);
          }
        }
        addSolid(x, y + sp.h + 0.6, z, 0.9, sp.h + 0.6, 0.9, W.M.iron, { hidden: true, kind: 'hub' });
        sp.g = g; W.spinners.push(sp);
        break;
      }
      case 'pendulum': {
        const L = o.L ?? 9, style = o.style || 'axe', br = o.r ?? (style === 'bell' ? 1.5 : 1.1);
        const pivot = V3(x, y + L, z);
        const g = new THREE.Group(); g.position.copy(pivot); W.scene.add(g);
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, L, 6), W.M.iron); rod.position.y = -L / 2; g.add(rod);
        let blade;
        if (style === 'bell') {
          blade = new THREE.Mesh(new THREE.CylinderGeometry(br * 0.55, br, br * 1.6, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0x9a7a3a, metalness: 0.9, roughness: 0.35, side: THREE.DoubleSide }));
          blade.position.y = -L + br * 0.2;
          const cap = new THREE.Mesh(new THREE.SphereGeometry(br * 0.55, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), blade.material);
          cap.position.y = br * 0.8; blade.add(cap);
        } else if (style === 'sign') {
          blade = new THREE.Mesh(boxGeo(br * 2, br * 1.3, 0.2), W.M.wood); blade.position.y = -L;
        } else {
          blade = new THREE.Mesh(new THREE.CylinderGeometry(br, br, 0.14, 28), W.M.metal);
          blade.position.y = -L;
          if (o.axis === 'z') blade.rotation.z = Math.PI / 2; else blade.rotation.x = Math.PI / 2;
        }
        blade.castShadow = true; g.add(blade);
        const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 40, 4), W.M.iron); chain.position.set(x, pivot.y + 20, z); W.scene.add(chain);
        W.pendulums.push({ g, L, br, axis: o.axis || 'x', amp: o.amp ?? 1, w: o.speed ?? 1.7, phase: o.phase ?? 0, angle: 0, prev: 0, pivot, tip: V3() });
        break;
      }
      case 'vent': {
        const style = o.style || 'fire', r = o.r ?? 0.8;
        const v = { x, y, z, r, cycle: o.cycle ?? 3, on: o.on ?? 1.1, offset: o.offset ?? 0, warn: o.warn ?? (style === 'lightning' ? 1.0 : 0.6), style, active: false, h: o.h ?? 3.2 };
        if (style === 'fire') {
          const grate = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.08, 16), W.M.iron); grate.position.set(x, y + 0.04, z); W.scene.add(grate);
          v.outer = new THREE.Mesh(new THREE.ConeGeometry(r, v.h, 14, 1, true), glowMat(0xff7a28, 0.75)); v.outer.rotation.x = Math.PI;
          v.inner = new THREE.Mesh(new THREE.ConeGeometry(r * 0.55, v.h * 0.7, 12, 1, true), glowMat(0xffd090, 0.9)); v.inner.rotation.x = Math.PI;
          v.outer.position.set(x, y + v.h / 2, z); v.inner.position.set(x, y + v.h * 0.35, z);
          W.scene.add(v.outer, v.inner);
          if (lightBudget()) { v.light = new THREE.PointLight(0xff8a3a, 0, 9, 2); v.light.position.set(x, y + 1.5, z); W.scene.add(v.light); }
        } else {
          v.h = 40;
          v.ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.7, r * 1.15, 24), glowMat(0x9ac8ff, 0.0));
          v.ring.rotation.x = -Math.PI / 2; v.ring.position.set(x, y + 0.03, z);
          v.outer = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.35, 40, 6, 8, true), glowMat(0xdfeaff, 0.95));
          v.outer.position.set(x, y + 20, z);
          v.inner = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.9, 40, 12, 1, true), glowMat(0x7fa8ff, 0.25));
          v.inner.position.set(x, y + 20, z);
          W.scene.add(v.ring, v.outer, v.inner);
          if (lightBudget()) { v.light = new THREE.PointLight(0xbcd6ff, 0, 20, 2); v.light.position.set(x, y + 3, z); W.scene.add(v.light); }
        }
        W.vents.push(v);
        break;
      }
      case 'roller': {
        const from = V3(...o.from), to = V3(...o.to);
        const dir = tmp.subVectors(to, from).setY(0).normalize().clone();
        const perp = V3(-dir.z, 0, dir.x);
        W.rollers.push({ from, to, dir, perp, every: o.every ?? 2, speed: o.speed ?? 7, r: o.r ?? 0.95, kind: o.kind || 'boulder', lanes: o.lanes || [0], timer: o.offset ?? 0.5, laneIdx: 0, list: [] });
        break;
      }
      case 'arrows': {
        const [dx, dz] = o.dir; const l = Math.hypot(dx, dz);
        const t = { p: V3(x, y, z), dir: V3(dx / l, 0, dz / l), every: o.every ?? 2, speed: o.speed ?? 16, range: o.range ?? 20, timer: o.offset ?? 0 };
        const mouth = new THREE.Mesh(boxGeo(1.0, 1.0, 1.0), W.M.wall); mouth.position.copy(t.p).addScaledVector(t.dir, -0.5); W.scene.add(mouth);
        const hole = new THREE.Mesh(new THREE.CircleGeometry(0.25, 12), new THREE.MeshBasicMaterial({ color: 0x050404 }));
        hole.position.copy(t.p).addScaledVector(t.dir, 0.02); hole.lookAt(tmp2.copy(t.p).add(t.dir)); W.scene.add(hole);
        W.turrets.push(t);
        break;
      }
      case 'crusher': {
        const [w, h, d] = o.s || [4, 3, 2.5]; const rise = o.rise ?? 3.6;
        const s = addSolid(x, y + rise + h, z, w, h, d, W.M.iron, { kind: 'crusher' });
        s.crush = { floor: y, rise, cycle: Math.max(2.3, o.cycle ?? 2.6), offset: o.offset ?? 0, state: 'up' };
        for (let i = 0; i < 4; i++) {
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 4), W.M.metal);
          spike.rotation.x = Math.PI; spike.position.set((i - 1.5) * (w / 4), -h / 2 - 0.2, 0); s.mesh.add(spike);
        }
        W.crushers.push(s);
        break;
      }
      case 'spikes': {
        const [w, d] = o.s; const g = new THREE.Group(); g.position.set(x, y, z); W.scene.add(g);
        const plate = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), new THREE.MeshStandardMaterial({ color: o.trap ? 0x5a4a3a : 0x2a2622, roughness: 1 }));
        plate.position.y = 0.03; g.add(plate);
        const spikes = new THREE.Group(); g.add(spikes);
        const nx = Math.max(1, Math.round(w / 0.7)), nz = Math.max(1, Math.round(d / 0.7));
        const cone = new THREE.ConeGeometry(0.16, 0.7, 5);
        for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
          const c = new THREE.Mesh(cone, W.M.metal);
          c.position.set(-w / 2 + (i + 0.5) * w / nx, 0.35, -d / 2 + (k + 0.5) * d / nz); spikes.add(c);
        }
        const sp = { x, y, z, w, d, trap: !!o.trap, delay: o.delay ?? 0.45, up: o.up ?? 1.0, reset: o.reset ?? 1.0, state: o.trap ? 'idle' : 'up', t: 0, spikes, plate };
        spikes.position.y = sp.trap ? -0.75 : 0;
        W.spikes.push(sp);
        break;
      }
      case 'wind': {
        const [w, h, d] = o.s;
        const wd = { x, y, z, w, h, d, dir: o.dir, center: o.center, force: o.force ?? 4.5, cycle: o.cycle ?? 4, on: o.on ?? 1.5, offset: o.offset ?? 0, active: false, level: 0 };
        const N = 70, pos = new Float32Array(N * 3);
        for (let i = 0; i < N; i++) { pos[i * 3] = x + (Math.random() - 0.5) * w; pos[i * 3 + 1] = y + Math.random() * h; pos[i * 3 + 2] = z + (Math.random() - 0.5) * d; }
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        wd.pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xe8eef8, size: 0.12, transparent: true, opacity: 0, depthWrite: false }));
        W.scene.add(wd.pts);
        W.winds.push(wd);
        break;
      }
      case 'bonfire': W.pendingYaw = o.yaw; buildBonfire(x, y, z, o.spawn, !!o.start); break;
      case 'soul': {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), glowMat(0xfff0d0, 1));
        m.add(new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), glowMat(0xe0a052, 0.28)));
        m.position.set(x, y, z); W.scene.add(m);
        W.orbs.push({ m, home: V3(x, y, z), taken: false });
        break;
      }
      case 'note': {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), new THREE.MeshBasicMaterial({ map: runeTex(), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
        m.rotation.x = -Math.PI / 2; m.position.set(x, y + 0.03, z); W.scene.add(m);
        W.notes.push({ x, y, z, text: o.text, m });
        break;
      }
      case 'goal': buildGoal(x, y, z, o.kind || 'gate', o.r ?? 2.2, o.facing ?? 0); break;
      case 'water': {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(o.s[0], o.s[1]), W.M.water); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); W.scene.add(m);
        break;
      }
      case 'light': {
        if (lightBudget()) { const l = new THREE.PointLight(o.color ?? 0xffa860, o.i ?? 30, o.dist ?? 16, 2); l.position.set(x, y, z); W.scene.add(l); }
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), glowMat(o.color ?? 0xffa860, 0.9)); lamp.position.set(x, y, z); W.scene.add(lamp);
        break;
      }
      default: console.warn('unknown part', o);
    }
  }

  function buildBonfire(x, y, z, spawn, start) {
    const g = new THREE.Group(); g.position.set(x, y, z); W.scene.add(g);
    const ash = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 0.22, 10), W.M.ash); ash.position.y = 0.11; g.add(ash);
    for (let i = 0; i < 6; i++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 5), W.M.bone);
      b.position.set(Math.cos(i) * 0.45, 0.25, Math.sin(i) * 0.45); b.rotation.set(Math.PI / 2, 0, i); g.add(b);
    }
    const sw = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.3, 0.18), W.M.metal); sw.position.set(0, 0.75, 0); sw.rotation.z = 0.12; g.add(sw);
    const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 0.08), W.M.iron); hilt.position.set(0.09, 1.4, 0); hilt.rotation.z = 0.12; g.add(hilt);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.1, 10, 1, true), glowMat(0xff8a30, 0.8)); flame.position.y = 0.72; g.add(flame);
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 8, 1, true), glowMat(0xffe0a0, 0.9)); core.position.y = 0.5; g.add(core);
    const light = new THREE.PointLight(0xff9a48, 0, 16, 2); light.position.y = 1.4; g.add(light);
    const b = { g, flame, core, light, lit: false, start, pos: V3(x, y, z), spawn: V3(...(spawn || [x + 1.5, y, z + 1])), yaw: W.pendingYaw };
    setLit(b, start);
    W.bonfires.push(b);
  }
  function setLit(b, lit) { b.lit = lit; b.flame.visible = b.core.visible = lit; b.light.intensity = lit ? 40 : 0; }

  function buildGoal(x, y, z, kind, r, facing) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = facing; W.scene.add(g);
    const goal = { pos: V3(x, y, z), r, kind, g, fogMats: [] };
    if (kind === 'beacon') {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, 1.2, 8), W.M.pillar); base.position.y = 0.6; g.add(base);
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 0.9, 0.8, 12, 1, true), W.M.iron); bowl.position.y = 1.6; g.add(bowl);
      goal.flame = new THREE.Mesh(new THREE.ConeGeometry(1.1, 3.2, 12, 1, true), glowMat(0xff9a40, 0.0)); goal.flame.position.y = 3.2; g.add(goal.flame);
      const l = new THREE.PointLight(0xffb060, 6, 30, 2); l.position.y = 4; g.add(l); goal.light = l;
    } else {
      const wide = kind === 'door' ? 3.2 : 2.5, tall = kind === 'door' ? 7 : 5.4;
      for (const sx of [-1, 1]) { const c = new THREE.Mesh(boxGeo(0.9, tall, 0.9), W.M.pillar); c.position.set(sx * wide, tall / 2, 0); c.castShadow = true; g.add(c); }
      const lintel = new THREE.Mesh(boxGeo(wide * 2 + 1.4, 0.9, 1.0), W.M.pillar); lintel.position.y = tall + 0.4; g.add(lintel);
      for (let i = 0; i < 2; i++) {
        const fm = new THREE.MeshBasicMaterial({ color: 0xe8dcc2, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false });
        const f = new THREE.Mesh(new THREE.PlaneGeometry(wide * 2 - 0.9, tall), fm); f.position.set(0, tall / 2, -i * 0.25); g.add(f); goal.fogMats.push(fm);
      }
      const l = new THREE.PointLight(0xdcd2bf, 16, 14, 2); l.position.set(0, 3, 1.5); g.add(l);
      if (kind === 'door') {
        const wall = new THREE.Mesh(boxGeo(26, 18, 1.4), W.M.wall); wall.position.set(0, 9, -1.4); g.add(wall);
      }
    }
    W.goal = goal;
    track(x, y, z, 6, 6);
  }

  function buildStain() {
    const st = new THREE.Group(); st.visible = false; W.scene.add(st);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.6, 20), glowMat(0xb02a22, 0.55)); disc.rotation.x = -Math.PI / 2; disc.position.y = 0.03; st.add(disc);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), glowMat(0xff5a40, 0.9)); orb.position.y = 0.6; st.add(orb);
    W.stain = st; W.stainOrb = orb;
  }

  function buildParticles(theme) {
    const cfg = theme.particles; const N = cfg.count;
    const pos = new Float32Array(N * 3);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: cfg.color, size: cfg.size, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
    pts.frustumCulled = false;
    W.scene.add(pts);
    W.particles = { pts, pos, cfg, seeded: false };
  }

  /* ---------- decor */
  function rnd(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function buildDecor(def, theme) {
    const b = W.bounds, M = W.M, scene = W.scene, rand = rnd(def.seed || 7);
    const d = def.decor || {};
    const midZ = (b.minZ + b.maxZ) / 2, lenZ = b.maxZ - b.minZ;
    const deco = (geo, mat, x, y, z, cast = false) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; scene.add(m); return m; };
    if (d.water !== undefined) {
      const m = deco(new THREE.PlaneGeometry(400, 400), M.water, 0, d.water, midZ); m.rotation.x = -Math.PI / 2;
    } else {
      const m = deco(new THREE.PlaneGeometry(400, 400), new THREE.MeshBasicMaterial({ color: theme.fog }), 0, W.killY - 20, midZ); m.rotation.x = -Math.PI / 2;
    }

    if (def.biome === 'town') {
      // rows of houses along both sides, plus the castle looming ahead
      const ground = d.ground ?? -3;
      for (const side of [-1, 1]) {
        for (let zz = b.maxZ + 6; zz > b.minZ - 10; zz -= 7 + rand() * 3) {
          const w = 5 + rand() * 4, h = 7 + rand() * 9, dd = 5 + rand() * 2;
          const xx = side * (Math.max(Math.abs(side > 0 ? b.maxX : b.minX), 6) + 5 + w / 2 + rand() * 3);
          const house = deco(boxGeo(w, h, dd), M.wall, xx, ground + h / 2, zz, true);
          const roof = deco(new THREE.ConeGeometry(Math.max(w, dd) * 0.75, 3 + rand() * 2, 4), M.roof, xx, ground + h + 1.5, zz, true);
          roof.rotation.y = Math.PI / 4;
          for (let k = 0; k < 3; k++) if (rand() < 0.6) {
            const win = deco(new THREE.PlaneGeometry(0.8, 1.1), M.window, xx - side * (w / 2 + 0.02), ground + 2.5 + k * 3, zz + (rand() - 0.5) * (dd - 1.5));
            win.rotation.y = -side * Math.PI / 2;
          }
          void house;
        }
      }
      // castle backdrop
      const cz = b.minZ - 70, base = ground;
      deco(boxGeo(120, 40, 10), M.wall, 0, base + 20, cz);
      for (const tx of [-60, -30, 0, 30, 60]) {
        const h = tx === 0 ? 90 : 60;
        deco(new THREE.CylinderGeometry(6, 7, h, 12), M.wall, tx, base + h / 2, cz + 4);
        deco(new THREE.ConeGeometry(8, 18, 12), M.roof, tx, base + h + 9, cz + 4);
        for (let k = 0; k < 5; k++) deco(new THREE.PlaneGeometry(1.2, 2.2), M.window, tx + (rand() - 0.5) * 6, base + 12 + k * (h / 6), cz + 10.6);
      }
      deco(new THREE.CylinderGeometry(4, 5, 130, 10), M.wall, 0, base + 65, cz - 30);
      deco(new THREE.ConeGeometry(6, 26, 10), M.roof, 0, base + 143, cz - 30);
    }

    if (def.biome === 'castle' && !d.tower) {
      const half = Math.max(Math.abs(b.minX), Math.abs(b.maxX)) + 9;
      const h = 34, base = W.killY - 6;
      for (const side of [-1, 1]) {
        deco(boxGeo(2, h + 20, lenZ + 60), M.wall, side * half, base + (h + 20) / 2, midZ);
        for (let zz = b.maxZ + 4; zz > b.minZ - 8; zz -= 10) {
          deco(new THREE.CylinderGeometry(1.1, 1.3, h + 20, 10), M.pillar, side * (half - 1.6), base + (h + 20) / 2, zz);
          const win = deco(new THREE.PlaneGeometry(2.2, 6), M.window, side * (half - 1.02), base + h - 4, zz - 5);
          win.rotation.y = -side * Math.PI / 2;
          const ban = deco(new THREE.PlaneGeometry(1.6, 5), M.banner, side * (half - 1.1), base + h - 14, zz - 5);
          ban.rotation.y = -side * Math.PI / 2;
        }
      }
      deco(boxGeo(half * 2 + 4, h + 20, 2), M.wall, 0, base + (h + 20) / 2, b.minZ - 14);
    }

    if (d.tower) {
      const [cx, cz] = d.tower.c, rr = d.tower.r, hh = d.tower.h;
      const wall = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, hh, 32, 1, true), new THREE.MeshStandardMaterial({ map: stoneTex(), color: theme.wall, roughness: 1, side: THREE.BackSide }));
      wall.position.set(cx, W.killY + hh / 2 - 4, cz); wall.receiveShadow = true; scene.add(wall);
      for (let i = 0; i < 18; i++) {
        const a = i / 18 * Math.PI * 2, yy = W.killY + 6 + (i % 6) * (hh / 7);
        const win = deco(new THREE.PlaneGeometry(1.4, 3.2), M.window, cx + Math.sin(a) * (rr - 0.05), yy, cz + Math.cos(a) * (rr - 0.05));
        win.lookAt(cx, yy, cz);
      }
    }

    if (def.biome === 'summit') {
      const rr = rnd(def.seed || 3);
      for (let i = 0; i < 14; i++) {
        const a = rr() * Math.PI * 2, dist = 60 + rr() * 60, h = 30 + rr() * 50;
        const tx = Math.sin(a) * dist, tz = midZ + Math.cos(a) * dist;
        deco(new THREE.CylinderGeometry(3 + rr() * 3, 4 + rr() * 3, h, 10), M.wall, tx, W.killY - 10 + h / 2, tz);
        deco(new THREE.ConeGeometry(5 + rr() * 2, 12 + rr() * 8, 10), M.roof, tx, W.killY - 10 + h + 7, tz);
      }
      // cloud sea
      const cloud = deco(new THREE.PlaneGeometry(500, 500), new THREE.MeshBasicMaterial({ color: 0x5a6680, transparent: true, opacity: 0.55, depthWrite: false }), 0, W.killY - 4, midZ);
      cloud.rotation.x = -Math.PI / 2;
    }

    // stage-specific columns under platforms so nothing floats unexplained (castle/summit)
    if (d.supports) {
      for (const s of W.solids) {
        if (s.kind !== 'box' || s.h > 4 || s.w > 9 || s.d > 9) continue;
        const top = s.b.maxY ?? (s.mesh.position.y + s.h / 2);
        const len = top - s.h - (W.killY - 25);
        if (len < 2) continue;
        deco(new THREE.CylinderGeometry(Math.min(s.w, s.d) * 0.28, Math.min(s.w, s.d) * 0.34, len, 8), M.pillar, s.mesh.position.x, top - s.h - len / 2, s.mesh.position.z, true);
      }
    }
  }

  /* ---------- run control */
  function respawn(first = false) {
    const cp = W.checkpoint;
    P.pos.copy(cp.spawn); P.vel.set(0, 0, 0); P.stun = 0; P.ground = null; P.grounded = false; P.hitCd = 0; P.tumble = 0;
    P.dead = false; P.done = false; P.lastSafe.copy(cp.spawn); P.coyote = 0; P.buffer = 0;
    const yaw = cp.yaw ?? W.def.yaw ?? 0;
    P.face = yaw; player.rotation.y = yaw; player.visible = true;
    cam.yaw = yaw; cam.pitch = 0.38; cam.curDist = cam.dist;
    camLook.set(P.pos.x, P.pos.y + 1.3, P.pos.z);
    W.crumbles.forEach(resetCrumble);
    W.spikes.forEach(s => { if (s.trap) { s.state = 'idle'; s.t = 0; } });
    W.rollers.forEach(r => { r.list.forEach(b => W.scene.remove(b.m)); r.list.length = 0; });
    W.projectiles.forEach(p => W.scene.remove(p.m)); W.projectiles.length = 0;
    if (first) { W.souls = 0; W.stainSouls = 0; W.stain.visible = false; }
  }
  function resetStage() {
    W.bonfires.forEach(b => setLit(b, b.start));
    W.checkpoint = W.bonfires.find(b => b.start) || W.bonfires[0];
    W.orbs.forEach(o => { o.taken = false; o.m.visible = true; });
    if (W.goal && W.goal.flame) W.goal.flame.material.opacity = 0;
    respawn(true);
  }

  function die(cause) {
    if (P.dead || P.done) return;
    P.dead = true;
    if (cause !== 'fall') player.visible = false;
    W.stain.visible = false; W.stainSouls = 0;
    if (W.souls > 0) { W.stain.position.copy(P.lastSafe); W.stain.visible = true; W.stainSouls = W.souls; W.souls = 0; }
    emit('death', cause);
  }

  /* ---------- crumble */
  function resetCrumble(s) { const c = s.crumble; c.state = 'solid'; c.t = 0; s.active = true; s.mesh.position.copy(s.home); s.mesh.visible = true; }

  /* ---------- world update */
  function updateWorld(dt) {
    const t = time;
    for (const s of W.movers) {
      const ox = s.mesh.position.x, oy = s.mesh.position.y, oz = s.mesh.position.z;
      if (s.kind === 'mover') {
        let k = Math.sin(t * s.speed + s.phase); if (s.dwell) k = clamp(k * 1.5, -1, 1);
        s.mesh.position.set(s.home.x + s.move[0] * k, s.home.y + s.move[1] * k, s.home.z + s.move[2] * k);
      } else if (s.kind === 'log') {
        s.logV = s.logAmp * Math.sin(t * s.logSpeed + s.logPhase);
        s.logMesh.rotation.y -= (s.logV / s.logR) * dt * (s.logAxis === 'z' ? 1 : -1);
      } else if (s.kind === 'conveyor') {
        s.beltTex.offset.y -= s.beltSpeed * dt;
      }
      s.delta.set(s.mesh.position.x - ox, s.mesh.position.y - oy, s.mesh.position.z - oz);
    }

    // crushers
    for (const s of W.crushers) {
      const c = s.crush, ph = ((t + c.offset) % c.cycle + c.cycle) % c.cycle;
      const upY = c.floor + c.rise + s.h / 2, downY = c.floor + s.h / 2;
      const oy = s.mesh.position.y;
      let y = upY, state = 'up', jx = 0;
      if (ph < 0.45) { state = 'warn'; jx = (Math.random() - 0.5) * 0.08; }
      else if (ph < 0.6) { state = 'slam'; y = upY + (downY - upY) * ((ph - 0.45) / 0.15); }
      else if (ph < 1.2) { state = 'down'; y = downY; }
      else if (ph < 2.2) { state = 'rise'; const k = (ph - 1.2) / 1.0; y = downY + (upY - downY) * (k * k * (3 - 2 * k)); }
      if (state === 'down' && c.state === 'slam') emit('sound', 'slam');
      c.state = state;
      s.mesh.position.set(s.home.x + jx, y, s.home.z);
      s.delta.set(0, y - oy, 0);
      refreshBounds(s);
      if (!P.dead && !P.done && (state === 'slam' || state === 'down')) {
        const b = s.b;
        if (P.pos.x + R - 0.15 > b.minX && P.pos.x - R + 0.15 < b.maxX && P.pos.z + R - 0.15 > b.minZ && P.pos.z - R + 0.15 < b.maxZ
          && P.pos.y < b.minY + 0.05 && P.pos.y + H > b.minY) die('crushed');
      }
    }

    // blink tiles
    for (const s of W.blinks) {
      const k = s.blink, ph = ((t + k.offset) % k.cycle + k.cycle) % k.cycle;
      const on = ph < k.on, warn = on && ph > k.on - 0.6;
      s.active = on; s.mesh.visible = on;
      k.mat.opacity = warn ? (Math.sin(t * 40) > 0 ? 0.35 : 0.9) : 1;
      k.mat.emissiveIntensity = warn ? 0.9 : 0.25;
    }

    // crumbles
    for (const s of W.crumbles) {
      const c = s.crumble;
      if (c.state === 'solid') { if (P.ground === s && !P.dead) { c.state = 'shaking'; c.t = c.delay; emit('sound', 'crack'); } }
      else if (c.state === 'shaking') {
        c.t -= dt;
        s.mesh.position.set(s.home.x + (Math.random() - 0.5) * 0.08, s.home.y + (Math.random() - 0.5) * 0.04, s.home.z + (Math.random() - 0.5) * 0.08);
        if (c.t <= 0) { c.state = 'falling'; c.t = 3.6; c.vy = 0; s.active = false; s.mesh.position.copy(s.home); }
      } else if (c.state === 'falling') {
        c.t -= dt; c.vy -= 20 * dt; s.mesh.position.y += c.vy * dt;
        if (s.mesh.position.y < W.killY - 20) s.mesh.visible = false;
        if (c.t <= 0) resetCrumble(s);
      }
    }

    for (const sp of W.spinners) { sp.a += sp.w * dt; sp.g.rotation.y = -sp.a; }
    for (const p of W.pendulums) {
      p.prev = p.angle; p.angle = p.amp * Math.sin(t * p.w + p.phase);
      if (p.axis === 'x') { p.g.rotation.set(0, 0, p.angle); p.tip.set(p.pivot.x + Math.sin(p.angle) * p.L, p.pivot.y - Math.cos(p.angle) * p.L, p.pivot.z); }
      else { p.g.rotation.set(-p.angle, 0, 0); p.tip.set(p.pivot.x, p.pivot.y - Math.cos(p.angle) * p.L, p.pivot.z + Math.sin(p.angle) * p.L); }
    }

    for (const v of W.vents) {
      const ph = ((t + v.offset) % v.cycle + v.cycle) % v.cycle;
      const wasActive = v.active;
      v.active = ph < v.on;
      const warn = !v.active && ph > v.cycle - v.warn;
      if (v.style === 'fire') {
        const k = v.active ? 1 : warn ? 0.18 : 0, fl = 0.85 + Math.random() * 0.3;
        v.outer.visible = v.inner.visible = k > 0;
        v.outer.scale.set(1, Math.max(0.01, k * fl), 1); v.inner.scale.set(1, Math.max(0.01, k * fl), 1);
        v.outer.position.y = v.y + v.h / 2 * k * fl; v.inner.position.y = v.y + v.h * 0.35 * k * fl;
        if (v.light) v.light.intensity = k * 30 * fl;
      } else {
        const wk = warn ? (ph - (v.cycle - v.warn)) / v.warn : 0;
        v.ring.material.opacity = v.active ? 0.9 : wk * 0.9;
        v.ring.scale.setScalar(v.active ? 1 : 1.6 - wk * 0.6);
        v.outer.visible = v.inner.visible = v.active;
        if (v.active) v.outer.rotation.y = Math.random() * 6;
        if (v.light) v.light.intensity = v.active ? 80 : wk * 6;
        if (v.active && !wasActive) { W.flash = Math.max(W.flash, 0.6); emit('sound', 'thunder'); }
      }
    }

    // rollers
    for (const r of W.rollers) {
      r.timer -= dt;
      if (r.timer <= 0) {
        r.timer = r.every * (0.85 + Math.random() * 0.3);
        r.laneIdx = (r.laneIdx + 1 + (Math.random() < 0.3 ? 1 : 0)) % r.lanes.length;
        const lane = r.lanes[r.laneIdx];
        let m;
        if (r.kind === 'barrel') {
          m = new THREE.Mesh(new THREE.CylinderGeometry(r.r, r.r, r.r * 1.6, 14), W.M.wood);
          const hoop = new THREE.Mesh(new THREE.TorusGeometry(r.r + 0.02, 0.05, 6, 16), W.M.iron); hoop.rotation.x = Math.PI / 2; m.add(hoop);
          const holder = new THREE.Group(); holder.add(m); m.rotation.z = Math.PI / 2;
          holder.rotation.y = Math.atan2(r.dir.x, r.dir.z); m = holder; m.userData.spin = holder.children[0];
        } else {
          m = new THREE.Mesh(new THREE.IcosahedronGeometry(r.r, 1), new THREE.MeshStandardMaterial({ map: stoneTex(), color: 0x7b7266, roughness: 1, flatShading: true }));
          m.userData.spin = m;
        }
        m.traverse(o => { o.castShadow = true; });
        W.scene.add(m);
        r.list.push({ m, s: 0, lane, sink: 0 });
      }
      const len = tmp.subVectors(r.to, r.from).setY(0).length();
      for (let i = r.list.length - 1; i >= 0; i--) {
        const b = r.list[i];
        b.s += r.speed * dt;
        const k = b.s / len;
        if (k < 1) {
          b.m.position.set(r.from.x + (r.to.x - r.from.x) * k + r.perp.x * b.lane, r.from.y + (r.to.y - r.from.y) * k + r.r, r.from.z + (r.to.z - r.from.z) * k + r.perp.z * b.lane);
        } else { b.sink += dt; b.m.position.addScaledVector(r.dir, r.speed * dt); b.m.position.y -= 14 * b.sink * dt * 3; }
        const spin = b.m.userData.spin;
        if (r.kind === 'barrel') spin.rotation.y += (r.speed / r.r) * dt; else spin.rotation.x += (r.speed / r.r) * dt * Math.sign(r.dir.z || 1);
        b.world = b.m.position;
        if (b.m.position.y < W.killY - 15) { W.scene.remove(b.m); b.m.traverse(o => { if (o.geometry) o.geometry.dispose(); }); r.list.splice(i, 1); }
      }
    }

    // turrets + projectiles
    for (const tr of W.turrets) {
      tr.timer -= dt;
      if (tr.timer <= 0) {
        tr.timer += tr.every;
        const m = new THREE.Group();
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 5), W.M.wood); shaft.rotation.x = Math.PI / 2; m.add(shaft);
        const head = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.25, 4), W.M.metal); head.rotation.x = -Math.PI / 2; head.position.z = -0.65; m.add(head);
        m.position.copy(tr.p); m.lookAt(tmp.copy(tr.p).sub(tr.dir)); W.scene.add(m);
        W.projectiles.push({ m, dir: tr.dir, speed: tr.speed, left: tr.range / tr.speed });
        emit('sound', 'arrow', tr.p);
      }
    }
    for (let i = W.projectiles.length - 1; i >= 0; i--) {
      const pr = W.projectiles[i];
      pr.m.position.addScaledVector(pr.dir, pr.speed * dt); pr.left -= dt;
      if (pr.left <= 0) { W.scene.remove(pr.m); W.projectiles.splice(i, 1); }
    }

    // spike traps
    for (const s of W.spikes) {
      if (!s.trap) continue;
      if (s.state === 'idle') { if (onArea(s) && P.grounded && !P.dead) { s.state = 'armed'; s.t = s.delay; emit('sound', 'click'); } }
      else if (s.state === 'armed') { s.t -= dt; if (s.t <= 0) { s.state = 'up'; s.t = s.up; emit('sound', 'spikes'); } }
      else if (s.state === 'up') { s.t -= dt; if (s.t <= 0) { s.state = 'cool'; s.t = s.reset; } }
      else if (s.state === 'cool') { s.t -= dt; if (s.t <= 0) s.state = 'idle'; }
      const target = s.state === 'up' ? 0 : s.state === 'armed' ? -0.55 : -0.75;
      s.spikes.position.y += (target - s.spikes.position.y) * Math.min(1, dt * (s.state === 'up' ? 30 : 6));
    }

    // wind
    for (const w of W.winds) {
      const ph = ((t + w.offset) % w.cycle + w.cycle) % w.cycle;
      w.active = ph < w.on;
      const warn = !w.active && ph > w.cycle - 0.7;
      const target = w.active ? 0.8 : warn ? 0.25 : 0;
      w.level += (target - w.level) * Math.min(1, dt * 6);
      w.pts.material.opacity = w.level;
      if (w.level > 0.02) {
        const pos = w.pts.geometry.attributes.position.array;
        for (let i = 0; i < pos.length; i += 3) {
          let dx, dz;
          if (w.dir === 'radial') { const ex = pos[i] - w.center[0], ez = pos[i + 2] - w.center[1], l = Math.hypot(ex, ez) || 1; dx = ex / l; dz = ez / l; }
          else { dx = w.dir[0]; dz = w.dir[1]; }
          pos[i] += dx * 22 * dt * w.level; pos[i + 2] += dz * 22 * dt * w.level;
          if (Math.abs(pos[i] - w.x) > w.w / 2 || Math.abs(pos[i + 2] - w.z) > w.d / 2) {
            pos[i] = w.x + (Math.random() - 0.5) * w.w; pos[i + 1] = w.y + Math.random() * w.h; pos[i + 2] = w.z + (Math.random() - 0.5) * w.d;
          }
        }
        w.pts.geometry.attributes.position.needsUpdate = true;
      }
      if (w.active && !w.was) emit('sound', 'wind');
      w.was = w.active;
    }

    for (const s of W.solids) if (s.kind !== 'crusher') refreshBounds(s);
  }
  function onArea(s) { return Math.abs(P.pos.x - s.x) < s.w / 2 + 0.1 && Math.abs(P.pos.z - s.z) < s.d / 2 + 0.1 && Math.abs(P.pos.y - s.y) < 0.4; }

  /* ---------- player */
  function overXZ(b) { return P.pos.x + R > b.minX && P.pos.x - R < b.maxX && P.pos.z + R > b.minZ && P.pos.z - R < b.maxZ; }

  function control(dt, inp) {
    if (P.ground && P.ground.active) {
      P.pos.add(P.ground.delta);
      if (P.ground.drift) { const [vx, vz] = P.ground.drift(); P.pos.x += vx * dt; P.pos.z += vz * dt; }
    }
    // wind pushes
    for (const w of W.winds) {
      if (!w.active) continue;
      if (Math.abs(P.pos.x - w.x) < w.w / 2 && Math.abs(P.pos.z - w.z) < w.d / 2 && P.pos.y > w.y - 1 && P.pos.y < w.y + w.h) {
        let dx, dz;
        if (w.dir === 'radial') { const ex = P.pos.x - w.center[0], ez = P.pos.z - w.center[1], l = Math.hypot(ex, ez) || 1; dx = ex / l; dz = ez / l; }
        else { dx = w.dir[0]; dz = w.dir[1]; }
        const k = P.grounded ? 1 : 1.25;
        P.pos.x += dx * w.force * k * dt; P.pos.z += dz * w.force * k * dt;
      }
    }

    let ix = inp.mx, iz = inp.mz;
    let len = Math.hypot(ix, iz); if (len > 1) { ix /= len; iz /= len; len = 1; }
    const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
    const wx = fx * iz + rx * ix, wz = fz * iz + rz * ix;

    P.stun = Math.max(0, P.stun - dt); P.hitCd = Math.max(0, P.hitCd - dt);
    const stunned = P.stun > 0;
    const tvx = stunned ? 0 : wx * MOVE, tvz = stunned ? 0 : wz * MOVE;
    const accel = P.grounded ? (stunned ? 7 : 55) : (len > 0.05 && !stunned ? 20 : 1.5);
    const dvx = tvx - P.vel.x, dvz = tvz - P.vel.z, dl = Math.hypot(dvx, dvz), mx = accel * dt;
    if (dl > mx) { P.vel.x += dvx / dl * mx; P.vel.z += dvz / dl * mx; } else { P.vel.x = tvx; P.vel.z = tvz; }
    if (len > 0.1 && !stunned) P.face = Math.atan2(-wx, -wz);

    if (inp.jumpPressed) P.buffer = 0.15;
    P.buffer -= dt;
    P.coyote = P.grounded ? 0.12 : P.coyote - dt;
    if (P.buffer > 0 && P.coyote > 0 && !stunned) {
      P.vel.y = JUMP; P.buffer = 0; P.coyote = 0; P.grounded = false; P.ground = null; P.squash = -0.22; emit('sound', 'jump');
    }
    P.holding = !!inp.jumpHeld;
  }

  function resolve(axis) {
    for (const s of W.solids) {
      if (!s.active) continue; const b = s.b;
      if (!overXZ(b)) continue;
      if (P.pos.y >= b.maxY - 0.001 || P.pos.y + H <= b.minY + 0.001) continue;
      if (b.maxY - P.pos.y <= STEP && (P.grounded || P.coyote > 0)) { P.pos.y = b.maxY; continue; }
      if (axis === 'x') {
        const a = (P.pos.x + R) - b.minX, c = b.maxX - (P.pos.x - R);
        if (a < c) { P.pos.x -= a; if (P.vel.x > 0) P.vel.x = 0; } else { P.pos.x += c; if (P.vel.x < 0) P.vel.x = 0; }
      } else {
        const a = (P.pos.z + R) - b.minZ, c = b.maxZ - (P.pos.z - R);
        if (a < c) { P.pos.z -= a; if (P.vel.z > 0) P.vel.z = 0; } else { P.pos.z += c; if (P.vel.z < 0) P.vel.z = 0; }
      }
    }
  }

  function physics(dt) {
    const prevY = P.pos.y, wasGrounded = P.grounded;
    if (P.vel.y <= 0) P.bouncing = false;
    const g = (P.vel.y > 0 && !P.holding && !P.bouncing) ? GRAV * 2.0 : GRAV;
    P.vel.y = Math.max(P.vel.y + g * dt, -34);
    P.pos.x += P.vel.x * dt; resolve('x');
    P.pos.z += P.vel.z * dt; resolve('z');
    if (P.vel.y < 0) P.fallV = P.vel.y;
    P.pos.y += P.vel.y * dt;
    P.grounded = false; P.ground = null;
    let landY = -Infinity, landS = null;
    for (const s of W.solids) {
      if (!s.active) continue; const b = s.b;
      if (!overXZ(b)) continue;
      if (P.vel.y <= 0 && prevY >= b.maxY - 0.06 - Math.max(0, s.delta.y) && P.pos.y < b.maxY) {
        if (b.maxY > landY) { landY = b.maxY; landS = s; }
      } else if (P.vel.y > 0 && prevY + H <= b.minY + 0.05 && P.pos.y + H > b.minY) {
        P.pos.y = b.minY - H; P.vel.y = 0;
      }
    }
    if (landS) {
      P.pos.y = landY; P.vel.y = 0;
      if (landS.bounce) {
        P.vel.y = landS.bounce; P.bouncing = true; P.squash = -0.3; P.coyote = 0; emit('sound', 'bounce');
        if (landS.pad) landS.pad.scale.y = 0.4;
        return;
      }
      P.grounded = true; P.ground = landS;
      if (!wasGrounded) { if (P.fallV < -9) { emit('sound', 'land'); P.squash = clamp(-P.fallV * 0.02, 0.1, 0.35); } P.fallV = 0; }
      if (landS.safe && P.stun <= 0) P.lastSafe.copy(P.pos);
    }
  }

  function knock(dx, dz, speed, up) {
    if (P.hitCd > 0) return;
    const l = Math.hypot(dx, dz) || 1;
    P.vel.x = dx / l * speed; P.vel.z = dz / l * speed; P.vel.y = up;
    P.stun = 0.75; P.hitCd = 0.5; P.grounded = false; P.ground = null; P.coyote = 0;
    emit('sound', 'hit');
  }

  function hazards() {
    const cx = P.pos.x, cy = P.pos.y + 0.8, cz = P.pos.z;
    for (const s of W.spinners) {
      for (let k = 0; k < s.arms; k++) {
        const a = s.a + k * Math.PI / 2, dx = Math.cos(a), dz = Math.sin(a);
        const px = cx - s.c.x, pz = cz - s.c.z;
        const tt = clamp(px * dx + pz * dz, -s.r, s.r);
        const ex = px - tt * dx, ez = pz - tt * dz;
        if (Math.hypot(ex, ez) < R + 0.22 && P.pos.y < s.c.y + 0.18 && P.pos.y + H > s.c.y - 0.18) {
          const sg = (Math.sign(tt) || 1) * Math.sign(s.w);
          knock(-Math.sin(a) * sg + ex * 0.6, Math.cos(a) * sg + ez * 0.6, 12, 7);
        }
      }
    }
    for (const p of W.pendulums) {
      if (Math.hypot(cx - p.tip.x, cy - p.tip.y, cz - p.tip.z) < p.br + R) {
        const dir = Math.sign(p.angle - p.prev) || 1;
        if (p.axis === 'x') knock(dir, (cz - p.tip.z) * 0.5, 14, 6.5); else knock((cx - p.tip.x) * 0.5, dir, 14, 6.5);
      }
    }
    for (const r of W.rollers) for (const b of r.list) {
      const m = b.m.position;
      if (Math.hypot(cx - m.x, cy - m.y, cz - m.z) < r.r + 0.6) knock(r.dir.x + (cx - m.x) * 0.5, r.dir.z + (cz - m.z) * 0.5, 12, 7);
    }
    for (const pr of W.projectiles) {
      const m = pr.m.position;
      const dy = m.y < P.pos.y + 0.3 ? P.pos.y + 0.3 - m.y : m.y > P.pos.y + 1.4 ? m.y - P.pos.y - 1.4 : 0;
      if (Math.hypot(cx - m.x, cz - m.z) < R + 0.15 && dy < 0.25) { knock(pr.dir.x, pr.dir.z, 10, 5.5); pr.left = 0; }
    }
    for (const v of W.vents) {
      if (v.active && Math.hypot(cx - v.x, cz - v.z) < v.r + R * 0.5 && P.pos.y < v.y + v.h && P.pos.y > v.y - 1) { die(v.style === 'fire' ? 'fire' : 'lightning'); return; }
    }
    for (const s of W.spikes) {
      if (s.state === 'up' && Math.abs(cx - s.x) < s.w / 2 + R * 0.4 && Math.abs(cz - s.z) < s.d / 2 + R * 0.4 && P.pos.y < s.y + 0.6 && P.pos.y > s.y - 0.5) { die('spikes'); return; }
    }
    if (P.pos.y < W.killY) die('fall');
  }

  function pickups() {
    const cx = P.pos.x, cy = P.pos.y + 0.8, cz = P.pos.z;
    for (const o of W.orbs) {
      if (o.taken) continue;
      if (Math.hypot(cx - o.m.position.x, cy - o.m.position.y, cz - o.m.position.z) < 1.0) { o.taken = true; o.m.visible = false; W.souls += 100; emit('soul', W.souls); }
    }
    if (W.stain.visible && Math.hypot(cx - W.stain.position.x, P.pos.y - W.stain.position.y, cz - W.stain.position.z) < 1.3) {
      W.souls += W.stainSouls; W.stainSouls = 0; W.stain.visible = false; emit('retrieved', W.souls);
    }
    for (const b of W.bonfires) {
      if (Math.hypot(cx - b.pos.x, P.pos.y - b.pos.y, cz - b.pos.z) < 1.8) {
        if (!b.lit) { setLit(b, true); emit('bonfire', true); }
        W.checkpoint = b;
      }
    }
    const g = W.goal;
    if (g && Math.hypot(P.pos.x - g.pos.x, P.pos.z - g.pos.z) < g.r && Math.abs(P.pos.y - g.pos.y) < 2.5) {
      P.done = true; if (g.flame) g.flame.material.opacity = 0.9; emit('goal');
    }
    let near = null;
    for (const n of W.notes) if (Math.hypot(P.pos.x - n.x, P.pos.z - n.z) < 1.6 && Math.abs(P.pos.y - n.y) < 1.2) near = n.text;
    emit('note', near);
  }

  /* ---------- camera */
  function updateCamera(dt, inp) {
    if (cinematic) {
      const b = W.bounds, a = time * 0.06, cz = (b.minZ + b.maxZ) / 2;
      camera.position.set(Math.sin(a) * 10, (b.maxY + b.minY) / 2 + 16, b.maxZ + 14);
      camera.lookAt(0, (b.maxY + b.minY) / 2 + 2, cz);
      return;
    }
    if (inp) { cam.yaw -= inp.lookX; cam.pitch = clamp(cam.pitch + inp.lookY, 0.05, 1.3); }
    if (!P.dead) camLook.lerp(tmp.set(P.pos.x, P.pos.y + 1.3, P.pos.z), 1 - Math.exp(-12 * dt));
    tmp2.set(Math.sin(cam.yaw) * Math.cos(cam.pitch), Math.sin(cam.pitch), Math.cos(cam.yaw) * Math.cos(cam.pitch));
    let want = cam.dist;
    ray.set(camLook, tmp2); ray.far = cam.dist;
    const hits = ray.intersectObjects(W.camMeshes, false);
    if (hits.length) want = Math.max(1.4, hits[0].distance - 0.35);
    cam.curDist += (want - cam.curDist) * Math.min(1, dt * (want < cam.curDist ? 25 : 4));
    camera.position.copy(camLook).addScaledVector(tmp2, cam.curDist);
    camera.lookAt(camLook);
  }

  /* ---------- animation + fx */
  function animatePlayer(dt) {
    player.position.copy(P.pos);
    player.rotation.y += wrapAngle(P.face - player.rotation.y) * Math.min(1, dt * 14);
    const sp = Math.hypot(P.vel.x, P.vel.z);
    P.walk += sp * dt * 2.3;
    const stride = P.grounded ? Math.sin(P.walk) * 0.9 * Math.min(1, sp / 4) : 0.5;
    legL.rotation.x = stride; legR.rotation.x = P.grounded ? -stride : -0.3;
    P.squash += (0 - P.squash) * Math.min(1, dt * 10);
    body.scale.set(1 + P.squash * 0.5, 1 - P.squash, 1 + P.squash * 0.5);
    if (P.stun > 0) { P.tumble += dt * 13; body.rotation.x = P.tumble; body.position.y = 0.6; }
    else { P.tumble = 0; body.position.y = 0; const lean = -Math.min(0.28, sp * 0.035); body.rotation.x += (lean - body.rotation.x) * Math.min(1, dt * 10); }
    body.rotation.z = Math.sin(time * 9) * 0.06 * Math.min(1, sp / 4);
    cape.rotation.x = 0.15 + Math.min(0.9, sp * 0.07 + Math.max(0, P.vel.y) * 0.04) + Math.sin(time * 11) * 0.05;
    W.torch.position.set(P.pos.x, P.pos.y + 2.4, P.pos.z + 0.6);
    const sd = W.theme.sunDir;
    W.sun.position.set(P.pos.x + sd[0] * 40, P.pos.y + sd[1] * 40, P.pos.z + sd[2] * 40);
    W.sun.target.position.copy(P.pos);
  }

  function updateFx(dt) {
    for (const b of W.bonfires) if (b.lit) {
      const f = 0.85 + Math.sin(time * 13 + b.pos.x) * 0.08 + Math.random() * 0.1;
      b.flame.scale.set(1, f, 1); b.core.scale.set(1, f * 1.1, 1); b.light.intensity = 36 * f;
    }
    W.orbs.forEach((o, i) => { if (!o.taken) { o.m.position.y = o.home.y + Math.sin(time * 2 + i) * 0.12; o.m.rotation.y += dt; } });
    W.stainOrb.position.y = 0.6 + Math.sin(time * 2.5) * 0.08;
    W.notes.forEach((n, i) => n.m.material.opacity = 0.6 + Math.sin(time * 2 + i) * 0.25);
    if (W.goal) W.goal.fogMats.forEach((m, i) => m.opacity = 0.26 + Math.sin(time * 1.3 + i) * 0.07);
    for (const s of W.solids) if (s.pad) s.pad.scale.y += (1 - s.pad.scale.y) * Math.min(1, dt * 8);

    // ambient particles follow the camera
    const pa = W.particles, cfg = pa.cfg, pos = pa.pos, [sx, sy, sz] = cfg.spread;
    const c = camera.position;
    for (let i = 0; i < pos.length; i += 3) {
      if (!pa.seeded) { pos[i] = c.x + (Math.random() - 0.5) * sx; pos[i + 1] = c.y + (Math.random() - 0.5) * sy; pos[i + 2] = c.z + (Math.random() - 0.5) * sz; }
      pos[i] += cfg.vel[0] * dt + (cfg.vel[1] > 0 ? Math.sin(time + i) * 0.01 : 0);
      pos[i + 1] += cfg.vel[1] * dt; pos[i + 2] += cfg.vel[2] * dt;
      if (pos[i] - c.x > sx / 2) pos[i] -= sx; else if (pos[i] - c.x < -sx / 2) pos[i] += sx;
      if (pos[i + 1] - c.y > sy / 2) pos[i + 1] -= sy; else if (pos[i + 1] - c.y < -sy / 2) pos[i + 1] += sy;
      if (pos[i + 2] - c.z > sz / 2) pos[i + 2] -= sz; else if (pos[i + 2] - c.z < -sz / 2) pos[i + 2] += sz;
    }
    pa.seeded = true;
    pa.pts.geometry.attributes.position.needsUpdate = true;

    // storm lightning flashes
    if (W.theme.storm) {
      W.nextFlash -= dt;
      if (W.nextFlash <= 0) { W.flash = 1; W.nextFlash = 6 + Math.random() * 9; emit('sound', 'thunder'); }
    }
    W.flash = Math.max(0, W.flash - dt * 3);
    W.hemi.intensity = W.theme.hemiI * (1 + W.flash * (Math.random() < 0.5 ? 2.5 : 1.2));
  }

  /* ---------- public */
  return {
    THREE, camera, renderer,
    load,
    get world() { return W; },
    get player() { return P; },
    get souls() { return W ? W.souls : 0; },
    get totalSouls() { return W ? W.orbs.length * 100 : 0; },
    get bonfireCount() { return W ? [W.bonfires.filter(b => b.lit).length, W.bonfires.length] : [0, 0]; },
    setCinematic(v) { cinematic = v; },
    respawn: () => respawn(false),
    resetStage,
    step(dt, inp) {
      if (!W) return;
      time += dt;
      updateWorld(dt);
      if (!cinematic) {
        if (!P.dead && !P.done) {
          control(dt, inp);
          for (let i = 0; i < 2; i++) physics(dt / 2);
          hazards();
          if (!P.dead) pickups();
        } else if (P.dead) {
          if (P.pos.y > W.killY - 30) { P.vel.y = Math.max(P.vel.y + GRAV * dt, -34); P.pos.addScaledVector(P.vel, dt); }
        } else if (P.done) {
          P.vel.set(0, 0, 0);
        }
      }
      updateCamera(dt, cinematic ? null : inp);
      animatePlayer(dt);
      updateFx(dt);
    },
    idle(dt) { if (!W) return; updateCamera(dt, null); },
    render() { if (W) renderer.render(W.scene, camera); },
    resize,
  };
}
