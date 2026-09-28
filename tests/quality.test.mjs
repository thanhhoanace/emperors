// Quality tiers (src/world/quality.js): pick() is a pure function of the device info, so the table of
// docs/design/visual-build.md §1 and decisions/0005 is checked here without a browser; monitor() follows dat.city's rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { ROOT } from './load.mjs';

const require = createRequire(import.meta.url);
const Quality = require(path.join(ROOT, 'src/world/quality.js'));

// Unmasked renderer strings as the browsers report them
const GPU = {
  rtx3060: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
  gtx1650: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11 vs_5_0 ps_5_0, D3D11)',
  m1: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)',
  irisXe: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
  uhd630: 'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)',
  a15: 'Apple A15 GPU',
  adreno: 'ANGLE (Qualcomm, Adreno (TM) 640, OpenGL ES 3.2 V@0502.0)',
  mali: 'ANGLE (ARM, Mali-G78, OpenGL ES 3.2)',
  powervr: 'PowerVR Rogue GE8320',
  swiftshader: 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)',
  rx6700: 'ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)',
  apu: 'ANGLE (AMD, AMD Radeon(TM) Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
};
const desktop = (gpu, extra = {}) => ({ gpu, mobile: false, memoryGB: 8, cores: 8, width: 1920, height: 1080, dpr: 1, ...extra });
const TABLE = {
  high: { dpr: 1.5, shadow: 4096, ssao: true, dof: true },
  mid: { dpr: 1, shadow: 2048, ssao: false, dof: true },
  low: { dpr: 1, shadow: 0, ssao: false, dof: false },
};
const expectTier = (q, tier, what) => {
  assert.equal(q.tier, tier, what + ': ' + q.reason);
  for (const [k, v] of Object.entries(TABLE[tier])) assert.equal(q[k], v, `${what}: ${k}`);
  assert.ok(typeof q.reason === 'string' && q.reason.length > 0, what + ': has a reason');
  assert.ok(q.trees > 0 && (q.crowd === 'full' || q.crowd === 'lite'), what + ': trees and crowd');
};

test('pick: discrete desktop GPUs and Apple M-series are high', () => {
  expectTier(Quality.pick(desktop(GPU.rtx3060)), 'high', 'RTX 3060');
  expectTier(Quality.pick(desktop(GPU.gtx1650)), 'high', 'GTX 1650');
  expectTier(Quality.pick(desktop(GPU.m1)), 'high', 'Apple M1');
  expectTier(Quality.pick(desktop(GPU.rx6700)), 'high', 'Radeon RX 6700');
  assert.match(Quality.pick(desktop(GPU.rtx3060)).reason, /RTX 3060.*mức cao/);
  assert.match(Quality.pick(desktop(GPU.m1)).reason, /Apple M1.*mức cao/);
});

test('pick: integrated laptop GPUs are mid', () => {
  expectTier(Quality.pick(desktop(GPU.irisXe)), 'mid', 'Iris Xe');
  expectTier(Quality.pick(desktop(GPU.uhd630)), 'mid', 'UHD 630');
  expectTier(Quality.pick(desktop(GPU.apu)), 'mid', 'Radeon APU');
  assert.match(Quality.pick(desktop(GPU.irisXe)).reason, /GPU tích hợp Intel Iris Xe Graphics → mức vừa/);
});

test('pick: phones, mobile GPUs and software renderers are low', () => {
  expectTier(Quality.pick({ gpu: GPU.a15, mobile: true, memoryGB: undefined, cores: 6, width: 390, height: 844, dpr: 3 }), 'low', 'iPhone A15');
  expectTier(Quality.pick(desktop(GPU.a15)), 'low', 'Apple A15 without the mobile flag');
  expectTier(Quality.pick(desktop(GPU.adreno)), 'low', 'Adreno 640');
  expectTier(Quality.pick(desktop(GPU.mali)), 'low', 'Mali-G78');
  expectTier(Quality.pick(desktop(GPU.powervr)), 'low', 'PowerVR');
  expectTier(Quality.pick(desktop(GPU.swiftshader)), 'low', 'SwiftShader');
  expectTier(Quality.pick(desktop(GPU.rtx3060, { mobile: true })), 'low', 'mobile flag wins over the GPU string');
  assert.match(Quality.pick(desktop(GPU.swiftshader)).reason, /GPU phần mềm SwiftShader → mức thấp/);
  assert.match(Quality.pick({ mobile: true }).reason, /Điện thoại/);
});

test('pick: an unknown or missing GPU string is mid', () => {
  expectTier(Quality.pick(desktop('')), 'mid', 'empty');
  expectTier(Quality.pick(desktop('WebKit WebGL')), 'mid', 'masked');
  expectTier(Quality.pick({}), 'mid', 'no info at all');
  assert.match(Quality.pick(desktop('')).reason, /GPU → mức vừa/);
});

test('pick: ?tier= override wins; an unknown value is ignored', () => {
  expectTier(Quality.pick(desktop(GPU.rtx3060, { override: 'low' })), 'low', 'RTX forced low');
  expectTier(Quality.pick(desktop(GPU.adreno, { override: 'high', mobile: true })), 'high', 'phone forced high');
  expectTier(Quality.pick(desktop(GPU.irisXe, { override: 'mid' })), 'mid', 'mid forced mid');
  assert.match(Quality.pick(desktop(GPU.rtx3060, { override: 'low' })).reason, /\?tier=low/);
  expectTier(Quality.pick(desktop(GPU.rtx3060, { override: 'ultra' })), 'high', 'bad override falls back to the GPU');
});

test('pick: 4 GB of memory or less never runs high', () => {
  const q = Quality.pick(desktop(GPU.rtx3060, { memoryGB: 4 }));
  expectTier(q, 'mid', 'RTX with 4 GB');
  assert.match(q.reason, /RAM 4 GB/);
  expectTier(Quality.pick(desktop(GPU.rtx3060, { memoryGB: 2 })), 'mid', 'RTX with 2 GB');
  expectTier(Quality.pick(desktop(GPU.rtx3060, { memoryGB: 8 })), 'high', 'RTX with 8 GB');
  expectTier(Quality.pick(desktop(GPU.rtx3060, { memoryGB: undefined })), 'high', 'memory unknown (Safari, Firefox)');
  expectTier(Quality.pick(desktop(GPU.adreno, { memoryGB: 4 })), 'low', 'the cap never lifts a tier');
});

test('pick is pure: same info, same result, input untouched; the table matches visual-build.md', () => {
  const info = desktop(GPU.irisXe), before = JSON.stringify(info);
  assert.deepEqual(Quality.pick(info), Quality.pick(info));
  assert.equal(JSON.stringify(info), before);
  assert.deepEqual(Quality.ORDER, ['high', 'mid', 'low']);
  for (const t of Quality.ORDER) { assert.deepEqual(Quality.tier(t, 'x'), { tier: t, ...Quality.TIERS[t], reason: 'x' }); for (const [k, v] of Object.entries(TABLE[t])) assert.equal(Quality.TIERS[t][k], v, t + '.' + k); }
  assert.ok(Quality.TIERS.high.trees > Quality.TIERS.mid.trees && Quality.TIERS.mid.trees > Quality.TIERS.low.trees);
  assert.equal(Quality.TIERS.low.trees, 2500);
});

test('loads as a classic script in a bare global scope (no window, THREE, navigator or document)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/world/quality.js'), 'utf8');
  const sandbox = {};
  vm.runInNewContext(src, sandbox);
  assert.ok(sandbox.Quality && typeof sandbox.Quality.pick === 'function', 'global Quality');
  assert.equal(sandbox.Quality.pick(desktop(GPU.m1)).tier, 'high');
  // detect() without a renderer or navigator still answers (mid, no GPU), so a page never dies on it
  const q = sandbox.Quality.detect(null, {});
  assert.equal(q.tier, 'mid');
  assert.equal(q.info.gpu, '');
  assert.equal(sandbox.Quality.detect(null, { override: 'low' }).tier, 'low');
  assert.equal(sandbox.Quality.hud(null, () => ({})).el, null, 'no document: the hud is a no-op');
});

test("monitor: two consecutive 100-frame windows over 31 ms drop one tier, never below low, never back up", () => {
  const drops = [];
  const m = Quality.monitor(null, (tier, why) => drops.push([tier, why]), { tier: 'high' });
  const feed = (n, dt) => { for (let i = 0; i < n; i++) m.frame(dt); };
  feed(100, 40); assert.equal(m.tier, 'high', 'one slow window is not enough'); assert.equal(Math.round(m.fps), 25);
  feed(100, 12); assert.equal(m.tier, 'high', 'a fast window resets the count');
  feed(100, 40); feed(99, 40); assert.equal(m.tier, 'high', 'the second window is not complete yet');
  m.frame(40); assert.equal(m.tier, 'mid'); assert.equal(drops.length, 1); assert.match(drops[0][1], /mức vừa/);
  feed(200, 40); assert.equal(m.tier, 'low'); assert.equal(drops.length, 2);
  feed(400, 40); assert.equal(m.tier, 'low', 'nothing below low'); assert.equal(drops.length, 2);
  feed(400, 5); assert.equal(m.tier, 'low', 'never back up'); assert.equal(m.drops, 2);
});

test('monitor: a hidden tab or a first compile does not count, one stall cannot decide a window', () => {
  const drops = [];
  const m = Quality.monitor({ userData: { quality: Quality.tier('mid') } }, (t) => drops.push(t));
  assert.equal(m.tier, 'mid', 'starts from the renderer tier');
  for (let w = 0; w < 2; w++) { m.frame(5000); for (let i = 0; i < 100; i++) m.frame(12); } // a 5 s stall (hidden tab) is not a frame
  assert.equal(m.windows, 2);
  assert.equal(drops.length, 0);
  for (let w = 0; w < 2; w++) { m.frame(900); for (let i = 0; i < 99; i++) m.frame(16); } // a 0.9 s stall counts, clamped to 4 × 31 ms
  assert.equal(m.windows, 4);
  assert.equal(drops.length, 0);
  assert.ok(m.avgMs > 16 && m.avgMs < 31, 'avg ' + m.avgMs);
  m.frame(0); m.frame(-3); m.frame(NaN); // never counted
  assert.equal(m.windows, 4);
  const fast = Quality.monitor(null, () => {}, { tier: 'low' });
  for (let i = 0; i < 300; i++) fast.frame(200);
  assert.equal(fast.tier, 'low');
});
