const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const output = process.env.TEST_OUTPUT_DIR || '/private/tmp/fibr-style-qa';
const oldStyle = '.button{display:inline-flex;padding:10px 20px}.product-card{border:1px solid #ddd}.product-card__title{font-size:20px}';
const requests = [];
const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  if (url.pathname === '/before.html') {
    response.setHeader('Content-Type', 'text/html');
    response.end('<!doctype html><link rel="stylesheet" href="css/style.css"><a class="back-to-top">Наверх</a>');
    return;
  }
  if (url.pathname === '/css/style.css') requests.push(url.search);
  const file = path.join(root, url.pathname === '/' ? 'index.html' : url.pathname);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { response.writeHead(404); response.end(); return; }
  const type = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(file)];
  response.setHeader('Content-Type', type || 'application/octet-stream');
  response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  response.end(url.pathname === '/css/style.css' && !url.search ? oldStyle : fs.readFileSync(file));
});

(async () => {
  fs.mkdirSync(output, { recursive: true });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(`${base}before.html`);
    assert.equal(await page.locator('.back-to-top').evaluate((el) => getComputedStyle(el).position), 'static');
    await page.goto(`${base}catalog.html`);
    assert.equal(await page.locator('#catalog-grid .product-card').count(), 16);
    const source = await page.locator('link[rel="stylesheet"]').getAttribute('href');
    assert.match(source, /style\.css\?v=[a-f0-9]{12}$/);
    assert.equal(await page.locator('.product-card__actions').first().evaluate((el) => getComputedStyle(el).display), 'grid');
    const actions = await page.locator('.product-card__actions').first().evaluate((el) => [...el.children].map((button) => ({top:button.getBoundingClientRect().top,left:button.getBoundingClientRect().left,right:button.getBoundingClientRect().right})));
    assert.ok(Math.abs(actions[0].top - actions[1].top) < 1);
    assert.ok(actions[0].right < actions[1].left);
    for (const scroll of [300, 700, 1200, 2200]) {
      await page.evaluate((value) => scrollTo(0, value), scroll);
      const position = await page.evaluate(() => ({ top:document.querySelector('.catalog-filters').getBoundingClientRect().top, header:document.querySelector('.site-header').getBoundingClientRect().bottom }));
      assert.ok(Math.abs(position.top - position.header - 16) < 2, JSON.stringify(position));
    }
    await page.evaluate(() => scrollTo(0, 700));
    await page.screenshot({path:path.join(output,'catalog-sticky-fixed.png')});
    const top = await page.locator('.back-to-top').evaluate((el) => ({position:getComputedStyle(el).position,right:innerWidth-el.getBoundingClientRect().right,bottom:innerHeight-el.getBoundingClientRect().bottom}));
    assert.equal(top.position,'fixed'); assert.equal(top.right,16); assert.equal(top.bottom,16);
    const question = page.locator('.faq__question').first();
    assert.equal(await question.evaluate((el) => getComputedStyle(el).paddingTop),'16px');
    await question.click();
    assert.ok(await page.locator('details').first().locator('p').isVisible());
    await page.locator('#faq').screenshot({path:path.join(output,'faq-fixed.png')});
    await page.evaluate(() => localStorage.setItem('frontend-backend:cart',JSON.stringify([{id:'pen',quantity:2},{id:'pencil',quantity:1}])));
    await page.goto(`${base}cart.html`);
    assert.equal(await page.locator('.cart-layout').evaluate((el) => getComputedStyle(el).display),'grid');
    const cart = await page.evaluate(() => ({list:document.querySelector('#cart-items').getBoundingClientRect().right,summary:document.querySelector('.cart-summary').getBoundingClientRect().left}));
    assert.ok(cart.list < cart.summary);
    assert.equal(await page.locator('#cart-total').textContent(),'110 ₽');
    await page.screenshot({path:path.join(output,'cart-fixed.png'),fullPage:true});
    await page.goto(`${base}product.html?id=pen`);
    await page.locator('[data-compare-add]').click();
    await page.goto(`${base}product.html?id=pen-black`);
    await page.locator('[data-compare-add]').click();
    await page.goto(`${base}comparison.html`);
    assert.equal(await page.locator('.comparison-table thead th').count(),3);
    assert.deepEqual(await page.locator('tr').filter({has:page.getByRole('rowheader',{name:'Цвет чернил',exact:true})}).locator('td').allTextContents(),['Синий','Чёрный']);
    assert.ok(requests.includes('') && requests.some((query) => query.startsWith('?v=')));
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({passed:true,checks:['Old immutable CSS cache → current versioned stylesheet','16 products and aligned secondary actions','Sticky filter at 300/700/1200/2200 px','Top link fixed 16px from bottom/right','Styled FAQ opens','Cart grid and totals','Selected products compared in columns'],output},null,2));
  } finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
})().catch((error) => {console.error(error);server.close();process.exitCode=1;});
