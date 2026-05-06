/* ─────────────────────────────────────────
   GAME / app.js  —  Three.js vine engine
   config.js + render.js가 먼저 실행된 후 로드됨
   ───────────────────────────────────────── */

/* ── DOM refs ── */
const canvas        = document.querySelector("#thornCanvas");
const slider        = document.querySelector("#stressSlider");
const regrowButton  = document.querySelector("#regrowButton");
const statusText    = document.querySelector("#statusText");
const toolButtons   = document.querySelectorAll(".tool-button[data-tool]");
const undoButton    = document.querySelector("#undoButton");
const resetViewButton = document.querySelector("#resetViewButton");
const saveButton    = document.querySelector("#saveButton");

/* ── State ── */
let currentTool = "comb";
let history     = [];
let autoTimer   = 0;
const MAX_STEMS = 55;

/* ─────────────────────────────────────────
   THREE.JS SETUP
   ───────────────────────────────────────── */
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  preserveDrawingBuffer: true,  /* save 기능에 필요 */
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
/* 스튜디오 배경 — 갤러리 화이트, CSS 비네트와 통일 */
scene.background = new THREE.Color(0xf6f5f2);

const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
camera.position.set(0, 4.5, 13);
camera.lookAt(0, 2.0, 0);

/* ── 조명 — 스튜디오 소프트박스 세팅 ── */
/* 전체 베이스 환경광: 균일하고 부드럽게 */
scene.add(new THREE.AmbientLight(0xfff8f0, 3.2));
/* 키 라이트: 45도 위쪽 왼쪽 */
const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
keyLight.position.set(-4, 12, 6);
scene.add(keyLight);
/* 필 라이트: 반대쪽 부드러운 보조 */
const fillLight = new THREE.DirectionalLight(0xfff4ea, 1.6);
fillLight.position.set(6, 4, -4);
scene.add(fillLight);
/* 림 라이트: 뒤에서 테두리 강조 (금속 질감 살리기) */
const rimLight = new THREE.DirectionalLight(0xffffff, 1.0);
rimLight.position.set(0, -2, -8);
scene.add(rimLight);
/* 아래쪽 반사광: 바닥 반사 시뮬레이션 */
const groundBounce = new THREE.DirectionalLight(0xfaf6f0, 0.6);
groundBounce.position.set(0, -8, 2);
scene.add(groundBounce);

/* ── 재질 — 레퍼런스 은빛 금속 표본 ── */
const stemMat = new THREE.MeshStandardMaterial({
  color: 0xc8c6c3,      /* 레퍼런스의 따뜻한 실버 톤 */
  metalness: 0.95,
  roughness: 0.22,
});
const leafMat = new THREE.MeshStandardMaterial({
  color: 0xb0aeac,      /* 잎: 줄기보다 살짝 어둡고 무광 */
  metalness: 0.88,
  roughness: 0.30,
  side: THREE.DoubleSide,
});
const crystalMat = new THREE.MeshPhongMaterial({
  color: 0xf0f0ee,      /* 크리스탈: 거의 흰빛, 미묘한 따뜻함 */
  specular: 0xffffff,
  shininess: 320,
  transparent: true,
  opacity: 0.82,
  side: THREE.DoubleSide,
});

/* ── 씬 그룹 (회전용) ── */
const group = new THREE.Group();
scene.add(group);

/* ── 베이스 없음 (유리 디스크·링 제거) ── */

/* ─────────────────────────────────────────
   STEM 데이터 & 생성
   ───────────────────────────────────────── */
const stems = [];

function rnd(a, b) { return a + Math.random() * (b - a); }

function spawnStem(sx, sy, sz, {
  vxInit    = null,          /* 초기 수평 속도 X (null=랜덤) */
  vzInit    = null,          /* 초기 수평 속도 Z (null=랜덤) */
  numSegs   = null,          /* 세그먼트 수 (null=기본값) */
  tubeRadius= null,          /* 튜브 반지름 (null=기본값) */
  stepY     = null,          /* 세그먼트당 y 증가량 (null=랜덤) */
  driftMul   = 1.0,           /* 수평 흔들림 강도 배수 */
  showThorns = true,
  showLeaves = true,
  showFlower = true,
  flowerType = 'starburst',  /* 'bud' | 'starburst' */
} = {}) {
  const stress = Number(slider.value);

  /* 곡선 경로 생성 */
  const points = [];
  let cx = sx, cy = sy + 0.02, cz = sz;
  let vx = vxInit ?? rnd(-0.9, 0.9);
  let vz = vzInit ?? rnd(-0.9, 0.9);
  const segCount = numSegs ?? (14 + Math.floor(stress * 0.04));
  points.push(new THREE.Vector3(cx, cy, cz));
  for (let i = 1; i <= segCount; i++) {
    vx += rnd(-0.28, 0.28) * driftMul; vz += rnd(-0.28, 0.28) * driftMul;
    vx *= 0.76; vz *= 0.76;
    cx += vx * 0.72 * driftMul;
    cy += stepY ?? (0.14 + Math.random() * 0.05);
    cz += vz * 0.72 * driftMul;
    points.push(new THREE.Vector3(cx, cy, cz));
  }

  const curve    = new THREE.CatmullRomCurve3(points);
  const tubeR    = tubeRadius ?? (0.038 + stress * 0.00028);
  const geo      = new THREE.TubeGeometry(curve, 64, tubeR, 8, false);
  geo.setDrawRange(0, 0);
  const mesh     = new THREE.Mesh(geo, stemMat.clone());
  group.add(mesh);

  /* 가시 */
  const thornMeshes = [];
  const thornCount  = showThorns ? (8 + Math.floor(stress * 0.07)) : 0;
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
  const leafCount  = showLeaves ? (4 + Math.floor(stress * 0.04)) : 0;
  for (let i = 0; i < leafCount; i++) {
    const t   = (i + 0.4) / leafCount;
    const pos = curve.getPoint(t);
    const tan = curve.getTangent(t);
    const sz  = 0.10 + Math.random() * 0.11;
    const sh  = new THREE.Shape();
    sh.moveTo(0, 0);
    sh.bezierCurveTo(-sz * 0.6, sz * 0.2, -sz * 0.5, sz * 0.72, 0, sz);
    sh.bezierCurveTo( sz * 0.5, sz * 0.72, sz * 0.6, sz * 0.2, 0, 0);
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

  /* 크리스탈 꽃 (줄기 끝) */
  const fg = new THREE.Group();

  if (flowerType === 'bud') {
    /* ── 로즈 버드: 작은 구체 + 5개 안쪽 꽃잎 ── */
    fg.add(new THREE.Mesh(
      new THREE.SphereGeometry(0.058, 10, 10),
      new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 340, specular: 0xffffff })
    ));
    for (let i = 0; i < 5; i++) {
      const phi = (i / 5) * Math.PI * 2;
      const psh = new THREE.Shape();
      psh.moveTo(0, 0);
      psh.bezierCurveTo(-0.034, 0.044, -0.026, 0.17, 0, 0.22);
      psh.bezierCurveTo( 0.026, 0.17,   0.034, 0.044, 0, 0);
      const petal = new THREE.Mesh(
        new THREE.ExtrudeGeometry(psh, { depth: 0.005, bevelEnabled: false }),
        crystalMat
      );
      const d = new THREE.Vector3(Math.cos(phi), 0.60, Math.sin(phi)).normalize();
      petal.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
      petal.position.copy(d).multiplyScalar(0.042);
      fg.add(petal);
    }
  } else {
    /* ── 스타버스트: 12갈래 뾰족한 크리스탈 ── */
    for (let i = 0; i < 12; i++) {
      const phi   = (i / 12) * Math.PI * 2;
      const theta = Math.PI / 6 + (i % 3) * (Math.PI / 8);
      const len   = 0.30 + (i % 3) * 0.06;
      const psh   = new THREE.Shape();
      psh.moveTo(0, 0);
      psh.lineTo(-0.025, len * 0.3);
      psh.lineTo(0, len);
      psh.lineTo( 0.025, len * 0.3);
      psh.closePath();
      const petal = new THREE.Mesh(
        new THREE.ExtrudeGeometry(psh, { depth: 0.005, bevelEnabled: false }),
        crystalMat
      );
      const dir = new THREE.Vector3(
        Math.sin(theta) * Math.cos(phi),
        Math.cos(theta),
        Math.sin(theta) * Math.sin(phi)
      ).normalize();
      petal.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      petal.position.copy(dir).multiplyScalar(0.045);
      fg.add(petal);
    }
    fg.add(new THREE.Mesh(
      new THREE.SphereGeometry(0.042, 10, 10),
      new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 320 })
    ));
  }
  fg.position.copy(curve.getPoint(1));
  fg.scale.setScalar(0);
  fg.rotation.y = Math.random() * Math.PI * 2;
  fg.visible = showFlower;
  group.add(fg);

  const stemObj = {
    mesh, geo,
    total: geo.index.count,
    curve,
    thorns: thornMeshes,
    leaves: leafMeshes,
    flower: fg,
    progress: 0,
    speed: 0.007 + stress * 0.000065,
    growing: true,
    removed: false,
  };
  stems.push(stemObj);
  return stemObj;
}

/* ─────────────────────────────────────────
   카메라 궤도 드래그
   ───────────────────────────────────────── */
let isDrag     = false;
let isDragged  = false;
let dragPX     = 0, dragPY = 0;
let targetRY   = 0, targetRX = 0;
let currentRY  = 0, currentRX = 0;

/* ─────────────────────────────────────────
   레이캐스팅
   ───────────────────────────────────────── */
const raycaster   = new THREE.Raycaster();
const mouseNDC    = new THREE.Vector2();
const spawnPlane  = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

function setMouseNDC(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  mouseNDC.x =  ((clientX - rect.left) / rect.width)  * 2 - 1;
  mouseNDC.y = -((clientY - rect.top)  / rect.height) * 2 + 1;
}

/* ─────────────────────────────────────────
   도구 동작
   ───────────────────────────────────────── */
function cutAt(clientX, clientY) {
  setMouseNDC(clientX, clientY);
  raycaster.setFromCamera(mouseNDC, camera);
  const visibleMeshes = stems.filter(s => !s.removed).map(s => s.mesh);
  const hits = raycaster.intersectObjects(visibleMeshes);
  if (hits.length) {
    const stemObj = stems.find(s => s.mesh === hits[0].object);
    if (stemObj) {
      stemObj.removed = true;
      stemObj.mesh.visible = false;
      stemObj.thorns.forEach(t => { t.visible = false; });
      stemObj.leaves.forEach(l => { l.visible = false; });
      stemObj.flower.visible = false;
      history.push({ type: "cut", stem: stemObj });
      updateStatus("Vine stem clipped.");
      return;
    }
  }
  updateStatus("Cut: click directly on a vine stem.");
}

function pluckAt(clientX, clientY) {
  setMouseNDC(clientX, clientY);
  raycaster.setFromCamera(mouseNDC, camera);
  const activeThorns = stems.flatMap(s =>
    !s.removed ? s.thorns.filter(t => t.visible && !t._removed) : []
  );
  const hits = raycaster.intersectObjects(activeThorns);
  if (hits.length) {
    const thorn = hits[0].object;
    thorn.visible   = false;
    thorn._removed  = true;
    history.push({ type: "pluck", thorn });
    updateStatus("Thorn removed.");
  } else {
    updateStatus("Pluck: click on a visible thorn.");
  }
}

function plantAt(clientX, clientY) {
  setMouseNDC(clientX, clientY);
  raycaster.setFromCamera(mouseNDC, camera);
  const target = new THREE.Vector3();
  raycaster.ray.intersectPlane(spawnPlane, target);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  target.applyMatrix4(inv);
  const ang    = Math.random() * Math.PI * 2;
  const spread = Math.min(1.0, Math.max(0, (stems.filter(s=>!s.removed).length - 2) / 18));
  const stemObj = spawnStem(rnd(-0.08, 0.08), -0.02, rnd(-0.08, 0.08), {
    vxInit:    Math.cos(ang) * (0.08 + spread * 0.65),
    vzInit:    Math.sin(ang) * (0.08 + spread * 0.65),
    numSegs:   Math.floor(12 + spread * 8),
    tubeRadius: 0.030 + spread * 0.045,
    stepY:     Math.max(0.06, 0.21 - spread * 0.15),
    driftMul:  0.5 + spread * 0.6,
    flowerType: spread > 0.35 ? 'starburst' : 'bud',
  });
  history.push({ type: "plant", stem: stemObj });
  updateStatus("Branch planted.");
}

/* ── Undo ── */
function undoLastAction() {
  const action = history.pop();
  if (!action) { updateStatus("Nothing to undo."); return; }

  if (action.type === "cut") {
    const s = action.stem;
    s.removed          = false;
    s.mesh.visible     = true;
    s.flower.visible   = s.progress >= 1;
    s.thorns.forEach(t => { if (!t._removed && t._t <= s.progress) t.visible = true; });
    s.leaves.forEach(l => { if (l._t <= s.progress * 0.9) l.visible = true; });
  }
  if (action.type === "pluck") {
    action.thorn._removed = false;
    action.thorn.visible  = true;
  }
  if (action.type === "plant") {
    const s = action.stem;
    s.removed = true;
    s.mesh.visible = false;
    s.thorns.forEach(t => t.visible = false);
    s.leaves.forEach(l => l.visible = false);
    s.flower.visible = false;
  }
  updateStatus("Last action undone.");
}

/* ── Reset view ── */
function resetView() {
  targetRY = 0; targetRX = 0;
  updateStatus("View reset.");
}

/* ── 초기 줄기 생성 (이미지1: 가느다란 직립 1~2개) ── */
function buildTree() {
  /* Level-1 모습: 가는 줄기 1~2개, 자연스러운 S커브, 버드 꽃 */
  const count = 1 + (Math.random() < 0.55 ? 1 : 0);
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    spawnStem(rnd(-0.06, 0.06), -0.02, rnd(-0.06, 0.06), {
      vxInit:     Math.cos(ang) * rnd(0.18, 0.36),
      vzInit:     Math.sin(ang) * rnd(0.18, 0.36),
      numSegs:    28,
      tubeRadius: 0.044,
      stepY:      0.28,
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
  targetRY = 0; targetRX = 0;
  buildTree();
  updateStatus("Comb: click to grow · drag to rotate · Cut/Pluck to prune.");
}

/* ── 상태 텍스트 ── */
function updateStatus(msg) {
  const stress = Number(slider.value);
  const label  = stress < 31 ? "LOW TENSION" : stress < 66 ? "CHRONIC TENSION" : "OVERGROWTH";
  const density = Math.min(100, Math.round((stems.filter(s => !s.removed).length / 30) * 100));
  statusText.textContent = `${msg} | ${label} | Density ${density}%`;
}

/* ── Save ── */
function saveSpecimen() {
  renderer.render(scene, camera);
  const link      = document.createElement("a");
  link.download   = `stress-gardening-${Date.now()}.png`;
  link.href       = canvas.toDataURL("image/png");
  link.click();
  updateStatus("Specimen saved.");
}

/* ── 리사이즈 ── */
function resizeRenderer() {
  const rect = canvas.getBoundingClientRect();
  const w    = Math.max(320, Math.floor(rect.width));
  const h    = Math.max(420, Math.floor(rect.height));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

/* ─────────────────────────────────────────
   이벤트 리스너
   ───────────────────────────────────────── */
toolButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    currentTool = btn.dataset.tool;
    toolButtons.forEach(b => b.classList.toggle("active", b === btn));
    const labels = {
      cut:   "Cut: click on a vine stem to remove it.",
      comb:  "Comb: click to grow · drag to rotate.",
      pluck: "Pluck: click on a thorn to remove it.",
    };
    updateStatus(labels[currentTool]);
  });
});

/* 마우스 */
canvas.addEventListener("mousedown", e => {
  isDrag    = true;
  isDragged = false;
  dragPX    = e.clientX;
  dragPY    = e.clientY;
});
window.addEventListener("mousemove", e => {
  if (!isDrag) return;
  const dx = e.clientX - dragPX;
  const dy = e.clientY - dragPY;
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragged = true;
  targetRY += dx * 0.007;
  targetRX += dy * 0.004;
  targetRX  = Math.max(-0.55, Math.min(0.55, targetRX));
  dragPX    = e.clientX;
  dragPY    = e.clientY;
});
window.addEventListener("mouseup", e => {
  if (!isDragged) {
    if (currentTool === "cut")   cutAt(e.clientX, e.clientY);
    else if (currentTool === "comb")  plantAt(e.clientX, e.clientY);
    else if (currentTool === "pluck") pluckAt(e.clientX, e.clientY);
  }
  isDrag    = false;
  isDragged = false;
});

/* 터치 */
canvas.addEventListener("touchstart", e => {
  const t = e.touches[0];
  isDrag = true; isDragged = false;
  dragPX = t.clientX; dragPY = t.clientY;
  e.preventDefault();
}, { passive: false });
canvas.addEventListener("touchmove", e => {
  if (!isDrag) return;
  const t  = e.touches[0];
  const dx = t.clientX - dragPX;
  const dy = t.clientY - dragPY;
  if (Math.abs(dx) > 5 || Math.abs(dy) > 5) isDragged = true;
  targetRY += dx * 0.007;
  targetRX += dy * 0.004;
  targetRX  = Math.max(-0.55, Math.min(0.55, targetRX));
  dragPX = t.clientX; dragPY = t.clientY;
  e.preventDefault();
}, { passive: false });
canvas.addEventListener("touchend", e => {
  if (!isDragged && e.changedTouches.length) {
    const t = e.changedTouches[0];
    if (currentTool === "cut")        cutAt(t.clientX, t.clientY);
    else if (currentTool === "comb")  plantAt(t.clientX, t.clientY);
    else if (currentTool === "pluck") pluckAt(t.clientX, t.clientY);
  }
  isDrag = false; isDragged = false;
});

slider.addEventListener("input",  () => updateStatus("Stress level changed."));
regrowButton.addEventListener("click",  seedScene);
undoButton?.addEventListener("click",   undoLastAction);
resetViewButton?.addEventListener("click", resetView);
saveButton?.addEventListener("click",   saveSpecimen);

window.addEventListener("keydown", e => {
  if (e.key === "r" || e.key === "R") seedScene();
});
window.addEventListener("resize", resizeRenderer);

/* ─────────────────────────────────────────
   애니메이션 루프
   ───────────────────────────────────────── */
function animate() {
  requestAnimationFrame(animate);

  /* 카메라 부드러운 회전 */
  currentRY += (targetRY - currentRY) * 0.06;
  currentRX += (targetRX - currentRX) * 0.06;
  group.rotation.y = currentRY;
  group.rotation.x = currentRX;

  /* 줄기 성장 애니메이션 */
  stems.forEach(s => {
    if (!s.growing || s.removed) return;
    s.progress = Math.min(1, s.progress + s.speed);
    const drawn = Math.floor(s.progress * s.total);
    s.geo.setDrawRange(0, drawn);
    s.thorns.forEach(t => {
      if (!t._removed) t.visible = t._t <= s.progress;
    });
    s.leaves.forEach(l => {
      l.visible = l._t <= s.progress * 0.9;
    });
    const fp = Math.max(0, (s.progress - 0.84) / 0.16);
    s.flower.scale.setScalar(fp * 0.72);
    if (s.progress >= 1) s.growing = false;
  });

  /* ── 자동 성장: 줄기 수에 따라 점점 퍼지는 형태 ──
     적을 때(Level1): 가늘고 수직  →  많을 때(Level5): 굵고 수평 확산 */
  const stress    = Number(slider.value);
  const activeCnt = stems.filter(s => !s.removed).length;
  autoTimer += 1;
  const interval  = Math.max(160, 420 - stress * 1.8);
  if (autoTimer > interval && activeCnt < MAX_STEMS) {
    autoTimer = 0;

    /* 0(초기·수직) → 1(밀도높음·수평) */
    const spread = Math.min(1.0, Math.max(0, (activeCnt - 2) / 18));

    const ang    = Math.random() * Math.PI * 2;
    /* 수평 초속: 초기=거의0, 성장=강하게 옆으로 */
    const vAmp   = 0.06 + spread * 0.90;
    /* y증가량: 초기=높게, 성장=낮게(수평에 가깝게) */
    const sy     = Math.max(0.065, 0.30 - spread * 0.22);
    /* 튜브 굵기: 초기=얇게, 성장=굵게 */
    const tr     = 0.036 + spread * 0.062 + stress * 0.00022;
    /* 세그먼트: 성장할수록 길어짐 */
    const ns     = Math.floor(18 + spread * 12);
    /* 꽃 타입: 초반=버드, 중반이후=스타버스트 */
    const ft     = spread > 0.35 ? 'starburst' : 'bud';
    /* 시작 위치: 모두 베이스 근처에서 묶음 */
    const bx     = rnd(-0.08, 0.08);
    const bz     = rnd(-0.08, 0.08);

    spawnStem(bx, -0.02, bz, {
      vxInit:    Math.cos(ang) * vAmp,
      vzInit:    Math.sin(ang) * vAmp,
      numSegs:   ns,
      tubeRadius: tr,
      stepY:     sy,
      driftMul:  0.45 + spread * 0.65,
      flowerType: ft,
    });
  }

  renderer.render(scene, camera);
}

/* ── 초기화 ── */
resizeRenderer();
seedScene();
animate();
