import test from 'node:test';
import assert from 'node:assert/strict';
import { Engine, world, personas, newGame } from './load.mjs';

function offerDecisions() {
  return [
    { fid: 'cao_cao', action: 'diplomacy', sub: 'pact', target: 'li_shimin', targetKind: 'faction' },
    { fid: 'li_shimin', action: 'internal', target: 'bing', targetKind: 'province' },
  ];
}

test('incoming pact to the human is a pending reaction and is not auto-accepted', () => {
  const g = newGame(1);
  g.state.playerFid = 'li_shimin';
  const seed = g.state.seed;
  const decisions = offerDecisions();
  const pending = Engine.pendingReactions(g, 'li_shimin', decisions);
  assert.equal(pending.length, 1);
  assert.equal(pending[0].kind, 'pact_offer');
  assert.equal(pending[0].from, 'cao_cao');
  assert.equal(pending[0].to, 'li_shimin');
  assert.equal(pending[0].turns, 6);
  assert.equal(pending[0].id, 'pact:1:cao_cao:li_shimin');
  const blocked = Engine.resolveTurn(g, decisions);
  assert.equal(blocked.blocked, true);
  assert.deepEqual(blocked.pendingReactions, pending);
  assert.equal(g.state.turn, 1);
  assert.equal(g.state.seed, seed);
  assert.equal(Engine.hasPact(g, 'cao_cao', 'li_shimin'), false);
  assert.equal(blocked.events.length, 0);
});

test('accepting a pact offer lasts six turns and rejecting spends the AI action', () => {
  const accepted = newGame(1);
  accepted.state.playerFid = 'li_shimin';
  const decisions = offerDecisions();
  const id = Engine.pendingReactions(accepted, 'li_shimin', decisions)[0].id;
  Engine.answerReaction(accepted, 'li_shimin', id, 'accept');
  const result = Engine.resolveTurn(accepted, decisions);
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
  rejected.state.playerFid = 'li_shimin';
  const beforePrestige = rejected.state.factions.li_shimin.prestige;
  Engine.answerReaction(rejected, 'li_shimin', id, 'reject');
  const denied = Engine.resolveTurn(rejected, decisions);
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
  const a = Engine.pendingReactions(g, 'li_shimin', decisions);
  const b = Engine.pendingReactions(g, 'li_shimin', decisions.slice().reverse());
  assert.deepEqual(a, b);
  assert.deepEqual(a.map((r) => r.id), ['pact:1:cao_cao:li_shimin', 'pact:1:sun_quan:li_shimin']);
  g.state.playerFid = 'li_shimin';
  assert.equal(Engine.resolveTurn(g, decisions).blocked, true);
  Engine.answerReaction(g, 'li_shimin', a[0].id, 'accept');
  assert.equal(Engine.resolveTurn(g, decisions).blocked, true);
  Engine.answerReaction(g, 'li_shimin', a[1].id, 'reject');
  const done = Engine.resolveTurn(g, decisions);
  assert.notEqual(done.blocked, true);
  assert.equal(Engine.hasPact(g, 'cao_cao', 'li_shimin'), true);
  assert.equal(Engine.hasPact(g, 'sun_quan', 'li_shimin'), false);
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

test('save restore keeps province intel, pacts, guest break and reaction answers', () => {
  const g = newGame(3);
  g.state.playerFid = 'li_shimin';
  Engine.observeProvinces(g, 1);
  g.state.guestBroken.qin_shihuang = { cao_cao: true };
  g.state.factions.qin_shihuang.pacts.liu_bei = 9;
  g.state.factions.liu_bei.pacts.qin_shihuang = 9;
  Engine.answerReaction(g, 'li_shimin', 'pact:3:cao_cao:li_shimin', 'reject');
  const copy = Engine.restoreGame(world, personas, g.state);
  assert.deepEqual(copy.state.intelLog.provinces, g.state.intelLog.provinces);
  assert.deepEqual(copy.state.guestBroken, g.state.guestBroken);
  assert.deepEqual(copy.state.factions.qin_shihuang.pacts, g.state.factions.qin_shihuang.pacts);
  assert.deepEqual(copy.state.reactionAnswers, g.state.reactionAnswers);
  assert.equal(copy.state.playerFid, 'li_shimin');
  assert.deepEqual(Engine.projectPerception(copy, 'cao_cao').diplomaticPressure, Engine.projectPerception(g, 'cao_cao').diplomaticPressure);
  assert.deepEqual(Engine.projectPerception(copy, 'cao_cao').provinceIntel, Engine.projectPerception(g, 'cao_cao').provinceIntel);
});
