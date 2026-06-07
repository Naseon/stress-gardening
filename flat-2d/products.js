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
  { id: "thorn-mirror",         name: "Thorn Mirror",         image: "./assets/thorn_mirror_03.png" },
  { id: "thorn-binder-clip",    name: "Thorn Binder Clip",    image: "./assets/thorn_binder_clip_03.png" },
  { id: "thorn-pen",            name: "Thorn Pen",            image: "./assets/thorn_pen_03.png" },
  { id: "thorn-incense-holder", name: "Thorn Incense Holder", image: "./assets/thorn_incense_holder_03.png" },
  { id: "thorn-massage-ball",   name: "Thorn Massage Ball",   image: "./assets/thorn_massage_ball_03.png" },
  { id: "thorn-paper-clip",     name: "Thorn Paper Clip",     image: "./assets/thorn_paper_clip_03.png" },
  { id: "thorn-ruler",          name: "Thorn Ruler",          image: "./assets/thorn_ruler_03.png" },
  { id: "thorn-tray",           name: "Thorn Tray",           image: "./assets/thorn_tray_03.png" },
  { id: "thorn-vine-objet",     name: "Thorn Vine Objet",     image: "./assets/thorn_vine_objet_03.png" },
];
