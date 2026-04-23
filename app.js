const canvas = document.querySelector("#thornCanvas");
const ctx = canvas.getContext("2d");
const slider = document.querySelector("#stressSlider");
const regrowButton = document.querySelector("#regrowButton");
const statusText = document.querySelector("#statusText");
const toolButtons = document.querySelectorAll(".tool-button[data-tool]");
const undoButton = document.querySelector("#undoButton");
const resetViewButton = document.querySelector("#resetViewButton");
const saveButton = document.querySelector("#saveButton");

let width = 0;
let height = 0;
let pixelRatio = 1;
let frame = 0;
let roots = [];
let particles = [];
let currentTool = "cut";
let isPointerDown = false;
let pointerDownX = 0;
let pointerDownY = 0;
let pointerMoved = false;
let autoTimer = 0;
let cachedStems = [];
let history = [];
let currentCombChanges = null;
let cameraYaw = -0.22;
let cameraPitch = 0.08;
let targetYaw = -0.22;
let targetPitch = 0.08;

const cameraDistance = 780;
const focalLength = 760;

const pointer = {
  x: 0,
  y: 0,
  lastX: 0,
  lastY: 0,
  vx: 0,
  vy: 0,
};

function resizeCanvas() {
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * pixelRatio);
  canvas.height = Math.floor(height * pixelRatio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function remember(action) {
  history.push(action);
  if (history.length > 24) history.shift();
}

function v3(x = 0, y = 0, z = 0) {
  return { x, y, z };
}

function add(a, b) {
  return v3(a.x + b.x, a.y + b.y, a.z + b.z);
}

function scale(a, s) {
  return v3(a.x * s, a.y * s, a.z * s);
}

function lerp(a, b, t) {
  return v3(
    a.x + (b.x - a.x) * t,
    a.y + (b.y - a.y) * t,
    a.z + (b.z - a.z) * t
  );
}

function normalize(a) {
  const length = Math.hypot(a.x, a.y, a.z) || 1;
  return v3(a.x / length, a.y / length, a.z / length);
}

function rotateForCamera(point) {
  const cosY = Math.cos(cameraYaw);
  const sinY = Math.sin(cameraYaw);
  const x1 = point.x * cosY - point.z * sinY;
  const z1 = point.x * sinY + point.z * cosY;

  const cosX = Math.cos(cameraPitch);
  const sinX = Math.sin(cameraPitch);
  const y2 = point.y * cosX - z1 * sinX;
  const z2 = point.y * sinX + z1 * cosX;

  return v3(x1, y2, z2);
}

function project(point) {
  const rotated = rotateForCamera(point);
  const depth = cameraDistance + rotated.z;
  const perspective = focalLength / Math.max(120, depth);
  const vy = width < 720 ? height * 0.42 : height * 0.58;

  return {
    x: width * 0.55 + rotated.x * perspective,
    y: vy - rotated.y * perspective,
    z: rotated.z,
    s: perspective,
  };
}

function getPointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function updatePointer(event) {
  const position = getPointerPosition(event);
  pointer.lastX = pointer.x;
  pointer.lastY = pointer.y;
  pointer.x = position.x;
  pointer.y = position.y;
  pointer.vx = pointer.x - pointer.lastX;
  pointer.vy = pointer.y - pointer.lastY;
  if (!isPointerDown) {
    targetYaw = clamp((pointer.x / width - 0.5) * 0.48, -0.42, 0.42);
    targetPitch = clamp((pointer.y / height - 0.5) * -0.22, -0.16, 0.16);
  }
  return position;
}

function screenToWorld(x, y, z = randomBetween(-70, 70)) {
  const perspective = focalLength / Math.max(120, cameraDistance + z);
  const vy = width < 720 ? height * 0.42 : height * 0.58;
  return v3(
    (x - width * 0.55) / perspective,
    (vy - y) / perspective,
    z
  );
}

class Thorn {
  constructor(t, side, roll, size) {
    this.t = t;
    this.side = side;
    this.roll = roll;
    this.size = size;
    this.removed = false;
  }
}

class Stem3D {
  constructor(start, yaw, pitch, depth, maxDepth, radius) {
    this.start = start;
    this.yaw = yaw;
    this.pitch = pitch;
    this.depth = depth;
    this.maxDepth = maxDepth;
    this.radius = radius;
    this.length = 0;
    this.targetLength = randomBetween(90, 168) - depth * 12;
    this.speed = randomBetween(0.18, 0.38);
    this.curve = v3(randomBetween(-42, 42), randomBetween(-18, 34), randomBetween(-58, 58));
    this.bend = v3();
    this.velocity = v3();
    this.phase = Math.random() * Math.PI * 2;
    this.children = [];
    this.thorns = [];
    this.done = false;
    this.spawned = false;
    this.removed = false;
    this.lastThornAt = 0;
    this.thornSpacing = randomBetween(20, 34);
  }

  direction() {
    const cp = Math.cos(this.pitch);
    return normalize(v3(
      Math.cos(this.yaw) * cp,
      Math.sin(this.pitch),
      Math.sin(this.yaw) * cp
    ));
  }

  endPoint(lengthOverride = this.length) {
    return add(this.start, add(scale(this.direction(), lengthOverride), this.bend));
  }

  controlPoint(lengthOverride = this.length) {
    const halfway = add(this.start, scale(this.direction(), lengthOverride * 0.52));
    const stress = Number(slider.value);
    const swayAmp = (10 - this.depth * 1.2) * (1 + stress * 0.016);
    const living = Math.sin(frame * 0.018 + this.phase) * swayAmp;
    return add(halfway, add(scale(this.curve, 0.55), v3(0, living, 0)));
  }

  pointAt(t) {
    const lengthAtT = this.length * t;
    const start = this.start;
    const control = this.controlPoint(lengthAtT);
    const end = this.endPoint(lengthAtT);
    const a = lerp(start, control, t);
    const b = lerp(control, end, t);
    return lerp(a, b, t);
  }

  update() {
    if (this.removed) return;

    this.velocity.x *= 0.82;
    this.velocity.y *= 0.82;
    this.velocity.z *= 0.82;
    this.bend = add(this.bend, this.velocity);

    if (!this.done) {
      this.yaw += Math.sin(frame * 0.012 + this.phase) * 0.0014;
      this.pitch += Math.cos(frame * 0.01 + this.phase) * 0.0008;
      this.length = Math.min(this.length + this.speed, this.targetLength);

      if (this.length - this.lastThornAt > this.thornSpacing && this.depth > 0) {
        this.thorns.push(new Thorn(
          this.length / this.targetLength,
          Math.random() < 0.5 ? -1 : 1,
          randomBetween(-Math.PI, Math.PI),
          randomBetween(12, 22) - this.depth * 1.4
        ));
        this.lastThornAt = this.length;
      }

      if (this.length >= this.targetLength) {
        this.done = true;
        if (!this.spawned && this.depth < this.maxDepth) {
          this.spawned = true;
          this.spawnChildren();
        }
      }
    }

    this.children.forEach((child) => child.update());
  }

  spawnChildren() {
    const end = this.endPoint();
    const childCount = this.depth < 2 ? 2 + Math.floor(Math.random() * 2) : 2;

    for (let i = 0; i < childCount; i += 1) {
      const side = i % 2 === 0 ? 1 : -1;
      const child = new Stem3D(
        end,
        this.yaw + side * randomBetween(0.36, 0.82),
        this.pitch + randomBetween(-0.34, 0.38),
        this.depth + 1,
        this.maxDepth,
        this.radius * 0.68
      );
      child.curve.z += side * randomBetween(18, 64);
      this.children.push(child);
    }
  }

  collect(list) {
    if (!this.removed) list.push(this);
    this.children.forEach((child) => child.collect(list));
  }
}

function allStems() {
  const stems = [];
  roots.forEach((root) => root.collect(stems));
  return stems;
}

function addRoot3D(x, y, z, yaw, pitch, countOverride = null) {
  const stress = Number(slider.value);
  const count = countOverride ?? 2 + Math.floor(Math.random() * 3);
  const created = [];

  for (let i = 0; i < count; i += 1) {
    const root = new Stem3D(
      v3(x + randomBetween(-18, 18), y + randomBetween(-16, 16), z + randomBetween(-20, 20)),
      yaw + randomBetween(-0.38, 0.38),
      pitch + randomBetween(-0.28, 0.28),
      0,
      4 + Math.floor(Math.random() * 2),
      8.4 + Math.random() * 2.8 + stress * 0.025 + (width < 720 ? 4 : 0)
    );
    roots.push(root);
    created.push(root);
  }

  return created;
}

function seedScene() {
  roots = [];
  particles = [];
  history = [];
  currentCombChanges = null;
  autoTimer = 0;
  const mobileCount = width < 720 ? 2 : 1;
  addRoot3D(-240, -180, 30, 0.4, 0.74, mobileCount);
  addRoot3D(120, -195, -40, Math.PI - 0.22, 0.78, mobileCount);
  cachedStems = allStems();
  updateStatus("Comb: click to grow, drag to sculpt. Cut to trim.");
}

function drawBackground() {
  ctx.fillStyle = "rgba(253, 253, 252, 0.94)";
  ctx.fillRect(0, 0, width, height);

  const plate = project(v3(0, -205, 0));
  const rx = 280 * plate.s;
  const ry = 60 * plate.s;
  const angle = -cameraYaw * 0.32;
  ctx.save();

  // outer chrome ring shadow
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = "#0a0c0b";
  ctx.lineWidth = 4 * plate.s;
  ctx.beginPath();
  ctx.ellipse(plate.x, plate.y + 3 * plate.s, rx, ry, angle, 0, Math.PI * 2);
  ctx.stroke();

  // chrome ring base
  ctx.globalAlpha = 0.72;
  const ringGrad = ctx.createLinearGradient(plate.x - rx, plate.y, plate.x + rx, plate.y);
  ringGrad.addColorStop(0,    "#0c0e0d");
  ringGrad.addColorStop(0.22, "#5a6660");
  ringGrad.addColorStop(0.42, "#d8e4e0");
  ringGrad.addColorStop(0.58, "#c0ccca");
  ringGrad.addColorStop(0.78, "#4a5450");
  ringGrad.addColorStop(1,    "#0c0e0d");
  ctx.strokeStyle = ringGrad;
  ctx.lineWidth = 7 * plate.s;
  ctx.beginPath();
  ctx.ellipse(plate.x, plate.y, rx, ry, angle, 0, Math.PI * 2);
  ctx.stroke();

  // inner fill
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "rgba(200, 215, 210, 1)";
  ctx.beginPath();
  ctx.ellipse(plate.x, plate.y, rx - 2 * plate.s, ry - 2 * plate.s, angle, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function pathSamples(stem, count = 10) {
  const samples = [];
  for (let i = 0; i <= count; i += 1) {
    const world = stem.pointAt(i / count);
    samples.push({ screen: project(world) });
  }
  return samples;
}

function drawTubeSegment(a, b, radius, alpha) {
  const dx = b.screen.x - a.screen.x;
  const dy = b.screen.y - a.screen.y;
  const lineWidth = Math.max(1, radius * (a.screen.s + b.screen.s) * 0.5);

  // 줄기 수직 방향(단면) 노멀 벡터
  const normalLength = Math.hypot(dx, dy) || 1;
  const nx = -dy / normalLength;
  const ny = dx / normalLength;

  // 세그먼트 중점에서 노멀 방향으로 그라디언트 (단면 크롬 반사)
  const mx = (a.screen.x + b.screen.x) * 0.5;
  const my = (a.screen.y + b.screen.y) * 0.5;
  const hw = lineWidth * 0.5;
  const grad = ctx.createLinearGradient(
    mx - nx * hw, my - ny * hw,
    mx + nx * hw, my + ny * hw
  );
  grad.addColorStop(0,    "#080a09");
  grad.addColorStop(0.14, "#252e2c");
  grad.addColorStop(0.36, "#daeae6");
  grad.addColorStop(0.52, "#b8ccc8");
  grad.addColorStop(0.70, "#384440");
  grad.addColorStop(0.86, "#161c1a");
  grad.addColorStop(1,    "#060808");

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // 외곽 그림자
  ctx.strokeStyle = "rgba(4, 6, 5, 0.48)";
  ctx.lineWidth = lineWidth + 5;
  ctx.beginPath();
  ctx.moveTo(a.screen.x, a.screen.y);
  ctx.lineTo(b.screen.x, b.screen.y);
  ctx.stroke();

  // 메인 크롬 단면 그라디언트
  ctx.strokeStyle = grad;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(a.screen.x, a.screen.y);
  ctx.lineTo(b.screen.x, b.screen.y);
  ctx.stroke();

  // 하이라이트 반사선 (빛이 닿는 쪽)
  ctx.globalCompositeOperation = "screen";
  ctx.strokeStyle = "rgba(242, 252, 250, 0.72)";
  ctx.lineWidth = Math.max(0.6, lineWidth * 0.12);
  ctx.beginPath();
  ctx.moveTo(a.screen.x + nx * lineWidth * 0.20, a.screen.y + ny * lineWidth * 0.20);
  ctx.lineTo(b.screen.x + nx * lineWidth * 0.20, b.screen.y + ny * lineWidth * 0.20);
  ctx.stroke();
  ctx.restore();
}

function drawThorn(stem, thorn) {
  if (thorn.removed || thorn.t > stem.length / stem.targetLength) return;

  const baseWorld = stem.pointAt(thorn.t);
  const base = project(baseWorld);
  const tangentWorld = normalize(add(stem.pointAt(Math.min(1, thorn.t + 0.04)), scale(baseWorld, -1)));
  const normalWorld = normalize(v3(
    -tangentWorld.z * thorn.side + Math.cos(thorn.roll) * 0.25,
    0.38 + Math.sin(thorn.roll) * 0.34,
    tangentWorld.x * thorn.side
  ));
  const tip = project(add(baseWorld, scale(normalWorld, thorn.size)));
  const side = project(add(baseWorld, scale(v3(normalWorld.z, -normalWorld.x, normalWorld.y), thorn.size * 0.22)));
  const side2 = project(add(baseWorld, scale(v3(-normalWorld.z, normalWorld.x, -normalWorld.y), thorn.size * 0.22)));

  const thornGrad = ctx.createLinearGradient(base.x, base.y, tip.x, tip.y);
  thornGrad.addColorStop(0,    "#020202");
  thornGrad.addColorStop(0.30, "#080808");
  thornGrad.addColorStop(0.55, "#1e2422");
  thornGrad.addColorStop(0.72, "#040404");
  thornGrad.addColorStop(1,    "#000000");

  ctx.save();
  ctx.fillStyle = thornGrad;
  ctx.strokeStyle = "rgba(220, 238, 234, 0.18)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(side.x, side.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.lineTo(side2.x, side2.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.globalCompositeOperation = "screen";
  ctx.strokeStyle = "rgba(240, 252, 248, 0.55)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(base.x, base.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();
  ctx.restore();
}

function buildRenderQueue() {
  const items = [];
  cachedStems.forEach((stem) => {
    const sampleCount = Math.max(4, Math.floor(stem.length / 18));
    const samples = pathSamples(stem, sampleCount);

    for (let i = 0; i < samples.length - 1; i += 1) {
      items.push({
        type: "tube",
        depth: (samples[i].screen.z + samples[i + 1].screen.z) * 0.5,
        stem,
        a: samples[i],
        b: samples[i + 1],
      });
    }

    stem.thorns.forEach((thorn) => {
      const p = project(stem.pointAt(thorn.t));
      items.push({ type: "thorn", depth: p.z + 6, stem, thorn });
    });
  });

  items.sort((a, b) => a.depth - b.depth);
  return items;
}

function drawScene() {
  buildRenderQueue().forEach((item) => {
    const alpha = Math.max(0.25, 1 - item.stem.depth * 0.13);
    if (item.type === "tube") {
      drawTubeSegment(item.a, item.b, item.stem.radius, alpha);
    } else {
      drawThorn(item.stem, item.thorn);
    }
  });
}

function updateScene() {
  cameraYaw += (targetYaw - cameraYaw) * 0.045;
  cameraPitch += (targetPitch - cameraPitch) * 0.045;
  roots.forEach((root) => root.update());

  autoTimer += 1;
  const stress = Number(slider.value);
  const interval = Math.max(170, 360 - stress * 1.2);
  if (autoTimer > interval && roots.length < 70) {
    autoTimer = 0;
    const side = Math.random();
    if (side < 0.35) addRoot3D(randomBetween(-360, 360), -220, randomBetween(-80, 80), randomBetween(0, Math.PI * 2), randomBetween(0.42, 1.1), 1);
    else if (side < 0.68) addRoot3D(-440, randomBetween(-90, 80), randomBetween(-90, 90), 0, randomBetween(-0.15, 0.28), 1);
    else addRoot3D(440, randomBetween(-90, 80), randomBetween(-90, 90), Math.PI, randomBetween(-0.15, 0.28), 1);
  }

  if (roots.length > 90) roots.splice(0, 8);
}

function plantAtScreen(x, y) {
  const world = screenToWorld(x, y);
  const movementAngle = Math.atan2(-pointer.vy, pointer.vx || 0.001);
  const yaw = Number.isFinite(movementAngle) ? movementAngle : randomBetween(0, Math.PI * 2);
  const pitch = randomBetween(-0.08, 0.32);

  const created = addRoot3D(world.x, world.y, world.z, yaw, pitch, 1);
  remember({ type: "plant", roots: created });
  updateStatus("Growth planted from your click.");
}

function nearestStemTip(x, y) {
  let best = null;
  cachedStems.forEach((stem) => {
    if (stem.depth < 2 || stem.children.some((child) => !child.removed)) return;
    const end = project(stem.endPoint());
    const distance = Math.hypot(end.x - x, end.y - y);
    const edgeBias = Math.min(end.x, width - end.x, end.y, height - end.y);
    const score = distance + edgeBias * 0.1 - stem.depth * 12;
    if (distance < 96 && (!best || score < best.score)) best = { stem, end, score };
  });
  return best;
}

function cutAt(x, y) {
  const hit = nearestStemTip(x, y);
  if (!hit) {
    updateStatus("Cut the outer 3D tips.");
    return;
  }

  remember({ type: "cut", stem: hit.stem });
  hit.stem.removed = true;
  spawnParticles(hit.end.x, hit.end.y, 12);
  updateStatus("3D vine tip clipped.");
}

function combAt(x, y) {
  let touched = 0;
  cachedStems.forEach((stem) => {
    const mid = project(stem.pointAt(0.55));
    const distance = Math.hypot(mid.x - x, mid.y - y);
    if (distance > 150) return;

    const influence = Math.pow(1 - distance / 150, 2);
    if (currentCombChanges && !currentCombChanges.has(stem)) {
      currentCombChanges.set(stem, {
        x: stem.bend.x,
        y: stem.bend.y,
        z: stem.bend.z,
      });
    }
    stem.velocity.x += pointer.vx * 0.018 * influence;
    stem.velocity.y += -pointer.vy * 0.014 * influence;
    stem.velocity.z += (x - mid.x) * 0.01 * influence;
    stem.bend.x += pointer.vx * 0.42 * influence;
    stem.bend.y += -pointer.vy * 0.34 * influence;
    stem.bend.z += (x - mid.x) * 0.018 * influence;
    stem.bend.x = clamp(stem.bend.x, -280, 280);
    stem.bend.y = clamp(stem.bend.y, -280, 280);
    stem.bend.z = clamp(stem.bend.z, -280, 280);
    touched += 1;
  });

  updateStatus(touched ? "Vines hold the dragged shape." : "Touch closer to the 3D vines.");
}

function pluckAt(x, y) {
  let best = null;
  cachedStems.forEach((stem) => {
    stem.thorns.forEach((thorn) => {
      if (thorn.removed || thorn.t > stem.length / stem.targetLength) return;
      const p = project(stem.pointAt(thorn.t));
      const distance = Math.hypot(p.x - x, p.y - y);
      if (distance < 64 && (!best || distance < best.distance)) best = { stem, thorn, p, distance };
    });
  });

  if (!best) {
    updateStatus("Pick a visible black thorn.");
    return;
  }

  remember({ type: "pluck", thorn: best.thorn });
  best.thorn.removed = true;
  spawnParticles(best.p.x, best.p.y, 5);
  updateStatus("3D thorn removed.");
}

function useToolAt(x, y) {
  if (currentTool === "cut") cutAt(x, y);
  if (currentTool === "comb") combAt(x, y);
  if (currentTool === "pluck") pluckAt(x, y);
}

function spawnParticles(x, y, count) {
  for (let i = 0; i < count; i += 1) {
    particles.push({
      x,
      y,
      vx: randomBetween(-1.8, 1.8),
      vy: randomBetween(-2.2, 0.7),
      size: randomBetween(1.5, 4.4),
      age: 0,
      life: randomBetween(360, 820),
    });
  }
}

function drawParticles() {
  particles = particles.filter((particle) => {
    particle.age += 16;
    particle.vy += 0.07;
    particle.x += particle.vx;
    particle.y += particle.vy;
    const alpha = 1 - particle.age / particle.life;
    if (alpha <= 0) return false;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#111412";
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    ctx.restore();
    return true;
  });
}

function updateStatus(message) {
  const growth = Math.min(100, Math.round((cachedStems.length / 260) * 100));
  const stress = Number(slider.value);
  const label = stress < 31 ? "LOW TENSION" : stress < 66 ? "CHRONIC TENSION" : "OVERGROWTH";
  statusText.textContent = `${message} | ${label} | Depth ${growth}%`;
}

function undoLastAction() {
  const action = history.pop();
  if (!action) {
    updateStatus("Nothing to undo.");
    return;
  }

  if (action.type === "cut") {
    action.stem.removed = false;
  }

  if (action.type === "pluck") {
    action.thorn.removed = false;
  }

  if (action.type === "plant") {
    roots = roots.filter((root) => !action.roots.includes(root));
  }

  if (action.type === "comb") {
    action.changes.forEach((bend, stem) => {
      stem.bend.x = bend.x;
      stem.bend.y = bend.y;
      stem.bend.z = bend.z;
      stem.velocity = v3();
    });
  }

  cachedStems = allStems();
  updateStatus("Last action undone.");
}

function resetView() {
  cameraYaw = -0.22;
  cameraPitch = 0.08;
  targetYaw = -0.22;
  targetPitch = 0.08;
  updateStatus("View reset.");
}

function saveSpecimen() {
  const off = document.createElement("canvas");
  off.width = canvas.width;
  off.height = canvas.height;
  const offCtx = off.getContext("2d");
  offCtx.fillStyle = "#f8f9f8";
  offCtx.fillRect(0, 0, off.width, off.height);
  offCtx.drawImage(canvas, 0, 0);
  const link = document.createElement("a");
  link.download = `stress-gardening-${Date.now()}.png`;
  link.href = off.toDataURL("image/png");
  link.click();
  updateStatus("Specimen saved.");
}

function loop() {
  requestAnimationFrame(loop);
  frame += 1;
  cachedStems = allStems();
  updateScene();
  drawBackground();
  drawScene();
  drawParticles();
}

toolButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentTool = button.dataset.tool;
    toolButtons.forEach((item) => item.classList.toggle("active", item === button));
    const labels = {
      cut: "Cut: trim outer 3D tips.",
      comb: "Comb: click to grow, drag to sculpt.",
      pluck: "Pluck: remove black thorns.",
    };
    updateStatus(labels[currentTool]);
  });
});

canvas.addEventListener("pointerdown", (event) => {
  isPointerDown = true;
  canvas.setPointerCapture(event.pointerId);
  const position = updatePointer(event);
  pointerDownX = position.x;
  pointerDownY = position.y;
  pointerMoved = false;
  currentCombChanges = currentTool === "comb" ? new Map() : null;
  if (currentTool !== "comb") useToolAt(position.x, position.y);
});

canvas.addEventListener("pointermove", (event) => {
  const position = updatePointer(event);
  if (!isPointerDown) return;
  const dragDistance = Math.hypot(position.x - pointerDownX, position.y - pointerDownY);
  if (dragDistance > 6) pointerMoved = true;

  if (currentTool === "comb") {
    combAt(position.x, position.y);
  } else {
    useToolAt(position.x, position.y);
  }
});

canvas.addEventListener("pointerup", (event) => {
  const position = updatePointer(event);
  if (currentTool === "comb" && !pointerMoved) {
    plantAtScreen(position.x, position.y);
  }
  if (currentTool === "comb" && pointerMoved && currentCombChanges && currentCombChanges.size) {
    remember({ type: "comb", changes: currentCombChanges });
  }

  isPointerDown = false;
  currentCombChanges = null;
  pointer.vx = 0;
  pointer.vy = 0;
});

canvas.addEventListener("pointercancel", () => {
  isPointerDown = false;
  pointerMoved = false;
  currentCombChanges = null;
  pointer.vx = 0;
  pointer.vy = 0;
});

slider.addEventListener("input", () => updateStatus("Stress growth changed."));
regrowButton.addEventListener("click", seedScene);
undoButton?.addEventListener("click", undoLastAction);
resetViewButton?.addEventListener("click", resetView);
saveButton?.addEventListener("click", saveSpecimen);

let wasMobile = window.innerWidth < 720;
window.addEventListener("resize", () => {
  const isMobile = window.innerWidth < 720;
  resizeCanvas();
  if (isMobile !== wasMobile) { wasMobile = isMobile; seedScene(); }
});

resizeCanvas();
seedScene();
loop();
