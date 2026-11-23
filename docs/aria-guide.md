# ARIA-атрибуты проекта Mongolz — шпаргалка для показа преподавателю

ARIA добавляет смысл элементам для скринридеров. Правило: сначала нативный HTML, ARIA — только там, где его не хватает.

## Где что находится

| Атрибут | Где | Зачем |
|---|---|---|
| `aria-label="Подробнее: {товар}"`, `"В избранное: …"`, `"Заказать: …"` | карточки в `index.html`, `catalog.html`, `js/favorites.js` | одинаковые кнопки различимы для скринридера; начало совпадает с видимым текстом |
| `aria-labelledby="card-title-N"` | `<article class="product-card">` | карточка называется заголовком товара |
| `aria-labelledby="…-title"` | все `<section>` с `<h2>` | секция получает имя из заголовка |
| `aria-pressed` | кнопки «В избранное», переключатель темы | состояние кнопки-переключателя |
| `aria-expanded` + `aria-controls` + `aria-label` | `#nav-toggle`, `#chat-toggle` | открыто/закрыто меню и чат |
| `aria-current="page"` | активный пункт меню, хлебные крошки | текущая страница |
| `aria-live="polite"` | `#calc-lines` (калькулятор), статус поиска | озвучивание изменений без перехода фокуса |
| `role="listbox"`, `aria-selected`, `aria-activedescendant` | поиск по сайту | комбобокс с подсказками |
| `aria-labelledby` + `aria-describedby` | `<dialog id="order-dialog">` | название и описание окна заказа |
| `aria-describedby`, `aria-invalid`, `role="alert"` | поля форм | ошибки привязаны к полям |
| `aria-hidden="true"` | декоративные SVG, звёздочки `*` | скрыть от скринридера |
| `aria-label` на `<nav>`, `<ul>` | меню, футер, списки | различать несколько навигаций |

В `index.html` у ключевых мест есть комментарии `<!-- ARIA: … -->`.

## Как показать (2 минуты)

1. Открой сайт в Chrome → правый клик на кнопке «Подробнее» → **Проверить** (F12).
2. Вкладка **Elements**: видно `aria-label="Подробнее: Морин хуур…"`.
3. Справа вкладка **Accessibility** → блок *Computed Properties*: поле **Name** = значение aria-label, **Role** = button/link.
4. Нажми «В избранное» — в Elements `aria-pressed` меняется с `false` на `true` (мигает).
5. Нажми кнопку меню (сузь окно до телефона) — `aria-expanded` и `aria-label` меняются.
6. Калькулятор: измени количество — в Elements у `#calc-lines` стоит `aria-live="polite"`.
7. Accessibility → **Full-page accessibility tree** (галочка *Enable full-page accessibility tree*) — дерево имён и ролей всей страницы.
8. Для проверки в консоли: `document.querySelectorAll('[aria-label]').length`.

Автопроверка: `node docs/audit/a11y-audit.js` (результат в `docs/audit/a11y-report.txt`, 0 проблем).
