// drive the artboard's Component through a season with a stub scene and a stub DCLogic (no DOM, no WebGL)
const fs = require('fs');
global.window = global; global.HNRules = require('../src/hn-rules.js');
global.DCLogic = class { constructor(p) { this.props = p || {}; } setState(u, cb) { this.state = Object.assign({}, this.state, typeof u === 'function' ? u(this.state) : u); if (cb) cb(); } };
const timers = []; global.setTimeout = (f) => { timers.push(f); return 1; }; global.setInterval = () => 1; global.clearInterval = () => {};
const tick = () => new Promise((r) => setImmediate(r));
const flush = async () => { for (let k = 0; k < 6; k++) { await tick(); let n = 0; while (timers.length && n++ < 100) timers.shift()(); } };
const src = fs.readFileSync(__dirname + '/component.js', 'utf8').replace('__PORTRAITS__', JSON.stringify({ zhu: 'p/zhu.svg', zhu_huan: 'p/zhu_huan.svg' }));
const Component = new Function(src + '\nreturn Component;')();
const place = {}; for (const [k, P] of Object.entries(HNRules.PLACES)) place[k] = { x: P.xz[0], z: P.xz[1], name: P.name };
Object.assign(place, { xu: { x: 149, z: -100, name: 'Bành Thành' }, yang: { x: 208, z: -23, name: 'Kiến Nghiệp' }, yan: { x: 113, z: -129, name: 'Xương Ấp' }, yu: { x: 55, z: -80, name: 'Hứa Xương' } });
let synced = null;
const sc = { place, armies: {}, sync(s) { synced = s; this.armies = {}; for (const a of s.armies) this.armies[a.id] = { a }; }, select() {}, mark() {}, fly() {}, flyTo() {}, march: () => Promise.resolve(), pathBetween: (a, b) => [a, b],
  cards: () => Object.keys(place).map((id, i) => ({ kind: 'town', id, x: 100 + i * 60, y: 200, visible: true })).concat(Object.keys(sc.armies).map((id, i) => ({ kind: 'army', id, x: 200 + i * 80, y: 150, visible: true }))),
  gesture: { down() {}, move() {}, up: () => ({ kind: 'ground' }), wheel() {}, zoom() {}, rotate() {} }, stop() {},
  reach() {}, lanesAt: () => ['open', 'ford', 'hill'], GROUND: { open: { name: 'Đồng bằng', fx: 'Kỵ +30%.' } },
  battle: { begin() {}, show() {}, end() {}, select() {}, cards: () => [{ id: 'A0', x: 300, y: 200, visible: true }, { id: 'D0', x: 400, y: 180, visible: true }], lanes: () => [{ lane: 0, x: 200, y: 300, visible: true }] } };
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
const holes = (v) => { const tpl = fs.readFileSync(__dirname + '/template.html', 'utf8'); const need = new Set([...tpl.matchAll(/\{\{\s*([a-zA-Z_$][\w$]*)/g)].map((m) => m[1])); const loopVars = new Set([...tpl.matchAll(/as="(\w+)"/g)].map((m) => m[1])); return [...need].filter((k) => !loopVars.has(k) && !(k in v) && k !== 'true' && k !== 'false'); };

(async () => {
const c = new Component({});
let v = c.renderVals(); ok(v.isLoad, 'loading screen first'); ok(holes(v).length === 0, 'every template hole has a value while loading: ' + holes(v));
c.sc = sc; const g0 = HNRules.newGame(11); sc.sync(c.sceneState(g0)); c.setState({ phase: 'play', g: g0, cardsOpen: false, goal: true });
v = c.renderVals(); ok(v.isGoal && !v.hasCard && v.goalBtn.length > 0, 'goal screen first: ' + v.goalBtn); c.closeGoal();
v = c.renderVals(); ok(v.hasCard && v.cTitle.length > 0, 'first card shows: ' + v.cTitle); ok(holes(v).length === 0, 'holes (play): ' + holes(v));
ok(v.townLabels.length === 5 && v.armyLabels.length === 4 && v.seatLabels.length === 4, 'labels: 5 towns, 4 armies, 4 seats');
c.answer(true); c.answer(true); c.answer(false); c.answer(true);
v = c.renderVals(); ok(!v.hasCard, 'all cards answered'); console.log('   res', JSON.stringify(c.state.g.res), 'rumor', c.state.g.rumor, 'Hu Dị', c.state.g.towns.hu_di.owner);
c.tapThing('army', 'a1'); v = c.renderVals(); ok(v.hasArmy && v.aStats.length === 5 && v.orderBtns.length === 4, 'army panel with 5 stats and 4 orders'); console.log('   ', v.aName, v.aUnits.map((u) => u.arm + ' ' + u.n).join(', '), '|', v.aOrder);
v.orderBtns[1].go(); v = c.renderVals(); ok(v.hasPick && v.pickList.length > 0, 'attack targets: ' + v.pickList.map((p) => p.name).join(', '));
const tx = c.targets().find((t) => t.id === 'tho_xuan'); c.chooseTarget(tx); v = c.renderVals(); ok(v.hasFc, 'forecast opens'); console.log('   ', v.fWho, '|', v.fAcc, '|', v.fLabel, v.fPct, '| sức', v.fSa, 'vs', v.fSd, '| partners', v.fPartners.map((p) => p.label).join(', ')); ok(holes(v).length === 0, 'holes (forecast): ' + holes(v));
v.fPartners.find((p) => p.label.indexOf('Chu Hoàn') >= 0).go(); v = c.renderVals(); console.log('    joint:', v.fAgen, v.fLabel, v.fPct, v.fReasons.map((r) => r.t + ' ' + r.pct).join(' · '));
v.fGo(); v = c.renderVals(); ok(!v.hasFc && c.state.g.armies.a2.order && c.state.g.armies.a2.order.id === 'tho_xuan', 'joint attack ordered');
c.tapThing('town', 'chung_ly'); v = c.renderVals(); ok(v.hasTown && v.tasks.length === 7, 'town panel with 7 tasks'); v.tasks[0].go(); v = c.renderVals(); console.log('   task:', v.tTask, '| tiền', c.state.g.res.tien);
c.endSeason(); await flush(); v = c.renderVals(); console.log('   phase', c.state.phase, 'pending', !!c.state.g.pending, c.state.b && c.state.b.site);
let guard = 0;
while (c.state.phase === 'battle' && guard++ < 10) {
  v = c.renderVals(); ok(holes(v).length === 0, 'holes (battle): ' + holes(v)); console.log('   ', v.bTitle, v.bTurn, v.bGens, '|', v.wingChips.length, 'chips');
  const mine = c.state.b.wings.find((w) => w.side === c.state.b.me && !w.gone); c.pickWing(mine.id); v = c.renderVals(); ok(v.hasWing && v.wOrders.length >= 4, 'wing orders: ' + v.wOrders.map((o) => o.label).join('/'));
  v.wOrders[0].go(); let t = 0; while (!c.state.result && t++ < 6) { c.fightTurn(); await flush(); }
  v = c.renderVals(); ok(v.hasResult, 'result: ' + v.rTitle + ' · ' + v.rLoss); console.log('    ', v.rFc); v.rMoments.forEach((m) => console.log('     ', m.t));
  v.rNext(); await flush();
}
v = c.renderVals(); ok(v.hasReport, 'season report'); v.rpLines.forEach((l) => console.log('    ', (l.color === '#f08a72' ? '! ' : '') + l.t)); ok(holes(v).length === 0, 'holes (report): ' + holes(v));
v.goNext(); v = c.renderVals(); ok(c.state.phase === 'play', 'next season: ' + v.seasonText + ' · cards ' + c.state.g.cards.length);
// a defence: leave Âm Lăng empty-handed and let Liêu (if he stayed) come
for (let s = 0; s < 3 && c.state.phase === 'play'; s++) { for (const cd of c.state.g.cards.slice()) c.answer(false); c.endSeason(); await flush(); while (c.state.phase === 'battle') { c.autoBattle(); await flush(); c.renderVals().rNext(); await flush(); } v = c.renderVals(); if (c.state.phase === 'report') { console.log('   ', v.rpTitle, '·', v.rpLines.length, 'lines'); v.goNext(); } }
v = c.renderVals(); console.log('   end phase', c.state.phase, c.state.g.over ? c.state.g.over.why : ''); ok(holes(v).length === 0, 'holes (end): ' + holes(v));
process.exitCode = fails ? 1 : 0;
})();
