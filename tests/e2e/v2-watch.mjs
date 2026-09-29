// Browser QA for v2's watch mode (src/world/huainan-show.js; docs/design/v2-polish.md, job 10): with &watch=1 the game plays
// itself through the page's own handlers (the generals' advice, the cards, the battles turn by turn, each town that changes
// hands, the recap); it must play at least 4 seasons unattended with no page error and no stuck step, then stop when asked.
// A game that ends first is played again ("Chơi lại") and the count goes on. A screenshot each season, the intro's first
// frames and a report in test-results/polish-show/. Slow on SwiftShader (the pauses are real, and the intro plays on a fresh
// profile): minutes. With "fast" (&fast=1) the pauses are only yields and the camera stays put. Needs `npm start` running:
//   BASE_URL=http://127.0.0.1:3000/ xvfb-run -a node tests/e2e/v2-watch.mjs [tier] [seed] [fast]
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../load.mjs';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000/';
const OUT = path.join(ROOT, 'test-results', 'polish-show');
fs.mkdirSync(OUT, { recursive: true });
const CDN_THREE = /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/(.+)$/;
const tier = process.argv[2] || 'low', seed = process.argv[3] || '3', fast = process.argv[4] === 'fast';
const SEASONS = 4, [W, H] = [844, 390];
const LIMIT = (fast ? 6 : 30) * 60000, QUIET = (fast ? 90 : 300) * 1000; // the whole run; the longest time with nothing moving
const tag = 'watch-' + tier + (fast ? '-fast' : '');
const report = { tier, seed, fast, checks: [], errors: [], seasons: [], games: 1 };
const check = (ok, what, detail) => { report.checks.push({ ok: !!ok, what, detail }); console.log((ok ? 'ok   ' : 'FAIL ') + what + (detail !== undefined ? ' ' + JSON.stringify(detail) : '')); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  headless: false, protocolTimeout: 900000,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader-webgl', `--window-size=${W},${H}`],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const m = req.url().match(CDN_THREE), file = m && path.join(ROOT, 'node_modules/three', m[1]);
    if (file && fs.existsSync(file)) return req.respond({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(file) });
    if (/fonts\.(googleapis|gstatic)\.com/.test(req.url())) return req.respond({ status: 200, contentType: 'text/css', body: '' }); // no font CDN here
    req.continue();
  });
  page.on('pageerror', (e) => { report.errors.push(e.message); console.error('PAGE_ERROR', e.stack || e.message); });
  page.on('console', (m) => { if (m.type() === 'error') { report.errors.push(m.text()); console.error('CONSOLE_ERROR', m.text()); } else if (/v2 show/.test(m.text())) console.log('CONSOLE', m.text()); });
  const t0 = Date.now(), secs = () => Math.round((Date.now() - t0) / 1000);
  const shot = (name) => page.screenshot({ path: path.join(OUT, `${tag}-${name}.png`) });
  const run = (fn, ...a) => page.evaluate(fn, ...a);
  await page.goto(BASE_URL + `v2.html?seed=${seed}&tier=${tier}&w=${W}&h=${H}&dpr=1&watch=1` + (fast ? '&fast=1' : '&pace=0.6'), { waitUntil: 'domcontentloaded', timeout: 60000 });

  // the loading screen, then (a fresh profile: the first visit) the intro, then the page is ready and the watch mode starts
  let introShots = 0;
  for (;;) {
    const s = await run(() => ({ ready: !!(window.__v2 && window.__v2.ready), err: window.__error || null, stage: !!document.querySelector('.hs-stage'), loading: !!document.getElementById('loading') }));
    if (s.err) throw new Error('v2 failed: ' + s.err);
    if (s.stage && introShots < 3) { await shot('intro-' + introShots++); await sleep(2500); continue; }
    if (s.ready) break;
    if (Date.now() - t0 > 600000) throw new Error('v2 did not load in 10 min');
    await sleep(1000);
  }
  report.loadS = secs();
  const st0 = await run(() => window.HuaiNanShow.state());
  report.load = st0.load;
  check(!!st0.load.runtime && !!st0.load.scene, 'the loading screen saw the boot\'s steps', st0.load);
  check(fast ? st0.intro === 'fast' : st0.intro === 'played' || st0.intro === 'skipped', fast ? 'no intro with &fast=1' : 'the intro played on a first visit', st0.intro);
  check(!(await run(() => !!document.getElementById('loading'))), 'the loading screen is gone once the page is ready');

  await page.waitForFunction(() => window.HuaiNanShow.state().watching, { timeout: 60000, polling: 500 });
  check(true, '&watch=1: the watch mode starts by itself');

  // play: a screenshot each new season; a game that ends is shown to its end screen, then played again
  const look = () => run(() => { const v = window.__v2.view(), s = window.HuaiNanShow.state(); return { season: v.season, calendar: v.calendar, over: v.over, s }; });
  let a = await look(), played = 0, lastKey = '', lastMove = Date.now(), overs = 0;
  await shot('s' + a.season);
  while (played < SEASONS) {
    if (Date.now() - t0 > LIMIT) { check(false, 'played ' + SEASONS + ' seasons within ' + LIMIT / 60000 + ' min', { played }); break; }
    await sleep(fast ? 400 : 2000);
    const b = await look(), key = [b.season, b.s.phase, b.s.steps, b.s.watching].join('|');
    if (key !== lastKey) { lastKey = key; lastMove = Date.now(); }
    if (Date.now() - lastMove > QUIET) { check(false, 'no stuck step: something moves at least every ' + QUIET / 1000 + ' s', b); break; }
    if (b.s.stuck) { check(false, 'the watch mode never finds itself stuck', b.s); break; }
    if (b.season > a.season && !b.over) {
      played += b.season - a.season; report.seasons.push({ from: a.calendar, to: b.calendar, steps: b.s.steps, t: secs() });
      console.log(`${played} season(s): ${a.calendar} → ${b.calendar} (${secs()} s)`);
      await shot('s' + b.season);
    }
    if (b.over && !a.over) {
      overs++; played++; report.seasons.push({ calendar: b.calendar, over: b.over, t: secs() });
      console.log(`game over: ${JSON.stringify(b.over)} (${secs()} s)`);
      await page.waitForFunction(() => !window.HuaiNanShow.state().watching, { timeout: 120000, polling: 500 });
      await shot('over-' + overs);
      check(true, 'the game ends: the ending plays, the end screen stays, the watch mode stops', b.over);
      if (played < SEASONS) { await run(() => { window.__v2.H.onAgain(); window.__v2.H.onWatch(true); }); report.games++; }
      a = await look(); continue;
    }
    if (!b.s.watching && !b.over) { check(false, 'the watch mode keeps playing until asked to stop', b.s); break; }
    a = b;
  }
  check(played >= SEASONS, `${SEASONS} seasons played unattended`, { played, games: report.games });

  // stop: the watch mode lets go, and nothing more happens by itself
  const s1 = await run(() => { window.__v2.H.onWatch(false); return window.HuaiNanShow.state(); });
  await sleep(fast ? 1500 : 6000);
  const s2 = await run(() => window.HuaiNanShow.state());
  check(!s2.watching, 'onWatch(false) stops the watch mode', s2);
  const s3 = await (async () => { await sleep(fast ? 1500 : 6000); return run(() => window.HuaiNanShow.state()); })();
  check(s3.steps === s2.steps, 'and it plays no further step', { before: s1.steps, after: s3.steps });
  await shot('stopped');
  const ch = await run(() => window.HuaiNanShow.chronicle());
  report.chronicle = ch;
  check(ch.length >= 2, 'the chronicle collected the game from the events', ch.slice(-4));
  check(report.errors.length === 0, 'no page errors', report.errors.slice(0, 5));
} catch (e) {
  report.errors.push(String(e.stack || e));
  check(false, 'run', String(e.message || e));
} finally {
  await browser.close();
  fs.writeFileSync(path.join(OUT, `${tag}.json`), JSON.stringify(report, null, 1));
  const failed = report.checks.filter((c) => !c.ok).length;
  console.log(`\nv2 watch (${tier}${fast ? ', fast' : ''}): ${report.checks.length - failed}/${report.checks.length} checks passed`);
  process.exit(failed ? 1 : 0);
}
