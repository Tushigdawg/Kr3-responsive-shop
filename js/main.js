// Избранное (кнопки «В избранное») обрабатывает js/favorites.js.

// ===============================
// 2. Каталог: фильтры и сортировка
// ===============================
const productsGrid = document.querySelector('[data-sortable]');

if (productsGrid) {
  const cards = Array.from(productsGrid.querySelectorAll('.product-card'));
  const filtersForm = document.getElementById('filters-form');
  const sortSelect = document.getElementById('sort-select');
  const resultsCount = document.getElementById('results-count');
  const emptyMessage = document.getElementById('catalog-empty');

  // Поиск по сайту: адрес catalog.html?q=слово фильтрует карточки по тексту.
  const normalizeText = (text) => String(text).toLowerCase().replace(/ё/g, 'е');
  const CATEGORY_NAMES = Object.fromEntries(Object.entries(window.SHOP_CATEGORIES || {}).map(([k, v]) => [k, v.toLowerCase()]));
  const searchQuery = (new URLSearchParams(window.location.search).get('q') || '').trim();
  const searchTokens = normalizeText(searchQuery).split(/\s+/).filter(Boolean);
  const searchText = new Map(cards.map((card) => [
    card,
    normalizeText(`${card.textContent} ${card.dataset.name} ${CATEGORY_NAMES[card.dataset.category] || ''} ${card.dataset.tags} ${card.dataset.price}`),
  ]));

  // Значения в фильтре цены вводятся в валюте выбранной страны, а цены в данных — в рублях.
  const toRub = (value) => (Number.isNaN(value) || !window.ShopRegion ? value : window.ShopRegion.toRub(value));

  const comparators = {
    default: (a, b) => a.dataset.order - b.dataset.order,
    'price-asc': (a, b) => a.dataset.price - b.dataset.price,
    'price-desc': (a, b) => b.dataset.price - a.dataset.price,
    name: (a, b) => a.dataset.name.localeCompare(b.dataset.name, 'ru', { numeric: true }),
  };

  // Склонение слова «товар».
  function declension(n) {
    const last = n % 10;
    const lastTwo = n % 100;
    if (last === 1 && lastTwo !== 11) return 'товар';
    if (last >= 2 && last <= 4 && (lastTwo < 10 || lastTwo >= 20)) return 'товара';
    return 'товаров';
  }

  // Проверяем, подходит ли карточка под выбранные фильтры.
  function matches(card, filter) {
    const tags = card.dataset.tags.split(' ');
    const price = Number(card.dataset.price);

    return (
      (!filter.categories.length || filter.categories.includes(card.dataset.category)) &&
      filter.statuses.every((status) => tags.includes(status)) &&
      (Number.isNaN(filter.min) || price >= filter.min) &&
      (Number.isNaN(filter.max) || price <= filter.max) &&
      searchTokens.every((token) => searchText.get(card).includes(token))
    );
  }

  function updateCatalog() {
    const data = filtersForm ? new FormData(filtersForm) : null;
    const filter = {
      categories: data ? data.getAll('category') : [],
      statuses: data ? data.getAll('status') : [],
      min: data ? toRub(parseFloat(data.get('price-from'))) : NaN,
      max: data ? toRub(parseFloat(data.get('price-to'))) : NaN,
    };

    // Сортируем карточки и переставляем их в сетке.
    const sorted = [...cards].sort(comparators[sortSelect ? sortSelect.value : 'default']);
    sorted.forEach((card) => productsGrid.append(card));

    // Скрываем карточки, которые не подошли под фильтры.
    let visible = 0;
    cards.forEach((card) => {
      const isVisible = matches(card, filter);
      card.hidden = !isVisible;
      if (isVisible) visible += 1;
    });

    // Счётчик объявляется скринридером через role="status".
    resultsCount.textContent = `Найдено: ${visible} ${declension(visible)}` + (searchQuery ? ` по запросу «${searchQuery}»` : '');
    if (emptyMessage) emptyMessage.hidden = visible > 0;
  }

  if (filtersForm) {
    // Если пришли по ссылке catalog.html?category=..., сразу включаем фильтр.
    const initial = new URLSearchParams(window.location.search).get('category');
    const checkbox = initial && filtersForm.querySelector(`input[name="category"][value="${initial}"]`);
    if (checkbox) checkbox.checked = true;

    filtersForm.addEventListener('submit', (event) => {
      event.preventDefault();
      updateCatalog();
    });
    filtersForm.addEventListener('change', updateCatalog);
    filtersForm.addEventListener('reset', () => setTimeout(updateCatalog, 0));
  }

  if (sortSelect) sortSelect.addEventListener('change', updateCatalog);
  // При смене страны границы цены пересчитываются заново.
  document.addEventListener('shop:region-change', updateCatalog);
  updateCatalog();
}

// ===============================
// 3. Модальное окно заявки
// ===============================
const orderDialog = document.getElementById('order-dialog');

if (orderDialog) {
  const orderForm = document.getElementById('order-form');
  const selectedProductInput = document.getElementById('selected-product');
  const dialogProduct = document.getElementById('order-dialog-product');
  const successMessage = document.getElementById('success-message');
  const summary = document.getElementById('order-form-summary');
  const summaryList = document.getElementById('order-summary-list');
  const submitButton = orderForm.querySelector('[type="submit"]');
  const fields = Array.from(orderForm.querySelectorAll('[required], [pattern]'));

  let lastTrigger = null;

  // Текст заказа: название товара + выбранные параметры (если есть).
  function getOrderLabel(button) {
    const name = button.dataset.product;
    const options = button.dataset.options ? document.getElementById(button.dataset.options) : null;
    if (!options) return name;

    const color = options.querySelector('input[name="color"]:checked');
    const quantity = Math.max(1, parseInt(options.querySelector('input[name="quantity"]').value, 10) || 1);
    return `${name} (${color ? color.value + ', ' : ''}${quantity} шт.)`;
  }

  // --- Открытие и закрытие ---
  document.querySelectorAll('[data-product]').forEach((button) => {
    button.addEventListener('click', () => {
      lastTrigger = button;
      const label = getOrderLabel(button);

      selectedProductInput.value = label;
      dialogProduct.textContent = label;
      successMessage.textContent = '';
      fields.forEach(clearError);
      summary.hidden = true;

      // Если пользователь вошёл в аккаунт, подставляем имя и e-mail.
      if (window.ShopAuth) window.ShopAuth.prefill(orderForm);

      orderDialog.showModal();
      document.body.classList.add('is-scroll-locked');
      document.getElementById('order-name').focus();
    });
  });

  document.querySelectorAll('[data-close-dialog]').forEach((button) => {
    button.addEventListener('click', () => orderDialog.close());
  });

  // Закрытие по клику на затемнённый фон (не при выделении текста мышью).
  let pressStartedOnBackdrop = false;
  orderDialog.addEventListener('mousedown', (event) => {
    pressStartedOnBackdrop = event.target === orderDialog;
  });
  orderDialog.addEventListener('click', (event) => {
    if (event.target === orderDialog && pressStartedOnBackdrop) orderDialog.close();
  });

  // Срабатывает и при Esc: возвращаем прокрутку и фокус на кнопку, открывшую окно.
  orderDialog.addEventListener('close', () => {
    document.body.classList.remove('is-scroll-locked');
    if (lastTrigger) lastTrigger.focus();
  });

  // --- Валидация ---
  const messages = {
    name: { valueMissing: 'Введите имя', customError: 'Имя должно содержать не менее 2 символов' },
    email: { valueMissing: 'Введите e-mail', typeMismatch: 'Введите e-mail в формате example@mail.ru' },
    phone: { valueMissing: 'Введите телефон', patternMismatch: 'Введите телефон в формате +7 (900) 000-00-00' },
    topic: { valueMissing: 'Выберите тему заявки' },
    agreement: { valueMissing: 'Подтвердите согласие на обработку данных' },
  };

  function getMessage(field) {
    field.setCustomValidity('');
    if (field.name === 'name' && field.value.trim().length < 2) {
      field.setCustomValidity('Слишком короткое имя');
    }

    const validity = field.validity;
    if (validity.valid) return '';

    const key = ['valueMissing', 'typeMismatch', 'patternMismatch', 'customError'].find((k) => validity[k]);
    if (field.name === 'phone' && key === 'patternMismatch' && window.ShopRegion) {
      return `Введите телефон в формате ${window.ShopRegion.current.example}`;
    }
    return (messages[field.name] && messages[field.name][key]) || 'Проверьте значение поля';
  }

  function clearError(field) {
    const error = document.getElementById(`${field.id}-error`);
    field.removeAttribute('aria-invalid');
    error.textContent = '';
    error.hidden = true;
  }

  // Проверяем одно поле: выставляем aria-invalid и текст ошибки рядом с полем.
  function validateField(field) {
    const message = getMessage(field);
    if (!message) {
      clearError(field);
      return;
    }
    const error = document.getElementById(`${field.id}-error`);
    field.setAttribute('aria-invalid', 'true');
    error.textContent = message;
    error.hidden = false;
  }

  // Список ошибок в начале формы со ссылками на поля.
  function refreshSummary(shouldFocus) {
    const invalid = fields.filter((field) => field.getAttribute('aria-invalid') === 'true');
    summaryList.innerHTML = '';

    invalid.forEach((field) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = `#${field.id}`;
      link.textContent = document.getElementById(`${field.id}-error`).textContent;
      item.append(link);
      summaryList.append(item);
    });

    summary.hidden = invalid.length === 0;
    if (shouldFocus && invalid.length) summary.focus();
  }

  summaryList.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (!link) return;
    event.preventDefault();
    document.querySelector(link.getAttribute('href')).focus();
  });

  function recheck(field) {
    validateField(field);
    if (!summary.hidden) refreshSummary(false);
  }

  fields.forEach((field) => {
    // Ошибка появляется после ухода с заполненного поля, а исчезает сразу после исправления.
    field.addEventListener('blur', () => {
      if (field.type !== 'checkbox' && (field.value || field.hasAttribute('aria-invalid'))) recheck(field);
    });
    ['input', 'change'].forEach((type) => {
      field.addEventListener(type, () => {
        if (field.hasAttribute('aria-invalid')) recheck(field);
      });
    });
  });

  // --- Отправка ---
  orderForm.addEventListener('submit', (event) => {
    // Backend пока не подключён, поэтому стандартную отправку отменяем.
    event.preventDefault();

    fields.forEach(validateField);
    refreshSummary(true);
    if (orderForm.querySelector('[aria-invalid="true"]')) return;

    // Имитируем отправку на сервер: показываем состояние загрузки.
    submitButton.disabled = true;
    submitButton.classList.add('button--loading');
    submitButton.textContent = 'Отправляем';

    // Данные формы читаем до reset(), чтобы сохранить заявку в личном кабинете.
    const contact = orderForm.querySelector('[name="contact-method"]:checked');
    const savedOrder = {
      product: selectedProductInput.value,
      topic: orderForm.elements.topic.value,
      contactMethod: contact ? contact.value : '',
      date: orderForm.elements.date.value,
      comment: orderForm.elements.comment.value.trim(),
      country: window.ShopRegion ? window.ShopRegion.current.name : '',
    };

    setTimeout(() => {
      const isSaved = window.ShopAuth ? window.ShopAuth.addOrder(savedOrder) : false;
      successMessage.textContent = `Форма успешно отправлена! Товар: ${selectedProductInput.value}.` +
        (isSaved ? ' Заявка сохранена в личном кабинете.' : '');
      orderForm.reset();
      orderDialog.close();

      submitButton.disabled = false;
      submitButton.classList.remove('button--loading');
      submitButton.textContent = 'Отправить заявку';

      setTimeout(() => {
        successMessage.textContent = '';
      }, 10000);
    }, 700);
  });
}

// ===============================
// 4. Карточка товара (product.html?id=N)
// ===============================
const productPage = document.querySelector('.product-details');

if (productPage) {
  const CATEGORIES = window.SHOP_CATEGORIES || {};
  const PREFIX = window.SHOP_PREFIX || {};

  // Данные товаров лежат в js/products.js (позже их заменит backend).
  const PRODUCTS = Object.fromEntries((window.SHOP_PRODUCTS || []).map((item) => [String(item.id), item]));

  const byId = (id) => document.getElementById(id);

  // Номер товара берём из адреса: product.html?id=8. Если он неверный — показываем товар 2.
  const requested = new URLSearchParams(window.location.search).get('id');
  const id = PRODUCTS[requested] ? requested : '2';
  const p = PRODUCTS[id];
  const name = p.name;
  const categoryName = CATEGORIES[p.cat];
  const isOut = p.tag === 'out';
  const discount = p.old ? Math.round(((p.old - p.price) / p.old) * 100) : 0;

  document.title = `${name} — Mongolz`;
  byId('product-title').textContent = name;
  byId('crumb-current').textContent = name;

  const image = byId('product-image');
  const imageBase = `images/products/p${id}`;
  const largest = p.widths[p.widths.length - 1];
  image.src = `${imageBase}-${largest}.webp`;
  image.srcset = p.widths.map((w) => `${imageBase}-${w}.webp ${w}w`).join(', ');
  image.sizes = '(min-width: 768px) 46vw, 92vw';
  image.width = largest;
  image.height = largest;
  image.alt = p.alt || name;

  const crumb = byId('crumb-category');
  crumb.textContent = categoryName;
  crumb.href = `catalog.html?category=${p.cat}`;

  // Бейдж.
  const badge = byId('product-badge');
  const badges = { hit: ['Хит', ''], new: ['Новинка', 'badge--new'], discount: [`−${discount}%`, 'badge--discount'] };
  if (badges[p.tag]) {
    badge.textContent = badges[p.tag][0];
    badge.className = `badge ${badges[p.tag][1]}`.trim();
  } else {
    badge.hidden = true;
  }

  byId('product-rating').textContent = `Рейтинг: ${p.rating} из 5 (${p.reviews} отзывов)`;
  const money = (value) => `<span data-rub="${value}">${value} руб.</span>`;
  byId('product-price').innerHTML = p.old
    ? `<s class="product-card__price-old"><span class="visually-hidden">Старая цена: </span>${money(p.old)}</s> <span class="visually-hidden">Новая цена: </span>${money(p.price)}`
    : money(p.price);

  const stock = byId('product-stock');
  stock.className = isOut ? 'stock stock--out' : 'stock stock--in';
  stock.textContent = isOut ? 'Нет в наличии' : 'В наличии, отправим завтра';

  byId('product-short').textContent = p.short;
  byId('product-long').textContent = `${p.long} Материал: ${p.material.toLowerCase()}, вес ${p.weight}. Гарантия: ${p.warranty}.`;
  byId('product-features').innerHTML = `<li>Материал: ${p.material.toLowerCase()};</li><li>вес: ${p.weight};</li><li>гарантия: ${p.warranty}.</li>`;

  // Цвета берём из данных товара.
  const colorSet = productPage.querySelector('.product-options__fieldset');
  if (colorSet) {
    colorSet.innerHTML = '<legend class="product-options__legend">Цвет</legend>' +
      p.colors.map((c, i) => `<label class="product-options__option"><input type="radio" name="color" value="${c.toLowerCase()}"${i === 0 ? ' checked' : ''}> ${c}</label>`).join('');
  }

  // Кнопка заказа: название товара берётся из data-product в момент клика.
  const orderButton = byId('product-order-button');
  orderButton.dataset.product = name;
  orderButton.disabled = isOut;

  // Таблица характеристик.
  const groups = [
    ['Основное', [['Артикул', `${PREFIX[p.cat]}-${String(id).padStart(3, '0')}`], ['Категория', categoryName], ['Цвет', p.colors.join(', ')]]],
    ['Технические характеристики', [['Материал', p.material], ['Габариты', p.size], ['Вес', p.weight], ...(p.power ? [['Питание', p.power]] : [])]],
    ['Гарантия и сервис', [['Гарантия', p.warranty], ['Возврат', 'В течение 14 дней']]],
  ];
  byId('specs-table').innerHTML =
    `<caption>Характеристики: ${name}</caption>` +
    groups.map(([title, rows]) =>
      `<tbody><tr class="data-table__group"><th scope="rowgroup" colspan="2">${title}</th></tr>` +
      rows.map(([k, v]) => `<tr><th scope="row">${k}</th><td>${v}</td></tr>`).join('') + '</tbody>'
    ).join('');

  // Таблица сравнения: все товары этой же категории, текущий выделен.
  const peers = Object.keys(PRODUCTS).filter((key) => PRODUCTS[key].cat === p.cat);
  const compareRows = [
    ['Цена', (q) => money(q.price)],
    ['Вес', (q) => q.weight],
    ['Материал', (q) => q.material],
    ['Гарантия', (q) => q.warranty],
    ['Рейтинг', (q) => `${q.rating} из 5`],
    ['Наличие', (q) => (q.tag === 'out' ? 'Нет в наличии' : 'В наличии')],
  ];
  const current = (key) => (key === id ? ' class="data-table__cell--current"' : '');
  byId('compare-table').innerHTML =
    `<caption>Сравнение товаров категории «${categoryName}»</caption>` +
    `<thead><tr><td></td>${peers.map((key) => `<th scope="col"${current(key)}>${PRODUCTS[key].label}${key === id ? ' <span class="data-table__note">(этот товар)</span>' : ''}</th>`).join('')}</tr></thead>` +
    `<tbody>${compareRows.map(([label, get]) => `<tr><th scope="row">${label}</th>${peers.map((key) => `<td${current(key)}>${get(PRODUCTS[key])}</td>`).join('')}</tr>`).join('')}</tbody>`;
}

// Цены на странице товара создаются скриптом — пересчитываем их в валюту выбранной страны.
if (window.ShopRegion) window.ShopRegion.apply();
