// Sound for v2 (docs/design/v2-polish.md, job 8): music by mood, ambience by season, effects by event. Everything is made in
// code with the Web Audio API (no sample files, no downloads, no borrowed tunes): plucked strings are Karplus-Strong buffers,
// gongs and drums are additive or swept-sine buffers, wind, water, fire and crowds are shaped noise, the flute and the drone
// are oscillators. The music is generated: a bar of a mood is a pure function of (mood, season, seed, bar number), so it
// never loops and always replays the same from a seed.
//
//   HuaiNanAudio.cue(name, { at, g, dur, seed })   one sound now, or `at` seconds from now (the battle cinema and the map
//                                                  playback call it at exact moments); names in HuaiNanAudio.CUES:
//                                                  tap select confirm cancel drum skip · endSeason march oars horse charge ·
//                                                  horn volley clash fire breach rout flag camp · cheer gong chime card ·
//                                                  victory defeat
//   HuaiNanAudio.mood(name, { hold, k })           calm | tension | battle | victory | defeat | off; `hold` seconds, then back to
//                                                  what it was (a battle turn's drums); `k` 0..1 how hot
//   HuaiNanAudio.season('Thu 219')                 the season's music key and ambience (Xuân Hạ Thu Đông, or an id)
//   HuaiNanAudio.din(x)                            the battle din, 0..1 (the 1 m scenes)
//   HuaiNanAudio.scripted(group, on)               a module that hits the cues itself keeps the automatic ones quiet:
//                                                  'battle' (a turn's sounds), 'beat' (a town changing hands), 'playback'
//   HuaiNanAudio.mute(on) · .muted() · .skip() · .start() (in a user gesture) · .ready() · .state()
//   HuaiNanAudio.wire(HuaiNanPlay)                 listens to act, season, battle, turn, result, beat, report, over, lock, skip, mute
//
// The AudioContext starts on the first user gesture (autoplay policy). Mute lives in localStorage ('tq.mute'). A phone or the
// low tier takes the light path: fewer voices, shorter buffers, a small comb reverb instead of the convolver, mono ambience.
// The pure parts (scales, the sequencer, event → cue, the synth buffers, the analyser) run in Node
// (tests/huainan-audio.test.mjs); create(ctx, opts) builds the same graph on any context, so the audition board
// (docs/design/prototypes/audio.html) and tests/e2e/audio-measure.mjs render cues and moods offline and measure them.
(function (root) {
  'use strict';
  const A = {};
  const TAU = Math.PI * 2;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const db = (x) => 20 * Math.log10(Math.max(1e-9, x));
  const lin = (d) => Math.pow(10, d / 20);
  const pk = (r, a) => a[Math.floor(r() * a.length)];

  // ---------------------------------------------------------------- numbers
  // Mulberry32: a small seeded generator (the music and the effects draw only from their own seeds)
  A.rng = (seed) => {
    let s = (seed >>> 0) || 1;
    const f = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    return f;
  };
  // FNV-1a over the parts: a 32-bit seed from any mix of numbers and words
  A.hash = (...parts) => {
    let h = 2166136261;
    for (const p of parts) { const s = String(p); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } h ^= 124; h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0 || 1;
  };
  A.hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // ---------------------------------------------------------------- scales and seasons
  // The five-note modes (gong, shang, jue, zhi, yu) as semitones over the tonic; a degree is an index across octaves
  A.MODES = { gong: [0, 2, 4, 7, 9], shang: [0, 2, 5, 7, 10], jue: [0, 3, 5, 8, 10], zhi: [0, 2, 5, 7, 9], yu: [0, 3, 5, 7, 10] };
  A.midi = (S, deg) => { const o = Math.floor(deg / 5), i = ((deg % 5) + 5) % 5; return S.tonic + 12 * o + A.MODES[S.mode][i]; };
  // A season's key: `tonic` is the melody's home note, `drone` the low root, `bpm` the calm tempo. Xuân bright and quick,
  // Hạ warm and open, Thu low and lonely (a minor pentatonic on A), Đông sparse (jue mode: the dark sixth)
  A.SEASONS = {
    xuan: { id: 'xuan', name: 'Xuân', mode: 'gong', tonic: 67, drone: 43, bpm: 88, dens: 0.85, flute: 0.55, glass: 0.4, grace: 0.3, bed: 0.5, fl: 5 },
    ha: { id: 'ha', name: 'Hạ', mode: 'zhi', tonic: 62, drone: 50, bpm: 72, dens: 0.72, flute: 0.5, glass: 0.15, grace: 0.15, bed: 0.55, fl: 5 },
    thu: { id: 'thu', name: 'Thu', mode: 'yu', tonic: 57, drone: 45, bpm: 60, dens: 0.72, flute: 0.6, glass: 0.2, grace: 0.12, bed: 0.4, fl: 5 },
    dong: { id: 'dong', name: 'Đông', mode: 'jue', tonic: 64, drone: 40, bpm: 50, dens: 0.5, flute: 0.4, glass: 0.5, grace: 0.05, bed: 0.25, fl: 5 },
  };
  A.SEASON_IDS = ['xuan', 'ha', 'thu', 'dong'];
  const plain = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
  // 'Thu 219' (view.calendar), 'Xuân', 'xuan' → { ...season, year? }; null for anything else
  A.parseSeason = (cal) => {
    if (cal == null) return null;
    const m = plain(cal).match(/^\s*([a-z]+)\s*(\d+)?/), S = m && A.SEASONS[m[1]];
    return S ? Object.assign({}, S, m[2] ? { year: Number(m[2]) } : {}) : null;
  };
  A.MOODS = ['calm', 'tension', 'battle', 'victory', 'defeat', 'off'];
  // per mood: crossfade in / out seconds and the drone's level (0 = none)
  A.MOOD = {
    calm: { fadeIn: 3.2, fadeOut: 3.2, drone: 0.041 },
    tension: { fadeIn: 2.4, fadeOut: 2.4, drone: 0.052 },
    battle: { fadeIn: 0.7, fadeOut: 1.6, drone: 0.036 },
    victory: { fadeIn: 0.25, fadeOut: 1.4, drone: 0.038 },
    defeat: { fadeIn: 1.0, fadeOut: 2.4, drone: 0.07 },
  };
  A.bpm = (mood, sid, k) => {
    k = k == null ? 0.5 : k;
    return mood === 'tension' ? 70 + 20 * k : mood === 'battle' ? 110 + 20 * k : mood === 'victory' ? 92 : mood === 'defeat' ? 42 : (A.SEASONS[sid] || A.SEASONS.thu).bpm;
  };
  A.barSec = (mood, sid, k) => 240 / A.bpm(mood, sid, k);

  // ---------------------------------------------------------------- the sequencer
  // A bar is a list of events { b: beat in the bar (0..4), v: voice, n: midi note, d: beats, g: 0..1, x: extras }. Voices: pluck
  // (pipa, guzheng), qin (a low, dark string), glass (a string's harmonic, or a bell), flute, taiko, ka, gong, horn. All pitches
  // come from the season's mode; everything is derived from (seed, season, bar number), so a bar can be asked for on its own.
  const RHY = { // rhythm templates: [onset, beats]
    a: [[0, 1.5], [1.5, 0.5], [2, 1], [3, 1]], b: [[0, 1], [1, 1], [2, 0.5], [2.5, 0.5], [3, 1]], c: [[0, 0.5], [0.5, 0.5], [1, 1], [2, 2]],
    d: [[0, 2], [2, 1], [3, 0.5], [3.5, 0.5]], e: [[0, 0.5], [0.5, 0.5], [1, 0.5], [1.5, 0.5], [2, 0.5], [2.5, 0.5], [3, 0.5], [3.5, 0.5]],
    f: [[0, 3], [3, 1]], g: [[0, 1.5], [1.5, 1.5], [3, 1]],
  };
  const SEA_RHY = { xuan: 'aabce', ha: 'abdg', thu: 'cdfg', dong: 'fdg' };
  const motif = (S, r) => {
    const rhy = RHY[pk(r, SEA_RHY[S.id])]; let d = pk(r, [0, 2, 3, 4]);
    return rhy.map(([b, dur]) => { const n = [b, dur, d]; d = clamp(d + (r() < 0.08 ? 0 : pk(r, [-2, -1, -1, -1, 1, 1, 1, 2])), -3, 7); return n; });
  };
  const shift = (m, k) => m.map(([b, d, g]) => [b, d, g + k]);
  const invert = (m) => { const g0 = m[0][2]; return m.map(([b, d, g]) => [b, d, g0 - (g - g0)]); };
  const cadence = (r) => { const end = pk(r, [0, 0, 3]); return [[0, 1, end + 2 + pk(r, [0, 1])], [1, 1, end + 1], [2, 2, end]]; };
  // a soft broken-chord bed in eighths (a zheng's flowing runs), degrees over the mode
  const BED = [[-3, -1, 0, -1, 2, -1, 0, -1], [-2, 0, 1, 3, 1, 0, 1, 0], [-3, 0, 2, 0, 3, 0, 2, 0], [-3, -1, 1, 2, 1, -1, 2, 1]];
  const vel = (r, b) => (b === 0 ? 0.8 : b % 1 === 0 ? 0.66 : 0.5) * (0.85 + 0.3 * r());

  function calm(S, seed, n) {
    const p = Math.floor(n / 4), i = n % 4;
    const rp = A.rng(A.hash(seed, S.id, 'p', p)), rm = A.rng(A.hash(seed, S.id, 'm', Math.floor(p / 2))), rb = A.rng(A.hash(seed, S.id, 'b', n));
    const mo = motif(S, rm);
    // phrase-level choices, always drawn in this order so every bar of a phrase agrees
    const still = p % 3 === 2 && rp() < 0.7, hasFl = rp() < S.flute, flA = pk(rp, [3, 5, 4]), flB = pk(rp, [0, 2, 3]), t1 = pk(rp, [1, -1, 2, 0]), inv = rp() < 0.5, fifth = rp() < 0.6, slide = rp() < 0.4, alt = motif(S, rp), hole = rp(), bedOn = rp() < S.bed, bed = pk(rp, BED);
    const ev = [], add = (b, v, m, d, g, x) => { const e = { b, v, n: m, d, g }; if (x) e.x = x; ev.push(e); };
    const deg = (g) => A.midi(S, g);
    const line = i === 0 ? mo : i === 1 ? shift(mo, t1) : i === 2 ? (inv ? invert(mo) : alt) : cadence(rp);
    if (!still && !(i === 1 && hole < 0.18 && S.id !== 'xuan')) {
      line.forEach(([b, d, g], k) => {
        if (k > 0 && rb() > (bedOn ? S.dens * 0.75 : S.dens) && !(i === 3 && k === 2)) return;
        if (k > 0 && rb() < S.grace) add(b - 0.14, 'pluck', deg(g + pk(rb, [1, -1])), 0.14, 0.4 * vel(rb, b));
        add(b, 'pluck', deg(g), d, vel(rb, b), S.id === 'thu' && i === 3 && k === 2 && rb() < 0.5 ? 'roll' : undefined);
      });
    }
    if (still && i === 0) add(0, 'pluck', deg(pk(rb, [0, 3])), 4, 0.55);
    if (bedOn && i < 3) bed.forEach((g, j) => { if (rb() < 0.9) add(j * 0.5, 'pluck', deg(g), 0.5, (j % 4 === 0 ? 0.34 : 0.24) * (0.85 + 0.3 * rb()), { bed: 1 }); });
    // the low string: the root at the top of a phrase, the fifth in the middle, sometimes slid into
    if (i === 0 && !(S.id === 'dong' && p % 2)) add(0, 'qin', A.midi(S, -5), 4, 0.85, slide ? { slide: -2 } : undefined);
    else if (i === 2 && fifth && S.id !== 'dong') add(0, 'qin', A.midi(S, -2), 3, 0.7, slide ? { slide: 2 } : undefined);
    // the flute answers in the second half of a phrase
    if (hasFl && i >= 2) {
      const off = S.fl;
      if (S.id === 'xuan') { // the bright flute: short bird-like notes
        if (i === 2) [[0, 0.75, flA], [1, 0.75, flA + 1], [2, 1.75, flA + 2]].forEach(([b, d, g]) => add(b, 'flute', deg(g + off - 3), d, 0.75));
        else add(0, 'flute', deg(flB + off), 3, 0.7);
      } else if (i === 2) add(0.5, 'flute', deg(flA + off - 5), 3.5, 0.7, { slide: -1 });
      else add(0, 'flute', deg(flB + off - 5), 3.4, 0.62);
    }
    // glass: a bright harmonic or bell over the top
    if ((i === 0 || i === 2) && rb() < S.glass) add(pk(rb, [1.5, 2.5, 3.5]), 'glass', deg(pk(rb, [5, 7, 8, 9])), 3, 0.5);
    return ev;
  }

  // a heartbeat, a low string, a nervous pluck, a far gong
  function tension(S0, seed, n, k) {
    const S = Object.assign({}, S0, { mode: 'yu' }), r = A.rng(A.hash(seed, 'tension', n)), ev = [], add = (b, v, m, d, g, x) => { const e = { b, v, n: m, d, g }; if (x) e.x = x; ev.push(e); };
    add(0, 'taiko', undefined, 1, 0.5 + 0.3 * k, { size: 'big' }); add(0.75, 'taiko', undefined, 1, 0.3 + 0.2 * k, { size: 'small' });
    if (k > 0.5 || n % 2) { add(2, 'taiko', undefined, 1, 0.4 + 0.3 * k, { size: 'big' }); add(2.75, 'taiko', undefined, 1, 0.25 + 0.2 * k, { size: 'small' }); }
    if (n % 2 === 0) add(0, 'qin', A.midi(S, -5), 4, 0.8, r() < 0.4 ? { slide: -2 } : undefined); else add(2, 'qin', A.midi(S, -2), 2, 0.6, { slide: 1 });
    if (n % 4 === 0 && r() < 0.6) add(0, 'flute', A.midi(S, pk(r, [5, 7]) + S.fl - 5), 6, 0.55, { wide: 1 });
    if (r() < 0.55) { add(2.5, 'pluck', A.midi(S, pk(r, [0, 2])), 0.5, 0.45); add(3, 'pluck', A.midi(S, pk(r, [1, 3])), 0.5, 0.4); }
    if (n % 4 === 3 && r() < 0.4 + 0.4 * k) for (let j = 0; j < 4; j++) add(3 + j * 0.25, 'ka', undefined, 0.25, 0.2 + 0.08 * j);
    if (n % 8 === 0 && k > 0.3) add(0, 'gong', A.midi(S, -5), 6, 0.4, { size: 'big' });
    return ev;
  }

  // war drums, a pipa riff, a gong on the phrase, a low string on the beat
  const PAT = ['D...k...D.d.k.k.', 'D..dD..dD..dk.kk', 'D.dkD.dkD.dkD.kk', 'D...d.d.D...k.kk'], FILL = 'D.dkD.dkdkdkDDDD';
  const RIFF = [[0, 0, 3, 0, 0, 3, 4, 3], [0, null, 0, 3, null, 0, 2, 3], [0, 0, null, 3, 0, 0, 4, null], [3, 0, 0, 2, 3, 0, 0, 4]];
  function battle(S0, seed, n, k) {
    const S = Object.assign({}, S0, { mode: 'yu' }), p = Math.floor(n / 4), i = n % 4, rp = A.rng(A.hash(seed, 'battle', p)), r = A.rng(A.hash(seed, 'battle-b', n)), ev = [];
    const add = (b, v, m, d, g, x) => { const e = { b, v, n: m, d, g }; if (x) e.x = x; ev.push(e); };
    const pat = pk(rp, PAT), riff = pk(rp, RIFF), flute = rp() < 0.45, drop = rp();
    const rows = i === 3 ? FILL : pat;
    for (let s = 0; s < 16; s++) {
      const c = rows[s], b = s * 0.25; if (c === '.') continue;
      if (c === 'D') add(b, 'taiko', undefined, 1, (s === 0 ? 1 : 0.8) * (0.9 + 0.2 * r()), { size: 'big' });
      else if (c === 'd') add(b, 'taiko', undefined, 1, 0.55 * (0.9 + 0.2 * r()), { size: 'small' });
      else add(b, 'ka', undefined, 0.25, (0.5 + 0.3 * k) * (0.85 + 0.3 * r()));
    }
    if (i !== 3 || k > 0.7) riff.forEach((g, s) => { if (g == null || (k < 0.4 && s % 2 && drop < 0.6)) return; add(s * 0.5, 'pluck', A.midi(S, g - 2), 0.4, (s % 4 === 0 ? 0.8 : 0.55) * (0.9 + 0.2 * r())); });
    add(0, 'qin', A.midi(S, i % 2 ? -2 : -5), 1.5, 0.85); if (i === 0 || i === 2) add(2, 'qin', A.midi(S, i === 0 ? -5 : -2), 1.5, 0.7);
    if (i === 0) add(0, 'gong', A.midi(S, -5), 6, p % 2 ? 0.45 : 0.6, { size: 'big' });
    if (i === 0 && flute) add(0, 'flute', A.midi(S, pk(r, [5, 7]) + S.fl - 5), 3, 0.5, { wide: 1 });
    return ev;
  }

  // the win: a gong and drums, a horn's call (a fifth up), a rising run, the tune, and it settles into an easy major bed
  function victory(seed, n) {
    const K = A.SEASONS.xuan, ev = [], add = (b, v, m, d, g, x) => { const e = { b, v, n: m, d, g }; if (x) e.x = x; ev.push(e); };
    const deg = (g) => A.midi(K, g);
    if (n === 0) {
      add(0, 'gong', 43 + 12, 6, 0.8, { size: 'big' }); add(0, 'taiko', undefined, 1, 1, { size: 'big' }); add(0.5, 'horn', 55, 2.4, 0.8); add(2.7, 'horn', 62, 1.3, 0.8);
      [2, 2.5, 3, 3.25, 3.5, 3.75].forEach((b, j) => add(b, 'taiko', undefined, 1, 0.5 + 0.09 * j, { size: 'small' }));
    } else if (n === 1) {
      for (let j = 0; j < 8; j++) add(j * 0.5, 'pluck', deg(j - 0), 0.5, 0.55 + 0.05 * j); add(0, 'flute', deg(5), 4, 0.7); add(0, 'qin', A.midi(K, -5), 4, 0.8);
    } else if (n === 2) {
      [[0, 1, 5], [1, 1, 7], [2, 0.5, 5], [2.5, 0.5, 4], [3, 1, 3]].forEach(([b, d, g]) => add(b, 'pluck', deg(g), d, 0.8)); add(0, 'flute', deg(7), 3, 0.65); add(2, 'qin', A.midi(K, -2), 2, 0.7); add(1.5, 'glass', deg(9), 3, 0.5);
    } else if (n === 3) {
      [0, 3, 5].forEach((g, j) => add(j * 0.06, 'pluck', deg(g), 4, 0.8, { long: 1 })); add(0, 'gong', 55, 5, 0.55, { size: 'small' }); add(0, 'taiko', undefined, 1, 0.9, { size: 'big' }); add(0, 'flute', deg(7), 4, 0.6); add(0, 'qin', A.midi(K, -5), 4, 0.85);
    } else return calm(Object.assign({}, K, { dens: 0.5, flute: 0.3 }), seed, n - 4);
    return ev;
  }

  // the loss: one low gong, a slow falling line on the low string, a low flute sinking, then a thin autumn bed
  function defeat(seed, n) {
    const K = A.SEASONS.thu, ev = [], add = (b, v, m, d, g, x) => { const e = { b, v, n: m, d, g }; if (x) e.x = x; ev.push(e); };
    const deg = (g) => A.midi(K, g);
    if (n === 0) { add(0, 'gong', 45, 6, 0.75, { size: 'low' }); add(2, 'taiko', undefined, 1, 0.45, { size: 'big' }); add(0.5, 'qin', deg(1), 2, 0.8); add(2.5, 'qin', deg(0), 1.5, 0.75); }
    else if (n === 1) { add(0, 'qin', deg(-1), 2, 0.75); add(2, 'qin', deg(-2), 2, 0.7); add(0, 'flute', deg(4), 4, 0.5, { slide: 1 }); }
    else if (n === 2) { add(0, 'qin', deg(-3), 3, 0.7); add(0, 'flute', deg(3), 4, 0.48, { slide: -2 }); }
    else if (n === 3) { add(0, 'qin', deg(-5), 4, 0.85); add(2, 'glass', deg(3), 2, 0.4); }
    else return calm(Object.assign({}, K, { dens: 0.3, flute: 0.4, glass: 0.1 }), seed, n - 4);
    return ev;
  }

  // one bar of a mood: { bpm, sec, ev }
  A.bar = (mood, sid, seed, n, k) => {
    const S = A.SEASONS[sid] || A.SEASONS.thu, kk = k == null ? 0.5 : k;
    const ev = mood === 'calm' ? calm(S, seed, n) : mood === 'tension' ? tension(S, seed, n, kk) : mood === 'battle' ? battle(S, seed, n, kk) : mood === 'victory' ? victory(seed, n) : mood === 'defeat' ? defeat(seed, n) : [];
    for (const e of ev) e.g = Math.min(1, e.g);
    return { bpm: A.bpm(mood, sid, kk), sec: A.barSec(mood, sid, kk), ev };
  };

  // ---------------------------------------------------------------- what the game says → what to play (pure)
  // handler name (HuaiNanPlay's 'act' event) → cues; `ui` cues are the player's own taps (they play under a locked screen only when asked)
  A.actCues = (name, args) => {
    const a = args || [];
    switch (name) {
      case 'onEndSeason': return [{ cue: 'endSeason' }];
      case 'onSelect': return a[0] ? [{ cue: 'select', o: { k: a[0].kind === 'town' ? 'town' : 'army' } }] : [];
      case 'onTarget': case 'onForecast': case 'onPartner': case 'onBattleOrder': case 'onWingSelect': case 'onOverview': case 'onBattleDone': case 'onBeatDone': case 'onReportDone': return [{ cue: 'tap' }];
      case 'onTask': return [{ cue: a[1] == null ? 'cancel' : 'tap' }];
      case 'onConfirmOrder': return [{ cue: 'confirm', o: { k: a[0] && a[0].type === 'task' ? 'task' : 'order' } }];
      case 'onCancel': case 'onClearOrder': return [{ cue: 'cancel' }];
      case 'onAnswer': return [{ cue: a[1] ? 'confirm' : 'cancel', o: { k: 'card' } }];
      case 'onBattleTurn': case 'onAutoBattle': return [{ cue: 'drum' }];
      case 'onGoalDone': case 'onAgain': return [{ cue: 'confirm', o: { k: 'begin' } }];
      case 'onSkip': return [{ cue: 'skip' }];
      case 'onWatch': return [{ cue: 'tap' }];
      case 'onMute': return a[0] ? [] : [{ cue: 'tap' }];
      default: return [];
    }
  };
  // what a battle turn sounded like, from the turn's log (Battle: fire, volley, melee, breach, rout), in the engine's own order
  A.turnCues = (after) => {
    const log = after && after.b && after.b.log, last = log && log[log.length - 1], ev = (last && last.ev) || [], of = (k) => ev.filter((e) => e.kind === k);
    const melee = of('melee'), volley = of('volley'), fire = of('fire'), breach = of('breach'), rout = of('rout'), out = [];
    let t = 0.3;
    if (melee.some((e) => e.charge && (e.armA === 'ky' || e.armD === 'ky'))) { out.push({ cue: 'charge', at: t }); t += 1.1; }
    if (volley.length) { out.push({ cue: 'volley', at: t, o: { n: volley.length } }); t += 0.9; }
    if (fire.length) { out.push({ cue: 'fire', at: t, o: { dur: 2.6 } }); t += 0.9; }
    if (melee.length) { out.push({ cue: 'clash', at: t, o: { n: Math.min(10, 4 + 2 * melee.length) } }); t += 1.1; }
    if (breach.length) { out.push({ cue: 'breach', at: t }); t += 1.3; }
    if (rout.length) out.push({ cue: 'rout', at: t });
    return out;
  };
  A.turnSec = (cues) => cues.reduce((m, c) => Math.max(m, (c.at || 0) + 1.6), 2.4);
  // the last battle's outcome for the player ('A' or 'D' is the side of ours): victory, defeat, or a draw
  A.resultMood = (lb) => { const w = lb && lb.outcome && lb.outcome.win; return w === 'A' || w === 'D' ? (w === lb.me ? 'victory' : 'defeat') : 'calm'; };
  // a town changing hands (report.taken[i]): ours taken, or lost
  A.beatCues = (taken, me) => {
    if (!taken) return [];
    if (taken.to === me) return [{ cue: 'flag' }, { cue: 'cheer', at: 0.45, o: { g: 0.75 } }, { cue: 'gong', at: 0.2, o: { k: 'small' } }];
    if (taken.from === me) return [{ cue: 'flag' }, { cue: 'gong', at: 0.3, o: { k: 'low' } }];
    return [{ cue: 'flag', o: { g: 0.6 } }];
  };
  // the sounds of a season's march, from the view before it (our armies with orders, and how they go)
  A.playbackCues = (view) => {
    const me = view && view.me, mine = ((view && view.armies) || []).filter((a) => a.fid === me && a.order);
    if (!mine.length) return [];
    const out = [], fleet = mine.some((a) => a.arm === 'fleet'), land = mine.some((a) => a.arm !== 'fleet'), hit = mine.some((a) => a.order.intent === 'attack' || a.order.intent === 'siege');
    if (land) out.push({ cue: 'march', at: 1.5, o: { dur: 3.2, n: Math.min(4, mine.length) } });
    if (fleet) out.push({ cue: 'oars', at: 1.7, o: { dur: 3 } });
    if (hit) out.push({ cue: 'horse', at: 2.8, o: { dur: 1.8, g: 0.6 } });
    return out;
  };

  // ---------------------------------------------------------------- synth atoms (pure: each returns a Float32Array, or [L, R])
  // Short sounds are rendered once into buffers (a note, a drum hit, a clang) and played by the graph: cheap at run time, and
  // Node can measure them. Seeds make every buffer the same on every machine.
  const Y = (A.synth = {});
  const F32 = (n) => new Float32Array(Math.max(1, Math.round(n)));
  const peakOf = (x) => { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } return m; };
  const norm = (x, peak) => { const m = peakOf(x); if (m > 0) { const k = peak / m; for (let i = 0; i < x.length; i++) x[i] *= k; } return x; };
  const unDC = (x) => { let s = 0; for (let i = 0; i < x.length; i++) s += x[i]; s /= x.length; for (let i = 0; i < x.length; i++) x[i] -= s; return x; };
  const fade = (x, sr, inS, outS) => { const a = Math.round(inS * sr), b = Math.round(outS * sr), n = x.length; for (let i = 0; i < a && i < n; i++) x[i] *= i / a; for (let i = 0; i < b && i < n; i++) x[n - 1 - i] *= i / b; return x; };
  // a loop without a seam: the tail (rendered xf samples past the end) is folded into the head with an equal-power crossfade
  const loopFix = (x, n, xf) => { const y = x.slice(0, n); for (let i = 0; i < xf; i++) { const w = (i / xf) * Math.PI / 2; y[i] = x[i] * Math.sin(w) + x[n + i] * Math.cos(w); } return y; };
  // a state variable filter (trapezoidal): set(fc, q), run(x) fills lp, bp (peak gain q; bpn is unity), hp
  function svf(sr) {
    const f = { lp: 0, bp: 0, hp: 0, bpn: 0, k: 1 }; let ic1 = 0, ic2 = 0, a1 = 1, a2 = 0, a3 = 0;
    f.set = (fc, q) => { const g = Math.tan(Math.PI * Math.min(fc, sr * 0.45) / sr); f.k = 1 / q; a1 = 1 / (1 + g * (g + f.k)); a2 = g * a1; a3 = g * a2; return f; };
    f.run = (x) => { const v3 = x - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3; ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2; f.lp = v2; f.bp = v1; f.bpn = v1 * f.k; f.hp = x - f.k * v1 - v2; return v2; };
    return f;
  }
  // a whole buffer through one filter; fc is a number or a function of the sample index (updated every 16 samples)
  const filt = (x, mode, fc, q, sr) => {
    const f = svf(sr), y = new Float32Array(x.length), fn = typeof fc === 'function';
    if (!fn) f.set(fc, q);
    for (let i = 0; i < x.length; i++) { if (fn && (i & 15) === 0) f.set(fc(i), q); f.run(x[i]); y[i] = mode === 'lp' ? f.lp : mode === 'hp' ? f.hp : f.bpn; }
    return y;
  };
  const noise = (n, r, kind) => {
    const x = new Float32Array(n);
    if (kind === 'pink') { let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0; for (let i = 0; i < n; i++) { const w = r() * 2 - 1; b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898; x[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926; } }
    else if (kind === 'brown') { let l = 0; for (let i = 0; i < n; i++) { l = (l + 0.02 * (r() * 2 - 1)) / 1.02; x[i] = l * 3.5; } }
    else for (let i = 0; i < n; i++) x[i] = r() * 2 - 1;
    return x;
  };
  // a decaying partial: adds amp·e^(-t/tau)·sin(2π f t + ph), with an optional slow attack, by two recurrences (no sin per sample)
  const partial = (x, sr, f, amp, tau, ph, att) => {
    if (f >= sr * 0.45) return;
    const w = TAU * f / sr, cw = Math.cos(w), sw = Math.sin(w), dk = Math.exp(-1 / (sr * tau)), ak = att ? Math.exp(-1 / (sr * att)) : 0;
    let re = Math.cos(ph), im = Math.sin(ph), e = amp, a = 1;
    for (let i = 0; i < x.length; i++) {
      x[i] += e * (att ? 1 - a : 1) * im; const r2 = re * cw - im * sw; im = re * sw + im * cw; re = r2; e *= dk; a *= ak;
      if (e < 1e-5) break;
      if ((i & 4095) === 0) { const m = 1 / Math.hypot(re, im); re *= m; im *= m; }
    }
  };
  const exp = Math.exp;

  // a plucked string (Karplus-Strong: a noise burst circulating in a delay line through a damping filter; the fractional delay
  // is an all-pass, so the pitch is exact). damp 0.5 is the classic dark pluck, 1 leaves it bright; t60 is the ring in seconds
  Y.pluck = (f, sr, o) => {
    o = o || {};
    const n = Math.round((o.dur || 2.2) * sr), r = A.rng((o.seed || 7) + Math.round(f * 3)), damp = o.damp == null ? 0.7 : o.damp, t60 = o.t60 || 2, pos = o.pos == null ? 0.16 : o.pos, tone = o.tone == null ? 0.5 : o.tone;
    const L = sr / f - (1 - damp), N = Math.max(3, Math.floor(L)), fr = L - N, ap = (1 - fr) / (1 + fr), line = new Float32Array(N);
    let lpv = 0;
    for (let i = 0; i < N; i++) { lpv += tone * ((r() * 2 - 1) - lpv); line[i] = lpv; }
    const pp = Math.max(1, Math.round(pos * N)), c = line.slice(); for (let i = 0; i < N; i++) line[i] = c[i] - c[(i - pp + N) % N];
    unDC(line); norm(line, 1);
    const g = Math.pow(0.001, 1 / (f * t60)), out = new Float32Array(n);
    let idx = 0, prev = 0, apx = 0, apy = 0;
    for (let i = 0; i < n; i++) {
      const y = line[idx]; out[i] = y;
      const avg = damp * y + (1 - damp) * prev; prev = y;
      const z = ap * (avg - apy) + apx; apx = avg; apy = z;
      line[idx] = z * g; if (++idx === N) idx = 0;
    }
    return fade(norm(out, 0.9), sr, 0.0008, 0.05);
  };
  // a string's harmonic or a small bell: a few inharmonic partials, a fast start and a long thin ring
  Y.glass = (f, sr, o) => {
    o = o || {}; const x = F32((o.dur || 3) * sr), r = A.rng((o.seed || 3) + Math.round(f));
    [[1, 1, 2.2], [2.01, 0.3, 1.1], [3.02, 0.13, 0.6], [4.17, 0.06, 0.35]].forEach(([k, a, tau]) => partial(x, sr, f * k, a, tau, r() * TAU));
    return fade(norm(x, 0.85), sr, 0.003, 0.08);
  };
  // a gong: inharmonic partials in beating pairs, the upper ones blooming in slowly, a brief clang of noise at the strike
  Y.gong = (f, sr, o) => {
    o = o || {};
    const dur = o.dur || 4.5, x = F32(dur * sr), r = A.rng((o.seed || 5) + Math.round(f)), small = !!o.small;
    const R = small ? [1, 1.58, 2.32, 3.1, 4.05, 5.2] : [1, 1.47, 1.98, 2.55, 3.17, 3.89, 4.6, 5.42], AM = [1, 0.8, 0.6, 0.55, 0.4, 0.3, 0.2, 0.15], np = Math.min(R.length, o.np || R.length);
    for (let k = 0; k < np; k++) {
      const fr = f * R[k] * (1 + (r() - 0.5) * 0.012), tau = dur * (small ? 0.24 : 0.3) * (1 - 0.085 * k), att = 0.004 + 0.05 * k;
      partial(x, sr, fr, AM[k] * 0.5, tau, r() * TAU, att); partial(x, sr, fr + 0.6 + 2.4 * r(), AM[k] * 0.5, tau * 0.9, r() * TAU, att);
    }
    const nz = filt(noise(Math.round(0.12 * sr), r, 'white'), 'bp', 2600, 0.7, sr); for (let i = 0; i < nz.length; i++) x[i] += nz[i] * 0.5 * exp(-i / (sr * 0.03));
    return fade(norm(unDC(x), 0.9), sr, 0.001, 0.15);
  };
  // a war drum: a sine that falls onto its pitch, a second mode, the slap of the skin
  Y.taiko = (sr, o) => {
    o = o || {}; const small = o.size === 'small', f = o.f || (small ? 96 : 62), tau = small ? 0.13 : 0.24, x = F32((o.dur || (small ? 0.5 : 0.95)) * sr), r = A.rng((o.seed || 9) + Math.round(f));
    let ph = 0, ph2 = 0, ph3 = 0;
    for (let i = 0; i < x.length; i++) {
      const t = i / sr, fr = f * (1 + 1.5 * exp(-t / 0.03));
      ph += TAU * fr / sr; ph2 += TAU * fr * 1.58 / sr; ph3 += TAU * fr * 2.9 / sr;
      x[i] = Math.sin(ph) * exp(-t / tau) + 0.32 * Math.sin(ph2) * exp(-t / (tau * 0.4)) + 0.4 * Math.sin(ph3) * exp(-t / 0.07);
    }
    const sl = filt(noise(x.length, r, 'white'), 'bp', 900, 0.9, sr); for (let i = 0; i < x.length; i++) x[i] += sl[i] * (small ? 0.5 : 0.42) * exp(-i / (sr * 0.025));
    return fade(norm(unDC(x), 0.95), sr, 0.0006, 0.05);
  };
  // the small high drum: a slap of noise and a short skin tone
  Y.ka = (sr, o) => {
    o = o || {}; const x = F32(0.28 * sr), r = A.rng(o.seed || 13), nz = filt(noise(x.length, r, 'white'), 'bp', 1900, 1.3, sr);
    let ph = 0;
    for (let i = 0; i < x.length; i++) { const t = i / sr; ph += TAU * (190 + 80 * exp(-t / 0.015)) / sr; x[i] = nz[i] * exp(-t / 0.035) + 0.55 * Math.sin(ph) * exp(-t / 0.05); }
    return fade(norm(unDC(x), 0.9), sr, 0.0005, 0.04);
  };
  // a knock on wood (a UI tap): a short sine with a quick fall, a second partial, a tick
  Y.wood = (sr, o) => {
    o = o || {}; const f = o.f || 520, x = F32((o.dur || 0.2) * sr), r = A.rng(o.seed || 17);
    let ph = 0, ph2 = 0;
    for (let i = 0; i < x.length; i++) {
      const t = i / sr, k = 1 + 0.07 * exp(-t / 0.008); ph += TAU * f * k / sr; ph2 += TAU * f * 2.4 * k / sr;
      x[i] = Math.sin(ph) * exp(-t / 0.024) + 0.3 * Math.sin(ph2) * exp(-t / 0.011) + (r() * 2 - 1) * 0.25 * exp(-t / 0.0015);
    }
    return fade(norm(unDC(x), 0.9), sr, 0.0004, 0.03);
  };
  // steel on steel: bright inharmonic partials that ring a moment, a spit of noise at the strike
  Y.clang = (sr, o) => {
    o = o || {}; const f = o.f || 1400, ring = o.ring || 1, x = F32((o.dur || 0.7) * sr), r = A.rng((o.seed || 19) + Math.round(f));
    [[1, 1, 0.2], [2.32, 0.6, 0.11], [4.25, 0.42, 0.07], [6.63, 0.25, 0.045], [9.1, 0.14, 0.03]].forEach(([k, a, tau]) => partial(x, sr, f * k * (1 + (r() - 0.5) * 0.01), a, tau * ring, r() * TAU));
    const nz = filt(noise(Math.round(0.03 * sr), r, 'white'), 'hp', 2800, 0.7, sr); for (let i = 0; i < nz.length; i++) x[i] += nz[i] * 0.7 * exp(-i / (sr * 0.004));
    return fade(norm(unDC(x), 0.9), sr, 0.0003, 0.08);
  };
  // a dull hit: a shield, a body, a stone dropped (a sine falling from its pitch, and a lowpassed thump of noise)
  Y.thud = (sr, o) => {
    o = o || {}; const f = o.f || 95, x = F32((o.dur || 0.35) * sr), r = A.rng((o.seed || 23) + Math.round(f)), nz = filt(noise(x.length, r, 'white'), 'lp', 650, 0.7, sr);
    let ph = 0;
    for (let i = 0; i < x.length; i++) { const t = i / sr; ph += TAU * f * (1 + 0.8 * exp(-t / 0.03)) / sr; x[i] = Math.sin(ph) * exp(-t / 0.09) + nz[i] * 0.55 * exp(-t / 0.035); }
    return fade(norm(unDC(x), 0.9), sr, 0.0005, 0.05);
  };
  // filtered noise with an envelope: shape 'bell' (a whoosh: up and down), 'decay' (a crash), 'rise'; the band sweeps f0 → f1
  Y.sweep = (sr, o) => {
    o = o || {}; const dur = o.dur || 0.5, n = Math.round(dur * sr), r = A.rng(o.seed || 29), src = noise(n, r, o.noise || 'white'), f0 = o.f0 || 5200, f1 = o.f1 || 1800, q = o.q || 3.5, sh = o.shape || 'bell';
    const y = filt(src, o.mode || 'bp', (i) => f0 * Math.pow(f1 / f0, i / n), q, sr);
    for (let i = 0; i < n; i++) { const u = i / n; y[i] *= sh === 'bell' ? Math.pow(Math.sin(Math.PI * u), 1.4) : sh === 'rise' ? u * u : exp(-u * (o.k || 5)) * Math.min(1, i / (sr * 0.004)); }
    return fade(norm(y, 0.9), sr, 0.002, 0.03);
  };
  // a flag: a crack, then three flaps that die away, and the cloth's low fwump
  Y.snap = (sr, o) => {
    o = o || {}; const x = F32(0.7 * sr), r = A.rng(o.seed || 31), hp = filt(noise(x.length, r, 'white'), 'hp', 1500, 0.7, sr), bp = filt(noise(x.length, r, 'white'), 'bp', 1400, 0.9, sr), lo = filt(noise(x.length, r, 'white'), 'lp', 350, 0.7, sr);
    for (let i = 0; i < x.length; i++) x[i] = hp[i] * exp(-i / (sr * 0.006)) + lo[i] * 0.5 * exp(-i / (sr * 0.05));
    [[0.11, 0.55], [0.21, 0.35], [0.33, 0.2]].forEach(([t0, a]) => { const s0 = Math.round((t0 + 0.02 * r()) * sr); for (let i = 0; s0 + i < x.length && i < 0.12 * sr; i++) x[s0 + i] += bp[s0 + i] * a * exp(-i / (sr * 0.035)) * (0.6 + 0.4 * Math.sin(TAU * 38 * i / sr)); });
    return fade(norm(unDC(x), 0.9), sr, 0.0003, 0.08);
  };
  // one footfall on packed earth (boot leather, a low thump, a little grit) and one hoof
  Y.foot = (sr, o) => {
    o = o || {}; const x = F32(0.24 * sr), r = A.rng(o.seed || 37), lo = filt(noise(x.length, r, 'white'), 'lp', 420 + 260 * r(), 0.8, sr), gr = filt(noise(x.length, r, 'white'), 'hp', 1800, 0.7, sr);
    let ph = 0;
    for (let i = 0; i < x.length; i++) { const t = i / sr; ph += TAU * 68 / sr; x[i] = lo[i] * exp(-t / 0.045) + 0.4 * Math.sin(ph) * exp(-t / 0.035) + gr[i] * 0.16 * exp(-t / 0.02); }
    return fade(norm(unDC(x), 0.9), sr, 0.001, 0.05);
  };
  Y.hoof = (sr, o) => {
    o = o || {}; const x = F32(0.18 * sr), r = A.rng(o.seed || 41), bp = filt(noise(x.length, r, 'white'), 'bp', 1000 + 500 * r(), 1.2, sr);
    let ph = 0, ph2 = 0;
    for (let i = 0; i < x.length; i++) { const t = i / sr; ph += TAU * (210 - 70 * Math.min(1, t / 0.03)) / sr; ph2 += TAU * 430 / sr; x[i] = bp[i] * exp(-t / 0.016) + 0.6 * Math.sin(ph) * exp(-t / 0.03) + 0.25 * Math.sin(ph2) * exp(-t / 0.02); }
    return fade(norm(unDC(x), 0.9), sr, 0.0005, 0.04);
  };
  // a stone or a broken brick clacking on the pile
  Y.rubble = (sr, o) => {
    o = o || {}; const x = F32(0.14 * sr), r = A.rng(o.seed || 43), f = 800 + 1800 * r(), bp = filt(noise(x.length, r, 'white'), 'bp', f, 2, sr);
    for (let i = 0; i < x.length; i++) { const t = i / sr; x[i] = bp[i] * exp(-t / 0.012) + 0.25 * Math.sin(TAU * f * 0.6 * t) * exp(-t / 0.02); }
    return fade(norm(unDC(x), 0.9), sr, 0.0004, 0.03);
  };
  // fire: a loop of crackles (pops of every size, a hiss on top) over a low roar that breathes
  Y.fire = (sr, o) => {
    o = o || {}; const dur = o.dur || 4, n = Math.round(dur * sr), xf = Math.round(0.4 * sr), r = A.rng(o.seed || 47), rate = o.rate || 26;
    const x = new Float32Array(n + xf), roar = filt(filt(noise(n + xf, r, 'brown'), 'lp', 420, 0.7, sr), 'hp', 70, 0.7, sr), hiss = filt(noise(n + xf, r, 'pink'), 'hp', 2500, 0.7, sr), ph = r() * TAU;
    for (let i = 0; i < x.length; i++) { const t = i / sr, br = 0.55 + 0.25 * Math.sin(TAU * 0.35 * t + ph) + 0.2 * Math.sin(TAU * 0.9 * t + 2 * ph); x[i] = roar[i] * 1.5 * br + hiss[i] * 0.03 * br; }
    for (let s = 0; s < (dur + 0.4) * rate; s++) {
      const s0 = Math.floor(r() * (n + xf - 400)), a = Math.pow(r(), 2.2) * 0.9 + 0.03, w = 0.001 + 0.007 * r(), f = 900 + 3000 * r(), q = svf(sr).set(f, 1.3);
      for (let i = 0; i < 0.03 * sr && s0 + i < x.length; i++) { q.run((r() * 2 - 1) * exp(-i / (sr * w))); x[s0 + i] += q.hp * a * 0.9; }
    }
    return norm(unDC(loopFix(x, n, xf)), 0.8);
  };
  // wind: pink noise through a band that drifts with the gusts (stereo, decorrelated, a seamless loop); the gale adds a whistle
  Y.wind = (sr, o) => {
    o = o || {}; const dur = o.dur || 8, n = Math.round(dur * sr), xf = Math.round(0.6 * sr), gale = !!o.gale, out = [];
    for (let c = 0; c < (o.mono ? 1 : 2); c++) {
      const r = A.rng((o.seed || 53) + c * 977), src = noise(n + xf, r, 'pink'), f = svf(sr), w = svf(sr), lo = filt(filt(noise(n + xf, r, 'brown'), 'lp', 180, 0.7, sr), 'hp', 45, 0.7, sr), hi = svf(sr).set(2200, 0.7), p1 = r() * TAU, p2 = r() * TAU, p3 = r() * TAU, x = new Float32Array(n + xf);
      for (let i = 0; i < n + xf; i++) {
        const t = i / sr, g = 0.5 + 0.3 * Math.sin(TAU * 0.13 * t + p1) + 0.2 * Math.sin(TAU * 0.29 * t + p2);
        if ((i & 15) === 0) { f.set((gale ? 520 : 340) * (0.7 + 0.7 * g), 0.8); w.set(700 + 260 * Math.sin(TAU * 0.11 * t + p3) + 240 * g, 12); }
        f.run(src[i]); w.run(src[i]); hi.run(src[i]);
        x[i] = f.bpn * (0.5 + 0.7 * g) + hi.hp * 0.09 * g * g + lo[i] * 0.16 + (gale ? w.bpn * 0.5 * g * g : 0);
      }
      out.push(norm(unDC(loopFix(x, n, xf)), 0.6));
    }
    return o.mono ? out[0] : out;
  };
  // a brook: pink noise through a resonance that wanders (the bubbling), a shimmer of bursts above (stereo loop)
  Y.water = (sr, o) => {
    o = o || {}; const dur = o.dur || 6, n = Math.round(dur * sr), xf = Math.round(0.5 * sr), out = [];
    for (let c = 0; c < (o.mono ? 1 : 2); c++) {
      const r = A.rng((o.seed || 59) + c * 1013), src = noise(n + xf, r, 'pink'), f = svf(sr), hp = svf(sr).set(220, 0.7), sp = svf(sr).set(4200, 0.8), x = new Float32Array(n + xf);
      let fc = 800, tgt = 800, amp = 0.6, tamp = 0.6;
      for (let i = 0; i < n + xf; i++) {
        if ((i & 63) === 0) { if (r() < 0.12) tgt = 350 + 1900 * r(); if (r() < 0.2) tamp = 0.25 + 0.75 * r(); fc += (tgt - fc) * 0.2; amp += (tamp - amp) * 0.3; f.set(fc, 5); }
        f.run(src[i]); hp.run(f.bpn); sp.run(src[i]);
        x[i] = hp.hp * amp * 0.9 + sp.hp * 0.05 * amp;
      }
      out.push(norm(loopFix(x, n, xf), 0.6));
    }
    return o.mono ? out[0] : out;
  };
  // insects. A cicada: a 4 kHz buzz pulsed at 40 Hz that swells and lulls (every modulation fits the 5 s exactly: a seamless loop)
  Y.cicada = (sr, o) => {
    o = o || {}; const n = Math.round(5 * sr), xf = Math.round(0.3 * sr), r = A.rng(o.seed || 61), f0 = o.f || 4300, nz = loopFix(filt(noise(n + xf, r, 'white'), 'bp', f0 * 1.1, 5, sr), n, xf), x = new Float32Array(n), p1 = r() * TAU, p2 = r() * TAU;
    for (let i = 0; i < n; i++) {
      const t = i / n * 5, am = Math.pow(0.5 + 0.5 * Math.sin(TAU * 40 * t), 1.6), sw = 0.5 + 0.4 * Math.sin(TAU * 0.4 * t + p1) * Math.sin(TAU * 0.2 * t + p2);
      x[i] = (Math.sin(TAU * f0 * t + 1.5 * Math.sin(TAU * 40 * t)) * 0.5 + nz[i] * 0.7) * am * Math.max(0.15, sw);
    }
    return norm(x, 0.7);
  };
  // a cricket: chirps of three 4.3 kHz pulses, six to the loop
  Y.cricket = (sr, o) => {
    o = o || {}; const n = Math.round(2.52 * sr), x = new Float32Array(n), r = A.rng(o.seed || 67), f = o.f || 4300;
    for (let c = 0; c < 6; c++) for (let p = 0; p < 3; p++) {
      const s0 = Math.round((c * 0.42 + p * 0.045 + (r() - 0.5) * 0.004) * sr), a = [0.8, 1, 0.9][p] * (0.85 + 0.3 * r()), len = Math.round(0.028 * sr);
      for (let i = 0; i < len; i++) { const u = i / len, t = i / sr; x[s0 + i] += a * Math.pow(Math.sin(Math.PI * u), 2) * (Math.sin(TAU * f * t) + 0.2 * Math.sin(TAU * 2 * f * t)); }
    }
    return norm(x, 0.7);
  };
  // a bird phrase: tweet (rising chirps), trill, whistle (two falling notes), coo (a soft dove), caw (a crow, far off)
  Y.bird = (sr, kind, seed) => {
    const r = A.rng((seed || 71) + kind.length * 131), chirp = (x, s0, dur, fa, fb, a, vib) => {
      const n = Math.round(dur * sr); let ph = 0;
      for (let i = 0; i < n && s0 + i < x.length; i++) { const u = i / n; ph += TAU * (fa * Math.pow(fb / fa, u) * (1 + (vib || 0) * Math.sin(TAU * 45 * i / sr))) / sr; x[s0 + i] += a * Math.sin(ph) * Math.pow(Math.sin(Math.PI * u), 1.5); }
    };
    let x;
    if (kind === 'tweet') { x = F32(0.7 * sr); const k = 2 + Math.floor(r() * 3), f = 3000 + 800 * r(); for (let j = 0; j < k; j++) chirp(x, Math.round((0.02 + j * (0.11 + 0.03 * r())) * sr), 0.07 + 0.03 * r(), f, f * (1.25 + 0.2 * r()), 0.8 - 0.1 * j); }
    else if (kind === 'trill') { x = F32(0.75 * sr); const f = 3600 + 400 * r(); for (let j = 0; j < 9; j++) chirp(x, Math.round((0.02 + j * 0.06) * sr), 0.04, f * (1 - 0.01 * j), f * (1.1 - 0.01 * j), 0.7, 0.01); }
    else if (kind === 'whistle') { x = F32(1.2 * sr); const f = 2500 + 300 * r(); chirp(x, Math.round(0.03 * sr), 0.32, f * 1.15, f, 0.8, 0.004); chirp(x, Math.round(0.5 * sr), 0.4, f * 0.95, f * 0.7, 0.7, 0.004); }
    else if (kind === 'coo') { x = F32(1.4 * sr); const f = 620 + 60 * r(); chirp(x, Math.round(0.05 * sr), 0.26, f * 1.1, f, 0.8, 0.002); chirp(x, Math.round(0.45 * sr), 0.5, f * 1.02, f * 0.8, 0.9, 0.002); }
    else { // caw: a buzzy saw with a throat's two formants, falling
      x = F32(1.5 * sr); const f1 = svf(sr).set(1000, 5), f2 = svf(sr).set(1800, 6);
      for (let c = 0, k = 2 + Math.floor(r() * 2); c < k; c++) { const s0 = Math.round((0.05 + c * 0.5) * sr), n = Math.round(0.34 * sr); let ph = 0; for (let i = 0; i < n && s0 + i < x.length; i++) { const u = i / n; ph += (400 - 140 * u) / sr; ph -= Math.floor(ph); const s = (2 * ph - 1) * 0.8 + (r() * 2 - 1) * 0.3; f1.run(s); f2.run(s); x[s0 + i] += (f1.bpn + 0.5 * f2.bpn) * Math.pow(Math.sin(Math.PI * u), 0.7); } }
    }
    return fade(norm(x, 0.8), sr, 0.002, 0.04);
  };
  // human voices: vowel formants over a saw of a chosen pitch (a shout from far off, a crowd's cheer)
  const VOW = { a: [730, 1090], o: [570, 840], e: [530, 1840], u: [300, 870] };
  function vox(out, sr, s0, dur, f0, vowel, amp, r, fall) {
    const n = Math.round(dur * sr), F = VOW[vowel] || VOW.a, f1 = svf(sr).set(F[0], 6), f2 = svf(sr).set(F[1], 8), vp = r() * TAU;
    let ph = r();
    for (let i = 0; i < n && s0 + i < out.length; i++) {
      const t = i / sr, u = i / n, env = Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.15)), 0.8) * Math.min(1, t / 0.05);
      ph += f0 * (1 + (fall || 0) * u + 0.012 * Math.sin(TAU * 5.3 * t + vp)) / sr; ph -= Math.floor(ph);
      const s = (2 * ph - 1) * 0.75 + (r() * 2 - 1) * 0.3; f1.run(s); f2.run(s);
      out[s0 + i] += (f1.bpn + 0.7 * f2.bpn) * env * amp;
    }
  }
  // the roar of a crowd for the 1 m scenes: formant-filtered noise that swells and thins, far-off shouts, and a clatter of arms (stereo loop)
  Y.crowd = (sr, o) => {
    o = o || {}; const dur = o.dur || 6, n = Math.round(dur * sr), xf = Math.round(0.5 * sr), out = [];
    for (let c = 0; c < (o.mono ? 1 : 2); c++) {
      const r = A.rng((o.seed || 73) + c * 1291), src = noise(n + xf, r, 'pink'), f1 = svf(sr), f2 = svf(sr), f3 = svf(sr).set(2800, 0.8), x = new Float32Array(n + xf), p = [r() * TAU, r() * TAU, r() * TAU];
      for (let i = 0; i < n + xf; i++) {
        const t = i / sr, sw = 0.6 + 0.25 * Math.sin(TAU * 0.33 * t + p[0]) + 0.15 * Math.sin(TAU * 0.71 * t + p[1]);
        if ((i & 15) === 0) { f1.set(560 + 160 * Math.sin(TAU * 0.4 * t + p[1]), 1.6); f2.set(1250 + 320 * Math.sin(TAU * 0.27 * t + p[2]), 1.8); }
        f1.run(src[i]); f2.run(src[i]); f3.run(src[i]);
        x[i] = (f1.bpn * 0.9 + f2.bpn * 0.6 + f3.bpn * 0.2) * sw;
      }
      for (let k = 0; k < Math.round(dur * 1.4); k++) vox(x, sr, Math.floor(r() * (n - 0.6 * sr)), 0.25 + 0.35 * r(), 150 + 110 * r(), pk(r, ['a', 'o', 'a']), 0.16 + 0.22 * r(), r, -0.12);
      for (let k = 0; k < Math.round(dur * 2.5); k++) { const cl = Y.clang(sr, { f: 1100 + 900 * r(), ring: 0.5, dur: 0.25, seed: k + c * 50 }), s0 = Math.floor(r() * (n - cl.length)), a = 0.05 + 0.12 * r(); for (let i = 0; i < cl.length; i++) x[s0 + i] += cl[i] * a; }
      out.push(norm(loopFix(x, n, xf), 0.6));
    }
    return o.mono ? out[0] : out;
  };
  // a cheer: each voice shouts twice (a short one, a long one that rises), over a swell of roar (stereo, one shot)
  Y.cheer = (sr, o) => {
    o = o || {}; const dur = o.dur || 3.6, n = Math.round(dur * sr), r = A.rng(o.seed || 79), nv = o.voices || 7, out = [F32(n), F32(n)];
    for (let c = 0; c < 2; c++) {
      const x = out[c];
      for (let v = 0; v < nv; v++) {
        const f0 = v % 3 === 2 ? 260 + 90 * r() : 145 + 70 * r(), o1 = 0.55 * r(), vw = pk(r, ['a', 'a', 'o']);
        vox(x, sr, Math.round(o1 * sr), 0.5 + 0.25 * r(), f0, vw, 0.8, r, 0.05); vox(x, sr, Math.round((o1 + 0.85 + 0.2 * r()) * sr), 1.2 + 0.5 * r(), f0 * 1.08, vw, 1, r, 0.06);
      }
      const bed = filt(noise(n, r, 'pink'), 'bp', 900, 0.7, sr);
      for (let i = 0; i < n; i++) { const t = i / sr; x[i] += bed[i] * 0.55 * Math.pow(Math.sin(Math.PI * Math.min(1, t / dur)), 1.3); }
      unDC(x); fade(x, sr, 0.03, 0.4);
    }
    const k = 0.9 / Math.max(peakOf(out[0]), peakOf(out[1]), 1e-9); for (const x of out) for (let i = 0; i < x.length; i++) x[i] *= k;
    return out;
  };
  // a horn (a long war horn): two slightly detuned saws over a square an octave down, a filter that opens as the note swells
  Y.horn = (f, sr, o) => {
    o = o || {}; const dur = o.dur || 3, n = Math.round(dur * sr), x = new Float32Array(n), lp = svf(sr), pk2 = svf(sr).set(f * 4.2, 1.6), r = A.rng((o.seed || 83) + Math.round(f));
    const blep = (t, dt) => (t < dt ? (t /= dt, t + t - t * t - 1) : t > 1 - dt ? (t = (t - 1) / dt, t * t + t + t + 1) : 0);
    let p1 = r(), p2 = r(), p3 = r(), br = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr, u = t / dur, sw = Math.min(1, t / 0.55) * (u > 0.75 ? Math.max(0, (1 - u) / 0.25) : 1), a = Math.min(1, Math.pow(t / 0.2, 1.4)) * (u > 0.8 ? Math.max(0, (1 - u) / 0.2) : 1), vb = 1 + 0.004 * Math.min(1, t / 1.2) * Math.sin(TAU * 5.1 * t);
      const d1 = f * vb / sr, d2 = f * 1.004 * vb / sr, d3 = f * 0.5 * vb / sr; p1 += d1; p1 -= Math.floor(p1); p2 += d2; p2 -= Math.floor(p2); p3 += d3; p3 -= Math.floor(p3);
      const s = (2 * p1 - 1 - blep(p1, d1)) + (2 * p2 - 1 - blep(p2, d2)) * 0.8 + (p3 < 0.5 ? 1 : -1) * 0.16;
      if ((i & 15) === 0) lp.set(380 + 1900 * sw * sw, 1.3);
      lp.run(s); pk2.run(s); br += 0.02 * ((r() * 2 - 1) - br);
      x[i] = (lp.lp + pk2.bpn * 0.35 + br * 0.5 * sw) * a;
    }
    return fade(norm(unDC(x), 0.85), sr, 0.005, 0.05);
  };
  // a room: a burst of noise that darkens as it decays, early taps in the first 90 ms (stereo). Feed a ConvolverNode
  Y.ir = (sr, o) => {
    o = o || {}; const sec = o.sec || 2.2, n = Math.round(sec * sr), out = [];
    for (let c = 0; c < 2; c++) {
      const r = A.rng((o.seed || 89) + c * 31), x = new Float32Array(n); let y = 0;
      for (let i = 0; i < n; i++) { const t = i / sr, a = 0.22 + 0.72 * exp(-t / (sec * 0.3)); y += a * ((r() * 2 - 1) - y); x[i] = y * exp(-6.9078 * t / sec) * Math.min(1, t / 0.012); }
      for (let k = 0; k < 9; k++) { const at = Math.round((0.006 + 0.09 * r()) * sr); x[at] += (r() < 0.5 ? -1 : 1) * (0.5 - 0.04 * k) * (o.early == null ? 0.5 : o.early); }
      out.push(norm(x, 0.8));
    }
    return out;
  };

  // ---------------------------------------------------------------- analysis (pure): levels, DC, spectrum, chroma
  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { const a = re[i]; re[i] = re[j]; re[j] = a; const b = im[i]; im[i] = im[j]; im[j] = b; } }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = -TAU / len, wr = Math.cos(ang), wi = Math.sin(ang), h = len >> 1;
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let j = 0; j < h; j++) {
          const a = i + j, b = a + h, tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
          re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
          const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
        }
      }
    }
  }
  const mixdown = (chs) => { if (chs.length === 1) return chs[0]; const n = chs[0].length, m = new Float32Array(n), k = 1 / chs.length; for (const c of chs) for (let i = 0; i < n; i++) m[i] += c[i] * k; return m; };
  // Welch power spectrum of the mono mix: { f: Hz per bin, p: mean-square per bin (its sum is the signal's mean square) }
  A.spectrum = (x, sr, N) => {
    N = N || 4096; const w = new Float64Array(N); let sw = 0;
    for (let i = 0; i < N; i++) { w[i] = 0.5 - 0.5 * Math.cos(TAU * i / N); sw += w[i] * w[i]; }
    const frames = Math.max(1, Math.floor((x.length - N) / (N / 2)) + 1), stride = Math.max(1, Math.floor(frames / 240)), p = new Float64Array(N / 2 + 1), re = new Float64Array(N), im = new Float64Array(N);
    let used = 0;
    for (let fr = 0; fr < frames; fr += stride) {
      const s0 = fr * (N / 2); if (s0 + N > x.length && x.length >= N) break;
      for (let i = 0; i < N; i++) { re[i] = (x[s0 + i] || 0) * w[i]; im[i] = 0; }
      fft(re, im);
      for (let k = 0; k <= N / 2; k++) p[k] += (re[k] * re[k] + im[k] * im[k]) / (N * sw) * (k === 0 || k === N / 2 ? 1 : 2);
      used++;
    }
    for (let k = 0; k < p.length; k++) p[k] /= Math.max(1, used);
    const f = new Float64Array(p.length); for (let k = 0; k < f.length; k++) f[k] = k * sr / N;
    return { f, p };
  };
  A.BANDS = [['sub', 20, 80], ['low', 80, 250], ['lowmid', 250, 800], ['mid', 800, 2500], ['himid', 2500, 6000], ['high', 6000, 16000]];
  // the 12 pitch classes (C = 0) of a signal's spectrum between 100 Hz and 2 kHz, as shares of the energy
  A.chroma = (x, sr) => {
    const s = A.spectrum(x, sr, 8192), c = new Float64Array(12); let tot = 0;
    for (let k = 1; k < s.f.length; k++) { const f = s.f[k]; if (f < 100 || f > 2000) continue; const pc = ((Math.round(12 * Math.log2(f / 440)) + 69) % 12 + 12) % 12; c[pc] += s.p[k]; tot += s.p[k]; }
    return Array.from(c, (v) => (tot ? v / tot : 0));
  };
  // the power at one frequency (a single DFT bin, Hann-free: for tones in tests)
  A.tone = (x, sr, f) => { let re = 0, im = 0; const w = TAU * f / sr; for (let i = 0; i < x.length; i++) { re += x[i] * Math.cos(w * i); im -= x[i] * Math.sin(w * i); } return Math.hypot(re, im) * 2 / x.length; };
  // levels of a rendered piece: peak, rms, the loudest 400 ms, DC, clipped samples, the share of near-silence, and the spectrum by band
  A.analyze = (chs, sr, o) => {
    chs = Array.isArray(chs) ? chs : [chs]; o = o || {};
    const n = chs[0].length; let peak = 0, sq = 0, clip = 0; const dc = [];
    for (const c of chs) { let s = 0; for (let i = 0; i < n; i++) { const v = c[i], a = Math.abs(v); if (a > peak) peak = a; if (a >= 0.999) clip++; sq += v * v; s += v; } dc.push(s / n); }
    const rms = Math.sqrt(sq / (n * chs.length)), win = Math.round(0.4 * sr), sts = [];
    for (let s0 = 0; s0 + win <= n; s0 += win) { let e = 0; for (const c of chs) for (let i = s0; i < s0 + win; i++) e += c[i] * c[i]; sts.push(Math.sqrt(e / (win * chs.length))); }
    const active = sts.filter((v) => db(v) > -60), silent = sts.length ? 1 - active.length / sts.length : 0;
    const rmsActive = active.length ? Math.sqrt(active.reduce((s, v) => s + v * v, 0) / active.length) : 0;
    const out = { sec: n / sr, peak, peakDb: db(peak), rms, rmsDb: db(rms), rmsActiveDb: db(rmsActive), shortMaxDb: db(sts.length ? Math.max(...sts) : rms), dc, dcMax: Math.max(...dc.map(Math.abs)), clip, silent, crest: db(peak) - db(rms) };
    const sp = A.spectrum(mixdown(chs), sr, 4096), bands = {}; let tp = 0, cn = 0;
    for (const [k, lo, hi] of A.BANDS) { let e = 0; for (let i = 0; i < sp.f.length; i++) if (sp.f[i] >= lo && sp.f[i] < hi) e += sp.p[i]; bands[k] = 10 * Math.log10(Math.max(1e-14, e)); }
    for (let i = 1; i < sp.f.length; i++) { tp += sp.p[i]; cn += sp.p[i] * sp.f[i]; }
    out.bands = bands; out.centroid = tp ? cn / tp : 0;
    if (o.chroma) out.chroma = A.chroma(mixdown(chs), sr);
    return out;
  };

  // ---------------------------------------------------------------- the ambience of a season (pure)
  // levels 0..1 per layer: wind, gale (winter's whistle), water, birds, cicada, cricket, crow, din (the battle)
  A.AMB = {
    xuan: { wind: 0.35, water: 0.5, birds: 1 },
    ha: { wind: 0.16, water: 0.42, cicada: 1, birds: 0.3 },
    thu: { wind: 0.4, water: 0.36, cricket: 0.8, crow: 0.6 },
    dong: { gale: 0.5, wind: 0.12, water: 0.08, crow: 0.4 },
  };
  A.LAYERS = ['wind', 'gale', 'water', 'birds', 'cicada', 'cricket', 'crow', 'din'];
  // a season's layers, quieter under a battle (the nature gives way), plus the din
  A.ambSpec = (sid, mood, din) => {
    const base = A.AMB[sid] || A.AMB.thu, hot = mood === 'battle' || mood === 'tension', out = {};
    for (const k of A.LAYERS) out[k] = (base[k] || 0) * (hot ? (k === 'wind' || k === 'gale' ? 0.8 : 0.35) : 1);
    out.din = clamp(din || 0, 0, 1);
    return out;
  };
  A.CUES = ['tap', 'select', 'confirm', 'cancel', 'skip', 'drum', 'endSeason', 'march', 'oars', 'horse', 'charge', 'horn', 'volley', 'clash', 'fire', 'breach', 'rout', 'flag', 'camp', 'cheer', 'gong', 'chime', 'card', 'victory', 'defeat'];
  const UI_CUES = { tap: 1, select: 1, confirm: 1, cancel: 1, skip: 1 };

  // ---------------------------------------------------------------- the engine (Web Audio, on any context)
  // Levels are set here in dB and were tuned with A.render + A.analyze (tests/e2e/audio-measure.mjs).
  const LEV = { music: -5.5, amb: -13, sfx: -7, ui: -8 };
  const V = { pluck: 0.68, qin: 0.7, glass: 0.4, flute: 0.15, taiko: 0.3, ka: 0.55, gong: 0.42, horn: 0.5 }; // voice levels inside a mood
  const MIXM = { // per mood, what each voice is turned by: the drums lead a battle, the horn and the gong a victory
    tension: { qin: 0.75, taiko: 1.3, flute: 0.75, gong: 1.5 }, battle: { qin: 0.55, pluck: 1.2, ka: 1.2 },
    victory: { taiko: 2.2, gong: 2.2, horn: 2 }, defeat: { taiko: 3, gong: 2.8 },
  };
  const vol = (mood, v) => V[v] * ((MIXM[mood] || {})[v] || 1);
  const KS = { // Karplus-Strong voices: pipa (bright, short), zheng (rounder), qin (dark, long)
    pipa: { damp: 0.8, t60: 1.4, pos: 0.12, tone: 0.6 }, zheng: { damp: 0.68, t60: 2.2, pos: 0.18, tone: 0.4 }, qin: { damp: 0.55, t60: 3.6, pos: 0.3, tone: 0.2 },
  };
  const softClip = (() => { const n = 2048, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1, a = Math.abs(x), y = a < 0.7 ? a : 0.7 + 0.28 * Math.tanh((a - 0.7) / 0.28); c[i] = x < 0 ? -y : y; } return c; })();

  // Buffer recipes: name → (args) → [cache key, generator]. The engine and the pre-warm share them, so a buffer rendered early is found by key.
  const RAW = new Map(); // rendered ahead of a context: 'key@rate[l]' → Float32Array | [L, R]
  const RECIPES = (sr, lite) => ({
    pluck: (kind, m) => ['pl' + kind + m, () => Y.pluck(A.hz(m), sr, Object.assign({ dur: lite ? 1.6 : 2.4 }, KS[kind]))],
    glass: (m) => ['gl' + m, () => Y.glass(A.hz(m), sr, { dur: lite ? 2 : 3 })],
    gong: (kind) => ['go' + kind, () => (kind === 'small' ? Y.gong(520, sr, { small: true, dur: 2.2, np: lite ? 4 : 6 }) : kind === 'low' ? Y.gong(82, sr, { dur: lite ? 3.6 : 5.2, np: lite ? 5 : 8 }) : Y.gong(110, sr, { dur: lite ? 3.2 : 4.6, np: lite ? 5 : 8 }))],
    taiko: (size, f, dur) => ['ta' + size + (f || '') + (dur || ''), () => Y.taiko(sr, { size, f, dur })],
    ka: () => ['ka', () => Y.ka(sr)],
    wood: (f) => ['wo' + f, () => Y.wood(sr, { f })],
    clang: (i) => ['cl' + i, () => Y.clang(sr, { f: [1100, 1450, 1850, 2300][i % 4], seed: 19 + i })],
    thud: (f) => ['th' + f, () => Y.thud(sr, { f })],
    whoosh: (i) => ['wh' + i, () => Y.sweep(sr, { dur: 0.5, f0: 5200 - 600 * (i % 3), f1: 1700 + 250 * (i % 3), q: 3.2, seed: 29 + i })],
    foot: (i) => ['ft' + i, () => Y.foot(sr, { seed: 37 + i * 11 })],
    hoof: (i) => ['hf' + i, () => Y.hoof(sr, { seed: 41 + i * 13 })],
    rubble: (i) => ['rb' + i, () => Y.rubble(sr, { seed: 43 + i * 7 })],
    snap: () => ['sn', () => Y.snap(sr)],
    fire: () => ['fi', () => Y.fire(sr, { dur: lite ? 3 : 4, rate: lite ? 18 : 26 })],
    cheer: () => ['ch', () => Y.cheer(sr, { voices: lite ? 4 : 7 })],
    horn: (m, d) => ['ho' + m + ':' + d, () => Y.horn(A.hz(m), sr, { dur: d })],
    crowd: () => ['cr', () => Y.crowd(sr, { dur: lite ? 4 : 6, mono: lite })],
    wind: (gale) => ['wi' + (gale ? 1 : 0), () => Y.wind(sr, { dur: lite ? 5 : 8, gale, mono: lite })],
    water: () => ['wa', () => Y.water(sr, { dur: lite ? 4 : 6, mono: lite })],
    cicada: (i) => ['ci' + i, () => Y.cicada(sr, { seed: 61 + i, f: 4100 + 350 * i })],
    cricket: (i) => ['ck' + i, () => Y.cricket(sr, { seed: 67 + i, f: [4200, 4550, 4950][i % 3] })],
    bird: (kind, i) => ['bd' + kind + i, () => Y.bird(sr, kind, 71 + i * 17)],
    noise: () => ['nz', () => noise(Math.round(4 * sr), A.rng(97), 'pink')],
  });
  // render the heavy buffers before anyone taps (one per idle slice), so the first sound costs no hitch; the engine takes them by key
  A.prewarm = (o) => {
    o = o || {}; const sr = o.sr || 44100, lite = !!o.lite, R = RECIPES(sr, lite), idle = (f) => (root.requestIdleCallback ? root.requestIdleCallback(f, { timeout: 4000 }) : setTimeout(f, 80));
    const list = [R.wind(false), R.water(), R.crowd(), R.cheer(), R.gong('big'), R.taiko('big'), R.taiko('small'), R.gong('small'), R.horn(45, 1.8), R.horn(52, 1.4), R.fire()];
    let i = 0;
    const step = () => { if (i >= list.length) return; const [key, gen] = list[i++], rk = key + '@' + sr + (lite ? 'l' : ''); try { if (!RAW.has(rk)) RAW.set(rk, gen()); } catch (e) { /* made on demand instead */ } idle(step); };
    idle(step);
    return list.length;
  };
  A.rawWaiting = () => RAW.size;

  // create(ctx, { lite, seed, offline, muted, dest }) → the engine: { cue, setMood, setSeason, setAmbience, setDin, tick, skip, ... }
  A.create = (ctx, opts) => {
    opts = opts || {};
    const lite = !!opts.lite, offline = !!opts.offline, sr = ctx.sampleRate, seed = (opts.seed >>> 0) || 1, E = { ctx, lite };
    let cueN = 0;
    const solo = opts.voices ? new Set(opts.voices) : null; // (measurements) only these voices, 'drone' included
    const now = () => ctx.currentTime;
    const gain = (v) => { const g = ctx.createGain(); g.gain.value = v; return g; };
    const bq = (type, f, q) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; return b; };
    let clockT = 0; // the scheduler's idea of "now" (offline: the tick's time)
    const clock = () => (offline ? clockT : now());

    // ---- the master: a soft compressor, a fast limiter, a soft clip; the mute gain last
    const input = gain(1), comp = ctx.createDynamicsCompressor(), lim = ctx.createDynamicsCompressor(), clip = ctx.createWaveShaper(), master = gain(opts.muted ? 0 : 1);
    comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 2.5; comp.attack.value = 0.01; comp.release.value = 0.3;
    lim.threshold.value = -2; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.08;
    clip.curve = softClip; try { clip.oversample = lite ? 'none' : '2x'; } catch (e) { /* older engines */ }
    if (opts.dry) input.connect(master); // (measurements) the mix before the dynamics, to see what they are asked to do
    else { input.connect(comp); comp.connect(lim); lim.connect(clip); clip.connect(master); }
    master.connect(opts.dest || ctx.destination);
    E.master = master; E.input = input;
    // ---- buses: music (ducked by big effects), ambience, effects (a scene bus that a skip can cut), the player's own taps
    const musicBus = gain(lin(LEV.music)), duck = gain(1), ambBus = gain(lin(LEV.amb)), sfxBus = gain(lin(LEV.sfx)), uiBus = gain(lin(LEV.ui));
    musicBus.connect(duck); duck.connect(input); ambBus.connect(input); sfxBus.connect(input); uiBus.connect(input);
    let scene = gain(1); scene.connect(sfxBus);
    // ---- reverb: a synthesized room on a convolver, or four damped combs on a phone
    const rvIn = gain(1), rvOut = gain(lite ? 0.55 : 0.8);
    if (!lite) {
      const pre = ctx.createDelay(0.1), conv = ctx.createConvolver(), ir = Y.ir(sr, { sec: 2.4 }), buf = ctx.createBuffer(2, ir[0].length, sr);
      pre.delayTime.value = 0.014; buf.getChannelData(0).set(ir[0]); buf.getChannelData(1).set(ir[1]); conv.buffer = buf; rvIn.connect(pre); pre.connect(conv); conv.connect(rvOut);
    } else {
      [0.0297, 0.0371, 0.0411, 0.0437].forEach((d) => {
        const dl = ctx.createDelay(0.1), damp = bq('lowpass', 2400, 0.5), fb = gain(0.8); dl.delayTime.value = d;
        rvIn.connect(dl); dl.connect(damp); damp.connect(fb); fb.connect(dl); dl.connect(rvOut);
      });
    }
    rvOut.connect(input);

    // ---- buffers, made on first use and kept (a cap keeps a phone's memory small); the heavy ones may be waiting from A.prewarm
    const cache = new Map(), cap = lite ? 70 : 150, R = RECIPES(sr, lite), B = {};
    const mk = (raw) => { const chs = Array.isArray(raw) ? raw : [raw], b = ctx.createBuffer(chs.length, chs[0].length, sr); chs.forEach((c, i) => b.getChannelData(i).set(c)); return b; };
    const atom = (key, gen) => {
      let b = cache.get(key);
      if (!b) { const rk = key + '@' + sr + (lite ? 'l' : ''), pre = RAW.get(rk); if (pre) RAW.delete(rk); b = mk(pre || gen()); cache.set(key, b); if (cache.size > cap) cache.delete(cache.keys().next().value); }
      return b;
    };
    for (const k of Object.keys(R)) B[k] = (...a) => atom(...R[k](...a));
    E.buffers = B;
    // what to make first so nothing hitches in play: a list of thunks the live wrapper runs one per idle slice
    E.warm = () => {
      const w = [() => B.wood(520), () => B.wood(390), () => B.wood(560), () => B.gong('small'), () => B.taiko('big'), () => B.taiko('small'), () => B.ka(), () => B.wind(false), () => B.water(), () => B.gong('big')];
      for (const m of [55, 57, 59, 62, 64, 67, 69, 71, 74, 76]) w.push(() => B.pluck('zheng', m));
      w.push(() => B.horn(45, 1.8), () => B.horn(52, 1.5), () => B.crowd(), () => B.cheer());
      for (let i = 0; i < 4; i++) w.push(() => B.foot(i), () => B.hoof(i), () => B.clang(i));
      return w;
    };

    // ---- one buffer, one hit: source → gain → (pan) → destination, and an optional send to the reverb
    const hit = (buf, t, o) => {
      o = o || {};
      const s = ctx.createBufferSource(), g = ctx.createGain(), rate = o.rate || 1, gv = o.g == null ? 1 : o.g; s.buffer = buf; g.gain.value = gv; s.connect(g);
      if (rate !== 1) s.playbackRate.value = rate;
      if (o.glide) { s.playbackRate.setValueAtTime(rate * o.glide, t); s.playbackRate.exponentialRampToValueAtTime(rate, t + (o.glideT || 0.15)); }
      let tail = g;
      if (o.pan && !lite && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = clamp(o.pan, -1, 1); g.connect(p); tail = p; }
      tail.connect(o.out || scene);
      if (o.send) { const sg = gain(o.send); tail.connect(sg); sg.connect(rvIn); }
      const len = o.dur || buf.duration / rate;
      if (o.fadeIn || o.fadeOut) { const a = o.fadeIn || 0.01, b = o.fadeOut || 0.01; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gv, t + a); g.gain.setValueAtTime(gv, Math.max(t + a, t + len - b)); g.gain.linearRampToValueAtTime(0, t + len); }
      s.loop = !!o.loop; s.start(t, o.offset || 0);
      if (o.dur) s.stop(t + len + 0.05);
      return s;
    };
    const duckMusic = (t, amt, hold) => { duck.gain.setTargetAtTime(lin(-amt), t, 0.05); duck.gain.setTargetAtTime(1, t + hold, 0.5); };

    // ---- the music: scenes (a mood in a season) crossfade; a scene has its own bus, drone and flute vibrato
    const M = { mood: null, sid: 'thu', k: 0.5, scene: null, old: [], next: 0, n: 0, revertAt: null, revertTo: null, din: 0, dinBack: null, dinAt: null };
    let fluteWave = null;
    const flutePeriodic = () => {
      if (fluteWave) return fluteWave;
      const re = new Float32Array(8), im = new Float32Array(8); [0, 1, 0.34, 0.14, 0.06, 0.03, 0.015, 0.008].forEach((a, i) => { im[i] = a; });
      return (fluteWave = ctx.createPeriodicWave(re, im));
    };
    const drone = (sc, midi, level, t, droop) => {
      const f = A.hz(midi), out = gain(0), lp = bq('lowpass', 430, 0.4);
      (lite ? [['sine', 1, 0.5], ['triangle', 1.003, 0.3], ['sine', 1.5, 0.14]] : [['sine', 1, 0.5], ['triangle', 1.003, 0.32], ['sine', 1.5, 0.16], ['triangle', 2, 0.1], ['sine', 3, 0.04]]).forEach(([type, k, a]) => {
        const o = ctx.createOscillator(), g = gain(a); o.type = type; o.frequency.value = f * k;
        if (droop) { o.detune.setValueAtTime(0, t); o.detune.linearRampToValueAtTime(-droop, t + 9); }
        o.connect(g); g.connect(lp); o.start(t); sc.stops.push(o);
      });
      if (!lite) { const l = ctx.createOscillator(), lg = gain(150); l.frequency.value = 0.06; l.connect(lg); lg.connect(lp.frequency); l.start(t); sc.stops.push(l); }
      lp.connect(out); out.connect(sc.bus); out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(level, t + 2.2);
    };
    const startScene = (mood, sid, t) => {
      const old = M.scene;
      if (old) {
        const fo = (A.MOOD[old.mood] || {}).fadeOut || 2, end = t + fo * 1.4 + 0.3;
        old.bus.gain.cancelScheduledValues(t); old.bus.gain.setTargetAtTime(0, t, fo / 4); old.stops.forEach((o) => { try { o.stop(end); } catch (e) { /* already stopped */ } }); old.dead = end + 0.2; M.old.push(old);
      }
      M.scene = null;
      const cfg = A.MOOD[mood]; if (!cfg) return;
      const sc = { mood, sid, bus: gain(0), rv: gain(0.2), stops: [], dead: 0, t0: t };
      sc.bus.connect(musicBus); sc.bus.connect(sc.rv); sc.rv.connect(rvIn);
      sc.bus.gain.setValueAtTime(0, t); sc.bus.gain.setTargetAtTime(1, t, cfg.fadeIn / 4);
      const S = A.SEASONS[sid] || A.SEASONS.thu, key = mood === 'victory' ? A.SEASONS.xuan : mood === 'defeat' ? A.SEASONS.thu : S;
      if (!solo || solo.has('drone')) drone(sc, key.drone, cfg.drone, t, mood === 'defeat' ? 60 : 0);
      if (!lite) { const l = ctx.createOscillator(), lg = gain(6), lw = gain(16); l.frequency.value = 5.1; l.connect(lg); l.connect(lw); l.start(t); sc.vib = lg; sc.vibW = lw; sc.stops.push(l); }
      M.scene = sc; M.next = t + 0.06; M.n = 0;
    };
    // a flute note: a soft-edged wave with a breath of noise, a scoop up to pitch, a shared vibrato; xiao (low) or dizi by register
    const flute = (sc, m, t, dur, g, x) => {
      const f = A.hz(m), o = ctx.createOscillator(), lp = bq('lowpass', Math.min(5500, f * 4.2), 0.5), env = gain(0), lv = g * vol(sc.mood, 'flute');
      o.setPeriodicWave(flutePeriodic()); o.frequency.value = f;
      o.detune.setValueAtTime(x && x.slide ? x.slide * 100 : -32, t); o.detune.linearRampToValueAtTime(0, t + (x && x.slide ? 0.22 : 0.12));
      const vib = x && x.wide ? sc.vibW : sc.vib; if (vib) { vib.connect(o.detune); o.onended = () => { try { vib.disconnect(o.detune); } catch (e) { /* gone */ } }; }
      env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(lv, t + 0.11); env.gain.setValueAtTime(lv * 0.86, t + Math.min(0.5, dur * 0.3)); env.gain.setTargetAtTime(0, t + dur, 0.14);
      o.connect(lp); lp.connect(env); env.connect(sc.bus);
      if (!lite) { // the breath: a band of noise round the second harmonic, strong at the start and thin after
        const s = ctx.createBufferSource(), bp = bq('bandpass', Math.min(7000, f * 2.2), 1.3), bg = gain(0); s.buffer = B.noise(); s.loop = true;
        bg.gain.setValueAtTime(0, t); bg.gain.linearRampToValueAtTime(lv * 0.5, t + 0.05); bg.gain.setTargetAtTime(lv * 0.09, t + 0.08, 0.15); bg.gain.setTargetAtTime(0, t + dur, 0.14);
        s.connect(bp); bp.connect(bg); bg.connect(sc.bus); s.start(t, (f * 7.3) % 3); s.stop(t + dur + 0.9);
      }
      const sg = gain(0.5); env.connect(sg); sg.connect(rvIn);
      o.start(t); o.stop(t + dur + 0.9);
    };
    const pluckKind = (sc) => (sc.mood === 'battle' || sc.mood === 'tension' || sc.sid === 'xuan' ? 'pipa' : 'zheng');
    // one event of a bar
    const playEv = (sc, e, t, spb, r) => {
      if (solo && !solo.has(e.v)) return;
      const g = e.g == null ? 0.7 : e.g, x = e.x || {}, jit = (r() - 0.5) * 0.02, pan = lite ? 0 : (r() - 0.5) * 0.5;
      switch (e.v) {
        case 'pluck': {
          const buf = B.pluck(x.bed ? 'zheng' : pluckKind(sc), e.n);
          if (x === 'roll') for (let j = 0; j < 7; j++) hit(buf, t + j * spb * 0.1, { g: g * vol(sc.mood, 'pluck') * (0.35 + 0.1 * j), out: sc.bus, pan });
          else if (x.long) hit(buf, t, { g: g * vol(sc.mood, 'pluck'), out: sc.bus, pan, send: 0.2 });
          else hit(buf, t + jit, { g: g * vol(sc.mood, 'pluck'), out: sc.bus, pan });
          break;
        }
        case 'qin': hit(B.pluck('qin', e.n), t + jit, { g: g * vol(sc.mood, 'qin'), out: sc.bus, send: 0.1, glide: x.slide ? Math.pow(2, x.slide / 12) : 0, glideT: 0.18 }); break;
        case 'glass': hit(B.glass(e.n), t + jit, { g: g * vol(sc.mood, 'glass'), out: sc.bus, pan: pan * 1.6, send: 0.35 }); break;
        case 'flute': flute(sc, e.n, t, Math.min(6.5, e.d * spb), g, x); break;
        case 'taiko': { const big = x.size !== 'small'; hit(B.taiko(big ? 'big' : 'small'), t, { g: g * vol(sc.mood, 'taiko'), out: sc.bus, rate: 1 + (r() - 0.5) * 0.04, send: big ? 0.12 : 0.08 }); break; }
        case 'ka': hit(B.ka(), t, { g: g * vol(sc.mood, 'ka'), out: sc.bus, rate: 1 + (r() - 0.5) * 0.1, pan }); break;
        case 'gong': { const kind = x.size === 'small' ? 'small' : x.size === 'low' ? 'low' : 'big', base = kind === 'small' ? 520 : kind === 'low' ? 82 : 110; hit(B.gong(kind), t, { g: g * vol(sc.mood, 'gong'), out: sc.bus, rate: clamp(A.hz(e.n) / base, 0.85, 1.2), glide: 0.985, glideT: 0.35, send: 0.3 }); break; }
        case 'horn': { const d = Math.round(clamp(e.d * spb, 1, 3.4) * 5) / 5; hit(B.horn(e.n, d), t, { g: g * vol(sc.mood, 'horn'), out: sc.bus, send: 0.3 }); break; }
        default: break;
      }
    };
    E.setMood = (mood, o) => {
      o = o || {}; const t = o.t != null ? o.t : now() + 0.03;
      if (o.k != null) M.k = clamp(o.k, 0, 1);
      const cur = M.scene ? M.scene.mood : 'off';
      if (mood === cur) { if (o.hold != null && M.revertAt != null) M.revertAt = t + o.hold; return; }
      if (o.hold != null) { M.revertTo = cur; M.revertAt = t + o.hold; } else M.revertAt = null;
      startScene(mood, M.sid, t);
      E.setAmbience(null, { t });
    };
    E.setSeason = (sid, o) => {
      o = o || {}; if (!A.SEASONS[sid]) return; const t = o.t != null ? o.t : now() + 0.03, was = M.sid; M.sid = sid;
      if (was !== sid && M.scene && (M.scene.mood === 'calm')) startScene('calm', sid, t);
      E.setAmbience(null, { t });
    };
    E.mood = () => (M.scene ? M.scene.mood : 'off');
    E.season = () => M.sid;

    // ---- the ambience: loops fade in and out by level; birds and crows are scheduled by the tick
    const layers = {};
    const LOOPS = { // key: [ [buffer, rate, pan, gain] … ] and the level into the ambience bus
      wind: { lv: 0.62, src: () => [[B.wind(false), 1, 0, 1]] },
      gale: { lv: 0.85, src: () => [[B.wind(true), 1, 0, 1]] },
      water: { lv: 0.5, src: () => [[B.water(), 1, 0, 1]] },
      cicada: { lv: 0.32, src: () => [[B.cicada(0), 0.97, -0.5, 1], [B.cicada(1), 1.03, 0.5, 0.8]] },
      cricket: { lv: 0.3, src: () => (lite ? [[B.cricket(0), 1, -0.4, 1], [B.cricket(1), 0.93, 0.4, 0.9]] : [[B.cricket(0), 1, -0.5, 1], [B.cricket(1), 0.93, 0.5, 0.9], [B.cricket(2), 1.07, 0, 0.8]]) },
      din: { lv: 0.62, src: () => [[B.crowd(), 1, 0, 1]] },
    };
    const layer = (k) => {
      if (layers[k]) return layers[k];
      const L = { g: gain(0), on: false, src: null, stopAt: null }; L.g.connect(ambBus); const sg = gain(0.12); L.g.connect(sg); sg.connect(rvIn); layers[k] = L; return L;
    };
    const setLayer = (k, lv, t) => {
      const spec = LOOPS[k]; if (!spec) return; const L = layer(k);
      if (lv > 0.005) {
        if (!L.src) { L.src = spec.src().map(([buf, rate, pan, g], i) => { const s = hit(buf, t, { loop: true, rate, g: g * spec.lv, pan, out: L.g, offset: (i * 1.7) % (buf.duration * 0.8) }); return s; }); }
        L.g.gain.cancelScheduledValues(t); L.g.gain.setTargetAtTime(lv, t, 1.4); L.on = true; L.stopAt = null;
      } else if (L.on) { L.g.gain.cancelScheduledValues(t); L.g.gain.setTargetAtTime(0, t, 1.4); L.on = false; L.stopAt = t + 9; }
    };
    const SC = { birds: { next: 0, lv: 0 }, crow: { next: 0, lv: 0 }, dinfx: { next: 0, lv: 0 } };
    E.setAmbience = (spec, o) => {
      o = o || {}; const t = o.t != null ? o.t : now() + 0.03, sp = spec || A.ambSpec(M.sid, M.scene ? M.scene.mood : 'off', M.din);
      for (const k of Object.keys(LOOPS)) setLayer(k, sp[k] || 0, t);
      for (const k of ['birds', 'crow']) { SC[k].lv = sp[k] || 0; if (SC[k].next < t) SC[k].next = t + 0.4 + (k === 'crow' ? 5 : 0); }
      SC.dinfx.lv = sp.din || 0; if (SC.dinfx.next < t) SC.dinfx.next = t + 0.3;
    };
    E.setDin = (x, o) => {
      o = o || {}; const t = o.t != null ? o.t : now() + 0.03;
      if (o.hold != null) { if (M.dinAt == null) M.dinBack = M.din; M.dinAt = t + o.hold; } else { M.dinAt = null; }
      M.din = clamp(x, 0, 1); E.setAmbience(null, { t });
    };
    const BIRDS = { xuan: [['tweet', 3], ['trill', 2], ['whistle', 2], ['coo', 1]], ha: [['tweet', 2], ['trill', 1], ['coo', 1]] };
    const birdAt = (t, lv, r) => {
      const list = BIRDS[M.sid] || BIRDS.xuan, tot = list.reduce((s, x) => s + x[1], 0); let pickw = r() * tot, kind = list[0][0];
      for (const [k, w] of list) { if ((pickw -= w) < 0) { kind = k; break; } }
      hit(B.bird(kind, Math.floor(r() * 3)), t, { g: (kind === 'coo' ? 0.3 : 0.42) * (0.5 + 0.5 * lv) * (0.6 + 0.4 * r()), rate: 0.92 + 0.16 * r(), pan: (r() - 0.5) * 1.4, out: ambBus, send: 0.22 });
    };

    // ---- the tick: schedules music bars and ambience events up to `until`
    E.tick = (until, clk) => {
      clockT = clk != null ? clk : until; const c = clock(), floor = offline ? 0 : c;
      if (M.dinAt != null && c >= M.dinAt) { M.dinAt = null; M.din = M.dinBack || 0; E.setAmbience(null, { t: floor }); }
      if (!offline && M.scene && M.next < c - 0.15) M.next = c + 0.05; // the page was asleep: skip the bars it missed
      while (M.scene && M.next < until) {
        if (M.revertAt != null && M.next >= M.revertAt) { const to = M.revertTo || 'calm', at = M.next; M.revertAt = null; startScene(to, M.sid, at); E.setAmbience(null, { t: at }); continue; }
        const bp = A.bar(M.scene.mood, M.scene.sid, seed, M.n, M.k), spb = bp.sec / 4, t0 = M.next, r = A.rng(A.hash(seed, 'play', M.scene.mood, M.n));
        for (const e of bp.ev) { try { playEv(M.scene, e, t0 + e.b * spb, spb, r); } catch (err) { /* a voice must never stop the music */ } }
        M.next += bp.sec; M.n++;
      }
      const br = A.rng(A.hash(seed, 'amb', Math.floor(until * 4)));
      while (SC.birds.lv > 0 && SC.birds.next < until) { const t = Math.max(SC.birds.next, floor); birdAt(t, SC.birds.lv, br); SC.birds.next = t + (0.6 + 2.8 * br()) / Math.max(0.3, SC.birds.lv); }
      while (SC.crow.lv > 0 && SC.crow.next < until) { const t = Math.max(SC.crow.next, floor); hit(B.bird('caw', Math.floor(br() * 3)), t, { g: 0.32 * SC.crow.lv, rate: 0.9 + 0.2 * br(), pan: (br() - 0.5) * 1.2, out: ambBus, send: 0.4 }); SC.crow.next = t + 9 + 20 * br(); }
      while (SC.dinfx.lv > 0 && SC.dinfx.next < until) {
        const t = Math.max(SC.dinfx.next, floor), v = SC.dinfx.lv;
        if (br() < 0.7) hit(B.clang(Math.floor(br() * 4)), t, { g: 0.22 * v * (0.5 + br()), rate: 0.8 + 0.5 * br(), pan: (br() - 0.5) * 1.6, out: ambBus, send: 0.2 }); else hit(B.thud(90 + 60 * br()), t, { g: 0.3 * v, rate: 0.9 + 0.3 * br(), out: ambBus, send: 0.15 });
        SC.dinfx.next = t + (0.35 + 1.1 * br()) / Math.max(0.3, v);
      }
      // let go of what has faded (live only: an offline render just ends)
      if (!offline) {
        for (let i = M.old.length - 1; i >= 0; i--) if (c > M.old[i].dead) { try { M.old[i].bus.disconnect(); M.old[i].rv.disconnect(); } catch (e) { /* gone */ } M.old.splice(i, 1); }
        for (const k of Object.keys(layers)) { const L = layers[k]; if (!L.on && L.stopAt != null && c > L.stopAt && L.src) { L.src.forEach((s) => { try { s.stop(); } catch (e) { /* stopped */ } }); L.src = null; L.stopAt = null; } }
      }
    };

    // ---- effects: each a function of (time, options, rng) that schedules hits on the scene bus
    const env = (u) => Math.pow(Math.sin(Math.PI * clamp(u, 0, 1)), 0.7); // a swell for a group of hits: 0 → 1 → 0
    const CUES = {
      tap(t, o, r) { hit(B.wood(620), t, { g: 0.5 * o.g, rate: 0.97 + 0.06 * r(), out: uiBus }); },
      select(t, o, r) {
        if (o.k === 'town') { hit(B.wood(560), t, { g: 0.5 * o.g, rate: 0.98 + 0.04 * r(), out: uiBus }); hit(B.wood(840), t + 0.07, { g: 0.32 * o.g, out: uiBus }); }
        else { hit(B.wood(390), t, { g: 0.6 * o.g, rate: 0.98 + 0.04 * r(), out: uiBus }); hit(B.thud(110), t, { g: 0.2 * o.g, out: uiBus }); }
      },
      confirm(t, o) {
        const f = o.k === 'begin' ? 520 : o.k === 'task' ? 620 : o.k === 'card' ? 880 : 740;
        hit(B.gong('small'), t, { g: (o.k === 'begin' ? 0.55 : 0.4) * o.g, rate: f / 520, out: uiBus, send: 0.2 }); hit(B.wood(900), t, { g: 0.22 * o.g, out: uiBus });
      },
      cancel(t, o, r) { hit(B.wood(300), t, { g: 0.45 * o.g, rate: 0.95 + 0.04 * r(), out: uiBus }); },
      skip(t, o) { hit(atom('sk', () => Y.sweep(sr, { dur: 0.18, f0: 3600, f1: 800, q: 1.2, seed: 5 })), t, { g: 0.3 * o.g, out: uiBus }); },
      drum(t, o) { hit(B.taiko('big'), t, { g: 0.8 * o.g, send: 0.2 }); },
      endSeason(t, o, r) { // a drum roll that gathers pace and weight, then a boom and a gong
        let x = 0, gap = 0.17; const big = B.taiko('big'), small = B.taiko('small'), ka = B.ka();
        for (let i = 0; x < 1.4; i++) { const u = x / 1.4; hit(i % 3 === 2 ? ka : i % 2 ? small : big, t + x, { g: (0.2 + 0.6 * u) * o.g, rate: 1 + 0.06 * (r() - 0.5), send: 0.12 }); x += gap; gap = Math.max(0.065, gap * 0.9); }
        hit(big, t + 1.5, { g: o.g, send: 0.25 }); hit(B.gong('big'), t + 1.5, { g: 0.55 * o.g, send: 0.3, glide: 0.985, glideT: 0.35 }); duckMusic(t + 1.4, 4, 1.2);
      },
      march(t, o, r) { // ranks of boots and a jingle of mail: n walkers, two steps a second, swelling and fading
        const dur = o.dur || 3.2, n = Math.max(1, Math.min(o.n || 4, lite ? 2 : 6)), jit = 0.025;
        for (let w = 0; w < n; w++) {
          const ph = r() * 0.5, pan = (r() - 0.5) * 1.2;
          for (let x = ph; x < dur; x += 0.5 + (r() - 0.5) * 0.04) hit(B.foot(Math.floor(r() * 4)), t + x + (r() - 0.5) * jit, { g: (0.7 + 0.45 * r()) * env(x / dur) * o.g / Math.sqrt(n / 2 + 0.5), rate: 0.92 + 0.16 * r(), pan });
        }
        for (let x = 0.4 + r() * 0.6; x < dur; x += 1.1 + r() * 0.9) hit(B.clang(Math.floor(r() * 4)), t + x, { g: 0.1 * env(x / dur) * o.g, rate: 1.6 + 0.6 * r(), pan: (r() - 0.5) * 1.4, send: 0.1 });
      },
      oars(t, o, r) { // strokes of the oars: a knock in the rowlock, a wash of water
        const dur = o.dur || 3, n = lite ? 2 : 3;
        for (let w = 0; w < n; w++) for (let x = r() * 0.8; x < dur; x += 0.95 + (r() - 0.5) * 0.06) { const a = env(x / dur) * o.g; hit(B.wood(210), t + x, { g: 0.7 * a, rate: 0.95 + 0.1 * r(), pan: (w - 1) * 0.5 }); hit(B.whoosh(Math.floor(r() * 3)), t + x + 0.1, { g: 0.5 * a, rate: 0.55 + 0.1 * r(), pan: (w - 1) * 0.5 }); }
      },
      horse(t, o, r) { // gallop: three hoof-falls and a rest, several horses out of step
        const dur = o.dur || 2.2, n = lite ? 2 : 4;
        for (let h = 0; h < n; h++) {
          const ph = r() * 0.5, pan = (r() - 0.5) * 1.2;
          for (let x = ph; x < dur; x += 0.5 + (r() - 0.5) * 0.03) [0, 0.09, 0.19].forEach((d, j) => hit(B.hoof(Math.floor(r() * 4)), t + x + d, { g: (0.4 + 0.2 * j) * env((x + d) / dur) * o.g, rate: 0.9 + 0.2 * r(), pan }));
        }
      },
      charge(t, o, r) { // the cavalry comes on: a heavier gallop, a roll of drums, a far roar
        CUES.horse(t, { g: 1.15 * o.g, dur: 2.6 }, r);
        for (let x = 0, i = 0; x < 2.4; i++, x += 0.22 - 0.07 * (x / 2.4)) hit(B.taiko(i % 2 ? 'small' : 'big'), t + x, { g: (0.2 + 0.4 * (x / 2.4)) * o.g, out: scene, send: 0.1 });
        hit(B.cheer(), t + 0.4, { g: 0.32 * o.g, send: 0.2 }); duckMusic(t, 3.5, 2.8);
      },
      horn(t, o) { // two calls of a long horn, the second a fifth up, over a drum
        const g = o.g; hit(B.horn(45, 1.8), t, { g: 0.85 * g, send: 0.3 }); hit(B.horn(52, 1.4), t + 1.95, { g: 0.85 * g, send: 0.3 }); hit(B.taiko('big'), t, { g: 0.7 * g, send: 0.2 }); duckMusic(t, 5, 3.2);
      },
      volley(t, o, r) { // arrows leave the bows with a twang, whistle over, and land
        const n = Math.round(clamp((o.n || 2) * 4 + 4, 4, lite ? 8 : 14));
        for (let i = 0; i < n; i++) { const s = r() * 0.4, pan = (r() - 0.5) * 1.6; hit(B.thud(210), t + s, { g: 0.14, rate: 1.1 + 0.3 * r(), pan }); hit(B.whoosh(Math.floor(r() * 3)), t + s + 0.02, { g: 0.45 * (0.6 + 0.4 * r()) * o.g, rate: 0.85 + 0.3 * r(), pan }); }
        for (let i = 0; i < n * 0.8; i++) hit(B.thud(150 + 60 * r()), t + 0.62 + 0.4 * r(), { g: 0.3 * o.g, rate: 1.4 + 0.7 * r(), pan: (r() - 0.5) * 1.6, send: 0.1 });
        duckMusic(t, 3, 1.4);
      },
      clash(t, o, r) { // steel on steel and shields, a press of men behind it
        const n = Math.round(clamp(o.n || 6, 2, lite ? 6 : 12)), dur = o.dur || 1.1;
        hit(B.crowd(), t, { g: 0.55 * o.g, dur: dur + 1, fadeIn: 0.25, fadeOut: 0.8, offset: r() * 2 }); duckMusic(t, 3, dur + 0.4);
        for (let i = 0; i < n; i++) { const x = (i / n) * dur * (0.8 + 0.4 * r()), pan = (r() - 0.5) * 1.6; if (r() < 0.62) hit(B.clang(Math.floor(r() * 4)), t + x, { g: (0.4 + 0.4 * r()) * o.g, rate: 0.85 + 0.35 * r(), pan, send: 0.15 }); else hit(B.thud(85 + 40 * r()), t + x, { g: (0.5 + 0.3 * r()) * o.g, rate: 0.9 + 0.3 * r(), pan }); }
      },
      fire(t, o) { // a whoomph as it takes hold, then the crackle and roar, dying away
        const dur = o.dur || 2.8;
        hit(atom('fs', () => Y.sweep(sr, { dur: 0.5, f0: 200, f1: 1400, q: 0.8, shape: 'rise', mode: 'lp', noise: 'pink', seed: 6 })), t, { g: 0.6 * o.g, send: 0.1 });
        hit(B.fire(), t + 0.1, { g: 0.9 * o.g, dur, fadeIn: 0.4, fadeOut: 1, send: 0.12, loop: true }); duckMusic(t, 2, dur - 0.4);
      },
      breach(t, o, r) { // the boom of the ram or the wall going, a crash of masonry, stones settling
        const g = o.g; hit(atom('bo', () => Y.taiko(sr, { f: 44, dur: 1.6, seed: 4 })), t, { g: 1 * g, send: 0.25 }); hit(B.thud(55), t, { g: 0.7 * g });
        hit(atom('bc', () => Y.sweep(sr, { dur: 1.9, f0: 2200, f1: 260, q: 0.9, shape: 'decay', k: 3.2, seed: 8 })), t + 0.03, { g: 0.75 * g, send: 0.2 });
        hit(atom('br', () => Y.sweep(sr, { dur: 2.8, f0: 300, f1: 80, q: 0.7, shape: 'decay', k: 2, mode: 'lp', noise: 'brown', seed: 9 })), t, { g: 0.7 * g });
        for (let i = 0, n = lite ? 8 : 16; i < n; i++) { const u = i / n; hit(B.rubble(i % 4), t + 0.25 + Math.pow(u, 1.4) * 2.3 + 0.06 * r(), { g: 0.4 * (1 - 0.7 * u) * g, rate: 0.8 + 0.5 * r(), pan: (r() - 0.5) * 1.4 }); }
        duckMusic(t, 5, 2.4);
      },
      rout(t, o, r) { // a low gong for the broken line, boots running every which way, the roar falling away
        const g = o.g; duckMusic(t, 3, 2.5); hit(B.gong('low'), t, { g: 0.6 * g, send: 0.3, glide: 0.985, glideT: 0.35 }); hit(B.crowd(), t + 0.1, { g: 0.45 * g, dur: 2.6, fadeIn: 0.3, fadeOut: 1.5, offset: r() * 2, rate: 0.85 });
        for (let i = 0, n = lite ? 8 : 16; i < n; i++) hit(B.foot(Math.floor(r() * 4)), t + 0.2 + r() * 2.2, { g: (0.25 + 0.15 * r()) * g, rate: 1.05 + 0.3 * r(), pan: (r() - 0.5) * 1.8 });
      },
      flag(t, o, r) { hit(B.snap(), t, { g: 1.2 * o.g, rate: 0.95 + 0.1 * r(), send: 0.12 }); if (o.n > 1) hit(B.snap(), t + 0.55, { g: 0.6 * o.g, rate: 1.05, pan: 0.3 }); },
      camp(t, o, r) { // mallets on tent-pegs, a canvas flap, a small fire
        const dur = o.dur || 3;
        for (let i = 0, n = 5; i < n; i++) { const x = 0.15 + (i / n) * (dur - 0.6) + 0.15 * r(); hit(B.wood(230 + 70 * r()), t + x, { g: 0.55 * o.g, rate: 0.95 + 0.1 * r(), pan: (r() - 0.5) * 1.2, send: 0.1 }); hit(B.thud(150), t + x, { g: 0.22 * o.g }); }
        hit(B.snap(), t + 0.9, { g: 0.3 * o.g, rate: 0.8 }); hit(B.snap(), t + 2.1, { g: 0.24 * o.g, rate: 0.75, pan: -0.4 });
        hit(B.fire(), t, { g: 0.2 * o.g, dur: dur + 0.5, fadeIn: 0.5, fadeOut: 1, loop: true });
      },
      cheer(t, o) { hit(B.cheer(), t, { g: 0.9 * o.g, send: 0.2 }); duckMusic(t, 3, 2.5); },
      gong(t, o) { const k = o.k === 'small' ? 'small' : o.k === 'low' ? 'low' : 'big'; hit(B.gong(k), t, { g: (k === 'small' ? 0.55 : 0.65) * o.g, send: 0.3, glide: 0.985, glideT: 0.35 }); if (k !== 'small') duckMusic(t, 3, 2); },
      chime(t, o, r) { // the turn of a season: three notes of its mode, rising in spring, falling in autumn
        const S = A.SEASONS[o.season] || A.SEASONS[M.sid] || A.SEASONS.thu, up = S.id === 'xuan' || S.id === 'ha', ds = up ? [0, 2, 4] : [4, 2, 0];
        ds.forEach((d, i) => { hit(B.pluck('zheng', A.midi(S, d + 2)), t + i * 0.2, { g: 0.8 * o.g, send: 0.3, pan: (i - 1) * 0.3 }); });
        hit(B.glass(A.midi(S, 7)), t + 0.5, { g: 0.5 * o.g, send: 0.4 });
      },
      card(t, o) { const S = A.SEASONS[M.sid] || A.SEASONS.thu; hit(B.pluck('zheng', A.midi(S, 3)), t, { g: 0.5 * o.g, send: 0.25, out: uiBus }); hit(B.pluck('zheng', A.midi(S, 5)), t + 0.14, { g: 0.45 * o.g, send: 0.25, out: uiBus }); },
      victory(t, o) { if (M.scene && M.scene.mood === 'victory' && t < M.scene.t0 + 8) return; E.setMood('victory', { t }); hit(B.cheer(), t + 0.7, { g: 0.6 * o.g, send: 0.2 }); },
      defeat(t) { if (M.scene && M.scene.mood === 'defeat' && t < M.scene.t0 + 8) return; E.setMood('defeat', { t }); },
    };
    E.cue = (name, o) => {
      const f = CUES[name]; if (!f) return false; o = o || {};
      const t = o.t != null ? o.t : now() + (o.at || 0) + (offline ? 0 : 0.015), r = A.rng(o.seed != null ? A.hash(o.seed, name) : A.hash(seed, name, ++cueN));
      f(t, Object.assign({ g: 1 }, o), r); return true;
    };
    // a skip: what plays on the scene bus is cut in 60 ms, and the bus is replaced (hits already scheduled go with it)
    E.skip = () => { const old = scene, t = now(); old.gain.cancelScheduledValues(t); old.gain.setTargetAtTime(0, t, 0.02); scene = gain(1); scene.connect(sfxBus); if (!offline) setTimeout(() => { try { old.disconnect(); } catch (e) { /* gone */ } }, 400); };
    E.cueNames = Object.keys(CUES);
    E.setMuted = (on) => { const t = now(); master.gain.cancelScheduledValues(t); master.gain.setTargetAtTime(on ? 0 : 1, t, on ? 0.02 : 0.08); };
    return E;
  };

  // ---------------------------------------------------------------- offline rendering (the audition board, the measurements)
  // A.render({ seconds, sr, lite, seed, script(E) }) → { sr, ch: [L, R] }. The script schedules with E.cue(name, { t }),
  // E.setMood(name, { t }), E.setSeason(id, { t }), E.tick(until): every time is on the render's own clock, from 0.
  A.render = async (spec) => {
    const OC = root.OfflineAudioContext || root.webkitOfflineAudioContext;
    if (!OC) throw new Error('HuaiNanAudio.render: no OfflineAudioContext');
    const sr = spec.sr || 44100, sec = spec.seconds || 5, ctx = new OC(2, Math.ceil(sec * sr), sr), E = A.create(ctx, { lite: !!spec.lite, seed: spec.seed || 1, offline: true, voices: spec.voices, dry: !!spec.dry });
    if (spec.script) spec.script(E, ctx);
    E.tick(sec);
    const buf = await ctx.startRendering();
    return { sr, ch: [buf.getChannelData(0), buf.getChannelData(1)] };
  };

  // ---------------------------------------------------------------- the live sound
  // One engine on the page's AudioContext, started by the first user gesture. What is wanted (mood, season, din) is remembered
  // from the start, so the sound comes up in the right key when the context does.
  const L = { ctx: null, E: null, muted: false, off: false, lite: false, want: { mood: 'calm', k: 0.5, sid: 'thu', din: 0 }, scripted: {}, locked: false, timer: null, warm: null, listeners: [], last: 0 };
  try { L.muted = root.localStorage.getItem('tq.mute') === '1'; } catch (e) { /* storage blocked: sound on */ }
  const search = () => (typeof location !== 'undefined' && location.search) || '';
  L.off = /[?&](fast|audio=off)(&|=|$)/.test(search()) && !/[?&]audio=on/.test(search()); // the e2e (&fast=1) runs silent
  const peek = () => { try { return root.__v2 && root.__v2.view ? root.__v2.view() : null; } catch (e) { return null; } };
  // the light path for phones and the low tier (?audio=lite|full forces it)
  const isLite = () => {
    const q = /[?&]audio=(lite|full)/.exec(search()); if (q) return q[1] === 'lite';
    try { const v = root.__v2; if (v && v.env && v.env.quality) return v.env.quality.tier === 'low'; } catch (e) { /* no page yet */ }
    try { return !!(root.matchMedia && root.matchMedia('(pointer: coarse)').matches); } catch (e) { return false; }
  };
  A.isLite = isLite;
  if (typeof document !== 'undefined' && !L.off && !L.muted) setTimeout(() => A.prewarm({ lite: isLite() }), 2500); // while the page loads and the goal is read
  const notify = () => { for (const f of L.listeners) { try { f(L.muted); } catch (e) { /* a listener's error is its own */ } } };
  const LOOK = 2.4;
  const pump = () => { if (!L.warm || !L.warm.length) return; const f = L.warm.shift(); try { f(); } catch (e) { /* a buffer that fails is made when needed */ } setTimeout(pump, 12); };

  // start (or resume) the context; call it inside a user gesture
  A.start = () => {
    if (L.off || L.muted) return false;
    if (!L.ctx) {
      const AC = root.AudioContext || root.webkitAudioContext; if (!AC) { L.off = true; return false; }
      L.lite = isLite();
      const hint = L.lite ? 'playback' : 'interactive';
      try { L.ctx = new AC({ latencyHint: hint, sampleRate: 44100 }); } catch (e) { try { L.ctx = new AC({ latencyHint: hint }); } catch (e2) { try { L.ctx = new AC(); } catch (e3) { L.off = true; return false; } } }
      const seed = (root.__v2 && root.__v2.seed) || (Date.now() % 100000) + 1;
      L.E = A.create(L.ctx, { lite: L.lite, seed });
      const v = peek(), S = v && A.parseSeason(v.calendar); if (S) L.want.sid = S.id; // what the game showed before the sound came alive
      L.E.setSeason(L.want.sid); L.E.setMood(L.want.mood, { k: L.want.k }); if (L.want.din) L.E.setDin(L.want.din);
      const tick = () => { const cx = L.ctx; if (!cx || cx.state === 'closed') return; if (cx.state === 'running') { const c = cx.currentTime; L.E.tick(c + (L.lite ? LOOK + 0.8 : LOOK), c); } };
      L.timer = setInterval(tick, L.lite ? 500 : 300); tick();
      L.warm = L.E.warm(); setTimeout(pump, 200);
    }
    if (L.ctx.state !== 'running') { try { const p = L.ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* the next gesture tries again */ } }
    return true;
  };
  const unlock = () => {
    if (L.off || L.muted || (L.ctx && L.ctx.state === 'running')) return;
    if (A.start() && L.ctx) { try { const b = L.ctx.createBuffer(1, 1, 22050), s = L.ctx.createBufferSource(); s.buffer = b; s.connect(L.ctx.destination); s.start(0); } catch (e) { /* iOS wants a played buffer; nothing else does */ } }
  };
  if (root.addEventListener) ['pointerdown', 'pointerup', 'touchend', 'mousedown', 'click', 'keydown'].forEach((ev) => root.addEventListener(ev, unlock, { capture: true, passive: true }));
  if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('visibilitychange', () => { // a hidden page is silent and idle
    const cx = L.ctx; if (!cx || cx.state === 'closed') return;
    if (document.hidden) cx.suspend().catch(() => {}); else if (!L.muted) cx.resume().catch(() => {});
  });
  A.ready = () => !!(L.ctx && L.ctx.state === 'running');
  A.state = () => ({ ready: A.ready(), muted: L.muted, off: L.off, lite: L.lite, mood: L.E ? L.E.mood() : L.want.mood, season: L.E ? L.E.season() : L.want.sid, din: L.want.din, scripted: Object.assign({}, L.scripted), locked: L.locked });
  A.engine = () => L.E;
  A.context = () => L.ctx;
  A.mute = (on) => {
    on = !!on; if (on === L.muted) return L.muted;
    L.muted = on; try { root.localStorage.setItem('tq.mute', on ? '1' : '0'); } catch (e) { /* not remembered */ }
    if (on) { if (L.E) L.E.setMuted(true); const cx = L.ctx; setTimeout(() => { if (L.muted && cx && cx.state === 'running') cx.suspend().catch(() => {}); }, 300); } // silent at once, idle a moment later
    else { if (L.E) L.E.setMuted(false); A.start(); }
    notify(); return L.muted;
  };
  A.muted = () => L.muted;
  A.onMute = (fn) => { L.listeners.push(fn); };
  const live = () => !!(L.E && L.ctx && !L.muted && (L.ctx.state === 'running' || L.ctx.currentTime < 1));
  // one sound now, or `at` seconds from now
  A.cue = (name, o) => { if (!live()) return false; try { return L.E.cue(name, o); } catch (e) { if (root.console) console.warn('HuaiNanAudio cue ' + name + ':', e); return false; } };
  A.mood = (name, o) => {
    if (A.MOODS.indexOf(name) < 0) return false; o = o || {};
    if (o.hold == null) L.want.mood = name; if (o.k != null) L.want.k = clamp(o.k, 0, 1);
    if (L.E) { try { L.E.setMood(name, o); } catch (e) { if (root.console) console.warn('HuaiNanAudio mood ' + name + ':', e); } }
    return true;
  };
  A.season = (cal) => { const S = A.parseSeason(cal); if (!S) return null; L.want.sid = S.id; if (L.E) L.E.setSeason(S.id); return S; };
  A.din = (x, o) => { o = o || {}; if (o.hold == null) L.want.din = clamp(x, 0, 1); if (L.E) L.E.setDin(x, o); };
  A.skip = () => { if (L.E) L.E.skip(); };
  A.scripted = (group, on) => { L.scripted[group] = on == null ? true : !!on; };
  A.later = (sec, fn) => setTimeout(fn, Math.max(0, sec) * 1000);

  // ---------------------------------------------------------------- wiring: HuaiNanPlay's events → sound
  A.wire = (P) => {
    P = P || root.HuaiNanPlay; if (!P || !P.on) return false;
    const me = () => { const v = peek(); return v && v.me; };
    let battling = false, lastSid = null;
    const play = (cues) => { for (const c of cues) A.cue(c.cue, Object.assign({ at: c.at }, c.o)); };
    P.on('act', (d) => {
      if (!d) return;
      const name = d.name, args = d.args;
      play(A.actCues(name, args).filter((c) => !L.locked || c.cue === 'skip'));
      if (name === 'onEndSeason' && !L.scripted.playback) play(A.playbackCues(peek()));
      if (name === 'onBattleDone' || name === 'onAgain') { battling = false; A.mood('calm'); A.din(0); }
      if (name === 'onGoalDone') { const v = peek(); if (v) A.season(v.calendar); A.mood('calm'); }
    });
    P.on('season', (d) => {
      const v = d && d.view, S = v && A.season(v.calendar); if (!S) return;
      if (lastSid && lastSid !== S.id) A.cue('chime', { at: 0.2, season: S.id }); lastSid = S.id;
      if (!battling) A.mood('calm');
    });
    P.on('battle', () => { battling = true; A.mood('tension', { k: 0.5 }); A.din(0.3); if (!L.scripted.battle) A.cue('horn', { at: 0.5 }); });
    P.on('turn', (d) => {
      const cues = A.turnCues(d && d.after), sec = L.scripted.battle ? 6 : A.turnSec(cues); L.last = sec;
      if (!L.scripted.battle) play(cues);
      A.mood('battle', { hold: sec + 1.2, k: 0.65 }); A.din(0.7, { hold: sec + 1.2 });
    });
    P.on('result', (d) => {
      const m = A.resultMood(d && d.lb);
      A.later(L.scripted.battle ? 0.3 : L.last || 2.4, () => { A.mood(m); A.din(0); if (m === 'victory') A.cue('cheer', { at: 0.9, g: 0.7 }); });
    });
    P.on('beat', (t) => { if (!L.scripted.beat) play(A.beatCues(t, me())); });
    P.on('report', () => { A.cue('card'); });
    P.on('over', (o) => { battling = false; const win = !!(o && o.win); A.mood(win ? 'victory' : 'defeat'); A.din(0); if (win) A.cue('cheer', { at: 1, g: 0.8 }); });
    P.on('lock', (on) => { L.locked = !!on; });
    P.on('skip', () => { A.skip(); });
    P.on('mute', (on) => { A.mute(!!on); });
    return true;
  };
  if (root.HuaiNanPlay && root.HuaiNanPlay.on) A.wire(root.HuaiNanPlay);

  if (typeof module === 'object' && module.exports) module.exports = A;
  else root.HuaiNanAudio = A;
})(typeof window !== 'undefined' ? window : globalThis);
