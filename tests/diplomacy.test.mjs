import test from 'node:test';
import assert from 'node:assert/strict';
import { Engine, world, personas, newGame } from './load.mjs';

function offerDecisions() {
  return [
    { fid: 'cao_cao', action: 'diplomacy', sub: 'pact', target: 'li_shimin', targetKind: 'faction' },
    { fid: 'li_shimin', action: 'internal', target: 'bing', targetKind: 'province' },
  ];
}

function sig(decisions) {
  return decisions.map((d) => [d.fid, d.action, d.sub || '', d.target || ''].join(':'));
}

test('human reaction flow does not write state.playerFid', () => {
  const g = newGame(1);
  const env = Engine.turnEnvelope(g, 'li_shimin', offerDecisions());
  assert.equal(g.state.playerFid, undefined);
  assert.equal(g.state.reactionAnswers, undefined);
  assert.equal(env.pendingReactions.length, 1);
  Engine.answerReaction(env, env.pendingReactions[0].id, 'accept');
  const result = Engine.resolvePrepared(g, env);
  assert.equal(g.state.playerFid, undefined);
  assert.equal(g.state.reactionAnswers, undefined);
  assert.equal(g._reaction, undefined);
  assert.equal(result.blocked, undefined);
  assert.equal(g.state.factions.cao_cao.pacts.li_shimin, 7);
});

test('prepare generates AI decisions once and resolve reuses them', () => {
  const g = newGame(4);
  let fills = 0;
  const orig = Engine.fillDecisions;
  const origResolve = Engine.resolveTurn;
  let seen = null;
  Engine.fillDecisions = function () {
    fills += 1;
    return orig.apply(this, arguments);
  };
  Engine.resolveTurn = function (game, decisions) {
    seen = sig(decisions);
    return origResolve.apply(this, arguments);
  };
  try {
    const env = Engine.preparePlayerTurn(g, 'li_shimin', { action: 'internal', target: 'bing', targetKind: 'province' });
    const frozen = sig(env.decisions);
    assert.equal(fills, 1);
    assert.equal(env.decisions.find((d) => d.fid === 'li_shimin').action, 'internal');
    for (const offer of env.pendingReactions) Engine.answerReaction(env, offer.id, 'reject');
    const result = Engine.resolvePrepared(g, env);
    assert.equal(fills, 1);
    assert.deepEqual(sig(env.decisions), frozen);
    assert.deepEqual(seen, frozen);
    assert.notEqual(result.blocked, true);
    assert.equal(g.state.playerFid, undefined);
  } finally {
    Engine.fillDecisions = orig;
    Engine.resolveTurn = origResolve;
  }
});

test('unresolved incoming offer blocks without an auto answer', () => {
  const g = newGame(1);
  const seed = g.state.seed;
  const env = Engine.turnEnvelope(g, 'li_shimin', offerDecisions());
  const blocked = Engine.resolvePrepared(g, env);
  assert.equal(blocked.blocked, true);
  assert.equal(blocked.events.length, 0);
  assert.equal(g.state.turn, 1);
  assert.equal(g.state.seed, seed);
  assert.equal(Engine.hasPact(g, 'cao_cao', 'li_shimin'), false);
  assert.equal(blocked.pendingReactions[0].id, 'pact:1:cao_cao:li_shimin');
});

test('fake or stale reaction ids cannot change the turn', () => {
  const g = newGame(1);
  const env = Engine.turnEnvelope(g, 'li_shimin', offerDecisions());
  assert.throws(() => Engine.answerReaction(env, 'pact:1:nobody:li_shimin', 'accept'), /pending offer/);
  env.pendingReactions.push({ id: 'pact:1:zhu_yuanzhang:li_shimin', kind: 'pact_offer', from: 'zhu_yuanzhang', to: 'li_shimin', turns: 6 });
  assert.throws(() => Engine.answerReaction(env, 'pact:1:zhu_yuanzhang:li_shimin', 'accept'), /pending offer/);
  env.answers['pact:1:nobody:li_shimin'] = 'accept';
  env.answers['pact:1:zhu_yuanzhang:li_shimin'] = 'accept';
  const blocked = Engine.resolvePrepared(g, env);
  assert.equal(blocked.blocked, true);
  assert.equal(Engine.hasPact(g, 'cao_cao', 'li_shimin'), false);
  assert.equal(Engine.hasPact(g, 'zhu_yuanzhang', 'li_shimin'), false);
  Engine.answerReaction(env, 'pact:1:cao_cao:li_shimin', 'accept');
  g.state.turn = 4;
  assert.throws(() => Engine.resolvePrepared(g, env), /stale turn envelope/);
  assert.equal(Engine.hasPact(g, 'cao_cao', 'li_shimin'), false);
  assert.equal(g.state.playerFid, undefined);
});

test('wiping the pending list does not auto-answer the prepared offer', () => {
  const g = newGame(1);
  const seed = g.state.seed;
  const env = Engine.turnEnvelope(g, 'li_shimin', offerDecisions());
  env.pendingReactions = [];
  env.declinedOffers = [];
  const blocked = Engine.resolvePrepared(g, env);
  assert.equal(blocked.blocked, true);
  assert.equal(blocked.pendingReactions[0].id, 'pact:1:cao_cao:li_shimin');
  assert.equal(blocked.events.length, 0);
  assert.equal(g.state.turn, 1);
  assert.equal(g.state.seed, seed);
  assert.equal(Engine.hasPact(g, 'cao_cao', 'li_shimin'), false);
  assert.equal(g.state.playerFid, undefined);
});

test('accepting a pact offer lasts six turns and rejecting spends the AI action', () => {
  const accepted = newGame(1);
  const env = Engine.turnEnvelope(accepted, 'li_shimin', offerDecisions());
  Engine.answerReaction(env, env.pendingReactions[0].id, 'accept');
  const result = Engine.resolvePrepared(accepted, env);
  assert.equal(result.blocked, undefined);
  assert.equal(accepted.state.turn, 2);
  assert.equal(accepted.state.factions.cao_cao.pacts.li_shimin, 7);
  assert.equal(accepted.state.factions.li_shimin.pacts.cao_cao, 7);
  const edge = Engine.projectPerception(accepted, 'qin_shihuang').world.pacts.find((p) => p.a === 'cao_cao' && p.b === 'li_shimin');
  assert.ok(edge);
  assert.equal(edge.untilTurn, 7);
  assert.equal(edge.remainingTurns, 5);
  const news = Engine.projectTurnObservation(accepted, 'qin_shihuang', result, { owners: {} });
  assert.ok(news.publicNews.some((n) => n.kind === 'pact' && n.accepted && n.untilTurn === 7));

  const rejected = newGame(1);
  const denyEnv = Engine.turnEnvelope(rejected, 'li_shimin', offerDecisions());
  const beforePrestige = rejected.state.factions.li_shimin.prestige;
  Engine.answerReaction(denyEnv, denyEnv.pendingReactions[0].id, 'reject');
  const denied = Engine.resolvePrepared(rejected, denyEnv);
  assert.equal(Engine.hasPact(rejected, 'cao_cao', 'li_shimin'), false);
  assert.equal(rejected.state.turn, 2);
  assert.equal(rejected.state.factions.li_shimin.prestige, beforePrestige + 1);
  assert.ok(denied.events.some((e) => e.kind === 'pact' && e.ok === false && e.code === 'rejected'));
  assert.ok(denied.events.some((e) => e.kind === 'internal' && e.fid === 'li_shimin'));
});

test('multiple incoming offers have stable unique ids', () => {
  const g = newGame(1);
  const decisions = [
    { fid: 'sun_quan', action: 'diplomacy', sub: 'pact', target: 'li_shimin', targetKind: 'faction' },
    { fid: 'cao_cao', action: 'diplomacy', sub: 'pact', target: 'li_shimin', targetKind: 'faction' },
    { fid: 'li_shimin', action: 'fortify', target: 'bing', targetKind: 'province' },
  ];
  const a = Engine.turnEnvelope(g, 'li_shimin', decisions);
  const b = Engine.turnEnvelope(g, 'li_shimin', decisions.slice().reverse());
  assert.deepEqual(a.pendingReactions, b.pendingReactions);
  assert.deepEqual(a.pendingReactions.map((r) => r.id), ['pact:1:cao_cao:li_shimin', 'pact:1:sun_quan:li_shimin']);
  assert.equal(Engine.resolvePrepared(g, a).blocked, true);
  Engine.answerReaction(a, a.pendingReactions[0].id, 'accept');
  assert.equal(Engine.resolvePrepared(g, a).blocked, true);
  Engine.answerReaction(a, a.pendingReactions[1].id, 'reject');
  const done = Engine.resolvePrepared(g, a);
  assert.notEqual(done.blocked, true);
  assert.equal(Engine.hasPact(g, 'cao_cao', 'li_shimin'), true);
  assert.equal(Engine.hasPact(g, 'sun_quan', 'li_shimin'), false);
});

test('simultaneous offers only fill remaining pact slots', () => {
  const g = newGame(1);
  g.state.factions.li_shimin.pacts.qin_shihuang = 20;
  g.state.factions.qin_shihuang.pacts.li_shimin = 20;
  const decisions = [
    { fid: 'sun_quan', action: 'diplomacy', sub: 'pact', target: 'li_shimin', targetKind: 'faction' },
    { fid: 'liu_bei', action: 'diplomacy', sub: 'pact', target: 'li_shimin', targetKind: 'faction' },
    { fid: 'cao_cao', action: 'diplomacy', sub: 'pact', target: 'li_shimin', targetKind: 'faction' },
    { fid: 'li_shimin', action: 'internal', target: 'bing', targetKind: 'province' },
  ];
  const env = Engine.turnEnvelope(g, 'li_shimin', decisions);
  assert.deepEqual(env.pendingReactions.map((r) => r.from), ['cao_cao']);
  assert.deepEqual(env.declinedOffers.map((r) => r.from), ['liu_bei', 'sun_quan']);
  assert.ok(env.declinedOffers.every((r) => r.reason === 'pact_full'));
  assert.throws(() => Engine.answerReaction(env, env.declinedOffers[0].id, 'accept'), /pending offer/);
  Engine.answerReaction(env, env.pendingReactions[0].id, 'accept');
  const result = Engine.resolvePrepared(g, env);
  assert.equal(Engine.hasPact(g, 'cao_cao', 'li_shimin'), true);
  assert.equal(Engine.hasPact(g, 'liu_bei', 'li_shimin'), false);
  assert.equal(Engine.hasPact(g, 'sun_quan', 'li_shimin'), false);
  assert.ok(result.events.some((e) => e.code === 'pact_full' && e.fid === 'liu_bei'));
  assert.ok(result.events.some((e) => e.code === 'pact_full' && e.fid === 'sun_quan'));

  const tampered = newGame(1);
  tampered.state.factions.li_shimin.pacts.qin_shihuang = 20;
  tampered.state.factions.qin_shihuang.pacts.li_shimin = 20;
  const again = Engine.turnEnvelope(tampered, 'li_shimin', decisions);
  const extra = again.declinedOffers[0];
  again.pendingReactions.push(extra);
  again.declinedOffers = [];
  Engine.answerReaction(again, extra.id, 'accept');
  Engine.answerReaction(again, 'pact:1:cao_cao:li_shimin', 'accept');
  const kept = Engine.resolvePrepared(tampered, again);
  assert.notEqual(kept.blocked, true);
  assert.equal(Engine.hasPact(tampered, 'cao_cao', 'li_shimin'), true);
  assert.equal(Engine.hasPact(tampered, 'liu_bei', 'li_shimin'), false);
  assert.equal(Engine.hasPact(tampered, 'sun_quan', 'li_shimin'), false);
  assert.ok(kept.events.some((e) => e.code === 'pact_full' && e.fid === extra.from));
});

test('outgoing pact to an AI can be accepted for six turns', () => {
  let hit = null;
  for (let seed = 1; seed <= 50 && !hit; seed++) {
    const g = newGame(1);
    g.state.seed = seed;
    g.state.factions.qin_shihuang.prestige = 100;
    g.state.factions.cao_cao.prestige = 80;
    const result = Engine.resolveTurn(g, [{ fid: 'qin_shihuang', action: 'diplomacy', sub: 'pact', target: 'cao_cao', targetKind: 'faction' }]);
    const ev = result.events.find((e) => e.kind === 'pact' && e.fid === 'qin_shihuang' && e.ok);
    if (ev) hit = { g, ev };
  }
  assert.ok(hit, 'AI target accepted within 50 seeds');
  assert.equal(hit.ev.until, 7);
  assert.equal(hit.ev.turns, 6);
  assert.equal(hit.g.state.factions.qin_shihuang.pacts.cao_cao, 7);
  const edge = Engine.projectPerception(hit.g, 'sun_quan').world.pacts.find((p) => (p.a === 'cao_cao' && p.b === 'qin_shihuang') || (p.a === 'qin_shihuang' && p.b === 'cao_cao'));
  assert.ok(edge);
  assert.equal(edge.untilTurn, 7);
});

test('bloc pressure follows public pacts and borders, not hidden troops', () => {
  const g = newGame(1);
  const alone = Engine.projectPerception(g, 'cao_cao').diplomaticPressure;
  assert.equal(alone.qin_shihuang, 'none');
  assert.equal(alone.li_shimin, 'none');
  g.state.factions.qin_shihuang.pacts.li_shimin = 10;
  g.state.factions.li_shimin.pacts.qin_shihuang = 10;
  g.state.provinces.you.owner = 'li_shimin';
  g.state.provinces.you.garrison = 0;
  g.state.provinces.hexi.owner = 'qin_shihuang';
  const high = Engine.projectPerception(g, 'cao_cao').diplomaticPressure;
  assert.equal(high.qin_shihuang, 'high');
  assert.equal(high.li_shimin, 'high');
  assert.equal(high.sun_quan, 'none');
  assert.equal(Engine.projectPerception(g, 'sun_quan').diplomaticPressure.li_shimin, 'none');
  assert.equal(Engine.projectPerception(g, 'sun_quan').diplomaticPressure.qin_shihuang, 'none');
  const troops = g.state.factions.qin_shihuang.troops;
  g.state.factions.qin_shihuang.troops = 26000;
  const low = Engine.projectPerception(g, 'cao_cao').diplomaticPressure;
  g.state.factions.qin_shihuang.troops = 44000;
  const mid = Engine.projectPerception(g, 'cao_cao').diplomaticPressure;
  g.state.factions.qin_shihuang.troops = troops;
  assert.deepEqual(low, mid);
  assert.deepEqual(low, high);
  g.state.factions.cao_cao.grudge = { fid: 'sun_quan', turn: g.state.turn };
  assert.equal(Engine.projectPerception(g, 'cao_cao').diplomaticPressure.sun_quan, 'high');
});

test('save restore keeps world truth and does not keep session identity', () => {
  const g = newGame(3);
  Engine.observeProvinces(g, 1);
  g.state.guestBroken.qin_shihuang = { cao_cao: true };
  g.state.factions.qin_shihuang.pacts.liu_bei = 9;
  g.state.factions.liu_bei.pacts.qin_shihuang = 9;
  const env = Engine.turnEnvelope(g, 'li_shimin', offerDecisions());
  Engine.answerReaction(env, env.pendingReactions[0].id, 'reject');
  assert.equal(g.state.playerFid, undefined);
  assert.equal(g.state.reactionAnswers, undefined);
  const copy = Engine.restoreGame(world, personas, g.state);
  assert.equal(copy.state.playerFid, undefined);
  assert.equal(copy.state.reactionAnswers, undefined);
  assert.deepEqual(copy.state.intelLog.provinces, g.state.intelLog.provinces);
  assert.deepEqual(copy.state.guestBroken, g.state.guestBroken);
  assert.deepEqual(copy.state.factions.qin_shihuang.pacts, g.state.factions.qin_shihuang.pacts);
  assert.deepEqual(Engine.projectPerception(copy, 'cao_cao').diplomaticPressure, Engine.projectPerception(g, 'cao_cao').diplomaticPressure);
  assert.deepEqual(Engine.projectPerception(copy, 'cao_cao').provinceIntel, Engine.projectPerception(g, 'cao_cao').provinceIntel);
  assert.equal(Engine.projectPerception(copy, 'li_shimin').self.guestProtection.active, Engine.projectPerception(g, 'li_shimin').self.guestProtection.active);
});
