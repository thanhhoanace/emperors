// Renders a design prototype shot to test-results/design/<page>-<shot>.jpg.
// Needs `npm start` running. Usage:
//   PUPPETEER_EXECUTABLE_PATH=/path/to/chrome xvfb-run -a node docs/design/prototypes/render.mjs real campaign [dpr]
// Shots: map → overview, strategic, campaign, autumn, city (round 4) · real → campaign, city, far, board, boardclose, strategy, battle · a/b/c → main, overview
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

const [, , page = 'real', shot = 'campaign', dpr = '1.5', extra = ''] = process.argv;
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000/docs/design/prototypes/';
const OUT = path.resolve('test-results/design');
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ headless: false, protocolTimeout: 600000, args: ['--no-sandbox', '--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader-webgl', '--window-size=1500,1000'] });
try {
  const tab = await browser.newPage();
  const errors = [];
  tab.on('pageerror', (e) => errors.push(e.message));
  tab.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await tab.setViewport({ width: 1440, height: 900, deviceScaleFactor: Number(dpr) });
  await tab.goto(`${BASE}${page}.html?shot=${shot}&dpr=${dpr}${extra ? '&' + extra : ''}`);
  try {
    await tab.waitForFunction(() => window.__done === true || !!window.__error, { timeout: 400000, polling: 1000 });
  } catch (e) {
    throw new Error(`render failed: ${errors.join(' | ') || e.message}`);
  }
  const pageError = await tab.evaluate(() => window.__error);
  if (pageError) throw new Error(`render failed: ${pageError}`);
  const lost = await tab.evaluate(() => { const c = document.querySelector('canvas'); const gl = c && (c.getContext('webgl2') || c.getContext('webgl')); return !gl || gl.isContextLost(); });
  if (lost) throw new Error('render failed: WebGL context lost (scene too heavy for this GPU; try dpr 1)');
  const file = path.join(OUT, `${page}-${shot}${extra ? '-' + extra.replace(/[^a-z0-9]+/gi, '_') : ''}.jpg`);
  await (await tab.$('canvas')).screenshot({ path: file, type: 'jpeg', quality: 90 });
  const report = await tab.evaluate(() => ({ stats: window.__stats, anchors: window.__anchors }));
  fs.writeFileSync(file.replace(/\.jpg$/, '.json'), JSON.stringify(report, null, 1));
  console.log(file);
  if (errors.length) console.log('page errors:\n' + errors.map((e) => e.slice(0, 1500)).join('\n'));
  if (report.stats) console.log(JSON.stringify(report.stats));
} finally {
  await browser.close();
}
