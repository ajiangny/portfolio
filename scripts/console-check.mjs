// Quick diagnostic: load the app headlessly and print any console/page errors.
// Usage: node scripts/console-check.mjs [url]
import puppeteer from 'puppeteer'

const url = process.argv[2] || 'http://localhost:5173/'
const browser = await puppeteer.launch()
const page = await browser.newPage()
page.on('console', (msg) => {
  if (msg.type() === 'error' || msg.type() === 'warning') console.log(`[${msg.type()}]`, msg.text())
})
page.on('pageerror', (err) => console.log('[uncaught]', err.message))
await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 }).catch((e) => console.log('[nav-fail]', e.message))
await new Promise((r) => setTimeout(r, 2500))
const rootHtmlLen = await page.evaluate(() => document.getElementById('root')?.innerHTML.length ?? -1)
console.log('root innerHTML length:', rootHtmlLen)
await browser.close()
