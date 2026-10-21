'use strict';

document.documentElement.classList.remove('no-js');

const siteHeader = document.querySelector('.site-header');
const layoutVariables = [...document.styleSheets[0].cssRules].find((rule) => rule.selectorText === ':root');

function syncHeaderHeight() {
  // CSSOM обновляет переменную без inline-стилей в HTML.
  layoutVariables.style.setProperty('--measured-header-height', `${Math.ceil(siteHeader.getBoundingClientRect().height)}px`);
}

syncHeaderHeight();
new ResizeObserver(syncHeaderHeight).observe(siteHeader);

const dialog = document.querySelector('#order-dialog');
const orderForm = document.querySelector('#order-form');
const successMessage = document.querySelector('#success-message');
const formError = document.querySelector('#form-error');
let dialogTrigger = null;
let completed = false;

const fields = [...orderForm.elements].filter((field) => field.willValidate);

function validateField(field) {
  if (field.name === 'name') {
    field.setCustomValidity(field.value.trim().length < 2 ? 'Введите имя: минимум два символа без крайних пробелов.' : '');
  }
  field.setAttribute('aria-invalid', String(!field.validity.valid));
  return field.validity.valid;
}

function clearValidation() {
  fields.forEach((field) => {
    field.removeAttribute('aria-invalid');
    field.setCustomValidity('');
  });
  formError.hidden = true;
  formError.textContent = '';
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-product]');
  if (!button) return;
  dialogTrigger = button;
  completed = false;
  orderForm.reset();
  clearValidation();
  successMessage.hidden = true;
  document.querySelector('#selected-product').value = button.dataset.product;
  document.querySelector('#selected-product-label').textContent = `Выбрано: ${button.dataset.product}`;
  dialog.showModal();
});

document.querySelector('#close-order-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => {
  if (completed) {
    successMessage.focus();
  } else {
    dialogTrigger?.focus();
  }
});

fields.forEach((field) => {
  field.addEventListener('input', () => {
    if (field.hasAttribute('aria-invalid')) validateField(field);
    if (fields.every((input) => input.validity.valid)) formError.hidden = true;
  });
  field.addEventListener('change', () => {
    if (field.hasAttribute('aria-invalid')) validateField(field);
    if (fields.every((input) => input.validity.valid)) formError.hidden = true;
  });
});

orderForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const valid = fields.map(validateField).every(Boolean);
  if (!valid) {
    formError.textContent = 'Проверьте обязательные поля, e-mail, формат телефона и согласие. Ошибки выделены и поясняются при фокусе.';
    formError.hidden = false;
    orderForm.reportValidity();
    return;
  }
  const submitButton = orderForm.querySelector('[type="submit"]');
  submitButton.disabled = true;
  // По методичке это демонстрация валидации без backend и сетевой отправки.
  successMessage.textContent = 'Форма успешно отправлена! Учебная демонстрация: проверка пройдена, данные никуда не отправлялись и не сохранялись.';
  successMessage.hidden = false;
  completed = true;
  orderForm.reset();
  clearValidation();
  dialog.close();
  submitButton.disabled = false;
});

const filtersForm = document.querySelector('#filters-form');
if (filtersForm) {
  const cards = [...document.querySelectorAll('#catalog-grid .product-card')];
  const priceFrom = filtersForm.elements.namedItem('price-from');
  const priceTo = filtersForm.elements.namedItem('price-to');
  const filtersError = document.querySelector('#filters-error');

  function applyFilters() {
    const categories = [...filtersForm.querySelectorAll('[name="category"]:checked')].map((field) => field.value);
    const query = filtersForm.elements.namedItem('query').value.trim().toLowerCase();
    const min = priceFrom.value === '' ? 0 : Number(priceFrom.value);
    const max = priceTo.value === '' ? Infinity : Number(priceTo.value);
    let count = 0;
    cards.forEach((card) => {
      const price = Number(card.dataset.price);
      const matchesName = card.querySelector('.product-card__title').textContent.toLowerCase().includes(query);
      const visible = matchesName && (!categories.length || categories.includes(card.dataset.category)) && price >= min && price <= max;
      card.hidden = !visible;
      if (visible) count += 1;
    });
    document.querySelector('#results-count').textContent = `Найдено товаров: ${count}`;
    document.querySelector('#catalog-empty').hidden = count > 0;
  }

  filtersForm.addEventListener('input', () => {
    priceTo.setCustomValidity('');
    filtersError.hidden = true;
  });
  filtersForm.addEventListener('submit', (event) => {
    event.preventDefault();
    priceTo.setCustomValidity('');
    if (priceFrom.value !== '' && priceTo.value !== '' && Number(priceFrom.value) > Number(priceTo.value)) {
      priceTo.setCustomValidity('Верхняя граница цены должна быть не меньше нижней.');
      filtersError.textContent = 'Цена «До» должна быть не меньше цены «От».';
      filtersError.hidden = false;
      filtersForm.reportValidity();
      return;
    }
    if (filtersForm.reportValidity()) applyFilters();
  });
  filtersForm.addEventListener('reset', () => {
    priceTo.setCustomValidity('');
    filtersError.hidden = true;
    // Значения сбрасываются стандартным действием после события reset.
    setTimeout(applyFilters, 0);
  });
}
