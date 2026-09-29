// Sound QA (src/world/huainan-audio.js, docs/design/prototypes/audio.html): nobody can listen in CI, so the sound is checked by
// analysis. The audition board renders every cue, a minute of each mood and season, the ambience and a play session with an
// OfflineAudioContext; this script reads the levels back and holds them to the mix targets (no clipping, no DC, music quiet under
// play, effects and taps in their ranges). It also runs the live path once: the context starts on a real click, the mood and the
// cues sound through the master, mute goes silent and idles the context. Output: test-results/polish-audio/.
// Needs `npm start` (or PORT=… node server/server.js) running. Local:
//   PUPPETEER_EXECUTABLE_PATH=/path/to/chromium BASE_URL=http://127.0.0.1:3108/ tools/browser-slot.sh node tests/e2e/audio-measure.mjs [quick|full] [lite]
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../load.mjs';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000/';
const OUT = path.join(ROOT, 'test-results', 'polish-audio');
fs.mkdirSync(OUT, { recursive: true });
const args = process.argv.slice(2), quick = args.includes('quick'), lite = args.includes('lite'), voices = args.includes('voices'), tag = (quick ? 'quick' : 'full') + (lite ? '-lite' : '') + (voices ? '-voices' : '');
const report = { tag, checks: [], errors: [] };
const check = (ok, what, detail) => { report.checks.push({ ok: !!ok, what, detail }); console.log((ok ? 'ok   ' : 'FAIL ') + what + (detail !== undefined ? ' ' + JSON.stringify(detail) : '')); };

// the mix targets, dBFS at the master (after the compressor, the limiter and the soft clip). "RMS active" ignores stretches below -60.
const T = {
  peakMax: -1.0, dcMax: 0.002,
  moods: { calm: [-34, -24], tension: [-31, -21], battle: [-27, -17], victory: [-30, -18], defeat: [-34, -22] }, // rmsActive
  ambience: [-46, -28],
  ui: { tap: [-26, -10], select: [-26, -10], confirm: [-24, -8], cancel: [-28, -12], skip: [-34, -14], card: [-30, -12] }, // peak
  sfxPeak: [-18, -1],
};

const browser = await puppeteer.launch({ headless: true, protocolTimeout: 1800000, args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 900 });
  page.on('pageerror', (e) => { report.errors.push(e.message); console.error('PAGE_ERROR', e.stack || e.message); });
  page.on('console', (m) => { if (m.type() === 'error') { report.errors.push(m.text()); console.error('CONSOLE_ERROR', m.text()); } });
  await page.goto(BASE_URL + 'docs/design/prototypes/audio.html' + (lite ? '?audio=lite' : ''), { waitUntil: 'load' });
  check(await page.evaluate(() => typeof HuaiNanAudio === 'object' && !!HuaiNanAudio.create), 'HuaiNanAudio loads as a classic script');
  check(await page.evaluate(() => HuaiNanAudio.context() === null && !HuaiNanAudio.ready()), 'no AudioContext before a gesture');

  // ---- the live path: a real click starts the context; mood, cues and ambience come through the master; mute is silent and idle
  if (!quick) {
    await page.click('#start');
    await page.waitForFunction(() => HuaiNanAudio.ready(), { timeout: 15000 });
    const live = await page.evaluate(async () => {
      const A = HuaiNanAudio, E = A.engine(), an = E.ctx.createAnalyser(); an.fftSize = 2048; E.master.connect(an);
      const buf = new Float32Array(an.fftSize), sample = () => { an.getFloatTimeDomainData(buf); let pk = 0, sq = 0; for (const v of buf) { pk = Math.max(pk, Math.abs(v)); sq += v * v; } return { pk, rms: Math.sqrt(sq / buf.length) }; };
      const wait = (ms) => new Promise((r) => setTimeout(r, ms)), out = { samples: [] };
      out.state = A.state(); const t0 = E.ctx.currentTime; A.mood('calm'); A.season('Thu 219'); await wait(1500);
      A.cue('confirm'); A.cue('horn', { at: 0.5 });
      for (let i = 0; i < 30; i++) { await wait(100); out.samples.push(sample()); }
      out.advanced = E.ctx.currentTime - t0; out.peak = Math.max(...out.samples.map((s) => s.pk)); out.rmsMax = Math.max(...out.samples.map((s) => s.rms));
      A.mute(true); await wait(700); out.mutedRms = sample().rms; out.mutedState = E.ctx.state; out.mutedFlag = A.muted(); out.stored = localStorage.getItem('tq.mute');
      A.mute(false); await wait(900); out.backState = E.ctx.state; A.cue('tap'); await wait(600);
      out.after = Math.max(...Array.from({ length: 8 }, () => sample().pk));
      return out;
    });
    check(live.advanced > 2, 'the live context runs and keeps time', { advanced: +live.advanced.toFixed(2) });
    check(live.rmsMax > 0.0005, 'the live mix is audible (mood + cues)', { rmsMax: +live.rmsMax.toFixed(4), peak: +live.peak.toFixed(3) });
    check(live.peak < 0.95, 'the live peak stays under the ceiling', { peak: +live.peak.toFixed(3) });
    check(live.mutedFlag && live.mutedRms < 1e-4 && live.stored === '1', 'mute is silent and remembered', { rms: live.mutedRms, stored: live.stored });
    check(live.mutedState === 'suspended', 'mute idles the context', { state: live.mutedState });
    check(live.backState === 'running', 'unmute resumes it', { state: live.backState });
    check(live.after > 0.0005, 'sound comes back after unmute', { peak: +live.after.toFixed(4) });
    // the wiring on the board: the game's events, one by one, must throw nothing and change the mood the way the map says
    const wired = await page.evaluate(async () => {
      const A = HuaiNanAudio, P = HuaiNanPlay, wait = (ms) => new Promise((r) => setTimeout(r, ms)), log = [];
      A.mute(false); await wait(300);
      P.emit('season', { view: { calendar: 'Thu 219' } }); log.push(A.state().mood);
      P.emit('battle', { bt: {} }); log.push(A.state().mood);
      P.emit('turn', { before: null, after: { b: { log: [{ ev: [{ kind: 'volley' }, { kind: 'melee', charge: false }] }] } }, over: false }); log.push(A.state().mood);
      P.emit('result', { lb: { outcome: { win: 'A' }, me: 'A' } }); await wait(3800); log.push(A.state().mood);
      P.emit('act', { name: 'onBattleDone', args: [] }); log.push(A.state().mood);
      P.emit('over', { win: false }); log.push(A.state().mood);
      return log;
    });
    check(JSON.stringify(wired) === JSON.stringify(['calm', 'tension', 'battle', 'victory', 'calm', 'defeat']), 'events move the mood: season, battle, turn, result, done, over', wired);
    await page.evaluate(() => { HuaiNanAudio.mute(true); });
  }

  // ---- the offline measurements
  const t0 = Date.now();
  const rows = await page.evaluate((q, l, v) => window.__audio.measureAll({ quick: q, lite: l, voices: v }), quick, lite, voices);
  report.renderS = (Date.now() - t0) / 1000; report.rows = rows;
  const f = (v, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : '-inf');
  const lines = ['name'.padEnd(20) + ['peak', 'rms', 'rmsAct', 'short', 'dc', 'clip', 'sil', 'centroid', 'ms'].map((h) => h.padStart(9)).join('')];
  for (const r of rows) lines.push(r.name.padEnd(20) + [f(r.peakDb), f(r.rmsDb), f(r.rmsActiveDb), f(r.shortMaxDb), r.dcMax.toExponential(0), r.clip, f(r.silent, 2), Math.round(r.centroid), r.ms].map((v) => String(v).padStart(9)).join(''));
  fs.writeFileSync(path.join(OUT, `measure-${tag}.txt`), lines.join('\n') + '\n');
  fs.writeFileSync(path.join(OUT, `measure-${tag}.json`), JSON.stringify(report, null, 1));
  console.log(lines.join('\n'));

  const inR = (v, [a, b]) => v >= a && v <= b;
  for (const r of rows) {
    check(Number.isFinite(r.peakDb) && r.peakDb > -90, 'audible: ' + r.name, { peak: +f(r.peakDb) });
    check(r.peakDb <= T.peakMax && r.clip === 0, 'no clipping: ' + r.name, { peak: +f(r.peakDb), clip: r.clip });
    check(r.dcMax <= T.dcMax, 'no DC: ' + r.name, { dc: r.dcMax });
    if (r.kind === 'mood') { const rg = T.moods[r.mood]; check(inR(r.rmsActiveDb, rg), 'level ' + r.name + ' ' + rg.join('..'), { rmsActive: +f(r.rmsActiveDb) }); }
    else if (r.kind === 'ambience') check(inR(r.rmsActiveDb, T.ambience), 'level ' + r.name + ' ' + T.ambience.join('..'), { rmsActive: +f(r.rmsActiveDb) });
    else if (r.kind === 'cue') { const key = r.name.split(':')[0], rg = T.ui[key] || (r.name === 'victory' || r.name === 'defeat' ? [-40, -1] : T.sfxPeak); check(inR(r.peakDb, rg), 'peak ' + r.name + ' ' + rg.join('..'), { peak: +f(r.peakDb) }); }
  }
  if (!quick) {
    // the pitch material of the calm music must be the season's five notes (plus what the drone's harmonics add)
    const IN = { xuan: [7, 9, 11, 2, 4], ha: [2, 4, 7, 9, 11], thu: [9, 0, 2, 4, 7], dong: [4, 7, 9, 0, 2] };
    for (const r of rows.filter((x) => x.mood === 'calm' && x.chroma)) { const share = IN[r.season].reduce((s, pc) => s + r.chroma[pc], 0); check(share > 0.85, 'calm ' + r.season + ': the notes stay in the mode', { share: +share.toFixed(3) }); }
    const s = rows.find((x) => x.name === 'session'); check(s && s.peakDb <= T.peakMax && s.clip === 0, 'a whole play session sums under the ceiling', s && { peak: +f(s.peakDb), rmsActive: +f(s.rmsActiveDb) });
  }
  await page.screenshot({ path: path.join(OUT, `board-${tag}.png`), fullPage: false });
  check(report.errors.length === 0, 'no page or console errors', report.errors.slice(0, 3));
} finally {
  await browser.close();
}
fs.writeFileSync(path.join(OUT, `measure-${tag}.json`), JSON.stringify(report, null, 1));
const fails = report.checks.filter((c) => !c.ok);
console.log(`\n${report.checks.length - fails.length}/${report.checks.length} checks passed (${tag})`);
process.exit(fails.length ? 1 : 0);
