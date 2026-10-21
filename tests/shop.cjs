const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:8817/';
const output = process.env.TEST_OUTPUT_DIR || '/private/tmp/fibr-shop-qa';
const address = (file) => new URL(file, base).href;

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();
  const errors = []; const checks = []; let posts = 0;
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', (request) => { if (request.method() === 'POST') posts += 1; });
  async function product(id) { await page.goto(address(`product.html?id=${id}`)); }
  async function compare(id) { await product(id); await page.locator('[data-compare-add]').click(); }
  async function screenshot(name) {
    await page.evaluate(() => { document.activeElement.blur(); scrollTo(0, 0); return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
    await page.screenshot({ path: path.join(output, name), fullPage: true });
  }
  try {
    await page.goto(address('catalog.html'));
    const items = await page.evaluate(() => products);
    assert.equal(items.length, 16);
    assert.equal(await page.locator('#catalog-grid .product-card').count(), 16);
    assert.equal(items.filter((p) => p.name.startsWith('Ручка')).length, 3);
    assert.equal(items.filter((p) => p.name.startsWith('Карандаш')).length, 3);
    for (const item of items) {
      await product(item.id);
      assert.equal(await page.locator('h1').textContent(), item.name);
      assert.equal(await page.locator('.product-details__specs dt').count(), Object.keys(item.characteristics).length + 1);
      assert.ok(await page.locator('.product-details__image').evaluate((img) => img.complete && img.naturalWidth > 0));
      await page.getByRole('button', { name: 'Заказать', exact: true }).click();
      assert.equal(await page.locator('#selected-product').inputValue(), item.name);
      for (const field of ['name', 'email', 'phone', 'date', 'topic', 'comment', 'agreement']) assert.equal(await page.locator(`#order-${field}`).count(), 1);
      await page.keyboard.press('Escape');
    }
    await product('unknown');
    assert.equal(await page.locator('h1').textContent(), 'Товар не найден');
    assert.ok(await page.locator('#product-not-found').isVisible());
    checks.push('16 product pages, three pens/three pencils, characteristics, unchanged complete quick-order form, unknown ID');

    for (const id of ['pen', 'pen-black', 'pen-red']) await compare(id);
    await page.goto(address('comparison.html'));
    assert.equal(await page.locator('.comparison-table thead th').count(), 4);
    assert.deepEqual(await page.locator('tr').filter({ has: page.getByRole('rowheader', { name: 'Цвет чернил', exact: true }) }).locator('td').allTextContents(), ['Синий', 'Чёрный', 'Красный']);
    assert.deepEqual(await page.locator('tr').filter({ has: page.getByRole('rowheader', { name: 'Толщина линии', exact: true }) }).locator('td').allTextContents(), ['0,7 мм', '1 мм', '0,3 мм']);
    await screenshot('compare-pens-desktop.png');
    await page.reload();
    assert.equal(await page.locator('[data-comparison-count]').textContent(), '3');
    await page.locator('[data-compare-remove="pen-black"]').click();
    assert.equal(await page.locator('.comparison-table thead th').count(), 3);
    await page.locator('#comparison-clear').click();
    assert.ok(await page.locator('#comparison-empty').isVisible());
    checks.push('Select three pens on product pages → columns with different ink/line widths; persistence, remove, clear');

    for (const id of ['pencil', 'pencil-2b', 'pencil-4b']) await compare(id);
    await page.goto(address('comparison.html'));
    const hardness = page.locator('tr').filter({ has: page.getByRole('rowheader', { name: 'Твёрдость', exact: true }) });
    assert.deepEqual(await hardness.locator('td').allTextContents(), ['HB', '2B', '4B']);
    const eraser = page.locator('tr').filter({ has: page.getByRole('rowheader', { name: 'Ластик', exact: true }) });
    assert.deepEqual(await eraser.locator('td').allTextContents(), ['Есть', 'Нет', 'Нет']);
    await screenshot('compare-pencils-desktop.png');
    await page.setViewportSize({ width: 390, height: 960 });
    assert.ok(await page.locator('.comparison').evaluate((el) => el.scrollWidth > el.clientWidth));
    await page.locator('.comparison').focus(); await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.querySelector('.comparison').scrollLeft > 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await screenshot('compare-pencils-mobile.png');
    await compare('pen');
    await product('pen-black'); await page.locator('[data-compare-add]').click();
    assert.match(await page.locator('#shop-notice').textContent(), /до четырёх/);
    assert.equal(await page.locator('[data-comparison-count]').textContent(), '4');
    assert.equal(await page.locator('[data-compare-add]').getAttribute('aria-pressed'), 'false');
    checks.push('Pencil HB/2B/4B comparison; mobile table scroll; maximum four products');

    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto(address('comparison.html'));
    await page.locator('[data-cart-add="pencil"]').click();
    await page.goto(address('catalog.html'));
    await page.locator('[data-cart-add="pen"]').click();
    await product('pen-black');
    await page.locator('[data-cart-add]').click(); await page.locator('[data-cart-add]').click();
    await page.goto(address('cart.html'));
    assert.equal(await page.locator('.cart-item').count(), 3);
    assert.equal(await page.locator('#cart-total').textContent(), '180 ₽');
    assert.equal(await page.locator('[data-cart-count]').textContent(), '4');
    await page.reload();
    assert.equal(await page.locator('#quantity-pen-black').inputValue(), '2');
    await page.locator('[data-cart-step="pen"][data-step="1"]').click();
    assert.equal(await page.locator('#cart-total').textContent(), '220 ₽');
    await page.locator('#quantity-pen').fill('0'); await page.locator('#quantity-pen').press('Tab');
    assert.equal(await page.locator('#quantity-pen').evaluate((input) => input.validity.valid), false);
    await page.locator('#quantity-pen').fill('3'); await page.locator('#quantity-pen').press('Tab');
    assert.equal(await page.locator('#cart-total').textContent(), '260 ₽');
    await page.locator('[data-cart-remove="pen-black"]').click();
    assert.equal(await page.locator('#cart-total').textContent(), '150 ₽');
    assert.equal(await page.locator('.cart-item').count(), 2);
    await screenshot('cart-desktop.png');
    await page.setViewportSize({ width: 390, height: 960 });
    await screenshot('cart-mobile.png');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.locator('#cart-checkout').click();
    assert.match(await page.locator('#selected-product').inputValue(), /Ручка синяя \(3 шт\.\)/);
    assert.match(await page.locator('#selected-product').inputValue(), /Карандаш HB \(1 шт\.\)/);
    assert.match(await page.locator('#selected-product').inputValue(), /150 ₽/);
    await page.locator('#order-name').fill('Тестовый студент');
    await page.locator('#order-email').fill('student@example.invalid');
    await page.locator('#order-phone').fill('+7 (900) 000-00-00');
    await page.locator('#order-date').fill('2026-10-25');
    await page.locator('#order-topic').selectOption('product');
    await page.locator('#order-comment').fill('Проверка корзины');
    await page.locator('#order-agreement').check();
    await page.getByRole('button', { name: 'Отправить заявку' }).click();
    assert.equal(await page.locator('#order-dialog').evaluate((el) => el.open), false);
    assert.match(await page.locator('#success-message').textContent(), /никуда не отправлялись/);
    assert.equal(await page.locator('#cart-total').textContent(), '150 ₽');
    await page.locator('#cart-clear').click();
    assert.ok(await page.locator('#cart-empty').isVisible());
    assert.equal(await page.locator('#cart-checkout').isDisabled(), true);
    checks.push('Catalog/product/comparison → cart; duplicate adds, quantities, validation, persistence, totals, remove, full basket → original form, clear');

    await page.goto(address('catalog.html'));
    await page.locator('#product-query').fill('ручка');
    await page.getByRole('button', { name: 'Применить' }).click();
    assert.equal(await page.locator('#catalog-grid .product-card:visible').count(), 3);
    await page.locator('#price-to').fill('60');
    await page.getByRole('button', { name: 'Применить' }).click();
    assert.equal(await page.locator('#catalog-grid .product-card:visible').count(), 2);
    await page.getByRole('button', { name: 'Сбросить' }).click();
    await page.waitForFunction(() => document.querySelectorAll('#catalog-grid .product-card:not([hidden])').length === 16);
    const question = page.locator('.faq__question').first();
    await question.focus(); await page.keyboard.press('Enter');
    assert.equal(await page.locator('details').first().getAttribute('open'), '');
    assert.equal(await page.locator('details').count(), 6);
    checks.push('Search and price combine; reset restores 16 products; native FAQ keyboard toggle');

    for (const width of [768, 1440]) {
      await page.setViewportSize({ width, height: 960 }); await page.goto(address('catalog.html'));
      await page.evaluate(() => scrollTo(0, 650));
      const position = await page.evaluate(() => ({ top: document.querySelector('.catalog-filters').getBoundingClientRect().top, header: document.querySelector('.site-header').getBoundingClientRect().bottom }));
      assert.ok(Math.abs(position.top - position.header - 16) < 2, JSON.stringify(position));
      await page.screenshot({ path: path.join(output, `sticky-${width}.png`) });
    }
    await page.setViewportSize({ width: 1024, height: 500 }); await page.goto(address('catalog.html'));
    assert.ok(await page.locator('.catalog-filters').evaluate((el) => el.scrollHeight > el.clientHeight));
    await page.getByRole('button', { name: 'Сбросить' }).focus();
    assert.ok(await page.getByRole('button', { name: 'Сбросить' }).evaluate((el) => el.getBoundingClientRect().bottom <= innerHeight));
    await page.setViewportSize({ width: 390, height: 960 }); await page.reload();
    assert.equal(await page.locator('.catalog-filters').evaluate((el) => getComputedStyle(el).position), 'static');
    for (const id of ['advantages', 'popular', 'contacts']) {
      await page.goto(address(`index.html#${id}`));
      const state = await page.evaluate((id) => ({ target: document.querySelector(`#${id} h2`).getBoundingClientRect().top, header: document.querySelector('.site-header').getBoundingClientRect().bottom }), id);
      assert.ok(state.target >= state.header - 1, JSON.stringify(state));
    }
    await page.getByRole('link', { name: 'Вернуться к началу страницы' }).click();
    await page.waitForFunction(() => scrollY <= 1);
    checks.push('Sticky filter at 768/1440, short-screen controls, normal mobile filter; original anchors and word-only top link');

    await page.evaluate(() => { localStorage.setItem('frontend-backend:cart', '{bad json'); localStorage.setItem('frontend-backend:comparison', '["unknown",null,{}]'); });
    await page.goto(address('cart.html'));
    assert.ok(await page.locator('#cart-empty').isVisible());
    await page.evaluate(() => localStorage.setItem('frontend-backend:cart', JSON.stringify([{id:'pen',quantity:-10},{id:'unknown',quantity:5}])));
    await page.reload();
    assert.ok(await page.locator('#cart-empty').isVisible());
    const second = await context.newPage(); await second.goto(address('product.html?id=pen'));
    await second.locator('[data-cart-add]').click();
    await page.waitForFunction(() => document.querySelector('#cart-total').textContent === '40 ₽');
    await second.close();
    checks.push('Malformed/unknown saved entries handled; cart synchronizes across tabs');
    const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 960 } });
    const fallback = await noJs.newPage(); await fallback.goto(address('catalog.html'));
    assert.equal(await fallback.locator('#catalog-grid .product-card').count(), 16);
    await fallback.locator('summary').first().click();
    assert.ok(await fallback.locator('details').first().locator('p').isVisible());
    assert.equal(await fallback.evaluate(() => document.querySelector('main').getBoundingClientRect().top >= document.querySelector('.site-header').getBoundingClientRect().bottom), true);
    await noJs.close();
    assert.equal(posts, 0); assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output,'shop-results.json'),JSON.stringify({passed:true,checks,posts,errors},null,2));
    console.log(JSON.stringify({passed:true,checks,posts,output},null,2));
  } finally { await browser.close(); }
})().catch((error)=>{console.error(error);process.exitCode=1;});
