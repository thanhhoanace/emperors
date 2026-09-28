// Crowd (src/world/crowd.js) through the real model kit, without a GPU: rigs, poses, the baked frame textures, the
// instanced meshes and their LOD buckets. Claude's lane (docs/product/lanes.md); the look is checked in the browser
// harness docs/design/prototypes/crowd.html.
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

test('crowd: every body rigs at both LODs, the light one lighter, within the triangle budget', () => {
  for (const body of BODIES) {
    const fine = Crowd.rig(HM.parts, body, 'fine'), light = Crowd.rig(HM.parts, body, 'light');
    for (const r of [fine, light]) {
      assert.equal(r.geo.attributes.vid.count, r.V);
      assert.equal(r.bone.length, r.V);
      assert.ok(r.bone.every((b) => b >= 0 && b < r.bones.length), body + ': a vertex without a bone');
    }
    assert.ok(light.tris < fine.tris, `${body}: light ${light.tris} ≥ fine ${fine.tris}`);
    // 2,000 figures at high (≤ 500 fine) must stay near 1.5 M triangles with the shadow pass: ≤ 700 fine, ≤ 300 light
    assert.ok(fine.tris <= (body === 'rider' ? 1100 : 700), `${body}: fine ${fine.tris} triangles`);
    assert.ok(light.tris <= (body === 'rider' ? 520 : 320), `${body}: light ${light.tris} triangles`);
  }
});

test('crowd: baked frames fill the texture, stand on the ground and move', () => {
  for (const body of BODIES) for (const tier of ['high', 'low']) {
    const rig = Crowd.rig(HM.parts, body, tier === 'low' ? 'light' : 'fine'), bk = Crowd.bake(rig, body, tier);
    const F = Object.values(Crowd.ANIMS[body]).reduce((s, [n]) => s + (tier === 'low' ? 4 : n), 0);
    const L = Crowd.layout(rig.V, F);
    assert.equal(bk.F, F); assert.equal(bk.W, L.W); assert.equal(bk.H, L.H);
    assert.equal(bk.data.length, bk.W * bk.H * 4);
    assert.ok(bk.data.every(Number.isFinite), body + ': NaN in the frames');
    assert.ok(bk.radius < 5, `${body}: radius ${bk.radius}`);
    // every frame of a loop differs from the next (the loop moves) and no vertex jumps more than a limb's length
    for (const [name, a] of Object.entries(bk.rows)) {
      const at = (f, i) => { const r = Math.floor(i / bk.W), c = i - r * bk.W, k = ((f * bk.R + r) * bk.W + c) * 4; return [bk.data[k], bk.data[k + 1], bk.data[k + 2]]; };
      let moved = 0, jump = 0;
      for (let i = 0; i < rig.V; i++) { const p = at(a.row0, i), q = at(a.row0 + 1, i), d = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); moved = Math.max(moved, d); jump = Math.max(jump, d); }
      assert.ok(moved > 0.005, `${body}.${name}: still`);
      assert.ok(jump < (tier === 'low' ? 2.6 : 1.6), `${body}.${name}: a vertex jumps ${jump.toFixed(2)} m between frames`);
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

test('crowd: add, LOD buckets, stats, dispose', () => {
  for (const q of ['high', 'mid', 'low']) {
    const crowd = Crowd.create({ HM, colors: { tao: 0x9a3b2c, luu: 0x2f6b3a }, q });
    for (const kind of Object.keys(Crowd.KINDS)) crowd.add(kind, Array.from({ length: 50 }, (_, i) => [i * 2, 0, (i % 7) * 300, 0, null, null, i % 2 ? 'luu' : 'tao']));
    crowd.focus([0, 0, 0]); crowd.tick(1.25);
    const s = crowd.stats();
    assert.equal(crowd.count, 450); assert.equal(s.figures, 450);
    assert.equal(s.meshes, 6 * (q === 'low' ? 1 : 3)); // fine, light, and the shadowless far copy of light (high, mid)
    const reach = q === 'high' ? 150 : q === 'mid' ? 80 : 0;
    const near = Object.keys(Crowd.KINDS).length * Array.from({ length: 50 }, (_, i) => Math.hypot(i * 2, (i % 7) * 300) < reach).filter(Boolean).length;
    assert.equal(s.fineFigures, near, q + ': fine bucket');
    for (const m of crowd.group.children) {
      assert.ok(m.isInstancedMesh && m.instanceColor, m.name + ': instance colours from creation');
      assert.ok(m.customDepthMaterial, m.name + ': depth material');
      assert.equal(m.castShadow, q !== 'low' && !m.name.endsWith(':far'), m.name + ': shadow');
      if (m.count) for (let i = 0; i < m.count * 3; i++) assert.ok(m.instanceColor.array[i] > 0.8 && m.instanceColor.array[i] < 1.15);
    }
    assert.ok(s.textures.every((t) => t.frames === Object.values(Crowd.ANIMS[t.body]).reduce((a, [n]) => a + (q === 'low' ? 4 : n), 0)));
    if (q !== 'low') { // light figures past shadowReach sit in the shadowless copy
      const sr = q === 'high' ? 200 : 160;
      for (const m of crowd.group.children) if (m.name.endsWith(':far')) for (let i = 0; i < m.count; i++) assert.ok(Math.hypot(m.instanceMatrix.array[i * 16 + 12], m.instanceMatrix.array[i * 16 + 14]) >= sr, m.name);
    }
    crowd.dispose(); assert.equal(crowd.group.children.length, 0);
  }
});

test('crowd: the fine LOD holds at most maxFine figures over all bodies, nearest first', () => {
  const crowd = Crowd.create({ HM, colors: { tao: 0x9a3b2c }, q: 'high' });
  for (const kind of ['spear', 'bow', 'rider', 'horse']) crowd.add(kind, Array.from({ length: 400 }, (_, i) => [i * 0.2, 0, 0, 0]));
  crowd.focus([0, 0, 0]);
  const s = crowd.stats();
  assert.equal(s.fineFigures, 400);
  for (const m of crowd.group.children) if (m.userData.crowd.lod === 'fine') for (let i = 0; i < m.count; i++) assert.ok(m.instanceMatrix.array[i * 16 + 12] < 26);
  crowd.dispose();
});
