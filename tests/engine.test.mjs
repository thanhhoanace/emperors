import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Engine, world, personas, newGame, ROOT } from './load.mjs';

const ACTIONS = Object.keys(Engine.ACTIONS);

test('calendar: turn 1 is Autumn 219 and winter crosses the year', () => {
  const g = newGame(1);
  assert.deepEqual(Engine.calendar(g, 1), { year: 219, season: 'Thu' });
  assert.deepEqual(Engine.calendar(g, 2), { year: 219, season: 'Đông' });
  assert.deepEqual(Engine.calendar(g, 3), { year: 220, season: 'Xuân' });
  const r = Engine.playTurn(g);
  assert.equal(r.calendar.year, 219);
  assert.equal(r.calendar.season, 'Thu');
});

test('attack uses player from when owned and adjacent', () => {
  const g = newGame(1);
  assert.equal(Engine.STRATAGEMS.join(','), 'discord,burn,defect');
  assert.equal(Engine.attackOrigin(g, { fid: 'cao_cao', from: 'jing', target: 'jing_nan' }), 'jing');
  assert.equal(Engine.attackOrigin(g, { fid: 'cao_cao', from: 'yu', target: 'jing_nan' }), Engine.originFor(g, 'cao_cao', 'jing_nan'));
  g.state.factions.cao_cao.troops = 200000;
  const r = Engine.resolveTurn(g, [{ fid: 'cao_cao', action: 'attack', from: 'jing', target: 'jing_nan', targetKind: 'province' }]);
  const atk = r.events.find((e) => e.kind === 'attack');
  assert.ok(atk);
  assert.equal(atk.from, 'jing');
});

test('world data: neighbors are symmetric and ids resolve', () => {
  const ids = new Set(world.provinces.map((p) => p.id));
  assert.equal(world.provinces.length, 20);
  assert.equal(world.meta.startYear, 219);
  for (const p of world.provinces) {
    for (const n of p.neighbors) {
      assert.ok(ids.has(n), `${p.id} → unknown neighbor ${n}`);
      const back = world.provinces.find((q) => q.id === n);
      assert.ok(back.neighbors.includes(p.id), `${p.id} ↔ ${n} is one-way`);
    }
  }
});

test('world data: every province starts with exactly one owner or neutral garrison', () => {
  const owners = {};
  for (const f of world.factions) {
    assert.ok(f.start.provinces.includes(f.start.seat), `${f.id} seat not in its provinces`);
    for (const pid of f.start.provinces) {
      assert.equal(owners[pid], undefined, `${pid} claimed by ${owners[pid]} and ${f.id}`);
      owners[pid] = f.id;
    }
  }
  for (const pid of Object.keys(world.neutral.garrison)) assert.equal(owners[pid], undefined, `${pid} is both neutral and owned`);
  for (const f of world.factions) assert.ok(f.start.provinces.length > 0, `${f.id} starts with no province`);
});

test('world data: every province has a real position and a city layout (data/cities.json)', () => {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/cities.json'), 'utf8'));
  const cities = raw.cities;
  const alias = raw.alias || {};
  const layout = (id) => cities[id] || cities[alias[id]];
  const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/map/meta.json'), 'utf8'));
  for (const p of world.provinces) {
    const [lon, lat] = p.lonlat || [];
    assert.ok(lon > 100 && lon < 123 && lat > 21 && lat < 42, `${p.id} lonlat outside the baked map`);
    const c = layout(p.id);
    assert.ok(c, `${p.id} has no layout in data/cities.json`);
    assert.ok(Array.isArray(c.outline) && c.outline.length >= 3, `${p.id} outline is not a polygon`);
    assert.ok(['capital', 'provincial', 'fort'].includes(c.rank), `${p.id} rank ${c.rank}`);
    assert.ok(['intact', 'ruined'].includes(c.state), `${p.id} state ${c.state}`);
    assert.ok(Object.values(c.gates).reduce((a, n) => a + n, 0) > 0, `${p.id} has no gate`);
    assert.ok(meta.cities[p.id] || meta.cities[alias[p.id]], `${p.id} missing from assets/map/meta.json: re-run node tools/bake-map.mjs`);
  }
});

test('personas: every faction has a voice for every action', () => {
  for (const f of world.factions) {
    const p = personas[f.id];
    assert.ok(p, `missing persona ${f.id}`);
    for (const a of ACTIONS) assert.ok(p.quotes[a]?.length >= 2, `${f.id} needs quotes for ${a}`);
    for (const ev of f.events) assert.ok(p.events[ev.id], `${f.id} event ${ev.id} has no text`);
    assert.ok(p.victory && p.fall && p.reform && p.glyph);
  }
});

test('decisions are valid and quotes have no leftover placeholders', () => {
  const g = newGame(42);
  for (let i = 0; i < 12 && !g.state.over; i++) {
    const ds = Engine.decideAll(g);
    for (const d of ds) {
      assert.ok(ACTIONS.includes(d.action), d.action);
      assert.ok(d.quote && !/[{}]/.test(d.quote), `bad quote: ${d.quote}`);
      if (d.action === 'attack') {
        assert.ok(d.from, 'attack needs an origin province');
        assert.notEqual(g.state.provinces[d.target].owner, d.fid);
      }
    }
    Engine.resolveTurn(g, ds);
  }
});

test('same seed replays the same game', () => {
  const run = () => {
    const g = newGame(2026);
    const log = [];
    while (!g.state.over) log.push(...Engine.playTurn(g).events.map((e) => e.text));
    return { log, winner: g.state.winner, turn: g.state.turn };
  };
  assert.deepEqual(run(), run());
});

test('referee: 1.000 quân không thể hạ thành 10.000 quân', () => {
  const g = newGame(1);
  g.state.factions.li_shimin.troops = 1000;
  g.state.provinces.you.owner = 'neutral';
  g.state.provinces.you.garrison = 10000;
  let wins = 0;
  for (let i = 0; i < 200; i++) {
    const trial = Engine.restoreGame(world, personas, g.state);
    trial.state.seed = i + 1;
    const r = Engine.resolveTurn(trial, [{ fid: 'li_shimin', action: 'attack', target: 'you', targetKind: 'province' }]);
    if (r.events.some((e) => e.kind === 'attack' && e.win)) wins++;
  }
  assert.equal(wins, 0);
});

test('full games end with a winner and keep stats in range', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const g = newGame(seed);
    while (!g.state.over) {
      Engine.playTurn(g);
      assert.ok(g.state.turn <= world.rules.maxTurns, 'game ran past maxTurns');
      for (const [id, f] of Object.entries(g.state.factions)) {
        for (const k of ['troops', 'grain', 'loyalty', 'prestige']) assert.ok(Number.isFinite(f[k]) && f[k] >= 0, `${id}.${k}=${f[k]}`);
        assert.ok(f.loyalty <= 100 && f.prestige <= 100);
        if (f.alive) assert.equal(g.state.provinces[f.seat].owner, id, `${id} seat ${f.seat} not owned`);
        else assert.equal(Engine.owned(g, id).length, 0, `${id} dead but owns land`);
      }
    }
    assert.ok(g.state.winner && g.state.factions[g.state.winner.fid].alive);
  }
});

test('guest protection hides one-province emperors from Three Kingdoms legal targets', () => {
  const g = newGame(1);
  const status = Engine.guestProtectionStatus(g, 'li_shimin');
  assert.equal(status.active, true);
  assert.equal(status.remainingTurns, 8);
  assert.ok(status.protectedFrom.includes('cao_cao'));
  const ctx = Engine.projectPerception(g, 'cao_cao');
  for (const pid of ['bing', 'longxi', 'huai']) {
    assert.equal(Engine.guestProtected(g, 'cao_cao', g.state.provinces[pid].owner), true, pid);
    assert.equal(ctx.legal.attackTargets.includes(pid), false, pid);
  }
  assert.equal(ctx.world.guestProtection.li_shimin.remainingTurns, 8);
  assert.equal(JSON.stringify(ctx.world.guestProtection).includes('time_displaced'), false);
});

test('referee rejects a protected attack without changing ownership', () => {
  const g = newGame(1);
  g.state.factions.cao_cao.troops = 500000;
  const owner = g.state.provinces.bing.owner;
  const r = Engine.resolveTurn(g, [{ fid: 'cao_cao', action: 'attack', target: 'bing', from: 'ji', targetKind: 'province' }]);
  assert.equal(g.state.provinces.bing.owner, owner);
  assert.equal(r.events.some((e) => e.kind === 'attack' && e.to === 'bing'), false);
  const blocked = r.events.find((e) => e.code === 'guest_truce' && e.to === 'bing');
  assert.ok(blocked);
  assert.equal(blocked.ok, false);
});

test('emperor attack breaks guest protection only against that Three Kingdoms faction', () => {
  const g = newGame(1);
  g.state.factions.li_shimin.troops = 1000;
  Engine.resolveTurn(g, [{ fid: 'li_shimin', action: 'attack', target: 'ji', from: 'bing', targetKind: 'province' }]);
  assert.equal(g.state.guestBroken.li_shimin.cao_cao, true);
  assert.equal(Engine.guestProtected(g, 'cao_cao', 'li_shimin'), false);
  assert.equal(Engine.guestProtected(g, 'liu_bei', 'li_shimin'), true);
  assert.equal(Engine.guestProtected(g, 'sun_quan', 'li_shimin'), true);
  const cao = Engine.projectPerception(g, 'cao_cao');
  const liu = Engine.projectPerception(g, 'liu_bei');
  if (Engine.frontier(g, 'cao_cao').includes('bing')) assert.equal(cao.legal.attackTargets.includes('bing'), true);
  assert.equal(liu.legal.attackTargets.includes('bing'), false);
  assert.deepEqual(Engine.guestProtectionStatus(g, 'li_shimin').brokenAgainst, ['cao_cao']);
});

test('guest protection expires on turn 9 and when the emperor owns two provinces', () => {
  const expired = newGame(1);
  expired.state.turn = 9;
  assert.equal(Engine.guestProtectionStatus(expired, 'qin_shihuang').remainingTurns, 0);
  assert.equal(Engine.guestProtectionStatus(expired, 'qin_shihuang').active, false);
  assert.equal(Engine.guestProtected(expired, 'cao_cao', 'qin_shihuang'), false);
  assert.equal(Engine.projectPerception(expired, 'cao_cao').legal.attackTargets.includes('longxi'), true);

  const wide = newGame(1);
  wide.state.turn = 8;
  assert.equal(Engine.guestProtectionStatus(wide, 'li_shimin').remainingTurns, 1);
  assert.equal(Engine.guestProtected(wide, 'cao_cao', 'li_shimin'), true);
  wide.state.provinces.you.owner = 'li_shimin';
  wide.state.provinces.you.garrison = 0;
  const status = Engine.guestProtectionStatus(wide, 'li_shimin');
  assert.equal(status.active, false);
  assert.equal(status.protectedFrom.length, 0);
  assert.equal(status.remainingTurns, 1);
  assert.equal(Engine.guestProtected(wide, 'cao_cao', 'li_shimin'), false);
  assert.equal(Engine.guestProtected(wide, 'liu_bei', 'li_shimin'), false);
  assert.equal(Engine.projectPerception(wide, 'cao_cao').legal.attackTargets.includes('bing'), true);
});
