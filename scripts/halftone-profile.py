"""
halftone-profile.py — bake the About portrait's riot halftone.

Turns a photo into public/art/profile-halftone.webp: the subject cut out,
an ink/cream 45-degree dot screen with ink line work for features, a cream
keyline and a hard ink shadow. The scene behind (city, clouds) becomes a
cobalt halftone: deep-cobalt dots for the dark parts, cream dots for the
brightest (clouds), on the cobalt field (--color-riot).
ProfilePhoto.tsx shows it at rest and wipes the real photo in on hover.

  pip install "rembg[cpu]" opencv-python-headless scipy
  python scripts/halftone-profile.py public/art/profile.webp public/art/profile-halftone.webp

The first run downloads the BiRefNet portrait model (~1 GB). Keep the output
the same size as the photo so the hover swap lines up exactly.
"""
import sys

import cv2
import numpy as np
from PIL import Image
from rembg import new_session, remove

PERIOD = 13  # dot pitch in source px (~4 px on screen in the About card)
COBALT, DEEP = np.array([210, 75, 30.]), np.array([138, 39, 16.])  # BGR: --color-riot, --color-riot-deep
INK, CREAM = np.array([22, 16, 15.]), np.array([255, 255, 255.])

src, dst = sys.argv[1], sys.argv[2]
cut = np.array(remove(Image.open(src).convert('RGB'), session=new_session('birefnet-portrait')))
rgb = cv2.cvtColor(cut[..., :3], cv2.COLOR_RGB2BGR)
a = cut[..., 3] / 255.
a[a < 0.08] = 0
h, w = a.shape
fg = a > .5

# Tone: local contrast first so the face survives the two-tone squeeze.
g8 = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8)).apply(cv2.cvtColor(rgb, cv2.COLOR_BGR2GRAY))
L = cv2.GaussianBlur(g8 / 255., (0, 0), PERIOD / 5)
lo, hi = np.percentile(L[fg], 18), np.percentile(L[fg], 96)
t = np.clip((L - lo) / (hi - lo), 0, 1)

# 45-degree screen: cream dots on ink, dot area grows with lightness.
yy, xx = np.mgrid[0:h, 0:w].astype(float)
u, v = (xx + yy) / np.sqrt(2), (xx - yy) / np.sqrt(2)
d = np.hypot((u % PERIOD) - PERIOD / 2, (v % PERIOD) - PERIOD / 2) / (PERIOD / np.sqrt(2))


def dots(tone):
    """Antialiased dot coverage; dot area grows with tone (0..1)."""
    c = np.clip((np.sqrt(tone) - d) * PERIOD / 1.5 + .5, 0, 1)
    return np.where(tone >= .98, 1, np.where(tone <= .02, 0, c))


cov = dots(t)

# Ink line work from dark detail (eyes, mouth, folds).
g = cv2.GaussianBlur(g8, (0, 0), 1.6).astype(float)
line = np.clip((cv2.GaussianBlur(g, (0, 0), 5) - g - 6) / 6, 0, 1) * fg
cov *= 1 - line
fill = INK * (1 - cov[..., None]) + CREAM * cov[..., None]

# Keyline + hard offset shadow, then composite on the cobalt field.
k = max(4, w // 110)
o = cv2.dilate(fg.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * k + 1, 2 * k + 1))).astype(float)
o = cv2.GaussianBlur(o, (3, 3), 0)
dx, dy = int(k * 2.2), int(k * 1.8)
shadow = np.zeros_like(o)
shadow[dy:, dx:] = o[:-dy, :-dx]
# Background scene: its own tone mapping (whole frame, gentler contrast).
gb = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(cv2.cvtColor(np.array(Image.open(src).convert('RGB')), cv2.COLOR_RGB2GRAY))
Lb = cv2.GaussianBlur(gb / 255., (0, 0), PERIOD / 5)
dark, light = dots(np.clip((.75 - Lb) / .6, 0, 1)), dots(np.clip((Lb - .72) / .25, 0, 1))
out = COBALT * (1 - dark[..., None]) + DEEP * dark[..., None]
out = out * (1 - light[..., None]) + CREAM * light[..., None]
for colour, alpha in ((INK, shadow), (CREAM, o), (fill, a)):
    out = out * (1 - alpha[..., None]) + colour * alpha[..., None]
cv2.imwrite(dst, out.astype(np.uint8), [cv2.IMWRITE_WEBP_QUALITY, 75])
