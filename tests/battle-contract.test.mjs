// ASSIGN mục 1: the battle data contract. Every attack RuntimeEvent carries a BattleDescriptor v2 (engine.js, gens by
// attach-219.js), built from numbers the referee already rolled, so it draws no random number (results and balance as
// v1); a party to the battle sees its own side exact and the other side off by up to ±20 % (perception.js).
// docs/product/runtime-event.md, docs/product/perception.md ("Trận"), docs/product/rules.md ("Tấn công").
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Engine, world, newGame, ROOT } from './load.mjs';

const ARMS = ['bo', 'cung', 'ky', 'thuy'];
const P = Object.fromEntries(world.provinces.map((p) => [p.id, p]));
const sum = (u) => ARMS.reduce((a, k) => a + u[k], 0);

function descriptorOk(ev) {
  const b = ev.battle;
  assert.ok(b, 'attack without battle: ' + ev.text);
  assert.equal(b.v, 2);
  assert.equal(b.site, ev.to);
  assert.equal(b.from, ev.from);
  assert.equal(b.terrain, P[b.site].terrain);
  assert.equal(b.river, !!P[b.site].river);
  assert.equal(b.siege, true);
  assert.ok(Number.isInteger(b.walls) && b.walls >= 1 && b.walls <= 4, 'walls ' + b.walls);
  assert.equal(b.attacker.fid, ev.fid);
  assert.equal(b.defender.fid, ev.defenderFid);
  assert.equal(b.defender.holding, true);
  for (const s of [b.attacker, b.defender]) {
    assert.deepEqual(Object.keys(s.units).sort(), ARMS.slice().sort());
    for (const k of ARMS) assert.ok(Number.isInteger(s.units[k]) && s.units[k] >= 0, k);
    assert.equal(sum(s.units), s.men, 'units add up to the men');
  }
  if (!b.river) { assert.equal(b.attacker.units.thuy, 0); assert.equal(b.defender.units.thuy, 0); }
  if (!(P[b.from] && P[b.from].river)) assert.equal(b.attacker.units.thuy, 0, 'no boats from a province off the rivers');
  assert.equal(b.result.win, ev.win);
  assert.equal(b.result.routed, ev.win ? 'D' : 'A');
  assert.ok([3, 4, 5].includes(b.result.turns));
  assert.equal(b.result.losses.A, ev.attLoss);
  assert.equal(b.result.losses.D, ev.defLoss);
  assert.equal(b.attacker.gen, ev.actorChar || null);
  assert.equal(b.defender.gen, ev.defenderChar || null);
}

test('every attack in a full game carries a BattleDescriptor v2', () => {
  let n = 0;
  for (const seed of [1, 7, 2026]) {
    const g = newGame(seed);
    while (!g.state.over) {
      for (const ev of Engine.playTurn(g).events) {
        if (ev.kind !== 'attack') continue;
        descriptorOk(ev);
        n++;
      }
    }
  }
  assert.ok(n > 30, 'attacks seen: ' + n);
});

test('the attacker brings what v1 committed; the split follows the faction arm mix', () => {
  const g = newGame(1);
  g.state.factions.sun_quan.troops = 90000;
  const r = Engine.resolveTurn(g, [{ fid: 'sun_quan', action: 'attack', target: 'jing_nan', from: 'jiang', targetKind: 'province' }]);
  const ev = r.events.find((e) => e.kind === 'attack');
  descriptorOk(ev);
  const b = ev.battle, mix = world.factions.find((f) => f.id === 'sun_quan').arms;
  assert.equal(b.attacker.men, ev.commit);
  // river to river: the fleet sails; each arm within a man of its share
  for (const k of ARMS) assert.ok(Math.abs(b.attacker.units[k] - b.attacker.men * mix[k]) <= 1, k);
  assert.ok(b.attacker.units.thuy > b.attacker.units.ky, 'Ngô: more boats than horse');
  assert.equal(b.attacker.gen, 'lu_meng');
  assert.equal(b.defender.gen, 'guan_yu');
});

test('splitArms: whole men, exact total, boats on foot off the water', () => {
  const mix = { bo: 0.45, cung: 0.25, ky: 0.05, thuy: 0.25 };
  for (const men of [0, 1, 7, 999, 12345, 40001]) {
    const wet = Engine.splitArms(men, mix, true), dry = Engine.splitArms(men, mix, false);
    assert.equal(sum(wet), men);
    assert.equal(sum(dry), men);
    assert.equal(dry.thuy, 0);
    assert.ok(Math.abs(dry.bo - wet.bo - wet.thuy) <= 1);
  }
});

test('walls are 1 + the fort level the attacker faced, read before the capture resets it', () => {
  const g = newGame(1);
  g.state.provinces.you.fort = 2;
  g.state.factions.li_shimin.troops = 400000;
  const r = Engine.resolveTurn(g, [{ fid: 'li_shimin', action: 'attack', target: 'you', from: 'bing', targetKind: 'province' }]);
  const ev = r.events.find((e) => e.kind === 'attack');
  assert.equal(ev.win, true);
  assert.equal(ev.battle.walls, 3);
  assert.equal(g.state.provinces.you.fort, 0);
});

test('the descriptor draws no random number: whole games end as they did before it (v1 results, balance)', () => {
  // taken from the engine at 43818bb, before the descriptor existed
  const V1 = {
    1: { winner: { fid: 'sun_quan', kind: 'hegemon' }, turn: 48, seed: 3861616812, attacks: 89, loss: 1528095 },
    99: { winner: { fid: 'cao_cao', kind: 'hegemon' }, turn: 48, seed: 1856710903, attacks: 131, loss: 1877018 },
    2026: { winner: { fid: 'li_shimin', kind: 'hegemon' }, turn: 48, seed: 382734502, attacks: 87, loss: 1667272 },
  };
  for (const [seed, want] of Object.entries(V1)) {
    const g = newGame(Number(seed));
    let attacks = 0, loss = 0;
    while (!g.state.over) for (const e of Engine.playTurn(g).events) if (e.kind === 'attack') { attacks++; loss += (e.attLoss || 0) + (e.defLoss || 0); }
    assert.deepEqual({ winner: g.state.winner, turn: g.state.turn, seed: g.state.seed, attacks, loss }, want, 'seed ' + seed);
  }
});

test('the attacker sees its own side exact and the defender within ±20 %, to the hundred', () => {
  const g = newGame(1);
  const before = Engine.ownersSnapshot(g);
  g.state.factions.cao_cao.troops = 300000;
  const r = Engine.resolveTurn(g, [{ fid: 'cao_cao', action: 'attack', target: 'yang', from: 'yu', targetKind: 'province' }]);
  const raw = r.events.find((e) => e.kind === 'attack' && e.fid === 'cao_cao').battle;
  const atk = Engine.projectTurnObservation(g, 'cao_cao', r, before).visibleEvents.find((e) => e.role === 'attacker').battle;
  assert.deepEqual(atk.attacker.units, raw.attacker.units);
  assert.equal(atk.attacker.men, raw.attacker.men);
  assert.equal(atk.attacker.approx, false);
  assert.equal(atk.from, 'yu');
  assert.equal(atk.defender.approx, true);
  assert.equal(atk.defender.gen, null, 'the enemy general is not named');
  for (const k of ARMS) {
    const t = raw.defender.units[k], e = atk.defender.units[k];
    assert.equal(e % 100, 0, k);
    if (!t) assert.equal(e, 0, k);
    else assert.ok(e >= Math.min(100, t) && Math.abs(e - t) <= t * 0.2 + 50 + (t < 100 ? 100 : 0), `${k}: ${e} vs ${t}`);
  }
  assert.equal(atk.result.losses.A, raw.result.losses.A);
  assert.ok(Math.abs(atk.result.losses.D - raw.result.losses.D) <= raw.result.losses.D * 0.2 + 50);
  // the same look again gives the same numbers (no re-roll)
  const again = Engine.projectTurnObservation(g, 'cao_cao', r, before).visibleEvents.find((e) => e.role === 'attacker').battle;
  assert.deepEqual(again, atk);
});

test('the defender sees its own side exact, the attacker blurred, and not where it came from', () => {
  const g = newGame(1);
  const before = Engine.ownersSnapshot(g);
  g.state.factions.cao_cao.troops = 300000;
  const r = Engine.resolveTurn(g, [{ fid: 'cao_cao', action: 'attack', target: 'yang', from: 'yu', targetKind: 'province' }]);
  const raw = r.events.find((e) => e.kind === 'attack' && e.fid === 'cao_cao');
  const dfn = Engine.projectTurnObservation(g, 'sun_quan', r, before).visibleEvents.find((e) => e.role === 'defender').battle;
  assert.equal(dfn.from, undefined);
  assert.deepEqual(dfn.defender.units, raw.battle.defender.units);
  assert.equal(dfn.defender.gen, raw.battle.defender.gen);
  assert.equal(dfn.attacker.approx, true);
  assert.equal(dfn.attacker.gen, null);
  const blob = JSON.stringify(dfn);
  assert.equal(blob.includes(String(raw.commit)), false);
  assert.equal(blob.includes(String(raw.attLoss)), false);
});

test('a battle far from the observer stays out of its observation', () => {
  const g = newGame(1);
  const before = Engine.ownersSnapshot(g);
  g.state.factions.sun_quan.troops = 400000;
  const r = Engine.resolveTurn(g, [{ fid: 'sun_quan', action: 'attack', target: 'jing_nan', from: 'jiang', targetKind: 'province' }]);
  const obs = Engine.projectTurnObservation(g, 'qin_shihuang', r, before);
  const blob = JSON.stringify(obs);
  assert.equal(blob.includes('"battle"'), false);
  assert.equal(blob.includes('"units"'), false);
});

test('the attack fixtures carry the descriptor', () => {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/scenario/runtime-events.v1.json'), 'utf8'));
  const attacks = raw.events.filter((e) => e.kind === 'attack');
  assert.ok(attacks.length >= 2);
  for (const ev of attacks) descriptorOk(ev);
});
