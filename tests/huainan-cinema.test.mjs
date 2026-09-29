// The battle cinema (src/world/huainan-cinema.js): its pure part, checked without a browser on the fixtures and on
// battles played here with EmperorsBattle: the town layouts (data/scenario/huainan-cities.json), the side an attack comes
// from, the moment a turn's shot is about and its line, the result as the player reads it. The rule the shots keep:
// nothing is invented; every beat names an event of the turn's log (or a wing that really moved) and wings that exist.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ROOT } from './load.mjs';

const require = createRequire(import.meta.url);
const C = require(path.join(ROOT, 'src/world/huainan-cinema.js'));
const EB = require(path.join(ROOT, 'src/engine/battle.js'));
const json = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const fx = (name) => json('docs/design/v2-fixtures/' + name);
const data = json('data/scenario/huainan.json'), cities = json('data/scenario/huainan-cities.json');
const turnOf = (b) => EB.resolve(EB.autoOrders(EB.autoOrders(b, 'A'), 'D'));

test('the cinema exposes its pure helpers and its shot lengths', () => {
  for (const k of ['season', 'cityDef', 'sideOf', 'beat', 'caption', 'resultOf', 'wings', 'fromOf']) assert.equal(typeof C[k], 'function', k);
  assert.ok(C.SHOTS.open >= 4 && C.SHOTS.open <= 6, 'the opening lasts 4–6 s');
  assert.ok(C.SHOTS.result >= 4 && C.SHOTS.result <= 5, 'the result lasts 4–5 s');
  for (const k of ['charge', 'volley', 'melee', 'fire', 'breach', 'rout', 'advance', 'hold']) assert.ok(C.SHOTS[k] >= 3 && C.SHOTS[k] <= 6, k + ' lasts 3–6 s');
});

test('the season is the first word of the calendar (the View\'s "Thu 219")', () => {
  assert.equal(C.season('Thu 219'), 'Thu');
  assert.equal(C.season('Đông 219'), 'Đông');
  assert.equal(C.season('Xuân 220'), 'Xuân');
  assert.equal(C.season('Hạ 220'), 'Hạ');
  assert.equal(C.season(''), 'Thu');
  assert.equal(C.season(undefined), 'Thu');
});

test('every town of the demo has a layout: a square county town, a gate a side, the governor north of the centre', () => {
  for (const t of data.towns) {
    const c = cities.cities[t.id];
    assert.ok(c, 'layout for ' + t.id);
    assert.equal(c.name, t.name);
    const xs = c.outline.map((p) => p[0]), zs = c.outline.map((p) => p[1]), side = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs));
    assert.equal(c.outline.length, 4, t.id + ' is a square town');
    assert.ok(side >= 0.3 && side <= 0.65, t.id + ' at county-town scale (' + side + ' km)');
    assert.deepEqual(c.gates, { n: 1, s: 1, e: 1, w: 1 });
    assert.ok(c.palaces.length === 1 && c.palaces[0].at[1] < 0, t.id + ': the governor\'s compound north of the centre');
    assert.equal(c.walls, data.start.towns[t.id].walls, t.id + ': the lũy the scenario starts with');
    assert.equal(!!c.river, !!t.river, t.id + ': a river where the scenario has one');
  }
});

test('a town is drawn at the lũy it has now: the wall rises, the khuyết from 2, the moat from 3 (as the map\'s model)', () => {
  const h = [];
  for (let lv = 0; lv <= 4; lv++) {
    const d = C.cityDef(cities, 'am_lang', lv);
    h.push(d.wallH);
    assert.equal(d.walls, lv);
    assert.equal(d.que !== 'none', lv >= 2, 'khuyết at lũy ' + lv);
    assert.equal(!!d.moat, lv >= 3, 'moat at lũy ' + lv);
    assert.equal(d.id, 'am_lang');
  }
  for (let i = 1; i < h.length; i++) assert.ok(h[i] > h[i - 1], 'higher walls at a higher lũy');
  assert.equal(C.cityDef(cities, 'tho_xuan').walls, 3, 'no lũy given: the scenario\'s');
  assert.equal(C.cityDef(cities, 'nowhere', 1), null);
  const a = C.cityDef(cities, 'tho_xuan', 1), b = C.cityDef(cities, 'tho_xuan', 3);
  assert.ok(!a.moat && b.moat, 'a copy each time: one level never leaks into another');
});

test('an attack comes from the side of the town it marched from, never across a river', () => {
  const T = data.towns;
  assert.equal(C.sideOf(T, 'tho_xuan', 'chung_ly', 'nw'), 'e', 'Chung Ly lies east-north-east of Thọ Xuân');
  assert.equal(C.sideOf(T, 'chung_ly', 'tho_xuan', 'nw'), 's', 'from the west, but the Huai is there: the next side');
  assert.equal(C.sideOf(T, 'hu_di', 'chung_ly', 'n'), 'w');
  assert.equal(C.sideOf(T, 'lich_duong', 'am_lang', 'e'), 'n');
  assert.equal(C.sideOf(T, 'am_lang', null, ''), 's', 'no march: south');
  assert.equal(C.sideOf(T, 'am_lang', [160, -37], ''), 'w', 'a point on the map');
  for (const t of T) for (const f of T) if (f.id !== t.id) { const r = (cities.cities[t.id].river || {}).sides || ''; assert.ok(r.indexOf(C.sideOf(T, t.id, f.id, r)) < 0, t.id + ' from ' + f.id); }
});

test('the fixture\'s first turn is shot as its fire attack, with the log\'s own line', () => {
  const f = fx('battle-turn1.json'), before = { b: f.b }, after = { b: turnOf(f.b) };
  const beat = C.beat(before, after, 'A', EB), log = after.b.log[after.b.log.length - 1];
  assert.equal(beat.kind, 'fire');
  assert.ok(log.ev.indexOf(beat.ev) >= 0, 'the beat is an event of the log');
  assert.equal(beat.text, EB.say(after.b, beat.ev, 'A'));
  assert.ok(after.b.wings.some((w) => w.id === beat.target && w.burnt), 'the burnt wing is the target');
});

test('a beat never invents: across many battles every shot names a real event or a real move, and live wings', () => {
  const kinds = {};
  for (const [site, du, siege] of [['tho_xuan', { bo: 2000, cung: 600 }, true], ['hu_di', { bo: 1200 }, true], ['am_lang', { bo: 2000, cung: 500, ky: 3500 }, false]]) {
    for (let seed = 1; seed <= 40; seed++) {
      const town = data.towns.find((t) => t.id === site);
      let b = EB.create({ site, siege, walls: siege ? 2 : 0, lanes: town.lanes, seed, attacker: { fid: 'zhu_yuanzhang', units: { bo: 3200, cung: 1000, ky: 800 } }, defender: { fid: 'cao_cao', units: du } });
      for (let k = 0; k < 5 && !b.over; k++) {
        const a = turnOf(b), me = seed % 2 ? 'A' : 'D', beat = C.beat({ b }, { b: a }, me, EB), log = a.log[a.log.length - 1], W = Object.fromEntries(a.wings.map((w) => [w.id, w]));
        kinds[beat.kind] = (kinds[beat.kind] || 0) + 1;
        if (beat.ev) assert.ok(log.ev.indexOf(beat.ev) >= 0, 'the event is the log\'s');
        if (beat.wing) assert.ok(W[beat.wing], 'the wing exists: ' + beat.wing);
        if (beat.target) assert.ok(W[beat.target], 'the target exists: ' + beat.target);
        if (beat.kind === 'advance') { const w0 = b.wings.find((w) => w.id === beat.wing), w1 = W[beat.wing]; assert.ok(w0.row !== w1.row || w0.lane !== w1.lane, 'the advancing wing moved'); assert.ok(!log.ev.some((e) => ['melee', 'volley', 'fire', 'breach', 'rout'].includes(e.kind)), 'an advance only when nobody fought'); }
        if (beat.kind === 'breach') assert.ok(log.ev.some((e) => e.kind === 'breach'));
        if (beat.kind === 'charge') assert.ok(W[beat.wing].arm === 'ky' && W[beat.wing].charge, 'a charge is a horse wing that charged');
        if (beat.kind === 'volley') assert.equal(W[beat.wing].shot, beat.target, 'the volley\'s target is the one the archers shot');
        if (log.ev.some((e) => e.kind === 'breach')) assert.equal(beat.kind, 'breach', 'a breach is always the moment');
        assert.equal(typeof beat.text, 'string'); assert.ok(beat.text.length > 0, 'a line for every shot');
        b = a;
      }
    }
  }
  for (const k of ['melee', 'volley', 'breach', 'rout']) assert.ok(kinds[k] > 0, 'the battles played here show a ' + k + ' (' + JSON.stringify(kinds) + ')');
});

test('the result as the player reads it: the winner, the town, the losses; a win is never claimed for the loser', () => {
  const f = fx('battle-over.json'), lb = { plan: f.plan, b: f.b, me: 'A', outcome: f.outcome };
  const r = C.resultOf(lb, { tho_xuan: 'Thọ Xuân' });
  assert.equal(r.win, 'A'); assert.equal(r.good, true); assert.equal(r.cue, 'victory');
  assert.match(r.text, /Thọ Xuân/); assert.match(r.text, /Ta mất [\d.]+, địch mất [\d.]+\./);
  const taken = C.resultOf({ ...lb, plan: { ...f.plan, defender: { ...f.plan.defender, town: 'tho_xuan' } } }, { tho_xuan: 'Thọ Xuân' });
  assert.match(taken.text, /^Thọ Xuân về tay ta\./);
  const theirs = C.resultOf({ ...lb, me: 'D', plan: { ...f.plan, defender: { ...f.plan.defender, town: 'tho_xuan' } } }, { tho_xuan: 'Thọ Xuân' });
  assert.equal(theirs.good, false); assert.equal(theirs.cue, 'defeat'); assert.match(theirs.text, /thất thủ/);
  const lost = C.resultOf({ ...lb, b: { ...f.b, over: { win: 'D' } }, outcome: { ...f.outcome, win: 'D' } }, { tho_xuan: 'Thọ Xuân' });
  assert.equal(lost.good, false); assert.match(lost.text, /Không hạ được Thọ Xuân/);
});

test('the wings the stage lays are the state\'s own; the result clears the turn\'s marks but keeps its dead', () => {
  const b = turnOf(fx('battle-turn3.json').b), w = C.wings(b, false), c = C.wings(b, true);
  assert.equal(w.length, b.wings.length);
  for (let i = 0; i < w.length; i++) {
    const s = b.wings[i];
    for (const k of ['id', 'side', 'arm', 'men', 'start', 'lane', 'row']) assert.equal(w[i][k], s[k], k);
    assert.equal(w[i].shot, s.shot || null); assert.equal(w[i].hit, s.hit || 0);
    assert.equal(c[i].shot, null); assert.equal(c[i].fought, false); assert.equal(c[i].charge, false); assert.equal(c[i].hit, s.hit || 0);
  }
  const from = C.fromOf(b); assert.deepEqual(Object.keys(from), b.wings.map((x) => x.id));
});
