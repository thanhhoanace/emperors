// ASSIGN mục 3: the turn-based battle (src/engine/battle.js), a pure API. It is the demo 1 spike's battle
// (docs/phases/v2-gameplay/demo1/src/hn-rules.js) as an engine module: the spike's own benchmarks must come out the same.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { ROOT, Engine, newGame } from './load.mjs';

const require = createRequire(import.meta.url);
const Battle = require(path.join(ROOT, 'src/engine/battle.js'));

const ZHU = { id: 'zhu', name: 'Chu Nguyên Chương', uy: 9, tai: 7, muu: 7, dung: 6, kien: 8, loyal: 100, lord: true, traits: ['commoner'] };
const LIAO = { id: 'zhang_liao', name: 'Trương Liêu', uy: 8, tai: 6, muu: 6, dung: 10, kien: 8, loyal: 90, traits: ['charge'] };
const siegePlan = (seed = 1, over = {}) => ({
  site: 'tho_xuan', siege: true, walls: 3, lanes: ['open', 'ford', 'wood'], seed,
  attacker: { fid: 'zhu_yuanzhang', gen: ZHU, units: { bo: 3200, cung: 1000, ky: 800 } },
  defender: { fid: 'cao_cao', gen: null, units: { bo: 2000, cung: 600 }, holding: false },
  ...over,
});
const fieldPlan = (seed = 1) => ({
  site: 'am_lang', siege: false, walls: 0, lanes: ['open', 'open', 'wood'], seed,
  attacker: { fid: 'cao_cao', gen: LIAO, units: { bo: 2000, cung: 500, ky: 3500 } },
  defender: { fid: 'zhu_yuanzhang', gen: ZHU, units: { bo: 3200, cung: 1000, ky: 800 }, holding: true },
});

test('create: 1–6 wings a side, attacker in rows 0–1, defender in 4–5, lanes from the plan', () => {
  const b = Battle.create(siegePlan());
  assert.deepEqual(b.lanes, ['open', 'ford', 'wood']);
  assert.equal(b.turn, 1);
  assert.equal(b.over, null);
  for (const side of ['A', 'D']) {
    const w = b.wings.filter((x) => x.side === side);
    assert.ok(w.length >= 1 && w.length <= 6, side + ' ' + w.length);
    for (const x of w) {
      assert.ok(side === 'A' ? x.row <= 1 : x.row >= 4, x.id);
      assert.ok(x.lane >= 0 && x.lane <= 2);
      assert.ok(Battle.ARMS.includes(x.arm));
      assert.equal(x.men, x.start);
      assert.ok(x.morale > 0 && x.morale <= 100);
    }
  }
  const men = (side) => b.wings.filter((x) => x.side === side).reduce((s, x) => s + x.men, 0);
  assert.ok(Math.abs(men('A') - 5000) <= 3);
  assert.ok(Math.abs(men('D') - 2600) <= 3);
  // a big army with boats still fields six wings at most
  const big = Battle.create({ ...siegePlan(), attacker: { fid: 'x', gen: null, units: { bo: 30000, cung: 9000, ky: 12000, thuy: 6000 } } });
  assert.equal(big.wings.filter((x) => x.side === 'A').length, 6);
});

test('lanes: the laneProvider first, else the site terrain; a river site gets a ford', () => {
  assert.deepEqual(Battle.lanesFor({ terrain: 'hills' }), ['hill', 'open', 'wood']);
  assert.deepEqual(Battle.lanesFor({ terrain: 'plains', river: true }), ['open', 'open', 'ford']);
  assert.deepEqual(Battle.lanesFor({ terrain: 'river', river: true }), ['open', 'ford', 'open']);
  assert.deepEqual(Battle.lanesFor({ terrain: 'plains' }, () => ['wood', 'wood', 'hill']), ['wood', 'wood', 'hill']);
  assert.deepEqual(Battle.lanesFor({ terrain: 'plains', lanes: ['bad'] }), ['open', 'open', 'wood']);
  const b = Battle.create({ ...siegePlan(), lanes: undefined, terrain: 'jungle' }, { lanes: () => ['ford', 'open', 'open'] });
  assert.deepEqual(b.lanes, ['ford', 'open', 'open']);
});

test('pure: calls return new states, the input is untouched, the same seed replays', () => {
  const b0 = Battle.create(siegePlan(7)), snap = JSON.stringify(b0);
  const b1 = Battle.resolve(Battle.orders(b0, 'A', { A0: 'tien' }));
  assert.notEqual(b1, b0);
  assert.equal(JSON.stringify(b0), snap);
  assert.equal(b1.turn, 2);
  const run = (seed) => JSON.stringify(Battle.simulate(Battle.create(siegePlan(seed))));
  assert.equal(run(7), run(7));
  assert.notEqual(run(7), run(8));
  const code = fs.readFileSync(path.join(ROOT, 'src/engine/battle.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(code, /Math\.random|document\.|window\./);
  JSON.parse(JSON.stringify(b1)); // a plain JSON state (saves, the server, the scene)
});

test('orders: by arm, fire once and only for Mưu ≥ 7; an illegal order throws', () => {
  const b = Battle.create(fieldPlan());
  const arm = (id) => b.wings.find((w) => w.id === id).arm;
  for (const w of b.wings) {
    const legal = Battle.legalOrders(b, w.id);
    for (const o of ['tien', 'giu', 'rut']) assert.ok(legal.includes(o), w.id + ' ' + o);
    assert.equal(legal.includes('xung'), w.arm === 'ky');
    assert.equal(legal.includes('suon'), w.arm === 'ky');
    assert.equal(legal.includes('ban'), w.arm === 'cung');
    assert.equal(legal.includes('hoa'), w.side === 'D', 'Chu (Mưu 7) may burn, Liêu (Mưu 6) may not');
  }
  const bo = b.wings.find((w) => w.side === 'A' && w.arm === 'bo').id;
  assert.throws(() => Battle.orders(b, 'A', { [bo]: 'xung' }), /cannot xung/);
  assert.throws(() => Battle.orders(b, 'D', { [bo]: 'tien' }), /not a wing of D/);
  assert.equal(arm(bo), 'bo');
});

test('the proposed plan: a wing the player does not touch fights on the proposed order (owner, 29/9)', () => {
  for (let seed = 1; seed <= 10; seed++) {
    let b = Battle.create(fieldPlan(seed));
    while (!b.over) {
      const plan = Battle.autoOrders(Battle.autoOrders(b, 'A'), 'D');
      assert.deepEqual(Battle.resolve(b), Battle.resolve(plan), 'no orders at all = the whole proposed plan');
      // the player overrides one wing; every other wing keeps its proposal
      const mine = Battle.live(b, 'A')[0], legal = Battle.legalOrders(b, mine), pick = legal.find((o) => o !== plan.wings.find((w) => w.id === mine).order) || legal[0];
      const one = Battle.orders(b, 'A', { [mine]: pick });
      const expect = Battle.orders(plan, 'A', { [mine]: pick });
      assert.deepEqual(Battle.resolve(one), Battle.resolve(expect));
      b = Battle.resolve(one);
    }
  }
});

test('a battle runs 1–5 turns and ends with a result in the BattleDescriptor shape', () => {
  for (let seed = 1; seed <= 40; seed++) {
    for (const plan of [siegePlan(seed), fieldPlan(seed)]) {
      const b = Battle.simulate(Battle.create(plan));
      assert.ok(b.over && ['A', 'D', 'draw'].includes(b.over.win));
      assert.ok(b.turn >= 1 && b.turn <= 5);
      assert.equal(b.log.length, b.turn);
      const o = Battle.outcome(b);
      assert.equal(o.win, b.over.win);
      assert.equal(o.turns, b.turn);
      assert.equal(o.routed, o.win === 'A' ? 'D' : o.win === 'D' ? 'A' : null);
      for (const s of ['A', 'D']) assert.ok(o.losses[s] >= 0 && o.losses[s] <= b.wings.filter((w) => w.side === s).reduce((a, w) => a + w.start, 0));
      if (plan.siege) assert.notEqual(o.win, 'draw', 'a siege is taken or it holds');
      for (const t of b.log) for (const ev of t.ev) assert.ok(typeof Battle.say(b, ev, 'A') === 'string' && Battle.say(b, ev, 'A').length > 5, ev.kind);
    }
  }
});

test('view: every wing for the scene, each turn', () => {
  let b = Battle.create(fieldPlan(3));
  while (!b.over) {
    const v = Battle.view(b);
    assert.equal(v.length, b.wings.length);
    for (const w of v) for (const k of ['id', 'side', 'arm', 'men', 'start', 'morale', 'lane', 'row', 'order', 'onWalls', 'gone', 'routed']) assert.ok(k in w, k);
    b = Battle.resolve(b);
  }
});

test('the walls hold a siege at nightfall; a wing over an empty wall takes it', () => {
  // a token attack on walls 4 cannot take the city
  const weak = Battle.simulate(Battle.create(siegePlan(1, { walls: 4, attacker: { fid: 'x', gen: null, units: { bo: 1500 } }, defender: { fid: 'y', gen: null, units: { bo: 2400, cung: 800 } } })));
  assert.equal(weak.over.win, 'D');
  // a small garrison holds the centre only: the attacker's flanks climb the empty walls and take the city
  let climbs = 0;
  for (let seed = 1; seed <= 20; seed++) {
    let b = Battle.create(siegePlan(seed, { defender: { fid: 'y', gen: null, units: { bo: 800, cung: 400 } } }));
    let breached = false;
    while (!b.over) { b = Battle.resolve(b); breached = breached || b.log[b.log.length - 1].ev.some((e) => e.kind === 'breach' && e.wall); }
    if (breached) { climbs++; assert.equal(b.over.win, 'A', 'seed ' + seed); }
  }
  assert.ok(climbs > 0);
});

test('generals matter: Dũng, Kiên, Uy and a trait change the numbers the forecast explains', () => {
  const b = Battle.create(fieldPlan());
  const ky = b.wings.find((w) => w.side === 'A' && w.arm === 'ky'), foe = b.wings.find((w) => w.side === 'D' && w.lane === ky.lane) || b.wings.find((w) => w.side === 'D');
  const p = Battle.power({ ...b, wings: b.wings }, { ...ky, charge: true }, foe);
  assert.ok(p.mods.some(([why]) => why.startsWith('xung phong (Trương Liêu)')), JSON.stringify(p.mods));
  assert.ok(p.mods.some(([why, pct]) => why.startsWith('Dũng 10') && pct === 15));
  const dull = Battle.create({ ...fieldPlan(), attacker: { ...fieldPlan().attacker, gen: { ...LIAO, dung: 1, traits: [] } } });
  const kyDull = dull.wings.find((w) => w.id === ky.id);
  assert.ok(Battle.power(dull, { ...kyDull, charge: true }, foe).p < p.p);
  const guard = Battle.guard(b, b.wings.find((w) => w.side === 'D'));
  assert.ok(guard.mods.some(([why]) => why.startsWith('Kiên 8')));
  // morale from Uy: Chu (Uy 9, a lord, a commoner) above a plain officer
  const a = Battle.create(siegePlan()).wings.find((w) => w.side === 'A' && w.arm === 'bo');
  const d = Battle.create(siegePlan()).wings.find((w) => w.side === 'D' && w.arm === 'bo');
  assert.ok(a.morale > d.morale);
  assert.equal(Battle.loyalMorale({ loyal: 50 }), -5);
  assert.equal(Battle.loyalMorale({ loyal: 90 }), 3);
  assert.equal(Battle.loyalMorale({ loyal: 50, lord: true }), 0);
});

// the spike, loaded as the page loads it, is the reference for the port
function spike() {
  const ctx = vm.createContext({ console, Math, JSON });
  ctx.window = ctx; ctx.self = ctx;
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'docs/phases/v2-gameplay/demo1/src/hn-rules.js'), 'utf8'), ctx);
  return ctx.HNRules;
}
const TRAIT = { 'Uy chấn Tiêu Dao': 'charge', 'Giữ thành': 'walls', 'Thủy chiến': 'navy', 'Mình đầy thương tích': 'stubborn', 'Xuất thân bần nông': 'commoner' };

test('demo 1 benchmarks: the port wins exactly where the spike wins (WORKING.md, Demo 1)', () => {
  const R = spike();
  const gen = (id) => { const x = R.GEN[id]; return x ? { id, name: x.name, uy: x.uy, tai: x.tai, muu: x.muu, dung: x.dung, kien: x.kien, loyal: x.loyal, lord: id === 'zhu', traits: TRAIT[x.trait] ? [TRAIT[x.trait]] : [] } : null; };
  const CASES = [ // [name, setup, spike rate as measured 29/9 over 120 seeds]
    ['Thọ Xuân, Liêu in the city, one army', (g) => [g, 'a1', 'tho_xuan'], 0],
    ['Thọ Xuân, Liêu gone, one army', (g) => { delete g.armies.e1; return [g, 'a1', 'tho_xuan']; }, null],
    ['Thọ Xuân, Liêu gone, joint', (g) => { delete g.armies.e1; return [g, ['a1', 'a2'], 'tho_xuan']; }, 1],
    ['Hu Dị, the fleet', (g) => [g, 'a2', 'hu_di'], null],
  ];
  for (const [name, setup, want] of CASES) {
    let ws = 0, wp = 0;
    for (let s = 1; s <= 120; s++) {
      const [g, atk, site] = setup(R.newGame(s)), plan = R.battlePlan(g, atk, { kind: 'town', id: site });
      const bs = R.battle.simulate(g, R.battle.create(g, plan));
      const bp = Battle.simulate(Battle.create({ site: plan.site, siege: plan.siege, walls: plan.defender.walls, lanes: R.battle.lanesFor(plan), seed: g.rs,
        attacker: { fid: plan.attacker.fid, gen: gen(plan.attacker.gen), units: plan.attacker.units },
        defender: { fid: plan.defender.fid, gen: gen(plan.defender.gen), units: plan.defender.units, holding: plan.defender.holding } }));
      assert.equal(bp.over.win, bs.over.win, `${name}, seed ${s}`);
      assert.equal(Battle.lossOf(bp, 'A'), R.battle.lossOf(bs, 'A'), `${name}, seed ${s}: attacker losses`);
      if (bs.over.win === 'A') ws++;
      if (bp.over.win === 'A') wp++;
    }
    if (want !== null) assert.equal(wp / 120, want, name);
    assert.equal(wp, ws, name);
  }
});

test('on v1 battles (npm run sim -- N --battles) the turn battle mostly agrees with the v1 roll', () => {
  let n = 0, agree = 0;
  for (const seed of [3, 4]) {
    const g = newGame(seed);
    while (!g.state.over) for (const e of Engine.playTurn(g).events) {
      if (e.kind !== 'attack') continue;
      const o = Battle.outcome(Battle.simulate(Battle.create({ ...e.battle, seed: seed * 7919 + n })));
      n++;
      if ((o.win === 'A') === e.win) agree++;
    }
  }
  assert.ok(n > 100 && agree / n > 0.75, `${agree}/${n}`);
});

// ASSIGN mục 4: the general's forecast. A label and his numbers, never a percentage or the true odds; his error is
// fixed per question and scaled by ±(42 − 3.5·Mưu) %.
const questions = (n) => Array.from({ length: n }, (_, i) => {
  const bo = 1500 + ((i * 7919) % 5000), ky = (i * 104729) % 3000, dbo = 800 + ((i * 1299709) % 3000);
  return [{ site: 'q' + i, siege: i % 3 !== 0, walls: 1 + (i % 4), lanes: [['open', 'ford', 'wood'], ['open', 'open', 'wood'], ['hill', 'open', 'wood']][i % 3],
    attacker: { fid: 'a', gen: null, units: { bo, cung: 600, ky } }, defender: { fid: 'd', gen: null, units: { bo: dbo, cung: 400 }, holding: i % 2 === 0 } }, 'q' + i];
});
const analyst = (muu) => ({ id: 'g' + muu, name: 'Tướng Mưu ' + muu, uy: 5, tai: 5, muu, dung: 5, kien: 5 });

test('forecast: a label, his numbers and reasons; never the true odds, never a percentage', () => {
  const [plan, key] = questions(1)[0];
  const f = Battle.forecast(plan, analyst(6), { key });
  assert.deepEqual(Object.keys(f).sort(), ['analyst', 'band', 'est', 'estWin', 'label', 'lanes', 'reasons', 'sa', 'sd']);
  assert.ok(['Thắng lớn', 'Thắng', 'Ngang ngửa', 'Thua', 'Thua lớn'].includes(f.label));
  assert.ok(f.estWin >= 0.02 && f.estWin <= 0.98);
  assert.equal(f.band, 21);
  assert.ok(f.est.la % 100 === 0 && f.est.ld % 100 === 0 && f.sa % 100 === 0 && f.sd % 100 === 0);
  assert.ok(f.reasons.length <= 6 && f.reasons.every((r) => (r.side === 'A' || r.side === 'D') && typeof r.why === 'string' && Math.abs(r.pct) >= 10));
  const text = JSON.stringify({ label: f.label, reasons: f.reasons.map((r) => r.why), lanes: f.lanes });
  assert.doesNotMatch(text, /%/);
  assert.equal(Battle.labelOf(0.81), 'Thắng lớn');
  assert.equal(Battle.labelOf(0.6), 'Thắng');
  assert.equal(Battle.labelOf(0.5), 'Ngang ngửa');
  assert.equal(Battle.labelOf(0.3), 'Thua');
  assert.equal(Battle.labelOf(0.1), 'Thua lớn');
});

test('forecast: the same question gets the same answer, whatever day the battle is really fought', () => {
  const [plan, key] = questions(2)[1];
  const a = Battle.forecast({ ...plan, seed: 1 }, analyst(5), { key }), b = Battle.forecast({ ...plan, seed: 999 }, analyst(5), { key });
  assert.deepEqual(a, b);
  const others = ['x', 'y', 'z'].map((k) => Battle.forecast(plan, analyst(5), { key: key + k }).estWin);
  assert.ok(others.some((w) => w !== a.estWin), 'another question, another reading');
});

test('forecast: the better the Mưu, the closer to the truth (demo 1: Mưu 7 off by 0.07 on average, Mưu 3 by 0.18)', () => {
  const Q = questions(60), err = {};
  for (const muu of [3, 7, 10]) {
    let sum = 0;
    for (const [plan, key] of Q) {
      const t = Battle.odds(plan, { key }).win, f = Battle.forecast(plan, analyst(muu), { key });
      const off = Math.abs(f.estWin - t);
      assert.ok(off <= Battle.bandOf(Battle.genOf(analyst(muu))) * 1.3 + 1e-9, `Mưu ${muu}: off ${off.toFixed(2)}`);
      sum += off;
    }
    err[muu] = sum / Q.length;
  }
  assert.ok(err[10] < err[7] && err[7] < err[3], JSON.stringify(err));
  assert.ok(err[3] > 0.1 && err[10] < 0.06, JSON.stringify(err));
});

test('forecast: it reads the plan it is given (the enemy as perception shows it)', () => {
  const [plan, key] = questions(4)[3];
  const more = { ...plan, defender: { ...plan.defender, units: { bo: plan.defender.units.bo * 1.2, cung: plan.defender.units.cung * 1.2 } } };
  const a = Battle.forecast(plan, analyst(10), { key }), b = Battle.forecast(more, analyst(10), { key });
  assert.ok(b.sd > a.sd);
  assert.ok(b.estWin <= a.estWin);
});
