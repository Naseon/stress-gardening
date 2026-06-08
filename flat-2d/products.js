// 상품 목록의 단일 출처. 쇼핑 그리드와 네비게이션 순서를 여기서만 관리합니다.
// 레벨이 있는 상품은 levels 배열로, 미수정 상품은 image 필드로 관리합니다.
const PRODUCT_CATALOG = [
  {
    id: "thorn-mug",
    name: "Thorn Mug",
    levels: [
      { level: 1, image: "./assets/thorn_mug_lv1.png" },
      { level: 2, image: "./assets/thorn_mug_lv2.png" },
      { level: 3, image: "./assets/thorn_mug_lv3.png" },
      { level: 4, image: "./assets/thorn_mug_lv4.png" },
    ],
  },
  {
    id: "thorn-incense-holder",
    name: "Thorn Incense Holder",
    levels: [
      { level: 1, image: "./assets/thorn_incense_holder_lv1.png" },
      { level: 2, image: "./assets/thorn_incense_holder_lv2.png" },
      { level: 3, image: "./assets/thorn_incense_holder_lv3.png" },
      { level: 4, image: "./assets/thorn_incense_holder_lv4.png" },
    ],
  },
  {
    id: "thorn-paper-clip",
    name: "Thorn Paper Clip",
    levels: [
      { level: 1, image: "./assets/thorn_paper_clip_lv1.png" },
      { level: 2, image: "./assets/thorn_paper_clip_lv2.png" },
      { level: 3, image: "./assets/thorn_paper_clip_lv3.png" },
      { level: 4, image: "./assets/thorn_paper_clip_lv4.png" },
    ],
  },
  {
    id: "thorn-binder-clip",
    name: "Thorn Binder Clip",
    levels: [
      { level: 1, image: "./assets/thorn_binder_clip_lv1.png" },
      { level: 2, image: "./assets/thorn_binder_clip_lv2.png" },
      { level: 3, image: "./assets/thorn_binder_clip_lv3.png" },
      { level: 4, image: "./assets/thorn_binder_clip_lv4.png" },
    ],
  },
  {
    id: "thorn-pen",
    name: "Thorn Pen",
    levels: [
      { level: 1, image: "./assets/thorn_pen_lv1.png" },
      { level: 2, image: "./assets/thorn_pen_lv2.png" },
      { level: 3, image: "./assets/thorn_pen_lv3.png" },
      { level: 4, image: "./assets/thorn_pen_lv4.png" },
    ],
  },
  {
    id: "thorn-ruler",
    name: "Thorn Ruler",
    levels: [
      { level: 1, image: "./assets/thorn_ruler_lv1.png" },
      { level: 2, image: "./assets/thorn_ruler_lv2.png" },
      { level: 3, image: "./assets/thorn_ruler_lv3.png" },
      { level: 4, image: "./assets/thorn_ruler_lv4.png" },
    ],
  },
  {
    id: "thorn-mirror",
    name: "Thorn Mirror",
    levels: [
      { level: 1, image: "./assets/thorn_mirror_lv1.png" },
      { level: 2, image: "./assets/thorn_mirror_lv2.png" },
      { level: 3, image: "./assets/thorn_mirror_lv3.png" },
      { level: 4, image: "./assets/thorn_mirror_lv4.png" },
    ],
  },
  {
    id: "thorn-massage-ball",
    name: "Thorn Massage Ball",
    levels: [
      { level: 1, image: "./assets/thorn_massage_ball_lv1.png" },
      { level: 2, image: "./assets/thorn_massage_ball_lv2.png" },
      { level: 3, image: "./assets/thorn_massage_ball_lv3.png" },
      { level: 4, image: "./assets/thorn_massage_ball_lv4.png" },
    ],
  },
  {
    id: "thorn-tray",
    name: "Thorn Tray",
    levels: [
      { level: 1, image: "./assets/thorn_tray_lv1.png" },
      { level: 2, image: "./assets/thorn_tray_lv2.png" },
      { level: 3, image: "./assets/thorn_tray_lv3.png" },
      { level: 4, image: "./assets/thorn_tray_lv4.png" },
    ],
  },
  {
    id: "thorn-vine-objet",
    name: "Thorn Vine Objet",
    levels: [
      { level: 1, image: "./assets/thorn_vine_objet_lv1.png" },
      { level: 2, image: "./assets/thorn_vine_objet_lv2.png" },
      { level: 3, image: "./assets/thorn_vine_objet_lv3.png" },
      { level: 4, image: "./assets/thorn_vine_objet_lv4.png" },
    ],
  },
];
