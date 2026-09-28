// Demo 1 (phase v2-gameplay): one season in Huai Nan, autumn 219. Throwaway spike rules to answer "is this fun";
// not the engine and not freeze v2. Pure: no DOM, seeded RNG, every call returns a new state.
//   HNRules.newGame(seed) · setArmyOrder · setTownTask · answerCard · forecast(g, ids, target) · endSeason(g)
//   → g.pending (a battle the player fights: HNRules.battle.*, 3 lanes × 6 rows, ≤ 5 turns) → settleBattle(g, b) → g.report
(function () {
  const R = {};
  // ------------------------------------------------------------------ data
  const PLACES = { // world units (1 = 3 km), from the Albers projection of assets/map/meta.json
    chung_ly: { name: 'Chung Ly', xz: [170.4, -51.3], river: 'hoai', terrain: 'Đồng bằng ven sông Hoài' },
    tho_xuan: { name: 'Thọ Xuân', xz: [144.7, -35.7], river: 'hoai', terrain: 'Đồng bằng, sông Phì chảy qua' },
    am_lang: { name: 'Âm Lăng', xz: [173.7, -37.0], river: null, terrain: 'Đồng bằng, rừng thưa' },
    hu_di: { name: 'Hu Dị', xz: [195.6, -58.1], river: 'hoai', terrain: 'Gò đồi ven hồ' },
    lich_duong: { name: 'Lịch Dương', xz: [197.1, -10.5], river: 'giang', terrain: 'Bờ bắc Trường Giang' },
  };
  const FAC = {
    zhu_yuanzhang: { name: 'Chu Nguyên Chương', short: 'Minh', glyph: '明', color: '#b3262e' },
    cao_cao: { name: 'Tào Tháo', short: 'Tào', glyph: '魏', color: '#4d6a3a' },
    sun_quan: { name: 'Tôn Quyền', short: 'Ngô', glyph: '吳', color: '#e07b24' },
    local: { name: 'Hào tộc', short: 'Hào tộc', glyph: '豪', color: '#8a7a55' },
  };
  // five stats as in TW3K: Uy (authority: morale), Tài (expertise: walls, building), Mưu (cunning: forecasts, fire),
  // Dũng (instinct: damage), Kiên (resolve: holding); 1–10
  const GEN = {
    zhu: { name: 'Chu Nguyên Chương', fid: 'zhu_yuanzhang', cls: 'Thống soái', uy: 9, tai: 7, muu: 7, dung: 6, kien: 8, loyal: 100, trait: 'Xuất thân bần nông', traitText: 'Bộ và cung +7 sĩ khí.', seal: '朱' },
    zhu_huan: { name: 'Chu Hoàn', fid: 'zhu_yuanzhang', cls: 'Tiên phong', uy: 5, tai: 4, muu: 3, dung: 8, kien: 6, loyal: 72, trait: 'Thủy chiến', traitText: 'Thuyền +20%.', seal: '桓' },
    zhang_liao: { name: 'Trương Liêu', fid: 'cao_cao', cls: 'Tiên phong', uy: 8, tai: 6, muu: 6, dung: 10, kien: 8, loyal: 90, trait: 'Uy chấn Tiêu Dao', traitText: 'Kỵ xung phong +25%.', seal: '遼' },
    man_chong: { name: 'Mãn Sủng', fid: 'cao_cao', cls: 'Thủ tướng', uy: 6, tai: 8, muu: 8, dung: 4, kien: 8, loyal: 95, trait: 'Giữ thành', traitText: 'Lũy tính thêm một bậc.', seal: '寵' },
    zhou_tai: { name: 'Chu Thái', fid: 'sun_quan', cls: 'Mãnh tướng', uy: 5, tai: 5, muu: 4, dung: 9, kien: 10, loyal: 95, trait: 'Mình đầy thương tích', traitText: 'Cánh của ông không tan trước lượt 4.', seal: '泰' },
    tran: { name: 'Trần Kiểu', fid: 'local', cls: 'Hào trưởng', uy: 4, tai: 6, muu: 5, dung: 3, kien: 5, loyal: 60, trait: 'Hào tộc Hu Dị', traitText: 'Dân Hu Dị theo ông.', seal: '矯' },
  };
  const ARMS = { bo: 'Bộ', cung: 'Cung', ky: 'Kỵ', thuy: 'Thủy' };
  const REACH = { land: 36, fast: 45, fleet: 60 }; // one season (world units): foot 108 km, horse 135 km, boats on one river 180 km
  const SEASONS = ['Xuân', 'Hạ', 'Thu', 'Đông'];

  // ------------------------------------------------------------------ helpers
  const clone = (o) => JSON.parse(JSON.stringify(o));
  function rnd(g) { g.rs = (g.rs + 0x6d2b79f5) >>> 0; let t = g.rs; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  const fmt = (n) => { n = Math.round(n); const s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); return (n < 0 ? '−' : '') + s; };
  const r100 = (n) => Math.round(n / 100) * 100;
  const cal = (s) => { const i = 2 + s - 1; return SEASONS[i % 4] + ' ' + (219 + Math.floor(i / 4)); };
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const total = (u) => (u.bo || 0) + (u.ky || 0) + (u.cung || 0) + (u.thuy || 0);
  const posOf = (g, a) => PLACES[a.at].xz;
  const log = (g, s) => g.log.push(s);
  const ids = (x) => (Array.isArray(x) ? x : [x]);
  const hostileTo = (g, fid, owner) => owner !== fid && !(fid === g.me && g.allies[owner]) && !(owner === g.me && g.allies[fid]);
  R.fmt = fmt; R.cal = cal; R.PLACES = PLACES; R.FAC = FAC; R.GEN = GEN; R.ARMS = ARMS; R.total = total; R.dist = dist; R.hostileTo = hostileTo;

  // ------------------------------------------------------------------ new game (autumn 219)
  R.newGame = function (seed) {
    const g = {
      v: 2, seed: seed >>> 0, rs: (seed >>> 0) || 1, season: 1, me: 'zhu_yuanzhang', over: null, log: [], chronicle: [],
      res: { luong: 1200, tien: 900, uy: 50 }, warn: { luong: false, uy: false },
      gens: clone(GEN), captives: [], allies: {}, rumor: 0.5,
      towns: {
        chung_ly: { owner: 'zhu_yuanzhang', gar: { bo: 800 }, walls: 2, dan: 24000, gov: null, task: null },
        am_lang: { owner: 'zhu_yuanzhang', gar: { bo: 500 }, walls: 1, dan: 12000, gov: null, task: null },
        tho_xuan: { owner: 'cao_cao', gar: { bo: 2000, cung: 600 }, walls: 3, dan: 30000, gov: 'man_chong', task: null },
        hu_di: { owner: 'local', gar: { bo: 1200 }, walls: 1, dan: 14000, gov: 'tran', task: null },
        lich_duong: { owner: 'local', gar: { bo: 700 }, walls: 1, dan: 10000, gov: null, task: null },
      },
      armies: {
        a1: { id: 'a1', fid: 'zhu_yuanzhang', gen: 'zhu', arm: 'land', at: 'chung_ly', off: [3, 2.5], units: { bo: 3200, cung: 1000, ky: 800 }, order: null },
        a2: { id: 'a2', fid: 'zhu_yuanzhang', gen: 'zhu_huan', arm: 'fleet', at: 'chung_ly', off: [0, -3.2], units: { thuy: 1800, bo: 600 }, order: null },
        e1: { id: 'e1', fid: 'cao_cao', gen: 'zhang_liao', arm: 'land', at: 'tho_xuan', off: [3.5, -1.5], units: { bo: 2000, cung: 500, ky: 3500 }, order: null },
        e2: { id: 'e2', fid: 'sun_quan', gen: 'zhou_tai', arm: 'fleet', at: 'lich_duong', off: [2, 3], units: { thuy: 3000, bo: 1000 }, order: null },
      },
    };
    g.cards = seasonCards(g);
    g.chronicle.push({ s: 1, t: 'Chu Nguyên Chương tỉnh dậy ở Chung Ly, Hoài Nam, với hai đạo quân và hai thành.' });
    return g;
  };

  // ------------------------------------------------------------------ what the player sees of other armies
  // every army is on the map; within 33 units of our towns or armies numbers are ±20 %, farther ±50 % (fixed per season)
  R.seen = function (g, a) {
    if (a.fid === g.me) return { exact: true, spread: 0, units: clone(a.units) };
    const eyes = Object.keys(g.towns).filter((t) => g.towns[t].owner === g.me).map((t) => PLACES[t].xz).concat(Object.values(g.armies).filter((x) => x.fid === g.me).map((x) => posOf(g, x)));
    const near = eyes.some((e) => dist(e, posOf(g, a)) < 33), spread = near ? 0.2 : 0.5, u = {};
    let h = (g.season * 7919 + a.id.charCodeAt(1) * 131) >>> 0;
    for (const k of Object.keys(a.units)) { h = (h * 1103515245 + 12345) >>> 0; u[k] = r100(a.units[k] * (1 - spread + ((h % 1000) / 1000) * 2 * spread)); }
    return { exact: false, spread, near, units: u };
  };
  // "~3.600" near, "2.000–5.000" far
  R.seenText = (n, spread) => (!spread ? fmt(n) : spread < 0.3 ? '~' + fmt(n) : fmt(r100(n * 0.6)) + '–' + fmt(r100(n * 1.6)));

  // ------------------------------------------------------------------ orders
  R.reachOf = (a) => (a.arm === 'fleet' ? REACH.fleet : (a.units.ky || 0) > total(a.units) * 0.5 ? REACH.fast : REACH.land);
  // legal targets this season: towns (move / attack / siege) and enemy armies (attack), with distance
  R.targets = function (g, id) {
    const a = g.armies[id], p = posOf(g, a), out = [], riv = PLACES[a.at].river;
    for (const [tid, P] of Object.entries(PLACES)) {
      if (a.arm === 'fleet' && (!P.river || P.river !== riv)) continue; // Huai and Yangtze are separate waters here
      const d = dist(p, P.xz), t = g.towns[tid], hostile = hostileTo(g, a.fid, t.owner);
      if (d > R.reachOf(a) + 0.5) continue;
      if (a.at === tid && !hostile) continue;
      out.push({ kind: 'town', id: tid, d: Math.round(d), hostile, allied: !hostile && t.owner !== a.fid });
    }
    for (const b of Object.values(g.armies)) {
      if (!hostileTo(g, a.fid, b.fid)) continue;
      if (a.arm === 'fleet' && (b.arm !== 'fleet' || PLACES[b.at].river !== riv)) continue;
      const d = dist(p, posOf(g, b)); if (d <= R.reachOf(a) + 0.5) out.push({ kind: 'army', id: b.id, d: Math.round(d), hostile: true });
    }
    return out;
  };
  // order: { type: 'move'|'attack'|'siege'|'hold', kind, id }
  R.setArmyOrder = function (g0, id, order) { const g = clone(g0); g.armies[id].order = order; return g; };
  const TASKS = {
    ruong: { name: 'Khai ruộng', seasons: 2, cost: { tien: 300 }, text: 'Lương thu ở thành này +25%' },
    luy: { name: 'Đắp lũy', seasons: 2, cost: { tien: 400 }, text: 'Lũy +1: thủ thành +25%' },
    cho: { name: 'Dựng chợ', seasons: 2, cost: { tien: 300 }, text: 'Tiền +200 mỗi mùa' },
    mo_bo: { name: 'Mộ bộ binh', seasons: 1, cost: { tien: 250, luong: 150 }, add: { bo: 1000 }, dan: 1000, text: '+1.000 bộ vào đồn' },
    mo_cung: { name: 'Mộ cung thủ', seasons: 1, cost: { tien: 300, luong: 100 }, add: { cung: 600 }, dan: 600, text: '+600 cung vào đồn' },
    mo_ky: { name: 'Mua ngựa, mộ kỵ', seasons: 1, cost: { tien: 500, luong: 150 }, add: { ky: 400 }, dan: 400, text: '+400 kỵ vào đồn' },
    mo_thuy: { name: 'Đóng thuyền', seasons: 1, cost: { tien: 400, luong: 100 }, add: { thuy: 600 }, dan: 600, river: true, text: '+600 thủy binh (thành ven sông)' },
  };
  R.TASKS = TASKS;
  R.canTask = (g, tid, key) => {
    const T = TASKS[key], t = g.towns[tid];
    if (T.river && !PLACES[tid].river) return false; if (key === 'luy' && t.walls >= 4) return false; if (key === 'ruong' && t.farm) return false; if (key === 'cho' && t.market) return false;
    if (t.task && !t.task.fresh) return false; // work already under way
    return Object.entries(T.cost).every(([k, v]) => g.res[k] + (t.task && t.task.fresh ? TASKS[t.task.key].cost[k] || 0 : 0) >= v);
  };
  R.setTownTask = function (g0, tid, key) {
    const g = clone(g0), t = g.towns[tid];
    if (t.task && t.task.fresh) for (const [k, v] of Object.entries(TASKS[t.task.key].cost)) g.res[k] += v; // changing this season's pick refunds it
    if (!key) { t.task = null; return g; }
    const T = TASKS[key]; for (const [k, v] of Object.entries(T.cost)) g.res[k] -= v;
    t.task = { key, left: T.seasons, fresh: true };
    return g;
  };
  // move men between a town's garrison and an army standing in it (n > 0: town → army)
  R.transfer = function (g0, tid, aid, arm, n) {
    const g = clone(g0), t = g.towns[tid], a = g.armies[aid];
    if (n > 0) { n = Math.min(n, t.gar[arm] || 0); t.gar[arm] -= n; a.units[arm] = (a.units[arm] || 0) + n; } else { n = Math.min(-n, a.units[arm] || 0); a.units[arm] -= n; t.gar[arm] = (t.gar[arm] || 0) + n; }
    return g;
  };

  // ------------------------------------------------------------------ cards: history, envoys, generals, captives
  function seasonCards(g) {
    const c = [];
    if (g.season === 1) {
      c.push({ id: 'history_fan', kind: 'history', who: 'Ký ức người xuyên không', title: 'Quan Vũ sắp dìm bảy quân ở Phàn Thành', text: 'Tháng 8 năm 219. Ta nhớ: Tào Tháo sẽ gọi quân Hoài Nam về cứu Tương Dương. Trương Liêu có thể rời Thọ Xuân ngay mùa này, hoặc không.', yes: { label: 'Tung tin Hoài Nam yếu', fx: 'Tào rút Trương Liêu: 85% · Uy −5' }, no: { label: 'Im lặng chờ', fx: 'Tào rút Trương Liêu: 50%' } });
      c.push({ id: 'envoy_wu', kind: 'envoy', who: 'Sứ Ngô', gen: 'zhou_tai', title: 'Tôn Quyền xin kết minh đánh Tào', text: 'Ngô không động tới đất ta. Đổi lại Ngô lấy Lịch Dương. Thuyền Ngô giúp ta khi ta đánh ven sông.', yes: { label: 'Kết minh', fx: 'Ngô lấy Lịch Dương · +1.200 thủy Ngô khi ta đánh ven sông' }, no: { label: 'Từ chối', fx: 'Ngô tự do · Lịch Dương còn bỏ ngỏ' } });
      c.push({ id: 'local_hudi', kind: 'envoy', who: 'Hào tộc Hu Dị', gen: 'tran', title: 'Trần Kiểu xin quy thuận', text: 'Ông mở cổng Hu Dị nếu ta tha thuế hai mùa và giữ ông làm huyện lệnh.', yes: { label: 'Nhận', fx: 'Hu Dị về ta · Lương −300 · miễn thuế 2 mùa' }, no: { label: 'Đòi hàng vô điều kiện', fx: 'Uy +3 · muốn Hu Dị thì phải đánh' } });
      c.push({ id: 'gen_zhuhuan', kind: 'general', who: 'Tướng dưới trướng', gen: 'zhu_huan', title: 'Chu Hoàn xin làm tiên phong', text: 'Tướng thủy trẻ, gan (Dũng 8) nhưng ít mưu (Mưu 3), đang cầm đạo thủy 1.800 thuyền binh và 600 bộ. Ông xin đánh trước để lập công.', yes: { label: 'Cho làm tiên phong', fx: 'Trung 72 → 82: quân ông +3 sĩ khí. Nhưng mùa này đạo thủy phải Đánh hoặc Vây, không thì Trung −15.' }, no: { label: 'Bắt chờ lệnh', fx: 'Trung 72 → 60: quân ông −3 sĩ khí khi ra trận.' } });
    }
    if (g.season === 2) {
      c.push({ id: 'history_lu', kind: 'history', who: 'Ký ức người xuyên không', title: 'Lã Mông áo trắng qua sông', text: 'Đông 219. Ngô sắp đánh úp Kinh Châu. Thuyền Chu Thái sẽ bị gọi về tây, Lịch Dương bỏ ngỏ.', yes: { label: 'Đòi Lịch Dương hàng', fx: 'Uy ≥ 45: Lịch Dương hàng ta · Ngô thù ta' }, no: { label: 'Đứng ngoài', fx: 'Không gì đổi' } });
    }
    const zh = g.gens.zhu_huan;
    if (g.season > 1 && zh.fid === g.me && zh.loyal < 55) c.push({ id: 'gen_zhuhuan_' + g.season, kind: 'general', who: 'Tướng dưới trướng', gen: 'zhu_huan', title: 'Chu Hoàn bất mãn', text: 'Lòng trung còn ' + zh.loyal + '. Ông đòi được giữ một thành.', yes: { label: 'Giao Âm Lăng', fx: 'Trung +20; ông làm trấn thủ Âm Lăng.' }, no: { label: 'Mắng', fx: 'Trung −10. Dưới 30 thì ông bỏ đi, mang cả đạo thủy.' } });
    for (const cp of g.captives) c.push({ id: 'captive_' + cp, kind: 'captive', who: 'Tù binh', gen: cp, title: 'Bắt sống ' + GEN[cp].name, text: GEN[cp].name + ' (' + GEN[cp].cls + ', Mưu ' + GEN[cp].muu + ', Dũng ' + GEN[cp].dung + ') bị trói trước trướng. Trung với chủ cũ ' + GEN[cp].loyal + '.', yes: { label: 'Chiêu hàng', fx: (GEN[cp].loyal >= 85 ? 25 : 60) + '% theo ta; không thì chém' }, no: { label: 'Thả về', fx: 'Uy +6' } });
    return c;
  }
  R.answerCard = function (g0, cid, yes) {
    const g = clone(g0), c = g.cards.find((x) => x.id === cid); if (!c) return g;
    g.cards = g.cards.filter((x) => x.id !== cid); g.flash = null;
    if (cid === 'history_fan') { g.rumor = yes ? 0.85 : 0.5; if (yes) g.res.uy -= 5; g.chronicle.push({ s: g.season, t: yes ? 'Tung tin Hoài Nam suy yếu để Tào rút Trương Liêu.' : 'Im lặng chờ Tào tự rút quân.' }); }
    if (cid === 'envoy_wu' && yes) { g.allies.sun_quan = true; g.chronicle.push({ s: g.season, t: 'Kết minh với Tôn Quyền, nhường Lịch Dương.' }); }
    if (cid === 'local_hudi') {
      if (yes) { const t = g.towns.hu_di; t.owner = g.me; t.taxFree = g.season + 2; g.res.luong -= 300; g.gens.tran.fid = g.me; g.gens.tran.loyal = 65; g.chronicle.push({ s: g.season, t: 'Trần Kiểu dâng Hu Dị.' }); g.flash = { ok: true, text: 'Hu Dị mở cổng.' }; }
      else g.res.uy += 3;
    }
    if (cid === 'gen_zhuhuan') { const zh = g.gens.zhu_huan; if (yes) { zh.loyal = Math.min(100, zh.loyal + 10); g.vanguard = 'a2'; } else zh.loyal -= 12; }
    if (cid.indexOf('gen_zhuhuan_') === 0) { const zh = g.gens.zhu_huan; if (yes) { zh.loyal += 20; g.towns.am_lang.gov = 'zhu_huan'; } else zh.loyal -= 10; }
    if (cid === 'history_lu' && yes) {
      if (g.res.uy >= 45 && g.towns.lich_duong.owner === 'local') { g.towns.lich_duong.owner = g.me; g.chronicle.push({ s: g.season, t: 'Lịch Dương hàng ta khi thuyền Ngô đi vắng.' }); g.flash = { ok: true, text: 'Lịch Dương mở cổng.' }; }
      else g.flash = { ok: false, text: 'Lịch Dương không nghe.' };
      g.allies.sun_quan = false; g.wuAngry = true;
    }
    if (cid.indexOf('captive_') === 0) {
      const cp = cid.slice(8); g.captives = g.captives.filter((x) => x !== cp);
      if (yes) {
        const p = GEN[cp].loyal >= 85 ? 0.25 : 0.6;
        if (rnd(g) < p) { g.gens[cp].fid = g.me; g.gens[cp].loyal = 55; g.chronicle.push({ s: g.season, t: GEN[cp].name + ' quy hàng.' }); g.flash = { ok: true, text: GEN[cp].name + ' quy hàng ta.' }; }
        else { g.gens[cp].dead = true; g.chronicle.push({ s: g.season, t: GEN[cp].name + ' không hàng, bị chém.' }); g.flash = { ok: false, text: GEN[cp].name + ' không hàng, bị chém.' }; }
      } else { g.res.uy += 6; g.gens[cp].free = true; g.chronicle.push({ s: g.season, t: 'Thả ' + GEN[cp].name + ' về.' }); }
    }
    return g;
  };

  // ------------------------------------------------------------------ battle: turn-based, 3 lanes × 6 rows, ≤ 5 turns
  // rows 0–1 attacker, 4–5 defender; in a siege the defender's rows 4–5 are the walls. A wing: arm, men, morale, lane, row.
  const B = (R.battle = {});
  const BASE = { bo: { atk: 1.0, def: 1.1 }, cung: { atk: 0.5, def: 0.8, shoot: 0.9 }, ky: { atk: 1.3, def: 0.9 }, thuy: { atk: 1.05, def: 1.0 } };
  // lanes by battle site: open (cavalry +30 %), ford (crossing −20 %, boats +15 %), wood (cavalry −30 %, fire burns)
  const SITE = { am_lang: ['open', 'open', 'wood'], chung_ly: ['open', 'ford', 'open'], tho_xuan: ['open', 'ford', 'wood'], hu_di: ['wood', 'open', 'ford'], lich_duong: ['ford', 'open', 'open'] };
  B.LANE_TEXT = { open: 'Đồng trống', ford: 'Bến sông', wood: 'Rừng thưa', hill: 'Đồi' };
  B.ORDERS = {
    tien: { name: 'Tiến', text: 'Lên một hàng; chạm địch thì đánh.' },
    xung: { name: 'Xung phong', text: 'Lên hai hàng, cú va đầu +40%.', arms: ['ky'] },
    giu: { name: 'Giữ', text: 'Đứng yên, thủ +25%. Bộ giữ trận: giáo chặn kỵ +50%.' },
    ban: { name: 'Bắn', text: 'Bắn cánh địch cách tối đa 2 hàng.', arms: ['cung'] },
    suon: { name: 'Vòng sườn', text: 'Sang làn bên; lần chạm tới đánh sườn +50%.', arms: ['ky'] },
    rut: { name: 'Rút', text: 'Lùi một hàng, hồi sĩ khí; ra khỏi trận là rời trận.' },
    hoa: { name: 'Hỏa công', text: 'Một lần mỗi trận, tướng Mưu ≥ 7: đốt cánh địch trong rừng hoặc trên thuyền.' },
  };
  // Trung (loyalty) of a general under a lord: below 70 his men fight worse (−1 morale per 4 points, at most −8), 85+ a little better (+3)
  R.loyalMorale = (gen) => (!gen || gen.loyal == null || gen.name === 'Chu Nguyên Chương' ? 0 : gen.loyal < 70 ? Math.max(-8, Math.round((gen.loyal - 70) / 4)) : gen.loyal >= 85 ? 3 : 0);
  const NOBODY = { name: 'Tướng giữ thành', uy: 4, tai: 4, muu: 3, dung: 4, kien: 5, trait: '' };
  const genOf = (g, gid) => (gid && g.gens[gid]) || NOBODY;
  B.genOf = genOf;
  const sideGen = (g, b, side) => genOf(g, side === 'A' ? b.A.gen : b.D.gen);
  // an army (plus a garrison) as 2–7 wings
  const wingsOf = (units, side, walled) => {
    const w = [], row = side === 'A' ? 1 : 4, back = side === 'A' ? 0 : 5;
    const add = (arm, men, lane, r) => { if (men >= 100) w.push({ id: side + w.length, side, arm, men: Math.round(men), start: Math.round(men), morale: 70, lane, row: r, flank: false, gone: false }); };
    const bo = units.bo || 0, ky = units.ky || 0, cung = units.cung || 0, thuy = units.thuy || 0;
    if (walled && bo >= 900 && bo <= 2400) { add('bo', bo * 0.4, 1, row); add('bo', bo * 0.3, 0, row); add('bo', bo * 0.3, 2, row); } // a garrison mans all three walls
    else if (bo > 2400) { add('bo', bo * 0.5, 1, row); add('bo', bo * 0.25, 0, row); add('bo', bo * 0.25, 2, row); } else if (bo > 1200) { add('bo', bo * 0.6, 1, row); add('bo', bo * 0.4, 0, row); } else add('bo', bo, 1, row);
    if (ky > 2000) { add('ky', ky * 0.55, 0, row); add('ky', ky * 0.45, 2, row); } else add('ky', ky, 2, row);
    add('cung', cung, 1, back);
    add('thuy', thuy, 1, back);
    return w;
  };
  // the page may give the lanes from the map's own ground: (site, fromPlace) → three of open|ford|wood|hill
  let laneProvider = null;
  R.setLaneProvider = (fn) => { laneProvider = fn; };
  B.lanesFor = (plan) => (laneProvider && laneProvider(plan.site, plan.from)) || SITE[plan.site] || ['open', 'open', 'wood'];
  B.create = function (g, plan, me) {
    const lanes = B.lanesFor(plan);
    const b = {
      site: plan.site, siege: !!plan.siege, walls: plan.defender.walls || 0, lanes, turn: 1, maxTurn: 5, over: null, log: [], fired: { A: false, D: false }, wind: true, me: me || null,
      A: { fid: plan.attacker.fid, gen: plan.attacker.gen }, D: { fid: plan.defender.fid, gen: plan.defender.gen, holding: !!plan.defender.holding },
      wings: wingsOf(plan.attacker.units, 'A').concat(wingsOf(plan.defender.units, 'D', !!plan.siege)), rs: (g.rs ^ 0x9e3779b9) >>> 0,
    };
    // the day itself: wind for fire (60 %) and each side's fortune (±15 %), unknown to any forecast
    b.wind = brnd(b) < 0.6; b.luck = { A: 0.85 + 0.3 * brnd(b), D: 0.85 + 0.3 * brnd(b) };
    for (const w of b.wings) { const gen = sideGen(g, b, w.side); w.morale = Math.min(100, 55 + gen.uy * 3 + R.loyalMorale(gen) + (gen.trait === 'Xuất thân bần nông' && (w.arm === 'bo' || w.arm === 'cung') ? 7 : 0)); }
    return b;
  };
  const brnd = (b) => { b.rs = (b.rs + 0x6d2b79f5) >>> 0; let t = b.rs; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const live = (b, side) => b.wings.filter((w) => !w.gone && (!side || w.side === side));
  B.live = live;
  const ahead = (w) => (w.side === 'A' ? 1 : -1);
  const DMG = 260, SHOCK = 150; // men lost per point of strength per turn; morale lost per share of the wing lost
  const onWalls = (b, w) => b.siege && w.side === 'D' && w.row >= 4;
  B.onWalls = onWalls;
  // one wing striking another: the number and its reasons (the forecast and the result explain with the same list)
  B.power = function (g, b, w, foe, mode) {
    const gen = sideGen(g, b, w.side), lane = b.lanes[w.lane], mods = [];
    let p = (w.men / 1000) * (mode === 'shoot' ? BASE[w.arm].shoot || 0.15 : BASE[w.arm].atk);
    const m = (k, why) => { p *= k; mods.push([why, Math.round((k - 1) * 100)]); };
    m(1 + (gen.dung - 5) * 0.03, 'Dũng ' + gen.dung + ' (' + gen.name + ')');
    const wall = foe && onWalls(b, foe);
    if (mode !== 'shoot') {
      if (w.arm === 'ky' && lane === 'open' && !wall) m(1.3, 'kỵ trên đồng trống');
      if (w.arm === 'ky' && lane === 'wood') m(0.7, 'kỵ trong rừng');
      if (w.arm === 'ky' && lane === 'hill') m(0.85, 'kỵ lên dốc');
      if (w.arm === 'ky' && w.charge && !wall) m(gen.trait === 'Uy chấn Tiêu Dao' ? 1.75 : 1.4, gen.trait === 'Uy chấn Tiêu Dao' ? 'xung phong, Uy chấn Tiêu Dao' : 'xung phong');
      if (w.flank) m(1.5, 'đánh vào sườn');
      if (w.arm === 'bo' && w.hold && foe && foe.arm === 'ky') m(1.5, 'giáo dài chặn kỵ');
      if (lane === 'ford' && w.arm !== 'thuy' && !onWalls(b, w)) m(0.8, 'lội bến sông');
      if (wall) m(w.arm === 'ky' ? 0.35 : 0.75, w.arm === 'ky' ? 'kỵ đánh tường thành' : 'leo tường');
    }
    if (w.arm === 'thuy' && (lane === 'ford' || gen.trait === 'Thủy chiến')) m((lane === 'ford' ? 1.15 : 1) * (gen.trait === 'Thủy chiến' ? 1.2 : 1), gen.trait === 'Thủy chiến' ? 'thủy chiến (' + gen.name + ')' : 'thuyền ở bến sông');
    m(0.6 + w.morale / 250, 'sĩ khí ' + Math.round(w.morale));
    if (b.luck) p *= b.luck[w.side];
    return { p, mods };
  };
  B.guard = function (g, b, w, foe) {
    const gen = sideGen(g, b, w.side), mods = []; let k = BASE[w.arm].def;
    const m = (x, why) => { k *= x; mods.push([why, Math.round((x - 1) * 100)]); };
    m(1 + (gen.kien - 5) * 0.03, 'Kiên ' + gen.kien + ' (' + gen.name + ')');
    if (w.hold) m(1.25, 'giữ trận');
    if (b.lanes[w.lane] === 'hill' && w.side === 'D') m(1.25, 'giữ đồi');
    if (onWalls(b, w)) { const lv = b.walls + (gen.trait === 'Giữ thành' ? 1 : 0); if (lv) m(1 + 0.2 * lv, 'tường thành, lũy ' + lv + (gen.trait === 'Giữ thành' ? ' (Giữ thành)' : '')); }
    if (w.side === 'D' && b.D.holding && !b.siege) m(1.15, 'dàn trận chờ sẵn');
    return { k, mods };
  };
  // orders a side would give on its own (the AI; also the default the forecast plays for the player)
  B.autoOrders = function (g, b, side) {
    const foes = live(b, side === 'A' ? 'D' : 'A');
    for (const w of live(b, side)) {
      const near = foes.filter((f) => f.lane === w.lane).sort((x, y) => Math.abs(x.row - w.row) - Math.abs(y.row - w.row))[0];
      const gap = near ? Math.abs(near.row - w.row) : 9;
      if (w.arm === 'cung') w.order = foes.some((f) => Math.abs(f.row - w.row) <= 2 && Math.abs(f.lane - w.lane) <= 1) ? 'ban' : side === 'D' ? 'giu' : 'tien';
      else if (w.arm === 'ky') w.order = side === 'D' && b.siege ? 'giu' : b.lanes[w.lane] === 'wood' && !w.flank ? 'suon' : gap >= 2 && gap <= 3 ? 'xung' : 'tien';
      else if (side === 'D' && (b.siege || w.arm === 'bo')) w.order = b.turn >= 4 && gap > 2 && !b.siege ? 'tien' : 'giu';
      else w.order = 'tien';
      if (w.morale < 25) w.order = 'rut';
    }
    if (!b.fired[side] && sideGen(g, b, side).muu >= 7 && b.wind && foes.some((f) => b.lanes[f.lane] === 'wood' || f.arm === 'thuy')) { const w = live(b, side).find((x) => x.arm !== 'ky') || live(b, side)[0]; if (w) w.order = 'hoa'; }
  };
  // resolve one turn: moves, fire, arrows, melee, rout
  B.resolve = function (g, b0) {
    const b = clone(b0), ev = [], me = b.me || 'A', who = (side) => (side === me ? 'Ta' : 'Địch');
    const gname = (side) => sideGen(g, b, side).name;
    for (const w of live(b)) { w.hold = w.order === 'giu'; w.charge = false; w.hit = 0; w.moved = false; w.shot = null; w.burnt = false; w.fought = false; w.breach = false; }
    // 1. moves (attacker first, so a defender that holds is met where it stands)
    for (const w of live(b).sort((x, y) => (x.side === 'A' ? 0 : 1) - (y.side === 'A' ? 0 : 1))) {
      if (w.order === 'tien' || w.order === 'xung') {
        const steps = w.order === 'xung' ? 2 : 1;
        for (let s = 0; s < steps; s++) {
          const nr = w.row + ahead(w); if (nr < 0 || nr > 5) break;
          if (live(b).some((f) => f.side !== w.side && f.lane === w.lane && (f.row === nr || f.row === w.row))) break;
          w.row = nr; w.moved = true;
        }
        if (w.order === 'xung' && w.moved) w.charge = true;
      } else if (w.order === 'suon') {
        const count = (l) => live(b).filter((f) => f.side !== w.side && f.lane === l).length;
        w.lane = w.lane === 1 ? (count(0) <= count(2) ? 0 : 2) : 1; w.flank = true; w.moved = true;
      } else if (w.order === 'rut') {
        w.row -= ahead(w); w.morale = Math.min(100, w.morale + 6); w.moved = true;
        if (w.row < 0 || w.row > 5) { w.gone = true; w.left = true; ev.push({ side: w.side, t: who(w.side) + ': cánh ' + ARMS[w.arm] + ' rời trận.' }); }
      }
    }
    // 2. fire (once per side per battle)
    for (const w of live(b)) {
      if (w.order !== 'hoa') continue;
      const side = w.side, gen = sideGen(g, b, side);
      if (b.fired[side] || gen.muu < 7 || !b.wind) { w.hold = true; ev.push({ side, t: gname(side) + ' không đủ mưu để hỏa công.' }); continue; }
      b.fired[side] = true;
      const tgt = live(b).filter((f) => f.side !== side && (b.lanes[f.lane] === 'wood' || f.arm === 'thuy')).sort((x, y) => y.men - x.men)[0];
      if (!tgt) { ev.push({ side, t: gname(side) + ' phóng hỏa nhưng không cánh địch nào ở trong rừng hay trên thuyền.' }); continue; }
      const loss = Math.round(tgt.men * (0.2 + gen.muu * 0.015)); tgt.men -= loss; tgt.morale -= 25; tgt.hit += loss; tgt.burnt = true;
      ev.push({ side, big: true, t: gname(side) + ' hỏa công: cánh ' + ARMS[tgt.arm] + (tgt.side === me ? ' ta' : ' địch') + ' cháy, mất ' + fmt(loss) + '.' });
    }
    // 3. arrows
    const volley = {};
    for (const w of live(b)) {
      if (w.order !== 'ban' || w.arm !== 'cung') continue;
      const tgt = live(b).filter((f) => f.side !== w.side && Math.abs(f.row - w.row) <= 2 && Math.abs(f.lane - w.lane) <= 1).sort((x, y) => Math.abs(x.row - w.row) - Math.abs(y.row - w.row) || Math.abs(x.lane - w.lane) - Math.abs(y.lane - w.lane))[0];
      if (!tgt) continue;
      const pw = B.power(g, b, w, tgt, 'shoot').p, gd = B.guard(g, b, tgt, w).k, loss = Math.round(Math.min(tgt.men * 0.2, (pw / gd) * DMG * 0.8 * (0.85 + 0.3 * brnd(b))));
      tgt.morale -= (loss / Math.max(1, tgt.men)) * SHOCK * 0.7; tgt.men -= loss; tgt.hit += loss; w.shot = tgt.id; volley[w.side] = (volley[w.side] || 0) + loss;
    }
    for (const side of ['A', 'D']) if (volley[side]) ev.push({ side, t: 'Cung ' + (side === me ? 'ta' : 'địch') + ' bắn: ' + (side === me ? 'địch' : 'ta') + ' −' + fmt(volley[side]) + '.' });
    // 4. melee: facing wings in one lane, at most one row apart
    for (const a of live(b, 'A')) for (const d of live(b, 'D')) {
      if (a.lane !== d.lane || Math.abs(a.row - d.row) > 1 || a.men <= 0 || d.men <= 0) continue;
      const pa = B.power(g, b, a, d).p, pd = B.power(g, b, d, a).p, ga = B.guard(g, b, a, d).k, gd = B.guard(g, b, d, a).k;
      const la = Math.round(Math.min(a.men * 0.35, (pd / ga) * DMG * (0.7 + 0.6 * brnd(b)))), ld = Math.round(Math.min(d.men * 0.35, (pa / gd) * DMG * (0.7 + 0.6 * brnd(b))));
      a.morale -= (la / Math.max(1, a.men)) * SHOCK + (d.flank ? 12 : 0); d.morale -= (ld / Math.max(1, d.men)) * SHOCK + (a.flank ? 12 : 0);
      a.men -= la; d.men -= ld; a.hit += la; d.hit += ld; a.fought = true; d.fought = true;
      const lane = ['trái', 'giữa', 'phải'][a.lane], mine = me === 'D' ? d : a, theirs = mine === a ? d : a, lm = mine === a ? la : ld, lt = mine === a ? ld : la;
      ev.push({ side: lt >= lm ? me : me === 'A' ? 'D' : 'A', t: ARMS[mine.arm] + ' ta ' + (mine.charge ? 'xung phong vào ' : mine.flank ? 'đánh sườn ' : 'đánh ') + ARMS[theirs.arm].toLowerCase() + ' địch, làn ' + lane + ': ta −' + fmt(lm) + ', địch −' + fmt(lt) + '.' });
      a.flank = false; d.flank = false;
    }
    // 5. a wing standing in the enemy's back rows of a lane they left empty: over the wall, or behind their line
    for (const w of live(b)) {
      if (w.arm === 'cung' || w.arm === 'thuy') continue;
      const deep = w.side === 'A' ? w.row >= 4 : w.row <= 1, foe = w.side === 'A' ? 'D' : 'A';
      if (!deep || live(b, foe).some((f) => f.lane === w.lane) || live(b, w.side).some((x) => x !== w && x.breach && x.lane === w.lane)) continue;
      for (const f of live(b, foe)) f.morale -= 12;
      w.breach = true;
      ev.push({ side: w.side, big: true, t: who(w.side) + ': cánh ' + ARMS[w.arm] + (b.siege && w.side === 'A' ? ' leo lên tường làn ' : ' đánh vào hậu trận làn ') + ['trái', 'giữa', 'phải'][w.lane] + '. Cả trận ' + (foe === me ? 'ta' : 'địch') + ' mất sĩ khí.' });
    }
    // 6. rout
    for (const w of live(b)) {
      const gen = sideGen(g, b, w.side), stubborn = gen.trait === 'Mình đầy thương tích' && b.turn < 4;
      if (w.men < 80 || (w.morale < 18 && !stubborn)) { w.gone = true; w.routed = true; ev.push({ side: w.side, big: true, t: who(w.side) + ': cánh ' + ARMS[w.arm] + ' tan vỡ.' }); }
      w.morale = Math.max(0, Math.min(100, w.morale)); w.order = null;
    }
    b.log.push({ turn: b.turn, ev });
    const eff = (side) => live(b, side).reduce((s, w) => s + w.men * (0.5 + w.morale / 200) * (onWalls(b, w) ? 1 + 0.2 * b.walls : 1), 0);
    const sa = eff('A'), sd = eff('D');
    if (!live(b, 'A').length || !live(b, 'D').length || b.turn >= b.maxTurn) {
      // a siege is won by breaking the garrison or getting over a wall; at nightfall the walls still stand
      const over = b.siege && live(b, 'A').some((w) => w.breach && !w.gone);
      const win = !live(b, 'D').length || over ? 'A' : !live(b, 'A').length ? 'D' : b.siege ? 'D' : sa > sd * 1.2 ? 'A' : sd > sa * 1.2 ? 'D' : 'draw';
      b.over = { win, sa: Math.round(sa), sd: Math.round(sd) };
    } else b.turn += 1;
    return b;
  };
  B.lossOf = (b, side) => Math.round(b.wings.filter((w) => w.side === side).reduce((s, w) => s + (w.start - Math.max(0, w.routed ? w.men * 0.5 : w.men)), 0));
  B.simulate = function (g, b0) { let b = clone(b0); while (!b.over) { B.autoOrders(g, b, 'A'); B.autoOrders(g, b, 'D'); b = B.resolve(g, b); } return b; };

  // ------------------------------------------------------------------ who fights whom
  // attackers: one army id or several (a joint attack); target: { kind: 'town'|'army', id }
  R.battlePlan = function (g, attackers, target) {
    const as = ids(attackers).map((i) => g.armies[i]).filter(Boolean); if (!as.length) return null;
    const fid = as[0].fid, units = {};
    for (const a of as) for (const [k, v] of Object.entries(a.units)) units[k] = (units[k] || 0) + v;
    const lead = as.slice().sort((x, y) => genOf(g, y.gen).uy - genOf(g, x.gen).uy)[0];
    let site, siege = false, dUnits = {}, dGen = null, walls = 0, town = null, dfid, holding = false;
    const dArmies = [];
    if (target.kind === 'town') {
      const t = g.towns[target.id]; if (!hostileTo(g, fid, t.owner)) return null;
      site = target.id; town = target.id; dfid = t.owner; walls = t.walls; siege = t.walls > 0; dGen = t.gov; dUnits = clone(t.gar);
    } else {
      const e = g.armies[target.id]; if (!e) return null;
      site = e.at; dfid = e.fid; const t = g.towns[e.at];
      if (t.owner === e.fid && !e.besieging) { town = e.at; walls = t.walls; siege = t.walls > 0; dUnits = clone(t.gar); dGen = t.gov; }
    }
    // the defender's armies standing in that town fight too (or only the targeted army, in the field)
    for (const e of Object.values(g.armies)) {
      if (e.fid !== dfid || e.at !== site) continue;
      if (town ? e.besieging : e.id !== target.id) continue;
      if (town && e.order && e.order.type === 'attack' && e.order.id !== site) continue; // it marched out this season
      dArmies.push(e.id); for (const [k, v] of Object.entries(e.units)) dUnits[k] = (dUnits[k] || 0) + v; if (e.holding) holding = true;
      if (!dGen || genOf(g, e.gen).uy > genOf(g, dGen).uy) dGen = e.gen;
    }
    const plan = { site, siege, from: as[0].at !== site ? as[0].at : null, attacker: { fid, gen: lead.gen, units, armies: as.map((a) => a.id) }, defender: { fid: dfid, gen: dGen, units: dUnits, walls, town, armies: dArmies, holding } };
    if (fid === g.me && g.allies.sun_quan && g.armies.e2 && PLACES[site].river) { plan.attacker.units = Object.assign({}, units, { thuy: (units.thuy || 0) + 1200 }); plan.ally = 1200; }
    return plan;
  };

  // ------------------------------------------------------------------ the general's forecast (its accuracy is his Mưu)
  // the truth comes from 24 simulated battles; the analyst's error is one fixed offset in ±(42 − 3.5·Mưu) %
  R.forecast = function (g, attackers, target) {
    const as = ids(attackers).map((i) => g.armies[i]), plan = R.battlePlan(g, attackers, target);
    if (!plan) return null;
    const analyst = as.map((a) => a.gen).sort((x, y) => genOf(g, y).muu - genOf(g, x).muu)[0], gen = genOf(g, analyst);
    let wins = 0, la = 0, ld = 0;
    for (let k = 0; k < 24; k++) { const gg = clone(g); gg.rs = (g.rs + k * 7919) >>> 0; const b = B.simulate(gg, B.create(gg, plan)); if (b.over.win === 'A') wins++; la += B.lossOf(b, 'A'); ld += B.lossOf(b, 'D'); }
    const band = Math.max(0.06, 0.42 - 0.035 * gen.muu);
    let h = (gen.muu * 131 + g.season * 7919 + ids(attackers).join('').length * 17 + (target.id || '').charCodeAt(0) * 3 + g.seed) >>> 0;
    h = (h * 1103515245 + 12345) >>> 0; const e = ((h % 1000) / 1000) * 2 - 1; // −1…1, this analyst's bias on this question
    const trueWin = wins / 24, estWin = Math.max(0.02, Math.min(0.98, trueWin + e * band * 1.3));
    const label = estWin > 0.8 ? 'Thắng lớn' : estWin > 0.55 ? 'Thắng' : estWin > 0.42 ? 'Ngang ngửa' : estWin > 0.18 ? 'Thua' : 'Thua lớn';
    const est = { la: r100((la / 24) * (1 - e * band)), ld: r100((ld / 24) * (1 + e * band)) };
    // strength as the analyst reads it (Civ style: one number a side, and the reasons)
    const b0 = B.create(g, plan);
    let sa = 0, sd = 0;
    const reasons = [], seenR = {};
    for (const w of b0.wings) {
      const foe = b0.wings.find((f) => f.side !== w.side && f.lane === w.lane) || b0.wings.find((f) => f.side !== w.side);
      const P = B.power(g, b0, w, foe), G = B.guard(g, b0, w, foe), v = P.p * G.k * 1000;
      if (w.side === 'A') sa += v; else sd += v;
      for (const [why, pct] of P.mods.concat(G.mods)) {
        if (Math.abs(pct) < 10 || /^sĩ khí|^Dũng|^Kiên/.test(why)) continue;
        const key = w.side + why; if (seenR[key]) continue; seenR[key] = 1; reasons.push({ side: w.side, why, pct });
      }
    }
    reasons.sort((x, y) => Math.abs(y.pct) - Math.abs(x.pct));
    if (plan.ally) reasons.unshift({ side: 'A', why: 'thuyền Ngô trợ chiến +' + fmt(plan.ally), pct: 0 });
    return { analyst, gen: gen.name, muu: gen.muu, band: Math.round(band * 100), bias: e, estWin, trueWin, label, est, sa: r100(sa * (1 + e * band * 0.5)), sd: r100(sd * (1 - e * band * 0.5)), reasons: reasons.slice(0, 6), plan, lanes: b0.lanes.map((l) => B.LANE_TEXT[l]) };
  };

  // ------------------------------------------------------------------ end of season: AI, moves, battles, economy
  const defenders = (g, tid) => total(g.towns[tid].gar) + Object.values(g.armies).filter((a) => a.fid === g.towns[tid].owner && a.at === tid && !a.besieging).reduce((s, a) => s + total(a.units), 0);
  const offFor = (g, a, tid) => (a.arm === 'fleet' ? [1.5, -2.5] : Object.values(g.armies).some((x) => x.id !== a.id && x.at === tid && x.arm === 'land') ? [-3, -3] : [3, 2.5]);
  R.armyName = (g, a) => (a ? genOf(g, a.gen).name : 'đạo quân');
  R.endSeason = function (g0) {
    let g = clone(g0); g.log = []; g.battles = []; g.flash = null; g.moves = []; g.fought = [];
    for (const c of g.cards.slice()) g = R.answerCard(g, c.id, false); // unanswered cards take their "no"
    g.log = []; g.battles = []; g.moves = []; g.fought = [];
    const me = g.me;
    // Tào: the recall first (history), then Trương Liêu strikes a besieger or our weakest town in reach
    const e1 = g.armies.e1;
    if (e1 && g.season === 1 && rnd(g) < g.rumor) { g.moves.push({ id: 'e1', from: 'tho_xuan', leave: true }); delete g.armies.e1; g.recalled = true; log(g, 'Tào Tháo gọi Trương Liêu về cứu Phàn Thành. Kỵ binh Tào rời Thọ Xuân lên bắc.'); g.chronicle.push({ s: g.season, t: 'Trương Liêu rời Hoài Nam.' }); }
    else if (e1) {
      const bes = Object.values(g.armies).find((a) => a.fid === me && a.besieging === e1.at);
      const inReach = Object.keys(g.towns).filter((t) => g.towns[t].owner === me && dist(PLACES[t].xz, posOf(g, e1)) <= R.reachOf(e1) + 0.5);
      const weakest = inReach.sort((x, y) => defenders(g, x) - defenders(g, y))[0];
      if (bes) e1.order = { type: 'attack', kind: 'army', id: bes.id };
      else if (weakest && defenders(g, weakest) < total(e1.units) * 0.6) e1.order = { type: 'attack', kind: 'town', id: weakest };
    }
    // Ngô: allied, it takes Lịch Dương; otherwise 35 %; in winter 219 it sails west unless allied; angry, it retakes Lịch Dương
    const e2 = g.armies.e2, ld = g.towns.lich_duong;
    if (e2 && g.season === 2 && !g.allies.sun_quan) { g.moves.push({ id: 'e2', from: e2.at, leave: true }); delete g.armies.e2; log(g, 'Thuyền Chu Thái ngược sông về tây: Ngô đánh Kinh Châu.'); }
    else if (e2 && ld.owner === 'local' && (g.allies.sun_quan || rnd(g) < 0.35)) e2.order = { type: 'attack', kind: 'town', id: 'lich_duong' };
    else if (e2 && ld.owner === me && g.wuAngry) e2.order = { type: 'attack', kind: 'town', id: 'lich_duong' };
    // the vanguard promise
    const van = g.vanguard && g.armies[g.vanguard];
    if (van && !(van.order && /attack|siege/.test(van.order.type))) { g.gens.zhu_huan.loyal -= 15; log(g, '!Chu Hoàn giận vì không được đánh trước: Trung −15.'); }
    // our orders: joint attacks on one target are one battle; then moves, sieges, holds
    const groups = {};
    for (const a of Object.values(g.armies).filter((x) => x.fid === me && x.order)) {
      const o = a.order;
      if (o.type === 'attack') { const k = o.kind + ':' + o.id; (groups[k] = groups[k] || { target: o, ids: [] }).ids.push(a.id); }
      else if (o.type === 'move') { g.moves.push({ id: a.id, from: a.at, to: o.id }); a.at = o.id; a.besieging = null; a.off = offFor(g, a, o.id); log(g, R.armyName(g, a) + ' tới ' + PLACES[o.id].name + '.'); }
      else if (o.type === 'siege') { g.moves.push({ id: a.id, from: a.at, to: o.id }); a.at = o.id; a.besieging = o.id; a.off = a.arm === 'fleet' ? [2, -4] : [-5, 4]; log(g, R.armyName(g, a) + ' vây ' + PLACES[o.id].name + '.'); }
      else if (o.type === 'hold') a.holding = true;
    }
    for (const gr of Object.values(groups)) {
      const t = gr.target;
      if (t.kind === 'army' && !g.armies[t.id]) { log(g, gr.ids.map((i) => R.armyName(g, g.armies[i])).join(', ') + ': tới nơi thì địch đã đi.'); continue; }
      const plan = R.battlePlan(g, gr.ids, t);
      if (!plan) continue;
      for (const i of gr.ids) g.moves.push({ id: i, from: g.armies[i].at, to: plan.site, attack: true });
      g.battles.push(plan);
    }
    // the AI's attacks: on us, the player fights them; between others, resolved now
    for (const a of Object.values(g.armies)) {
      if (a.fid === me || !a.order || a.order.type !== 'attack') continue;
      const plan = R.battlePlan(g, a.id, a.order);
      if (!plan) continue;
      g.moves.push({ id: a.id, from: a.at, to: plan.site, attack: true });
      if (plan.defender.fid === me) g.battles.push(plan);
      else { const b = B.simulate(g, B.create(g, plan)); applyBattle(g, plan, b); }
    }
    return next(g);
  };
  function next(g) { if (g.battles.length) { g.pending = g.battles.shift(); return g; } g.pending = null; return finishSeason(g); }

  // a finished battle on the map: survivors back to armies and garrisons, towns change hands, captives, Uy
  function applyBattle(g, plan, b) {
    const me = g.me, winA = b.over.win === 'A', site = plan.site, tn = plan.defender.town;
    const left = (side) => { const u = {}; for (const w of b.wings) if (w.side === side) u[w.arm] = (u[w.arm] || 0) + Math.max(0, Math.round(w.routed ? w.men * 0.5 : w.men)); return u; };
    const A = left('A'), D = left('D');
    if (plan.ally) { const was = plan.attacker.units.thuy; A.thuy = Math.max(0, Math.round((A.thuy || 0) * (was - plan.ally) / Math.max(1, was))); }
    // share survivors back by each army's part of each arm
    const share = (armyIds, pool, before, extra) => {
      for (const k of Object.keys(before)) {
        const was = before[k] || 0; if (!was) continue; const keep = Math.min(1, (pool[k] || 0) / was);
        for (const i of armyIds) { const a = g.armies[i]; if (a && a.units[k]) a.units[k] = Math.round(a.units[k] * keep); }
        if (extra && extra[k]) extra[k] = Math.round(extra[k] * keep);
      }
    };
    const aBefore = {}; for (const i of plan.attacker.armies) { const a = g.armies[i]; if (a) for (const [k, v] of Object.entries(a.units)) aBefore[k] = (aBefore[k] || 0) + v; }
    share(plan.attacker.armies, A, aBefore);
    const town = tn ? g.towns[tn] : null;
    const dBefore = clone(town ? town.gar : {}); for (const i of plan.defender.armies) { const a = g.armies[i]; if (a) for (const [k, v] of Object.entries(a.units)) dBefore[k] = (dBefore[k] || 0) + v; }
    share(plan.defender.armies, D, dBefore, town ? town.gar : null);
    const nameA = FAC[plan.attacker.fid].short, nameD = FAC[plan.defender.fid].short, where = PLACES[site].name;
    const lossA = B.lossOf(b, 'A'), lossD = B.lossOf(b, 'D');
    if (winA) {
      if (town) {
        const gov = town.gov;
        town.owner = plan.attacker.fid; town.walls = Math.max(0, town.walls - 1); town.task = null; town.gov = null; town.taxFree = 0;
        town.gar = { bo: r100(total(A) * 0.2) };
        for (const i of plan.attacker.armies) { const a = g.armies[i]; if (!a) continue; for (const k of Object.keys(a.units)) a.units[k] = Math.round(a.units[k] * 0.8); a.at = tn; a.besieging = null; a.off = offFor(g, a, tn); }
        if (gov && plan.attacker.fid === me && GEN[gov]) g.captives.push(gov);
      }
      for (const i of plan.defender.armies) retreat(g, i, site, plan.attacker.fid === me);
    } else {
      for (const i of plan.attacker.armies) { const a = g.armies[i]; if (a && total(a.units) < 300) retreat(g, i, site, plan.defender.fid === me); }
    }
    for (const i of plan.attacker.armies.concat(plan.defender.armies)) { const a = g.armies[i]; if (a && total(a.units) < 200) retreat(g, i, site, false); }
    if (plan.attacker.fid === me) g.res.uy += winA ? 4 : -6;
    if (plan.defender.fid === me) g.res.uy += winA ? -8 : 5;
    const txt = (winA ? nameA + ' thắng ' + nameD + ' ở ' + where : nameA + ' không thắng được ' + nameD + ' ở ' + where) + '. Thương vong: ' + nameA + ' ' + fmt(lossA) + ', ' + nameD + ' ' + fmt(lossD) + '.';
    const bad = (plan.attacker.fid === me && !winA) || (plan.defender.fid === me && winA);
    log(g, (bad ? '!' : '') + txt);
    g.chronicle.push({ s: g.season, t: txt });
  }
  // a beaten army falls back to its side's nearest town, or breaks (its general captured if we broke it)
  function retreat(g, id, site, capture) {
    const a = g.armies[id]; if (!a) return;
    const home = Object.keys(g.towns).filter((t) => g.towns[t].owner === a.fid && t !== site).sort((x, y) => dist(PLACES[x].xz, PLACES[site].xz) - dist(PLACES[y].xz, PLACES[site].xz))[0];
    if (home && a.gen === 'zhu' && total(a.units) < 300) a.units = { bo: 300 }; // the emperor's guard gets him out
    if (home && total(a.units) >= 300) { g.moves.push({ id, from: site, to: home, retreat: true }); a.at = home; a.besieging = null; a.off = offFor(g, a, home); log(g, R.armyName(g, a) + ' rút về ' + PLACES[home].name + '.'); return; }
    if (home) { const t = g.towns[home]; for (const [k, v] of Object.entries(a.units)) t.gar[k] = (t.gar[k] || 0) + v; }
    delete g.armies[id];
    if (a.gen === 'zhu') { g.over = { win: false, why: 'Chu Nguyên Chương tử trận ở ' + PLACES[site].name + '.' }; return; }
    if (capture && GEN[a.gen]) g.captives.push(a.gen);
    log(g, (a.fid === g.me ? '!' : '') + 'Đạo quân ' + R.armyName(g, a) + ' tan' + (capture && GEN[a.gen] ? ', tướng bị bắt.' : '.'));
  }
  // the player finished (or auto-resolved) the pending battle
  R.settleBattle = function (g0, b) {
    const g = clone(g0), plan = g.pending;
    applyBattle(g, plan, b);
    g.fought.push({ site: plan.site, win: b.over.win, me: plan.attacker.fid === g.me ? 'A' : 'D', la: B.lossOf(b, 'A'), ld: B.lossOf(b, 'D') });
    return next(g);
  };
  function finishSeason(g) {
    const me = g.me;
    // sieges: the garrison starves, the walls are sapped, the town may open its gates
    for (const a of Object.values(g.armies)) {
      if (a.fid !== me || !a.besieging) continue;
      const tid = a.besieging, t = g.towns[tid];
      if (t.owner === me) { a.besieging = null; continue; }
      for (const k of Object.keys(t.gar)) t.gar[k] = Math.round(t.gar[k] * 0.8);
      t.walls = Math.max(0, t.walls - 1); t.dan = Math.round(t.dan * 0.92);
      if (defenders(g, tid) < total(a.units) * 0.3) {
        const gov = t.gov; t.owner = me; t.gar = { bo: r100(total(a.units) * 0.15) }; t.gov = null; a.besieging = null; g.res.uy += 3;
        if (gov && GEN[gov]) g.captives.push(gov);
        log(g, PLACES[tid].name + ' mở cổng hàng sau khi bị vây.'); g.chronicle.push({ s: g.season, t: PLACES[tid].name + ' hàng sau khi bị vây.' });
      } else log(g, PLACES[tid].name + ' bị vây: đồn còn ' + fmt(defenders(g, tid)) + ', lũy còn ' + t.walls + '.');
    }
    // town work
    for (const [tid, t] of Object.entries(g.towns)) {
      if (t.owner !== me) { t.task = null; if (t.owner === 'cao_cao') t.gar.bo = (t.gar.bo || 0) + 150; if (t.owner === 'local') t.gar.bo = (t.gar.bo || 0) + 50; continue; }
      if (!t.task) continue; t.task.fresh = false; t.task.left -= 1;
      if (t.task.left <= 0) {
        const T = TASKS[t.task.key];
        if (T.add) for (const [k, v] of Object.entries(T.add)) t.gar[k] = (t.gar[k] || 0) + v;
        if (T.dan) t.dan -= T.dan;
        if (t.task.key === 'luy') t.walls = Math.min(4, t.walls + 1);
        if (t.task.key === 'ruong') t.farm = true;
        if (t.task.key === 'cho') t.market = true;
        log(g, PLACES[tid].name + ': xong ' + T.name.toLowerCase() + '.'); t.task = null;
      } else log(g, PLACES[tid].name + ': ' + TASKS[t.task.key].name.toLowerCase() + ', còn ' + t.task.left + ' mùa.');
    }
    // income and upkeep
    let luong = 0, tien = 0, up = 0;
    for (const t of Object.values(g.towns)) if (t.owner === me) { const free = t.taxFree && g.season < t.taxFree; luong += free ? 0 : t.dan * 0.03 * (t.farm ? 1.25 : 1); tien += (free ? 0 : t.dan * 0.012) + (t.market ? 200 : 0); }
    for (const a of Object.values(g.armies)) if (a.fid === me) up += (a.units.bo || 0) * 0.1 + (a.units.cung || 0) * 0.1 + (a.units.ky || 0) * 0.2 + (a.units.thuy || 0) * 0.15;
    for (const t of Object.values(g.towns)) if (t.owner === me) up += total(t.gar) * 0.05;
    luong = Math.round(luong); tien = Math.round(tien); up = Math.round(up);
    g.res.luong += luong - up; g.res.tien += tien;
    g.income = { luong, tien, up };
    log(g, 'Thu ' + fmt(luong) + ' lương, ' + fmt(tien) + ' tiền. Nuôi quân ' + fmt(up) + ' lương.');
    // Chu Hoàn's loyalty
    const zh = g.gens.zhu_huan;
    if (zh.fid === me && zh.loyal < 30 && g.armies.a2) { const a = g.armies.a2; delete g.armies.a2; zh.fid = 'local'; log(g, '!Chu Hoàn bỏ đi, mang theo ' + fmt(total(a.units)) + ' quân thủy.'); g.chronicle.push({ s: g.season, t: 'Chu Hoàn bỏ ta.' }); }
    // floors: one season of warning, then the fall
    for (const k of ['luong', 'uy']) {
      const low = k === 'luong' ? g.res.luong < 0 : g.res.uy <= 0;
      if (low && g.warn[k]) g.over = g.over || { win: false, why: k === 'luong' ? 'Hai mùa liền hết lương: quân làm binh biến, trói ta nộp cho Tào.' : 'Uy về 0 hai mùa: dân Hoài Nam nổi dậy, ta mất ngôi.' };
      else if (low) {
        g.warn[k] = true;
        if (k === 'luong') { for (const a of Object.values(g.armies)) if (a.fid === me) for (const u of Object.keys(a.units)) a.units[u] = Math.round(a.units[u] * 0.9); log(g, '!Kho lương âm: quân đói, 10% bỏ trốn. Mùa sau còn âm là binh biến.'); }
        else log(g, '!Uy về 0: dân bất phục. Mùa sau còn 0 là nổi loạn.');
      } else g.warn[k] = false;
    }
    const own = Object.keys(g.towns).filter((t) => g.towns[t].owner === me);
    if (!g.over && own.length === 5) g.over = { win: true, why: 'Năm thành Hoài Nam về một mối.' };
    if (!g.over && !own.length) g.over = { win: false, why: 'Mất cả Hoài Nam.' };
    g.report = { season: cal(g.season), next: cal(g.season + 1), lines: g.log.slice(), fought: g.fought.slice(), income: g.income, towns: own.length };
    g.season += 1;
    for (const a of Object.values(g.armies)) { a.order = null; a.holding = false; }
    g.vanguard = null;
    g.cards = g.over ? [] : seasonCards(g);
    return g;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = R;
  if (typeof window !== 'undefined') window.HNRules = R;
})();
