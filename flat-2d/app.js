const canvas = document.querySelector("#thornCanvas");
const slider = document.querySelector("#stressSlider");
const regrowButton = document.querySelector("#regrowButton");
const statusText = document.querySelector("#statusText");
const toolButtons = document.querySelectorAll(".tool-button[data-tool]");
const undoButton = document.querySelector("#undoButton");
const resetViewButton = document.querySelector("#resetViewButton");
const saveButton = document.querySelector("#saveButton");

let currentTool = "comb";
let history = [];
let isDrag = false;
let isDragged = false;
let dragPX = 0;
let dragPY = 0;
let targetRY = 0;
let targetRX = 0;
let currentRY = 0;
let currentRX = 0;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
camera.position.set(0, 3, 10);
camera.lookAt(0, 1.5, 0);

scene.add(new THREE.AmbientLight(0xffffff, 2.5));

const sun = new THREE.DirectionalLight(0xffffff, 3.5);
sun.position.set(3, 10, 5);
scene.add(sun);

const fill = new THREE.DirectionalLight(0xffffff, 1.2);
fill.position.set(-5, 3, -3);
scene.add(fill);

const pointLight = new THREE.PointLight(0xffffff, 1.5, 20);
pointLight.position.set(4, 5, 4);
scene.add(pointLight);

const group = new THREE.Group();
scene.add(group);

const stemMaterial = new THREE.MeshStandardMaterial({
  color: 0xd0cecc,
  metalness: 0.92,
  roughness: 0.18,
});

const leafMaterial = new THREE.MeshStandardMaterial({
  color: 0xb8b6b4,
  metalness: 0.92,
  roughness: 0.18,
  side: THREE.DoubleSide,
});

const crystalMaterial = new THREE.MeshPhongMaterial({
  color: 0xffffff,
  specular: 0xffffff,
  shininess: 200,
  transparent: true,
  opacity: 0.78,
  side: THREE.DoubleSide,
});

const stems = [];
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

function getStress() {
  return Number(slider?.value || 62);
}

function resizeRenderer() {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(320, Math.floor(rect.width));
  const height = Math.max(420, Math.floor(rect.height));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function setMouseNDC(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
}

function makeLeafGeometry(size) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(-size * 0.6, size * 0.2, -size * 0.5, size * 0.7, 0, size);
  shape.bezierCurveTo(size * 0.5, size * 0.7, size * 0.6, size * 0.2, 0, 0);
  return new THREE.ExtrudeGeometry(shape, { depth: 0.01, bevelEnabled: false });
}

function makeFlower() {
  const flower = new THREE.Group();

  for (let i = 0; i < 12; i += 1) {
    const phi = (i / 12) * Math.PI * 2;
    const theta = Math.PI / 6 + (i % 3) * (Math.PI / 8);
    const len = 0.35 + (i % 3) * 0.06;

    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(-0.03, len * 0.3);
    shape.lineTo(0, len);
    shape.lineTo(0.03, len * 0.3);
    shape.closePath();

    const petal = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, { depth: 0.006, bevelEnabled: false }),
      crystalMaterial.clone()
    );

    const dir = new THREE.Vector3(
      Math.sin(theta) * Math.cos(phi),
      Math.cos(theta),
      Math.sin(theta) * Math.sin(phi)
    ).normalize();

    petal.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    petal.position.copy(dir).multiplyScalar(0.05);
    flower.add(petal);
  }

  flower.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 8),
      new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 300 })
    )
  );

  return flower;
}

function clearStem(stem) {
  group.remove(stem.mesh);
  stem.mesh.geometry.dispose();
  stem.mesh.material.dispose();

  stem.thorns.forEach((thorn) => {
    group.remove(thorn);
    thorn.geometry.dispose();
    thorn.material.dispose();
  });

  stem.leaves.forEach((leaf) => {
    group.remove(leaf);
    leaf.geometry.dispose();
    leaf.material.dispose();
  });

  stem.flower.traverse((child) => {
    if (child.isMesh) {
      child.geometry.dispose();
      child.material.dispose();
    }
  });
  group.remove(stem.flower);
}

function hideStem(stem) {
  stem.removed = true;
  stem.mesh.visible = false;
  stem.thorns.forEach((thorn) => {
    thorn.visible = false;
  });
  stem.leaves.forEach((leaf) => {
    leaf.visible = false;
  });
  stem.flower.visible = false;
}

function showStem(stem) {
  stem.removed = false;
  stem.mesh.visible = true;
  stem.thorns.forEach((thorn) => {
    thorn.visible = !thorn._removed && thorn._t <= stem.progress;
  });
  stem.leaves.forEach((leaf) => {
    leaf.visible = leaf._t <= stem.progress * 0.9;
  });
  stem.flower.visible = true;
  stem.flower.scale.setScalar(Math.max(0, (stem.progress - 0.85) / 0.15) * 0.7);
}

function spawnStem(startX, startY, startZ) {
  const stress = getStress();
  const points = [];
  let cx = startX;
  let cy = startY;
  let cz = startZ;
  let vx = (Math.random() - 0.5) * (1.0 + stress * 0.003);
  let vz = (Math.random() - 0.5) * (1.0 + stress * 0.003);

  points.push(new THREE.Vector3(cx, cy, cz));

  const segmentCount = 20 + Math.floor(stress * 0.04);
  for (let i = 1; i <= segmentCount; i += 1) {
    vx += (Math.random() - 0.5) * 0.4;
    vz += (Math.random() - 0.5) * 0.4;
    vx *= 0.78;
    vz *= 0.78;
    cx += vx;
    cy += 0.22 + Math.random() * 0.06;
    cz += vz;
    points.push(new THREE.Vector3(cx, cy, cz));
  }

  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, 60, 0.07 + stress * 0.0004, 8, false);
  geo.setDrawRange(0, 0);

  const mesh = new THREE.Mesh(geo, stemMaterial.clone());
  group.add(mesh);

  const thorns = [];
  const thornCount = 10 + Math.floor(stress * 0.05);
  for (let i = 0; i < thornCount; i += 1) {
    const t = (i + 0.5) / thornCount;
    const pos = curve.getPoint(t);
    const tan = curve.getTangent(t);
    const up = new THREE.Vector3(0, 1, 0);
    const perp = new THREE.Vector3().crossVectors(tan, up).normalize();
    const angle = i * 2.618 * Math.PI;
    const dir = new THREE.Vector3(
      perp.x * Math.cos(angle) + up.x * Math.sin(angle),
      perp.y * Math.cos(angle) + up.y * Math.sin(angle),
      perp.z * Math.cos(angle) + up.z * Math.sin(angle)
    ).normalize();

    const thorn = new THREE.Mesh(
      new THREE.ConeGeometry(0.035, 0.3, 5),
      stemMaterial.clone()
    );
    thorn.position.copy(pos).addScaledVector(dir, 0.08);
    thorn.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    thorn.visible = false;
    thorn._t = t;
    thorn._removed = false;
    group.add(thorn);
    thorns.push(thorn);
  }

  const leaves = [];
  for (let i = 0; i < 5; i += 1) {
    const t = (i + 0.4) / 5;
    const pos = curve.getPoint(t);
    const tan = curve.getTangent(t);
    const size = 0.14 + Math.random() * 0.12;
    const leaf = new THREE.Mesh(makeLeafGeometry(size), leafMaterial.clone());
    const side = i % 2 === 0 ? 1 : -1;
    const dir = new THREE.Vector3(
      -tan.z * side + (Math.random() - 0.5) * 0.4,
      0.5,
      tan.x * side + (Math.random() - 0.5) * 0.4
    ).normalize();

    leaf.position.copy(pos).addScaledVector(dir, 0.14);
    leaf.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    leaf.rotation.x += (Math.random() - 0.5) * 1.2;
    leaf.rotation.y += (Math.random() - 0.5) * 1.2;
    leaf.rotation.z += (Math.random() - 0.5) * 1.2;
    leaf.visible = false;
    leaf._t = t;
    group.add(leaf);
    leaves.push(leaf);
  }

  const flower = makeFlower();
  flower.position.copy(curve.getPoint(1));
  flower.scale.setScalar(0);
  flower.rotation.y = Math.random() * Math.PI * 2;
  group.add(flower);

  const stem = {
    mesh,
    geo,
    total: geo.index ? geo.index.count : geo.attributes.position.count,
    thorns,
    leaves,
    flower,
    progress: 0,
    speed: 0.008 + stress * 0.00005,
    growing: true,
    removed: false,
  };

  stems.push(stem);
  return stem;
}

function buildInitialStems() {
  spawnStem(-0.1, 0, -0.1);
  spawnStem(0, 0, 0.1);
  spawnStem(0.1, 0, -0.05);
}

function activeStemCount() {
  return stems.filter((stem) => !stem.removed).length;
}

function updateStatus(message) {
  const stress = getStress();
  const label = stress < 31 ? "LOW TENSION" : stress < 66 ? "CHRONIC TENSION" : "OVERGROWTH";
  const density = Math.min(100, Math.round((activeStemCount() / 30) * 100));
  if (statusText) {
    statusText.textContent = `${message} | ${label} | Density ${density}%`;
  }
}

function seedScene() {
  stems.forEach(clearStem);
  stems.length = 0;
  history.length = 0;
  targetRY = 0;
  targetRX = 0;
  currentRY = 0;
  currentRX = 0;
  buildInitialStems();
  updateStatus("Comb: click to grow, drag to rotate.");
}

function plantAt(clientX, clientY) {
  setMouseNDC(clientX, clientY);
  raycaster.setFromCamera(mouse, camera);
  const target = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, target);

  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  target.applyMatrix4(inv);

  const stem = spawnStem(target.x, Math.max(target.y - 1, -0.5), target.z);
  history.push({ type: "plant", stem });
  updateStatus("Branch planted.");
}

function cutAt(clientX, clientY) {
  setMouseNDC(clientX, clientY);
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(
    stems.filter((stem) => !stem.removed).map((stem) => stem.mesh)
  );

  if (!hits.length) {
    updateStatus("Cut: click directly on a vine stem.");
    return;
  }

  const stem = stems.find((item) => item.mesh === hits[0].object);
  if (!stem) return;
  hideStem(stem);
  history.push({ type: "cut", stem });
  updateStatus("Vine stem clipped.");
}

function pluckAt(clientX, clientY) {
  setMouseNDC(clientX, clientY);
  raycaster.setFromCamera(mouse, camera);
  const visibleThorns = stems.flatMap((stem) =>
    stem.removed ? [] : stem.thorns.filter((thorn) => thorn.visible && !thorn._removed)
  );
  const hits = raycaster.intersectObjects(visibleThorns);

  if (!hits.length) {
    updateStatus("Pluck: click on a visible thorn.");
    return;
  }

  const thorn = hits[0].object;
  thorn.visible = false;
  thorn._removed = true;
  history.push({ type: "pluck", thorn });
  updateStatus("Thorn removed.");
}

function performClickAction(clientX, clientY) {
  if (currentTool === "cut") cutAt(clientX, clientY);
  if (currentTool === "comb") plantAt(clientX, clientY);
  if (currentTool === "pluck") pluckAt(clientX, clientY);
}

function undoLastAction() {
  const action = history.pop();
  if (!action) {
    updateStatus("Nothing to undo.");
    return;
  }

  if (action.type === "cut") {
    showStem(action.stem);
  }

  if (action.type === "pluck") {
    action.thorn._removed = false;
    action.thorn.visible = true;
  }

  if (action.type === "plant") {
    hideStem(action.stem);
  }

  updateStatus("Last action undone.");
}

function resetView() {
  targetRY = 0;
  targetRX = 0;
  updateStatus("View reset.");
}

function saveSpecimen() {
  renderer.render(scene, camera);
  const link = document.createElement("a");
  link.download = `stress-gardening-flat-${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
  updateStatus("Specimen saved.");
}

toolButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentTool = button.dataset.tool;
    toolButtons.forEach((item) => item.classList.toggle("active", item === button));

    const labels = {
      cut: "Cut: click on a vine stem to remove it.",
      comb: "Comb: click to grow, drag to rotate.",
      pluck: "Pluck: click on a thorn to remove it.",
    };
    updateStatus(labels[currentTool]);
  });
});

canvas.addEventListener("mousedown", (event) => {
  isDrag = true;
  isDragged = false;
  dragPX = event.clientX;
  dragPY = event.clientY;
});

window.addEventListener("mousemove", (event) => {
  if (!isDrag) return;
  const dx = event.clientX - dragPX;
  const dy = event.clientY - dragPY;
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragged = true;
  targetRY += dx * 0.007;
  targetRX += dy * 0.004;
  targetRX = Math.max(-0.5, Math.min(0.5, targetRX));
  dragPX = event.clientX;
  dragPY = event.clientY;
});

window.addEventListener("mouseup", (event) => {
  if (!isDragged) performClickAction(event.clientX, event.clientY);
  isDrag = false;
  isDragged = false;
});

canvas.addEventListener(
  "touchstart",
  (event) => {
    const touch = event.touches[0];
    isDrag = true;
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
    if (!isDrag) return;
    const touch = event.touches[0];
    const dx = touch.clientX - dragPX;
    const dy = touch.clientY - dragPY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) isDragged = true;
    targetRY += dx * 0.007;
    targetRX += dy * 0.004;
    targetRX = Math.max(-0.5, Math.min(0.5, targetRX));
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
  isDrag = false;
  isDragged = false;
});

slider?.addEventListener("input", () => updateStatus("Stress level changed."));
regrowButton?.addEventListener("click", seedScene);
undoButton?.addEventListener("click", undoLastAction);
resetViewButton?.addEventListener("click", resetView);
saveButton?.addEventListener("click", saveSpecimen);

window.addEventListener("keydown", (event) => {
  if (event.key === "r" || event.key === "R") seedScene();
});

window.addEventListener("resize", resizeRenderer);

function animate() {
  requestAnimationFrame(animate);

  currentRY += (targetRY - currentRY) * 0.08;
  currentRX += (targetRX - currentRX) * 0.08;
  group.rotation.y = currentRY;
  group.rotation.x = currentRX;

  stems.forEach((stem) => {
    if (!stem.growing || stem.removed) return;
    stem.progress = Math.min(1, stem.progress + stem.speed);
    stem.geo.setDrawRange(0, Math.floor(stem.progress * stem.total));
    stem.thorns.forEach((thorn) => {
      thorn.visible = !thorn._removed && thorn._t <= stem.progress;
    });
    stem.leaves.forEach((leaf) => {
      leaf.visible = leaf._t <= stem.progress * 0.9;
    });
    const flowerProgress = Math.max(0, (stem.progress - 0.85) / 0.15);
    stem.flower.scale.setScalar(flowerProgress * 0.7);
    if (stem.progress >= 1) stem.growing = false;
  });

  renderer.render(scene, camera);
}

resizeRenderer();
seedScene();
animate();
