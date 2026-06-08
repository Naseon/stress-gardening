const canvas = document.querySelector("#thornCanvas");
const slider = document.querySelector("#stressSlider");
const regrowButton = document.querySelector("#regrowButton");
const statusText = document.querySelector("#statusText");
const toolButtons = document.querySelectorAll(".tool-button[data-tool]");
const undoButton = document.querySelector("#undoButton");
const resetViewButton = document.querySelector("#resetViewButton");
const saveButton = document.querySelector("#saveButton");
const labStressValue = document.querySelector("#labStressValue");
const zoomInButton = document.querySelector("#zoomInButton");
const zoomOutButton = document.querySelector("#zoomOutButton");

let currentTool = "comb";
let currentPhase = "growing";
let currentLevel = 1;
let history = [];
let isPointerDown = false;
let isDragged = false;
let dragPX = 0;
let dragPY = 0;
let targetRY = 0;
let targetRX = 0;
let currentRY = 0;
let currentRX = 0;
let growStart = 0;
let audioCtx = null;
let lastCombSoundTime = 0;
let zoomLevel = 1;

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.2;

function getAudioContext() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }

  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

function playScissorsSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  const highpass = ctx.createBiquadFilter();
  const bandpass = ctx.createBiquadFilter();

  oscillator.connect(highpass);
  highpass.connect(bandpass);
  bandpass.connect(gain);
  gain.connect(ctx.destination);

  highpass.type = "highpass";
  highpass.frequency.value = 720;
  bandpass.type = "bandpass";
  bandpass.frequency.value = 2700;
  bandpass.Q.value = 3.2;

  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(1850, now);
  oscillator.frequency.exponentialRampToValueAtTime(360, now + 0.08);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.04, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

  oscillator.start(now);
  oscillator.stop(now + 0.12);
}

function playPickSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(980, now);
  oscillator.frequency.exponentialRampToValueAtTime(180, now + 0.14);
  oscillator.connect(gain);
  gain.connect(ctx.destination);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.025, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

  oscillator.start(now);
  oscillator.stop(now + 0.18);
}

function createNoiseBuffer(ctx, durationSeconds) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * durationSeconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * 0.45;
  }
  return buffer;
}

function playCombSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  if (now - lastCombSoundTime < 0.42) return;
  lastCombSoundTime = now;

  const source = ctx.createBufferSource();
  const bandpass = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  source.buffer = createNoiseBuffer(ctx, 0.28);
  bandpass.type = "bandpass";
  bandpass.frequency.setValueAtTime(2100, now);
  bandpass.Q.value = 0.9;

  source.connect(bandpass);
  bandpass.connect(gain);
  gain.connect(ctx.destination);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.02, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

  source.start(now);
  source.stop(now + 0.3);
}

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NoToneMapping;
renderer.outputEncoding = THREE.sRGBEncoding;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);
scene.fog = new THREE.FogExp2(0xffffff, 0.008);

const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 140);
camera.position.set(0, 0.5, 14);
camera.lookAt(0, -0.2, 0);

scene.add(new THREE.AmbientLight(0xffffff, 0.12));

const keyLight = new THREE.DirectionalLight(0xffffff, 0.72);
keyLight.position.set(22, 8, 4);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 80;
keyLight.shadow.camera.left = -16;
keyLight.shadow.camera.right = 16;
keyLight.shadow.camera.top = 16;
keyLight.shadow.camera.bottom = -16;
keyLight.shadow.bias = -0.00014;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xd0d8ff, 0.22);
fillLight.position.set(-12, 4, 8);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 0.12);
rimLight.position.set(4, -8, -14);
scene.add(rimLight);

const topLight = new THREE.DirectionalLight(0xffffff, 0.1);
topLight.position.set(0, 26, 2);
scene.add(topLight);

const bounceLight = new THREE.DirectionalLight(0xe8e8e8, 0.08);
bounceLight.position.set(-6, -10, 9);
scene.add(bounceLight);

const shadowGround = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.ShadowMaterial({ opacity: 0.14 })
);
shadowGround.rotation.x = -Math.PI / 2;
shadowGround.position.y = -2.7;
shadowGround.receiveShadow = true;
scene.add(shadowGround);

const specimenGroup = new THREE.Group();
specimenGroup.position.set(0, -1.15, 0);
scene.add(specimenGroup);

const vineGroup = new THREE.Group();
specimenGroup.add(vineGroup);

const stemMaterial = new THREE.MeshPhongMaterial({
  color: 0xc0c0c0,
  specular: 0x888888,
  shininess: 140,
});

const thornMaterial = new THREE.MeshPhongMaterial({
  color: 0xb0b0b0,
  specular: 0xaaaaaa,
  shininess: 260,
});

const leafMaterial = new THREE.MeshPhongMaterial({
  color: 0xb8b8b8,
  specular: 0x777777,
  shininess: 90,
  side: THREE.DoubleSide,
});

const crystalMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xb8d4f0,
  transparent: true,
  opacity: 0.88,
  transmission: 0.55,
  thickness: 0.75,
  roughness: 0.02,
  metalness: 0.04,
  ior: 2.38,
  clearcoat: 1,
  clearcoatRoughness: 0,
});

const crystalGlowMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  emissive: 0x6aa0ff,
  emissiveIntensity: 2,
  transparent: true,
  opacity: 0.98,
});

const thornGeometry = new THREE.ConeGeometry(1, 1.2, 10, 4, true);
const leafGeometry = (() => {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.26, 0.05, 0.3, 0.22, 0.22, 0.4);
  shape.bezierCurveTo(0.13, 0.56, 0, 0.66, 0, 0.66);
  shape.bezierCurveTo(-0.13, 0.56, -0.3, 0.4, -0.22, 0.22);
  shape.bezierCurveTo(-0.26, 0.05, 0, 0, 0, 0);
  const geometry = new THREE.ShapeGeometry(shape, 12);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const fold = Math.abs(x) * 0.18;
    const curl = (y / 0.66) * 0.08;
    pos.setZ(i, -fold + curl);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
})();

const vines = [];
const fallingSegments = [];
const flowTargets = new Set();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const CHALICE_TOP_Y = 0.78;
const ROOT_Y_OFFSET = CHALICE_TOP_Y + 2.16;

const LEVEL_CFG = {
  1: {
    camZ: 13.0,
    defs: [
      [0, 4.8, 2.8, 2.2, 1.5, 20, true],
      [90, 4.6, 3.0, 2.0, 1.4, 20, false],
      [180, 4.7, 2.9, 2.3, 1.5, 20, true],
      [270, 4.5, 3.0, 2.1, 1.4, 20, false],
      [80, 3.2, 5.2, 1.2, 2.4, 20, true],
      [60, 3.0, 5.8, 1.1, 2.6, 16, false],
      [260, 3.2, 5.2, 1.2, 2.4, 20, true],
      [240, 3.0, 5.8, 1.1, 2.6, 16, false],
    ],
  },
  2: {
    camZ: 14.5,
    defs: [
      [0, 5.0, 3.0, 2.2, 1.6, 24, true],
      [60, 4.8, 3.2, 2.0, 1.5, 24, false],
      [120, 5.0, 3.0, 2.3, 1.6, 24, true],
      [180, 4.8, 3.2, 2.1, 1.5, 24, false],
      [240, 5.0, 2.9, 2.2, 1.6, 24, true],
      [300, 4.8, 3.1, 2.0, 1.5, 24, false],
      [85, 3.4, 5.6, 1.3, 2.6, 28, true],
      [70, 3.2, 6.2, 1.1, 2.8, 24, true],
      [100, 3.5, 5.3, 1.4, 2.4, 24, false],
      [265, 3.4, 5.6, 1.3, 2.6, 28, true],
      [250, 3.2, 6.2, 1.1, 2.8, 24, true],
      [280, 3.5, 5.3, 1.4, 2.4, 24, false],
    ],
  },
  3: {
    camZ: 15.8,
    defs: [
      [0, 5.2, 3.0, 2.3, 1.7, 28, true],
      [45, 5.0, 3.2, 2.1, 1.6, 28, false],
      [90, 5.2, 3.1, 2.4, 1.7, 28, true],
      [135, 5.0, 3.2, 2.2, 1.6, 28, false],
      [180, 5.2, 3.0, 2.3, 1.7, 28, true],
      [225, 5.0, 3.2, 2.1, 1.6, 28, false],
      [270, 5.1, 3.1, 2.3, 1.7, 28, true],
      [315, 4.9, 3.2, 2.2, 1.6, 28, false],
      [80, 3.5, 6.0, 1.4, 2.8, 32, true],
      [65, 3.2, 6.8, 1.2, 3.1, 28, true],
      [95, 3.6, 5.5, 1.5, 2.6, 28, false],
      [50, 3.0, 5.2, 1.3, 2.4, 24, true],
      [260, 3.5, 6.0, 1.4, 2.8, 32, true],
      [245, 3.2, 6.8, 1.2, 3.1, 28, true],
      [275, 3.6, 5.5, 1.5, 2.6, 28, false],
      [230, 3.0, 5.2, 1.3, 2.4, 24, true],
    ],
  },
  4: {
    camZ: 17.2,
    defs: [
      [0, 5.4, 3.0, 2.4, 1.8, 32, true],
      [30, 5.2, 3.2, 2.2, 1.7, 28, false],
      [60, 5.4, 3.0, 2.5, 1.8, 32, true],
      [90, 5.2, 3.3, 2.3, 1.7, 28, false],
      [120, 5.4, 3.0, 2.4, 1.8, 32, true],
      [150, 5.2, 3.2, 2.2, 1.7, 28, false],
      [180, 5.4, 3.0, 2.4, 1.8, 32, true],
      [210, 5.2, 3.2, 2.2, 1.7, 28, false],
      [240, 5.4, 3.0, 2.5, 1.8, 32, true],
      [270, 5.2, 3.3, 2.3, 1.7, 28, false],
      [300, 5.4, 3.0, 2.4, 1.8, 32, true],
      [330, 5.2, 3.2, 2.2, 1.7, 28, false],
      [75, 3.4, 6.2, 1.3, 3.0, 36, true],
      [58, 3.1, 7.0, 1.1, 3.3, 32, true],
      [92, 3.6, 5.8, 1.5, 2.8, 36, false],
      [42, 2.9, 5.4, 1.2, 2.6, 28, true],
      [255, 3.4, 6.2, 1.3, 3.0, 36, true],
      [238, 3.1, 7.0, 1.1, 3.3, 32, true],
      [272, 3.6, 5.8, 1.5, 2.8, 36, false],
      [222, 2.9, 5.4, 1.2, 2.6, 28, true],
    ],
  },
};

function getSavedAnalysis() {
  try {
    return JSON.parse(window.localStorage.getItem("stressAnalysisResult") || "null");
  } catch {
    return null;
  }
}

function getStress() {
  const saved = getSavedAnalysis();
  const savedScore = Number(saved?.stressScore);
  if (Number.isFinite(savedScore)) {
    return Math.max(0, Math.min(100, Math.round(savedScore)));
  }
  return Number(slider?.value || 62);
}

function getStressLevel() {
  const stress = getStress();
  if (stress <= 25) return 1;
  if (stress <= 50) return 2;
  if (stress <= 75) return 3;
  return 4;
}

function syncStressValue() {
  if (labStressValue) {
    labStressValue.textContent = String(getStress());
  }
}

function resizeRenderer() {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(320, Math.floor(rect.width));
  const height = Math.max(420, Math.floor(rect.height));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function applyZoom() {
  const cfg = LEVEL_CFG[currentLevel] || LEVEL_CFG[1];
  camera.position.z = cfg.camZ / zoomLevel;
  camera.updateProjectionMatrix();
}

function updateZoom(nextZoom) {
  zoomLevel = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, nextZoom));
  applyZoom();
}

function setMouseNDC(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function createChalice() {
  const chalice = new THREE.Group();

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 0.92,
    transparent: true,
    opacity: 0.26,
    roughness: 0.04,
    metalness: 0,
    thickness: 0.18,
    ior: 1.45,
    side: THREE.DoubleSide,
  });

  const bowlWall = new THREE.Mesh(
    new THREE.CylinderGeometry(1.18, 1.34, 0.62, 56, 1, true),
    glassMat
  );
  bowlWall.position.y = 0.31;
  chalice.add(bowlWall);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.03, 14, 72), glassMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.62;
  chalice.add(rim);

  const bottomGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(1.08, 1.18, 0.06, 56),
    glassMat
  );
  bottomGlass.position.y = 0.03;
  chalice.add(bottomGlass);

  const metalCore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.96, 0.18, 56),
    stemMaterial.clone()
  );
  metalCore.position.y = 0.11;
  chalice.add(metalCore);

  return chalice;
}

function createStemKnot(y = 0.72) {
  const knot = new THREE.Group();

  for (let i = 0; i < 4; i += 1) {
    const loop = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.028, 12, 48),
      stemMaterial.clone()
    );
    loop.rotation.y = (i / 4) * Math.PI * 0.5;
    loop.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.24;
    loop.position.y = y + (i % 2) * 0.025;
    knot.add(loop);
  }

  for (let i = 0; i < 5; i += 1) {
    const strandCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.18 + i * 0.08, y + 0.05, -0.04),
      new THREE.Vector3(-0.1 + i * 0.05, y - 0.02, 0.03),
      new THREE.Vector3(0.02 + i * 0.03, y + 0.02, -0.02),
      new THREE.Vector3(0.12 + i * 0.01, y - 0.08, 0.04),
    ]);

    const strand = new THREE.Mesh(
      new THREE.TubeGeometry(strandCurve, 24, 0.018, 6, false),
      stemMaterial.clone()
    );
    knot.add(strand);
  }

  return knot;
}

specimenGroup.add(createChalice());
specimenGroup.add(createStemKnot());

function disposeObject3D(root) {
  root.traverse((child) => {
    if (!child.isMesh) return;
    child.geometry?.dispose();
    if (Array.isArray(child.material)) {
      child.material.forEach((material) => material?.dispose());
      return;
    }
    child.material?.dispose();
  });
}

function clearFallingSegments() {
  while (fallingSegments.length) {
    const seg = fallingSegments.pop();
    scene.remove(seg.grp);
  }
}

function clearVines() {
  flowTargets.clear();
  clearFallingSegments();
  while (vines.length) {
    const vine = vines.pop();
    vine.segs.forEach((seg) => {
      seg.grp.parent?.remove(seg.grp);
      disposeObject3D(seg.grp);
    });
  }
}

function updateCameraForLevel(level) {
  const cfg = LEVEL_CFG[level] || LEVEL_CFG[1];
  camera.position.set(0, 0.5, cfg.camZ / zoomLevel);
  camera.lookAt(0, -0.2, 0);
}

function buildInstructionMessage(prefix) {
  const toolMessage =
    currentPhase === "growing"
      ? "Specimen is still growing."
      : currentTool === "cut"
        ? "Cut: click a vine segment."
        : currentTool === "pluck"
          ? "Pluck: click a thorn."
          : "Comb: drag on vines to shape them.";

  const levelLabel = `Level ${String(currentLevel).padStart(2, "0")}`;
  const activeCount = vines.reduce(
    (count, vine) => count + vine.segs.filter((seg) => seg.alive).length,
    0
  );

  return `${prefix} | ${levelLabel} | ${toolMessage} | ${activeCount} active`;
}

function updateStatus(prefix) {
  if (!statusText) return;
  statusText.textContent = buildInstructionMessage(prefix);
}

function genPath([ang, elev, spread, loopF, loopA]) {
  const rad = (ang * Math.PI) / 180;
  const outX = Math.sin(rad);
  const outZ = Math.cos(rad);
  const pointCount = 26;
  const points = [];
  const phase = Math.random() * Math.PI * 2;
  const sign = Math.random() > 0.5 ? 1 : -1;

  for (let i = 0; i <= pointCount; i += 1) {
    const t = i / pointCount;
    const baseX = outX * spread * Math.pow(t, 0.88) * 0.62;
    const baseZ = outZ * spread * Math.pow(t, 0.88) * 0.62;
    const amp = loopA * (0.18 + t * 0.82);
    const primaryLoop = t * Math.PI * 2 * loopF + phase;
    const loopX = Math.sin(primaryLoop) * amp * sign;
    const loopY = Math.cos(primaryLoop) * amp * 0.68;
    const tangentLoop = t * Math.PI * 2 * loopF * 1.5 + phase + 1.1;
    const tanX = Math.sin(tangentLoop) * loopA * 0.16;
    const tanY = Math.cos(tangentLoop) * loopA * 0.11;
    const depthLoop = t * Math.PI * 2 * loopF * 0.68 + phase + 2.0;
    const depthZ = Math.cos(depthLoop) * loopA * 0.22;
    const height = elev * Math.pow(t, 0.76) + loopY + tanY;

    points.push(
      new THREE.Vector3(
        baseX + loopX + tanX + (Math.random() - 0.5) * 0.06,
        height - 1.95 + ROOT_Y_OFFSET + (Math.random() - 0.5) * 0.05,
        baseZ + depthZ + (Math.random() - 0.5) * 0.06
      )
    );
  }

  points[0].set(
    (Math.random() - 0.5) * 0.18,
    CHALICE_TOP_Y + Math.random() * 0.08,
    (Math.random() - 0.5) * 0.18
  );

  return new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.5);
}

function genSubPath(startPoint, startTangent, loopF, loopA) {
  const pointCount = 18;
  const points = [];
  const phase = Math.random() * Math.PI * 2;
  const sign = Math.random() > 0.5 ? 1 : -1;
  const up = new THREE.Vector3(0, 1, 0);
  let side = new THREE.Vector3().crossVectors(startTangent, up).normalize();
  if (side.lengthSq() < 0.01) side = new THREE.Vector3(1, 0, 0);
  const flip = Math.random() > 0.5 ? 1 : -1;
  const devX = side.x * flip * 0.8 + startTangent.x * 0.2;
  const devZ = side.z * flip * 0.8 + startTangent.z * 0.2;
  const subSpread = 2.8 + Math.random() * 1.4;
  const subLoopA = loopA * 0.55;
  const subElev = 2.0 + Math.random() * 1.5;

  for (let i = 0; i <= pointCount; i += 1) {
    const t = i / pointCount;
    const amp = subLoopA * (0.12 + t * 0.88);
    const primaryLoop = t * Math.PI * 2 * loopF * 0.8 + phase;
    const loopX = Math.sin(primaryLoop) * amp * sign;
    const loopY = Math.cos(primaryLoop) * amp * 0.6;
    const baseX = devX * subSpread * Math.pow(t, 0.88) * 0.62;
    const baseZ = devZ * subSpread * Math.pow(t, 0.88) * 0.62;
    const height = subElev * Math.pow(t, 0.76) + loopY;

    points.push(
      new THREE.Vector3(
        startPoint.x + baseX + loopX + (Math.random() - 0.5) * 0.05,
        startPoint.y + height + (Math.random() - 0.5) * 0.04,
        startPoint.z + baseZ + (Math.random() - 0.5) * 0.05
      )
    );
  }

  points[0].copy(startPoint);
  return new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.5);
}

function makeTaperedTubeGeometry(curve, tubularSegs, radialSegs, radiusStart, radiusEnd) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const frames = curve.computeFrenetFrames(tubularSegs, false);
  const vertex = new THREE.Vector3();
  const normal = new THREE.Vector3();

  for (let i = 0; i <= tubularSegs; i += 1) {
    const u = i / tubularSegs;
    const radius = radiusStart + (radiusEnd - radiusStart) * u;
    const point = curve.getPoint(u);
    const N = frames.normals[Math.min(i, frames.normals.length - 1)];
    const B = frames.binormals[Math.min(i, frames.binormals.length - 1)];

    for (let j = 0; j <= radialSegs; j += 1) {
      const v = (j / radialSegs) * Math.PI * 2;
      const sin = Math.sin(v);
      const cos = Math.cos(v);
      normal
        .set(cos * N.x + sin * B.x, cos * N.y + sin * B.y, cos * N.z + sin * B.z)
        .normalize();
      vertex.set(
        point.x + radius * normal.x,
        point.y + radius * normal.y,
        point.z + radius * normal.z
      );
      positions.push(vertex.x, vertex.y, vertex.z);
      normals.push(normal.x, normal.y, normal.z);
      uvs.push(i / tubularSegs, j / radialSegs);
    }
  }

  for (let i = 0; i < tubularSegs; i += 1) {
    for (let j = 0; j < radialSegs; j += 1) {
      const a = (radialSegs + 1) * i + j;
      const b = (radialSegs + 1) * (i + 1) + j;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

function addThorns(group, curve, vineRadius) {
  const frames = curve.computeFrenetFrames(24, false);
  const thorns = [];
  const count = 2 + Math.floor(Math.random() * 3);

  for (let i = 0; i < count; i += 1) {
    const t = (i + 0.1 + Math.random() * 0.8) / count;
    const frameIndex = Math.min(Math.floor(t * 23), 23);
    const point = curve.getPoint(t);
    const tangent = frames.tangents[frameIndex] || new THREE.Vector3(0, 1, 0);
    const normal = frames.normals[frameIndex] || new THREE.Vector3(1, 0, 0);
    const outward = normal
      .clone()
      .applyAxisAngle(tangent, Math.random() * Math.PI * 2)
      .normalize();
    const len = 0.065 + Math.random() * 0.07;
    const radius = 0.024 + Math.random() * 0.011;
    const thorn = new THREE.Mesh(thornGeometry, thornMaterial.clone());
    thorn.scale.set(radius, len, radius);
    thorn.position.copy(point).addScaledVector(outward, vineRadius + len * 0.52);
    thorn.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), outward);
    thorn.userData.isThorn = true;
    thorn.userData.removed = false;
    group.add(thorn);
    thorns.push({ mesh: thorn, t });
  }

  return thorns;
}

function addLeaves(group, curve, segmentIndex, segmentCount) {
  const maxLeaves = segmentIndex < segmentCount * 0.55 ? 1 : 0;
  const count = Math.floor(Math.random() * (maxLeaves + 1.75));
  const leaves = [];

  for (let i = 0; i < count; i += 1) {
    const t = 0.12 + (i / Math.max(count, 1)) * 0.76 + Math.random() * 0.08;
    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    let side = new THREE.Vector3().crossVectors(tangent, up).normalize();
    if (side.lengthSq() < 0.01) side = new THREE.Vector3(1, 0, 0);
    const dir = side.multiplyScalar(Math.random() > 0.5 ? 1 : -1).clone();
    dir.y += 0.62 + Math.random() * 0.52;
    dir.normalize();

    const leaf = new THREE.Mesh(leafGeometry, leafMaterial.clone());
    const scaleX = (0.58 + Math.random() * 0.52) * 0.8;
    const scaleY = (0.5 + Math.random() * 0.42) * 0.8;
    leaf.scale.set(scaleX, scaleY, scaleX);
    leaf.position.copy(point).addScaledVector(dir, 0.068);
    leaf.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const roll = new THREE.Quaternion().setFromAxisAngle(dir, Math.random() * Math.PI * 2);
    leaf.quaternion.premultiply(roll);
    group.add(leaf);
    leaves.push({ mesh: leaf, t });
  }

  return leaves;
}

function makeCrystalFlower(scale) {
  const flower = new THREE.Group();
  const spikeCount = 32;
  const spikeRadius = 0.028;

  for (let i = 0; i < spikeCount; i += 1) {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / spikeCount);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const dir = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.sin(phi) * Math.sin(theta),
      Math.cos(phi)
    );
    const spike = new THREE.Mesh(thornGeometry, crystalMaterial.clone());
    spike.scale.set(spikeRadius, scale, spikeRadius);
    spike.position.copy(dir).multiplyScalar(scale * 0.58);
    spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    flower.add(spike);

    if (i % 3 === 0) {
      const axis = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize();
      const dir2 = dir.clone().applyAxisAngle(axis, 0.56).normalize();
      const secondary = new THREE.Mesh(thornGeometry, crystalMaterial.clone());
      secondary.scale.set(spikeRadius * 0.62, scale * 0.55, spikeRadius * 0.62);
      secondary.position.copy(dir2).multiplyScalar(scale * 0.4);
      secondary.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir2);
      flower.add(secondary);
    }
  }

  flower.add(new THREE.Mesh(new THREE.SphereGeometry(0.105, 14, 14), crystalMaterial.clone()));
  flower.add(new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), crystalGlowMaterial.clone()));
  flower.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(scale * 0.85, 18, 18),
      new THREE.MeshBasicMaterial({
        color: 0x8ab0e0,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
      })
    )
  );

  return flower;
}

function buildSegment(fullCurve, segmentIndex, segmentCount, addFlower) {
  const startT = segmentIndex / segmentCount;
  const endT = (segmentIndex + 1) / segmentCount;
  const sampleCount = 20;
  const tubularSegments = 18;
  const radialSegments = 9;
  const points = [];

  for (let i = 0; i <= sampleCount; i += 1) {
    points.push(fullCurve.getPoint(startT + ((endT - startT) * i) / sampleCount));
  }

  const subCurve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.5);
  const taperBase = Math.pow(1 - segmentIndex / segmentCount, 0.62);
  const taperTip = Math.pow(1 - (segmentIndex + 1) / segmentCount, 0.62);
  const radiusBase = 0.11 * taperBase + 0.032;
  const radiusTip = 0.11 * taperTip + 0.032;
  const tubeGeometry = makeTaperedTubeGeometry(
    subCurve,
    tubularSegments,
    radialSegments,
    radiusBase,
    radiusTip
  );
  const totalIndexCount = tubeGeometry.index.count;
  tubeGeometry.setDrawRange(0, 0);

  const tube = new THREE.Mesh(tubeGeometry, stemMaterial.clone());
  tube.castShadow = true;

  const group = new THREE.Group();
  group.visible = false;
  group.add(tube);

  let capMesh = null;
  if (segmentIndex === segmentCount - 1 && !addFlower) {
    capMesh = new THREE.Mesh(
      new THREE.SphereGeometry(radiusTip, 9, 9, 0, Math.PI * 2, 0, Math.PI / 2),
      stemMaterial.clone()
    );
    const tipPoint = subCurve.getPoint(1);
    const tipTangent = subCurve.getTangent(1).normalize();
    capMesh.position.copy(tipPoint);
    capMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tipTangent);
    capMesh.visible = false;
    group.add(capMesh);
  }

  const thorns = addThorns(group, subCurve, radiusBase);
  const leaves = segmentIndex >= segmentCount * 0.14 ? addLeaves(group, subCurve, segmentIndex, segmentCount) : [];

  let flower = null;
  let flowerScale = 0;
  if (addFlower) {
    flowerScale = 0.6 + taperBase * 0.28;
    flower = makeCrystalFlower(flowerScale);
    flower.position.copy(fullCurve.getPoint(1));
    flower.scale.setScalar(0.001);
    group.add(flower);
  }

  tube.userData.segment = true;

  vineGroup.add(group);

  return {
    grp: group,
    tube,
    tubeGeometry,
    totalIndexCount,
    tubularSegments,
    radialSegments,
    indicesPerSection: radialSegments * 6,
    capMesh,
    thorns,
    leaves,
    flower,
    flowerScale,
    cutProgress: 1,
    alive: true,
    grown: false,
    growStart: 0,
    growDur: 0.5,
    velocity: new THREE.Vector3(),
    angVel: new THREE.Vector3(),
    basePos: group.position.clone(),
    flowVel: new THREE.Vector3(),
  };
}

function getSegmentDrawCount(seg, progress) {
  const clamped = Math.max(0.02, Math.min(1, progress));
  const visibleSections = Math.max(1, Math.ceil(clamped * seg.tubularSegments));
  return Math.min(seg.totalIndexCount, visibleSections * seg.indicesPerSection);
}

function applySegmentVisibility(seg, progress) {
  const clamped = Math.max(0.02, Math.min(1, progress));
  seg.cutProgress = clamped;
  seg.tubeGeometry.setDrawRange(0, getSegmentDrawCount(seg, clamped));

  seg.thorns.forEach(({ mesh, t }) => {
    mesh.visible = !mesh.userData.removed && t <= clamped;
  });

  seg.leaves.forEach(({ mesh, t }) => {
    mesh.visible = t <= clamped;
  });

  if (seg.capMesh) {
    seg.capMesh.visible = seg.grown && clamped >= 0.999;
  }

  if (seg.flower) {
    const flowerScale = clamped >= 0.999 && seg.grown ? seg.flowerScale : 0.001;
    seg.flower.scale.setScalar(Math.max(0.001, flowerScale));
  }
}

function buildAll() {
  clearVines();
  history = [];
  currentPhase = "growing";
  growStart = performance.now() * 0.001;
  targetRY = 0;
  targetRX = 0;
  currentRY = 0;
  currentRX = 0;
  specimenGroup.rotation.set(0, 0, 0);

  currentLevel = getStressLevel();
  syncStressValue();
  updateCameraForLevel(currentLevel);

  const cfg = LEVEL_CFG[currentLevel];
  cfg.defs.forEach((def, vineIndex) => {
    const curve = genPath(def);
    const segmentCount = def[5];
    const hasFlower = def[6];
    const segs = [];

    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
      const seg = buildSegment(curve, segmentIndex, segmentCount, hasFlower && segmentIndex === segmentCount - 1);
      seg.growStart = vineIndex * 0.058 + segmentIndex * 0.13 + Math.random() * 0.018;
      seg.growDur = 0.18 + Math.random() * 0.09;
      seg.tube.userData.vineIdx = vineIndex;
      seg.tube.userData.segIdx = segmentIndex;
      seg.tube.userData.totalSegs = segmentCount;
      segs.push(seg);
    }

    vines.push({ segs, vid: vineIndex });

    if (Math.random() < 0.2) {
      const branchT = 0.35 + Math.random() * 0.3;
      const branchPoint = curve.getPoint(branchT);
      const branchTangent = curve.getTangent(branchT).normalize();
      const subCurve = genSubPath(branchPoint, branchTangent, def[3], def[4]);
      const subSegmentCount = Math.max(5, Math.floor(segmentCount * 0.6));
      const parentSegmentIndex = Math.floor(branchT * segmentCount);
      const branchStartTime = vineIndex * 0.058 + parentSegmentIndex * 0.27 + 0.15;
      const subVineIndex = vines.length;
      const subSegs = [];

      for (let segmentIndex = 0; segmentIndex < subSegmentCount; segmentIndex += 1) {
        const seg = buildSegment(subCurve, segmentIndex, subSegmentCount, false);
        seg.growStart = branchStartTime + segmentIndex * 0.11 + Math.random() * 0.02;
        seg.growDur = 0.16 + Math.random() * 0.08;
        seg.tube.userData.vineIdx = subVineIndex;
        seg.tube.userData.segIdx = segmentIndex;
        seg.tube.userData.totalSegs = subSegmentCount;
        subSegs.push(seg);
      }

      vines.push({ segs: subSegs, vid: subVineIndex });
    }
  });

  updateStatus("Growing specimen");
}

function collectAliveTubes() {
  const tubes = [];
  vines.forEach((vine) => {
    vine.segs.forEach((seg) => {
      if (seg.alive && seg.grown) tubes.push(seg.tube);
    });
  });
  return tubes;
}

function applyCombFlow(clientX, clientY, deltaX, deltaY) {
  if (currentPhase !== "interactive") return;
  setMouseNDC(clientX, clientY);
  raycaster.setFromCamera(mouse, camera);

  const hits = raycaster.intersectObjects(collectAliveTubes(), false);
  if (!hits.length) return;
  playCombSound();

  const hitTube = hits[0].object;
  const hitVineIndex = hitTube.userData.vineIdx;
  const hitSegmentIndex = hitTube.userData.segIdx;
  const totalSegs = hitTube.userData.totalSegs || 1;
  const centerT = hitSegmentIndex / totalSegs;

  const worldQuat = new THREE.Quaternion();
  vineGroup.getWorldQuaternion(worldQuat);

  const impulse = new THREE.Vector3(deltaX * 0.0048, -deltaY * 0.0036, deltaX * 0.0022).applyQuaternion(worldQuat);

  vines.forEach((vine, vineIndex) => {
    const vineDistance = Math.abs(vineIndex - hitVineIndex);
    if (vineDistance > 3) return;

    const vineFalloff = Math.max(0, 1 - vineDistance * 0.45);
    vine.segs.forEach((seg, segmentIndex) => {
      if (!seg.alive || !seg.grown) return;

      const segmentT = segmentIndex / Math.max(1, vine.segs.length);
      const falloff = Math.max(0, 1 - Math.abs(segmentT - centerT) / 0.3) * vineFalloff;
      if (falloff <= 0) return;

      seg.flowVel.add(impulse.clone().multiplyScalar(falloff));
      flowTargets.add(seg);
    });
  });
}

function updateCombFlow() {
  flowTargets.forEach((seg) => {
    if (!seg.alive || !seg.grown) {
      seg.grp.position.copy(seg.basePos);
      seg.flowVel.set(0, 0, 0);
      flowTargets.delete(seg);
      return;
    }

    seg.grp.position.add(seg.flowVel);
    seg.flowVel.multiplyScalar(0.86);
    seg.grp.position.lerp(seg.basePos, 0.12);

    if (seg.flowVel.lengthSq() < 0.00001 && seg.grp.position.distanceToSquared(seg.basePos) < 0.00001) {
      seg.grp.position.copy(seg.basePos);
      seg.flowVel.set(0, 0, 0);
      flowTargets.delete(seg);
    }
  });
}

function handlePluck(clientX, clientY) {
  if (currentPhase !== "interactive") return;
  setMouseNDC(clientX, clientY);
  raycaster.setFromCamera(mouse, camera);

  const thorns = [];
  vines.forEach((vine) => {
    vine.segs.forEach((seg) => {
      if (!seg.alive || !seg.grown) return;
      seg.thorns.forEach(({ mesh }) => {
        if (!mesh.userData.removed && mesh.visible) thorns.push(mesh);
      });
    });
  });

  const hits = raycaster.intersectObjects(thorns, false);
  if (!hits.length) {
    updateStatus("No thorn selected");
    return;
  }

  const thorn = hits[0].object;
  thorn.userData.removed = true;
  thorn.visible = false;
  history.push({ type: "pluck", thorn });
  playPickSound();
  updateStatus("Thorn removed");
}

function handleCut(clientX, clientY) {
  if (currentPhase !== "interactive") return;
  setMouseNDC(clientX, clientY);
  raycaster.setFromCamera(mouse, camera);

  const hits = raycaster.intersectObjects(collectAliveTubes(), false);
  if (!hits.length) {
    updateStatus("No vine selected");
    return;
  }

  const hitTube = hits[0].object;
  const hitPoint = hits[0].point.clone();
  const vine = vines[hitTube.userData.vineIdx];
  const startSegmentIndex = hitTube.userData.segIdx;
  if (!vine) return;

  const action = { type: "cut", segments: [], clickedSegment: null };
  const clickedSegment = vine.segs[startSegmentIndex];
  if (!clickedSegment?.alive) return;

  const hitProgress = Math.max(0.04, Math.min(0.98, hits[0].uv?.x ?? 0.5));
  action.clickedSegment = {
    seg: clickedSegment,
    cutProgress: clickedSegment.cutProgress,
  };
  applySegmentVisibility(clickedSegment, hitProgress);

  for (let i = startSegmentIndex + 1; i < vine.segs.length; i += 1) {
    const seg = vine.segs[i];
    if (!seg.alive) continue;

    const localPos = seg.grp.position.clone();
    const localQuat = seg.grp.quaternion.clone();
    const localScale = seg.grp.scale.clone();
    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    const worldScale = new THREE.Vector3();
    seg.grp.updateMatrixWorld(true);
    seg.grp.matrixWorld.decompose(worldPos, worldQuat, worldScale);

    action.segments.push({ seg, localPos, localQuat, localScale });

    seg.alive = false;
    flowTargets.delete(seg);
    vineGroup.remove(seg.grp);
    scene.add(seg.grp);
    seg.grp.position.copy(worldPos);
    seg.grp.quaternion.copy(worldQuat);
    seg.grp.scale.copy(worldScale);

    const distance = (i - startSegmentIndex) * 0.25;
    seg.velocity.set(
      (Math.random() - 0.5) * 1.6,
      0.4 - distance * 0.3 + Math.random() * 0.3,
      (Math.random() - 0.5) * 1.6
    );
    seg.velocity.multiplyScalar(1.1 + distance * 0.3);
    seg.angVel.set(
      (Math.random() - 0.5) * 2.2,
      (Math.random() - 0.5) * 1.6,
      (Math.random() - 0.5) * 2.2
    );
    fallingSegments.push(seg);
  }

  if (!action.segments.length && !action.clickedSegment) return;

  history.push(action);
  playScissorsSound();
  updateStatus(`Vine clipped at ${Math.round(hitPoint.y * 10) / 10}`);
}

function performClickAction(clientX, clientY) {
  if (currentTool === "cut") handleCut(clientX, clientY);
  if (currentTool === "pluck") handlePluck(clientX, clientY);
}

function undoLastAction() {
  const action = history.pop();
  if (!action) {
    updateStatus("Nothing to undo");
    return;
  }

  if (action.type === "pluck") {
    action.thorn.userData.removed = false;
    action.thorn.visible = true;
    updateStatus("Thorn restored");
    return;
  }

  if (action.type === "cut") {
    if (action.clickedSegment) {
      applySegmentVisibility(action.clickedSegment.seg, action.clickedSegment.cutProgress);
    }

    action.segments.forEach(({ seg, localPos, localQuat, localScale }) => {
      const fallingIndex = fallingSegments.indexOf(seg);
      if (fallingIndex >= 0) {
        fallingSegments.splice(fallingIndex, 1);
      }
      scene.remove(seg.grp);
      vineGroup.add(seg.grp);
      seg.grp.position.copy(localPos);
      seg.grp.quaternion.copy(localQuat);
      seg.grp.scale.copy(localScale);
      seg.velocity.set(0, 0, 0);
      seg.angVel.set(0, 0, 0);
      seg.flowVel.set(0, 0, 0);
      seg.alive = true;
      seg.grp.visible = true;
    });
    updateStatus("Cut restored");
  }
}

function resetView() {
  targetRY = 0;
  targetRX = 0;
  updateStatus("View reset");
}

function saveSpecimen() {
  renderer.render(scene, camera);
  const link = document.createElement("a");
  link.download = `stress-gardening-flat-${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
  updateStatus("Specimen saved");
}

function updateGrowth(elapsed) {
  let complete = true;

  vines.forEach((vine) => {
    vine.segs.forEach((seg) => {
      if (!seg.alive) return;

      const t = (elapsed - seg.growStart) / seg.growDur;
      if (t <= 0) {
        complete = false;
        return;
      }

      seg.grp.visible = true;
      const progress = Math.min(1, t);
      seg.tubeGeometry.setDrawRange(0, getSegmentDrawCount(seg, Math.min(progress, seg.cutProgress)));

      if (progress < 1) {
        complete = false;
      }

      if (seg.capMesh) {
        seg.capMesh.visible = progress >= 1 && seg.cutProgress >= 0.999;
      }

      if (seg.flower) {
        const flowerProgress = Math.max(0, (progress - 0.74) / 0.26);
        const flowerScale = seg.cutProgress >= 0.999 ? flowerProgress * seg.flowerScale : 0.001;
        seg.flower.scale.setScalar(Math.max(0.001, flowerScale));
      }

      if (progress >= 1) {
        seg.grown = true;
        applySegmentVisibility(seg, seg.cutProgress);
      }
    });
  });

  return complete;
}

function updatePhysics(deltaSeconds) {
  for (let i = fallingSegments.length - 1; i >= 0; i -= 1) {
    const seg = fallingSegments[i];
    seg.velocity.y -= 28 * deltaSeconds;
    seg.velocity.multiplyScalar(0.988);
    seg.angVel.multiplyScalar(0.972);
    seg.grp.position.addScaledVector(seg.velocity, deltaSeconds);
    seg.grp.rotateX(seg.angVel.x * deltaSeconds);
    seg.grp.rotateY(seg.angVel.y * deltaSeconds);
    seg.grp.rotateZ(seg.angVel.z * deltaSeconds);

    if (seg.grp.position.y < -26) {
      scene.remove(seg.grp);
      fallingSegments.splice(i, 1);
    }
  }
}

toolButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentTool = button.dataset.tool;
    toolButtons.forEach((item) => item.classList.toggle("active", item === button));
    updateStatus("Tool switched");
  });
});

zoomInButton?.addEventListener("click", () => {
  updateZoom(zoomLevel + ZOOM_STEP);
});

zoomOutButton?.addEventListener("click", () => {
  updateZoom(zoomLevel - ZOOM_STEP);
});

canvas.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    const direction = event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
    updateZoom(zoomLevel + direction);
  },
  { passive: false }
);

canvas.addEventListener("mousedown", (event) => {
  getAudioContext();
  isPointerDown = true;
  isDragged = false;
  dragPX = event.clientX;
  dragPY = event.clientY;
});

window.addEventListener("mousemove", (event) => {
  if (!isPointerDown) return;

  const dx = event.clientX - dragPX;
  const dy = event.clientY - dragPY;
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragged = true;

  if (currentPhase === "interactive" && currentTool === "comb") {
    applyCombFlow(event.clientX, event.clientY, dx, dy);
  } else {
    targetRY += dx * 0.007;
    targetRX += dy * 0.004;
    targetRX = Math.max(-0.65, Math.min(0.65, targetRX));
  }

  dragPX = event.clientX;
  dragPY = event.clientY;
});

window.addEventListener("mouseup", (event) => {
  if (!isDragged) {
    performClickAction(event.clientX, event.clientY);
  }
  isPointerDown = false;
  isDragged = false;
});

canvas.addEventListener(
  "touchstart",
  (event) => {
    getAudioContext();
    const touch = event.touches[0];
    isPointerDown = true;
    isDragged = false;
    dragPX = touch.clientX;
    dragPY = touch.clientY;
    event.preventDefault();
  },
  { passive: false }
);

canvas.addEventListener(
  "touchmove",
  (event) => {
    if (!isPointerDown) return;
    const touch = event.touches[0];
    const dx = touch.clientX - dragPX;
    const dy = touch.clientY - dragPY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) isDragged = true;

    if (currentPhase === "interactive" && currentTool === "comb") {
      applyCombFlow(touch.clientX, touch.clientY, dx, dy);
    } else {
      targetRY += dx * 0.007;
      targetRX += dy * 0.004;
      targetRX = Math.max(-0.65, Math.min(0.65, targetRX));
    }

    dragPX = touch.clientX;
    dragPY = touch.clientY;
    event.preventDefault();
  },
  { passive: false }
);

canvas.addEventListener("touchend", (event) => {
  if (!isDragged && event.changedTouches.length) {
    const touch = event.changedTouches[0];
    performClickAction(touch.clientX, touch.clientY);
  }
  isPointerDown = false;
  isDragged = false;
});

slider?.addEventListener("input", () => {
  syncStressValue();
  buildAll();
});
regrowButton?.addEventListener("click", buildAll);
undoButton?.addEventListener("click", undoLastAction);
resetViewButton?.addEventListener("click", resetView);
saveButton?.addEventListener("click", saveSpecimen);
window.addEventListener("stress-analysis-updated", buildAll);
window.addEventListener("resize", resizeRenderer);
window.addEventListener("pointerdown", () => getAudioContext(), { once: true });

window.addEventListener("keydown", (event) => {
  if (event.key === "r" || event.key === "R") buildAll();
});

let lastFrameTime = performance.now() * 0.001;

function animate(nowMs) {
  requestAnimationFrame(animate);

  const now = nowMs * 0.001;
  const delta = Math.min(0.05, now - lastFrameTime);
  lastFrameTime = now;

  currentRY += (targetRY - currentRY) * 0.08;
  currentRX += (targetRX - currentRX) * 0.08;
  specimenGroup.rotation.y = currentRY;
  specimenGroup.rotation.x = currentRX;

  const elapsed = now - growStart;
  if (currentPhase === "growing") {
    const finished = updateGrowth(elapsed);
    if (finished) {
      currentPhase = "interactive";
      updateStatus("Specimen ready");
    }
  } else {
    updateCombFlow();
  }

  updatePhysics(delta);
  renderer.render(scene, camera);
}

resizeRenderer();
syncStressValue();
buildAll();
requestAnimationFrame(animate);
