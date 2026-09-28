// headless checks for hn-rules.js: deterministic, battles end, forecast bands shrink with Mưu, a season plays several ways
const R = require('./src/hn-rules.js');
const B = R.battle;
let fails = 0;
const assert = (c, m) => { if (!c) { console.error('FAIL', m); fails++; } else console.log('ok  ', m); };
const V = process.argv.includes('-v');

assert(JSON.stringify(R.endSeason(R.newGame(7))) === JSON.stringify(R.endSeason(R.newGame(7))), 'same seed, same season');

let g = R.newGame(1);
const ta = R.targets(g, 'a1'), tf = R.targets(g, 'a2');
console.log('a1 targets', ta.map((t) => t.kind[0] + ':' + t.id + ':' + t.d).join(' '), '| a2', tf.map((t) => t.kind[0] + ':' + t.id + ':' + t.d).join(' '));
assert(ta.some((t) => t.id === 'tho_xuan') && !ta.some((t) => t.id === 'lich_duong'), 'foot reaches Thọ Xuân, not Lịch Dương');
assert(tf.every((t) => (t.kind === 'town' ? R.PLACES[t.id].river === 'hoai' : true)) && !tf.some((t) => t.id === 'e2'), 'fleet stays on the Huai');

// win rates: many seeds, both sides on auto orders
const noLiao = (seed) => { const x = R.newGame(seed); delete x.armies.e1; return x; };
const rate = (mk, att, tgt, n = 40) => { let w = 0, la = 0, ld = 0; for (let k = 0; k < n; k++) { const gg = mk(200 + k); const bb = B.simulate(gg, B.create(gg, R.battlePlan(gg, att, tgt))); if (bb.over.win === 'A') w++; la += B.lossOf(bb, 'A'); ld += B.lossOf(bb, 'D'); } return (Math.round((w / n) * 100) + '%').padStart(4) + '  loss ' + Math.round(la / n) + ' / ' + Math.round(ld / n); };
const T = (id) => ({ kind: 'town', id });
console.log('\nwin rates');
console.log(' a1 → Thọ Xuân, Liêu inside       ', rate(R.newGame, 'a1', T('tho_xuan')));
console.log(' a1+a2 → Thọ Xuân, Liêu inside    ', rate(R.newGame, ['a1', 'a2'], T('tho_xuan')));
console.log(' a1 → Thọ Xuân, Liêu gone         ', rate(noLiao, 'a1', T('tho_xuan')));
console.log(' a1+a2 → Thọ Xuân, Liêu gone      ', rate(noLiao, ['a1', 'a2'], T('tho_xuan')));
console.log(' a1 → Hu Dị                       ', rate(R.newGame, 'a1', T('hu_di')));
console.log(' a2 → Hu Dị                       ', rate(R.newGame, 'a2', T('hu_di')));
const liaoVs = (tid, hold) => (seed) => { const x = R.newGame(seed); x.armies.a1.at = tid; x.armies.a1.holding = hold; return x; };
console.log(' Liêu → Âm Lăng (500 bo)          ', rate(R.newGame, 'e1', T('am_lang')));
console.log(' Liêu → Âm Lăng, a1 inside        ', rate(liaoVs('am_lang', false), 'e1', T('am_lang')));
console.log(' Liêu → Chung Ly, a1+a2 inside    ', rate(R.newGame, 'e1', T('chung_ly')));
const field = (seed) => { const x = R.newGame(seed); x.towns.am_lang.owner = 'local'; x.armies.a1.at = 'am_lang'; x.armies.a1.besieging = 'am_lang'; return x; };
console.log(' Liêu → a1 in the field (Âm Lăng) ', rate(field, 'e1', { kind: 'army', id: 'a1' }));
console.log(' Ngô → Lịch Dương                 ', rate(R.newGame, 'e2', T('lich_duong')));

// forecast
console.log('\nforecasts');
for (const [att, tgt, mk] of [['a1', T('tho_xuan'), R.newGame], [['a1', 'a2'], T('tho_xuan'), noLiao], ['a2', T('hu_di'), R.newGame], ['a1', T('hu_di'), R.newGame]]) {
  const f = R.forecast(mk(1), att, tgt);
  console.log(' ', String(att).padEnd(6), tgt.id.padEnd(9), f.gen.padEnd(18), 'Mưu', f.muu, '±' + f.band + '%', f.label.padEnd(10), 'est', Math.round(f.estWin * 100) + '%', 'true', Math.round(f.trueWin * 100) + '%', 'sức', f.sa, 'vs', f.sd, '| ta −' + f.est.la, 'địch −' + f.est.ld);
  if (V) console.log('    ', f.reasons.map((r) => (r.side === 'A' ? 'Ta: ' : 'Họ: ') + r.why + ' ' + (r.pct > 0 ? '+' : '') + r.pct + '%').join(' · '));
}
// accuracy across seeds: |est − true| for Mưu 7 vs Mưu 3
let e7 = 0, e3 = 0; for (let s = 1; s <= 30; s++) { const x = noLiao(s); e7 += Math.abs(R.forecast(x, 'a1', T('hu_di')).estWin - R.forecast(x, 'a1', T('hu_di')).trueWin); e3 += Math.abs(R.forecast(x, 'a2', T('hu_di')).estWin - R.forecast(x, 'a2', T('hu_di')).trueWin); }
console.log('  mean |est−true|: Chu Nguyên Chương', (e7 / 30).toFixed(3), '· Chu Hoàn', (e3 / 30).toFixed(3));
assert(e7 < e3, 'the cunning general guesses closer');

// one battle, verbose
g = noLiao(3);
let b = B.create(g, R.battlePlan(g, ['a1', 'a2'], T('tho_xuan')), 'A');
if (V) console.log('\nlanes', b.lanes, b.wings.map((w) => w.id + ':' + w.arm + ':' + w.men + '@' + w.lane + '/' + w.row).join(' '));
while (!b.over) { B.autoOrders(g, b, 'A'); B.autoOrders(g, b, 'D'); b = B.resolve(g, b); if (V) for (const e of b.log[b.log.length - 1].ev) console.log('  T' + b.log[b.log.length - 1].turn, e.t); }
console.log('\njoint attack on Thọ Xuân without Liêu:', b.over, 'loss', B.lossOf(b, 'A'), '/', B.lossOf(b, 'D'));
assert(b.log.length <= 5, 'battle ends in ≤ 5 turns');

// whole seasons, several policies
function play(seed, policy, n = 4) {
  let g = R.newGame(seed), battles = 0;
  for (let s = 0; s < n && !g.over; s++) {
    for (const c of g.cards.slice()) g = R.answerCard(g, c.id, policy.card(c, g));
    g = policy.orders(g);
    g = R.endSeason(g);
    while (g.pending) { battles++; g = R.settleBattle(g, B.simulate(g, B.create(g, g.pending))); }
  }
  const mine = Object.keys(g.towns).filter((t) => g.towns[t].owner === g.me);
  return { seed, s: g.season, over: g.over && g.over.why, towns: mine.join(','), res: g.res, battles, armies: Object.values(g.armies).map((a) => a.id + ':' + R.total(a.units)).join(' ') };
}
const attackNearest = (g) => { for (const a of Object.values(g.armies).filter((x) => x.fid === g.me)) { const t = R.targets(g, a.id).filter((x) => x.hostile && x.kind === 'town').sort((x, y) => x.d - y.d)[0]; if (t) g = R.setArmyOrder(g, a.id, { type: 'attack', kind: 'town', id: t.id }); } return g; };
const policies = {
  greedy: { card: () => true, orders: (g) => { g = attackNearest(g); if (g.towns.chung_ly.owner === g.me && R.canTask(g, 'chung_ly', 'mo_bo')) g = R.setTownTask(g, 'chung_ly', 'mo_bo'); return g; } },
  historian: { card: (c) => c.id !== 'envoy_wu', orders: (g) => { // trusts the memory: both armies on Thọ Xuân in season 1
    if (g.season === 1) { g = R.setArmyOrder(g, 'a1', { type: 'attack', kind: 'town', id: 'tho_xuan' }); g = R.setArmyOrder(g, 'a2', { type: 'attack', kind: 'town', id: 'tho_xuan' }); } else g = attackNearest(g);
    if (R.canTask(g, 'chung_ly', 'ruong')) g = R.setTownTask(g, 'chung_ly', 'ruong'); return g; } },
  sieger: { card: (c) => c.id === 'history_fan' || c.id === 'local_hudi', orders: (g) => { if (g.armies.a1 && g.towns.tho_xuan.owner !== g.me) g = R.setArmyOrder(g, 'a1', g.armies.a1.at === 'tho_xuan' ? { type: 'siege', kind: 'town', id: 'tho_xuan' } : { type: 'siege', kind: 'town', id: 'tho_xuan' }); return g; } },
  passive: { card: () => false, orders: (g) => { for (const a of Object.values(g.armies).filter((x) => x.fid === g.me)) g = R.setArmyOrder(g, a.id, { type: 'hold' }); if (R.canTask(g, 'chung_ly', 'ruong')) g = R.setTownTask(g, 'chung_ly', 'ruong'); return g; } },
  spender: { card: () => false, orders: (g) => { for (const t of ['chung_ly', 'am_lang']) if (g.towns[t].owner === g.me && R.canTask(g, t, 'mo_bo')) g = R.setTownTask(g, t, 'mo_bo'); return g; } },
};
console.log('\nseasons (4 each)');
for (const [n, p] of Object.entries(policies)) for (const seed of [1, 2, 3, 4]) console.log(' ', n.padEnd(9), JSON.stringify(play(seed, p)));

// floors: warn then fall
g = R.newGame(5); g.res.luong = -2500; g = R.endSeason(g); while (g.pending) g = R.settleBattle(g, B.simulate(g, B.create(g, g.pending)));
assert(g.warn.luong && !g.over, 'one season below zero: warning only');
g.res.luong = -2500; g = R.endSeason(g); while (g.pending) g = R.settleBattle(g, B.simulate(g, B.create(g, g.pending)));
assert(g.over && !g.over.win, 'two seasons below zero: the fall (' + (g.over && g.over.why) + ')');

g = R.newGame(1);
console.log('\nseen e1', JSON.stringify(R.seen(g, g.armies.e1)), '| e2', JSON.stringify(R.seen(g, g.armies.e2)), R.seenText(3000, 0.5));
process.exitCode = fails ? 1 : 0;
