// Minimal stand-in for three.js so the engine can run headless in Node (logic only, no rendering).
export class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  setScalar(s) { this.x = this.y = this.z = s; return this; }
  multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
  setY(y) { this.y = y; return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  clone() { return new Vector3(this.x, this.y, this.z); }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
  subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; }
  addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
  length() { return Math.hypot(this.x, this.y, this.z); }
  normalize() { const l = this.length() || 1; this.x /= l; this.y /= l; this.z /= l; return this; }
  lerp(v, a) { this.x += (v.x - this.x) * a; this.y += (v.y - this.y) * a; this.z += (v.z - this.z) * a; return this; }
}
class Euler { constructor() { this.x = 0; this.y = 0; this.z = 0; } set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } }
export class Object3D {
  constructor() { this.position = new Vector3(); this.rotation = new Euler(); this.scale = new Vector3(1, 1, 1); this.children = []; this.visible = true; this.userData = {}; this.parent = null; }
  add(...o) { for (const c of o) { if (c.parent) c.parent.remove(c); c.parent = this; this.children.push(c); } return this; }
  remove(o) { const i = this.children.indexOf(o); if (i >= 0) { this.children.splice(i, 1); o.parent = null; } return this; }
  traverse(f) { f(this); for (const c of this.children.slice()) c.traverse(f); }
  lookAt() {}
}
export class Group extends Object3D {}
export class Scene extends Object3D {}
export class Mesh extends Object3D { constructor(g, m) { super(); this.geometry = g; this.material = m; } clone() { const m = new Mesh(this.geometry, this.material); m.position.copy(this.position); return m; } }
export class Points extends Mesh {}
class Light extends Object3D { constructor(c, i) { super(); this.color = c; this.intensity = i ?? 1; this.target = new Object3D(); this.shadow = { mapSize: { set() {} }, camera: {}, bias: 0 }; } }
export class PointLight extends Light {}
export class DirectionalLight extends Light {}
export class HemisphereLight extends Light {}
export class PerspectiveCamera extends Object3D { constructor() { super(); this.aspect = 1; } updateProjectionMatrix() {} }
export class WebGLRenderer { constructor() { this.shadowMap = {}; this.renders = 0; } setPixelRatio() {} setSize() {} render() { this.renders++; } }
export class FogExp2 { constructor(c, d) { this.color = c; this.density = d; } }
export class Color { constructor(c) { this.c = c; } }
export class CanvasTexture { constructor() { this.repeat = { set() {} }; this.offset = { x: 0, y: 0 }; this.rotation = 0; } clone() { return new CanvasTexture(); } dispose() {} }
class Material { constructor(o = {}) { Object.assign(this, { opacity: 1 }, o); } dispose() {} clone() { return new this.constructor({ ...this }); } }
export class MeshStandardMaterial extends Material {}
export class MeshBasicMaterial extends Material {}
export class PointsMaterial extends Material {}
export class BufferAttribute { constructor(array) { this.array = array; this.needsUpdate = false; } }
export class BufferGeometry { constructor() { this.attributes = {}; } setAttribute(k, v) { this.attributes[k] = v; } translate() { return this; } dispose() {} }
class Geo extends BufferGeometry {}
export class BoxGeometry extends Geo {
  constructor() {
    super(); const a = new Float32Array(48).map(() => Math.random());
    this.attributes.uv = { array: a, getX: i => a[i * 2], getY: i => a[i * 2 + 1], setXY(i, x, y) { a[i * 2] = x; a[i * 2 + 1] = y; } };
  }
}
export class CylinderGeometry extends Geo {}
export class ConeGeometry extends Geo {}
export class SphereGeometry extends Geo {}
export class TorusGeometry extends Geo {}
export class CapsuleGeometry extends Geo {}
export class PlaneGeometry extends Geo {}
export class CircleGeometry extends Geo {}
export class RingGeometry extends Geo {}
export class IcosahedronGeometry extends Geo {}
export class ShaderMaterial extends Material {}
export class Vector2 { constructor(x = 0, y = 0) { this.x = x; this.y = y; } }
export class Raycaster { set() {} intersectObjects() { return []; } }
export const RepeatWrapping = 1, SRGBColorSpace = 'srgb', PCFSoftShadowMap = 2, ACESFilmicToneMapping = 4, AdditiveBlending = 2, DoubleSide = 2, BackSide = 1;
