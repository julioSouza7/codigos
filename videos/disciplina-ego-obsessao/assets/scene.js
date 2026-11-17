// Disciplina x Ego x Obsessão — palco 3D desenhado como função pura do tempo (hf-seek).
import * as THREE from './vendor/three.module.js';
import { Reflector } from './vendor/Reflector.js';

const W = 1080, H = 1920;

// ---------- utilidades ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const smooth = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
const easeIn = (u) => { u = clamp(u); return u * u; };
const easeOut = (u) => 1 - Math.pow(1 - clamp(u), 3);
const easeInOut = (u) => { u = clamp(u); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
const outBack = (u, s = 1.9) => { u = clamp(u) - 1; return u * u * ((s + 1) * u + s) + 1; };
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261117);
const rr = (a, b) => a + (b - a) * rnd();
// trilha de keyframes [[t, v], ...] com interpolação suave
const track = (keys) => (t) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i], [t0, v0] = keys[i - 1];
    if (t <= t1) return lerp(v0, v1, smooth((t - t0) / (t1 - t0)));
  }
  return keys[keys.length - 1][1];
};

// ---------- renderer / cena ----------
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x040405);
scene.fog = new THREE.Fog(0x040405, 24, 55);
const camera = new THREE.PerspectiveCamera(44, W / H, 0.1, 200);

// textura de brilho radial
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.22, 'rgba(255,255,255,0.5)');
  gr.addColorStop(0.55, 'rgba(255,255,255,0.1)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const GLOW = glowTexture();
const glowSprite = (color, opacity, scale) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: GLOW, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
  s.scale.setScalar(scale); return s;
};

// ---------- chão espelhado + névoa de fundo ----------
const mirror = new Reflector(new THREE.PlaneGeometry(90, 90), {
  textureWidth: 540, textureHeight: 960, color: 0x6a6a72, clipBias: 0.003,
});
mirror.rotation.x = -Math.PI / 2; scene.add(mirror);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x101013, roughness: 0.5, metalness: 0, transparent: true, opacity: 0.84 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), floorMat);
floor.rotation.x = -Math.PI / 2; floor.position.y = 0.002; floor.receiveShadow = true; scene.add(floor);

{
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 150, 0, 128, 150, 128);
  gr.addColorStop(0, 'rgba(70,70,80,1)'); gr.addColorStop(0.5, 'rgba(26,26,32,1)'); gr.addColorStop(1, 'rgba(4,4,5,1)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(46, 30), new THREE.MeshBasicMaterial({ map: tex, fog: false }));
  back.position.set(0, 6, -14); scene.add(back);
}

scene.add(new THREE.HemisphereLight(0x9aa0b4, 0x050505, 0.35));
const fill = new THREE.DirectionalLight(0xffffff, 0.35); fill.position.set(0, 4, 20); scene.add(fill);

// ---------- raias ----------
const LANES = {
  obs: { x: -2.75, color: 0xff3b30, light: 0xffd9d2 },
  disc: { x: 0.0, color: 0xffc25a, light: 0xfff2dc },
  ego: { x: 2.75, color: 0xb76bff, light: 0xf0e2ff },
};
for (const k in LANES) { LANES[k].figX = LANES[k].x - 0.5; LANES[k].towerX = LANES[k].x + 0.6; }

// ---------- holofotes ----------
const LAMP_Y = 5.0, LAMP_Z = 0.35, SPOT_BASE = 95;
function coneMaterial(color) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uI: { value: 0.2 } },
    vertexShader: `varying float vH; varying vec3 vN; varying vec3 vV;
      void main(){ vH = uv.y; vec4 mv = modelViewMatrix*vec4(position,1.0); vV = -mv.xyz; vN = normalMatrix*normal; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uI; varying float vH; varying vec3 vN; varying vec3 vV;
      void main(){ float f = abs(dot(normalize(vN), normalize(vV))); float a = uI*pow(f,1.8)*(0.18+0.82*pow(vH,1.6)); gl_FragColor = vec4(uColor*a, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
}
const housingMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.35, metalness: 0.7, side: THREE.DoubleSide });
function makeLamp(lane) {
  const x = lane.x + 0.05;
  const spot = new THREE.SpotLight(lane.light, SPOT_BASE, 0, 0.42, 0.6, 2);
  spot.position.set(x, LAMP_Y, LAMP_Z); spot.target.position.set(x, 0, 0.25);
  spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0004; spot.shadow.normalBias = 0.02;
  spot.shadow.camera.near = 0.5; spot.shadow.camera.far = 12;
  scene.add(spot, spot.target);
  const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.24, 0.34, 28, 1, true), housingMat);
  housing.position.set(x, LAMP_Y + 0.14, LAMP_Z); scene.add(housing);
  const cap = new THREE.Mesh(new THREE.CircleGeometry(0.15, 24), housingMat); cap.rotation.x = -Math.PI / 2;
  cap.position.set(x, LAMP_Y + 0.31, LAMP_Z); scene.add(cap);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 12, 6), housingMat);
  cord.position.set(x, LAMP_Y + 6.3, LAMP_Z); scene.add(cord);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const bulb = new THREE.Mesh(new THREE.CircleGeometry(0.22, 28), bulbMat); bulb.rotation.x = Math.PI / 2;
  bulb.position.set(x, LAMP_Y - 0.02, LAMP_Z); scene.add(bulb);
  const halo = glowSprite(lane.light, 0.9, 1.5); halo.position.set(x, LAMP_Y - 0.05, LAMP_Z + 0.2); scene.add(halo);
  const coneH = LAMP_Y, coneR = coneH * Math.tan(0.36);
  const cmat = coneMaterial(lane.light);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(coneR, coneH, 72, 1, true), cmat);
  cone.position.set(x, LAMP_Y - coneH / 2, LAMP_Z); scene.add(cone);
  return { spot, bulbMat, halo, cmat };
}
const lamps = { obs: makeLamp(LANES.obs), disc: makeLamp(LANES.disc), ego: makeLamp(LANES.ego) };

// ---------- bonecos ----------
const figMat = new THREE.MeshStandardMaterial({ color: 0xf1f1f1, roughness: 0.3, metalness: 0 });
const cap = (r, len) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 8, 16), figMat); m.castShadow = true; return m; };
const ball = (r) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 20), figMat); m.castShadow = true; return m; };
function makeFigure(baseX) {
  const root = new THREE.Group(); scene.add(root);
  const hips = new THREE.Group(); hips.position.y = 0.95; root.add(hips);
  const pelvis = ball(0.15); pelvis.scale.set(1.25, 0.8, 0.9); hips.add(pelvis);
  const spine = new THREE.Group(); hips.add(spine);
  const torso = cap(0.17, 0.36); torso.position.y = 0.34; torso.scale.set(1.18, 1, 0.82); spine.add(torso);
  const neck = new THREE.Group(); neck.position.y = 0.66; spine.add(neck);
  const head = new THREE.Group(); neck.add(head);
  const skull = ball(0.19); skull.position.y = 0.21; head.add(skull);
  const arm = (side) => {
    const sh = new THREE.Group(); sh.position.set(0.25 * side, 0.6, 0); spine.add(sh);
    const ua = cap(0.055, 0.22); ua.position.y = -0.16; sh.add(ua);
    const el = new THREE.Group(); el.position.y = -0.33; sh.add(el);
    const fa = cap(0.05, 0.2); fa.position.y = -0.15; el.add(fa);
    const hand = ball(0.066); hand.position.y = -0.31; el.add(hand);
    return { sh, el, hand };
  };
  const leg = (side) => {
    const hp = new THREE.Group(); hp.position.set(0.1 * side, -0.02, 0); hips.add(hp);
    const th = cap(0.075, 0.3); th.position.y = -0.22; hp.add(th);
    const kn = new THREE.Group(); kn.position.y = -0.45; hp.add(kn);
    const shin = cap(0.064, 0.3); shin.position.y = -0.21; kn.add(shin);
    const ft = ball(0.07); ft.scale.set(1, 0.6, 1.7); ft.position.set(0, -0.43, 0.05); kn.add(ft);
    return { hp, kn };
  };
  return { baseX, root, hips, spine, neck, head, armL: arm(-1), armR: arm(1), legL: leg(-1), legR: leg(1) };
}
const P0 = () => ({
  ry: 0, rx: 0, y: 0, px: 0, pz: 0, sx: 0, sz: 0, nx: 0, ny: 0,
  lsx: 0, lsz: -0.1, lel: 0, lelz: 0, rsx: 0, rsz: 0.1, rel: 0, relz: 0,
  lhx: 0, rhx: 0, lkn: 0, rkn: 0,
});
const mixP = (a, b, u) => { const o = {}; for (const k in a) o[k] = lerp(a[k], b[k], u); return o; };
function applyPose(f, p) {
  f.root.position.set(f.baseX + p.px, p.y, p.pz);
  f.root.rotation.set(p.rx, p.ry, 0);
  f.spine.rotation.set(p.sx, 0, p.sz);
  f.neck.rotation.set(p.nx, p.ny, 0);
  f.armL.sh.rotation.set(p.lsx, 0, p.lsz); f.armL.el.rotation.set(p.lel, 0, p.lelz);
  f.armR.sh.rotation.set(p.rsx, 0, p.rsz); f.armR.el.rotation.set(p.rel, 0, p.relz);
  f.legL.hp.rotation.set(p.lhx, 0, 0); f.legL.kn.rotation.set(p.lkn, 0, 0);
  f.legR.hp.rotation.set(p.rhx, 0, 0); f.legR.kn.rotation.set(p.rkn, 0, 0);
  f.root.updateMatrixWorld(true);
}
const figs = { obs: makeFigure(LANES.obs.figX), disc: makeFigure(LANES.disc.figX), ego: makeFigure(LANES.ego.figX) };

// gesto de arremesso: 1 no instante da soltura
function gestureEnv(t, times, pre = 0.28, post = 0.22) {
  let g = 0;
  for (const ts of times) {
    const d = t - ts;
    if (d > -pre && d < post) {
      const v = d < 0 ? easeInOut((d + pre) / pre) : 1 - easeInOut(d / post);
      if (v > g) g = v;
    }
  }
  return g;
}

// ---------- agenda dos blocos ----------
const DISC_T = [], OBS_T = [], EGO_T = [];
for (let k = 0; k < 32; k++) DISC_T.push(3.4 + 0.5 * k);          // 3.4 → 18.9 (um por "dia")
for (let k = 0; k < 13; k++) DISC_T.push(19.15 + 0.235 * k);      // acelera no time-lapse final
for (let k = 0; k < 34; k++) OBS_T.push(3.2 + 0.36 * k);          // 3.2 → 15.08, frenético
for (let k = 0; k < 6; k++) EGO_T.push(3.35 + 0.33 * k);          // 3.35 → 5.0, rápido e grande
const OBS_R = OBS_T.filter((_, i) => i % 2 === 0), OBS_L = OBS_T.filter((_, i) => i % 2 === 1);
const FLY = { disc: 0.4, obs: 0.3, ego: 0.42 };

// ---------- poses por personagem ----------
const DISC_ROWS = 15;
function discRows(t) { let n = 0; for (const ts of DISC_T) if (t >= ts + FLY.disc) n++; return Math.ceil(n / 3); }
function discPose(t) {
  const p = P0();
  const turn = smooth(seg(t, 3.0, 3.4)) * (1 - smooth(seg(t, 22.35, 22.95)));
  p.ry = 0.55 * turn;
  p.sx = 0.015 * Math.sin(t * 2.1);
  const hN = clamp(discRows(t) / DISC_ROWS);
  const fast = t > 19.0;
  const g = gestureEnv(t, DISC_T, fast ? 0.15 : 0.28, fast ? 0.1 : 0.22) * turn;
  p.rsx = -0.15 - (1.55 + 0.75 * hN) * g; p.rsz = 0.1 + 0.25 * g; p.rel = -0.55 * g * (1 - 0.6 * hN);
  p.lsx = 0.1 * g;
  p.nx = (-0.12 * g - 0.35 * hN) * turn;
  p.ny = -0.1 * turn;
  // final: de frente, firme
  const fin = smooth(seg(t, 22.35, 22.95));
  p.sx -= 0.05 * fin; p.nx -= 0.06 * fin;
  return p;
}

function obsPose(t) {
  const p = P0();
  const on = smooth(seg(t, 3.0, 3.3));
  const work = on * (1 - smooth(seg(t, 15.3, 15.6)));
  p.ry = 0.6 * on;
  p.sx = 0.12 + 0.24 * work; p.nx = 0.18 + 0.12 * work;
  p.lkn = p.rkn = 0.14; p.lhx = p.rhx = -0.08;
  const gR = gestureEnv(t, OBS_R, 0.22, 0.16) * work, gL = gestureEnv(t, OBS_L, 0.22, 0.16) * work;
  p.rsx = -0.25 - 1.95 * gR; p.rsz = 0.15 + 0.2 * gR; p.rel = -0.6 * (1 - gR) * work;
  p.lsx = -0.25 - 1.95 * gL; p.lsz = -0.15 + 0.35 * gL; p.lel = -0.6 * (1 - gL) * work;
  // tremor constante (ansiedade)
  const jit = 0.4 + 0.6 * work;
  p.px = 0.012 * Math.sin(t * 63) * jit; p.sz = 0.03 * Math.sin(t * 41) * jit;
  p.ny = 0.06 * Math.sin(t * 29) * jit;
  // esgotamento, joelhos cedem, queda para a frente
  const ex = smooth(seg(t, 15.5, 15.9));
  p.sz += 0.13 * Math.sin((t - 15.5) * 7.5) * ex * (1 - smooth(seg(t, 16.2, 16.4)));
  const buck = smooth(seg(t, 16.0, 16.42));
  p.y = -0.2 * buck * (1 - smooth(seg(t, 16.45, 16.9)));
  p.lkn = p.rkn = lerp(0.14, 1.1, buck); p.lhx = p.rhx = lerp(-0.08, -0.55, buck);
  p.sx = lerp(p.sx, 0.55, buck); p.nx = lerp(p.nx, 0.45, buck);
  const fall = easeIn(seg(t, 16.42, 16.86));
  const bounce = t > 16.86 ? 0.07 * Math.sin(seg(t, 16.86, 17.06) * Math.PI) : 0;
  p.rx = 1.38 * fall - bounce;
  p.pz = 0.25 * fall;
  if (t > 16.42) { p.lsx = lerp(p.lsx, -2.6, fall); p.rsx = lerp(p.rsx, -2.4, fall); p.lel = p.rel = 0; p.lkn = p.rkn = lerp(1.1, 0.25, fall); p.lhx = p.rhx = lerp(-0.55, -0.1, fall); p.sx = lerp(0.55, 0.1, fall); }
  return p;
}

function egoPose(t) {
  const hipsPose = Object.assign(P0(), { lsz: -0.62, lelz: 1.62, rsz: 0.62, relz: -1.62, sx: -0.09, nx: -0.12 });
  const throwP = Object.assign(P0(), { ry: 0.5, lsz: -0.12, rsz: 0.12 });
  const vP = Object.assign(P0(), { lsz: -2.55, rsz: 2.55, sx: -0.12, nx: -0.22 });
  const slump = Object.assign(P0(), { sx: 0.42, nx: 0.5, lsz: -0.05, rsz: 0.05 });
  const sit = Object.assign(P0(), { y: -0.65, sx: 0.55, nx: 0.55, lhx: -2.1, rhx: -2.1, lkn: 2.4, rkn: 2.4, lsx: -0.95, rsx: -0.95, lsz: -0.05, rsz: 0.05, lel: -0.9, rel: -0.9 });
  let p;
  if (t < 3.0) p = hipsPose;
  else if (t < 5.1) {
    p = mixP(hipsPose, throwP, smooth(seg(t, 3.0, 3.3)));
    const g = gestureEnv(t, EGO_T, 0.24, 0.18);
    p.lsx = p.rsx = -0.25 - 2.3 * g; p.lel = p.rel = -0.35 * (1 - g); p.sx = -0.12 * g;
  } else if (t < 7.0) {
    p = mixP(throwP, vP, outBack(seg(t, 5.1, 5.45), 1.4));
    p.lsz += 0.14 * Math.sin((t - 5.45) * 10) * smooth(seg(t, 5.45, 5.6));
    p.rsz -= 0.14 * Math.sin((t - 5.45) * 10) * smooth(seg(t, 5.45, 5.6));
  } else if (t < 13.0) {
    p = mixP(vP, hipsPose, smooth(seg(t, 7.0, 7.4)));
    const look = 0.38 * Math.sin((t - 7.4) * 2.3) * smooth(seg(t, 7.4, 7.9));
    const anx = smooth(seg(t, 12.0, 12.4));
    p.ny = lerp(look, 0.55 * Math.sin((t - 12) * 6.5), anx);
    p.lsz = lerp(p.lsz, -0.35, anx); p.rsz = lerp(p.rsz, 0.35, anx);
  } else if (t < 14.6) {
    const a = mixP(hipsPose, Object.assign(P0(), { lsz: -0.35, rsz: 0.35, lelz: 1.62, relz: -1.62 }), 1);
    p = mixP(a, slump, smooth(seg(t, 13.0, 13.7)));
  } else {
    p = mixP(slump, sit, easeInOut(seg(t, 14.6, 15.45)));
  }
  p = Object.assign({}, p);
  p.sx += 0.012 * Math.sin(t * 1.9);
  return p;
}

// ---------- coroa do ego ----------
const goldMat = new THREE.MeshStandardMaterial({ color: 0xffc94a, metalness: 0.85, roughness: 0.28, emissive: 0x6b4300, emissiveIntensity: 0.6 });
function makeCrown() {
  const g = new THREE.Group();
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.155, 0.09, 28, 1, true), goldMat); g.add(band);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 10), goldMat);
    spike.position.set(Math.cos(a) * 0.16, 0.1, Math.sin(a) * 0.16); g.add(spike);
    const gem = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), goldMat);
    gem.position.set(Math.cos(a) * 0.16, 0.165, Math.sin(a) * 0.16); g.add(gem);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
const crownOnHead = makeCrown(); crownOnHead.position.y = 0.41; crownOnHead.rotation.z = -0.12; figs.ego.head.add(crownOnHead);
const crownFall = makeCrown(); scene.add(crownFall);
const crownSpark = glowSprite(0xffd76a, 0, 1.4); scene.add(crownSpark);
const CROWN_ON = 5.45, CROWN_OFF = 13.25;

// ---------- blocos ----------
const discMat = new THREE.MeshStandardMaterial({ color: 0xffd27e, emissive: 0xffa12a, emissiveIntensity: 0.75, roughness: 0.32 });
const obsMat = new THREE.MeshStandardMaterial({ color: 0xff5145, emissive: 0xb0140a, emissiveIntensity: 0.9, roughness: 0.4 });
const egoMat = new THREE.MeshStandardMaterial({ color: 0xa766ff, emissive: 0x4a1aa0, emissiveIntensity: 0.85, roughness: 0.22, metalness: 0.25 });
const box = (w, h, d, mat) => { const m = new THREE.Mesh(new RoundedBox(w, h, d), mat); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m; };
function RoundedBox(w, h, d) {
  // caixa com cantos levemente chanfrados (lê melhor sob luz dura)
  const g = new THREE.BoxGeometry(w, h, d, 2, 2, 2);
  const pos = g.attributes.position, v = new THREE.Vector3(), r = Math.min(w, h, d) * 0.12;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const ax = Math.abs(v.x) > w / 2 - 1e-4, ay = Math.abs(v.y) > h / 2 - 1e-4, az = Math.abs(v.z) > d / 2 - 1e-4;
    if (ax + ay + az >= 2) {
      if (ax) v.x -= Math.sign(v.x) * r * 0.5; if (ay) v.y -= Math.sign(v.y) * r * 0.5; if (az) v.z -= Math.sign(v.z) * r * 0.5;
    }
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals(); return g;
}

const blocks = [];
// disciplina: 3 colunas, alinhado
DISC_T.forEach((ts, i) => {
  const row = Math.floor(i / 3), col = i % 3;
  const mesh = box(0.3, 0.27, 0.3, discMat);
  const glow = glowSprite(0xffb444, 0, 0.95); scene.add(glow);
  blocks.push({ who: 'disc', ts, fly: FLY.disc, hand: 'R', mesh, glow, h: 0.27,
    slot: new THREE.Vector3(LANES.disc.towerX + (col - 1) * 0.33, 0.135 + row * 0.29, 0), rot: new THREE.Euler(0, 0, 0) });
});
// obsessão: 2 colunas, torta e crescendo inclinada
OBS_T.forEach((ts, i) => {
  const row = Math.floor(i / 2), col = i % 2;
  const lean = 0.0034 * Math.pow(row, 1.7);
  const mesh = box(0.3, 0.22, 0.3, obsMat);
  blocks.push({ who: 'obs', ts, fly: FLY.obs, hand: i % 2 === 0 ? 'R' : 'L', mesh, h: 0.22, row,
    slot: new THREE.Vector3(LANES.obs.towerX + (col - 0.5) * 0.32 + lean + rr(-0.035, 0.035), 0.11 + row * 0.235, rr(-0.05, 0.05)),
    rot: new THREE.Euler(rr(-0.03, 0.03), rr(-0.18, 0.18), rr(-0.05, 0.05) - 0.012 * row) });
});
// ego: 2 colunas de blocos grandes
EGO_T.forEach((ts, i) => {
  const row = Math.floor(i / 2), col = i % 2;
  const mesh = box(0.48, 0.48, 0.48, egoMat);
  blocks.push({ who: 'ego', ts, fly: FLY.ego, hand: 'B', mesh, h: 0.48, row, i,
    slot: new THREE.Vector3(LANES.ego.towerX + (col - 0.5) * 0.5, 0.24 + row * 0.49, 0), rot: new THREE.Euler(0, 0, 0) });
});

// ---------- quedas determinísticas ----------
const G = 9.5;
function fallState(f, t, outPos, outRot) {
  const dt = t - f.t0;
  const tf = Math.sqrt((2 * Math.max(0.001, f.p0.y - f.restY)) / G);
  if (dt < tf) {
    outPos.set(f.p0.x + f.vx * dt, f.p0.y - 0.5 * G * dt * dt, f.p0.z + f.vz * dt);
    outRot.set(f.r0.x + f.sx * dt, f.r0.y + f.sy * dt, f.r0.z + f.sz * dt);
  } else {
    const d = dt - tf, sl = 1 - Math.exp(-d * 6);
    const hop = f.hop * Math.max(0, Math.sin(clamp(d / 0.24) * Math.PI)) ;
    outPos.set(f.p0.x + f.vx * (tf + 0.16 * sl), f.restY + hop, f.p0.z + f.vz * (tf + 0.16 * sl));
    const lx = f.r0.x + f.sx * tf, ly = f.r0.y + f.sy * tf, lz = f.r0.z + f.sz * tf;
    const k = smooth(d / 0.2), q = f.snap;
    outRot.set(lerp(lx, Math.round(lx / q) * q, k), ly + f.sy * 0.05 * sl, lerp(lz, Math.round(lz / q) * q, k));
  }
}
// ego: 4 blocos de cima desabam (o topo primeiro)
const EGO_FALL0 = 13.9;
blocks.filter((b) => b.who === 'ego').forEach((b) => {
  if (b.row === 0) return;
  const order = 5 - b.i;
  b.fall = { t0: EGO_FALL0 + order * 0.11, p0: b.slot.clone(), r0: new THREE.Euler(0, 0, 0),
    vx: rr(-0.9, -0.25), vz: rr(0.6, 1.2), sx: rr(-5, 5), sy: rr(-2, 2), sz: rr(-6, -3),
    restY: 0.24, hop: 0.1, snap: Math.PI / 2 };
});
// obsessão: torre inclina e desmorona para a esquerda/frente
const OBS_TILT0 = 16.55, OBS_BREAK = 17.0;
const obsPivot = new THREE.Vector3(LANES.obs.towerX + 0.3, 0, 0.16);
function obsTilt(t) { return 0.42 * easeIn(seg(t, OBS_TILT0, OBS_BREAK)); }
function obsWobble(t) { return 0.035 * Math.sin((t - 13.0) * 5.2) * smooth(seg(t, 13.0, 14.5)) * (1 - smooth(seg(t, OBS_TILT0, OBS_TILT0 + 0.2))); }
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _m = new THREE.Matrix4();
function towerTransform(slot, rot, ang, wob) {
  // gira o bloco em torno do pivô da base (eixo z), mais um leve tombo para a frente
  _e.set(ang, 0, -0.2 * ang + wob);
  _q.setFromEuler(_e);
  const p = slot.clone().sub(obsPivot).applyQuaternion(_q).add(obsPivot);
  const q2 = new THREE.Quaternion().setFromEuler(rot); const q = _q.clone().multiply(q2);
  return { p, q };
}
blocks.filter((b) => b.who === 'obs').forEach((b) => {
  const td = OBS_BREAK + 0.012 * b.row;
  const tt = towerTransform(b.slot, b.rot, obsTilt(td), 0);
  const e = new THREE.Euler().setFromQuaternion(tt.q);
  const hgt = b.slot.y;
  b.fall = { t0: td, p0: tt.p, r0: e, vx: 0.03 * hgt + rr(-0.35, 0.3), vz: 0.25 + 0.28 * hgt * (0.5 + 0.5 * rnd()),
    sx: rr(-4, 4), sy: rr(-3, 3), sz: rr(2, 7), restY: 0.11, hop: 0.06, snap: Math.PI };
});

// pré-calcula a posição da mão no instante de cada soltura
const _h = new THREE.Vector3(), _h2 = new THREE.Vector3();
const poseOf = { disc: discPose, obs: obsPose, ego: egoPose };
function handPos(who, which, out) {
  const f = figs[who];
  if (which === 'R') f.armR.hand.getWorldPosition(out);
  else if (which === 'L') f.armL.hand.getWorldPosition(out);
  else { f.armR.hand.getWorldPosition(out); f.armL.hand.getWorldPosition(_h2); out.add(_h2).multiplyScalar(0.5); out.y += 0.12; }
  return out;
}
for (const b of blocks) {
  applyPose(figs[b.who], poseOf[b.who](b.ts));
  b.start = handPos(b.who, b.hand, new THREE.Vector3());
}
// posição da coroa quando cai
applyPose(figs.ego, egoPose(CROWN_OFF));
const crownStart = new THREE.Vector3(); crownOnHead.getWorldPosition(crownStart);
const crownFallSt = { t0: CROWN_OFF, p0: crownStart, r0: new THREE.Euler(0, 0, -0.12), vx: -0.15, vz: 0.8,
  sx: 2.5, sy: 1.5, sz: -3.2, restY: 0.12, hop: 0.12, snap: Math.PI / 2 };

// ---------- partículas douradas finais ----------
const motes = [];
for (let i = 0; i < 46; i++) {
  const s = glowSprite(0xffcf70, 0, rr(0.12, 0.26)); scene.add(s);
  motes.push({ s, x: LANES.disc.towerX + rr(-1.3, 1.1), z: rr(-0.4, 0.8), y0: rr(0.0, 3.6), v: rr(0.25, 0.6), t0: 21.9 + rr(0, 1.6), ph: rr(0, 6.28) });
}
const towerGlow = glowSprite(0xffa936, 0, 1); scene.add(towerGlow);

// ---------- luz de cada raia ----------
const level = {
  obs: track([[0, 0.85], [3.0, 0.85], [3.3, 0.55], [5.8, 0.55], [6.1, 1.0], [8.8, 1.0], [9.1, 0.55], [15.3, 0.55], [15.6, 1.0]]),
  disc: track([[0, 0.85], [3.0, 0.85], [3.3, 0.55], [8.8, 0.55], [9.1, 1.0], [11.8, 1.0], [12.1, 0.55], [18.8, 0.55], [19.3, 1.2], [22.0, 1.2], [22.6, 1.45]]),
  ego: track([[0, 0.85], [3.0, 0.85], [3.3, 1.15], [5.8, 1.15], [6.1, 0.55], [11.9, 0.55], [12.15, 1.0], [12.6, 1.0], [13.25, 0.1]]),
};
// tremulação da lâmpada da obsessão até apagar
const FLICK = [[15.95, 1], [16.02, 0.15], [16.1, 0.9], [16.16, 0.05], [16.3, 0.7], [16.34, 0.0], [16.5, 0.45], [16.56, 0.0], [16.75, 0.2], [16.8, 0.0]];
function obsFlicker(t) {
  if (t < FLICK[0][0]) return 1;
  let v = 1;
  for (const [tt, vv] of FLICK) if (t >= tt) v = vv;
  return v;
}

// ---------- câmera ----------
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
function setCamera(t) {
  const u = easeInOut(seg(t, 19.0, 24.6));
  camPos.set(lerp(0.15, 0.25, u), lerp(3.0, 3.3, u), lerp(19.2 - 0.45 * seg(t, 0, 19), 16.6, u));
  camLook.set(lerp(0.15, 0.3, u), lerp(1.74, 2.0, u), 0);
  camera.position.copy(camPos); camera.lookAt(camLook);
  camera.updateMatrixWorld(true);
}

// ---------- rótulos (HTML) presos às raias ----------
const labelEls = { obs: document.getElementById('lab-obs'), disc: document.getElementById('lab-disc'), ego: document.getElementById('lab-ego') };
function placeLabels(t) {
  const fadeLost = (1 - 0.7 * smooth(seg(t, 18.8, 19.4))) * (1 - smooth(seg(t, 21.4, 22.0)));
  const op = { obs: fadeLost, ego: fadeLost, disc: 1 };
  for (const k in labelEls) {
    const el = labelEls[k]; if (!el) continue;
    _v.set(LANES[k].x + 0.04, 0, 1.15).project(camera);
    const x = (_v.x * 0.5 + 0.5) * W, y = (-_v.y * 0.5 + 0.5) * H;
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, 0)`;
    el.style.opacity = op[k].toFixed(3);
  }
}

// ---------- desenho de um instante ----------
const _p = new THREE.Vector3(), _r = new THREE.Euler();
function renderAt(t) {
  setCamera(t);
  for (const k of ['obs', 'disc', 'ego']) applyPose(figs[k], poseOf[k](t));

  // luzes
  const lv = { obs: level.obs(t) * obsFlicker(t), disc: level.disc(t), ego: level.ego(t) };
  for (const k in lamps) {
    const L = lamps[k], v = lv[k];
    L.spot.intensity = SPOT_BASE * v;
    L.cmat.uniforms.uI.value = 0.34 * v;
    L.halo.material.opacity = 0.95 * Math.min(1, v);
    L.bulbMat.color.setScalar(0.12 + 0.88 * Math.min(1, v));
  }

  // materiais esfriando
  obsMat.emissiveIntensity = lerp(0.9, 0.22, smooth(seg(t, 17.2, 19.5)));
  egoMat.emissiveIntensity = lerp(0.85, 0.2, smooth(seg(t, 13.0, 14.0)));
  discMat.emissiveIntensity = lerp(0.75, 1.25, smooth(seg(t, 22.0, 23.4)));

  // blocos
  for (const b of blocks) {
    const m = b.mesh;
    if (t < b.ts - 0.14) { m.visible = false; if (b.glow) b.glow.material.opacity = 0; continue; }
    m.visible = true;
    let squash = 0;
    if (t < b.ts) {
      handPos(b.who, b.hand, _p); _p.y += b.h * 0.3;
      m.position.copy(_p); m.rotation.set(0, 0, 0);
      m.scale.setScalar(Math.max(0.001, easeOut((t - (b.ts - 0.14)) / 0.14)));
    } else if (t < b.ts + b.fly) {
      const u = (t - b.ts) / b.fly, ue = easeInOut(u * 0.85 + 0.15 * u * u);
      const arc = Math.max(0.35, b.slot.y - b.start.y + 0.4);
      m.position.lerpVectors(b.start, b.slot, ue); m.position.y += arc * 4 * ue * (1 - ue);
      m.rotation.set(b.rot.x * ue, b.rot.y * ue, b.rot.z * ue - (1 - ue) * 1.6);
      m.scale.setScalar(1);
    } else {
      m.position.copy(b.slot); m.rotation.copy(b.rot); m.scale.setScalar(1);
      const d = t - (b.ts + b.fly); squash = d < 0.16 ? Math.sin((d / 0.16) * Math.PI) : 0;
    }
    if (squash) { m.scale.set(1 + 0.1 * squash, 1 - 0.16 * squash, 1 + 0.1 * squash); m.position.y -= b.h * 0.08 * squash; }
    // obsessão: balanço e tombo
    if (b.who === 'obs' && t >= b.ts + b.fly) {
      if (t < b.fall.t0) {
        const tt = towerTransform(b.slot, b.rot, obsTilt(t), obsWobble(t));
        m.position.copy(tt.p); m.quaternion.copy(tt.q);
      } else { fallState(b.fall, t, _p, _r); m.position.copy(_p); m.rotation.copy(_r); m.scale.setScalar(1); }
    }
    if (b.who === 'ego' && b.fall && t >= b.fall.t0) { fallState(b.fall, t, _p, _r); m.position.copy(_p); m.rotation.copy(_r); m.scale.setScalar(1); }
    if (b.glow) {
      b.glow.position.copy(m.position); b.glow.position.z += 0.2;
      const land = b.ts + b.fly;
      const flash = t >= land ? Math.exp(-(t - land) * 7) : 0;
      b.glow.material.opacity = (t >= b.ts - 0.14 ? 0.13 : 0) + 0.55 * flash + 0.12 * smooth(seg(t, 22.0, 23.4));
    }
  }

  // coroa
  crownOnHead.visible = t >= CROWN_ON && t < CROWN_OFF;
  crownOnHead.scale.setScalar(Math.max(0.001, outBack(seg(t, CROWN_ON, CROWN_ON + 0.35), 2.4)));
  crownFall.visible = t >= CROWN_OFF;
  if (crownFall.visible) { fallState(crownFallSt, t, _p, _r); crownFall.position.copy(_p); crownFall.rotation.copy(_r); }
  crownOnHead.getWorldPosition(_p);
  crownSpark.position.copy(_p); crownSpark.position.z += 0.25;
  crownSpark.material.opacity = t >= CROWN_ON && t < CROWN_OFF ? 0.85 * Math.exp(-(t - CROWN_ON) * 3.2) + 0.12 : 0;

  // brilho da torre e partículas no final
  const rowsNow = discRows(t);
  towerGlow.position.set(LANES.disc.towerX, rowsNow * 0.29 * 0.5, -0.3);
  towerGlow.scale.set(2.6, Math.max(1, rowsNow * 0.29 * 1.6), 1);
  towerGlow.material.opacity = 0.05 + 0.25 * smooth(seg(t, 21.8, 23.4)) + 0.04 * clamp(rowsNow / 15);
  for (const q of motes) {
    const d = t - q.t0;
    if (d < 0) { q.s.material.opacity = 0; continue; }
    q.s.position.set(q.x + 0.12 * Math.sin(q.ph + d * 1.3), q.y0 + d * q.v, q.z);
    q.s.material.opacity = 0.7 * smooth(d / 0.6) * (1 - smooth((d - 2.4) / 1.2));
  }

  placeLabels(t);
  renderer.render(scene, camera);
}

// agenda para os efeitos sonoros
window.__schedule = {
  disc: blocks.filter((b) => b.who === 'disc').map((b) => +(b.ts + b.fly).toFixed(3)),
  obs: blocks.filter((b) => b.who === 'obs').map((b) => +(b.ts + b.fly).toFixed(3)),
  ego: blocks.filter((b) => b.who === 'ego').map((b) => +(b.ts + b.fly).toFixed(3)),
  crownOn: CROWN_ON, crownOff: CROWN_OFF,
  egoFall: blocks.filter((b) => b.who === 'ego' && b.fall).map((b) => +(b.fall.t0 + Math.sqrt(2 * (b.fall.p0.y - b.fall.restY) / G)).toFixed(3)),
  obsFall: blocks.filter((b) => b.who === 'obs').map((b) => +(b.fall.t0 + Math.sqrt(2 * Math.max(0.001, b.fall.p0.y - b.fall.restY) / G)).toFixed(3)),
  obsBody: 16.86, flicker: FLICK.map((f) => f[0]),
};

window.__renderAt = renderAt;
window.addEventListener('hf-seek', (e) => renderAt(e.detail.time));

export async function build() {
  await renderer.compileAsync(scene, camera);
  renderAt(0);
  const px = new Uint8Array(4);
  const gl = renderer.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
}
