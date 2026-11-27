#!/usr/bin/env python3
"""Draw hook words onto a featured-image scene.

The scene is generated with no letters. This script sets the type and writes
a 1280x720 PNG source plus a WebP under 200 KB.

Font
    Noto Sans Display Bold (NotoSansDisplay-Bold.ttf)
    Copyright 2010, 2012-2020 Google Inc. and Google LLC.
    Licensed under the SIL Open Font License, Version 1.1
    (https://scripts.sil.org/OFL).
    A thumbnail made with the font is a document, not Font Software, so the
    OFL does not restrict the image. Pass --font to use another file.

Usage
    python make_thumbnail.py SCENE --words STAY OUT LATE --side left --out DIR

DIR receives thumbnail.webp and thumbnail-source.png.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

FRAME = (1280, 720)
WEB_BUDGET = 200 * 1024
FILL = "#FFF4DC"
STROKE = "#16070B"
# Phone width the brief checks. Ink shorter than this at that width is hard to read.
PHONE_WIDTH = 320
MIN_PHONE_INK = 28

FONT_CANDIDATES = (
    Path("/usr/share/fonts/truetype/noto/NotoSansDisplay-Bold.ttf"),
    Path("/usr/share/fonts/opentype/noto/NotoSansDisplay-Bold.ttf"),
    Path.home() / ".local/share/fonts/NotoSansDisplay-Bold.ttf",
)


def fail(message: str) -> None:
    print(f"error: {message}", file=sys.stderr)
    raise SystemExit(1)


def find_font(explicit: str | None) -> Path:
    if explicit:
        path = Path(explicit)
        if not path.is_file():
            fail(f"font not found: {path}")
        return path
    for path in FONT_CANDIDATES:
        if path.is_file():
            return path
    fail(
        "Noto Sans Display Bold was not found. Install the Noto fonts "
        "(SIL Open Font License 1.1) or pass --font."
    )
    raise AssertionError


def to_frame(im: Image.Image) -> Image.Image:
    """Center-crop to 16:9 and resize to 1280x720."""
    im = im.convert("RGB")
    width, height = im.size
    target = FRAME[0] / FRAME[1]
    ratio = width / height
    if abs(ratio - target) > 0.01:
        if ratio > target:
            new_w = int(round(height * target))
            left = (width - new_w) // 2
            im = im.crop((left, 0, left + new_w, height))
        else:
            new_h = int(round(width / target))
            top = (height - new_h) // 2
            im = im.crop((0, top, width, top + new_h))
    if im.size != FRAME:
        im = im.resize(FRAME, Image.Resampling.LANCZOS)
    return im


def subject_mask(im: Image.Image, threshold: int) -> Image.Image:
    return im.convert("L").point(lambda p: 255 if p > threshold else 0)


def edge_x(mask: Image.Image, y: int, side: str, run: int = 5) -> int | None:
    """First subject pixel on this row, ignoring specks shorter than `run`."""
    width, _height = mask.size
    px = mask.load()
    if side == "left":
        x = 0
        while x < width:
            if px[x, y] > 0 and all(px[min(width - 1, x + i), y] > 0 for i in range(run)):
                return x
            x += 1
        return None
    x = width - 1
    while x >= 0:
        if px[x, y] > 0 and all(px[max(0, x - i), y] > 0 for i in range(run)):
            return x
        x -= 1
    return None


def protrusion(mask: Image.Image, side: str) -> tuple[int, int]:
    """The point where the subject sticks furthest into the type side.

    On these thumbnails that point is the fingertip, or the nose if nobody
    is pointing. Returns (x, y).
    """
    _width, height = mask.size
    y0, y1 = int(height * 0.18), int(height * 0.82)
    rows: list[tuple[int, int]] = []
    for y in range(y0, y1):
        x = edge_x(mask, y, side)
        if x is not None:
            rows.append((x, y))
    if not rows:
        fail("no subject found. Lower --threshold or check the scene.")
    if side == "left":
        best = min(x for x, _y in rows)
        near = [y for x, y in rows if x <= best + 8]
    else:
        best = max(x for x, _y in rows)
        near = [y for x, y in rows if x >= best - 8]
    near.sort()
    return best, near[len(near) // 2]


def word_box(font: ImageFont.FreeTypeFont, word: str) -> tuple[int, int, tuple[int, int, int, int]]:
    bbox = font.getbbox(word)
    return bbox[2] - bbox[0], bbox[3] - bbox[1], bbox


def fit_stack(
    words: list[str],
    font_path: Path,
    side: str,
    tip: tuple[int, int],
    point_at: str,
    air: int,
    margin: int,
) -> dict:
    """Largest type that keeps `point_at` just short of the fingertip."""
    width, height = FRAME
    tip_x, tip_y = tip
    index = words.index(point_at)
    best: dict | None = None
    low, high = 60, 300
    while low <= high:
        size = (low + high) // 2
        font = ImageFont.truetype(font_path, size)
        metrics = [word_box(font, word) for word in words]
        max_w = max(item[0] for item in metrics)
        max_h = max(item[1] for item in metrics)
        stroke = max(6, round(size / 23))
        gap = max(18, round(size / 8))
        step = max_h + stroke + gap
        if side == "left":
            align = tip_x - air - stroke
            far = align - max_w
            fits_x = far >= margin
        else:
            align = tip_x + air + stroke
            far = align + max_w
            fits_x = far <= width - margin
        point_h = metrics[index][1]
        top = tip_y - point_h / 2 - index * step
        bottom = top + step * (len(words) - 1) + max_h
        if top < margin:
            shift = margin - top
            top += shift
            bottom += shift
        if bottom > height - margin:
            shift = bottom - (height - margin)
            top -= shift
            bottom -= shift
        point_top = top + index * step
        point_bot = point_top + point_h
        covers_tip = point_top + 6 <= tip_y <= point_bot - 6
        fits_y = top >= margin and bottom <= height - margin
        if fits_x and fits_y and covers_tip:
            best = {
                "size": size,
                "font": font,
                "metrics": metrics,
                "stroke": stroke,
                "gap": gap,
                "step": step,
                "top": top,
                "align": align,
                "max_h": max_h,
            }
            low = size + 1
        else:
            high = size - 1
    if best is None:
        fail("the words do not fit beside the subject. Use fewer or shorter words.")
    return best


def draw_words(scene: Image.Image, words: list[str], side: str, layout: dict) -> Image.Image:
    base = scene.convert("RGBA")
    shadow = Image.new("RGBA", FRAME, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    font = layout["font"]
    for i, word in enumerate(words):
        ink_w, _ink_h, bbox = layout["metrics"][i]
        ink_top = layout["top"] + i * layout["step"]
        ink_left = layout["align"] - ink_w if side == "left" else layout["align"]
        origin = (ink_left - bbox[0] + 5, ink_top - bbox[1] + 7)
        shadow_draw.text(origin, word, font=font, fill=(0, 0, 0, 170))
    shadow = shadow.filter(ImageFilter.GaussianBlur(7))
    comp = Image.alpha_composite(base, shadow)
    draw = ImageDraw.Draw(comp)
    for i, word in enumerate(words):
        ink_w, _ink_h, bbox = layout["metrics"][i]
        ink_top = layout["top"] + i * layout["step"]
        ink_left = layout["align"] - ink_w if side == "left" else layout["align"]
        origin = (ink_left - bbox[0], ink_top - bbox[1])
        draw.text(
            origin,
            word,
            font=font,
            fill=FILL,
            stroke_width=layout["stroke"],
            stroke_fill=STROKE,
        )
    return comp.convert("RGB")


def overlap_count(text: Image.Image, scene: Image.Image, mask: Image.Image) -> int:
    text_px = text.load()
    scene_px = scene.load()
    mask_px = mask.load()
    width, height = FRAME
    count = 0
    for y in range(0, height, 2):
        for x in range(0, width, 2):
            if mask_px[x, y] == 0:
                continue
            tr, tg, tb = text_px[x, y]
            sr, sg, sb = scene_px[x, y]
            if abs(tr - sr) + abs(tg - sg) + abs(tb - sb) > 90:
                count += 1
    return count


def save_webp(im: Image.Image, path: Path) -> tuple[int, int]:
    """Write the highest-quality WebP that stays under 200 KB. Returns quality, bytes."""
    for quality in (95, 92, 90, 86, 82, 78, 74, 70, 66, 60):
        im.save(path, "WEBP", quality=quality, method=6)
        size = path.stat().st_size
        if size <= WEB_BUDGET:
            return quality, size
    fail(f"WebP is still over 200 KB at quality 60 ({path.stat().st_size} bytes).")
    raise AssertionError


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Set hook words on a thumbnail scene.")
    parser.add_argument("scene", type=Path, help="Scene image with no letters")
    parser.add_argument("--words", nargs="+", required=True, help="2 to 5 hook words")
    parser.add_argument("--side", choices=("left", "right"), required=True, help="Side the words sit on")
    parser.add_argument("--out", type=Path, required=True, help="Directory for the PNG and WebP")
    parser.add_argument("--point-at", default=None, help="Word the fingertip should meet (default: the middle word)")
    parser.add_argument("--air", type=int, default=22, help="Pixels of space between the fingertip and that word")
    parser.add_argument("--margin", type=int, default=28, help="Minimum space between the type and the frame")
    parser.add_argument("--threshold", type=int, default=32, help="Luminance above which a pixel counts as the subject")
    parser.add_argument("--font", default=None, help="Bold display font file. Default: Noto Sans Display Bold")
    parser.add_argument("--tip", nargs=2, type=int, metavar=("X", "Y"), help="Override the detected fingertip")
    return parser.parse_args(argv)


def main(argv: list[str]) -> None:
    args = parse_args(argv)
    words = [word.strip().upper() for word in args.words]
    if not 2 <= len(words) <= 5:
        fail("use 2 to 5 hook words.")
    for word in words:
        if not word.replace("-", "").replace("'", "").isalpha():
            fail(f"not a plain word: {word}")
    point_at = (args.point_at or words[len(words) // 2]).strip().upper()
    if point_at not in words:
        fail(f"--point-at {point_at} is not one of the hook words.")
    if not args.scene.is_file():
        fail(f"scene not found: {args.scene}")

    font_path = find_font(args.font)
    scene = to_frame(Image.open(args.scene))
    mask = subject_mask(scene, args.threshold)
    tip = tuple(args.tip) if args.tip else protrusion(mask, args.side)
    layout = fit_stack(words, font_path, args.side, tip, point_at, args.air, args.margin)
    final = draw_words(scene, words, args.side, layout)
    covered = overlap_count(final, scene, mask)
    if covered > 40:
        print(
            f"warning: type covers the subject ({covered} sampled pixels). "
            "Raise --air or pass --tip.",
            file=sys.stderr,
        )
    phone_ink = layout["max_h"] * PHONE_WIDTH / FRAME[0]
    if phone_ink < MIN_PHONE_INK:
        print(
            f"warning: type is {phone_ink:.0f}px tall at {PHONE_WIDTH}px wide. "
            f"Aim for at least {MIN_PHONE_INK}px.",
            file=sys.stderr,
        )

    args.out.mkdir(parents=True, exist_ok=True)
    png_path = args.out / "thumbnail-source.png"
    webp_path = args.out / "thumbnail.webp"
    final.save(png_path, "PNG", compress_level=3)
    quality, webp_bytes = save_webp(final, webp_path)
    if args.font is None:
        print(f"font: {font_path} (Noto Sans Display Bold, SIL OFL 1.1)")
    else:
        print(f"font: {font_path}")
    print(f"words: {' / '.join(words)}")
    print(f"side: {args.side}  point-at: {point_at}  fingertip: {tip[0]},{tip[1]}")
    print(f"size: {layout['size']}px  stroke: {layout['stroke']}  air: {args.air}px")
    print(f"png: {png_path} ({png_path.stat().st_size} bytes)")
    print(f"webp: {webp_path} (quality {quality}, {webp_bytes} bytes)")


if __name__ == "__main__":
    main(sys.argv[1:])
