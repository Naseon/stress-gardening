from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
ASSET_DIR = ROOT / "flat-2d" / "assets"

FILES = [
    "thorn_mug_03.png",
    "thorn_vine_objet_03.png",
    "thorn_ruler_03.png",
    "thorn_incense_holder_03.png",
    "thorn_massage_ball_03.png",
    "thorn_mirror_03.png",
    "thorn_binder_clip_03.png",
    "thorn_paper_clip_03.png",
    "thorn_tray_03.png",
    "thorn_pen_03.png",
]


def border_color(rgb: np.ndarray) -> np.ndarray:
    margin = max(8, min(rgb.shape[0], rgb.shape[1]) // 60)
    edges = np.concatenate(
        [
            rgb[:margin, :, :].reshape(-1, 3),
            rgb[-margin:, :, :].reshape(-1, 3),
            rgb[:, :margin, :].reshape(-1, 3),
            rgb[:, -margin:, :].reshape(-1, 3),
        ],
        axis=0,
    )
    return np.median(edges, axis=0)


def remove_white_background(rgba: np.ndarray) -> np.ndarray:
    rgb = rgba[:, :, :3].astype(np.float32)
    alpha = rgba[:, :, 3].astype(np.uint8)
    height, width = alpha.shape

    bg = border_color(rgb)
    dist = np.sqrt(((rgb - bg) ** 2).sum(axis=2))
    brightness = rgb.mean(axis=2)
    spread = rgb.max(axis=2) - rgb.min(axis=2)

    # Only remove pixels that look like the original bright backdrop and are
    # connected to the image edge. This preserves metallic highlights inside
    # the product while stripping the lingering white poster box.
    candidate = ((brightness >= 222.0) & (dist <= 42.0) & (spread <= 26.0)) | (alpha == 0)
    visited = np.zeros((height, width), dtype=bool)
    queue: deque[tuple[int, int]] = deque()

    def enqueue(x: int, y: int) -> None:
        if not visited[y, x] and candidate[y, x]:
            visited[y, x] = True
            queue.append((x, y))

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)

    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < width and 0 <= ny < height and not visited[ny, nx] and candidate[ny, nx]:
                visited[ny, nx] = True
                queue.append((nx, ny))

    rgba[visited, 3] = 0

    # Soften the immediate edge fringe to avoid hard cut halos around the
    # products once they sit on a pure white card.
    fringe = (~visited) & (brightness >= 232.0) & (spread <= 28.0)
    fringe_alpha = rgba[:, :, 3].astype(np.float32)
    fringe_alpha[fringe] *= np.clip((245.0 - brightness[fringe]) / 24.0, 0.18, 1.0)
    rgba[:, :, 3] = np.clip(fringe_alpha, 0, 255).astype(np.uint8)
    return rgba


def crop_visible_area(rgba: np.ndarray, padding: int = 8) -> np.ndarray:
    alpha = rgba[:, :, 3]
    ys, xs = np.where(alpha > 12)
    if len(xs) == 0 or len(ys) == 0:
        return rgba

    left = max(0, xs.min() - padding)
    right = min(rgba.shape[1], xs.max() + padding + 1)
    top = max(0, ys.min() - padding)
    bottom = min(rgba.shape[0], ys.max() + padding + 1)
    return rgba[top:bottom, left:right]


def normalize_image(path: Path) -> None:
    image = Image.open(path).convert("RGBA")
    rgba = np.array(image)
    rgba = remove_white_background(rgba)
    rgba = crop_visible_area(rgba)
    Image.fromarray(rgba, mode="RGBA").save(path)


def main() -> None:
    for name in FILES:
        path = ASSET_DIR / name
        normalize_image(path)
        print(f"normalized {name}")


if __name__ == "__main__":
    main()
