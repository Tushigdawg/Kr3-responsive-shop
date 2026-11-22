// Калькулятор стоимости заказа.
// Считает: цена × количество + услуги + доставка − скидки. Цены в данных хранятся в рублях,
// на странице их пересчитывает ShopRegion (валюта выбранной страны).
(function () {
  'use strict';

  const root = document.querySelector('[data-calculator]');
  if (!root) return;

  const PRODUCTS = window.SHOP_PRODUCTS || [];
  const form = root.querySelector('#calc-form');
  const productSelect = root.querySelector('#calc-product');
  const sizeSelect = root.querySelector('#calc-size');
  const sizeLabel = root.querySelector('#calc-size-label');
  const qtyInput = root.querySelector('#calc-qty');
  const promoInput = root.querySelector('#calc-promo');
  const promoButton = root.querySelector('#calc-promo-apply');
  const promoStatus = root.querySelector('#calc-promo-status');
  const itemEl = root.querySelector('#calc-item');
  const linesEl = root.querySelector('#calc-lines');
  const totalEl = root.querySelector('#calc-total');
  const orderButton = root.querySelector('#calc-order');
  const tailorOption = root.querySelector('[data-tailor]');

  // Варианты размера зависят от товара.
  const SIZE_SETS = {
    clothing: { label: 'Размер', values: ['S', 'M', 'L', 'XL', 'XXL'] },
    boots: { label: 'Размер обуви', values: ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'] },
    hat: { label: 'Размер головы', values: ['55', '56', '57', '58', '59', '60'] },
    belt: { label: 'Длина пояса', values: ['90 см', '100 см', '110 см'] },
    none: { label: 'Вариант', values: ['Стандартный'] },
  };
  const sizeKey = (p) => ({ 4: 'boots', 10: 'hat', 5: 'belt' }[p.id] || (p.cat === 'clothing' ? 'clothing' : 'none'));
  const canTailor = (p) => p.cat === 'clothing' || p.id === 4 || p.id === 10;

  const PROMOS = { NAADAM10: 10, MONGOLZ5: 5 };
  const QTY_DISCOUNT = { from: 3, percent: 5 };
  let promoPercent = 0;

  // Какой товар считаем: на странице товара — по адресу (как в main.js), на главной — из списка.
  function initialProduct() {
    if (productSelect) return PRODUCTS[2] || PRODUCTS[0];
    const requested = new URLSearchParams(window.location.search).get('id');
    return PRODUCTS.find((p) => String(p.id) === requested) || PRODUCTS.find((p) => p.id === 2) || PRODUCTS[0];
  }
  let product = initialProduct();

  if (productSelect) {
    PRODUCTS.forEach((p) => {
      const option = document.createElement('option');
      option.value = String(p.id);
      option.textContent = p.label;
      productSelect.append(option);
    });
    productSelect.value = String(product.id);
    productSelect.addEventListener('change', () => {
      product = PRODUCTS.find((p) => String(p.id) === productSelect.value) || product;
      fillSizes();
      calculate();
    });
  }

  function fillSizes() {
    const set = SIZE_SETS[sizeKey(product)];
    sizeLabel.textContent = set.label;
    sizeSelect.replaceChildren(...set.values.map((v) => {
      const option = document.createElement('option');
      option.value = v;
      option.textContent = v;
      return option;
    }));
    sizeSelect.disabled = set.values.length === 1;
    const tailor = canTailor(product);
    tailorOption.hidden = !tailor;
    if (!tailor) tailorOption.querySelector('input').checked = false;
  }

  const money = (rub) => `<span data-rub="${Math.round(rub)}">${new Intl.NumberFormat('ru-RU').format(Math.round(rub))} руб.</span>`;
  const plain = (rub) => (window.ShopRegion ? window.ShopRegion.format(Math.round(rub)) : `${Math.round(rub)} руб.`);

  function calculate() {
    const qty = Math.min(20, Math.max(1, parseInt(qtyInput.value, 10) || 1));
    const itemsSum = product.price * qty;

    // Услуги.
    const services = Array.from(form.querySelectorAll('input[name="service"]:checked'))
      .filter((input) => !input.closest('[hidden]'))
      .map((input) => {
        const label = input.closest('label').querySelector('span').childNodes[0].textContent.trim();
        const amount = input.dataset.fixed ? Number(input.dataset.fixed) : (itemsSum * Number(input.dataset.percent)) / 100;
        return { label, amount };
      });
    const servicesSum = services.reduce((sum, s) => sum + s.amount, 0);

    // Скидки: за количество и по промокоду (в сумме не больше 15%).
    const qtyPercent = qty >= QTY_DISCOUNT.from ? QTY_DISCOUNT.percent : 0;
    const percent = Math.min(15, qtyPercent + promoPercent);
    const discount = (itemsSum * percent) / 100;

    // Доставка: бесплатная, если товары после скидки дороже порога.
    const delivery = form.querySelector('input[name="delivery"]:checked');
    const freeFrom = Number(delivery.dataset.freeFrom || 0);
    const goodsAfterDiscount = itemsSum - discount;
    const deliveryFree = freeFrom > 0 && goodsAfterDiscount >= freeFrom;
    const deliveryPrice = deliveryFree ? 0 : Number(delivery.dataset.fixed);

    const total = goodsAfterDiscount + servicesSum + deliveryPrice;

    itemEl.textContent = `${product.label} · ${sizeSelect.disabled ? '' : sizeSelect.value + ' · '}${qty} шт.`;

    const rows = [[`Товар × ${qty}`, money(itemsSum)]];
    services.forEach((s) => rows.push([s.label, `+ ${money(s.amount)}`]));
    if (percent > 0) {
      const reasons = [qtyPercent ? `за ${QTY_DISCOUNT.from}+ шт.` : '', promoPercent ? 'промокод' : ''].filter(Boolean).join(' и ');
      rows.push([`Скидка ${percent}% (${reasons})`, `− ${money(discount)}`]);
    }
    rows.push([`Доставка: ${delivery.dataset.label}`, deliveryFree ? '<span class="calc__free">бесплатно</span>' : money(deliveryPrice)]);
    linesEl.innerHTML = rows.map(([k, v]) => `<div class="calc__line"><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    totalEl.dataset.rub = String(Math.round(total));
    totalEl.textContent = '';

    if (window.ShopRegion) window.ShopRegion.apply();
    totalEl.textContent = plain(total);

    // Текст заказа для формы заявки (main.js берёт его из data-product в момент клика).
    const serviceText = services.length ? `; услуги: ${services.map((s) => s.label.toLowerCase()).join(', ')}` : '';
    orderButton.dataset.product = `${product.name} — ${sizeSelect.disabled ? '' : sizeSelect.value + ', '}${qty} шт.${serviceText}; ${delivery.dataset.label.toLowerCase()}; итого ${plain(total)}`;
  }

  function applyPromo() {
    const code = promoInput.value.trim().toUpperCase();
    if (!code) {
      promoPercent = 0;
      promoStatus.textContent = 'Скидка 5% действует автоматически при заказе от 3 штук.';
    } else if (PROMOS[code]) {
      promoPercent = PROMOS[code];
      promoStatus.textContent = `Промокод применён: скидка ${promoPercent}%.`;
    } else {
      promoPercent = 0;
      promoStatus.textContent = 'Такого промокода нет. Попробуйте NAADAM10.';
    }
    calculate();
  }

  form.addEventListener('submit', (event) => { event.preventDefault(); applyPromo(); });
  promoButton.addEventListener('click', applyPromo);
  form.addEventListener('input', (event) => { if (event.target !== promoInput) calculate(); });
  form.addEventListener('change', calculate);
  document.addEventListener('shop:region-change', calculate);

  fillSizes();
  calculate();
})();
