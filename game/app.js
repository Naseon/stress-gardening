/* ═══════════════════════════════════════════
   STRESS GARDENING — Three.js Vine Engine
   config.js + render.js 이후 로드
   ═══════════════════════════════════════════ */

/* ── DOM refs ── */
const canvas          = document.querySelector('#thornCanvas');
const slider          = document.querySelector('#stressSlider');
const statusText      = document.querySelector('#statusText');
const toolButtons     = document.querySelectorAll('.tool-button[data-tool]');
const undoButton      = document.querySelector('#undoButton');
const resetViewButton = document.querySelector('#resetViewButton');
const regrowButton    = document.querySelector('#regrowButton');
const saveButton      = document.querySelector('#saveButton');

/* ── State ── */
let currentTool = 'comb';
let history     = [];
let autoTimer   = 0;
const MAX_STEMS = 55;

/* ═══════════════════════════════════════════
   THREE.JS SETUP
   ═══════════════════════════════════════════ */

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,                  /* CSS 타일 배경이 비치도록 투명 */
  preserveDrawingBuffer: true,  /* Save 기능용 */
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
scene.background = null; /* CSS 배경 사용 */

const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
camera.position.set(0, 4.5, 13);
camera.lookAt(0, 2.0, 0);

/* ── 조명: 스튜디오 소프트박스 4방향 ── */
scene.add(new THREE.AmbientLight(0xffffff, 2.8));

const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
keyLight.position.set(-4, 12, 6);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xfff4f0, 1.8);
fillLight.position.set(6, 4, -4);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 1.2);
rimLight.position.set(0, -2, -8);
scene.add(rimLight);

const groundBounce = new THREE.DirectionalLight(0xfafaf8, 0.7);
groundBounce.position.set(0, -8, 2);
scene.add(groundBounce);

/* ── 재질 ── */

/* 건메탈 다크 스틸 — 레퍼런스 이미지와 동일한 어두운 금속 줄기 */
const stemMat = new THREE.MeshStandardMaterial({
  color:     0x3c3a38,
  metalness: 0.85,
  roughness: 0.30,
});

/* 잎: 줄기보다 더 어두운 건메탈 */
const leafMat = new THREE.MeshStandardMaterial({
  color:     0x2e2c2a,
  metalness: 0.80,
  roughness: 0.40,
  side: THREE.DoubleSide,
});

/* 크리스탈: 완전 투명 고반사 */
const crystalMat = new THREE.MeshPhongMaterial({
  color:       0xffffff,
  specular:    0xffffff,
  shininess:   500,
  transparent: true,
  opacity:     0.72,
  side: THREE.DoubleSide,
});

/* 발광 흰색 (수술, 꽃심) */
const brightMat = new THREE.MeshPhongMaterial({
  color:    0xffffff,
  specular: 0xffffff,
  shininess: 600,
});

/* ── 씬 그룹 (궤도 회전용) ── */
const group = new THREE.Group();
scene.add(group);

/* ── 유리 원통 컨테이너 (레퍼런스 이미지3 페트리 베이스) ── */
const CYLL_H = 1.1, CYLL_R = 1.4;

const glassCylMat = new THREE.MeshPhongMaterial({
  color: 0xeaf0f4, specular: 0xffffff, shininess: 260,
  transparent: true, opacity: 0.20, side: THREE.DoubleSide,
});

/* 원통 벽면 */
const glassWall = new THREE.Mesh(
  new THREE.CylinderGeometry(CYLL_R, CYLL_R, CYLL_H, 64, 1, true),
  glassCylMat
);
glassWall.position.y = -(CYLL_H / 2);
group.add(glassWall);

/* 바닥 원판 */
const glassFloor = new THREE.Mesh(
  new THREE.CircleGeometry(CYLL_R, 64),
  glassCylMat
);
glassFloor.rotation.x = -Math.PI / 2;
glassFloor.position.y = -CYLL_H;
group.add(glassFloor);

/* 상단 두꺼운 유리 테두리 링 */
const glassRim = new THREE.Mesh(
  new THREE.TorusGeometry(CYLL_R, 0.042, 12, 64),
  new THREE.MeshPhongMaterial({
    color: 0xd0d8dc, specular: 0xffffff, shininess: 300,
    transparent: true, opacity: 0.50,
  })
);
glassRim.position.y = 0.01;
group.add(glassRim);

/* ═══════════════════════════════════════════
   꽃 생성 함수
   ═══════════════════════════════════════════ */

/* 크리스탈 로즈 버드 — 레퍼런스 이미지2 스타일 */
function makeBudFlower() {
  const fg = new THREE.Group();

  /* 중앙 원추형 크리스탈 포인트 */
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.13, 8), brightMat.clone());
  tip.position.y = 0.16;
  fg.add(tip);

  /* 외곽 5장 꽃잎 (살짝 열린) */
  for (let i = 0; i < 5; i++) {
    const phi = (i / 5) * Math.PI * 2;
    const ps  = new THREE.Shape();
    ps.moveTo(0, 0);
    ps.bezierCurveTo(-0.048, 0.09, -0.038, 0.27, 0, 0.34);
    ps.bezierCurveTo( 0.038, 0.27,  0.048, 0.09, 0, 0);
    const petal = new THREE.Mesh(
      new THREE.ExtrudeGeometry(ps, {
        depth: 0.013, bevelEnabled: true,
        bevelSize: 0.007, bevelThickness: 0.007, bevelSegments: 2,
      }),
      crystalMat.clone()
    );
    const d = new THREE.Vector3(Math.cos(phi), 0.78, Math.sin(phi)).normalize();
    petal.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
    petal.position.copy(d).multiplyScalar(0.055);
    fg.add(petal);
  }

  /* 내측 5장 작은 꽃잎 */
  for (let i = 0; i < 5; i++) {
    const phi = ((i + 0.5) / 5) * Math.PI * 2;
    const ps  = new THREE.Shape();
    ps.moveTo(0, 0);
    ps.bezierCurveTo(-0.028, 0.06, -0.022, 0.18, 0, 0.22);
    ps.bezierCurveTo( 0.022, 0.18,  0.028, 0.06, 0, 0);
    const petal = new THREE.Mesh(
      new THREE.ExtrudeGeometry(ps, {
        depth: 0.008, bevelEnabled: true,
        bevelSize: 0.005, bevelThickness: 0.005, bevelSegments: 2,
      }),
      crystalMat.clone()
    );
    const d = new THREE.Vector3(Math.cos(phi), 1.15, Math.sin(phi)).normalize();
    petal.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
    petal.position.copy(d).multiplyScalar(0.035);
    fg.add(petal);
  }

  /* 중앙 발광 구체 */
  fg.add(new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 12), brightMat.clone()));
  return fg;
}

/* 대형 컷 크리스탈 꽃 — 레퍼런스 이미지1·4 스와로브스키 스타일 */
function makeCrystalFlower() {
  const fg = new THREE.Group();

  /* 외곽 8장 큰 꽃잎 (거의 수평으로 열린) */
  for (let i = 0; i < 8; i++) {
    const phi = (i / 8) * Math.PI * 2;
    const ps  = new THREE.Shape();
    ps.moveTo(0, 0);
    ps.bezierCurveTo(-0.082, 0.28, -0.066, 0.60, 0, 0.78);
    ps.bezierCurveTo( 0.066, 0.60,  0.082, 0.28, 0, 0);
    const petal = new THREE.Mesh(
      new THREE.ExtrudeGeometry(ps, {
        depth: 0.028, bevelEnabled: true,
        bevelSize: 0.014, bevelThickness: 0.014, bevelSegments: 4,
      }),
      crystalMat.clone()
    );
    const theta = 1.18; /* 수직에서 ~68° → 거의 수평 */
    const dir = new THREE.Vector3(
      Math.sin(theta) * Math.cos(phi),
      Math.cos(theta),
      Math.sin(theta) * Math.sin(phi)
    ).normalize();
    petal.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    petal.position.copy(dir).multiplyScalar(0.065);
    fg.add(petal);
  }

  /* 내측 8장 중간 꽃잎 */
  for (let i = 0; i < 8; i++) {
    const phi = ((i + 0.5) / 8) * Math.PI * 2;
    const ps  = new THREE.Shape();
    ps.moveTo(0, 0);
    ps.bezierCurveTo(-0.056, 0.20, -0.044, 0.44, 0, 0.56);
    ps.bezierCurveTo( 0.044, 0.44,  0.056, 0.20, 0, 0);
    const petal = new THREE.Mesh(
      new THREE.ExtrudeGeometry(ps, {
        depth: 0.018, bevelEnabled: true,
        bevelSize: 0.010, bevelThickness: 0.010, bevelSegments: 3,
      }),
      crystalMat.clone()
    );
    const theta = 0.85;
    const dir = new THREE.Vector3(
      Math.sin(theta) * Math.cos(phi),
      Math.cos(theta),
      Math.sin(theta) * Math.sin(phi)
    ).normalize();
    petal.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    petal.position.copy(dir).multiplyScalar(0.042);
    fg.add(petal);
  }

  /* 수술 14개: 크리스탈 로드 + 구체 끝 */
  for (let i = 0; i < 14; i++) {
    const phi = (i / 14) * Math.PI * 2;
    const r   = 0.038 + (i % 3) * 0.016;
    const h   = 0.13  + (i % 4) * 0.025;

    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0038, 0.0038, h, 5),
      brightMat.clone()
    );
    rod.position.set(Math.cos(phi) * r, h / 2, Math.sin(phi) * r);
    fg.add(rod);

    const tipSph = new THREE.Mesh(
      new THREE.SphereGeometry(0.013, 8, 8),
      brightMat.clone()
    );
    tipSph.position.set(Math.cos(phi) * r, h, Math.sin(phi) * r);
    fg.add(tipSph);
  }

  /* 중앙 발광 핵 */
  fg.add(new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 16, 16),
    new THREE.MeshPhongMaterial({
      color: 0xffffff, specular: 0xffffff, shininess: 700,
      transparent: true, opacity: 0.95,
    })
  ));

  return fg;
}

/* ═══════════════════════════════════════════
   줄기 생성
   ═══════════════════════════════════════════ */
const stems = [];

function rnd(a, b) { return a + Math.random() * (b - a); }

function spawnStem(sx, sy, sz, {
  vxInit     = null,
  vzInit     = null,
  numSegs    = null,
  tubeRadius = null,
  stepY      = null,
  driftMul   = 1.0,
  flowerType = 'bud',
} = {}) {
  const stress = Number(slider?.value ?? 62);

  /* 곡선 경로 */
  const points = [];
  let cx = sx, cy = sy + 0.02, cz = sz;
  let vx = vxInit ?? rnd(-0.9, 0.9);
  let vz = vzInit ?? rnd(-0.9, 0.9);
  const segCount = numSegs ?? (14 + Math.floor(stress * 0.04));

  points.push(new THREE.Vector3(cx, cy, cz));
  for (let i = 1; i <= segCount; i++) {
    vx += rnd(-0.28, 0.28) * driftMul;
    vz += rnd(-0.28, 0.28) * driftMul;
    vx *= 0.76;
    vz *= 0.76;
    cx += vx * 0.72 * driftMul;
    cy += stepY ?? (0.14 + Math.random() * 0.05);
    cz += vz * 0.72 * driftMul;
    points.push(new THREE.Vector3(cx, cy, cz));
  }

  const curve = new THREE.CatmullRomCurve3(points);
  const tubeR = tubeRadius ?? (0.038 + stress * 0.00028);
  const geo   = new THREE.TubeGeometry(curve, 64, tubeR, 8, false);
  geo.setDrawRange(0, 0);
  const mesh = new THREE.Mesh(geo, stemMat.clone());
  group.add(mesh);

  /* 가시 */
  const thornMeshes = [];
  const thornCount  = 8 + Math.floor(stress * 0.07);
  for (let i = 0; i < thornCount; i++) {
    const t    = (i + 0.5) / thornCount;
    const pos  = curve.getPoint(t);
    const tan  = curve.getTangent(t);
    const up   = new THREE.Vector3(0, 1, 0);
    const perp = new THREE.Vector3().crossVectors(tan, up).normalize();
    const ang  = i * 2.618 * Math.PI;
    const dir  = new THREE.Vector3(
      perp.x * Math.cos(ang) + up.x * Math.sin(ang),
      perp.y * Math.cos(ang) + up.y * Math.sin(ang),
      perp.z * Math.cos(ang) + up.z * Math.sin(ang)
    ).normalize();
    const thorn = new THREE.Mesh(
      new THREE.ConeGeometry(0.028, 0.22 + stress * 0.001, 5),
      stemMat.clone()
    );
    thorn.position.copy(pos).addScaledVector(dir, 0.06);
    thorn.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    thorn.visible  = false;
    thorn._t       = t;
    thorn._removed = false;
    group.add(thorn);
    thornMeshes.push(thorn);
  }

  /* 잎 */
  const leafMeshes = [];
  const leafCount  = 4 + Math.floor(stress * 0.04);
  for (let i = 0; i < leafCount; i++) {
    const t   = (i + 0.4) / leafCount;
    const pos = curve.getPoint(t);
    const tan = curve.getTangent(t);
    const sz  = 0.10 + Math.random() * 0.11;
    const sh  = new THREE.Shape();
    sh.moveTo(0, 0);
    sh.bezierCurveTo(-sz * 0.6, sz * 0.2, -sz * 0.5, sz * 0.72, 0, sz);
    sh.bezierCurveTo( sz * 0.5, sz * 0.72,  sz * 0.6, sz * 0.2, 0, 0);
    const leaf = new THREE.Mesh(
      new THREE.ExtrudeGeometry(sh, { depth: 0.009, bevelEnabled: false }),
      leafMat.clone()
    );
    const side = i % 2 === 0 ? 1 : -1;
    const ld   = new THREE.Vector3(
      -tan.z * side + rnd(-0.3, 0.3),
       0.5,
       tan.x * side + rnd(-0.3, 0.3)
    ).normalize();
    leaf.position.copy(pos).addScaledVector(ld, 0.11);
    leaf.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), ld);
    leaf.rotation.x += rnd(-0.9, 0.9);
    leaf.rotation.y += rnd(-0.9, 0.9);
    leaf.rotation.z += rnd(-0.9, 0.9);
    leaf.visible = false;
    leaf._t      = t;
    group.add(leaf);
    leafMeshes.push(leaf);
  }

  /* 꽃 */
  const fg = flowerType === 'bud' ? makeBudFlower() : makeCrystalFlower();
  fg.position.copy(curve.getPoint(1));
  fg.scale.setScalar(0);
  fg.rotation.y = Math.random() * Math.PI * 2;
  group.add(fg);

  const stemObj = {
    mesh, geo,
    total:    geo.index.count,
    curve,
    thorns:   thornMeshes,
    leaves:   leafMeshes,
    flower:   fg,
    progress: 0,
    speed:    0.007 + stress * 0.000065,
    growing:  true,
    removed:  false,
  };
  stems.push(stemObj);
  return stemObj;
}

/* ── Level 1 초기 나무 (가느다란 직립 1~2줄기) ── */
function buildTree() {
  const count = 1 + (Math.random() < 0.55 ? 1 : 0);
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    spawnStem(rnd(-0.06, 0.06), -0.02, rnd(-0.06, 0.06), {
      vxInit:     Math.cos(ang) * rnd(0.18, 0.36),
      vzInit:     Math.sin(ang) * rnd(0.18, 0.36),
      numSegs:    20,
      tubeRadius: 0.034,
      stepY:      0.20,
      driftMul:   0.52,
      flowerType: 'bud',
    });
  }
}

/* ── 씬 초기화 ── */
function seedScene() {
  stems.forEach(s => {
    group.remove(s.mesh);
    s.thorns.forEach(t => group.remove(t));
    s.leaves.forEach(l => group.remove(l));
    group.remove(s.flower);
  });
  stems.length   = 0;
  history.length = 0;
  autoTimer      = 0;
  targetRY = 0;
  targetRX = 0;
  buildTree();
  updateStatus('Comb: click to grow · drag to rotate · Cut/Pluck to prune.');
}

/* ═══════════════════════════════════════════
   카메라 궤도
   ═══════════════════════════════════════════ */
let isDrag    = false;
let isDragged = false;
let dragPX    = 0, dragPY = 0;
let targetRY  = 0, targetRX = 0;
let currentRY = 0, currentRX = 0;

/* ═══════════════════════════════════════════
   레이캐스팅
   ═══════════════════════════════════════════ */
const raycaster  = new THREE.Raycaster();
const mouseNDC   = new THREE.Vector2();
const spawnPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

function setMouseNDC(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  mouseNDC.x =  ((clientX - rect.left) / rect.width)  * 2 - 1;
  mouseNDC.y = -((clientY - rect.top)  / rect.height) * 2 + 1;
}

/* ═══════════════════════════════════════════
   도구 동작
   ═══════════════════════════════════════════ */
function updateStatus(msg) {
  if (!statusText) return;
  const s       = Number(slider?.value ?? 62);
  const label   = s < 31 ? 'LOW' : s < 66 ? 'CHRONIC' : 'OVERGROWTH';
  const density = Math.min(100, Math.round(
    (stems.filter(st => !st.removed).length / MAX_STEMS) * 100
  ));
  statusText.textContent = `${msg} | ${label} | ${density}%`;
}

function cutAt(x, y) {
  setMouseNDC(x, y);
  raycaster.setFromCamera(mouseNDC, camera);
  const hits = raycaster.intersectObjects(
    stems.filter(s => !s.removed).map(s => s.mesh)
  );
  if (!hits.length) { updateStatus('Cut: click directly on a vine stem.'); return; }
  const stem = stems.find(s => s.mesh === hits[0].object);
  if (!stem) return;
  stem.removed = true;
  stem.mesh.visible = false;
  stem.thorns.forEach(t => { t.visible = false; });
  stem.leaves.forEach(l => { l.visible = false; });
  stem.flower.visible = false;
  history.push({ type: 'cut', stem });
  updateStatus('Vine stem clipped.');
}

function pluckAt(x, y) {
  setMouseNDC(x, y);
  raycaster.setFromCamera(mouseNDC, camera);
  const visibleThorns = stems
    .filter(s => !s.removed)
    .flatMap(s => s.thorns.filter(t => t.visible && !t._removed));
  const hits = raycaster.intersectObjects(visibleThorns);
  if (!hits.length) { updateStatus('Pluck: click on a visible thorn.'); return; }
  const thorn = hits[0].object;
  thorn.visible  = false;
  thorn._removed = true;
  history.push({ type: 'pluck', thorn });
  updateStatus('Thorn removed.');
}

function plantAt(x, y) {
  setMouseNDC(x, y);
  raycaster.setFromCamera(mouseNDC, camera);
  const target = new THREE.Vector3();
  raycaster.ray.intersectPlane(spawnPlane, target);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  target.applyMatrix4(inv);
  const stem = spawnStem(target.x, Math.max(target.y - 1, -0.5), target.z);
  history.push({ type: 'plant', stem });
  updateStatus('New vine planted.');
}

function performClick(x, y) {
  if (currentTool === 'cut')   cutAt(x, y);
  if (currentTool === 'comb')  plantAt(x, y);
  if (currentTool === 'pluck') pluckAt(x, y);
}

function undoLast() {
  const action = history.pop();
  if (!action) { updateStatus('Nothing to undo.'); return; }
  if (action.type === 'cut') {
    action.stem.removed = false;
    action.stem.mesh.visible = true;
    action.stem.thorns.forEach(t => { t.visible = !t._removed && t._t <= action.stem.progress; });
    action.stem.leaves.forEach(l => { l.visible = l._t <= action.stem.progress * 0.9; });
    action.stem.flower.visible = true;
  }
  if (action.type === 'pluck') {
    action.thorn._removed = false;
    action.thorn.visible  = action.thorn._t <= 1;
  }
  if (action.type === 'plant') {
    action.stem.removed = true;
    action.stem.mesh.visible = false;
    action.stem.thorns.forEach(t => { t.visible = false; });
    action.stem.leaves.forEach(l => { l.visible = false; });
    action.stem.flower.visible = false;
  }
  updateStatus('Last action undone.');
}

/* ═══════════════════════════════════════════
   이벤트 바인딩
   ═══════════════════════════════════════════ */

/* 도구 버튼 */
toolButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    currentTool = btn.dataset.tool;
    toolButtons.forEach(b => b.classList.toggle('active', b === btn));
    const labels = {
      cut:   'Cut: click on a vine stem to remove it.',
      comb:  'Comb: click to grow · drag to rotate.',
      pluck: 'Pluck: click on a thorn to remove it.',
    };
    updateStatus(labels[currentTool]);
  });
});

/* 마우스 궤도 + 클릭 */
canvas.addEventListener('mousedown', e => {
  isDrag = true; isDragged = false;
  dragPX = e.clientX; dragPY = e.clientY;
});
window.addEventListener('mousemove', e => {
  if (!isDrag) return;
  const dx = e.clientX - dragPX, dy = e.clientY - dragPY;
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragged = true;
  targetRY += dx * 0.007;
  targetRX  = Math.max(-0.5, Math.min(0.5, targetRX + dy * 0.004));
  dragPX = e.clientX; dragPY = e.clientY;
});
window.addEventListener('mouseup', e => {
  if (!isDragged) performClick(e.clientX, e.clientY);
  isDrag = false; isDragged = false;
});

/* 터치 */
canvas.addEventListener('touchstart', e => {
  const t = e.touches[0];
  isDrag = true; isDragged = false;
  dragPX = t.clientX; dragPY = t.clientY;
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  if (!isDrag) return;
  const t  = e.touches[0];
  const dx = t.clientX - dragPX, dy = t.clientY - dragPY;
  if (Math.abs(dx) > 5 || Math.abs(dy) > 5) isDragged = true;
  targetRY += dx * 0.007;
  targetRX  = Math.max(-0.5, Math.min(0.5, targetRX + dy * 0.004));
  dragPX = t.clientX; dragPY = t.clientY;
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchend', e => {
  if (!isDragged && e.changedTouches.length)
    performClick(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
  isDrag = false; isDragged = false;
});

/* 컨트롤 버튼 */
slider?.addEventListener('input',  () => updateStatus('Stress level adjusted.'));
regrowButton?.addEventListener('click',  seedScene);
undoButton?.addEventListener('click',    undoLast);
resetViewButton?.addEventListener('click', () => {
  targetRY = 0; targetRX = 0;
  updateStatus('View reset.');
});
saveButton?.addEventListener('click', () => {
  renderer.render(scene, camera);
  const a = document.createElement('a');
  a.download = `stress-gardening-${Date.now()}.png`;
  a.href     = canvas.toDataURL('image/png');
  a.click();
  updateStatus('Specimen saved.');
});

/* 키보드 단축키 */
window.addEventListener('keydown', e => {
  if (e.key === 'r' || e.key === 'R') seedScene();
});

/* ═══════════════════════════════════════════
   리사이즈
   ═══════════════════════════════════════════ */
function resizeRenderer() {
  const rect = canvas.getBoundingClientRect();
  const w    = Math.max(320, Math.floor(rect.width));
  const h    = Math.max(420, Math.floor(rect.height));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', resizeRenderer);

/* ═══════════════════════════════════════════
   애니메이션 루프
   ═══════════════════════════════════════════ */
function animate() {
  requestAnimationFrame(animate);

  /* 궤도 회전 lerp */
  currentRY += (targetRY - currentRY) * 0.08;
  currentRX += (targetRX - currentRX) * 0.08;
  group.rotation.y = currentRY;
  group.rotation.x = currentRX;

  /* 줄기 성장 애니메이션 */
  stems.forEach(s => {
    if (!s.growing || s.removed) return;
    s.progress = Math.min(1, s.progress + s.speed);
    s.geo.setDrawRange(0, Math.floor(s.progress * s.total));
    s.thorns.forEach(t => { if (!t._removed) t.visible = t._t <= s.progress; });
    s.leaves.forEach(l => { l.visible = l._t <= s.progress * 0.9; });
    const fp = Math.max(0, (s.progress - 0.84) / 0.16);
    s.flower.scale.setScalar(fp * 1.05);
    if (s.progress >= 1) s.growing = false;
  });

  /* 자동 성장: Level1(직립) → Level5(넓게 퍼짐)
     spread 0→1: 줄기 2개일 때 0, 20개일 때 1 */
  const stress    = Number(slider?.value ?? 62);
  const activeCnt = stems.filter(s => !s.removed).length;
  autoTimer++;
  const interval = Math.max(160, 420 - stress * 1.8);

  if (autoTimer > interval && activeCnt < MAX_STEMS) {
    autoTimer = 0;
    const spread = Math.min(1.0, Math.max(0, (activeCnt - 2) / 18));
    const ang    = Math.random() * Math.PI * 2;
    const vAmp   = 0.05 + spread * 0.78;   /* 수평 확산 속도 */
    const sy     = Math.max(0.055, 0.22 - spread * 0.165); /* 세그먼트 높이 */
    const tr     = 0.028 + spread * 0.052 + stress * 0.00022; /* 튜브 굵기 */
    const ns     = Math.floor(14 + spread * 8); /* 세그먼트 수 */
    const ft     = spread > 0.35 ? 'starburst' : 'bud';

    spawnStem(rnd(-0.08, 0.08), -0.02, rnd(-0.08, 0.08), {
      vxInit:     Math.cos(ang) * vAmp,
      vzInit:     Math.sin(ang) * vAmp,
      numSegs:    ns,
      tubeRadius: tr,
      stepY:      sy,
      driftMul:   0.45 + spread * 0.65,
      flowerType: ft,
    });
  }

  renderer.render(scene, camera);
}

/* ═══════════════════════════════════════════
   초기화
   ═══════════════════════════════════════════ */
resizeRenderer();
seedScene();
animate();
