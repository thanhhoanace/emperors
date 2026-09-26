// Short browser smoke for the playable UI on gameplay contract v1.1 (not part of `npm run qa`; a few minutes).
// game.html?seed=219: Lý Thế Dân plays 5 turns at speed 64. Fixtures injected before the envelope is sealed (the same
// way tests/game-controller.test.mjs does): an envoy accepted, an envoy rejected, a distant battle the player cannot
// see. Then ?demo=1 still plays RuntimeEvent truth. Screenshots + report: test-results/smoke-*.
// Local: PUPPETEER_EXECUTABLE_PATH=/path/to/chromium xvfb-run -a node tests/e2e/playable-smoke.mjs  (needs `npm start`)
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../load.mjs';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000/';
const OUT = path.join(ROOT, 'test-results');
fs.mkdirSync(OUT, { recursive: true });
const CDN_THREE = /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/(.+)$/;
const PLAYER = 'li_shimin', HIDDEN = ['Tần Thủy Hoàng', 'Chu Nguyên Chương', 'Hán Vũ Đế', 'Doanh Chính', 'Lưu Triệt'];
const browser = await puppeteer.launch({
  headless: false, protocolTimeout: 1800000,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader-webgl', '--window-size=1500,1000'],
});
const report = { checks: [], turns: [], errors: [] };
const check = (ok, what, detail) => { report.checks.push({ ok: !!ok, what, detail }); console.log((ok ? 'ok   ' : 'FAIL ') + what + (detail !== undefined ? ' ' + JSON.stringify(detail) : '')); if (!ok) process.exitCode = 1; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const m = req.url().match(CDN_THREE), file = m && path.join(ROOT, 'node_modules/three', m[1]);
    if (file && fs.existsSync(file)) return req.respond({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(file) });
    req.continue();
  });
  page.on('pageerror', (e) => report.errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') report.errors.push(m.text()); });
  const shot = (name) => page.screenshot({ path: path.join(OUT, `smoke-${name}.png`) });
  const click = async (sel) => { await page.waitForSelector(sel, { visible: true, timeout: 60000 }); await page.click(sel); };
  const text = () => page.evaluate(() => document.querySelector('.pui').innerText + '\n' + document.querySelector('.hud').innerText);

  await page.goto(BASE_URL + 'game.html?seed=219&speed=64&w=1440&h=900&dpr=1', { waitUntil: 'load', timeout: 600000 });
  await page.waitForFunction(() => window.__game && (window.__game.ready || window.__error), { timeout: 900000, polling: 1000 });
  check(!(await page.evaluate(() => window.__error)), 'game.html boots');
  await click(`.pui .start [data-fid=${PLAYER}]`);
  await page.waitForFunction(() => document.querySelector('.pui .start').classList.contains('hide'), { timeout: 600000 });
  await sleep(800); await shot('campaign');

  // --- status: guest protection from self.guestProtection, labels, no hidden truth on screen
  const s0 = await page.evaluate(() => {
    const G = window.__game, st = G.ctrl.game.state, ctx = G.Engine.projectPerception(G.ctrl.game, G.ctrl.player);
    const g = document.querySelector('.pui [data-role=guest]');
    return { guest: g && g.innerText, active: g && g.dataset.active, gp: ctx.self.guestProtection, enemy: Object.entries(st.factions).filter(([id]) => id !== G.ctrl.player).map(([, f]) => Math.round(f.troops).toLocaleString('vi-VN')),
      legal: ctx.legal.attackTargets.slice().sort(), menu: G.ctrl.options().attack.map((t) => t.pid).sort() };
  });
  check(s0.active === '1' && /CÒN 8 MÙA/.test(s0.guest) && /Tào Tháo/.test(s0.guest) && s0.gp.active, 'guest protection block from self.guestProtection', s0.guest);
  check(JSON.stringify(s0.menu) === JSON.stringify(s0.legal), 'attack menu = legal.attackTargets (protected provinces never offered)', s0.menu);
  let t0 = await text();
  check(!HIDDEN.some((n) => t0.includes(n)), 'no hidden emperor name on screen');
  check(!s0.enemy.some((n) => t0.includes(n)), 'no exact enemy troops on screen');

  // --- attack menu: province intel, frontier marked on the map
  await click('.pui .orders [data-action=attack]');
  const rows = await page.$$eval('.pui .orders .body [data-target]', (bs) => bs.map((b) => b.innerText.replace(/\s+/g, ' ')));
  const fronts = await page.$$eval('.hud .place.front', (d) => d.length);
  check(rows.length > 0 && rows.every((r) => /quân (yếu|vừa|mạnh|rất mạnh|chưa rõ) · lũy (\d|\?)/.test(r) && !/×|lực|tỉ lệ/.test(r)), 'attack rows: province band + fort, no ratio', rows);
  check(fronts === rows.length, 'every legal target is marked on the map', { fronts, rows: rows.length });
  await sleep(300); await shot('frontier');
  await click('.pui .orders .body [data-target=ji]');
  const card = await page.$eval('.pui .orders .intel', (d) => ({ text: d.innerText.replace(/\s+/g, ' '), source: d.dataset.intel }));
  check(card.source === 'adjacent' && /Tin: hiện tại/.test(card.text) && /Tướng giữ thành/.test(card.text) && /Lũy/.test(card.text), 'province card: current intel, commander, fort', card.text);
  await shot('attack-card');

  // --- page spies: one prepare per turn, the resolve of that envelope, no character names asked during play
  await page.evaluate(() => {
    const E = window.__game.Engine, N = window.WorldNames;
    window.__spy = { prepare: 0, resolve: 0, names: [] };
    const p = E.preparePlayerTurn, r = E.resolvePrepared, n = N.name;
    E.preparePlayerTurn = function () { window.__spy.prepare++; return p.apply(this, arguments); };
    E.resolvePrepared = function () { window.__spy.resolve++; return r.apply(this, arguments); };
    N.name = function (id) { window.__spy.names.push(id); return n.apply(this, arguments); };
    // fixtures replace AI decisions after the engine made them, before the envelope is sealed
    window.__fixture = null;
    const f = E.fillDecisions;
    E.fillDecisions = function (g, pf) { const out = f.apply(this, arguments), fx = window.__fixture; window.__fixture = null; return fx ? out.map((d) => fx(d, g, pf) || d) : out; };
  });
  const turn = async (label, order, fixture, react) => {
    const before = await page.evaluate(() => ({ prepare: window.__spy.prepare, resolve: window.__spy.resolve, names: window.__spy.names.length, turn: window.__game.ctrl.game.state.turn }));
    if (fixture) await page.evaluate(`window.__fixture = ${fixture}`);
    if (order.action) await click(`.pui .orders [data-action=${order.action}]`);
    for (const sel of order.clicks || []) await click(sel);
    if (order.mid) await page.evaluate(() => { window.__game.presenter.speed = 3; });
    const t = Date.now();
    await click('.pui .orders [data-role=submit]');
    const envoys = [];
    let midDone = !order.mid;
    for (;;) {
      if (!midDone && await page.evaluate(() => { const h = window.__game.ctrl.history; return window.__game.loop.playing && h.length && h[h.length - 1].played.length >= 1; })) {
        await sleep(order.mid); await shot('shot-' + label); await page.evaluate(() => { window.__game.presenter.speed = 64; }); midDone = true;
      }
      const s = await page.evaluate(() => ({ playing: window.__game.loop.playing, react: !document.querySelector('.pui .react').classList.contains('hide') }));
      if (s.react) {
        const e = await page.evaluate(() => ({ text: document.querySelector('.pui .react').innerText.replace(/\s+/g, ' '), orders: document.querySelector('.pui .orders').classList.contains('hide'), turn: window.__game.ctrl.game.state.turn }));
        e.answer = typeof react === 'function' ? react(e.text) : react || 'reject';
        envoys.push(e);
        await shot(`envoy-${label}-${envoys.length}`); await click(`.pui .react [data-react=${e.answer}]`); await sleep(200); continue;
      }
      if (!s.playing) break;
      await sleep(250);
    }
    const ms = Date.now() - t;
    const r = await page.evaluate((b) => {
      const G = window.__game, c = G.ctrl, e = c.history[c.history.length - 1], P = e.presentation;
      const stateOwners = {}; for (const [pid, p] of Object.entries(c.game.state.provinces)) if (p.owner !== 'neutral') stateOwners[pid] = p.owner;
      const log = [...document.querySelectorAll('.hud .log div')].map((d) => d.textContent);
      const said = new Set(c.history.flatMap((h) => h.presentation.items.map((it) => it.title + ': ' + it.text))); // the log keeps earlier turns too
      return {
        turn: c.game.state.turn, prepare: window.__spy.prepare - b.prepare, resolve: window.__spy.resolve - b.resolve, names: window.__spy.names.slice(b.names),
        shots: P.shots.length, played: e.played.length, skipped: e.skipped.length, visible: e.visibleEvents.length, raw: e.events.length,
        log, logSafe: log.every((t) => said.has(t) || /^Lượt \d+ · /.test(t)),
        news: [...document.querySelectorAll('.pui .news li')].map((d) => d.textContent), newsModel: P.news ? P.news.items.map((n) => n.text) : [],
        owners: JSON.stringify(G.rt.owners()) === JSON.stringify(stateOwners), view: G.rt.view().name,
        unlocked: !document.querySelector('.pui .orders').classList.contains('hide'),
        pacts: document.querySelector('.pui [data-role=pacts]').innerText, raws: c.history.flatMap((h) => h.events.map((ev) => ev.text)), rawAttacks: e.events.filter((ev) => ev.kind === 'attack').map((ev) => ev.fid + ':' + ev.from + '>' + ev.to),
        items: P.items.map((it) => ({ kind: it.kind, text: it.text, to: it.to, prov: it.prov })),
      };
    }, before);
    r.ms = ms; r.envoys = envoys; report.turns.push(Object.assign({ label }, r, { raws: undefined }));
    const T = `turn ${before.turn} (${label})`;
    check(r.turn === before.turn + 1 && r.prepare === 1 && r.resolve === 1, `${T}: preparePlayerTurn once, resolvePrepared once, turn advanced`, { prepare: r.prepare, resolve: r.resolve });
    check(r.names.length === 0, `${T}: no character name looked up during playable playback`, r.names);
    check(r.shots <= 2 && r.played + r.skipped === r.shots, `${T}: ${r.shots} observable shot(s) of ${r.raw} raw events`, { visible: r.visible });
    check(r.logSafe && !r.log.some((t) => r.raws.some((x) => x && t.includes(x))), `${T}: log lines come from the observation, never raw text`, r.log);
    check(JSON.stringify(r.news) === JSON.stringify(r.newsModel), `${T}: world news = observation.publicNews only`, r.news);
    const all = r.log.join('\n') + '\n' + r.news.join('\n') + '\n' + envoys.map((e) => e.text).join('\n');
    check(!HIDDEN.some((n) => all.includes(n)), `${T}: no hidden emperor name in log, news or envoy card`);
    check(r.owners && r.view === 'campaign' && r.unlocked, `${T}: owners = engine, campaign camera, orders open again`);
    check(ms < 120000, `${T}: control returned in ${Math.round(ms / 1000)} s`);
    return r;
  };

  // turn 1: the attack chosen above
  await turn('attack', { clicks: [], mid: 9000 });
  await shot('turn1');
  // turn 2: Chúa Lũng Tây sends an envoy → accept (any other envoy that turn → reject, to keep a pact slot free)
  const offer = (from) => `(d, g, pf) => d.fid === '${from}' ? Object.assign({}, d, { action: 'diplomacy', sub: 'pact', target: pf, targetKind: 'faction', from: null }) : null`;
  const t2 = await turn('accept', { action: 'internal' }, offer('qin_shihuang'), (txt) => (/Chúa Lũng Tây/.test(txt) ? 'accept' : 'reject'));
  const e2 = t2.envoys.find((e) => /Chúa Lũng Tây/.test(e.text));
  check(e2 && /Chúa Lũng Tây đề nghị minh ước/.test(e2.text) && /6 mùa/.test(e2.text) && e2.orders && e2.turn === 2, 'envoy card: public label, 6 seasons, menu locked, turn not resolved while it waits', t2.envoys.map((e) => e.text));
  check(/Chúa Lũng Tây · đến lượt \d+/.test(t2.pacts), 'accepted pact shown in the realm panel', t2.pacts);
  check(t2.news.some((n) => /Chúa Lũng Tây và Lý Thế Dân công bố minh ước/.test(n)), 'pact in the world news under public labels', t2.news);
  await shot('turn2-pact');
  // turn 3: Chúa Chung Ly also sends an envoy; with one pact slot left the engine keeps the first offer by id pending and
  // declines the rest (pact_full, never a card). Every card this turn → reject.
  const t3 = await turn('reject', { action: 'fortify', clicks: ['.pui .orders .body [data-target]'] }, offer('zhu_yuanzhang'), 'reject');
  const slot = await page.evaluate(() => { const e = window.__game.ctrl.history.at(-1).envelope; return { pending: e.pendingReactions.map((r) => r.from), declined: e.declinedOffers.map((r) => r.from + ':' + r.reason) }; });
  check(t3.envoys.length === slot.pending.length && slot.pending.length <= 1, 'envoy cards = pendingReactions only (one free slot)', { cards: t3.envoys.map((e) => e.text.slice(0, 50)), slot });
  check(!t3.envoys.some((e) => slot.declined.some((d) => d.startsWith('zhu_yuanzhang')) && /Chúa Chung Ly/.test(e.text)), 'a declined (pact_full) offer is never an actionable card', slot.declined);
  check(!/Chúa Chung Ly|Chúa Cô Tang/.test(t3.pacts) && t3.log.some((l) => l.includes('Minh ước Chúa Chung Ly đề nghị không thành.')), 'reject / pact_full: no pact, outcome logged', t3.pacts);
  // turn 4: a Tôn → Lưu battle far from Tấn Dương
  const far = await page.evaluate(() => {
    const G = window.__game.ctrl.game, P = G.def.P, st = G.state, E = window.__game.Engine;
    const mine = E.owned(G, 'li_shimin'), near = new Set(mine.flatMap((p) => P[p].neighbors).concat(mine));
    for (const a of E.owned(G, 'sun_quan')) for (const b of P[a].neighbors) if (st.provinces[b].owner === 'liu_bei' && !near.has(a) && !near.has(b)) return [a, b, P[b].city];
    return null;
  });
  const t4 = await turn('distant', { action: 'internal' }, `(d) => d.fid === 'sun_quan' ? Object.assign({}, d, { action: 'attack', target: '${far[1]}', targetKind: 'province', from: '${far[0]}', betray: true, sub: null }) : null`);
  check(t4.rawAttacks.includes(`sun_quan:${far[0]}>${far[1]}`), 'the distant battle happened in the truth', t4.rawAttacks);
  check(!t4.items.some((it) => it.to === far[1] || it.prov === far[1]) && !t4.log.some((l) => l.includes(far[2])), 'hidden battle: no shot, no log line', t4.log);
  check(t4.news.filter((n) => n.includes(far[2])).every((n) => /nay thuộc/.test(n)), 'at most its public consequence (owner change)', t4.news);
  await shot('turn4-news');
  // turn 5: a stratagem
  await turn('stratagem', { action: 'stratagem', clicks: ['.pui .orders .body [data-sub=burn]', '.pui .orders .body [data-target]'] });
  await shot('turn5');
  t0 = await text();
  check(!HIDDEN.some((n) => t0.includes(n)), 'after 5 turns: no hidden emperor name anywhere on screen');
  check(report.errors.length === 0, 'no console errors (play)', report.errors);

  // --- ?demo=1: spectator presentation of RuntimeEvent truth still works
  const demo = await browser.newPage();
  await demo.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await demo.setRequestInterception(true);
  demo.on('request', (req) => { const m = req.url().match(CDN_THREE), f = m && path.join(ROOT, 'node_modules/three', m[1]); if (f && fs.existsSync(f)) return req.respond({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(f) }); req.continue(); });
  demo.on('pageerror', (e) => report.errors.push('demo: ' + e.message));
  await demo.goto(BASE_URL + 'game.html?demo=1&qa=1&w=1440&h=900&dpr=1', { waitUntil: 'load', timeout: 600000 });
  await demo.waitForFunction(() => window.__game && (window.__game.ready || window.__error), { timeout: 900000, polling: 1000 });
  const d = await demo.evaluate(() => { const G = window.__game, i = G.events.findIndex((e) => e.kind === 'attack'), f = G.seek(i, 6); return { n: G.events.length, raw: G.events[i].text, hud: f.hud }; });
  check(d.n >= 5 && d.hud.some((h) => h.type === 'event' && h.text === d.raw), 'demo=1: RuntimeEvent card shows the raw spectator text', d.raw);
  await demo.screenshot({ path: path.join(OUT, 'smoke-demo.png') });
  check(report.errors.length === 0, 'no console errors (demo)', report.errors);
} catch (e) {
  check(false, 'smoke crashed: ' + e.message);
  console.error(e);
} finally {
  fs.writeFileSync(path.join(OUT, 'smoke.json'), JSON.stringify(report, null, 1));
  await browser.close();
}
