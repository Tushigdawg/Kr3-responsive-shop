// Практика 13: переменные, типы данных, операторы, функции и вывод в консоль.
// Файл подключается на всех страницах (defer). Результаты работы функций видны в консоли браузера (F12).
(function () {
  'use strict';

  // 1. Объект товара: строки, числа, логические значения и вложенный объект.
  const sampleProduct = {
    id: 4,                                        // число
    name: 'Гутулы — традиционные монгольские сапоги', // строка
    category: 'Обувь и аксессуары',               // строка
    price: 18900,                                 // число (рубли)
    oldPrice: 21900,                              // число
    inStock: true,                                // логическое значение
    isNew: false,                                 // логическое значение
    rating: 4.8,                                  // число
    specs: { material: 'Натуральная кожа', warranty: 'Гарантия мастера 12 месяцев' }, // объект
  };

  // 2. Форматирование цены: 18900 -> «18 900 руб.»
  function formatPrice(price, currency = 'руб.') {
    if (typeof price !== 'number' || Number.isNaN(price)) return 'Цена не указана';
    return `${new Intl.NumberFormat('ru-RU').format(price)} ${currency}`;
  }

  // 3. Расчёт скидки (арифметические операторы): возвращает размер скидки и итоговую цену.
  function calcDiscount(price, percent) {
    const discount = (price * percent) / 100;
    return { percent, discount, finalPrice: price - discount };
  }

  // Скидка, которая уже заложена в старую и новую цену, в процентах.
  function getDiscountPercent(product) {
    return product.oldPrice > product.price
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : 0;
  }

  // 4. Статус товара (операторы сравнения и логические операторы).
  function getProductStatus(product) {
    if (!product.inStock) return 'Нет в наличии';
    if (getDiscountPercent(product) > 0 && product.rating >= 4.5) return 'Выгодное предложение';
    if (getDiscountPercent(product) > 0) return 'Скидка';
    if (product.isNew || product.tag === 'new') return 'Новинка';
    if (product.rating >= 4.8 && product.price < 50000) return 'Выбор покупателей';
    return 'В наличии';
  }

  // 5. Краткое описание в одну строку.
  function getShortDescription(product) {
    const status = getProductStatus(product);
    const material = product.specs && product.specs.material ? `, ${product.specs.material.toLowerCase()}` : '';
    return `${product.name}${material} — ${formatPrice(product.price)} (${status})`;
  }

  window.ShopUtils = { formatPrice, calcDiscount, getDiscountPercent, getProductStatus, getShortDescription };

  // 6. Вывод результатов в консоль.
  console.group('Mongolz: проверка функций (практика 13)');
  console.log('Объект товара:', sampleProduct);
  console.log('Типы данных:', {
    name: typeof sampleProduct.name,
    price: typeof sampleProduct.price,
    inStock: typeof sampleProduct.inStock,
    specs: typeof sampleProduct.specs,
  });
  console.log('formatPrice(18900):', formatPrice(18900));
  console.log('calcDiscount(18900, 10):', calcDiscount(sampleProduct.price, 10));
  console.log('getProductStatus():', getProductStatus(sampleProduct));
  console.log('getShortDescription():', getShortDescription(sampleProduct));

  const list = (window.SHOP_PRODUCTS || []).map((p) => ({
    Товар: p.label,
    Цена: formatPrice(p.price),
    Статус: getProductStatus({ ...p, inStock: p.tag !== 'out', isNew: p.tag === 'new', specs: { material: p.material } }),
  }));
  if (list.length) console.table(list);
  console.groupEnd();
})();
