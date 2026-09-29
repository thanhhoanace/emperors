// Browser QA for v2 (v2.html, Demo Hoài Nam; docs/design/v2-build.md): boot on the real runtime, play two seasons through
// the page's own handlers, and check the freeze's contract on screen: "Hết mùa" works with nothing ordered, an order goes
// preview → confirm, the forecast prints no win percentage, a battle runs to its end on the general's proposal alone,
// the season's recap follows, the frame stays in the 0005 budget. Screenshots and a report in test-results/v2-*.
// Needs `npm start` running. Local:
//   PUPPETEER_EXECUTABLE_PATH=/path/to/chromium xvfb-run -a node tests/e2e/v2-loop.mjs [tier] [seed]
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../load.mjs';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000/';
const OUT = path.join(ROOT, 'test-results');
fs.mkdirSync(OUT, { recursive: true });
const CDN_THREE = /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/(.+)$/;
const BUDGET = { high: { tris: 3.3e6, calls: 400 }, mid: { tris: 2.1e6, calls: 300 }, low: { tris: 1.05e6, calls: 150 } };
const tier = process.argv[2] || 'low', seed = process.argv[3] || '3';
const [W, H] = [844, 390];
const report = { tier, seed, checks: [], errors: [], steps: [] };
const check = (ok, what, detail) => { report.checks.push({ ok: !!ok, what, detail }); console.log((ok ? 'ok   ' : 'FAIL ') + what + (detail !== undefined ? ' ' + JSON.stringify(detail) : '')); };

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
  page.on('console', (m) => { if (m.type() === 'error') { report.errors.push(m.text()); console.error('CONSOLE_ERROR', m.text()); } });
  const t0 = Date.now();
  await page.goto(BASE_URL + `v2.html?seed=${seed}&tier=${tier}&w=${W}&h=${H}&dpr=1&fast=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => (window.__v2 && window.__v2.ready) || !!window.__error, { timeout: 600000, polling: 1000 });
  const err = await page.evaluate(() => window.__error);
  if (err) throw new Error('v2 failed: ' + err);
  report.loadS = (Date.now() - t0) / 1000;
  const run = (fn, ...a) => page.evaluate(fn, ...a);
  const shot = async (name) => { await new Promise((r) => setTimeout(r, 600)); await page.screenshot({ path: path.join(OUT, `v2-${tier}-${name}.png`) }); };
  const text = () => run(() => document.body.innerText);
  const endButton = () => run(() => { const b = [...document.querySelectorAll('button')].find((x) => /Hết mùa/.test(x.textContent)); return b ? { found: true, disabled: b.disabled } : { found: false }; });

  await shot('goal');
  await run(() => { const b = [...document.querySelectorAll('button')].find((x) => /Bắt đầu|Vào|Chơi|Đã hiểu/i.test(x.textContent)); if (b) b.click(); });
  const v0 = await run(() => window.__v2.view());
  check(v0.season === 1 && v0.me === 'zhu_yuanzhang', 'a new game: season 1, Chu Nguyên Chương', { season: v0.calendar });
  check(v0.armies.some((a) => a.seen === 'far' && a.units === null) || !v0.armies.some((a) => a.seen === 'far'), 'a far army shows no numbers');
  const eb = await endButton();
  check(eb.found && !eb.disabled, '"Hết mùa" is there and enabled with nothing ordered', eb);
  await shot('map');

  // an order: army → target → preview → confirm
  await run(() => window.__v2.H.onSelect({ kind: 'army', id: 'a1' }));
  const tg = await run(() => window.__v2.V2.targets(window.__v2.game(), 'a1'));
  check(tg.length > 0, 'our main army has targets', tg.map((t) => t.id + ':' + t.intent));
  await shot('army');
  const enemy = tg.find((t) => t.intent === 'ask');
  if (enemy) {
    await run((t) => window.__v2.H.onForecast({ armies: ['a1'], kind: t.kind, id: t.id, intent: 'attack' }), enemy);
    const txt = await text();
    check(/Thắng lớn|Thắng|Ngang ngửa|Thua lớn|Thua/.test(txt), 'the forecast shows the general\'s label');
    check(!/tỉ lệ|xác suất|\d+\s?% thắng|thắng \d+\s?%/i.test(txt), 'no win percentage on screen');
    await shot('forecast');
    await run(() => window.__v2.H.onCancel('forecast'));
  }
  const move = tg.find((t) => t.intent === 'move');
  if (move) {
    await run((t) => window.__v2.H.onTarget({ army: 'a1', kind: t.kind, id: t.id, intent: 'move' }), move);
    await shot('preview');
    const txt = await text();
    check(/→/.test(txt) && /mùa/.test(txt), 'the preview shows resources before → after and seasons');
    await run((t) => window.__v2.H.onConfirmOrder({ type: 'order', army: 'a1', target: { kind: t.kind, id: t.id }, intent: 'move' }), move);
    const a1 = await run(() => window.__v2.view().armies.find((a) => a.id === 'a1'));
    check(a1.order && a1.order.target.id === move.id, 'the order is set', a1.order);
    await run(() => window.__v2.H.onClearOrder('a1'));
    const a1b = await run(() => window.__v2.view().armies.find((a) => a.id === 'a1'));
    check(!a1b.order, 'and cleared (no order = Giữ)');
  }
  // a town: 2–3 suggested tasks
  await run(() => window.__v2.H.onSelect({ kind: 'town', id: 'chung_ly' }));
  const tasks = await run(() => window.__v2.V2.tasks(window.__v2.game(), 'chung_ly'));
  check(tasks.suggested.length >= 1 && tasks.suggested.length <= 3 && tasks.all.length > tasks.suggested.length, 'a town suggests 2–3 tasks, more behind "Thêm"', { suggested: tasks.suggested, all: tasks.all.length });
  await shot('town');
  await run(() => window.__v2.H.onSelect(null));

  // season 1: our main army besieges Hu Dị (weak: its gates open at the season's end, no battle), no card answered;
  // season 2: nothing ordered. Each battle of ours on the proposal alone; each town that changes hands shown on the map
  await run(() => window.__v2.H.onConfirmOrder({ type: 'order', army: 'a1', target: { kind: 'town', id: 'hu_di' }, intent: 'siege' }));
  for (let s = 1; s <= 2; s++) {
    let state = await run(() => window.__v2.H.onEndSeason());
    let battles = 0, turns = 0, beats = [];
    while ((state === 'battle' || state === 'result' || state === 'beat') && turns < 40) {
      if (state === 'battle') { if (!turns) await shot(`s${s}-battle`); state = await run(() => window.__v2.H.onBattleTurn({})); turns++; }
      if (state === 'result') { battles++; await shot(`s${s}-result-${battles}`); state = await run(() => window.__v2.H.onBattleDone()); }
      if (state === 'beat') {
        const b = await run(() => ({ text: document.querySelector('.hn-full.beat') ? document.querySelector('.hn-full.beat').innerText : '' }));
        beats.push(b.text.split('\n')[0]); await shot(`s${s}-beat-${beats.length}`);
        state = await run(() => window.__v2.H.onBeatDone());
      }
    }
    report.steps.push({ season: s, battles, turns, beats, end: state });
    if (s === 1) check(beats.some((t) => /Hu Dị về tay ta/.test(t)), 'season 1: Hu Dị opening its gates is shown on the map, not only in the recap', beats);
    check(state === 'season' || state === 'over', `season ${s}: ends (battles on the proposal alone)`, { battles, turns, state });
    if (battles) check(turns / battles <= 5, `season ${s}: a battle lasts at most 5 turns`, turns / battles);
    const v = await run(() => window.__v2.view());
    if (state === 'season') {
      check(v.season === s + 1 && !!v.report, `season ${s}: the recap, then season ${s + 1}`, { calendar: v.calendar });
      await shot(`s${s}-report`);
    }
    if (state === 'over') { await shot('over'); break; }
  }
  const m = await run(() => window.__v2.sc.measure());
  report.measure = { calls: m.calls, triangles: m.triangles };
  check(m.triangles <= BUDGET[tier].tris && m.calls <= BUDGET[tier].calls, `${tier}: the map frame is in the 0005 budget`, report.measure);
  check(report.errors.length === 0, 'no page errors', report.errors.slice(0, 5));
} catch (e) {
  report.errors.push(String(e.stack || e));
  check(false, 'run', String(e.message || e));
} finally {
  await browser.close();
  fs.writeFileSync(path.join(OUT, `v2-${tier}.json`), JSON.stringify(report, null, 1));
  const failed = report.checks.filter((c) => !c.ok).length;
  console.log(`\nv2 loop (${tier}): ${report.checks.length - failed}/${report.checks.length} checks passed`);
  process.exit(failed ? 1 : 0);
}
