const screens = document.querySelectorAll(".screen");
const mainBg = document.getElementById("mainBg");
const btnBegin = document.getElementById("btnBegin");
const btnFinish = document.getElementById("btnFinish");
const btnRetry = document.getElementById("btnRetry");
const btnEnterLab = document.getElementById("btnEnterLab");
const homeButtons = document.querySelectorAll(".topbar__link[data-nav-home='true']");
const topbarRouteLinks = document.querySelectorAll(".topbar__link[data-nav-route]");
const topbarPageLinks = document.querySelectorAll(".topbar__link[data-nav-page]");
const video = document.getElementById("video2");
const introPage = document.getElementById("introPage");
const labPage = document.getElementById("labPage");
const shopPage = document.getElementById("shopPage");
const bagPage = document.getElementById("bagPage");
const liveLabSection = document.getElementById("gardening-lab");
const stressInput = document.getElementById("stressInput");
const currentChar = document.getElementById("currentChar");
const timeElapsed = document.getElementById("timeElapsed");
const resDesc = document.getElementById("resDesc");
const resTime = document.getElementById("resTime");
const resWPM = document.getElementById("resWPM");
const resErr = document.getElementById("resErr");
const resTotal = document.getElementById("resTotal");
let stream = null;
let rafId = 0;
let scanStart = 0;
let typingBound = false;
let labUnlocked = false;

const typingData = {
  dwell: [],
  flight: [],
  lastUp: 0,
  backspace: 0,
  total: 0,
  starts: {},
};

function syncLabAccess() {
  liveLabSection?.classList.toggle("lab-locked", !labUnlocked);
}

function goTo(id) {
  screens.forEach((screen) => screen.classList.remove("active"));
  document.getElementById(id)?.classList.add("active");

  if (id === "screenIntro") mainBg?.classList.remove("hide");
  else mainBg?.classList.add("hide");
}

function showPage(pageName) {
  const showIntro = pageName === "intro";
  const showLab = pageName === "lab";
  const showShop = pageName === "shop";
  const showBag = pageName === "bag";
  if (introPage) {
    introPage.hidden = !showIntro;
    introPage.classList.toggle("is-active", showIntro);
  }
  if (labPage) {
    labPage.hidden = !showLab;
    labPage.classList.toggle("is-active", showLab);
    if (!showLab) {
      labPage.classList.remove("shop-only");
    }
  }
  if (shopPage) {
    shopPage.hidden = !showShop;
    shopPage.classList.toggle("is-active", showShop);
  }
  if (bagPage) {
    bagPage.hidden = !showBag;
    bagPage.classList.toggle("is-active", showBag);
  }
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });

  if (!showIntro) {
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
  }
}

function resetTypingData() {
  typingData.dwell = [];
  typingData.flight = [];
  typingData.lastUp = 0;
  typingData.backspace = 0;
  typingData.total = 0;
  typingData.starts = {};
}

function bindTyping() {
  if (typingBound || !stressInput) return;

  stressInput.addEventListener("input", () => {
    const len = stressInput.value.length;
    currentChar.textContent = String(len);
    currentChar.style.color = len >= 300 ? "#2ecc71" : "var(--muted)";
    btnFinish.style.display = len >= 10 ? "inline-flex" : "none";
  });

  stressInput.addEventListener("keydown", (event) => {
    const now = performance.now();
    typingData.total += 1;
    if (event.key === "Backspace") typingData.backspace += 1;
    if (!typingData.starts[event.code]) typingData.starts[event.code] = now;
    if (typingData.lastUp > 0) {
      const flight = now - typingData.lastUp;
      if (flight < 2000) typingData.flight.push(flight);
    }
  });

  stressInput.addEventListener("keyup", (event) => {
    const now = performance.now();
    if (typingData.starts[event.code]) {
      typingData.dwell.push(now - typingData.starts[event.code]);
      delete typingData.starts[event.code];
    }
    typingData.lastUp = now;
  });

  typingBound = true;
}

function tickScan() {
  const elapsed = Math.floor((performance.now() - scanStart) / 1000);
  timeElapsed.textContent = `경과 시간: ${elapsed}s`;
  rafId = requestAnimationFrame(tickScan);
}

function stopScan() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }
}

function comfortMessage(text, stressScore) {
  if (text.trim().length < 10) {
    return "측정 데이터가 짧아 기본 위로 메시지를 보여줌. 잠시 멈추고 호흡을 고르는 시간이 필요해 보임.";
  }

  if (stressScore >= 90) {
    return "아주 높은 긴장 상태로 보임. 지금은 결과를 해결하려 하기보다 감각을 천천히 진정시키는 일이 더 중요해 보임.";
  }
  if (stressScore >= 82) {
    return "피로와 긴장이 꽤 누적된 상태임. 오늘은 스스로를 다그치기보다 작은 정리부터 해보길 바람.";
  }
  return "피로가 쌓여 있지만 아직 회복할 여지가 충분해 보임. 지금의 마음을 가볍게 해주는 시간을 꼭 챙기길 바람.";
}

function showResult(duration) {
  const avgDwell = typingData.dwell.length
    ? typingData.dwell.reduce((sum, value) => sum + value, 0) / typingData.dwell.length
    : 0;
  const errRate = typingData.total ? (typingData.backspace / typingData.total) * 100 : 0;
  const wpm = Math.max(0, Math.round((typingData.total / 5) / (duration / 60 || 1)));

  let stressScore = 75 + Math.floor(errRate * 1.5) + Math.floor(avgDwell / 15);
  stressScore = Math.min(99, stressScore);

  window.localStorage.setItem(
    "stressAnalysisResult",
    JSON.stringify({
      stressScore,
      wpm,
      errRate: Number(errRate.toFixed(1)),
      duration: Math.round(duration),
    })
  );
  window.dispatchEvent(new Event("stress-analysis-updated"));

  goTo("screenResult");

  resTime.textContent = `${Math.round(duration)}s`;
  resWPM.textContent = `${wpm} WPM`;
  resErr.textContent = `${errRate.toFixed(1)}%`;
  resTotal.textContent = `${stressScore}%`;
  resDesc.textContent = comfortMessage(stressInput.value, stressScore);
}

async function beginMeasurement() {
  showPage("intro");

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    window.alert("현재 브라우저에서는 카메라 기능을 지원하지 않음.");
    return;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
    });
    video.srcObject = stream;
    await video.play();
    goTo("screenScan");
    bindTyping();
    stressInput.focus();
    scanStart = performance.now();
    tickScan();
  } catch (error) {
    window.alert("카메라 권한을 허용해야 측정이 시작됨.");
  }
}

function finishMeasurement() {
  const duration = (performance.now() - scanStart) / 1000;
  stopScan();
  showResult(duration);
}

function retryMeasurement() {
  stopScan();
  labUnlocked = false;
  syncLabAccess();
  resetTypingData();
  stressInput.value = "";
  currentChar.textContent = "0";
  currentChar.style.color = "var(--muted)";
  btnFinish.style.display = "none";
  timeElapsed.textContent = "경과 시간: 0s";
  showPage("intro");
  goTo("screenIntro");
}

function enterLiveLab() {
  stopScan();
  labUnlocked = true;
  syncLabAccess();
  showPage("lab");
  labPage?.classList.remove("shop-only");
}

function openBagPage() {
  stopScan();
  showPage("bag");
}

function openShopPageSection(targetId) {
  stopScan();
  showPage("shop");
  requestAnimationFrame(() => {
    const target = document.getElementById(targetId);
    target?.scrollIntoView({ block: "start", inline: "nearest", behavior: "auto" });
  });
}

function openLabSection(targetId) {
  syncLabAccess();
  showPage("lab");
  if (!labUnlocked) {
    labPage?.classList.add("shop-only");
  } else {
    labPage?.classList.remove("shop-only");
  }
  requestAnimationFrame(() => {
    const target = document.getElementById(targetId);
    target?.scrollIntoView({ block: "start", inline: "nearest", behavior: "auto" });
  });
}

function goHome(event) {
  event?.preventDefault();
  retryMeasurement();
}

window.__stressLabEnter = enterLiveLab;
window.__stressLabHome = goHome;

syncLabAccess();

btnBegin?.addEventListener("click", beginMeasurement);
btnFinish?.addEventListener("click", finishMeasurement);
btnRetry?.addEventListener("click", retryMeasurement);
btnEnterLab?.addEventListener("click", enterLiveLab);
homeButtons.forEach((button) => button.addEventListener("click", goHome));
topbarRouteLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const route = link.dataset.navRoute;
    if (route === "shop") {
      if (labUnlocked) openLabSection("recommend-shop");
      else openShopPageSection("shop-only-total");
      return;
    }
    if (route === "about") {
      if (labUnlocked) openLabSection("about-project");
      else openShopPageSection("shop-only-about");
    }
  });
});
topbarPageLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const pageName = link.dataset.navPage;
    if (pageName === "bag") openBagPage();
  });
});
