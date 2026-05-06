/* ─────────────────────────────────────────
   RENDER  —  config.js → DOM
   index.html의 #js-* 슬롯을 채워넣는다.
   game/app.js보다 먼저 실행되어야 함.
   ───────────────────────────────────────── */

(function renderSite(S) {

  /* ── 헬퍼 ── */
  function $(id) { return document.getElementById(id); }
  function set(id, html) { const el = $(id); if (el) el.innerHTML = html; }

  /* ── 1. Nav ── */
  set("js-nav", S.nav.map(l =>
    `<a href="${l.href}">${l.label}</a>`
  ).join(""));

  /* ── 2. Brand ── */
  set("js-brand", `
    <p class="eyebrow">${S.brand.eyebrow}</p>
    <h1>${S.brand.title}</h1>
    <p class="description">${S.brand.desc}</p>
  `);

  /* ── 3. Toolbox (game/app.js가 이 버튼을 쿼리함) ── */
  const toolboxEl = $("js-toolbox");
  if (toolboxEl) {
    toolboxEl.setAttribute("aria-label", "도구 선택");
    toolboxEl.innerHTML =
      `<p class="section-label">Tools</p>` +
      S.game.tools.map((t, i) =>
        `<button class="tool-button${i === 0 ? " active" : ""}" type="button" data-tool="${t.id}">${t.label}</button>`
      ).join("") +
      `<p class="section-label" style="margin-top:14px;">View</p>` +
      `<button class="tool-button utility" id="undoButton"      type="button">Undo</button>` +
      `<button class="tool-button utility" id="resetViewButton" type="button">Reset</button>`;
  }

  /* ── 4. Panel (game/app.js가 이 요소를 쿼리함) ── */
  const panelEl = $("js-panel");
  if (panelEl) {
    panelEl.setAttribute("aria-label", "인터랙션 패널");
    panelEl.innerHTML = `
      <p class="section-label">Controls</p>
      <label class="control">
        <span>Stress Level</span>
        <input id="stressSlider" type="range" min="0" max="100" value="${S.game.stressDefault}" />
      </label>
      <output id="statusText"></output>
      <div class="panel-actions">
        <button id="regrowButton" type="button">Regrow</button>
        <button id="saveButton"   type="button">Save</button>
      </div>
    `;
  }

  /* ── 5. Ticker (스팬 2배 복제 → seamless loop) ── */
  const doubled = [...S.ticker, ...S.ticker];
  set("js-ticker", doubled.map(t => `<span>${t}</span>`).join(""));

  /* ── 6. Collection heading ── */
  const sc = S.sections.collection;
  set("js-collection-heading", `
    <p>${sc.eyebrow}</p>
    <h2>${sc.title}</h2>
  `);

  /* ── 7. Product grid ── */
  set("js-collection-grid", S.collection.map(item => {
    const visual = item.image
      ? `<img src="${item.image}" alt="${item.title}" style="width:100%;aspect-ratio:4/3;object-fit:cover;">`
      : `<div class="specimen-visual ${item.type}-specimen" aria-hidden="true">
           ${"<span></span>".repeat(item.spanCount)}
         </div>`;
    return `
      <article class="product-card">
        ${visual}
        <div>
          <p>${item.tag}</p>
          <h3>${item.title}</h3>
          <span>${item.subtitle}</span>
        </div>
      </article>`;
  }).join(""));

  /* ── 8. Archive / Mood board ── */
  const sa = S.sections.archive;
  set("js-archive-heading", `
    <p>${sa.eyebrow}</p>
    <h2>${sa.title}</h2>
  `);
  set("js-moodboard", S.moodboard.map(m =>
    `<article><span>${m.label}</span><span>${m.sub}</span></article>`
  ).join(""));

  /* ── 9. Split Feature ── */
  const sf = S.sections.feature;
  set("js-feature", `
    <div class="feature-copy">
      <p class="eyebrow">${sf.eyebrow}</p>
      <h2>${sf.title}</h2>
      <p>${sf.desc}</p>
    </div>
    <div class="lab-scene" aria-hidden="true">
      <div class="petri petri-a"><span></span></div>
      <div class="petri petri-b"><span></span></div>
      <div class="label">Metallo-Thorn<br>Vine Species</div>
    </div>
  `);

  /* ── 10. Tool grid heading ── */
  const st = S.sections.tools;
  set("js-tools-heading", `
    <p>${st.eyebrow}</p>
    <h2>${st.title}</h2>
  `);

  /* ── 11. Process ── */
  const sp = S.sections.process;
  set("js-process-title", `
    <p class="eyebrow">${sp.eyebrow}</p>
    <h2>${sp.title}</h2>
  `);
  set("js-process-list", S.process.map(s =>
    `<li><span class="step-num">${s.step}</span>${s.desc}</li>`
  ).join(""));

  /* ── 12. Preserve ── */
  const sv = S.sections.preserve;
  set("js-preserve", `
    <div>
      <p class="eyebrow">${sv.eyebrow}</p>
      <h2>${sv.title}</h2>
    </div>
    <p>${sv.desc}</p>
  `);

  /* ── 13. Footer ── */
  set("js-footer", `
    <p>${S.footer.brand}</p>
    <p>${S.footer.sub}</p>
  `);

})(SITE);
