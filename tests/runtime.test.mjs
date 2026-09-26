// Runtime presentation layer (src/world): names for every character, and the event presenter's plans checked against a
// stand-in runtime. The presenter must show RuntimeEvent v1 as given: never read raw `defender`, never change the event
// or owners, always end on the campaign view.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ROOT, newGame, Engine } from './load.mjs';

const require = createRequire(import.meta.url);
const Names = require(path.join(ROOT, 'src/world/names.js'));
const EP = require(path.join(ROOT, 'src/world/event-presenter.js'));
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const world = read('data/world.json'), characters = read('data/scenario/characters.json'), gates = read('data/scenario/gates.json'), fixtures = read('data/scenario/runtime-events.v1.json');

// A stand-in for WorldRuntime: seats from lonlat, straight roads, views as plain objects.
function mockRuntime() {
  const seat = Object.fromEntries(world.provinces.map((p) => [p.id, [(p.lonlat[0] - 112) * 30, 0, (32 - p.lonlat[1]) * 30]]));
  const v = (name, target, mode, extra = {}) => ({ name, target, cam: [target[0], target[1] + 50, target[2] + 50], fov: 34, mode, ...extra });
  const rt = {
    MC: Object.fromEntries(Object.entries(seat).map(([k, s]) => [k, { x: s[0], y: 0, z: s[2], r: 3 }])),
    viewCampaign: () => v('campaign', [0, 0, 0], 'far'),
    viewOverview: () => v('overview', [-300, 0, -150], 'far'),
    viewProvince: (pid) => { assert.ok(seat[pid], 'province ' + pid); return v('province:' + pid, seat[pid], 'near'); },
    viewCity: (pid, op = {}) => { assert.ok(seat[pid], 'city ' + pid); return v('city:' + pid, op.target || seat[pid], 'city', { city: pid }); },
    viewLook: (a, b) => { assert.ok(seat[a] && seat[b], 'look ' + a + '>' + b); return v('look:' + a + '>' + b, seat[b], 'near'); },
    viewFollow: (pts, u) => v('follow', rt.pointAlong(pts, u), 'near'),
    lerpView: (a, b, e) => ({ name: e < 1 ? 'between' : b.name, target: a.target.map((x, i) => x + (b.target[i] - x) * e), cam: a.cam.map((x, i) => x + (b.cam[i] - x) * e), fov: a.fov, mode: e < 0.5 ? a.mode : b.mode }),
    pathBetween: (a, b) => Array.from({ length: 21 }, (_, i) => seat[a].map((x, k) => x + ((seat[b][k] - x) * i) / 20)),
    pointAlong: (pts, u) => { const k = Math.max(0, Math.min(1, u)) * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(k)), s = k - i; return pts[i].map((x, j) => x + (pts[i + 1][j] - x) * s); },
    seatOf: (pid) => seat[pid].slice(),
    palaceOf: (pid) => [seat[pid][0], 1, seat[pid][2]],
  };
  return rt;
}
const gateEvent = (g) => ({ v: 1, kind: 'gate', text: (g.emit && g.emit.text) || g.id, tone: 'neutral', id: g.id, actors: g.actors || [], shot: g.shot || null });
const deepFreeze = (o) => { Object.freeze(o); for (const v of Object.values(o)) if (v && typeof v === 'object') deepFreeze(v); return o; };
const sample = (P, pl, n = 40) => Array.from({ length: n + 1 }, (_, k) => P.frameAt(pl, (pl.duration * k) / n));

test('every character on the board has a Vietnamese name', () => {
  const ids = new Set([
    ...Object.values(characters.governors), ...Object.values(characters.reserves).flat(), ...characters.heirsOffMap,
    ...Object.values(characters.neutrals).map((n) => n.face), ...Object.values(characters.succession.threeKingdoms).filter(Boolean),
    ...gates.gates.flatMap((g) => g.actors || []), ...world.factions.map((f) => f.id),
    ...fixtures.events.flatMap((e) => [e.actorChar, e.defenderChar, ...(e.actors || [])]).filter(Boolean),
  ]);
  for (const id of ids) assert.ok(Names.NAMES[id], 'no name for ' + id);
  assert.equal(Names.name('nobody'), Names.NO_NAME);
  assert.equal(Names.name(undefined), Names.NO_NAME);
});

test('names match the tables in docs/product/characters.md', () => {
  const md = fs.readFileSync(path.join(ROOT, 'docs/product/characters.md'), 'utf8');
  let n = 0;
  for (const m of md.matchAll(/^\| `([a-z_]+)` \| ([^|]+?) \|/gm)) { assert.equal(Names.NAMES[m[1]], m[2].trim(), m[1]); n++; }
  assert.ok(n >= 10, 'found the character tables');
});

test('attack: origin → march → target → result from `win` → campaign view', () => {
  const rt = mockRuntime(), P = EP.create(rt, { world, characters, names: Names });
  for (const ev of fixtures.events.filter((e) => e.kind === 'attack')) {
    const before = JSON.stringify(ev), frozen = deepFreeze(JSON.parse(before));
    const pl = P.plan(frozen), frames = sample(P, pl);
    assert.equal(JSON.stringify(frozen), before, 'event unchanged');
    assert.equal(frames[0].view.name, 'between');
    assert.equal(P.frameAt(pl, pl.duration).view.name, 'campaign', 'ends on the campaign view');
    // the road runs from the origin seat to the target seat
    assert.deepEqual(pl.meta.path[0], rt.seatOf(ev.from));
    assert.deepEqual(pl.meta.path[pl.meta.path.length - 1], rt.seatOf(ev.to));
    const d = (p, q) => Math.hypot(p[0] - q[0], p[2] - q[2]), total = d(rt.seatOf(ev.from), rt.seatOf(ev.to));
    const arrive = P.frameAt(pl, pl.meta.arrive + 0.5), army = arrive.marks.find((m) => m.id === 'attacker');
    assert.equal(army.fid, ev.fid);
    assert.ok(d(army.p, rt.seatOf(ev.to)) < total * 0.2, 'the army halts at the target');
    const def = arrive.marks.find((m) => m.id === 'defender');
    assert.equal(def.fid, ev.defenderFid);
    const res = P.frameAt(pl, pl.meta.result + 1), badge = res.hud.find((h) => h.type === 'badge');
    assert.equal(badge.win, ev.win);
    assert.equal(!!res.marks.find((m) => m.id === 'standard'), ev.win, 'a standard only on a win');
    const actors = arrive.hud.find((h) => h.type === 'actors').actors.map((a) => a.id);
    assert.deepEqual(actors, [ev.actorChar, ev.defenderChar]);
    for (const f of frames) for (const x of [...f.view.cam, ...f.view.target]) assert.ok(Number.isFinite(x));
  }
});

test('attack ignores the raw engine field `defender`', () => {
  const rt = mockRuntime(), P = EP.create(rt, { world, characters, names: Names });
  const ev = fixtures.events.find((e) => e.kind === 'attack');
  const a = P.plan(ev), b = P.plan({ ...ev, defender: 'sun_quan' });
  const strip = (fs) => JSON.stringify(fs.map((f) => ({ v: f.view, m: f.marks, h: f.hud.map(({ at, ...h }) => h) })));
  assert.equal(strip(sample(P, a)), strip(sample(P, b)));
  assert.ok(!/ev\.defender\b(?!Fid|Char)/.test(fs.readFileSync(path.join(ROOT, 'src/world/event-presenter.js'), 'utf8')));
});

test('gates: every gates.json shot plays its cameras, places its actors, ends on the campaign view', () => {
  const rt = mockRuntime(), P = EP.create(rt, { world, characters, names: Names });
  for (const g of gates.gates) {
    const ev = deepFreeze(gateEvent(g)), pl = P.plan(ev);
    assert.equal(P.frameAt(pl, pl.duration).view.name, 'campaign', g.id);
    const cams = [g.shot.camera, g.shot.then].filter(Boolean);
    for (const c of cams) if (c !== 'four_rim_seats' && c !== 'hegemon_seat') assert.ok(EP.NAMED[c], 'named camera ' + c);
    const shotLen = pl.meta.back - pl.meta.shot;
    assert.ok(Math.abs(shotLen - g.shot.seconds) < 1e-6, `${g.id}: shot lasts shot.seconds`);
    const mid = P.frameAt(pl, pl.meta.shot + 0.2);
    for (const a of g.actors) assert.ok(mid.marks.find((m) => m.id === 'actor:' + a), `${g.id}: ${a} on the map`);
    assert.ok(mid.hud.find((h) => h.type === 'event' && h.text === g.emit.text));
    for (const m of mid.marks) assert.equal(m.kind, 'general', 'a gate moves no army');
  }
  const four = P.plan(gateEvent(gates.gates.find((g) => g.id === 'guest_arrival')));
  assert.deepEqual(four.meta.views, ['province:longxi', 'province:bing', 'province:hexi', 'province:huai']);
  const opening = P.plan(fixtures.events.find((e) => e.id === 'opening'));
  assert.deepEqual(opening.meta.views, ['overview', 'city:jing']);
});

test('other kinds focus a place and end on the campaign view', () => {
  const rt = mockRuntime(), P = EP.create(rt, { world, characters, names: Names });
  for (const ev of fixtures.events.filter((e) => e.kind !== 'attack' && e.kind !== 'gate')) {
    const pl = P.plan(deepFreeze(JSON.parse(JSON.stringify(ev))));
    assert.equal(P.frameAt(pl, pl.duration).view.name, 'campaign', ev.kind);
    assert.ok(pl.meta.place, ev.kind + ' has a place');
  }
});

test('every event of real engine turns plans without touching the game', () => {
  const rt = mockRuntime(), P = EP.create(rt, { world, characters, names: Names });
  const g = newGame(219), kinds = new Set();
  for (let turn = 0; turn < 30 && !g.state.over; turn++) {
    const res = Engine.playTurn(g), before = JSON.stringify(g.state);
    for (const ev of res.events) {
      assert.equal(ev.v, 1);
      kinds.add(ev.kind);
      const pl = P.plan(deepFreeze(JSON.parse(JSON.stringify(ev))));
      assert.equal(P.frameAt(pl, pl.duration).view.name, 'campaign', ev.kind);
      for (const f of sample(P, pl, 10)) for (const x of f.view.cam) assert.ok(Number.isFinite(x), ev.kind);
    }
    assert.equal(JSON.stringify(g.state), before, 'presentation leaves the state alone');
  }
  assert.ok(kinds.has('attack') && kinds.has('gate'), [...kinds].join());
});

// Playable path (gameplay contract v1.1): the presenter plays safe display items built from the TurnObservation. They
// bring their own labels and text; the plan must never ask names.name() or read anything the item does not carry.
test('safe playable items: labels only, no names lookup, no origin the observation did not give', () => {
  const rt = mockRuntime(), asked = [];
  const P = EP.create(rt, { world, characters, names: { name: (id) => { asked.push(id); return Names.name(id); } } });
  asked.length = 0; // factions are named once at creation, for spectator cards
  const own = { safe: true, kind: 'attack', shot: 'march', from: 'bing', to: 'ji', fid: 'li_shimin', win: true, title: 'Tấn công', text: 'Lý Thế Dân đánh Nghiệp Thành — thắng.', tone: 'good', kicker: 'Lý Thế Dân',
    badge: { win: true, text: 'Thắng' }, actors: [{ id: 'actor:a', name: 'Lý Thế Dân', fid: 'li_shimin', role: 'Bên đánh', faction: '' }, { id: 'actor:d', name: 'Tào Tháo', fid: 'cao_cao', role: 'Bên thủ', faction: '', glyph: '' }] };
  const hit = { safe: true, kind: 'attack', shot: 'focus', to: 'bing', prov: 'bing', view: 'city', dust: true, fid: 'qin_shihuang', title: 'Bị tấn công', text: 'Quân Chúa Lũng Tây đánh Tấn Dương — giữ vững.', tone: 'good', kicker: 'Chúa Lũng Tây',
    badge: { win: true, text: 'Giữ vững' }, actors: [{ id: 'actor:a', name: 'Chúa Lũng Tây', fid: 'qin_shihuang', role: 'Bên đánh', faction: '', glyph: '' }] };
  for (const it of [own, hit]) {
    const pl = P.plan(deepFreeze(JSON.parse(JSON.stringify(it)))), frames = sample(P, pl);
    assert.equal(P.frameAt(pl, pl.duration).view.name, 'campaign');
    const cards = frames.flatMap((f) => f.hud), texts = cards.map((h) => [h.title, h.text, h.kicker, ...(h.actors || []).map((a) => a.name)].join(' ')).join('\n');
    assert.ok(cards.some((h) => h.type === 'event' && h.text === it.text && h.kicker === it.kicker));
    assert.ok(!/Tần Thủy Hoàng|Doanh Chính|Hạ Hầu|Trương Liêu|Tào Phi/.test(texts), 'no character or true name the item did not carry');
    assert.ok(cards.filter((h) => h.type === 'badge').every((h) => h.text === it.badge.text));
  }
  assert.deepEqual(asked, [], 'names.name() never called for a safe item');
  const hitPlan = P.plan(hit);
  assert.equal(hitPlan.meta.place, 'bing', 'an attack on the player looks at its own city');
  assert.ok(!hitPlan.cams.some((c) => [c.a, c.b].some((v) => typeof v !== 'function' && /longxi/.test(v.name))), 'never at the enemy origin');
  // the spectator path is unchanged: a RuntimeEvent still shows its own text and named characters
  const ev = fixtures.events.find((e) => e.kind === 'attack'), pl = P.plan(ev);
  assert.ok(sample(P, pl).some((f) => f.hud.some((h) => h.type === 'event' && h.text === ev.text)));
  assert.ok(asked.length > 0, 'spectator cards name characters');
});
