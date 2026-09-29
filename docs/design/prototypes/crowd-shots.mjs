// Frames of the crowd harness (docs/design/prototypes/crowd.html): opens each demo once per tier in headless Chromium on
// the software GPU, renders the demo's key moments with window.__frame(t) and screenshots each; the draw calls and
// triangles of every frame (shadow pass included) go to counts.json beside the images.
//   node docs/design/prototypes/crowd-shots.mjs <base url> <out dir> [demos=charge,volley,clash,rout,cheer] [tiers=high,low] [W H]
//   e.g. tools/browser-slot.sh xvfb-run -a node docs/design/prototypes/crowd-shots.mjs http://localhost:3103 test-results/polish-crowd
// A demo's own times (__plan.shots) are used unless &t= lists are given as TIMES_<demo>=1,2.5,… in the environment.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer');
const [, , base = 'http://localhost:3000', out = 'test-results/polish-crowd', demos = 'charge,volley,clash,rout,cheer', tiers = 'high,low', W = '1280', H = '720'] = process.argv;
fs.mkdirSync(out, { recursive: true });
const counts = fs.existsSync(path.join(out, 'counts.json')) ? JSON.parse(fs.readFileSync(path.join(out, 'counts.json'), 'utf8')) : {};
const b = await puppeteer.launch({ headless: false, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', protocolTimeout: 1800000,
  args: ['--no-sandbox', '--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader-webgl', '--window-size=1400,1000'] });
try {
  for (const demo of demos.split(',')) for (const tier of tiers.split(',')) {
    const p = await b.newPage(), logs = [];
    p.on('console', (m) => logs.push(m.type() + ': ' + m.text())); p.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
    await p.setViewport({ width: +W, height: +H, deviceScaleFactor: 1 });
    const t0 = Date.now();
    await p.goto(`${base}/docs/design/prototypes/crowd.html?demo=${demo}&tier=${tier}&t=0&w=${W}&h=${H}&dpr=1`, { waitUntil: 'load', timeout: 600000 });
    await p.waitForFunction(() => window.__done || window.__error, { timeout: 1500000, polling: 500 });
    const err = await p.evaluate(() => window.__error);
    if (err) { console.log(demo, tier, 'ERROR', err, logs.join('\n')); await p.close(); continue; }
    const plan = await p.evaluate(() => window.__plan), env = process.env['TIMES_' + demo], times = env ? env.split(',').map(Number) : plan.shots;
    console.log(demo, tier, 'built in', (Date.now() - t0) / 1000, 's; frames at', times.join(', '));
    for (const t of times) {
      const c = await p.evaluate((t) => window.__frame(t), t);
      const file = `${demo}-${tier}-${String(t.toFixed(2)).replace('.', '_')}.png`;
      await p.screenshot({ path: path.join(out, file) });
      counts[file] = c; console.log('  ', file, c.calls, 'calls', (c.triangles / 1e6).toFixed(2), 'M triangles');
    }
    const errs = logs.filter((l) => /error|warn/i.test(l) && !/GroupMarker|GPU stall|swiftshader|Automatic fallback/i.test(l));
    if (errs.length) console.log(errs.slice(-6).join('\n'));
    await p.close();
  }
} finally { await b.close(); fs.writeFileSync(path.join(out, 'counts.json'), JSON.stringify(counts, null, 1)); }
