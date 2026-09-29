// Balance report for the Hoài Nam demo (src/engine/v2/huainan.js): `npm run v2sim -- 200`.
// Three ways to play, each over N seeds: win rate, how the games end, seasons to the end, and the player's touches per
// season (orders, tasks, card answers, battle turns, "Hết mùa"): the freeze's measure of how much a season asks of him.
//   passive  only "Hết mùa"; every battle on "Tự đánh"
//   greedy   attack where the general's forecast is best (if at least "Ngang ngửa"), a suggested task in each town,
//            every card "yes"; battles turn by turn on the proposals
//   random   any legal order or none, any affordable task or none, cards yes / no / left; battles with a random wing
//            overridden now and then
// The engine is seeded; so is the random player (its own mulberry32, not Math.random), so a run replays.
// `npm run v2sim -- --trace greedy 4` prints one game season by season (the report the player reads).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const V2 = require(path.join(ROOT, 'src/engine/v2/huainan.js'));
const Battle = require(path.join(ROOT, 'src/engine/battle.js'));
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/scenario/huainan.json'), 'utf8'));

const TRACE = process.argv[2] === '--trace' ? { policy: process.argv[3] || 'greedy', seed: Number(process.argv[4]) || 1 } : null;
const N = Math.max(1, Number(process.argv[2]) || 200);
const CAP = 24; // seasons: six years, then the game counts as undecided
const RANK = Object.fromEntries(Battle.LABELS.map(([, l], i) => [l, Battle.LABELS.length - 1 - i])); // Thắng lớn 4 … Thua lớn 0

function rng(seed) {
  let s = (seed ^ 0x5bd1e995) >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, xs) => xs[Math.floor(r() * xs.length)];
const ours = (g) => Object.values(g.armies).filter((a) => a.fid === g.me);
const ownTowns = (g) => Object.keys(g.towns).filter((t) => g.towns[t].owner === g.me);

const POLICIES = {
  passive: {
    season: (g) => ({ g, touches: 0 }),
    battle: (g) => ({ g: V2.autoBattle(g), touches: 1 }),
  },
  greedy: {
    season(g) {
      let touches = 0;
      for (const c of g.cards.slice()) { g = V2.answer(g, c.id, true); touches++; }
      // one reading per battle: an army in its own town is that town's battle; every army of ours in reach joins
      const battles = {};
      for (const a of ours(g)) for (const t of V2.targets(g, a.id)) {
        if (t.intent === 'move') continue;
        const e = t.kind === 'army' ? g.armies[t.id] : null;
        const target = e && g.towns[e.at].owner === e.fid ? { kind: 'town', id: e.at } : { kind: t.kind, id: t.id };
        battles[target.kind + ':' + target.id] = target;
      }
      let best = null;
      for (const target of Object.values(battles)) {
        const ids = ours(g).filter((a) => V2.targets(g, a.id).some((t) => t.kind === target.kind && t.id === target.id)).map((a) => a.id);
        const f = ids.length && V2.forecast(g, ids, target);
        if (!f) continue;
        const score = RANK[f.label] * 1e6 + f.sa - f.sd;
        if (!best || score > best.score) best = { score, rank: RANK[f.label], ids, target };
      }
      if (best && best.rank >= RANK['Ngang ngửa']) for (const id of best.ids) { g = V2.order(g, id, best.target, best.target.kind === 'town' ? 'attack' : undefined); touches++; }
      // nothing to strike from here: march to our town nearest the nearest enemy town
      const d = (x, y) => { const p = DATA.towns.find((t) => t.id === x).xz, q = DATA.towns.find((t) => t.id === y).xz; return Math.hypot(p[0] - q[0], p[1] - q[1]); };
      for (const a of ours(g)) {
        if (a.order || V2.targets(g, a.id).some((t) => t.intent !== 'move')) continue;
        const foe = Object.keys(g.towns).filter((t) => g.towns[t].owner !== g.me && !g.allies[g.towns[t].owner]).sort((x, y) => d(a.at, x) - d(a.at, y))[0];
        const step = foe && V2.targets(g, a.id).filter((t) => t.kind === 'town' && t.intent === 'move').sort((x, y) => d(x.id, foe) - d(y.id, foe))[0];
        if (step && d(step.id, foe) < d(a.at, foe)) { g = V2.order(g, a.id, step); touches++; }
      }
      // a suggested task the purse allows, unless it would lower the grain this season
      for (const tid of ownTowns(g)) {
        const ts = V2.tasks(g, tid);
        const k = ts.suggested.find((x) => { if (!ts.all.find((y) => y.key === x).ok) return false; const p = V2.preview(g, { type: 'task', town: tid, key: x }); return p.res.luong[1] >= p.res.luong[0]; });
        if (k) { g = V2.setTask(g, tid, k); touches++; }
      }
      return { g, touches };
    },
    battle: (g) => ({ g: V2.battleTurn(g, {}), touches: 1 }),
  },
  random: {
    season(g, r) {
      let touches = 0;
      for (const c of g.cards.slice()) { const x = r(); if (x < 2 / 3) { g = V2.answer(g, c.id, x < 1 / 3); touches++; } }
      for (const a of ours(g)) {
        if (!g.armies[a.id]) continue;
        const t = pick(r, [null].concat(V2.targets(g, a.id)));
        if (!t) continue;
        g = V2.order(g, a.id, t, t.intent === 'ask' ? pick(r, ['attack', 'siege']) : undefined);
        touches++;
      }
      for (const tid of ownTowns(g)) {
        const ok = V2.tasks(g, tid).all.filter((x) => x.ok).map((x) => x.key);
        const k = pick(r, [null].concat(ok));
        if (k) { g = V2.setTask(g, tid, k); touches++; }
      }
      return { g, touches };
    },
    battle(g, r) {
      const B = V2.battle(g), wings = Object.keys(B.proposed);
      if (r() < 0.3 && wings.length) {
        const w = pick(r, wings), o = pick(r, Battle.legalOrders(B.b, w));
        return { g: V2.battleTurn(g, { [w]: o }), touches: 2 };
      }
      return { g: V2.battleTurn(g, {}), touches: 1 };
    },
  },
};

function play(policy, seed, trace) {
  const P = POLICIES[policy], r = rng(seed);
  let g = V2.newGame(DATA, seed), touches = 0, battles = 0, won = 0;
  while (!g.over && g.season <= CAP) {
    const s = P.season(g, r);
    if (trace) {
      const v = V2.view(s.g), mine = v.armies.filter((a) => a.seen === 'own');
      console.log(v.calendar + ' · lương ' + V2.fmt(v.res.luong) + ' · tiền ' + V2.fmt(v.res.tien) + ' · Uy ' + v.res.uy + ' · thành ' + v.towns.filter((t) => t.owner === v.me).map((t) => t.name + (t.task ? ' (' + t.task.name + ')' : '')).join(', '));
      console.log('  lệnh: ' + (mine.map((a) => a.gen.name + ' ' + (a.order ? a.order.intent + ' ' + a.order.target.id : 'giữ') + ' @' + a.at).join(' · ') || '—'));
    }
    g = V2.endSeason(s.g);
    touches += s.touches + 1;
    let id = null;
    while (g.pending) {
      if (g.pending.id !== id) { id = g.pending.id; battles++; }
      const b = P.battle(g, r);
      touches += b.touches;
      const before = g.pending;
      g = b.g;
      if (!g.pending || g.pending.id !== before.id) { const f = g.fought[g.fought.length - 1]; if (f && f.win === f.me) won++; }
    }
    if (trace) for (const l of g.report.lines) console.log('    ' + l);
  }
  if (trace) console.log(g.over ? (g.over.win ? 'THẮNG: ' : 'THUA: ') + g.over.why : 'chưa ngã ngũ sau ' + CAP + ' mùa');
  const seasons = g.season - 1;
  return { seed, win: g.over ? g.over.win : null, why: g.over ? g.over.why : 'chưa ngã ngũ', seasons, touches, battles, won, towns: ownTowns(g).length };
}

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0) + '%';
const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
const median = (xs) => { if (!xs.length) return 0; const s = xs.slice().sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

if (TRACE) { play(TRACE.policy, TRACE.seed, true); process.exit(0); }
const t0 = process.hrtime.bigint();
console.log('Demo Hoài Nam (v2) · ' + N + ' ván mỗi lối chơi · tối đa ' + CAP + ' mùa\n');
for (const policy of Object.keys(POLICIES)) {
  const runs = [];
  for (let seed = 1; seed <= N; seed++) runs.push(play(policy, seed));
  const wins = runs.filter((x) => x.win === true), losses = runs.filter((x) => x.win === false), open = runs.filter((x) => x.win === null);
  const ended = runs.filter((x) => x.win !== null).map((x) => x.seasons);
  const why = {};
  for (const x of losses) why[x.why] = (why[x.why] || 0) + 1;
  const tps = mean(runs.map((x) => x.touches / Math.max(1, x.seasons)));
  const battles = runs.reduce((s, x) => s + x.battles, 0), won = runs.reduce((s, x) => s + x.won, 0);
  console.log(policy);
  console.log('  thắng ' + pct(wins.length, N) + ' · thua ' + pct(losses.length, N) + ' · chưa ngã ngũ ' + pct(open.length, N));
  console.log('  mùa tới hết ván: trung bình ' + mean(ended).toFixed(1) + ' · trung vị ' + median(ended) + (wins.length ? ' · thắng sau ' + mean(wins.map((x) => x.seasons)).toFixed(1) + ' mùa' : ''));
  console.log('  lần chạm mỗi mùa: ' + tps.toFixed(1) + ' · trận của ta mỗi ván: ' + (battles / N).toFixed(1) + ' (thắng ' + pct(won, battles) + ')');
  console.log('  thành cuối ván: ' + mean(runs.map((x) => x.towns)).toFixed(1));
  for (const [w, n] of Object.entries(why).sort((a, b) => b[1] - a[1])) console.log('    thua: ' + w + ' ' + pct(n, N));
  if (open.length) console.log('    chưa ngã ngũ (seed): ' + open.slice(0, 12).map((x) => x.seed + ' (' + x.towns + ' thành)').join(', ') + (open.length > 12 ? ' …' : ''));
  console.log('');
}
console.log('(' + (Number(process.hrtime.bigint() - t0) / 1e9).toFixed(1) + ' s)');
