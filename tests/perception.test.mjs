import test from 'node:test';
import assert from 'node:assert/strict';
import { Engine, world, personas, newGame } from './load.mjs';

function isolateCaoFromLi(g) {
  g.state.provinces.ji.owner = 'sun_quan';
  g.state.provinces.guan.owner = 'sun_quan';
  g.state.provinces.si_li.owner = 'sun_quan';
}

test('decide rejects the full game object after perception attach', () => {
  const g = newGame(1);
  assert.throws(() => Engine.decide(g, 'cao_cao'), /full game|DecisionContext|projectPerception/);
});

test('fillDecisions does not call decideLegacy after perception attach', () => {
  const g = newGame(2);
  let leaked = 0;
  const orig = Engine.decideLegacy;
  Engine.decideLegacy = function () { leaked += 1; return orig.apply(this, arguments); };
  Engine.fillDecisions(g, 'li_shimin', { action: 'internal', target: 'bing', targetKind: 'province' });
  Engine.decideLegacy = orig;
  assert.equal(leaked, 0);
});

test('DecisionContext has no bandValues and no seed', () => {
  const ctx = Engine.projectPerception(newGame(1), 'cao_cao');
  assert.equal(ctx.bandValues, undefined);
  assert.equal(ctx.seed, undefined);
  assert.equal(Object.prototype.hasOwnProperty.call(ctx, 'seed'), false);
  assert.ok(ctx.others.li_shimin.troopBand);
});

test('hidden Li troops do not change Cao context or decision when not adjacent', () => {
  const seed = 219;
  const a = newGame(seed);
  const b = newGame(seed);
  isolateCaoFromLi(a);
  isolateCaoFromLi(b);
  a.state.intelLog = { lastSeen: {}, claims: {} };
  b.state.intelLog = { lastSeen: {}, claims: {} };
  a.state.factions.li_shimin.troops = 20000;
  b.state.factions.li_shimin.troops = 90000;
  const ca = Engine.projectPerception(a, 'cao_cao');
  const cb = Engine.projectPerception(b, 'cao_cao');
  assert.equal(ca.others.li_shimin.adjacent, false);
  assert.equal(ca.others.li_shimin.troopBand, 'unknown');
  assert.equal(cb.others.li_shimin.troopBand, 'unknown');
  const da = Engine.decide(ca, { seed: 219 });
  const db = Engine.decide(cb, { seed: 219 });
  assert.deepEqual({ action: da.action, target: da.target, sub: da.sub }, { action: db.action, target: db.target, sub: db.sub });
});

test('adjacent observer may see different troop bands', () => {
  const a = newGame(3);
  const b = newGame(3);
  a.state.factions.li_shimin.troops = 20000;
  b.state.factions.li_shimin.troops = 90000;
  const ca = Engine.projectPerception(a, 'cao_cao');
  const cb = Engine.projectPerception(b, 'cao_cao');
  assert.equal(ca.others.li_shimin.adjacent, true);
  assert.notEqual(ca.others.li_shimin.troopBand, cb.others.li_shimin.troopBand);
});

test('hidden Li persona and doctrine do not change Cao context or decision', () => {
  const seed = 219;
  const a = newGame(seed);
  const b = newGame(seed);
  isolateCaoFromLi(a);
  isolateCaoFromLi(b);
  a.state.intelLog = { lastSeen: {}, claims: {} };
  b.state.intelLog = { lastSeen: {}, claims: {} };
  const Li = b.def.F.li_shimin;
  Li.persona = Object.assign({}, Li.persona, {
    name: 'HIDDEN_NAME',
    short: 'HIDDEN_SHORT',
    quotes: { attack: ['hidden'], internal: ['hidden'], diplomacy: ['hidden'], stratagem: ['hidden'], fortify: ['hidden'] },
  });
  Li.weights = Object.assign({}, Li.weights, { attack: 99, internal: 0.01 });
  Li.traits = Object.assign({}, Li.traits, { aggression: 1, attack: 9 });
  Li.type = 'historical_warlord';
  const ca = Engine.projectPerception(a, 'cao_cao');
  const cb = Engine.projectPerception(b, 'cao_cao');
  assert.equal(ca.others.li_shimin.adjacent, false);
  assert.equal(cb.others.li_shimin.adjacent, false);
  assert.equal(JSON.stringify(ca), JSON.stringify(cb));
  assert.equal(ca.others.li_shimin.type, undefined);
  assert.equal(ca.others.li_shimin.weights, undefined);
  assert.equal(ca.others.li_shimin.traits, undefined);
  assert.equal(ca.others.li_shimin.persona, undefined);
  const da = Engine.decide(ca, { seed: 219 });
  const db = Engine.decide(cb, { seed: 219 });
  assert.deepEqual(da, db);
});

test('hidden type change does not leak into Cao context', () => {
  const a = newGame(5);
  const b = newGame(5);
  isolateCaoFromLi(a);
  isolateCaoFromLi(b);
  a.state.intelLog = { lastSeen: {}, claims: {} };
  b.state.intelLog = { lastSeen: {}, claims: {} };
  b.def.F.li_shimin.type = 'historical_warlord';
  const ca = Engine.projectPerception(a, 'cao_cao');
  const cb = Engine.projectPerception(b, 'cao_cao');
  assert.equal(JSON.stringify(ca.others.li_shimin), JSON.stringify(cb.others.li_shimin));
  assert.equal(ca.others.li_shimin.type, undefined);
});

test('Li and Zhu may receive the Jing prior; Qin Wu Cao Liu Sun must not', () => {
  const g = newGame(9);
  for (const fid of ['li_shimin', 'zhu_yuanzhang']) {
    const ctx = Engine.projectPerception(g, fid);
    assert.ok(ctx.prior);
    assert.equal(ctx.prior.id, 'wu_jing_pressure');
    assert.equal(ctx.prior.status, 'active');
  }
  for (const fid of ['qin_shihuang', 'liu_che', 'cao_cao', 'liu_bei', 'sun_quan']) {
    assert.equal(Engine.projectPerception(g, fid).prior, null);
  }
  g.state.deadChars = ['guan_yu'];
  assert.equal(Engine.projectPerception(g, 'li_shimin').prior.status, 'obsolete');
});

test('same-turn decision order does not change any DecisionContext', () => {
  const base = newGame(4);
  const order = Engine.aliveIds(base);
  function contextsAfterSequentialWrite(seq) {
    const g = newGame(4);
    Engine.observeFactions(g);
    const out = {};
    for (const fid of seq) {
      out[fid] = Engine.projectPerception(g, fid);
      g.state.factions[fid].last = { action: 'attack', fid, target: 'jing', targetKind: 'province' };
    }
    return out;
  }
  const fwd = contextsAfterSequentialWrite(order);
  const rev = contextsAfterSequentialWrite(order.slice().reverse());
  for (const fid of order) assert.deepEqual(fwd[fid], rev[fid]);
  const viaApi = Engine.collectContexts(newGame(4), order);
  const viaApiRev = Engine.collectContexts(newGame(4), order.slice().reverse());
  const sorted = (list) => list.slice().sort((a, b) => order.indexOf(a.fid) - order.indexOf(b.fid));
  assert.deepEqual(sorted(viaApi), sorted(viaApiRev));
});

test('save restore keeps intelLog and stays deterministic', () => {
  const g = newGame(42);
  Engine.playTurn(g);
  assert.ok(g.state.intelLog);
  const copy = Engine.restoreGame(world, personas, g.state);
  assert.deepEqual(copy.state.intelLog, g.state.intelLog);
  const seed = g.state.seed;
  const d1 = Engine.decideAll(g);
  copy.state.seed = seed;
  const d2 = Engine.decideAll(copy);
  assert.deepEqual(d1.map((d) => d.action + ':' + d.target), d2.map((d) => d.action + ':' + d.target));
});

test('publicLabel for a guest is the earth name until a claim exists', () => {
  const g = newGame(1);
  const cao = Engine.projectPerception(g, 'cao_cao');
  assert.equal(cao.others.qin_shihuang.publicLabel, 'Chúa Lũng Tây');
  assert.equal(cao.others.qin_shihuang.claimedIdentity, null);
  g.state.intelLog.claims.qin_shihuang = 'Doanh Chính';
  assert.equal(Engine.projectPerception(g, 'cao_cao').others.qin_shihuang.claimedIdentity, 'Doanh Chính');
});
