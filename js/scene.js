// ════════════════════════════════════════════════════════
//  MWD — THREE DIMENSIONAL INTERFACES — Scene
// ════════════════════════════════════════════════════════

import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

await document.fonts.ready;

// ── Renderer ──────────────────────────────────────────
RectAreaLightUniformsLib.init();

const canvas = document.getElementById('webgl');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// ── Scene ─────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// ── Camera ────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(
  60, window.innerWidth / window.innerHeight, 0.1, 500
);
camera.position.set(0, 0, 12);

// ── Post-processing ───────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.2,   // strength
  0.5,   // radius
  0.15   // threshold
);
composer.addPass(bloomPass);

// ── Ambient ───────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x0a0a1a, 0.3));


// ══════════════════════════════════════════════════════
//  SECTION Z-POSITIONS — camera travels through these
// ══════════════════════════════════════════════════════

const SCENE_Z = {
  hero: 12,
  particles: -40,
  glass: -100,
  space: -170,
};


// ══════════════════════════════════════════════════════
//  SECTION 1: HERO — Hologram Room
// ══════════════════════════════════════════════════════

const heroGroup = new THREE.Group();
heroGroup.position.z = 0; // centered at origin, camera at z=12

// Hologram scanline ShaderMaterial
const holoScanlineMat = new THREE.ShaderMaterial({
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false,
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0x00FFD1) },
    uOpacity: { value: 0.15 },
    uFlicker: { value: 1.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uOpacity;
    uniform float uFlicker;

    varying vec2 vUv;

    void main() {
      // horizontal scanlines
      float scanline = sin(vUv.y * 80.0 + uTime * 2.0) * 0.5 + 0.5;
      scanline = smoothstep(0.3, 0.7, scanline);

      // thicker bands every 10 lines
      float band = sin(vUv.y * 20.0 - uTime * 0.5) * 0.5 + 0.5;
      band = smoothstep(0.4, 0.6, band) * 0.3;

      float alpha = (scanline * 0.6 + band) * uOpacity * uFlicker;
      gl_FragColor = vec4(uColor, alpha);
    }
  `,
});

// Wireframe icosahedron (core hologram)
const holoGeo = new THREE.IcosahedronGeometry(2.2, 1);
const holoWire = new THREE.Mesh(
  holoGeo,
  new THREE.MeshBasicMaterial({
    color: 0x00FFD1,
    wireframe: true,
    transparent: true,
    opacity: 0.6,
  })
);
heroGroup.add(holoWire);

// Scanline overlay mesh (slightly larger)
const holoOverlay = new THREE.Mesh(
  new THREE.IcosahedronGeometry(2.25, 2),
  holoScanlineMat
);
heroGroup.add(holoOverlay);

// Flicker state
let flickerTimer = 0;
let flickerState = 1.0;

// Orbital particles (500 in sphere formation, violet)
const orbParticleCount = 500;
const orbPositions = new Float32Array(orbParticleCount * 3);
const orbColors = new Float32Array(orbParticleCount * 3);
const orbBasePositions = new Float32Array(orbParticleCount * 3);

const violetCol = new THREE.Color(0x7C3AED);
for (let i = 0; i < orbParticleCount; i++) {
  const i3 = i * 3;
  // spherical distribution
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const r = 4 + Math.random() * 1.5;
  orbBasePositions[i3]     = r * Math.sin(phi) * Math.cos(theta);
  orbBasePositions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
  orbBasePositions[i3 + 2] = r * Math.cos(phi);
  orbPositions[i3]     = orbBasePositions[i3];
  orbPositions[i3 + 1] = orbBasePositions[i3 + 1];
  orbPositions[i3 + 2] = orbBasePositions[i3 + 2];
  orbColors[i3]     = violetCol.r;
  orbColors[i3 + 1] = violetCol.g;
  orbColors[i3 + 2] = violetCol.b;
}

const orbGeo = new THREE.BufferGeometry();
orbGeo.setAttribute('position', new THREE.BufferAttribute(orbPositions, 3));
orbGeo.setAttribute('color', new THREE.BufferAttribute(orbColors, 3));

const orbPoints = new THREE.Points(orbGeo, new THREE.PointsMaterial({
  size: 0.04,
  vertexColors: true,
  transparent: true,
  opacity: 0.8,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  sizeAttenuation: true,
}));
heroGroup.add(orbPoints);

scene.add(heroGroup);


// ══════════════════════════════════════════════════════
//  SECTION 2: PARTICLE STORM — Torus
// ══════════════════════════════════════════════════════

const stormGroup = new THREE.Group();
stormGroup.position.z = SCENE_Z.particles + 12; // center it so camera sees it

const STORM_COUNT = 8000;
const stormPositions = new Float32Array(STORM_COUNT * 3);
const stormBasePositions = new Float32Array(STORM_COUNT * 3);
const stormColors = new Float32Array(STORM_COUNT * 3);

const colViolet = new THREE.Color(0x7C3AED);
const colPink   = new THREE.Color(0xEC4899);
const colTeal   = new THREE.Color(0x00FFD1);

for (let i = 0; i < STORM_COUNT; i++) {
  const i3 = i * 3;
  // torus parametric: R=8 major, r=3 minor
  const R = 8, r = 3;
  const u = Math.random() * Math.PI * 2;
  const v = Math.random() * Math.PI * 2;
  // noise offset
  const noiseR = (Math.random() - 0.5) * 1.5;
  const noiseY = (Math.random() - 0.5) * 0.8;

  const x = (R + (r + noiseR) * Math.cos(v)) * Math.cos(u);
  const y = (r + noiseR) * Math.sin(v) + noiseY;
  const z = (R + (r + noiseR) * Math.cos(v)) * Math.sin(u);

  stormBasePositions[i3]     = x;
  stormBasePositions[i3 + 1] = y;
  stormBasePositions[i3 + 2] = z;
  stormPositions[i3]     = x;
  stormPositions[i3 + 1] = y;
  stormPositions[i3 + 2] = z;

  // color based on position: blend violet → pink → teal
  const t = (Math.atan2(z, x) + Math.PI) / (Math.PI * 2); // 0-1
  const tmpColor = new THREE.Color();
  if (t < 0.33) {
    tmpColor.lerpColors(colViolet, colPink, t / 0.33);
  } else if (t < 0.66) {
    tmpColor.lerpColors(colPink, colTeal, (t - 0.33) / 0.33);
  } else {
    tmpColor.lerpColors(colTeal, colViolet, (t - 0.66) / 0.34);
  }
  stormColors[i3]     = tmpColor.r;
  stormColors[i3 + 1] = tmpColor.g;
  stormColors[i3 + 2] = tmpColor.b;
}

const stormGeo = new THREE.BufferGeometry();
stormGeo.setAttribute('position', new THREE.BufferAttribute(stormPositions, 3));
stormGeo.setAttribute('color', new THREE.BufferAttribute(stormColors, 3));

const stormPoints = new THREE.Points(stormGeo, new THREE.PointsMaterial({
  size: 0.035,
  vertexColors: true,
  transparent: true,
  opacity: 0.9,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  sizeAttenuation: true,
}));
stormGroup.add(stormPoints);
scene.add(stormGroup);


// ══════════════════════════════════════════════════════
//  SECTION 3: GLASS FORMS — Material Studies
// ══════════════════════════════════════════════════════

const glassGroup = new THREE.Group();
glassGroup.position.z = SCENE_Z.glass + 12;

// RectAreaLights for this section
const glassLightViolet = new THREE.RectAreaLight(0x7C3AED, 8, 15, 15);
glassLightViolet.position.set(-6, 5, SCENE_Z.glass + 16);
glassLightViolet.lookAt(0, 0, SCENE_Z.glass + 12);
scene.add(glassLightViolet);

const glassLightTeal = new THREE.RectAreaLight(0x00FFD1, 6, 15, 15);
glassLightTeal.position.set(6, -3, SCENE_Z.glass + 10);
glassLightTeal.lookAt(0, 0, SCENE_Z.glass + 12);
scene.add(glassLightTeal);

const glassLightWhite = new THREE.RectAreaLight(0xffffff, 4, 10, 10);
glassLightWhite.position.set(0, 6, SCENE_Z.glass + 18);
glassLightWhite.lookAt(0, 0, SCENE_Z.glass + 12);
scene.add(glassLightWhite);

// Also add point lights so the forms are visible
const glassPointA = new THREE.PointLight(0x7C3AED, 3, 30);
glassPointA.position.set(-5, 3, 4);
glassGroup.add(glassPointA);

const glassPointB = new THREE.PointLight(0x00FFD1, 3, 30);
glassPointB.position.set(5, -2, 2);
glassGroup.add(glassPointB);

const glassPointC = new THREE.PointLight(0xffffff, 2, 20);
glassPointC.position.set(0, 5, 6);
glassGroup.add(glassPointC);

// Glass material base
const glassMat = new THREE.MeshPhysicalMaterial({
  transmission: 0.9,
  iridescence: 1,
  iridescenceIOR: 1.3,
  roughness: 0,
  metalness: 0,
  thickness: 1.5,
  color: 0xffffff,
  side: THREE.DoubleSide,
});

// 1. Icosahedron — glass
const glassIco = new THREE.Mesh(
  new THREE.IcosahedronGeometry(1.8, 0),
  glassMat.clone()
);
glassIco.position.set(-4, 1.5, 0);
glassGroup.add(glassIco);

// 2. TorusKnot — glass
const glassKnot = new THREE.Mesh(
  new THREE.TorusKnotGeometry(1.2, 0.4, 128, 16),
  glassMat.clone()
);
glassKnot.position.set(3, 2, -2);
glassGroup.add(glassKnot);

// 3. Octahedron — chrome violet
const chromeOcta = new THREE.Mesh(
  new THREE.OctahedronGeometry(1.5, 0),
  new THREE.MeshPhysicalMaterial({
    metalness: 1,
    roughness: 0.1,
    color: 0x7C3AED,
    side: THREE.DoubleSide,
  })
);
chromeOcta.position.set(0, -1.5, 1);
glassGroup.add(chromeOcta);

// 4. Sphere — full glass iridescent
const glassSphere = new THREE.Mesh(
  new THREE.SphereGeometry(1.3, 64, 64),
  new THREE.MeshPhysicalMaterial({
    transmission: 1,
    iridescence: 1.5,
    iridescenceIOR: 1.4,
    roughness: 0,
    metalness: 0,
    thickness: 2,
    color: 0xffffff,
    side: THREE.DoubleSide,
  })
);
glassSphere.position.set(-2, -2.5, -1);
glassGroup.add(glassSphere);

// 5. Box — wireframe + ghost overlay
const boxGeo = new THREE.BoxGeometry(2, 2, 2);
const boxWire = new THREE.Mesh(
  boxGeo,
  new THREE.MeshBasicMaterial({
    color: 0x00FFD1,
    wireframe: true,
    transparent: true,
    opacity: 0.7,
  })
);
boxWire.position.set(4, -1, 2);
glassGroup.add(boxWire);

const boxGhost = new THREE.Mesh(
  new THREE.BoxGeometry(2.02, 2.02, 2.02),
  new THREE.MeshBasicMaterial({
    color: 0x00FFD1,
    transparent: true,
    opacity: 0.05,
    side: THREE.DoubleSide,
  })
);
boxGhost.position.copy(boxWire.position);
glassGroup.add(boxGhost);

const glassForms = [glassIco, glassKnot, chromeOcta, glassSphere, boxWire, boxGhost];

scene.add(glassGroup);


// ══════════════════════════════════════════════════════
//  SECTION 4: DEEP SPACE
// ══════════════════════════════════════════════════════

const spaceGroup = new THREE.Group();
spaceGroup.position.z = SCENE_Z.space + 12;

// 3000 star particles at varying depths
const STAR_COUNT = 3000;
const starPositions = new Float32Array(STAR_COUNT * 3);
const starColors = new Float32Array(STAR_COUNT * 3);

for (let i = 0; i < STAR_COUNT; i++) {
  const i3 = i * 3;
  starPositions[i3]     = (Math.random() - 0.5) * 120;
  starPositions[i3 + 1] = (Math.random() - 0.5) * 120;
  starPositions[i3 + 2] = (Math.random() - 0.5) * 120;
  // white to slight blue-violet
  const brightness = 0.5 + Math.random() * 0.5;
  starColors[i3]     = brightness * (0.8 + Math.random() * 0.2);
  starColors[i3 + 1] = brightness * (0.8 + Math.random() * 0.2);
  starColors[i3 + 2] = brightness;
}

const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

const starPoints = new THREE.Points(starGeo, new THREE.PointsMaterial({
  size: 0.08,
  vertexColors: true,
  transparent: true,
  opacity: 0.9,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  sizeAttenuation: true,
}));
spaceGroup.add(starPoints);

// Large wireframe sphere surrounding camera
const cageSphere = new THREE.Mesh(
  new THREE.SphereGeometry(30, 32, 32),
  new THREE.MeshBasicMaterial({
    color: 0x7C3AED,
    wireframe: true,
    transparent: true,
    opacity: 0.08,
    side: THREE.BackSide,
  })
);
spaceGroup.add(cageSphere);

scene.add(spaceGroup);


// ══════════════════════════════════════════════════════
//  BACKGROUND PLANETS
// ══════════════════════════════════════════════════════

const planets = [];
const planetConfigs = [
  { color: 0xC47335, roughness: 0.7, radius: 3, pos: [35, 15, -30], rimColor: 0xE88844 },
  { color: 0x7799AA, roughness: 0.3, radius: 2.5, pos: [-40, -20, -80], rimColor: 0x99BBCC },
  { color: 0xDDCC77, roughness: 0.5, radius: 5, pos: [45, 25, -130], rimColor: 0xEEDD88 },
  { color: 0x882222, roughness: 0.6, radius: 2, pos: [-30, 10, -60], rimColor: 0xAA3333 },
  { color: 0x556677, roughness: 0.4, radius: 2.8, pos: [30, -25, -150], rimColor: 0x778899 },
];

planetConfigs.forEach(cfg => {
  const geo = new THREE.SphereGeometry(cfg.radius, 32, 32);
  const mat = new THREE.MeshStandardMaterial({
    color: cfg.color,
    roughness: cfg.roughness,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
  scene.add(mesh);

  const rimLight = new THREE.PointLight(cfg.rimColor, 1.5, cfg.radius * 8);
  rimLight.position.set(
    cfg.pos[0] + cfg.radius * 0.8,
    cfg.pos[1] + cfg.radius * 0.3,
    cfg.pos[2] - cfg.radius * 0.5
  );
  scene.add(rimLight);

  planets.push(mesh);
});


// ══════════════════════════════════════════════════════
//  SUPERNOVA
// ══════════════════════════════════════════════════════

const supernovaGroup = new THREE.Group();
supernovaGroup.position.set(25, 20, -80);

// Bright core
const novaCore = new THREE.Mesh(
  new THREE.SphereGeometry(0.3, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);
supernovaGroup.add(novaCore);

// Particle cloud — white center fading to orange at edges
const NOVA_PARTICLES = 200;
const novaPositions = new Float32Array(NOVA_PARTICLES * 3);
const novaColors = new Float32Array(NOVA_PARTICLES * 3);

for (let i = 0; i < NOVA_PARTICLES; i++) {
  const i3 = i * 3;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const r = 0.5 + Math.random() * 3;
  novaPositions[i3]     = r * Math.sin(phi) * Math.cos(theta);
  novaPositions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
  novaPositions[i3 + 2] = r * Math.cos(phi);

  const blend = r / 3.5;
  const col = new THREE.Color().lerpColors(
    new THREE.Color(0xffffff),
    new THREE.Color(0xFF8800),
    blend
  );
  novaColors[i3]     = col.r;
  novaColors[i3 + 1] = col.g;
  novaColors[i3 + 2] = col.b;
}

const novaGeo = new THREE.BufferGeometry();
novaGeo.setAttribute('position', new THREE.BufferAttribute(novaPositions, 3));
novaGeo.setAttribute('color', new THREE.BufferAttribute(novaColors, 3));

const novaPoints = new THREE.Points(novaGeo, new THREE.PointsMaterial({
  size: 0.15,
  vertexColors: true,
  transparent: true,
  opacity: 0.8,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  sizeAttenuation: true,
}));
supernovaGroup.add(novaPoints);

// Lens flare sprite (canvas-generated glow texture)
const flareCanvas = document.createElement('canvas');
flareCanvas.width = 64;
flareCanvas.height = 64;
const flareCtx = flareCanvas.getContext('2d');
const flareGrad = flareCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
flareGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
flareGrad.addColorStop(0.3, 'rgba(255, 200, 100, 0.5)');
flareGrad.addColorStop(1, 'rgba(255, 150, 50, 0)');
flareCtx.fillStyle = flareGrad;
flareCtx.fillRect(0, 0, 64, 64);

const flareTexture = new THREE.CanvasTexture(flareCanvas);
const flareMat = new THREE.SpriteMaterial({
  map: flareTexture,
  color: 0xffffff,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const flareSprite = new THREE.Sprite(flareMat);
flareSprite.scale.set(8, 8, 1);
supernovaGroup.add(flareSprite);

scene.add(supernovaGroup);


// ══════════════════════════════════════════════════════
//  SPACESHIP
// ══════════════════════════════════════════════════════

const shipGroup = new THREE.Group();

// Body — tapered cylinder (nose at +Z after rotation)
const shipBody = new THREE.Mesh(
  new THREE.CylinderGeometry(0.05, 0.3, 1.2, 8),
  new THREE.MeshStandardMaterial({ color: 0x888899, metalness: 0.8, roughness: 0.3 })
);
shipBody.rotation.x = -Math.PI / 2;
shipGroup.add(shipBody);

// Wings — thin wide box spanning both sides
const shipWings = new THREE.Mesh(
  new THREE.BoxGeometry(1.8, 0.03, 0.5),
  new THREE.MeshStandardMaterial({ color: 0x667788, metalness: 0.7, roughness: 0.4 })
);
shipWings.position.z = -0.1;
shipGroup.add(shipWings);

// Engine glow
const engineLight = new THREE.PointLight(0x88CCFF, 0.5, 5);
engineLight.position.z = -0.7;
shipGroup.add(engineLight);

scene.add(shipGroup);

// Flight path — CatmullRom closed loop through the scene
const shipCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(15, 5, 0),
  new THREE.Vector3(-10, 12, -40),
  new THREE.Vector3(20, -8, -70),
  new THREE.Vector3(-15, 10, -100),
  new THREE.Vector3(12, -5, -140),
  new THREE.Vector3(-20, 8, -160),
  new THREE.Vector3(10, -10, -120),
  new THREE.Vector3(18, 3, -50),
], true);

// Engine trail particles
const TRAIL_COUNT = 15;
const trailPositions = new Float32Array(TRAIL_COUNT * 3);
const shipInitPos = shipCurve.getPointAt(0);
for (let i = 0; i < TRAIL_COUNT; i++) {
  trailPositions[i * 3]     = shipInitPos.x;
  trailPositions[i * 3 + 1] = shipInitPos.y;
  trailPositions[i * 3 + 2] = shipInitPos.z;
}

const trailGeo = new THREE.BufferGeometry();
trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));

const trailPoints = new THREE.Points(trailGeo, new THREE.PointsMaterial({
  size: 0.08,
  color: 0xAADDFF,
  transparent: true,
  opacity: 0.6,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  sizeAttenuation: true,
}));
scene.add(trailPoints);

let lastTrailTime = 0;
let trailIndex = 0;


// ══════════════════════════════════════════════════════
//  GSAP SCROLL — scrubs camera.position.z
// ══════════════════════════════════════════════════════

gsap.registerPlugin(ScrollTrigger);

// Make scroll container tall enough
const scrollContainer = document.querySelector('.scroll-container');

// Scrub camera z through all scenes
gsap.to(camera.position, {
  z: SCENE_Z.space,
  ease: 'none',
  scrollTrigger: {
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1.5,
  },
});

// Section visibility triggers
const sectionConfigs = [
  { id: 'hero-content', start: 0, end: 0.2 },
  { id: 'particles-content', start: 0.22, end: 0.45 },
  { id: 'glass-content', start: 0.48, end: 0.72 },
  { id: 'space-content', start: 0.75, end: 1.0 },
];

sectionConfigs.forEach(cfg => {
  const el = document.getElementById(cfg.id);
  if (!el) return;

  ScrollTrigger.create({
    trigger: scrollContainer,
    start: `${cfg.start * 100}% top`,
    end: `${cfg.end * 100}% top`,
    onEnter: () => el.classList.add('visible'),
    onLeave: () => el.classList.remove('visible'),
    onEnterBack: () => el.classList.add('visible'),
    onLeaveBack: () => el.classList.remove('visible'),
  });
});

// Hide scroll hint after first scroll
const scrollHint = document.getElementById('scroll-hint');
ScrollTrigger.create({
  trigger: scrollContainer,
  start: '2% top',
  onEnter: () => { if (scrollHint) scrollHint.classList.add('hidden'); },
  onLeaveBack: () => { if (scrollHint) scrollHint.classList.remove('hidden'); },
});

// Show hero immediately
document.getElementById('hero-content')?.classList.add('visible');


// ══════════════════════════════════════════════════════
//  MOUSE TRACKING
// ══════════════════════════════════════════════════════

const mouse = { x: 0, y: 0, ndcX: 0, ndcY: 0 };

document.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
  mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;
  mouse.ndcX = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.ndcY = -(e.clientY / window.innerHeight) * 2 + 1;
});


// ══════════════════════════════════════════════════════
//  ANIMATION LOOP
// ══════════════════════════════════════════════════════

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  const dt = clock.getDelta();

  // ── Hologram: rotation + float ──
  holoWire.rotation.y = t * 0.3;
  holoWire.rotation.x = t * 0.15;
  holoOverlay.rotation.y = t * 0.3;
  holoOverlay.rotation.x = t * 0.15;

  // Float (sin wave Y)
  const floatY = Math.sin(t * 0.8) * 0.3;
  holoWire.position.y = floatY;
  holoOverlay.position.y = floatY;

  // Scanline time
  holoScanlineMat.uniforms.uTime.value = t;

  // Flicker: random toggle every few seconds
  flickerTimer += dt || 0.016;
  if (flickerTimer > 2 + Math.random() * 3) {
    flickerTimer = 0;
    flickerState = 0.0;
    // Restore after brief moment
    setTimeout(() => { flickerState = 1.0; }, 80 + Math.random() * 120);
  }
  holoScanlineMat.uniforms.uFlicker.value = flickerState;

  // Orbital particles — slow orbit
  const orbArr = orbGeo.getAttribute('position').array;
  const orbAngle = t * 0.15;
  const cosA = Math.cos(orbAngle);
  const sinA = Math.sin(orbAngle);
  for (let i = 0; i < orbParticleCount; i++) {
    const i3 = i * 3;
    const bx = orbBasePositions[i3];
    const bz = orbBasePositions[i3 + 2];
    orbArr[i3]     = bx * cosA - bz * sinA;
    orbArr[i3 + 2] = bx * sinA + bz * cosA;
    orbArr[i3 + 1] = orbBasePositions[i3 + 1] + Math.sin(t * 0.5 + i * 0.1) * 0.15;
  }
  orbGeo.getAttribute('position').needsUpdate = true;

  // ── Particle Storm: spin + mouse repulsion ──
  stormPoints.rotation.y = t * 0.08;
  stormPoints.rotation.x = Math.sin(t * 0.05) * 0.1;

  // Mouse repulsion — project mouse into storm space
  const camZ = camera.position.z;
  const inStormRange = camZ < SCENE_Z.particles + 25 && camZ > SCENE_Z.particles - 15;

  if (inStormRange) {
    raycaster.setFromCamera(new THREE.Vector2(mouse.ndcX, mouse.ndcY), camera);
    const stormWorldZ = stormGroup.position.z;
    const distToPlane = Math.abs(camZ - stormWorldZ);
    const mouseWorld = new THREE.Vector3();
    raycaster.ray.at(distToPlane, mouseWorld);

    // Transform to storm local space
    const invMat = new THREE.Matrix4().copy(stormGroup.matrixWorld).invert();
    const mouseLocal = mouseWorld.applyMatrix4(invMat);

    // Apply to storm rotated space
    const stormArr = stormGeo.getAttribute('position').array;
    const rotMat = new THREE.Matrix4().makeRotationY(stormPoints.rotation.y);
    const rotMatInv = new THREE.Matrix4().copy(rotMat).invert();
    const mLocal = mouseLocal.clone().applyMatrix4(rotMatInv);

    for (let i = 0; i < STORM_COUNT; i++) {
      const i3 = i * 3;
      const dx = stormArr[i3] - mLocal.x;
      const dy = stormArr[i3 + 1] - mLocal.y;
      const dz = stormArr[i3 + 2] - mLocal.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < 5) {
        const force = (5 - dist) / 5 * 0.3;
        stormArr[i3]     += (dx / dist) * force;
        stormArr[i3 + 1] += (dy / dist) * force;
        stormArr[i3 + 2] += (dz / dist) * force;
      } else {
        // Slowly return to base position
        stormArr[i3]     += (stormBasePositions[i3]     - stormArr[i3])     * 0.01;
        stormArr[i3 + 1] += (stormBasePositions[i3 + 1] - stormArr[i3 + 1]) * 0.01;
        stormArr[i3 + 2] += (stormBasePositions[i3 + 2] - stormArr[i3 + 2]) * 0.01;
      }
    }
    stormGeo.getAttribute('position').needsUpdate = true;
  }

  // ── Glass Forms: individual rotations ──
  glassIco.rotation.x = t * 0.2;
  glassIco.rotation.y = t * 0.35;

  glassKnot.rotation.x = t * 0.15;
  glassKnot.rotation.z = t * 0.25;

  chromeOcta.rotation.y = t * 0.4;
  chromeOcta.rotation.z = t * 0.1;

  glassSphere.rotation.y = t * 0.12;
  glassSphere.rotation.x = t * 0.08;

  boxWire.rotation.x = t * 0.18;
  boxWire.rotation.y = t * 0.3;
  boxGhost.rotation.copy(boxWire.rotation);

  // ── Deep Space: cage rotation ──
  cageSphere.rotation.y = t * 0.02;
  cageSphere.rotation.x = t * 0.01;
  starPoints.rotation.y = t * 0.005;

  // ── Planets: slow Y rotation ──
  planets.forEach((planet, i) => {
    planet.rotation.y = t * (0.03 + i * 0.008);
  });

  // ── Supernova: breathing pulse ──
  const novaScale = 1 + Math.sin(t * 0.8) * 0.15;
  supernovaGroup.scale.setScalar(novaScale);
  flareSprite.material.opacity = 0.3 + Math.sin(t * 1.2) * 0.15;

  // ── Spaceship: follow curve ──
  const shipSpeed = 20;
  const shipT = (t % shipSpeed) / shipSpeed;
  const shipPos = shipCurve.getPointAt(shipT);
  const shipLookAt = shipCurve.getPointAt((shipT + 0.01) % 1);
  shipGroup.position.copy(shipPos);
  shipGroup.lookAt(shipLookAt);

  // Ship trail — ring buffer of positions
  if (t - lastTrailTime > 0.07) {
    lastTrailTime = t;
    const tArr = trailGeo.getAttribute('position').array;
    tArr[trailIndex * 3]     = shipPos.x;
    tArr[trailIndex * 3 + 1] = shipPos.y;
    tArr[trailIndex * 3 + 2] = shipPos.z;
    trailIndex = (trailIndex + 1) % TRAIL_COUNT;
    trailGeo.getAttribute('position').needsUpdate = true;
  }

  // ── Render ──
  composer.render();
}

animate();


// ══════════════════════════════════════════════════════
//  RESIZE
// ══════════════════════════════════════════════════════

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  bloomPass.resolution.set(w, h);
});
