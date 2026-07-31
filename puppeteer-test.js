const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  page.on('console', msg => console.log('LOG:', msg.text()));
  page.on('pageerror', err => console.log('ERR:', err.message));
  await page.goto('https://collabcode-hu9d.onrender.com', { waitUntil: 'networkidle0' }).catch(e => console.log('NAV:', e.message));
  await browser.close();
})();
