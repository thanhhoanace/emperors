// The season played on the map (docs/design/v2-polish.md job 5). After "Hết mùa" nothing happens off-screen: the armies the
// player can see march along their real roads over the ground, ours first, then the others (only armies the View held before
// or after the season: never one it hides); a siege pitches its camp round the town and the town smokes; an attack halts at
// its battle line (the battle comes next) or, between two other sides, meets its foe in a cloud of dust; a retreat hurries
// home; an army leaving Hoài Nam walks off the map. The camera follows each march; a tap skips to the end. A town that changes
// hands gets its moment on its beat: the old standard comes down, the siege camp is struck, the new standard goes up.
// Everything a season in ≤ ~11 s.
//   HuaiNanPlay hooks (src/world/huainan-play.js): 'boot' (the scene holds a change of hands for its beat), 'playback'
//   ({ before, after }), 'beat' ({ taken, view }); with &fast=1 (the e2e) they return at once. Listens to 'skip', 'report',
//   'over', 'season'. Sound, when src/world/huainan-audio.js is there: HuaiNanAudio.cue('march' | 'camp' | 'clash' | 'flag').
//   Captions, when the UI has them: ui.caption(text, { ms }).
// The pure part (which moves play, in what order, for how long) is exported for Node: HuaiNanMapPlay.plan(before, after).
(function (root) {
  const M = {};
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const BUDGET = 10800; // ms for a whole season's playback
  const RANK = { mine: 0, mineAttack: 1, siegeOn: 2, others: 3, retreat: 4 };

  // ---------------------------------------------------------------- the plan (pure)
  // → [{ kind: 'march' | 'siege' | 'attack' | 'retreat' | 'leave' | 'siegeOn', moves: [{ id, fid, arm, from, to, kind, mine, a }],
  //      town?, line?, clash, ms: { march, arrive } }] in the order they play, within BUDGET
  M.plan = (before, after) => {
    const me = after.me || before.me, A = {}, B = {};
    for (const a of before.armies || []) B[a.id] = a;
    for (const a of after.armies || []) A[a.id] = a;
    const taken = (after.report && after.report.taken) || [];
    const moves = [];
    (after.moves || []).forEach((mv, i) => {
      const a = A[mv.id] || B[mv.id]; if (!a) return; // an army neither View shows plays no part
      if (!mv.leave && (!mv.to || (mv.to === mv.from && !mv.attack))) return;
      const siege = (A[mv.id] && A[mv.id].besieging === mv.to) || taken.some((t) => t.town === mv.to && t.siege && t.to === a.fid);
      const kind = mv.leave ? 'leave' : mv.retreat ? 'retreat' : mv.attack ? 'attack' : siege ? 'siege' : 'march';
      const mine = a.fid === me;
      moves.push({ id: mv.id, fid: a.fid, arm: a.arm, from: mv.from, to: mv.to, kind, mine, a, i, rank: kind === 'retreat' ? RANK.retreat : mine ? (kind === 'attack' ? RANK.mineAttack : RANK.mine) : RANK.others });
    });
    moves.sort((x, y) => x.rank - y.rank || x.i - y.i);
    // one shot for the moves of a rank that go to one place together (two of our armies on one town), else one each
    const shots = [];
    for (const m of moves) {
      const last = shots[shots.length - 1];
      if (last && last.rank === m.rank && last.kind === m.kind && last.moves[0].to === m.to && m.kind !== 'leave') last.moves.push(m);
      else shots.push({ kind: m.kind, rank: m.rank, moves: [m] });
    }
    // a siege of ours that goes on (no move this season): a look at the town, with the season's word on it
    const lines = (after.report && after.report.lines) || [];
    for (const a of after.armies || []) {
      if (a.fid !== me || !a.besieging || !B[a.id] || B[a.id].besieging !== a.besieging || moves.some((m) => m.id === a.id)) continue;
      if (shots.some((s) => s.kind === 'siegeOn' && s.town === a.besieging)) continue;
      const tn = ((after.towns || []).find((t) => t.id === a.besieging) || {}).name || '';
      shots.push({ kind: 'siegeOn', rank: RANK.siegeOn, town: a.besieging, fid: a.fid, moves: [], line: (tn && lines.find((l) => l.replace(/^!/, '').startsWith(tn + ' bị vây'))) || null });
    }
    shots.sort((x, y) => x.rank - y.rank);
    // an attack between two other sides is over by now (no battle of ours pending): it ends in a clash
    for (const s of shots) s.clash = s.kind === 'attack' && !after.pending && !s.moves[0].mine;
    // time: a march ~2 s, then what happens on arrival; squeezed to the budget, the tail played all at once past six shots
    const base = (s) => ({ march: s.kind === 'siegeOn' ? 0 : s.kind === 'retreat' ? 1500 : 2100, arrive: s.kind === 'siege' ? 1000 : s.kind === 'siegeOn' ? 1700 : s.clash ? 800 : s.kind === 'attack' ? 350 : 150 });
    let list = shots;
    if (list.length > 6) { const tail = list.slice(5); list = list.slice(0, 5).concat([{ kind: 'many', rank: 9, moves: tail.flatMap((s) => s.moves), clash: false }]); }
    for (const s of list) s.ms = base(s);
    const room = BUDGET - 250 * list.length, sum = () => list.reduce((n, s) => n + s.ms.march + s.ms.arrive, 0);
    if (sum() > room) {
      const k = room / sum(); for (const s of list) { s.ms.march = Math.round(Math.max(900, s.ms.march * k)); s.ms.arrive = Math.round(s.ms.arrive * k); }
      const over = sum() - room, arr = list.reduce((n, s) => n + s.ms.arrive, 0); // the marches at their floor: the arrivals give the rest
      if (over > 0 && arr > 0) for (const s of list) s.ms.arrive = Math.max(0, Math.round(s.ms.arrive * (1 - over / arr)));
    }
    return list;
  };
  // the caption of a move ("Trương Liêu vây Hu Dị"): the general when the View names him, else the side
  M.say = (m, name, side) => {
    const who = (m.a && m.a.gen && m.a.gen.name) || 'Quân ' + (side || '');
    return m.kind === 'leave' ? who + ' rời Hoài Nam' : m.kind === 'retreat' ? who + ' rút về ' + name : m.kind === 'attack' ? who + ' đánh ' + name : m.kind === 'siege' ? who + ' vây ' + name : who + ' tới ' + name;
  };
  // the camera's heading for a move from a to b: across the screen (left to right or right to left), near the map's usual
  // heading (north up, az 0.3), never more than 0.75 from it
  M.azFor = (a, b, home = 0.3) => {
    const dx = b[0] - a[0], dz = b[1] - a[1]; if (Math.hypot(dx, dz) < 1e-3) return home;
    const c1 = Math.atan2(-dz, dx), turn = (x, y) => { let d = (y - x) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return d; };
    const t1 = turn(home, c1), t2 = turn(home, c1 + Math.PI), t = Math.abs(t1) < Math.abs(t2) ? t1 : t2;
    return home + clamp(t, -0.75, 0.75);
  };

  if (typeof module === 'object' && module.exports) { module.exports = M; return; }

  // ---------------------------------------------------------------- the director (browser)
  let E = null, stage = null;
  const cue = (name, o) => { try { if (root.HuaiNanAudio && root.HuaiNanAudio.cue) root.HuaiNanAudio.cue(name, o || {}); } catch (e) { /* the sound is optional */ } };
  const caption = (text, o) => { const ui = E && E.ui; if (text && ui && ui.caption) try { ui.caption(text, o || {}); } catch (e) { /* so are the captions */ } };
  // waits a tap cuts short
  const Stage = () => {
    const st = { skipped: false, waits: new Set() };
    st.wait = (ms) => new Promise((res) => { if (st.skipped || ms <= 0) { res(); return; } const done = () => { clearTimeout(tm); st.waits.delete(done); res(); }; const tm = setTimeout(done, ms * ((E && E.sc && E.sc.play && E.sc.play.slow) || 1)); st.waits.add(done); });
    st.race = (p, ms) => Promise.race([p, st.wait(ms)]);
    st.skip = () => { st.skipped = true; for (const d of [...st.waits]) d(); };
    return st;
  };
  const sideName = (fid) => { const f = E && E.data && E.data.factions && E.data.factions[fid]; return f ? f.short || f.name : ''; };

  // one shot: the camera frames the moves and follows the first; the armies set off a moment apart; what they do on arrival
  const shot = async (sh, stB, after) => {
    const sc = E.sc, P = sc.play, place = sc.place;
    if (sh.kind === 'siegeOn') { // the siege goes on: a slow turn over the town and its camp, the season's word on it
      const p = place[sh.town]; if (!p) return;
      if (!P.hasCamp(sh.town)) { const b = stB[(after.armies.find((a) => a.besieging === sh.town) || {}).id]; P.camp(sh.town, sh.fid, 3000, b ? Math.atan2(b.z - p.z, b.x - p.x) : 0, 0); }
      const az = sc.cam.az, t0 = P.now(), ms = sh.ms.arrive;
      P.rig((now) => ({ t: [p.x, p.z], dist: 24, az: az + 0.3 * clamp((now - t0) / ms, 0, 1), el: 0.6, k: 2.6 }));
      caption(sh.line, { ms });
      await stage.wait(ms);
      return;
    }
    const legs = [];
    for (const m of sh.moves) {
      const cur = P.at(m.id); if (!cur) continue;
      let dest = null, face = null, end = 'park';
      const site = place[m.to];
      if (m.kind === 'leave') { dest = P.exit(m.id, 30); end = 'leave'; }
      else if (m.kind === 'attack' && site) dest = [site.x, site.z];
      else { const s = stB[m.id]; dest = s ? [s.x, s.z] : site ? [site.x, site.z] : null; face = s ? s.face : null; }
      if (!dest) continue;
      let pts = sc.path(cur, dest, m.arm);
      if (m.kind === 'attack' && site) { // halt at the battle line: the town's walls (or the army it strikes) plus its own depth
        const foe = after.armies.find((a) => a.fid !== m.fid && (a.besieging || a.at) === m.to && m.to !== m.from), r = P.townR(m.to) + P.armyR(m.id) * 0.8 + (foe ? P.armyR(foe.id) * 0.9 : 0.6);
        pts = HuaiNanScene.cutEnd(pts, r); const e = pts[pts.length - 1]; face = Math.atan2(site.z - e[1], site.x - e[0]);
      }
      if (pts.length < 2 || HuaiNanScene.pathLen(pts) < 0.4) continue;
      legs.push({ m, pts, face, end, site });
    }
    if (!legs.length) return;
    // the camera: the moves' ground in frame from across their line, a little low; it drifts after the first army
    const lead = legs[0], a0 = lead.pts[0], a1 = lead.pts[lead.pts.length - 1];
    const az = M.azFor(a0, a1), el = 0.66, all = legs.flatMap((l) => [l.pts[0], l.pts[Math.floor(l.pts.length / 2)], l.pts[l.pts.length - 1]]);
    const fit = P.fitPts(all, az, el, 1.15), dist = clamp(fit.dist, 26, 85), cam = { t: fit.t.slice(), dist, az, el };
    P.rig(() => { const p = P.at(lead.m.id) || cam.t; return { t: [cam.t[0] + (p[0] - cam.t[0]) * 0.45, cam.t[1] + (p[1] - cam.t[1]) * 0.45], dist: cam.dist, az: cam.az, el: cam.el, k: 2.2 }; });
    const t0 = P.now() + 280, marchMs = sh.ms.march;
    const runs = legs.map((l, k) => P.march(l.m.id, { pts: l.pts, end: l.end, kind: l.m.kind === 'retreat' ? 'retreat' : 'march', ms: l.m.kind === 'leave' ? marchMs * 1.1 : marchMs, t0: t0 + k * 200, face: l.face }));
    cue('march', { kind: lead.m.kind, arm: lead.m.arm });
    const names = [...new Set(legs.map((l) => M.say(l.m, (l.site && l.site.name) || '', sideName(l.m.fid))))];
    caption(names.join(' · '), { ms: marchMs + sh.ms.arrive });
    await stage.race(Promise.all(runs), marchMs + legs.length * 200 + 700);
    if (stage.skipped) return;
    // on arrival
    const town = lead.site;
    if (sh.kind === 'siege' && town) {
      const s = stB[lead.m.id] || { x: a1[0], z: a1[1] };
      if (!P.hasCamp(lead.m.to)) P.camp(lead.m.to, lead.m.fid, sh.moves.reduce((n, m) => n + ((m.a.units && Object.values(m.a.units).reduce((x, y) => x + y, 0)) || 3000), 0), Math.atan2(s.z - town.z, s.x - town.x), Math.round(sh.ms.arrive * 1.1));
      cue('camp');
      cam.t = [town.x + (cam.t[0] - town.x) * 0.4, town.z + (cam.t[1] - town.z) * 0.4]; cam.dist = Math.max(24, dist * 0.8); // in closer on the town as the camp goes up
    } else if (sh.clash) {
      const e = a1; P.clash(e[0] + Math.cos(lead.face || 0) * P.armyR(lead.m.id) * 0.7, e[1] + Math.sin(lead.face || 0) * P.armyR(lead.m.id) * 0.7, 1);
      cue('clash');
    }
    await stage.wait(sh.ms.arrive);
  };

  M.playback = async ({ before, after }, env) => {
    E = env;
    const sc = env.sc, P = sc && sc.play;
    if (env.fast || !P) return;
    P.flushBeats(); P.orders(false);
    const shots = M.plan(before, after), stB = P.stands(after);
    stage = Stage();
    try {
      for (const sh of shots) { if (stage.skipped) break; if (sh.kind === 'many') await shot(Object.assign({}, sh, { kind: 'march' }), stB, after); else await shot(sh, stB, after); }
    } finally {
      P.endRig(); P.finish();
      // everyone to their stands (a change of hands waits for its beat); with a battle of ours next, the attackers wait at their lines
      if (!after.pending) sc.sync(after);
      const next = after.pending || ((after.report && after.report.taken) || []).length;
      if (!next && shots.length) sc.overview();
      stage = null;
    }
  };

  M.beat = async ({ taken }, env) => {
    E = env;
    const sc = env.sc, P = sc && sc.play;
    if (!P) return;
    if (env.fast) { P.flushBeats(); return; }
    const p = sc.place[taken.town]; if (!p) return;
    stage = Stage();
    try {
      // a short move in, low over the town, turning slowly while the standards change
      const az = sc.cam.az + 0.2, t0 = P.now(), ms = 3400, R = P.townR(taken.town) || 2.3;
      P.rig((now) => ({ t: [p.x, p.z], dist: clamp(R * 9, 18, 30), az: az + 0.32 * clamp((now - t0) / ms, 0, 1), el: 0.5, k: 2.8 }));
      await stage.wait(500);
      await stage.race(P.beat(taken.town, { ms: 2600, onSwap: () => cue('flag', { town: taken.town, to: taken.to }) }), 3000);
      await stage.wait(350);
    } finally {
      if (stage && stage.skipped) P.finish();
      P.endRig(); stage = null;
    }
  };

  root.HuaiNanMapPlay = M;
  const HP = root.HuaiNanPlay;
  if (!HP || !HP.hook) return; // a harness without the page's loop: it calls M.playback and M.beat itself
  HP.hook('boot', (env) => { E = env; if (!env.fast && env.sc && env.sc.play) env.sc.play.hold = true; });
  HP.hook('playback', M.playback);
  HP.hook('beat', M.beat);
  HP.on('skip', () => { if (stage) stage.skip(); });
  for (const t of ['report', 'over', 'season']) HP.on(t, () => { if (E && E.sc && E.sc.play && !stage) E.sc.play.flushBeats(); });
})(typeof window !== 'undefined' ? window : globalThis);
