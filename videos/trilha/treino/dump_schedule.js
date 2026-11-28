const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.error('pageerror', e.message));
  await p.goto(process.argv[2], { waitUntil: 'load' });
  await p.waitForFunction(() => window.__schedule, null, { timeout: 60000 });
  const s = await p.evaluate(() => window.__schedule);
  require('fs').writeFileSync(process.argv[3], JSON.stringify(s, null, 1));
  await b.close();
})();
