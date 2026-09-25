// Browser QA for the runtime vertical slice (game.html): RuntimeEvent v1 → EventPresenter → WorldRuntime.
// Needs `npm start` running. Screenshots and a JSON report go to test-results/runtime-*.
// Local: PUPPETEER_EXECUTABLE_PATH=/path/to/chromium xvfb-run -a node tests/e2e/runtime-slice.mjs
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../load.mjs';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000/';
const OUT = path.join(ROOT, 'test-results');
fs.mkdirSync(OUT, { recursive: true });
const CDN_THREE = /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/(.+)$/;
// decisions/0005: ≤ 1.5 M triangles for whole-country views, ≤ 3 M up close, ≤ 150 MB of GPU buffers (caches included)
const BUDGET = { far: 1.5e6, near: 3e6, city: 3e6, bufferMB: 150 };
const browser = await puppeteer.launch({
  headless: false, protocolTimeout: 900000,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader-webgl', '--window-size=1500,1000'],
});
const report = { shots: {}, checks: [], errors: [] };
const check = (ok, what, detail) => { report.checks.push({ ok: !!ok, what, detail }); console.log((ok ? 'ok   ' : 'FAIL ') + what + (detail !== undefined ? ' ' + JSON.stringify(detail) : '')); };
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const m = req.url().match(CDN_THREE);
    const file = m && path.join(ROOT, 'node_modules/three', m[1]);
    if (file && fs.existsSync(file)) return req.respond({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(file) });
    req.continue();
  });
  page.on('pageerror', (e) => { report.errors.push(e.message); console.error('PAGE_ERROR', e.message); });
  page.on('console', (m) => { if (m.type() === 'error') { report.errors.push(m.text()); console.error('CONSOLE_ERROR', m.text()); } });

  const t0 = Date.now();
  await page.goto(BASE_URL + 'game.html?qa=1&w=1440&h=900&dpr=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => (window.__game && window.__game.ready) || !!window.__error, { timeout: 600000, polling: 1000 });
  const err = await page.evaluate(() => window.__error);
  if (err) throw new Error('game failed: ' + err);
  report.loadS = Math.round((Date.now() - t0) / 100) / 10;
  check(true, 'map loaded', { seconds: report.loadS });

  const shot = async (name, fn, arg) => {
    const out = await page.evaluate(fn, arg);
    const st = await page.evaluate(() => window.__game.measure());
    const mode = await page.evaluate(() => window.__game.rt.view().mode);
    await page.screenshot({ path: path.join(OUT, `runtime-${name}.png`) });
    report.shots[name] = { mode, calls: st.calls, triangles: st.triangles, frameMs: st.frameMs, bufferMB: st.bufferMB, out };
    console.log(`shot ${name}: ${mode} ${st.calls} calls, ${(st.triangles / 1e6).toFixed(2)} M tris, ${st.frameMs} ms`);
    check(st.triangles <= BUDGET[mode], `budget ${name} (${mode})`, st.triangles);
    check(st.bufferMB <= BUDGET.bufferMB, `GPU buffers ${name}`, st.bufferMB);
    return out;
  };
  const owners0 = await page.evaluate(() => window.__game.rt.owners());

  // views
  await shot('campaign', () => window.__game.campaign());
  const vp = await shot('province-jing', () => { window.__game.rt.focusProvince('jing'); window.__game.rt.render(); return window.__game.rt.view().name; });
  check(vp === 'province:jing', 'focusProvince(jing)', vp);
  const vc = await shot('city-jing', () => { window.__game.rt.focusCity('jing'); window.__game.rt.render(); return window.__game.rt.view().name; });
  check(vc === 'city:jing', 'focusCity(jing)', vc);
  const vc2 = await shot('city-guan', () => { window.__game.rt.focusCity('guan'); window.__game.rt.render(); return window.__game.rt.view().name; });
  check(vc2 === 'city:guan', 'focusCity(guan)', vc2);

  // events
  const evs = await page.evaluate(() => window.__game.events.map((e, i) => ({ i, kind: e.kind, id: e.id, from: e.from, to: e.to, win: e.win, fid: e.fid, actorChar: e.actorChar, defenderFid: e.defenderFid, defenderChar: e.defenderChar, actors: e.actors, meta: window.__game.plans[i].meta, duration: window.__game.plans[i].duration })));
  const seek = (i, t) => page.evaluate((i, t) => window.__game.seek(i, t), i, t);
  for (const ev of evs) {
    const tag = ev.kind === 'gate' ? ev.id : `attack-${ev.from}-${ev.to}`;
    if (ev.kind === 'gate') {
      const m = ev.meta;
      const f1 = await shot(`${tag}-a`, (a) => window.__game.seek(a[0], a[1]), [ev.i, m.shot + 0.6]);
      check(f1.hud.some((h) => h.type === 'event'), `${tag}: event card`, f1.hud.find((h) => h.type === 'event')?.title);
      const actorsShown = f1.marks.filter((k) => k.id.startsWith('actor:')).map((k) => k.id.slice(6));
      check(ev.actors.every((a) => actorsShown.includes(a)), `${tag}: every actor at his seat`, actorsShown);
      if (m.views.length > 1) await shot(`${tag}-b`, (a) => window.__game.seek(a[0], a[1]), [ev.i, m.back - 0.4]);
      check(m.views.length >= 1, `${tag}: shot cameras`, m.views);
    } else if (ev.kind === 'attack') {
      const m = ev.meta;
      const seats = await page.evaluate((a, b) => [window.__game.rt.seatOf(a), window.__game.rt.seatOf(b)], ev.from, ev.to);
      const d2 = (p, q) => Math.hypot(p[0] - q[0], p[2] - q[2]);
      const pathEnd = m.path[m.path.length - 1], pathStart = m.path[0];
      check(d2(pathStart, seats[0]) < 3 && d2(pathEnd, seats[1]) < 3, `${tag}: road runs from ${ev.from} to ${ev.to}`, [d2(pathStart, seats[0]).toFixed(2), d2(pathEnd, seats[1]).toFixed(2)]);
      const fo = await shot(`${tag}-1-origin`, (a) => window.__game.seek(a[0], a[1]), [ev.i, 3.4]);
      const army0 = fo.marks.find((k) => k.id === 'attacker');
      check(army0 && army0.fid === ev.fid && d2(army0.p, seats[0]) < d2(army0.p, seats[1]), `${tag}: attacker ${ev.actorChar} at the origin`, army0 && army0.p.map((x) => +x.toFixed(1)));
      check(fo.hud.find((h) => h.type === 'event'), `${tag}: event card`);
      await shot(`${tag}-2-march`, (a) => window.__game.seek(a[0], a[1]), [ev.i, (3.4 + m.arrive) / 2 + 1]);
      const fa = await shot(`${tag}-3-arrive`, (a) => window.__game.seek(a[0], a[1]), [ev.i, m.arrive + 1.8]);
      const army1 = fa.marks.find((k) => k.id === 'attacker'), def = fa.marks.find((k) => k.id === 'defender');
      const total = d2(seats[0], seats[1]);
      check(army1 && d2(army1.p, seats[1]) < total * 0.3, `${tag}: march reaches ${ev.to}`, army1 && { toTarget: +d2(army1.p, seats[1]).toFixed(1), total: +total.toFixed(1) });
      check(def && def.fid === ev.defenderFid, `${tag}: defender ${ev.defenderChar} (${ev.defenderFid}) at the walls`, def && def.fid);
      const fr = await shot(`${tag}-4-result`, (a) => window.__game.seek(a[0], a[1]), [ev.i, m.result + 1.6]);
      const badge = fr.hud.find((h) => h.type === 'badge');
      check(badge && badge.win === ev.win, `${tag}: result from RuntimeEvent.win (${ev.win})`, badge && badge.text);
      const std = fr.marks.find((k) => k.id === 'standard');
      check(ev.win ? !!std : !std, `${tag}: ${ev.win ? 'standard planted' : 'no standard, army falls back'}`);
    }
    const fe = await page.evaluate((i) => window.__game.seek(i, 'end'), ev.i);
    check(fe.view === 'campaign', `${tag}: back to the campaign view`, fe.view);
  }
  // an attack on a neutral garrison (defenderFid "neutral", as the engine emits for you / jiao / nanzhong): grey standard, no faction
  const neutral = await page.evaluate(() => {
    const G = window.__game, ev = { v: 1, kind: 'attack', fid: 'sun_quan', from: 'yang', to: 'jiao', win: true, actorChar: 'sun_quan', defenderFid: 'neutral', defenderChar: 'shi_xie', other: 'neutral', tone: 'good', text: 'QA' };
    const pl = G.presenter.plan(ev), f = G.presenter.show(pl, pl.meta.arrive + 1.8); G.rt.render(); G.presenter.end();
    return f.marks.find((m) => m.id === 'defender') || null;
  });
  check(neutral && neutral.fid === null, 'attack on a neutral garrison shows its defender', neutral);
  await shot('campaign-end', () => window.__game.campaign());

  // presentation changed nothing
  const same = await page.evaluate((o) => JSON.stringify(window.__game.rt.owners()) === JSON.stringify(o) && JSON.stringify(window.__game.events) === window.__game.frozen, owners0);
  check(same, 'owners and events unchanged by the presentation');
  // the renderer never reads the raw engine field
  const src = fs.readFileSync(path.join(ROOT, 'src/world/event-presenter.js'), 'utf8');
  check(!/ev\.defender\b(?!Fid|Char)/.test(src), 'presenter never reads raw `defender`');
  const lost = await page.evaluate(() => { const c = document.querySelector('canvas'); const gl = c.getContext('webgl2') || c.getContext('webgl'); return gl.isContextLost(); });
  check(!lost, 'WebGL context alive');
  check(report.errors.length === 0, 'no console errors', report.errors.slice(0, 3));

  // real time: one engine turn from the server (POST /api/turn), autoplayed at 8× (a slow software-GL frame advances at most 0.25 s × speed); owners then follow the returned state
  const nErr = report.errors.length;
  await page.goto(BASE_URL + 'game.html?live=1&speed=8&w=1440&h=900&dpr=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => (window.__game && window.__game.ready) || !!window.__error, { timeout: 600000, polling: 1000 });
  const kinds = await page.evaluate(() => window.__game.events.map((e) => e.v + ':' + e.kind));
  check(kinds.length > 0 && kinds.every((k) => k.startsWith('1:')), 'live: RuntimeEvent v1 from /api/turn', kinds);
  await new Promise((r) => setTimeout(r, 4000));
  await page.screenshot({ path: path.join(OUT, 'runtime-live-playing.png') });
  await page.waitForFunction(() => window.__game.done || !!window.__error, { timeout: 900000, polling: 1000 });
  const live = await page.evaluate(() => {
    const st = window.__liveState, want = {};
    for (const [pid, p] of Object.entries(st.provinces)) if (p.owner !== 'neutral') want[pid] = p.owner;
    return { view: window.__game.rt.view().name, owners: JSON.stringify(window.__game.rt.owners()) === JSON.stringify(want), same: JSON.stringify(window.__game.events) === window.__game.frozen, error: window.__error || null };
  });
  await page.screenshot({ path: path.join(OUT, 'runtime-live-end.png') });
  check(!live.error && live.view === 'campaign', 'live: playback ends on the campaign view', live.view);
  check(live.owners, 'live: owners are the engine state after the turn');
  check(live.same, 'live: events unchanged by the presentation');
  check(report.errors.length === nErr, 'live: no console errors', report.errors.slice(nErr, nErr + 3));
} catch (e) {
  report.checks.push({ ok: false, what: 'run', detail: String(e.stack || e) });
  console.error(e);
} finally {
  fs.writeFileSync(path.join(OUT, 'runtime-slice.json'), JSON.stringify(report, null, 1));
  await browser.close();
}
const failed = report.checks.filter((c) => !c.ok);
console.log(`runtime slice: ${report.checks.length - failed.length}/${report.checks.length} checks passed`);
if (failed.length) process.exit(1);
