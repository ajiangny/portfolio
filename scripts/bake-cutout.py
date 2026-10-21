"""
bake-cutout.py — bake an art cutout into the riot treatments.

Input: a transparent PNG of a figure (background already removed; see the
"Art cutouts" recipe in ARCHITECTURE.md). Output, next to each other:

  <out>-halftone.webp  ink/cream 45-degree dot screen + ink line work
  <out>-colour.webp    the painting as is

Both get the same cream keyline and hard ink shadow, cropped to the figure,
and keep transparency so the menu field shows through. Floating bits (glass
shards) keep their fill but skip the keyline; only the main body is outlined.

  pip install opencv-python-headless scipy
  python scripts/bake-cutout.py cape.png public/art/cutouts/cape 1600
"""
import sys

import cv2
import numpy as np
from scipy import ndimage as nd

src, out, height = sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 1600
PERIOD = 13  # dot pitch in output px
INK, CREAM = np.array([22, 16, 15.]), np.array([255, 255, 255.])  # BGR: --color-slab, --color-cream

im = cv2.imread(src, cv2.IMREAD_UNCHANGED)
a = im[..., 3]
ys, xs = np.where(a > 128)
im = im[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
s = height / im.shape[0]
im = cv2.resize(im, None, fx=s, fy=s, interpolation=cv2.INTER_AREA if s < 1 else cv2.INTER_CUBIC)
rgb, a = im[..., :3], im[..., 3] / 255.

# Keyline width and shadow offset scale with the figure; pad so they fit.
k = max(5, height // 160)
dx, dy = int(k * 2.2), int(k * 1.8)
pad = k + max(dx, dy) + 2
rgb = cv2.copyMakeBorder(rgb, pad, pad, pad, pad, cv2.BORDER_REPLICATE)
a = cv2.copyMakeBorder(a, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=0)
h, w = a.shape
fg = a > .5

# Main body only (largest blob) gets the keyline and shadow.
lab, n = nd.label(fg)
body = lab == (np.argmax(np.bincount(lab.ravel())[1:]) + 1) if n else fg
body = nd.binary_fill_holes(body)
o = cv2.dilate(body.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * k + 1, 2 * k + 1))).astype(float)
o = cv2.GaussianBlur(o, (3, 3), 0)
shadow = np.zeros_like(o)
shadow[dy:, dx:] = o[:-dy, :-dx]

# Halftone fill: local contrast, 45-degree screen, cream dots grow with light.
g8 = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8)).apply(cv2.cvtColor(rgb, cv2.COLOR_BGR2GRAY))
L = cv2.GaussianBlur(g8 / 255., (0, 0), PERIOD / 5)
lo, hi = np.percentile(L[fg], 18), np.percentile(L[fg], 96)
t = np.clip((L - lo) / (hi - lo), 0, 1)
yy, xx = np.mgrid[0:h, 0:w].astype(float)
u, v = (xx + yy) / np.sqrt(2), (xx - yy) / np.sqrt(2)
d = np.hypot((u % PERIOD) - PERIOD / 2, (v % PERIOD) - PERIOD / 2) / (PERIOD / np.sqrt(2))
cov = np.clip((np.sqrt(t) - d) * PERIOD / 1.5 + .5, 0, 1)
cov = np.where(t >= .98, 1, np.where(t <= .02, 0, cov))
g = cv2.GaussianBlur(g8, (0, 0), 1.6).astype(float)
cov *= 1 - np.clip((cv2.GaussianBlur(g, (0, 0), 5) - g - 6) / 6, 0, 1) * fg
halftone = INK * (1 - cov[..., None]) + CREAM * cov[..., None]


def compose(fill):
    col = np.zeros((h, w, 3))
    alpha = np.zeros((h, w))
    for c, al in ((INK, shadow), (CREAM, o), (fill, a)):
        col = col * (1 - al[..., None]) + (c if np.ndim(c) == 3 else c) * al[..., None]
        alpha = alpha + al * (1 - alpha)
    # un-premultiply against the empty (black) start so edges stay clean
    col = np.where(alpha[..., None] > 0, col / np.maximum(alpha[..., None], 1e-6), 0)
    return np.dstack([np.clip(col, 0, 255), alpha * 255]).astype(np.uint8)


for name, fill in (('halftone', halftone), ('colour', rgb.astype(float))):
    cv2.imwrite(f'{out}-{name}.webp', compose(fill), [cv2.IMWRITE_WEBP_QUALITY, 80])
    print(f'{out}-{name}.webp')
