// Balance report: plays N seeded games headless and prints who wins and how fast.
// Usage: npm run sim -- 500
import { Engine, newGame } from './load.mjs';

const N = Number(process.argv[2] || 300);
const EMPERORS = ['qin_shihuang', 'li_shimin', 'zhu_yuanzhang', 'liu_che'];
const TK = ['cao_cao', 'liu_bei', 'sun_quan'];
const wins = {};
const kinds = {};
const lengths = [];
const early = { targeted: {}, byAdj: 0, byHiddenWeak: 0, totalTkAttacks: 0 };

function weakestHidden(g, attacker) {
  let best = null;
  let n = Infinity;
  for (const id of EMPERORS) {
    const f = g.state.factions[id];
    if (!f || !f.alive) continue;
    if (Engine.frontier(g, attacker).some((pid) => g.state.provinces[pid].owner === id)) continue;
    if (f.troops < n) { n = f.troops; best = id; }
  }
  return best;
}

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
        if (weakestHidden(g, d.fid) === owner) early.byHiddenWeak += 1;
      }
    }
    Engine.resolveTurn(g, ds);
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
console.log(`  adjacent origin: ${early.byAdj} · hit objectively-weakest hidden emperor: ${early.byHiddenWeak}`);
