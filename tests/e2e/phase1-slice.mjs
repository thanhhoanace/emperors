// Browser QA for the current Phase 1 slice (index.html). Needs `npm start` running.
// three.js is served from node_modules instead of the CDN so the run is offline-safe.
// Local: PUPPETEER_EXECUTABLE_PATH=/path/to/chromium npm run qa
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../load.mjs';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000/';
const OUT = path.join(ROOT, 'test-results');
fs.mkdirSync(OUT, { recursive: true });
const CDN_THREE = /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/(.+)$/;
const browser = await puppeteer.launch({
  headless: false,
  args: ['--no-sandbox','--disable-setuid-sandbox','--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader-webgl']
});
let failed = null;
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const m = req.url().match(CDN_THREE);
    const file = m && path.join(ROOT, 'node_modules/three', m[1]);
    if (file && fs.existsSync(file)) return req.respond({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(file) });
    // Remote poster/video of the cinematic are decoration; stub them so QA does not depend on the network.
    if (!req.url().startsWith(BASE_URL) && ['image', 'media'].includes(req.resourceType())) return req.respond({ status: 204, body: '' });
    req.continue();
  });
  const pageErrors = [];
  page.on('pageerror', e => { pageErrors.push(e.message); console.error('PAGE_ERROR', e.message); });
  page.on('console', m => { if (m.type() === 'error') { pageErrors.push(m.text()); console.error('CONSOLE_ERROR', m.text()); } });

  console.log('QA goto', BASE_URL);
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('QA domcontentloaded');
  await page.waitForFunction(() => window.__sliceReady === true, { timeout: 30000 });
  console.log('QA scene ready');
  await new Promise(r => setTimeout(r, 2600));

  async function clickCity(name) {
    const p = await page.evaluate(n => window.__slice.projectCity(n), name);
    console.log('QA click', name, p);
    await page.mouse.click(p.x, p.y);
    await new Promise(r => setTimeout(r, 280));
  }

  const before = await page.evaluate(() => window.__slice.getState());
  await clickCity('Xiangyang');
  await clickCity('Chengdu');
  const armed = await page.evaluate(() => window.__slice.getState());
  if (!armed.targetChosen) throw new Error('Chengdu target was not armed by real canvas clicks');

  await page.click('#endTurn');
  console.log('QA end turn');
  await page.waitForFunction(() => window.__slice.lastResult?.moved === true, { timeout: 10000 });
  await new Promise(r => setTimeout(r, 900));
  const after = await page.evaluate(() => window.__slice.getState());

  const dist = Math.hypot(after.liuBei.x - before.liuBei.x, after.liuBei.z - before.liuBei.z);
  if (dist < 25) throw new Error(`Liu Bei did not march far enough: ${dist}`);
  for (const k of ['Troops','Grain','Territory','Morale','Prestige']) {
    if (after.stats[k] === before.stats[k]) throw new Error(`${k} did not update`);
  }
  if (after.turn !== 2) throw new Error(`Expected turn 2, got ${after.turn}`);
  if (pageErrors.length) throw new Error('Browser errors: ' + pageErrors.join(' | '));

  await page.screenshot({ path: path.join(OUT, 'phase1-slice.png'), fullPage: false });
  console.log(JSON.stringify({ ok:true, dist:Number(dist.toFixed(2)), before, after }, null, 2));
} catch (e) {
  failed = e;
  console.error('QA_FAILED', e?.stack || e);
} finally {
  await browser.close();
}
if (failed) process.exit(1);
