// Spike 2 (quẹt thẻ): chạy luật trong Main.dc.html không cần trình duyệt.
//   node docs/phases/v2-gameplay/spike2/sim.js [số ván mỗi đế]
// In tỉ lệ thắng, độ dài ván theo ba cách chơi, kiểm mọi thẻ có đủ nhãn, và bấm / quẹt thử giao diện.
// Luật ở đúng một chỗ: đoạn <script data-dc-script> của Main.dc.html (artboard trên canvas Design).
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'Main.dc.html'), 'utf8');
const code = html.match(/<script type="text\/x-dc" data-dc-script[^>]*>([\s\S]*)<\/script>/)[1];
class DCLogic { constructor(p) { this.props = p || {}; } setState(s) { this.state = Object.assign({}, this.state, s); } }
const box = { exports: {} };
new Function('DCLogic', 'module', 'setTimeout', code + '\n;module.exports = { SW, Component };')(DCLogic, box, (f) => f());
const { SW, Component } = box.exports;
const N = +process.argv[2] || 60;

// ba cách chơi: cẩn thận (đọc số), gật hết, nửa ngẫu nhiên
function policy(name) {
  return function (g, c) {
    if (c.single) return true;
    if (name === 'yes') return true;
    if (name === 'rand') return (g.cardNo * 7 + g.season * 13 + g.seed) % 3 !== 0;
    if (/attack|exile_attack/.test(c.kind)) return c.p >= 0.55 || (c.kind === 'exile_attack' && c.p >= 0.3);
    if (c.kind === 'raid') return c.p >= 0.45;
    if (c.kind === 'recruit1' || c.kind === 'recruit2') return g.luong >= c.cost + 100;
    if (c.kind === 'farm1' || c.kind === 'farm2') return g.luong > 600;
    if (c.kind === 'annex1' || c.kind === 'annex2') return g.luong >= c.cost + 100;
    if (c.kind === 'bribe') return g.luong > 700 && c.p >= 0.4;
    if (c.kind === 'scout') return g.luong > 500;
    if (c.kind === 'fort2') return g.luong > 400;
    if (c.kind === 'know') return !(g.emp === 'li_shimin' && g.luong < 200);
    return true;
  };
}
function play(emp, seed, pol) {
  let g = SW.newGame(emp, seed), cards = 0, taps = 0, ch2At = null, ch1Towns = 0, exiled = false, guard = 0;
  while (!g.over && guard++ < 2000) {
    const c = g.queue[0];
    if (!c) throw new Error('hết thẻ ở mùa ' + g.season);
    if (!c.single) cards++;
    taps++;
    const was = g.chapter;
    if (was === 1) ch1Towns = SW.myTowns(g).length;
    g = SW.choose(g, pol(g, c));
    if (was === 1 && g.chapter === 2) ch2At = g.season;
    if (g.exile) exiled = true;
  }
  return { win: !!(g.over && g.over.win), why: g.over ? g.over.why : 'kẹt tới mùa ' + g.season, seasons: g.season, cards, taps: taps + g.queue.length, ch2At, ch1Towns, exiled };
}
for (const pn of ['sense', 'yes', 'rand']) {
  console.log('== ' + { sense: 'cẩn thận', yes: 'gật hết', rand: 'nửa ngẫu nhiên' }[pn]);
  for (const e of Object.keys(SW.EMP)) {
    const rs = []; for (let i = 1; i <= N; i++) rs.push(play(e, i * 7919, policy(pn)));
    const avg = (f) => (rs.reduce((s, r) => s + f(r), 0) / rs.length).toFixed(1);
    const ch = rs.filter((r) => r.ch2At), taps = rs.map((r) => r.taps).sort((a, b) => a - b);
    const stuck = rs.filter((r) => /kẹt/.test(r.why)).length;
    console.log(SW.EMP[e].short.padEnd(7), 'thắng', Math.round(100 * rs.filter((r) => r.win).length / N) + '%',
      '· mùa', avg((r) => r.seasons), '· chạm', avg((r) => r.taps), '(p10', taps[Math.floor(N * 0.1)], 'p90', taps[Math.floor(N * 0.9)] + ')',
      '· ra 20 châu ở mùa', (ch.reduce((s, r) => s + r.ch2At, 0) / Math.max(1, ch.length)).toFixed(1), 'với', (ch.reduce((s, r) => s + r.ch1Towns, 0) / Math.max(1, ch.length)).toFixed(1) + '/5 thành',
      '· lưu vong', rs.filter((r) => r.exiled).length, stuck ? '· KẸT ' + stuck : '');
  }
}

// mọi thẻ có tiêu đề, người nói, nhãn hai phía và hệ quả
let bad = 0, seen = 0;
for (const e of Object.keys(SW.EMP)) for (let i = 1; i <= 20; i++) {
  let g = SW.newGame(e, i * 104729), k = 0;
  while (!g.over && k++ < 2000) {
    const c = g.queue[0]; seen++;
    if (!c || !c.title || !c.who || !c.yes || !c.yes.label || (!c.single && (!c.no || !c.no.label || c.no.fx == null || c.yes.fx == null))) bad++;
    g = SW.choose(g, (k * 7 + i) % 3 !== 0);
  }
  if (g.queue.some((x) => !x.single)) bad++;
}
if (bad) throw new Error(bad + ' thẻ thiếu nhãn');

// giao diện: bấm nút và quẹt tới hết ván; kéo ngắn thì thẻ bật lại, không chọn
let games = 0;
for (const e of Object.keys(SW.EMP)) for (let s = 0; s < 6; s++) {
  const ui = new Component({});
  let v = ui.renderVals();
  if (!v.isStart || v.emps.length !== 4) throw new Error('màn chọn đế');
  v.emps[Object.keys(SW.EMP).indexOf(e)].pick();
  ui.state.g = SW.newGame(e, 5000 + s * 17);
  let k = 0;
  for (;;) {
    v = ui.renderVals();
    for (const key of ['stats', 'edges', 'nodes', 'facs', 'lines', 'dots', 'chronicle']) if (!Array.isArray(v[key])) throw new Error(key);
    if (v.isOver) break;
    if (k++ > 3000) throw new Error('ván không hết');
    const yes = (k + s) % 4 !== 0;
    if (k % 2) { v.down({ clientX: 100, pointerId: 1, currentTarget: {} }); ui.renderVals().move({ clientX: yes ? 230 : -30 }); ui.renderVals().up(); }
    else (yes ? v.yes : v.no)();
  }
  if (!v.chronicle.length || !v.overWhy) throw new Error('màn cuối thiếu biên niên');
  games++;
}
const ui = new Component({}); ui.start('li_shimin'); const before = ui.state.g.cardNo;
ui.renderVals().down({ clientX: 100, pointerId: 1, currentTarget: {} }); ui.renderVals().move({ clientX: 150 }); ui.renderVals().up();
if (ui.state.g.cardNo !== before) throw new Error('kéo ngắn vẫn chọn');
console.log('kiểm', seen, 'thẻ: đủ nhãn · giao diện:', games, 'ván quẹt và bấm tới hết');
