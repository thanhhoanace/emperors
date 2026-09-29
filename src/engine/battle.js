/*
 * Tam Quốc Loạn Nhập — the turn-based battle (v2; docs/phases/v2-gameplay/ASSIGN.md mục 3, rules.md "Trận theo lượt").
 *
 * Pure and deterministic like engine.js: a battle is a plain JSON state, every call returns a new state, and every
 * roll comes from the state's own seed. No DOM, no Math.random. Loaded as a classic <script> (window.EmperorsBattle,
 * and EmperorsEngine.Battle when the engine is loaded first) and with require() in Node. It does not need engine.js.
 *
 * The field: 3 lanes (0 left, 1 centre, 2 right) × 6 rows; rows 0–1 are the attacker's, 4–5 the defender's, and in a
 * siege the defender's rows 4–5 are the walls. Each side fields 1–6 wings { id, side, arm, men, start, morale, lane,
 * row, order, … }. A turn resolves in order: moves, fire, arrows, melee, breaches, routs; at most 5 turns. A siege is
 * won by breaking the garrison or getting a wing over an undefended wall; at nightfall the walls still stand.
 * Ported from the demo 1 spike (docs/phases/v2-gameplay/demo1/src/hn-rules.js, which answered "is this fun"); the
 * numbers are the spike's, the traits are effect ids (content names them), the events are data.
 *
 *   const b0 = Battle.create(plan, { lanes?, gens? })
 *       plan: a BattleDescriptor (runtime-event.md) without its result, plus `seed`; gen: stats { uy, tai, muu, dung,
 *       kien, loyal?, lord?, traits? } or an id looked up in opts.gens (else a plain garrison officer)
 *   Battle.legalOrders(b, wingId) → ['tien', 'giu', …]
 *   const b1 = Battle.orders(b0, 'A', { A0: 'xung', A3: 'ban' })   a wing left without an order takes the auto order
 *   const b2 = Battle.resolve(b1)             one turn: b2.log[b2.log.length - 1].ev is what happened (Battle.say)
 *   b2.over → null, or { win: 'A' | 'D' | 'draw', sa, sd } after the last turn
 *   Battle.view(b) → the wings as the scene places them · Battle.simulate(b) → both sides on auto to the end
 *   Battle.outcome(b) → { win, turns, losses: { A, D }, routed } (BattleDescriptor.result's shape)
 *   Battle.power(b, w, foe, mode) / Battle.guard(b, w, foe) → { p | k, mods: [[why, pct]] } (the forecast's reasons)
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    root.EmperorsBattle = factory();
    if (root.EmperorsEngine) root.EmperorsEngine.Battle = root.EmperorsBattle;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ARMS = ['bo', 'cung', 'ky', 'thuy'];
  const ARM_NAME = { bo: 'Bộ', cung: 'Cung', ky: 'Kỵ', thuy: 'Thủy' };
  const LANES = 3;
  const ROWS = 6;
  const MAX_TURN = 5;
  const MAX_WINGS = 6;
  // per 1,000 men: strike and guard; archers shoot
  const BASE = { bo: { atk: 1.0, def: 1.1 }, cung: { atk: 0.5, def: 0.8, shoot: 0.9 }, ky: { atk: 1.3, def: 0.9 }, thuy: { atk: 1.05, def: 1.0 } };
  const DMG = 260; // men lost per point of strength over guard, per turn
  const SHOCK = 150; // morale lost per share of the wing lost
  const LANE_TEXT = { open: 'Đồng trống', ford: 'Bến sông', wood: 'Rừng thưa', hill: 'Đồi' };
  const LANE_NAME = ['trái', 'giữa', 'phải'];
  // the three lanes of a site by its terrain (world.json provinces[].terrain); a river site gets a ford on a flank.
  // The map can give the lanes from its own ground instead (opts.lanes, the laneProvider).
  const TERRAIN_LANES = {
    plains: ['open', 'open', 'wood'],
    river: ['open', 'ford', 'open'],
    hills: ['hill', 'open', 'wood'],
    mountains: ['hill', 'hill', 'wood'],
    jungle: ['wood', 'open', 'wood'],
    coast: ['open', 'ford', 'open'],
    desert: ['open', 'open', 'open'],
  };
  const ORDERS = {
    tien: { name: 'Tiến', text: 'Lên một hàng; chạm địch thì đánh.' },
    xung: { name: 'Xung phong', text: 'Lên hai hàng, cú va đầu +40%.', arms: ['ky'] },
    giu: { name: 'Giữ', text: 'Đứng yên, thủ +25%. Bộ giữ trận: giáo chặn kỵ +50%.' },
    ban: { name: 'Bắn', text: 'Bắn cánh địch cách tối đa 2 hàng.', arms: ['cung'] },
    suon: { name: 'Vòng sườn', text: 'Sang làn bên; lần chạm tới đánh sườn +50%.', arms: ['ky'] },
    rut: { name: 'Rút', text: 'Lùi một hàng, hồi sĩ khí; ra khỏi trận là rời trận.' },
    hoa: { name: 'Hỏa công', text: 'Một lần mỗi trận, tướng Mưu ≥ 7, cần gió: đốt cánh địch trong rừng hoặc trên thuyền.' },
  };
  // general traits by effect (which general has which, and its name, is content: data, freeze v2)
  const TRAITS = {
    charge: 'kỵ xung phong ×1,75 thay vì ×1,4',
    walls: 'lũy tính thêm một bậc',
    navy: 'thuyền +20 %',
    stubborn: 'cánh của tướng không tan trước lượt 4',
    commoner: 'bộ và cung +7 sĩ khí',
  };
  const OFFICER = { id: null, name: 'Tướng giữ thành', uy: 4, tai: 4, muu: 3, dung: 4, kien: 5, loyal: null, lord: false, traits: [] };

  // ---------------------------------------------------------------- helpers
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const other = (side) => (side === 'A' ? 'D' : 'A');
  // mulberry32 over b.rs, as engine.js over state.seed
  function rand(b) {
    b.rs = (b.rs + 0x6d2b79f5) >>> 0;
    let t = b.rs;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const stat = (v, d) => (Number.isFinite(Number(v)) ? clamp(Number(v), 1, 10) : d);
  function genOf(x, gens) {
    const g = typeof x === 'string' ? (gens && gens[x]) || { id: x } : x;
    if (!g) return clone(OFFICER);
    const traits = Array.isArray(g.traits) ? g.traits.filter((t) => TRAITS[t]) : [];
    return {
      id: g.id || (typeof x === 'string' ? x : null),
      name: g.name || OFFICER.name,
      uy: stat(g.uy, OFFICER.uy),
      tai: stat(g.tai, OFFICER.tai),
      muu: stat(g.muu, OFFICER.muu),
      dung: stat(g.dung, OFFICER.dung),
      kien: stat(g.kien, OFFICER.kien),
      loyal: g.loyal == null ? null : Number(g.loyal),
      lord: !!g.lord,
      traits,
    };
  }
  const has = (gen, t) => gen.traits.indexOf(t) !== -1;
  // Trung (loyalty) of a general under a lord: below 70 his men fight worse (−1 morale per 4 points, at most −8),
  // 85 and over a little better (+3); a lord leading his own men: 0
  function loyalMorale(gen) {
    if (!gen || gen.lord || gen.loyal == null) return 0;
    if (gen.loyal < 70) return Math.max(-8, Math.round((gen.loyal - 70) / 4));
    return gen.loyal >= 85 ? 3 : 0;
  }
  const sideGen = (b, side) => b[side].gen;
  const live = (b, side) => b.wings.filter((w) => !w.gone && (!side || w.side === side));
  const ahead = (w) => (w.side === 'A' ? 1 : -1);
  const onWalls = (b, w) => b.siege && w.side === 'D' && w.row >= 4;

  function lanesFor(plan, provider) {
    const given = (provider && provider(plan)) || plan.lanes;
    if (Array.isArray(given) && given.length === LANES && given.every((k) => LANE_TEXT[k])) return given.slice();
    const lanes = (TERRAIN_LANES[plan.terrain] || TERRAIN_LANES.plains).slice();
    if (plan.river && lanes.indexOf('ford') === -1) lanes[2] = 'ford';
    return lanes;
  }

  // an army (plus a garrison) as 1–6 wings: foot across the lanes, horse on the flanks, archers and boats behind
  function wingsOf(units, side, walled) {
    const w = [];
    const row = side === 'A' ? 1 : 4;
    const back = side === 'A' ? 0 : 5;
    const add = (arm, men, lane, r) => {
      if (men >= 100) w.push({ id: side + w.length, side, arm, men: Math.round(men), start: Math.round(men), morale: 70, lane, row: r, order: null, flank: false, gone: false, routed: false, left: false });
    };
    const n = (k) => Math.max(0, Number(units && units[k]) || 0);
    const bo = n('bo'), ky = n('ky'), cung = n('cung'), thuy = n('thuy');
    if (walled && bo >= 900 && bo <= 2400) { add('bo', bo * 0.4, 1, row); add('bo', bo * 0.3, 0, row); add('bo', bo * 0.3, 2, row); } // a garrison mans all three walls
    else if (bo > 2400) { add('bo', bo * 0.5, 1, row); add('bo', bo * 0.25, 0, row); add('bo', bo * 0.25, 2, row); }
    else if (bo > 1200) { add('bo', bo * 0.6, 1, row); add('bo', bo * 0.4, 0, row); }
    else add('bo', bo, 1, row);
    const split = ky > 2000 && !(thuy >= 100 && w.length >= 3); // six wings at most: with boats the horse is one wing
    if (split) { add('ky', ky * 0.55, 0, row); add('ky', ky * 0.45, 2, row); } else add('ky', ky, 2, row);
    add('cung', cung, 1, back);
    add('thuy', thuy, 1, back); // behind the centre, as the spike (on the ford lane alone the boats lost 63 → 16 %)
    w.forEach((x, i) => { x.id = side + i; });
    return w.slice(0, MAX_WINGS);
  }

  // ---------------------------------------------------------------- create
  function create(plan, opts) {
    const o = opts || {};
    if (!plan || !plan.attacker || !plan.defender) throw new Error('Battle.create: plan needs attacker and defender');
    const lanes = lanesFor(plan, o.lanes);
    const siege = plan.siege !== false && (plan.walls == null || plan.walls > 0);
    const walls = siege ? clamp(Math.round(Number(plan.walls) || 1), 1, 4) : 0;
    const b = {
      v: 1,
      site: plan.site || null,
      from: plan.from || null,
      siege,
      walls,
      lanes,
      turn: 1,
      maxTurn: MAX_TURN,
      over: null,
      log: [],
      fired: { A: false, D: false },
      wind: true,
      luck: { A: 1, D: 1 },
      rs: (((Number(plan.seed) >>> 0) || 1) ^ 0x9e3779b9) >>> 0,
      A: { fid: plan.attacker.fid || null, gen: genOf(plan.attacker.gen, o.gens) },
      D: { fid: plan.defender.fid || null, gen: genOf(plan.defender.gen, o.gens), holding: !!plan.defender.holding },
      wings: wingsOf(plan.attacker.units, 'A', false).concat(wingsOf(plan.defender.units, 'D', siege)),
    };
    // the day itself: wind for fire (60 %) and each side's fortune (±15 %), unknown to any forecast
    b.wind = rand(b) < 0.6;
    b.luck = { A: 0.85 + 0.3 * rand(b), D: 0.85 + 0.3 * rand(b) };
    for (const w of b.wings) {
      const gen = sideGen(b, w.side);
      w.morale = Math.min(100, 55 + gen.uy * 3 + loyalMorale(gen) + (has(gen, 'commoner') && (w.arm === 'bo' || w.arm === 'cung') ? 7 : 0));
    }
    return b;
  }

  // ---------------------------------------------------------------- strength (the forecast explains with the same list)
  function power(b, w, foe, mode) {
    const gen = sideGen(b, w.side), lane = b.lanes[w.lane], mods = [];
    let p = (w.men / 1000) * (mode === 'shoot' ? BASE[w.arm].shoot || 0.15 : BASE[w.arm].atk);
    const m = (k, why) => { p *= k; mods.push([why, Math.round((k - 1) * 100)]); };
    m(1 + (gen.dung - 5) * 0.03, 'Dũng ' + gen.dung + ' (' + gen.name + ')');
    const wall = foe && onWalls(b, foe);
    if (mode !== 'shoot') {
      if (w.arm === 'ky' && lane === 'open' && !wall) m(1.3, 'kỵ trên đồng trống');
      if (w.arm === 'ky' && lane === 'wood') m(0.7, 'kỵ trong rừng');
      if (w.arm === 'ky' && lane === 'hill') m(0.85, 'kỵ lên dốc');
      if (w.arm === 'ky' && w.charge && !wall) m(has(gen, 'charge') ? 1.75 : 1.4, has(gen, 'charge') ? 'xung phong (' + gen.name + ')' : 'xung phong');
      if (w.flank) m(1.5, 'đánh vào sườn');
      if (w.arm === 'bo' && w.hold && foe && foe.arm === 'ky') m(1.5, 'giáo dài chặn kỵ');
      if (lane === 'ford' && w.arm !== 'thuy' && !onWalls(b, w)) m(0.8, 'lội bến sông');
      if (wall) m(w.arm === 'ky' ? 0.35 : 0.75, w.arm === 'ky' ? 'kỵ đánh tường thành' : 'leo tường');
    }
    if (w.arm === 'thuy' && (lane === 'ford' || has(gen, 'navy'))) m((lane === 'ford' ? 1.15 : 1) * (has(gen, 'navy') ? 1.2 : 1), has(gen, 'navy') ? 'thủy chiến (' + gen.name + ')' : 'thuyền ở bến sông');
    m(0.6 + w.morale / 250, 'sĩ khí ' + Math.round(w.morale));
    if (b.luck) p *= b.luck[w.side];
    return { p, mods };
  }
  function guard(b, w) {
    const gen = sideGen(b, w.side), mods = [];
    let k = BASE[w.arm].def;
    const m = (x, why) => { k *= x; mods.push([why, Math.round((x - 1) * 100)]); };
    m(1 + (gen.kien - 5) * 0.03, 'Kiên ' + gen.kien + ' (' + gen.name + ')');
    if (w.hold) m(1.25, 'giữ trận');
    if (b.lanes[w.lane] === 'hill' && w.side === 'D') m(1.25, 'giữ đồi');
    if (onWalls(b, w)) {
      const lv = b.walls + (has(gen, 'walls') ? 1 : 0);
      if (lv) m(1 + 0.2 * lv, 'tường thành, lũy ' + lv + (has(gen, 'walls') ? ' (' + gen.name + ')' : ''));
    }
    if (w.side === 'D' && b.D.holding && !b.siege) m(1.15, 'dàn trận chờ sẵn');
    return { k, mods };
  }

  // ---------------------------------------------------------------- orders
  function legalOrders(b, id) {
    const w = b.wings.find((x) => x.id === id);
    if (!w || w.gone || b.over) return [];
    const gen = sideGen(b, w.side);
    return Object.keys(ORDERS).filter((k) => {
      if (ORDERS[k].arms && ORDERS[k].arms.indexOf(w.arm) === -1) return false;
      if (k === 'hoa') return !b.fired[w.side] && gen.muu >= 7;
      return true;
    });
  }
  // what a side would order on its own: the AI, and the default for a wing the player leaves without an order
  function autoPick(b, side) {
    const foes = live(b, other(side)), out = {};
    for (const w of live(b, side)) {
      const near = foes.filter((f) => f.lane === w.lane).sort((x, y) => Math.abs(x.row - w.row) - Math.abs(y.row - w.row))[0];
      const gap = near ? Math.abs(near.row - w.row) : 9;
      let o;
      if (w.arm === 'cung') o = foes.some((f) => Math.abs(f.row - w.row) <= 2 && Math.abs(f.lane - w.lane) <= 1) ? 'ban' : side === 'D' ? 'giu' : 'tien';
      else if (w.arm === 'ky') o = side === 'D' && b.siege ? 'giu' : b.lanes[w.lane] === 'wood' && !w.flank ? 'suon' : gap >= 2 && gap <= 3 ? 'xung' : 'tien';
      else if (side === 'D' && (b.siege || w.arm === 'bo')) o = b.turn >= 4 && gap > 2 && !b.siege ? 'tien' : 'giu';
      else o = 'tien';
      if (w.morale < 25) o = 'rut';
      out[w.id] = o;
    }
    if (!b.fired[side] && sideGen(b, side).muu >= 7 && b.wind && foes.some((f) => b.lanes[f.lane] === 'wood' || f.arm === 'thuy')) {
      const w = live(b, side).find((x) => x.arm !== 'ky') || live(b, side)[0];
      if (w) out[w.id] = 'hoa';
    }
    return out;
  }
  function orders(b0, side, map) {
    const b = clone(b0);
    for (const [id, o] of Object.entries(map || {})) {
      const w = b.wings.find((x) => x.id === id);
      if (!w || w.side !== side) throw new Error('Battle.orders: ' + id + ' is not a wing of ' + side);
      if (legalOrders(b, id).indexOf(o) === -1) throw new Error('Battle.orders: ' + id + ' cannot ' + o);
      w.order = o;
    }
    return b;
  }
  function autoOrders(b0, side) {
    const b = clone(b0), pick = autoPick(b, side);
    for (const w of live(b, side)) w.order = pick[w.id];
    return b;
  }

  // ---------------------------------------------------------------- one turn
  function resolve(b0) {
    if (b0.over) return b0;
    let b = clone(b0);
    const ev = [];
    // wings left without an order take the auto order (both sides, from the same position)
    const pick = { A: autoPick(b, 'A'), D: autoPick(b, 'D') };
    for (const w of live(b)) {
      if (!w.order) w.order = pick[w.side][w.id];
      w.hold = w.order === 'giu'; w.charge = false; w.hit = 0; w.moved = false; w.shot = null; w.burnt = false; w.fought = false; w.breach = false;
    }
    // 1. moves (attacker first, so a defender that holds is met where it stands)
    for (const w of live(b).sort((x, y) => (x.side === 'A' ? 0 : 1) - (y.side === 'A' ? 0 : 1))) {
      if (w.order === 'tien' || w.order === 'xung') {
        const steps = w.order === 'xung' ? 2 : 1;
        for (let s = 0; s < steps; s++) {
          const nr = w.row + ahead(w);
          if (nr < 0 || nr >= ROWS) break;
          if (live(b).some((f) => f.side !== w.side && f.lane === w.lane && (f.row === nr || f.row === w.row))) break;
          w.row = nr; w.moved = true;
        }
        if (w.order === 'xung' && w.moved) w.charge = true;
      } else if (w.order === 'suon') {
        const count = (l) => live(b).filter((f) => f.side !== w.side && f.lane === l).length;
        w.lane = w.lane === 1 ? (count(0) <= count(2) ? 0 : 2) : 1; w.flank = true; w.moved = true;
      } else if (w.order === 'rut') {
        w.row -= ahead(w); w.morale = Math.min(100, w.morale + 6); w.moved = true;
        if (w.row < 0 || w.row >= ROWS) { w.gone = true; w.left = true; ev.push({ kind: 'leave', side: w.side, wing: w.id, arm: w.arm }); }
      }
    }
    // 2. fire (once per side per battle)
    for (const w of live(b)) {
      if (w.order !== 'hoa') continue;
      const side = w.side, gen = sideGen(b, side);
      if (b.fired[side] || gen.muu < 7) { w.hold = true; ev.push({ kind: 'fire_fail', side, why: 'muu' }); continue; }
      if (!b.wind) { w.hold = true; b.fired[side] = true; ev.push({ kind: 'fire_fail', side, why: 'wind' }); continue; }
      b.fired[side] = true;
      const tgt = live(b).filter((f) => f.side !== side && (b.lanes[f.lane] === 'wood' || f.arm === 'thuy')).sort((x, y) => y.men - x.men)[0];
      if (!tgt) { ev.push({ kind: 'fire_fail', side, why: 'target' }); continue; }
      const loss = Math.round(tgt.men * (0.2 + gen.muu * 0.015));
      tgt.men -= loss; tgt.morale -= 25; tgt.hit += loss; tgt.burnt = true;
      ev.push({ kind: 'fire', side, wing: w.id, target: tgt.id, arm: tgt.arm, lane: tgt.lane, loss, big: true });
    }
    // 3. arrows
    const volley = {};
    for (const w of live(b)) {
      if (w.order !== 'ban' || w.arm !== 'cung') continue;
      const tgt = live(b).filter((f) => f.side !== w.side && Math.abs(f.row - w.row) <= 2 && Math.abs(f.lane - w.lane) <= 1).sort((x, y) => Math.abs(x.row - w.row) - Math.abs(y.row - w.row) || Math.abs(x.lane - w.lane) - Math.abs(y.lane - w.lane))[0];
      if (!tgt) continue;
      const pw = power(b, w, tgt, 'shoot').p, gd = guard(b, tgt).k;
      const loss = Math.round(Math.min(tgt.men * 0.2, (pw / gd) * DMG * 0.8 * (0.85 + 0.3 * rand(b))));
      tgt.morale -= (loss / Math.max(1, tgt.men)) * SHOCK * 0.7; tgt.men -= loss; tgt.hit += loss; w.shot = tgt.id;
      volley[w.side] = (volley[w.side] || 0) + loss;
    }
    for (const side of ['A', 'D']) if (volley[side]) ev.push({ kind: 'volley', side, loss: volley[side] });
    // 4. melee: facing wings in one lane, at most one row apart
    for (const a of live(b, 'A')) for (const d of live(b, 'D')) {
      if (a.lane !== d.lane || Math.abs(a.row - d.row) > 1 || a.men <= 0 || d.men <= 0) continue;
      const pa = power(b, a, d).p, pd = power(b, d, a).p, ga = guard(b, a).k, gd = guard(b, d).k;
      const la = Math.round(Math.min(a.men * 0.35, (pd / ga) * DMG * (0.7 + 0.6 * rand(b))));
      const ld = Math.round(Math.min(d.men * 0.35, (pa / gd) * DMG * (0.7 + 0.6 * rand(b))));
      a.morale -= (la / Math.max(1, a.men)) * SHOCK + (d.flank ? 12 : 0); d.morale -= (ld / Math.max(1, d.men)) * SHOCK + (a.flank ? 12 : 0);
      a.men -= la; d.men -= ld; a.hit += la; d.hit += ld; a.fought = true; d.fought = true;
      ev.push({ kind: 'melee', lane: a.lane, a: a.id, d: d.id, armA: a.arm, armD: d.arm, lossA: la, lossD: ld, charge: a.charge || d.charge, flankA: a.flank, flankD: d.flank });
      a.flank = false; d.flank = false;
    }
    // 5. a wing standing in the enemy's back rows of a lane they left empty: over the wall, or behind their line
    for (const w of live(b)) {
      if (w.arm === 'cung' || w.arm === 'thuy') continue;
      const deep = w.side === 'A' ? w.row >= 4 : w.row <= 1, foe = other(w.side);
      if (!deep || live(b, foe).some((f) => f.lane === w.lane) || live(b, w.side).some((x) => x !== w && x.breach && x.lane === w.lane)) continue;
      for (const f of live(b, foe)) f.morale -= 12;
      w.breach = true;
      ev.push({ kind: 'breach', side: w.side, wing: w.id, arm: w.arm, lane: w.lane, wall: b.siege && w.side === 'A', big: true });
    }
    // 6. rout
    for (const w of live(b)) {
      const stubborn = has(sideGen(b, w.side), 'stubborn') && b.turn < 4;
      if (w.men < 80 || (w.morale < 18 && !stubborn)) { w.gone = true; w.routed = true; ev.push({ kind: 'rout', side: w.side, wing: w.id, arm: w.arm, lane: w.lane, big: true }); }
      w.morale = clamp(w.morale, 0, 100); w.order = null;
    }
    b.log.push({ turn: b.turn, ev });
    const sa = strength(b, 'A'), sd = strength(b, 'D');
    if (!live(b, 'A').length || !live(b, 'D').length || b.turn >= b.maxTurn) {
      // a siege is won by breaking the garrison or getting over a wall; at nightfall the walls still stand
      const over = b.siege && live(b, 'A').some((w) => w.breach);
      const win = !live(b, 'D').length || over ? 'A' : !live(b, 'A').length ? 'D' : b.siege ? 'D' : sa > sd * 1.2 ? 'A' : sd > sa * 1.2 ? 'D' : 'draw';
      b.over = { win, sa: Math.round(sa), sd: Math.round(sd) };
    } else b.turn += 1;
    return b;
  }
  // what is left of a side, weighed by morale and the walls it stands on
  function strength(b, side) {
    return live(b, side).reduce((s, w) => s + w.men * (0.5 + w.morale / 200) * (onWalls(b, w) ? 1 + 0.2 * b.walls : 1), 0);
  }
  function simulate(b0) {
    let b = b0;
    for (let k = 0; !b.over && k < MAX_TURN + 1; k++) b = resolve(autoOrders(autoOrders(b, 'A'), 'D'));
    return b;
  }
  // men a side lost: the dead, and half of what was left of a wing that broke (scattered, taken)
  function lossOf(b, side) {
    return Math.round(b.wings.filter((w) => w.side === side).reduce((s, w) => s + (w.start - Math.max(0, w.routed ? w.men * 0.5 : w.men)), 0));
  }
  function outcome(b) {
    if (!b.over) return null;
    const win = b.over.win;
    return { win, turns: b.turn, losses: { A: lossOf(b, 'A'), D: lossOf(b, 'D') }, routed: win === 'A' ? 'D' : win === 'D' ? 'A' : null };
  }
  // the wings as the scene places them on the 3D field (a block per wing, its lane and row, its men and morale)
  function view(b) {
    return b.wings.map((w) => ({
      id: w.id, side: w.side, arm: w.arm, men: Math.max(0, w.men), start: w.start, morale: Math.round(w.morale), lane: w.lane, row: w.row,
      order: w.order || null, onWalls: onWalls(b, w), gone: w.gone, routed: w.routed, left: w.left, charge: !!w.charge, flank: !!w.flank, breach: !!w.breach,
    }));
  }
  // one event as a line of the battle log, from the side `me` is on ('A' or 'D'; the spectator: null)
  function say(b, ev, me) {
    const who = (side) => (me ? (side === me ? 'ta' : 'địch') : side === 'A' ? 'bên đánh' : 'bên thủ');
    const Who = (side) => who(side).charAt(0).toUpperCase() + who(side).slice(1);
    const gname = (side) => sideGen(b, side).name;
    const n = (x) => String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const wing = (id) => b.wings.find((w) => w.id === id) || {};
    switch (ev.kind) {
      case 'leave': return Who(ev.side) + ': cánh ' + ARM_NAME[ev.arm] + ' rời trận.';
      case 'fire_fail': return ev.why === 'wind' ? gname(ev.side) + ' định hỏa công nhưng không có gió.' : ev.why === 'target' ? gname(ev.side) + ' phóng hỏa nhưng không cánh ' + who(other(ev.side)) + ' nào ở trong rừng hay trên thuyền.' : gname(ev.side) + ' không đủ mưu để hỏa công.';
      case 'fire': return gname(ev.side) + ' hỏa công: cánh ' + ARM_NAME[ev.arm] + ' ' + who(other(ev.side)) + ' cháy, mất ' + n(ev.loss) + '.';
      case 'volley': return 'Cung ' + who(ev.side) + ' bắn: ' + who(other(ev.side)) + ' −' + n(ev.loss) + '.';
      case 'melee': {
        const a = wing(ev.a), d = wing(ev.d), mine = me === 'D' ? 'd' : 'a';
        const [x, y, lx, ly, fx] = mine === 'a' ? [a, d, ev.lossA, ev.lossD, ev.flankA] : [d, a, ev.lossD, ev.lossA, ev.flankD];
        return ARM_NAME[x.arm] + ' ' + who(x.side) + ' ' + (ev.charge && x.arm === 'ky' ? 'xung phong vào ' : fx ? 'đánh sườn ' : 'đánh ') + ARM_NAME[y.arm].toLowerCase() + ' ' + who(y.side) + ', làn ' + LANE_NAME[ev.lane] + ': ' + who(x.side) + ' −' + n(lx) + ', ' + who(y.side) + ' −' + n(ly) + '.';
      }
      case 'breach': return Who(ev.side) + ': cánh ' + ARM_NAME[ev.arm] + (ev.wall ? ' leo lên tường làn ' : ' đánh vào hậu trận làn ') + LANE_NAME[ev.lane] + '. Cả trận ' + who(other(ev.side)) + ' mất sĩ khí.';
      case 'rout': return Who(ev.side) + ': cánh ' + ARM_NAME[ev.arm] + ' tan vỡ.';
      default: return '';
    }
  }

  return {
    ARMS, ARM_NAME, LANES, ROWS, MAX_TURN, BASE, ORDERS, TRAITS, LANE_TEXT, TERRAIN_LANES, OFFICER,
    create, lanesFor, genOf, loyalMorale, legalOrders, orders, autoOrders, resolve, simulate, power, guard, strength,
    lossOf, outcome, view, say, live: (b, side) => live(b, side).map((w) => w.id), onWalls,
  };
});
