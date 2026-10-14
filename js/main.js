'use strict';

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

document.querySelectorAll('[data-product]').forEach((button) => {
  button.addEventListener('click', () => {
    dialogTrigger = button;
    completed = false;
    orderForm.reset();
    clearValidation();
    successMessage.hidden = true;
    document.querySelector('#selected-product').value = button.dataset.product;
    document.querySelector('#selected-product-label').textContent = `Выбрано: ${button.dataset.product}`;
    dialog.showModal();
  });
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
