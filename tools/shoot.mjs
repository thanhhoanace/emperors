// Dev tool: open a page (any URL) in headless Chromium on the software GPU, wait for window.__done, screenshot it and
// dump window.__extra (measurements) next to it as JSON. node tools/shoot.mjs <url> <out.png> [W H dpr]
// Local: PUPPETEER_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome xvfb-run -a node tools/shoot.mjs …
import { createRequire } from 'module';
const require = createRequire('/home/user/emperors/package.json');
const puppeteer = require('puppeteer');
const [, , url, out, W = '844', H = '390', dsf = '1'] = process.argv;
const b = await puppeteer.launch({ headless: false, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', protocolTimeout: 1800000,
  args: ['--no-sandbox', '--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader-webgl', '--window-size=1400,1000'] });
try {
  const p = await b.newPage(); const logs = [];
  // pages that load three.js from jsdelivr (game.html) get it from node_modules: the container has no CDN access
  const CDN_THREE = /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/(.+)$/, fs = await import('fs'), path = await import('path');
  await p.setRequestInterception(true);
  p.on('request', (req) => { const m = req.url().match(CDN_THREE), file = m && path.join('/home/user/emperors/node_modules/three', m[1]); if (file && fs.existsSync(file)) return req.respond({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(file) }); req.continue(); });
  p.on('console', (m) => logs.push(m.type() + ': ' + m.text())); p.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
  await p.setViewport({ width: +W, height: +H, deviceScaleFactor: +dsf });
  const t0 = Date.now();
  await p.goto(url, { waitUntil: 'load', timeout: 600000 });
  await p.waitForFunction(() => window.__done || window.__error || (window.__game && window.__game.ready), { timeout: 1500000, polling: 1000 }); // __game.ready: game.html
  const r = await p.evaluate(() => ({ err: window.__error, extra: window.__extra, cv: (() => { const c = document.querySelector('canvas'); return c && [c.width, c.height, c.clientWidth, c.clientHeight]; })(), dpr: devicePixelRatio }));
  console.log('seconds', (Date.now() - t0) / 1000, JSON.stringify(r).slice(0, 600)); (await import('fs')).writeFileSync(out + '.json', JSON.stringify(r, null, 1));
  await p.screenshot({ path: out });
  console.log(logs.filter((l) => !/GroupMarker|GPU stall|swiftshader/.test(l)).slice(-10).join('\n'));
} finally { await b.close(); }
