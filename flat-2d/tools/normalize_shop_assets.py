from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
ASSET_DIR = ROOT / "flat-2d" / "assets"
DOWNLOADS = Path(r"C:\Users\nsy52\Downloads\브랜드")

CANVAS_SIZE = (1000, 1000)
TARGET_BOX = (720, 720)
BOTTOM_MARGIN = 52
BACKGROUND_TOLERANCE = 46.0
BRIGHTNESS_FLOOR = 214


FILES = {
    "가시 머그컵 03 1.png": "thorn_mug_03.png",
    "가시 덩굴 오브제 03 1.png": "thorn_vine_objet_03.png",
    "가시 자 03 1.png": "thorn_ruler_03.png",
    "가시 인센스 홀더 03 1.png": "thorn_incense_holder_03.png",
    "가시 지압볼 03 1.png": "thorn_massage_ball_03.png",
    "가시 손거울 03 1.png": "thorn_mirror_03.png",
    "가시 집게 03 2.png": "thorn_binder_clip_03.png",
    "가시 클립 03 2.png": "thorn_paper_clip_03.png",
    "가시 트레이 03 2.png": "thorn_tray_03.png",
    "가시 펜 03 1.png": "thorn_pen_03.png",
}


def border_mean(rgb: np.ndarray) -> np.ndarray:
    margin = max(8, min(rgb.shape[0], rgb.shape[1]) // 80)
    top = rgb[:margin, :, :].reshape(-1, 3)
    bottom = rgb[-margin:, :, :].reshape(-1, 3)
    left = rgb[:, :margin, :].reshape(-1, 3)
    right = rgb[:, -margin:, :].reshape(-1, 3)
    border = np.concatenate([top, bottom, left, right], axis=0)
    return border.mean(axis=0)


def mark_background(rgb: np.ndarray) -> np.ndarray:
    h, w, _ = rgb.shape
    bg = border_mean(rgb)
    distance = np.sqrt(((rgb.astype(np.float32) - bg) ** 2).sum(axis=2))
    brightness = rgb.min(axis=2)
    candidate = (distance <= BACKGROUND_TOLERANCE) & (brightness >= BRIGHTNESS_FLOOR)

    seen = np.zeros((h, w), dtype=bool)
    queue: deque[tuple[int, int]] = deque()

    def seed(y: int, x: int) -> None:
        if candidate[y, x] and not seen[y, x]:
            seen[y, x] = True
            queue.append((y, x))

    for x in range(w):
        seed(0, x)
        seed(h - 1, x)
    for y in range(h):
        seed(y, 0)
        seed(y, w - 1)

    while queue:
        y, x = queue.popleft()
        if y > 0 and candidate[y - 1, x] and not seen[y - 1, x]:
            seen[y - 1, x] = True
            queue.append((y - 1, x))
        if y < h - 1 and candidate[y + 1, x] and not seen[y + 1, x]:
            seen[y + 1, x] = True
            queue.append((y + 1, x))
        if x > 0 and candidate[y, x - 1] and not seen[y, x - 1]:
            seen[y, x - 1] = True
            queue.append((y, x - 1))
        if x < w - 1 and candidate[y, x + 1] and not seen[y, x + 1]:
            seen[y, x + 1] = True
            queue.append((y, x + 1))

    return seen


def normalize_image(src: Path, dest: Path) -> None:
    image = Image.open(src).convert("RGBA")
    rgba = np.array(image)
    rgb = rgba[:, :, :3]

    bg_mask = mark_background(rgb)
    rgba[bg_mask, 3] = 0

    alpha = rgba[:, :, 3]
    ys, xs = np.where(alpha > 0)
    if len(xs) == 0 or len(ys) == 0:
        raise RuntimeError(f"No visible product detected in {src.name}")

    left, right = xs.min(), xs.max() + 1
    top, bottom = ys.min(), ys.max() + 1
    cropped = Image.fromarray(rgba[top:bottom, left:right], mode="RGBA")

    max_w, max_h = TARGET_BOX
    scale = min(max_w / cropped.width, max_h / cropped.height)
    resized = cropped.resize(
        (max(1, int(round(cropped.width * scale))), max(1, int(round(cropped.height * scale)))),
        Image.LANCZOS,
    )

    canvas = Image.new("RGBA", CANVAS_SIZE, (255, 255, 255, 0))
    x = (CANVAS_SIZE[0] - resized.width) // 2
    y = CANVAS_SIZE[1] - resized.height - BOTTOM_MARGIN
    y = max(32, y)
    canvas.alpha_composite(resized, (x, y))
    canvas.save(dest)


def main() -> None:
    for source_name, output_name in FILES.items():
        src = DOWNLOADS / source_name
        dest = ASSET_DIR / output_name
        normalize_image(src, dest)
        print(f"normalized {output_name}")


if __name__ == "__main__":
    main()
