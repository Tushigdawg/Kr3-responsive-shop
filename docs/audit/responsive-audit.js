const { chromium } = require('playwright');
const pages = ['index','catalog','product','about','contacts','favorites','login','account'];
const base = 'file://' + process.cwd() + '/';
(async () => {
  const b = await chromium.launch(); const out = [];
  // ---- focus visibility ----
  const ctx0 = await b.newContext({ viewport: { width: 1280, height: 900 } });
  for (const pg of pages) {
    const p = await ctx0.newPage(); await p.goto(base + pg + '.html' + (pg==='product'?'?id=3':'')); await p.waitForTimeout(300);
    let n = 0, bad = [];
    for (let i = 0; i < 80; i++) {
      await p.keyboard.press('Tab');
      const r = await p.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const s = getComputedStyle(e); const r = e.getBoundingClientRect();
        const host = e.closest('.site-search__field') || e; const hs = getComputedStyle(host); const outline = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2) || (hs.outlineStyle !== 'none' && parseFloat(hs.outlineWidth) >= 2); const shadow = s.boxShadow !== 'none' && /\d+px/.test(s.boxShadow);
        return { t: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : ''), ok: outline || shadow, hidden: r.width === 0 }; });
      if (!r) break; n++; if (!r.ok && !r.hidden) bad.push(r.t);
    }
    out.push(`focus ${pg}: ${n} tab stops, no-visible-focus: ${[...new Set(bad)].join(', ') || 'none'}`);
    await p.close();
  }
  await ctx0.close();
  // ---- responsive ----
  for (const w of [320, 375, 768, 1024, 1440]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 800 } });
    for (const pg of pages) {
      const p = await ctx.newPage(); await p.goto(base + pg + '.html' + (pg==='product'?'?id=3':'')); await p.waitForTimeout(300);
      const r = await p.evaluate(() => {
        const issues = []; const W = innerWidth;
        if (document.documentElement.scrollWidth > W) {
          const wide = Array.from(document.querySelectorAll('body *')).filter(e => e.getBoundingClientRect().right > W + 1 && getComputedStyle(e).position !== 'fixed').slice(0, 3).map(e => e.tagName.toLowerCase() + '.' + (e.className || '').toString().split(' ')[0]);
          issues.push('horizontal scroll; wide: ' + wide.join(' | '));
        }
        document.querySelectorAll('img').forEach(i => { if (i.closest('.site-header, .site-footer') ) return; const r = i.getBoundingClientRect(); if (r.width > W + 1) issues.push('img wider than viewport'); if (/products\//.test(i.src) && !(i.srcset && i.sizes)) issues.push('product img without srcset/sizes: ' + i.src.split('/').pop()); });
        document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea').forEach(el => { const r = el.getBoundingClientRect(); if (r.width === 0) return; if (r.right > W + 1) issues.push('form control overflows: ' + (el.id || el.name)); if (r.height < 40) issues.push(`control height ${Math.round(r.height)}: ${el.id || el.name}`); if (parseFloat(getComputedStyle(el).fontSize) < 16) issues.push(`font<16 (iOS zoom): ${el.id || el.name}`); });
        document.querySelectorAll('table').forEach(t => { const wrap = t.parentElement; const sc = getComputedStyle(wrap).overflowX; if (t.getBoundingClientRect().right > W + 1 && !/auto|scroll/.test(sc)) issues.push('table overflows without scroll wrapper'); });
        document.querySelectorAll('a[href], button').forEach(el => { const r = el.getBoundingClientRect(); if (r.width === 0 || el.closest('.visually-hidden')) return; if (W <= 768 && (r.height < 32) && !el.closest('p, li > a, small, .breadcrumbs, dd, td, .faq__answer, .site-footer')) issues.push(`small tap target ${Math.round(r.width)}x${Math.round(r.height)}: ${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 20)}`); });
        const fs = parseFloat(getComputedStyle(document.body).fontSize); if (fs < 16) issues.push('body font < 16px');
        return issues;
      });
      if (r.length) out.push(`w${w} ${pg}: ${[...new Set(r)].join(' ; ')}`);
      await p.close();
    }
    await ctx.close();
  }
  // forms: dialog + login at 320
  const ctx = await b.newContext({ viewport: { width: 320, height: 700 } }); const p = await ctx.newPage();
  await p.goto(base + 'index.html'); await p.waitForTimeout(300); await p.click('.product-card__order >> nth=0'); await p.waitForTimeout(300);
  const d = await p.evaluate(() => { const dlg = document.querySelector('dialog[open], #order-dialog[open], [role=dialog]:not([hidden])'); if (!dlg) return 'no dialog open'; const r = dlg.getBoundingClientRect(); return `dialog ${Math.round(r.left)}..${Math.round(r.right)} of ${innerWidth}, scrollW ${document.documentElement.scrollWidth}`; });
  out.push('order dialog at 320: ' + d);
  console.log(out.join('\n') || 'all ok'); await b.close();
})();
