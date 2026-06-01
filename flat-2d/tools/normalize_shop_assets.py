from __future__ import annotations

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
    alpha = rgba[:, :, 3].astype(np.float32)

    bg = border_color(rgb)
    dist = np.sqrt(((rgb - bg) ** 2).sum(axis=2))
    brightness = rgb.mean(axis=2)

    dist_weight = np.clip((52.0 - dist) / 32.0, 0.0, 1.0)
    bright_weight = np.clip((brightness - 228.0) / 24.0, 0.0, 1.0)
    removal = dist_weight * bright_weight

    hard_bg = (brightness > 245.0) & (dist < 28.0)
    removal = np.where(hard_bg, 1.0, removal)

    alpha = alpha * (1.0 - removal)
    rgba[:, :, 3] = np.clip(alpha, 0, 255).astype(np.uint8)
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
