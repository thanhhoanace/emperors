// Balance report: plays N seeded games headless and prints who wins and how fast.
// Usage: npm run sim -- 500
//        npm run sim -- 500 --battles   also fights every v1 attack again as a turn battle (src/engine/battle.js, both
//                                       sides on auto, plain officers) and compares; the game itself stays v1
import { createRequire } from 'node:module';
import path from 'node:path';
import { Engine, newGame, ROOT } from './load.mjs';

const N = Number(process.argv[2] || 300);
const BATTLES = process.argv.includes('--battles');
const Battle = BATTLES ? createRequire(import.meta.url)(path.join(ROOT, 'src/engine/battle.js')) : null;
const turnB = { n: 0, v1: 0, turns: 0, agree: 0, draw: 0, len: [0, 0, 0, 0, 0, 0], lossA: 0, lossA1: 0, walls: {} };
const EMPERORS = ['qin_shihuang', 'li_shimin', 'zhu_yuanzhang', 'liu_che'];
const TK = ['cao_cao', 'liu_bei', 'sun_quan'];
const wins = {};
const kinds = {};
const lengths = [];
const early = { targeted: {}, byAdj: 0, targetBand: {}, totalTkAttacks: 0 };

for (let seed = 1; seed <= N; seed++) {
  const g = newGame(seed);
  while (!g.state.over) {
    const turn = g.state.turn;
    const ds = Engine.decideAll(g);
    if (turn <= 8) {
      for (const d of ds) {
        if (!TK.includes(d.fid) || d.action !== 'attack') continue;
        const owner = g.state.provinces[d.target] && g.state.provinces[d.target].owner;
        if (!EMPERORS.includes(owner)) continue;
        early.totalTkAttacks += 1;
        early.targeted[owner] = (early.targeted[owner] || 0) + 1;
        if (Engine.frontier(g, d.fid).includes(d.target)) early.byAdj += 1;
        const ctx = Engine.projectPerception(g, d.fid);
        const band = (ctx.others[owner] && ctx.others[owner].troopBand) || 'unknown';
        early.targetBand[band] = (early.targetBand[band] || 0) + 1;
      }
    }
    const r = Engine.resolveTurn(g, ds);
    if (BATTLES) for (const e of r.events) {
      if (e.kind !== 'attack' || !e.battle) continue;
      const o = Battle.outcome(Battle.simulate(Battle.create({ ...e.battle, seed: seed * 7919 + turnB.n })));
      const W = (turnB.walls[e.battle.walls] = turnB.walls[e.battle.walls] || [0, 0, 0]);
      turnB.n += 1; W[0] += 1;
      if (e.win) { turnB.v1 += 1; W[1] += 1; }
      if (o.win === 'A') { turnB.turns += 1; W[2] += 1; }
      if (o.win === 'draw') turnB.draw += 1;
      if ((o.win === 'A') === !!e.win) turnB.agree += 1;
      turnB.len[o.turns] += 1;
      turnB.lossA += o.losses.A / e.battle.attacker.men;
      turnB.lossA1 += e.battle.result.losses.A / e.battle.attacker.men;
    }
  }
  const w = g.state.winner;
  wins[w.fid] = (wins[w.fid] || 0) + 1;
  kinds[w.kind] = (kinds[w.kind] || 0) + 1;
  lengths.push(g.state.turn);
}
lengths.sort((a, b) => a - b);
const pct = (n) => ((100 * n) / N).toFixed(1) + '%';
console.log(`games: ${N}`);
console.log('winners:', Object.entries(wins).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pct(v)}`).join(' · '));
console.log('kinds:', Object.entries(kinds).map(([k, v]) => `${k} ${pct(v)}`).join(' · '));
console.log(`turns: min ${lengths[0]} · median ${lengths[N >> 1]} · p90 ${lengths[Math.floor(N * 0.9)]} · max ${lengths[N - 1]}`);
console.log('early 1-8 TK attacks on emperors:', early.totalTkAttacks);
console.log('  targets:', Object.entries(early.targeted).map(([k, v]) => `${k} ${v}`).join(' · ') || 'none');
console.log('  adjacent origin:', early.byAdj);
console.log('  perceived target band:', Object.entries(early.targetBand).map(([k, v]) => `${k} ${v}`).join(' · ') || 'none');
if (BATTLES) {
  const f = (x) => ((100 * x) / Math.max(1, turnB.n)).toFixed(0) + '%';
  console.log(`turn battles on the v1 attacks: ${turnB.n}`);
  console.log(`  attacker wins: v1 ${f(turnB.v1)} · turn battle ${f(turnB.turns)} · same result ${f(turnB.agree)} · draws ${turnB.draw}`);
  console.log(`  turns: ${[3, 4, 5].map((k) => `${k}: ${f(turnB.len[k])}`).join(' · ')}${turnB.len[1] + turnB.len[2] ? ` · 1–2: ${f(turnB.len[1] + turnB.len[2])}` : ''}`);
  console.log(`  attacker loss share: v1 ${(turnB.lossA1 / Math.max(1, turnB.n)).toFixed(2)} · turn battle ${(turnB.lossA / Math.max(1, turnB.n)).toFixed(2)}`);
  console.log('  by walls (battles, v1 wins, turn wins):', Object.entries(turnB.walls).map(([k, v]) => `${k}: ${v.join('/')}`).join(' · '));
}
