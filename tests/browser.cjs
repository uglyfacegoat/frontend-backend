const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:8817/';
const output = process.env.TEST_OUTPUT_DIR || '/private/tmp/fibr-browser-qa';

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  });
  const errors = [];
  const results = [];
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', (request) => errors.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
  try {
    const titles = new Set();
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 960 });
      for (const file of ['index.html', 'catalog.html', 'contacts.html']) {
        await page.goto(new URL(file, base).href);
        await page.evaluate(() => document.fonts.ready);
        await page.locator('img').evaluateAll((images) => Promise.all(images.map((img) => {
          img.loading = 'eager';
          return img.decode();
        })));
        const state = await page.evaluate(() => {
          const ids = [...document.querySelectorAll('[id]')].map((element) => element.id);
          return {
            width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
            main: document.querySelectorAll('main').length, h1: document.querySelectorAll('h1').length,
            duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
            description: document.querySelector('meta[name="description"]')?.content,
            images: [...document.images].every((img) => img.complete && img.naturalWidth > 0 && img.alt),
            inlineStyles: document.querySelectorAll('[style]').length,
            links: [...document.querySelectorAll('a[href]')].map((anchor) => anchor.href),
            nav: getComputedStyle(document.querySelector('.site-nav__list')).display,
            cards: document.querySelector('.products-grid') && getComputedStyle(document.querySelector('.products-grid')).display,
          };
        });
        assert.ok(state.scrollWidth <= state.width, `${file} ${width}: horizontal overflow`);
        assert.equal(state.main, 1); assert.equal(state.h1, 1);
        assert.equal(state.duplicateIds.length, 0); assert.equal(state.inlineStyles, 0);
        assert.ok(state.description); assert.ok(state.images); assert.equal(state.nav, 'flex');
        if (state.cards) assert.equal(state.cards, 'grid');
        for (const href of state.links) {
          const url = new URL(href);
          if (url.origin !== new URL(base).origin) continue;
          const response = await page.request.get(url.href);
          assert.equal(response.status(), 200, href);
          if (url.hash) {
            assert.ok((await response.text()).includes(`id="${url.hash.slice(1)}"`), href);
          }
        }
        titles.add(await page.title());
        await page.screenshot({ path: path.join(output, `${file.replace('.html', '')}-${width}.png`), fullPage: true });
        results.push(`${file} ${width}px: HTML, assets, links, Flex/Grid, no overflow`);
      }
    }
    assert.equal(titles.size, 3);
    await page.goto(new URL('index.html', base).href);
    await page.getByRole('link', { name: 'Каталог', exact: true }).click();
    assert.ok(page.url().endsWith('/catalog.html'));
    await page.getByRole('link', { name: 'Контакты', exact: true }).click();
    assert.ok(page.url().endsWith('/contacts.html'));
    await page.getByRole('link', { name: 'Обратная связь на главной' }).click();
    assert.ok(page.url().endsWith('index.html#contacts'));
    assert.equal(await page.locator(':target').getAttribute('id'), 'contacts');
    results.push('Navigation: page clicks and cross-page anchor');

    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 960 });
      await page.goto(new URL('catalog.html', base).href);
      const trigger = page.getByRole('button', { name: 'Заказать', exact: true }).first();
      await trigger.click();
      assert.equal(await page.locator('#selected-product').inputValue(), 'Тетрадь в клетку');
      assert.equal(await page.locator('#order-name').evaluate((el) => el === document.activeElement), true);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('dialog').evaluate((el) => el.open), false);
      assert.ok(await trigger.evaluate((el) => el === document.activeElement));
      await trigger.click();
      await page.getByRole('button', { name: 'Отправить заявку' }).click();
      assert.equal(await page.locator('dialog').evaluate((el) => el.open), true);
      assert.equal(await page.locator('#order-name').getAttribute('aria-invalid'), 'true');
      assert.ok(await page.locator('#form-error').isVisible());
      await page.locator('#order-name').fill('  ');
      await page.locator('#order-email').fill('wrong-email');
      await page.locator('#order-phone').fill('123');
      await page.getByRole('button', { name: 'Отправить заявку' }).click();
      assert.equal(await page.locator('#order-email').getAttribute('aria-invalid'), 'true');
      assert.equal(await page.locator('#order-phone').getAttribute('aria-invalid'), 'true');
      await page.screenshot({ path: path.join(output, `dialog-error-${width}.png`) });
      await page.locator('#order-name').fill('Тестовый студент');
      await page.locator('#order-email').fill('student@example.invalid');
      await page.locator('#order-phone').fill('+7 (900) 000-00-00');
      await page.locator('#order-topic').selectOption('question');
      await page.locator('#order-date').fill('2026-10-20');
      await page.locator('#order-comment').fill('Учебная проверка');
      await page.locator('#order-agreement').check();
      assert.ok(await page.locator('#order-form').evaluate((el) => el.checkValidity()));
      const modalState = await page.locator('dialog').evaluate((el) => ({ width: el.getBoundingClientRect().width, scroll: el.scrollWidth, viewport: innerWidth }));
      assert.ok(modalState.width <= modalState.viewport); assert.ok(modalState.scroll <= modalState.width);
      await page.screenshot({ path: path.join(output, `dialog-filled-${width}.png`) });
      let postRequests = 0;
      const onRequest = (req) => { if (req.method() === 'POST') postRequests += 1; };
      page.on('request', onRequest);
      await page.getByRole('button', { name: 'Отправить заявку' }).click();
      page.off('request', onRequest);
      assert.equal(postRequests, 0);
      assert.equal(await page.locator('dialog').evaluate((el) => el.open), false);
      assert.ok(await page.locator('#success-message').isVisible());
      assert.match(await page.locator('#success-message').textContent(), /никуда не отправлялись/);
      await page.waitForFunction(() => document.activeElement === document.querySelector('#success-message'));
      await page.getByRole('button', { name: 'Заказать', exact: true }).nth(1).click();
      assert.equal(await page.locator('#selected-product').inputValue(), 'Папка для документов');
      assert.equal(await page.locator('#order-name').inputValue(), '');
      assert.equal(await page.locator('#order-name').getAttribute('aria-invalid'), null);
      await page.getByRole('button', { name: 'Закрыть', exact: true }).click();
      results.push(`Dialog ${width}px: open, product, focus, Escape, invalid fields, valid demo, repeat`);
    }

    await page.goto(new URL('catalog.html', base).href);
    const visibleCards = () => page.locator('#catalog-grid .product-card:visible').count();
    await page.getByLabel('Для письма', { exact: true }).check();
    await page.getByRole('button', { name: 'Применить' }).click();
    assert.equal(await visibleCards(), 2);
    await page.locator('#price-to').fill('35');
    await page.getByRole('button', { name: 'Применить' }).click();
    assert.equal(await visibleCards(), 1);
    await page.locator('#price-from').fill('50');
    await page.getByRole('button', { name: 'Применить' }).click();
    assert.ok(await page.locator('#filters-error').isVisible());
    assert.equal(await visibleCards(), 1);
    await page.locator('#price-from').fill('41');
    await page.locator('#price-to').fill('50');
    await page.getByRole('button', { name: 'Применить' }).click();
    assert.equal(await visibleCards(), 0);
    assert.ok(await page.locator('#catalog-empty').isVisible());
    await page.getByRole('button', { name: 'Сбросить' }).click();
    await page.waitForFunction(() => document.querySelectorAll('#catalog-grid .product-card:not([hidden])').length === 4);
    assert.equal(await visibleCards(), 4);
    assert.ok(!(await page.locator('#catalog-empty').isVisible()));
    results.push('Filters: category, price, invalid range, no results, reset');
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => ({ focused: document.activeElement.matches(':focus-visible'), outline: getComputedStyle(document.activeElement).outlineStyle }));
    assert.ok(focus.focused); assert.equal(focus.outline, 'solid');
    results.push('Keyboard focus: visible outline');
    assert.equal(errors.length, 0, errors.join('\n'));
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ passed: true, checks: results, errors }, null, 2));
    console.log(JSON.stringify({ passed: true, checks: results, output }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
