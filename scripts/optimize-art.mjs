/**
 * optimize-art.mjs — downscale + re-encode the About-gallery art in place.
 *
 * Per-image targets reflect the LARGEST size each file is ever displayed at:
 *   • Gallery lightbox art (GALLERY_ART) — opens fullscreen (max-height 60vh,
 *     object-contain), so needs ~1600px on the long edge to stay crisp on
 *     large/retina screens.
 *   • profile.webp — the About portrait expands to ~30vw; 1400px covers 2× DPR.
 *   • everything else — About cluster cells only (≤ ~530px @2×DPR); 800px is
 *     ample. Source art was 1920–3840px wide (art11 was 3840×5120 ≈ 20MP),
 *     forcing the browser to decode hundreds of MB of bitmaps and composite
 *     huge textures over the live WebGL canvas every scroll frame.
 *
 * Uses the already-installed puppeteer (headless Chrome canvas WebP encoder) —
 * no new dependency. Idempotent: only writes when the result is smaller, so it
 * won't re-encode already-optimised files (avoids generational quality loss).
 *
 * Run all:           node scripts/optimize-art.mjs
 * Run specific files: node scripts/optimize-art.mjs art1.webp art13.webp
 *   (restore originals from git first if you need to UP the resolution:
 *    git checkout -- public/art/art1.webp …)
 */
import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'

const dir = 'public/art'

// Art shown in the Gallery fullscreen lightbox (mirror of galleryData.js).
const GALLERY_ART = new Set([
  'art1.webp', 'art2.webp', 'art3.webp', 'art4.webp', 'art5.webp',
  'art6.webp', 'art7.webp', 'art8.webp', 'art13.webp',
])

const targetFor = (f) => {
  if (f === 'profile.webp') return { max: 1400, q: 0.82 }
  if (GALLERY_ART.has(f)) return { max: 1600, q: 0.82 }
  return { max: 800, q: 0.8 }
}

// Optional CLI filter — process only the named files (else the whole folder).
const only = process.argv.slice(2)
const files = fs.readdirSync(dir)
  .filter((f) => f.endsWith('.webp'))
  .filter((f) => only.length === 0 || only.includes(f))

const browser = await puppeteer.launch()
const page = await browser.newPage()
let before = 0
let after = 0

for (const f of files) {
  const { max, q } = targetFor(f)
  const raw = fs.readFileSync(path.join(dir, f))
  before += raw.length
  const dataUrl = `data:image/webp;base64,${raw.toString('base64')}`

  const out = await page.evaluate(async (src, maxEdge, quality) => {
    const img = new Image()
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = src })
    const w = img.naturalWidth
    const h = img.naturalHeight
    const scale = Math.min(1, maxEdge / Math.max(w, h))
    const cw = Math.round(w * scale)
    const ch = Math.round(h * scale)
    const c = document.createElement('canvas')
    c.width = cw
    c.height = ch
    const ctx = c.getContext('2d')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, cw, ch)
    return { url: c.toDataURL('image/webp', quality), cw, ch, sw: w, sh: h }
  }, dataUrl, max, q)

  const buf = Buffer.from(out.url.split(',')[1], 'base64')
  // Write if we shrank the file OR reduced its dimensions (the latter matters
  // for decode cost even when a more aggressively-compressed original is fewer
  // bytes). Same-size re-encodes are skipped, keeping the script idempotent.
  if (buf.length < raw.length || out.cw < out.sw) {
    fs.writeFileSync(path.join(dir, f), buf)
    after += buf.length
    console.log(`${f}: ${(raw.length / 1024 | 0)}KB -> ${(buf.length / 1024 | 0)}KB  (${out.cw}x${out.ch})`)
  } else {
    after += raw.length
    console.log(`${f}: kept (${(raw.length / 1024 | 0)}KB, re-encode not smaller)`)
  }
}

await browser.close()
console.log(`\nTOTAL: ${(before / 1024 / 1024).toFixed(2)}MB -> ${(after / 1024 / 1024).toFixed(2)}MB`)
