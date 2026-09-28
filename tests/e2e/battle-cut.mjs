// Browser QA for the battle cut (src/world/battle-cut.js, decisions/0004): the attack events of the demo fixtures,
// played in game.html with the cut on, at each quality tier. For every tier: the cut builds, a frame inside the cut
// window draws the siege (not the map), stays in the 0005 budget for that tier, carries the event's result, and the
// frame after the window is the map again; one screenshot per tier and shot in test-results/battle-cut-*.png.
// Needs `npm start` running. Local:
//   PUPPETEER_EXECUTABLE_PATH=/path/to/chromium xvfb-run -a node tests/e2e/battle-cut.mjs [high,mid,low]
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../load.mjs';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000/';
const OUT = path.join(ROOT, 'test-results');
fs.mkdirSync(OUT, { recursive: true });
const CDN_THREE = /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/(.+)$/;
// decisions/0005 and docs/design/visual-build.md: triangles per frame (shadow pass included) and draw calls per tier.
// Measured 28/9 on the software GPU: high 2.9–3.3 M, mid 1.76–2.06 M, low 0.93–0.98 M (the big capitals are the
// heaviest). High is for discrete GPUs and may run 10 % over the integrated-GPU ceiling; mid and low get 5 %.
const BUDGET = { high: { tris: 3.3e6, calls: 400 }, mid: { tris: 2.1e6, calls: 300 }, low: { tris: 1.05e6, calls: 150 } };
const tiers = (process.argv[2] || 'high,mid,low').split(',');
const report = { tiers: {}, checks: [], errors: [] };
const check = (ok, what, detail) => { report.checks.push({ ok: !!ok, what, detail }); console.log((ok ? 'ok   ' : 'FAIL ') + what + (detail !== undefined ? ' ' + JSON.stringify(detail) : '')); };

const browser = await puppeteer.launch({
  headless: false, protocolTimeout: 900000,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader-webgl', '--window-size=1500,1000'],
});
try {
  for (const tier of tiers) {
    const page = await browser.newPage(); // one page per tier: the software GPU keeps its memory per page
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const m = req.url().match(CDN_THREE), file = m && path.join(ROOT, 'node_modules/three', m[1]);
      if (file && fs.existsSync(file)) return req.respond({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(file) });
      req.continue();
    });
    page.on('pageerror', (e) => { report.errors.push(tier + ': ' + e.message); console.error('PAGE_ERROR', e.message); });
    page.on('console', (m) => { if (m.type() === 'error') { report.errors.push(tier + ': ' + m.text()); console.error('CONSOLE_ERROR', m.text()); } });
    await page.goto(BASE_URL + `game.html?demo=1&qa=1&cut=1&tier=${tier}&w=1280&h=720&dpr=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => (window.__game && window.__game.ready) || !!window.__error, { timeout: 600000, polling: 1000 });
    const err = await page.evaluate(() => window.__error);
    if (err) throw new Error(tier + ': game failed: ' + err);
    check(await page.evaluate(() => !!window.__game.cut), `${tier}: the cut is on`);
    const attacks = await page.evaluate(() => window.__game.plans.map((p, i) => ({ i, cut: p.cut && { t0: p.cut.t0, t1: p.cut.t1, info: p.cut.info }, duration: p.duration })).filter((p) => p.cut));
    check(attacks.length > 0, `${tier}: attack plans carry a cut window`, attacks.length);
    const T = (report.tiers[tier] = {});
    for (const a of attacks) {
      const tag = `${a.cut.info.from}-${a.cut.info.to}`;
      const t0 = Date.now();
      await page.evaluate((info) => window.__game.cut.prepare(info), a.cut.info);
      const buildS = (Date.now() - t0) / 1000;
      for (const [name, u] of [['approach', 0.15], ['gate', 0.5], ['result', 0.9]]) {
        const f = await page.evaluate((i, t) => { const r = window.__game.seek(i, t); return { r, active: window.__game.cut.active, stats: window.__game.cut.stats(), q: window.__game.rt.quality && window.__game.rt.quality.tier }; }, a.i, a.cut.t0 + (a.cut.t1 - a.cut.t0) * u);
        const st = await page.evaluate(() => window.__game.measure());
        const lost = await page.evaluate(() => { const gl = window.__game.rt.renderer.getContext(); return gl.isContextLost(); });
        await page.screenshot({ path: path.join(OUT, `battle-cut-${tier}-${tag}-${name}.png`) });
        T[`${tag}-${name}`] = { calls: st.calls, triangles: st.triangles, buildS, soldiers: f.stats && f.stats.soldiers };
        console.log(`${tier} ${tag} ${name}: ${st.calls} calls, ${(st.triangles / 1e6).toFixed(2)} M tris, build ${buildS.toFixed(1)} s, ${f.stats && f.stats.soldiers} figures`);
        check(f.active && !lost, `${tier} ${tag} ${name}: the siege is on screen`, { active: f.active, lost });
        check(f.q === tier, `${tier}: runtime tier`, f.q);
        check(st.triangles <= BUDGET[tier].tris, `${tier} ${tag} ${name}: triangles within budget`, st.triangles);
        check(st.calls <= BUDGET[tier].calls, `${tier} ${tag} ${name}: draw calls within budget`, st.calls);
        check(f.stats && f.stats.key && f.stats.key.endsWith(a.cut.info.win ? '|1' : '|0'), `${tier} ${tag}: the scene shows the event's result`, f.stats && f.stats.key);
      }
      const after = await page.evaluate((i, t) => { window.__game.seek(i, t); return window.__game.cut.active; }, a.i, a.cut.t1 + 0.3);
      check(!after, `${tier} ${tag}: after the window the map is back`);
    }
    await page.close();
  }
  check(report.errors.length === 0, 'no page errors', report.errors.slice(0, 5));
} catch (e) {
  report.errors.push(String(e.stack || e));
  check(false, 'run', String(e.message || e));
} finally {
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'battle-cut.json'), JSON.stringify(report, null, 1));
  const failed = report.checks.filter((c) => !c.ok).length;
  console.log(`\n${report.checks.length - failed}/${report.checks.length} checks passed`);
  process.exit(failed ? 1 : 0);
}
