'use strict';

const CART_KEY = 'frontend-backend:cart';
const COMPARISON_KEY = 'frontend-backend:comparison';
const findProduct = (id) => products.find((product) => product.id === id);
const money = (value) => `${value} ₽`;
const escapeHtml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
let noticeTimer;

function notify(message) {
  const notice = document.querySelector('#shop-notice');
  clearTimeout(noticeTimer);
  notice.textContent = message;
  notice.hidden = false;
  noticeTimer = setTimeout(() => { notice.hidden = true; }, 5000);
}

function readSaved(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    notify('Не удалось прочитать сохранённый список. Можно выбрать товары заново.');
    return [];
  }
}

function loadCart() {
  const saved = readSaved(CART_KEY);
  return products.flatMap((product) => {
    const item = saved.find((item) => item && item.id === product.id);
    return item && Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 99 ? [{ id: product.id, quantity: item.quantity }] : [];
  });
}

function loadComparison() {
  return [...new Set(readSaved(COMPARISON_KEY).filter((id) => typeof id === 'string' && findProduct(id)))].slice(0, 4);
}

let cart = loadCart();
let comparison = loadComparison();

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    notify('Сохранение в браузере недоступно. Список останется до перезагрузки страницы.');
  }
}

function updateCounters() {
  const quantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.querySelectorAll('[data-cart-count]').forEach((element) => { element.textContent = quantity; });
  document.querySelectorAll('[data-comparison-count]').forEach((element) => { element.textContent = comparison.length; });
  document.querySelectorAll('[data-compare-add]').forEach((button) => {
    const selected = comparison.includes(button.dataset.compareAdd);
    button.setAttribute('aria-pressed', String(selected));
    button.textContent = button.hasAttribute('data-compare-full') ? (selected ? 'Убрать из сравнения' : 'Добавить в сравнение') : (selected ? 'В сравнении' : 'Сравнить');
  });
}

function renderProduct() {
  const content = document.querySelector('#product-content');
  if (!content) return;
  const id = new URLSearchParams(location.search).get('id') || 'notebook';
  const product = findProduct(id);
  const heading = document.querySelector('#product-title');
  if (!product) {
    heading.textContent = 'Товар не найден';
    document.querySelector('#product-not-found').hidden = false;
    document.title = 'Товар не найден — Канцтовары';
    return;
  }
  heading.textContent = product.name;
  document.title = `${product.name} — Канцтовары`;
  content.innerHTML = `<div class="product-details">
    <img class="product-details__image" src="images/${product.image}" alt="${escapeHtml(product.alt)}" width="640" height="480">
    <div><p class="section__description">${escapeHtml(product.description)}</p><p class="product-details__price">${money(product.price)} / ${escapeHtml(product.unit)}</p>
      <div class="product-details__actions"><button class="button button--primary" type="button" data-cart-add="${product.id}">В корзину</button><button class="button button--secondary" type="button" data-product="${escapeHtml(product.name)}">Заказать</button><button class="button button--secondary" type="button" data-compare-add="${product.id}" data-compare-full aria-pressed="false">Добавить в сравнение</button></div>
      <p class="product-details__note">Учебный товар. Цены и характеристики демонстрационные, реальные покупки недоступны.</p>
      <section aria-labelledby="specifications-title"><h2 class="product-details__title" id="specifications-title">Характеристики</h2><dl class="product-details__specs">${Object.entries(product.characteristics).map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`).join('')}<dt>Единица продажи</dt><dd>${escapeHtml(product.unit)}</dd></dl></section>
      <p class="catalog-links"><a href="comparison.html">Перейти к сравнению</a><a href="cart.html">Открыть корзину</a></p>
    </div></div>`;
}

function renderCart() {
  const list = document.querySelector('#cart-items');
  if (!list) return;
  const empty = cart.length === 0;
  document.querySelector('#cart-empty').hidden = !empty;
  document.querySelector('#cart-content').hidden = empty;
  document.querySelector('#cart-clear').disabled = empty;
  list.innerHTML = cart.map((item) => {
    const product = findProduct(item.id);
    return `<li class="cart-item"><a href="product.html?id=${product.id}"><img class="cart-item__image" src="images/${product.image}" alt="${escapeHtml(product.alt)}" width="80" height="80"></a><div class="cart-item__body"><h2 class="cart-item__title"><a href="product.html?id=${product.id}">${escapeHtml(product.name)}</a></h2><p class="cart-item__unit-price">${money(product.price)} / ${escapeHtml(product.unit)}</p><div class="cart-item__controls"><div class="quantity"><button class="button button--secondary" type="button" data-cart-step="${product.id}" data-step="-1" aria-label="Уменьшить количество: ${escapeHtml(product.name)}" ${item.quantity === 1 ? 'disabled' : ''}>−</button><label class="visually-hidden" for="quantity-${product.id}">Количество: ${escapeHtml(product.name)}</label><input class="quantity__input" id="quantity-${product.id}" type="number" min="1" max="99" step="1" value="${item.quantity}" data-cart-quantity="${product.id}"><button class="button button--secondary" type="button" data-cart-step="${product.id}" data-step="1" aria-label="Увеличить количество: ${escapeHtml(product.name)}" ${item.quantity === 99 ? 'disabled' : ''}>+</button></div><strong class="cart-item__price">${money(product.price * item.quantity)}</strong><button class="button button--text" type="button" data-cart-remove="${product.id}" aria-label="Удалить: ${escapeHtml(product.name)}">Удалить</button></div></div></li>`;
  }).join('');
  const quantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + findProduct(item.id).price * item.quantity, 0);
  document.querySelector('#cart-count').textContent = `Единиц товаров: ${quantity}`;
  document.querySelector('#cart-total').textContent = money(total);
  const checkout = document.querySelector('#cart-checkout');
  checkout.disabled = empty;
  checkout.dataset.product = `Корзина: ${cart.map((item) => `${findProduct(item.id).name} (${item.quantity} ${findProduct(item.id).unit})`).join(', ')}. Итого ${money(total)}`;
}

function renderComparison() {
  const content = document.querySelector('#comparison-content');
  if (!content) return;
  document.querySelector('#comparison-empty').hidden = comparison.length > 0;
  document.querySelector('#comparison-note').hidden = comparison.length !== 1;
  document.querySelector('#comparison-clear').disabled = comparison.length === 0;
  content.hidden = comparison.length === 0;
  const selected = comparison.map(findProduct);
  const fields = [...new Set(selected.flatMap((product) => Object.keys(product.characteristics)))];
  content.innerHTML = `<table class="comparison-table"><caption>Характеристики выбранных товаров. «—» означает, что характеристика не применяется или не указана.</caption><thead><tr><th scope="col">Характеристика</th>${selected.map((product) => `<th scope="col"><a class="comparison-table__product" href="product.html?id=${product.id}"><img src="images/${product.image}" alt="${escapeHtml(product.alt)}" width="180" height="130">${escapeHtml(product.name)}</a><button class="button button--text" type="button" data-compare-remove="${product.id}" aria-label="Убрать из сравнения: ${escapeHtml(product.name)}">Убрать</button></th>`).join('')}</tr></thead><tbody>${fields.map((field) => `<tr><th scope="row">${escapeHtml(field)}</th>${selected.map((product) => `<td>${escapeHtml(product.characteristics[field] || '—')}</td>`).join('')}</tr>`).join('')}<tr><th scope="row">Единица продажи</th>${selected.map((product) => `<td>${escapeHtml(product.unit)}</td>`).join('')}</tr><tr><th scope="row">Цена</th>${selected.map((product) => `<td><strong>${money(product.price)}</strong><button class="button button--primary comparison-table__buy" type="button" data-cart-add="${product.id}">В корзину</button></td>`).join('')}</tr></tbody></table>`;
}

function refreshLists() {
  renderCart();
  renderComparison();
  updateCounters();
}

renderProduct();
refreshLists();

document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.hasAttribute('data-cart-add')) {
    const product = findProduct(button.dataset.cartAdd);
    const item = cart.find((item) => item.id === product.id);
    if (item?.quantity === 99) { notify('Максимум — 99 единиц одного товара.'); return; }
    if (item) item.quantity += 1;
    else cart.push({ id: product.id, quantity: 1 });
    save(CART_KEY, cart);
    refreshLists();
    notify(`${product.name}: добавлено в корзину.`);
  }
  if (button.hasAttribute('data-cart-remove')) {
    cart = cart.filter((item) => item.id !== button.dataset.cartRemove);
    save(CART_KEY, cart); refreshLists();
    const target = document.querySelector('[data-cart-remove]') || document.querySelector('#cart-empty a');
    target.focus();
  }
  if (button.hasAttribute('data-cart-step')) {
    const item = cart.find((item) => item.id === button.dataset.cartStep);
    item.quantity = Math.max(1, Math.min(99, item.quantity + Number(button.dataset.step)));
    save(CART_KEY, cart); refreshLists();
    document.querySelector(`#quantity-${item.id}`).focus();
  }
  if (button.id === 'cart-clear') {
    cart = []; save(CART_KEY, cart); refreshLists();
    document.querySelector('#cart-empty a').focus();
  }
  if (button.hasAttribute('data-compare-add')) {
    const id = button.dataset.compareAdd;
    if (comparison.includes(id)) comparison = comparison.filter((item) => item !== id);
    else {
      if (comparison.length === 4) { notify('Можно сравнить до четырёх товаров. Уберите один товар со страницы сравнения.'); return; }
      comparison.push(id);
    }
    save(COMPARISON_KEY, comparison); refreshLists();
    notify(comparison.includes(id) ? 'Товар добавлен в сравнение.' : 'Товар убран из сравнения.');
  }
  if (button.hasAttribute('data-compare-remove')) {
    comparison = comparison.filter((id) => id !== button.dataset.compareRemove);
    save(COMPARISON_KEY, comparison); refreshLists();
    const target = document.querySelector('[data-compare-remove]') || document.querySelector('#comparison-empty a');
    target.focus();
  }
  if (button.id === 'comparison-clear') {
    comparison = []; save(COMPARISON_KEY, comparison); refreshLists();
    document.querySelector('#comparison-empty a').focus();
  }
});

document.addEventListener('change', (event) => {
  const input = event.target;
  if (!input.hasAttribute('data-cart-quantity')) return;
  if (!input.reportValidity()) return;
  const item = cart.find((item) => item.id === input.dataset.cartQuantity);
  item.quantity = Number(input.value);
  save(CART_KEY, cart); refreshLists();
  document.querySelector(`#quantity-${item.id}`).focus();
});

window.addEventListener('storage', (event) => {
  if (event.key === CART_KEY || event.key === COMPARISON_KEY || event.key === null) {
    cart = loadCart(); comparison = loadComparison(); refreshLists();
  }
});
