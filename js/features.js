// =====================================================
// features.js — общие возможности всех страниц:
// 1. Тема (светлая / тёмная)
// 2. Бургер-меню
// 3. Страны, валюты и телефонные коды
// 4. Поиск по сайту
// 5. Виджет-чат
// 6. Кнопка «Наверх» и полоса прокрутки
// 7. Эффекты (появление, наклон карточек, волна на кнопках)
// 8. Подписка в подвале
// Подключается после main.js.
// =====================================================
(function () {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // localStorage может быть недоступен (например, в режиме приватности) — оборачиваем в try/catch.
  const store = {
    get(key) {
      try { return localStorage.getItem(key); } catch (e) { return null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); } catch (e) { /* ничего не делаем */ }
    },
  };

  const normalize = (text) => String(text).toLowerCase().replace(/ё/g, 'е').trim();

  // ===============================
  // 1. Тема
  // Начальное значение ставит маленький скрипт в <head>, чтобы не было «вспышки».
  // ===============================
  const themeButton = $('#theme-toggle');

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (themeButton) themeButton.setAttribute('aria-pressed', String(theme === 'dark'));
  }

  if (themeButton) {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
    themeButton.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      store.set('shop-theme', next);
    });
  }

  // Если пользователь не выбирал тему сам, следуем настройке системы.
  const schemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  schemeQuery.addEventListener('change', (event) => {
    if (!store.get('shop-theme')) applyTheme(event.matches ? 'dark' : 'light');
  });

  // ===============================
  // 2. Бургер-меню
  // ===============================
  const navToggle = $('#nav-toggle');
  const siteNav = $('#site-nav');

  if (navToggle && siteNav) {
    const setNav = (open) => {
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
      siteNav.classList.toggle('is-open', open);
    };

    navToggle.addEventListener('click', () => {
      setNav(navToggle.getAttribute('aria-expanded') !== 'true');
    });

    // Esc закрывает меню и возвращает фокус на кнопку.
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && siteNav.classList.contains('is-open')) {
        setNav(false);
        navToggle.focus();
      }
    });

    // Переход по ссылке закрывает меню (важно для якорей на той же странице).
    siteNav.addEventListener('click', (event) => {
      if (event.target.closest('a')) setNav(false);
    });

    // Клик мимо меню.
    document.addEventListener('click', (event) => {
      if (siteNav.classList.contains('is-open') && !event.target.closest('.site-header')) setNav(false);
    });

    // На широком экране меню всегда видно — сбрасываем состояние.
    window.matchMedia('(min-width: 900px)').addEventListener('change', (event) => {
      if (event.matches) setNav(false);
    });
  }

  // ===============================
  // 3. Страны
  // Курсы демонстрационные: в настоящем магазине их отдаёт backend.
  // Цены на странице хранятся в рублях в атрибуте data-rub.
  // ===============================
  const REGIONS = {
    RU: {
      name: 'Россия', currency: 'RUB', symbol: 'руб.', rate: 1, locale: 'ru-RU', days: '1–3 дня',
      phoneCode: '+7', example: '+7 (900) 000-00-00', pattern: '^\\+7 \\(\\d{3}\\) \\d{3}-\\d{2}-\\d{2}$',
    },
    BY: {
      name: 'Беларусь', currency: 'BYN', symbol: 'BYN', rate: 0.035, locale: 'ru-BY', days: '3–5 дней',
      phoneCode: '+375', example: '+375 (29) 000-00-00', pattern: '^\\+375 \\(\\d{2}\\) \\d{3}-\\d{2}-\\d{2}$',
    },
    KZ: {
      name: 'Казахстан', currency: 'KZT', symbol: '₸', rate: 6.3, locale: 'ru-KZ', days: '4–7 дней',
      phoneCode: '+7', example: '+7 (700) 000-00-00', pattern: '^\\+7 \\(\\d{3}\\) \\d{3}-\\d{2}-\\d{2}$',
    },
    AM: {
      name: 'Армения', currency: 'AMD', symbol: '֏', rate: 4.7, locale: 'ru-AM', days: '5–8 дней',
      phoneCode: '+374', example: '+374 (91) 000-000', pattern: '^\\+374 \\(\\d{2}\\) \\d{3}-\\d{3}$',
    },
    MN: {
      name: 'Монголия', currency: 'MNT', symbol: '₮', rate: 40, locale: 'ru-MN', days: '7–10 дней',
      phoneCode: '+976', example: '+976 9900-0000', pattern: '^\\+976 \\d{4}-\\d{4}$',
    },
  };

  const countrySelect = $('#country-select');
  let countryCode = REGIONS[store.get('shop-country')] ? store.get('shop-country') : 'RU';

  function formatPrice(rub) {
    const region = REGIONS[countryCode];
    const value = rub * region.rate;
    if (region.rate === 1) return `${new Intl.NumberFormat('ru-RU').format(rub)} ${region.symbol}`;
    const digits = region.currency === 'BYN' ? 2 : 0;
    const text = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits }).format(value);
    return `${text} ${region.symbol}`;
  }

  function applyRegion() {
    const region = REGIONS[countryCode];

    // Цены.
    $$('[data-rub]').forEach((el) => {
      el.textContent = formatPrice(Number(el.dataset.rub));
    });

    // Подписи и сроки доставки.
    $$('[data-currency-label]').forEach((el) => { el.textContent = region.symbol; });
    $$('[data-delivery-days]').forEach((el) => { el.textContent = region.days; });
    $$('[data-country-name]').forEach((el) => { el.textContent = region.name; });

    // Подсказки в фильтре цены (рубли → валюта выбранной страны).
    const priceTo = $('#price-to');
    if (priceTo) priceTo.placeholder = String(Math.round(60000 * region.rate));

    // Телефон в форме заявки: формат зависит от страны.
    const phone = $('#order-phone');
    if (phone) {
      phone.placeholder = region.example;
      phone.setAttribute('pattern', region.pattern);
      const hint = $('#order-phone-hint');
      if (hint) hint.textContent = `Формат: ${region.example}`;
    }

    // Подсветка выбранной страны в подвале.
    $$('[data-country]').forEach((el) => {
      const isCurrent = el.dataset.country === countryCode;
      el.classList.toggle('is-current', isCurrent);
      if (isCurrent) el.setAttribute('aria-current', 'true');
      else el.removeAttribute('aria-current');
    });

    if (countrySelect) countrySelect.value = countryCode;
    document.documentElement.setAttribute('data-country', countryCode);
  }

  if (countrySelect) {
    countrySelect.addEventListener('change', () => {
      countryCode = REGIONS[countrySelect.value] ? countrySelect.value : 'RU';
      store.set('shop-country', countryCode);
      applyRegion();
      // Карточка товара и каталог могут зависеть от валюты (например, сообщение чата).
      document.dispatchEvent(new CustomEvent('shop:region-change', { detail: { code: countryCode } }));
    });
  }

  // main.js использует этот объект для проверки телефона и фильтра по цене.
  window.ShopRegion = {
    get code() { return countryCode; },
    get current() { return REGIONS[countryCode]; },
    format: formatPrice,
    // Округляем до копеек, чтобы 35 BYN точно превращалось в 1000 руб.
    toRub: (value) => Math.round((value / REGIONS[countryCode].rate) * 100) / 100,
    apply: applyRegion,
  };

  applyRegion();

  // ===============================
  // 4. Поиск по сайту
  // Реализован как combobox: стрелки, Enter, Esc, объявление результатов.
  // ===============================
  const SEARCH_ITEMS = [
    // Товары берём из js/products.js: название, категория, метка и цена — то же, что видно на карточках.
    ...(window.SHOP_PRODUCTS || []).map((p) => {
      const tagText = { hit: 'хит', new: 'новинка', discount: 'скидка', out: 'нет в наличии' }[p.tag] || '';
      const category = (window.SHOP_CATEGORIES || {})[p.cat] || '';
      return {
        type: 'product',
        label: p.name,
        meta: category,
        href: `product.html?id=${p.id}`,
        haystack: normalize(`${p.name} ${p.label} ${category} ${tagText} ${p.price}`),
      };
    }),
    // Страницы.
    { type: 'page', label: 'Главная', meta: 'Страница', href: 'index.html', keywords: 'главная старт магазин' },
    { type: 'page', label: 'Каталог товаров', meta: 'Страница', href: 'catalog.html', keywords: 'каталог фильтр сортировка товары' },
    { type: 'page', label: 'О нас', meta: 'Страница', href: 'about.html', keywords: 'о нас компания история основание годы работы страны благодарность' },
    { type: 'page', label: 'Избранное', meta: 'Страница', href: 'favorites.html', keywords: 'избранное понравившиеся товары закладки' },
    { type: 'page', label: 'Контакты', meta: 'Страница', href: 'contacts.html', keywords: 'контакты телефон почта email адрес связаться офис как найти проезд метро вопросы faq' },
    { type: 'page', label: 'Доставка и оплата', meta: 'Раздел', href: 'product.html#delivery', keywords: 'доставка оплата курьер самовывоз возврат страны' },
    { type: 'page', label: 'Личный кабинет', meta: 'Аккаунт', href: 'account.html', keywords: 'личный кабинет профиль заказы аккаунт история' },
    { type: 'page', label: 'Вход и регистрация', meta: 'Аккаунт', href: 'login.html', keywords: 'вход войти регистрация логин пароль авторизация' },
  ].map((item) => ({ ...item, haystack: item.haystack || normalize(`${item.label} ${item.keywords}`) }));

  const searchForm = $('.site-search');
  const searchInput = $('#site-search-input');
  const searchList = $('#search-results');
  const searchStatus = $('#search-status');

  if (searchForm && searchInput && searchList) {
    let results = [];
    let activeIndex = -1;

    // Подсвечиваем найденный фрагмент безопасно: только text-узлы и <mark>.
    function highlight(text, tokens) {
      const fragment = document.createDocumentFragment();
      const lower = normalize(text);
      let position = 0;
      while (position < text.length) {
        let best = null;
        tokens.forEach((token) => {
          const index = lower.indexOf(token, position);
          if (index !== -1 && (best === null || index < best.index)) best = { index, length: token.length };
        });
        if (!best) break;
        fragment.append(text.slice(position, best.index));
        const mark = document.createElement('mark');
        mark.textContent = text.slice(best.index, best.index + best.length);
        fragment.append(mark);
        position = best.index + best.length;
      }
      fragment.append(text.slice(position));
      return fragment;
    }

    function setActive(index) {
      const options = $$('[role="option"]', searchList);
      options.forEach((option, i) => option.setAttribute('aria-selected', String(i === index)));
      activeIndex = index;
      if (index >= 0 && options[index]) {
        searchInput.setAttribute('aria-activedescendant', options[index].id);
        options[index].scrollIntoView({ block: 'nearest' });
      } else {
        searchInput.removeAttribute('aria-activedescendant');
      }
    }

    function closeResults() {
      searchList.hidden = true;
      searchInput.setAttribute('aria-expanded', 'false');
      searchInput.removeAttribute('aria-activedescendant');
      activeIndex = -1;
    }

    function render(query) {
      const tokens = normalize(query).split(/\s+/).filter(Boolean);
      searchList.innerHTML = '';

      if (!tokens.length) {
        closeResults();
        if (searchStatus) searchStatus.textContent = '';
        return;
      }

      results = SEARCH_ITEMS.filter((item) => tokens.every((token) => item.haystack.includes(token)))
        .sort((a, b) => {
          // Совпадение в начале названия считаем лучшим.
          const startsA = normalize(a.label).startsWith(tokens[0]) ? 0 : 1;
          const startsB = normalize(b.label).startsWith(tokens[0]) ? 0 : 1;
          return startsA - startsB;
        })
        .slice(0, 7);

      if (!results.length) {
        const empty = document.createElement('li');
        empty.className = 'search-results__empty';
        empty.textContent = 'Ничего не найдено. Попробуйте другое слово.';
        searchList.append(empty);
      }

      results.forEach((item, i) => {
        const option = document.createElement('li');
        option.className = 'search-results__item';
        option.id = `search-option-${i}`;
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', 'false');
        option.dataset.href = item.href;

        const label = document.createElement('span');
        label.append(highlight(item.label, tokens));
        const meta = document.createElement('span');
        meta.className = 'search-results__meta';
        meta.textContent = item.meta;
        option.append(label, meta);
        searchList.append(option);
      });

      searchList.hidden = false;
      searchInput.setAttribute('aria-expanded', 'true');
      activeIndex = -1;
      searchInput.removeAttribute('aria-activedescendant');
      if (searchStatus) {
        searchStatus.textContent = results.length ? `Найдено вариантов: ${results.length}` : 'Ничего не найдено';
      }
    }

    searchInput.addEventListener('input', () => render(searchInput.value));
    searchInput.addEventListener('focus', () => {
      if (searchInput.value.trim()) render(searchInput.value);
    });

    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown' && results.length) {
        event.preventDefault();
        if (searchList.hidden) render(searchInput.value);
        setActive((activeIndex + 1) % results.length);
      } else if (event.key === 'ArrowUp' && results.length) {
        event.preventDefault();
        setActive((activeIndex - 1 + results.length) % results.length);
      } else if (event.key === 'Escape') {
        if (!searchList.hidden) {
          event.preventDefault();
          closeResults();
        }
      } else if (event.key === 'Enter' && activeIndex >= 0) {
        // Выбран вариант из списка — переходим по нему, а не к общему поиску.
        event.preventDefault();
        window.location.href = results[activeIndex].href;
      }
    });

    searchList.addEventListener('mousedown', (event) => {
      // mousedown, а не click: иначе поле потеряет фокус и список закроется раньше клика.
      const option = event.target.closest('[role="option"]');
      if (option) {
        event.preventDefault();
        window.location.href = option.dataset.href;
      }
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.site-search')) closeResults();
    });

    // Если пришли с запросом ?q=..., оставляем его в поле.
    const initialQuery = new URLSearchParams(window.location.search).get('q');
    if (initialQuery) searchInput.value = initialQuery;
  }

  // ===============================
  // 5. Виджет-чат (автоответчик, без backend)
  // ===============================
  const chat = $('#chat');
  const chatToggle = $('#chat-toggle');

  if (chat && chatToggle) {
    const chatLog = $('#chat-log');
    const chatForm = $('#chat-form');
    const chatInput = $('#chat-input');
    const chatClose = $('#chat-close');

    const link = (text, href) => ({ text, href });

    // Правила ответов: ищем ключевые слова в сообщении.
    const RULES = [
      { words: ['привет', 'здравств', 'добрый'], answer: () => ['Здравствуйте! Чем могу помочь?'] },
      {
        words: ['доставк', 'курьер', 'самовывоз'],
        answer: () => {
          const r = REGIONS[countryCode];
          return [`Доставка в страну «${r.name}» занимает ${r.days}. Курьер — ${formatPrice(300)}, самовывоз бесплатный.`, link('Подробнее о доставке', 'product.html#delivery')];
        },
      },
      { words: ['оплат', 'карт', 'платить'], answer: () => ['Оплатить можно картой онлайн или при получении.'] },
      { words: ['возврат', 'гарант', 'вернуть'], answer: () => ['Возврат возможен в течение 14 дней без объяснения причин. Гарантия указана в характеристиках товара.'] },
      { words: ['цена', 'стоим', 'скидк', 'сколько'], answer: () => ['Актуальные цены и скидки — в каталоге. Там же можно отфильтровать товары по цене.', link('Открыть каталог', 'catalog.html')] },
      { words: ['заказ', 'заявк', 'купить'], answer: () => ['Нажмите «Заказать» на карточке товара и заполните форму. Если вы вошли в аккаунт, заявка сохранится в личном кабинете.', link('Личный кабинет', 'account.html')] },
      { words: ['кабинет', 'войти', 'вход', 'парол', 'регистр', 'аккаунт'], answer: () => ['Войти или зарегистрироваться можно на странице входа.', link('Вход и регистрация', 'login.html')] },
      { words: ['стран', 'казахстан', 'беларус', 'армен', 'узбек', 'валют'], answer: () => ['В шапке сайта есть выбор страны: от него зависят валюта, сроки доставки и формат телефона.'] },
      { words: ['оператор', 'человек', 'менеджер', 'позвон'], answer: () => ['Сейчас с вами общается автоответчик Mongolz. Чтобы связаться с человеком, позвоните по телефону +7 (495) 000-00-00 или напишите на hello@mongolz.ru.', link('Контакты', 'contacts.html')] },
      { words: ['спасибо', 'благодар'], answer: () => ['Пожалуйста! Обращайтесь, если появятся вопросы.'] },
    ];
    const FALLBACK = ['Я пока отвечаю только на простые вопросы: про доставку, оплату, возврат, заказ и личный кабинет. Выберите тему кнопкой ниже.'];

    function addMessage(who, content) {
      const [text, linkInfo] = Array.isArray(content) ? content : [content];
      const msg = document.createElement('div');
      msg.className = `chat__msg chat__msg--${who}`;
      msg.append(text);
      if (linkInfo) {
        msg.append(document.createElement('br'));
        const a = document.createElement('a');
        a.href = linkInfo.href;
        a.textContent = linkInfo.text;
        msg.append(a);
      }
      chatLog.append(msg);
      chatLog.scrollTop = chatLog.scrollHeight;
      return msg;
    }

    function reply(text) {
      const query = normalize(text);
      const rule = RULES.find((r) => r.words.some((w) => query.includes(w)));
      const answer = rule ? rule.answer() : FALLBACK;

      // Индикатор «печатает…» (скрыт от скринридера, чтобы не шуметь).
      const typing = document.createElement('div');
      typing.className = 'chat__msg chat__msg--bot';
      typing.setAttribute('aria-hidden', 'true');
      typing.innerHTML = '<span class="chat__typing"><span></span><span></span><span></span></span>';
      chatLog.append(typing);
      chatLog.scrollTop = chatLog.scrollHeight;

      setTimeout(() => {
        typing.remove();
        addMessage('bot', answer);
      }, reduceMotion ? 0 : 700);
    }

    function openChat() {
      chat.hidden = false;
      chatToggle.setAttribute('aria-expanded', 'true');
      if (!chatLog.children.length) {
        addMessage('bot', 'Здравствуйте! Я автоответчик магазина Mongolz. Спросите про доставку, оплату или заказ.');
      }
      chatInput.focus();
    }

    function closeChat() {
      chat.hidden = true;
      chatToggle.setAttribute('aria-expanded', 'false');
      chatToggle.focus();
    }

    chatToggle.addEventListener('click', () => (chat.hidden ? openChat() : closeChat()));
    chatClose.addEventListener('click', closeChat);
    chat.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeChat();
    });

    chatForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const text = chatInput.value.trim();
      if (!text) return;
      addMessage('user', text);
      chatInput.value = '';
      reply(text);
    });

    $$('[data-chat-quick]').forEach((button) => {
      button.addEventListener('click', () => {
        addMessage('user', button.textContent);
        reply(button.dataset.chatQuick);
      });
    });
  }

  // ===============================
  // 6. «Наверх» и полоса прокрутки
  // ===============================
  const backToTop = $('#back-to-top');
  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.prepend(progress);

  let ticking = false;
  function onScroll() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    if (backToTop) backToTop.classList.toggle('is-visible', y > 600);
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScroll);
    }
  }, { passive: true });
  onScroll();

  if (backToTop) {
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0 });
      const logo = $('.site-header__logo');
      if (logo) logo.focus({ preventScroll: true });
    });
  }

  // ===============================
  // 7. Эффекты
  // ===============================
  // 7.1. Плавное появление блоков при прокрутке.
  const revealTargets = $$('.hero, .section, .aside-info, .category-header, .catalog-filters, .product-details, .product-card, .auth-card, .account-card');

  if ('IntersectionObserver' in window && !reduceMotion) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add('is-visible');
        observer.unobserve(el);
        // Через секунду убираем служебные классы, чтобы не мешать hover-эффектам.
        setTimeout(() => el.classList.remove('reveal', 'is-visible'), 1200);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    revealTargets.forEach((el) => {
      // Карточки в одной сетке появляются по очереди.
      const siblings = el.parentElement ? Array.from(el.parentElement.children).filter((c) => c.matches('.product-card')) : [];
      const index = siblings.indexOf(el);
      if (index > 0) el.style.setProperty('--reveal-delay', `${Math.min(index, 5) * 70}ms`);
      el.classList.add('reveal');
      observer.observe(el);
    });
  }

  // 7.2. Лёгкий наклон карточек за курсором (только мышь и без reduced-motion).
  if (!reduceMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $$('.product-card').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        card.classList.add('is-tilting');
        card.style.setProperty('--tilt-x', `${(-y * 6).toFixed(2)}deg`);
        card.style.setProperty('--tilt-y', `${(x * 6).toFixed(2)}deg`);
      });
      card.addEventListener('pointerleave', () => {
        card.classList.remove('is-tilting');
        card.style.removeProperty('--tilt-x');
        card.style.removeProperty('--tilt-y');
      });
    });
  }

  // 7.3. Волна от места нажатия на кнопках.
  if (!reduceMotion) {
    document.addEventListener('click', (event) => {
      const button = event.target.closest('.button');
      if (!button || button.disabled) return;
      const rect = button.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.setAttribute('aria-hidden', 'true');
      // event.detail === 0 — нажатие с клавиатуры: волна из центра.
      ripple.style.left = `${event.detail ? event.clientX - rect.left : rect.width / 2}px`;
      ripple.style.top = `${event.detail ? event.clientY - rect.top : rect.height / 2}px`;
      button.append(ripple);
      setTimeout(() => ripple.remove(), 650);
    });
  }

  // 7.4. Подсветка найденных карточек, если пришли из поиска.
  const searchedQuery = new URLSearchParams(window.location.search).get('q');
  if (searchedQuery) {
    setTimeout(() => {
      $$('.product-card:not([hidden])').forEach((card) => card.classList.add('product-card--found'));
    }, 100);
  }

  // ===============================
  // 8. Подписка в подвале
  // ===============================
  const newsletter = $('#newsletter-form');
  if (newsletter) {
    const emailField = $('#newsletter-email');
    const status = $('#newsletter-status');
    newsletter.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!emailField.checkValidity() || !emailField.value.trim()) {
        status.textContent = 'Введите e-mail в формате example@mail.ru';
        status.classList.add('newsletter__status--error');
        emailField.setAttribute('aria-invalid', 'true');
        emailField.focus();
        return;
      }
      emailField.removeAttribute('aria-invalid');
      status.classList.remove('newsletter__status--error');
      status.textContent = 'Спасибо! Вы подписаны на новости Mongolz.';
      newsletter.reset();
    });
  }

  // ===============================
  // 9. Кнопки «Открыть чат» и «сколько лет работаем»
  // ===============================
  $$('[data-open-chat]').forEach((button) => {
    button.addEventListener('click', () => {
      if (chat && chatToggle && chat.hidden) chatToggle.click();
      else if ($('#chat-input')) $('#chat-input').focus();
    });
  });

  $$('[data-years-since]').forEach((el) => {
    const years = new Date().getFullYear() - Number(el.dataset.yearsSince);
    el.textContent = String(years);
    const label = el.closest('.about-stats__item') && el.closest('.about-stats__item').querySelector('[data-years-label]');
    if (label) {
      const last = years % 10, lastTwo = years % 100;
      const word = last === 1 && lastTwo !== 11 ? 'год' : (last >= 2 && last <= 4 && (lastTwo < 10 || lastTwo >= 20)) ? 'года' : 'лет';
      label.textContent = `${word} работаем для вас`;
    }
  });
})();
