// The Huai Nan scene (src/world/huainan-scene.js): its pure helpers, checked here without a browser, on the fixtures the
// scene is built against (docs/design/v2-fixtures/): what an army's label says (ours exact, near "~", far nothing),
// how many figures an army or a battle wing is drawn with, how far an army reaches, how wings share a cell.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ROOT } from './load.mjs';

const require = createRequire(import.meta.url);
const S = require(path.join(ROOT, 'src/world/huainan-scene.js'));
const fx = (name) => JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/design/v2-fixtures', name), 'utf8'));
const start = fx('view-start.json'), battle = fx('battle-turn3.json');
const army = (id) => start.armies.find((a) => a.id === id);

test('the scene exposes create and the helpers it is built from', () => {
  assert.equal(typeof S.create, 'function');
  for (const k of ['fmt', 'countText', 'unitsOf', 'reachOf', 'figures', 'armySig', 'slotAngle', 'wingCap', 'wingShown', 'wingSlot']) assert.equal(typeof S[k], 'function', k);
  assert.ok(S.GROUND.ford && S.GROUND.wood && S.GROUND.hill && S.GROUND.open, 'the ground kinds a tap explains');
});

test('numbers are written the Vietnamese way', () => {
  assert.equal(S.fmt(3600), '3.600');
  assert.equal(S.fmt(500), '500');
  assert.equal(S.fmt(1234567), '1.234.567');
  assert.equal(S.fmt(0), '0');
});

test('an army label: ours exact, near "~", far nothing (a far army shows only its flag and arms)', () => {
  assert.equal(S.countText(army('a1')), '5.000'); // 3200 + 1000 + 800, seen own
  assert.equal(S.countText(army('a2')), '2.400'); // 600 + 1800
  assert.equal(S.countText(army('e1')), '~6.100'); // seen near
  assert.equal(army('e2').units, null);
  assert.equal(S.countText(army('e2')), '');
  assert.equal(S.menOf(army('e2')), null);
});

test('a far army is drawn from the arms it is known to have, never from a number', () => {
  const e2 = army('e2');
  const u = S.unitsOf(e2);
  assert.deepEqual(Object.keys(u).sort(), ['bo', 'cung', 'ky', 'thuy']);
  assert.ok(u.thuy > 0 && u.bo > 0 && u.cung === 0 && u.ky === 0, 'fleet with foot: only those arms');
  // the same View drawn twice gives the same figures (no hidden truth leaks in through the units)
  assert.deepEqual(S.figures(S.unitsOf({ ...e2, units: null }), true), { thuy: 2 });
  assert.equal(S.armySig(e2), S.armySig({ ...e2 }));
});

test('figures per arm follow the kit caps', () => {
  assert.deepEqual(S.figures({ bo: 3200, cung: 1000, ky: 800, thuy: 0 }, false), { bo: 5, cung: 3, ky: 2, thuy: 0 });
  assert.deepEqual(S.figures({ bo: 99999, cung: 99999, ky: 99999, thuy: 99999 }, false), { bo: 9, cung: 4, ky: 6, thuy: 3 });
  assert.deepEqual(S.figures({ bo: 0, cung: 0, ky: 0, thuy: 1800 }, true), { thuy: 3 });
  assert.deepEqual(S.figures({ bo: 0, cung: 0, ky: 0, thuy: 0 }, true), { thuy: 1 }, 'a fleet is at least one ship');
  assert.notEqual(S.armySig(army('a1')), S.armySig(army('a2')));
});

test('an army is redrawn only when what it looks like changes', () => {
  const a = army('a1');
  assert.equal(S.armySig(a), S.armySig({ ...a, units: { ...a.units, bo: a.units.bo + 50 } }), 'a few men more: the same figures');
  assert.notEqual(S.armySig(a), S.armySig({ ...a, units: { ...a.units, bo: a.units.bo + 1500 } }), 'a good many more: another figure');
  assert.notEqual(S.armySig(a), S.armySig({ ...a, fid: 'cao_cao' }));
});

test('reach of one season: foot 36, horse 45, boats 60', () => {
  assert.equal(S.reachOf(army('a1')), S.REACH.land);
  assert.equal(S.reachOf(army('a2')), S.REACH.fleet);
  assert.equal(S.reachOf(army('e1')), S.REACH.fast, 'more than half horse');
  assert.equal(S.reachOf(army('e2')), S.REACH.fleet);
});

test('armies sharing a town fan out on either side of the first', () => {
  assert.equal(S.slotAngle(0), 0);
  const a = [1, 2, 3, 4].map((k) => S.slotAngle(k));
  assert.deepEqual(a.map(Math.sign), [1, -1, 1, -1]);
  assert.equal(new Set(a.map((v) => v.toFixed(3))).size, 4);
});

test('battle wings: the block shows more figures for more men, none once the wing is gone', () => {
  const W = Object.fromEntries(battle.b.wings.map((w) => [w.id, w]));
  assert.equal(S.wingCap(W.A0), 11); // 1900 foot
  assert.equal(S.wingCap(W.A5), 3); // 1800 boats
  assert.equal(S.wingCap(W.D0), 4);
  for (const w of battle.b.wings) {
    const cap = S.wingCap(w), n = S.wingShown(w, cap);
    assert.ok(n >= 1 && n <= cap, w.id);
    if (w.men >= w.start) assert.equal(n, cap, w.id + ' at full strength');
  }
  assert.equal(S.wingShown({ ...W.A1, men: 0, gone: true }, 5), 0);
  assert.equal(S.wingShown({ ...W.A1, men: 1 }, 5), 1, 'a wing still standing shows at least one figure');
  // over: the routed wings are gone, the rest still stand
  const over = fx('battle-over.json');
  assert.ok(over.b.wings.some((w) => w.gone) && over.b.wings.some((w) => !w.gone));
});

test('wings in one cell take side-by-side slots, the first in the middle', () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(S.wingSlot), [0, 1, -1, 2, -2]);
});

test('the fixture data the scene reads: towns with a seat or a lon/lat, seats, factions with a colour and a glyph', () => {
  const d = fx('data-towns.json');
  assert.ok(d.towns.length >= 5);
  for (const t of d.towns) assert.ok(t.id && t.name && (t.seat || (Array.isArray(t.lonlat) && t.lonlat.length === 2)), t.id);
  for (const s of d.seats) assert.ok(s.id && s.name);
  for (const [k, f] of Object.entries(d.factions)) assert.ok(/^#[0-9a-f]{6}$/i.test(f.color) && f.glyph, k);
  // every owner and every army faction of the Views has a colour
  for (const v of [start, fx('view-season2.json')]) {
    for (const t of v.towns) assert.ok(d.factions[t.owner], t.owner);
    for (const a of v.armies) assert.ok(d.factions[a.fid], a.fid);
  }
});
