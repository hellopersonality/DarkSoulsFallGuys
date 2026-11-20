// Ashen Gauntlet — game flow, input, audio, saves and the update prompt.
import { createEngine } from './engine.js';
import { STAGES, BIOMES } from './stages.js';

export const BUILD = '0.3.0';
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = t => { const m = Math.floor(t / 60), s = t - m * 60; return String(m).padStart(2, '0') + ':' + s.toFixed(2).padStart(5, '0'); };

/* ---------------- save data ---------------- */
const SAVE_KEY = 'ashen-gauntlet';
const save = { unlocked: 1, best: {}, opts: { invMouse: false, invPad: false, sens: 1 } };
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); Object.assign(save, s); save.opts = Object.assign({ invMouse: false, invPad: false, sens: 1 }, s.opts || {}); } catch (e) {}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

/* ---------------- audio ---------------- */
let actx = null, noiseBuf = null;
function initAudio() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.resume) actx.resume();
    if (!noiseBuf) {
      noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
  } catch (e) { actx = null; }
}
function tone(freq, dur, type = 'sine', vol = 0.15, slide = 0, delay = 0) {
  if (!actx) return;
  const t = actx.currentTime + delay, o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur, vol = 0.2, freq = 800, q = 0.7, type = 'lowpass') {
  if (!actx || !noiseBuf) return;
  const t = actx.currentTime, src = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
  src.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.05, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(actx.destination); src.start(t); src.stop(t + dur + 0.05);
}
const sfx = {
  jump: () => tone(220, 0.12, 'triangle', 0.1, 2.2),
  jump2: () => { tone(330, 0.16, 'triangle', 0.09, 2); noise(0.12, 0.05, 1800, 1, 'bandpass'); },
  longjump: () => { tone(180, 0.2, 'triangle', 0.1, 2.6); noise(0.2, 0.06, 900); },
  dash: () => { noise(0.22, 0.14, 1400, 0.8, 'bandpass'); tone(420, 0.12, 'sawtooth', 0.04, 0.6); },
  slide: () => noise(0.4, 0.1, 700, 0.6),
  lantern: () => { tone(523, 0.5, 'triangle', 0.07, 1.2); tone(784, 0.6, 'sine', 0.05, 0, 0.08); },
  land: () => { tone(95, 0.12, 'sine', 0.18, 0.5); noise(0.08, 0.06, 400); },
  soul: () => { tone(880, 0.25, 'sine', 0.08, 1.5); tone(1320, 0.3, 'sine', 0.06, 0, 0.07); },
  hit: () => { tone(150, 0.28, 'sawtooth', 0.1, 0.4); noise(0.15, 0.12, 1200); },
  death: () => { tone(110, 1.8, 'sawtooth', 0.07, 0.35); tone(82, 2.0, 'sine', 0.16, 0.5); },
  bonfire: () => { tone(196, 1.0, 'triangle', 0.09, 1.5); tone(294, 1.2, 'sine', 0.07, 1.2); noise(1.2, 0.08, 600); },
  crack: () => { tone(300, 0.08, 'square', 0.04, 0.5); noise(0.12, 0.08, 2000, 1, 'bandpass'); },
  slam: () => { tone(60, 0.4, 'sine', 0.3, 0.5); noise(0.3, 0.2, 300); },
  click: () => tone(1200, 0.04, 'square', 0.04),
  spikes: () => noise(0.18, 0.15, 3000, 1, 'highpass'),
  arrow: () => noise(0.12, 0.05, 2500, 2, 'bandpass'),
  wind: () => noise(1.4, 0.07, 500, 0.5),
  bounce: () => tone(160, 0.3, 'triangle', 0.12, 2.5),
  thunder: () => { noise(1.6, 0.18, 180); tone(45, 1.2, 'sine', 0.15, 0.7); },
  win: () => [262, 330, 392, 523].forEach((f, i) => tone(f, 0.9, 'triangle', 0.09, 0, i * 0.15)),
  ui: () => tone(660, 0.05, 'triangle', 0.04),
};
let lastArrowSfx = 0;

/* ---------------- engine ---------------- */
const canvas = $('c');
let engine;
try {
  engine = createEngine(canvas, {
    death: onDeath,
    goal: onGoal,
    bonfire: (isNew) => { if (isNew) { sfx.bonfire(); banner('BONFIRE LIT', 'lit', 2.2); } },
    lantern: () => { sfx.lantern(); toast('Lantern lit'); },
    soul: () => { sfx.soul(); pulseSouls(); },
    retrieved: () => { sfx.soul(); pulseSouls(); banner('SOULS RETRIEVED', 'lit', 1.6); },
    note: showNote,
    sound: (name) => {
      if (name === 'arrow') { const now = performance.now(); if (now - lastArrowSfx < 250) return; lastArrowSfx = now; }
      if (sfx[name]) sfx[name]();
    },
  });
} catch (e) {
  $('nogl').hidden = false; $('titleScreen').hidden = true; throw e;
}

/* ---------------- game state ---------------- */
let mode = 'title';           // title | select | play | paused | dead | clear
let stageIdx = 0, runTime = 0, deaths = 0, deadTimer = 0;
engine.load(STAGES[0]); engine.setCinematic(true);

/* ---------------- input ---------------- */
const keys = new Set();
let jumpQueued = false, dashQueued = false, lastDevice = 'kb', lookAccX = 0, lookAccY = 0, dragging = false, hadLock = false;
addEventListener('keydown', e => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && mode === 'play') e.preventDefault();
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (mode === 'play') pause(); else if (mode === 'paused') resume(); else if (mode === 'select') toTitle();
    return;
  }
  if (e.repeat) return;
  keys.add(e.code); lastDevice = 'kb';
  if (e.code === 'Space' && mode === 'play') jumpQueued = true;
  if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyK') && mode === 'play') dashQueued = true;
  if (e.code === 'KeyR' && mode === 'play') restartStage();
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => { keys.clear(); if (mode === 'play') pause(); });

function lockPointer() { try { const p = canvas.requestPointerLock && canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
canvas.addEventListener('mousedown', () => { if (mode !== 'play') return; if (document.pointerLockElement !== canvas) lockPointer(); dragging = true; });
addEventListener('mouseup', () => { dragging = false; });
addEventListener('mousemove', e => {
  if (mode !== 'play') return;
  if (document.pointerLockElement === canvas || dragging) {
    lookAccX += e.movementX * 0.0026 * save.opts.sens;
    lookAccY += e.movementY * 0.0022 * save.opts.sens * (save.opts.invMouse ? -1 : 1);
    lastDevice = 'kb';
  }
});
document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === canvas;
  if (!locked && hadLock && mode === 'play') pause();
  hadLock = locked;
});

const pad = { a: false, b: false, x: false, y: false, rb: false, start: false, nav: 0, navT: 0 };
function readPad(dt) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let gp = null; for (const p of pads) if (p && p.connected) { gp = p; break; }
  if (!gp) return null;
  const dz = v => Math.abs(v) < 0.18 ? 0 : (v - Math.sign(v) * 0.18) / 0.82;
  const btn = i => !!(gp.buttons[i] && gp.buttons[i].pressed);
  const r = { lx: dz(gp.axes[0] || 0), ly: dz(gp.axes[1] || 0), rx: dz(gp.axes[2] || 0), ry: dz(gp.axes[3] || 0), a: btn(0), b: btn(1), x: btn(2), y: btn(3), rb: btn(5), start: btn(9),
    up: btn(12), down: btn(13), left: btn(14), right: btn(15) };
  const pressed = k => r[k] && !pad[k];
  if (r.lx || r.ly || r.rx || r.ry || r.a || r.start) lastDevice = 'pad';
  if (mode === 'play') {
    if (pressed('a')) jumpQueued = true;
    if (pressed('x') || pressed('b') || pressed('rb')) dashQueued = true;
    if (pressed('start')) pause();
  } else {
    // menu navigation with stick / d-pad
    let nav = 0;
    if (r.down || r.ly > 0.5 || r.right || r.lx > 0.5) nav = 1; else if (r.up || r.ly < -0.5 || r.left || r.lx < -0.5) nav = -1;
    if (nav && (nav !== pad.nav || pad.navT <= 0)) { moveFocus(nav); pad.navT = pad.nav === nav ? 0.14 : 0.35; }
    pad.navT -= dt; pad.nav = nav;
    if (pressed('a')) { const el = document.activeElement; if (el && el.tagName === 'BUTTON' && !el.disabled) el.click(); else if (el && el.tagName === 'INPUT') el.click(); else firstButton()?.click(); }
    if (pressed('b')) { if (mode === 'paused') resume(); else if (mode === 'select') toTitle(); }
    if (pressed('start')) { if (mode === 'paused') resume(); else if (mode === 'title') $('beginBtn').click(); }
    if (pressed('y')) setOpt('invPad', !save.opts.invPad);
  }
  pad.a = r.a; pad.b = r.b; pad.x = r.x; pad.y = r.y; pad.rb = r.rb; pad.start = r.start;
  return r;
}
function visibleOverlay() { return [...document.querySelectorAll('.overlay')].find(o => !o.hidden); }
function focusables() { const o = visibleOverlay(); return o ? [...o.querySelectorAll('button:not([disabled]), input')] : []; }
function firstButton() { return focusables().find(el => el.tagName === 'BUTTON'); }
function moveFocus(d) {
  const f = focusables(); if (!f.length) return;
  const i = f.indexOf(document.activeElement);
  f[(i + d + f.length) % f.length].focus(); sfx.ui();
}

/* ---------------- options ---------------- */
const optBoxes = { invMouse: ['invMouseT', 'invMouseP'], invPad: ['invPadT', 'invPadP'] };
function setOpt(k, v) {
  save.opts[k] = !!v; persist();
  optBoxes[k].forEach(id => { $(id).checked = save.opts[k]; });
}
for (const k in optBoxes) optBoxes[k].forEach(id => { $(id).checked = save.opts[k]; $(id).addEventListener('change', e => setOpt(k, e.target.checked)); });
$('sensP').value = save.opts.sens; $('sensP').addEventListener('input', e => { save.opts.sens = parseFloat(e.target.value); persist(); });

/* ---------------- screens ---------------- */
const screens = ['titleScreen', 'selectScreen', 'pauseScreen', 'clearScreen'];
function show(id) { screens.forEach(s => $(s).hidden = s !== id); }
function exitLock() { if (document.exitPointerLock && document.pointerLockElement) document.exitPointerLock(); }

function toTitle() {
  mode = 'title'; show('titleScreen'); $('hud').hidden = true; hideBanner(); exitLock();
  engine.load(STAGES[0]); engine.setCinematic(true);
  $('beginBtn').textContent = save.unlocked > 1 ? 'Continue' : 'Begin';
  $('beginBtn').focus();
}
function toSelect() {
  initAudio();
  mode = 'select'; show('selectScreen'); $('hud').hidden = true; hideBanner(); exitLock();
  renderSelect();
  const target = document.querySelector(`[data-stage="${Math.min(save.unlocked, STAGES.length) - 1}"]`);
  (target || firstButton())?.focus();
}
function renderSelect() {
  const wrap = $('biomes'); wrap.textContent = '';
  BIOMES.forEach((b, bi) => {
    const col = document.createElement('section'); col.className = 'biome';
    const h = document.createElement('header');
    h.innerHTML = `<span class="eyebrow">Part ${['I', 'II', 'III'][bi]}</span><h3></h3><p></p>`;
    h.querySelector('h3').textContent = b.name; h.querySelector('p').textContent = b.sub;
    col.append(h);
    STAGES.forEach((st, i) => {
      if (st.biome !== b.id) return;
      const locked = i >= save.unlocked, best = save.best[st.id];
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'stage' + (locked ? ' locked' : '') + (best ? ' cleared' : '');
      btn.dataset.stage = i; btn.disabled = locked;
      const total = st.parts.flat(3).filter(p => p.t === 'soul').length;
      btn.innerHTML = `<span class="num">${st.id}</span><span class="nm"></span><span class="meta"></span>`;
      btn.querySelector('.nm').textContent = st.name;
      btn.querySelector('.meta').textContent = locked ? 'Sealed' : best ? `Best ${fmt(best.time)} · ${best.deaths} ${best.deaths === 1 ? 'death' : 'deaths'} · ${best.souls}/${total} souls` : 'Not yet cleared';
      btn.addEventListener('click', () => startStage(i));
      col.append(btn);
    });
    wrap.append(col);
  });
}

function startStage(i) {
  initAudio();
  stageIdx = i; const st = STAGES[i];
  engine.load(st); engine.setCinematic(false);
  runTime = 0; deaths = 0; jumpQueued = dashQueued = false; lookAccX = lookAccY = 0;
  mode = 'play'; show(null); $('hud').hidden = false; hideBanner();
  const biome = BIOMES.find(b => b.id === st.biome);
  $('eyebrow').textContent = `${biome.name} · ${st.id}`;
  $('room').textContent = st.name;
  hud.cache = {}; showNote(null);
  banner(st.name.toUpperCase(), 'title', 2.2);
  lockPointer(); canvas.focus();
}
function restartStage() { engine.resetStage(); runTime = 0; deaths = 0; mode = 'play'; show(null); hideBanner(); jumpQueued = false; lockPointer(); canvas.focus(); }
function pause() { if (mode !== 'play') return; mode = 'paused'; show('pauseScreen'); keys.clear(); exitLock(); $('resumeBtn').focus(); }
function resume() { if (mode !== 'paused') return; mode = 'play'; show(null); jumpQueued = false; lockPointer(); canvas.focus(); }

// quick respawn keeps the pace up; the bloodstain still costs you if you die again
function onDeath() { mode = 'dead'; deadTimer = 1.25; deaths++; sfx.death(); banner('YOU DIED', 'died', 1.2); }
function onGoal() {
  mode = 'clear'; sfx.win(); exitLock();
  const st = STAGES[stageIdx], total = st.parts.flat(3).filter(p => p.t === 'soul').length, souls = Math.round(engine.souls / 100);
  const prev = save.best[st.id];
  const newBest = !prev || runTime < prev.time;
  save.best[st.id] = {
    time: newBest ? runTime : prev.time,
    deaths: prev ? Math.min(prev.deaths, deaths) : deaths,
    souls: prev ? Math.max(prev.souls, souls) : souls,
  };
  save.unlocked = Math.max(save.unlocked, Math.min(STAGES.length, stageIdx + 2));
  persist();
  const last = stageIdx === STAGES.length - 1;
  $('cEyebrow').textContent = last ? 'The beacon burns' : 'The fog parts';
  $('cTitle').textContent = last ? 'The Gauntlet Is Conquered' : `${st.name} cleared`;
  $('cTime').textContent = fmt(runTime); $('cDeaths').textContent = deaths; $('cSouls').textContent = `${souls}/${total}`;
  $('cBest').textContent = newBest && prev ? 'A new best time.' : prev ? `Best time ${fmt(prev.time)}.` : '';
  $('cLore').hidden = !last;
  $('nextBtn').hidden = last;
  show('clearScreen');
  (last ? $('selectBtn2') : $('nextBtn')).focus();
}

$('beginBtn').addEventListener('click', toSelect);
$('backBtn').addEventListener('click', toTitle);
$('resumeBtn').addEventListener('click', resume);
$('restartBtn').addEventListener('click', restartStage);
$('quitBtn').addEventListener('click', toSelect);
$('nextBtn').addEventListener('click', () => startStage(stageIdx + 1));
$('retryBtn').addEventListener('click', () => startStage(stageIdx));
$('selectBtn2').addEventListener('click', toSelect);

/* ---------------- HUD ---------------- */
const hud = { cache: {} };
function setText(id, v) { if (hud.cache[id] !== v) { hud.cache[id] = v; $(id).textContent = v; } }
function updateHud() {
  setText('timer', fmt(runTime));
  setText('souls', engine.souls.toLocaleString('en-US'));
  setText('deaths', 'DEATHS ' + deaths);
  const [lit, all] = engine.bonfireCount;
  setText('bonfires', `Bonfires lit: ${lit} of ${all}`);
  const usePad = lastDevice === 'pad';
  if (hud.cache.dev !== usePad) { hud.cache.dev = usePad; $('ctlKb').hidden = usePad; $('ctlPad').hidden = !usePad; }
}
let bannerTimer = 0;
function banner(text, cls, dur) {
  const el = $('banner'); el.className = 'banner ' + cls; $('bannerText').textContent = text;
  el.hidden = true; void el.offsetWidth; el.hidden = false; bannerTimer = dur;
}
function hideBanner() { $('banner').hidden = true; bannerTimer = 0; }
let toastTimer = 0;
function toast(text) { const el = $('toast'); el.textContent = text; el.hidden = true; void el.offsetWidth; el.hidden = false; toastTimer = 1.6; }
let speedLvl = 0;
let noteText = null;
function showNote(text) {
  if (text === noteText) return; noteText = text;
  const el = $('note');
  if (!text) { el.hidden = true; return; }
  el.textContent = ''; const b = document.createElement('b'); b.textContent = 'A message, written in orange soapstone'; el.append(b, text); el.hidden = false;
}
function pulseSouls() { const el = $('soulBox'); el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }

/* ---------------- update prompt ---------------- */
async function checkForUpdate() {
  try {
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return;
    const v = (await r.json()).version;
    if (v && v !== BUILD) { $('updateText').textContent = `Version ${v} is ready.`; $('update').hidden = false; }
  } catch (e) { /* offline or not hosted: ignore */ }
}
$('reloadBtn').addEventListener('click', () => location.reload());
$('laterBtn').addEventListener('click', () => { $('update').hidden = true; });
setInterval(checkForUpdate, 5 * 60 * 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkForUpdate(); });
checkForUpdate();
$('build').textContent = 'v' + BUILD;

/* ---------------- loop ---------------- */
const speedLines = $('speedLines');
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.033, (now - last) / 1000); last = now;
  const p = readPad(dt);
  if (mode === 'play' || mode === 'dead' || mode === 'clear' || mode === 'title' || mode === 'select') {
    let mx = 0, mz = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) mz += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) mz -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
    let lookX = lookAccX, lookY = lookAccY; lookAccX = lookAccY = 0;
    if (p && mode === 'play') {
      mx += p.lx; mz -= p.ly;
      lookX += p.rx * 2.6 * dt * save.opts.sens;
      lookY += p.ry * 1.8 * dt * save.opts.sens * (save.opts.invPad ? -1 : 1);
    }
    const input = mode === 'play'
      ? { mx: clamp(mx, -1, 1), mz: clamp(mz, -1, 1), lookX, lookY, jumpPressed: jumpQueued, jumpHeld: keys.has('Space') || !!(p && p.a), dashPressed: dashQueued }
      : { mx: 0, mz: 0, lookX: 0, lookY: 0, jumpPressed: false, jumpHeld: false, dashPressed: false };
    jumpQueued = dashQueued = false;
    engine.step(dt, input);
    if (mode === 'play') runTime += dt;
    if (mode === 'dead') { deadTimer -= dt; if (deadTimer <= 0) { engine.respawn(); mode = 'play'; hideBanner(); } }
  } else {
    engine.idle(dt);
  }
  if (bannerTimer > 0 && mode !== 'paused') { bannerTimer -= dt; if (bannerTimer <= 0) hideBanner(); }
  if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) $('toast').hidden = true; }
  const sw = mode === 'play' ? engine.speedFx : 0;
  speedLvl += (sw - speedLvl) * Math.min(1, dt * (sw > speedLvl ? 18 : 6));
  speedLines.style.opacity = speedLvl.toFixed(3);
  if (mode !== 'title' && mode !== 'select') updateHud();
  engine.render();
}
toTitle();
requestAnimationFrame(frame);
