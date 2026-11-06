const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const fd = 'file://' + path.resolve(process.argv[3] || 'assets/fonts');
  const items = JSON.parse(process.argv[2]);
  const html = `<html><head><style>
  @font-face{font-family:BC;src:url(${fd}/barlowc-800.woff2);font-weight:800}
  @font-face{font-family:IN;src:url(${fd}/inter-700.woff2);font-weight:100 900}
  @font-face{font-family:JB;src:url(${fd}/jbmono-500.woff2);font-weight:100 900}
  span{white-space:pre}</style></head><body>${items.map((it,i)=>`<div><span id="s${i}" style="font-family:${it.f};font-weight:${it.w||800};font-size:${it.px}px;letter-spacing:${it.ls||0}em">${it.t.split('').map((c,j)=>`<span id="s${i}_${j}">${c}</span>`).join('')}</span></div>`).join('')}</body></html>`;
  const b = await chromium.launch(); const p = await b.newPage(); await p.setContent(html); await p.evaluate(() => document.fonts.ready);
  const r = await p.evaluate((items) => items.map((it,i) => { const s=document.getElementById('s'+i).getBoundingClientRect();
    const ch=[...it.t].map((c,j)=>{const q=document.getElementById('s'+i+'_'+j).getBoundingClientRect(); return [c, +(q.left-s.left).toFixed(1), +q.width.toFixed(1)];});
    return {t:it.t, px:it.px, w:+s.width.toFixed(1), h:+s.height.toFixed(1), ch}; }), items);
  console.log(JSON.stringify(r)); await b.close();
})();
