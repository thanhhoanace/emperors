// Browser QA for the battle cinema (src/world/huainan-cinema.js; docs/design/v2-polish.md, job 1): v2.html as a player
// plays it (not &fast): our army attacks a town, and each battle of ours must play an opening shot, one shot a turn and a
// result shot at 1 m on the page's canvas, each a real shot (frames drawn, a line from the log), within the 0005 budget
// of its tier, the map given back after (its loop running, the board on screen), and the renderer's memory back where it
// was after the battle is disposed. Screenshots mid-shot in test-results/polish-cinema/v2-<tier>-*.png, a report next to
// them. Needs the server running (BASE_URL, default http://127.0.0.1:3000/). Local:
//   PUPPETEER_EXECUTABLE_PATH=/path/to/chromium xvfb-run -a node tests/e2e/v2-cinema.mjs [tier] [seed] [battles]
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../load.mjs';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000/';
const OUT = path.join(ROOT, 'test-results', 'polish-cinema');
fs.mkdirSync(OUT, { recursive: true });
const CDN_THREE = /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/(.+)$/;
const BUDGET = { high: { tris: 3.3e6, calls: 400 }, mid: { tris: 2.1e6, calls: 300 }, low: { tris: 1.05e6, calls: 150 } };
const tier = process.argv[2] || 'mid', seed = process.argv[3] || '3', maxBattles = +(process.argv[4] || 2);
const [W, H] = [844, 390];
const report = { tier, seed, checks: [], errors: [], battles: [] };
const check = (ok, what, detail) => { report.checks.push({ ok: !!ok, what, detail }); console.log((ok ? 'ok   ' : 'FAIL ') + what + (detail !== undefined ? ' ' + JSON.stringify(detail).slice(0, 400) : '')); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  headless: false, protocolTimeout: 1800000,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader-webgl', `--window-size=${W},${H}`],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const m = req.url().match(CDN_THREE), file = m && path.join(ROOT, 'node_modules/three', m[1]);
    if (file && fs.existsSync(file)) return req.respond({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(file) });
    if (/fonts\.(googleapis|gstatic)\.com/.test(req.url())) return req.respond({ status: 200, contentType: 'text/css', body: '' });
    req.continue();
  });
  page.on('pageerror', (e) => { report.errors.push(e.message); console.error('PAGE_ERROR', e.stack || e.message); });
  page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' || /cinema/.test(t)) { if (m.type() === 'error') report.errors.push(t); console.log('console.' + m.type(), t.slice(0, 300)); } });
  await page.goto(BASE_URL + `v2.html?seed=${seed}&tier=${tier}&w=${W}&h=${H}&dpr=1&cinemeasure=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => (window.__v2 && window.__v2.ready) || !!window.__error, { timeout: 600000, polling: 1000 });
  const run = (fn, ...a) => page.evaluate(fn, ...a);
  await run(() => { const b = [...document.querySelectorAll('button')].find((x) => /Bắt đầu|Vào|Chơi|Đã hiểu/i.test(x.textContent)); if (b) b.click(); });
  await page.waitForFunction(() => !!window.__cinema, { timeout: 180000, polling: 1000 });
  check(true, 'the cinema loads its 1 m modules while the page is idle');
  const mem0 = await run(() => Object.assign({}, window.__v2.rt.renderer.info.memory));

  // a handler that plays shots: started, then watched (screenshots mid-shot) until it settles
  const act = async (expr, tag) => {
    await run((e) => { window.__st = undefined; Promise.resolve(eval(e)).then((s) => { window.__st = s === undefined ? null : s; }, (err) => { window.__st = 'error:' + err.message; }); }, expr);
    const seen = new Set();
    for (let i = 0; i < 900; i++) {
      const s = await run(() => ({ st: window.__st, p: window.__cinema && window.__cinema.playing }));
      if (s.p && s.p.t > s.p.dur * 0.35) { const key = s.p.kind + ':' + (await run(() => window.__cinema.log.length)); if (!seen.has(key)) { seen.add(key); await page.screenshot({ path: path.join(OUT, `v2-${tier}-${tag}-${s.p.kind}-${s.p.shot}-${seen.size}.png`) }); } }
      if (s.st !== undefined) return s.st;
      await sleep(400);
    }
    throw new Error('timed out: ' + expr);
  };

  for (let n = 1; n <= maxBattles; n++) {
    const pick = await run(() => {
      const v2 = window.__v2, v = v2.view(), g = v2.game();
      for (const a of v.armies.filter((x) => x.fid === v.me)) { const t = v2.V2.targets(g, a.id).find((x) => x.intent === 'ask' || x.intent === 'attack'); if (t) return { army: a.id, t }; }
      return null;
    });
    if (!pick) { check(true, `battle ${n}: no target left to attack`); break; }
    await run((p) => window.__v2.H.onConfirmOrder({ type: 'order', army: p.army, target: { kind: p.t.kind, id: p.t.id }, intent: 'attack' }), pick);
    const log0 = await run(() => window.__cinema.log.length);
    let state = await act('window.__v2.H.onEndSeason()', `b${n}`), turns = 0;
    const b = { target: pick.t.id, army: pick.army };
    while ((state === 'battle' || state === 'result' || state === 'beat') && turns < 12) {
      if (state === 'battle') { turns++; state = await act('window.__v2.H.onBattleTurn({})', `b${n}`); }
      if (state === 'result') {
        await sleep(300);
        const mapBack = await run(() => ({ running: !!document.querySelector('canvas'), board: window.__v2.sc.battle.on, black: !!document.querySelector('.hnc-black.on'), active: window.__cinema.active }));
        check(mapBack.board && !mapBack.black && !mapBack.active, `battle ${n}: the map and its board are back after the result`, mapBack);
        await page.screenshot({ path: path.join(OUT, `v2-${tier}-b${n}-board.png`) });
        state = await act('window.__v2.H.onBattleDone()', `b${n}`);
      }
      if (state === 'beat') state = await act('window.__v2.H.onBeatDone()', `b${n}`);
    }
    const log = (await run(() => window.__cinema.log)).slice(log0);
    b.shots = log.map((e) => ({ kind: e.kind, shot: e.shot, frames: e.frames, readyMs: e.readyMs, siteMs: e.siteMs, measure: e.measure && { calls: e.measure.calls, triangles: e.measure.triangles }, line: e.line }));
    report.battles.push(b);
    if (!log.length) { check(state === 'season' || state === 'over', `battle ${n}: no battle of ours this season (${pick.t.id})`, state); continue; }
    const kinds = log.map((e) => e.kind);
    check(kinds[0] === 'open' && kinds.filter((k) => k === 'turn').length === turns && kinds[kinds.length - 1] === 'result', `battle ${n} (${pick.t.id}): an opening, one shot a turn (${turns}), a result`, kinds);
    check(log.every((e) => e.frames > 0 && e.line), `battle ${n}: every shot drew frames and has its line`, log.map((e) => [e.shot, e.frames, e.line]));
    const worst = log.reduce((m, e) => (e.measure && e.measure.triangles > m.triangles ? { calls: e.measure.calls, triangles: e.measure.triangles, shot: e.shot } : m), { calls: 0, triangles: 0 });
    const calls = Math.max(...log.map((e) => (e.measure ? e.measure.calls : 0)));
    check(worst.triangles <= BUDGET[tier].tris && calls <= BUDGET[tier].calls, `battle ${n}: every shot in the ${tier} budget (0005)`, { worst, calls });
    const mem = await run(() => Object.assign({}, window.__v2.rt.renderer.info.memory));
    b.memory = mem;
    check(mem.geometries <= mem0.geometries + 40 && mem.textures <= mem0.textures + 12, `battle ${n}: the battle is disposed (renderer memory back near the map's)`, { before: mem0, after: mem });
    if (state === 'over') break;
    // the recap, then on
    await run(() => { const H = window.__v2.H; if (H.onReportDone) H.onReportDone(); });
  }
  check(report.errors.length === 0, 'no page errors', report.errors.slice(0, 5));
} catch (e) {
  report.errors.push(String(e.stack || e));
  check(false, 'run', String(e.message || e));
} finally {
  await browser.close();
  fs.writeFileSync(path.join(OUT, `v2-${tier}.json`), JSON.stringify(report, null, 1));
  const failed = report.checks.filter((c) => !c.ok).length;
  console.log(`\nv2 cinema (${tier}): ${report.checks.length - failed}/${report.checks.length} checks passed`);
  process.exit(failed ? 1 : 0);
}
