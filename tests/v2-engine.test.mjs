// v2 rules for the Hoài Nam demo (src/engine/v2/huainan.js; docs/design/v2-build.md §E, GAMEPLAY-FREEZE.md v2 tiers A
// and B). The contract's invariants first, then the demo 1 spike's own checks (docs/phases/v2-gameplay/demo1/test-rules.js)
// where they still hold after the freeze.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const V2 = require(path.join(ROOT, 'src/engine/v2/huainan.js'));
const Battle = require(path.join(ROOT, 'src/engine/battle.js'));
const Spike = require(path.join(ROOT, 'docs/phases/v2-gameplay/demo1/src/hn-rules.js'));
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/scenario/huainan.json'), 'utf8'));
const fixture = (n) => JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/design/v2-fixtures', n + '.json'), 'utf8'));

const T = (id) => ({ kind: 'town', id });
const A = (id) => ({ kind: 'army', id });
const newGame = (seed) => V2.newGame(DATA, seed);
// a game state without its scenario (the scenario is shared and never written)
const bare = (g) => JSON.stringify(Object.assign({}, g, { data: null }));
// every battle of the season on the general's proposals
const fight = (g) => { while (g.pending) g = V2.autoBattle(g); return g; };
// a calm board: no cards, no Tào or Ngô armies, so nothing but our own acts happens this season
function calm(seed = 3) {
  const g = newGame(seed);
  g.cards = [];
  delete g.armies.e1;
  delete g.armies.e2;
  return g;
}
const FORBIDDEN = /"(estWin|trueWin|odds|band|bias|rs|seed|win_p|truth)"\s*:/;
// the spike's Thọ Xuân (2.600 men) where a test is about what follows a battle, not the demo's balance (29/9: 4.000)
const SPIKE_THO_XUAN = { bo: 2000, cung: 600 };

// ---------------------------------------------------------------- data and view shapes
test('data: towns, seats and factions in the fixture shape the scene reads, with lanes per town', () => {
  const fx = fixture('data-towns');
  assert.deepEqual(DATA.seats, fx.seats);
  assert.deepEqual(Object.keys(DATA.factions).sort(), Object.keys(fx.factions).sort());
  for (const [fid, f] of Object.entries(fx.factions)) assert.deepEqual(DATA.factions[fid], f);
  for (const ft of fx.towns) {
    const t = DATA.towns.find((x) => x.id === ft.id);
    assert.ok(t, ft.id);
    for (const k of ['name', 'seat', 'lonlat', 'river', 'terrain']) assert.deepEqual(t[k], ft[k], ft.id + '.' + k);
    assert.equal(t.lanes.length, 3);
    for (const l of t.lanes) assert.ok(Battle.LANE_TEXT[l], ft.id + ' lane ' + l);
    assert.equal(t.xz.length, 2);
  }
  // each general's named trait maps to a battle effect id
  const effect = { 'Uy chấn Tiêu Dao': 'charge', 'Giữ thành': 'walls', 'Thủy chiến': 'navy', 'Mình đầy thương tích': 'stubborn', 'Xuất thân bần nông': 'commoner' };
  for (const [id, x] of Object.entries(DATA.generals)) {
    assert.deepEqual(x.traits, effect[x.trait] ? [effect[x.trait]] : [], id);
    for (const k of ['uy', 'tai', 'muu', 'dung', 'kien', 'loyal']) assert.ok(Number.isFinite(x[k]), id + '.' + k);
  }
  assert.equal(DATA.generals.zhu.lord, true);
});

test('view: the fixture shape (view-start), the season-1 board', () => {
  const fx = fixture('view-start'), v = V2.view(newGame(11));
  for (const k of Object.keys(fx)) assert.ok(k in v, 'view.' + k);
  assert.deepEqual(Object.keys(v.towns[0]).sort(), Object.keys(fx.towns[0]).sort());
  for (const a of v.armies) assert.deepEqual(Object.keys(a).sort(), Object.keys(fx.armies[0]).sort(), a.id);
  // the spike's cards, word for word, but for two lines rewritten on 29/9 (freeze B): Liêu comes back in summer 220,
  // and the alliance with Ngô ends in spring 220 (it left Lịch Dương out of reach for good)
  const rewritten = { history_fan: (c) => { c.text = DATA.cards.find((x) => x.id === 'history_fan').text; }, envoy_wu: (c) => { c.yes.fx = DATA.cards.find((x) => x.id === 'envoy_wu').yes.fx; } };
  for (const c of v.cards) {
    const f = JSON.parse(JSON.stringify(fx.cards.find((x) => x.id === c.id) || null));
    assert.ok(f, c.id);
    if (rewritten[c.id]) rewritten[c.id](f);
    assert.deepEqual(c, f);
  }
  assert.deepEqual(v.cards.map((c) => c.id), fx.cards.map((c) => c.id));
  assert.deepEqual(v.gens, fx.gens);
  assert.equal(v.season, 1);
  assert.equal(v.calendar, 'Thu 219');
  assert.deepEqual(v.res, fx.res);
  assert.equal(v.income, null);
  assert.equal(v.report, null);
  const byId = (xs, id) => xs.find((x) => x.id === id);
  for (const id of ['chung_ly', 'am_lang']) assert.deepEqual(byId(v.towns, id), byId(fx.towns, id));
  for (const id of ['a1', 'a2']) assert.deepEqual(byId(v.armies, id), byId(fx.armies, id));
  assert.equal(byId(v.armies, 'e1').seen, 'near');
  assert.equal(byId(v.armies, 'e2').seen, 'far');
  assert.equal(byId(v.armies, 'e2').units, null);
  assert.deepEqual(byId(v.armies, 'e2').arms, ['thuy', 'bo']);
});

// ---------------------------------------------------------------- one season: capacity, not a checklist
test('a season ends with no order and no task: armies hold, towns start nothing', () => {
  for (let seed = 1; seed <= 12; seed++) {
    let g = newGame(seed);
    const before = V2.view(g);
    g = fight(V2.endSeason(g));
    assert.equal(g.season, 2, 'seed ' + seed);
    assert.ok(g.report && Array.isArray(g.report.lines));
    for (const t of Object.values(g.towns)) assert.equal(t.task, null);
    // our armies did not march on their own (they may only fall back after a battle)
    for (const a of before.armies.filter((x) => x.fid === g.me)) {
      const now = g.armies[a.id];
      if (now && !g.moves.some((m) => m.id === a.id && m.retreat)) assert.equal(now.at, a.at, 'seed ' + seed + ' ' + a.id);
    }
    // and the next one too, twice more
    g = fight(V2.endSeason(fight(V2.endSeason(g))));
    assert.ok(g.season === 4 || g.over, 'seed ' + seed);
  }
});

test('at most one order an army: a new order replaces the old, null holds, illegal orders throw', () => {
  let g = newGame(2);
  g = V2.order(g, 'a1', T('am_lang'));
  g = V2.order(g, 'a1', T('tho_xuan'), 'attack');
  let a1 = V2.view(g).armies.find((a) => a.id === 'a1');
  assert.deepEqual(a1.order, { intent: 'attack', target: T('tho_xuan') });
  g = V2.order(g, 'a1', null);
  a1 = V2.view(g).armies.find((a) => a.id === 'a1');
  assert.equal(a1.order, null);
  assert.throws(() => V2.order(g, 'e1', T('tho_xuan')), /not an army of ours/);
  assert.throws(() => V2.order(g, 'a1', T('lich_duong')), /not in reach/);
  assert.throws(() => V2.order(g, 'a1', T('tho_xuan')), /intent 'attack' or 'siege'/);
  assert.throws(() => V2.order(g, 'a1', T('am_lang'), 'attack'), /takes move/);
  assert.throws(() => V2.order(g, 'a2', A('e1')), /not in reach/); // boats do not chase horse
  // intent read from the target
  const ts = V2.targets(g, 'a1');
  assert.equal(ts.find((t) => t.id === 'am_lang').intent, 'move');
  assert.equal(ts.find((t) => t.id === 'tho_xuan').intent, 'ask');
  assert.equal(ts.find((t) => t.id === 'e1').intent, 'attack');
  // the season carries out one order an army, and clears them all
  g = V2.order(g, 'a1', T('hu_di'), 'siege');
  g = V2.order(g, 'a1', T('am_lang'));
  g = V2.order(g, 'a2', T('hu_di'), 'siege');
  const e = V2.endSeason(g);
  const marches = (id) => e.moves.filter((m) => m.id === id && !m.retreat);
  assert.equal(marches('a1').length, 1);
  assert.equal(marches('a1')[0].to, 'am_lang');
  assert.equal(marches('a2').length, 1);
  const g2 = fight(e);
  for (const a of Object.values(g2.armies)) assert.equal(a.order, null);
});

test('at most one task a town: a new pick refunds the old; work under way stays', () => {
  let g = calm();
  const tien = g.res.tien;
  g = V2.setTask(g, 'chung_ly', 'luy');
  assert.equal(g.res.tien, tien - 400);
  g = V2.setTask(g, 'chung_ly', 'cho');
  assert.equal(g.res.tien, tien - 300);
  assert.equal(V2.tasks(g, 'chung_ly').current.key, 'cho');
  g = V2.setTask(g, 'chung_ly', null);
  assert.equal(g.res.tien, tien);
  assert.equal(V2.view(g).towns.find((t) => t.id === 'chung_ly').task, null);
  g = V2.setTask(g, 'chung_ly', 'luy');
  g = V2.setTask(g, 'am_lang', 'mo_bo');
  g = V2.endSeason(g);
  const cl = V2.view(g).towns.find((t) => t.id === 'chung_ly');
  assert.deepEqual(cl.task, { key: 'luy', name: 'Đắp lũy', left: 1 });
  assert.throws(() => V2.setTask(g, 'chung_ly', 'cho'), /under way/);
  assert.throws(() => V2.setTask(g, 'chung_ly', null), /under way/);
  const ts = V2.tasks(g, 'chung_ly');
  assert.ok(ts.all.every((x) => !x.ok && /đang làm/.test(x.why)));
  assert.deepEqual(ts.suggested, []);
  // the one-season recruit is done and joined the garrison
  assert.equal(g.towns.am_lang.gar.bo, 1500);
  assert.equal(g.towns.am_lang.task, null);
  g = V2.endSeason(g);
  assert.equal(g.towns.chung_ly.walls, 3);
  assert.throws(() => V2.setTask(g, 'tho_xuan', 'luy'), /not a town of ours/);
});

test('cards: a queue; unanswered at the season end is "no"', () => {
  for (const seed of [1, 4, 9]) {
    const g = newGame(seed);
    assert.ok(g.cards.length >= 4 && g.cards.every((c) => !c.urgent));
    let no = g;
    for (const c of g.cards) no = V2.answer(no, c.id, false);
    assert.equal(no.cards.length, 0);
    assert.equal(bare(fight(V2.endSeason(g))), bare(fight(V2.endSeason(no))), 'seed ' + seed);
  }
  // answered in any order, at any time; an unknown card changes nothing
  let g = calm(5);
  g.cards = newGame(5).cards;
  g = V2.answer(g, 'gen_zhuhuan', true);
  assert.equal(g.gens.zhu_huan.loyal, 82);
  g = V2.answer(g, 'local_hudi', true);
  assert.equal(g.towns.hu_di.owner, g.me);
  assert.equal(g.res.luong, 900);
  assert.deepEqual(g.flash, { ok: true, text: 'Hu Dị mở cổng.' });
  assert.equal(bare(V2.answer(g, 'nope', true)), bare(Object.assign({}, g, { flash: null })));
  // Hu Dị pays no tax for two seasons
  const h = fight(V2.endSeason(g));
  assert.equal(h.report.income.luong, Math.round((24000 + 12000) * 0.03));
});

test('bottoming out: one season below the floor warns, two in a row fall', () => {
  let g = calm();
  g.res.luong = -2500;
  g = V2.endSeason(g);
  assert.ok(g.warn.luong);
  assert.equal(g.over, null);
  assert.equal(g.armies.a1.units.bo, 2880); // a tenth ran
  assert.ok(g.report.lines.some((l) => /Kho lương âm/.test(l)));
  g.res.luong = -2500;
  g = V2.endSeason(g);
  assert.equal(g.over.win, false);
  assert.match(g.over.why, /binh biến/);
  assert.deepEqual(V2.view(g).over, g.over);
  assert.deepEqual(g.cards, []);
  // Uy at 0: warned, recovered, warned again: still standing; two in a row: the fall
  let u = calm();
  u.res.uy = 0;
  u = V2.endSeason(u);
  assert.ok(u.warn.uy && !u.over);
  u.res.uy = 10; u.cards = [];
  u = V2.endSeason(u);
  assert.ok(!u.warn.uy && !u.over, 'recovered');
  u.res.uy = 0; u.cards = [];
  u = V2.endSeason(u);
  assert.ok(u.warn.uy && !u.over);
  u.res.uy = 0; u.cards = [];
  u = V2.endSeason(u);
  assert.equal(u.over.win, false);
  assert.match(u.over.why, /nổi dậy/);
  assert.equal(V2.endSeason(u).season, u.season, 'a finished game stays finished');
});

// ---------------------------------------------------------------- what the player sees
function checkView(g, where) {
  const v = V2.view(g), json = JSON.stringify(v);
  assert.doesNotMatch(json, FORBIDDEN, where);
  const known = (gid) => g.gens[gid] && (g.gens[gid].fid === g.me || g.captives.includes(gid));
  const cards = [].concat(v.armies.map((a) => a.gen), v.towns.map((t) => t.gov), Object.values(v.gens)).filter(Boolean);
  for (const c of cards) {
    if (known(c.id)) continue;
    assert.deepEqual(Object.keys(c).sort(), ['fid', 'id', 'name', 'seal'], where + ' ' + c.id);
  }
  for (const a of v.armies) {
    const truth = g.armies[a.id];
    assert.ok(a.arms.length > 0 && a.arms.every((k) => (truth.units[k] || 0) > 0), where + ' arms ' + a.id);
    if (a.seen === 'own') { assert.equal(a.fid, g.me); assert.deepEqual(a.units, { bo: 0, cung: 0, ky: 0, thuy: 0, ...truth.units }); continue; }
    assert.equal(a.order, null);
    if (a.seen === 'far') { assert.equal(a.units, null, where + ' far ' + a.id); continue; }
    // near: within ±20 %, rounded to hundreds, one factor for the whole army
    for (const k of Object.keys(truth.units)) {
      const n = truth.units[k], s = a.units[k];
      assert.equal(s % 100, 0);
      assert.ok(Math.abs(s - n) <= n * 0.2 + 50, where + ' ' + a.id + '.' + k + ' ' + s + ' vs ' + n);
    }
  }
  for (const t of v.towns) {
    const truth = g.towns[t.id];
    assert.equal(t.garApprox, truth.owner !== g.me);
    if (truth.owner !== g.me) for (const k of Object.keys(truth.gar)) assert.ok(t.gar[k] % 100 === 0 && Math.abs(t.gar[k] - truth.gar[k]) <= truth.gar[k] * 0.2 + 50, where + ' ' + t.id);
    if (truth.owner !== g.me) assert.equal(t.task, null);
  }
  return v;
}

test('view: far armies only show flag and arms, enemy generals only who they are, never the true odds', () => {
  for (let seed = 1; seed <= 16; seed++) {
    let g = newGame(seed);
    for (let s = 0; s < 4 && !g.over; s++) {
      checkView(g, 'seed ' + seed + ' s' + g.season);
      for (const a of Object.values(g.armies).filter((x) => x.fid === g.me)) {
        const t = V2.targets(g, a.id).find((x) => x.intent !== 'move');
        if (!t) continue;
        const f = V2.forecast(g, [a.id], t);
        assert.deepEqual(Object.keys(f).sort(), ['est', 'label', 'more', 'reasons', 'sa', 'sd']);
        assert.deepEqual(Object.keys(f.more).sort(), ['analyst', 'lanes', 'reasons']);
        assert.ok(f.reasons.length <= 2 && f.more.reasons.length <= 6);
        assert.ok(Battle.LABELS.some(([, l]) => l === f.label));
        assert.doesNotMatch(JSON.stringify(f), FORBIDDEN);
        g = V2.order(g, a.id, t, t.intent === 'ask' ? 'attack' : undefined);
        break;
      }
      g = V2.endSeason(g);
      while (g.pending) { checkView(g, 'seed ' + seed + ' battle'); g = V2.battleTurn(g, {}); }
    }
  }
  // the numbers hold all season and are the same each time we look
  const g = newGame(7);
  assert.deepEqual(V2.view(g).armies, V2.view(g).armies);
  const e1 = (x) => V2.view(x).armies.find((a) => a.id === 'e1').units;
  const later = newGame(7);
  later.season = 2;
  assert.notDeepEqual(e1(g), e1(later), 'a new season, a new reading');
});

test('forecast: the enemy as the view shows it, the analyst with the most Mưu, a fixed reading per question', () => {
  const g = newGame(11), v = V2.view(g);
  const target = T('tho_xuan'), ids = ['a1', 'a2'];
  const seen = V2.internal.seenPlan(g, ids, target), truth = V2.internal.plan(g, ids, target);
  const tx = v.towns.find((t) => t.id === 'tho_xuan').gar, e1 = v.armies.find((a) => a.id === 'e1').units;
  for (const k of ['bo', 'cung', 'ky']) assert.equal(seen.defender.units[k] || 0, tx[k] + e1[k], k);
  assert.notDeepEqual(seen.defender.units, truth.defender.units);
  assert.deepEqual(seen.attacker, truth.attacker);
  const f = V2.forecast(g, ids, target);
  const B = Battle.forecast(seen, V2.internal.battleGen(g, 'zhu'), { key: V2.internal.forecastKey(g, ids, target) });
  assert.equal(f.label, B.label);
  assert.equal(f.sa, B.sa);
  assert.equal(f.sd, B.sd);
  assert.deepEqual(f.est, B.est);
  assert.deepEqual(f.more.analyst, { id: 'zhu', name: 'Chu Nguyên Chương', muu: 7 });
  assert.deepEqual(f.reasons, B.reasons.slice(0, 2));
  assert.deepEqual(V2.forecast(g, ['a2'], T('hu_di')).more.analyst.id, 'zhu_huan');
  assert.deepEqual(V2.forecast(g, ids, target), f, 'asking again gives the same reading');
  assert.equal(V2.forecast(g, ['a1'], T('am_lang')), null, 'our own town is no battle');
  assert.equal(V2.forecast(g, ['a1'], T('lich_duong')), null, 'out of reach');
  assert.throws(() => V2.forecast(g, ['e1'], T('chung_ly')), /not an army of ours/);
  // a far army in the battle: the analyst guesses and says so first
  const far = newGame(11);
  far.armies.a1.at = 'am_lang';
  delete far.armies.a2;
  far.towns.chung_ly.owner = 'cao_cao';
  far.armies.e2.at = 'lich_duong';
  const ff = V2.forecast(far, ['a1'], A('e2'));
  assert.equal(V2.view(far).armies.find((a) => a.id === 'e2').units, null);
  assert.equal(ff.reasons[0].why, 'quân địch ở xa: số quân chỉ là đoán');
  // allied boats join an attack by a river
  let al = newGame(11);
  al = V2.answer(al, 'envoy_wu', true);
  const fa = V2.forecast(al, ['a2'], T('hu_di'));
  assert.match(fa.reasons[0].why, /thuyền đồng minh trợ chiến \+1\.200/);
  assert.equal(V2.internal.plan(al, ['a2'], T('hu_di')).attacker.units.thuy, 3000);
});

// ---------------------------------------------------------------- preview (freeze A "Hiện hệ quả")
test('preview: the resources after the season are what the season end really gives, when nothing else happens', () => {
  const acts = [
    { type: 'task', town: 'chung_ly', key: 'luy' },
    { type: 'task', town: 'am_lang', key: 'mo_bo' },
    { type: 'task', town: 'chung_ly', key: 'mo_thuy' },
    { type: 'order', army: 'a1', target: T('am_lang') },
    { type: 'order', army: 'a1', target: T('hu_di'), intent: 'siege' },
    { type: 'order', army: 'a2', target: T('hu_di'), intent: 'siege' },
    { type: 'order', army: 'a1', target: null },
  ];
  for (const [i, act] of acts.entries()) {
    for (const setup of [(g) => g, (g) => V2.setTask(g, 'am_lang', 'ruong'), (g) => V2.order(V2.setTask(g, 'chung_ly', 'cho'), 'a2', T('tho_xuan'), 'siege')]) {
      let g = setup(calm(i + 1));
      if (act.type === 'task' && g.towns[act.town].task) continue;
      const p = V2.preview(g, act);
      assert.ok(p.ok, JSON.stringify(act));
      for (const k of ['luong', 'tien', 'uy']) assert.equal(p.res[k][0], g.res[k]);
      g = act.type === 'task' ? V2.setTask(g, act.town, act.key) : V2.order(g, act.army, act.target, act.intent);
      g = V2.endSeason(g);
      assert.equal(g.pending, null);
      for (const k of ['luong', 'tien', 'uy']) assert.equal(p.res[k][1], g.res[k], JSON.stringify(act) + ' ' + k);
    }
  }
  const g = calm();
  const p = V2.preview(g, { type: 'task', town: 'chung_ly', key: 'luy' });
  assert.equal(p.seasons, 2);
  assert.match(p.lines[0], /^Lương 1\.200 → [\d.]+ · Tiền 900 → [\d.]+ · xong sau 2 mùa$/);
  assert.equal(V2.preview(g, { type: 'order', army: 'a1', target: T('am_lang') }).seasons, 1);
  const s = V2.preview(g, { type: 'order', army: 'a1', target: T('hu_di'), intent: 'siege' });
  assert.equal(s.fall, 1);
  assert.equal(s.res.uy[1], g.res.uy + 3, 'Hu Dị opens: Uy +3');
  // the owner, 29/9: a town that opens the same season says so plainly, before the siege's rule
  assert.match(s.lines[1], /mở cổng ngay cuối mùa này/);
  assert.ok(!s.lines.some((l) => /Ước mở cổng sau/.test(l)));
  const slow = V2.preview(g, { type: 'order', army: 'a2', target: T('tho_xuan'), intent: 'siege' });
  assert.ok(!slow.lines.some((l) => /ngay cuối mùa này/.test(l)));
  const bad = V2.preview(g, { type: 'task', town: 'am_lang', key: 'mo_thuy' });
  assert.equal(bad.ok, false);
  assert.equal(bad.why, 'Chỉ thành ven sông.');
  assert.equal(V2.preview(g, { type: 'order', army: 'a1', target: T('lich_duong') }).ok, false);
  assert.throws(() => V2.preview(g, { type: 'wish' }));
});

// ---------------------------------------------------------------- determinism and purity
function script(seed) {
  let g = newGame(seed);
  for (let s = 0; s < 5 && !g.over; s++) {
    for (const [i, c] of g.cards.entries()) g = V2.answer(g, c.id, (i + s) % 2 === 0);
    for (const a of Object.values(g.armies).filter((x) => x.fid === g.me)) {
      const t = V2.targets(g, a.id).find((x) => x.intent !== 'move');
      if (t) g = V2.order(g, a.id, t, t.intent === 'ask' ? (s % 2 ? 'siege' : 'attack') : undefined);
    }
    for (const tid of Object.keys(g.towns)) {
      const ts = V2.tasks(g, tid), k = ts.suggested.find((x) => ts.all.find((y) => y.key === x).ok);
      if (k) g = V2.setTask(g, tid, k);
    }
    g = V2.endSeason(g);
    let turn = 0;
    while (g.pending) {
      const B = V2.battle(g), w = Object.keys(B.proposed)[turn % Math.max(1, Object.keys(B.proposed).length)];
      const o = w && Battle.legalOrders(B.b, w).find((x) => x !== B.proposed[w]);
      g = turn++ % 2 && o ? V2.battleTurn(g, { [w]: o }) : V2.battleTurn(g, {});
    }
  }
  return g;
}

test('the same seed replays the same game (battles included); another seed plays another', () => {
  for (const seed of [3, 8, 21]) assert.equal(bare(script(seed)), bare(script(seed)), 'seed ' + seed);
  assert.notEqual(bare(script(3)), bare(script(4)));
  // a saved game (plain JSON) goes on exactly as the live one
  let g = V2.endSeason(newGame(8));
  const saved = JSON.parse(JSON.stringify(g));
  const on = (x) => bare(fight(V2.endSeason(fight(x))));
  assert.equal(on(saved), on(g));
});

test('pure: no Math.random, no clock, no DOM; calls leave their input untouched', () => {
  const code = fs.readFileSync(path.join(ROOT, 'src/engine/v2/huainan.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(code, /Math\.random|\bDate\b|performance\.|document\.|window\./);
  let g = newGame(6);
  const calls = [
    (x) => V2.view(x), (x) => V2.targets(x, 'a1'), (x) => V2.tasks(x, 'chung_ly'), (x) => V2.forecast(x, ['a1'], T('tho_xuan')),
    (x) => V2.preview(x, { type: 'task', town: 'chung_ly', key: 'luy' }), (x) => V2.order(x, 'a1', T('tho_xuan'), 'attack'),
    (x) => V2.setTask(x, 'chung_ly', 'luy'), (x) => V2.answer(x, 'envoy_wu', true), (x) => V2.transfer(x, 'chung_ly', 'a1', 'bo', 300),
    (x) => V2.endSeason(x),
  ];
  for (const c of calls) {
    const snap = bare(g);
    const out = c(g);
    assert.equal(bare(g), snap);
    if (out && out.data) assert.notEqual(out, g);
  }
  g = V2.endSeason(V2.order(V2.order(g, 'a1', T('tho_xuan'), 'attack'), 'a2', T('tho_xuan'), 'attack'));
  assert.ok(g.pending);
  const snap = bare(g);
  V2.battle(g); V2.battleTurn(g, {}); V2.autoBattle(g);
  assert.equal(bare(g), snap);
});

// ---------------------------------------------------------------- battles
test('a battle is fought to the end on the proposals alone, ours or theirs', () => {
  let g = newGame(11);
  g = V2.order(g, 'a1', T('tho_xuan'), 'attack');
  g = V2.order(g, 'a2', T('tho_xuan'), 'attack');
  g = V2.endSeason(g);
  const B = V2.battle(g);
  // the fixture shapes the scene and the UI were built on
  const f1 = fixture('battle-turn1'), fo = fixture('battle-over');
  for (const k of Object.keys(f1)) assert.ok(k in B, 'battle.' + k);
  for (const k of Object.keys(f1.plan)) if (k !== 'seed') assert.ok(k in B.plan, 'plan.' + k);
  assert.ok(!('seed' in B.plan), 'the battle\'s dice stay inside the engine');
  for (const side of ['attacker', 'defender']) for (const k of Object.keys(f1.plan[side])) assert.ok(k in B.plan[side], side + '.' + k);
  // the board both sides see: the day's fortune and dice stay inside the engine
  assert.deepEqual(Object.keys(B.b).sort(), Object.keys(f1.b).filter((k) => k !== 'rs' && k !== 'luck').sort());
  assert.deepEqual(Object.keys(B.plan.attacker.gen).sort(), Object.keys(f1.plan.attacker.gen).sort());
  assert.equal(B.me, 'A');
  assert.equal(B.plan.site, 'tho_xuan');
  assert.deepEqual(B.plan.lanes, ['open', 'ford', 'wood']);
  assert.equal(B.plan.attacker.gen.lord, true);
  assert.deepEqual(B.plan.attacker.gen.traits, ['commoner']);
  assert.deepEqual(Object.keys(B.proposed).sort(), Battle.live(B.b, 'A').sort());
  let h = g, turns = 0;
  while (h.pending && h.pending.id === B.id) { h = V2.battleTurn(h, {}); turns++; }
  assert.ok(turns >= 1 && turns <= 5);
  const L = V2.lastBattle(h);
  assert.deepEqual(Object.keys(L).sort(), Object.keys(fo).sort());
  assert.deepEqual(L.proposed, {});
  assert.ok(L.b.over && L.outcome.win);
  assert.deepEqual(L.outcome, Battle.outcome(L.b));
  assert.deepEqual(h.fought[0], { site: 'tho_xuan', win: L.outcome.win, me: 'A', la: L.outcome.losses.A, ld: L.outcome.losses.D });
  assert.equal(bare(fight(h)), bare(fight(V2.autoBattle(g))), 'the proposals turn by turn = "Tự đánh"');
  // a battle of theirs on us: Trương Liêu strikes Âm Lăng
  let d = newGame(11);
  d.cards = []; d.rumor = 0;
  d = V2.endSeason(d);
  const D = V2.battle(d);
  assert.equal(D.me, 'D');
  assert.equal(D.plan.site, 'am_lang');
  assert.equal(D.plan.attacker.gen.id, 'zhang_liao');
  assert.deepEqual(D.plan.attacker.gen.traits, ['charge']);
  while (d.pending) d = V2.battleTurn(d, {});
  assert.equal(d.season, 2);
  assert.throws(() => V2.battleTurn(d, {}), /no battle/);
  assert.equal(V2.battle(d), null);
});

test('battle turn: overriding one wing changes only that wing; the other side keeps its own orders', () => {
  let g = newGame(11);
  g = V2.order(V2.order(g, 'a1', T('tho_xuan'), 'attack'), 'a2', T('tho_xuan'), 'attack');
  g = V2.endSeason(g);
  let checked = 0;
  for (let k = 0; k < 2 && g.pending; k++) {
    const B = V2.battle(g);
    const w = Object.keys(B.proposed).find((id) => B.proposed[id] !== 'hoa' && Battle.legalOrders(B.b, id).some((o) => o !== B.proposed[id] && o !== 'hoa'));
    const o = Battle.legalOrders(B.b, w).find((x) => x !== B.proposed[w] && x !== 'hoa');
    const same = V2.battleTurn(g, {}), changed = V2.battleTurn(g, { [w]: o });
    if (!same.pending || !changed.pending) break; // the battle ended on this turn
    assert.deepEqual(same.pending.orders.A, B.proposed);
    assert.deepEqual(changed.pending.orders.A, { ...B.proposed, [w]: o });
    assert.deepEqual(changed.pending.orders.D, same.pending.orders.D);
    checked++;
    g = same;
  }
  assert.ok(checked >= 1);
  const B = V2.battle(g);
  const foe = B.b.wings.find((x) => x.side === 'D' && !x.gone);
  assert.throws(() => V2.battleTurn(g, { [foe.id]: 'giu' }), /not a live wing of ours/);
  const cav = B.b.wings.find((x) => x.side === 'A' && !x.gone && x.arm === 'bo');
  assert.throws(() => V2.battleTurn(g, { [cav.id]: 'xung' }), /cannot xung/);
  assert.throws(() => V2.endSeason(g), /battle is pending/);
  assert.throws(() => V2.order(g, 'a1', null), /battle is pending/);
});

test('AI against AI resolves on its own: allied Ngô takes Lịch Dương from the hào tộc', () => {
  let seen = 0;
  for (let seed = 1; seed <= 6; seed++) {
    let g = newGame(seed);
    delete g.armies.e1;
    g = V2.answer(g, 'envoy_wu', true);
    g = V2.endSeason(g);
    assert.equal(g.pending, null, 'not our battle');
    // Lịch Dương is far from us: the recap says only that it changed hands, never the others' losses
    const line = g.report.lines.find((l) => /Lịch Dương/.test(l) && /Ngô/.test(l));
    if (g.towns.lich_duong.owner === 'sun_quan') assert.equal(line, 'Lịch Dương về tay Ngô.', 'seed ' + seed);
    assert.ok(!g.report.lines.some((l) => /Thương vong/.test(l)), 'seed ' + seed);
    if (g.towns.lich_duong.owner === 'sun_quan') seen++;
    assert.equal(g.fought.length, 0);
  }
  assert.ok(seen >= 4, 'Ngô usually takes it (' + seen + '/6)');
});

test('after a battle: the town changes hands, the governor is taken, the losers fall back, Uy moves', () => {
  let g = newGame(11);
  delete g.armies.e1; // Liêu gone to Phàn Thành
  g.cards = [];
  g.towns.tho_xuan.gar = { ...SPIKE_THO_XUAN };
  g = V2.order(V2.order(g, 'a1', T('tho_xuan'), 'attack'), 'a2', T('tho_xuan'), 'attack');
  g = fight(V2.endSeason(g));
  assert.equal(g.towns.tho_xuan.owner, g.me);
  assert.deepEqual(g.report.taken, [{ town: 'tho_xuan', from: 'cao_cao', to: g.me, siege: false }]);
  assert.equal(g.towns.tho_xuan.walls, 2);
  assert.equal(g.towns.tho_xuan.gov, null);
  assert.deepEqual(g.captives, ['man_chong']);
  assert.equal(g.armies.a1.at, 'tho_xuan');
  assert.equal(g.res.uy, 54);
  const c = g.cards.find((x) => x.id === 'captive_man_chong');
  assert.equal(c.kind, 'captive');
  assert.equal(c.title, 'Bắt sống Mãn Sủng');
  assert.equal(c.yes.fx, '25% theo ta; không thì chém');
  // a captive in our hands: his card in full
  assert.equal(V2.view(g).gens.man_chong.muu, 8);
  // unanswered: released, Uy +6
  const r = V2.endSeason(g);
  assert.equal(r.gens.man_chong.free, true);
  assert.equal(r.captives.length, 0);
  assert.deepEqual(Object.keys(V2.view(r).gens.man_chong).sort(), ['fid', 'id', 'name', 'seal']);
  // answered yes: he joins or dies, the same way every time for this seed
  const y1 = V2.answer(g, c.id, true), y2 = V2.answer(g, c.id, true);
  assert.deepEqual(y1.gens.man_chong, y2.gens.man_chong);
  assert.ok(y1.gens.man_chong.fid === g.me || y1.gens.man_chong.dead);
});

test('an army left in a town its side lost falls back; with no town of its own it leaves; a guest stays', () => {
  // Chu Hoàn sails on Hu Dị and fails; Trương Liêu takes Chung Ly behind him
  let g = newGame(11);
  g.cards = []; g.rumor = 0;
  delete g.armies.e2;
  g.armies.a1.at = 'am_lang';
  g.towns.chung_ly.gar = { bo: 200 };
  g.towns.hu_di.gar = { bo: 5000 };
  g = fight(V2.endSeason(V2.order(g, 'a2', T('hu_di'), 'attack')));
  assert.equal(g.towns.chung_ly.owner, 'cao_cao');
  assert.equal(g.armies.a2.at, 'am_lang');
  assert.ok(g.report.lines.includes('Chu Hoàn rút về Âm Lăng.'));
  // Chu Hoàn besieges Thọ Xuân, Trương Liêu rides out at him, Chu Nguyên Chương storms the town behind Liêu: Liêu wins
  // his fight but has no town left, so he leaves Hoài Nam
  let left = 0;
  for (let seed = 1; seed <= 20 && !left; seed++) {
    let h = newGame(seed);
    h.cards = []; h.rumor = 0;
    delete h.armies.e2;
    h.armies.a2.at = 'tho_xuan'; h.armies.a2.besieging = 'tho_xuan';
    h.towns.tho_xuan.gar = { ...SPIKE_THO_XUAN };
    h = fight(V2.endSeason(V2.order(h, 'a1', T('tho_xuan'), 'attack')));
    if (h.towns.tho_xuan.owner !== h.me) continue;
    assert.equal(h.armies.e1, undefined, 'seed ' + seed);
    assert.ok(h.report.lines.includes('Trương Liêu rời Hoài Nam.'), 'seed ' + seed);
    left++;
  }
  assert.equal(left, 1);
  // a guest in another side's town stays: Ngô's fleet at the hào tộc's Lịch Dương, when Ngô does not strike
  let guests = 0;
  for (let seed = 1; seed <= 10; seed++) {
    const n = newGame(seed);
    n.cards = []; n.rumor = 1;
    const k = fight(V2.endSeason(n));
    if (k.towns.lich_duong.owner !== 'local') continue;
    assert.equal(k.armies.e2.at, 'lich_duong', 'seed ' + seed);
    guests++;
  }
  assert.ok(guests > 0);
});

test('sieges: the garrison starves and the walls fall each season; below 30 % the gates open', () => {
  let g = calm();
  g = V2.order(g, 'a2', T('tho_xuan'), 'siege');
  g = V2.endSeason(g);
  assert.equal(g.armies.a2.besieging, 'tho_xuan');
  assert.equal(g.towns.tho_xuan.walls, 2);
  const tx = DATA.start.towns.tho_xuan.gar, grow = DATA.ai.cao_cao.growth;
  assert.deepEqual(g.towns.tho_xuan.gar, { bo: Math.round(tx.bo * 0.8) + grow, cung: Math.round(tx.cung * 0.8) });
  assert.ok(g.report.lines.some((l) => /Thọ Xuân bị vây/.test(l)));
  // no new order: the siege goes on (no order = hold where it stands)
  g = V2.endSeason(g);
  assert.equal(g.towns.tho_xuan.walls, 1);
  let h = calm();
  h = V2.order(h, 'a1', T('hu_di'), 'siege');
  h = V2.endSeason(h);
  assert.equal(h.towns.hu_di.owner, h.me);
  assert.equal(h.armies.a1.besieging, null);
  assert.deepEqual(h.captives, ['tran']);
  assert.equal(h.towns.hu_di.gar.bo, 800);
  // the recap says which towns changed hands, so the page can show each one on the map
  assert.deepEqual(h.report.taken, [{ town: 'hu_di', from: 'local', to: h.me, siege: true }]);
  assert.deepEqual(V2.view(h).report.taken, h.report.taken);
});

// ---------------------------------------------------------------- towns, generals, the end
test('tasks: every task with ok and why, 2–3 suggested by the town\'s situation', () => {
  const g = newGame(1);
  const all = V2.tasks(g, 'chung_ly').all;
  assert.deepEqual(all.map((x) => x.key), Object.keys(DATA.tasks));
  for (const x of all) assert.deepEqual(Object.keys(x).sort(), ['cost', 'key', 'name', 'ok', 'seasons', 'text', 'why']);
  // Liêu can reach both our towns: walls and foot
  assert.deepEqual(V2.tasks(g, 'chung_ly').suggested, ['luy', 'mo_bo']);
  assert.deepEqual(V2.tasks(g, 'am_lang').suggested, ['luy', 'mo_bo']);
  assert.equal(V2.tasks(g, 'am_lang').all.find((x) => x.key === 'mo_thuy').why, 'Chỉ thành ven sông.');
  // with Liêu gone they are rear towns: fields and a market; a river town with no boats builds them
  const q = newGame(1);
  delete q.armies.e1;
  assert.deepEqual(V2.tasks(q, 'am_lang').suggested, ['ruong', 'cho']);
  assert.deepEqual(V2.tasks(q, 'chung_ly').suggested, ['ruong', 'cho']);
  delete q.armies.a2;
  assert.deepEqual(V2.tasks(q, 'chung_ly').suggested, ['ruong', 'cho', 'mo_thuy']);
  q.res.tien = 0;
  assert.ok(V2.tasks(q, 'chung_ly').all.every((x) => !x.ok && /^Thiếu tiền/.test(x.why)));
  assert.deepEqual(V2.tasks(q, 'chung_ly').suggested, ['ruong', 'cho', 'mo_thuy'], 'suggested by the situation, the purse shows as ok/why');
  assert.deepEqual(V2.tasks(q, 'tho_xuan').suggested, []);
});

test('transfer: men move freely between a town of ours and an army in it; an army keeps a core', () => {
  let g = newGame(1);
  g = V2.transfer(g, 'chung_ly', 'a1', 'bo', 500);
  assert.equal(g.towns.chung_ly.gar.bo, 300);
  assert.equal(g.armies.a1.units.bo, 3700);
  g = V2.transfer(g, 'chung_ly', 'a1', 'bo', 5000);
  assert.equal(g.towns.chung_ly.gar.bo, 0);
  g = V2.transfer(g, 'chung_ly', 'a2', 'thuy', -99999);
  assert.deepEqual([g.armies.a2.units.thuy, g.towns.chung_ly.gar.thuy], [0, 1800]);
  g = V2.transfer(g, 'chung_ly', 'a2', 'bo', -99999);
  assert.equal(g.armies.a2.units.bo, 100);
  assert.equal(g.armies.a2.order, null, 'not an order');
  assert.throws(() => V2.transfer(g, 'am_lang', 'a1', 'bo', 100), /not an army of ours in am_lang/);
  assert.throws(() => V2.transfer(g, 'chung_ly', 'a1', 'thuy', 100), /boats only join a fleet/);
});

test('Trung: a promised vanguard kept waiting loses 15; under 30 a general walks out with his army', () => {
  let g = calm();
  g.cards = newGame(1).cards.filter((c) => c.id === 'gen_zhuhuan');
  g = V2.answer(g, 'gen_zhuhuan', true);
  assert.deepEqual(g.vanguard, { army: 'a2', broken: -15 });
  const kept = V2.endSeason(g);
  assert.equal(kept.gens.zhu_huan.loyal, 67);
  assert.ok(kept.report.lines.includes('!Chu Hoàn giận vì không được đánh trước: Trung −15.'));
  const sent = V2.endSeason(V2.order(g, 'a2', T('hu_di'), 'siege'));
  assert.equal(sent.gens.zhu_huan.loyal, 82);
  // under 55 he asks for a town; under 30 he leaves with the fleet
  let h = calm();
  h.gens.zhu_huan.loyal = 50;
  h = V2.endSeason(h);
  const c = h.cards.find((x) => x.id === 'gen_zhuhuan_unhappy_2');
  assert.equal(c.text, 'Lòng trung còn 50. Ông đòi được giữ một thành.');
  const y = V2.answer(h, c.id, true);
  assert.equal(y.gens.zhu_huan.loyal, 70);
  assert.equal(y.towns.am_lang.gov, 'zhu_huan');
  h.gens.zhu_huan.loyal = 25;
  h.cards = [];
  h = V2.endSeason(h);
  assert.equal(h.armies.a2, undefined);
  assert.equal(h.gens.zhu_huan.fid, 'local');
  assert.ok(h.report.lines.some((l) => /^!Chu Hoàn bỏ đi, mang theo 2\.400 quân\.$/.test(l)));
});

test('the end: five towns win; losing them all, or the lord, loses', () => {
  let g = calm();
  for (const t of Object.values(g.towns)) t.owner = g.me;
  g = V2.endSeason(g);
  assert.deepEqual(g.over, { win: true, why: 'Năm thành Hoài Nam về một mối.' });
  let l = calm();
  for (const t of Object.values(l.towns)) t.owner = 'cao_cao';
  l = V2.endSeason(l);
  assert.deepEqual(l.over, { win: false, why: 'Mất cả Hoài Nam.' });
  // the lord's army broken with nowhere to go
  let d = newGame(11);
  d.cards = [];
  for (const t of ['chung_ly', 'am_lang']) d.towns[t].owner = 'local';
  d.towns.hu_di.owner = d.me;
  d.armies.a1.at = 'hu_di'; d.armies.a1.units = { bo: 150 };
  delete d.armies.a2;
  d.towns.hu_di.gar = {};
  d.rumor = 0;
  d.armies.e1.at = 'am_lang';
  d = fight(V2.endSeason(d));
  assert.equal(d.over.win, false);
  assert.equal(d.over.why, 'Chu Nguyên Chương tử trận ở Hu Dị.');
});

// ---------------------------------------------------------------- the spike's own checks (demo1/test-rules.js)
test('spike: foot reaches Thọ Xuân, not Lịch Dương; the fleet stays on the Huai', () => {
  const g = newGame(1), ta = V2.targets(g, 'a1'), tf = V2.targets(g, 'a2');
  assert.ok(ta.some((t) => t.id === 'tho_xuan') && !ta.some((t) => t.id === 'lich_duong'));
  assert.ok(tf.every((t) => (t.kind === 'town' ? DATA.towns.find((x) => x.id === t.id).river === 'hoai' : true)) && !tf.some((t) => t.id === 'e2'));
  const s = Spike.newGame(1);
  const key = (xs) => xs.map((t) => t.kind + ':' + t.id + ':' + t.d).sort();
  assert.deepEqual(key(ta), key(Spike.targets(s, 'a1')));
  assert.deepEqual(key(tf), key(Spike.targets(s, 'a2')));
});

test('spike: the battle plans carry the spike\'s numbers (armies, garrisons, walls, lanes, who leads)', () => {
  const cases = [[['a1'], T('tho_xuan')], [['a1', 'a2'], T('tho_xuan')], [['a2'], T('hu_di')], [['a1'], T('hu_di')], [['a1'], A('e1')], [['e1'], T('am_lang')], [['e1'], T('chung_ly')], [['e2'], T('lich_duong')]];
  for (const [ids, tgt] of cases) {
    const g = newGame(1), s = Spike.newGame(1);
    // the spike's rules on the demo's numbers (freeze B, 29/9: Thọ Xuân's garrison)
    for (const [tid, x] of Object.entries(DATA.start.towns)) s.towns[tid].gar = JSON.parse(JSON.stringify(x.gar));
    const p = V2.internal.plan(g, ids, tgt), q = Spike.battlePlan(s, ids.length === 1 ? ids[0] : ids, tgt);
    const where = ids.join('+') + ' → ' + tgt.id;
    assert.equal(p.site, q.site, where);
    assert.equal(p.siege, q.siege, where);
    assert.equal(p.walls, q.defender.walls, where);
    assert.deepEqual(p.lanes, Spike.battle.lanesFor(q), where);
    assert.deepEqual(p.attacker.units, q.attacker.units, where);
    assert.deepEqual(p.defender.units, q.defender.units, where);
    assert.deepEqual(p.defender.armies, q.defender.armies, where);
    assert.equal(p.attacker.gen.id, q.attacker.gen, where);
    assert.equal(p.defender.gen && p.defender.gen.id, q.defender.gen || null, where);
    // the freeze: an army with no order holds (drawn up and waiting, +15 % in the field)
    assert.equal(p.defender.holding, p.defender.armies.length > 0, where);
  }
});

test('spike: Liêu\'s recall and the season\'s grain and coin come out as in the spike, seed by seed', () => {
  let recalled = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const g = V2.endSeason(newGame(seed)), s = Spike.endSeason(Spike.newGame(seed));
    const gone = g.moves.some((m) => m.id === 'e1' && m.leave);
    assert.equal(gone, !!s.recalled, 'seed ' + seed);
    if (!gone) continue;
    recalled++;
    assert.equal(g.pending, null);
    assert.deepEqual(g.res, s.res, 'seed ' + seed);
    assert.deepEqual(g.income, s.income, 'seed ' + seed);
    assert.deepEqual(g.gens.zhu_huan.loyal, s.gens.zhu_huan.loyal);
  }
  assert.ok(recalled >= 8 && recalled <= 22, recalled + '/30');
});

test('spike: the cunning general reads closer (Mưu 7 against Mưu 3)', () => {
  let hit7 = 0, hit3 = 0;
  const n = 40;
  for (let seed = 1; seed <= n; seed++) {
    const g = newGame(seed);
    delete g.armies.e1;
    const truth = (ids) => Battle.labelOf(Battle.odds(V2.internal.plan(g, ids, T('hu_di')), { key: V2.internal.forecastKey(g, ids, T('hu_di')) }).win);
    g.season = seed; // another question each time
    if (V2.forecast(g, ['a1'], T('hu_di')).label === truth(['a1'])) hit7++;
    if (V2.forecast(g, ['a2'], T('hu_di')).label === truth(['a2'])) hit3++;
  }
  assert.ok(hit7 > hit3, 'Mưu 7 ' + hit7 + '/' + n + ' vs Mưu 3 ' + hit3 + '/' + n);
});

test('spike: whole seasons played several ways stay sound', () => {
  const nearest = (g, a) => V2.targets(g, a.id).filter((t) => t.intent !== 'move' && t.kind === 'town').sort((x, y) => x.d - y.d)[0];
  const policies = {
    greedy: { card: () => true, orders: (g) => { for (const a of Object.values(g.armies).filter((x) => x.fid === g.me)) { const t = nearest(g, a); if (t) g = V2.order(g, a.id, t, 'attack'); } return g; } },
    sieger: { card: (c) => c.id === 'history_fan' || c.id === 'local_hudi', orders: (g) => { const a = g.armies.a1; if (a && V2.targets(g, 'a1').some((t) => t.id === 'tho_xuan' && t.intent === 'ask')) g = V2.order(g, 'a1', T('tho_xuan'), 'siege'); return g; } },
    passive: { card: () => false, orders: (g) => g },
    spender: { card: () => false, orders: (g) => { for (const t of ['chung_ly', 'am_lang']) if (g.towns[t].owner === g.me && V2.tasks(g, t).all.find((x) => x.key === 'mo_bo').ok) g = V2.setTask(g, t, 'mo_bo'); return g; } },
  };
  for (const [name, p] of Object.entries(policies)) for (const seed of [1, 2, 3, 4]) {
    let g = newGame(seed);
    for (let s = 0; s < 4 && !g.over; s++) {
      for (const c of g.cards.slice()) g = V2.answer(g, c.id, p.card(c, g));
      g = fight(V2.endSeason(p.orders(g)));
      const where = name + ' seed ' + seed + ' s' + s;
      for (const k of ['luong', 'tien', 'uy']) assert.ok(Number.isFinite(g.res[k]), where);
      for (const a of Object.values(g.armies)) { assert.ok(g.towns[a.at], where); assert.ok(Object.values(a.units).every((n) => n >= 0 && Number.isInteger(n)), where); }
      for (const t of Object.values(g.towns)) assert.ok(DATA.factions[t.owner], where);
      assert.ok(g.report.lines.length > 0, where);
    }
  }
});

// ---------------------------------------------------------------- polish 29/9: the general's plan, pacing, hopeless battles
const apply = (g, plan) => {
  for (const x of plan) g = x.type === 'order' ? V2.order(g, x.army, x.target, x.intent) : V2.setTask(g, x.town, x.key);
  return g;
};

test('advise: a whole legal plan, one line for each army, a reason for each; the cards answered in order', () => {
  for (let seed = 1; seed <= 6; seed++) {
    let g = newGame(seed);
    for (let s = 0; s < 6 && !g.over; s++) {
      const cards = V2.adviseCards(g);
      assert.deepEqual(cards.map((c) => c.card).sort(), g.cards.map((c) => c.id).sort());
      for (const c of cards) { assert.equal(typeof c.yes, 'boolean'); assert.ok(c.why, c.card); g = V2.answer(g, c.card, c.yes); }
      const plan = V2.advise(g);
      const ours = Object.values(g.armies).filter((a) => a.fid === g.me).map((a) => a.id).sort();
      assert.deepEqual(plan.filter((x) => x.type === 'order').map((x) => x.army).sort(), ours, 'seed ' + seed);
      for (const x of plan) {
        assert.ok(typeof x.why === 'string' && x.why.length > 8 && x.why.length < 160, x.why);
        if (x.type === 'order') assert.ok(x.target === null ? x.intent === 'hold' : ['move', 'attack', 'siege'].includes(x.intent), JSON.stringify(x));
        else assert.equal(g.towns[x.town].owner, g.me);
      }
      assert.doesNotMatch(JSON.stringify(plan), FORBIDDEN);
      assert.equal(JSON.stringify(V2.advise(g)), JSON.stringify(plan), 'the same board, the same plan');
      g = V2.endSeason(apply(g, plan)); // legal: nothing throws
      while (g.pending) g = V2.battleTurn(g, {});
    }
  }
  assert.deepEqual(V2.advise(Object.assign(newGame(1), { over: { win: true, why: '' } })), []);
});

test('advise reads only what the player sees: the AI\'s settings, its dice and the rumor do not move it', () => {
  for (const seed of [2, 5, 9]) {
    let g = newGame(seed);
    for (const c of V2.adviseCards(g)) g = V2.answer(g, c.card, c.yes);
    const plan = JSON.stringify(V2.advise(g));
    const h = JSON.parse(JSON.stringify(Object.assign({}, g, { data: null })));
    h.data = JSON.parse(JSON.stringify(DATA));
    h.data.ai.cao_cao.strike = 0.1; h.data.ai.cao_cao.growth = 900; h.data.ai.sun_quan.chance = 1;
    h.rumor = 1 - g.rumor; h.rs = (g.rs ^ 0xabcdef) >>> 0;
    assert.equal(JSON.stringify(V2.advise(h)), plan, 'seed ' + seed);
  }
  // it does not open a town to an enemy in reach: Liêu (6.000) could take Chung Ly were the main army to march off
  const g = newGame(1);
  g.cards = [];
  const a1 = V2.advise(g).find((x) => x.army === 'a1');
  assert.deepEqual([a1.intent, a1.target], ['hold', null]);
  assert.equal(a1.why, 'Giữ Chung Ly: đi thì Trương Liêu đánh tới được.');
  // a weak town in reach opens this season: the general besieges it and says so
  const w = newGame(1);
  w.cards = []; delete w.armies.e1;
  const x = V2.advise(w).find((o) => o.intent === 'siege' && o.target.id === 'hu_di');
  assert.ok(x, 'siege Hu Dị');
  assert.match(x.why, /mở cổng ngay cuối mùa này/);
});

test('a hopeless battle says so, and the player may yield it before the first turn, at its cost', () => {
  // Âm Lăng holds 500; Trương Liêu comes with 6.000
  let g = newGame(11);
  g.cards = []; g.rumor = 0;
  g = V2.endSeason(g);
  const B = V2.battle(g);
  assert.deepEqual([B.me, B.plan.site, B.hopeless], ['D', 'am_lang', true]);
  assert.match(B.withdraw.lines[0], /^Bỏ Âm Lăng không đánh: 500 quân rút về Chung Ly\.$/);
  assert.match(B.withdraw.lines[1], /^Uy −10/);
  const uy = g.res.uy, gar = g.towns.chung_ly.gar.bo;
  const w = V2.withdraw(g);
  assert.equal(w.pending, null);
  assert.equal(w.towns.am_lang.owner, 'cao_cao');
  assert.equal(w.towns.am_lang.walls, 1, 'given up, the walls stand');
  assert.equal(w.towns.chung_ly.gar.bo, gar + 500, 'the garrison is kept');
  assert.equal(w.res.uy, uy - 10);
  assert.deepEqual(w.report.taken, [{ town: 'am_lang', from: g.me, to: 'cao_cao', siege: false, yielded: true }]);
  assert.deepEqual(w.report.battles, [{ site: 'am_lang', a: 'cao_cao', d: g.me, win: 'A', me: 'D', yielded: true }]);
  assert.equal(w.report.fought.length, 0, 'no battle was fought');
  // after the first turn it is too late
  const t1 = V2.battleTurn(g, {});
  if (t1.pending) { assert.equal(V2.battle(t1).withdraw, null); assert.throws(() => V2.withdraw(t1), /before the first turn/); }
  assert.throws(() => V2.withdraw(newGame(1)), /no battle/);
  // a battle we can win is not hopeless; an attack called off keeps the armies where they stood, Uy −5
  let a = newGame(11);
  delete a.armies.e1; a.cards = [];
  a.towns.tho_xuan.gar = { ...SPIKE_THO_XUAN };
  a = V2.endSeason(V2.order(V2.order(a, 'a1', T('tho_xuan'), 'attack'), 'a2', T('tho_xuan'), 'attack'));
  assert.equal(V2.battle(a).hopeless, false);
  assert.match(V2.battle(a).withdraw.lines[0], /^Rút lệnh đánh Thọ Xuân/);
  const off = V2.withdraw(a);
  assert.deepEqual([off.armies.a1.at, off.armies.a2.at, off.towns.tho_xuan.owner], ['chung_ly', 'chung_ly', 'cao_cao']);
  assert.equal(off.res.uy, a.res.uy - 5);
  // an empty town of ours falls without asking the player to fight for it
  let e = newGame(11);
  e.cards = []; e.rumor = 0; e.towns.am_lang.gar = {};
  e = V2.endSeason(e);
  assert.equal(e.pending, null);
  assert.equal(e.towns.am_lang.owner, 'cao_cao');
});

test('what the player is shown of a battle: the board, not the day\'s fortune, the dice or the enemy general\'s stats', () => {
  let d = newGame(11);
  d.cards = []; d.rumor = 0;
  d = V2.endSeason(d);
  const B = V2.battle(d);
  for (const k of ['rs', 'luck']) assert.ok(!(k in B.b), k);
  assert.ok(!('seed' in B.plan));
  assert.deepEqual(Object.keys(B.plan.attacker.gen).sort(), ['id', 'lord', 'name', 'traits']);
  assert.deepEqual(Object.keys(B.b.A.gen).sort(), ['id', 'lord', 'name', 'traits']);
  assert.equal(B.b.D.gen.kien, Battle.OFFICER.kien, 'our side in full');
  assert.equal(typeof B.b.wind, 'boolean', 'the wind is for all to see');
  while (d.pending) d = V2.battleTurn(d, {});
  const L = V2.lastBattle(d);
  assert.ok(!('luck' in L.b) && !('seed' in L.plan));
  assert.deepEqual(Object.keys(L.b.A.gen).sort(), ['id', 'lord', 'name', 'traits']);
});

test('the alliance with Ngô ends in spring 220; its fleet then sails west, and Lịch Dương can be taken', () => {
  let found = 0;
  for (let seed = 1; seed <= 12; seed++) {
    let g = newGame(seed);
    delete g.armies.e1;
    g = V2.answer(g, 'envoy_wu', true);
    g = fight(V2.endSeason(g));
    if (g.towns.lich_duong.owner !== 'sun_quan') continue;
    // Lã Mông's card is about a hào tộc town: not dealt while Ngô holds it
    assert.ok(!g.cards.some((c) => c.src === 'history_lu'), 'seed ' + seed);
    g.cards = [];
    g = fight(V2.endSeason(g));
    assert.ok(g.allies.sun_quan && g.armies.e2, 'allied through winter');
    g.cards = [];
    g = fight(V2.endSeason(g));
    assert.equal(g.allies.sun_quan, undefined);
    assert.ok(g.report.lines.some((l) => /xưng thần với Tào/.test(l)));
    assert.equal(g.armies.e2, undefined, 'the fleet sailed west');
    g.armies.a1.at = 'am_lang';
    assert.equal(V2.targets(g, 'a1').find((t) => t.id === 'lich_duong').intent, 'ask');
    found++;
  }
  assert.ok(found >= 3, found);
  // with Lịch Dương still the hào tộc's, Lã Mông's card comes
  const n = fight(V2.endSeason(Object.assign(newGame(3), { cards: [] })));
  if (n.towns.lich_duong.owner === 'local') assert.ok(n.cards.some((c) => c.src === 'history_lu'));
});

test('Trương Liêu comes back in summer 220: into a town Tào holds, or straight at the one he left', () => {
  const back = DATA.ai.cao_cao.recall.back;
  const quiet = (g) => { g.cards = []; return fight(V2.endSeason(g)); };
  let g = newGame(1);
  g.rumor = 1;
  for (let s = 1; s < back.season; s++) g = quiet(g);
  assert.ok(!g.armies.e1, 'away at Phàn Thành');
  g = quiet(g);
  assert.equal(g.armies.e1.at, 'tho_xuan');
  assert.deepEqual(g.armies.e1.units, back.units);
  assert.ok(g.report.lines.some((l) => /Trương Liêu trở lại Thọ Xuân/.test(l)));
  assert.ok(V2.view(g).moves.some((m) => m.id === 'e1' && m.arrive && m.from === null && m.to === 'tho_xuan'));
  // Thọ Xuân fell meanwhile: he marches on it the season he comes
  let h = newGame(1);
  h.rumor = 1;
  h = quiet(h);
  h.towns.tho_xuan.owner = h.me; h.towns.tho_xuan.gar = { bo: 9000 };
  for (let s = 2; s < back.season; s++) h = quiet(h);
  h.cards = [];
  h = V2.endSeason(h);
  const B = V2.battle(h);
  assert.deepEqual([B.me, B.plan.site, B.plan.from, B.plan.attacker.gen.id], ['D', 'tho_xuan', null, 'zhang_liao']);
  // beaten, with no town of Tào's left here, he goes home
  h = fight(h);
  if (h.towns.tho_xuan.owner === h.me) {
    assert.equal(h.armies.e1, undefined);
    assert.ok(h.report.lines.includes('Trương Liêu rời Hoài Nam.'));
  }
});

test('recruits join the army of ours standing in the town (foot to the land army, boats to the fleet), else the garrison', () => {
  let g = calm();
  const a1 = g.armies.a1.units.bo, cl = g.towns.chung_ly.gar.bo;
  g = V2.setTask(V2.setTask(g, 'chung_ly', 'mo_bo'), 'am_lang', 'mo_bo');
  const p = V2.preview(g, { type: 'order', army: 'a1', target: null });
  g = V2.endSeason(g);
  assert.equal(p.res.luong[1], g.res.luong, 'the preview knows the new men eat as soldiers');
  assert.equal(g.armies.a1.units.bo, a1 + 1000);
  assert.equal(g.towns.chung_ly.gar.bo, cl);
  assert.equal(g.towns.am_lang.gar.bo, 1500);
  assert.deepEqual(g.report.done, [{ town: 'chung_ly', key: 'mo_bo' }, { town: 'am_lang', key: 'mo_bo' }]);
  g = V2.endSeason(V2.setTask(g, 'chung_ly', 'mo_thuy'));
  assert.equal(g.armies.a2.units.thuy, 1800 + 600);
});

test('the recap and the playback: work done, sieges, battles seen; marches only where the player could see them', () => {
  let h = calm();
  h = V2.order(V2.order(h, 'a1', T('hu_di'), 'siege'), 'a2', T('tho_xuan'), 'siege');
  h = V2.endSeason(h);
  assert.deepEqual(h.report.sieges, [
    { town: 'hu_di', by: h.me, armies: ['a1'], fresh: true, walls: 0, open: true },
    { town: 'tho_xuan', by: h.me, armies: ['a2'], fresh: true, walls: 2, open: false },
  ]);
  assert.deepEqual(V2.view(h).moves.map((m) => [m.id, m.from, m.to, !!m.siege]), [['a1', 'chung_ly', 'hu_di', true], ['a2', 'chung_ly', 'tho_xuan', true]]);
  // the siege line reads the garrison as the player sees it (±20 %), not the truth
  assert.match(h.report.lines.find((l) => /Thọ Xuân bị vây/.test(l)), /đồn còn ~[\d.]+00, lũy còn 2/);
  h = V2.endSeason(h);
  assert.equal(h.report.sieges[0].fresh, false, 'a siege under way');
  // Ngô's fleet sails from Lịch Dương, far from us: in the truth's moves, not the player's
  for (const seed of [1, 2, 3]) {
    let n = newGame(seed);
    n.cards = []; delete n.armies.e1;
    n = fight(V2.endSeason(n));
    n.cards = [];
    n = fight(V2.endSeason(n));
    assert.ok(n.moves.some((m) => m.id === 'e2' && m.leave), 'seed ' + seed);
    assert.ok(!V2.view(n).moves.some((m) => m.id === 'e2'), 'seed ' + seed);
  }
  // our battle in the recap's battles, with its outcome
  let b = newGame(11);
  delete b.armies.e1; b.cards = [];
  b = fight(V2.endSeason(V2.order(V2.order(b, 'a1', T('tho_xuan'), 'attack'), 'a2', T('tho_xuan'), 'attack')));
  assert.deepEqual(b.report.battles, [{ site: 'tho_xuan', a: b.me, d: 'cao_cao', win: b.report.fought[0].win, me: 'A' }]);
});

test('bottoming out: the warning comes a season ahead, with a way out that is legal now (D9)', () => {
  const g = calm();
  g.armies.a1.units.ky = 8000; // horse eat twice: the grain runs out this season
  const al = V2.view(g).alerts.find((x) => x.key === 'luong');
  assert.equal(al.level, 'soon');
  assert.match(al.text, /^Cuối mùa này kho lương âm/);
  const m = al.fix[0].match(/^Cho ([\d.]+) kỵ của Chu Nguyên Chương vào đồn Chung Ly: nuôi quân −[\d.]+ lương mỗi mùa\.$/);
  assert.ok(m, al.fix[0]);
  // the way out works: those horse into the garrison and the season ends above the floor
  const fixed = V2.transfer(g, 'chung_ly', 'a1', 'ky', -Number(m[1].replace(/\./g, '')));
  assert.ok(V2.internal.project(fixed).luong >= 0);
  // the recap says it too, with its way out
  const e = V2.endSeason(g);
  assert.ok(e.warn.luong);
  assert.ok(e.report.lines.some((l) => /^Cách cứu: /.test(l)));
  // warned, and no way to find the grain in time: said plainly
  const f = calm();
  f.res.luong = -5000; f.warn.luong = true;
  const fl = V2.view(f).alerts.find((x) => x.key === 'luong');
  assert.equal(fl.level, 'floor');
  assert.match(fl.text, /Không còn cách nào đủ lương kịp cuối mùa này/);
  // nothing to warn of on a sound purse
  assert.deepEqual(V2.view(calm()).alerts, []);
});
