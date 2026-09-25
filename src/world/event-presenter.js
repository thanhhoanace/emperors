// Event presenter: turns one RuntimeEvent v1 (docs/product/runtime-event.md) into a shot on the world runtime.
// The engine decides what happened; this only decides how it is shown. It reads the v1 fields (fid, from, to, win,
// actorChar, defenderFid, defenderChar, actors, shot, text, tone), never the raw engine `defender`, never computes a
// battle and never changes owners or the event: a shot is a pure function of (event, time), so QA can seek any frame.
//
//   const P = EventPresenter.create(rt, { world, characters, names, hud });
//   const plan = P.plan(ev);            // { ev, duration, cams[], marks[], hud[] }
//   P.show(plan, t);                    // put the frame at time t (seconds) on screen
//   await P.play(ev, { speed: 2 });     // real time, 1×/2×/4×; resolves back on the campaign view
(function (root) {
  const EP = {};
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const smooth = (e) => e * e * (3 - 2 * e);

  // Vietnamese titles for the event cards
  const KIND_TITLE = {
    attack: 'Tấn công', pact: 'Kết minh', deal_accept: 'Ngoại giao · chấp thuận', deal_counter: 'Ngoại giao · mặc cả', deal_refuse: 'Ngoại giao · khước từ',
    deal_break: 'Bội ước', annex: 'Chiêu hàng', internal: 'Nội chính', fortify: 'Củng cố', stratagem: 'Mưu kế', revolt: 'Dân biến', event: 'Biến cố',
    gate: 'Thời cuộc', succession: 'Kế vị', realm_fall: 'Mất nước', fall: 'Diệt vong', win: 'Thống nhất',
  };
  const GATE_TITLE = {
    opening: 'Thu Kiến An 24', guest_arrival: 'Khách lạ tới', fan_xiang_stalemate: 'Vây Phàn – Tương', hanzhong_pressure: 'Áp lực Hán Trung',
    wu_looks_at_jing: 'Ngô nhìn Kinh Châu', chang_an_gate: 'Cửa Quan Trung', ye_exposed: 'Nghiệp lộ sườn', huai_scavenge: 'Khe Hoài', coalition_hegemon: 'Bá chủ mới',
  };
  // named gate cameras (data/scenario/gates.json `shot.camera` / `shot.then`) → views of the runtime
  const NAMED = {
    overview_rim: (rt) => rt.viewOverview(),
    jing_south_walls: (rt) => rt.viewCity('jing', { az: 0.15, el: 0.42 }),
    xiangyang_south: (rt) => rt.viewCity('jing', { az: 0.1, el: 0.5, d: 30 }),
    hanzhong_pass: (rt) => rt.viewLook('han_zhong', 'guan'),
    xiakou_toward_jiangling: (rt) => rt.viewLook('jiang', 'jing_nan'),
    zhongli_huai: (rt) => rt.viewProvince('huai'),
    jinyang_toward_ye: (rt) => rt.viewLook('bing', 'ji'),
    tianshui_toward_changan: (rt) => rt.viewLook('longxi', 'guan'),
  };

  EP.KIND_TITLE = KIND_TITLE;
  EP.GATE_TITLE = GATE_TITLE;
  EP.NAMED = NAMED;

  // who stands where and under which banner, from the data files (display only: the engine keeps its own state)
  EP.cast = function (world, characters) {
    const owner = {}, seat = {}, fidOf = {};
    for (const f of world.factions) { for (const p of f.start.provinces) owner[p] = f.id; fidOf[f.id] = f.id; }
    for (const [pid, cid] of Object.entries(characters.governors || {})) { seat[cid] = pid; if (owner[pid]) fidOf[cid] = owner[pid]; }
    for (const [fid, list] of Object.entries(characters.reserves || {})) for (const cid of list) fidOf[cid] = fidOf[cid] || fid;
    const tk = (characters.succession || {}).threeKingdoms || {};
    for (const [fid, heir] of Object.entries(tk)) if (heir) fidOf[heir] = fidOf[heir] || fid;
    for (const [pid, n] of Object.entries(characters.neutrals || {})) if (n.face) seat[n.face] = seat[n.face] || pid;
    for (const f of world.factions) if (!seat[f.id]) seat[f.id] = f.start.seat;
    return { seat, fid: (cid) => fidOf[cid] || null, owner };
  };

  EP.create = function (rt, o) {
    const names = o.names, hud = o.hud || null, cast = EP.cast(o.world, o.characters);
    const factionName = {}; for (const f of o.world.factions) factionName[f.id] = names.name(f.id); // a faction is named after its leader
    const provName = {}; for (const p of o.world.provinces) provName[p.id] = { name: p.name, city: p.city };
    const P = { cast };

    // ---------------------------------------------------------------- building blocks of a plan
    const newPlan = (ev) => ({ ev, cams: [], marks: [], hud: [], t: 0, duration: 0 });
    // camera from view a to view b over d seconds (either may be a function of the segment's own 0..1)
    const move = (pl, a, b, d) => { pl.cams.push({ t0: pl.t, t1: pl.t + d, a, b }); pl.t += d; };
    const hold = (pl, v, d, drift = 0.06) => move(pl, v, drift ? drifted(v, drift) : v, d);
    // a slow push-in during a hold keeps the frame alive without moving the subject
    const drifted = (v, k) => { const c = v.cam.map((x, i) => v.target[i] + (x - v.target[i]) * (1 - k)); return Object.assign({}, v, { cam: c }); };
    const card = (pl, t0, t1, c) => pl.hud.push(Object.assign({ t0, t1 }, c));
    const mark = (pl, m) => pl.marks.push(m);
    const toCampaign = (pl, from, d = 2.2) => move(pl, from, rt.viewCampaign(), d);
    const actorCard = (cid, fid, role) => ({ id: cid, name: names.name(cid), fid: fid || null, faction: !fid ? 'Trung lập' : cid === fid ? 'Quân chủ' : 'Phe ' + (factionName[fid] || fid), role: role || '' });
    const dirOf = (a, b) => { const dx = b[0] - a[0], dz = b[2] - a[2], L = Math.hypot(dx, dz) || 1; return [dx / L, dz / L]; };
    // camera azimuth that puts the camera on the side of point `p` looking at `c` (orbit convention of the runtime)
    const azFrom = (c, p, turn = 0.35) => Math.atan2(p[0] - c[0], p[2] - c[2]) + turn;

    // ---------------------------------------------------------------- attack (docs/product/march.md)
    // origin → attacker → march → destination → defender → result (from ev.win) → back to the campaign
    const planAttack = (ev) => {
      const pl = newPlan(ev), camp = rt.viewCampaign();
      const path = rt.pathBetween(ev.from, ev.to), len = path.length > 1 ? path.reduce((a, p, k) => (k ? a + Math.hypot(p[0] - path[k - 1][0], p[2] - path[k - 1][2]) : 0), 0) : 0;
      const at = (u) => rt.pointAlong(path, u);
      const U0 = 0.06, U1 = 0.86; // the army leaves the origin's walls, and halts before the target's
      const seatFrom = rt.seatOf(ev.from), seatTo = rt.seatOf(ev.to), p1 = at(U1);
      const attacker = actorCard(ev.actorChar, ev.fid, 'Bên đánh'), defender = actorCard(ev.defenderChar, ev.defenderFid === 'neutral' ? null : ev.defenderFid, 'Bên thủ');
      const title = KIND_TITLE.attack + ' · ' + (provName[ev.from] || {}).city + ' → ' + (provName[ev.to] || {}).city;

      // 1. origin: the attacker's province, the general and his army at the gates
      const vFrom = rt.viewProvince(ev.from, { d: 60, az: azFrom(seatFrom, seatTo, Math.PI + 0.5), el: 0.7, auto: true });
      const tOrigin = pl.t; move(pl, camp, vFrom, 2.2); hold(pl, vFrom, 1.6);
      // 2. march along the baked road between the two seats; the camera follows (speed by distance, 3–7 s)
      const vF0 = rt.viewFollow(path, U0);
      move(pl, vFrom, vF0, 1.0);
      const tMarch = pl.t, dMarch = clamp(3 + len / 25, 3, 7);
      move(pl, (e) => rt.viewFollow(path, U0 + (U1 - U0) * e), (e) => rt.viewFollow(path, U0 + (U1 - U0) * e), dMarch);
      const tArrive = pl.t;
      // 3. destination: the target city from the attacker's side, the defender at its walls
      const cityT = rt.seatOf(ev.to), mid = [(cityT[0] + p1[0]) / 2, (cityT[1] + p1[1]) / 2 + 0.3, (cityT[2] + p1[2]) / 2];
      const span = Math.hypot(p1[0] - cityT[0], p1[2] - cityT[2]);
      const vTo = rt.viewCity(ev.to, { target: mid, d: Math.max(14, span * 1.9 + 6), az: azFrom(cityT, p1, 0.6), el: 0.55, auto: true });
      move(pl, rt.viewFollow(path, U1), vTo, 1.4);
      const tBattle = pl.t; hold(pl, vTo, 2.2, 0.08);
      // 4. result, straight from the event: win → the attacker's standard over the city; loss → the army falls back
      const tResult = pl.t; hold(pl, drifted(vTo, 0.08), 2.6, 0.05);
      const tBack = pl.t; toCampaign(pl, drifted(drifted(vTo, 0.08), 0.05));
      pl.duration = pl.t;

      const dA = dirOf(seatFrom, seatTo), dMarchAt = (u) => { const a = at(Math.max(0, u - 0.01)), b = at(Math.min(1, u + 0.01)); return dirOf(a, b); };
      const defPt = [cityT[0] + (p1[0] - cityT[0]) * 0.45, 0, cityT[2] + (p1[2] - cityT[2]) * 0.45];
      mark(pl, { id: 'attacker', kind: 'army', fid: ev.fid, t0: tOrigin + 1.2, t1: tBack + 0.4,
        at: (t) => {
          if (t < tMarch) return { p: at(U0), dir: dA };
          if (t < tArrive) { const u = U0 + (U1 - U0) * ((t - tMarch) / dMarch); return { p: at(u), dir: dMarchAt(u) }; }
          if (t < tResult || ev.win) return { p: p1, dir: dirOf(p1, cityT) };
          const e = clamp((t - tResult) / 2.4, 0, 1), u = U1 - Math.min(0.1, 4 / Math.max(1, len)) * smooth(e); // falls back a few units along the road, still in frame
          return { p: at(u), dir: dMarchAt(u).map((x) => -x) };
        } });
      mark(pl, { id: 'defender', kind: 'general', fid: defender.fid, t0: tArrive + 0.4, t1: ev.win ? tResult + 0.6 : tBack + 0.4, at: () => ({ p: defPt, dir: dirOf(defPt, p1) }) });
      const battlePt = [(p1[0] + defPt[0]) / 2, 0, (p1[2] + defPt[2]) / 2];
      mark(pl, { id: 'dust', kind: 'dust', t0: tBattle, t1: tResult + 0.8, at: () => ({ p: battlePt, dir: [1, 0] }) });
      if (ev.win) mark(pl, { id: 'standard', kind: 'standard', fid: ev.fid, t0: tResult + 0.5, t1: tBack + 1.2, at: () => ({ p: rt.palaceOf(ev.to), dir: [1, 0], fixed: true }) });

      card(pl, 0, tBack, { type: 'event', title, text: ev.text, tone: ev.tone, fid: ev.fid });
      card(pl, tOrigin + 1.0, tArrive, { type: 'actors', actors: [attacker] });
      card(pl, tArrive, tBack, { type: 'actors', actors: [attacker, defender] });
      card(pl, tResult, tBack, { type: 'badge', win: !!ev.win, text: ev.win ? 'Thắng' : 'Bại', fid: ev.fid });
      card(pl, tOrigin + 1.2, tBack, { type: 'label', text: (provName[ev.from] || {}).city, at: seatFrom });
      card(pl, tMarch, tBack, { type: 'label', text: (provName[ev.to] || {}).city, at: seatTo });
      pl.meta = { path, from: ev.from, to: ev.to, arrive: tArrive, result: tResult, back: tBack, marchEnd: p1 };
      return pl;
    };

    // ---------------------------------------------------------------- gate (data/scenario/gates.json shot)
    const gateViews = (ev) => {
      const s = ev.shot || {}, list = [];
      const seats = (ev.actors || []).map((c) => cast.seat[c]).filter(Boolean);
      const one = (name) => {
        if (NAMED[name]) return [NAMED[name](rt)];
        if (name === 'four_rim_seats') return seats.map((pid) => rt.viewProvince(pid, { d: 55, el: 0.62 }));
        return [seats.length ? rt.viewProvince(seats[0]) : rt.viewCampaign()]; // unknown camera: the first actor's seat
      };
      if (s.camera) list.push(...one(s.camera));
      if (s.then) list.push(...one(s.then));
      return list.length ? list : [rt.viewCampaign()];
    };
    const planGate = (ev) => {
      const pl = newPlan(ev), camp = rt.viewCampaign(), views = gateViews(ev), S = Math.max(3, (ev.shot && ev.shot.seconds) || 6);
      const trans = views.length > 1 ? Math.min(1.6, (S * 0.4) / (views.length - 1)) : 0, holdT = (S - trans * (views.length - 1)) / views.length;
      const tIn = pl.t; move(pl, camp, views[0], views[0].mode === 'far' ? 1.4 : 2.2);
      const tShot = pl.t;
      views.forEach((v, i) => { hold(pl, v, holdT, 0.05); if (i < views.length - 1) move(pl, drifted(v, 0.05), views[i + 1], trans); });
      const tBack = pl.t; toCampaign(pl, drifted(views[views.length - 1], 0.05));
      pl.duration = pl.t;
      const actors = (ev.actors || []).map((c) => actorCard(c, cast.fid(c)));
      // each actor at his seat, standard in his faction's colour (no army: a gate moves no troops)
      for (const c of ev.actors || []) {
        const pid = cast.seat[c]; if (!pid) continue;
        const s = rt.seatOf(pid), cityR = (rt.MC && rt.MC[pid] && rt.MC[pid].r) || 3, p = [s[0] + cityR * 0.9, 0, s[2] + cityR * 1.1];
        mark(pl, { id: 'actor:' + c, kind: 'general', fid: cast.fid(c), t0: tIn + 0.6, t1: tBack + 0.4, at: () => ({ p, dir: [0, 1] }) });
        card(pl, tShot, tBack, { type: 'label', text: names.name(c), at: [p[0], s[1] + 1.5, p[2]], fid: cast.fid(c) });
      }
      card(pl, 0, tBack, { type: 'event', title: GATE_TITLE[ev.id] || KIND_TITLE.gate, text: ev.text, tone: ev.tone, fid: null });
      if (actors.length) card(pl, tShot, tBack, { type: 'actors', actors });
      pl.meta = { views: views.map((v) => v.name), shot: tShot, back: tBack };
      return pl;
    };

    // ---------------------------------------------------------------- everything else: focus the place, show the card
    const placeOf = (ev) => {
      if (ev.prov && provName[ev.prov]) return ev.prov;
      const f = o.world.factions.find((x) => x.id === ev.fid);
      return f ? f.start.seat : null;
    };
    const planGeneric = (ev) => {
      const pl = newPlan(ev), camp = rt.viewCampaign(), pid = placeOf(ev);
      const v = pid ? (ev.kind === 'fortify' || ev.kind === 'internal' ? rt.viewCity(pid) : rt.viewProvince(pid)) : camp;
      move(pl, camp, v, 2.0); const tShot = pl.t; hold(pl, v, 3.2); const tBack = pl.t; toCampaign(pl, drifted(v, 0.06));
      pl.duration = pl.t;
      const people = [];
      if (ev.kind === 'succession') people.push(actorCard(ev.from, ev.fid, 'Cũ'), actorCard(ev.to, ev.fid, 'Kế vị'));
      else if (ev.fid) people.push(actorCard(ev.fid, ev.fid));
      if (ev.other && ev.kind !== 'succession') people.push(actorCard(ev.other, ev.other));
      card(pl, 0, tBack, { type: 'event', title: KIND_TITLE[ev.kind] || ev.kind, text: ev.text, tone: ev.tone, fid: ev.fid || null, clauses: ev.clauses || null });
      if (people.length) card(pl, tShot - 0.8, tBack, { type: 'actors', actors: people });
      pl.meta = { place: pid, shot: tShot, back: tBack };
      return pl;
    };

    P.plan = (ev) => (ev.kind === 'attack' && ev.from && ev.to ? planAttack(ev) : ev.kind === 'gate' ? planGate(ev) : planGeneric(ev));

    // ---------------------------------------------------------------- one frame of a plan (pure)
    P.frameAt = (pl, t) => {
      t = clamp(t, 0, pl.duration);
      let seg = pl.cams[pl.cams.length - 1];
      for (const s of pl.cams) if (t <= s.t1) { seg = s; break; }
      const e = clamp((t - seg.t0) / Math.max(1e-6, seg.t1 - seg.t0), 0, 1);
      const va = typeof seg.a === 'function' ? seg.a(e) : seg.a, vb = typeof seg.b === 'function' ? seg.b(e) : seg.b;
      const view = va === vb ? va : rt.lerpView(va, vb, smooth(e));
      const marks = pl.marks.filter((m) => t >= m.t0 && t < m.t1).map((m) => Object.assign({ id: m.id, kind: m.kind, fid: m.fid }, m.at(t)));
      const hudItems = pl.hud.filter((h) => t >= h.t0 && t < h.t1);
      return { t, view, marks, hud: hudItems };
    };

    // ---------------------------------------------------------------- putting a frame on screen
    const live = {}; // marker objects of the plan on screen
    let livePlan = null;
    const clear = () => { for (const k of Object.keys(live)) { rt.removeMarker(live[k]); delete live[k]; } };
    P.show = (pl, t) => {
      if (livePlan !== pl) { clear(); livePlan = pl; }
      const f = P.frameAt(pl, t);
      rt.setView(f.view);
      const cam = f.view.cam, ids = new Set();
      for (const m of f.marks) {
        ids.add(m.id);
        if (!live[m.id]) live[m.id] = m.kind === 'army' ? rt.addArmy(m.fid, true) : m.kind === 'general' ? rt.addArmy(m.fid, false) : m.kind === 'standard' ? rt.addStandard(m.fid) : rt.addDust();
        const obj = live[m.id], d = Math.hypot(cam[0] - m.p[0], cam[1] - (m.p[1] || 0), cam[2] - m.p[2]);
        // larger than life, as on every campaign map: grows with the camera distance so the general stays readable
        const s = m.kind === 'dust' ? clamp(d / 30, 0.6, 4) : m.fixed ? clamp(d / 25, 0.8, 4) : clamp(d / 24, 0.5, 6);
        if (m.fixed) { obj.position.set(m.p[0], m.p[1], m.p[2]); obj.scale.setScalar(s); obj.visible = true; }
        else obj.userData.place ? obj.userData.place(m.p, m.dir, s) : (obj.position.set(m.p[0], rt.ground(m.p[0], m.p[2]), m.p[2]), obj.scale.setScalar(s), (obj.visible = true));
      }
      for (const k of Object.keys(live)) if (!ids.has(k)) live[k].visible = false;
      if (hud) hud.frame(f, rt);
      return f;
    };
    P.end = () => { clear(); livePlan = null; if (hud) hud.clear(); rt.setView(rt.viewCampaign()); };

    // ---------------------------------------------------------------- real-time playback
    P.speed = 1;
    P.play = (ev, op = {}) => new Promise((resolve) => {
      const pl = P.plan(ev); let t = 0, last = null;
      if (op.speed) P.speed = op.speed;
      // build the level of detail each shot needs before it starts, so the flight does not stall halfway
      for (const s of pl.cams) for (const v of [s.a, s.b]) rt.prepare(typeof v === 'function' ? v(0.5) : v);
      const step = (now) => {
        if (last != null) t += Math.min(0.25, (now - last) / 1000) * P.speed; // a slow frame slows the shot down, never skips it
        last = now;
        try { P.show(pl, t); rt.render(); if (op.onFrame) op.onFrame(t, pl); }
        catch (e) { console.error('shot failed', ev.kind, e); t = pl.duration; } // one broken shot must not stall the turn
        if (t >= pl.duration) { clear(); livePlan = null; resolve(pl); } else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    P.playAll = async (events, op = {}) => { for (const ev of events) { if (op.onEvent) op.onEvent(ev); await P.play(ev, op); } P.end(); rt.render(); };
    return P;
  };

  if (typeof module === 'object' && module.exports) module.exports = EP;
  else root.EventPresenter = EP;
})(typeof window !== 'undefined' ? window : globalThis);
