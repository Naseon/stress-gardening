/* ─────────────────────────────────────────
   CONFIG  —  모든 텍스트·이미지·설정이 여기
   이미지 추가: collection[n].image 경로 입력
   텍스트 수정: 이 파일만 수정하면 전체 반영
   ───────────────────────────────────────── */

const SITE = {

  /* ── 브랜드 ── */
  brand: {
    eyebrow: "Brand-Based Design Studio II",
    title:   "Stress Gardening",
    desc:    "HRV 스트레스 데이터로 자라나는 금속성 가시덤불을 직접 심고, 만지고, 다듬는 데이터 기반 인터랙션 굿즈"
  },

  /* ── 상단 네비 ── */
  nav: [
    { href: "#garden",     label: "Garden"     },
    { href: "#collection", label: "Collection" },
    { href: "#archive",    label: "Archive"    },
    { href: "#tools",      label: "Tools"      },
    { href: "#process",    label: "Process"    }
  ],

  /* ── 스크롤 띠 ── */
  ticker: [
    "HRV MONITOR",
    "GENERATIVE VINE",
    "CHROME SPECIMEN",
    "PRECISION PRUNING",
    "FAKE GOODS COMPANY",
    "STRESS PRESERVATION"
  ],

  /* ── 게임 설정 ── */
  game: {
    /* 도구 목록: id는 app.js data-tool 값과 일치해야 함 */
    tools: [
      { id: "cut",   label: "Cut"   },
      { id: "comb",  label: "Comb"  },
      { id: "pluck", label: "Pluck" }
    ],
    /* 슬라이더 기본값 */
    stressDefault: 62
  },

  /* ── 컬렉션 섹션 ── */
  sections: {
    collection: {
      eyebrow: "Collection",
      title:   "Objects for preserving temporary relief."
    },
    archive: {
      eyebrow: "Expectation",
      title:   "Data-driven horizon for stress relief goods."
    },
    tools: {
      eyebrow: "Pruning Tools",
      title:   "Touch, cut, preserve."
    },
    process: {
      eyebrow: "Service Flow",
      title:   "From stress signal to fake goods ritual."
    },
    preserve: {
      eyebrow: "Preserve Sample",
      title:   "Archive the shape of a temporary relief.",
      desc:    "사용자가 심고, 밀고, 잘라낸 가시덤불은 하나의 스트레스 표본으로 저장됩니다. 현재 프로토타입에서는 첫 화면의 캔버스 이미지를 캡처해 보존할 수 있습니다."
    },
    feature: {
      eyebrow: "Chrome Nature",
      title:   "Metallic vegetation, future biology.",
      desc:    "스트레스는 보이지 않는 압력이지만, 이 웹에서는 덩굴의 밀도와 가시의 방향, 금속성 표면의 긴장감으로 변환됩니다."
    }
  },

  /* ── 제품 카드 ──
     image: null 이면 CSS 시각물(specimen-visual) 표시
     image: "./assets/images/vine.webp" 처럼 경로 입력하면 실제 이미지 표시
  ── */
  collection: [
    {
      tag:       "Metallo-Thorn",
      title:     "Vine Species",
      subtitle:  "HRV Sample / 062",
      type:      "vine",     /* CSS 클래스: vine-specimen */
      spanCount: 4,
      image:     null        /* 이미지 추가 시 경로 입력 */
    },
    {
      tag:       "Precision Kit",
      title:     "Pruning Tools",
      subtitle:  "Cut / Comb / Pluck",
      type:      "tool",
      spanCount: 3,
      image:     null
    },
    {
      tag:       "Visual Rules",
      title:     "Thorn Graphics",
      subtitle:  "Data-Driven / Modular",
      type:      "rule",
      spanCount: 4,
      image:     null
    }
  ],

  /* ── 무드보드 ── */
  moodboard: [
    { label: "Stress",          sub: "Gardening"           },
    { label: "Chrome Nature",   sub: "Metallic Vegetation" },
    { label: "Thorny Minimalism", sub: "Precision Pruning" },
    { label: "HRV_Sample_A1",   sub: "Data-Driven Growth"  },
    { label: "Fake Goods",      sub: "Stress Preservation" },
    { label: "Brand_System",    sub: "Visual_Rules"        }
  ],

  /* ── 프로세스 단계 ── */
  process: [
    { step: "01", desc: "HRV수치 측정 및 스트레스 강도 분석" },
    { step: "02", desc: "데이터 기반 덩굴 밀도와 성장 속도 생성" },
    { step: "03", desc: "사용자가 클릭한 위치에서 금속 덩굴 발아" },
    { step: "04", desc: "드래그로 덤불을 조형하고 Cut/Pluck으로 정리" },
    { step: "05", desc: "개인화된 스트레스 표본 굿즈로 보존" }
  ],

  /* ── 푸터 ── */
  footer: {
    brand: "Fake Goods Company",
    sub:   "Stress Gardening / Digital-Physical Connection / 2026"
  }

};
