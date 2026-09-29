// FieldBattle (src/world/battle-field.js): the pure parts of the battle in the open — the deployment from the troops
// (the engine's own), the lane geometry, the river and the road, where every block and figure stands in each mode,
// the sun for an hour of a season, the land built for Nature, and that all of it follows the seed. The look is judged
// in the browser harness docs/design/prototypes/field.html. Claude's lane (docs/product/lanes.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const require = createRequire(path.join(ROOT, 'package.json'));
const THREE = { ...require('three') };
THREE.ColorManagement.legacyMode = false;
const EB = require(path.join(ROOT, 'src/engine/battle.js'));
// the context keeps its own Math (a Math passed in from outside is ten times slower to call from inside)
const ctx = vm.createContext({ THREE, console, document: { createElement: () => ({ getContext: () => ({}) }) } });
ctx.window = ctx;
for (const f of ['src/world/nature.js', 'src/world/battle-field.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
const { FieldBattle: FB, Nature } = ctx;
const fixture = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/design/v2-fixtures', f), 'utf8'));

const ZHU = { fid: 'zhu_yuanzhang', color: '#b3262e', glyph: '明', name: 'Chu Nguyên Chương', troops: { bo: 3800, cung: 1000, ky: 800, thuy: 1800 } };
const LIAO = { fid: 'cao_cao', color: '#4d6a3a', glyph: '魏', name: 'Tào', troops: { bo: 2000, cung: 500, ky: 3500 } };
const desc = (o = {}) => ({ attacker: ZHU, defender: LIAO, lanes: ['open', 'ford', 'wood'], season: 'Thu', seed: 7, mode: 'deploy', ...o });
const plain = (x) => JSON.parse(JSON.stringify(x));
const inside = (b, l) => b.x - b.F / 2 >= l.x0 - 1e-6 && b.x + b.F / 2 <= l.x1 + 1e-6;

test('normalize: defaults, bad lanes to open, a ford brings its river, season names, a result in result mode', () => {
  const d = FB.normalize({});
  assert.deepEqual(plain(d.lanes), ['open', 'open', 'open']);
  assert.equal(d.river, false); assert.equal(d.season, 'Thu'); assert.equal(d.mode, 'deploy'); assert.equal(d.hour, null); assert.equal(d.seed, 1);
  const e = FB.normalize({ lanes: ['hill', 'swamp', 'ford'], season: 'winter', mode: 'result', seed: -12.7 });
  assert.deepEqual(plain(e.lanes), ['hill', 'open', 'ford']);
  assert.equal(e.river, true); assert.equal(e.season, 'Đông'); assert.equal(e.result, 'A'); assert.equal(e.seed, 12);
  assert.equal(FB.normalize({ result: 'loss' }).result, 'D');
  assert.deepEqual(plain(FB.normalize({ mode: 'clash', fire: 2 }).fire), [{ lane: 2, side: 'A' }]);
  assert.equal(FB.normalize({ attacker: { color: '#b3262e' } }).attacker.color, 0xb3262e);
});

test('wingsOf: the engine deploys a field army the same way (arm, men, lane, row)', () => {
  const sets = [{ bo: 3200, cung: 1000, ky: 800 }, { bo: 2000, cung: 500, ky: 3500 }, { bo: 900, ky: 2600, thuy: 1800 }, { thuy: 3000, bo: 1000 }, { bo: 5000, cung: 1200, ky: 2400, thuy: 600 }, { bo: 150, ky: 90 }];
  for (const u of sets) {
    const b = EB.create({ site: 'x', siege: false, walls: 0, lanes: ['open', 'open', 'open'], seed: 1, attacker: { fid: 'a', gen: null, units: u }, defender: { fid: 'd', gen: null, units: u } });
    for (const side of ['A', 'D']) {
      const mine = FB.wingsOf(u, side).map((w) => [w.arm, w.men, w.lane, w.row]), theirs = b.wings.filter((w) => w.side === side).map((w) => [w.arm, w.men, w.lane, w.row]);
      assert.deepEqual(plain(mine), theirs, JSON.stringify(u) + ' ' + side);
    }
  }
});

test('lanes: 170–250 m, left to right, centred; the river gap only beside a ford lane', () => {
  for (const lanes of [['open', 'ford', 'wood'], ['ford', 'open', 'open'], ['wood', 'open', 'ford'], ['hill', 'open', 'wood'], ['open', 'open', 'open']]) {
    const p = FB.plan(desc({ lanes }), 'high'), L = p.lanes, f = lanes.indexOf('ford');
    assert.equal(L.length, 3);
    for (const l of L) { assert.ok(l.w >= 170 && l.w <= 250, lanes + ' ' + l.w); assert.equal(l.x1 - l.x0, l.w); assert.equal(l.kind, lanes[l.i]); }
    for (let i = 0; i < 2; i++) { const gap = L[i + 1].x0 - L[i].x1; assert.equal(gap, f >= 0 && (f === i || f === i + 1) ? 70 : 0, lanes + ' gap ' + i); }
    assert.ok(Math.abs(L[0].x0 + L[2].x1) < 1e-6, 'centred');
    assert.equal(p.width, L[2].x1 - L[0].x0);
    assert.equal(!!p.river, f >= 0);
  }
  assert.ok(FB.plan(desc({ lanes: ['open', 'open', 'open'], river: true }), 'high').river, 'a river without a ford runs behind the attacker');
});

test('the river bends across the ford lane between the hosts and keeps off every other block', () => {
  for (const lanes of [['open', 'ford', 'wood'], ['ford', 'open', 'open'], ['wood', 'open', 'ford']]) {
    const p = FB.plan(desc({ lanes }), 'high'), l = p.lanes[lanes.indexOf('ford')], R = p.river;
    const near = R.pts.reduce((a, q) => (Math.hypot(q[0] - l.cx, q[1]) < Math.hypot(a[0] - l.cx, a[1]) ? q : a));
    assert.ok(Math.hypot(near[0] - l.cx, near[1]) < 4, 'the ford at the lane centre, between the lines');
    assert.ok(near[4] > 0.9 && near[3] > -1.6, 'wide and shallow there');
    assert.ok(R.pts.some((q) => q[3] < -4), 'deep in its arms');
    // no block of the deployment stands in the water (its footprint clear of every stretch of river)
    for (const b of p.blocks.filter((q) => !q.boat)) for (const q of R.pts) {
      const dx = Math.max(Math.abs(q[0] - b.x) - b.F / 2, 0), dz = Math.max(Math.abs(q[1] - b.z) - b.depth / 2, 0);
      assert.ok(Math.hypot(dx, dz) > q[2] + 2, `${lanes} ${b.id} in the river at ${q[0].toFixed(0)},${q[1].toFixed(0)}`);
    }
    // the road crosses at the ford
    const rz = p.road.reduce((a, q) => (Math.abs(q[1]) < Math.abs(a[1]) ? q : a));
    assert.ok(Math.abs(rz[0] - l.cx) < 5, 'the road fords the river');
  }
});

test('deployment from the troops: blocks in their lanes, the attacker south facing north, figures per man within the tier cap', () => {
  for (const tier of ['high', 'mid', 'low']) {
    const p = FB.plan(desc(), tier), cap = { high: 3200, mid: 2200, low: 1000 }[tier];
    assert.ok(p.figs.length <= cap, tier + ' ' + p.figs.length);
    for (const b of p.blocks) {
      if (!b.boat) assert.ok(inside(b, p.lanes[b.lane]), `${tier} ${b.id} outside lane ${b.lane}`);
      assert.equal(b.state, 'stand');
      assert.ok(b.side === 'A' ? b.z > 40 : b.z < -40, b.id + ' ' + b.z);
      assert.ok(Math.abs(b.figs.length - b.n) <= 0, b.id); // every figure placed in a deployment
      for (const f of b.figs) assert.ok(Math.abs(Math.cos(f[2] - b.yaw)) > 0.9, 'facing the enemy');
      const k = b.n / (b.w.men * (b.boat ? 0.4 : 1));
      assert.ok(Math.abs(k - p.k) < p.k * 0.5 + 0.02 || b.n <= 8, `${b.id} ${k} vs ${p.k}`);
    }
    // rows: the foot ahead of the archers, the horse no farther forward than the foot
    const A = p.blocks.filter((b) => b.side === 'A');
    for (const c of A.filter((b) => b.arm === 'cung')) for (const f of A.filter((b) => b.arm === 'bo')) assert.ok(c.z > f.z);
    assert.ok(p.boats.length >= 1 && p.boats.every((b) => b[3] === 'A'), 'the attacker has boats on the river');
    assert.ok(p.flags.length >= p.blocks.filter((b) => !b.boat).length, 'a flag at least per block');
    assert.ok(p.posts.A.z > Math.max(...A.map((b) => b.z)), 'the post behind the line');
  }
});

test('clash: in every lane both sides hold, the front ranks meet at the contact; archers shoot from behind', () => {
  const p = FB.plan(desc({ mode: 'clash' }), 'high');
  for (const l of p.lanes) {
    const a = p.blocks.filter((b) => b.lane === l.i && b.side === 'A' && (b.state === 'fight' || b.state === 'charge')), d = p.blocks.filter((b) => b.lane === l.i && b.side === 'D' && (b.state === 'fight' || b.state === 'charge'));
    assert.ok(a.length && d.length, 'lane ' + l.i);
    for (const b of a) assert.ok(Math.abs(b.z - b.depth / 2 - l.zc - 0.8) < 1e-6, b.id);
    for (const b of d) assert.ok(Math.abs(b.z + b.depth / 2 - l.zc + 0.8) < 1e-6, b.id);
    assert.deepEqual(plain(l.front), [l.cx, +l.zc.toFixed(1)]);
  }
  for (const b of p.blocks.filter((q) => q.arm === 'cung')) { assert.equal(b.state, 'shoot'); assert.ok(Math.abs(b.z - p.lanes[b.lane].zc) > 60); }
  assert.ok(p.fallen.length > 20 && p.arrowsIn.length > 50, 'the fallen and the spent arrows between the lines');
  assert.ok(p.figs.some((f) => f[4] === 'front') && p.figs.some((f) => f[4] === 'charge'));
});

test('result: the loser streams back, the victor holds and pursues, his standard forward, the loser\'s down', () => {
  for (const V of ['A', 'D']) {
    const p = FB.plan(desc({ mode: 'result', result: V }), 'high'), Lo = V === 'A' ? 'D' : 'A';
    for (const b of p.blocks.filter((q) => q.side === Lo && !q.boat)) assert.equal(b.state, 'rout', b.id);
    for (const b of p.blocks.filter((q) => q.side === V && !q.boat)) assert.ok(['hold', 'pursue', 'stand'].includes(b.state), b.id + ' ' + b.state);
    const run = p.figs.filter((f) => f[4] === 'rout' || f[4] === 'flee');
    assert.ok(run.length > 100);
    const dz = Lo === 'D' ? -1 : 1; // the loser runs back toward his own side
    for (const f of run) assert.ok(Math.cos(f[2] - Math.atan2(-dz, 0)) > -0.2, 'running away');
    assert.ok(p.gens[V].forward && p.gens[Lo].down && p.posts[Lo].abandoned);
  }
});

test('the engine\'s live wings: the lanes, rows, the routed and the gone as the battle has them', () => {
  const b = EB.create(fixture('battle-turn1.json').plan);
  const view = EB.view(fixture('battle-turn3.json').b);
  const p = FB.plan(desc({ wings: view, mode: 'clash' }), 'high');
  for (const w of view.filter((x) => !x.left && x.men > 0)) { const bl = p.blocks.find((q) => q.id === w.id); assert.ok(bl, w.id); assert.equal(bl.lane, w.lane); assert.equal(bl.arm, w.arm); }
  const over = EB.view(fixture('battle-over.json').b), q = FB.plan(desc({ wings: over, mode: 'clash' }), 'high');
  for (const w of over.filter((x) => x.routed && x.men > 0)) assert.equal(q.blocks.find((z) => z.id === w.id).state, 'rout', w.id);
  assert.ok(b.wings.length > 0);
});

test('determinism: the same seed, the same field to the figure; another seed, another field', () => {
  for (const mode of ['deploy', 'clash', 'result']) {
    const a = FB.plan(desc({ mode }), 'mid'), b = FB.plan(desc({ mode }), 'mid'), c = FB.plan(desc({ mode, seed: 8 }), 'mid');
    for (const k of ['figs', 'fallen', 'boats', 'reeds', 'extra', 'flags', 'road', 'arrowsIn', 'hamlets']) assert.deepEqual(plain(a[k]), plain(b[k]), mode + ' ' + k);
    assert.notDeepEqual(plain(a.figs), plain(c.figs));
  }
});

test('sunAt: golden hour in the west at 17.5 in autumn, higher and whiter at noon, a low winter sun', () => {
  const ev = FB.sunAt(17.5, 'Thu'), noon = FB.sunAt(12.25, 'Thu');
  assert.ok(ev.elevation > 8 && ev.elevation < 20, ev.elevation);
  assert.ok(ev.dir[0] < -0.85 && ev.dir[1] > 0, 'west, above the horizon');
  assert.ok(Math.abs(Math.hypot(...ev.dir) - 1) < 1e-9);
  assert.ok(ev.color[2] < ev.color[1] && ev.color[1] < ev.color[0], 'warm');
  assert.ok(noon.elevation > 45 && noon.color[2] > ev.color[2] && noon.dir[2] > 0, 'noon: high, whiter, in the south');
  assert.ok(FB.sunAt(12.2, 'Hạ').elevation > FB.sunAt(12.2, 'Đông').elevation + 30);
  assert.ok(FB.sunAt(8, 'Thu').dir[0] > 0.5, 'morning in the east');
  assert.ok(FB.sunAt(3, 'Thu').elevation >= 3 && FB.sunAt(23, 'Thu').elevation >= 3, 'clamped to the day');
});

test('land: Nature\'s L for the plan — a shallow ford, deep arms, the hill\'s brow, woods cleared round the blocks', () => {
  const p = FB.plan(desc({ lanes: ['hill', 'ford', 'wood'] }), 'high'), L = FB.land(p, Nature);
  for (const k of ['EXT', 'WATER', 'h', 'slope', 'waterSD', 'riverSD', 'roadD', 'woodAt', 'fieldAt', 'trampled', 'hills', 'landTex', 'CAMP_R', 'campIn', 'cheb', 'MOAT1', 'HILLS_C']) assert.ok(L[k] !== undefined, k);
  const ford = p.lanes[1], hill = p.lanes[0], wood = p.lanes[2];
  const hf = L.h(ford.cx, 0); assert.ok(hf < L.WATER && hf > L.WATER - 0.9, 'the ford is wadeable: ' + hf);
  const arm = p.river.pts.find((q) => q[3] < -4); assert.ok(L.h(arm[0], arm[1]) < L.WATER - 2, 'the arms are deep');
  assert.ok(L.h(hill.cx, -95) - L.h(hill.cx, 30) > 15, 'the defender stands on the brow');
  assert.ok(L.h(0, -1500) > 20 && L.h(0, 3500) > 60, 'ridges behind, mountains far off');
  for (const b of p.blocks.filter((q) => !q.boat)) assert.equal(L.woodAt(b.x, b.z), 0, b.id);
  let dense = 0; for (let x = wood.x0 + 20; x < wood.x1 - 20; x += 10) dense += L.woodAt(x, -220) > 0.5 ? 1 : 0;
  assert.ok(dense > 8, 'forest behind the defender in the wood lane');
  assert.ok(L.trampled(p.blocks[0].x, p.blocks[0].z) > 0.3 && L.roadD(p.road[140][0], p.road[140][1]) < 1);
  assert.ok(L.campIn(0, 0) < -1e6 && L.cheb(0, 0) > L.MOAT1 + 20, 'no city, no camp');
  for (let i = 0; i < 400; i++) { const x = (i % 20) * 160 - 1600, z = Math.floor(i / 20) * 160 - 1600; assert.ok(Number.isFinite(L.h(x, z))); }
});
