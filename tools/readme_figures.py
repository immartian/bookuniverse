"""Render the README figures from the pre-generated 1:50 overview images.

    python tools/readme_figures.py

Writes docs/isbn-map-annotated.png and docs/isbn-sources.png.
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
IMG_DIR = ROOT / "static/images/isbnmap/1_50"
OUT_DIR = ROOT / "docs"

BG = (13, 15, 18)
INK = (232, 230, 227)
MUTED = (150, 156, 164)
RULE = (90, 96, 104)
RED = (255, 40, 40)
GREEN = (40, 230, 40)
AMBER = (255, 196, 64)

# 1000 x 800 overview: one row of pixels = 50 rows of the 50,000-wide 1:1 grid,
# so y = (isbn12 - 978000000000) / 2.5M
ISBNS_PER_ROW = 2_500_000


def font(size, bold=False):
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    return ImageFont.truetype(f"/usr/share/fonts/truetype/dejavu/{name}", size)


def y_of(prefix):
    """Overview row where an ISBN prefix like '979-8' starts."""
    digits = prefix.replace("-", "")
    offset = int(digits.ljust(12, "0")) - 978_000_000_000
    return offset // ISBNS_PER_ROW


def bracket(draw, x, y0, y1, label, sub=None, tick=6):
    draw.line([(x, y0 + 1), (x, y1 - 1)], fill=RULE, width=1)
    draw.line([(x - tick, y0 + 1), (x, y0 + 1)], fill=RULE, width=1)
    draw.line([(x - tick, y1 - 1), (x, y1 - 1)], fill=RULE, width=1)
    mid = (y0 + y1) / 2
    if sub:
        draw.text((x + 10, mid - 1), label, font=font(14, True), fill=INK, anchor="ls")
        draw.text((x + 10, mid + 3), sub, font=font(11), fill=MUTED, anchor="lt")
    else:
        draw.text((x + 10, mid), label, font=font(14, True), fill=INK, anchor="lm")


def annotated_map():
    base = Image.open(IMG_DIR / "all_isbns_1_50.png").convert("RGB")
    W, H = base.size  # 1000 x 800
    pad, top, gutter, foot = 32, 104, 330, 92
    img = Image.new("RGB", (pad + W + gutter, top + H + foot), BG)
    img.paste(base, (pad, top))
    d = ImageDraw.Draw(img)

    d.text((pad, 30), "Every ISBN in the world, on one map", font=font(26, True), fill=INK)
    d.text((pad, 66),
           "978-0…  →  979-9…  ·  2 billion ISBN-12 slots, read left→right, top→bottom  ·  "
           "50,000 × 40,000 px at 1:1, shown here at 1:50",
           font=font(14), fill=MUTED)

    # dashed divider between the 978 and 979 halves
    y979 = top + y_of("979")
    for x in range(pad, pad + W, 12):
        d.line([(x, y979), (x + 6, y979)], fill=(200, 200, 200), width=1)

    # outer ruler: the two EAN prefixes
    ox = pad + W + 18
    for p, y0, y1 in (("978", 0, 400), ("979", 400, 800)):
        d.line([(ox, top + y0 + 2), (ox, top + y1 - 2)], fill=INK, width=2)
        d.text((ox + 8, top + y0 + 4), p, font=font(18, True), fill=INK)

    # inner ruler: registration groups
    ix = ox + 70
    groups = [
        ("978-0", "978-2", "978-0 / 1", "English language"),
        ("978-2", "978-3", "978-2", "French"),
        ("978-3", "978-4", "978-3", "German"),
        ("978-4", "978-5", "978-4", "Japan"),
        ("978-5", "978-6", "978-5", "Russia & former USSR"),
        ("978-6", "978-7", "978-6", "Iran, Turkey, Mexico, Kenya…"),
        ("978-7", "978-8", "978-7", "China"),
        ("978-8", "978-9", "978-8x", "India, Italy, Spain, Brazil, Korea…"),
        ("978-9", "979", "978-9x", "Netherlands, Sweden, India…"),
        ("979-1", "979-2", "979-1x", "France, Korea, Italy, Spain"),
        ("979-8", "979-9", "979-8", "United States (since 2020)"),
    ]
    for start, end, label, sub in groups:
        bracket(d, ix, top + y_of(start), top + y_of(end), label, sub)
    bracket(d, ix, top + y_of("979-2"), top + y_of("979-8"), "979-2 … 979-7", "unassigned — still empty")

    # legend
    ly = top + H + 26
    d.rectangle([pad, ly, pad + 14, ly + 14], fill=RED)
    d.text((pad + 22, ly + 7), "ISBN known to at least one catalog (Google Books, WorldCat, OpenLibrary, …)",
           font=font(14), fill=INK, anchor="lm")
    d.rectangle([pad, ly + 26, pad + 14, ly + 40], fill=GREEN)
    d.text((pad + 22, ly + 33), "ISBN also held in Anna's Archive (md5)  ·  black = no book has this number",
           font=font(14), fill=INK, anchor="lm")

    OUT_DIR.mkdir(exist_ok=True)
    img.save(OUT_DIR / "isbn-map-annotated.png", optimize=True)


def block_max(a, k):
    h, w = a.shape
    return a[: h - h % k, : w - w % k].reshape(h // k, k, w // k, k).max(axis=(1, 3))


def source_grid():
    counts = {r["prefix"]: (r["name"], r["count"]) for r in json.load(open(ROOT / "static/data/all_books.json"))}
    sources = sorted((p for p in counts if p != "all"), key=lambda p: -counts[p][1])

    k, cols, gap, label_h = 4, 4, 18, 40
    tw, th = 1000 // k, 800 // k
    rows = -(-len(sources) // cols)
    pad, top = 32, 92
    W = pad * 2 + cols * tw + (cols - 1) * gap
    H = top + rows * (th + label_h + gap) + 8
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.text((pad, 26), "Who knows which books?", font=font(26, True), fill=INK)
    d.text((pad, 62), "Each panel is the same 978/979 map. Highlighted: ISBNs present in that source. "
                      "Grey: present elsewhere.", font=font(14), fill=MUTED)

    for i, p in enumerate(sources):
        rgb = np.asarray(Image.open(IMG_DIR / f"all_isbns_{p}_1_50.png").convert("RGB")).astype(np.float32)
        mine = block_max(rgb[..., 1], k) / 255.0               # green channel = this source
        anyone = block_max(rgb[..., :2].max(axis=2), k) / 255.0
        mine, anyone = mine ** 0.6, anyone ** 0.6               # lift faint, aggregated pixels
        out = np.empty(mine.shape + (3,), np.float32)
        for c in range(3):
            out[..., c] = BG[c] + anyone * 55 * (1 - mine) + mine * (AMBER[c] - BG[c])
        tile = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))

        x = pad + (i % cols) * (tw + gap)
        y = top + (i // cols) * (th + label_h + gap)
        img.paste(tile, (x, y))
        d.rectangle([x - 1, y - 1, x + tw, y + th], outline=(40, 44, 50))
        name, n = counts[p]
        d.text((x, y + th + 8), name, font=font(13, True), fill=INK)
        d.text((x, y + th + 25), f"{n:,} ISBNs", font=font(12), fill=MUTED)

    img.save(OUT_DIR / "isbn-sources.png", optimize=True)


if __name__ == "__main__":
    annotated_map()
    source_grid()
