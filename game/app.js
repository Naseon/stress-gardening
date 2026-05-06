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
scene.background = new THREE.Color(0xf4f3ef);

const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
camera.position.set(0, 4, 18);
camera.lookAt(0, 1.0, 0);

/* ── 조명 ── */
scene.add(new THREE.AmbientLight(0xffffff, 2.5));
const sunLight = new THREE.DirectionalLight(0xffffff, 3.5);
sunLight.position.set(3, 10, 5);
scene.add(sunLight);
const fillLight = new THREE.DirectionalLight(0xffffff, 1.2);
fillLight.position.set(-5, 3, -3);
scene.add(fillLight);
const pointLight = new THREE.PointLight(0xffffff, 1.5, 20);
pointLight.position.set(4, 5, 4);
scene.add(pointLight);

/* ── 재질 ── */
const stemMat = new THREE.MeshStandardMaterial({
  color: 0xd0cecc, metalness: 0.92, roughness: 0.18,
});
const leafMat = new THREE.MeshStandardMaterial({
  color: 0xb8b6b4, metalness: 0.92, roughness: 0.18,
  side: THREE.DoubleSide,
});
const crystalMat = new THREE.MeshPhongMaterial({
  color: 0xffffff, specular: 0xffffff, shininess: 200,
  transparent: true, opacity: 0.78, side: THREE.DoubleSide,
});

/* ── 씬 그룹 (회전용) ── */
const group = new THREE.Group();
scene.add(group);

/* ── 베이스 플레이트 (반사 원판) ── */
const plateGeo  = new THREE.CylinderGeometry(2.0, 2.0, 0.04, 64);
const plateMat  = new THREE.MeshStandardMaterial({
  color: 0xd8d6d4, metalness: 0.88, roughness: 0.12,
});
group.add(new THREE.Mesh(plateGeo, plateMat));

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
  driftMul  = 1.0,           /* 수평 흔들림 강도 배수 */
  showThorns= true,
  showLeaves= true,
  showFlower= true,
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

  /* 크리스탈 꽃 (줄기 끝, showFlower=false이면 숨김) */
  const fg = new THREE.Group();
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
  const ang = Math.random() * Math.PI * 2;
  const stemObj = spawnStem(target.x, Math.max(target.y - 1.2, -0.1), target.z, {
    vxInit:  Math.cos(ang) * 0.35,
    vzInit:  Math.sin(ang) * 0.35,
    numSegs: 10,
    tubeRadius: 0.030,
    stepY:   0.11,
    driftMul: 0.9,
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

/* ── 나무 구조 생성 ── */
function buildTree() {
  /* ① 기둥 (Trunk): 굵고 거의 수직 */
  const trunk = spawnStem(0, -0.02, 0, {
    vxInit:    rnd(-0.025, 0.025),
    vzInit:    rnd(-0.025, 0.025),
    numSegs:   22,
    tubeRadius: 0.11,
    stepY:     0.20,
    driftMul:  0.10,
    showThorns: false,
    showLeaves: false,
    showFlower: false,
  });
  const tip = trunk.curve.getPoint(1);

  /* ② 주 가지 (Main branches): 기둥 끝에서 방사형으로 */
  const mainCount = 5 + Math.floor(Math.random() * 2);
  for (let i = 0; i < mainCount; i++) {
    const ang  = (i / mainCount) * Math.PI * 2 + rnd(-0.18, 0.18);
    const dx   = Math.cos(ang), dz = Math.sin(ang);
    const branch = spawnStem(
      tip.x + dx * 0.05,
      tip.y - 0.18,
      tip.z + dz * 0.05,
      {
        vxInit:    dx * 0.52,
        vzInit:    dz * 0.52,
        numSegs:   12,
        tubeRadius: 0.056,
        stepY:     0.13,
        driftMul:  0.55,
        showFlower: false,
      }
    );
    const bTip = branch.curve.getPoint(1);

    /* ③ 잔가지 (Sub-branches): 주 가지 끝에서 더 얇게 */
    const subCount = 2 + Math.floor(Math.random() * 2);
    for (let j = 0; j < subCount; j++) {
      const subAng = ang + rnd(-0.75, 0.75);
      spawnStem(
        bTip.x + rnd(-0.04, 0.04),
        bTip.y - 0.08,
        bTip.z + rnd(-0.04, 0.04),
        {
          vxInit:    Math.cos(subAng) * 0.38,
          vzInit:    Math.sin(subAng) * 0.38,
          numSegs:   10,
          tubeRadius: 0.028,
          stepY:     0.10,
          driftMul:  0.85,
        }
      );
    }
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

  /* 자동 성장 (스트레스 기반) */
  const stress      = Number(slider.value);
  const activeCnt   = stems.filter(s => !s.removed).length;
  autoTimer += 1;
  const interval    = Math.max(200, 440 - stress * 1.8);
  if (autoTimer > interval && activeCnt < MAX_STEMS) {
    autoTimer = 0;
    const ang = Math.random() * Math.PI * 2;
    const rad = rnd(0.06, 0.7);
    spawnStem(Math.cos(ang) * rad, rnd(0.5, 2.5), Math.sin(ang) * rad, {
      vxInit:    Math.cos(ang) * rnd(0.2, 0.5),
      vzInit:    Math.sin(ang) * rnd(0.2, 0.5),
      numSegs:   rnd(8, 12) | 0,
      tubeRadius: rnd(0.022, 0.040),
      stepY:     rnd(0.08, 0.14),
      driftMul:  rnd(0.6, 1.0),
    });
  }

  renderer.render(scene, camera);
}

/* ── 초기화 ── */
resizeRenderer();
seedScene();
animate();
