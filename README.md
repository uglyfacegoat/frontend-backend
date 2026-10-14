# Канцтовары

## Описание проекта

Учебный интернет-магазин по дисциплине «Фронтенд и бэкенд разработка». На главной и в каталоге представлены тетрадь, папка, ручка и карандаш. Реализованы общая навигация, якорные ссылки, хлебные крошки, фильтры каталога и модальная форма заявки.

Товары и цены демонстрационные. Форма проверяет данные в браузере и показывает учебное подтверждение; реальная отправка на сервер отсутствует.

## Опубликованный проект

[GitHub Pages](https://uglyfacegoat.github.io/frontend-backend/) · [Репозиторий](https://github.com/uglyfacegoat/frontend-backend)

## Используемые технологии

- HTML5 — семантическая разметка и поля формы.
- CSS3 — переменные, состояния, Flexbox, Grid и БЭМ.
- JavaScript — модальное окно, базовая валидация и фильтрация.
- Git, GitHub и GitHub Pages — история изменений, ветки, Pull Request и публикация.

## Структура проекта

```text
frontend-backend/
├── index.html             главная страница
├── catalog.html           каталог с фильтрами
├── contacts.html          контакты проекта
├── css/style.css          общие стили и БЭМ-компоненты
├── js/main.js             форма и фильтры
├── images/                фотографии товаров и favicon
├── docs/
│   ├── practices/
│   │   ├── 05.md          вопросы и ответы по практике 5
│   │   ├── 06.md          вопросы и ответы по практике 6
│   │   └── 07.md          вопросы и ответы по практике 7
│   └── oop.md             вопросы и ответы по ООП
├── tests/browser.cjs      браузерная проверка
├── .gitignore
└── README.md
```

## Постановка контрольной работы №1

Тема: «HTML и CSS: разработка многостраничного сайта».

Итоговая контрольная работа предполагает главную страницу, каталог, отдельную карточку товара или услуги, страницу оформления заявки и контакты, семантическую разметку, внешний CSS-файл и навигацию.

Результат практик 5–7 включает главную, каталог, контакты и модальную форму. Отдельные страницы карточки товара и оформления заявки относятся к дальнейшей подготовке итоговой КР №1.

## История выполнения

- Практика 1: создан репозиторий, выполнены первые коммиты, объединён PR и настроен GitHub Pages.
- Основа практик 2–4: добавлены семантическая разметка, CSS-оформление, форма, CSS-переменные и состояния интерфейса.
- Практика 5: создана многостраничная структура, единая навигация, якорные ссылки, хлебные крошки и метаданные.
- Практика 6: добавлены Flexbox-навигация, Grid-карточки и раскладка каталога с фильтрами.
- Практика 7: выполнен рефакторинг классов по БЭМ, сохранена работа формы и фильтров.

Практики 5–7 оформлены отдельными ветками и PR, объединёнными в `main`:

| Практика | Ветка | Pull Request |
| --- | --- | --- |
| 5 | `feature/multi-page-navigation` | [№2](https://github.com/uglyfacegoat/frontend-backend/pull/2) |
| 6 | `feature/flex-grid-navigation` | [№3](https://github.com/uglyfacegoat/frontend-backend/pull/3) |
| 7 | `refactor/bem-css-classes` | [№4](https://github.com/uglyfacegoat/frontend-backend/pull/4) |

## БЭМ структура проекта

| Блок | Назначение |
| --- | --- |
| `site-header` | Шапка сайта |
| `site-nav` | Основная навигация |
| `breadcrumbs` | Хлебные крошки |
| `hero` | Вводный блок главной страницы |
| `products-grid` | Сетка товаров |
| `product-card` | Повторяемая карточка товара |
| `catalog-layout` | Раскладка каталога |
| `catalog-filters` | Боковой блок фильтров |
| `order-dialog` | Модальное окно |
| `order-form` | Форма заявки |
| `button` | Общая кнопка |
| `site-footer` | Подвал сайта |

Дополнительные блоки: `section`, `advantages`, `aside-info`, `catalog-products`, `filters-form`, `success-message` и `contact-details`.

Примеры элементов: `site-nav__list`, `product-card__title`, `product-card__price`, `order-form__input`. Примеры модификаторов: `product-card--writing`, `button--primary`, `button--secondary`. Модификатор применяется вместе с базовым классом: `button button--primary`.

## Как проверить

Открыть сайт на GitHub Pages, перейти между тремя страницами, проверить якоря, фильтры и форму. В DevTools посмотреть Flexbox/Grid, классы БЭМ и состояния фокуса.

Для локального просмотра из папки проекта:

```sh
python3 -m http.server 8817 --bind 127.0.0.1
```

Адрес: `http://127.0.0.1:8817/`.

## Материалы для защиты

[Практика 5](docs/practices/05.md) · [Практика 6](docs/practices/06.md) · [Практика 7](docs/practices/07.md) · [ООП](docs/oop.md)

## Источники фотографий

[Тетрадь — Exercise Books Direct](https://exercisebooksdirect.co.uk/products/manila_school_exercise_book-9x7-squared-standard_5mm_squared), [папка — BusinessSuppliers](https://businesssuppliers.shop/products/folder-manila-8-5x11-sueltos), [ручка — Printus](https://www.printus.de/schreibwaren/schreibgeraete/kugelschreiber), [карандаш — Booghe](https://www.booghe.co.uk/products/staedtler-noris-2hb-pencil).

## Автор

Завгороднев Ярослав Александрович
Группа: ЭФБО-02-25
