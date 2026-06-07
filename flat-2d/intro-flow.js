// 네비게이션 템플릿을 각 페이지 섹션에 복제
(function stampNavs() {
  const tpl = document.getElementById("topbar-tpl");
  if (!tpl) return;
  document.querySelectorAll(".page-screen").forEach((page) => {
    page.insertBefore(tpl.content.cloneNode(true), page.firstChild);
  });
  document.querySelector("#introPage .topbar")?.classList.add("intro-nav");
})();

// PRODUCT_CATALOG 데이터로 쇼핑 그리드 렌더링
// levels 배열이 있는 상품은 레벨별 카드 4장을, 없으면 단일 카드를 생성합니다.
(function renderShopGrids() {
  if (!Array.isArray(PRODUCT_CATALOG)) return;

  let productNum = 0;
  let cardCount = 0;
  const cards = [];

  PRODUCT_CATALOG.forEach((p) => {
    productNum++;
    const idx = String(productNum).padStart(2, "0");

    if (Array.isArray(p.levels)) {
      p.levels.forEach((lv) => {
        cardCount++;
        cards.push(`<article class="shop-collection-card">
  <span class="shop-collection-card__index">Lv.${lv.level}</span>
  <div class="shop-collection-card__inner is-clickable" data-product-id="${p.id}" data-level="${lv.level}">
    <div class="shop-collection-visual"><img src="${lv.image}" alt="${p.name} Level ${lv.level}" /></div>
    <p class="shop-collection-name">${p.name}</p>
  </div>
</article>`);
      });
    } else {
      cardCount++;
      cards.push(`<article class="shop-collection-card">
  <span class="shop-collection-card__index">${idx}</span>
  <div class="shop-collection-card__inner is-clickable" data-product-id="${p.id}">
    <div class="shop-collection-visual"><img src="${p.image}" alt="${p.name} product" /></div>
    <p class="shop-collection-name">${p.name}</p>
  </div>
</article>`);
    }
  });

  const html = cards.join("\n");

  const fullGrid = document.getElementById("shop-grid-full");
  const previewGrid = document.getElementById("shop-grid-preview");
  if (fullGrid) fullGrid.innerHTML = html;
  if (previewGrid) previewGrid.innerHTML = html;

  const countLabel = `${cardCount} / ${cardCount}`;
  const fullCount = document.getElementById("shop-count-full");
  const previewCount = document.getElementById("shop-count-preview");
  if (fullCount) fullCount.textContent = countLabel;
  if (previewCount) previewCount.textContent = countLabel;
})();

// #about-project 내용을 #shop-only-about에 복제 (About HTML 2중 관리 제거)
(function mirrorAboutSection() {
  const src = document.getElementById("about-project");
  const dst = document.getElementById("shop-only-about");
  if (src && dst) dst.innerHTML = src.innerHTML;
})();

const screens = document.querySelectorAll(".screen");
const mainBg = document.getElementById("mainBg");
const btnBegin = document.getElementById("btnBegin");
const btnStartCam = document.getElementById("btnStartCam");
const btnFinish = document.getElementById("btnFinish");
const btnRetry = document.getElementById("btnRetry");
const btnEnterLab = document.getElementById("btnEnterLab");
const nextPageButton = document.getElementById("nextPageButton");
const homeButtons = document.querySelectorAll(".topbar__link[data-nav-home='true']");
const topbarRouteLinks = document.querySelectorAll(".topbar__link[data-nav-route]");
const topbarPageLinks = document.querySelectorAll(".topbar__link[data-nav-page]");
const video = document.getElementById("video2");
const cameraBox = document.getElementById("cameraBox");
const introPage = document.getElementById("introPage");
const labPage = document.getElementById("labPage");
const shopPage = document.getElementById("shopPage");
const productPage = document.getElementById("productPage");
const bagPage = document.getElementById("bagPage");
const liveLabSection = document.getElementById("gardening-lab");
const productCards = document.querySelectorAll(".shop-collection-card__inner.is-clickable");
const productBackButtons = document.querySelectorAll("[data-product-back]");
const productDetailView = document.getElementById("productDetailView");
const pdCollectionLabel = document.getElementById("pdCollectionLabel");
const pdTitle = document.getElementById("pdTitle");
const pdSubtitle = document.getElementById("pdSubtitle");
const pdLead = document.getElementById("pdLead");
const pdFacts = document.getElementById("pdFacts");
const pdHeroImage = document.getElementById("pdHeroImage");
const pdObjectGrid = document.getElementById("pdObjectGrid");
const pdConceptText = document.getElementById("pdConceptText");
const pdConceptMedia = document.getElementById("pdConceptMedia");
const pdDetailImage = document.getElementById("pdDetailImage");
const pdDetailTitle = document.getElementById("pdDetailTitle");
const pdDetailText = document.getElementById("pdDetailText");
const pdMaterialList = document.getElementById("pdMaterialList");
const pdDimensionList = document.getElementById("pdDimensionList");
const pdDimensionVisuals = document.getElementById("pdDimensionVisuals");
const pdRelatedGrid = document.getElementById("pdRelatedGrid");
const pdStoryText = document.getElementById("pdStoryText");
const pdStoryMedia = document.getElementById("pdStoryMedia");
const pdNav = document.getElementById("pdNav");
const stressInput = document.getElementById("stressInput");
const currentChar = document.getElementById("currentChar");
const countWrap = currentChar?.closest(".char-count") || null;
const timeElapsed = document.getElementById("timeElapsed");
const statusLine = document.getElementById("statusLine");
const scanText = document.getElementById("scanText");
const scanDot = document.querySelector(".analysis-live-indicator .dot");
const comfortText = document.getElementById("comfortText");
const scoreNum = document.getElementById("scoreNum");
const resDesc = document.getElementById("resDesc");
const resTime = document.getElementById("resTime");
const resWPM = document.getElementById("resWPM");
const resErr = document.getElementById("resErr");
const resTotal = document.getElementById("resTotal");
let stream = null;
let rafId = 0;
let scanStart = 0;
let typingBound = false;
let typingStart = 0;
let labUnlocked = localStorage.getItem("sgLabUnlocked") === "true";
let lastShopAnchor = "shop-only-total";

const productTitleMap = {
  "thorn mug.": "thorn-mug",
  "thorn incense holder.": "thorn-incense-holder",
  "thorn pen.": "thorn-pen",
  "thorn ruler.": "thorn-ruler",
  "thorn massage ball.": "thorn-massage-ball",
  "thorn binder clip.": "thorn-binder-clip",
  "thorn paper clip.": "thorn-paper-clip",
  "thorn tray.": "thorn-tray",
  "thorn mirror.": "thorn-mirror",
  "thorn vine objet.": "thorn-vine-objet",
};

const productOrder = [
  "thorn-mug",
  "thorn-incense-holder",
  "thorn-pen",
  "thorn-ruler",
  "thorn-massage-ball",
  "thorn-binder-clip",
  "thorn-paper-clip",
  "thorn-tray",
  "thorn-mirror",
  "thorn-vine-objet",
];

const defaultObjectViews = ["Front", "Profile", "Detail", "Context"];

const productPageHrefMap = {
  "thorn-mug": "./thorn-mug.html",
  "thorn-incense-holder": "./thorn-incense-holder.html",
  "thorn-pen": "./thorn-pen.html",
  "thorn-ruler": "./thorn-ruler.html",
  "thorn-massage-ball": "./thorn-massage-ball.html",
  "thorn-binder-clip": "./thorn-binder-clip.html",
  "thorn-paper-clip": "./thorn-paper-clip.html",
  "thorn-tray": "./thorn-tray.html",
  "thorn-mirror": "./thorn-mirror.html",
  "thorn-vine-objet": "./thorn-vine-objet.html",
};

const productCatalog = {
  "thorn-mug": {
    code: "SG-01",
    title: "Thorn Mug",
    subtitle: "01 / 10",
    heroImage: "./assets/thorn_mug_03.png",
    viewsCompositeImage: "./assets/thorn_mug_views_level1_02.png",
    lead: "A familiar vessel translated into a quiet chrome tension.",
    facts: [
      ["Category", "Table Object"],
      ["Finish", "Brushed Steel"],
      ["Scale", "One Size"],
      ["Use", "Desk Ritual"],
    ],
    concept: [
      "The mug keeps its everyday silhouette while the handle and skin introduce a subtle defensive edge.",
      "It frames stress as an object to hold, inspect, and briefly negotiate with."
    ],
    detailTitle: "Handle + Thorn Detail",
    detailText: "Polished spikes wrap the body and handle to shift a familiar grip into a reflective, careful interaction.",
    materials: ["Stainless steel", "Brushed finish", "Cold touch surface"],
    dimensions: [
      ["Height", "95 mm"],
      ["Width", "85 mm"],
      ["Capacity", "350 ml"],
    ],
    related: ["thorn-tray", "thorn-pen", "thorn-mirror", "thorn-vine-objet"],
  },
  "thorn-incense-holder": {
    code: "SG-02",
    title: "Thorn Incense Holder",
    subtitle: "02 / 10",
    heroImage: "./assets/thorn_incense_holder_03.png",
    lead: "A slow-burning object that turns stillness into a small ritual specimen.",
    facts: [
      ["Category", "Ambient Object"],
      ["Finish", "Brushed Steel + Wood"],
      ["Scale", "One Size"],
      ["Use", "Incense Ritual"],
    ],
    concept: [
      "A compact spiked dome grounds the incense stick in a way that feels ceremonial rather than decorative.",
      "Its scale stays quiet while the form keeps the project's controlled discomfort intact."
    ],
    detailTitle: "Object Base Detail",
    detailText: "The dome holds dense thorn spacing around a soft metallic body, balancing calm fragrance with tactile alertness.",
    materials: ["Steel cap", "Wood incense stick", "Mirror-polished spikes"],
    dimensions: [
      ["Height", "132 mm"],
      ["Width", "68 mm"],
      ["Type", "Incense Holder"],
    ],
    related: ["thorn-massage-ball", "thorn-tray", "thorn-paper-clip", "thorn-vine-objet"],
  },
  "thorn-pen": {
    code: "SG-03",
    title: "Thorn Pen",
    subtitle: "03 / 10",
    heroImage: "./assets/thorn_pen_03.png",
    lead: "An office tool recast as a sharply attentive writing instrument.",
    facts: [
      ["Category", "Writing Tool"],
      ["Finish", "Brushed Steel"],
      ["Scale", "One Size"],
      ["Use", "Desk Writing"],
    ],
    concept: [
      "The pen holds a clear cylindrical profile while thorn details interrupt the ease of a routine gesture.",
      "It turns note-taking into a more deliberate, slower movement."
    ],
    detailTitle: "Grip Detail",
    detailText: "A narrow metal body carries evenly spaced spikes so the grip feels precise, restrained, and slightly tense.",
    materials: ["Steel body", "Clip detail", "Brushed finish"],
    dimensions: [
      ["Length", "142 mm"],
      ["Width", "14 mm"],
      ["Type", "Ballpoint"],
    ],
    related: ["thorn-ruler", "thorn-binder-clip", "thorn-paper-clip", "thorn-mug"],
  },
  "thorn-ruler": {
    code: "SG-04",
    title: "Thorn Ruler",
    subtitle: "04 / 10",
    heroImage: "./assets/thorn_ruler_03.png",
    lead: "A measuring tool that makes precision feel slightly guarded.",
    facts: [
      ["Category", "Desk Measure"],
      ["Finish", "Steel Etching"],
      ["Scale", "One Size"],
      ["Use", "Measurement"],
    ],
    concept: [
      "Linear markings and edge spikes coexist to create a contrast between utility and controlled threat.",
      "The object suggests that measuring can also be a form of scrutiny."
    ],
    detailTitle: "Edge Detail",
    detailText: "Sharp side spikes run along the ruler's edge while engraved numbers preserve its technical clarity.",
    materials: ["Etched steel", "Precision markings", "Matte sheen"],
    dimensions: [
      ["Length", "100 mm"],
      ["Width", "18 mm"],
      ["Scale", "10 cm"],
    ],
    related: ["thorn-pen", "thorn-binder-clip", "thorn-paper-clip", "thorn-tray"],
  },
  "thorn-massage-ball": {
    code: "SG-05",
    title: "Thorn Massage Ball",
    subtitle: "05 / 10",
    heroImage: "./assets/thorn_massage_ball_03.png",
    lead: "A stress object that literalizes pressure, release, and tactile resistance.",
    facts: [
      ["Category", "Pressure Object"],
      ["Finish", "Polished Steel"],
      ["Scale", "One Size"],
      ["Use", "Grip + Massage"],
    ],
    concept: [
      "The sphere makes stress tangible through repeated spikes and a compact palm-sized weight.",
      "It suggests comfort and tension as the same object, approached from different grips."
    ],
    detailTitle: "Surface Detail",
    detailText: "Rounded metal volume meets dense spike placement to create an object that feels both playful and defensive.",
    materials: ["Cast steel", "Polished points", "Weighted core"],
    dimensions: [
      ["Diameter", "62 mm"],
      ["Weight", "420 g"],
      ["Type", "Hand Object"],
    ],
    related: ["thorn-incense-holder", "thorn-mirror", "thorn-vine-objet", "thorn-mug"],
  },
  "thorn-binder-clip": {
    code: "SG-06",
    title: "Thorn Binder Clip",
    subtitle: "06 / 10",
    heroImage: "./assets/thorn_binder_clip_03.png",
    lead: "A fastening object that sharpens the logic of office restraint.",
    facts: [
      ["Category", "Desk Fastener"],
      ["Finish", "Brushed Steel"],
      ["Scale", "One Size"],
      ["Use", "Paper Hold"],
    ],
    concept: [
      "The familiar clip form is preserved, while spikes turn compression into a visible warning.",
      "It reframes paper organization as a tiny mechanical performance."
    ],
    detailTitle: "Clip Detail",
    detailText: "The looped handles and folded metal shell stay legible, but the outer skin is fully armored with thorn studs.",
    materials: ["Folded steel", "Wire handle", "Stamped spikes"],
    dimensions: [
      ["Height", "46 mm"],
      ["Width", "34 mm"],
      ["Type", "Office Clip"],
    ],
    related: ["thorn-paper-clip", "thorn-pen", "thorn-ruler", "thorn-tray"],
  },
  "thorn-paper-clip": {
    code: "SG-07",
    title: "Thorn Paper Clip",
    subtitle: "07 / 10",
    heroImage: "./assets/thorn_paper_clip_03.png",
    lead: "A tiny graphic object where order and discomfort meet in one line.",
    facts: [
      ["Category", "Paper Accessory"],
      ["Finish", "Polished Steel"],
      ["Scale", "One Size"],
      ["Use", "Document Hold"],
    ],
    concept: [
      "The paper clip stays almost diagrammatic, with thorns inserted along its otherwise smooth path.",
      "Its smallness makes the interruption feel surprisingly direct."
    ],
    detailTitle: "Wire Detail",
    detailText: "A continuous metal loop is punctuated with miniature spikes that keep the object thin, graphic, and sharp.",
    materials: ["Steel wire", "Polished edge", "Miniature spikes"],
    dimensions: [
      ["Height", "48 mm"],
      ["Width", "20 mm"],
      ["Type", "Clip"],
    ],
    related: ["thorn-binder-clip", "thorn-pen", "thorn-ruler", "thorn-tray"],
  },
  "thorn-tray": {
    code: "SG-08",
    title: "Thorn Tray",
    subtitle: "08 / 10",
    heroImage: "./assets/thorn_tray_03.png",
    lead: "A flat utility surface edged with a perimeter of small interruptions.",
    facts: [
      ["Category", "Desk Tray"],
      ["Finish", "Brushed Steel"],
      ["Scale", "One Size"],
      ["Use", "Object Display"],
    ],
    concept: [
      "The tray frames curation and containment while spikes gather around the rim like a controlled fence.",
      "It functions as a platform for the rest of the collection."
    ],
    detailTitle: "Rim Detail",
    detailText: "The tray stays minimal and shallow, while thorn density increases around the edge to define its border condition.",
    materials: ["Pressed steel", "Raised lip", "Stamped spikes"],
    dimensions: [
      ["Width", "230 mm"],
      ["Depth", "130 mm"],
      ["Height", "22 mm"],
    ],
    related: ["thorn-mug", "thorn-binder-clip", "thorn-paper-clip", "thorn-vine-objet"],
  },
  "thorn-mirror": {
    code: "SG-09",
    title: "Thorn Mirror",
    subtitle: "09 / 10",
    heroImage: "./assets/thorn_mirror_03.png",
    lead: "A reflective object whose soft oval edge is wrapped in defensive texture.",
    facts: [
      ["Category", "Reflective Object"],
      ["Finish", "Mirror + Steel"],
      ["Scale", "One Size"],
      ["Use", "Desk Reflection"],
    ],
    concept: [
      "The mirror literalizes self-inspection, placing a calm reflective surface inside a thorned shell.",
      "Its shape remains elegant while the perimeter suggests caution."
    ],
    detailTitle: "Frame Detail",
    detailText: "The mirror ring keeps a smooth front face, while conical studs build tension around the rounded outer body.",
    materials: ["Polished mirror", "Steel shell", "Conical spikes"],
    dimensions: [
      ["Diameter", "108 mm"],
      ["Depth", "38 mm"],
      ["Type", "Table Mirror"],
    ],
    related: ["thorn-massage-ball", "thorn-mug", "thorn-vine-objet", "thorn-tray"],
  },
  "thorn-vine-objet": {
    code: "SG-10",
    title: "Thorn Vine Objet",
    subtitle: "10 / 10",
    heroImage: "./assets/thorn_vine_objet_03.png",
    lead: "A freestanding chrome tangle that visualizes growth, tension, and ornamental restraint.",
    facts: [
      ["Category", "Specimen Objet"],
      ["Finish", "Mirror Steel"],
      ["Scale", "One Size"],
      ["Use", "Display Object"],
    ],
    concept: [
      "The vine objet abstracts the project's core form into a looping self-supporting knot.",
      "It carries the most direct relation to the live lab growth system."
    ],
    detailTitle: "Loop Detail",
    detailText: "Continuous chrome tubes fold through space while small spikes punctuate the curves like a coded stress map.",
    materials: ["Mirror steel", "Tubular frame", "Integrated spikes"],
    dimensions: [
      ["Height", "124 mm"],
      ["Width", "136 mm"],
      ["Type", "Display Objet"],
    ],
    related: ["thorn-tray", "thorn-mirror", "thorn-massage-ball", "thorn-mug"],
  },
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildImageCard(src, alt, caption) {
  return `
    <article class="product-object-card">
      <div class="product-object-figure">
        <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" />
      </div>
      <span class="product-object-caption">${escapeHtml(caption)}</span>
    </article>
  `;
}

function buildCompositeImageCard(src, alt) {
  return `
    <article class="product-object-card product-object-card--composite">
      <div class="product-object-figure product-object-figure--composite">
        <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" />
      </div>
    </article>
  `;
}

function buildRelatedCard(productId) {
  const product = productCatalog[productId];
  if (!product) return "";
  return `
    <button class="product-related-card" type="button" data-related-product="${escapeHtml(productId)}">
      <div class="product-related-card-media">
        <img src="${escapeHtml(product.heroImage)}" alt="${escapeHtml(product.title)}" />
      </div>
      <span class="product-related-card-title">${escapeHtml(product.title)}</span>
    </button>
  `;
}

function renderProductErrorState(message) {
  if (!productDetailView) return;
  productDetailView.innerHTML = `
    <section class="product-detail-empty-state">
      <p class="product-detail-empty-state__eyebrow">THORN COLLECTION</p>
      <h1>Product Detail Unavailable</h1>
      <p class="product-detail-empty-state__copy">${escapeHtml(message)}</p>
      <button class="product-back-link" type="button" data-product-back>Back to Shop</button>
    </section>
  `;
}

function renderProductDetail(productId) {
  try {
    const product = productCatalog[productId];
    if (!productDetailView) return;
    if (!product) {
      renderProductErrorState("The selected product could not be found.");
      return;
    }

    const index = productOrder.indexOf(productId);
    const prevId = index > 0 ? productOrder[index - 1] : null;
    const nextId = index < productOrder.length - 1 ? productOrder[index + 1] : null;
    const relatedSource = Array.isArray(product.related) ? product.related : [];
    const related = relatedSource.filter((id) => productCatalog[id]).slice(0, 4);
    const factSource = Array.isArray(product.facts) ? product.facts : [];
    const dimensionSource = Array.isArray(product.dimensions) ? product.dimensions : [];

    const factMarkup = factSource
      .map(
        ([label, value]) => `
          <div class="product-fact">
            <dt>${escapeHtml(label)}</dt>
            <dd>${escapeHtml(value)}</dd>
          </div>
        `
      )
      .join("");

    const objectViewMarkup = product.viewsCompositeImage
      ? buildCompositeImageCard(
          product.viewsCompositeImage,
          `${product.title} front side top views`
        )
      : ["Front", "Side", "Top", "Detail"]
          .map((caption) => buildImageCard(product.heroImage, `${product.title} ${caption}`, caption))
          .join("");

    const dimensionMarkup = dimensionSource
      .map(
        ([label, value]) => `
          <div>
            <dt>${escapeHtml(label)}</dt>
            <dd>${escapeHtml(value)}</dd>
          </div>
        `
      )
      .join("");

    const blueprintMarkup = ["Front View", "Side View", "Top View"]
      .map(
        (caption) => `
          <article class="product-blueprint-card">
            <div class="product-blueprint-figure">
              <img src="${escapeHtml(product.heroImage)}" alt="${escapeHtml(product.title)} ${escapeHtml(caption)}" />
            </div>
            <span>${escapeHtml(caption)}</span>
          </article>
        `
      )
      .join("");

    const editorialSources = [
      product.heroImage,
      productCatalog[related[0]]?.heroImage || product.heroImage,
      productCatalog[related[1]]?.heroImage || product.heroImage,
    ];

    const editorialMarkup = editorialSources
      .map(
        (src, editorialIndex) => `
          <article class="product-editorial-card">
            <img src="${escapeHtml(src)}" alt="${escapeHtml(product.title)} editorial ${editorialIndex + 1}" />
          </article>
        `
      )
      .join("");

    const relatedMarkup = related.map((id) => buildRelatedCard(id)).join("");

    productDetailView.innerHTML = `
      <div class="product-detail-simple">
        <section class="product-simple-hero">
          <div class="product-simple-copy">
            <p class="product-detail-kicker">THORN COLLECTION</p>
            <div class="product-simple-heading">
              <div>
                <p class="product-simple-index">${escapeHtml(product.subtitle || "")}</p>
                <h1>${escapeHtml(product.title || "")}</h1>
              </div>
              <button class="product-back-link" type="button" data-product-back>Back to Shop</button>
            </div>
            <p class="product-simple-lead">${escapeHtml(product.lead || "")}</p>
            <dl class="product-detail-facts">${factMarkup}</dl>
          </div>
          <div class="product-simple-hero-media">
            <img src="${escapeHtml(product.heroImage)}" alt="${escapeHtml(product.title || "Product")}" />
          </div>
        </section>

        <section class="product-simple-views">
          <div class="product-simple-step">02</div>
          <div class="product-object-grid">${objectViewMarkup}</div>
        </section>

        <section class="product-simple-detail">
          <div class="product-simple-step">04</div>
          <div class="product-simple-detail-media">
            <img src="${escapeHtml(product.heroImage)}" alt="${escapeHtml(product.title || "Product")} detail view" />
          </div>
          <div class="product-simple-detail-copy">
            <p class="product-section-label">${escapeHtml(product.detailTitle || "Detail")}</p>
            <p>${escapeHtml(product.detailText || "")}</p>
            <div class="product-simple-dimensions">
              <div class="product-simple-dimension-copy">
                <p class="product-section-label">Dimension</p>
                <dl class="product-dimension-list">${dimensionMarkup}</dl>
              </div>
              <div class="product-simple-blueprints">${blueprintMarkup}</div>
            </div>
          </div>
        </section>

        <section class="product-simple-editorials">
          ${editorialMarkup}
        </section>

        <section class="product-simple-related">
          <div class="product-simple-related-head">
            <p class="product-section-label">Related Objects</p>
          </div>
          <div class="product-related-grid">${relatedMarkup}</div>
        </section>

        <section class="product-simple-nav">
          <button class="product-nav-link" type="button" ${prevId ? `data-product-nav="${escapeHtml(prevId)}"` : "disabled"}>${escapeHtml(prevId ? `Previous: ${productCatalog[prevId].title}` : "")}</button>
          <span class="product-nav-current">${escapeHtml(`${product.subtitle || ""} / THORN COLLECTION`)}</span>
          <button class="product-nav-link product-nav-link--next" type="button" ${nextId ? `data-product-nav="${escapeHtml(nextId)}"` : "disabled"}>${escapeHtml(nextId ? `Next: ${productCatalog[nextId].title}` : "")}</button>
        </section>
      </div>
    `;
  } catch (error) {
    console.error("Failed to render product detail:", error);
    renderProductErrorState("Something interrupted the detail view. Please return to the shop and try again.");
  }
}

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

function syncShopMode() {
  if (!shopPage) return;
  shopPage.classList.toggle("full-mode", labUnlocked);
  shopPage.classList.toggle("preview-mode", !labUnlocked);
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
  const showProduct = pageName === "product";
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
    if (showShop) syncShopMode();
  }
  if (productPage) {
    productPage.hidden = !showProduct;
    productPage.classList.toggle("is-active", showProduct);
  }
  if (bagPage) {
    bagPage.hidden = !showBag;
    bagPage.classList.toggle("is-active", showBag);
    bagPage.querySelector(".topbar")?.classList.toggle("topbar--bag-active", showBag);
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
  typingStart = 0;
}

function updateSubmitState() {
  if (!stressInput || !btnFinish) return;
  const len = stressInput.value.length;
  const ready = len >= 50;
  if (currentChar) currentChar.textContent = String(len);
  countWrap?.classList.toggle("over", len > 0 && len < 100);
  btnFinish.disabled = !ready;
  btnFinish.classList.toggle("ready", ready);
  btnFinish.textContent = ready ? "이제 모든 스트레스를 정리하고 싶어" : "Progressing";
}

function setCameraIdleState() {
  cameraBox?.classList.remove("is-live");
  scanDot?.classList.remove("live");
  if (video) {
    video.pause();
    video.srcObject = null;
  }
  if (btnStartCam) {
    btnStartCam.disabled = false;
    btnStartCam.textContent = "카메라 시작";
  }
  if (scanText) scanText.textContent = "Live Scanning...";
  if (statusLine) {
    statusLine.textContent =
      "표정과 텍스트를 함께 기록해 주세요. 카메라를 켠 뒤 충분히 입력하면 분석이 활성화됩니다.";
  }
}

function bindTyping() {
  if (typingBound || !stressInput) return;

  stressInput.addEventListener("input", updateSubmitState);

  stressInput.addEventListener("keydown", (event) => {
    const now = performance.now();
    if (!typingStart) typingStart = now;
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
  if (timeElapsed) timeElapsed.textContent = `경과 시간: ${elapsed}s`;
  rafId = requestAnimationFrame(tickScan);
}

function stopScan() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }
  scanStart = 0;
  setCameraIdleState();
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

  const message = comfortMessage(stressInput.value, stressScore);
  if (resTime) resTime.textContent = `${Math.round(duration)}s`;
  if (resWPM) resWPM.textContent = `${wpm} WPM`;
  if (resErr) resErr.textContent = `${errRate.toFixed(1)}%`;
  if (resTotal) resTotal.textContent = `${stressScore}%`;
  if (resDesc) resDesc.textContent = message;
  if (comfortText) comfortText.textContent = message;
  if (scoreNum) scoreNum.textContent = String(stressScore);
}

function beginMeasurement() {
  showPage("intro");
  goTo("screenScan");
  bindTyping();
  stressInput?.focus();
  updateSubmitState();
}

async function startCameraMeasurement() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    window.alert("현재 브라우저에서는 카메라 기능을 지원하지 않음.");
    return;
  }

  try {
    if (stream) return;
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
    });
    video.srcObject = stream;
    await video.play();
    cameraBox?.classList.add("is-live");
    scanDot?.classList.add("live");
    if (btnStartCam) {
      btnStartCam.disabled = true;
      btnStartCam.textContent = "측정 중...";
    }
    if (statusLine) {
      statusLine.textContent = "측정이 진행 중입니다. 충분한 시간 동안 입력해 오늘의 마음을 기록해 주세요.";
    }
    if (scanText) scanText.textContent = "Live Scanning...";
    scanStart = performance.now();
    tickScan();
  } catch (error) {
    window.alert("카메라 권한을 허용해야 측정이 시작됨.");
  }
}

function finishMeasurement() {
  const durationBase = scanStart || typingStart || performance.now();
  const duration = Math.max(1, (performance.now() - durationBase) / 1000);
  stopScan();
  showResult(duration);
}

function retryMeasurement() {
  stopScan();
  labUnlocked = false;
  localStorage.removeItem("sgLabUnlocked");
  syncLabAccess();
  resetTypingData();
  stressInput.value = "";
  updateSubmitState();
  if (timeElapsed) timeElapsed.textContent = "경과 시간: 0s";
  setCameraIdleState();
  if (comfortText) comfortText.textContent = "";
  if (scoreNum) scoreNum.textContent = "0";
  showPage("intro");
  goTo("screenIntro");
}

function enterLiveLab() {
  stopScan();
  labUnlocked = true;
  localStorage.setItem("sgLabUnlocked", "true");
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
  lastShopAnchor = targetId;
  showPage("shop");
  requestAnimationFrame(() => {
    const target = document.getElementById(targetId);
    target?.scrollIntoView({ block: "start", inline: "nearest", behavior: "auto" });
  });
}

function openProductPage(productId, sourceId, level) {
  stopScan();
  lastShopAnchor = sourceId || (labUnlocked ? "shop-intro" : "shop-only-total");
  const targetHref = productPageHrefMap[productId];
  if (!targetHref) return;
  window.location.href = level ? `${targetHref}?level=${level}` : targetHref;
}

function openProductPageFromElement(element) {
  if (!element) return;
  const title = element.querySelector("h3")?.textContent.trim().toLowerCase();
  const productId = element.dataset.productId || (title ? productTitleMap[title] : null);
  if (!productId) return;
  const level = element.dataset.level || null;
  const sourceSection = element.closest("section[id]")?.id || "shop-only-total";
  openProductPage(productId, sourceSection, level);
}

function bindProductCards() {
  productCards.forEach((card) => {
    const title = card.querySelector("h3")?.textContent.trim().toLowerCase();
    const productId = card.dataset.productId || (title ? productTitleMap[title] : null);
    if (!productId) return;

    const sourceSection = card.closest("section[id]")?.id || "shop-only-total";
    card.dataset.productId = productId;
    card.classList.add("is-clickable");
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `${card.querySelector("h3")?.textContent.trim()} detail page`);
    card.setAttribute("onclick", "window.__openProductPageFromElement && window.__openProductPageFromElement(this)");
    card.setAttribute(
      "onkeydown",
      "if(event.key==='Enter'||event.key===' '){event.preventDefault();window.__openProductPageFromElement && window.__openProductPageFromElement(this);}"
    );

    const openCurrentProduct = () => openProductPage(card.dataset.productId, sourceSection, card.dataset.level || null);
    card.addEventListener("click", openCurrentProduct);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openCurrentProduct();
      }
    });
  });
}

function goHome(event) {
  event?.preventDefault();
  retryMeasurement();
}

window.__stressLabEnter = enterLiveLab;
window.__stressLabHome = goHome;
window.__openProductPage = openProductPage;
window.__openProductPageFromElement = openProductPageFromElement;

syncLabAccess();
setCameraIdleState();
updateSubmitState();

btnBegin?.addEventListener("click", beginMeasurement);
btnStartCam?.addEventListener("click", startCameraMeasurement);
btnFinish?.addEventListener("click", finishMeasurement);
btnRetry?.addEventListener("click", retryMeasurement);
btnEnterLab?.addEventListener("click", enterLiveLab);
nextPageButton?.addEventListener("click", () => openShopPageSection("shop-intro"));
homeButtons.forEach((button) => button.addEventListener("click", goHome));
topbarRouteLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const route = link.dataset.navRoute;
    if (route === "shop") {
      if (labUnlocked) openShopPageSection("shop-intro");
      else openShopPageSection("shop-only-total");
      return;
    }
    if (route === "about") {
      if (labUnlocked) openShopPageSection("about-project");
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

document.addEventListener("click", (event) => {
  const card = event.target.closest(".shop-collection-card__inner.is-clickable");
  if (!card || !document.body.contains(card)) return;
  const isInsideProductPage = card.closest("#productPage");
  if (isInsideProductPage) return;
  openProductPageFromElement(card);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest(".shop-collection-card__inner.is-clickable");
  if (!card || !document.body.contains(card)) return;
  const isInsideProductPage = card.closest("#productPage");
  if (isInsideProductPage) return;
  event.preventDefault();
  openProductPageFromElement(card);
});

productPage?.addEventListener("click", (event) => {
  const backButton = event.target.closest("[data-product-back]");
  if (backButton) {
    openShopPageSection(lastShopAnchor);
    return;
  }

  const relatedCard = event.target.closest("[data-related-product]");
  if (relatedCard) {
    openProductPage(relatedCard.dataset.relatedProduct, lastShopAnchor);
    return;
  }

  const navButton = event.target.closest("[data-product-nav]");
  if (navButton) {
    openProductPage(navButton.dataset.productNav, lastShopAnchor);
  }
});

renderProductDetail("thorn-mug");
bindProductCards();

(function applyEntryRoute() {
  const params = new URLSearchParams(window.location.search);
  const page = params.get("page");

  if (!page) return;

  if (page === "shop") {
    if (labUnlocked) openShopPageSection("shop-intro");
    else openShopPageSection("shop-only-total");
    return;
  }

  if (page === "about") {
    if (labUnlocked) openShopPageSection("about-project");
    else openShopPageSection("shop-only-about");
    return;
  }

  if (page === "bag") {
    openBagPage();
    return;
  }

  if (page === "lab" && labUnlocked) {
    enterLiveLab();
  }
})();

