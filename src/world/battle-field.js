// Field battle (src/world/battle-field.js): a battle in the open at 1 unit = 1 m, for every v2 battle that is not a
// siege (docs/design/v2-polish.md, job 2; attacking Trương Liêu's horse on the plain, meeting Chu Thái at a ford).
// Global `FieldBattle`, the same shape as Battle.siege (src/world/battle.js) so the battle cinema can swap them.
//
// The ground is the engine's three lanes (src/engine/battle.js: 0 left, 1 centre, 2 right as the attacker sees them)
// side by side, 170–250 m each, each one of four kinds: open (fallow grass among the parcels), ford (a river bends
// across the lane between the hosts: a wide shallow crossing with gravel bars and reeds, the road crossing with it,
// its two arms running back along the lane's sides), wood (open woodland thickening into forest behind the defender)
// and hill (a broad rise the defender holds, its brow at his line). The hosts stand by arm as the engine deploys them
// (wingsOf: foot across the lanes, horse on the flanks, archers and boats behind), or as its live wings say
// (desc.wings = EmperorsBattle.view(b)); each wing is a block of figures (one per ~4 men at high, capped per tier),
// with its flags on the rear rank, each general's standard, tent and drums at a command post behind his centre, boats
// on the river, a road, dust. deploy: the lines apart; clash: the lines in contact in every lane (the front ranks
// locked, archers shooting, horse charging home, the fallen and the spent arrows between them); result: the loser's
// wings streaming back, the victor holding the line, his horse in pursuit, his standard carried to the front.
// The frame: x east, z south, y up; the attacker at +z facing north (−z), the defender at −z facing south; the lanes
// left to right along +x. Everything is code and seeded (an LCG; no Math.random, no textures loaded). Classic script,
// three r146 global (decision 0002); the land is Nature's L interface (visual-build.md §2), built here, not by the host.
//
//   FieldBattle.create(desc, deps) → { group, tick(dt), views, labels(cam, w, h), focus(cam), stats(), dispose(), land,
//                                      lanes, sun, plan, units, crowds, trees: [], nature: true, tier }
//   desc = { attacker, defender: { fid, color, glyph, name, troops: { bo, cung, ky, thuy } }, lanes: [kind × 3],
//            river, season: 'Xuân'|'Hạ'|'Thu'|'Đông', hour (default 17.5), seed, mode: 'deploy'|'clash'|'result',
//            result?: 'A'|'D', wings?: EmperorsBattle.view(b), fire?: [lane | { lane, side }] (hỏa công in a wood) }
//   deps = { HM, Nature, Crowd?, env, sun?, q, renderer, camera? } as Battle.siege. Crowd: the animated crowd.js; else
//          Battle.Crowd (the static stand-in) when battle.js is loaded.
//   The group holds its own terrain, water, trees and reeds (nature: true): the host adds the group and must NOT build
//   Nature.terrain / trees for `land` again. It keeps its sky, sun light and lens: `sun` says where the light should
//   be for desc.hour and desc.season ({ dir, color, intensity, hemi, sky, atmos }); deps.sun is used only when
//   desc.hour is not given. views: deploy, lane0, lane1, lane2, overview, result → { target, cam, fov, shadow: [x, z,
//   ext], ao } (the siege's shape). lanes[i] = { kind, name, cx, x0, x1, front: [x, z], A: [x, z], D: [x, z] }: the
//   contact point and each side's main block there (the cinema stages motion from them). units: one per wing
//   { id, side, arm, lane, row, men, figures, state, at: [x, z], handle } (handle: crowd.add's, when crowd.js gives one).
//   Budget (0005, high / mid / low): figures 3,200 / 2,200 / 1,000; fallen 420 / 260 / 120; reeds and dust by tier.
//   Pure (Node tests: tests/battle-field.test.mjs): FieldBattle.normalize(desc), .wingsOf(units, side), .plan(desc, q),
//   .sunAt(hour, season), .rowZ(row); FieldBattle.land(plan, Nature) → L needs THREE (a DataTexture) and Nature's noise.
(function (root) {
  const FB = (root.FieldBattle = {});
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const lcg = (s) => { s = (Math.abs(Math.floor(s)) % 2147483646) + 1; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };
  const hex = (c) => (typeof c === 'string' ? parseInt(c.replace('#', ''), 16) : c);
  const num = (v) => Math.max(0, Number(v) || 0);
  const yawTo = (dx, dz) => Math.atan2(-dz, dx); // the yaw that turns a model's +x toward (dx, dz)
  const tierOf = (q) => { const t = typeof q === 'string' ? q : q && q.tier; return t === 'mid' || t === 'low' ? t : 'high'; };

  const LANE_VI = { open: 'Đồng trống', ford: 'Bến sông', wood: 'Rừng thưa', hill: 'Đồi' }, LANE_SIDE = ['trái', 'giữa', 'phải'];
  const SEASONS = ['Xuân', 'Hạ', 'Thu', 'Đông'], SEASON_OF = { spring: 'Xuân', summer: 'Hạ', autumn: 'Thu', winter: 'Đông' };
  const MODES = ['deploy', 'clash', 'result', 'ground'], ARMS = ['bo', 'cung', 'ky', 'thuy'];
  // per tier: the figures drawn in all, the fallen, and the share of the reeds, dust and arrows
  const TIER = { high: { figures: 3200, fallen: 420, fx: 1 }, mid: { figures: 2200, fallen: 260, fx: 0.6 }, low: { figures: 1000, fallen: 120, fx: 0.35 } };
  const ROW = 44, G = 70; // a row of the engine's field (metres along z); the gap left beside a ford lane for the river's arms
  const rowZ = (r) => (2.5 - r) * ROW; // rows 0–1 the attacker's (+z), 4–5 the defender's; the middle of the field at 0
  const face = (side) => (side === 'A' ? -1 : 1); // the way along z a side faces
  FB.LANE_VI = LANE_VI; FB.ROW = ROW; FB.rowZ = rowZ; FB.TIER = TIER;

  // ---------------------------------------------------------------- the description, with every default filled in
  FB.normalize = function (desc) {
    const d = desc || {};
    if (d.__fb) return d;
    const side = (s, fid) => { s = s || {}; const t = s.troops || {}; return { fid: s.fid || fid, color: hex(s.color != null ? s.color : 0x8a7a55), glyph: s.glyph || '軍', name: s.name || '', general: s.general || null, troops: { bo: num(t.bo), cung: num(t.cung), ky: num(t.ky), thuy: num(t.thuy) } }; };
    const lanes = [0, 1, 2].map((i) => (Array.isArray(d.lanes) && LANE_VI[d.lanes[i]] ? d.lanes[i] : 'open'));
    const mode = MODES.includes(d.mode) ? d.mode : 'deploy';
    let result = d.result === 'D' || d.result === 'loss' ? 'D' : d.result === 'A' || d.result === 'win' ? 'A' : null;
    if (mode === 'result' && !result) result = 'A';
    const fire = (Array.isArray(d.fire) ? d.fire : d.fire != null ? [d.fire] : []).map((f) => (typeof f === 'number' ? { lane: f, side: 'A' } : { lane: +f.lane, side: f.side === 'D' ? 'D' : 'A' })).filter((f) => f.lane >= 0 && f.lane <= 2);
    const hour = d.hour != null && Number.isFinite(+d.hour) ? clamp(+d.hour, 5, 19.5) : null;
    return { __fb: true, attacker: side(d.attacker, 'A'), defender: side(d.defender, 'D'), lanes, river: lanes.includes('ford') || !!d.river,
      season: SEASON_OF[d.season] || (SEASONS.includes(d.season) ? d.season : 'Thu'), hour, seed: (Math.floor(Math.abs(Number(d.seed) || 0)) % 2147483646) || 1,
      mode, result, fire, wings: Array.isArray(d.wings) && d.wings.length ? d.wings : null, figures: d.figures > 0 ? +d.figures : null };
  };

  // an army as the engine deploys it in the field (src/engine/battle.js wingsOf, not walled): foot across the lanes,
  // horse on the flanks (split when over 2,000 and there is room), archers and boats behind the centre; wings under
  // 100 men are not fielded, six at most
  FB.wingsOf = function (u, side) {
    const w = [], row = side === 'A' ? 1 : 4, back = side === 'A' ? 0 : 5;
    const add = (arm, men, lane, r) => { if (men >= 100) w.push({ id: side + w.length, side, arm, men: Math.round(men), start: Math.round(men), lane, row: r, routed: false, gone: false }); };
    const bo = num(u && u.bo), ky = num(u && u.ky), cung = num(u && u.cung), thuy = num(u && u.thuy);
    if (bo > 2400) { add('bo', bo * 0.5, 1, row); add('bo', bo * 0.25, 0, row); add('bo', bo * 0.25, 2, row); }
    else if (bo > 1200) { add('bo', bo * 0.6, 1, row); add('bo', bo * 0.4, 0, row); }
    else add('bo', bo, 1, row);
    if (ky > 2000 && !(thuy >= 100 && w.length >= 3)) { add('ky', ky * 0.55, 0, row); add('ky', ky * 0.45, 2, row); } else add('ky', ky, 2, row);
    add('cung', cung, 1, back); add('thuy', thuy, 1, back);
    w.forEach((x, i) => { x.id = side + i; });
    return w.slice(0, 6);
  };

  // ---------------------------------------------------------------- the sun for an hour of a season (Huainan, ~32.5° N)
  // A drawn day, not an ephemeris: the sun rises at `rise` from azimuth `az0` (east of north), culminates at `top`
  // degrees in the south and sets at `set`; 17.5 in autumn is the golden hour (~19° up, a little south of west: low enough for long shadows, high
  // enough to light the ground).
  // dir points to the sun (x east, y up, z south). Colours are linear multipliers as the siege's light (1, .72, .46).
  const DAY = { Xuân: { rise: 5.7, set: 19.0, top: 58, az0: 84 }, Hạ: { rise: 5.2, set: 19.2, top: 78, az0: 64 }, Thu: { rise: 5.9, set: 18.9, top: 52, az0: 95 }, Đông: { rise: 6.8, set: 18.3, top: 34, az0: 118 } };
  const SKY = { // zenith, horizon, the warm band round the sun; the haze (lens atmos) and its colour
    Xuân: { zen: [0.13, 0.25, 0.47], hor: [0.8, 0.74, 0.62], haze: 0.00019, hazeCol: 0xa9b0b2 },
    Hạ: { zen: [0.11, 0.24, 0.5], hor: [0.78, 0.74, 0.66], haze: 0.00023, hazeCol: 0xa8b2ba },
    Thu: { zen: [0.1, 0.2, 0.42], hor: [0.84, 0.68, 0.52], haze: 0.00017, hazeCol: 0xa7a8ad },
    Đông: { zen: [0.19, 0.25, 0.37], hor: [0.74, 0.72, 0.7], haze: 0.00013, hazeCol: 0xb2b6bd },
  };
  FB.sunAt = function (hour, season) {
    const S = DAY[season] || DAY.Thu, K = SKY[season] || SKY.Thu, h = clamp(hour == null ? 17.5 : +hour, S.rise + 0.25, S.set - 0.2);
    const noon = (S.rise + S.set) / 2, u = (h - noon) / ((S.set - S.rise) / 2), a = (u * Math.PI) / 2;
    const el = Math.max(3, S.top * Math.pow(Math.cos(a), 0.9)), az = 180 + (180 - S.az0) * Math.sin(a), er = (el * Math.PI) / 180, ar = (az * Math.PI) / 180;
    const dir = [Math.sin(ar) * Math.cos(er), Math.sin(er), -Math.cos(ar) * Math.cos(er)];
    const warm = 1 - sstep(6, 38, el), winter = season === 'Đông' ? 1 : 0;
    const color = [1, lerp(0.95, 0.66, warm) + 0.06 * winter, lerp(0.88, 0.4, warm) + 0.12 * winter];
    const intensity = lerp(2.9, 2.35, warm) * (el < 8 ? lerp(0.78, 1, (el - 3) / 5) : 1) * (winter ? 0.9 : 1);
    return { hour: h, season: DAY[season] ? season : 'Thu', elevation: +el.toFixed(2), azimuth: +az.toFixed(2), dir, color, intensity,
      hemi: { sky: [0.5, 0.6, 0.8], ground: [0.3, 0.24, 0.16], intensity: lerp(0.55, 0.42, warm) },
      sky: { zenith: K.zen, horizon: K.hor, warm: [1.2, lerp(0.8, 0.58, warm), lerp(0.6, 0.26, warm)] },
      atmos: { density: K.haze, falloff: 0.005, color: K.hazeCol, sunColor: warm > 0.5 ? 0xe0a070 : 0xe6c79a } };
  };

  // ---------------------------------------------------------------- the plan: lanes, the river, the road, the blocks, every figure's place
  // A block's shape from its men and the figures per man k: the frontage by arm (a Han line of a thousand foot is
  // ~80 m), the figures in files and ranks at a spacing that widens as the figures thin, so the frontage holds
  const SHAPE = {
    foot: { F: (m) => clamp(34 + m * 0.048, 36, 150), s: 1.55, r: 1.75, min: 4 },
    cung: { F: (m) => clamp(40 + m * 0.058, 40, 150), s: 1.9, r: 2.2, min: 3 },
    ky: { F: (m) => clamp(22 + m * 0.028, 26, 100), s: 2.5, r: 4.4, min: 2 },
  };
  // Catmull-Rom through control points, resampled every `step` metres
  const spline = (cp, step) => {
    const out = [];
    for (let i = 0; i < cp.length - 1; i++) {
      const p0 = cp[Math.max(0, i - 1)], p1 = cp[i], p2 = cp[i + 1], p3 = cp[Math.min(cp.length - 1, i + 2)], n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t, f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    out.push(cp[cp.length - 1].slice());
    return out;
  };
  FB.plan = function (desc, q) {
    const D = FB.normalize(desc), tier = tierOf(q), TQ = TIER[tier], rnd = lcg(D.seed * 7919 + 101), R = () => rnd() - 0.5;
    // ---- the wings: the engine's live ones, or its deployment from the troops
    const src = D.wings
      ? D.wings.map((w, i) => ({ id: w.id || (w.side === 'D' ? 'D' : 'A') + i, side: w.side === 'D' ? 'D' : 'A', arm: ARMS.includes(w.arm) ? w.arm : 'bo', men: num(w.men), start: num(w.start != null ? w.start : w.men), lane: clamp(Math.round(+w.lane || 0), 0, 2), row: clamp(+w.row || 0, 0, 5), routed: !!w.routed, gone: !!w.gone, left: !!w.left }))
      : [...FB.wingsOf(D.attacker.troops, 'A'), ...FB.wingsOf(D.defender.troops, 'D')];
    const wings = src.filter((w) => !w.left && w.men > 0);
    const menAll = wings.reduce((s, w) => s + w.men, 0) || 1, cap = D.figures || TQ.figures;
    const k = Math.min(0.5, (0.8 * cap) / menAll), spread = clamp(Math.sqrt(0.3 / k), 1, 1.7); // a fifth kept for the posts, the fallen, the boats' crews
    const river = D.river, fordLane = D.lanes.indexOf('ford');
    const shapeOf = (w) => {
      const boat = w.arm === 'thuy' && river, S = SHAPE[w.arm === 'ky' ? 'ky' : w.arm === 'cung' ? 'cung' : 'foot'], sp = w.arm === 'ky' ? Math.max(1, spread * 0.85) : spread;
      const n = Math.max(w.arm === 'ky' ? 6 : 8, Math.round(w.men * k * (boat ? 0.4 : 1)));
      const s = S.s * sp, rs = S.r * (w.arm === 'ky' ? Math.max(1, spread * 0.7) : sp);
      let files = Math.max(3, Math.round(S.F(w.men * (boat ? 0.4 : 1)) / s)), ranks = Math.ceil(n / files);
      if (ranks < S.min) { ranks = Math.min(S.min, Math.max(1, Math.ceil(n / 3))); files = Math.ceil(n / ranks); }
      const sq = w.arm === 'ky' ? 6 : 99; // horse deeper than six ranks forms squadrons one behind another, 14 m apart
      return { n, files, ranks, s, rs, sq, F: files * s, depth: ranks * rs + (Math.ceil(ranks / sq) - 1) * 14, boat };
    };
    const blocks = wings.map((w) => Object.assign({ w, id: w.id, side: w.side, arm: w.arm, lane: w.lane, row: w.row }, shapeOf(w)));
    // ---- the lanes: as wide as their widest row of blocks (170–250 m), a gap for the river's arm beside a ford lane
    const key = (b) => b.side + b.lane + ':' + Math.round(b.row);
    const groups = {}; for (const b of blocks) if (!b.boat) (groups[key(b)] = groups[key(b)] || []).push(b);
    let widest = 0; for (const g of Object.values(groups)) widest = Math.max(widest, g.reduce((s, b) => s + b.F, 0) + 16 * (g.length - 1));
    const LW = Math.round(clamp(widest + 44, 170, 250));
    const gapR = (i) => (fordLane >= 0 && (i === fordLane || i + 1 === fordLane) ? G : 0); // between lane i and i + 1
    const width = 3 * LW + gapR(0) + gapR(1);
    let x0 = -width / 2;
    const lanes = D.lanes.map((kind, i) => { const l = { i, kind, name: LANE_VI[kind], x0, x1: x0 + LW, cx: x0 + LW / 2, w: LW }; x0 += LW + gapR(i); return l; });
    // where the lines meet in each lane: the middle of the field, the ford's water, the forest edge, the hill's slope
    for (const l of lanes) l.zf = l.kind === 'ford' ? 0 : l.kind === 'wood' ? -12 + R() * 10 : l.kind === 'hill' ? -34 + R() * 8 : R() * 18;
    // ---- the river: a ford lane's river comes down one side of the lane behind the defender, bends across it between
    // the hosts (the ford, wide and shallow) and goes back up the other side behind the attacker; with no ford lane it
    // runs across the field behind the attacker (the host crossed it to fight)
    let riv = null;
    if (river) {
      let cp, a = 0;
      if (fordLane >= 0) {
        const l = lanes[fordLane], half = LW / 2 + G / 2; a = fordLane === 0 ? 1 : fordLane === 2 ? -1 : rnd() < 0.5 ? -1 : 1;
        const xa = l.cx + a * half, xb = l.cx - a * half, ph = rnd() * 6;
        const mA = (k) => 150 * Math.sin(ph + k * 1.9); // the arms wander once they are off the field
        cp = [[xa + mA(0), -2800], [xa + mA(1), -1900], [xa + mA(2) * 0.8, -1150], [xa + a * 30 + mA(3) * 0.35, -700], [xa, -420], [xa + a * 3, -200], [xa - a * 4, -64], [l.cx + a * LW * 0.3, -13], [l.cx, 0], [l.cx - a * LW * 0.3, 13], [xb + a * 4, 64], [xb - a * 3, 200], [xb, 420], [xb - a * 30 + mA(4) * 0.35, 700], [xb + mA(5) * 0.8, 1150], [xb + mA(6), 1900], [xb + mA(7), 2800]];
      } else {
        const z0 = 360 + R() * 40; cp = [[-2800, z0 + 60], [-1600, z0 + 110], [-800, z0 - 40], [0, z0 + 30], [800, z0 - 50], [1600, z0 + 90], [2800, z0 + 20]];
      }
      const pts = spline(cp, 8).map(([x, z]) => {
        const fw = fordLane >= 0 ? sstep(95, 30, Math.abs(z)) * sstep(LW / 2 + 40, LW / 2 - 10, Math.abs(x - lanes[fordLane].cx)) : 0;
        return [x, z, lerp(fordLane >= 0 ? 19 : 30, 29, fw) + 2 * Math.sin(x * 0.011 + z * 0.013), lerp(-4.2, -1.45, fw), fw];
      });
      riv = { pts, ford: fordLane >= 0 ? [lanes[fordLane].cx, 0] : null, lane: fordLane, a };
    }
    // ---- the road: along the attack through the ford (a road crosses a river where it can be waded) or the centre
    const rl = fordLane >= 0 ? lanes[fordLane] : lanes[1], ph1 = rnd() * 6, ph2 = rnd() * 6;
    const roadX = (z) => rl.cx + (fordLane >= 0 ? 0 : 18) + 16 * Math.sin(z / 210 + ph1) * sstep(30, 220, Math.abs(z)) + 34 * Math.sin(z / 700 + ph2) * sstep(300, 900, Math.abs(z));
    const road = []; for (let z = 2800; z >= -2800; z -= 20) road.push([roadX(z), z]);
    // ---- placing the blocks. Rows along z; in a row, the foot in the middle, the horse on the lane's outer flank
    const zOfRow = {}, combat = (b) => b.arm !== 'cung' && !b.boat;
    const lead = {}; // per side and lane: the most forward row of its combat blocks
    for (const b of blocks) if (combat(b)) { const kk = b.side + b.lane, fwd = b.side === 'A' ? b.row : -b.row; if (lead[kk] == null || fwd > lead[kk]) lead[kk] = fwd; }
    const leadRow = (side, lane) => (lead[side + lane] == null ? null : side === 'A' ? lead[side + lane] : -lead[side + lane]);
    for (const l of lanes) { // the contact in this lane: at its front, pushed toward the side the live rows have gained on
      const rA = leadRow('A', l.i), rD = leadRow('D', l.i);
      l.zc = l.zf + (D.wings && rA != null && rD != null ? ((rowZ(rA) + rowZ(rD)) / 2) * 0.6 : 0);
      l.both = rA != null && rD != null;
    }
    const V = D.result, ground = D.mode === 'ground', mode = ground ? 'deploy' : D.mode; // ground: the field laid out for the troops, no one on it
    for (const g of Object.values(groups)) {
      const l = lanes[g[0].lane], side = g[0].side;
      // order across the lane: horse toward the lane's outer flank (the centre lane: toward the side away from the river arm)
      const outer = l.i === 0 ? -1 : l.i === 2 ? 1 : riv && riv.lane === 1 ? -riv.a : 1;
      g.sort((p, r) => (p.arm === 'ky') - (r.arm === 'ky'));
      if (outer < 0) g.reverse();
      let total = g.reduce((s, b) => s + b.F, 0) + 16 * (g.length - 1);
      const room = l.w - 26;
      if (total > room) { const f = room / total; for (const b of g) { b.files = Math.max(3, Math.floor(b.files * f)); b.ranks = Math.ceil(b.n / b.files); b.F = b.files * b.s; b.depth = b.ranks * b.rs + (Math.ceil(b.ranks / b.sq) - 1) * 14; } total = g.reduce((s, b) => s + b.F, 0) + 16 * (g.length - 1); }
      let x = l.cx - total / 2;
      for (const b of g) { b.x = x + b.F / 2; x += b.F + 16; }
    }
    for (const b of blocks) {
      const l = lanes[b.lane], f = face(b.side), lr = leadRow(b.side, b.lane);
      b.yaw = yawTo(0, f); b.face = f;
      b.state = 'stand';
      // deploy: where its row puts it (the horse a little behind the foot)
      let z = rowZ(b.row) - f * ((b.arm === 'ky' ? 8 : 0) + (l.kind === 'ford' ? 14 : 0)); // the ford lane's lines stand back from the banks
      if (b.boat) { b.z = z; b.state = mode === 'deploy' ? 'stand' : 'row'; continue; }
      const front = combat(b) && lr != null && Math.abs(b.row - lr) < 0.5;
      const loser = mode === 'result' && b.side !== V, winner = mode === 'result' && b.side === V;
      if (mode !== 'deploy') {
        if (front && l.both) { z = l.zc - f * (b.depth / 2 + 0.8); b.state = b.arm === 'ky' ? 'charge' : 'fight'; }
        else if (front) { z = l.zc - f * (b.depth / 2 + 26); b.state = 'advance'; }
        else if (b.arm === 'cung') { z = l.zc - f * (64 + b.depth / 2); b.state = 'shoot'; }
        else { z = l.zc - f * (b.depth / 2 + 30 + 28 * Math.abs(b.row - (lr == null ? b.row : lr))); b.state = 'stand'; }
        if (b.w.routed || b.w.gone) b.state = 'rout';
        if (loser) b.state = 'rout';
        if (winner) b.state = b.state === 'charge' ? 'pursue' : b.state === 'fight' || b.state === 'advance' ? 'hold' : b.state === 'shoot' ? 'stand' : b.state;
      }
      b.z = z;
    }
    // ---- the staging, for a crowd that moves (crowd.js move/play; FieldBattle.create uses it when present): in a
    // clash the attacker's front blocks close the last stretch (the foot 14 m at a run, the horse 45 m at the charge),
    // lane by lane from the centre out, and meet the defender's braced ranks at the lane's contact time; in a result the
    // beaten keep running (60 m over 10 s) and the victor's horse rides after them. Seconds from the build.
    if (mode === 'clash') for (const l of lanes) {
      let tc = 0.4;
      for (const b of blocks) if (b.lane === l.i && b.side === 'A' && l.both && (b.state === 'fight' || b.state === 'charge')) {
        const ky = b.state === 'charge'; b.move = { d: ky ? 45 : 14, t0: 0.2 + Math.abs(l.i - 1) * 0.45 + (ky ? 0.3 : 0), dur: ky ? 3.0 : 2.6, ease: ky ? 'charge' : 'march' };
        tc = Math.max(tc, b.move.t0 + b.move.dur);
      }
      l.tc = +tc.toFixed(2);
    }
    if (mode === 'result') for (const b of blocks) { if (b.state === 'rout') b.move = { d: 60, t0: 0, dur: 10, ease: 'flee', away: true }; else if (b.state === 'pursue') b.move = { d: 40, t0: 0.3, dur: 8, ease: 'linear' }; }
    // ---- boats: on the river's deep water on their own side, nearest the ford (or the field) first, 30 m apart
    const boats = [];
    if (riv) for (const side of ['A', 'D']) for (const b of blocks.filter((q) => q.boat && q.side === side)) {
      const want = clamp(Math.round(b.w.men / 180), 1, 9), ok = riv.pts.map((p, i) => [p, i]).filter(([p]) => p[4] < 0.05 && (riv.ford ? (side === 'A' ? p[1] > 60 : p[1] < -60) : true) && Math.abs(p[0]) < width / 2 + 500 && Math.abs(p[1]) < 900);
      const c = riv.ford || [0, side === 'A' ? 300 : -300];
      ok.sort((p, r) => Math.hypot(p[0][0] - c[0], p[0][1] - c[1]) - Math.hypot(r[0][0] - c[0], r[0][1] - c[1]));
      const got = [];
      for (const [p, i] of ok) { if (got.length >= want) break; if (got.some((g) => Math.hypot(g[0] - p[0], g[1] - p[1]) < 30) || boats.some((g) => Math.hypot(g[0] - p[0], g[1] - p[1]) < 30)) continue; const nx = riv.pts[Math.min(riv.pts.length - 1, i + 1)], pv = riv.pts[Math.max(0, i - 1)], off = (got.length % 2 ? 1 : -1) * p[2] * 0.25; const tx = nx[0] - pv[0], tz = nx[1] - pv[1], tl = Math.hypot(tx, tz) || 1; got.push([p[0] - (tz / tl) * off, p[1] + (tx / tl) * off, yawTo(tx, tz) + (rnd() < 0.5 ? 0 : Math.PI) + R() * 0.2, side, b.id]); }
      boats.push(...got); b.boats = got.length;
      // the marines: a crowd on the bank by the first boat, on the field's side of the water (in clash, wading into the ford)
      if (got.length) {
        const g0 = got[0], i0 = riv.pts.reduce((bi, p, i) => (Math.hypot(p[0] - g0[0], p[1] - g0[1]) < Math.hypot(riv.pts[bi][0] - g0[0], riv.pts[bi][1] - g0[1]) ? i : bi), 0);
        const p = riv.pts[i0], nx = riv.pts[Math.min(riv.pts.length - 1, i0 + 1)], tx = nx[0] - p[0], tz = nx[1] - p[1], tl = Math.hypot(tx, tz) || 1;
        let ux = -tz / tl, uz = tx / tl; if (ux * (lanes[1].cx - p[0]) + uz * (0 - p[1]) < 0) { ux = -ux; uz = -uz; }
        const off = p[2] + 16 + Math.max(b.F, b.depth) / 2; b.x = p[0] + ux * off; b.z = p[1] + uz * off;
        if (mode !== 'deploy') { // off the boats: a second line close behind the side's foot where the boats lie (the ford lane, else the centre)
          const l = lanes[riv.ford ? riv.lane : 1], m = blocks.filter((q) => q.side === side && q.lane === l.i && combat(q) && q !== b).sort((q, r) => r.n - q.n)[0];
          b.x = m ? m.x : l.cx; b.z = m ? m.z - face(side) * (m.depth / 2 + 6 + b.depth / 2) : l.zc - face(side) * (b.depth / 2 + 12); b.state = mode === 'result' ? (side !== V ? 'rout' : 'hold') : 'support';
        }
      } else { b.boat = false; b.x = lanes[1].cx; b.z = rowZ(side === 'A' ? 0 : 5); b.state = 'stand'; }
    }
    // ---- every figure's place: [x, z, yaw, body, role, phase] (y from the land when the scene is built)
    const figs = [], fallen = [], arrowsIn = [];
    const addFallen = (x, z, side, horse) => fallen.push([x, z, rnd() * Math.PI * 2, side, horse ? 1 : 0, rnd()]);
    for (const b of blocks) {
      b.figs = [];
      const body = b.arm === 'ky' ? 'rider' : b.arm === 'cung' ? 'bow' : 'foot', f = b.face, st = b.state;
      const push = (x, z, yaw, role) => { const r = [x, z, yaw, body, role, rnd()]; b.figs.push(r); figs.push(r); };
      if (st === 'rout') { // streaming back: thick near the line, thinning over 40–220 m; the rear first
        const run = b.w.gone ? 0.35 : 1;
        for (let i = 0; i < Math.round(b.n * run); i++) {
          const d = Math.pow(rnd(), 0.75) * (60 + 170 * rnd()), x = b.x + R() * b.F * (1.05 + d / 180), z = b.z - f * (d - b.depth / 2);
          if (i < b.n * 0.1) { addFallen(b.x + R() * b.F, l0z(b) + R() * 16, b.side, body === 'rider'); continue; }
          push(x, z, yawTo(0, -f) + R() * 1.1, body === 'rider' ? 'flee' : 'rout');
        }
        continue;
      }
      if (st === 'pursue') { // the victor's horse among the fleeing: loose, ahead of the line
        for (let i = 0; i < b.n; i++) { const d = 12 + rnd() * 120, x = b.x + R() * b.F * 1.6, z = b.z + f * d; push(x, z, yawTo(R() * 0.6, f), 'charge'); }
        continue;
      }
      const jit = st === 'fight' || st === 'charge' ? 0.5 : st === 'advance' ? 0.3 : 0.18;
      for (let r = 0, i = 0; r < b.ranks; r++) for (let c = 0; c < b.files && i < b.n; c++, i++) {
        let x = b.x + (c - (b.files - 1) / 2) * b.s + R() * jit * b.s, z = b.z + f * (b.depth / 2 - (r + 0.5) * b.rs - Math.floor(r / b.sq) * 14) + R() * jit * b.rs;
        let role = st === 'shoot' ? 'shoot' : st === 'advance' ? 'advance' : st === 'charge' ? 'charge' : st === 'hold' ? (rnd() < 0.18 ? 'cheer' : 'hold') : st === 'support' ? 'brace' : 'stand';
        if (st === 'fight' && r < 2) { // the front ranks locked with the enemy's: some pressed on through, some down
          if (rnd() < 0.07) { addFallen(x, l0z(b) + R() * 5, b.side, false); continue; }
          z += f * (0.6 + rnd() * (rnd() < 0.15 ? 3.2 : 1.2)); role = 'front';
        } else if (st === 'fight') role = r < 4 ? 'brace' : 'stand';
        if (st === 'charge' && r < 1 && rnd() < 0.08) { addFallen(x, l0z(b) + R() * 6, b.side, true); continue; }
        push(x, z, b.yaw + R() * (role === 'front' || role === 'charge' ? 0.5 : 0.16), role);
      }
    }
    function l0z(b) { return lanes[b.lane].zc; }
    // the fallen of the fight between the lines, and more on the loser's side of it in a result
    for (const l of lanes) {
      if (mode === 'deploy' || !l.both) continue;
      const inLane = blocks.filter((b) => b.lane === l.i && combat(b) && !b.boat), men = inLane.reduce((s, b) => s + b.n, 0), n = Math.round(men * (mode === 'result' ? 0.12 : 0.05));
      for (let i = 0; i < n; i++) { const side = mode === 'result' ? (rnd() < 0.75 ? (V === 'A' ? 'D' : 'A') : V) : rnd() < 0.5 ? 'A' : 'D', d = mode === 'result' && side !== V ? rnd() * 70 : rnd() * 10; addFallen(l.cx + R() * l.w * 0.72, l.zc - face(side) * (d - 3) + R() * 5, side, rnd() < 0.06); }
    }
    fallen.splice(TQ.fallen); // a figure count, not a tally
    if (ground) { for (const b of blocks) b.figs = []; figs.length = 0; boats.length = 0; }
    // spent arrows in the ground before the blocks the archers shot at (clash and result)
    if (mode !== 'deploy') for (const b of blocks.filter((q) => q.arm === 'cung' && q.state !== 'rout' && q.state !== 'deploy')) {
      const l = lanes[b.lane], zT = l.zc + b.face * 30;
      for (let i = 0, n = Math.round(260 * TQ.fx); i < n; i++) arrowsIn.push([b.x + R() * b.F * 1.4, zT + b.face * (rnd() * 70 - 10) + R() * 20, rnd() * 6.28, 0.35 + rnd() * 0.6]);
    }
    // ---- the command posts: behind the centre lane, beside the road; in a result the victor's general rides to the front
    const posts = {};
    for (const side of ['A', 'D']) {
      const own = blocks.filter((b) => b.side === side && !b.boat && b.state !== 'rout'), f = face(side);
      const back = own.length ? (side === 'A' ? Math.max(...own.map((b) => b.z + b.depth / 2)) : Math.min(...own.map((b) => b.z - b.depth / 2))) : rowZ(side === 'A' ? 0 : 5);
      // behind the centre lane: beside the road when it runs there, on the side away from that side's river arm
      const z = mode === 'result' && side !== V ? rowZ(side === 'A' ? -0.9 : 5.9) : back - f * 62, rx = roadX(z), onRoad = Math.abs(rx - lanes[1].cx) < LW / 2 - 40;
      const sx = riv && riv.lane === 1 ? (side === 'A' ? riv.a : -riv.a) : onRoad ? (rx > lanes[1].cx ? -1 : 1) : 1;
      posts[side] = { side, x: (onRoad ? rx : lanes[1].cx) + sx * 34, z, face: f, sx, abandoned: mode === 'result' && side !== V };
    }
    // the generals: at the post, the standard beside them; the victor's forward in a result, the loser's standard down
    const dec = lanes.slice().sort((p, r) => (r.both - p.both) || (r.kind === 'ford') - (p.kind === 'ford') || Math.abs(p.i - 1) - Math.abs(r.i - 1))[0]; // the decisive lane
    const gens = {};
    for (const side of ['A', 'D']) {
      const p = posts[side];
      if (mode === 'result' && side === V) { const zz = dec.zc - face(side) * 34; gens[side] = { x: dec.cx + (dec.i === 1 ? 26 : dec.i === 0 ? 30 : -30), z: zz, forward: true }; }
      else gens[side] = { x: p.x - p.sx * 12, z: p.z + p.face * 14, down: p.abandoned };
    }
    // ---- flags: along the rear rank of a block (one per ~16 m), pennants over the horse, a few carried off in a rout
    const flags = [];
    for (const b of blocks) {
      if (b.boat) continue;
      if (b.state === 'rout') { for (let i = 0; i < 2 && b.figs.length; i++) { const fg = b.figs[Math.floor(rnd() * Math.min(b.figs.length, 40))]; flags.push([fg[0], fg[1], R() * 0.4, 1, b.side, 1, b.id]); } continue; }
      const nf = Math.max(2, Math.round(b.F / 16)), zr = b.z - b.face * (b.depth / 2 + (b.arm === 'ky' ? 1.5 : 0.8));
      for (let i = 0; i < nf; i++) flags.push([b.x + (i - (nf - 1) / 2) * (b.F / nf) + R() * 2, zr + R() * 1.5, R() * 0.3, (b.arm === 'ky' ? 0.95 : 1.2) * (0.92 + rnd() * 0.16), b.side, 0, b.id]);
    }
    if (ground) flags.length = 0;
    // ---- trees the plan asks for: the wood lane's edge, lone old trees, a row along the road, willows by the ford
    const extra = [], clear = []; // extra: [x, z, species, height]; clear: rectangles kept free of woods [x0, x1, z0, z1]
    for (const b of blocks) if (!b.boat) {
      const pad = b.state === 'rout' ? 0 : 7, fwd = b.state === 'rout' ? 230 : 0;
      clear.push([b.x - b.F / 2 - pad, b.x + b.F / 2 + pad, Math.min(b.z - b.depth / 2, b.z - b.face * fwd) - pad, Math.max(b.z + b.depth / 2, b.z - b.face * fwd) + pad]);
    }
    for (const side of ['A', 'D']) { const p = posts[side]; clear.push([p.x - 45, p.x + 45, p.z - 40, p.z + 40]); const g = gens[side]; clear.push([g.x - 16, g.x + 16, g.z - 16, g.z + 16]); }
    if (mode !== 'deploy') for (const l of lanes) if (l.both) clear.push([l.x0 + 8, l.x1 - 8, l.zc - 16, l.zc + 16]);
    const cleared = (x, z, m = 0) => clear.some((c) => x > c[0] - m && x < c[1] + m && z > c[2] - m && z < c[3] + m);
    const woodEdge = (x) => -34 + 14 * Math.sin(x / 37 + D.seed) + 9 * Math.sin(x / 13 + 2 * D.seed); // z of a wood lane's forest edge
    for (const l of lanes) {
      if (l.kind === 'wood') { // big trees along the forest edge and scattered through the open wood before it
        for (let x = l.x0 - 30; x < l.x1 + 30; x += 7 + rnd() * 6) { const z = woodEdge(x) - 6 - rnd() * 16; if (!cleared(x, z, 2)) extra.push([x, z, rnd() < 0.45 ? 1 : rnd() < 0.5 ? 2 : 0, 15 + rnd() * 7]); }
        for (let i = 0; i < 70; i++) { const x = l.x0 + rnd() * l.w, z = woodEdge(x) + rnd() * 150; if (!cleared(x, z, 3)) extra.push([x, z, rnd() < 0.5 ? 1 : 0, 11 + rnd() * 7]); }
      }
      if (l.kind === 'hill') { const x = l.cx + (rnd() < 0.5 ? -1 : 1) * l.w * 0.34, z = -95 - rnd() * 30; if (!cleared(x, z, 3)) extra.push([x, z, 2, 17 + rnd() * 3]); } // a lone maple on the crest
      if (l.kind === 'open' && rnd() < 0.8) { const x = l.cx + R() * l.w * 0.7, z = (rnd() < 0.5 ? 1 : -1) * (150 + rnd() * 60); if (!cleared(x, z, 4)) extra.push([x, z, rnd() < 0.5 ? 0 : 1, 14 + rnd() * 5]); }
    }
    for (let z = -1500; z < 1500; z += 34 + rnd() * 16) { if (Math.abs(z) < 260) continue; for (const s of [-1, 1]) if (rnd() < 0.7) { const x = roadX(z) + s * (9 + rnd() * 3); if (!cleared(x, z, 2)) extra.push([x, z, rnd() < 0.7 ? 0 : 4, 11 + rnd() * 5]); } } // the Han planted trees along its roads
    if (riv) for (let i = 0; i < riv.pts.length; i += 3) { const p = riv.pts[i]; if (Math.abs(p[1]) > 700 || Math.abs(p[0]) > width / 2 + 700) continue; if (rnd() < (p[4] > 0.2 ? 0.12 : 0.3)) { const s = rnd() < 0.5 ? -1 : 1, nx = riv.pts[Math.min(riv.pts.length - 1, i + 1)], tx = nx[0] - p[0], tz = nx[1] - p[1], tl = Math.hypot(tx, tz) || 1, off = p[2] + 6 + rnd() * 8, x = p[0] - (tz / tl) * off * s, z = p[1] + (tx / tl) * off * s; if (!cleared(x, z, 3) && Math.abs(x - roadX(z)) > 14) extra.push([x, z, 4, 9 + rnd() * 4]); } }
    // ---- reeds along the banks: thick in the ford's slack water, patchy elsewhere, none where the road crosses
    const reeds = [];
    if (riv) for (let i = 0; i < riv.pts.length; i++) {
      const p = riv.pts[i]; if (Math.abs(p[1]) > 900 || Math.abs(p[0]) > width / 2 + 600) continue;
      const nx = riv.pts[Math.min(riv.pts.length - 1, i + 1)], tx = nx[0] - p[0], tz = nx[1] - p[1], tl = Math.hypot(tx, tz) || 1;
      for (const s of [-1, 1]) {
        if (rnd() > (p[4] > 0.2 ? 0.8 : 0.5) * sstep(0.2, 0.55, Math.sin(i * 0.21 + s * 2 + D.seed) * 0.5 + 0.5 + p[4] * 0.3)) continue;
        for (let j = 0; j < 3; j++) { const off = p[2] - 3.5 + rnd() * 7, x = p[0] - (tz / tl) * off * s + R() * 5, z = p[1] + (tx / tl) * off * s + R() * 5; if (Math.abs(x - roadX(z)) < 12 || cleared(x, z, 1)) continue; reeds.push([x, z, rnd() * 6.28, 1.6 + rnd() * 1.1, rnd()]); }
      }
    }
    // ---- fire (hỏa công): flames round the burnt side's blocks in a wooded lane
    const fires = [];
    if (mode !== 'deploy') for (const f of D.fire) {
      const l = lanes[f.lane], burnt = f.side === 'A' ? 'D' : 'A', t = blocks.filter((b) => b.lane === l.i && b.side === burnt && !b.boat)[0];
      const cx = t ? t.x : l.cx, cz = t ? t.z : rowZ(burnt === 'D' ? 4 : 1);
      for (let i = 0; i < 14; i++) fires.push([cx + R() * (t ? t.F * 1.3 : 120), cz - face(burnt) * (rnd() * 40 - 10), 3 + rnd() * 5]);
    }
    // ---- the anchors the cinema stages from: the contact point, each side's main block in the lane
    for (const l of lanes) {
      const main = (side) => blocks.filter((b) => b.lane === l.i && b.side === side && combat(b)).sort((p, r) => r.n - p.n)[0];
      const a = main('A'), d = main('D');
      l.front = [l.cx, +l.zc.toFixed(1)]; l.A = a ? [+a.x.toFixed(1), +a.z.toFixed(1)] : [l.cx, rowZ(1)]; l.D = d ? [+d.x.toFixed(1), +d.z.toFixed(1)] : [l.cx, rowZ(4)];
    }
    // ---- hamlets far off the field, clear of the river and the road
    const hamlets = [];
    for (let i = 0, tries = 0; hamlets.length < 3 && tries < 60; tries++) {
      const x = (rnd() < 0.5 ? -1 : 1) * (width / 2 + 260 + rnd() * 700), z = -300 - rnd() * 1000 + (i === 2 ? 1500 : 0), ok = Math.abs(x - roadX(z)) > 90 && !(riv && riv.pts.some((p) => Math.hypot(p[0] - x, p[1] - z) < p[2] + 70)) && !hamlets.some((h) => Math.hypot(h[0] - x, h[1] - z) < 400);
      if (ok) { hamlets.push([x, z, rnd() * 6.28, 1 + Math.floor(rnd() * 7)]); i++; }
    }
    for (const [x, z] of hamlets) for (let i = 0; i < 6; i++) { const a = rnd() * 6.28, r = 26 + rnd() * 22; extra.push([x + Math.cos(a) * r, z + Math.sin(a) * r, rnd() < 0.6 ? 0 : rnd() < 0.5 ? 1 : 4, 10 + rnd() * 6]); }
    return { desc: D, tier, seed: D.seed, k: +k.toFixed(4), spread, LW, width, lanes, river: riv, road, blocks, figs, fallen, arrowsIn, boats, posts, gens, flags, extra, reeds, fires, hamlets, clear, decisive: dec.i, woodEdge };
  };

  // ---------------------------------------------------------------- the land (Nature's L interface) for a plan
  // Heights: a gently rolling plain, the hill lanes' rises, low ridges behind the defender, far mountains; the river cut
  // in with a shallow gravel-barred bed at the ford and a deep one elsewhere. Land use baked on a 512² grid over ±EXT
  // (r woods, g parcels, b road, a trampled): the woods from noise patches away from the field, the wood lanes and the
  // willows along the river, cleared where the blocks, the posts and the fight stand; parcels round the field; the
  // trampled ground under and between the hosts. Whatever Nature reads of a city (cheb, moat, camp) is far away.
  FB.land = function (plan, N) {
    const T = THREE, { h2, fbm2, ridged2 } = N.noise, EXT = 1600, WATER = -1.0, so = (plan.seed % 97) * 3.17;
    const lanes = plan.lanes, W2 = plan.width / 2, riv = plan.river, mode = plan.desc.mode;
    // the river: its sampled centreline in 50 m buckets (70 m margin), nearest point → signed distance from the bank,
    // the bed there and how much of a ford it is
    const RB = 50, rg = new Map(), rk = (i, j) => i * 65536 + j;
    if (riv) for (let i = 0; i < riv.pts.length - 1; i++) {
      const a = riv.pts[i], b = riv.pts[i + 1];
      for (let gi = Math.floor((Math.min(a[0], b[0]) - 70) / RB); gi <= Math.floor((Math.max(a[0], b[0]) + 70) / RB); gi++)
        for (let gj = Math.floor((Math.min(a[1], b[1]) - 70) / RB); gj <= Math.floor((Math.max(a[1], b[1]) + 70) / RB); gj++) { const kk = rk(gi, gj); if (!rg.has(kk)) rg.set(kk, []); rg.get(kk).push(i); }
    }
    const RIV = { d: 1e9, bed: 0, ford: 0 };
    const riverAt = (x, z) => {
      RIV.d = 1e9; RIV.bed = 0; RIV.ford = 0;
      const list = rg.get(rk(Math.floor(x / RB), Math.floor(z / RB))); if (!list) return RIV;
      let best = 1e9;
      for (const i of list) {
        const a = riv.pts[i], b = riv.pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1), 0, 1);
        const e = Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) - lerp(a[2], b[2], t);
        if (e < best) { best = e; RIV.bed = lerp(a[3], b[3], t); RIV.ford = lerp(a[4], b[4], t); }
      }
      RIV.d = best; return RIV;
    };
    const riverSD = (x, z) => (riv ? riverAt(x, z).d : 1e9);
    // the hill lanes: a broad rise from the toe (z ≈ +10) to the brow (z ≈ −75, wavy) where the defender stands, a
    // plateau behind, spilling 70 m past the lane's sides; a little broken on top
    const HILLS = lanes.filter((l) => l.kind === 'hill').map((l) => ({ l, H: 22 + h2(plan.seed, l.i) * 8 }));
    const hillAt = (x, z) => {
      let y = 0;
      for (const { l, H } of HILLS) {
        const u = Math.abs(x - l.cx), lat = sstep(l.w / 2 + 75, l.w / 2 - 25, u); if (!lat) continue;
        const brow = -72 + 14 * Math.sin((x - l.cx) / 60 + so), v = -z, prof = sstep(-12, -brow, v) * (1 - 0.4 * sstep(260, 520, v));
        y = Math.max(y, H * lat * prof * (0.92 + 0.16 * fbm2(x / 70 + so, z / 70)));
      }
      return y;
    };
    // low ridges behind the defender and a softer rise behind the attacker: the field sits in a shallow bowl
    const ridges = (x, z) => (z < -620 ? sstep(-620, -1150, z) * (28 + 60 * ridged2(x / 460 + so, z / 460)) * sstep(2600, 1600, Math.abs(x)) : 0) + (z > 900 ? sstep(900, 1500, z) * (10 + 30 * ridged2(x / 380, z / 380 + so)) : 0);
    const hills = (x, z) => hillAt(x, z) + ridges(x, z);
    const farMtn = (x, z) => { const r = Math.hypot(x * 0.85, z), kk = sstep(2300, 4300, r); return kk ? kk * (140 + 520 * ridged2(x / 700 + 9, z / 700, 5) ** 1.6 + 60 * ridged2(x / 160, z / 160)) : 0; };
    const inField = (x, z) => sstep(W2 + 60, W2 - 40, Math.abs(x)) * sstep(420, 300, Math.abs(z)); // the ground the hosts stand on: flatter
    const base = (x, z) => 3.2 + (6.2 - 3.4 * inField(x, z)) * (fbm2(x / 480 + so, z / 480) - 0.5) + 1.0 * (fbm2(x / 95, z / 95 + so) - 0.5);
    const h = (x, z) => {
      let y = base(x, z) + hills(x, z) + farMtn(x, z);
      if (riv) { const r = riverAt(x, z); if (r.d < 40) { const bars = r.ford * 1.25 * sstep(0.52, 0.72, fbm2(x / 19 + so, z / 19)), bed = r.bed + bars; y = lerp(bed, y, sstep(r.ford > 0.3 ? -8 : -4, r.ford > 0.3 ? 30 : 16, r.d)); } }
      return y;
    };
    // the road, in 100 m buckets
    const roads = [plan.road], RDB = 100, rdg = new Map();
    for (let i = 0; i < plan.road.length - 1; i++) { const a = plan.road[i], b = plan.road[i + 1]; for (let gi = Math.floor((Math.min(a[0], b[0]) - 40) / RDB); gi <= Math.floor((Math.max(a[0], b[0]) + 40) / RDB); gi++) for (let gj = Math.floor((Math.min(a[1], b[1]) - 40) / RDB); gj <= Math.floor((Math.max(a[1], b[1]) + 40) / RDB); gj++) { const kk = rk(gi, gj); if (!rdg.has(kk)) rdg.set(kk, []); rdg.get(kk).push(i); } }
    const roadD = (x, z) => { const list = rdg.get(rk(Math.floor(x / RDB), Math.floor(z / RDB))); let d = 1e9; if (list) for (const i of list) { const a = plan.road[i], b = plan.road[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1), 0, 1); d = Math.min(d, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t)); } return d; };
    // trampled ground: under every block and between the lines where they fight, round the posts, the rout's wake
    const tram = [];
    for (const b of plan.blocks) if (!b.boat) { const run = b.state === 'rout' ? 150 : 0; tram.push([b.x - b.F / 2 - 5, b.x + b.F / 2 + 5, Math.min(b.z - b.depth / 2, b.z - b.face * run) - 5, Math.max(b.z + b.depth / 2, b.z - b.face * run) + 5, b.state === 'rout' ? 0.55 : 0.8]); }
    for (const side of ['A', 'D']) { const p = plan.posts[side]; tram.push([p.x - 30, p.x + 30, p.z - 24, p.z + 24, 0.7]); }
    if (mode !== 'deploy') for (const l of lanes) if (l.both) tram.push([l.x0 + 6, l.x1 - 6, l.zc - 26, l.zc + 26, 0.95]);
    const tramAt = (x, z) => { let t = 0; for (const [a, b, c, d, s] of tram) { const e = Math.max(a - x, x - b, c - z, z - d); if (e < 12) t = Math.max(t, s * sstep(12, -4, e)); } return t * (0.55 + 0.6 * fbm2(x / 23 + so, z / 23)); };
    const cleared = (x, z, m) => plan.clear.some((c) => x > c[0] - m && x < c[1] + m && z > c[2] - m && z < c[3] + m);
    const hamletNear = (x, z, r) => plan.hamlets.some((hm) => Math.hypot(hm[0] - x, hm[1] - z) < r);
    const edge = plan.woodEdge;
    const woodRaw = (x, z) => {
      const out = Math.max(Math.abs(x) - (W2 + 110), -z - 560, z - 600); // > 0 off the battle ground
      let w = sstep(0.54, 0.66, fbm2(x / 300 + 11 + so, z / 300 + 4)) * sstep(-60, 120, out) * sstep(1500, 1100, Math.hypot(x, z * 0.9));
      for (const l of lanes) if (l.kind === 'wood') {
        const lat = sstep(l.w / 2 + 90, l.w / 2 - 5, Math.abs(x - l.cx)); if (!lat) continue;
        const e = edge(x), dense = sstep(e - 20, e - 110, z) * (1 - 0.5 * sstep(-700, -1100, z)), open = 0.34 * sstep(120, 40, z) * sstep(e - 30, e + 10, z) * (0.55 + 0.9 * fbm2(x / 45 + so, z / 45));
        w = Math.max(w, lat * Math.max(0.95 * dense, open));
      }
      if (riv) { const r = riverAt(x, z); if (r.d > 4 && r.d < 26 && r.ford < 0.25 && Math.abs(z) < 1200) w = Math.max(w, 0.42); }
      return w;
    };
    const EXTn = EXT, RES = 512, data = new Uint8Array(RES * RES * 4), wood = new Float32Array(RES * RES), field = new Float32Array(RES * RES), trm = new Float32Array(RES * RES);
    const ang = 0.13 + (plan.seed % 7) * 0.05, ca = Math.cos(ang), sa = Math.sin(ang);
    for (let j = 0; j < RES; j++) for (let i = 0; i < RES; i++) {
      const x = -EXTn + ((i + 0.5) / RES) * 2 * EXTn, z = -EXTn + ((j + 0.5) / RES) * 2 * EXTn, qq = (j * RES + i) * 4, sd = riverSD(x, z), rd = roadD(x, z), hl = hills(x, z);
      const road = sstep(6, 2.2, rd), tr = tramAt(x, z);
      let w = woodRaw(x, z);
      if (sd < 4 || rd < 10 || tr > 0.3 || cleared(x, z, 6) || hamletNear(x, z, 70)) w = 0;
      // parcels round the field (not on it): a rotated grid of strips, each a crop; thicker round the hamlets
      let f = 0;
      const onField = Math.abs(x) < W2 + 40 && z > -300 && z < 280;
      if (!w && !onField && sd > 18 && hl < 4 && rd > 8 && tr < 0.2 && Math.hypot(x, z) < 1500) {
        const u = x * ca - z * sa, v = x * sa + z * ca, cu = Math.floor(u / 72), cv = Math.floor(v / 34), hh = h2(cu + so, cv), fu = u / 72 - cu, fv = v / 34 - cv;
        if (hh < (hamletNear(x, z, 420) ? 0.95 : 0.78) && Math.min(fu, 1 - fu) * 72 > 1.5 && Math.min(fv, 1 - fv) * 34 > 1.5) f = 0.2 + 0.8 * h2(cu + 7, cv + 3);
      }
      wood[j * RES + i] = w; field[j * RES + i] = f; trm[j * RES + i] = tr;
      data[qq] = w * 255; data[qq + 1] = f * 255; data[qq + 2] = road * 255; data[qq + 3] = tr * 255;
    }
    const tex = new T.DataTexture(data, RES, RES, T.RGBAFormat); tex.magFilter = T.LinearFilter; tex.minFilter = T.LinearFilter; tex.needsUpdate = true;
    const at = (arr, x, z) => { const i = Math.floor(((x + EXTn) / (2 * EXTn)) * RES), j = Math.floor(((z + EXTn) / (2 * EXTn)) * RES); return i < 0 || j < 0 || i >= RES || j >= RES ? 0 : arr[j * RES + i]; };
    const far = 9e4, woodC = lanes.find((l) => l.kind === 'wood');
    return { EXT: EXTn, WATER, HC: 0, MOAT0: 0, MOAT1: 0, h, riverSD, waterSD: riverSD, dMoat: () => 1e9, riverAt: (x, z) => Object.assign({}, riverAt(x, z)), hills, hillAt, cheb: () => 1e4, huaiZ: () => -1e9, feiX: () => -1e5,
      roads, roadD, trampled: (x, z) => at(trm, x, z), woodAt: (x, z) => at(wood, x, z), fieldAt: (x, z) => at(field, x, z),
      CAMP: [far, far, 1], CAMP_R: { x0: far, x1: far + 1, z0: far, z1: far + 1 }, CAMP_GATE: 6.5, campIn: () => -1e9, landTex: tex, landData: data, landRes: RES,
      HILLS_C: [woodC ? woodC.cx : 0, -180], sides: { river: null, tributary: null, hills: null, camp: null }, seed: plan.seed, season: plan.desc.season, field: true,
      slope: (x, z) => { const e = 3; return Math.hypot(h(x + e, z) - h(x - e, z), h(x, z + e) - h(x, z - e)) / (2 * e); } };
  };
  // ---------------------------------------------------------------- the scene
  // Season colours the field reads in (sRGB): reed stems and tips, the dust the hosts raise
  const REEDS = { Xuân: [0x5f7a30, 0x9fb060], Hạ: [0x46702a, 0x86a24a], Thu: [0x8a6e36, 0xd6b870], Đông: [0x857660, 0xcbbfa6] };
  const DUST = { Xuân: 0x857a64, Hạ: 0xa39276, Thu: 0x9a8466, Đông: 0x8c8882 };
  const COATS = [[0.62, 0.38, 0.22], [0.8, 0.44, 0.24], [0.2, 0.18, 0.17], [1.05, 1.02, 0.98], [0.9, 0.74, 0.5], [0.42, 0.27, 0.17]]; // horse coats (× a pale coat), as crowd.js
  const SIGNAL = [0x2f5d8a, 0xa8322a, 0xc9a23a, 0xe4ddcc, 0x2a2622]; // the five banners of the directions (五方旗): blue, red, yellow, white, black

  // fire, smoke and dust: camera-facing quads drawn as instances, one draw call per look (battle.js's billboards, with
  // dust that glows when the camera looks toward the sun through it). aPos (centre, world), aSz (w, h, rotation, phase),
  // aCol (linear rgb, opacity). KIND 1 flame flicker, 2 glow pulse, 3 drifting smoke or dust.
  const BILL_VS = `attribute vec3 aPos; attribute vec4 aSz; attribute vec4 aCol; uniform float uTime; varying vec2 vUv; varying vec4 vCol; varying vec3 vW;
    void main() { vUv = uv; vCol = aCol; vec3 p = aPos; vec2 s = aSz.xy; float rot = aSz.z, ph = aSz.w;
    #if KIND == 1
      float ff = .75 + .35 * abs(sin(uTime * 9. + ph)) * (.7 + .3 * sin(uTime * 23. + ph * 2.)); p.y += (ff - .75) * s.y * .3; s = vec2(s.x * (.8 + .2 * ff), s.y * ff);
    #elif KIND == 2
      vCol.a *= .8 + .2 * sin(uTime * 13. + ph);
    #else
      p.x += sin(uTime * .3 + ph) * 2.; p.y += sin(uTime * .2 + ph * 1.3) * .6; rot += uTime * .05 * (fract(ph) - .5);
    #endif
      vW = p; vec4 mv = modelViewMatrix * vec4(p, 1.); vec2 q = position.xy * s; float c = cos(rot), sn = sin(rot);
      mv.xy += vec2(c * q.x - sn * q.y, sn * q.x + c * q.y); gl_Position = projectionMatrix * mv; }`;
  const BILL_FS = `uniform sampler2D map; uniform vec3 uSunDir; varying vec2 vUv; varying vec4 vCol; varying vec3 vW;
    void main() { vec4 c = texture2D(map, vUv) * vCol;
    #ifdef ATEST
      if (c.a < ATEST) discard;
    #endif
    #ifdef GLOW
      c.rgb *= 1. + GLOW * pow(max(dot(normalize(vW - cameraPosition), uSunDir), 0.), 4.);
    #endif
      gl_FragColor = c;
      #include <tonemapping_fragment>
      #include <encodings_fragment>
    }`;

  FB.create = function (desc, deps) {
    const T = THREE, BGU = THREE.BufferGeometryUtils, t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    const HM = deps.HM, P = HM.parts, N = deps.Nature || root.Nature, env = deps.env || null, tier = tierOf(deps.q), TQ = TIER[tier], qN = deps.q || tier;
    const plan = FB.plan(desc, tier), D = plan.desc, L = FB.land(plan, N), lanes = plan.lanes, ground = D.mode === 'ground', mode = ground ? 'deploy' : D.mode, V = D.result;
    const atk = D.attacker, dfd = D.defender, SIDES = { A: atk, D: dfd };
    const group = new T.Group(); group.name = 'field-battle';
    const U = { time: { value: 0 } }, texs = [], mats = [], keep = new Set(); // keep: geometries the model kit caches (not ours to dispose)
    const rnd = lcg(D.seed * 31 + 7), R = () => rnd() - 0.5, Y = (x, z) => L.h(x, z);
    // ---- the light: desc.hour (default 17.5) and the season, unless only the host's sun is given
    const S0 = D.hour != null || !deps.sun ? FB.sunAt(D.hour != null ? D.hour : 17.5, D.season) : null;
    const sun = S0 ? Object.assign({}, S0, { dir: new T.Vector3(...S0.dir).normalize(), color: new T.Color(...S0.color) })
      : Object.assign(FB.sunAt(17.5, D.season), { dir: deps.sun.dir.clone().normalize(), color: deps.sun.color.clone() });
    const lightSun = { dir: sun.dir, color: sun.color };
    const shadowsOn = tier !== 'low';
    const M4 = new T.Matrix4(), Q4 = new T.Quaternion(), EU = new T.Euler(), V3 = new T.Vector3(), SC = new T.Vector3(), C3 = new T.Color(), UP = new T.Vector3(0, 1, 0);
    // instances of one geometry on a material: rows [x, y, z, yaw, sx, sy, sz, pitch, roll, [r, g, b]]; every
    // InstancedMesh on the kit's material carries instance colours (three r146 keeps one program per material)
    const inst = (geo, material, list, shadow = true) => {
      const m = new T.InstancedMesh(geo, material, Math.max(1, list.length));
      list.forEach((p, i) => { m.setMatrixAt(i, M4.compose(V3.set(p[0], p[1], p[2]), Q4.setFromEuler(EU.set(p[7] || 0, p[3] || 0, p[8] || 0, 'YXZ')), SC.set(p[4] ?? 1, p[5] ?? p[4] ?? 1, p[6] ?? p[4] ?? 1))); m.setColorAt(i, C3.setRGB(...(p[9] || [1, 1, 1]))); });
      if (!list.length) { m.setColorAt(0, C3.setRGB(1, 1, 1)); m.count = 0; }
      m.castShadow = shadow && shadowsOn; m.receiveShadow = true; m.frustumCulled = false; group.add(m); return m;
    };
    const one = (geo, x, z, yaw = 0, dy = 0, material = HM.mat, s = 1) => { const m = new T.Mesh(geo, material); m.position.set(x, Y(x, z) + dy, z); m.rotation.y = yaw; m.scale.setScalar(s); m.castShadow = shadowsOn; m.receiveShadow = true; group.add(m); return m; };

    // ---------------------------------------------------------------- nature: terrain, water, trees (the plan's extra trees with them)
    const terrain = N.terrain(L, env, qN); group.add(terrain);
    const water = plan.river ? N.water(L, env) : null; if (water) group.add(water);
    const trees = N.trees(L, env, lightSun, plan.extra, qN); group.add(trees);
    // reeds: clumps of blades (three segments each, stem to a paler tip) and a few seed heads, swaying; the season's colours
    const reeds = (() => {
      const [stem, tip] = REEDS[D.season], share = tier === 'high' ? 1 : tier === 'mid' ? 0.6 : 0.3, list = plan.reeds.filter((_, i) => (i * share) % 1 < share - 1e-6 || share === 1);
      if (!list.length) return null;
      const pos = [], col = [], sw = [], nrm = [], idx = [], cS = new T.Color(stem), cT = new T.Color(tip), rr = lcg(77);
      const blade = (bx, bz, h, lean, a, w) => {
        const b = pos.length / 3;
        for (let i = 0; i <= 3; i++) { const t = i / 3, off = lean * t * t, ww = w * (1 - t * 0.85), cx = bx + Math.cos(a) * off, cz = bz + Math.sin(a) * off, px = -Math.sin(a) * ww, pz = Math.cos(a) * ww, c = cS.clone().lerp(cT, t);
          pos.push(cx - px, h * t, cz - pz, cx + px, h * t, cz + pz); col.push(c.r, c.g, c.b, c.r, c.g, c.b); sw.push(t * t, t * t); nrm.push(Math.cos(a) * 0.4, 0.9, Math.sin(a) * 0.4, Math.cos(a) * 0.4, 0.9, Math.sin(a) * 0.4); }
        for (let i = 0; i < 3; i++) { const q = b + i * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
      };
      for (let i = 0; i < 12; i++) { const a = rr() * 6.28, r = rr() * 0.4; blade(Math.cos(a) * r, Math.sin(a) * r, 0.62 + rr() * 0.38, 0.1 + rr() * 0.3, rr() * 6.28, 0.024); }
      if (D.season !== 'Xuân') for (let i = 0; i < 2; i++) { const a = rr() * 6.28, x = Math.cos(a) * 0.15, z = Math.sin(a) * 0.15, b = pos.length / 3, hd = new T.Color(0x3a2616); // a cattail: a dark head on a bare stem
        for (const [y, r] of [[0.9, 0.022], [1.02, 0.022], [1.02, 0.035], [1.16, 0.035]]) for (let k = 0; k < 4; k++) { const aa = (k / 4) * 6.28; pos.push(x + Math.cos(aa) * r, y, z + Math.sin(aa) * r); col.push(hd.r, hd.g, hd.b); sw.push(1); nrm.push(Math.cos(aa), 0.3, Math.sin(aa)); }
        for (let s = 0; s < 3; s++) for (let k = 0; k < 4; k++) { const q = b + s * 4 + k, q2 = b + s * 4 + ((k + 1) % 4); idx.push(q, q2, q + 4, q2, q2 + 4, q + 4); } }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nrm, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setAttribute('sway', new T.Float32BufferAttribute(sw, 1)); g.setIndex(idx);
      const mat = new T.MeshStandardMaterial({ vertexColors: true, side: T.DoubleSide, roughness: 0.9, metalness: 0, envMap: env, envMapIntensity: 0.3 }); mats.push(mat);
      mat.onBeforeCompile = (sh) => { sh.uniforms.uTime = U.time; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float sway; uniform float uTime;').replace('#include <begin_vertex>', `#include <begin_vertex>
        { vec3 ip = vec3(0.);
        #ifdef USE_INSTANCING
          ip = instanceMatrix[3].xyz;
        #endif
          float ph = uTime * 1.5 + ip.x * .05 + ip.z * .043; transformed.x += (sin(ph) * .1 + sin(ph * 2.3 + position.y * 3.) * .035) * sway; transformed.z += cos(ph * .8) * .06 * sway; }`); };
      mat.customProgramCacheKey = () => 'fb-reed';
      const m = inst(g, mat, list.map(([x, z, yaw, h, b]) => { const y = Y(x, z), c = 0.8 + 0.35 * b; return [x, Math.max(y, L.WATER - 0.35) - 0.05, z, yaw, h * 0.9, h, h * 0.9, 0, 0, [c, c * (0.97 + 0.05 * b), c * 0.92]]; }), tier === 'high');
      return m;
    })();
    // boulders: on the hill lanes' slopes and crest, a few by the ford and in the open lanes, the rock shader of Nature
    const rockMat = N.rockMaterial ? N.rockMaterial(env, qN) : new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }); mats.push(rockMat);
    const boulderGeo = (seed) => {
      let g = new T.IcosahedronGeometry(0.5, 2); g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = BGU.mergeVertices(g);
      const p = g.attributes.position, col = new Float32Array(p.count * 3), v = new T.Vector3(), f3 = N.noise.fbm3;
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const d = (f3(v.x * 2 + seed, v.y * 2, v.z * 2) - 0.5) * 0.5 + (f3(v.x * 6 + seed, v.y * 6, v.z * 6) - 0.5) * 0.14; v.multiplyScalar(1 + d); if (v.y < -0.1) v.y = -0.1 - (v.y + 0.1) * 0.2; v.y *= 0.72; p.setXYZ(i, v.x, v.y, v.z); const ao = clamp(0.66 + d * 2.4, 0.28, 1.05); col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = ao; }
      g.setAttribute('color', new T.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
    };
    const stones = [[], []], freeAt = (x, z, m) => !plan.clear.some((c) => x > c[0] - m && x < c[1] + m && z > c[2] - m && z < c[3] + m) && L.roadD(x, z) > 8 && L.riverSD(x, z) > 2;
    for (const l of lanes) {
      const n = l.kind === 'hill' ? 34 : l.kind === 'ford' ? 10 : 4;
      for (let i = 0, tries = 0; i < n && tries < 400; tries++) {
        const x = l.cx + R() * (l.w + 60), z = l.kind === 'hill' ? -20 - rnd() * 240 : l.kind === 'ford' ? R() * 160 : R() * 420, s = l.kind === 'hill' ? 1 + rnd() * rnd() * 5 : 0.8 + rnd() * 2.2;
        if (!freeAt(x, z, 3 + s) || (l.kind === 'ford' && Math.abs(L.riverSD(x, z) - 6) > 8)) continue;
        stones[i % 2].push([x, Y(x, z) - s * 0.18, z, rnd() * 6.28, s, s * (0.7 + rnd() * 0.5), s * (0.8 + rnd() * 0.4)]); i++;
      }
    }
    stones.forEach((list, v) => { if (list.length) inst(boulderGeo(3.1 + v * 4.7), rockMat, list, true); });

    // ---------------------------------------------------------------- models (metres, facing +x), from the kit
    const Vv = (a) => new T.Vector3(a[0], a[1], a[2]);
    const poly = (list, pts, o) => { const n = Vv(pts[1]).sub(Vv(pts[0])).cross(Vv(pts[2]).sub(Vv(pts[0]))), p = n.dot(Vv(o)) < 0 ? [...pts].reverse() : pts; for (let i = 1; i < p.length - 1; i++) list.push(...p[0], ...p[i], ...p[i + 1]); };
    const flat = (list, c) => P.paint(P.tris(list), c);
    // a cloth hip roof, each slope a small grid sagging between the ridge, the hip ropes and the eave (battle.js's camp)
    const clothRoof = (w, d, h, y0, sag, c, n = 5) => {
      if (d > w) return P.xf(clothRoof(d, w, h, y0, sag, c, n), [0, 0, 0], [0, Math.PI / 2, 0]);
      const r = (w - d) / 2, parts = [], faces = [[[-w / 2, y0, d / 2], [w / 2, y0, d / 2], [-r, y0 + h, 0], [r, y0 + h, 0]], [[w / 2, y0, -d / 2], [-w / 2, y0, -d / 2], [r, y0 + h, 0], [-r, y0 + h, 0]], [[w / 2, y0, d / 2], [w / 2, y0, -d / 2], [r, y0 + h, 0], [r, y0 + h, 0]], [[-w / 2, y0, -d / 2], [-w / 2, y0, d / 2], [-r, y0 + h, 0], [-r, y0 + h, 0]]];
      for (const [E0, E1, R0, R1] of faces) {
        const pos = [], idx = [];
        for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) { const s = i / n, t = j / n, e = [0, 1, 2].map((q) => E0[q] + (E1[q] - E0[q]) * s), rr = [0, 1, 2].map((q) => R0[q] + (R1[q] - R0[q]) * s); pos.push(e[0] + (rr[0] - e[0]) * t, e[1] + (rr[1] - e[1]) * t - sag * Math.sin(Math.PI * t) * (0.35 + 0.65 * Math.sin(Math.PI * s)), e[2] + (rr[2] - e[2]) * t); }
        for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = j * (n + 1) + i; idx.push(a, a + 1, a + n + 1, a + 1, a + n + 2, a + n + 1); }
        const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
        const mid = Math.floor(n / 2) * (n + 1) + Math.floor(n / 2); if (g.attributes.normal.getY(mid) < 0) { for (let q = 0; q < idx.length; q += 3) { const tmp = idx[q + 1]; idx[q + 1] = idx[q + 2]; idx[q + 2] = tmp; } g.setIndex(idx); g.computeVertexNormals(); }
        parts.push(P.paint(g, c));
      }
      return BGU.mergeBufferGeometries(parts);
    };
    // the general's tent (a wall tent, hip roof of cloth in his colour, a valance, an awning on poles over the door, +z)
    const tentGeo = (fc) => {
      const k = P.kit(), w = 10, d = 7, hw = 2.5, hr = 3.4, cloth = 0x8e7e64, roof = P.mix(P.shade(fc, -0.2), 0x6e3e30, 0.35), trim = 0x2d2621;
      for (const [sx, sz, ww, dd] of [[0, 1, w, 0.08], [0, -1, w, 0.08], [1, 0, 0.08, d], [-1, 0, 0.08, d]]) k.add(P.rbox(ww, hw, dd, 0), cloth, [sx * (w / 2 - 0.04), hw / 2, sz * (d / 2 - 0.04)]);
      k.push(clothRoof(w + 0.9, d + 0.9, hr, hw, 0.3, roof));
      k.add(P.rbox(w - d + 0.3, 0.22, 0.22, 0), P.shade(roof, -0.35), [0, hw + hr + 0.05, 0]);
      for (const [sx, sz, ww, dd] of [[0, 1, w + 0.9, 0.05], [0, -1, w + 0.9, 0.05], [1, 0, 0.05, d + 0.9], [-1, 0, 0.05, d + 0.9]]) k.add(P.rbox(ww, 0.42, dd, 0), trim, [sx * (w / 2 + 0.45), hw - 0.2, sz * (d / 2 + 0.45)]);
      k.add(P.rbox(2.4, hw * 0.86, 0.1, 0), 0x2a2018, [0, hw * 0.43, d / 2 + 0.02]);
      const aw = []; poly(aw, [[-3.2, 2.7, d / 2 + 0.1], [3.2, 2.7, d / 2 + 0.1], [3.2, 2.35, d / 2 + 4.2], [-3.2, 2.35, d / 2 + 4.2]], [0, 1, 0]); k.push(flat(aw, P.shade(roof, 0.08)));
      for (const sx of [-1, 1]) k.add(P.cyl(0.06, 0.07, 2.4, 5), 0x3e2c1e, [sx * 3.1, 1.2, d / 2 + 4.1]);
      k.add(P.rbox(7, 0.2, 5, 0), 0x6a4a30, [0, 0.1, d / 2 + 2.2]); // a plank floor under the awning
      return k.geo();
    };
    const drumGeo = () => { // 建鼓: the Han war drum on its pole, a canopy on top
      const k = P.kit();
      for (const ry of [0, Math.PI / 2]) k.add(P.rbox(2.4, 0.25, 0.3, 0), 0x3e2c1e, [0, 0.12, 0], [0, ry, 0]);
      k.add(P.cyl(0.08, 0.1, 6.4, 6), 0x6a2a1e, [0, 3.2, 0]);
      k.add(P.lathe([[0.6, -0.7], [0.76, -0.35], [0.8, 0], [0.76, 0.35], [0.6, 0.7]], 12), 0x8e2a22, [0, 2.3, 0], [0, 0, Math.PI / 2]);
      for (const sx of [-1, 1]) k.add(P.cyl(0.6, 0.6, 0.04, 12), 0xd9c9a2, [sx * 0.71, 2.3, 0], [0, 0, Math.PI / 2]);
      k.add(P.cone(0.95, 0.55, 8), 0x9c2f28, [0, 6.55, 0]); k.add(P.sph(0.14, 6, 4), 0xc8a050, [0, 6.9, 0]);
      return k.geo();
    };
    const canopyGeo = (fc) => { // 華蓋: the general's parasol on a tall pole, fringed
      const k = P.kit(), c = P.mix(fc, 0x9c2f28, 0.3);
      k.add(P.cyl(0.05, 0.07, 5.2, 6), 0x3a2414, [0, 2.6, 0]); k.add(P.cone(1.6, 0.6, 12), c, [0, 5.35, 0]);
      k.add(P.cyl(1.6, 1.6, 0.4, 12, true), P.shade(c, -0.3), [0, 4.85, 0]); k.add(P.sph(0.13, 6, 4), 0xc8a050, [0, 5.75, 0]);
      return k.geo();
    };
    const rackGeo = () => { const k = P.kit(), w = 0x4e3826; for (const x of [-1.6, 1.6]) k.add(P.rbox(0.14, 1.9, 0.14, 0), w, [x, 0.95, 0]); for (const hh of [0.5, 1.6]) k.add(P.rbox(3.4, 0.1, 0.12, 0), w, [0, hh, 0]); for (let i = 0; i < 9; i++) { const x = -1.4 + i * 0.35; k.add(P.cyl(0.025, 0.03, 3.4, 4), 0x4a3423, [x, 1.66, -0.22], [0.12, 0, 0]); k.add(P.cone(0.05, 0.32, 4), 0x9aa0a8, [x, 3.5, -0.02], [0.12, 0, 0]); } return k.geo(); };
    // the fallen: a man lying along +x (the head there), on his back with his shield beside him (v 0) or on his face (v 1)
    const lyingGeo = (fc, v) => {
      const k = P.kit(), skin = 0xc79a74, dark = 0x2a221d;
      k.add(P.rbox(0.88, 0.19, 0.16, 0), dark, [-0.44, 0.1, -0.11], [0, v ? 0.25 : 0, 0]); k.add(P.rbox(0.84, 0.19, 0.16, 0), dark, [-0.42, 0.1, 0.13], [0, v ? -0.1 : -0.4, 0]);
      k.add(P.rbox(0.62, 0.3, 0.5, 0.2), fc, [0.24, 0.16, 0]); k.add(P.rbox(0.32, 0.22, 0.46, 0.2), P.shade(fc, -0.25), [-0.08, 0.13, 0]);
      k.add(P.sph(0.12, 6, 4), skin, [0.66, 0.13, 0]); k.add(P.cone(0.15, 0.2, 6), 0x4b4f55, [0.92, 0.12, v ? -0.3 : 0.25], [0, 0, -1.3]);
      k.add(P.rbox(0.56, 0.1, 0.1, 0), fc, [0.36, 0.1, v ? -0.44 : 0.42], [0, v ? 0.9 : -0.7, 0]);
      if (!v) k.add(P.rbox(0.07, 0.95, 0.6, 0), P.shade(fc, -0.45), [0.1, 0.05, -0.78], [0, 0.4, Math.PI / 2]);
      k.add(P.cyl(0.025, 0.025, 3.3, 3), 0x4a3423, [0.1, 0.05, v ? 0.95 : -1.2], [0, v ? 0.35 : -0.25, Math.PI / 2]);
      return k.geo();
    };
    const deadHorseGeo = () => { // on its side, legs out, painted pale (the instance colour gives the coat)
      const k = P.kit(), c = 0xa89c88, dk = 0x2a221c;
      k.add(P.rbox(1.9, 0.62, 0.78, 0.4), c, [0, 0.33, 0]); k.add(P.rbox(0.9, 0.32, 0.34, 0.35), c, [1.22, 0.2, 0.14], [0, -0.35, 0]); k.add(P.rbox(0.62, 0.24, 0.27, 0.35), c, [1.72, 0.14, 0.36], [0, -0.6, 0]);
      for (const [x, z, a] of [[0.7, 0.75, 0.5], [0.5, 0.9, 0.95], [-0.7, 0.75, -0.4], [-0.8, 0.92, -0.1]]) k.add(P.rbox(1.0, 0.12, 0.12, 0), c, [x, 0.12, z], [0, a, 0]);
      k.add(P.rbox(0.7, 0.09, 0.12, 0), dk, [-1.25, 0.1, 0.1], [0, 0.4, 0]); k.add(P.rbox(0.9, 0.12, 0.8, 0), 0x3a2a1c, [0, 0.66, 0]);
      return k.geo();
    };
    const arrowGeo = () => { const k = P.kit(); k.add(new T.BoxGeometry(0.03, 0.85, 0.03), 0x4a3a28, [0, 0.42, 0]); for (const r of [0, Math.PI / 2]) k.add(new T.BoxGeometry(0.1, 0.16, 0.004), 0xd8cfb8, [0, 0.76, 0], [0, r, 0]); return k.geo(); };

    // ---------------------------------------------------------------- the hosts: one crowd per side
    const CL = deps.Crowd || (root.Battle && root.Battle.Crowd);
    if (!CL) throw new Error('FieldBattle: no crowd module (load crowd.js or battle.js)');
    const AN = CL.ANIMS || null, has = (body, a) => !!(AN && AN[body] && AN[body][a]);
    // a figure's role → [crowd kind, loop]; the loops crowd.js adds (charge, strike, brace, volley, rout, cheer) when present
    const ROLE = {
      foot: { stand: ['idle', 'idle'], guard: ['idle', 'idle'], brace: ['idle', has('foot', 'brace') ? 'brace' : 'idle'], front: ['fight', has('foot', 'strike') ? 'strike' : 'fight'], advance: ['spear', has('foot', 'charge') ? 'charge' : 'walk'], rout: ['run', has('foot', 'rout') ? 'rout' : 'run'], hold: ['idle', 'idle'], cheer: ['idle', has('foot', 'cheer') ? 'cheer' : 'idle'], shoot: ['idle', 'idle'], charge: ['run', 'run'], flee: ['run', 'run'] },
      bow: { stand: ['bow', 'idle'], guard: ['bow', 'idle'], brace: ['bow', 'idle'], front: ['fight', 'fight'], advance: ['bow', 'walk'], rout: ['run', has('foot', 'rout') ? 'rout' : 'run'], hold: ['bow', 'idle'], cheer: ['bow', 'idle'], shoot: ['bow', has('bow', 'volley') ? 'volley' : 'bow'], charge: ['run', 'run'], flee: ['run', 'run'] },
      rider: { stand: ['rider', 'stand'], guard: ['rider', 'stand'], brace: ['rider', 'stand'], front: ['rider', 'trot'], advance: ['rider', 'walk'], rout: ['rider', 'trot'], hold: ['rider', 'stand'], cheer: ['rider', 'stand'], shoot: ['rider', 'stand'], charge: ['rider', has('rider', 'charge') ? 'charge' : 'trot'], flee: ['rider', 'trot'] },
    };
    const mkCrowd = (s) => CL.create({ HM, colors: { [s.fid]: s.color }, q: deps.q || tier, Nature: N, renderer: deps.renderer });
    const crowds = { A: mkCrowd(atk), D: mkCrowd(dfd) }; group.add(crowds.A.group, crowds.D.group);
    const addRows = (side, kind, rows) => { if (!rows.length) return null; const h = crowds[side].add(kind, rows); return h && h !== crowds[side] && h.count != null ? h : null; };
    const deep = (y) => y < L.WATER - 0.95; // a man does not stand in water over his waist
    // with a crowd that moves (crowd.js move / play): the plan's staging (block.move, lane.tc) is played from the build on
    const MOVE = !!(crowds.A.move && crowds.A.play && crowds.D.move) && !(desc && desc.motion === false);
    const T0 = MOVE && Number.isFinite(crowds.A.time) ? crowds.A.time : 0, tcOf = (b) => T0 + (lanes[b.lane].tc || 0.4);
    const REST = { rider: 'stand', horse: 'stand' }, rest = (kind) => REST[kind] || 'idle';
    const safe = (fn) => { try { fn(); } catch (e) { console.warn('FieldBattle: crowd motion', e); } };
    const units = [];
    for (const b of plan.blocks) {
      const by = {}, mv = MOVE ? b.move : null, back = mv && !mv.away && b.state !== 'pursue' ? -b.face * mv.d : 0; // a block that closes starts `d` behind its place
      for (const [x, z, yaw, body, role, ph] of b.figs) {
        const y = Y(x, z); if (deep(y)) continue;
        const [kind, anim] = (ROLE[body] || ROLE.foot)[role] || ROLE.foot.stand;
        (by[kind + '|' + anim] = by[kind + '|' + anim] || [kind, anim, []])[2].push([x, y, z, yaw, anim, ph]);
      }
      const handles = [];
      for (const [kind, anim, rows] of Object.values(by)) {
        const brace = MOVE && b.state === 'fight' && !back && kind === 'fight'; // the side that is charged braces, then strikes
        const add = back ? rows.map((r) => { const z = r[2] + back; return [r[0], Y(r[0], z), z, r[3], rest(kind), r[5]]; }) : brace ? rows.map((r) => [r[0], r[1], r[2], r[3], has('foot', 'brace') ? 'brace' : 'idle', r[5]]) : rows;
        const h = addRows(b.side, kind, add), c = crowds[b.side];
        handles.push({ kind, anim, handle: h, count: add.length });
        if (!MOVE || !h) continue;
        safe(() => {
          if (back) c.move(h, { to: rows.map((r) => [r[0], r[1], r[2], r[3]]), t0: T0 + mv.t0, dur: mv.dur, ease: mv.ease, stagger: 0.35, anim: 'charge', then: anim });
          else if (mv) c.move(h, { dx: 0, dz: (mv.away ? -1 : 1) * b.face * mv.d, ground: Y, t0: T0 + mv.t0, dur: mv.dur, ease: mv.ease, stagger: 0.6, anim: mv.away ? 'rout' : 'charge', then: false });
          if (brace) c.play(h, anim, { t0: tcOf(b), stagger: 0.5 });
          if (D.mode === 'clash' && (b.state === 'fight' || b.state === 'charge') && (kind === 'fight' || kind === 'rider')) { const pk = c.pick(h, 0.05); if (pk && pk.count) c.play(pk, 'die', { t0: tcOf(b) + 0.4, stagger: 2.4 }); }
        });
      }
      const move = mv ? { dz: back ? -back : (mv.away ? -1 : 1) * b.face * mv.d, t0: T0 + mv.t0, dur: mv.dur } : null;
      units.push({ id: b.id, side: b.side, arm: b.arm, lane: b.lane, row: b.row, men: b.w.men, figures: handles.reduce((s, h) => s + h.count, 0), state: b.state, at: [+b.x.toFixed(1), +b.z.toFixed(1)], front: b.face, boats: b.boats || 0, move, handle: (handles.find((h) => h.handle) || {}).handle || null, handles });
    }
    const moveOf = {}; for (const u of units) if (u.move) moveOf[u.id] = u.move;
    // ---- the command posts: the tent facing the front, drums either side of its door, the weapon rack, the five
    // banners of the directions, the guard in two files, the bodyguard horse, tethered horses; the general before it
    // under his parasol with his standard (in a result the victor rides forward; the loser's post stands empty, its
    // standard thrown down)
    const flagRows = { A: [], D: [] }, stdRows = { A: [], D: [] }, sigRows = [], downFlags = [];
    const drum = drumGeo(), rack = rackGeo();
    for (const side of ['A', 'D']) {
      const p = plan.posts[side], s = SIDES[side], f = p.face, yawF = yawTo(0, f), gx = plan.gens[side].x, gz = plan.gens[side].z;
      one(tentGeo(s.color), p.x, p.z, f < 0 ? Math.PI : 0, 0.05);
      for (const sx of [-1, 1]) one(drum, p.x + sx * 5.5, p.z + f * 10.5, 0);
      one(rack, p.x + p.sx * 9, p.z - f * 2, Math.PI / 2);
      for (let i = 0; i < 5; i++) sigRows.push([p.x - p.sx * (9 + i * 2.6), Y(p.x - p.sx * (9 + i * 2.6), p.z + f * 4), p.z + f * 4, R() * 0.3, 0.55, SIGNAL[i]]);
      if (ground) continue; // the stage that is laid on this ground brings its own generals and standards
      if (!p.abandoned) {
        const guard = [], riders = [], horses = [];
        for (let i = 0; i < 7; i++) for (const sx of [-1, 1]) { const x = p.x + sx * 3.2, z = p.z + f * (6 + i * 2.2); guard.push([x, Y(x, z), z, yawTo(-sx, 0) + R() * 0.2, 'idle', rnd()]); }
        for (let i = 0; i < 8; i++) { const x = p.x + p.sx * (14 + (i % 4) * 3.2), z = p.z + f * (12 + Math.floor(i / 4) * 5); riders.push([x, Y(x, z), z, yawF + R() * 0.3, 'stand', rnd()]); }
        for (let i = 0; i < 4; i++) { const x = p.x - p.sx * (7 + i * 2.2), z = p.z - f * 6; horses.push([x, Y(x, z), z, yawTo(0, f) + R() * 0.4, 'stand', rnd()]); }
        addRows(side, 'idle', guard); addRows(side, 'rider', riders); addRows(side, 'horse', horses);
      }
      const G = plan.gens[side];
      if (!G.down) {
        const gy = Y(gx, gz), guard = [];
        addRows(side, 'rider', [[gx, gy, gz, yawF, 'stand', 0.3]]);
        one(canopyGeo(s.color), gx - p.sx * 2.2, gz - f * 1.2, 0, -0.1);
        stdRows[side].push([gx + p.sx * 3, Y(gx + p.sx * 3, gz), gz - f * 1, R() * 0.2, 3.1]);
        if (G.forward) for (let i = 0; i < 8; i++) { const x = gx + (i - 3.5) * 3, z = gz - f * (6 + (i % 2) * 3); guard.push([x, Y(x, z), z, yawF + R() * 0.3, 'stand', rnd()]); }
        if (guard.length) addRows(side, 'rider', guard);
      } else downFlags.push([gx, Y(gx, gz), gz, rnd() * 6.28, 3.1, side]);
      if (!G.forward && !G.down) stdRows[side].push([p.x + p.sx * 5, Y(p.x + p.sx * 5, p.z + f * 12), p.z + f * 12, R() * 0.2, 2.4]);
    }
    for (const [x, z, yaw, size, side, carried, id] of plan.flags) { // a flag of a block that moves starts where the block starts
      const m = moveOf[id], z0 = m && !carried ? z - m.dz : z, dz = m ? m.dz : 0, y0 = Y(x, z0) + (carried ? -0.5 : 0);
      flagRows[side].push([x, y0, z0, yaw, size, m ? [0, Y(x, z0 + dz) - Y(x, z0), dz, m.t0, m.dur] : null]);
    }
    for (const c of Object.values(crowds)) if (c.flush) c.flush();

    // ---------------------------------------------------------------- the fallen, spent arrows, boats, hamlets
    const fl = { A: [[], []], D: [[], []] }, horsesDown = [];
    for (const [x, z, yaw, side, horse, ph] of plan.fallen) {
      const y = Y(x, z), b = 0.75 + 0.3 * ph;
      if (horse) horsesDown.push([x, y + 0.02, z, yaw, 1.05, 1, 1.05, 0, 0, COATS[Math.floor(ph * COATS.length)].map((c) => c * 0.85)]);
      else fl[side][ph < 0.5 ? 0 : 1].push([x, y + 0.01, z, yaw, 1, 1, 1, 0, 0, [b, b, b]]);
    }
    // with the lines closing on screen the fallen lie there only once they have met
    const late = [], tFall = MOVE && D.mode === 'clash' ? T0 + Math.min(...lanes.map((l) => l.tc || 0.4)) + 0.3 : -1;
    for (const side of ['A', 'D']) fl[side].forEach((list, v) => { if (list.length) late.push(inst(lyingGeo(SIDES[side].color, v), HM.mat, list, tier === 'high')); });
    if (horsesDown.length) late.push(inst(deadHorseGeo(), HM.mat, horsesDown, tier === 'high'));
    for (const m of late) m.visible = tFall <= 0;
    if (plan.arrowsIn.length) inst(arrowGeo(), HM.mat, plan.arrowsIn.map(([x, z, yaw, tilt]) => [x, Y(x, z) - 0.12, z, yaw, 1, 1, 1, tilt, 0]), false);
    const boats = [];
    for (const side of ['A', 'D']) {
      const list = plan.boats.filter((b) => b[3] === side); if (!list.length) continue;
      let geo = null; try { geo = HM.figure('thuy', SIDES[side].fid); keep.add(geo); } catch (e) { geo = null; }
      if (geo) boats.push(inst(geo, HM.mat, list.map(([x, z, yaw]) => [x, L.WATER + 0.12, z, yaw, 10, 10, 10]), true));
    }
    for (const [x, z, yaw, seed] of plan.hamlets) { const g = HM.hamlet(seed); keep.add(g); one(g, x, z, yaw, -0.1, HM.mat, 28); }

    // ---------------------------------------------------------------- flags: canvas cloths, a wave in the vertex shader
    const css = (c) => '#' + new T.Color(c).getHexString();
    const canvasTex = (w, h, draw) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new T.CanvasTexture(cv); t.encoding = T.sRGBEncoding; t.anisotropy = 4; texs.push(t); return t; };
    const FONT = '"Noto Serif TC","Noto Serif CJK TC","Noto Serif SC","Songti TC",serif';
    const flagTex = (fc, glyph) => canvasTex(64, 128, (g, w, h) => { // a block's flag: the colour, dark bands, the glyph in cream
      g.fillStyle = css(fc); g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, 0, w, 11); g.fillRect(0, h - 11, w, 11);
      g.strokeStyle = 'rgba(239,227,200,.55)'; g.lineWidth = 2; g.strokeRect(5, 15, w - 10, h - 30);
      g.fillStyle = '#efe3c8'; g.font = 'bold 42px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(glyph, w / 2, h / 2 + 2);
    });
    const stdTex = (fc, glyph) => canvasTex(128, 256, (g, w, h) => { // a general's standard: brass bands, a cream disc, a fringe on the fly
      g.fillStyle = css(fc); g.fillRect(0, 0, w, h); g.fillStyle = css(P.shade(fc, -0.4)); g.fillRect(0, 0, w, 20); g.fillRect(0, h - 20, w, 20);
      g.fillStyle = '#b8893a'; g.fillRect(0, 20, w, 4); g.fillRect(0, h - 24, w, 4);
      g.fillStyle = css(P.shade(fc, -0.4)); for (let y = 24; y < h - 24; y += 16) { g.beginPath(); g.moveTo(w, y); g.lineTo(w - 12, y + 8); g.lineTo(w, y + 16); g.fill(); }
      g.fillStyle = '#f3ead6'; g.beginPath(); g.arc(w / 2 - 4, h / 2, 46, 0, 7); g.fill();
      g.fillStyle = css(fc); g.font = 'bold 64px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(glyph, w / 2 - 4, h / 2 + 4);
    });
    const sigTex = canvasTex(32, 64, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, w, 5); g.fillRect(0, h - 5, w, 5); });
    const WAVE = `
      float fbU = clamp((position.x - 0.02) / 1.4, 0., 1.); vec3 fbI = vec3(0.);
      #ifdef USE_INSTANCING
        fbI = instanceMatrix[3].xyz;
      #endif
      float fbP = uTime * 2.3 + fbI.x * .071 + fbI.z * .053, fbA = fbP - fbU * 5.2, fbB = fbP * 1.63 - fbU * 9.1 + position.y * 1.3;
      float fbZ = (sin(fbA) * .19 + sin(fbB) * .055) * fbU, fbD = ((-cos(fbA) * 5.2 * .19 - cos(fbB) * 9.1 * .055) * fbU + sin(fbA) * .19 + sin(fbB) * .055) / 1.4;
      vec3 objectNormal = normalize(vec3(-fbD, 0., 1.));`;
    // a flag carried with its block: the instance's world offset aMv reached from aMt.x over aMt.y seconds
    const CARRY = `vec4 mvPosition = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
      #endif
      mvPosition.xyz += aMv * smoothstep(0., 1., clamp((uTime - aMt.x) / max(aMt.y, .001), 0., 1.));
      mvPosition = modelViewMatrix * mvPosition; gl_Position = projectionMatrix * mvPosition;`;
    const carried = (sh, wave) => {
      sh.uniforms.uTime = U.time;
      let v = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime; attribute vec3 aMv; attribute vec2 aMt;').replace('#include <project_vertex>', CARRY);
      if (wave) v = v.replace('#include <beginnormal_vertex>', WAVE).replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.z += fbZ; transformed.x -= abs(fbZ) * .3; transformed.y -= fbU * fbU * .1;');
      sh.vertexShader = v;
    };
    const clothMat = (map, glow = 0x4a4a4a) => { // a little light through the cloth: never a black flag against the sun
      const m = new T.MeshStandardMaterial({ map, emissiveMap: map, emissive: glow, side: T.DoubleSide, roughness: 0.85, metalness: 0 }); mats.push(m);
      m.onBeforeCompile = (sh) => carried(sh, true); m.customProgramCacheKey = () => 'fb-cloth';
      return m;
    };
    const poleMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0, envMap: env, envMapIntensity: 0.5 }); mats.push(poleMat);
    poleMat.onBeforeCompile = (sh) => carried(sh, false); poleMat.customProgramCacheKey = () => 'fb-pole';
    const depthOf = (wave) => { const m = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking }); m.onBeforeCompile = (sh) => carried(sh, wave); m.customProgramCacheKey = () => 'fb-flag-depth' + (wave ? 1 : 0); mats.push(m); return m; };
    const clothDepth = depthOf(true), poleDepth = depthOf(false);
    const clothGeo = new T.PlaneGeometry(1.4, 2.6, 12, 3).translate(0.72, 4.55, 0), sigCloth = new T.PlaneGeometry(1.4, 1.6, 10, 2).translate(0.72, 5.0, 0);
    const poleGeo = (() => { const k = P.kit(); k.add(P.cyl(0.06, 0.07, 6, 5), 0x3a2a1c, [0, 3, 0]); k.add(P.cone(0.07, 0.35, 4), 0x9aa0a8, [0, 6.17, 0]); k.add(P.sph(0.09, 5, 3), 0xb8893a, [0, 5.92, 0]); return k.geo(); })();
    // one cloth mesh and one pole mesh per kind of flag, the same rows [x, y, z, yaw, size, motion?] in both
    const clothInst = (geo, mat, rows, tintRows) => {
      if (!rows.length) return;
      const mv = new Float32Array(rows.length * 3), mt = new Float32Array(rows.length * 2).fill(1e6);
      rows.forEach((p, i) => { if (p[5]) { mv.set(p[5].slice(0, 3), i * 3); mt.set([p[5][3], p[5][4]], i * 2); } });
      for (const [base, material, depth] of [[geo, mat, clothDepth], [poleGeo, poleMat, poleDepth]]) {
        const g = base.clone(); g.setAttribute('aMv', new T.InstancedBufferAttribute(mv, 3)); g.setAttribute('aMt', new T.InstancedBufferAttribute(mt, 2));
        const m = new T.InstancedMesh(g, material, rows.length);
        rows.forEach((p, i) => { m.setMatrixAt(i, M4.compose(V3.set(p[0], p[1], p[2]), Q4.setFromAxisAngle(UP, p[3]), SC.setScalar(p[4]))); if (tintRows && material === mat) m.setColorAt(i, C3.set(tintRows[i])); });
        m.customDepthMaterial = depth; m.castShadow = shadowsOn; m.receiveShadow = material === poleMat; m.frustumCulled = false; group.add(m);
      }
    };
    let nFlags = 0;
    for (const side of ['A', 'D']) {
      const s = SIDES[side];
      clothInst(clothGeo, clothMat(flagTex(s.color, s.glyph)), flagRows[side]); clothInst(clothGeo, clothMat(stdTex(s.color, s.glyph)), stdRows[side]);
      nFlags += flagRows[side].length + stdRows[side].length;
    }
    clothInst(sigCloth, clothMat(sigTex, 0x161616), sigRows.map((r) => r.slice(0, 5)), sigRows.map((r) => r[5])); nFlags += sigRows.length;
    // a standard thrown down: the pole on the ground, the cloth crumpled beside it (static)
    for (const [x, y, z, yaw, size, side] of downFlags) {
      const k = P.kit(); k.add(P.cyl(0.06, 0.07, 6, 5), 0x3a2a1c, [3, 0.1, 0], [0, 0, Math.PI / 2]);
      const cl = new T.PlaneGeometry(1.4, 2.6, 6, 3), cp = cl.attributes.position; for (let i = 0; i < cp.count; i++) cp.setZ(i, Math.sin(cp.getX(i) * 4 + cp.getY(i) * 2) * 0.12); cl.computeVertexNormals();
      const cm = new T.Mesh(cl.rotateX(-Math.PI / 2 + 0.08).translate(4.5, 0.2, 0.9), new T.MeshStandardMaterial({ map: stdTex(SIDES[side].color, SIDES[side].glyph), side: T.DoubleSide, roughness: 0.9 })); mats.push(cm.material);
      const pm = new T.Mesh(k.geo(), HM.mat); for (const m of [cm, pm]) { m.position.set(x, y, z); m.rotation.y = yaw; m.scale.setScalar(size * 0.9); m.castShadow = shadowsOn; m.receiveShadow = true; group.add(m); }
    }

    // ---------------------------------------------------------------- dust, spray, fire, arrows in flight
    const fxRnd = lcg(D.seed * 13 + 3), fr = () => fxRnd(), fx = TQ.fx;
    const spriteTex = (draw, w = 128, h = 128) => canvasTex(w, h, draw);
    const smokeT = spriteTex((g, w, h) => { const r0 = lcg(5); for (let i = 0; i < 30; i++) { const x = w / 2 + (r0() - 0.5) * w * 0.45, y = h / 2 + (r0() - 0.5) * h * 0.45, r = w * (0.14 + r0() * 0.2), gr = g.createRadialGradient(x - r * 0.35, y - r * 0.35, 0, x, y, r); gr.addColorStop(0, 'rgba(255,246,232,0.34)'); gr.addColorStop(0.55, 'rgba(170,160,150,0.22)'); gr.addColorStop(1, 'rgba(90,84,78,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); } });
    const flameT = spriteTex((g, w, h) => { const gr = g.createRadialGradient(w / 2, h * 0.7, 2, w / 2, h * 0.62, h * 0.5); gr.addColorStop(0, 'rgba(255,245,200,1)'); gr.addColorStop(0.25, 'rgba(255,180,60,0.95)'); gr.addColorStop(0.6, 'rgba(230,80,20,0.55)'); gr.addColorStop(1, 'rgba(120,20,0,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(w / 2, 0); g.quadraticCurveTo(w, h * 0.55, w / 2, h); g.quadraticCurveTo(0, h * 0.55, w / 2, 0); g.fill(); }, 64, 128);
    const glowT = spriteTex((g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,170,80,0.8)'); gr.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    const billboards = (tex, kind, o, list) => {
      const n = list.length, base = new T.PlaneGeometry(1, 1), g = new T.InstancedBufferGeometry(), pos = new Float32Array(n * 3), sz = new Float32Array(n * 4), col = new Float32Array(n * 4);
      g.setIndex(base.index); g.setAttribute('position', base.attributes.position); g.setAttribute('uv', base.attributes.uv);
      list.forEach((b, i) => { pos.set(b.p, i * 3); sz.set([b.w, b.h, b.rot || 0, b.ph || 0], i * 4); col.set([b.c.r, b.c.g, b.c.b, b.a ?? 1], i * 4); });
      g.setAttribute('aPos', new T.InstancedBufferAttribute(pos, 3)); g.setAttribute('aSz', new T.InstancedBufferAttribute(sz, 4)); g.setAttribute('aCol', new T.InstancedBufferAttribute(col, 4)); g.instanceCount = n;
      const defines = { KIND: kind }; if (o.alphaTest) defines.ATEST = o.alphaTest.toFixed(3); if (o.glow) defines.GLOW = o.glow.toFixed(2);
      const mat = new T.ShaderMaterial({ uniforms: { map: { value: tex }, uTime: U.time, uSunDir: { value: sun.dir } }, vertexShader: BILL_VS, fragmentShader: BILL_FS, defines, transparent: true, depthWrite: !!o.depthWrite, blending: o.additive ? T.AdditiveBlending : T.NormalBlending });
      mats.push(mat); const m = new T.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = o.order || 0; group.add(m); return m;
    };
    const dustC = new T.Color(DUST[D.season]).multiply(new T.Color().copy(sun.color).lerp(new T.Color(1, 1, 1), 0.45)), sprayC = new T.Color(0.86, 0.9, 0.92), WHITE = new T.Color(1, 1, 1);
    const DS = [], SS = [], FL = [], GL = [], SD = [];
    const dust = (x, z, size, lift, a) => { const y = Math.max(Y(x, z), L.WATER); DS.push({ p: [x, y + lift, z], w: size, h: size * (0.7 + fr() * 0.4), rot: fr() * 6.28, ph: fr() * 6.28, c: dustC, a }); };
    for (const b of plan.blocks) {
      if (b.boat && mode === 'deploy') continue;
      const st = b.state, ky = b.arm === 'ky', n = Math.round((st === 'stand' ? (ky ? 5 : 2) : st === 'rout' ? 9 : st === 'charge' || st === 'pursue' ? 10 : st === 'fight' ? 3 : 2) * fx + 0.5);
      for (let i = 0; i < n; i++) {
        const along = (fr() - 0.5) * b.F, run = st === 'rout' ? fr() * 150 : st === 'pursue' ? fr() * 90 : 0, back = st === 'charge' ? b.depth * (0.4 + fr() * 0.7) : 0;
        dust(b.x + along, b.z + (st === 'pursue' ? b.face * run : -b.face * (back + run)) + (fr() - 0.5) * 6, (ky || st !== 'stand' ? 14 : 9) + fr() * 12, 1.5 + fr() * 3, (st === 'stand' ? 0.12 : 0.26) + fr() * 0.1);
      }
    }
    if (mode !== 'deploy') for (const l of lanes) if (l.both) for (let i = 0, n = Math.round(12 * fx + 2); i < n; i++) dust(l.cx + (fr() - 0.5) * l.w * 0.75, l.zc + (fr() - 0.5) * 18, 16 + fr() * 18, 3 + fr() * 6, 0.24 + fr() * 0.18); // the dust of the fight over each contact
    for (let i = 0, n = Math.round(10 * fx); i < n; i++) dust((fr() - 0.5) * plan.width, (fr() - 0.5) * 300, 70 + fr() * 50, 6 + fr() * 8, 0.05 + fr() * 0.04); // a haze over the field
    // spray where men fight in the water
    if (mode !== 'deploy' && plan.river) for (const b of plan.blocks) if (b.state === 'fight' || b.state === 'charge' || b.state === 'hold') for (const r of b.figs) { if (fr() > 0.35 * fx) continue; const y = Y(r[0], r[1]); if (y < L.WATER - 0.05 && y > L.WATER - 1) SS.push({ p: [r[0] + (fr() - 0.5), L.WATER + 0.35 + fr() * 0.4, r[1] + (fr() - 0.5)], w: 1.4 + fr() * 1.8, h: 1 + fr() * 1.2, rot: fr() * 6.28, ph: fr() * 6.28, c: sprayC, a: 0.55 }); }
    // hỏa công: flames through the wood round the burnt blocks, black smoke leaning with the wind, a glow, one light
    let lit = 0;
    for (const [x, z, size] of plan.fires) {
      const y = Y(x, z);
      for (let i = 0, n = Math.round(10 * fx + 3); i < n; i++) FL.push({ p: [x + (fr() - 0.5) * size * 2, y + size * 0.4 + fr() * size * 0.5, z + (fr() - 0.5) * size * 2], w: size * 0.6, h: size * 1.2, ph: fr() * 6, c: WHITE });
      GL.push({ p: [x, y + size * 0.5, z], w: size * 4, h: size * 4, c: WHITE, a: 0.5 });
      for (let i = 0, n = Math.round(22 * fx + 4); i < n; i++) { const t = i / n, g2 = 0.08 + 0.2 * t + 0.05 * fr(), hgt = t * 120, sc = size * 1.6 + hgt * 0.45; SD.push({ p: [x + hgt * 0.55 + (fr() - 0.5) * 6, y + size + hgt, z - hgt * 0.12 + (fr() - 0.5) * 6], w: sc, h: sc, rot: fr() * 6, ph: fr() * 6, c: new T.Color().setRGB(g2 * 1.05, g2, g2 * 0.92), a: 1 - t * 0.55 }); }
      if (lit < (tier === 'high' ? 1 : 0)) { lit++; const pl = new T.PointLight(0xff8a3a, 2.6, 160, 2); pl.position.set(x, y + 8, z); group.add(pl); }
    }
    const looks = [[SD, smokeT, 3, { alphaTest: 0.18, depthWrite: true }], [DS, smokeT, 3, { order: 1, glow: 1.4 }], [SS, smokeT, 3, { order: 1 }], [GL, glowT, 2, { additive: true, order: 2 }], [FL, flameT, 1, { additive: true, order: 3 }]];
    let nSprites = 0; for (const [list, tex, kind, o] of looks) if (list.length) { billboards(tex, kind, o, list); nSprites += list.length; }
    // arrows in flight in a clash: from every archer block toward the enemy's front in its lane
    let nArrows = 0;
    if (mode === 'clash') {
      const shaft = new T.BoxGeometry(0.06, 0.06, 1.1), arrows = [], arc = (a, b, t, hm) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + Math.sin(Math.PI * t) * hm, a[2] + (b[2] - a[2]) * t];
      for (const b of plan.blocks.filter((q) => q.state === 'shoot')) {
        const l = lanes[b.lane], zT = l.zc + b.face * 22;
        for (let i = 0, n = Math.round(110 * fx); i < n; i++) {
          const ax = b.x + (fr() - 0.5) * b.F, az = b.z + (fr() - 0.5) * b.depth, bx = b.x + (fr() - 0.5) * b.F * 1.3, bz = zT + b.face * fr() * 40, a = [ax, Y(ax, az) + 2, az], c = [bx, Y(bx, bz), bz], t = 0.12 + fr() * 0.78, hm = 26 + fr() * 12;
          arrows.push([arc(a, c, t, hm), arc(a, c, t + 0.01, hm)]);
        }
      }
      if (arrows.length) {
        const am = new T.MeshBasicMaterial({ color: 0x1c140e }); mats.push(am);
        const m = new T.InstancedMesh(shaft, am, arrows.length), d = new T.Vector3(), Z = new T.Vector3(0, 0, 1);
        arrows.forEach(([p, p2], i) => { d.set(p2[0] - p[0], p2[1] - p[1], p2[2] - p[2]).normalize(); m.setMatrixAt(i, M4.compose(V3.set(...p), Q4.setFromUnitVectors(Z, d), SC.set(1, 1, 1))); });
        m.frustumCulled = false; group.add(m); nArrows = arrows.length;
      }
    }

    // ---------------------------------------------------------------- views: composed like film frames, lit from the side
    const Wf = plan.width, sunH = new T.Vector2(sun.dir.x, sun.dir.z).normalize();
    // of a shot's two mirror images, the one whose look puts the sun beside the camera and a little behind it
    const pick = (make) => { const sc = (v) => { const dx = v.target[0] - v.cam[0], dz = v.target[2] - v.cam[2], l = Math.hypot(dx, dz) || 1; return Math.abs((dx / l) * sunH.x + (dz / l) * sunH.y + 0.35); }, a = make(1), b = make(-1); return sc(a) <= sc(b) ? a : b; };
    const above = (x, z, y) => Math.max(y, Y(x, z) + 4);
    const views = {};
    // deploy: over the attacker's shoulder, low, his ranks and flags close below, the field and the enemy line beyond
    views.deploy = pick((s) => { const tx = -s * 0.12 * Wf, tz = -30, cx = s * (Wf / 2 + 150), cz = 250; return { target: [tx, Y(tx, tz) + 4, tz], cam: [cx, above(cx, cz, Y(cx, cz) + 58), cz], fov: 36, shadow: [0, 20, 480], ao: 3 }; });
    // a lane: before the fight from behind the attacker's block across to the enemy's; in a clash close three quarters
    // on the locked front ranks; in a result behind the victor's line toward the rout
    lanes.forEach((l) => {
      const zA = l.A[1], zD = l.D[1];
      views['lane' + l.i] = pick((s) => {
        if (mode === 'deploy') { const tx = l.cx - s * 8, tz = zD + 6, cx = l.cx + s * 46, cz = zA + 112; return { target: [tx, Y(tx, tz) + 3, tz], cam: [cx, above(cx, cz, Math.max(Y(cx, cz), Y(tx, tz)) + 21), cz], fov: 30, shadow: [l.cx, (zA + zD) / 2, 190], ao: 1.6 }; }
        const dist = mode === 'result' ? 118 : 86, hgt = mode === 'result' ? 30 : 22, tx = l.cx - s * 6, tz = l.zc + (mode === 'result' ? face(V || 'A') * 40 : 3), ty = Y(tx, tz) + 3, dx = -s * 0.7, dz = mode === 'result' && V === 'D' ? 0.71 : -0.71, cx = tx - dx * dist, cz = tz - dz * dist;
        return { target: [tx, ty, tz], cam: [cx, above(cx, cz, Math.max(ty, Y(cx, cz)) + hgt), cz], fov: 38, shadow: [tx, tz, 180], ao: 1.4 };
      });
    });
    views.overview = { target: [0, Y(0, -20), -20], cam: [0.1 * Wf, 470, 380], fov: 40, shadow: [0, -10, 560], ao: 6 };
    { // result: behind the victor's line in the decisive lane, looking where the beaten are running
      const l = lanes[plan.decisive], fV = face(V || 'A');
      views.result = pick((s) => { const tx = l.cx - s * 10, tz = l.zc + fV * 70, ty = Y(tx, tz) + 3, cx = l.cx + s * 62, cz = l.zc - fV * 78; return { target: [tx, ty, tz], cam: [cx, above(cx, cz, Math.max(ty, Y(cx, cz)) + 20), cz], fov: 40, shadow: [l.cx, l.zc + fV * 30, 220], ao: 1.6 }; });
    }

    // ---------------------------------------------------------------- labels (projected by the camera given)
    const LABELS = [
      ...lanes.map((l) => ({ text: 'Cánh ' + LANE_SIDE[l.i] + ' · ' + l.name, kind: 'lane', p: [l.cx, Y(l.cx, l.zf) + 26, l.zf] })),
      ...['A', 'D'].map((side) => { const p = plan.posts[side], s = SIDES[side]; return { text: s.general && s.general !== s.name ? s.general + ' · ' + s.name : s.name, kind: 'side', side, p: [p.x, Y(p.x, p.z) + 16, p.z] }; }),
      ...(plan.river && plan.river.ford ? [{ text: 'Bến lội', kind: 'thing', p: [plan.river.ford[0], 6, plan.river.ford[1]] }] : []),
    ];
    const v3 = new T.Vector3(), v2 = new T.Vector2();
    let cam = deps.camera || null;
    const labels = (c, w, h) => {
      const camera = c || cam; if (!camera) return [];
      let W = w, H = h; if (!W && deps.renderer) { deps.renderer.getSize(v2); W = v2.x; H = v2.y; } W = W || 1; H = H || 1;
      return LABELS.map((l) => { v3.set(...l.p).project(camera); return { text: l.text, kind: l.kind, side: l.side, x: (v3.x + 1) * 0.5 * W, y: (1 - v3.y) * 0.5 * H, visible: v3.z < 1 && Math.abs(v3.x) < 1.05 && Math.abs(v3.y) < 1.05 }; });
    };
    const focus = (c) => { cam = c || cam; if (!cam) return; trees.userData.focus(cam); for (const cr of Object.values(crowds)) if (cr.focus) cr.focus(cam); };
    if (cam) focus(cam);
    let time = 0;
    const tick = (dt = 0) => { time += dt; U.time.value = time; if (tFall > 0) for (const m of late) m.visible = time >= tFall; trees.userData.U.uTime.value = time; if (water) water.userData.U.uTime.value = time; for (const cr of Object.values(crowds)) if (cr.tick) cr.tick(time); };
    const buildMs = typeof performance !== 'undefined' ? Math.round(performance.now() - t0) : 0;
    const stats = () => {
      const s = { soldiers: crowds.A.count + crowds.D.count, attackers: crowds.A.count, defenders: crowds.D.count, fallen: plan.fallen.length, boats: plan.boats.length, flags: nFlags, reeds: reeds ? reeds.count : 0, trees: trees.userData.count, fx: nSprites, arrows: nArrows + plan.arrowsIn.length,
        tier, mode, figuresPerMan: plan.k, laneWidth: plan.LW, fieldWidth: Math.round(plan.width), buildMs, crowd: [crowds.A.stats(), crowds.D.stats()] };
      if (deps.renderer) { s.calls = deps.renderer.info.render.calls; s.triangles = deps.renderer.info.render.triangles; }
      return s;
    };
    const dispose = () => {
      for (const cr of Object.values(crowds)) cr.dispose();
      group.traverse((o) => { if (!o.isMesh) return; const g = o.geometry; if (g && !keep.has(g) && !(g.userData && g.userData.shared)) g.dispose(); });
      for (const m of mats) m.dispose(); for (const t of texs) t.dispose();
      terrain.traverse((o) => { if (o.material) o.material.dispose(); }); if (water) water.material.dispose();
      const tm = new Set(); trees.traverse((o) => { if (o.isMesh) { tm.add(o.material); if (o.customDepthMaterial) tm.add(o.customDepthMaterial); } }); for (const m of tm) m.dispose();
      if (L.landTex) L.landTex.dispose();
      if (group.parent) group.parent.remove(group);
    };
    // the frame of Battle.frame (battle.js, the cinema's stage): u along the front to the attacker's right (+x), v toward
    // the attacker (+z); lanes and rows where this field has them (fractional rows allowed), no walls
    const y0 = Y(0, 0), frame = { W: (u, v) => [u, v], rs: 1, s0: 0, gw: 0, sec: lanes.map((l) => [l.x0, l.x1]), laneW: plan.LW, laneU: (l) => lanes[clamp(Math.round(l), 0, 2)].cx, rowV: (r) => rowZ(clamp(r, -1, 6)), V: [0, 1, 2, 3, 4, 5].map(rowZ),
      front: (l) => lanes[clamp(Math.round(l), 0, 2)].zc, siege: false, field: true, gate: null, edge: null, out: [0, 1], tan: [1, 0], gx: 0, gz: 0, y: Y, wallY: y0, y0, towerY: y0, H: 0, WB: 0, WT: 0, vOut: 0, moat: null,
      yawA: yawTo(0, -1), yawD: yawTo(0, 1), L, city: null, lanes: lanes.map((l) => ({ kind: l.kind, x0: l.x0, x1: l.x1, cx: l.cx, zc: l.zc })) };
    // what a stage laid on this ground needs (battle.js's site.kit): the models, the land, the crowd, the figures used
    const kit = { HM, N, L, env, tier, q: deps.q, renderer: deps.renderer, Crowd: CL, animated: !!(CL && CL.ANIMS), engines: {}, bannerCache: {}, city: null, camp: null, side: 's', k: plan.k, cap: TQ.figures, used: crowds.A.count + crowds.D.count, frame, field: true };
    return { group, tick, views, labels, focus, stats, dispose, land: L, lanes: lanes.map((l) => ({ i: l.i, kind: l.kind, name: l.name, cx: l.cx, x0: l.x0, x1: l.x1, front: l.front, A: l.A, D: l.D })),
      sun, plan, units, crowds, frame, kit, trees: [], nature: true, tier, mode: D.mode, side: 's', time: () => time };
  };
})(typeof window !== 'undefined' ? window : globalThis);
