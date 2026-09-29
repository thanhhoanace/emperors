// Battle cinema (src/world/huainan-cinema.js; docs/design/v2-polish.md, job 1): the "watch" half of every battle of the
// Hoài Nam demo. The rules fight a battle turn by turn on a 3 × 6 board (src/engine/battle.js); the map shows that board
// as figurine blocks. Here each battle of ours also plays as shots at 1 unit = 1 m on the page's own renderer, drawn
// instead of the map while a hook runs and handed back exactly as it was: the opening (both hosts deployed by lane, the
// banners, the general; at a siege the approach to the walls), one shot a turn (its biggest moment: a charge, a volley, a
// fire, the ladders or the ram, a breach, a wing breaking, else the clash with most losses, else the advance) and the
// result (the victor's standard on the gate, or the loser falling back). Nothing is invented: every man, move, loss,
// fire and flag comes from the Battle states before and after the turn and the turn's log; the line under the picture
// is the log's own (EmperorsBattle.say).
//
//   HuaiNanPlay hooks (registered at load): boot (lazy-loads the 1 m modules when the page is idle and warms the plants),
//   battleOpen, battleTurn, battleResult; HuaiNanPlay.on('skip') ends the shot at once; env.fast: every hook returns.
//   const cin = HuaiNanCinema.create({ renderer, W, H, quality, data, cities, Battle?, fromOf?, wallsOf?, season? })
//     data: data/scenario/huainan.json · cities: data/scenario/huainan-cities.json · Battle: EmperorsBattle (say, the log)
//     await cin.open(bt) · await cin.turn(before, after) · await cin.result(lb)   build, then play a shot on the canvas
//     await cin.prepare(kind, ctx) → shot · cin.frame(shot, t) (draw it at t seconds: the harness) · cin.measure()
//     cin.skip() · cin.end() (dispose the battle) · cin.stats() · cin.dispose()
//   Pure (Node, tests/huainan-cinema.test.mjs): HuaiNanCinema.season(calendar), .cityDef(json, id, walls),
//     .sideOf(towns, site, from, riverSides), .beat(before, after, me, Battle), .caption(beat, …), .resultOf(lb, …), .SHOTS
// Sites: a siege is the town itself (Battle.siege on its data/scenario/huainan-cities.json layout at the lũy it has now,
// the besiegers' camp on the attacker's side); a field battle is FieldBattle.create (job 2) when the page has it and it
// exposes a frame for the wings, else the ground before the town without a camp. Crowd motion (crowd.move / new loops)
// and sound (HuaiNanAudio.cue) are used when present; captions go to ui.caption when the UI has it, else to our own line.
// Budget (decisions/0005): the site's camp and the stage share the tier's figure cap (Battle's TIER); measured by
// cin.measure() and docs/design/prototypes/cinema.html (?measure=1).
(function (root) {
  'use strict';
  const HC = {};
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const SEASONS = ['Xuân', 'Hạ', 'Thu', 'Đông'];
  const ARM = { bo: 'Bộ', cung: 'Cung', ky: 'Kỵ', thuy: 'Thủy' }, LANE = ['trái', 'giữa', 'phải'];
  const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  // seconds a shot lasts (the plan: open 4–6, a turn 3–6, the result 4–5)
  HC.SHOTS = { open: 5.4, charge: 4.8, volley: 4.6, melee: 4.6, fire: 5, breach: 5, rout: 4.4, advance: 4, hold: 3.4, firefail: 3.4, leave: 3.4, result: 4.8 };
  // the audio cue of a shot and when it sounds (seconds into it)
  HC.CUES = { open: [['horn', 0.25]], charge: [['charge', 0.1], ['clash', 2.3]], volley: [['volley', 0.2]], melee: [['clash', 0.3]], fire: [['fire', 0.2]], breach: [['breach', 0.3]], rout: [['rout', 0.2]], advance: [['horn', 0.3]], hold: [], firefail: [], leave: [] };

  // ---------------------------------------------------------------- pure: what a shot shows
  HC.season = (calendar) => { const s = String(calendar || '').trim().split(/\s+/)[0]; return SEASONS.indexOf(s) >= 0 ? s : 'Thu'; };
  // a town's layout at the lũy it has now: the wall's height, the khuyết and the moat by the byWalls table
  HC.cityDef = (json, id, walls) => {
    const c = json && json.cities && json.cities[id]; if (!c) return null;
    const lv = clamp(Math.round(walls == null ? c.walls ?? 1 : walls), 0, 4), B = json.byWalls || {}, def = JSON.parse(JSON.stringify(c));
    def.id = id; def.walls = lv;
    if (B.wallH) def.wallH = B.wallH[lv];
    if (B.que) def.que = B.que[lv];
    if (B.moat) { if (B.moat[lv]) def.moat = JSON.parse(JSON.stringify(B.moat[lv])); else delete def.moat; }
    return def;
  };
  // the side of the town the attack comes from: toward `from` (a town id, or [x, z] on the map; z south), unless a river runs there
  HC.sideOf = (towns, site, from, riverSides) => {
    const T0 = (towns || []).find((t) => t.id === site), rivers = riverSides || '', pos = (f) => (Array.isArray(f) ? f : ((towns || []).find((t) => t.id === f) || {}).xz);
    const order = [], a = T0 && T0.xz, b = from != null ? pos(from) : null;
    if (a && b) {
      const dx = b[0] - a[0], dz = b[1] - a[1], h = dx > 0 ? 'e' : 'w', v = dz > 0 ? 's' : 'n';
      if (Math.abs(dx) > Math.abs(dz)) order.push(h, v); else order.push(v, h);
      order.push(h === 'e' ? 'w' : 'e', v === 's' ? 'n' : 's');
    }
    order.push('s', 'e', 'w', 'n');
    return order.find((s) => rivers.indexOf(s) < 0) || 's';
  };
  // the biggest moment of the last turn fought: the log's events and the wings' own marks, scored; a turn where nothing
  // hit anyone is the advance (a wing moved) or the lines holding. Several turns at once (the rest of a battle skipped):
  // the last of them, the one the state after shows.
  HC.beat = (before, after, me, Battle) => {
    const b = after.b, log = b.log[b.log.length - 1] || { turn: b.turn, ev: [] }, ev = log.ev || [], W = {};
    for (const w of b.wings) W[w.id] = w;
    const prev = {}; for (const w of (before && before.b ? before.b.wings : [])) prev[w.id] = w;
    const size = (id) => (W[id] ? W[id].start : 0), mine = (side) => (side === me ? 6 : 0), c = [];
    for (const e of ev) {
      if (e.kind === 'breach') c.push({ kind: 'breach', score: 100 + mine(e.side), side: e.side, wing: e.wing, lane: e.lane, ev: e });
      else if (e.kind === 'rout') c.push({ kind: 'rout', score: 88 + Math.min(8, size(e.wing) / 400) + mine(e.side), side: e.side, wing: e.wing, lane: e.lane, ev: e });
      else if (e.kind === 'fire') c.push({ kind: 'fire', score: 80 + Math.min(10, e.loss / 100), side: e.side, wing: e.wing, target: e.target, lane: e.lane, ev: e });
      else if (e.kind === 'melee') {
        const a = W[e.a], d = W[e.d], rider = e.charge ? [a, d].find((w) => w && w.arm === 'ky' && w.charge) : null, loss = e.lossA + e.lossD;
        const sideOf = rider ? rider.side : me === 'D' ? 'D' : 'A', wing = rider ? rider.id : sideOf === 'A' ? e.a : e.d, target = wing === e.a ? e.d : e.a;
        c.push({ kind: rider ? 'charge' : 'melee', score: (rider ? 70 : e.flankA || e.flankD ? 58 : 44) + Math.min(24, loss / 60), side: rider ? rider.side : sideOf, wing, target, lane: e.lane, ev: e });
      } else if (e.kind === 'volley') {
        const sh = b.wings.filter((w) => w.side === e.side && w.shot && !w.gone).sort((x, y) => y.men - x.men)[0];
        if (sh) c.push({ kind: 'volley', score: 34 + Math.min(20, e.loss / 40) + mine(e.side) / 2, side: e.side, wing: sh.id, target: sh.shot, lane: sh.lane, ev: e });
      } else if (e.kind === 'fire_fail') c.push({ kind: 'firefail', score: 12, side: e.side, ev: e });
      else if (e.kind === 'leave') c.push({ kind: 'leave', score: 14, side: e.side, wing: e.wing, ev: e });
    }
    if (!c.some((x) => x.score >= 20)) {
      const moved = b.wings.filter((w) => prev[w.id] && !w.gone && (prev[w.id].row !== w.row || prev[w.id].lane !== w.lane)).sort((x, y) => mine(y.side) - mine(x.side) || y.men - x.men)[0];
      if (moved) c.push({ kind: 'advance', score: 20, side: moved.side, wing: moved.id, lane: moved.lane, ev: null });
      else c.push({ kind: 'hold', score: 5, side: me || 'A', lane: 1, ev: null });
    }
    c.sort((x, y) => y.score - x.score);
    const best = c[0];
    best.turn = log.turn; best.text = HC.caption(best, b, me, Battle);
    return best;
  };
  // the line under the shot: the log's own words for the event, or what the state says of a move
  HC.caption = (beat, b, me, Battle) => {
    const who = (side) => (me ? (side === me ? 'ta' : 'địch') : side === 'A' ? 'bên đánh' : 'bên thủ'), W = {};
    for (const w of b.wings) W[w.id] = w;
    if (beat.ev && Battle && Battle.say) { const s = Battle.say(b, beat.ev, me); if (s) return s; }
    if (beat.kind === 'advance') { const w = W[beat.wing]; return w ? ARM[w.arm] + ' ' + who(w.side) + (b.siege && w.side === 'A' && w.row === 3 ? ' tiến sát chân thành' : ' tiến lên') + ', làn ' + LANE[w.lane] + '.' : ''; }
    if (beat.kind === 'hold') return 'Hai bên giữ trận.';
    return '';
  };
  // the end of a battle as the player reads it: who won, the town, the losses (Battle.outcome's)
  HC.resultOf = (lb, names) => {
    const b = lb.b, win = (lb.outcome && lb.outcome.win) || (b.over && b.over.win) || 'draw', me = lb.me, plan = lb.plan || {}, site = (names && names[plan.site]) || plan.site || '';
    const town = !!(plan.defender && plan.defender.town), took = win === 'A' && town;
    const good = win === me, loss = lb.outcome && lb.outcome.losses, foe = me === 'A' ? 'D' : 'A';
    let text;
    if (win === 'draw') text = 'Bất phân thắng bại ở ' + site + '.';
    else if (me === 'A') text = good ? (took ? site + ' về tay ta.' : 'Thắng trận ở ' + site + '.') : b.siege ? 'Không hạ được ' + site + '.' : 'Thua trận ở ' + site + '.';
    else text = good ? (b.siege ? 'Giữ được ' + site + '.' : 'Đẩy lui địch ở ' + site + '.') : took ? site + ' thất thủ.' : 'Thua trận ở ' + site + '.';
    if (loss) text += ' Ta mất ' + fmt(loss[me] || 0) + ', địch mất ' + fmt(loss[foe] || 0) + '.';
    return { win, good, took, text, cue: win === 'draw' ? 'horn' : good ? 'victory' : 'defeat' };
  };
  // the wings as the stage takes them (the state's own fields; the turn's marks are on the state after it)
  HC.wings = (b, clear) => b.wings.map((w) => ({ id: w.id, side: w.side, arm: w.arm, men: w.men, start: w.start, lane: w.lane, row: w.row, gone: !!w.gone, routed: !!w.routed, left: !!w.left,
    fought: !clear && !!w.fought, hit: w.hit || 0, shot: clear ? null : w.shot || null, burnt: !clear && !!w.burnt, breach: !!w.breach, charge: !clear && !!w.charge, flank: !clear && !!w.flank }));
  HC.fromOf = (b) => { const o = {}; for (const w of b.wings) o[w.id] = { lane: w.lane, row: w.row, gone: !!w.gone }; return o; };

  if (typeof module === 'object' && module.exports) module.exports = HC;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  root.HuaiNanCinema = HC;

  // ---------------------------------------------------------------- the 1 m modules, loaded when the page is idle (or the first battle)
  const script = document.currentScript, BASE = script && script.src ? script.src.replace(/src\/world\/huainan-cinema\.js(\?.*)?$/, '') : '';
  const DEPS = [['Nature', 'src/world/nature.js'], ['Crowd', 'src/world/crowd.js'], ['Battle', 'src/world/battle.js']];
  let loading = null;
  const loadScript = (src) => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.async = false; s.onload = ok; s.onerror = () => no(new Error('cannot load ' + src)); document.head.appendChild(s); });
  HC.load = () => (loading = loading || DEPS.reduce((p, [g, src]) => p.then(() => (window[g] && (g !== 'Battle' || window[g].stage) ? null : loadScript(BASE + src))), Promise.resolve()));

  const T = window.THREE;
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
  const lerp3 = (a, b, e) => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const hexOf = (c) => (typeof c === 'string' ? parseInt(c.replace('#', ''), 16) : c);
  // the sky and the light by season: autumn is the approved golden hour of the siege prototype; the others lean from it
  const SKY = {
    Thu: { zen: [0.1, 0.2, 0.42], hor: [0.84, 0.68, 0.52], warm: [1.2, 0.58, 0.26], cloud: 0.55, sun: [1.0, 0.72, 0.46], sunI: 2.35, hemi: 0.42, atmos: 0xa7a8ad, dir: [-0.82, 0.36, 0.3] },
    Xuân: { zen: [0.12, 0.25, 0.48], hor: [0.8, 0.76, 0.66], warm: [1.1, 0.7, 0.4], cloud: 0.5, sun: [1.0, 0.82, 0.62], sunI: 2.25, hemi: 0.48, atmos: 0xaab4b8, dir: [-0.8, 0.44, 0.34] },
    Hạ: { zen: [0.09, 0.24, 0.52], hor: [0.8, 0.78, 0.7], warm: [1.1, 0.78, 0.5], cloud: 0.45, sun: [1.0, 0.9, 0.74], sunI: 2.5, hemi: 0.5, atmos: 0xb2b8bc, dir: [-0.72, 0.56, 0.36] },
    Đông: { zen: [0.2, 0.26, 0.36], hor: [0.72, 0.72, 0.74], warm: [0.95, 0.72, 0.52], cloud: 0.75, sun: [0.95, 0.86, 0.76], sunI: 1.8, hemi: 0.55, atmos: 0xb0b4ba, dir: [-0.84, 0.3, 0.3] },
  };

  // ---------------------------------------------------------------- the overlay: letterbox, fades, the title card, a caption line
  const CSS = `.hnc{position:fixed;inset:0;z-index:30;pointer-events:none;font-family:"Noto Serif","Noto Serif CJK SC","Liberation Serif",Georgia,serif;color:#efe3c8}
.hnc.tap{pointer-events:auto}
.hnc-bar{position:absolute;left:0;right:0;height:clamp(18px,8.5vh,70px);background:#07060a;transition:transform .45s cubic-bezier(.3,.7,.2,1);will-change:transform}
.hnc-bar.top{top:0;transform:translateY(-102%)}.hnc-bar.bot{bottom:0;transform:translateY(102%)}
.hnc.on .hnc-bar{transform:none}
.hnc-black{position:absolute;inset:0;background:#07060a;opacity:0;transition:opacity .3s ease;will-change:opacity}
.hnc-black.on{opacity:1}
.hnc-tag{position:absolute;left:clamp(12px,3vw,28px);top:50%;transform:translateY(-50%);font:600 12px/1 "Be Vietnam Pro","Noto Sans",sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#cdb98c;opacity:.9;white-space:nowrap}
.hnc-cap{position:absolute;left:50%;bottom:calc(clamp(18px,8.5vh,70px) + 10px);transform:translate(-50%,6px);width:max-content;max-width:min(92vw,820px);text-align:center;font-size:clamp(13px,2.1vw,18px);line-height:1.35;letter-spacing:.02em;
  text-shadow:0 1px 2px #000,0 0 12px rgba(0,0,0,.85);opacity:0;transition:opacity .35s ease,transform .35s ease}
.hnc-cap.on{opacity:1;transform:translate(-50%,0)}
.hnc-title{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;opacity:0;transition:opacity .4s ease}
.hnc-title.on{opacity:1}
.hnc-title .t0{font:600 11px/1 "Be Vietnam Pro","Noto Sans",sans-serif;letter-spacing:.32em;text-transform:uppercase;color:#a8946a}
.hnc-title .t1{font-weight:700;font-size:clamp(26px,6vw,46px);letter-spacing:.14em;color:#f1e4c4}
.hnc-title .t2{display:flex;align-items:center;gap:14px;font-size:clamp(13px,2vw,17px);color:#d9c9a4}
.hnc-seal{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:3px;font:700 16px/1 "Noto Serif TC","Noto Serif CJK TC",serif;color:#f3ead6;box-shadow:inset 0 0 0 1px rgba(255,255,255,.25)}
.hnc-shim{position:relative;width:min(46vw,300px);height:2px;overflow:hidden;background:rgba(226,191,108,.14);margin-top:8px}
.hnc-shim i{position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(240,210,140,.95),transparent);transform:translateX(-100%);animation:hnc-sh 1.25s linear infinite;will-change:transform}
@keyframes hnc-sh{to{transform:translateX(100%)}}
.hnc-res{position:absolute;left:50%;top:calc(clamp(18px,8.5vh,70px) + 16px);transform:translateX(-50%);font-weight:700;font-size:clamp(18px,3.6vw,30px);letter-spacing:.12em;text-shadow:0 2px 3px #000,0 0 18px rgba(0,0,0,.8);opacity:0;transition:opacity .5s ease}
.hnc-res.on{opacity:1}.hnc-res.good{color:#f3d58f}.hnc-res.bad{color:#e9b3a4}`;
  const overlay = () => {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    const el = document.createElement('div'); el.className = 'hnc';
    el.innerHTML = '<div class="hnc-black"></div><div class="hnc-bar top"><span class="hnc-tag"></span></div><div class="hnc-bar bot"></div><div class="hnc-cap"></div><div class="hnc-res"></div>' +
      '<div class="hnc-title"><div class="t0"></div><div class="t1"></div><div class="t2"></div><div class="hnc-shim"><i></i></div></div>';
    document.body.appendChild(el);
    const q = (s) => el.querySelector(s), E = { root: el, black: q('.hnc-black'), tag: q('.hnc-tag'), cap: q('.hnc-cap'), res: q('.hnc-res'), title: q('.hnc-title') };
    const seal = (f) => `<span class="hnc-seal" style="background:${f.color || '#777'}">${f.glyph || '軍'}</span>`;
    return {
      E,
      bars: (on) => el.classList.toggle('on', on),
      black: (on) => E.black.classList.toggle('on', on),
      tag: (t) => { E.tag.textContent = t || ''; },
      title: (t) => { if (!t) { E.title.classList.remove('on'); return; } E.title.querySelector('.t0').textContent = t.kicker || ''; E.title.querySelector('.t1').textContent = t.name || ''; E.title.querySelector('.t2').innerHTML = `${seal(t.A)}<span>${t.a || ''}</span><span style="opacity:.6">⚔</span><span>${t.d || ''}</span>${seal(t.D)}`; E.title.classList.add('on'); },
      caption: (t) => { if (t) E.cap.textContent = t; E.cap.classList.toggle('on', !!t); },
      result: (t, good) => { if (t) { E.res.textContent = t; E.res.className = 'hnc-res on ' + (good ? 'good' : 'bad'); } else E.res.className = 'hnc-res'; },
      tap: (on, fn) => { el.classList.toggle('tap', !!on); el.onpointerup = on ? fn : null; },
      remove: () => { el.remove(); st.remove(); },
    };
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------------------------------------------------------------- the director
  HC.create = function (o) {
    const renderer = o.renderer, q = o.quality || null, tier = (q && q.tier) || 'high', data = o.data, B = window.Battle, N = window.Nature;
    const W = o.W || renderer.domElement.clientWidth, Hh = o.H || renderer.domElement.clientHeight, EB = o.Battle || window.EmperorsBattle || null;
    const FAC = data.factions || {}, colorOf = (fid) => hexOf((FAC[fid] && FAC[fid].color) || '#8a7a55'), glyphOf = (fid) => (FAC[fid] && FAC[fid].glyph) || '守';
    const names = {}; for (const t of data.towns || []) names[t.id] = t.name;
    const colors = { neutral: 0x8a7a55 }; for (const fid of Object.keys(FAC)) colors[fid] = colorOf(fid);
    let rig = null, site = null, stage = null, skipping = false, season = o.season || 'Thu', timers = [], shotNo = 0;
    const ui = o.overlay === false ? null : overlay();

    // the rig: scene, camera, sky, the light by season, the lens (on a target of our own, let go after each battle)
    const makeRig = () => {
      const scene = new T.Scene(), camera = new T.PerspectiveCamera(40, W / Hh, 1.2, 16000);
      const U = { uSun: { value: new T.Vector3() }, uZen: { value: new T.Vector3() }, uHor: { value: new T.Vector3() }, uWarm: { value: new T.Vector3() }, uCloud: { value: 0.55 } };
      const skyMat = () => new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, uniforms: U,
        vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
        fragmentShader: `varying vec3 vD; uniform vec3 uSun, uZen, uHor, uWarm; uniform float uCloud; ${N.GLSL}
          void main(){ vec3 d = normalize(vD); float h = clamp(d.y, -.1, 1.), s = max(dot(d, normalize(uSun)), 0.);
            vec3 c = mix(uHor, uZen, pow(max(h, 0.), .45));
            c = mix(c, uWarm, pow(s, 2.2) * .85 * (1. - smoothstep(.02, .45, h)));
            c += vec3(1.4, .9, .5) * pow(s, 60.) + vec3(4., 3., 2.) * pow(s, 900.);
            float cl = smoothstep(.55, .8, fbm2(d.xz / max(d.y, .06) * 1.4 + 3.)) * smoothstep(.02, .18, d.y) * (1. - smoothstep(.4, .7, d.y));
            c = mix(c, mix(uHor * 1.1, uWarm * .9, pow(s, 2.)), cl * uCloud);
            if (d.y < 0.) c = uHor * .8;
            gl_FragColor = vec4(c, 1.); }` });
      const sky = new T.Mesh(new T.SphereGeometry(15000, 48, 24), skyMat()); scene.add(sky);
      const sunDir = new T.Vector3(), sunColor = new T.Color();
      const sun = new T.DirectionalLight(0xffffff, 2.35), hemi = new T.HemisphereLight(new T.Color(0.5, 0.6, 0.8), new T.Color(0.3, 0.24, 0.16), 0.42);
      const shadow = q ? q.shadow : 4096; sun.castShadow = shadow > 0;
      if (shadow) { sun.shadow.mapSize.set(shadow, shadow); sun.shadow.bias = -0.00025; sun.shadow.normalBias = 0.6; }
      scene.add(sun, sun.target, hemi);
      // K.lens renders to the target it is given through this renderer: ours, so it can be let go between battles
      const size = renderer.getDrawingBufferSize(new T.Vector2()), target = new T.WebGLRenderTarget(size.x, size.y, { type: T.HalfFloatType, samples: 4 });
      target.depthTexture = new T.DepthTexture(size.x, size.y); target.depthTexture.type = T.UnsignedIntType;
      const proxy = { getDrawingBufferSize: (v) => renderer.getDrawingBufferSize(v), setRenderTarget: (t) => renderer.setRenderTarget(t ? target : null), render: (s, c) => renderer.render(s, c) };
      const lens = K.lens(proxy, scene, camera, { focus: 300, range: 300, maxBlur: 3, ao: 0.8, aoRadius: 2, vignette: 0.3, contrast: 1.07, saturation: 1.06, quality: q, atmos: { density: 0.00017, falloff: 0.005, color: 0xa7a8ad, sunColor: 0xe0a070, sunDir } });
      lens.uniforms.tColor.value = target.texture; lens.uniforms.tDepth.value = target.depthTexture; lens.uniforms.band.value.set(0.5, 0.5);
      let env = null;
      const setSeason = (s) => {
        const k = SKY[s] || SKY.Thu; season = SKY[s] ? s : 'Thu';
        sunDir.set(...k.dir).normalize(); sunColor.setRGB(...k.sun); U.uSun.value.copy(sunDir); U.uZen.value.set(...k.zen); U.uHor.value.set(...k.hor); U.uWarm.value.set(...k.warm); U.uCloud.value = k.cloud;
        sun.color.copy(sunColor); sun.intensity = k.sunI; hemi.intensity = k.hemi; lens.uniforms.atmosCol.value.set(k.atmos); lens.uniforms.sunDirW.value.copy(sunDir);
        const es = new T.Scene(); es.add(new T.Mesh(new T.SphereGeometry(100, 32, 16), skyMat()));
        const pm = new T.PMREMGenerator(renderer); if (env) env.dispose(); env = pm.fromScene(es, 0.03).texture; pm.dispose(); es.children[0].geometry.dispose(); es.children[0].material.dispose();
        R.env = env;
      };
      const HM = HanModels.create({ recv: (m) => m, renderer, colors }); HM.mat.userData.shared = true;
      const R = { scene, camera, sky, sun, sunDir, sunColor, hemi, lens, target, HM, env: null, setSeason, blurK: size.y / 900,
        release: () => { target.dispose(); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } },
        dispose: () => { R.release(); sky.geometry.dispose(); sky.material.dispose(); if (env) env.dispose(); } };
      setSeason(season);
      return R;
    };

    // ---------------------------------------------------------------- the site: land, town, camp, trees (in steps, a frame between)
    // one site a place: the same town and sides and lũy is not built again (the result's battle has no id; the ground is the same)
    const siteKey = (bt) => [bt.plan.site, bt.b.siege ? 's' : 'f', bt.plan.attacker.fid, bt.plan.defender.fid, bt.b.walls].join(':');
    const buildSite = async (bt, onStep) => {
      const key = siteKey(bt); if (site && site.key === key) return site;
      disposeSite();
      if (!rig) rig = makeRig();
      const plan = bt.plan, b = bt.b, siegeOn = !!b.siege, t0 = performance.now(), ms = {};
      const lv = siegeOn ? b.walls : o.wallsOf ? o.wallsOf(plan.site) : null;
      const def = HC.cityDef(o.cities, plan.site, lv); if (!def) throw new Error('no layout for ' + plan.site);
      const from = plan.from || (o.fromOf ? o.fromOf(plan) : null), side = HC.sideOf(data.towns, plan.site, from, def.river && def.river.sides);
      if (o.season) rig.setSeason(o.season); else rig.setSeason(season);
      const mark = (k, t) => { ms[k] = Math.round(performance.now() - t); };
      let t = performance.now();
      const L = B.land(def, side, N); L.season = season; mark('land', t); if (onStep) await onStep('land');
      t = performance.now();
      const env = rig.env, root = new T.Group(); rig.scene.add(root);
      const terrain = N.terrain(L, env, q), water = N.water(L, env), rocks = N.rocks(L, env, q); root.add(terrain, water, rocks); mark('ground', t); if (onStep) await onStep('ground');
      t = performance.now();
      const troops = (u) => ({ bo: (u.bo || 0) + (u.cung || 0), ky: u.ky || 0, thuy: u.thuy || 0 });
      const A = plan.attacker, D = plan.defender, dfid = D.fid || 'local';
      const desc = { attacker: { fid: A.fid, color: colorOf(A.fid), glyph: glyphOf(A.fid), name: (FAC[A.fid] || {}).name || A.fid, troops: troops(A.units || {}) },
        defender: { fid: dfid, color: colorOf(dfid), glyph: glyphOf(dfid), name: (FAC[dfid] || {}).name || dfid, troops: troops(D.units || {}) },
        city: def, ground: L, season, hour: 17.5, mode: 'camp', camp: siegeOn, side };
      const sobj = B.siege(desc, { HM: rig.HM, Nature: N, Crowd: window.Crowd, env, sun: { dir: rig.sunDir, color: rig.sunColor }, q, renderer, camera: rig.camera });
      root.add(sobj.group); mark('town', t); if (onStep) await onStep('town');
      t = performance.now();
      const tops = [];
      rocks.userData.ledges.forEach(([x, yy, z, kind], i) => { const r = N.noise.h2(i, 17); if (kind === 'top') tops.push(r < 0.55 ? [x, z, 3, 7 + r * 9, yy - 0.5] : [x, z, 5, 2 + r * 2, yy - 0.3]); else tops.push(r < 0.3 ? [x, z, 3, 4 + r * 8, yy - 0.8] : [x, z, r < 0.65 ? 5 : 7, 1.6 + r * 1.6, yy - 0.4]); });
      const trees = N.trees(L, env, { dir: rig.sunDir, color: rig.sunColor }, sobj.trees.concat(tops), q); root.add(trees); mark('trees', t);
      site = { key, bt, def, side, siege: siegeOn, L, root, terrain, water, rocks, trees, obj: sobj, ms, buildMs: Math.round(performance.now() - t0) };
      return site;
    };
    const disposeStage = () => { if (stage) { stage.dispose(); stage = null; } };
    const disposeSite = () => {
      disposeStage();
      if (!site) return;
      rig.scene.remove(site.root);
      site.obj.dispose();
      site.root.traverse((m) => { if (!m.isMesh) return; if (m.geometry && !m.geometry.userData.shared) m.geometry.dispose(); for (const mat of [].concat(m.material)) if (mat && !mat.userData.shared) mat.dispose(); });
      if (site.L.landTex) site.L.landTex.dispose();
      site = null;
    };

    // ---------------------------------------------------------------- a shot: its stage and its camera
    const faction = (fid) => ({ fid, color: colorOf(fid), glyph: glyphOf(fid) });
    const stageFor = (sb, spec) => {
      disposeStage();
      const b = sb.b, A = faction(b.A.fid || sb.plan.attacker.fid), D = faction(b.D.fid || sb.plan.defender.fid || 'local');
      stage = B.stage(site.obj, Object.assign({ siege: !!b.siege, A, D, seed: (b.rs || 7) + shotNo * 7919 }, spec));
      site.root.add(stage.group);
      return stage;
    };
    // camera helpers in the frame of the attacked face: u along it, v out from it (metres), h above the ground there
    const camKit = (st) => {
      const F = st.frame, A = st.anchors, ground = (x, z) => F.y(x, z);
      const P = (u, v, h) => { const [x, z] = F.W(u, v); return [x, ground(x, z) + h, z]; };
      const uv = (p) => { const dx = p[0] - F.gx, dz = p[2] - F.gz; return [dx * F.tan[0] + dz * F.tan[1], dx * F.out[0] + dz * F.out[1]]; };
      const off = (p, du, dv, dy, absY) => { const [u, v] = uv(p), [x, z] = F.W(u + du, v + dv); return [x, absY ? p[1] + dy : Math.max(ground(x, z) + 1.6, p[1] + dy), z]; };
      const lift = (p, dy) => [p[0], p[1] + dy, p[2]];
      const mid = (a, b, k = 0.5) => lerp3(a, b, k);
      return { F, A, P, uv, off, lift, mid, ground, side: F.rs };
    };
    // camera paths: a shot is segments, each flying from one eye and aim to another (eased), cuts between them
    const seg = (t0, t1, cam0, cam1, aim0, aim1, fov0 = 40, fov1 = fov0) => ({ t0, t1, cam0, cam1, aim0, aim1, fov0, fov1 });
    const shotCams = (kind, beat, st, sb) => {
      const K = camKit(st), { F, A, P, off, lift, mid } = K, me = sb.me || 'A', d = HC.SHOTS[kind] || 4.5, siegeOn = F.siege;
      const Wg = (id) => A.wings[id], lane = (l) => A.lanes[clamp(l ?? 1, 0, 2)], rs = F.rs;
      const sideSign = (l) => (l === 0 ? -1 : l === 2 ? 1 : 1) * rs; // toward the lane's own outer side
      if (kind === 'open') {
        const back = F.rowV(0), gateAim = siegeOn ? P(0, -60, F.H * 0.5) : P(0, F.rowV(3.5), 2);
        const s1 = seg(0, d * 0.5, P(-70 * rs, back + 170, 78), P(-44 * rs, back + 110, 52), gateAim, lerp3(gateAim, P(0, F.rowV(2), 0), 0.2), 42, 40);
        if (me === 'D' && siegeOn) { const w = lane(1).wall; return [s1, seg(d * 0.5, d, off(w, 34 * rs, -9, 6), off(w, 12 * rs, -9, 5.5), P(0, F.rowV(1), 2), P(-10 * rs, F.rowV(1), 2), 44, 40)]; }
        // behind the centre's front block, its banners before the lens, the walls (or the enemy line) beyond
        const lu = F.laneU(1), lv = F.rowV(1), aim = siegeOn ? P(lu - 12 * rs, 0, F.H * 0.9) : P(lu, F.rowV(4), 3);
        return [s1, seg(d * 0.5, d, P(lu + 26 * rs, lv + 34, 5.5), P(lu + 12 * rs, lv + 24, 4.4), aim, aim, 42, 40)];
      }
      if (kind === 'result') {
        const r = HC.resultOf(sb, names);
        if (siegeOn && r.win === 'A') { const g = A.gateTop || P(0, 0, F.H); return [seg(0, d * 0.55, P(60 * rs, 110, 22), P(44 * rs, 84, 16), lift(g, -2), lift(g, 1), 38, 36), seg(d * 0.55, d, P(-90 * rs, 150, 60), P(-120 * rs, 120, 70), lift(g, -6), lift(g, -4), 40, 42)]; }
        if (siegeOn) { const w = lane(1).wall; return [seg(0, d * 0.55, off(w, 40 * rs, -10, 7), off(w, 20 * rs, -10, 6), P(0, F.rowV(1), 3), P(0, F.rowV(0), 3), 42, 40), seg(d * 0.55, d, P(70 * rs, F.rowV(2) + 40, 12), P(90 * rs, F.rowV(2) + 70, 16), P(0, -10, F.H + 6), P(0, -10, F.H + 8), 40, 38)]; }
        const wn = r.win === 'D' ? 'D' : 'A', std = A.standards[wn] || P(0, F.rowV(wn === 'A' ? 0 : 5), 0), foe = P(0, F.rowV(wn === 'A' ? 4 : 1), 2);
        return [seg(0, d * 0.55, off(std, 20 * rs, wn === 'A' ? 16 : -16, 5), off(std, 6 * rs, wn === 'A' ? 10 : -10, 4.5), foe, foe, 42, 40), seg(d * 0.55, d, P(-160 * rs, F.rowV(2.5), 70), P(-120 * rs, F.rowV(2.5), 60), P(0, F.rowV(2.5), 0), P(0, F.rowV(2.5), 0), 40, 40)];
      }
      const w = Wg(beat.wing), tg = Wg(beat.target), WALL = ['foot', 'breach', 'wall', 'inside'];
      const atWall = siegeOn && ((w && WALL.indexOf(w.type) >= 0) || (tg && WALL.indexOf(tg.type) >= 0)); // a fight at the walls is shot at the walls
      if (kind === 'volley' && w && tg) {
        const up = mid(w.c, tg.c, 0.5); up[1] += 30;
        const fromWall = w.type === 'wall', eye0 = fromWall ? off(w.c, 16 * rs, -10, 6) : off(w.c, 14 * rs, w.side === 'A' ? 26 : -26, 3.2);
        return [seg(0, d * 0.45, eye0, off(eye0, -6 * rs, 0, 0.4), lerp3(w.c, up, 0.5), up, 46, 42), seg(d * 0.45, d, off(tg.c, 34 * rs, tg.side === 'A' ? 30 : -30, 9), off(tg.c, 26 * rs, tg.side === 'A' ? 24 : -24, 7), lift(tg.c, 1), lift(tg.c, 0.5), 42, 40)];
      }
      if (kind === 'charge' && w && tg && !atWall) {
        const track = (t) => { const g = st.offsetOf(w.id); return [w.c[0] + g[0], w.c[1] + g[1], w.c[2] + g[2]]; };
        const s = w.side === 'A' ? 1 : -1;
        // a crane beside the charge, high enough to read the riders against the ground and clear the boats of a ford
        return [seg(0, d * 0.55, (t) => off(track(t), 52 * rs, 14 * s, 16), (t) => off(track(t), 44 * rs, -2 * s, 13), (t) => lift(track(t), 1.5), (t) => lift(track(t), 1.5), 44, 42),
          seg(d * 0.55, d, off(tg.c, 16 * rs, -s * (tg.d / 2 + 18), 3.2), off(tg.c, 10 * rs, -s * (tg.d / 2 + 14), 3), lift(tg.front, 1.5), lift(tg.front, 1.2), 42, 40)];
      }
      if ((kind === 'melee' || kind === 'breach' || kind === 'charge') && (atWall || (siegeOn && !w))) {
        const l = beat.lane ?? 1, Lx = lane(l), ss = sideSign(l);
        if (l === 1 && A.gate) {
          const g = A.gate;
          const v1 = (F.moat ? F.moat[1] : 30) + 44; // clear of the khuyết and the moat
          return kind === 'breach' ? [seg(0, d * 0.5, P(30 * rs, v1 + 16, 9), P(20 * rs, v1, 7), lift(g, 5), lift(g, 4), 42, 40), seg(d * 0.5, d, P(16 * rs, -F.WB / 2 - 60, 10), P(10 * rs, -F.WB / 2 - 44, 8), lift(g, 5), lift(g, 4), 44, 42)]
            : [seg(0, d * 0.5, P(34 * rs, v1 + 12, 8), P(24 * rs, v1, 6.5), lift(g, 4), lift(g, 3), 42, 40), seg(d * 0.5, d, P(-46 * rs, v1 + 34, 24), P(-36 * rs, v1 + 26, 20), lift(g, 5), lift(g, 4), 44, 42)]; // then high outside the gate: the fight at the gate and the wall above it
        }
        const wall = Lx.wall, foot = Lx.foot;
        return kind === 'breach' ? [seg(0, d * 0.5, off(foot, 22 * ss, 42, 3, false), off(foot, 14 * ss, 34, 2.5), lift(wall, 3), lift(wall, 4), 42, 42), seg(d * 0.5, d, off(wall, 34 * ss, -4, 5, true), off(wall, 24 * ss, -4, 4.5, true), lift(wall, 1), lift(wall, 1), 46, 44)]
          : [seg(0, d * 0.5, off(foot, 20 * ss, 36, 2.5), off(foot, 12 * ss, 30, 2.2), lift(wall, 1), lift(wall, 2), 44, 42), seg(d * 0.5, d, off(wall, 18 * ss, -11, 7, true), off(wall, 10 * ss, -11, 6.5, true), off(foot, 0, 8, 0), off(foot, 0, 6, 0), 46, 44)];
      }
      if (kind === 'fire' && tg) {
        const s = tg.side === 'A' ? 1 : -1;
        return [seg(0, d * 0.5, off(tg.c, 60 * rs, -s * 80, 30), off(tg.c, 44 * rs, -s * 64, 24), lift(tg.c, 10), lift(tg.c, 8), 42, 40), seg(d * 0.5, d, off(tg.c, 30 * rs, -s * 24, 6), off(tg.c, 22 * rs, -s * 18, 5), lift(tg.c, 4), lift(tg.c, 5), 42, 42)];
      }
      if (kind === 'rout' && w) {
        const track = () => { const g = st.offsetOf(w.id); return [w.c[0] + g[0], w.c[1] + g[1], w.c[2] + g[2]]; };
        const s = w.side === 'A' ? 1 : -1;
        return [seg(0, d * 0.5, off(w.c, 40 * rs, -s * 20, 8), off(w.c, 34 * rs, -s * 4, 7), () => lift(track(), 1), () => lift(track(), 1), 42, 42), seg(d * 0.5, d, (t) => off(track(t), 10 * rs, -s * 40, 5), (t) => off(track(t), 8 * rs, -s * 30, 4.5), () => lift(track(), 1), () => lift(track(), 1), 44, 44)];
      }
      if ((kind === 'melee' || kind === 'breach') && w) {
        const cp = tg ? mid(w.front, tg.front) : w.front;
        return [seg(0, d * 0.5, off(cp, 56 * rs, 0, 10), off(cp, 44 * rs, 4, 8), lift(cp, 1), lift(cp, 1), 40, 40), seg(d * 0.5, d, off(w.c, 12 * rs, (w.side === 'A' ? 1 : -1) * (w.d / 2 + 16), 3.2), off(w.c, 8 * rs, (w.side === 'A' ? 1 : -1) * (w.d / 2 + 10), 3), lift(cp, 1.4), lift(cp, 1.2), 44, 42)];
      }
      if (kind === 'advance' && w) {
        const track = () => { const g = st.offsetOf(w.id); return [w.c[0] + g[0], w.c[1] + g[1], w.c[2] + g[2]]; }, s = w.side === 'A' ? 1 : -1;
        const aim = siegeOn ? P(F.laneU(w.lane), -10, F.H * 0.7) : P(F.laneU(w.lane), F.rowV(w.side === 'A' ? 4 : 1), 2);
        return [seg(0, d, () => off(track(), 18 * rs, s * (w.d / 2 + 22), 4), () => off(track(), 12 * rs, s * (w.d / 2 + 10), 3.4), aim, aim, 42, 42)];
      }
      // the lines holding, a leave, a failed fire: along our front toward the enemy
      const ours = me === 'A' ? A.standards.A : A.standards.D, look = siegeOn ? P(0, 0, F.H) : P(0, F.rowV(me === 'A' ? 4 : 1), 2);
      const eye = ours ? off(ours, 24 * rs, me === 'A' ? 20 : -20, 6) : P(40 * rs, F.rowV(me === 'A' ? 0 : 5), 8);
      return [seg(0, d, eye, off(eye, -14 * rs, me === 'A' ? -8 : 8, -0.5), look, look, 42, 40)];
    };
    const at = (p, t) => (typeof p === 'function' ? p(t) : p);
    // what can stand between the camera and its aim: the site's solid, single meshes (walls, towers, buildings); not the
    // ground (the eye keeps above it), the water, the crowds or the trees (instanced), nor anything see-through
    const ray = new T.Raycaster(), rA = new T.Vector3(), rD = new T.Vector3();
    const blockers = () => {
      if (site.blockers) return site.blockers;
      const out = []; site.obj.group.traverse((m) => { if (m.isMesh && !m.isInstancedMesh && m.visible && !(m.material && m.material.transparent) && m.geometry && m.geometry.attributes.position) out.push(m); });
      return (site.blockers = out);
    };
    const cut = (eye, aim) => {
      rA.set(aim[0], aim[1], aim[2]); rD.set(eye[0] - aim[0], eye[1] - aim[1], eye[2] - aim[2]);
      const d = rD.length(); if (d < 2) return null;
      ray.set(rA, rD.normalize()); ray.near = 1.5; ray.far = d;
      const hit = ray.intersectObjects(blockers(), false)[0];
      return hit && hit.distance < d - 1 ? { at: hit.distance, d } : null;
    };
    // blocked: the camera rises (a crane keeps the framing) until it sees over; only when no height clears does it come in
    const pull = (eye, aim) => {
      const c = cut(eye, aim); if (!c) return { k: 1, dy: 0 };
      for (const dy of [8, 16, 30, 55]) if (!cut([eye[0], eye[1] + dy, eye[2]], aim)) return { k: 1, dy };
      return { k: Math.max(0.2, (c.at - 3) / c.d), dy: 0 };
    };
    const place = (shot, t) => {
      const cams = shot.cams, s = cams.find((c) => t >= c.t0 && t < c.t1) || cams[cams.length - 1], e = ease((t - s.t0) / Math.max(0.01, s.t1 - s.t0));
      const cam = lerp3(at(s.cam0, t), at(s.cam1, t), e), aim = lerp3(at(s.aim0, t), at(s.aim1, t), e), fov = s.fov0 + (s.fov1 - s.fov0) * e;
      // a hand on the camera: a slow drift, never a shake
      const wob = 0.18 * Math.sin(t * 1.3 + shot.seed) + 0.1 * Math.sin(t * 2.9 + shot.seed * 2);
      const C = rig.camera, Ld = site.L, g = Ld.h(cam[0], cam[2]);
      // never under the water (the moat, a river: the plane lies at L.WATER everywhere) nor inside the walls: an eye at the
      // attacked face or just behind it, below its walk, goes up onto the walk
      let y = Math.max(cam[1], g + 1.4, Number.isFinite(Ld.WATER) ? Ld.WATER + 1.6 : -Infinity);
      const F = stage && stage.frame;
      if (F && F.siege) {
        const dx = cam[0] - F.gx, dz = cam[2] - F.gz, u = dx * F.tan[0] + dz * F.tan[1], v = dx * F.out[0] + dz * F.out[1];
        const u0 = Math.min(F.sec[0][0], F.sec[2][0]) - 30, u1 = Math.max(F.sec[0][1], F.sec[2][1]) + 30;
        if (v < F.WB / 2 + 3 && v > -(F.WB / 2 + 90) && u > u0 && u < u1 && y < F.wallY + 5) y = F.wallY + 7;
      }
      // and never behind a wall or a roof: the line from the aim to the eye, if the town cuts it, brings the eye in front of the
      // cut (a third-person camera's rule); checked every few frames, the pull kept between checks
      const eye = [cam[0], y, cam[2]], n = (shot.fixN = (shot.fixN || 0) + 1);
      if (n % 5 === 1 || !shot.fix) shot.fix = pull(eye, aim);
      const k = shot.fix.k;
      shot.lift = (shot.lift || 0) + ((shot.fix.dy || 0) - (shot.lift || 0)) * 0.25; eye[1] += shot.lift; // eased, so a rise is a move, not a jump
      if (k < 1) { eye[0] = aim[0] + (eye[0] - aim[0]) * k; eye[1] = Math.max(aim[1] + (eye[1] - aim[1]) * k + 1.5, Ld.h(eye[0], eye[2]) + 1.4); eye[2] = aim[2] + (eye[2] - aim[2]) * k; }
      C.fov = fov; C.aspect = W / Hh; C.position.set(eye[0] + wob * 0.4, eye[1], eye[2] - wob * 0.3); C.lookAt(aim[0], aim[1] + wob * 0.2, aim[2]); C.updateProjectionMatrix(); C.updateMatrixWorld();
      const dist = C.position.distanceTo(new T.Vector3(...aim)), ext = clamp(dist * 1.1, 90, 420), sun = rig.sun;
      sun.position.set(aim[0], 0, aim[2]).addScaledVector(rig.sunDir, 3000); sun.target.position.set(aim[0], 0, aim[2]); sun.target.updateMatrixWorld();
      Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 100, far: 6000 }); sun.shadow.camera.updateProjectionMatrix();
      const LU = rig.lens.uniforms;
      LU.focus.value = dist; LU.range.value = Math.max(60, dist * 1.3); LU.maxBlur.value = q && !q.dof ? 0 : 2.4 * rig.blurK;
      LU.aoStrength.value = q && !q.ssao ? 0 : 0.8; LU.aoRadius.value = Math.max(1.2, dist * 0.008);
      LU.near.value = C.near; LU.far.value = C.far; LU.projScale.value = renderer.getDrawingBufferSize(new T.Vector2()).y / (2 * Math.tan(T.MathUtils.degToRad(C.fov) / 2));
      rig.sky.position.copy(C.position);
      site.trees.userData.focus(C); site.rocks.userData.focus(C); site.obj.focus(C); stage.focus(C);
    };
    const frame = (shot, t) => {
      const dt = Math.max(0, t - (shot.last ?? t)); shot.last = t;
      stage.tick(t - stage.time); site.obj.tick(dt);
      site.trees.userData.U.uTime.value = t + shot.seed; site.water.userData.U.uTime.value = t + shot.seed;
      place(shot, t);
      const r = renderer, ex = r.toneMappingExposure; r.toneMappingExposure = 0.92; rig.lens.render(); r.toneMappingExposure = ex;
    };
    // a shot: what it is about, its stage, its cameras, its line and its cues (kind: open | turn | result)
    const prepare = async (kind, ctx, onStep) => {
      const sb = kind === 'turn' ? ctx.after : kind === 'result' ? ctx.lb : ctx.bt;
      await buildSite(kind === 'open' ? ctx.bt : sb, onStep);
      shotNo++;
      const b = sb.b, me = sb.me || 'A', plan = sb.plan;
      let beat = { kind }, spec = { dur: HC.SHOTS[kind] || 5 }, line = '', res = null, shotKind = kind;
      if (kind === 'open') {
        spec = { wings: HC.wings(b, true), from: null, beat, dur: HC.SHOTS.open, standards: { gate: b.siege ? 'D' : null } };
        const ga = plan.attacker.gen, gd = plan.defender.gen;
        line = (ga ? ga.name : (FAC[plan.attacker.fid] || {}).name || '') + (b.siege ? ' đánh ' : ' giao chiến ở ') + (names[plan.site] || plan.site) + (gd ? (b.siege ? ', ' + gd.name + ' giữ thành' : ', đối đầu ' + gd.name) : '') + '.';
      } else if (kind === 'turn') {
        beat = HC.beat(ctx.before, ctx.after, me, EB); shotKind = beat.kind;
        const breachGate = b.wings.some((w) => w.side === 'A' && w.breach && w.lane === 1 && !w.gone);
        spec = { wings: HC.wings(b, false), from: ctx.before && ctx.before.b ? HC.fromOf(ctx.before.b) : null, beat, dur: HC.SHOTS[beat.kind] || 4.5, gate: b.siege && breachGate ? 'open' : null, standards: { gate: b.siege && !breachGate ? 'D' : null } };
        line = beat.text || '';
      } else {
        res = HC.resultOf(sb, names); beat = { kind: 'result', win: res.win };
        const siegeOn = !!b.siege, aWin = res.win === 'A';
        const wings = HC.wings(b, true).filter((w) => !(siegeOn && aWin && w.side === 'D' && !w.routed)); // the garrison of a taken town is gone from its walls
        spec = { wings, from: null, beat, dur: HC.SHOTS.result, gate: siegeOn && aWin ? 'open' : null, standards: { gate: siegeOn ? (aWin ? 'A' : 'D') : null },
          retreat: res.win === 'A' ? 'D' : res.win === 'D' ? 'A' : null, cheer: res.win === 'draw' ? null : res.win, burn: siegeOn && aWin };
        line = res.text;
      }
      const st = stageFor(sb, spec);
      const shot = { kind, shotKind, beat, line, res, dur: spec.dur, seed: (shotNo * 1.7) % 6, cams: null, cues: kind === 'result' ? [[res.cue, 0.35]] : HC.CUES[shotKind] || [], sb, last: null };
      shot.cams = shotCams(shotKind, beat, st, sb);
      return shot;
    };

    // ---------------------------------------------------------------- playing: the map paused and given back, the overlay, the cues
    const cue = (name) => { try { if (window.HuaiNanAudio && HuaiNanAudio.cue) HuaiNanAudio.cue(name); } catch (e) { /* sound is a nicety */ } };
    const later = (fn, s) => { const id = setTimeout(fn, s * 1000); timers.push(id); };
    const clearTimers = () => { for (const id of timers) clearTimeout(id); timers = []; };
    const play = (shot, env) => new Promise((resolve) => {
      skipping = false; let t0 = null;
      const say = (t) => { if (!t) return; if (env && env.ui && env.ui.caption) env.ui.caption(t, { ms: Math.round(shot.dur * 1000 - 500) }); else if (ui) ui.caption(t); };
      for (const [name, s] of shot.cues) later(() => cue(name), s);
      later(() => say(shot.line), shot.kind === 'open' ? 0.9 : 0.35);
      if (shot.res && ui) later(() => ui.result(shot.res.good ? 'Thắng' : shot.res.win === 'draw' ? 'Hoà' : 'Thua', shot.res.good), 0.6);
      let frames = 0;
      const step = (now) => {
        if (t0 === null) t0 = now;
        const t = (now - t0) / 1000;
        if (skipping || t >= shot.dur) { clearTimers(); if (ui) { ui.caption(null); ui.result(null); } shot.frames = frames; shot.skipped = skipping; cin.playing = null; resolve(); return; }
        try { frame(shot, t); frames++; cin.playing = { kind: shot.kind, shot: shot.shotKind, t: +t.toFixed(2), dur: shot.dur }; if (o.measure && !shot.measure && t > shot.dur * 0.45) shot.measure = cin.measure(); } catch (e) { console.warn('cinema frame', e); skipping = true; }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    // around a shot: the map's loop stops under black and starts again under black, so it is found as it was left
    let held = null; // the map paused across two hooks (the last turn, then the result)
    const enter = async (env, title) => {
      if (ui) { ui.bars(true); ui.black(true); if (title) ui.title(title); if (!(env && env.ui && env.ui.lock)) ui.tap(true, () => (env && env.H && env.H.onSkip ? env.H.onSkip() : cin.skip())); }
      if (env && !(env.ui && env.ui.lock)) { const l = document.querySelector('.hn'); if (l && !held) { l.dataset.hncVis = l.style.visibility; l.style.visibility = 'hidden'; } }
      await wait(held ? 0 : 320);
    };
    const pauseMap = (env) => { if (env && env.sc && !held) env.sc.stop(); held = held || { env }; };
    const resumeMap = async (env) => {
      if (ui) { ui.black(true); ui.caption(null); }
      await wait(300);
      const h = held; held = null;
      if (h && h.env && h.env.sc) { h.env.sc.loop(null); h.env.sc.dirty = true; }
      const l = document.querySelector('.hn'); if (l && 'hncVis' in l.dataset) { l.style.visibility = l.dataset.hncVis; delete l.dataset.hncVis; }
      await nextFrame(); await nextFrame();
      if (ui) { ui.black(false); ui.bars(false); ui.tag(''); ui.tap(false); }
    };
    const show = async (shot, env) => {
      pauseMap(env);
      frame(shot, 0); // the first frame is drawn under the black
      if (ui) { ui.title(null); await nextFrame(); ui.black(false); }
      await play(shot, env);
    };
    const titleOf = (bt) => {
      const p = bt.plan, a = p.attacker, d = p.defender, fa = FAC[a.fid] || {}, fd = FAC[d.fid] || {};
      return { kicker: (bt.b.siege ? 'Vây thành' : 'Giao chiến') + ' · ' + season, name: names[p.site] || p.site, a: a.gen ? a.gen.name : fa.name, d: d.gen ? d.gen.name : fd.name || 'Quân trấn thủ', A: { color: fa.color, glyph: fa.glyph }, D: { color: fd.color, glyph: fd.glyph } };
    };
    const stepYield = async () => { await nextFrame(); };
    const run = async (kind, ctx, env, tag, title) => {
      await HC.load();
      if (env) season = o.season || HC.season(env.view && env.view().calendar);
      skipping = false; // a tap from here on skips this shot, even while it is being built
      await enter(env, title);
      if (ui) ui.tag(tag);
      let shot = null; const t0 = performance.now();
      try { shot = await prepare(kind, ctx, stepYield); } catch (e) { console.warn('cinema: no shot', e); }
      const entry = { kind, shot: shot && shot.shotKind, line: shot && shot.line, readyMs: Math.round(performance.now() - t0), siteMs: site && site.buildMs, stage: stage && stage.stats() };
      cin.log.push(entry);
      if (shot && !skipping) await show(shot, env);
      if (shot) Object.assign(entry, { frames: shot.frames, skipped: !!shot.skipped, measure: shot.measure || null, memory: Object.assign({}, renderer.info.memory) });
      return shot;
    };
    const cin = {
      log: [], playing: null, // what played (the e2e reads it) and what is playing now
      get active() { return !!held; },
      open: async (bt, env) => { const s = await run('open', { bt }, env, 'Trận ' + (names[bt.plan.site] || ''), titleOf(bt)); await resumeMap(env); return s; },
      turn: async (before, after, over, env) => {
        const s = await run('turn', { before, after }, env, 'Lượt ' + ((after.b.log[after.b.log.length - 1] || {}).turn || after.b.turn) + ' / ' + (after.b.maxTurn || 5), null);
        if (over && after.outcome && held) { setTimeout(() => { if (held && !cin.busy) resumeMap(env); }, 2500); return s; } // the result follows at once: stay under black
        await resumeMap(env); return s;
      },
      result: async (lb, env) => { cin.busy = true; try { const s = await run('result', { lb }, env, 'Kết cục', null); await resumeMap(env); return s; } finally { cin.busy = false; cin.end(); } },
      prepare, frame, place,
      skip: () => { skipping = true; },
      end: () => { disposeSite(); if (rig) rig.release(); },
      measure: () => { const r = renderer; r.info.autoReset = false; r.info.reset(); const ex = r.toneMappingExposure; r.toneMappingExposure = 0.92; rig.lens.render(); r.getContext().finish(); r.toneMappingExposure = ex; const s = K.stats(r, rig.scene, {}); r.info.autoReset = true; return s; },
      stats: () => (site ? Object.assign({ buildMs: site.buildMs, parts: site.ms, site: site.def.id, side: site.side, siege: site.siege, season }, site.obj.stats(), { stage: stage ? stage.stats() : null }) : null),
      get site() { return site; }, get stage() { return stage; }, get rig() { return rig; },
      dispose: () => { disposeSite(); if (rig) rig.dispose(); rig = null; if (ui) ui.remove(); },
    };
    return cin;
  };

  // ---------------------------------------------------------------- the page: the controller's hooks (src/world/huainan-play.js)
  const P = window.HuaiNanPlay;
  if (!P || !P.hook) return;
  let cin = null, citiesJson = null;
  const ready = async (env) => {
    await HC.load();
    if (!citiesJson) citiesJson = await fetch(BASE + 'data/scenario/huainan-cities.json').then((r) => r.json());
    if (!cin) {
      const view = () => env.view();
      cin = HC.create({ renderer: env.rt.renderer, W: env.width, H: env.height, quality: env.quality, data: env.data, cities: citiesJson, Battle: window.EmperorsBattle, measure: env.params.has('cinemeasure'),
        wallsOf: (id) => { const t = view().towns.find((x) => x.id === id); return t ? t.walls : null; },
        // an attack with no march (the army was already there): from the attacker's nearest town, as the map's board
        fromOf: (plan) => { const v = view(), towns = env.data.towns, at = towns.find((t) => t.id === plan.site); let best = null; for (const t of v.towns) { if (t.owner !== plan.attacker.fid || t.id === plan.site) continue; const p = towns.find((x) => x.id === t.id); if (!p || !at) continue; const d = Math.hypot(p.xz[0] - at.xz[0], p.xz[1] - at.xz[1]); if (!best || d < best.d) best = { d, id: t.id }; } return best && best.id; } });
      window.__cinema = cin;
    }
    return cin;
  };
  P.hook('boot', async (env) => {
    if (env.fast || env.params.get('cinema') === '0') return;
    // the 1 m modules and the plants' atlas when the page is idle, so the first battle only builds its own ground
    const idle = () => ready(env).then(() => { try { window.Nature.warm(env.quality); } catch (e) { /* the first battle warms it */ } }).catch((e) => console.warn('cinema load', e));
    if (window.requestIdleCallback) requestIdleCallback(idle, { timeout: 6000 }); else setTimeout(idle, 2500);
  });
  P.on('skip', () => { if (cin) cin.skip(); });
  const off = (env) => env.fast || env.params.get('cinema') === '0';
  P.hook('battleOpen', async (ctx, env) => { if (off(env)) return; try { await (await ready(env)).open(ctx.bt, env); } catch (e) { console.warn('cinema open', e); } });
  P.hook('battleTurn', async (ctx, env) => { if (off(env) || !ctx.after) return; try { await (await ready(env)).turn(ctx.before, ctx.after, ctx.over, env); } catch (e) { console.warn('cinema turn', e); } });
  P.hook('battleResult', async (ctx, env) => { if (off(env) || !ctx.lb) return; try { await (await ready(env)).result(ctx.lb, env); } catch (e) { console.warn('cinema result', e); } });
})(typeof window !== 'undefined' ? window : globalThis);
