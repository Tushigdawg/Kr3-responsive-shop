// Избранное: список id товаров хранится в localStorage («shop-favorites»).
// Работает на всех страницах: кнопки «В избранное», счётчик в шапке и страница favorites.html.
(function () {
  'use strict';

  const KEY = 'shop-favorites';
  const PRODUCTS = window.SHOP_PRODUCTS || [];

  function read() {
    try {
      const list = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(list) ? list.map(String) : [];
    } catch (e) {
      return [];
    }
  }
  function write(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* без хранилища работаем в памяти страницы */ }
  }

  let favorites = read();

  // id товара: из data-id, из ссылки на карточке или из адреса страницы товара (product.html?id=N).
  function productId(button) {
    if (button.dataset.id) return button.dataset.id;
    const card = button.closest('.product-card');
    const link = card && card.querySelector('a[href*="product.html?id="]');
    if (link) return new URL(link.getAttribute('href'), location.href).searchParams.get('id');
    const fromUrl = new URLSearchParams(location.search).get('id');
    return PRODUCTS.some((p) => String(p.id) === fromUrl) ? fromUrl : '2';
  }

  function updateCount() {
    const badge = document.getElementById('fav-count');
    if (!badge) return;
    badge.textContent = String(favorites.length);
    badge.hidden = favorites.length === 0;
    const link = document.getElementById('fav-link');
    if (link) link.setAttribute('aria-label', favorites.length ? `Избранное, товаров: ${favorites.length}` : 'Избранное');
  }

  function paintButton(button) {
    const active = favorites.includes(productId(button));
    button.setAttribute('aria-pressed', String(active));
    button.textContent = active ? 'В избранном' : 'В избранное';
    const card = button.closest('.product-card');
    if (card) card.classList.toggle('product-card--favorite', active);
  }

  function paintAll() {
    document.querySelectorAll('[data-favorite]').forEach(paintButton);
    updateCount();
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-favorite]');
    if (!button) return;
    const id = productId(button);
    favorites = favorites.includes(id) ? favorites.filter((x) => x !== id) : favorites.concat(id);
    write(favorites);
    paintAll();
  });

  // Если избранное изменили в другой вкладке — обновляемся.
  window.addEventListener('storage', (event) => {
    if (event.key === KEY) {
      favorites = read();
      paintAll();
      renderPage();
    }
  });

  // ---------- страница favorites.html ----------
  const grid = document.getElementById('fav-grid');
  const empty = document.getElementById('fav-empty');
  const summary = document.getElementById('fav-summary');

  function plural(n) {
    const last = n % 10, lastTwo = n % 100;
    if (last === 1 && lastTwo !== 11) return 'товар';
    if (last >= 2 && last <= 4 && (lastTwo < 10 || lastTwo >= 20)) return 'товара';
    return 'товаров';
  }

  function renderPage() {
    if (!grid) return;
    const items = favorites.map((id) => PRODUCTS.find((p) => String(p.id) === id)).filter(Boolean);
    grid.replaceChildren();
    empty.hidden = items.length > 0;
    summary.hidden = items.length === 0;
    summary.textContent = `В избранном ${items.length} ${plural(items.length)}.`;

    items.forEach((p) => {
      const card = document.createElement('article');
      card.className = 'product-card';
      const widths = p.widths && p.widths.length ? p.widths : [480];
      const src = `images/products/p${p.id}-${widths[0]}.webp`;
      const srcset = widths.map((w) => `images/products/p${p.id}-${w}.webp ${w}w`).join(', ');

      const media = document.createElement('div');
      media.className = 'product-card__media';
      const img = document.createElement('img');
      img.className = 'product-card__image';
      img.src = src;
      img.srcset = srcset;
      img.sizes = '(min-width: 900px) 360px, (min-width: 640px) 46vw, 92vw';
      img.width = 480; img.height = 480; img.alt = p.name; img.loading = 'lazy'; img.decoding = 'async';
      media.append(img);

      const title = document.createElement('h3');
      title.className = 'product-card__title';
      const link = document.createElement('a');
      link.className = 'product-card__link';
      link.href = `product.html?id=${p.id}`;
      link.textContent = p.name;
      title.append(link);

      const desc = document.createElement('p');
      desc.className = 'product-card__description';
      desc.textContent = p.short;

      const price = document.createElement('p');
      price.className = 'product-card__price';
      price.append('Цена: ');
      const value = document.createElement('span');
      value.dataset.rub = String(p.price);
      value.textContent = `${new Intl.NumberFormat('ru-RU').format(p.price)} руб.`;
      price.append(value);

      const actions = document.createElement('div');
      actions.className = 'product-card__actions';
      const more = document.createElement('a');
      more.className = 'button button--secondary';
      more.href = `product.html?id=${p.id}`;
      more.textContent = 'Подробнее';
      const remove = document.createElement('button');
      remove.className = 'button button--ghost';
      remove.type = 'button';
      remove.dataset.favorite = '';
      remove.dataset.id = String(p.id);
      remove.textContent = 'Убрать';
      remove.setAttribute('aria-pressed', 'true');
      remove.setAttribute('aria-label', `Убрать из избранного: ${p.name}`);
      actions.append(more, remove);

      card.append(media, title, desc, price, actions);
      grid.append(card);
    });

    // Цены пересчитываются в валюту выбранной страны.
    if (window.ShopRegion) window.ShopRegion.apply();
  }

  // На странице избранного кнопка «Убрать» сразу убирает карточку.
  if (grid) {
    grid.addEventListener('click', (event) => {
      if (event.target.closest('[data-favorite]')) setTimeout(renderPage, 0);
    });
  }

  paintAll();
  renderPage();
})();
