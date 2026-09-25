// GameController (src/world/game-controller.js): the playable loop around the real engine, without a browser.
// Checks that every order goes through Engine.fillDecisions + Engine.resolveTurn, that the menu only offers what the
// engine accepts, that the controller itself never changes game state, and that whole games can be played to the end.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ROOT, Engine, world, personas } from './load.mjs';

const require = createRequire(import.meta.url);
const GC = require(path.join(ROOT, 'src/world/game-controller.js'));
const EMPERORS = ['qin_shihuang', 'li_shimin', 'zhu_yuanzhang', 'liu_che'];
const make = (seed = 219) => GC.create({ Engine, world, personas, seed });

// spy on the engine calls the controller makes
function spy(names) {
  const calls = Object.fromEntries(names.map((n) => [n, []])), orig = {};
  for (const n of names) { orig[n] = Engine[n]; Engine[n] = function (...a) { calls[n].push(a); return orig[n].apply(this, a); }; }
  return { calls, restore: () => { for (const n of names) Engine[n] = orig[n]; } };
}
// one order from the menu: attack the best-looking target if any, else internal
function autoOrder(ctrl, k) {
  const op = ctrl.options();
  const kinds = ['attack', 'internal', 'fortify', 'diplomacy', 'stratagem'], kind = kinds[k % kinds.length];
  if (kind === 'attack' && op.attack.length) { const t = op.attack.slice().sort((a, b) => b.ratio - a.ratio)[0]; return ctrl.decision('attack', { target: t.pid, betray: t.pact }); }
  if (kind === 'fortify') return ctrl.decision('fortify', { target: op.fortify[0].pid });
  if (kind === 'diplomacy' && op.diplomacy.annex.length) return ctrl.decision('diplomacy', { sub: 'annex', target: op.diplomacy.annex[0].pid });
  if (kind === 'diplomacy' && op.diplomacy.pact.length) return ctrl.decision('diplomacy', { sub: 'pact', target: op.diplomacy.pact[0].fid });
  if (kind === 'stratagem') return ctrl.decision('stratagem', { sub: 'burn', target: op.stratagem.targets[0].fid });
  return ctrl.decision('internal');
}

test('the four displaced emperors are playable, nobody else', () => {
  const ctrl = make();
  assert.deepEqual(ctrl.playable.slice().sort(), EMPERORS.slice().sort());
  assert.throws(() => ctrl.start('cao_cao'));
  for (const fid of EMPERORS) {
    const s = ctrl.start(fid);
    assert.equal(s.player.fid, fid);
    assert.equal(s.turn, 1);
    assert.deepEqual(s.player.provinces.map((p) => p.pid), Engine.owned(ctrl.game, fid));
    const op = ctrl.options();
    assert.deepEqual(Object.keys(op.available).sort(), Object.keys(Engine.ACTIONS).sort(), 'the five engine actions');
    assert.deepEqual(op.attack.map((t) => t.pid), Engine.frontier(ctrl.game, fid), 'attack targets = engine frontier');
    for (const t of op.attack) assert.ok(t.via.length > 0 && t.via.every((v) => ctrl.game.state.provinces[v.pid].owner === fid), 'each target borders the realm');
  }
});

test('a turn: player order + MOCK agents through fillDecisions, resolved by resolveTurn, RuntimeEvent v1 out', () => {
  const ctrl = make(7);
  ctrl.start('li_shimin');
  const op = ctrl.options(), t = op.attack[0];
  const d = ctrl.decision('attack', { target: t.pid, betray: t.pact });
  assert.equal(ctrl.validate(d), null);
  const s = spy(['fillDecisions', 'resolveTurn']);
  let entry;
  try { entry = ctrl.resolve(d); } finally { s.restore(); }
  assert.equal(s.calls.fillDecisions.length, 1);
  assert.equal(s.calls.fillDecisions[0][1], 'li_shimin');
  assert.equal(s.calls.fillDecisions[0][2], d);
  assert.equal(s.calls.resolveTurn.length, 1);
  const alive = Engine.aliveIds(ctrl.game);
  assert.deepEqual(entry.decisions.map((x) => x.fid).sort(), alive.slice().sort(), 'one decision per living faction');
  const mine = entry.decisions.find((x) => x.fid === 'li_shimin');
  assert.equal(mine.action, 'attack'); assert.equal(mine.target, t.pid);
  for (const x of entry.decisions.filter((x) => x.fid !== 'li_shimin')) assert.ok(Engine.ACTIONS[x.action], 'AI decision for ' + x.fid);
  assert.ok(entry.events.length > 0);
  for (const ev of entry.events) { assert.equal(ev.v, 1); assert.ok(Engine.EVENT_KINDS.includes(ev.kind), ev.kind); assert.equal(ev.defender, undefined); }
  assert.ok(entry.events.some((e) => e.kind === 'gate' && e.id === 'opening'), 'intro gates fire on the first turn');
  assert.ok(entry.events.some((e) => e.kind === 'attack' && e.fid === 'li_shimin' && e.to === t.pid), 'the player attack is resolved');
  assert.equal(ctrl.status().turn, 2);
  // owners come straight from engine state
  for (const [pid, p] of Object.entries(ctrl.game.state.provinces)) assert.equal(ctrl.owners()[pid], p.owner === 'neutral' ? undefined : p.owner);
});

test('guards: one turn at a time, invalid orders never reach the engine', () => {
  const ctrl = make(11);
  ctrl.start('qin_shihuang');
  const before = JSON.stringify(ctrl.game.state);
  const notFrontier = world.provinces.find((p) => !ctrl.options().attack.some((t) => t.pid === p.id) && p.id !== 'longxi').id;
  for (const bad of [ctrl.decision('attack', { target: notFrontier }), ctrl.decision('stratagem', { sub: 'poison', target: 'cao_cao' }), ctrl.decision('fortify', { target: 'yu' }), null]) {
    assert.ok(ctrl.validate(bad));
    assert.throws(() => ctrl.resolve(bad));
  }
  assert.equal(JSON.stringify(ctrl.game.state), before, 'state untouched by rejected orders');
  const s = spy(['fillDecisions', 'resolveTurn']);
  ctrl.resolve(ctrl.decision('internal'));
  assert.throws(() => ctrl.resolve(ctrl.decision('internal')), /already/, 'no second resolve before playback finishes');
  ctrl.finish();
  ctrl.resolve(ctrl.decision('internal'));
  s.restore();
  assert.equal(s.calls.resolveTurn.length, 2);
  assert.equal(ctrl.history.length, 2);
  assert.deepEqual(ctrl.history.map((h) => h.turn), [1, 2]);
});

test('an allied province can only be attacked with betray, as the engine requires', () => {
  const ctrl = make(3);
  ctrl.start('li_shimin');
  const G = ctrl.game, t = ctrl.options().attack.find((x) => x.owner !== 'neutral');
  // a pact set the way the engine records one (both sides, until a turn)
  G.state.factions.li_shimin.pacts[t.owner] = 6; G.state.factions[t.owner].pacts.li_shimin = 6;
  const op = ctrl.options().attack.find((x) => x.pid === t.pid);
  assert.equal(op.pact, true);
  assert.ok(ctrl.validate(ctrl.decision('attack', { target: t.pid })));
  assert.equal(ctrl.validate(ctrl.decision('attack', { target: t.pid, betray: true })), null);
  assert.ok(!ctrl.options().diplomacy.pact.some((x) => x.fid === t.owner), 'no second pact with an ally');
});

test('whole games: every emperor plays turns until the engine ends the game', () => {
  for (const [i, fid] of EMPERORS.entries()) {
    const ctrl = make(100 + i);
    ctrl.start(fid);
    let k = 0;
    while (!ctrl.status().over && k < 60) {
      const alive = ctrl.status().player.alive;
      const entry = ctrl.resolve(alive ? autoOrder(ctrl, k) : null);
      assert.equal(JSON.stringify(entry.events), entry.frozen);
      ctrl.finish();
      k++;
    }
    const s = ctrl.status();
    assert.ok(s.over, fid + ' game ended');
    assert.ok(s.winner && Engine.aliveIds(ctrl.game).includes(s.winner.fid));
    assert.equal(ctrl.options(), null, 'no orders after the end');
    assert.throws(() => ctrl.resolve(ctrl.decision('internal')), /over/);
    assert.ok(ctrl.history.at(-1).events.some((e) => e.kind === 'win'));
    assert.ok(k <= world.rules.maxTurns);
  }
});

test('same seed and same orders replay the same game', () => {
  const run = () => { const c = make(42); c.start('liu_che'); const out = []; for (let k = 0; k < 6; k++) { const e = c.resolve(autoOrder(c, k)); c.finish(); out.push(e.frozen); } return out; };
  assert.deepEqual(run(), run());
});
