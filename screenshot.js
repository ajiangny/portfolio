import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: 'screenshot.png' });
  await browser.close();
  console.log('Screenshot saved as screenshot.png');
})();
