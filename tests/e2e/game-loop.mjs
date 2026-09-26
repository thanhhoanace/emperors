// Browser QA for the playable loop (game.html): choose an emperor → order → Engine.fillDecisions → Engine.resolveTurn →
// RuntimeEvent v1 queue → EventPresenter → state sync → next turn, over several turns in one page, then to game over.
// Needs `npm start` running. Screenshots and a JSON report: test-results/game-*.
// Local: PUPPETEER_EXECUTABLE_PATH=/path/to/chromium xvfb-run -a node tests/e2e/game-loop.mjs
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../load.mjs';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000/';
const OUT = path.join(ROOT, 'test-results');
fs.mkdirSync(OUT, { recursive: true });
const CDN_THREE = /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/(.+)$/;
const EMPERORS = ['qin_shihuang', 'zhu_yuanzhang', 'liu_che', 'li_shimin']; // the last one plays the turns
const PLAYER = EMPERORS[EMPERORS.length - 1];
const ORDERS = ['attack', 'internal', 'diplomacy', 'stratagem', 'fortify']; // one turn per engine action
const browser = await puppeteer.launch({
  headless: false, protocolTimeout: 1800000,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader-webgl', '--window-size=1500,1000'],
});
const report = { turns: [], memory: [], checks: [], errors: [] };
const check = (ok, what, detail) => { report.checks.push({ ok: !!ok, what, detail }); console.log((ok ? 'ok   ' : 'FAIL ') + what + (detail !== undefined ? ' ' + JSON.stringify(detail) : '')); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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
  const shot = (name) => page.screenshot({ path: path.join(OUT, `game-${name}.png`) });
  const click = async (sel) => { await page.waitForSelector(sel, { visible: true, timeout: 60000 }); await page.click(sel); };
  // GPU memory: buffers of every mesh in the scene (K.stats), and what three.js still holds on the GPU
  const memory = async (label) => {
    const m = await page.evaluate(() => { const s = window.__game.measure(), i = window.__game.rt.renderer.info.memory; return { bufferMB: s.bufferMB, triangles: s.triangles, calls: s.calls, geometries: i.geometries, textures: i.textures }; });
    m.label = label; report.memory.push(m); console.log('memory', JSON.stringify(m));
    return m;
  };

  const t0 = Date.now();
  await page.goto(BASE_URL + 'game.html?seed=219&speed=64&w=1440&h=900&dpr=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => (window.__game && window.__game.ready) || !!window.__error, { timeout: 600000, polling: 1000 });
  const err = await page.evaluate(() => window.__error);
  if (err) throw new Error('game failed: ' + err);
  check(true, 'map loaded', { seconds: Math.round((Date.now() - t0) / 1000) });
  await shot('start');

  // ------------------------------------------------------------------ each of the four emperors starts a real game
  for (const fid of EMPERORS) {
    const newBtn = await page.$('.pui .status:not(.hide) [data-role=new]');
    if (newBtn) await newBtn.click();
    await click(`.pui .start [data-fid=${fid}]`);
    const s = await page.evaluate((fid) => {
      const G = window.__game, E = G.Engine, g = G.ctrl.game;
      const acts = [...document.querySelectorAll('.pui .orders [data-action]')].map((b) => b.textContent);
      return {
        player: G.ctrl.player, turn: g.state.turn, seed: g.state.seed != null,
        acts, labels: Object.values(E.ACTIONS).map((a) => a.label),
        statusName: document.querySelector('.pui .status .nm').textContent,
        owners: JSON.stringify(G.rt.owners()) === JSON.stringify(G.ctrl.owners()),
        frontier: E.frontier(g, fid), mine: E.owned(g, fid),
        startHidden: document.querySelector('.pui .start').classList.contains('hide'),
      };
    }, fid);
    check(s.player === fid && s.turn === 1, `${fid}: real engine game started`, { player: s.player, turn: s.turn });
    check(s.startHidden && s.statusName.length > 0, `${fid}: campaign HUD shown`, s.statusName);
    check(JSON.stringify(s.acts) === JSON.stringify(s.labels), `${fid}: action menu = the 5 engine actions`, s.acts);
    check(s.owners, `${fid}: world owners = engine state`);
    await click('.pui .orders [data-action=attack]');
    const rows = await page.$$eval('.pui .orders .body [data-target]', (bs) => bs.map((b) => b.dataset.target));
    check(JSON.stringify(rows) === JSON.stringify(s.frontier), `${fid}: attack targets = Engine.frontier`, rows);
    await shot(`chosen-${fid}`);
  }

  // ------------------------------------------------------------------ several turns with PLAYER, one engine action each
  let prevTurn = await page.evaluate(() => window.__game.ctrl.game.state.turn);
  for (const [k, action] of ORDERS.entries()) {
    await click(`.pui .orders [data-action=${action}]`);
    // the input each action needs, picked from what the menu offers
    const choice = await page.evaluate((action) => {
      const op = window.__game.ctrl.options();
      const rank = { weak: 0, unknown: 1, medium: 2, strong: 3, very_strong: 4 }; // perceived troop bands only
      if (action === 'attack') { const t = op.attack.slice().sort((a, b) => rank[a.troopBand] - rank[b.troopBand])[0]; return { target: t.pid, betray: t.pact }; }
      if (action === 'diplomacy') return op.diplomacy.annex.length ? { sub: 'annex', target: op.diplomacy.annex[0].pid } : { sub: 'pact', target: (op.diplomacy.pact.find((x) => !x.full) || op.diplomacy.pact[0]).fid };
      if (action === 'stratagem') return { sub: 'burn', target: op.stratagem.targets.slice().sort((a, b) => rank[b.troopBand] - rank[a.troopBand])[0].fid };
      if (action === 'fortify') return { target: op.fortify[0].pid };
      return {};
    }, action);
    if (choice.sub && action !== 'diplomacy') await click(`.pui .orders .body [data-sub=${choice.sub}]:not([data-target])`);
    if (action === 'diplomacy') await click(`.pui .orders .body [data-sub=${choice.sub}][data-target=${choice.target}]`);
    else if (choice.target) await click(`.pui .orders .body [data-target=${choice.target}]`);
    if (choice.betray) await click('.pui .orders [data-betray]');
    const ready = await page.$eval('.pui .orders [data-role=submit]', (b) => !b.disabled);
    check(ready, `turn ${k + 1}: ${action} order complete`, choice);
    if (k === 0) await shot('order-attack');
    // spies: the loop must go through the engine's own entry points
    await page.evaluate(() => {
      const E = window.__game.Engine; window.__spy = { fill: [], resolve: 0 };
      if (!E.__orig) E.__orig = { fillDecisions: E.fillDecisions, resolveTurn: E.resolveTurn };
      E.fillDecisions = function (g, fid, d) { const r = E.__orig.fillDecisions.apply(this, arguments); window.__spy.fill.push({ fid, d: d && { action: d.action, sub: d.sub, target: d.target, betray: d.betray }, out: r.map((x) => ({ fid: x.fid, action: x.action })) }); return r; };
      E.resolveTurn = function () { window.__spy.resolve++; return E.__orig.resolveTurn.apply(this, arguments); };
    });
    if (k === 2) await page.evaluate(() => { window.__game.presenter.speed = 1; }); // slow enough to skip mid-turn
    await click('.pui .orders [data-role=submit]');
    await page.waitForFunction(() => window.__game.loop.playing || window.__game.ctrl.history.length > 0, { timeout: 60000 });
    const locked = await page.evaluate(() => ({ orders: document.querySelector('.pui .orders').classList.contains('hide'), bar: !document.querySelector('.pui .bar').classList.contains('hide') }));
    check(locked.orders, `turn ${k + 1}: orders locked during playback`);
    if (k === 0) { await sleep(2500); await shot('playing'); }
    if (k === 2) { // the viewer skips the rest of this turn once its first shot is on screen
      await page.waitForFunction(() => { const h = window.__game.ctrl.history; return h.length && h[h.length - 1].played.length >= 1; }, { timeout: 600000, polling: 200 });
      await sleep(500); await shot('skip'); await click('.pui .bar [data-role=skip]');
      await page.evaluate(() => { window.__game.presenter.speed = 64; });
    }
    await page.waitForFunction(() => !window.__game.loop.playing, { timeout: 1500000, polling: 1000 });
    const r = await page.evaluate((prevTurn) => {
      const G = window.__game, c = G.ctrl, e = c.history[c.history.length - 1];
      const stateOwners = {}; for (const [pid, p] of Object.entries(c.game.state.provinces)) if (p.owner !== 'neutral') stateOwners[pid] = p.owner;
      const seen = e.played.concat(e.skipped);
      return {
        spy: window.__spy, player: c.player, turn: c.game.state.turn, prevTurn, entryTurn: e.turn,
        n: e.events.length, v1: e.events.every((ev) => ev.v === 1 && ev.defender === undefined), kinds: e.events.map((ev) => ev.kind),
        once: seen.length === e.events.length && e.played.every((ev, i) => ev === e.events[i]) && e.skipped.every((ev, i) => ev === e.events[e.played.length + i]),
        played: e.played.length, skipped: e.skipped.length,
        unmutated: JSON.stringify(e.events) === e.frozen,
        owners: JSON.stringify(G.rt.owners()) === JSON.stringify(stateOwners),
        view: G.rt.view().name, busy: c.busy,
        mine: e.decision && { action: e.decision.action, target: e.decision.target },
        statusTurn: document.querySelector('.pui .status .tn').textContent,
        unlocked: !document.querySelector('.pui .orders').classList.contains('hide') && document.querySelector('.pui .bar').classList.contains('hide'),
        winEvent: e.events.some((ev) => ev.kind === 'win'),
      };
    }, prevTurn);
    report.turns.push(r);
    const T = `turn ${k + 1} (${action})`;
    check(r.spy.fill.length === 1 && r.spy.fill[0].fid === PLAYER && r.spy.fill[0].d.action === action, `${T}: Engine.fillDecisions(game, player, order)`, r.spy.fill[0] && r.spy.fill[0].d);
    check(r.spy.fill[0].out.length > 1 && r.spy.fill[0].out.filter((x) => x.fid !== PLAYER).every((x) => x.action), `${T}: AI factions got decisions`, r.spy.fill[0].out);
    check(r.spy.resolve === 1, `${T}: Engine.resolveTurn once`, r.spy.resolve);
    check(r.v1 && r.n > 0, `${T}: RuntimeEvent v1 events`, r.kinds);
    check(r.once, `${T}: each event played once, in order`, { played: r.played, skipped: r.skipped, n: r.n });
    check(r.unmutated, `${T}: events not mutated by the presentation`);
    check(r.owners, `${T}: world owners = engine state`);
    check(r.view === 'campaign', `${T}: back to the campaign camera`, r.view);
    check(r.turn === prevTurn + 1 && r.entryTurn === prevTurn && !r.busy, `${T}: engine turn advanced`, { before: prevTurn, after: r.turn });
    check(r.statusTurn.includes(`LƯỢT ${r.turn}/`), `${T}: HUD shows the new turn`, r.statusTurn);
    check(r.unlocked, `${T}: orders open for the next turn`);
    if (k === 2) check(r.skipped > 0, `${T}: skip logs the rest without shots`, { played: r.played, skipped: r.skipped });
    prevTurn = r.turn;
    await memory('after turn ' + (k + 1));
    await shot(`turn${k + 1}`);
  }

  // ------------------------------------------------------------------ to the end of the game
  // Real engine turns without shots (internal orders, the engine's MOCK for everyone else), then the final turn through the
  // UI, to see the game-over screen and that no more orders are taken.
  const ff = await page.evaluate(() => {
    const G = window.__game, c = G.ctrl, max = c.game.def.rules.maxTurns;
    while (!c.game.state.over && c.game.state.turn < max) { c.resolve(c.game.state.factions[c.player].alive ? c.decision('internal') : null); c.finish(); }
    G.loop.sync();
    return { turn: c.game.state.turn, over: !!c.game.state.over };
  });
  if (!ff.over) {
    const alive = await page.evaluate(() => window.__game.ctrl.status().player.alive);
    if (alive) { await click('.pui .orders [data-action=internal]'); await click('.pui .orders [data-role=submit]'); }
    else await click('.pui .orders [data-role=submit]');
    await page.waitForFunction(() => window.__game.ctrl.history.length && !window.__game.loop.playing, { timeout: 1500000, polling: 1000 });
  }
  const over = await page.evaluate(() => {
    const G = window.__game, s = G.ctrl.status();
    let refused = false; try { G.ctrl.resolve(G.ctrl.decision('internal')); } catch (e) { refused = /over/.test(e.message); }
    return { over: s.over, winner: s.winner, screen: !document.querySelector('.pui .over').classList.contains('hide'), text: document.querySelector('.pui .over').textContent, noOrders: !document.querySelector('.pui .orders [data-role=submit]'), refused, turn: s.turn };
  });
  check(over.over && over.winner, 'game over reached by the engine', over.winner);
  check(over.screen && over.text.includes('THIÊN HẠ ĐÃ ĐỊNH'), 'game-over screen shows the winner', over.text.slice(0, 160));
  check(over.noOrders && over.refused, 'no orders accepted after the end');
  await shot('over');
  await memory('after game over (turn ' + over.turn + ')');

  // ------------------------------------------------------------------ leaks: the same shot and the same sync, repeated
  // Once the caches are warm, replaying an attack shot (general, army, dust, standard) and re-syncing owners (terrain
  // colours, city standards) must leave exactly as many GPU geometries and textures as before.
  const leak = await page.evaluate(async () => {
    const G = window.__game, P = G.presenter, mem = G.rt.renderer.info.memory, all = G.ctrl.history.flatMap((h) => h.events);
    const ev = all.filter((e) => e.kind === 'attack' && e.win).pop() || all.filter((e) => e.kind === 'attack').pop();
    const out = [];
    P.speed = 64;
    for (let i = 0; i < 4; i++) { await P.play(ev); P.end(); G.loop.sync(); G.rt.render(); out.push({ geometries: mem.geometries, textures: mem.textures }); }
    return { ev: ev.from + '>' + ev.to, out };
  });
  const L = leak.out;
  check(L[1].geometries === L[3].geometries && L[1].textures === L[3].textures, 'replayed shot + sync leave no GPU objects behind (' + leak.ev + ')', L);
  await memory('after replays');

  // ------------------------------------------------------------------ health
  const mem = report.memory;
  check(mem.every((m) => m.bufferMB <= 150), 'GPU buffers ≤ 150 MB across turns', mem.map((m) => m.bufferMB));
  const tex = mem.map((m) => m.textures), geo = mem.map((m) => m.geometries);
  check(Math.max(...tex) - Math.min(...tex) <= 4, 'textures stable across turns (no per-turn leak)', tex);
  check(geo[geo.length - 1] <= Math.max(...geo.slice(0, -1)) + 60, 'geometries plateau (bounded caches, markers freed)', geo);
  const lost = await page.evaluate(() => { const c = document.querySelector('canvas'); const gl = c.getContext('webgl2') || c.getContext('webgl'); return gl.isContextLost(); });
  check(!lost, 'WebGL context alive');
  check(report.errors.length === 0, 'no console errors', report.errors.slice(0, 3));
} catch (e) {
  report.checks.push({ ok: false, what: 'run', detail: String(e.stack || e) });
  console.error(e);
} finally {
  fs.writeFileSync(path.join(OUT, 'game-loop.json'), JSON.stringify(report, null, 1));
  await browser.close();
}
const failed = report.checks.filter((c) => !c.ok);
console.log(`game loop: ${report.checks.length - failed.length}/${report.checks.length} checks passed`);
if (failed.length) process.exit(1);
