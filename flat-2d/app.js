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
let stems = [];
let particles = [];
let history = [];
let currentTool = "cut";
let isPointerDown = false;
let pointerDownX = 0;
let pointerDownY = 0;
let pointerMoved = false;
let currentCombChanges = null;
let autoTimer = 0;

const pointer = { x: 0, y: 0, lastX: 0, lastY: 0, vx: 0, vy: 0 };

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

function randomBetween(min, max) { return min + Math.random() * (max - min); }
function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }
function remember(action) {
  history.push(action);
  if (history.length > 24) history.shift();
}

function getPointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function updatePointer(event) {
  const position = getPointerPosition(event);
  pointer.lastX = pointer.x;
  pointer.lastY = pointer.y;
  pointer.x = position.x;
  pointer.y = position.y;
  pointer.vx = pointer.x - pointer.lastX;
  pointer.vy = pointer.y - pointer.lastY;
  return position;
}

class Stem2D {
  constructor(x, y, angle, depth, maxDepth, thickness) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.depth = depth;
    this.maxDepth = maxDepth;
    this.thickness = thickness;
    this.length = 0;
    this.targetLength = randomBetween(54, 118) - depth * 8;
    this.speed = randomBetween(0.22, 0.48);
    this.curve = randomBetween(-0.018, 0.018);
    this.bendX = 0;
    this.bendY = 0;
    this.vx = 0;
    this.vy = 0;
    this.phase = Math.random() * Math.PI * 2;
    this.done = false;
    this.spawned = false;
    this.removed = false;
    this.children = [];
    this.thorns = [];
    this.lastThornAt = 0;
    this.thornSpacing = randomBetween(15, 27);
  }

  endPoint() {
    const sway = Math.sin(frame * 0.018 + this.phase) * (2.6 - this.depth * 0.25);
    return {
      x: this.x + Math.cos(this.angle) * this.length + this.bendX + Math.cos(this.angle + Math.PI / 2) * sway,
      y: this.y + Math.sin(this.angle) * this.length + this.bendY + Math.sin(this.angle + Math.PI / 2) * sway,
    };
  }

  pointAt(t) {
    const ex = this.x + Math.cos(this.angle) * this.length * t + this.bendX * t;
    const ey = this.y + Math.sin(this.angle) * this.length * t + this.bendY * t;
    const wave = Math.sin(t * Math.PI + this.phase + frame * 0.014) * 18 * (1 - this.depth * 0.1);
    return {
      x: ex + Math.cos(this.angle + Math.PI / 2) * wave * t,
      y: ey + Math.sin(this.angle + Math.PI / 2) * wave * t,
    };
  }

  update() {
    if (this.removed) return;
    this.vx *= 0.82;
    this.vy *= 0.82;
    this.bendX += this.vx;
    this.bendY += this.vy;

    if (!this.done) {
      this.angle += this.curve;
      this.length = Math.min(this.length + this.speed, this.targetLength);
      if (this.length - this.lastThornAt > this.thornSpacing && this.depth > 0) {
        this.thorns.push({ t: this.length / this.targetLength, side: Math.random() < 0.5 ? -1 : 1, size: randomBetween(8, 16), removed: false });
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
      const child = new Stem2D(end.x, end.y, this.angle + side * randomBetween(0.42, 0.9), this.depth + 1, this.maxDepth, this.thickness * 0.68);
      this.children.push(child);
    }
  }

  collect(list) {
    if (!this.removed) list.push(this);
    this.children.forEach((child) => child.collect(list));
  }
}

function collectStems() {
  stems = [];
  roots.forEach((root) => root.collect(stems));
}

function addRoot(x, y, angle = -Math.PI / 2, count = 1) {
  const created = [];
  const stress = Number(slider.value);
  for (let i = 0; i < count; i += 1) {
    const root = new Stem2D(x + randomBetween(-12, 12), y + randomBetween(-10, 10), angle + randomBetween(-0.7, 0.7), 0, 4 + Math.floor(Math.random() * 2), 4.5 + stress * 0.025);
    roots.push(root);
    created.push(root);
  }
  return created;
}

function seedScene() {
  roots = [];
  particles = [];
  history = [];
  autoTimer = 0;
  addRoot(width * 0.38, height * 0.78, -Math.PI / 2, 1);
  addRoot(width * 0.62, height * 0.82, -Math.PI / 2, 1);
  updateStatus("Comb: click to grow, drag to sculpt.");
}

function drawBackground() {
  ctx.fillStyle = "rgba(253, 253, 252, 0.94)";
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = "#050605";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(width * 0.56, height * 0.78, Math.min(310, width * 0.24), 48, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawSmoothPath(points, lineWidth, color) {
  if (points.length < 2) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 1; i += 1) {
    const midX = (points[i].x + points[i + 1].x) * 0.5;
    const midY = (points[i].y + points[i + 1].y) * 0.5;
    ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
}

function drawStem(stem) {
  if (stem.removed) return;
  const samples = [];
  for (let i = 0; i <= 14; i += 1) samples.push(stem.pointAt(i / 14));
  const alpha = Math.max(0.22, 1 - stem.depth * 0.14);
  const widthBase = Math.max(0.5, stem.thickness * (1 - stem.depth * 0.12));
  ctx.save();
  ctx.globalAlpha = alpha;
  drawSmoothPath(samples, widthBase + 4.5, "rgba(5, 6, 5, 0.12)");
  drawSmoothPath(samples, widthBase + 1.4, "#050605");
  drawSmoothPath(samples, Math.max(0.7, widthBase * 0.32), "rgba(248, 249, 248, 0.52)");

  stem.thorns.forEach((thorn) => {
    if (thorn.removed || thorn.t > stem.length / stem.targetLength) return;
    const base = stem.pointAt(thorn.t);
    const ahead = stem.pointAt(Math.min(1, thorn.t + 0.04));
    const angle = Math.atan2(ahead.y - base.y, ahead.x - base.x) + Math.PI / 2 * thorn.side;
    const tip = { x: base.x + Math.cos(angle) * thorn.size, y: base.y + Math.sin(angle) * thorn.size };
    const sideA = angle + Math.PI / 2;
    const b = thorn.size * 0.28;
    ctx.fillStyle = "#050605";
    ctx.beginPath();
    ctx.moveTo(base.x + Math.cos(sideA) * b, base.y + Math.sin(sideA) * b);
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(base.x - Math.cos(sideA) * b, base.y - Math.sin(sideA) * b);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
  stem.children.forEach(drawStem);
}

function updateScene() {
  roots.forEach((root) => root.update());
  autoTimer += 1;
  const stress = Number(slider.value);
  const interval = Math.max(180, 380 - stress * 1.3);
  if (autoTimer > interval && roots.length < 70) {
    autoTimer = 0;
    addRoot(randomBetween(width * 0.18, width * 0.82), height + 8, -Math.PI / 2, 1);
  }
  if (roots.length > 90) roots.splice(0, 8);
}

function plantAt(x, y) {
  const angle = Math.atan2(-pointer.vy, pointer.vx || 0.001);
  const created = addRoot(x, y, Number.isFinite(angle) ? angle : -Math.PI / 2, 1);
  remember({ type: "plant", roots: created });
  updateStatus("Growth planted from your click.");
}

function nearestTip(x, y) {
  let best = null;
  stems.forEach((stem) => {
    if (stem.depth < 2 || stem.children.some((child) => !child.removed)) return;
    const end = stem.endPoint();
    const distance = Math.hypot(end.x - x, end.y - y);
    const edgeBias = Math.min(end.x, width - end.x, end.y, height - end.y);
    const score = distance + edgeBias * 0.1 - stem.depth * 12;
    if (distance < 86 && (!best || score < best.score)) best = { stem, end, score };
  });
  return best;
}

function cutAt(x, y) {
  const hit = nearestTip(x, y);
  if (!hit) return updateStatus("Cut the outer 2D tips.");
  remember({ type: "cut", stem: hit.stem });
  hit.stem.removed = true;
  spawnParticles(hit.end.x, hit.end.y, 12);
  updateStatus("Flat vine tip clipped.");
}

function combAt(x, y) {
  let touched = 0;
  stems.forEach((stem) => {
    const mid = stem.pointAt(0.55);
    const distance = Math.hypot(mid.x - x, mid.y - y);
    if (distance > 145) return;
    const influence = Math.pow(1 - distance / 145, 2);
    if (currentCombChanges && !currentCombChanges.has(stem)) {
      currentCombChanges.set(stem, { x: stem.bendX, y: stem.bendY });
    }
    stem.vx += pointer.vx * 0.02 * influence;
    stem.vy += pointer.vy * 0.02 * influence;
    stem.bendX = clamp(stem.bendX + pointer.vx * 0.5 * influence, -260, 260);
    stem.bendY = clamp(stem.bendY + pointer.vy * 0.5 * influence, -260, 260);
    touched += 1;
  });
  updateStatus(touched ? "Flat vines hold the dragged shape." : "Touch closer to the 2D vines.");
}

function pluckAt(x, y) {
  let best = null;
  stems.forEach((stem) => {
    stem.thorns.forEach((thorn) => {
      if (thorn.removed || thorn.t > stem.length / stem.targetLength) return;
      const point = stem.pointAt(thorn.t);
      const distance = Math.hypot(point.x - x, point.y - y);
      if (distance < 58 && (!best || distance < best.distance)) best = { thorn, point, distance };
    });
  });
  if (!best) return updateStatus("Pick a visible black thorn.");
  remember({ type: "pluck", thorn: best.thorn });
  best.thorn.removed = true;
  spawnParticles(best.point.x, best.point.y, 5);
  updateStatus("2D thorn removed.");
}

function useToolAt(x, y) {
  if (currentTool === "cut") cutAt(x, y);
  if (currentTool === "comb") combAt(x, y);
  if (currentTool === "pluck") pluckAt(x, y);
}

function spawnParticles(x, y, count) {
  for (let i = 0; i < count; i += 1) {
    particles.push({ x, y, vx: randomBetween(-1.8, 1.8), vy: randomBetween(-2.2, 0.7), size: randomBetween(1.5, 4.4), age: 0, life: randomBetween(360, 820) });
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
  const growth = Math.min(100, Math.round((stems.length / 260) * 100));
  const stress = Number(slider.value);
  const label = stress < 31 ? "LOW TENSION" : stress < 66 ? "CHRONIC TENSION" : "OVERGROWTH";
  statusText.textContent = `${message} | ${label} | Flat ${growth}%`;
}

function undoLastAction() {
  const action = history.pop();
  if (!action) return updateStatus("Nothing to undo.");
  if (action.type === "cut") action.stem.removed = false;
  if (action.type === "pluck") action.thorn.removed = false;
  if (action.type === "plant") roots = roots.filter((root) => !action.roots.includes(root));
  if (action.type === "comb") {
    action.changes.forEach((bend, stem) => {
      stem.bendX = bend.x;
      stem.bendY = bend.y;
      stem.vx = 0;
      stem.vy = 0;
    });
  }
  collectStems();
  updateStatus("Last action undone.");
}

function resetView() {
  updateStatus("Flat view is already aligned.");
}

function saveSpecimen() {
  const link = document.createElement("a");
  link.download = `stress-gardening-flat-${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
  updateStatus("Flat specimen image saved.");
}

function loop() {
  requestAnimationFrame(loop);
  frame += 1;
  collectStems();
  updateScene();
  drawBackground();
  roots.forEach(drawStem);
  drawParticles();
}

toolButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentTool = button.dataset.tool;
    toolButtons.forEach((item) => item.classList.toggle("active", item === button));
    const labels = {
      cut: "Cut: trim outer 2D tips.",
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
  if (currentTool === "comb") combAt(position.x, position.y);
  else useToolAt(position.x, position.y);
});

canvas.addEventListener("pointerup", (event) => {
  const position = updatePointer(event);
  if (currentTool === "comb" && !pointerMoved) plantAt(position.x, position.y);
  if (currentTool === "comb" && pointerMoved && currentCombChanges && currentCombChanges.size) remember({ type: "comb", changes: currentCombChanges });
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
window.addEventListener("resize", resizeCanvas);

resizeCanvas();
seedScene();
loop();
