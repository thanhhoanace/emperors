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

test('provinceIntel is the same band for 26k and 44k and does not carry exact troops', () => {
  const a = newGame(1);
  const b = newGame(1);
  a.state.factions.li_shimin.troops = 26000;
  b.state.factions.li_shimin.troops = 44000;
  const ca = Engine.projectPerception(a, 'cao_cao');
  const cb = Engine.projectPerception(b, 'cao_cao');
  assert.equal(ca.provinceIntel.bing.source, 'adjacent');
  assert.equal(ca.provinceIntel.bing.troopBand, 'medium');
  assert.equal(cb.provinceIntel.bing.troopBand, 'medium');
  assert.deepEqual(ca.provinceIntel, cb.provinceIntel);
  assert.equal(JSON.stringify(ca.provinceIntel).includes('26000'), false);
  assert.equal(JSON.stringify(cb.provinceIntel).includes('44000'), false);
  const da = Engine.decide(ca, { seed: 219 });
  const db = Engine.decide(cb, { seed: 219 });
  assert.deepEqual(da, db);
});

test('a never-observed province leaks no troops, commander or fort', () => {
  const g = newGame(1);
  const ctx = Engine.projectPerception(g, 'qin_shihuang');
  const jing = ctx.provinceIntel.jing_nan;
  assert.equal(jing.source, 'unknown');
  assert.equal(jing.troopBand, 'unknown');
  assert.equal(jing.commander, null);
  assert.equal(jing.fortLevel, null);
  assert.equal(jing.lastSeenTurn, null);
  assert.equal(jing.owner, 'liu_bei');
  assert.equal(JSON.stringify(jing).includes(String(g.state.factions.liu_bei.troops)), false);
});

test('stale province intel stays after adjacency is lost and truth changes', () => {
  const g = newGame(1);
  Engine.observeProvinces(g, 1);
  const remembered = Object.assign({}, g.state.intelLog.provinces.cao_cao.jing_nan);
  assert.ok(remembered.troopBand && remembered.troopBand !== 'unknown');
  g.state.provinces.jing.owner = 'sun_quan';
  g.state.factions.liu_bei.troops = 200000;
  g.state.provinces.jing_nan.fort = 3;
  g.state.governors.jing_nan = 'wei_yan';
  Engine.observeProvinces(g, 4);
  const ctx = Engine.projectPerception(g, 'cao_cao');
  const card = ctx.provinceIntel.jing_nan;
  assert.equal(card.source, 'memory');
  assert.equal(card.troopBand, remembered.troopBand);
  assert.equal(card.commander, remembered.commander);
  assert.equal(card.fortLevel, remembered.fortLevel);
  assert.equal(card.lastSeenTurn, remembered.turn);
  assert.notEqual(card.fortLevel, 3);
});

test('distant battle is absent from player observation and does not leak a battle count', () => {
  const g = newGame(1);
  const before = Engine.ownersSnapshot(g);
  g.state.factions.sun_quan.troops = 400000;
  g.state.factions.liu_bei.troops = 1000;
  const result = Engine.resolveTurn(g, [{ fid: 'sun_quan', action: 'attack', target: 'jing_nan', from: 'jiang', targetKind: 'province' }]);
  const raw = result.events.find((e) => e.kind === 'attack' && e.to === 'jing_nan');
  assert.ok(raw, 'referee still records the battle');
  const obs = Engine.projectTurnObservation(g, 'qin_shihuang', result, before);
  assert.equal(obs.visibleEvents.some((e) => e.kind === 'attack' || e.to === 'jing_nan'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(obs, 'hiddenBattles'), false);
  const blob = JSON.stringify(obs);
  assert.equal(blob.includes('hiddenBattles'), false);
  assert.equal(blob.includes(String(raw.defLoss)), false);
  assert.equal(blob.includes(String(raw.attLoss)), false);
  assert.equal(blob.includes(String(raw.commit)), false);
  if (g.state.provinces.jing_nan.owner === 'sun_quan') {
    const news = obs.publicNews.find((n) => n.kind === 'ownership' && n.prov === 'jing_nan');
    assert.ok(news);
    assert.equal(news.ownerLabel, 'Tôn Quyền');
    assert.equal(news.ownLoss, undefined);
    assert.equal(news.textKey, 'ownership_changed');
  }
});

test('player attack observation keeps own result and hides enemy force', () => {
  const g = newGame(1);
  const before = Engine.ownersSnapshot(g);
  g.state.factions.li_shimin.troops = 120000;
  const result = Engine.resolveTurn(g, [{ fid: 'li_shimin', action: 'attack', target: 'you', from: 'bing', targetKind: 'province' }]);
  const raw = result.events.find((e) => e.kind === 'attack' && e.fid === 'li_shimin');
  assert.ok(raw);
  const obs = Engine.projectTurnObservation(g, 'li_shimin', result, before);
  const vis = obs.visibleEvents.find((e) => e.kind === 'attack' && e.role === 'attacker');
  assert.ok(vis);
  assert.equal(vis.to, 'you');
  assert.equal(vis.from, 'bing');
  assert.equal(vis.ownLoss, raw.attLoss);
  assert.equal(vis.defLoss, undefined);
  assert.equal(vis.commit, undefined);
  assert.equal(JSON.stringify(vis).includes(String(raw.defLoss)), false);
  assert.equal(JSON.stringify(vis).includes(raw.text), false);
});

test('enemy attack on the player hides attacker losses and force', () => {
  const g = newGame(1);
  const before = Engine.ownersSnapshot(g);
  g.state.factions.cao_cao.troops = 400000;
  const result = Engine.resolveTurn(g, [{ fid: 'cao_cao', action: 'attack', target: 'yang', from: 'yu', targetKind: 'province' }]);
  const raw = result.events.find((e) => e.kind === 'attack' && e.to === 'yang');
  assert.ok(raw);
  const obs = Engine.projectTurnObservation(g, 'sun_quan', result, before);
  const vis = obs.visibleEvents.find((e) => e.kind === 'attack' && e.role === 'defender');
  assert.ok(vis);
  assert.equal(vis.to, 'yang');
  assert.equal(vis.from, undefined);
  assert.equal(vis.actorLabel, 'Tào Tháo');
  assert.equal(vis.ownLoss, raw.defLoss);
  assert.equal(JSON.stringify(vis).includes(String(raw.attLoss)), false);
  assert.equal(JSON.stringify(vis).includes(String(raw.commit || '___')), false);
  assert.equal(vis.text, undefined);
});

test('projected observation uses publicLabel, never the raw true name', () => {
  const g = newGame(1);
  const result = {
    turn: 1,
    events: [
      { v: 1, kind: 'gate', id: 'guest_arrival', text: 'Tần Thủy Hoàng đã tới. Tần, Đường, Hán Vũ, Minh đứng Lũng Tây.', actors: ['qin_shihuang'], tone: 'neutral' },
      { v: 1, kind: 'attack', fid: 'qin_shihuang', from: 'longxi', to: 'guan', defenderFid: 'cao_cao', win: false, attLoss: 1111, defLoss: 2222, commit: 3333, text: 'Tần Thủy Hoàng xuất 3333 quân đánh Trường An.', tone: 'bad' },
    ],
  };
  const obs = Engine.projectTurnObservation(g, 'cao_cao', result, { owners: {} });
  const blob = JSON.stringify(obs);
  assert.equal(blob.includes('Tần Thủy Hoàng'), false);
  assert.equal(blob.includes('đã tới'), false);
  assert.ok(blob.includes('Chúa Lũng Tây'));
  const vis = obs.visibleEvents.find((e) => e.kind === 'attack');
  assert.equal(vis.actorLabel, 'Chúa Lũng Tây');
  assert.equal(vis.role, 'defender');
  assert.equal(vis.ownLoss, 2222);
  assert.equal(vis.text, undefined);
  assert.ok(obs.publicNews.some((n) => n.kind === 'gate' && n.id === 'guest_arrival' && !n.text));
});

test('an accepted pact is public news for a third party', () => {
  const g = newGame(1);
  const before = Engine.ownersSnapshot(g);
  let found = null;
  for (let seed = 1; seed <= 40 && !found; seed++) {
    const trial = Engine.restoreGame(world, personas, g.state);
    trial.state.seed = seed;
    trial.state.factions.sun_quan.prestige = 100;
    trial.state.factions.liu_bei.prestige = 100;
    const result = Engine.resolveTurn(trial, [{ fid: 'sun_quan', action: 'diplomacy', sub: 'pact', target: 'liu_bei', targetKind: 'faction' }]);
    const ev = result.events.find((e) => e.kind === 'pact' && e.ok);
    if (ev) found = { result, ev };
  }
  assert.ok(found, 'expected an accepted pact within 40 seeds');
  const obs = Engine.projectTurnObservation(g, 'qin_shihuang', found.result, before);
  const news = obs.publicNews.find((n) => n.kind === 'pact' && n.accepted);
  assert.ok(news);
  assert.equal(news.actorLabel, 'Tôn Quyền');
  assert.equal(news.otherLabel, 'Lưu Bị');
  assert.equal(JSON.stringify(news).includes(found.ev.text), false);
});
