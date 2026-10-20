// Browser QA + screenshots for paper.html (v3 paper-cut diorama, docs/design/v3-paper.md). Needs `PORT=3120 node server/server.js` running.
//   PUPPETEER_EXECUTABLE_PATH=/path/to/chromium xvfb-run -a node tests/e2e/paper-shots.mjs [shot ...]   (default: all)
// shots: default zoom winter spring summer low play   -> test-results/paper/<name>.png + paper-report.json (triangles, draw calls per tier)
import { createRequire } from 'module';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../load.mjs';
const require = createRequire(path.join(ROOT, 'package.json'));
const puppeteer = require('puppeteer');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3120/';
const OUT = path.join(ROOT, 'test-results/paper');
fs.mkdirSync(OUT, { recursive: true });
const CDN = /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/(.+)$/;
const [W, H] = [844, 390];
const want = process.argv.slice(2);
const todo = (n) => !want.length || want.includes(n);
const report = { shots: {}, errors: [] };
const browser = await puppeteer.launch({ headless: false, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH, protocolTimeout: 900000,
  args: ['--no-sandbox', '--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader-webgl', `--window-size=${W},${H + 120}`] });
async function open(query) {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.setRequestInterception(true);
  page.on('request', (req) => { const m = req.url().match(CDN), f = m && path.join(ROOT, 'node_modules/three', m[1]); if (f && fs.existsSync(f)) return req.respond({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(f) }); req.continue(); });
  page.on('pageerror', (e) => { report.errors.push(e.message); console.error('PAGE_ERROR', e.message); });
  page.on('console', (m) => { if (m.type() === 'error') { report.errors.push(m.text()); console.error('CONSOLE_ERROR', m.text()); } });
  await page.goto(BASE + 'paper.html?' + query, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.__done || window.__error, { timeout: 300000, polling: 500 });
  const err = await page.evaluate(() => window.__error); if (err) throw new Error(err);
  await new Promise((r) => setTimeout(r, 700));
  return page;
}
const snap = async (page, name) => { await new Promise((r) => setTimeout(r, 900)); await page.screenshot({ path: path.join(OUT, name + '.png') }); const e = await page.evaluate(() => window.__extra); report.shots[name] = e; console.log(name, JSON.stringify(e)); };
try {
  if (todo('default')) { const p = await open('tier=mid'); await snap(p, 'default'); await p.close(); }
  if (todo('zoom')) { const p = await open('tier=high&focus=chung_ly&zoom=44'); await snap(p, 'zoom'); await p.close(); }
  if (todo('winter')) { const p = await open('tier=mid&season=' + encodeURIComponent('Đông')); await snap(p, 'winter'); await p.close(); }
  if (todo('spring')) { const p = await open('tier=mid&season=' + encodeURIComponent('Xuân')); await snap(p, 'spring'); await p.close(); }
  if (todo('summer')) { const p = await open('tier=mid&season=' + encodeURIComponent('Hạ')); await snap(p, 'summer'); await p.close(); }
  if (todo('low')) { const p = await open('tier=low'); await snap(p, 'low'); await p.close(); }
  if (todo('play')) {
    const p = await open('tier=mid');
    await p.evaluate(() => window.__paper.select('a1')); await snap(p, 'play-1-selected');
    const tg = await p.evaluate(() => window.__paper.V2.targets(window.__paper.game(), 'a1')); console.log('targets', JSON.stringify(tg));
    const t = tg.find((x) => x.kind === 'town' && x.intent === 'ask') || tg[0];
    const ok = await p.evaluate((t) => window.__paper.order(t.kind, t.id, t.intent === 'ask' ? 'attack' : t.intent), t); console.log('order', ok);
    await snap(p, 'play-2-ordered');
    await p.evaluate(() => window.__paper.endSeason()); await new Promise((r) => setTimeout(r, 400)); await snap(p, 'play-3-gliding');
    await new Promise((r) => setTimeout(r, 4000)); await snap(p, 'play-4-after');
    const v = await p.evaluate(() => { const g = window.__paper.view(); return { cal: g.calendar, towns: g.towns.map((x) => x.id + ':' + x.owner), armies: g.armies.map((a) => a.id + '@' + a.at) }; }); console.log(JSON.stringify(v)); report.play = v;
    await p.close();
  }
} finally { fs.writeFileSync(path.join(OUT, 'paper-report.json'), JSON.stringify(report, null, 1)); await browser.close(); }
