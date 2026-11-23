// =====================================================
// auth.js — регистрация, вход и личный кабинет.
//
// ВАЖНО: это учебная имитация без сервера. Данные лежат в localStorage
// браузера, поэтому такая «авторизация» не защищает ничего по-настоящему.
// В реальном проекте регистрацию, проверку пароля и сессию выполняет backend.
// Пароль всё равно не хранится открытым текстом: сохраняется только
// солёный хеш (PBKDF2 через Web Crypto API).
// =====================================================
(function () {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const KEYS = { users: 'shop-users', session: 'shop-session', orders: 'shop-orders' };

  // ---------- Хранилище ----------
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  const normalizeEmail = (email) => String(email).trim().toLowerCase();

  // ---------- Хеширование пароля ----------
  const toHex = (buffer) => Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0')).join('');

  function randomSalt() {
    const bytes = new Uint8Array(16);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(bytes);
    else bytes.forEach((_, i) => { bytes[i] = Math.floor(Math.random() * 256); });
    return toHex(bytes);
  }

  async function hashPassword(password, salt) {
    // Web Crypto доступен только на https и localhost. Для открытия файла
    // двойным щелчком оставляем простой запасной вариант (только для демо).
    if (window.crypto && crypto.subtle) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
      const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: encoder.encode(salt), iterations: 100000, hash: 'SHA-256' },
        key,
        256
      );
      return `pbkdf2:${toHex(bits)}`;
    }
    let h = 5381;
    const text = salt + password;
    for (let i = 0; i < text.length; i += 1) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
    return `demo:${h}`;
  }

  // ---------- Пользователь и заказы ----------
  function currentUser() {
    let email = null;
    try { email = localStorage.getItem(KEYS.session); } catch (e) { email = null; }
    if (!email) return null;
    const users = read(KEYS.users, {});
    return users[email] ? { email, ...users[email] } : null;
  }

  function setSession(email) {
    try { localStorage.setItem(KEYS.session, email); } catch (e) { /* ничего не делаем */ }
  }

  function logout() {
    try { localStorage.removeItem(KEYS.session); } catch (e) { /* ничего не делаем */ }
  }

  function getOrders(email) {
    const all = read(KEYS.orders, {});
    return Array.isArray(all[email]) ? all[email] : [];
  }

  // Вызывается из main.js после успешной отправки заявки.
  function addOrder(order) {
    const user = currentUser();
    if (!user) return false;
    const all = read(KEYS.orders, {});
    const list = Array.isArray(all[user.email]) ? all[user.email] : [];
    list.unshift({ id: Date.now(), createdAt: new Date().toISOString(), status: 'Принята', ...order });
    all[user.email] = list.slice(0, 50);
    return write(KEYS.orders, all);
  }

  // Подставляем имя и e-mail из аккаунта в форму заявки.
  function prefill(form) {
    const user = currentUser();
    if (!user || !form) return;
    const name = form.querySelector('[name="name"]');
    const email = form.querySelector('[name="email"]');
    if (name && !name.value) name.value = user.name;
    if (email && !email.value) email.value = user.email;
  }

  window.ShopAuth = { currentUser, logout, addOrder, prefill };

  // ---------- Шапка: ссылка на кабинет ----------
  const accountLink = $('#account-link');
  if (accountLink) {
    const user = currentUser();
    const text = $('.account-link__text', accountLink);
    if (user) {
      accountLink.href = 'account.html';
      if (text) text.textContent = user.name.split(' ')[0];
      accountLink.setAttribute('aria-label', `Личный кабинет: ${user.name}`);
    } else {
      accountLink.href = 'login.html';
      if (text) text.textContent = 'Войти';
      accountLink.setAttribute('aria-label', 'Войти в аккаунт');
    }
    const page = window.location.pathname.split('/').pop();
    if (page === 'account.html' || page === 'login.html') accountLink.setAttribute('aria-current', 'page');
  }

  // ---------- Помощники для форм ----------
  function setError(field, message) {
    const error = document.getElementById(`${field.id}-error`);
    field.setAttribute('aria-invalid', 'true');
    if (error) {
      error.textContent = message;
      error.hidden = false;
    }
  }

  function clearError(field) {
    const error = document.getElementById(`${field.id}-error`);
    field.removeAttribute('aria-invalid');
    if (error) {
      error.textContent = '';
      error.hidden = true;
    }
  }

  function showFormMessage(element, message) {
    if (!element) return;
    element.textContent = message;
    element.hidden = !message;
  }

  // Ошибка исчезает, как только пользователь начал исправлять поле.
  function liveClear(form) {
    form.addEventListener('input', (event) => {
      if (event.target.hasAttribute && event.target.hasAttribute('aria-invalid')) clearError(event.target);
    });
  }

  // Безопасный адрес для возврата после входа: только страницы этого сайта.
  function nextPage() {
    const next = new URLSearchParams(window.location.search).get('next');
    return next && /^[a-z0-9-]+\.html$/i.test(next) && next !== 'login.html' ? next : 'account.html';
  }

  // Кнопки «Показать пароль».
  $$('[data-toggle-password]').forEach((button) => {
    const input = document.getElementById(button.dataset.togglePassword);
    button.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.setAttribute('aria-pressed', String(show));
      button.textContent = show ? 'Скрыть' : 'Показать';
    });
  });

  // ---------- Страница входа ----------
  const loginForm = $('#login-form');
  const registerForm = $('#register-form');

  if (loginForm && registerForm) {
    if (currentUser()) {
      window.location.replace('account.html');
      return;
    }

    const banner = $('#auth-banner');
    if (banner && new URLSearchParams(window.location.search).get('next')) {
      banner.hidden = false;
    }

    liveClear(loginForm);
    liveClear(registerForm);

    // --- Вход ---
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = $('#login-email');
      const password = $('#login-password');
      const formError = $('#login-form-error');
      showFormMessage(formError, '');
      [email, password].forEach(clearError);

      let valid = true;
      if (!email.value.trim()) { setError(email, 'Введите e-mail'); valid = false; }
      else if (!email.checkValidity()) { setError(email, 'Введите e-mail в формате example@mail.ru'); valid = false; }
      if (!password.value) { setError(password, 'Введите пароль'); valid = false; }
      if (!valid) {
        loginForm.querySelector('[aria-invalid="true"]').focus();
        return;
      }

      const users = read(KEYS.users, {});
      const key = normalizeEmail(email.value);
      const user = users[key];
      const hash = user ? await hashPassword(password.value, user.salt) : null;

      // Одно и то же сообщение для «нет такого e-mail» и «неверный пароль».
      if (!user || hash !== user.hash) {
        showFormMessage(formError, 'Неверный e-mail или пароль. Проверьте данные или зарегистрируйтесь.');
        formError.focus();
        return;
      }

      setSession(key);
      window.location.href = nextPage();
    });

    // --- Регистрация ---
    registerForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const name = $('#reg-name');
      const email = $('#reg-email');
      const password = $('#reg-password');
      const confirm = $('#reg-password2');
      const agree = $('#reg-agree');
      const formError = $('#register-form-error');
      showFormMessage(formError, '');
      [name, email, password, confirm, agree].forEach(clearError);

      if (name.value.trim().length < 2) setError(name, 'Введите имя (не менее 2 символов)');
      if (!email.value.trim()) setError(email, 'Введите e-mail');
      else if (!email.checkValidity()) setError(email, 'Введите e-mail в формате example@mail.ru');
      if (password.value.length < 8) setError(password, 'Пароль должен содержать не менее 8 символов');
      else if (!/[A-Za-zА-Яа-яЁё]/.test(password.value) || !/\d/.test(password.value)) {
        setError(password, 'В пароле должны быть и буквы, и цифры');
      }
      if (!confirm.value) setError(confirm, 'Повторите пароль');
      else if (confirm.value !== password.value) setError(confirm, 'Пароли не совпадают');
      if (!agree.checked) setError(agree, 'Подтвердите согласие на обработку данных');

      const firstInvalid = registerForm.querySelector('[aria-invalid="true"]');
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      const users = read(KEYS.users, {});
      const key = normalizeEmail(email.value);
      if (users[key]) {
        setError(email, 'Аккаунт с таким e-mail уже существует. Войдите или используйте другой адрес.');
        email.focus();
        return;
      }

      const salt = randomSalt();
      users[key] = {
        name: name.value.trim(),
        salt,
        hash: await hashPassword(password.value, salt),
        created: new Date().toISOString(),
      };

      if (!write(KEYS.users, users)) {
        showFormMessage(formError, 'Не удалось сохранить аккаунт: браузер запретил хранение данных.');
        return;
      }

      setSession(key);
      window.location.href = nextPage();
    });
  }

  // ---------- Личный кабинет ----------
  const account = $('#account');

  if (account) {
    const user = currentUser();
    if (!user) {
      window.location.replace('login.html?next=account.html');
      return;
    }

    const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    const TOPICS = { product: 'Заказ товара', consultation: 'Консультация', delivery: 'Доставка' };
    const METHODS = { phone: 'по телефону', email: 'по e-mail' };

    function renderProfile() {
      const fresh = currentUser();
      $('#account-title').textContent = `Здравствуйте, ${fresh.name.split(' ')[0]}!`;
      $('#account-avatar').textContent = fresh.name.trim().charAt(0).toUpperCase();
      $('#profile-name').textContent = fresh.name;
      $('#profile-email').textContent = fresh.email;
      $('#profile-created').textContent = dateFormat.format(new Date(fresh.created));
      const region = window.ShopRegion ? window.ShopRegion.current : null;
      $('#profile-country').textContent = region ? `${region.name} (${region.currency})` : '—';
      document.title = `Личный кабинет — ${fresh.name} — Mongolz`;
    }

    function renderOrders() {
      const list = $('#orders-list');
      const empty = $('#orders-empty');
      const orders = getOrders(user.email);
      list.innerHTML = '';
      empty.hidden = orders.length > 0;
      $('#orders-count').textContent = orders.length ? `Заявок: ${orders.length}` : '';

      orders.forEach((order) => {
        const item = document.createElement('li');
        item.className = 'orders-list__item';

        const title = document.createElement('h3');
        title.className = 'orders-list__title';
        title.textContent = order.product || 'Заявка';

        const status = document.createElement('span');
        status.className = 'status';
        status.textContent = order.status;

        const meta = document.createElement('p');
        meta.className = 'orders-list__meta';
        const parts = [
          dateFormat.format(new Date(order.createdAt)),
          TOPICS[order.topic] || null,
          order.contactMethod ? `связь ${METHODS[order.contactMethod] || order.contactMethod}` : null,
          order.country || null,
        ].filter(Boolean);
        meta.textContent = parts.join(' · ');

        item.append(title, status, meta);

        if (order.comment) {
          const comment = document.createElement('p');
          comment.className = 'orders-list__meta';
          comment.textContent = `Комментарий: ${order.comment}`;
          item.append(comment);
        }
        list.append(item);
      });
    }

    renderProfile();
    renderOrders();

    // Смена имени.
    const profileForm = $('#profile-form');
    const profileName = $('#profile-name-input');
    const profileStatus = $('#profile-status');
    profileName.value = user.name;
    liveClear(profileForm);

    profileForm.addEventListener('submit', (event) => {
      event.preventDefault();
      clearError(profileName);
      const value = profileName.value.trim();
      if (value.length < 2) {
        setError(profileName, 'Введите имя (не менее 2 символов)');
        profileName.focus();
        return;
      }
      const users = read(KEYS.users, {});
      users[user.email].name = value;
      write(KEYS.users, users);
      renderProfile();
      profileStatus.textContent = 'Имя сохранено.';
      const link = $('#account-link .account-link__text');
      if (link) link.textContent = value.split(' ')[0];
    });

    // Выход.
    $('#logout-button').addEventListener('click', () => {
      logout();
      window.location.href = 'index.html';
    });

    // Удаление аккаунта (подтверждение встроенным окном браузера).
    $('#delete-account-button').addEventListener('click', () => {
      if (!window.confirm('Удалить аккаунт и историю заявок? Это действие нельзя отменить.')) return;
      const users = read(KEYS.users, {});
      const orders = read(KEYS.orders, {});
      delete users[user.email];
      delete orders[user.email];
      write(KEYS.users, users);
      write(KEYS.orders, orders);
      logout();
      window.location.href = 'index.html';
    });

    // При смене страны обновляем строку в профиле.
    document.addEventListener('shop:region-change', renderProfile);
  }
})();
