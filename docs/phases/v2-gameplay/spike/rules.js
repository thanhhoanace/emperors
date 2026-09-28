// Spike v2 (vào là chơi): luật ván ngắn, thuần JS, không DOM. Dùng chung cho artboard và test headless.
// Không phải engine: luật thử để trả lời "có vui không", sẽ bỏ sau spike (AGENTS.md, luật phase 8).
var SPK = (function () {
  var PD = {"si_li":{"city":"Lạc Dương","nb":["ji","yu","jing","guan","bing"],"terrain":"plains","def":1.2,"fert":8,"river":true},"guan":{"city":"Trường An","nb":["si_li","bing","longxi","han_zhong"],"terrain":"hills","def":1.25,"fert":6,"river":true},"yu":{"city":"Hứa Xương","nb":["si_li","xu","yan","jing","yang","huai"],"terrain":"plains","def":1.05,"fert":9,"river":false},"ji":{"city":"Nghiệp Thành","nb":["si_li","qing","you","bing","yan"],"terrain":"plains","def":1.05,"fert":8,"river":true},"qing":{"city":"Lâm Truy","nb":["ji","xu"],"terrain":"coast","def":1,"fert":7,"river":false},"yan":{"city":"Xương Ấp","nb":["xu","yu","ji","huai"],"terrain":"plains","def":1,"fert":7,"river":true},"xu":{"city":"Bành Thành","nb":["qing","yu","yan","huai"],"terrain":"plains","def":1.05,"fert":8,"river":true},"jing":{"city":"Tương Dương","nb":["jing_nan","han_zhong","si_li","yu"],"terrain":"river","def":1.25,"fert":8,"river":true},"jing_nan":{"city":"Giang Lăng","nb":["jing","yi","jiang","jiao","yang"],"terrain":"river","def":1.2,"fert":8,"river":true},"yi":{"city":"Thành Đô","nb":["han_zhong","jing_nan","nanzhong"],"terrain":"mountains","def":1.45,"fert":9,"river":true},"han_zhong":{"city":"Nam Trịnh","nb":["guan","yi","jing"],"terrain":"mountains","def":1.35,"fert":6,"river":true},"yang":{"city":"Kiến Nghiệp","nb":["yu","jing_nan","jiang","jiao","huai"],"terrain":"river","def":1.25,"fert":8,"river":true},"jiang":{"city":"Hạ Khẩu","nb":["jing_nan","yang"],"terrain":"river","def":1.2,"fert":6,"river":true},"bing":{"city":"Tấn Dương","nb":["ji","guan","si_li","you","longxi"],"terrain":"hills","def":1.2,"fert":5,"river":false},"longxi":{"city":"Thiên Thủy","nb":["bing","guan","hexi"],"terrain":"hills","def":1.15,"fert":4,"river":true},"hexi":{"city":"Cô Tang","nb":["longxi"],"terrain":"desert","def":1.1,"fert":3,"river":true},"huai":{"city":"Chung Ly","nb":["xu","yan","yu","yang"],"terrain":"plains","def":1.05,"fert":7,"river":true},"you":{"city":"Kế Thành","nb":["ji","bing"],"terrain":"plains","def":1.05,"fert":4,"river":false},"nanzhong":{"city":"Điền Trì","nb":["yi"],"terrain":"jungle","def":1.2,"fert":5,"river":false},"jiao":{"city":"Phiên Ngung","nb":["jing_nan","yang"],"terrain":"jungle","def":1.15,"fert":6,"river":true}};
  var POS = { tien_ti: [430, 50], tay_vuc: [70, 140], you: [600, 120], bing: [380, 205], ji: [560, 240], qing: [760, 225], hexi: [115, 255], longxi: [195, 365], guan: [335, 395], si_li: [490, 355], yan: [665, 340], xu: [805, 385], khuong: [80, 490], han_zhong: [300, 500], yu: [595, 460], huai: [770, 505], jing: [460, 555], yi: [195, 625], jing_nan: [440, 675], jiang: [615, 600], yang: [790, 650], nanzhong: [185, 775], jiao: [560, 800], giao_chi: [360, 835] };
  var TERRAIN = { plains: 'đồng bằng', hills: 'đồi', mountains: 'núi', river: 'sông nước', coast: 'duyên hải', desert: 'sa mạc', jungle: 'rừng rậm' };
  var RIM = {
    tay_vuc: { name: 'Tây Vực', nb: ['hexi'], goods: 'ngựa Đại Uyển, ngọc, tơ' },
    khuong: { name: 'Tây Khương', nb: ['longxi', 'hexi', 'yi'], goods: 'ngựa, muối, lính Khương' },
    giao_chi: { name: 'Giao Chỉ', nb: ['jiao', 'nanzhong'], goods: 'lúa, ngà, thuyền' },
    tien_ti: { name: 'Tiên Ti', nb: ['bing', 'you'], goods: 'ngựa, kỵ du mục' },
  };
  var ORDER = ['qin_shihuang', 'li_shimin', 'zhu_yuanzhang', 'liu_che', 'cao_cao', 'liu_bei', 'sun_quan'];
  var FAC = {
    qin_shihuang: { name: 'Tần Thủy Hoàng', short: 'Tần', color: '#a8841a', emperor: true, seat: 'longxi', know: 'Pháp trị', knowText: 'Mộ binh được gấp đôi quân.' },
    li_shimin: { name: 'Lý Thế Dân', short: 'Đường', color: '#2f63c9', emperor: true, seat: 'bing', know: 'Chiêu hiền', knowText: 'Hiền tài tìm tới sớm và nhiều hơn; tướng bị bắt luôn quy hàng.' },
    zhu_yuanzhang: { name: 'Chu Nguyên Chương', short: 'Minh', color: '#a8262d', emperor: true, seat: 'huai', know: 'Cao trúc tường, quảng tích lương', knowText: 'Khai hoang xong ngay trong mùa; đắp lũy lên 2 bậc; mỗi châu thêm 1 lương mỗi mùa.' },
    liu_che: { name: 'Hán Vũ Đế', short: 'Hán Vũ', color: '#6f43bf', emperor: true, seat: 'hexi', know: 'Tơ lụa và thiên mã', knowText: 'Buôn với vùng rìa được gấp đôi; chiêu binh vùng rìa không tốn lương.' },
    cao_cao: { name: 'Tào Tháo', short: 'Tào', color: '#56702f', seat: 'yu' },
    liu_bei: { name: 'Lưu Bị', short: 'Thục', color: '#23884a', seat: 'yi' },
    sun_quan: { name: 'Tôn Quyền', short: 'Ngô', color: '#cf6a18', seat: 'yang' },
  };
  var NEUTRAL = { name: 'Trung lập', color: '#8a8275' };
  function G(name, vo, trait, loyal, leader) { return { name: name, vo: vo, trait: trait || null, loyal: loyal == null ? 80 : loyal, leader: leader || null }; }
  var START = {
    yu: ['cao_cao', 16, 3, 1, G('Tào Tháo', 4, 'Gian hùng', 100, 'cao_cao')],
    ji: ['cao_cao', 13, 3, 1, G('Tào Phi', 2, null, 95)],
    jing: ['cao_cao', 14, 2, 2, G('Tào Nhân', 4, 'Giữ thành', 95)],
    guan: ['cao_cao', 11, 2, 1, G('Trương Hợp', 4, 'Kỵ đột', 55)],
    si_li: ['cao_cao', 11, 2, 1, G('Hạ Hầu Đôn', 4, null, 95)],
    xu: ['cao_cao', 11, 2, 1, G('Trương Liêu', 5, 'Kỵ đột', 70)],
    qing: ['cao_cao', 8, 2, 0, G('Tang Bá', 3, null, 45)],
    yan: ['cao_cao', 9, 2, 0, G('Lý Điển', 3, null, 75)],
    yi: ['liu_bei', 14, 3, 1, G('Lưu Bị', 3, 'Nhân nghĩa', 100, 'liu_bei')],
    jing_nan: ['liu_bei', 14, 2, 1, G('Quan Vũ', 5, 'Uy chấn', 100)],
    han_zhong: ['liu_bei', 10, 2, 1, G('Ngụy Diên', 4, null, 50)],
    yang: ['sun_quan', 14, 3, 1, G('Tôn Quyền', 3, null, 100, 'sun_quan')],
    jiang: ['sun_quan', 11, 2, 1, G('Lã Mông', 4, 'Bạch y', 85)],
    longxi: ['qin_shihuang', 4, 1, 0, G('Tần Thủy Hoàng', 4, null, 100, 'qin_shihuang')],
    bing: ['li_shimin', 4, 1, 0, G('Lý Thế Dân', 5, 'Kỵ đột', 100, 'li_shimin')],
    hexi: ['liu_che', 4, 1, 0, G('Hán Vũ Đế', 3, null, 100, 'liu_che')],
    huai: ['zhu_yuanzhang', 4, 1, 0, G('Chu Nguyên Chương', 4, null, 100, 'zhu_yuanzhang')],
    you: ['neutral', 7, 1, 1, G('Công Tôn Khang', 3, null, 40)],
    nanzhong: ['neutral', 6, 1, 1, G('Ung Khải', 3, null, 35)],
    jiao: ['neutral', 7, 1, 1, G('Sĩ Nhiếp', 2, null, 45)],
  };
  var TALENTS = {
    qin_shihuang: [[3, G('Khương Duy', 4, 'Kỵ đột', 85)], [9, G('Mã Đại', 3, null, 80)]],
    li_shimin: [[2, G('Điền Dự', 4, 'Kỵ đột', 85)], [5, G('Khiên Chiêu', 3, 'Giữ thành', 80)], [8, G('Quách Hoài', 4, null, 80)]],
    zhu_yuanzhang: [[3, G('Đặng Ngải', 4, 'Giữ thành', 85)], [9, G('Hào kiệt Hoài Nam', 3, null, 75)]],
    liu_che: [[3, G('Diêm Hành', 3, null, 80)], [9, G('Kỵ tướng Nguyệt Chi', 4, 'Kỵ đột', 80)]],
  };
  var TRAIT_TEXT = { 'Gian hùng': 'thủ +10%; khó bị ly gián', 'Giữ thành': 'lũy tính gấp đôi khi thủ', 'Kỵ đột': 'đánh vào đồng bằng +25%', 'Nhân nghĩa': 'không thể bị ly gián', 'Uy chấn': 'thủ +25%; không thể bị ly gián', 'Bạch y': 'đánh châu sông nước +25%' };
  var MAX_TURN = 32, WIN_PROV = 6, TRUCE_TURN = 8;
  var SEASONS = ['Xuân', 'Hạ', 'Thu', 'Đông'];

  function rnd(g) { g.rs = (g.rs + 0x6d2b79f5) >>> 0; var t = g.rs; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function cal(turn) { var i = 2 + turn - 1; return SEASONS[i % 4] + ' ' + (219 + Math.floor(i / 4)); }
  function isRim(id) { return !!RIM[id]; }
  function nameOf(fid) { return fid === 'neutral' ? NEUTRAL.name : FAC[fid].name; }
  function colorOf(fid) { return fid === 'neutral' ? NEUTRAL.color : FAC[fid].color; }
  function own(g, fid) { return Object.keys(PD).filter(function (p) { return g.prov[p].owner === fid; }); }
  function adj(a, b) { return PD[a] && PD[a].nb.indexOf(b) !== -1; }
  function rimsOf(p) { return Object.keys(RIM).filter(function (r) { return RIM[r].nb.indexOf(p) !== -1; }); }
  function cap(g, p) { var f = g.prov[p].owner; return 6 + 6 * g.prov[p].tier + (f !== 'neutral' && FAC[f].seat === p ? 6 : 0); }
  function allied(g, a, b) { if (a === b || a === 'neutral' || b === 'neutral') return false; return g.pacts.some(function (x) { return x.until >= g.turn && ((x.a === a && x.b === b) || (x.a === b && x.b === a)); }); }
  function truceBlocks(g, att, def, target) {
    if (g.turn > TRUCE_TURN || def === 'neutral' || !FAC[def].emperor) return false;
    if ((g.fac[def].broke || {})[att]) return false;
    return g.prov[target].gov && g.prov[target].gov.leader === def; // thủ phủ (nơi hoàng đế đứng) được bảo hộ tới hết mùa 8
  }
  function income(g, f) {
    var s = 0; own(g, f).forEach(function (p) { s += 1 + g.prov[p].tier + (PD[p].fert >= 8 ? 1 : 0) + (FAC[f].seat === p ? 1 : 0) + (f === 'zhu_yuanzhang' ? 1 : 0); });
    Object.keys(g.fac[f].trade || {}).forEach(function () { s += f === 'liu_che' ? 4 : 2; });
    return s;
  }
  function troopsOf(g, f) { var s = 0; own(g, f).forEach(function (p) { s += g.prov[p].troops; }); if (g.fac[f].exile) s += g.fac[f].exile.troops; return s; }
  function upkeep(g, f) { return Math.ceil(troopsOf(g, f) / 10); }
  function score(g, f) { var s = 0; own(g, f).forEach(function (p) { s += 10 + 2 * g.prov[p].tier; }); return s + 3 * (g.fac[f].talentCount || 0); }

  function newGame(player, seed) {
    var g = { v: 1, seed: seed >>> 0, rs: seed >>> 0 || 1, turn: 1, player: player, prov: {}, fac: {}, pacts: [{ a: 'cao_cao', b: 'sun_quan', until: 6 }], rumorsNow: [], rumorsReady: [], chronicle: [], over: null };
    Object.keys(PD).forEach(function (p) { var s = START[p]; g.prov[p] = { owner: s[0], troops: s[1], tier: s[2], fort: s[3], gov: clone(s[4]), build: null, scout: {} }; });
    ORDER.forEach(function (f) { g.fac[f] = { alive: true, grain: FAC[f].emperor ? 6 : 12, trade: {}, rimCd: 0, reserve: [], broke: {}, talentCount: 0, exile: null, lastOrder: null }; });
    g.chronicle.push({ t: 1, s: 'Thu Kiến An 24. ' + FAC[player].name + ' tỉnh dậy ở ' + PD[FAC[player].seat].city + ' với ' + g.prov[FAC[player].seat].troops + ' nghìn quân.' });
    return g;
  }

  // ---------------------------------------------------------------- what a faction can see
  function sightSet(g, f) {
    var s = {};
    var mine = own(g, f);
    var add = function (list) { list.forEach(function (p) { s[p] = true; PD[p].nb.forEach(function (n) { s[n] = true; }); }); };
    add(mine);
    ORDER.forEach(function (o) { if (allied(g, f, o)) add(own(g, o)); }); // đồng minh chia sẻ tầm nhìn
    if (g.fac[f].exile) { s[g.fac[f].exile.near] = true; PD[g.fac[f].exile.near].nb.forEach(function (n) { s[n] = true; }); }
    return s;
  }
  var BANDS = [[6, 'Yếu', 1, 6], [12, 'Vừa', 6, 12], [20, 'Mạnh', 12, 20], [999, 'Rất mạnh', 20, 32]];
  function band(t) { for (var i = 0; i < BANDS.length; i++) if (t < BANDS[i][0]) return BANDS[i]; return BANDS[3]; }
  // intel of one province for faction f: { level: own|scout|seen|none, troopsText, lo, hi, gov }
  function intel(g, f, p) {
    var pv = g.prov[p];
    if (pv.owner === f) return { level: 'own', text: pv.troops + 'k', lo: pv.troops, hi: pv.troops, gov: pv.gov };
    if ((pv.scout[f] || 0) >= g.turn) return { level: 'scout', text: '~' + pv.troops + 'k', lo: pv.troops * 0.9, hi: pv.troops * 1.1, gov: pv.gov };
    if (sightSet(g, f)[p]) { var b = band(pv.troops); return { level: 'seen', text: b[1], lo: b[2], hi: b[3], gov: pv.gov }; }
    return { level: 'none', text: '?', lo: null, hi: null, gov: null };
  }

  // ---------------------------------------------------------------- combat
  function atkParts(g, f, gov, to, commit) {
    var P = PD[to], parts = [], m = 1;
    parts.push('Quân đem ' + commit + ' nghìn');
    var gm = 1 + 0.08 * (gov.vo - 3);
    if (gm !== 1) { m *= gm; parts.push(gov.name + ' cầm quân (võ ' + gov.vo + ') ' + (gm > 1 ? '+' : '') + Math.round((gm - 1) * 100) + '%'); }
    if (gov.trait === 'Kỵ đột' && P.terrain === 'plains') { m *= 1.25; parts.push('Kỵ đột trên đồng bằng +25%'); }
    if (gov.trait === 'Bạch y' && P.terrain === 'river') { m *= 1.25; parts.push('Bạch y độ giang +25%'); }
    if (P.terrain === 'river' && !(gov.trait === 'Bạch y') && ['sun_quan'].indexOf(f) === -1) { m *= 0.85; parts.push('Vượt sông không thuỷ quân −15%'); }
    return { power: commit * m, parts: parts };
  }
  function defParts(g, to, troops) {
    var P = PD[to], pv = g.prov[to], parts = [], m = P.def, owner = pv.owner, gov = pv.gov, reinf = 0;
    parts.push('Quân thủ ' + (troops == null ? '?' : troops + ' nghìn'));
    parts.push('Địa thế ' + TERRAIN[P.terrain] + ' ×' + P.def);
    var fort = pv.fort * (gov && gov.trait === 'Giữ thành' ? 2 : 1);
    if (fort) { m *= 1 + 0.2 * fort; parts.push('Lũy ' + pv.fort + (gov && gov.trait === 'Giữ thành' ? ' (Giữ thành ×2)' : '') + ' +' + 20 * fort + '%'); }
    if (gov) {
      var gm = 1 + 0.08 * (gov.vo - 3);
      if (gm !== 1) { m *= gm; parts.push(gov.name + ' giữ thành (võ ' + gov.vo + ') ' + (gm > 1 ? '+' : '') + Math.round((gm - 1) * 100) + '%'); }
      if (gov.trait === 'Uy chấn') { m *= 1.25; parts.push('Uy chấn +25%'); }
      if (gov.trait === 'Gian hùng') { m *= 1.1; parts.push('Gian hùng +10%'); }
    }
    if (owner !== 'neutral' && FAC[owner].seat === to) { m *= 1.2; parts.push('Thủ phủ +20%'); }
    var allies = [];
    if (owner !== 'neutral') ORDER.forEach(function (a) {
      if (!allied(g, owner, a)) return;
      var best = 0; PD[to].nb.forEach(function (n) { if (g.prov[n].owner === a) best = Math.max(best, g.prov[n].troops); });
      if (best) { var add = Math.round(best * 0.3); reinf += add; allies.push(a); parts.push('Viện binh ' + FAC[a].name + ' +' + add + ' nghìn'); }
    });
    return { mul: m, reinf: reinf, parts: parts, allies: allies };
  }
  function estimate(g, f, from, to, commit) {
    var gov = from === 'exile' ? leaderGov(g, f) : g.prov[from].gov;
    var I = intel(g, f, to), a = atkParts(g, f, gov, to, commit);
    if (I.level === 'none') return { label: 'Mù', tone: 'dark', text: 'Chưa có tin về châu này. Do thám trước, hoặc đánh liều.', atk: a };
    var d = defParts(g, to, I.level === 'seen' ? null : Math.round(g.prov[to].troops));
    if (I.level === 'seen') d.parts[0] = 'Quân thủ: ' + I.text + ' (' + I.lo + '–' + I.hi + ' nghìn, tin do biên giới)';
    var lo = I.lo * d.mul + d.reinf, hi = I.hi * d.mul + d.reinf;
    var rLo = a.power / hi, rHi = a.power / lo, mid = (rLo + rHi) / 2;
    var label = rLo > 1.15 ? 'Chắc thắng' : mid > 1.12 ? 'Có lợi' : mid > 0.9 ? 'Ngang' : 'Bất lợi';
    var tone = label === 'Chắc thắng' || label === 'Có lợi' ? 'good' : label === 'Ngang' ? 'even' : 'bad';
    return { label: label, tone: tone, text: 'Sức ta ≈ ' + a.power.toFixed(1) + ' · sức thủ ước ' + lo.toFixed(1) + '–' + hi.toFixed(1) + (I.level === 'scout' ? ' (do thám)' : ''), atk: a, def: d };
  }
  function leaderGov(g, f) {
    var found = null; own(g, f).forEach(function (p) { if (g.prov[p].gov && g.prov[p].gov.leader === f) found = g.prov[p].gov; });
    return found || G(FAC[f].name, 4, null, 100, f);
  }

  // ---------------------------------------------------------------- legality
  function canAttack(g, f, from, to) {
    if (isRim(to) || !PD[to]) return 'Vùng rìa không chiếm được.';
    var o = g.prov[to].owner;
    if (o === f) return 'Châu của ta.';
    if (from === 'exile') { var ex = g.fac[f].exile; if (!ex) return 'Không lưu vong.'; if (to !== ex.near && !adj(ex.near, to)) return 'Quân lưu vong chỉ đánh được châu quanh ' + PD[ex.near].city + '.'; }
    else { if (!from || g.prov[from].owner !== f) return 'Chọn châu xuất quân của ta.'; if (!adj(from, to)) return 'Chỉ đánh châu giáp ranh.'; }
    if (allied(g, f, o)) return 'Đang có minh ước với ' + nameOf(o) + '.';
    return null;
  }
  function sideOptions(g, f, p) {
    if (!p || g.prov[p].owner !== f) return [];
    var pv = g.prov[p], F = g.fac[f], out = [];
    var add = function (kind, label, hint, why) { out.push({ kind: kind, label: label, hint: hint, why: why || null }); };
    var rec = f === 'qin_shihuang' ? 6 : 3;
    add('recruit', 'Mộ binh', '+' + rec + ' nghìn quân · 3 lương', F.grain < 3 ? 'Thiếu lương.' : pv.troops >= cap(g, p) ? 'Châu đã đủ quân (tối đa ' + cap(g, p) + ' nghìn; khai hoang để nuôi thêm).' : null);
    add('cultivate', 'Khai hoang', pv.tier >= 3 ? 'đã tối đa' : 'bậc ' + pv.tier + ' → ' + (pv.tier + 1) + ' · 3 lương · ' + (f === 'zhu_yuanzhang' ? 'xong ngay' : 'xong sau 2 mùa'), pv.tier >= 3 ? 'Đã bậc 3.' : pv.build ? 'Đang khai hoang.' : F.grain < 3 ? 'Thiếu lương.' : null);
    add('fortify', 'Đắp lũy', 'lũy ' + pv.fort + ' → ' + Math.min(3, pv.fort + (f === 'zhu_yuanzhang' ? 2 : 1)) + ' · 2 lương', pv.fort >= 3 ? 'Lũy đã tối đa.' : F.grain < 2 ? 'Thiếu lương.' : null);
    add('move', 'Điều quân', 'đưa nửa quân sang châu kề của ta', own(g, f).some(function (q) { return adj(p, q); }) ? (pv.troops < 2 ? 'Quá ít quân.' : null) : 'Không có châu ta kề bên.');
    rimsOf(p).forEach(function (r) {
      add('trade:' + r, 'Buôn với ' + RIM[r].name, RIM[r].goods + ' · +' + (f === 'liu_che' ? 4 : 2) + ' lương mỗi mùa', F.trade[r] ? 'Đã mở đường buôn.' : null);
      add('rimrec:' + r, 'Chiêu binh ' + RIM[r].name, '+4 nghìn · ' + (f === 'liu_che' ? 'miễn lương' : '2 lương'), F.rimCd > 0 ? 'Chờ ' + F.rimCd + ' mùa.' : (f !== 'liu_che' && F.grain < 2) ? 'Thiếu lương.' : null);
    });
    return out;
  }

  // ---------------------------------------------------------------- AI (spike: đọc sự thật, chưa qua perception)
  function aiPlan(g, f) {
    var mine = own(g, f), F = g.fac[f], best = null;
    mine.forEach(function (p) {
      var t = g.prov[p].troops; if (t < 5) return;
      PD[p].nb.forEach(function (q) {
        var o = g.prov[q].owner; if (o === f || allied(g, f, o) || truceBlocks(g, f, o, q)) return;
        var commit = Math.floor(t * 0.7), a = atkParts(g, f, g.prov[p].gov, q, commit), d = defParts(g, q, g.prov[q].troops);
        var r = a.power / (g.prov[q].troops * d.mul + d.reinf);
        if (o === 'neutral') r *= 1.1;
        if (FAC[f].emperor && !FAC[o === 'neutral' ? f : o].emperor && g.turn <= TRUCE_TURN) r *= 0.8;
        if (r > 1.3 && (!best || r > best.r)) best = { p: p, q: q, commit: commit, r: r };
      });
    });
    var order = { type: 'internal' };
    if (best && rnd(g) < 0.7) order = { type: 'attack', from: best.p, to: best.q, commit: best.commit };
    else {
      var neutralAdj = []; mine.forEach(function (p) { PD[p].nb.forEach(function (q) { if (g.prov[q].owner === 'neutral' && neutralAdj.indexOf(q) === -1) neutralAdj.push(q); }); });
      var weakGov = []; mine.forEach(function (p) { PD[p].nb.forEach(function (q) { var o = g.prov[q].owner, gv = g.prov[q].gov; if (o !== f && o !== 'neutral' && !allied(g, f, o) && gv && !gv.leader && gv.loyal < 60 && ['Nhân nghĩa', 'Uy chấn'].indexOf(gv.trait) === -1) weakGov.push(q); }); });
      var x = rnd(g);
      if (neutralAdj.length && x < 0.35) order = { type: 'annex', target: neutralAdj[0] };
      else if (weakGov.length && x < 0.5) order = { type: 'discord', target: weakGov[0] };
    }
    // side: nuôi biên giới bị đe doạ nhất, rồi khai hoang
    var side = null, threat = null, tv = -1;
    mine.forEach(function (p) { var th = 0; PD[p].nb.forEach(function (q) { var o = g.prov[q].owner; if (o !== f && o !== 'neutral' && !allied(g, f, o)) th += g.prov[q].troops; }); th -= g.prov[p].troops; if (th > tv && g.prov[p].troops < cap(g, p)) { tv = th; threat = p; } });
    var rims = []; mine.forEach(function (p) { rimsOf(p).forEach(function (r) { if (!F.trade[r]) rims.push([p, r]); }); });
    if (rims.length && rnd(g) < 0.5) side = { kind: 'trade:' + rims[0][1], p: rims[0][0] };
    else if (threat && F.grain >= 3 && (tv > -4 || rnd(g) < 0.5)) side = { kind: 'recruit', p: threat };
    else { var c = mine.filter(function (p) { return g.prov[p].tier < 3 && !g.prov[p].build; })[0]; if (c && F.grain >= 3) side = { kind: 'cultivate', p: c }; else if (threat && F.grain >= 2 && g.prov[threat].fort < 3) side = { kind: 'fortify', p: threat }; }
    return { order: order, side: side };
  }

  // ---------------------------------------------------------------- one season
  function describeOrder(g, f, o) {
    if (!o) return null;
    if (o.type === 'attack') return nameOf(f) + ' xuất quân đánh ' + PD[o.to].city;
    if (o.type === 'annex') return nameOf(f) + ' sai sứ chiêu hàng ' + PD[o.target].city;
    if (o.type === 'discord') return nameOf(f) + ' tung người ly gián ở ' + PD[o.target].city;
    if (o.type === 'pact') return nameOf(f) + ' sai sứ tới ' + nameOf(o.target);
    if (o.type === 'scout') return nameOf(f) + ' cho thám tử dò ' + PD[o.target].city;
    return nameOf(f) + ' lo nội chính ở ' + PD[FAC[f].seat].city;
  }

  function resolve(g0, playerOrder, playerSide) {
    var g = clone(g0), me = g.player, rep = { turn: g.turn, cal: cal(g.turn), battles: [], events: [], news: [], rumors: g.rumorsReady.slice() };
    var owners0 = {}; Object.keys(PD).forEach(function (p) { owners0[p] = g.prov[p].owner; });
    var plans = {};
    ORDER.forEach(function (f) { if (!g.fac[f].alive) return; plans[f] = f === me ? { order: playerOrder || { type: 'internal' }, side: playerSide || null } : aiPlan(g, f); g.fac[f].lastOrder = plans[f].order; });
    var news = function (s) { rep.news.push({ t: s }); };
    var mine = function (s) { rep.events.push({ t: s }); };
    var chron = function (s) { g.chronicle.push({ t: g.turn, s: s }); };

    // 1. việc phụ
    ORDER.forEach(function (f) {
      var P = plans[f]; if (!P || !P.side || !P.side.p) return; var s = P.side, pv = g.prov[s.p], F = g.fac[f];
      if (pv.owner !== f) return;
      var opt = sideOptions(g, f, s.p).filter(function (o) { return o.kind === s.kind; })[0]; if (!opt || opt.why) return;
      var city = PD[s.p].city;
      if (s.kind === 'recruit') { var add = f === 'qin_shihuang' ? 6 : 3; F.grain -= 3; pv.troops = Math.min(cap(g, s.p), pv.troops + add); if (f === me) mine('Mộ binh ở ' + city + ': quân lên ' + pv.troops + ' nghìn.'); }
      else if (s.kind === 'cultivate') { F.grain -= 3; if (f === 'zhu_yuanzhang') { pv.tier += 1; if (f === me) mine('Khai hoang ' + city + ' xong ngay: bậc ' + pv.tier + '.'); } else { pv.build = { left: 2 }; if (f === me) mine('Bắt đầu khai hoang ' + city + ' (xong sau 2 mùa).'); } }
      else if (s.kind === 'fortify') { F.grain -= 2; pv.fort = Math.min(3, pv.fort + (f === 'zhu_yuanzhang' ? 2 : 1)); if (f === me) mine('Đắp lũy ' + city + ': lũy ' + pv.fort + '.'); }
      else if (s.kind === 'move' && s.q && g.prov[s.q].owner === f && adj(s.p, s.q)) { var n = Math.floor(pv.troops / 2); pv.troops -= n; g.prov[s.q].troops += n; if (f === me) mine('Điều ' + n + ' nghìn quân từ ' + city + ' sang ' + PD[s.q].city + '.'); }
      else if (s.kind.indexOf('trade:') === 0) { var r = s.kind.slice(6); F.trade[r] = true; if (f === me) { mine('Mở đường buôn với ' + RIM[r].name + ' (' + RIM[r].goods + ').'); chron('Mở đường buôn với ' + RIM[r].name + '.'); } }
      else if (s.kind.indexOf('rimrec:') === 0) { var r2 = s.kind.slice(7); if (f !== 'liu_che') F.grain -= 2; F.rimCd = 3; pv.troops += 4; if (f === me) mine('Chiêu 4 nghìn quân ' + RIM[r2].name + ' về ' + city + '.'); }
    });

    // 2. ngoại giao, mưu
    ORDER.forEach(function (f) {
      var P = plans[f]; if (!P) return; var o = P.order, F = g.fac[f];
      if (o.type === 'internal') { F.grain += 4; own(g, f).forEach(function (p) { g.prov[p].troops = Math.min(Math.max(cap(g, p), g.prov[p].troops), g.prov[p].troops + 1); }); if (f === me) mine('Nội chính: +4 lương, mỗi châu +1 nghìn quân.'); }
      else if (o.type === 'annex') {
        var pv = g.prov[o.target]; if (!pv || pv.owner !== 'neutral') return;
        var near = own(g, f).some(function (p) { return adj(p, o.target); }); if (!near) return;
        var ch = 0.35 + (f === 'li_shimin' && o.target === 'you' ? 0.3 : 0) + (own(g, f).length < 3 ? 0.1 : 0);
        if (rnd(g) < ch) { pv.owner = f; pv.troops = Math.max(2, Math.round(pv.troops * 0.6)); pv.gov.loyal = 60; news(PD[o.target].city + ' quy thuận ' + nameOf(f) + '.'); if (f === me) chron(pv.gov.name + ' dâng ' + PD[o.target].city + ' xin quy thuận.'); }
        else if (f === me) mine(PD[o.target].city + ' đóng cổng, từ chối sứ giả.');
      } else if (o.type === 'pact' && f === me) {
        var t = o.target; if (!g.fac[t] || !g.fac[t].alive || allied(g, f, t)) return;
        var ch2 = 0.45 + (troopsOf(g, t) > troopsOf(g, f) * 2 ? -0.1 : 0.1) + ((g.fac[f].broke || {})[t] ? -0.3 : 0);
        if (rnd(g) < ch2) { g.pacts.push({ a: f, b: t, until: g.turn + 6 }); news(nameOf(f) + ' và ' + nameOf(t) + ' kết minh phòng thủ tới mùa ' + (g.turn + 6) + '.'); chron('Kết minh với ' + nameOf(t) + '.'); }
        else mine(nameOf(t) + ' từ chối minh ước.');
      } else if (o.type === 'scout') {
        g.prov[o.target].scout[f] = g.turn + 3;
        if (f === me) { var q = g.prov[o.target]; mine('Thám tử báo ' + PD[o.target].city + ': ' + q.troops + ' nghìn quân, ' + (q.gov ? q.gov.name + ' (võ ' + q.gov.vo + ', trung ' + q.gov.loyal + ')' : 'không tướng') + ', lũy ' + q.fort + '. Tin giữ 3 mùa.'); }
      } else if (o.type === 'discord') {
        var tv = g.prov[o.target]; if (!tv || tv.owner === f || !tv.gov) return;
        if (tv.gov.leader || ['Nhân nghĩa', 'Uy chấn'].indexOf(tv.gov.trait) !== -1) { if (f === me) mine(tv.gov.name + ' không lay chuyển.'); return; }
        var ok = rnd(g) < (tv.gov.trait === 'Gian hùng' ? 0.35 : 0.65);
        if (ok) { tv.gov.loyal -= 30; tv.discordBy = f; if (f === me) mine('Ly gián ' + tv.gov.name + ' thành: lòng trung còn ' + tv.gov.loyal + '.'); if (tv.owner === me) mine('Có kẻ gieo nghi ngờ trong lòng ' + tv.gov.name + ' ở ' + PD[o.target].city + '.'); }
        else if (f === me) mine('Người ly gián ở ' + PD[o.target].city + ' bị bắt.');
      }
    });

    // 3. tấn công: đạo quân lớn trước
    var atks = [];
    ORDER.forEach(function (f) { var P = plans[f]; if (P && P.order.type === 'attack') atks.push({ f: f, o: P.order }); });
    atks.sort(function (x, y) { return (y.o.commit || 0) - (x.o.commit || 0); });
    atks.forEach(function (A) {
      var f = A.f, o = A.o, F = g.fac[f]; if (!F.alive) return;
      var ex = o.from === 'exile';
      if (canAttack(g, f, o.from, o.to)) return;
      var defOwner = g.prov[o.to].owner;
      if (defOwner !== 'neutral' && truceBlocks(g, f, defOwner, o.to)) { if (f === me) mine('Quân dừng trước ' + PD[o.to].city + ': thủ phủ khách còn được bảo hộ.'); return; }
      var avail = ex ? F.exile.troops : g.prov[o.from].troops;
      var commit = Math.max(1, Math.min(avail - (ex ? 0 : 1), o.commit || Math.floor(avail * 0.7)));
      if (commit < 1) return;
      if (FAC[f].emperor && defOwner !== 'neutral' && !FAC[defOwner].emperor) F.broke[defOwner] = true;
      if (defOwner !== 'neutral' && FAC[defOwner].emperor && !FAC[f].emperor) {} // Tam Quốc đánh đế: không đổi gì
      var gov = ex ? leaderGov(g, f) : g.prov[o.from].gov;
      var a = atkParts(g, f, gov, o.to, commit), pv = g.prov[o.to], d = defParts(g, o.to, pv.troops);
      var ra = 0.85 + 0.3 * rnd(g), rd = 0.85 + 0.3 * rnd(g);
      var ap = a.power * ra, dp = pv.troops * d.mul * rd + d.reinf;
      var win = ap > dp, city = PD[o.to].city;
      if (ex) F.exile.troops -= commit; else g.prov[o.from].troops -= commit;
      var loss, reasons = a.parts.concat(d.parts, ['May rủi: công ×' + ra.toFixed(2) + ', thủ ×' + rd.toFixed(2), 'Sức công ' + ap.toFixed(1) + ' so sức thủ ' + dp.toFixed(1)]);
      var fateLine = null;
      if (win) {
        loss = Math.max(1, Math.round(commit * Math.min(0.45, 0.15 + 0.3 * dp / ap)));
        var left = commit - loss + Math.round(pv.troops * 0.2);
        var oldGov = pv.gov, oldOwner = pv.owner;
        pv.owner = f; pv.troops = Math.max(1, left); pv.fort = Math.max(0, pv.fort - 1); pv.build = null;
        // số phận tướng thủ
        if (oldGov) {
          if (oldGov.leader) {
            var rest = own(g, oldOwner);
            if (rest.length) { var to2 = rest.sort(function (x, y) { return g.prov[y].troops - g.prov[x].troops; })[0]; if (g.prov[to2].gov) g.fac[oldOwner].reserve.push(g.prov[to2].gov); g.prov[to2].gov = oldGov; fateLine = oldGov.name + ' chạy về ' + PD[to2].city + '.'; }
          } else {
            var joins = f === 'li_shimin' || oldGov.loyal < 60;
            if (joins) { oldGov.loyal = 55; oldGov.leader = null; g.fac[f].reserve.push(oldGov); fateLine = oldGov.name + ' bị bắt và quy hàng ' + nameOf(f) + '.'; }
            else fateLine = oldGov.name + ' tử trận.';
          }
        }
        pv.gov = g.fac[f].reserve.shift() || (ex ? leaderGov(g, f) : G('Tướng vô danh', 2, null, 70));
        if (ex) { pv.gov = G(FAC[f].name, 4, null, 100, f); F.exile = null; }
        if (oldOwner !== 'neutral' && !own(g, oldOwner).length) fall(g, oldOwner, f, rep, chron, news);
      } else {
        loss = Math.max(1, Math.round(commit * Math.min(0.6, 0.25 + 0.25 * ap / Math.max(1, dp))));
        var back = commit - loss;
        if (ex) F.exile.troops += back; else g.prov[o.from].troops += back;
        pv.troops = Math.max(1, pv.troops - Math.round(pv.troops * 0.15 * ap / Math.max(1, dp)));
      }
      var title = nameOf(f) + ' đánh ' + city + (ex ? ' (quân lưu vong)' : ' từ ' + PD[o.from].city);
      if (f === me || defOwner === me) {
        var good = (f === me) === win;
        rep.battles.push({ title: title, result: f === me ? (win ? 'Thắng — ' + city + ' về tay ta.' : 'Bại, rút quân.') : (win ? 'Thất thủ — mất ' + city + '.' : 'Giữ vững ' + city + '.'), good: good, loss: (f === me ? 'Ta mất ' + loss + ' nghìn quân.' : ''), fate: fateLine, reasons: f === me ? reasons : [nameOf(f) + ' đánh vào', 'Quân thủ ' + (pv.troops) + ' nghìn còn lại'].concat(d.parts.slice(1)) });
        if (f === me && win) chron('Chiếm ' + city + (fateLine ? '. ' + fateLine : '.'));
        if (defOwner === me && win) chron('Mất ' + city + ' vào tay ' + nameOf(f) + '.');
      } else if (win) news(city + ' về tay ' + nameOf(f) + (fateLine ? '. ' + fateLine : '.'));
    });

    // 4. cuối mùa: công trình, phản tướng, thu chi, tài năng, lưu vong
    Object.keys(PD).forEach(function (p) { var pv = g.prov[p]; if (pv.build) { pv.build.left -= 1; if (pv.build.left <= 0) { pv.tier = Math.min(3, pv.tier + 1); pv.build = null; if (pv.owner === me) mine('Khai hoang ' + PD[p].city + ' xong: bậc ' + pv.tier + '.'); } } });
    Object.keys(PD).forEach(function (p) {
      var pv = g.prov[p], by = pv.discordBy; delete pv.discordBy;
      if (!pv.gov || pv.gov.leader || pv.owner === 'neutral' && !by) return;
      if (pv.gov.loyal < 30 && by && own(g, by).some(function (q) { return adj(q, p); }) && pv.owner !== by) {
        var old = pv.owner; pv.owner = by; pv.gov.loyal = 60; pv.troops = Math.max(1, Math.round(pv.troops * 0.7));
        var line = pv.gov.name + ' phản ' + nameOf(old) + ', dâng ' + PD[p].city + ' cho ' + nameOf(by) + '.';
        news(line); if (by === me || old === me) chron(line);
        if (old !== 'neutral' && !own(g, old).length) fall(g, old, by, rep, chron, news);
      }
    });
    ORDER.forEach(function (f) {
      var F = g.fac[f]; if (!F.alive) return;
      F.grain += income(g, f) - upkeep(g, f);
      if (F.rimCd > 0) F.rimCd -= 1;
      if (F.grain < 0) { F.grain = 0; own(g, f).forEach(function (p) { g.prov[p].troops = Math.max(1, Math.round(g.prov[p].troops * 0.9)); }); if (f === me) mine('Kho lương cạn: quân đói bỏ trốn một phần.'); }
      (TALENTS[f] || []).forEach(function (tl) {
        if (tl[0] !== g.turn || !own(g, f).length) return;
        var gv = clone(tl[1]); F.talentCount += 1;
        var slot = own(g, f).filter(function (p) { return g.prov[p].gov && g.prov[p].gov.name === 'Tướng vô danh'; })[0];
        if (slot) g.prov[slot].gov = gv; else F.reserve.push(gv);
        if (f === me) { mine('Hiền tài tới cửa: ' + gv.name + ' (võ ' + gv.vo + (gv.trait ? ', ' + gv.trait : '') + ') xin theo' + (slot ? ', trấn ' + PD[slot].city : ', chờ châu mới') + '.'); chron(gv.name + ' tới đầu quân.'); }
      });
      if (F.exile) { F.exile.left -= 1; if (F.exile.left <= 0) { F.alive = false; F.exile = null; news(nameOf(f) + ' lưu vong không thành, tan rã.'); chron('Quân lưu vong tan rã. Ván kết thúc.'); } }
    });
    g.pacts = g.pacts.filter(function (x) { return x.until > g.turn && g.fac[x.a].alive && g.fac[x.b].alive; });

    // 5. tin: đổi chủ công khai; tin đồn mùa này tới người chơi mùa sau
    var sight = sightSet(g, me), rumors = [];
    ORDER.forEach(function (f) {
      if (f === me || !g.fac[f].alive) return; var o = plans[f] && plans[f].order; if (!o) return;
      var visible = own(g, f).some(function (p) { return sight[p]; });
      if (visible && o.type !== 'internal') return;
      var s = describeOrder(g, f, o);
      if (o.type === 'attack' && rnd(g) < 0.2) { var alt = PD[o.from].nb[Math.floor(rnd(g) * PD[o.from].nb.length)]; s = nameOf(f) + ' xuất quân đánh ' + PD[alt].city; }
      rumors.push({ t: 'Đồn mùa trước: ' + s + '.' });
    });
    g.rumorsReady = rumors.slice(0, 4);
    rep.newsCount = rep.news.length;

    // 6. kết thúc
    g.turn += 1;
    var n = own(g, me).length;
    if (!g.fac[me].alive) g.over = { win: false, why: 'Diệt vong ở mùa ' + (g.turn - 1) + '.' };
    else if (n >= WIN_PROV) { g.over = { win: true, why: 'Nắm ' + n + ' châu: xưng bá một phương.' }; chron('Nắm ' + n + ' châu, xưng bá một phương.'); }
    else if (g.turn > MAX_TURN) {
      var emp = ORDER.filter(function (f) { return FAC[f].emperor; }).map(function (f) { return [f, g.fac[f].alive ? score(g, f) : -1]; }).sort(function (a, b) { return b[1] - a[1]; });
      var top = emp[0][0] === me;
      g.over = { win: top, why: top ? 'Hết 32 mùa, đứng đầu tứ đế với ' + score(g, me) + ' điểm.' : 'Hết 32 mùa. ' + nameOf(emp[0][0]) + ' đứng đầu tứ đế; ta ' + score(g, me) + ' điểm.' };
    }
    return { g: g, report: rep };
  }

  function fall(g, f, by, rep, chron, news) {
    var F = g.fac[f];
    if (f === g.player && !F.exile && F.alive) {
      var last = null; Object.keys(PD).forEach(function (p) { if (!last && adj(p, FAC[f].seat)) last = p; });
      F.exile = { near: FAC[f].seat, troops: 4, left: 3 };
      rep.events.push({ t: 'Mất châu cuối cùng. ' + FAC[f].name + ' dẫn 4 nghìn tàn quân lưu vong quanh ' + PD[FAC[f].seat].city + ': còn 3 mùa để đoạt lại một châu.' });
      chron('Mất hết đất, lưu vong.');
      return;
    }
    if (f === g.player && F.exile) return;
    F.alive = false; news(nameOf(f) + ' diệt vong dưới tay ' + nameOf(by) + '.');
  }

  return { PD: PD, POS: POS, RIM: RIM, FAC: FAC, ORDER: ORDER, NEUTRAL: NEUTRAL, TERRAIN: TERRAIN, TRAIT_TEXT: TRAIT_TEXT, MAX_TURN: MAX_TURN, WIN_PROV: WIN_PROV, TRUCE_TURN: TRUCE_TURN,
    newGame: newGame, resolve: resolve, intel: intel, estimate: estimate, canAttack: canAttack, sideOptions: sideOptions, own: own, adj: adj, rimsOf: rimsOf, cap: cap, allied: allied, income: income, upkeep: upkeep, troopsOf: troopsOf, score: score, cal: cal, nameOf: nameOf, colorOf: colorOf, isRim: isRim, truceBlocks: truceBlocks, sightSet: sightSet, band: band, leaderGov: leaderGov, aiPlan: aiPlan };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = SPK;
