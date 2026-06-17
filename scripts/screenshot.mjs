/**
 * screenshot.mjs — capture the portfolio at multiple scroll positions
 * and viewport sizes for a UI/UX audit.
 *
 * Run (dev server must be up):  node scripts/screenshot.mjs [setName] [url]
 * Shots land in scripts/shots/<setName>/ (default "current") so a
 * "baseline" set can be captured before a change and diffed after.
 */
import puppeteer from 'puppeteer'
import fs from 'fs'

const setName = process.argv[2] || 'current'
const OUT = `scripts/shots/${setName}`
fs.mkdirSync(OUT, { recursive: true })

const URL = process.argv[3] || 'http://localhost:5173/'

// scroll positions expressed in viewport-heights
const STOPS = [
  ['hero', 0],
  ['about-entry', 1.25],
  ['about-filmstrip', 2.5],
  ['about-strip-end', 2.75],
  ['about-split', 3.1],
  ['about-profile', 3.6],
  ['about-text', 4.6],
  ['about-pause', 6.0],
  ['seam-1', 7.2],
  ['seam-2', 7.5],
  ['seam-3', 7.8],
  ['projects-carousel', 8.5],
  ['projects-exit', 10.2],
  ['gallery-start', 12.05],
  ['gallery-grid', 12.5],
  ['contact', 15.5],
]

const VIEWPORTS = [
  ['desktop', { width: 1440, height: 900 }],
  ['tablet', { width: 768, height: 1024 }],
  ['mobile', { width: 390, height: 844, isMobile: true, hasTouch: true }],
]

// Force software WebGL (ANGLE/SwiftShader) so the WebGL gradient background
// renders in headless capture — default headless Chrome has no GPU/WebGL and
// would show only the cream fallback.
const browser = await puppeteer.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
for (const [vpName, vp] of VIEWPORTS) {
  const page = await browser.newPage()
  await page.setViewport(vp)
  await page.goto(URL, { waitUntil: 'networkidle0' })
  await new Promise(r => setTimeout(r, 1500))

  for (const [name, vh] of STOPS) {
    await page.evaluate(y => window.scrollTo(0, y), vh * vp.height)
    await new Promise(r => setTimeout(r, 1200))
    await page.screenshot({ path: `${OUT}/${vpName}-${name}.png` })
    console.log(`captured ${vpName}-${name}`)

    // On mobile, also capture the SectionNav dropdown opened via tap
    if (vp.isMobile && name === 'projects-carousel') {
      await page.tap('#projects [aria-label="Section navigation"]')
      await new Promise(r => setTimeout(r, 800))
      await page.screenshot({ path: `${OUT}/${vpName}-${name}-nav-open.png` })
      console.log(`captured ${vpName}-${name}-nav-open`)
      await page.tap('body') // close again
      await new Promise(r => setTimeout(r, 500))
    }
  }

  // true page bottom — final resting state of the Contact section
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await new Promise(r => setTimeout(r, 1200))
  await page.screenshot({ path: `${OUT}/${vpName}-bottom.png` })
  console.log(`captured ${vpName}-bottom`)
  await page.close()
}
await browser.close()
console.log('done')
