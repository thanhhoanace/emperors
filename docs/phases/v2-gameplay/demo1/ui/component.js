// Demo 1 (phase v2-gameplay): one season in Huai Nan on the phase-1 3D map. The page owns the canvas; HNBoot builds the
// world in it, HNScene draws towns, armies and battles, HNRules decides everything. Throwaway spike, landscape phone.
var W = 844, H = 390;
var MAP_PNG = '__MAP_PNG__';
var PORTRAIT = __PORTRAITS__; // general id → uploaded ink portrait (portraits/*.svg)
var SEAT_OWNERS = { xu: 'cao_cao', yan: 'cao_cao', yu: 'cao_cao', yang: 'sun_quan' };
var STATS = [['uy', 'Uy'], ['tai', 'Tài'], ['muu', 'Mưu'], ['dung', 'Dũng'], ['kien', 'Kiên']];
var ARM_ORDER = ['bo', 'cung', 'ky', 'thuy'];
var ORDER_TEXT = { move: 'Đi tới', attack: 'Đánh', siege: 'Vây', hold: 'Giữ, dàn trận chờ' };
var LOYAL_NOTE = 'Trung dưới 70: quân ông đánh kém (tới −8 sĩ khí). Dưới 30: ông bỏ đi, mang theo quân. Từ 85: +3 sĩ khí.';
var TONE = { text: '#efe6d2', muted: '#b9ab8d', gold: '#e2bf6c', bad: '#f08a72', good: '#98d494', line: 'rgba(226,191,108,.28)' };

function kfmt(n) { if (n == null) return '?'; n = Math.round(n); return n >= 10000 ? Math.round(n / 1000) + 'k' : n >= 1000 ? (Math.round(n / 100) / 10).toString().replace('.', ',') + 'k' : String(n); }

class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { phase: 'load', t0: Date.now(), loadErr: '', g: null, sel: null, pick: null, fc: null, cardsOpen: false, cardIx: 0, b: null, bsel: null, result: null, toast: '', tick: 0, busy: false, joint: false, goal: true, tip: null };
    this.setCanvas = (el) => { this.canvas = el; };
    this.sc = null;
  }

  // ------------------------------------------------------------------ boot
  componentDidMount() {
    var self = this;
    this.timer = setInterval(function () { if (self.state.phase === 'load') self.setState({ tick: self.state.tick + 1 }); }, 500);
    this.boot().catch(function (e) { self.setState({ loadErr: String(e && e.message || e) }); });
  }
  componentWillUnmount() { clearInterval(this.timer); if (this.sc) this.sc.stop(); }
  async boot() {
    for (var i = 0; i < 120 && !(window.HNBoot && window.HNScene && window.HNRules); i++) await new Promise(function (r) { setTimeout(r, 250); }); // the bundle may still be loading
    if (!window.HNBoot || !window.HNScene || !window.HNRules) throw new Error('không tải được script bản đồ.');
    try { await document.fonts.load('700 40px "Noto Serif TC"', '明魏吳豪'); } catch (e) { /* the flags fall back to any CJK font */ }
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var rt = await HNBoot.start({ canvas: this.canvas, width: W, height: H, dpr: dpr, mapPng: MAP_PNG, tileRadius: 64 });
    this.sc = await HNScene.create(rt, { width: W, height: H });
    var sc = this.sc;
    HNRules.setLaneProvider(function (site, from) { var f = from && sc.place[from]; return sc.lanesAt(site, f ? [f.x, f.z] : null); });
    var g = HNRules.newGame((Date.now() % 100000) + 1);
    this.sc.sync(this.sceneState(g));
    var self = this;
    this.sc.loop(function () { self.setState({ tick: self.state.tick + 1 }); });
    this.setState({ phase: 'play', g: g, cardsOpen: false, goal: true, cardIx: 0 });
  }

  // ------------------------------------------------------------------ rules → scene
  sceneState(g) {
    var R = HNRules, owners = Object.assign({}, SEAT_OWNERS), armies = [];
    Object.keys(g.towns).forEach(function (t) { owners[t] = g.towns[t].owner; });
    Object.values(g.armies).forEach(function (a) {
      var u = R.seen(g, a).units, p = R.PLACES[a.at].xz, face = a.fid === g.me ? 'tho_xuan' : 'chung_ly';
      if (face === a.at) face = a.fid === g.me ? 'am_lang' : 'tho_xuan';
      var q = R.PLACES[face].xz, dx = q[0] - p[0], dz = q[1] - p[1], L = Math.hypot(dx, dz) || 1;
      armies.push({ id: a.id, fid: a.fid, arm: a.arm, at: a.at, dx: a.off[0] * 2.2, dz: a.off[1] * 2.2, bo: u.bo || 0, cung: u.cung || 0, ky: u.ky || 0, thuy: u.thuy || 0, fx: dx / L, fz: dz / L, seal: R.GEN[a.gen] ? R.GEN[a.gen].seal : null });
    });
    var walls = {}; Object.keys(g.towns).forEach(function (t) { walls[t] = g.towns[t].walls; });
    return { me: g.me, owners: owners, walls: walls, armies: armies };
  }
  setG(g, extra) { this.sc.sync(this.sceneState(g)); this.setState(Object.assign({ g: g }, extra || {})); }

  // ------------------------------------------------------------------ map input
  down(e) { if (!this.sc || this.state.busy) return; try { e.currentTarget.setPointerCapture(e.pointerId); } catch (x) {} var r = e.currentTarget.getBoundingClientRect(), k = W / r.width; this.sc.gesture.down(e.pointerId, (e.clientX - r.left) * k, (e.clientY - r.top) * k, e.button); }
  move(e) { if (!this.sc) return; var r = e.currentTarget.getBoundingClientRect(), k = W / r.width; this.sc.gesture.move(e.pointerId, (e.clientX - r.left) * k, (e.clientY - r.top) * k); }
  up(e) {
    if (!this.sc) return;
    var r = e.currentTarget.getBoundingClientRect(), k = W / r.width, hit = this.sc.gesture.up(e.pointerId, (e.clientX - r.left) * k, (e.clientY - r.top) * k);
    if (!hit || this.state.phase !== 'play') return;
    if (hit.kind === 'ground') { if (!this.state.pick) this.select(null); if (hit.terrain) { var G = this.sc.GROUND[hit.terrain]; this.setState({ tip: { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k, name: G.name, fx: G.fx } }); } return; }
    this.tapThing(hit.kind, hit.id);
  }
  wheel(e) { if (this.sc) this.sc.gesture.wheel(e.deltaY); }
  tapThing(kind, id) {
    var st = this.state;
    if (st.pick) { var t = this.targets().find(function (x) { return x.kind === kind && x.id === id; }); if (t) return this.chooseTarget(t); }
    this.select({ kind: kind, id: id });
  }
  select(sel) {
    this.sc.select(sel); this.sc.mark(null);
    var g = this.state.g, a = sel && sel.kind === 'army' ? g.armies[sel.id] : null;
    this.sc.reach(a ? a.id : null, a ? HNRules.reachOf(a) : 0, a ? HNRules.targets(g, a.id) : []);
    this.setState({ sel: sel, pick: null, tip: null });
  }

  // ------------------------------------------------------------------ orders
  targets() {
    var st = this.state, g = st.g, p = st.pick; if (!p) return [];
    return HNRules.targets(g, p.aid).filter(function (t) {
      if (p.type === 'move') return t.kind === 'town' && !t.hostile;
      if (p.type === 'siege') return t.kind === 'town' && t.hostile;
      return t.hostile;
    });
  }
  startPick(type) {
    var st = this.state, aid = st.sel.id;
    if (type === 'hold') return this.giveOrder(aid, { type: 'hold' });
    this.setState({ pick: { type: type, aid: aid } }, () => { this.sc.mark(this.targets().map(function (t) { return { kind: t.kind, id: t.id, hex: type === 'move' ? 0xe2bf6c : 0xd4492f }; })); });
  }
  cancelPick() { this.sc.mark(null); this.setState({ pick: null }); }
  giveOrder(aid, order) { var g = HNRules.setArmyOrder(this.state.g, aid, order); this.sc.mark(null); this.setState({ g: g, pick: null, fc: null }); }
  closeGoal() { var g = this.state.g; this.setState({ goal: false, cardsOpen: !this.seenGoal && g.cards.length > 0 }); this.seenGoal = true; }
  clearOrder(aid) { this.giveOrder(aid, null); }
  chooseTarget(t) {
    var p = this.state.pick, target = { kind: t.kind, id: t.id };
    if (p.type !== 'attack') return this.giveOrder(p.aid, { type: p.type, kind: t.kind, id: t.id });
    this.openForecast([p.aid], target);
  }
  // the general reads the battle before we commit (Civ's preview, but his Mưu sets how right he is)
  openForecast(aids, target) {
    var g = this.state.g, f = HNRules.forecast(g, aids, target);
    this.sc.mark([{ kind: target.kind, id: target.id }]);
    this.setState({ fc: { aids: aids, target: target, f: f }, pick: null });
  }
  partners(aids, target) {
    var g = this.state.g;
    return Object.values(g.armies).filter(function (a) { return a.fid === g.me && aids.indexOf(a.id) < 0 && HNRules.targets(g, a.id).some(function (t) { return t.kind === target.kind && t.id === target.id; }); });
  }
  toggleJoint(aid) { var fc = this.state.fc, aids = fc.aids.indexOf(aid) >= 0 ? fc.aids.filter(function (x) { return x !== aid; }) : fc.aids.concat([aid]); this.openForecast(aids, fc.target); }
  confirmAttack() {
    var fc = this.state.fc, g = this.state.g;
    fc.aids.forEach(function (aid) { g = HNRules.setArmyOrder(g, aid, { type: 'attack', kind: fc.target.kind, id: fc.target.id, fc: { label: fc.f.label, est: fc.f.estWin, gen: fc.f.gen, muu: fc.f.muu, band: fc.f.band, trueWin: fc.f.trueWin, dArmies: fc.f.plan.defender.armies.slice(), dGens: fc.f.plan.defender.armies.map(function (i) { return HNRules.armyName(g, g.armies[i]); }) } }); });
    this.sc.mark(null); this.setState({ g: g, fc: null, pick: null });
  }
  closeForecast() { this.sc.mark(null); this.setState({ fc: null }); }
  setTask(tid, key) { this.setState({ g: HNRules.setTownTask(this.state.g, tid, key) }); }

  // ------------------------------------------------------------------ cards
  answer(yes) {
    var g = this.state.g, c = g.cards[0]; if (!c) return;
    var g2 = HNRules.answerCard(g, c.id, yes);
    this.setG(g2, { cardsOpen: g2.cards.length > 0, toast: g2.flash ? g2.flash.text : '' });
  }

  // ------------------------------------------------------------------ end of season: marches, then battles, then the report
  endSeason() {
    var self = this, g0 = this.state.g, g = HNRules.endSeason(g0);
    this.sc.select(null); this.sc.mark(null); this.sc.reach(null);
    this.setState({ busy: true, sel: null, pick: null, fc: null, cardsOpen: false, tip: null });
    this.sc.sync(this.sceneState(g));
    // walk each army from where it was: a move ends at its new place, an attack stops short of the enemy
    var marches = (g.moves || []).filter(function (m) { return self.sc.armies[m.id] && m.from && m.to; }).map(function (m) {
      var a = self.sc.place[m.from], b = self.sc.place[m.to], arm = (g.armies[m.id] || g0.armies[m.id]).arm, off = (g0.armies[m.id] || {}).off || [0, 0];
      var s = [a.x + off[0], a.z + off[1]], e = [b.x, b.z];
      if (m.attack) e = [s[0] + (e[0] - s[0]) * 0.82, s[1] + (e[1] - s[1]) * 0.82]; else { var o = (g.armies[m.id] || {}).off || [0, 0]; e = [e[0] + o[0], e[1] + o[1]]; }
      return self.sc.march(m.id, self.sc.pathBetween(s, e, arm), 1500);
    });
    Promise.all(marches).then(function () { setTimeout(function () { self.afterMoves(g); }, marches.length ? 250 : 0); });
  }
  afterMoves(g) {
    if (g.pending) return this.startBattle(g);
    this.showReport(g);
  }
  showReport(g) { this.sc.battle.end(); this.setG(g, { phase: g.over && !g.report ? 'over' : 'report', busy: false, b: null, bsel: null, result: null }); }
  nextSeason() {
    var g = this.state.g;
    if (g.over) return this.setState({ phase: 'over' });
    this.sc.flyTo({ t: [this.sc.place.chung_ly.x - 6, this.sc.place.chung_ly.z + 8], dist: 120, el: 0.9 });
    this.setState({ phase: 'play', cardsOpen: g.cards.length > 0, toast: '' });
  }

  // ------------------------------------------------------------------ battle
  startBattle(g) {
    var plan = g.pending, R = HNRules, B = R.battle, me = plan.attacker.fid === g.me ? 'A' : 'D';
    var b = B.create(g, plan, me);
    B.autoOrders(g, b, me);
    var fromArmy = g.armies[plan.attacker.armies[0]], from = fromArmy ? this.sc.place[fromArmy.at] : null;
    this.sc.battle.begin({ site: plan.site, from: from && fromArmy.at !== plan.site ? [from.x, from.z] : null, me: me, siege: plan.siege });
    var self = this;
    setTimeout(function () { self.sc.battle.show(b, 900); }, 500);
    var fcOrder = me === 'A' ? (g.armies[plan.attacker.armies[0]] || {}).order : null;
    this.setState({ phase: 'battle', g: g, b: b, bsel: null, busy: false, bfc: fcOrder && fcOrder.fc ? fcOrder.fc : null, bplan: plan });
  }
  pickWing(id) { var b = this.state.b; var w = b.wings.find(function (x) { return x.id === id; }); if (!w || w.side !== b.me || w.gone) return; this.sc.battle.select(id); this.setState({ bsel: id }); }
  orderWing(o) {
    var b = JSON.parse(JSON.stringify(this.state.b)), w = b.wings.find((x) => x.id === this.state.bsel); if (!w) return;
    if (o === 'hoa') b.wings.forEach(function (x) { if (x.side === b.me && x.order === 'hoa') x.order = 'giu'; });
    w.order = o; this.setState({ b: b });
  }
  fightTurn() {
    var st = this.state, g = st.g, B = HNRules.battle, b = JSON.parse(JSON.stringify(st.b)), self = this;
    if (b.over || st.busy) return;
    B.live(b, b.me).forEach(function (w) { if (!w.order) w.order = 'giu'; });
    B.autoOrders(g, b, b.me === 'A' ? 'D' : 'A');
    var b2 = B.resolve(g, b);
    this.sc.battle.show(b2, 900);
    if (!b2.over) B.autoOrders(g, b2, b2.me);
    this.setState({ b: b2, busy: true });
    setTimeout(function () { self.setState({ busy: false }); if (b2.over) self.finishBattle(b2); }, 1100);
  }
  autoBattle() {
    var st = this.state, g = st.g, B = HNRules.battle, b = JSON.parse(JSON.stringify(st.b));
    while (!b.over) { B.autoOrders(g, b, 'A'); B.autoOrders(g, b, 'D'); b = B.resolve(g, b); }
    this.sc.battle.show(b, 900);
    var self = this; this.setState({ b: b, busy: true });
    setTimeout(function () { self.setState({ busy: false }); self.finishBattle(b); }, 1100);
  }
  finishBattle(b) { this.sc.battle.select(null); this.setState({ result: b, bsel: null }); }
  afterBattle() {
    var g = HNRules.settleBattle(this.state.g, this.state.result);
    this.sc.battle.end();
    this.sc.sync(this.sceneState(g));
    this.setState({ result: null, b: null });
    if (g.pending) this.startBattle(g); else this.showReport(g);
  }

  // ------------------------------------------------------------------ view buttons
  zoom(f) { if (this.sc) this.sc.gesture.zoom(f); }
  rot(a) { if (this.sc) this.sc.gesture.rotate(a); }
  home() { if (this.sc) this.sc.flyTo({ t: [this.sc.place.chung_ly.x - 6, this.sc.place.chung_ly.z + 8], dist: 120, az: 0.25, el: 0.9 }); }
  again() { var g = HNRules.newGame((Date.now() % 100000) + 1); this.sc.battle.end(); this.sc.reach(null); this.home(); this.setG(g, { phase: 'play', sel: null, pick: null, fc: null, cardsOpen: true, b: null, result: null, toast: '' }); }

  // ------------------------------------------------------------------ view values
  seal(gid) { var G = HNRules.GEN[gid], g = this.state.g, gen = g && g.gens[gid]; var fid = gen ? gen.fid : G ? G.fid : 'local'; return { ch: G ? G.seal : '?', bg: (HNRules.FAC[fid] || HNRules.FAC.local).color, img: PORTRAIT[gid] || '', hasImg: !!PORTRAIT[gid] }; }
  unitRows(units, spread) {
    var R = HNRules;
    return ARM_ORDER.filter(function (k) { return units[k] != null && (units[k] > 0 || units[k] === null); }).map(function (k) { return { arm: R.ARMS[k], n: units[k] == null ? '?' : R.seenText(units[k], spread), key: k }; });
  }
  genStats(gid) {
    var gen = this.state.g.gens[gid] || HNRules.GEN[gid]; if (!gen) return [];
    return STATS.map(function (s) { var v = gen[s[0]]; return { label: s[1], v: v, w: v * 10 + '%', color: v >= 8 ? TONE.gold : v <= 4 ? '#9a8b70' : '#d8cbb0' }; });
  }

  renderVals() {
    var st = this.state, g = st.g, R = window.HNRules, self = this, v = {};
    v.setCanvas = this.setCanvas;
    v.down = function (e) { self.down(e); }; v.move = function (e) { self.move(e); }; v.up = function (e) { self.up(e); }; v.wheel = function (e) { self.wheel(e); };
    v.noMenu = function (e) { e.preventDefault(); };
    v.zoomIn = function () { self.zoom(0.7); }; v.zoomOut = function () { self.zoom(1.43); }; v.rotL = function () { self.rot(0.4); }; v.rotR = function () { self.rot(-0.4); }; v.goHome = function () { self.home(); };
    // loading
    v.isLoad = st.phase === 'load';
    v.loadText = st.loadErr ? 'Không dựng được bản đồ 3D: ' + st.loadErr : 'Đang dựng Hoài Nam 3D… ' + Math.round((Date.now() - st.t0) / 1000) + ' giây';
    v.loadColor = st.loadErr ? TONE.bad : TONE.muted;
    if (!g || !R) return Object.assign(v, this.blank());
    var me = g.me, sc = this.sc;
    v.isPlay = st.phase === 'play';
    v.isBattle = st.phase === 'battle';
    v.showHud = st.phase !== 'load';
    v.seasonText = R.cal(g.season) + ' · Hoài Nam';
    var nOwn = Object.keys(g.towns).filter(function (t) { return g.towns[t].owner === me; }).length;
    v.res = [
      { label: 'Lương', value: R.fmt(g.res.luong), color: g.res.luong < 0 ? TONE.bad : g.res.luong < 300 ? TONE.gold : TONE.text, warn: g.warn.luong ? 'Cảnh báo' : '' },
      { label: 'Tiền', value: R.fmt(g.res.tien), color: TONE.text, warn: '' },
      { label: 'Uy', value: String(g.res.uy), color: g.res.uy <= 10 ? TONE.bad : TONE.text, warn: g.warn.uy ? 'Cảnh báo' : '' },
      { label: 'Thành', value: nOwn + '/5', color: TONE.text, warn: '' },
    ];
    v.nCards = g.cards.length; v.hasCards = v.isPlay && g.cards.length > 0 && !st.cardsOpen;
    v.openCards = function () { self.setState({ cardsOpen: true }); };
    var idle = Object.values(g.armies).filter(function (a) { return a.fid === me && !a.order; }).length;
    v.endLabel = 'Hết mùa';
    v.endSub = idle ? idle + ' đạo chưa có lệnh' : 'Mọi đạo đã có lệnh';
    v.endSeason = function () { if (!self.state.busy) self.endSeason(); };
    v.canEnd = v.isPlay && !st.busy && !st.fc && !st.cardsOpen;
    v.toast = st.toast; v.hasToast = !!st.toast && v.isPlay;
    v.hideToast = function () { self.setState({ toast: '' }); };

    // ---- map labels: towns and armies, placed by the 3D projection
    var cards = sc && v.isPlay ? sc.cards() : [], tg = this.targets(), sel = st.sel;
    var isT = function (kind, id) { return tg.some(function (t) { return t.kind === kind && t.id === id; }); };
    v.townLabels = cards.filter(function (c) { return c.kind === 'town' && c.visible && g.towns[c.id] && c.x > -40 && c.x < W + 40 && c.y > 0 && c.y < H + 20; }).map(function (c) {
      var t = g.towns[c.id], F = R.FAC[t.owner], mine = t.owner === me, n = R.total(t.gar);
      var target = isT('town', c.id), on = sel && sel.kind === 'town' && sel.id === c.id;
      return { left: Math.round(c.x - 60), top: Math.round(c.y - 40), name: R.PLACES[c.id].name, dot: F.color, sub: (mine ? R.fmt(n) : '~' + kfmt(Math.round(n / 100) * 100)) + ' · lũy ' + t.walls + (t.task ? ' · ⚒' : ''),
        border: target ? '#f08a72' : on ? TONE.gold : 'rgba(226,191,108,.35)', bg: target ? 'rgba(96,28,20,.9)' : 'rgba(22,18,13,.82)', tap: function () { self.tapThing('town', c.id); } };
    });
    v.seatLabels = cards.filter(function (c) { return c.kind === 'town' && c.visible && !g.towns[c.id] && c.x > 0 && c.x < W && c.y > 0 && c.y < H; }).map(function (c) {
      return { left: Math.round(c.x - 50), top: Math.round(c.y - 24), name: sc.place[c.id].name, dot: R.FAC[SEAT_OWNERS[c.id]].color };
    });
    v.armyLabels = cards.filter(function (c) { return c.kind === 'army' && c.visible && g.armies[c.id] && c.x > -60 && c.x < W + 60 && c.y > 0 && c.y < H + 30; }).map(function (c) {
      var a = g.armies[c.id], F = R.FAC[a.fid], s = R.seen(g, a), gen = g.gens[a.gen], mine = a.fid === me;
      var arms = ARM_ORDER.filter(function (k) { return s.units[k]; }).map(function (k) { return { n: (s.exact ? '' : '~') + kfmt(s.units[k]), isBo: k === 'bo', isCung: k === 'cung', isKy: k === 'ky', isThuy: k === 'thuy' }; });
      var pic = self.seal(a.gen);
      var target = isT('army', c.id), on = sel && sel.kind === 'army' && sel.id === c.id;
      var ord = mine && a.order ? ORDER_TEXT[a.order.type] + (a.order.id ? ' ' + (a.order.kind === 'town' ? R.PLACES[a.order.id].name : R.armyName(g, g.armies[a.order.id])) : '') : mine ? 'Chưa có lệnh' : (s.spread < 0.3 ? 'Ước ±20%' : 'Xa: ước ±50%');
      return { left: Math.round(c.x - 84), top: Math.round(c.y - 62), glyph: F.glyph, color: F.color, name: gen.name, arms: arms, ord: ord, img: pic.img, hasImg: pic.hasImg, noImg: !pic.hasImg, ordColor: mine && !a.order ? TONE.gold : TONE.muted,
        border: target ? '#f08a72' : on ? TONE.gold : 'rgba(226,191,108,.35)', bg: target ? 'rgba(96,28,20,.9)' : 'rgba(22,18,13,.86)', tap: function () { self.tapThing('army', c.id); } };
    });

    // ---- selection panel
    var selA = sel && sel.kind === 'army' ? g.armies[sel.id] : null, selT = sel && sel.kind === 'town' ? sel.id : null;
    v.hasArmy = v.isPlay && !!selA && !st.pick; v.hasTown = v.isPlay && !!selT && !st.pick; v.hasPick = v.isPlay && !!st.pick;
    v.closeSel = function () { self.select(null); };
    if (selA) {
      var gen = g.gens[selA.gen], mine = selA.fid === me, s = R.seen(g, selA), sl = this.seal(selA.gen);
      v.aImg = sl.img; v.aHasImg = sl.hasImg; v.aNoImg = !sl.hasImg;
      v.aReach = 'Một mùa đi được ' + R.reachOf(selA) * 3 + ' km' + (selA.arm === 'fleet' ? ', chỉ theo sông ' + (R.PLACES[selA.at].river === 'giang' ? 'Trường Giang' : 'Hoài') : (selA.units.ky || 0) > R.total(selA.units) * 0.5 ? ' (kỵ nhiều, đi nhanh)' : '') + ': vòng trên bản đồ.';
      v.aLoyalNote = selA.gen !== 'zhu' && gen.loyal != null ? LOYAL_NOTE : ''; v.aHasLoyal = !!v.aLoyalNote;
      v.aSeal = sl.ch; v.aSealBg = sl.bg; v.aName = gen.name; v.aCls = gen.cls + ' · ' + R.FAC[selA.fid].name; v.aStats = this.genStats(selA.gen);
      v.aTrait = gen.trait + ': ' + gen.traitText; v.aLoyal = selA.gen !== 'zhu' ? 'Trung ' + gen.loyal + ' (' + (gen.loyal < 30 ? 'sắp bỏ đi' : gen.loyal < 70 ? 'bất mãn, quân đánh kém' : gen.loyal >= 85 ? 'một lòng' : 'tạm yên') + ')' : 'Chúa công';
      v.aUnits = this.unitRows(s.units, s.spread); v.aTotal = (s.exact ? '' : '~') + R.fmt(R.total(s.units)) + ' quân' + (s.exact ? '' : s.spread < 0.3 ? ' (ước ±20%)' : ' (xa, ước ±50%)');
      v.aMine = mine; v.aTheirs = !mine;
      v.aWhere = 'Ở ' + R.PLACES[selA.at].name + (selA.besieging ? ', đang vây' : '');
      var o = selA.order;
      v.aOrder = o ? ORDER_TEXT[o.type] + (o.id ? ' ' + (o.kind === 'town' ? R.PLACES[o.id].name : R.armyName(g, g.armies[o.id])) : '') + (o.fc ? ' · ' + o.fc.gen + ' đoán: ' + o.fc.label : '') : 'Chưa có lệnh mùa này';
      v.aOrderColor = o ? TONE.text : TONE.gold; v.aHasOrder = mine && !!o;
      var tg2 = R.targets(g, selA.id);
      v.orderBtns = !mine ? [] : [
        { label: 'Đi', sub: 'tới thành ta', on: tg2.some(function (t) { return t.kind === 'town' && !t.hostile; }), go: function () { self.startPick('move'); } },
        { label: 'Đánh', sub: 'thành hay quân', on: tg2.some(function (t) { return t.hostile; }), go: function () { self.startPick('attack'); } },
        { label: 'Vây', sub: 'bỏ đói, phá lũy', on: tg2.some(function (t) { return t.kind === 'town' && t.hostile; }), go: function () { self.startPick('siege'); } },
        { label: 'Giữ', sub: 'thủ +15%', on: true, go: function () { self.startPick('hold'); } },
      ].map(function (b) { return Object.assign(b, { op: b.on ? 1 : 0.4, go: b.on ? b.go : function () {} }); });
      v.clearOrder = function () { self.clearOrder(selA.id); };
      v.attackMe = function () {};
    }
    if (selT) {
      var t = g.towns[selT], mineT = t.owner === me, P = R.PLACES[selT];
      v.tName = P.name; v.tOwner = R.FAC[t.owner].name; v.tDot = R.FAC[t.owner].color; v.tTerrain = P.terrain + (P.river ? ' · có bến thuyền' : '');
      v.tFacts = [{ k: 'Lũy', v: String(t.walls) + (t.walls ? ' (thủ +' + t.walls * 20 + '%)' : '') }, { k: 'Dân', v: mineT ? R.fmt(t.dan) : '~' + kfmt(t.dan) }, { k: 'Đồn', v: mineT ? R.fmt(R.total(t.gar)) : '~' + kfmt(Math.round(R.total(t.gar) / 100) * 100) }, { k: 'Trấn thủ', v: t.gov ? g.gens[t.gov].name : 'Không' }];
      v.tMine = mineT; v.tTheirs = !mineT;
      v.tTask = t.task ? R.TASKS[t.task.key].name + (t.task.fresh ? ' (vừa giao, đổi được)' : ', còn ' + t.task.left + ' mùa') : 'Chưa giao việc';
      v.tasks = !mineT ? [] : Object.keys(R.TASKS).filter(function (k) { return !R.TASKS[k].river || P.river; }).map(function (k) {
        var T = R.TASKS[k], ok = R.canTask(g, selT, k), cur = t.task && t.task.key === k;
        var cost = Object.keys(T.cost).map(function (c) { return R.fmt(T.cost[c]) + (c === 'tien' ? ' tiền' : ' lương'); }).join(', ');
        return { name: T.name, sub: T.text + ' · ' + cost + ' · ' + T.seasons + ' mùa', bg: cur ? 'rgba(226,191,108,.22)' : 'rgba(255,255,255,.04)', border: cur ? TONE.gold : 'rgba(226,191,108,.2)', op: ok || cur ? 1 : 0.45, go: function () { if (cur && t.task.fresh) self.setTask(selT, null); else if (ok) self.setTask(selT, k); } };
      });
      v.tCanWork = mineT && !(t.task && !t.task.fresh);
    }
    if (st.pick) {
      var pk = st.pick, pa = g.armies[pk.aid];
      v.pickTitle = { move: 'Đi tới đâu?', attack: 'Đánh ai?', siege: 'Vây thành nào?' }[pk.type];
      v.pickSub = R.armyName(g, pa) + ' · một mùa đi được ' + R.reachOf(pa) * 3 + ' km' + (pa.arm === 'fleet' ? ' theo sông' : '');
      v.pickList = tg.map(function (t) {
        var nm = t.kind === 'town' ? R.PLACES[t.id].name : R.armyName(g, g.armies[t.id]), own = t.kind === 'town' ? R.FAC[g.towns[t.id].owner].short : R.FAC[g.armies[t.id].fid].short;
        return { name: nm, sub: (t.kind === 'town' ? 'Thành ' : 'Đạo quân ') + own + ' · ' + t.d * 3 + ' km', go: function () { self.chooseTarget(t); } };
      });
      v.pickNone = !tg.length;
      v.cancelPick = function () { self.cancelPick(); };
    }

    // ---- forecast
    v.hasFc = !!st.fc && v.isPlay;
    if (st.fc) {
      var f = st.fc.f, an = this.seal(f.analyst), tgt = st.fc.target, pl = f.plan;
      v.fSeal = an.ch; v.fSealBg = an.bg; v.fImg = an.img; v.fHasImg = an.hasImg; v.fNoImg = !an.hasImg;
      v.fWho = f.gen + ' phân tích';
      v.fAcc = 'Mưu ' + f.muu + ' · sai số ±' + f.band + '%';
      v.fWhere = (pl.siege ? 'Công thành ' : 'Đánh ') + (tgt.kind === 'town' ? R.PLACES[tgt.id].name : R.armyName(g, g.armies[tgt.id]) + ' ở ' + R.PLACES[pl.site].name) + (pl.siege ? ' · lũy ' + pl.defender.walls : '');
      v.fLabel = f.label; v.fPct = 'khoảng ' + Math.round(f.estWin * 100) + '% thắng';
      v.fColor = f.estWin > 0.55 ? TONE.good : f.estWin > 0.42 ? TONE.gold : TONE.bad;
      v.fSa = R.fmt(f.sa); v.fSd = '~' + R.fmt(f.sd);
      v.fLa = '~' + R.fmt(f.est.la); v.fLd = '~' + R.fmt(f.est.ld);
      v.fDgen = pl.defender.gen ? g.gens[pl.defender.gen].name : 'Tướng giữ thành';
      v.fAgen = g.gens[pl.attacker.gen].name + (st.fc.aids.length > 1 ? ' (hợp binh)' : '');
      v.fLanes = f.lanes.map(function (l, i) { return { k: ['Trái', 'Giữa', 'Phải'][i], v: l }; });
      v.fReasons = f.reasons.map(function (r) { return { t: (r.side === 'A' ? 'Ta: ' : 'Họ: ') + r.why, pct: r.pct ? (r.pct > 0 ? '+' : '−') + Math.abs(r.pct) + '%' : '', color: (r.side === 'A') === (r.pct >= 0) ? TONE.good : TONE.bad }; });
      var reach = this.partners([], tgt);
      v.fPartners = reach.map(function (a) {
        var on = st.fc.aids.indexOf(a.id) >= 0;
        return { label: (on ? '✓ ' : '+ ') + R.armyName(g, a), bg: on ? 'rgba(226,191,108,.25)' : 'transparent', go: function () { if (!(on && st.fc.aids.length === 1)) self.toggleJoint(a.id); } };
      });
      v.fHasPartners = reach.length > 1;
      v.fGo = function () { self.confirmAttack(); }; v.fNo = function () { self.closeForecast(); };
    }

    // ---- cards
    var c0 = g.cards[0];
    v.hasCard = v.isPlay && st.cardsOpen && !st.goal && !!c0;
    if (c0) {
      var cs = c0.gen ? this.seal(c0.gen) : { ch: c0.kind === 'history' ? '憶' : '令', bg: c0.kind === 'history' ? '#5b3f8c' : '#6b5a3a' };
      v.cSeal = cs.ch; v.cSealBg = cs.bg; v.cWho = c0.who; v.cTitle = c0.title; v.cText = c0.text; v.cCount = '1/' + g.cards.length;
      v.cYes = c0.yes.label; v.cYesFx = c0.yes.fx; v.cNo = c0.no.label; v.cNoFx = c0.no.fx;
      v.cTone = c0.kind === 'history' ? '#c9a8ff' : c0.kind === 'captive' ? TONE.bad : TONE.gold;
      v.cImg = cs.img || ''; v.cHasImg = !!cs.hasImg; v.cNoImg = !cs.hasImg;
      var cg = c0.gen && (g.gens[c0.gen] || R.GEN[c0.gen]);
      v.cHasGen = !!cg;
      if (cg) { v.cGenName = cg.name; v.cGenCls = cg.cls + ' · ' + cg.trait + ': ' + cg.traitText; v.cStats = this.genStats(c0.gen); v.cLoyal = 'Trung ' + cg.loyal; v.cLoyalW = cg.loyal + '%'; v.cLoyalColor = cg.loyal < 30 ? TONE.bad : cg.loyal < 70 ? TONE.gold : TONE.good; v.cLoyalNote = c0.gen === 'zhu' ? '' : LOYAL_NOTE; }
    }
    // ---- the goal screen (first thing after loading; the ? button brings it back), and the ground tip
    v.isGoal = v.isPlay && st.goal;
    v.goalGo = function () { self.closeGoal(); }; v.openGoal = function () { self.setState({ goal: true }); };
    v.goalBtn = self.seenGoal ? 'Tiếp tục' : 'Vào mùa ' + R.cal(g.season);
    v.hasTip = v.isPlay && !!st.tip && !st.goal;
    if (st.tip) { v.tipLeft = Math.max(8, Math.min(W - 228, Math.round(st.tip.x - 110))); v.tipTop = Math.max(56, Math.round(st.tip.y - 70)); v.tipName = st.tip.name; v.tipFx = st.tip.fx; }
    v.hideTip = function () { self.setState({ tip: null }); };
    v.yes = function () { self.answer(true); }; v.no = function () { self.answer(false); }; v.later = function () { self.setState({ cardsOpen: false }); };

    // ---- battle
    var b = st.b;
    v.hasBattle = v.isBattle && !!b;
    if (b) {
      var B = R.battle, plan = g.pending, bme = b.me, site = R.PLACES[b.site].name;
      v.bTitle = (b.siege ? (bme === 'A' ? 'Công thành ' : 'Giữ thành ') : 'Trận ') + site;
      v.bTurn = b.over ? 'Hết trận' : 'Lượt ' + b.turn + '/' + b.maxTurn;
      v.bGens = B.genOf(g, b[bme].gen).name + ' đấu ' + B.genOf(g, b[bme === 'A' ? 'D' : 'A'].gen).name;
      v.bWind = b.wind ? 'Có gió: hỏa công được' : 'Lặng gió: không hỏa công';
      v.bFc = st.bfc ? st.bfc.gen + ' đã đoán: ' + st.bfc.label + ' (~' + Math.round(st.bfc.est * 100) + '%)' : '';
      v.bHasFc = !!st.bfc;
      var bc = sc ? sc.battle.cards() : [];
      v.wingChips = bc.filter(function (c) { return c.visible; }).map(function (c) {
        var w = b.wings.find(function (x) { return x.id === c.id; }); if (!w || w.gone) return null;
        var mine = w.side === bme, on = st.bsel === w.id;
        return { left: Math.round(c.x - 34), top: Math.round(c.y - 34), arm: R.ARMS[w.arm], men: kfmt(w.men), mw: Math.max(0, Math.min(100, w.morale)) + '%', mc: w.morale < 30 ? TONE.bad : w.morale < 55 ? TONE.gold : TONE.good,
          ord: mine && w.order ? B.ORDERS[w.order].name : mine ? '—' : '', border: on ? TONE.gold : mine ? R.FAC[b[bme].fid].color : 'rgba(255,255,255,.25)', bg: mine ? 'rgba(22,18,13,.88)' : 'rgba(40,40,36,.78)', tap: function () { self.pickWing(w.id); } };
      }).filter(Boolean);
      v.laneChips = (sc ? sc.battle.lanes() : []).filter(function (c) { return c.visible; }).map(function (c) { return { left: Math.round(c.x - 50), top: Math.round(c.y + 6), t: ['Làn trái', 'Làn giữa', 'Làn phải'][c.lane] + ' · ' + B.LANE_TEXT[b.lanes[c.lane]] }; });
      var last = b.log[b.log.length - 1];
      v.bLog = last ? last.ev.slice(-7).map(function (e) { return { t: e.t, color: e.big ? (e.side === bme ? TONE.good : TONE.bad) : TONE.text, weight: e.big ? 700 : 400 }; }) : [{ t: 'Chạm một cánh quân ta để đổi lệnh, rồi Đánh lượt.', color: TONE.muted, weight: 400 }];
      v.bLogTitle = last ? 'Lượt ' + last.turn : 'Trước trận';
      var ws = st.bsel && b.wings.find(function (x) { return x.id === st.bsel; });
      v.hasWing = !!ws && !b.over;
      if (ws) {
        var myGen = B.genOf(g, b[bme].gen), fired = b.fired[bme];
        v.wName = 'Cánh ' + R.ARMS[ws.arm] + ' · ' + R.fmt(ws.men) + ' quân · sĩ khí ' + Math.round(ws.morale);
        v.wOrders = Object.keys(B.ORDERS).filter(function (k) { var O = B.ORDERS[k]; return !O.arms || O.arms.indexOf(ws.arm) >= 0; }).map(function (k) {
          var O = B.ORDERS[k], can = k !== 'hoa' || (myGen.muu >= 7 && !fired && b.wind), on = ws.order === k;
          return { label: O.name, tip: k === 'hoa' && !can ? (myGen.muu < 7 ? 'Cần Mưu ≥ 7' : fired ? 'Đã dùng' : 'Lặng gió') : O.text, bg: on ? TONE.gold : 'rgba(255,255,255,.06)', color: on ? '#1b150e' : TONE.text, op: can ? 1 : 0.4, go: function () { if (can) self.orderWing(k); } };
        });
      }
      v.fight = function () { self.fightTurn(); }; v.autoFight = function () { self.autoBattle(); };
      v.canFight = !b.over && !st.busy;
      v.fightLabel = 'Đánh lượt ' + b.turn;
    }
    // ---- battle result
    var rb = st.result;
    v.hasResult = v.isBattle && !!rb;
    if (rb) {
      var B2 = R.battle, meS = rb.me, won = rb.over.win === meS, draw = rb.over.win === 'draw';
      v.rTitle = draw ? 'Bất phân thắng bại' : won ? 'Thắng trận' : 'Thua trận';
      v.rColor = draw ? TONE.gold : won ? TONE.good : TONE.bad;
      v.rWhere = (rb.siege ? 'Công thành ' : 'Trận ') + R.PLACES[rb.site].name + ' · ' + rb.log.length + ' lượt';
      v.rLoss = 'Ta mất ' + R.fmt(B2.lossOf(rb, meS)) + ' · địch mất ' + R.fmt(B2.lossOf(rb, meS === 'A' ? 'D' : 'A'));
      var moments = []; rb.log.forEach(function (l) { l.ev.forEach(function (e) { if (e.big) moments.push({ t: 'Lượt ' + l.turn + ': ' + e.t, color: e.side === meS ? TONE.good : TONE.bad }); }); });
      v.rMoments = moments.slice(0, 5);
      v.rFc = st.bfc ? st.bfc.gen + ' (Mưu ' + st.bfc.muu + ', sai số ±' + st.bfc.band + '%) đã đoán ' + st.bfc.label.toLowerCase() + ' ~' + Math.round(st.bfc.est * 100) + '%. Mô phỏng 24 trận cho ' + Math.round(st.bfc.trueWin * 100) + '%.' : '';
      if (st.bfc && st.bplan) { var gone = st.bfc.dArmies.map(function (id, i) { return st.bplan.defender.armies.indexOf(id) < 0 ? st.bfc.dGens[i] : null; }).filter(Boolean); if (gone.length) v.rFc += ' Lúc đoán, ' + gone.join(', ') + ' còn trong thành; khi đánh thì đã đi.'; }
      v.rHasFc = !!st.bfc;
      v.rNext = function () { self.afterBattle(); };
    }
    // ---- season report
    v.hasReport = st.phase === 'report' && !!g.report;
    if (g.report) {
      var rp = g.report;
      v.rpTitle = rp.season + ' kết thúc';
      v.rpLines = rp.lines.map(function (l) { var bad = l.charAt(0) === '!'; return { t: bad ? l.slice(1) : l, color: bad ? TONE.bad : TONE.text, weight: bad ? 700 : 400 }; });
      v.rpNext = g.over ? 'Xem kết cục' : 'Sang ' + rp.next;
      v.rpDemo = g.season === 2 ? 'Demo 1 là trọn mùa Thu 219. Chơi tiếp được, nhưng các mùa sau ít sự kiện hơn.' : '';
      v.rpHasDemo = !!v.rpDemo;
      v.goNext = function () { self.nextSeason(); };
    }
    // ---- game over
    v.isOver = st.phase === 'over' && !!g.over;
    if (g.over) {
      v.oTitle = g.over.win ? 'Hoài Nam về một mối' : 'Thất bại';
      v.oColor = g.over.win ? TONE.good : TONE.bad; v.oWhy = g.over.why;
      v.chron = g.chronicle.map(function (c) { return { t: R.cal(c.s) + ': ' + c.t }; });
    }
    v.again = function () { self.again(); };
    return Object.assign(this.blank(), v);
  }
  // every hole the template reads, so a missing value never breaks a render
  blank() {
    var f = function () {};
    return { isPlay: false, isBattle: false, showHud: false, seasonText: '', res: [], nCards: 0, hasCards: false, openCards: f, endLabel: '', endSub: '', endSeason: f, canEnd: false, toast: '', hasToast: false, hideToast: f,
      townLabels: [], seatLabels: [], armyLabels: [], hasArmy: false, hasTown: false, hasPick: false, closeSel: f,
      aSeal: '', aSealBg: '#444', aImg: '', aHasImg: false, aNoImg: true, aReach: '', aLoyalNote: '', aHasLoyal: false, aName: '', aCls: '', aStats: [], aTrait: '', aLoyal: '', aUnits: [], aTotal: '', aMine: false, aTheirs: false, aWhere: '', aOrder: '', aOrderColor: '', aHasOrder: false, orderBtns: [], clearOrder: f,
      tName: '', tOwner: '', tDot: '#444', tTerrain: '', tFacts: [], tMine: false, tTheirs: false, tTask: '', tasks: [], tCanWork: false,
      pickTitle: '', pickSub: '', pickList: [], pickNone: false, cancelPick: f,
      hasFc: false, fSeal: '', fSealBg: '#444', fImg: '', fHasImg: false, fNoImg: true, fWho: '', fAcc: '', fWhere: '', fLabel: '', fPct: '', fColor: '', fSa: '', fSd: '', fLa: '', fLd: '', fDgen: '', fAgen: '', fLanes: [], fReasons: [], fPartners: [], fHasPartners: false, fGo: f, fNo: f,
      hasCard: false, cSeal: '', cSealBg: '#444', cImg: '', cHasImg: false, cNoImg: true, cHasGen: false, cGenName: '', cGenCls: '', cStats: [], cLoyal: '', cLoyalW: '0%', cLoyalColor: '', cLoyalNote: '', isGoal: false, goalGo: f, openGoal: f, goalBtn: '', hasTip: false, tipLeft: 0, tipTop: 0, tipName: '', tipFx: '', hideTip: f, cWho: '', cTitle: '', cText: '', cCount: '', cYes: '', cYesFx: '', cNo: '', cNoFx: '', cTone: '', yes: f, no: f, later: f,
      hasBattle: false, bTitle: '', bTurn: '', bGens: '', bWind: '', bFc: '', bHasFc: false, wingChips: [], laneChips: [], bLog: [], bLogTitle: '', hasWing: false, wName: '', wOrders: [], fight: f, autoFight: f, canFight: false, fightLabel: '',
      hasResult: false, rTitle: '', rColor: '', rWhere: '', rLoss: '', rMoments: [], rFc: '', rHasFc: false, rNext: f,
      hasReport: false, rpTitle: '', rpLines: [], rpNext: '', rpDemo: '', rpHasDemo: false, goNext: f,
      isOver: false, oTitle: '', oColor: '', oWhy: '', chron: [], again: f };
  }
}
