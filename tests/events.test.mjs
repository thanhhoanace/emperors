import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Engine, world, personas, newGame, ROOT } from './load.mjs';

const KINDS = new Set(Engine.EVENT_KINDS);

function runtimeOk(ev) {
  assert.equal(ev.v, 1);
  assert.ok(KINDS.has(ev.kind), ev.kind);
  assert.equal(ev.defender, undefined, 'RuntimeEvent v1 must not use raw defender');
  assert.ok(typeof ev.text === 'string');
}

test('running world is autumn 219 with 20 provinces', () => {
  assert.equal(world.meta.startYear, 219);
  assert.equal(world.provinces.length, 20);
  assert.ok(world.gatesPack.gates.length >= 8);
});

test('intro fires opening then guest_arrival and does not dump tension gates', () => {
  const g = newGame(7);
  const r = Engine.playTurn(g);
  const gates = r.events.filter((e) => e.kind === 'gate');
  assert.deepEqual(gates.map((e) => e.id), ['opening', 'guest_arrival']);
  gates.forEach(runtimeOk);
  assert.ok(g.state.firedGates.includes('opening'));
  assert.ok(g.state.firedGates.includes('guest_arrival'));
});

test('once gates fire only once', () => {
  const g = newGame(7);
  Engine.playTurn(g);
  const fired = g.state.firedGates.slice();
  Engine.playTurn(g);
  for (const id of fired) {
    assert.equal(g.state.firedGates.filter((x) => x === id).length, 1, id);
  }
});

test('firedGates survives restoreGame', () => {
  const g = newGame(11);
  Engine.playTurn(g);
  const fired = g.state.firedGates.slice();
  const copy = Engine.restoreGame(world, personas, g.state);
  assert.deepEqual(copy.state.firedGates, fired);
  const r = Engine.playTurn(copy);
  assert.ok(!r.events.some((e) => e.kind === 'gate' && e.id === 'opening'));
});

test('post_turn emits at most one tension gate per turn', () => {
  const g = newGame(3);
  const seen = [];
  for (let i = 0; i < 12 && !g.state.over; i++) {
    const r = Engine.playTurn(g);
    const tension = r.events.filter((e) => e.kind === 'gate' && e.id !== 'opening' && e.id !== 'guest_arrival');
    assert.ok(tension.length <= 1, tension.map((e) => e.id).join(','));
    seen.push(...tension.map((e) => e.id));
  }
  assert.equal(new Set(seen).size, seen.length);
});

test('unknown predicate does not match', () => {
  const g = newGame(1);
  assert.equal(Engine.matchPred(g, { notARealPred: true }), false);
  assert.equal(Engine.matchPred(g, { turnLte: 1 }), true);
});

test('attack normalization splits defender faction and character', () => {
  const g = newGame(1);
  g.state.factions.li_shimin.troops = 90000;
  const r = Engine.resolveTurn(g, [{ fid: 'li_shimin', action: 'attack', target: 'you', targetKind: 'province' }]);
  const hit = r.events.find((e) => e.kind === 'attack');
  assert.ok(hit);
  runtimeOk(hit);
  assert.equal(hit.defenderFid, 'neutral');
  assert.equal(hit.defenderChar, 'gongsun_kang');
  assert.ok(hit.actorChar);
});

test('fixtures satisfy RuntimeEvent v1', () => {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/scenario/runtime-events.v1.json'), 'utf8'));
  assert.equal(raw.v, 1);
  raw.events.forEach(runtimeOk);
});

test('same seed still replays after gate wiring', () => {
  const run = () => {
    const g = newGame(2026);
    const log = [];
    while (!g.state.over) log.push(...Engine.playTurn(g).events.map((e) => `${e.kind}:${e.id || e.to || e.prov || ''}`));
    return { log, winner: g.state.winner, turn: g.state.turn };
  };
  assert.deepEqual(run(), run());
});
