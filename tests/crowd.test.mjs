// Crowd (src/world/crowd.js) through the real model kit, without a GPU: rigs, poses, the baked frame textures, the
// instanced meshes and their LOD buckets, the motion helpers the shader mirrors, handles, moves and loops scheduled
// ahead, and the crowd's triangle budget per tier. Claude's lane (docs/product/lanes.md); the look is checked in the
// browser harness docs/design/prototypes/crowd.html (?demo=charge|volley|clash|rout|cheer).
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
const canvas = () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: (_, k) => (k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {}) }) });
const ctx = vm.createContext({ THREE, console, Math, document: { createElement: canvas } });
ctx.window = ctx;
const load = (f) => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
for (const f of ['node_modules/three/examples/js/utils/BufferGeometryUtils.js', 'node_modules/three/examples/js/geometries/RoundedBoxGeometry.js', 'docs/phases/v2-gameplay/demo1/src/hn-models.js', 'src/world/crowd.js']) load(f);
const { Crowd, HNModels } = ctx;
const HM = HNModels.create({ recv: (m) => m, colors: { tao: 0x9a3b2c, luu: 0x2f6b3a } });
const BODIES = ['foot', 'bow', 'climb', 'pull', 'rider', 'horse'];
const FIDS = { tao: 0x9a3b2c, luu: 0x2f6b3a };

// joints of a pose through the bone skeleton (the same forward kinematics as the bake)
const joints = (body, anim, t) => {
  const sk = Crowd.skeleton(body), pose = Crowd.pose(body, anim, t), mats = [];
  const E = new THREE.Euler(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3(1, 1, 1), M = new THREE.Matrix4();
  sk.bones.forEach((b, i) => {
    const pp = pose[b.name], p = (pp && pp.p) || [0, 0, 0], r = (pp && pp.r) || [0, 0, 0];
    E.set(r[0], r[1], r[2], 'YZX'); Q.setFromEuler(E); V.set(b.pos[0] + p[0], b.pos[1] + p[1], b.pos[2] + p[2]); M.compose(V, Q, S);
    mats[i] = new THREE.Matrix4(); if (b.parent < 0) mats[i].copy(M); else mats[i].multiplyMatrices(mats[b.parent], M);
  });
  return (bone, x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z).applyMatrix4(mats[sk.names[bone]]);
};
// the highest point of a baked frame
const topOf = (bk, V, f) => { let y = -Infinity; for (let i = 0; i < V; i++) { const r = Math.floor(i / bk.W), c = i - r * bk.W; y = Math.max(y, bk.data[((f * bk.R + r) * bk.W + c) * 4 + 1]); } return y; };
const lowOf = (bk, V, f) => { let y = Infinity; for (let i = 0; i < V; i++) { const r = Math.floor(i / bk.W), c = i - r * bk.W; y = Math.min(y, bk.data[((f * bk.R + r) * bk.W + c) * 4 + 1]); } return y; };
// the shader's placement, ported: the move pair as written to one instance's attributes, at time t
const place = (m, i, t) => {
  const A = (k) => Array.from(m.geometry.attributes[k].array.slice(i * 4, i * 4 + 4));
  const [f, g, mv, g2, mv2] = ['aFrom', 'aTo', 'aMove', 'aTo2', 'aMove2'].map(A);
  const s1 = { from: f, to: g, t0: mv[0], dur: mv[1], code: mv[2], arc: mv[3] };
  if (t < mv2[0]) return Crowd.seg(s1, t);
  const p0 = Crowd.seg(s1, mv2[0]);
  return Crowd.seg({ from: [...p0.p, p0.yaw], to: g2, t0: mv2[0], dur: mv2[1], code: mv2[2], arc: mv2[3] }, t);
};
const meshOf = (crowd, body, lod) => crowd.group.children.find((m) => m.name === 'crowd:' + body + ':' + lod);
const near = (a, b, eps = 1e-3) => Math.abs(a - b) < eps;

test('crowd: every body rigs at the three LODs, each lighter than the one before, within the triangle budget', () => {
  for (const body of BODIES) {
    const fine = Crowd.rig(HM.parts, body, 'fine'), light = Crowd.rig(HM.parts, body, 'light'), far = Crowd.rig(HM.parts, body, 'far');
    for (const r of [fine, light, far]) {
      assert.equal(r.geo.attributes.vid.count, r.V);
      assert.equal(r.bone.length, r.V);
      assert.ok(r.bone.every((b) => b >= 0 && b < r.bones.length), body + ': a vertex without a bone');
    }
    assert.ok(light.tris < fine.tris, `${body}: light ${light.tris} ≥ fine ${fine.tris}`);
    // 2,000 figures at high (≤ 360 fine) must stay near 1.5 M triangles with the shadow pass: ≤ 700 fine, ≤ 300 light
    assert.ok(fine.tris <= (body === 'rider' ? 1100 : 700), `${body}: fine ${fine.tris} triangles`);
    assert.ok(light.tris <= (body === 'rider' ? 520 : 320), `${body}: light ${light.tris} triangles`);
    // past the shadow reach (the bulk of a battle's figures): at most 60 % of the light model, no boots
    assert.ok(far.tris <= light.tris * 0.6, `${body}: far ${far.tris} vs light ${light.tris} triangles`);
    assert.deepEqual(Crowd.skeleton(body).bones.map((b) => b.name), fine.bones.map((b) => b.name), body + ': the bare skeleton is the rig\'s');
  }
});

test('crowd: baked frames fill the texture, stand on the ground and move', () => {
  for (const body of BODIES) for (const tier of ['high', 'low']) {
    const rig = Crowd.rig(HM.parts, body, tier === 'low' ? 'light' : 'fine'), bk = Crowd.bake(rig, body, tier);
    const F = Crowd.frameCount(body, tier), L = Crowd.layout(rig.V, F);
    assert.equal(bk.F, F); assert.equal(bk.W, L.W); assert.equal(bk.H, L.H);
    assert.equal(bk.data.length, bk.W * bk.H * 4);
    assert.ok(bk.data.every(Number.isFinite), body + ': NaN in the frames');
    assert.ok(bk.radius < 6.5, `${body}: radius ${bk.radius}`); // (a spear pumped high reaches 5 m on foot, 6 m from the saddle)
    // the low tier keeps a few frames per loop: 4 for most, 5–7 for a three-blow strike, a volley, a two-stride rout, a fall
    if (tier === 'low') assert.ok(Object.values(bk.rows).every((a) => a.frames <= (a.name === 'die' ? 7 : 6)) && Object.values(bk.rows).filter((a) => a.frames === 4).length >= Object.keys(bk.rows).length / 2, body + ': the low tier keeps a few frames per loop');
    // every frame of a loop differs from the next (the loop moves) and no vertex flies off between frames (the spear
    // tip of a man thrown down swings furthest)
    for (const [name, a] of Object.entries(bk.rows)) {
      const at = (f, i) => { const r = Math.floor(i / bk.W), c = i - r * bk.W, k = ((f * bk.R + r) * bk.W + c) * 4; return [bk.data[k], bk.data[k + 1], bk.data[k + 2]]; };
      let moved = 0;
      for (let k = 0; k + 1 < a.frames; k++) for (let i = 0; i < rig.V; i++) {
        const p = at(a.row0 + k, i), q = at(a.row0 + k + 1, i), d = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
        moved = Math.max(moved, d);
        assert.ok(d < (tier === 'low' ? 3.6 : 2.4), `${body}.${name} (${tier}): a vertex jumps ${d.toFixed(2)} m between frames ${k} and ${k + 1}`);
      }
      assert.ok(moved > 0.005, `${body}.${name}: still`);
      for (let k = 0; k < a.frames; k++) { const y = lowOf(bk, rig.V, a.row0 + k); assert.ok(y > -0.2 && y < (body === 'climb' ? 0.5 : 0.36), `${body}.${name} frame ${k}: lowest point ${y.toFixed(2)} (in the ground or floating)`); }
    }
    assert.ok(bk.minY > -0.2 && bk.minY < 0.25, `${body}: lowest point ${bk.minY.toFixed(2)}`);
  }
});

test('crowd: the rider sits on the saddle, above the barrel, not in it', () => {
  const rig = Crowd.rig(HM.parts, 'rider', 'fine'), bk = Crowd.bake(rig, 'rider', 'high'), hips = rig.names.hips;
  let lo = Infinity;
  for (let i = 0; i < rig.V; i++) if (rig.bone[i] === rig.names.torso) lo = Math.min(lo, bk.data[i * 4 + 1]);
  assert.ok(hips > 0 && lo > 1.7 && lo < 2.0, `torso bottom at ${lo.toFixed(2)} m`);
});

test('crowd: the new loops hold their poses (charge, brace, volley, rout, die, cheer, strike)', () => {
  // the charge: the spear levelled well ahead at a man's chest, the body leaning into it
  for (let t = 0; t < 1; t += 1 / 12) {
    const j = joints('foot', 'charge', t), hand = j('handR'), tip = j('handR', 0, 3.02, 0);
    assert.ok(tip.x - hand.x > 2.6 && tip.y > 0.9 && tip.y < 1.9, `charge t=${t.toFixed(2)}: spear tip ${tip.toArray().map((v) => v.toFixed(2))}`);
    assert.ok(j('head').x > j('hips').x + 0.15, 'charge: leaning into it');
    const rj = joints('rider', 'charge', t), rtip = rj('handR', 0, 3.02, 0);
    assert.ok(rtip.x > rj('hhead').x + 0.5 && rtip.y > 1.3 && rtip.y < 2.6, `rider charge t=${t.toFixed(2)}: lance tip ${rtip.toArray().map((v) => v.toFixed(2))}`);
  }
  // the run leans forward too (it leant back before the torso's sign was fixed)
  assert.ok(joints('foot', 'run', 0.25)('head').x > joints('foot', 'run', 0.25)('hips').x + 0.1, 'run: leaning forward');
  // brace: down on a knee, the spear's blade up at a rider's chest ahead, the shield before the body near the ground
  for (let t = 0; t < 1; t += 1 / 8) {
    const j = joints('foot', 'brace', t), tip = j('handR', 0, 3.02, 0), butt = j('handR', 0, -0.5, 0), shieldLow = j('handL', 0.1, 0.12 - 0.47, 0);
    assert.ok(j('hips').y < 0.7, 'brace: kneeling');
    assert.ok(tip.x > 1.8 && tip.y > 1.5 && tip.y < 2.8 && butt.y < 0.6, `brace: spear ${butt.toArray().map((v) => v.toFixed(2))} → ${tip.toArray().map((v) => v.toFixed(2))}`);
    assert.ok(shieldLow.y < 0.45 && j('handL').x > 0.2, 'brace: the shield set before the body');
  }
  // volley: drawn with the bow raised high (the bow hand above the shoulder, the string hand at the head), loosed after
  const drawn = joints('bow', 'volley', 0.36), loosed = joints('bow', 'volley', 0.5);
  assert.ok(drawn('handL').y > drawn('armL').y + 0.2, 'volley: the bow raised');
  assert.ok(drawn('handR').distanceTo(drawn('head', 0, 0.1, 0)) < 0.4, `volley: the string at the ear (${drawn('handR').distanceTo(drawn('head', 0, 0.1, 0)).toFixed(2)} m)`);
  assert.ok(loosed('handR').distanceTo(drawn('handR')) > 0.1, 'volley: the hand flies back at the loose');
  // rout: the spear trails behind, clear of the ground; the head turns back at some point of the loop
  let looked = 0;
  for (let t = 0; t < 1; t += 1 / 16) {
    const j = joints('foot', 'rout', t), tip = j('handR', 0, 3.02, 0);
    assert.ok(tip.x < j('handR').x - 2 && tip.y > -0.05, `rout t=${t.toFixed(2)}: spear tip ${tip.toArray().map((v) => v.toFixed(2))}`);
    const face = j('head', 1, 0, 0).sub(j('head')); looked = Math.max(looked, Math.atan2(face.z, face.x) * -1, Math.atan2(face.z, face.x));
  }
  assert.ok(looked > 0.7, `rout: a look back over the shoulder (${looked.toFixed(2)} rad)`);
  // die: standing at the start, down on the ground at the end (men, riders thrown clear, horses on their side)
  for (const body of ['foot', 'bow', 'climb', 'pull', 'rider', 'horse']) {
    const rig = Crowd.rig(HM.parts, body, 'light'), bk = Crowd.bake(rig, body, 'high'), a = bk.rows.die;
    assert.ok(a.once && topOf(bk, rig.V, a.row0) > 1.6, body + ': die starts standing');
    const top = body === 'rider' || body === 'horse' ? 1.25 : 0.75, end = topOf(bk, rig.V, a.row0 + a.frames - 1);
    assert.ok(end < top, `${body}: lying at the end of die (${end.toFixed(2)} m high)`);
  }
  // cheer: the spear thrust high at the top of the pump
  assert.ok(joints('foot', 'cheer', 0.5)('handR', 0, 3.02, 0).y > 4.2, 'cheer: spear high');
  // strike: three different blows — the spear's direction differs between the three strikes
  const dirs = [0.18, 0.5, 0.9].map((t) => { const j = joints('foot', 'strike', t); return j('handR', 0, 3.02, 0).sub(j('handR')).normalize(); });
  assert.ok(dirs[0].dot(dirs[1]) < 0.995 && dirs[1].dot(dirs[2]) < 0.999, 'strike: three blows');
  assert.ok(dirs.every((d) => d.x > 0.8), 'strike: every blow goes forward');
});

test('crowd: loops a body lacks fall back; gaits have strides', () => {
  assert.equal(Crowd.resolve('bow', 'brace'), 'stand');
  assert.equal(Crowd.resolve('bow', 'strike'), 'idle');
  assert.equal(Crowd.resolve('horse', 'cheer'), 'stand');
  assert.equal(Crowd.resolve('climb', 'charge'), 'idle');
  assert.equal(Crowd.resolve('rider', 'volley'), 'stand');
  assert.equal(Crowd.resolve('foot', 'volley'), 'idle');
  for (const [body, anim, lo, hi] of [['foot', 'walk', 1.0, 1.8], ['foot', 'run', 3.5, 6], ['foot', 'charge', 4.5, 7], ['foot', 'rout', 3.5, 6], ['rider', 'charge', 7, 13], ['horse', 'charge', 7, 13]]) {
    const v = Crowd.pace(body, anim);
    assert.ok(v > lo && v < hi, `${body}.${anim}: ${v.toFixed(2)} m/s`);
  }
  assert.equal(Crowd.pace('spear', 'walk'), Crowd.pace('foot', 'walk'));
});

test('crowd: motion helpers — easing, a segment, the stagger hash, the loop frame', () => {
  for (const name of Object.keys(Crowd.EASES)) {
    const code = Crowd.easeCode(name);
    assert.ok(near(Crowd.ease(code, 0), 0) && near(Crowd.ease(code, 1), 1), name + ': 0 → 1');
    let prev = -1e-9; for (let k = 0; k <= 1.0001; k += 0.02) { const e = Crowd.ease(code, k); assert.ok(e >= prev - 1e-9, name + ': monotone'); prev = e; }
    assert.ok(near(Crowd.ease(name, 0.37), Crowd.ease(code, 0.37)), name + ': the code is the ease');
    assert.ok(Crowd.easeCode(name, 'keep') === -code, name + ': keep facing flips the sign');
  }
  assert.ok(near(Crowd.ease('linear', 0.3), 0.3));
  assert.ok(Crowd.ease('charge', 0.2) < 0.2 * 0.5, 'charge: a heavy start');
  assert.ok(near(Crowd.ease('charge', 1) - Crowd.ease('charge', 0.98), (1 - Crowd.ease('charge', 0.55)) * 0.02 / 0.45, 1e-3), 'charge: full speed to the end');
  assert.ok(near(Crowd.ease('smooth', 0.5), 0.5));
  // a segment: from, to, turned into the motion on the way, settled on the final yaw
  const m = { from: [0, 0, 0, Math.PI / 2], to: [0, 2, -40, 0], t0: 1, dur: 8, code: Crowd.easeCode('march'), arc: 0.5 };
  assert.deepEqual(Array.from(Crowd.seg(m, 0).p), [0, 0, 0]); assert.equal(Crowd.seg(m, 0).yaw, Math.PI / 2);
  const end = Crowd.seg(m, 20); assert.ok(near(end.p[0], 0) && near(end.p[1], 2) && near(end.p[2], -40) && near(end.yaw, 0));
  const mid = Crowd.seg(m, 5); assert.ok(near(mid.yaw, Math.atan2(40, 0)), 'mid-way: facing the travel (−z → yaw π/2)');
  assert.ok(mid.p[1] > 1 + 0.49, 'the arc lifts mid-way');
  assert.ok(near(Crowd.seg(m, 5).clock, 1 + Crowd.ease(m.code, 0.5) * 8), 'the clock is eased time');
  const back = { ...m, from: [0, 0, 0, 0], to: [-5, 0, 0, 0], code: Crowd.easeCode('smooth', 'keep') };
  for (let t = 0; t < 12; t += 0.5) assert.ok(near(Crowd.seg(back, t).yaw, 0), 'keep facing: backs away without turning');
  // the stagger hash: seeded, in [0, 1), spread
  const hs = Array.from({ length: 2000 }, (_, i) => Crowd.hash(i)); const mean = hs.reduce((a, b) => a + b) / hs.length;
  assert.ok(hs.every((h) => h >= 0 && h < 1) && Math.abs(mean - 0.5) < 0.03 && new Set(hs).size > 1990);
  assert.equal(Crowd.hash(17, 3), Crowd.hash(17, 3)); assert.notEqual(Crowd.hash(17, 3), Crowd.hash(17, 4));
  // the loop frame: a one-shot holds its last frame, a loop wraps, a paced gait follows the clock
  const once = { row: { row0: 10, frames: 16, once: true }, off: 2, rate: 0.75, hold: 1, paced: false };
  assert.deepEqual(Array.from(Crowd.loopFrame(once, 1.9)), [10, 11, 0]); assert.deepEqual(Array.from(Crowd.loopFrame(once, 50)), [25, 25, 0]);
  const cyc = { row: { row0: 4, frames: 12, once: false }, off: 0.25, rate: 1, hold: 0, paced: false };
  assert.deepEqual(Array.from(Crowd.loopFrame(cyc, 0.75)), [4, 5, 0]); assert.equal(Crowd.loopFrame(cyc, 0.7)[0], 15);
  const paced = { ...cyc, paced: true };
  assert.deepEqual(Array.from(Crowd.loopFrame(paced, 99, 0.75)), [4, 5, 0], 'paced: the clock, not the time');
});

test('crowd: add returns handles; moves and loops reach the GPU pair; the placement matches the CPU', () => {
  const crowd = Crowd.create({ HM, colors: FIDS, q: 'high' });
  const a = crowd.add('spear', Array.from({ length: 40 }, (_, i) => [i % 10, 0, Math.floor(i / 10) * 1.5, 0, null, null, 'tao']));
  const b = crowd.add('rider', Array.from({ length: 12 }, (_, i) => [-20, 0, i * 2, 0]));
  assert.deepEqual({ ...a }, { kind: 'spear', start: 0, count: 40 }); assert.deepEqual({ ...b }, { kind: 'rider', start: 40, count: 12 });
  assert.equal(crowd.count, 52); assert.equal(crowd.time, 0);
  assert.throws(() => crowd.move({ start: 50, count: 5 }, { dx: 1 }), /outside/);
  assert.throws(() => crowd.move(a, { to: [[0, 0, 0]] }), /target rows/);
  // a timeline scheduled up front: an advance at 1 s, a charge at 6 s (both staggered), strike on arrival
  crowd.move(a, { dx: 30, t0: 1, dur: 5, ease: 'march', anim: 'walk', stagger: 0.4, then: false });
  crowd.move(a, { dx: 25, t0: 6, dur: 4, ease: 'charge', anim: 'charge', stagger: 0.4, then: 'strike' });
  crowd.play(b, 'charge', { t0: 2, stagger: 0.6 }); crowd.move(b, { dx: 60, t0: 2, dur: 5, ease: 'charge', stagger: 0.6 });
  crowd.focus([0, 0, 0]); crowd.tick(0);
  const fine = meshOf(crowd, 'foot', 'fine'); assert.ok(fine.geometry.isInstancedBufferGeometry && fine.geometry.instanceCount === 40);
  // the same stagger puts the loop switch and the move start on the same moment for each rider
  const rf = meshOf(crowd, 'rider', 'fine'), S = rf.geometry.attributes.aSwitch.array, M2 = rf.geometry.attributes.aMove2.array, starts = new Set();
  for (let i = 0; i < 12; i++) { assert.ok(near(S[i * 4], M2[i * 4]) && M2[i * 4] >= 2 && M2[i * 4] < 2.6, 'rider ' + i + ': loop and move start together'); starts.add(M2[i * 4].toFixed(4)); }
  assert.ok(starts.size > 8, 'staggered');
  // walk the clock; the shader's placement (ported) matches crowd.where() for every figure at every moment
  for (const t of [0, 0.5, 1.2, 3, 5.5, 6.2, 7, 9.9, 12, 8, 2]) { // (and back in time)
    crowd.tick(t);
    for (const [h, body] of [[a, 'foot'], [b, 'rider']]) {
      const m = meshOf(crowd, body, 'fine'), list = m.userData.crowd;
      for (let i = 0; i < h.count; i++) {
        const w = crowd.where(h, i), p = place(m, i, t);
        assert.ok(near(w[0], p.p[0], 1e-3) && near(w[2], p.p[2], 1e-3) && near(Math.cos(w[3]), Math.cos(p.yaw), 1e-3), `${body} ${i} at ${t}: where ${w.map((v) => v.toFixed(2))} vs shader ${p.p.map((v) => v.toFixed(2))}`);
      }
      assert.ok(list);
    }
  }
  crowd.tick(12);
  const c = crowd.centre(a); assert.ok(near(c[0], 4.5 + 55, 1e-3), 'advanced 55 m in all');
  // arrived: facing +x (the travel), loop B is strike (the charge's arrival)
  const w0 = crowd.where(a, 0); assert.ok(near(w0[3], 0, 1e-3));
  crowd.dispose(); assert.equal(crowd.group.children.length, 0); assert.equal(crowd.count, 0);
});

test('crowd: play — in step with a phase, held for die; the fallen stay down; pick and alive', () => {
  const crowd = Crowd.create({ HM, colors: FIDS, q: 'mid' });
  const archers = crowd.add('bow', Array.from({ length: 30 }, (_, i) => [i, 0, 0, 0]));
  crowd.play(archers, 'volley', { t0: 1, phase: 0 }); crowd.tick(2);
  const m = meshOf(crowd, 'bow', 'fine'), B = m.geometry.attributes.aAnimB.array, frames = new Set();
  for (let i = 0; i < 30; i++) frames.add(Crowd.loopFrame({ row: { row0: B[i * 4], frames: Math.abs(B[i * 4 + 1]), once: B[i * 4 + 1] < 0 }, off: B[i * 4 + 2], rate: B[i * 4 + 3], hold: 0, paced: false }, 7.3).join());
  assert.equal(frames.size, 1, 'a volley in step, even after several loops');
  const men = crowd.add('spear', Array.from({ length: 50 }, (_, i) => [i, 0, 10, 0]));
  const fallen = crowd.pick(men, 0.3);
  assert.ok(fallen.count > 5 && fallen.count < 25 && fallen.idx.every((k) => k >= men.start && k < men.start + men.count), 'pick: a seeded share');
  assert.deepEqual(crowd.pick(men, 0.3).idx, fallen.idx, 'pick: the same lot again');
  crowd.play(fallen, 'die', { t0: 3, stagger: 0.5 });
  crowd.tick(6);
  const alive = crowd.alive(men); assert.equal(alive.count, 50 - fallen.count);
  const before = crowd.where(fallen, 0), c0 = crowd.centre(alive);
  crowd.move(men, { dx: -40, t0: 6, dur: 6, ease: 'flee', anim: 'rout', stagger: 0.8 }); crowd.play(men, 'cheer', { t0: 20 });
  crowd.tick(20);
  assert.deepEqual(crowd.where(fallen, 0), before, 'the fallen stay where they lie');
  assert.ok(near(crowd.centre(alive)[0], c0[0] - 40), 'the living fled 40 m');
  const lm = meshOf(crowd, 'foot', 'fine') || meshOf(crowd, 'foot', 'light');
  assert.ok(lm, 'foot meshes');
  crowd.dispose();
});

test('crowd: LOD buckets, stats, meshes, dispose', () => {
  for (const q of ['high', 'mid', 'low']) {
    const crowd = Crowd.create({ HM, colors: FIDS, q });
    for (const kind of Object.keys(Crowd.KINDS)) crowd.add(kind, Array.from({ length: 50 }, (_, i) => [i * 2, 0, (i % 7) * 300, 0, null, null, i % 2 ? 'luu' : 'tao']));
    crowd.focus([0, 0, 0]); crowd.tick(1.25);
    const s = crowd.stats();
    assert.equal(crowd.count, 450); assert.equal(s.figures, 450);
    assert.equal(s.meshes, 6 * (q === 'low' ? 1 : 3)); // fine, light, and far without a shadow (high, mid)
    const reach = q === 'high' ? 150 : q === 'mid' ? 80 : 0;
    const nearN = Object.keys(Crowd.KINDS).length * Array.from({ length: 50 }, (_, i) => Math.hypot(i * 2, (i % 7) * 300) < reach).filter(Boolean).length;
    assert.equal(s.fineFigures, nearN, q + ': fine bucket');
    for (const m of crowd.group.children) {
      const g = m.geometry, names = Object.keys(g.attributes);
      assert.ok(m.isMesh && !m.isInstancedMesh && g.isInstancedBufferGeometry, m.name + ': one instanced draw, no instance matrices');
      assert.ok(names.length <= 16, m.name + ': ' + names.length + ' vertex attributes');
      assert.ok(m.customDepthMaterial, m.name + ': depth material');
      assert.equal(m.castShadow, q !== 'low' && !m.name.endsWith(':far'), m.name + ': shadow');
      const L = g.attributes.aLook.array;
      for (let i = 0; i < g.instanceCount; i++) assert.ok(L[i * 4 + 3] >= 0.82 && L[i * 4 + 3] <= 1.12, 'brightness');
      assert.equal(m.visible, g.instanceCount > 0);
    }
    assert.ok(s.textures.every((t) => t.frames === Crowd.frameCount(t.body, q)));
    if (q !== 'low') { // figures past shadowReach take the far LOD
      const sr = q === 'high' ? 150 : 120;
      for (const m of crowd.group.children) if (m.name.endsWith(':far')) { const A = m.geometry.attributes.aTo.array; for (let i = 0; i < m.geometry.instanceCount; i++) assert.ok(Math.hypot(A[i * 4], A[i * 4 + 2]) >= sr, m.name); }
    }
    crowd.dispose(); assert.equal(crowd.group.children.length, 0);
  }
});

test('crowd: the fine LOD holds at most maxFine figures over all bodies, nearest first; moving figures are re-sorted', () => {
  const crowd = Crowd.create({ HM, colors: { tao: 0x9a3b2c }, q: 'high' });
  const hs = ['spear', 'bow', 'rider', 'horse'].map((kind) => crowd.add(kind, Array.from({ length: 400 }, (_, i) => [i * 0.2, 0, 0, 0])));
  crowd.focus([0, 0, 0]);
  assert.equal(crowd.stats().fineFigures, 360); // high: maxFine 360
  for (const m of crowd.group.children) if (m.userData.crowd.lod === 'fine') { const A = m.geometry.attributes.aTo.array; for (let i = 0; i < m.geometry.instanceCount; i++) assert.ok(A[i * 4] < 23); }
  // the riders gallop 400 m away: past the fine reach and the shadow reach, they drop to the far LOD as they go
  crowd.move(hs[2], { dx: 400, t0: 0, dur: 20, ease: 'linear', anim: 'charge' });
  crowd.tick(0.1); const r0 = meshOf(crowd, 'rider', 'far').geometry.instanceCount;
  for (let t = 0.2; t <= 20.01; t += 0.1) crowd.tick(t);
  assert.equal(r0, 0); assert.equal(meshOf(crowd, 'rider', 'far').geometry.instanceCount, 400, 'the riders far away now');
  crowd.dispose();
});

test('crowd: the triangle and draw-call budget per tier (a field battle, the camera in the melee)', () => {
  // an upper bound: every figure drawn (no frustum culling) and every caster in the shadow pass. 2,000 figures at high
  // and mid (the crowd's header), 1,000 at low (the battle's cap there); against 0005's 3 / 2 / 1 M for the whole scene
  const CASE = { high: [2000, 1.5e6, 14], mid: [2000, 1.35e6, 14], low: [1000, 0.35e6, 6] };
  for (const q of ['high', 'mid', 'low']) {
    const [N, tris, calls] = CASE[q], k = N / 2000;
    const crowd = Crowd.create({ HM, colors: FIDS, q, frames: 'float' }), lcg = ((s) => () => ((s = (s * 16807) % 2147483647) / 2147483647))(5);
    const block = (kind, n, x0, z0, w) => crowd.add(kind, Array.from({ length: Math.round(n * k) }, (_, i) => [x0 + (i % w) * 1.4 + lcg() * 0.3, 0, z0 + Math.floor(i / w) * 1.4, 0, null, null, 'tao']));
    // two armies across a 240 × 200 m field: foot blocks, archers behind, riders on the wings
    for (const [side, x] of [[0, -60], [1, 60]]) { for (let j = 0; j < 4; j++) block('spear', 175, x - 20 + side * 10, -80 + j * 42, 25); block('bow', 150, x + (side ? 25 : -25), -30, 30); block('rider', 75, x, 70, 15); block('rider', 75, x, -110, 15); }
    for (const f of [[0, 60, 200], [0, 3, 0], [-60, 10, 40]]) {
      crowd.focus(f); crowd.tick(1);
      const s = crowd.stats();
      assert.ok(Math.abs(s.figures - N) < 12, s.figures + ' figures');
      assert.ok(s.trisMax <= tris, `${q} from ${f}: ${s.trisMax} triangles (with the shadow pass) > ${tris}`);
      assert.ok(s.calls <= calls, `${q} from ${f}: ${s.calls} draw calls`);
    }
    const s = crowd.stats();
    assert.ok(s.texMB < (q === 'low' ? 3 : 16), `${q}: ${s.texMB} MB of frames`);
    if (q === 'low') assert.ok(s.textures.every((t) => t.frames <= Object.keys(Crowd.ANIMS[t.body]).length * 5));
    crowd.dispose();
  }
});

test('crowd: the static fallback builds and places figures (frozen frames, same moves)', () => {
  const crowd = Crowd.create({ HM, colors: FIDS, q: 'mid', frames: 'static' });
  const h = crowd.add('spear', [[0, 0, 0, 0], [2, 0, 0, 0]]);
  crowd.move(h, { dx: 10, t0: 0, dur: 2 }); crowd.play(h, 'die', { t0: 3 }); crowd.focus([0, 0, 0]); crowd.tick(1);
  assert.equal(crowd.mode, 'static'); assert.equal(crowd.stats().texMB, 0);
  assert.ok(crowd.where(h, 0)[0] > 0 && crowd.where(h, 0)[0] < 10);
  crowd.dispose();
});
