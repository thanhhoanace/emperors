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

// ---------------------------------------------------------------- the living map (docs/design/v2-polish.md job 5): roads, the season's playback
const MP = require(path.join(ROOT, 'src/world/huainan-map-play.js'));

test('A* finds the cheap way round a costly block, and says when there is no way', () => {
  const nx = 12, nz = 8, cost = new Float32Array(nx * nz).fill(1);
  for (let z = 0; z < 7; z++) cost[z * nx + 6] = 50; // a wall down column 6, open only at the bottom row
  const s = 3 * nx + 1, g = 3 * nx + 10, cells = S.astar(cost, nx, nz, s, g, 1);
  assert.equal(cells[0], s); assert.equal(cells[cells.length - 1], g);
  assert.ok(cells.some((k) => k === 7 * nx + 6), 'through the gap, not the wall');
  for (let k = 1; k < cells.length; k++) { const a = cells[k - 1], b = cells[k]; assert.ok(Math.abs((a % nx) - (b % nx)) <= 1 && Math.abs(((a / nx) | 0) - ((b / nx) | 0)) <= 1, 'steps between neighbours'); }
  const shut = new Float32Array(nx * nz).fill(1); for (let z = 0; z < nz; z++) shut[z * nx + 6] = Infinity;
  assert.equal(S.astar(shut, nx, nz, s, g, 1), null);
});

test('a path: its length, points along it, cut short at either end, rounded and resampled', () => {
  const pts = [[0, 0], [10, 0], [10, 10]];
  assert.equal(S.pathLen(pts), 20);
  const tr = S.track(pts);
  assert.deepEqual(tr.at(0.25).slice(0, 2), [5, 0]);
  assert.deepEqual(tr.at(0.75), [10, 5, 0, 1]);
  assert.deepEqual(tr.at(1).slice(0, 2), [10, 10]);
  const cut = S.cutEnd(pts, 4);
  assert.ok(Math.abs(Math.hypot(cut[cut.length - 1][0] - 10, cut[cut.length - 1][1] - 10) - 4) < 1e-9, 'halts 4 short of the end');
  assert.deepEqual(S.cutStart(pts, 3)[0], [3, 0]);
  const round = S.chaikin(pts, 2);
  assert.deepEqual(round[0], [0, 0]); assert.deepEqual(round[round.length - 1], [10, 10]);
  assert.ok(S.pathLen(round) < 20, 'the corner is cut');
  const rs = S.resample(pts, 0.6);
  for (let k = 1; k < rs.length; k++) assert.ok(Math.hypot(rs[k][0] - rs[k - 1][0], rs[k][1] - rs[k - 1][1]) <= 0.6 + 1e-9);
});

test('a shortcut keeps a road that pays and straightens a staircase that does not', () => {
  const stairs = [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2], [3, 3]];
  assert.deepEqual(S.shortcut(stairs, () => 1, 0.25), [[0, 0], [3, 3]], 'open ground: one straight run');
  const road = [[0, 0], [5, 0], [5, 5]], costAt = (x, z) => (z < 0.5 || x > 4.5 ? 0.5 : 3); // along the road is cheap, across the field dear
  assert.deepEqual(S.shortcut(road, costAt, 0.25), road, 'the road is kept');
});

test('an order badge says what and how many days, foot slower than horse and boats', () => {
  assert.equal(S.marchDays(60, 'land', false), 4);
  assert.equal(S.marchDays(60, 'land', true), 2);
  assert.equal(S.marchDays(60, 'fleet', false), 2);
  assert.equal(S.marchDays(3, 'land', false), 1, 'at least a day');
  assert.equal(S.orderBadge('siege', 3), 'Vây · 3 ngày');
  assert.equal(S.orderBadge('attack', 2), 'Đánh · 2 ngày');
  assert.equal(S.orderBadge('move', 1), 'Tới · 1 ngày');
  assert.ok(Math.abs(S.turn(0.1, 6.2) - (6.2 - 2 * Math.PI - 0.1)) < 1e-9, 'the short way round');
});

const PB = {
  before: { me: 'zhu', armies: [{ id: 'a1', fid: 'zhu', arm: 'land', at: 'cl', gen: { name: 'Chu Nguyên Chương' } }, { id: 'a2', fid: 'zhu', arm: 'fleet', at: 'cl' }, { id: 'e1', fid: 'cao', arm: 'land', at: 'tx', gen: { name: 'Trương Liêu' } }, { id: 'e2', fid: 'wu', arm: 'fleet', at: 'ld' }], towns: [] },
  after: {
    me: 'zhu', pending: true, towns: [{ id: 'hd', name: 'Hu Dị' }],
    armies: [{ id: 'a1', fid: 'zhu', arm: 'land', at: 'hd', besieging: 'hd', gen: { name: 'Chu Nguyên Chương' } }, { id: 'a2', fid: 'zhu', arm: 'fleet', at: 'hd' }, { id: 'e1', fid: 'cao', arm: 'land', at: 'tx', gen: { name: 'Trương Liêu' } }],
    moves: [{ id: 'e2', from: 'ld', to: null, leave: true }, { id: 'a1', from: 'cl', to: 'hd' }, { id: 'e1', from: 'tx', to: 'al', attack: true }, { id: 'a2', from: 'cl', to: 'hd' }, { id: 'ghost', from: 'x', to: 'y' }],
  },
};

test('the playback plays our moves first, then the others, never an army neither View holds', () => {
  const shots = MP.plan(PB.before, PB.after);
  const ids = shots.flatMap((s) => s.moves.map((m) => m.id));
  assert.ok(!ids.includes('ghost'), 'a hidden army plays no part');
  assert.deepEqual(shots.map((s) => s.kind), ['siege', 'march', 'leave', 'attack']);
  assert.deepEqual(shots[0].moves.map((m) => m.id), ['a1']);
  assert.ok(shots.slice(0, 2).every((s) => s.moves.every((m) => m.mine)), 'ours first');
  assert.equal(shots[3].clash, false, 'a battle is pending: the attack halts at its line');
  const total = shots.reduce((n, s) => n + s.ms.march + s.ms.arrive + 250, 0);
  assert.ok(total <= 11000, 'a season in about ten seconds: ' + total);
});

test('many moves squeeze into the budget; a siege that goes on gets a look; an attack between others ends in a clash', () => {
  const armies = [], moves = [];
  for (let k = 0; k < 9; k++) { armies.push({ id: 'z' + k, fid: 'zhu', arm: 'land', at: 't' + k }); moves.push({ id: 'z' + k, from: 's' + k, to: 't' + k }); }
  armies.push({ id: 'e1', fid: 'cao', arm: 'land', at: 'tx' }, { id: 'b1', fid: 'zhu', arm: 'land', at: 'hd', besieging: 'hd' });
  moves.push({ id: 'e1', from: 'tx', to: 'al', attack: true });
  const before = { me: 'zhu', armies: armies.concat([]).map((a) => (a.id === 'b1' ? a : Object.assign({}, a))) };
  const after = { me: 'zhu', pending: false, armies, moves, towns: [{ id: 'hd', name: 'Hu Dị' }], report: { lines: ['Hu Dị bị vây: đồn còn 800, lũy còn 1.'], taken: [] } };
  const shots = MP.plan(before, after);
  assert.ok(shots.length <= 6, shots.length + ' shots');
  assert.equal(shots[shots.length - 1].kind, 'many', 'the tail plays at once');
  const total = shots.reduce((n, s) => n + s.ms.march + s.ms.arrive + 250, 0);
  assert.ok(total <= 11000, String(total));
  const few = MP.plan(before, Object.assign({}, after, { moves: [moves[9]] }));
  assert.deepEqual(few.map((s) => s.kind), ['siegeOn', 'attack']);
  assert.equal(few[0].line, 'Hu Dị bị vây: đồn còn 800, lũy còn 1.');
  assert.equal(few[1].clash, true);
});

test('captions name the general the View names, else the side; the camera looks across a march', () => {
  const shots = MP.plan(PB.before, PB.after);
  assert.equal(MP.say(shots[0].moves[0], 'Hu Dị'), 'Chu Nguyên Chương vây Hu Dị');
  assert.equal(MP.say(shots[2].moves[0], '', 'Ngô'), 'Quân Ngô rời Hoài Nam');
  assert.equal(MP.say(shots[3].moves[0], 'Âm Lăng'), 'Trương Liêu đánh Âm Lăng');
  assert.equal(MP.azFor([0, 0], [10, 0]), 0, 'east: from the south, left to right');
  assert.ok(Math.abs(MP.azFor([0, 0], [-10, 0.5])) < 0.1, 'west: the same side, right to left');
  const ns = MP.azFor([0, 0], [0, 10]);
  assert.ok(Math.abs(ns - 0.3) <= 0.75 + 1e-9, 'never far from north up');
});
