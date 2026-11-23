const { chromium } = require('playwright');
const pages = ['index','catalog','product','about','contacts','favorites','login','account'];
const base = 'file://' + process.cwd() + '/';
const THEMES = process.argv[2] ? [process.argv[2]] : ['light','dark'];

function inPage() {
  const issues = [];
  const add = (type, el, msg) => issues.push({ type, msg, el: el ? (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '')) : '' });
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !el.closest('[hidden]'); };
  // document
  if (!document.documentElement.lang) add('doc', null, 'no lang');
  if (!document.title.trim()) add('doc', null, 'no title');
  if (!document.querySelector('meta[name=viewport]')) add('doc', null, 'no viewport');
  const h1 = document.querySelectorAll('h1'); if (h1.length !== 1) add('headings', null, 'h1 count ' + h1.length);
  let prev = 0; document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h => { const l = +h.tagName[1]; if (prev && l > prev + 1) add('headings', h, `skip h${prev}->h${l}`); prev = l; });
  ['header','nav','main','footer'].forEach(t => { if (!document.querySelector(t)) add('landmark', null, 'no <' + t + '>'); });
  if (document.querySelectorAll('main').length > 1) add('landmark', null, 'multiple main');
  if (!document.querySelector('a[href="#main"], a.skip-link')) add('landmark', null, 'no skip link');
  // images
  document.querySelectorAll('img').forEach(img => {
    if (!img.hasAttribute('alt')) add('img', img, 'no alt attr');
    else if (img.alt.trim() === '' && !img.closest('[aria-hidden=true]') && img.getAttribute('role') !== 'presentation') add('img', img, 'empty alt (decorative?) ' + img.src.split('/').pop());
    if (/^(image|img|photo|картинка|рисунок)\b/i.test(img.alt)) add('img', img, 'alt starts with generic word: ' + img.alt);
    if (!img.getAttribute('width') || !img.getAttribute('height')) add('img', img, 'no width/height');
  });
  document.querySelectorAll('svg').forEach(s => { if (vis(s) && !s.closest('[aria-hidden=true]') && !s.getAttribute('aria-label') && !s.querySelector('title') && s.getAttribute('role') !== 'img') add('svg', s, 'svg not hidden and no name'); });
  // names
  const name = (el) => {
    const lb = el.getAttribute('aria-labelledby'); if (lb) return lb.split(/\s+/).map(i => (document.getElementById(i) || {}).textContent || '').join(' ').trim();
    const al = el.getAttribute('aria-label'); if (al && al.trim()) return al.trim();
    if (el.labels && el.labels.length) return Array.from(el.labels).map(l => l.textContent).join(' ').trim();
    if (el.tagName === 'INPUT' && ['button','submit','reset'].includes(el.type)) return el.value;
    const t = (el.textContent || '').trim(); if (t) return t;
    const im = el.querySelector('img[alt]'); if (im && im.alt.trim()) return im.alt.trim();
    return el.getAttribute('title') || '';
  };
  document.querySelectorAll('a[href], button, [role=button], summary').forEach(el => { if (vis(el) && !name(el)) add('name', el, 'interactive without accessible name'); });
  document.querySelectorAll('input:not([type=hidden]), select, textarea').forEach(el => { if (vis(el) && !name(el) && !el.closest('[hidden]')) add('form', el, 'control without label'); });
  document.querySelectorAll('a[href]').forEach(a => { const t = name(a).toLowerCase(); if (['здесь','тут','читать далее','подробнее'].includes(t) && !a.getAttribute('aria-label') && !a.closest('.product-card')) add('link', a, 'vague link text ' + t); });
  // ids
  const ids = {}; document.querySelectorAll('[id]').forEach(e => { ids[e.id] = (ids[e.id] || 0) + 1; }); Object.entries(ids).forEach(([k, v]) => { if (v > 1) add('id', null, 'duplicate id ' + k); });
  // aria validity
  const ROLES = new Set(['alert','alertdialog','application','article','banner','button','checkbox','combobox','complementary','contentinfo','dialog','form','grid','group','heading','img','link','list','listbox','listitem','log','main','menu','menuitem','navigation','none','option','presentation','radio','radiogroup','region','search','status','tab','table','tablist','tabpanel','textbox','toolbar','tooltip']);
  const ariaUse = {};
  document.querySelectorAll('*').forEach(el => {
    Array.from(el.attributes).filter(a => a.name.startsWith('aria-') || a.name === 'role').forEach(a => {
      ariaUse[a.name + '=' + (a.name.match(/label$|describedby|labelledby|controls/) ? '…' : a.value)] = (ariaUse[a.name + '=' + (a.name.match(/label$|describedby|labelledby|controls/) ? '…' : a.value)] || 0) + 1;
      if (a.name === 'role' && !ROLES.has(a.value)) add('aria', el, 'unknown role ' + a.value);
      if (['aria-labelledby','aria-describedby','aria-controls'].includes(a.name)) a.value.split(/\s+/).forEach(id => { if (!document.getElementById(id)) add('aria', el, `${a.name} -> missing #${id}`); });
    });
    const r = el.getAttribute('role'); const tag = el.tagName;
    if (r === 'button' && tag === 'BUTTON') add('aria', el, 'redundant role=button on <button>');
    if (r === 'navigation' && tag === 'NAV') add('aria', el, 'redundant role=navigation');
    if (r === 'main' && tag === 'MAIN') add('aria', el, 'redundant role=main');
    if (r === 'list' && /^(UL|OL)$/.test(tag)) add('aria', el, 'redundant role=list');
    if (el.getAttribute('aria-hidden') === 'true' && el.querySelector('a[href],button,input,select,textarea')) add('aria', el, 'aria-hidden contains focusable');
    if (el.hasAttribute('aria-label') && !el.getAttribute('aria-label').trim()) add('aria', el, 'empty aria-label');
  });
  document.querySelectorAll('nav').forEach(n => { if (document.querySelectorAll('nav').length > 1 && !n.getAttribute('aria-label') && !n.getAttribute('aria-labelledby')) add('landmark', n, 'multiple <nav> without label'); });
  // tables
  document.querySelectorAll('table').forEach(t => { if (!t.querySelector('caption') && !t.getAttribute('aria-label') && !t.getAttribute('aria-labelledby')) add('table', t, 'no caption/label'); if (!t.querySelector('th')) add('table', t, 'no th'); t.querySelectorAll('th').forEach(th => { if (!th.getAttribute('scope') && !th.closest('thead')) add('table', th, 'th without scope'); }); });
  // positive tabindex
  document.querySelectorAll('[tabindex]').forEach(e => { if (+e.getAttribute('tabindex') > 0) add('focus', e, 'positive tabindex'); });
  // contrast
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const over = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const bgOf = (el) => { let layers = []; let n = el; let unknown = false; while (n && n.nodeType === 1) { const s = getComputedStyle(n); if (s.backgroundImage !== 'none' && !s.backgroundImage.startsWith('url(')) { unknown = true; /* gradient: sample first color */ const m = s.backgroundImage.match(/rgba?\([^)]+\)/); if (m) layers.push(parse(m[0])); } else if (s.backgroundImage.startsWith('url(') ) { unknown = true; } const c = parse(s.backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a === 1) break; } n = n.parentElement; } let bg = { r: 255, g: 255, b: 255, a: 1 }; if (!layers.some(l => l.a === 1)) { const bs = parse(getComputedStyle(document.body).backgroundColor); if (bs && bs.a) bg = bs; } for (let i = layers.length - 1; i >= 0; i--) bg = over(layers[i], bg); return { bg, unknown }; };
  const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node; const bad = [];
  while ((node = walker.nextNode())) {
    const text = node.textContent.trim(); if (!text) continue; const el = node.parentElement;
    if (!vis(el) || el.closest('script,style,noscript,.visually-hidden')) continue;
    const s = getComputedStyle(el); if (+s.opacity === 0) continue;
    const fg0 = parse(s.color); if (!fg0) continue;
    let opacity = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) opacity *= +getComputedStyle(n).opacity;
    if (opacity < 0.99) continue; // элементы в анимации появления — пропускаем
    const { bg, unknown } = bgOf(el); const fg = over(fg0, bg);
    const L1 = lum(fg), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(s.fontSize); const bold = parseInt(s.fontWeight) >= 700; const large = size >= 24 || (size >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    const key = el.tagName + s.color + JSON.stringify(bg) + text.slice(0, 20);
    if (ratio < need && !seen.has(key)) { seen.add(key); bad.push({ type: 'contrast', el: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''), msg: `${ratio.toFixed(2)} < ${need} "${text.slice(0, 30)}" fg=${s.color} bg=rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})${unknown ? ' (gradient/img bg)' : ''}` }); }
  }
  return { issues: issues.concat(bad), ariaUse };
}

(async () => {
  const b = await chromium.launch(); const summary = {}; const aria = {};
  for (const theme of THEMES) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: theme });
    for (const pg of pages) {
      const p = await ctx.newPage();
      await p.addInitScript((t) => { try { localStorage.setItem('shop-theme', t); localStorage.setItem('theme', t); } catch (e) {} }, theme);
      await p.goto(base + pg + '.html' + (pg === 'product' ? '?id=3' : '')); await p.waitForTimeout(300);
      await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
      await p.evaluate(() => { document.querySelectorAll('.reveal').forEach(e => e.classList.add('is-visible')); });
      await p.waitForTimeout(900);
      const r = await p.evaluate(inPage);
      summary[theme + ':' + pg] = r.issues; Object.assign(aria, r.ariaUse);
      await p.close();
    }
    await ctx.close();
  }
  let total = 0;
  for (const [k, v] of Object.entries(summary)) { total += v.length; console.log(`\n== ${k}: ${v.length} issues`); v.forEach(i => console.log(`  [${i.type}] ${i.el} — ${i.msg}`)); }
  console.log('\nTOTAL', total);
  if (process.env.ARIA) console.log('\nARIA used:', JSON.stringify(aria, null, 1));
  await b.close();
})();
