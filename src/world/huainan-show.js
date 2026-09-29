// What plays by itself on the v2 page (docs/design/v2-polish.md, job 10): the loading screen's progress and its dissolve; the
// intro (hook 'intro'): a camera flight over Hoài Nam, down the Huai to the five towns, with short beats of Chu Nguyên Chương
// waking in 219, once per browser; the ending (hook 'ending'): a victory lap round the towns under the 明 banners with the
// game's chronicle, or the fall at dusk; the watch mode ('watch' event, &watch=1): the game plays itself on the generals'
// advice (V2.advise), season after season, while a director moves the camera. Presentation only: it reads the View and the
// page's events, and plays only through the page's own handlers (env.H), as a player's taps would.
//   &intro=1 plays the intro again (&intro=0 never) · &watch=1 watches from the start · &pace=0.5 halves the watch pauses
//   HuaiNanShow.state() → { phase, watching, seasons, steps, stuck, intro, load } · HuaiNanShow.chronicle() → [{ season, text, tone }]
// Loads after huainan-play.js (v2.html, "v2 polish") and registers its hooks then. Uses what the other jobs add when it is
// there: sc.fly / sc.orbit (job 5), ui.caption / ui.watch (job 7), V2.advise (job 9), HuaiNanAudio.cue (job 8); without them
// it falls back to the scene's flyTo, its own captions and watch bar, and a plain advisor on the general's forecast.
(function () {
  'use strict';
  const Play = window.HuaiNanPlay;
  const Show = (window.HuaiNanShow = {});
  if (!Play) return;

  const now = () => performance.now();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (n) => String(Math.round(Math.abs(n || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* private mode: the intro plays again next time */ } },
  };
  const INTRO_KEY = 'tq.v2.intro';
  const cue = (name, o) => { try { const A = window.HuaiNanAudio; if (A && A.cue) A.cue(name, o || {}); } catch (e) { /* sound is optional */ } };
  const until = (ok, every = 150) => new Promise((res) => { const t = () => (ok() ? res() : setTimeout(t, every)); t(); });
  let E = null; // the page's env, from the boot hook
  let forced = false; // Show.play: a scene asked for by name plays even under &fast=1

  // ---------------------------------------------------------------- time a tap can cut short
  // One per sequence (the intro, the ending, each pause of the watch mode): wait(ms) resolves at once after cut().
  const Cut = () => {
    let done = false; const pend = new Set();
    const c = {
      get done() { return done; },
      cut() { done = true; for (const f of pend) f(); pend.clear(); },
      wait(ms) {
        if (done) return Promise.resolve();
        return new Promise((res) => { const f = () => { clearTimeout(t); pend.delete(f); res(); }; const t = setTimeout(f, Math.max(0, ms)); pend.add(f); });
      },
      race(p, ms) { return Promise.race([Promise.resolve(p).catch(() => {}), c.wait(ms)]); },
    };
    return c;
  };
  let playing = null; // the intro's or the ending's cut: a skip ends it
  const skip = () => { if (E && E.H && E.H.onSkip) E.H.onSkip(); else Play.emit('skip'); };

  // ---------------------------------------------------------------- style (the stage, the watch bar, the captions, the tints)
  const CSS = `
.hs{--ser:"Noto Serif","Noto Serif TC","Liberation Serif",Georgia,serif;--cjk:"Noto Serif TC","Noto Serif CJK TC","Noto Serif CJK SC","WenQuanYi Zen Hei",serif;
  --sans:"Be Vietnam Pro","Noto Sans","Liberation Sans",system-ui,sans-serif;--go:#e2bf6c;--bar:clamp(26px,10.5vh,96px);
  color:#f3ead6;font-family:var(--ser);-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.hs-stage{position:fixed;inset:0;z-index:40;overflow:hidden;pointer-events:auto;cursor:pointer;transition:opacity .7s ease}
.hs-stage.gone{opacity:0;pointer-events:none}
.hs-shade{position:absolute;inset:0;background:radial-gradient(95% 80% at 50% 50%,rgba(8,6,4,0) 45%,rgba(8,6,4,.5));opacity:0;transition:opacity 1.4s}
.hs-stage.on .hs-shade{opacity:1}
.hs-dim{position:absolute;inset:0;background:radial-gradient(80% 75% at 50% 50%,rgba(8,6,4,.5),rgba(8,6,4,.28));opacity:0;transition:opacity 1.1s ease}
.hs-dim.on{opacity:1}
.hs-bar{position:absolute;left:0;right:0;height:var(--bar);background:#060505;transition:transform 1.1s cubic-bezier(.2,.7,.2,1)}
.hs-bar.t{top:0;transform:translateY(-101%)}.hs-bar.b{bottom:0;transform:translateY(101%)}
.hs-stage.on .hs-bar{transform:none}
.hs-skip{position:absolute;right:clamp(14px,3vw,44px);top:50%;transform:translateY(-50%);font:400 clamp(10px,calc(1.2vmin + 6px),15px)/1 var(--ser);letter-spacing:.16em;color:rgba(233,224,204,.46)}
.hs-place{position:absolute;left:clamp(14px,3vw,44px);top:50%;transform:translateY(-50%);font:400 clamp(10px,calc(1.2vmin + 6px),15px)/1 var(--ser);letter-spacing:.3em;text-transform:uppercase;color:rgba(226,191,108,.62)}
.hs-kick{font-size:.76em;letter-spacing:.3em;text-transform:uppercase;color:var(--go)}
.hs-big{font-weight:700;font-size:2.55em;line-height:1.1;letter-spacing:.035em}
.hs-sub{font-style:italic;font-size:1.08em;line-height:1.35;color:#eadfca}
.hs-mid{position:absolute;left:50%;top:50%;width:min(90vw,980px);display:flex;flex-direction:column;align-items:center;gap:.32em;text-align:center;
  font-size:clamp(13px,calc(2.4vmin + 4px),26px);text-shadow:0 2px 22px rgba(0,0,0,.7),0 0 3px rgba(0,0,0,.55);opacity:0;transform:translate(-50%,-44%);transition:opacity .9s ease,transform 1.3s cubic-bezier(.2,.7,.2,1)}
.hs-mid::before{content:"";position:absolute;left:50%;top:50%;width:130%;height:230%;transform:translate(-50%,-50%);z-index:-1;background:radial-gradient(50% 50% at 50% 50%,rgba(6,5,4,.5),rgba(6,5,4,0) 72%)}
.hs-mid.on{opacity:1;transform:translate(-50%,-50%)}
.hs-mid .hs-kick{color:#efd79c}
.hs-low{position:absolute;left:0;right:0;bottom:calc(var(--bar) + clamp(10px,3.4vh,40px));display:flex;flex-direction:column;align-items:center;gap:.28em;padding:0 7vw;text-align:center;
  font-size:clamp(12px,calc(1.8vmin + 5px),23px);text-shadow:0 2px 16px rgba(0,0,0,.75),0 0 3px rgba(0,0,0,.6);opacity:0;transform:translateY(10px);transition:opacity .8s ease,transform 1s cubic-bezier(.2,.7,.2,1)}
.hs-low::before{content:"";position:absolute;left:50%;top:50%;width:min(96vw,1100px);height:260%;transform:translate(-50%,-50%);z-index:-1;background:radial-gradient(50% 50% at 50% 55%,rgba(6,5,4,.55),rgba(6,5,4,0) 70%)}
.hs-low.on{opacity:1;transform:none}
.hs-line{font-size:1.32em;line-height:1.3;max-width:30em}
.hs-seal{position:relative;display:grid;place-items:center;flex:none;width:1.5em;height:1.5em;font:700 2.1em/1 var(--cjk);color:#f6eedb;border-radius:.14em;background:#a8281f;
  box-shadow:inset 0 0 0 .07em #a8281f,inset 0 0 0 .11em rgba(246,238,219,.72),0 .12em .6em rgba(0,0,0,.45);filter:url(#hs-rough);text-shadow:none;opacity:0;transform:rotate(-4deg) scale(1.9)}
.hs-seal.x{display:none}
.hs-seal.on{animation:hsstamp .6s cubic-bezier(.3,1.35,.5,1) forwards}
.hs-seal.on::after{content:"";position:absolute;inset:-.1em;border-radius:.2em;box-shadow:0 0 0 .08em rgba(168,40,31,.55);animation:hsring .9s .12s ease-out forwards;opacity:0}
@keyframes hsstamp{0%{opacity:0;transform:rotate(-10deg) scale(2)}55%{opacity:1;transform:rotate(-3deg) scale(.93)}100%{opacity:1;transform:rotate(-4deg) scale(1)}}
@keyframes hsring{0%{opacity:.8;transform:scale(.9)}100%{opacity:0;transform:scale(1.9)}}
.hs-chron{position:absolute;left:0;top:var(--bar);bottom:var(--bar);width:min(50vw,600px);box-sizing:border-box;padding:clamp(10px,3.4vh,44px) clamp(14px,3.6vw,54px);display:flex;flex-direction:column;gap:.55em;
  font-size:clamp(11.5px,calc(1.45vmin + 6px),21px);background:linear-gradient(90deg,rgba(9,7,5,.88) 0%,rgba(9,7,5,.74) 58%,rgba(9,7,5,0) 100%);opacity:0;transform:translateX(-14px);transition:opacity 1.1s ease,transform 1.3s cubic-bezier(.2,.7,.2,1)}
.hs-chron.on{opacity:1;transform:none}
.hs-ch{display:flex;align-items:center;gap:.75em}
.hs-ch .hs-seal{font-size:1.55em}
.hs-ch div{display:flex;flex-direction:column;gap:.12em;min-width:0}
.hs-ch .hs-big{font-size:1.72em}.hs-ch .hs-sub{font-size:.98em}
.hs-chron ol{list-style:none;margin:.2em 0 0;padding:.55em 0 0;border-top:1px solid rgba(226,191,108,.28);display:flex;flex-direction:column;gap:.34em;overflow:hidden}
.hs-chron li{display:flex;gap:.8em;align-items:baseline;opacity:0;transform:translateY(7px);transition:opacity .7s ease,transform .9s cubic-bezier(.2,.7,.2,1)}
.hs-chron li.on{opacity:1;transform:none}
.hs-chron li em{flex:none;width:4.4em;font-style:normal;font-size:.84em;letter-spacing:.05em;color:var(--go)}
.hs-chron li span{line-height:1.35;color:#ece2cc}
.hs-chron li.good span{color:#c4e6bb}.hs-chron li.bad span{color:#f6b19f}
.hs-tint{position:fixed;inset:0;pointer-events:none;opacity:0;transition:opacity 3.2s ease}
.hs-tint.on{opacity:1}
.hs-tint.dusk{background:linear-gradient(180deg,rgba(58,34,92,.82) 0%,rgba(150,72,48,.6) 46%,rgba(26,13,11,.8) 100%);mix-blend-mode:multiply}
.hs-tint.glow{background:radial-gradient(75% 50% at 74% 18%,rgba(255,132,52,.34),rgba(255,132,52,0) 70%);mix-blend-mode:screen}
.hs-tint.ash{background:#6b625a;mix-blend-mode:saturation;opacity:0}.hs-tint.ash.on{opacity:.55}
.hs-tint.gold{background:radial-gradient(120% 95% at 50% 38%,rgba(255,216,140,.5),rgba(255,196,112,.22) 55%,rgba(70,36,12,.3));mix-blend-mode:soft-light}
.hs-watch{position:fixed;inset:0;z-index:35;pointer-events:none}
.hs-catch{position:absolute;inset:0;pointer-events:auto}
.hs-stop{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);height:40px;padding:0 15px 0 13px;display:flex;align-items:center;gap:9px;pointer-events:auto;cursor:pointer;border-radius:11px;
  border:1px solid rgba(243,213,143,.55);background:rgba(20,16,12,.9);box-shadow:0 6px 18px rgba(0,0,0,.35);color:#f3ead6;font:700 14px/1 var(--ser)}
.hs-stop i{width:8px;height:8px;border-radius:50%;background:#e0493a;box-shadow:0 0 0 3px rgba(224,73,58,.25);animation:hsrec 1.8s ease-in-out infinite}
.hs-stop small{font:600 10.5px/1 var(--sans);letter-spacing:.14em;text-transform:uppercase;color:#b9ab8d;padding-left:9px;border-left:1px solid rgba(226,191,108,.3)}
@keyframes hsrec{50%{opacity:.35}}
.hs-cap{position:fixed;left:50%;bottom:14px;z-index:36;max-width:min(440px,calc(100vw - 420px));min-width:220px;box-sizing:border-box;padding:7px 15px 9px;border-radius:12px;
  background:rgba(18,14,10,.84);border:1px solid rgba(226,191,108,.3);box-shadow:0 8px 24px rgba(0,0,0,.35);pointer-events:none;text-align:center;
  display:flex;flex-direction:column;gap:2px;opacity:0;transform:translate(-50%,8px);transition:opacity .45s ease,transform .6s cubic-bezier(.2,.7,.2,1)}
.hs-cap.on{opacity:1;transform:translate(-50%,0)}
.hs-cap .hs-kick{font:600 10.5px/1.3 var(--sans);letter-spacing:.16em}
.hs-cap .hs-line{font-size:15px;line-height:1.35;max-width:none}
.hs-watching .hs-cap{bottom:60px}
@media (min-width:1100px) and (min-height:600px){.hs-cap{bottom:20px;padding:9px 20px 11px}.hs-watching .hs-cap{bottom:78px}.hs-cap .hs-line{font-size:19px}.hs-cap .hs-kick{font-size:12px}.hs-stop{height:50px;font-size:16px;bottom:14px}}
@media (prefers-reduced-motion:reduce){.hs *{transition-duration:.01s!important;animation-duration:.01s!important}}`;
  let styled = false;
  const style = () => {
    if (styled) return; styled = true;
    const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s);
    // the seal's rough edge: the same stamp grain as the loading screen's
    const f = document.createElement('div'); f.setAttribute('aria-hidden', 'true'); f.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    f.innerHTML = '<svg width="0" height="0"><filter id="hs-rough"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="2.4"/></filter></svg>';
    document.body.appendChild(f);
  };
  const div = (cls, html) => { const d = document.createElement('div'); d.className = cls; if (html) d.innerHTML = html; return d; };
  // a text slot that fades out, changes, fades back in (null: out and stays out)
  const slot = (el, html) => {
    clearTimeout(el._t);
    if (html == null) { el.classList.remove('on'); return; }
    const put = () => { el.innerHTML = html; void el.offsetWidth; el.classList.add('on'); };
    if (el.classList.contains('on')) { el.classList.remove('on'); el._t = setTimeout(put, 420); } else put();
  };

  // ---------------------------------------------------------------- the loading screen (v2.html #loading)
  // Real progress from the boot's steps: the scripts have run (this file is the last), the data arrives (resource timing), the
  // runtime is built (the page's loop removes #loading: the show keeps it), the scene stands (hook 'boot'). The map is built in
  // long runs of the main thread, where no style change reaches the screen; so the bar is a stack of bars, each a compositor
  // animation that plays through those runs: the page's own slow creep from the first paint (CSS), then one more from each step
  // on (Web Animations), each starting past the ones before, so the longest (the last) is the one seen and it never goes back.
  const LD = (() => {
    const el = document.getElementById('loading'), bar = el && el.querySelector('.ld-bar'), step = el && el.querySelector('.ld-step');
    const T0 = now(), marks = {};
    if (!el || !bar) return { marks, mark() {}, dissolve() {} };
    let gone = false, data = 0;
    const push = (a, b, ms) => {
      const i = document.createElement('i'); bar.appendChild(i);
      try { i.animate([{ transform: 'scaleX(' + a + ')' }, { transform: 'scaleX(' + b + ')' }], { duration: ms, easing: 'cubic-bezier(.1,.7,.25,1)', fill: 'forwards' }); } catch (e) { i.style.transform = 'scaleX(' + b + ')'; }
    };
    // each step: its line under the bar, and its bar (from, to, ms), past the page's first creep (to 0.7 over 24 s)
    const STEP = { script: [null, 'Trải địa đồ…'], data: [null, 'Đắp núi, khơi sông…'], runtime: [[0.72, 0.93, 9000], 'Dựng năm thành…'], scene: [[0.95, 0.99, 5000], 'Kéo cờ…'], done: [[0.99, 1, 380], 'Vào Hoài Nam'] };
    const mark = (k) => {
      if (marks[k] != null || gone) return; marks[k] = Math.round(now() - T0);
      const s = STEP[k]; if (!s) return;
      if (s[0]) push(...s[0]);
      if (step) step.textContent = s[1];
    };
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (/\/data\/(world|cities)\.json|\/huainan\.json/.test(e.name) && ++data >= 3) mark('data'); }).observe({ type: 'resource', buffered: true }); } catch (e) { /* no resource timing: the other steps */ }
    // the page's loop removes #loading once the runtime is built; the show keeps it up until the scene stands and dissolves it
    el.remove = () => mark('runtime');
    mark('script');
    return {
      marks, mark,
      dissolve(ms) {
        if (gone) return; mark('done'); gone = true;
        const kill = () => Element.prototype.remove.call(el);
        if (!ms) return kill();
        el.classList.add('out'); el.style.transitionDuration = ms + 'ms'; setTimeout(kill, ms + 60);
      },
    };
  })();

  // ---------------------------------------------------------------- the stage: letterbox, titles, the seal, the chronicle
  const Stage = (() => {
    let el = null, q = null, onKey = null;
    const open = (o = {}) => {
      style();
      if (el) el.remove();
      el = div('hs hs-stage', '<div class="hs-shade"></div><div class="hs-dim"></div><div class="hs-bar t"><span class="hs-place"></span></div><div class="hs-bar b"><span class="hs-skip">Chạm để bỏ qua ›</span></div>' +
        '<div class="hs-mid"><b class="hs-seal x">明</b><span class="hs-kick"></span><span class="hs-big"></span><span class="hs-sub"></span></div>' +
        '<div class="hs-low"></div><div class="hs-chron"></div>');
      q = (s) => el.querySelector(s);
      q('.hs-place').textContent = o.place || '';
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); skip(); });
      onKey = (e) => { if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); skip(); } };
      window.addEventListener('keydown', onKey);
      document.body.appendChild(el);
      void el.offsetWidth; el.classList.add('on');
    };
    const mid = (o) => {
      if (!el) return;
      const m = q('.hs-mid');
      q('.hs-dim').classList.toggle('on', !!o); // a title in the middle reads over a quieter map
      if (!o) { m.classList.remove('on'); return; }
      const fill = () => {
        q('.hs-kick').textContent = o.kick || ''; q('.hs-big').textContent = o.big || ''; q('.hs-sub').textContent = o.sub || '';
        const s = q('.hs-mid .hs-seal'); s.classList.toggle('x', !o.seal); s.classList.remove('on');
        void m.offsetWidth; m.classList.add('on');
        if (o.seal) setTimeout(() => { s.classList.add('on'); cue('seal'); }, 380);
      };
      clearTimeout(m._t);
      if (m.classList.contains('on')) { m.classList.remove('on'); m._t = setTimeout(fill, 520); } else fill();
    };
    const low = (o) => { if (el) slot(q('.hs-low'), o ? (o.kick ? '<span class="hs-kick">' + esc(o.kick) + '</span>' : '') + '<span class="hs-line">' + esc(o.line) + '</span>' : null); };
    // the chronicle: a head (the seal, a title, a line) and the game's lines, shown one after another
    const chron = (head, lines, gap = 650) => {
      if (!el) return;
      const c = q('.hs-chron');
      c.innerHTML = '<div class="hs-ch"><b class="hs-seal">明</b><div><span class="hs-kick">' + esc(head.kick) + '</span><span class="hs-big">' + esc(head.big) + '</span><span class="hs-sub">' + esc(head.sub) + '</span></div></div><ol>' +
        lines.map((l) => '<li class="' + (l.tone || '') + '"><em>' + esc(l.season) + '</em><span>' + esc(l.text) + '</span></li>').join('') + '</ol>';
      void c.offsetWidth; c.classList.add('on');
      setTimeout(() => { const s = c.querySelector('.hs-seal'); if (s) { s.classList.add('on'); cue('seal'); } }, 450);
      [...c.querySelectorAll('li')].forEach((li, i) => setTimeout(() => li.classList.add('on'), 1300 + i * gap));
    };
    const close = (ms = 700) => new Promise((res) => {
      if (!el) return res();
      const d = el; el = null; window.removeEventListener('keydown', onKey);
      d.style.transitionDuration = ms + 'ms'; d.classList.add('gone'); setTimeout(() => { d.remove(); res(); }, ms + 40);
    });
    return { open, mid, low, chron, close, get on() { return !!el; } };
  })();
  // the page's own panels hide while a scene of the show plays (the stage takes the taps)
  const hideUI = (on) => {
    const u = E && E.ui && E.ui.el; if (!u) return;
    u.style.transition = 'opacity .6s ease'; u.style.opacity = on ? '0' : ''; u.style.pointerEvents = on ? 'none' : '';
  };
  // a colour over the map, under the page's panels: dusk for a fall, warm gold for a victory
  let tints = [];
  const tint = (kinds) => {
    untint(); style();
    const u = E && E.ui && E.ui.el;
    for (const k of kinds) { const t = div('hs-tint ' + k); if (u && u.parentNode) u.parentNode.insertBefore(t, u); else document.body.appendChild(t); tints.push(t); }
    requestAnimationFrame(() => requestAnimationFrame(() => tints.forEach((t) => t.classList.add('on'))));
  };
  const untint = () => { for (const t of tints) t.remove(); tints = []; };

  // ---------------------------------------------------------------- the camera: the scene's fly (job 5) or its flyTo
  const Cam = {
    towns() { return E.data.towns.map((t) => E.sc.place[t.id]).filter(Boolean); },
    mid() { const T = Cam.towns(); const x = T.map((p) => p.x), z = T.map((p) => p.z); return [(Math.min(...x) + Math.max(...x)) / 2, (Math.min(...z) + Math.max(...z)) / 2]; },
    xz(id) {
      const sc = E.sc, m = sc.armies && sc.armies[id];
      if (m && m.g) return [m.g.position.x, m.g.position.z];
      const p = sc.place && sc.place[id]; if (p) return [p.x, p.z];
      const a = E.view().armies.find((x) => x.id === id), q = a && sc.place[a.besieging || a.at];
      return q ? [q.x, q.z] : Cam.mid();
    },
    pose() { const c = E.sc.cam; return { t: c.t.slice(), dist: c.dist, az: c.az, el: c.el }; },
    // the azimuth nearest the camera's own, so a flight turns the short way
    near(az, from = E.sc.cam.az) { let d = (az - from) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return from + d; },
    // the whole region from (az, el), framed as the scene's own overview
    over(az = 0.3, el = 0.88) {
      const m = Cam.mid(), dist = E.sc.fitDist ? E.sc.fitDist(az, el) : 130;
      return { t: [m[0] - Math.sin(az) * dist * 0.06, m[1] - Math.cos(az) * dist * 0.06], dist, az, el };
    },
    at(id, o = {}) { const p = Cam.xz(id); return { t: p, dist: o.dist || 36, az: o.az != null ? o.az : E.sc.cam.az, el: o.el || 0.62 }; },
    jump(p) {
      const sc = E.sc;
      if (sc.flyTo) sc.flyTo(p, 1); else { Object.assign(sc.cam, { t: p.t.slice(), dist: p.dist, az: p.az, el: p.el }); if (sc.apply) sc.apply(); }
    },
    // a flight of ms (the promise resolves when it lands, or when the cut is cut)
    fly(p, ms, cut) {
      const sc = E.sc;
      if (E.fast && !forced) return Promise.resolve(); // the e2e: the camera stays where the page puts it
      if (ms <= 0) { Cam.jump(p); return Promise.resolve(); }
      let done = null;
      try { if (sc.fly) done = sc.fly(p, ms); else sc.flyTo(p, ms); } catch (e) { sc.flyTo(p, ms); }
      const t = new Promise((r) => setTimeout(r, ms));
      return cut ? cut.race(done && done.then ? Promise.race([done, t]) : t, ms + 400) : t;
    },
  };

  Cam.sweep = (p, ms, cut) => {
    const sc = E.sc;
    if (E.fast && !forced) return Promise.resolve();
    if (sc.flyTo) { sc.flyTo(p, ms); return cut ? cut.wait(ms) : new Promise((r) => setTimeout(r, ms)); }
    const a0 = sc.cam.az, half = Object.assign({}, p, { az: (a0 + p.az) / 2, dist: (sc.cam.dist + p.dist) / 2 });
    return Cam.fly(half, ms / 2, cut).then(() => (cut && cut.done ? null : Cam.fly(p, ms / 2, cut)));
  };

  // ---------------------------------------------------------------- the chronicle, from the page's events
  const SEASONS = ['Xuân', 'Hạ', 'Thu', 'Đông'];
  const seasonKey = (s) => { const m = /^(\S+)\s+(\d+)/.exec(s || ''); return m ? Number(m[2]) * 4 + Math.max(0, SEASONS.indexOf(m[1])) : 0; };
  const CH = { list: [], keys: new Set(), lost: null, n: 0 };
  const chReset = () => { CH.list = []; CH.keys = new Set(); CH.lost = null; CH.n = 0; };
  const chAdd = (season, text, o) => {
    if (o.key) { if (CH.keys.has(o.key)) return; CH.keys.add(o.key); }
    CH.list.push({ season: season || '', text, tone: o.tone || '', w: o.w || 1, ord: o.ord || 0, k: seasonKey(season), n: CH.n++ });
  };
  const townName = (id) => { const t = E && E.data.towns.find((x) => x.id === id); return t ? t.name : String(id); };
  const facShort = (fid) => ((E && E.data.factions[fid]) || {}).short || fid;
  const chTaken = (season, t) => {
    const me = E.view().me, nm = townName(t.town), key = 'tk|' + season + '|' + t.town + '|' + t.to;
    if (t.to === me) chAdd(season, t.siege ? nm + ' mở cổng về ta' : 'Hạ thành ' + nm, { tone: 'good', w: 3, ord: 2, key });
    else if (t.from === me) { chAdd(season, 'Mất ' + nm + ' vào tay ' + facShort(t.to), { tone: 'bad', w: 3, ord: 2, key }); CH.lost = t.town; }
    else chAdd(season, nm + ' về tay ' + facShort(t.to), { w: 1, ord: 2, key });
  };
  const chReport = (r) => {
    if (!r) return;
    for (const f of r.fought || []) {
      const draw = f.win === 'draw', won = f.win === f.me, lo = f.me === 'A' ? f.la : f.ld, lf = f.me === 'A' ? f.ld : f.la;
      chAdd(r.season, (draw ? 'Hòa' : won ? 'Thắng' : 'Thua') + ' ở ' + townName(f.site) + ' · ta mất ' + fmt(lo) + ', địch ' + fmt(lf), { tone: draw ? '' : won ? 'good' : 'bad', w: 2, ord: 1, key: 'ft|' + r.season + '|' + f.site + '|' + lo + '|' + lf });
    }
    for (const t of r.taken || []) chTaken(r.season, t);
  };
  // at most n lines: the towns and the battles first, the rest as room allows; in the order they happened
  const chPick = (n) => CH.list.slice().sort((a, b) => b.w - a.w || b.n - a.n).slice(0, n).sort((a, b) => a.k - b.k || a.ord - b.ord || a.n - b.n);

  // ---------------------------------------------------------------- places and people for the words
  const RIVER = { hoai: 'sông Hoài', giang: 'Trường Giang' };
  const NUM = { 2: 'Hai', 3: 'Ba', 4: 'Bốn', 5: 'Năm', 6: 'Sáu', 7: 'Bảy' };
  const compass = (a, b) => { const k = Math.round(Math.atan2(-(b[1] - a[1]), b[0] - a[0]) / (Math.PI / 4)) & 7; return ['đông', 'đông bắc', 'bắc', 'tây bắc', 'tây', 'tây nam', 'nam', 'đông nam'][k]; };
  const townData = (id) => E.data.towns.find((t) => t.id === id) || {};

  // ---------------------------------------------------------------- the intro (hook 'intro')
  // ~15 s: from high over the Huai down onto the home town, west along the river to the rival on land, south to the rival on
  // the Yangtze, and back up to the whole region, where the goal screen takes over. Each beat waits for the one before: a
  // flight lands before the next begins, a line stays up long enough to read, so a slow page stretches the intro but the words
  // stay with their pictures. A tap cuts it and the camera goes straight to the overview.
  async function intro(view) {
    const me = view.me, fac = E.data.factions || {}, lord = (fac[me] && fac[me].name) || 'Chu Nguyên Chương';
    const home = view.towns.find((t) => t.owner === me) || view.towns[0], H = Cam.xz(home.id), hd = townData(home.id);
    // the rivals: the first army of each other faction (not the local lords), west to east
    const seenF = {}, rivals = [];
    for (const a of view.armies) if (a.fid !== me && a.fid !== 'local' && !seenF[a.fid]) { seenF[a.fid] = 1; const tid = a.besieging || a.at; if (E.sc.place[tid]) rivals.push({ a, tid, xz: Cam.xz(tid) }); }
    rivals.sort((x, y) => x.xz[0] - y.xz[0]);
    const look = (tid, o) => { const P = Cam.xz(tid), az = Math.atan2(H[0] - P[0], H[1] - P[1]) + (o.turn || 0); return { t: P, dist: o.dist, az, el: o.el }; };
    const shots = [];
    const P0 = { t: [H[0] - 5, H[1] + 4], dist: 112, az: 1.25, el: 1.05 }; // high east of home, looking inland: the region's fine ground fills the frame, not the sea's haze
    let az = 0.55;
    shots.push({ p: { t: H, dist: 46, az, el: 0.58 }, ms: 4800, kick: home.name + (hd.river && RIVER[hd.river] ? ' · ' + RIVER[hd.river] : ''),
      line: lord + ' tỉnh giấc ' + (home.id === 'chung_ly' ? 'ở quê nhà' : 'ở ' + home.name) + ', sớm hơn nghìn năm.' });
    for (const r of rivals.slice(0, 2)) {
      const f = fac[r.a.fid] || {}, tn = townName(r.tid), td = townData(r.tid), dir = compass(H, r.xz), fleet = r.a.arm === 'fleet';
      const gen = r.a.gen && r.a.gen.name, p = look(r.tid, { dist: fleet ? 50 : 44, el: fleet ? 0.56 : 0.54, turn: rivals.indexOf(r) ? -0.45 : 0.4 });
      p.az = Cam.near(p.az, az); az = p.az;
      const line = fleet ? 'Phía ' + dir + ', thuyền ' + (f.short || '') + ' chờ gió trên ' + (RIVER[td.river] || 'sông') + '.'
        : gen ? 'Phía ' + dir + ', ' + gen + ' giữ ' + tn + ' cho ' + (f.name || f.short || '') + '.' : 'Phía ' + dir + ', quân ' + (f.short || '') + ' đóng ở ' + tn + '.';
      shots.push({ p, ms: 3400, kick: tn + ' · ' + (fleet && RIVER[td.river] ? RIVER[td.river] : 'cờ ' + (f.short || '')), line });
    }
    const end = Cam.over(0.3, 0.88); end.az = Cam.near(end.az, az);
    const n = view.towns.length, cal = view.calendar || 'Thu 219', year = Number((/\d+/.exec(cal) || [219])[0]);

    const cut = (playing = Cut()), t0 = now();
    Stage.open({ place: 'Hoài Nam' }); hideUI(true);
    Cam.jump(P0);
    LD.dissolve(1400);
    cue('intro');
    // the next beat: at `until` (a time), and not before the line on screen has been up for `min` ms
    let shown = 0;
    const hold = async (until, min = 0) => { await cut.wait(Math.max(until - now(), shown + min - now())); return !cut.done; };
    try {
      if (!(await hold(t0 + 350))) return;
      Stage.mid({ kick: year === 219 ? 'Kiến An năm thứ hai mươi tư' : '', big: cal.replace(/^(\S+)\s+/, (m, s) => s + ' năm ') }); shown = now();
      for (let i = 0; i < shots.length; i++) {
        const s = shots[i], f0 = now();
        Cam.fly(s.p, s.ms, cut);
        if (!i) { if (!(await hold(f0 + s.ms * 0.45, 2300))) return; Stage.mid(null); }
        if (!(await hold(f0 + s.ms * (i ? 0.3 : 0.58)))) return;
        Stage.low({ kick: s.kick, line: s.line }); shown = now();
        if (!(await hold(f0 + s.ms, 2500))) return;
      }
      const f0 = now();
      Cam.fly(end, 2600, cut);
      if (!(await hold(f0 + 700))) return;
      Stage.low(null);
      Stage.mid({ seal: true, big: (NUM[n] || n) + ' thành Hoài Nam', sub: 'chưa về một mối.' }); shown = now();
      if (!(await hold(f0 + 2600, 3000))) return;
    } finally {
      if (cut.done) Cam.fly(end, 450);
      await Stage.close(cut.done ? 350 : 800); hideUI(false);
      if (playing === cut) playing = null;
      Show._intro = cut.done ? 'skipped' : 'played';
    }
  }

  // ---------------------------------------------------------------- the ending (hook 'ending')
  // Victory: warm light, the chronicle beside, the camera once round the five towns under our flags. Defeat: dusk, the chronicle's
  // last lines, the camera rising slowly away from the town that fell. Then the page's end screen.
  async function ending(over, view) {
    const win = !!over.win, cut = (playing = Cut()), t0 = now(), seasons = view.season;
    const lines = chPick(win ? 7 : 6);
    const head = win ? { kick: view.calendar + ' · ' + seasons + ' mùa', big: 'Cờ 明 trên ' + (NUM[view.towns.length] || view.towns.length).toLowerCase() + ' thành', sub: over.why || '' }
      : { kick: view.calendar, big: 'Cờ 明 đã hạ', sub: over.why || '' };
    Stage.open({ place: 'Hoài Nam' }); hideUI(true);
    tint(win ? ['gold'] : ['ash', 'dusk', 'glow']); // the fall: the colour drains, the light goes down
    cue(win ? 'victory' : 'defeat');
    let shown = 0;
    const at = async (ms, min = 0) => { await cut.wait(Math.max(ms - (now() - t0), shown + min - now())); return !cut.done; };
    try {
      if (win) {
        // once round the region, low enough for the flags, the chronicle on the left third
        const m = Cam.mid(), el = 0.6, az0 = E.sc.cam.az, d = (E.sc.fitDist ? E.sc.fitDist(az0, el) : 120) * 0.78;
        const p0 = { t: [m[0] + 6, m[1]], dist: d, az: az0, el };
        Cam.fly(p0, 1600, cut);
        if (!(await at(900))) return;
        Stage.chron(head, lines, 700); shown = now();
        if (!(await at(1600))) return;
        Cam.sweep(Object.assign({}, p0, { az: az0 + Math.PI * 1.1, dist: d * 0.92 }), 12500, cut);
        if (!(await at(1600 + 1300 + lines.length * 700 + 4200, 1300 + lines.length * 700 + 3800))) return;
      } else {
        const fell = CH.lost || (view.towns.find((t) => t.owner !== view.me) || view.towns[0]).id, P = Cam.xz(fell);
        const az0 = E.sc.cam.az, p0 = { t: P, dist: 26, az: az0, el: 0.5 };
        Cam.fly(p0, 1500, cut);
        if (!(await at(900))) return;
        Stage.chron(head, lines, 750); shown = now();
        if (!(await at(1500))) return;
        Cam.fly({ t: [P[0] + 3, P[1] - 4], dist: 96, az: az0 + 0.55, el: 0.98 }, 9500, cut);
        if (!(await at(1500 + 1300 + lines.length * 750 + 3800, 1300 + lines.length * 750 + 3400))) return;
      }
    } finally {
      await Stage.close(cut.done ? 350 : 900); hideUI(false);
      if (playing === cut) playing = null;
    }
  }

  // ---------------------------------------------------------------- the watch mode
  // The page's step is read from its events (a battle, its turns, its result, a town changing hands, the recap, the end, a new
  // season); the driver answers each step as a player would, after a pause the viewer can read, and a tap shortens the pause.
  const W = { on: false, run: 0, phase: 'boot', since: 0, seasons: 0, steps: 0, stuck: 0, cut: null, waiters: [] };
  const setPhase = (p) => { W.phase = p; W.since = now(); const w = W.waiters; W.waiters = []; for (const f of w) f(); };
  const phaseChange = (ms) => new Promise((res) => { const t = setTimeout(res, ms); W.waiters.push(() => { clearTimeout(t); res(); }); });
  const BUSY = { onEndSeason: 1, onBattleTurn: 1, onAutoBattle: 1, onBattleDone: 1, onBeatDone: 1 };
  const PACE = { goal: 3600, open: 1700, card: 2800, fly: 1400, look: 1500, order: 1500, task: 1300, orders: 2400, turn1: 2600, turn: 1900, result: 3200, beat: 2700, report: 5000, over: 4000 };
  const pace = () => { const p = Number(E.params.get('pace')); return p > 0 ? p : 1; };
  // a pause of the watch mode; env.fast (the e2e) keeps only a yield so the page still draws
  const pause = (ms, run) => {
    if (!W.on || W.run !== run) return Promise.resolve();
    const c = (W.cut = Cut());
    return c.wait(E.fast ? 30 : ms * pace());
  };
  // what the page answered when no event says where it went
  const derive = () => { const g = E.game(); if (E.V2.battle(g)) return 'battle'; return E.view().over ? 'over' : 'season'; };
  const settle = (r) => { if (W.phase === 'busy') setPhase(typeof r === 'string' ? (r === 'season' && E.view().report ? 'report' : r) : derive()); };
  // the page's full screens close as their own buttons would close them
  const closeScreen = () => {
    const ui = E.ui;
    if (ui.close) return ui.close();
    const b = ui.el && ui.el.querySelector('[data-a="goal-ok"],[data-a="rep-ok"],[data-a="beat-ok"]'); if (b) b.click();
  };

  // captions: the UI's (job 7) or a small card of the show's own over the bottom of the map
  let capEl = null;
  const say = (text, o = {}) => {
    if (E.fast) return;
    const ms = o.ms || 2600;
    if (E.ui.caption) { try { E.ui.caption(text, { who: o.who, ms }); return; } catch (e) { /* the show's own */ } }
    style();
    if (!capEl) { capEl = div('hs hs-cap'); document.body.appendChild(capEl); }
    slot(capEl, (o.who ? '<span class="hs-kick">' + esc(o.who) + '</span>' : '') + '<span class="hs-line">' + esc(text) + '</span>');
    clearTimeout(capEl._hide); capEl._hide = setTimeout(() => capEl && capEl.classList.remove('on'), ms);
  };
  const unsay = () => { if (capEl) { clearTimeout(capEl._hide); capEl.classList.remove('on'); } };

  // the watch bar: the UI's (job 7), or the show's own: a veil that takes the taps (a tap shortens the pause) and "Dừng xem"
  let barEl = null;
  const hud = (on) => {
    if (E.ui.watch) { try { E.ui.watch(on); return; } catch (e) { /* the show's own */ } }
    if (!on) { if (barEl) { barEl.remove(); window.removeEventListener('keydown', barEl._key); } barEl = null; document.body.classList.remove('hs-watching'); unsay(); return; }
    if (barEl || E.fast) return;
    style();
    barEl = div('hs hs-watch', '<div class="hs-catch"></div><button type="button" class="hs-stop"><i></i>Đang xem<small>Dừng</small></button>');
    barEl.querySelector('.hs-catch').addEventListener('pointerdown', (e) => { e.preventDefault(); skip(); });
    barEl.querySelector('.hs-stop').addEventListener('click', () => E.H.onWatch(false));
    barEl._key = (e) => { if (e.key === 'Escape') E.H.onWatch(false); else if (e.key === ' ') { e.preventDefault(); skip(); } };
    window.addEventListener('keydown', barEl._key);
    document.body.appendChild(barEl); document.body.classList.add('hs-watching');
  };

  // the generals' advice (job 9's V2.advise); until it exists, a plain one: an army attacks where its general's forecast is a
  // win, a town takes the first task it suggests that it can pay for
  const plainAdvice = (V2, g) => {
    const v = V2.view(g), out = [];
    for (const a of v.armies) {
      if (a.fid !== v.me || a.order || a.besieging) continue;
      let best = null;
      for (const t of V2.targets(g, a.id)) {
        if (t.intent !== 'ask' && t.intent !== 'attack') continue;
        const f = V2.forecast(g, [a.id], { kind: t.kind, id: t.id }), r = /Thắng lớn/.test(f.label) ? 2 : /^Thắng/.test(f.label) ? 1 : 0;
        if (r && (!best || r > best.r)) best = { r, t, f };
      }
      if (best) out.push({ type: 'order', army: a.id, target: { kind: best.t.kind, id: best.t.id }, intent: 'attack', why: 'Tướng đoán: ' + best.f.label.toLowerCase() + '.' });
    }
    for (const t of v.towns) {
      if (t.owner !== v.me || t.task) continue;
      const ts = V2.tasks(g, t.id), k = (ts.suggested || []).find((key) => (ts.all.find((x) => x.key === key) || {}).ok);
      if (k) out.push({ type: 'task', town: t.id, key: k });
    }
    return out;
  };
  const advise = () => { const V2 = E.V2, g = E.game(); try { return (V2.advise ? V2.advise(g) : plainAdvice(V2, g)) || []; } catch (e) { console.warn('v2 show: advice', e); return []; } };

  // the sensible answer to each of the scenario's cards (by id; a card made again each season carries a suffix); anything
  // else: the advice's own answer if it gives one, else the card's "no" (what the season's end would take anyway)
  const CARD = [
    ['gen_zhuhuan_unhappy', () => true], // keep the admiral and his fleet: Âm Lăng is his to hold
    ['gen_zhuhuan', (c, adv, v) => adv.some((o) => o.type === 'order' && (o.intent === 'attack' || o.intent === 'siege') && ((v.armies.find((a) => a.id === o.army) || {}).gen || {}).id === c.gen)], // the vanguard only when his boats fight this season
    ['history_fan', () => true], // the rumour: Trương Liêu likelier to march away
    ['history_lu', (c, adv, v) => v.res.uy >= 45], // demand Lịch Dương only with the Uy to carry it
    ['envoy_wu', () => false], // an alliance gives Wu Lịch Dương, one of the five towns
    ['local_hudi', () => false], // demand an unconditional surrender (Uy +3) and take Hu Dị by the sword: a battle the forecast calls a rout
    ['captive', () => true],
  ];
  const decide = (c, adv, v) => {
    const a = adv.find((o) => (o.type === 'answer' || o.type === 'card') && (o.card === c.id || o.id === c.id)); if (a) return !!a.yes;
    const r = CARD.find(([k]) => c.id === k || c.id.indexOf(k + '_') === 0 || c.id.indexOf(k) === 0);
    return r ? !!r[1](c, adv, v) : !!c.urgent;
  };
  const INTENT = { move: 'Đi tới', attack: 'Đánh', siege: 'Vây' };
  const thingName = (v, t) => { if (!t) return ''; if (t.kind === 'town') return townName(t.id); const a = v.armies.find((x) => x.id === t.id); return a && a.gen ? a.gen.name : 'quân ' + facShort(a && a.fid); };

  // the director: a wide establishing shot each season (a new side of the region each time), across each march, down on a
  // town at work, and a slow drift while a pause lasts
  const Dir = {
    open(k) { const az = [0.3, -0.34, 0.78, 0.02][k % 4], el = [0.88, 0.8, 0.94, 0.84][k % 4], p = Cam.over(az, el); p.az = Cam.near(p.az); return p; },
    drift(p, ms, daz = 0.12, k = 0.95) { if (!E.fast) Cam.fly(Object.assign({}, p, { az: p.az + daz, dist: p.dist * k }), ms); },
    march(from, to) {
      const A = Cam.xz(from), B = Cam.xz(to.id), dx = B[0] - A[0], dz = B[1] - A[1], d = Math.hypot(dx, dz) || 1;
      let nx = -dz / d, nz = dx / d; if (nz < 0) { nx = -nx; nz = -nz; } // across the march, from its southern side (the map's usual way up)
      const az = Cam.near(Math.atan2(nx, nz) * 0.7 + 0.3 * 0.3);
      return { t: [A[0] + dx * 0.42, A[1] + dz * 0.42], dist: clamp(d * 1.3 + 18, 30, 110), az, el: 0.72 };
    },
  };

  async function season(run, alive) {
    const H = E.H;
    let v = E.view();
    W.seasons++;
    if (!E.fast) H.onSelect(null); // whatever the player had open
    const wide = Dir.open(W.seasons - 1);
    say(v.calendar, { who: 'Mùa ' + v.season, ms: PACE.open * pace() + 900 });
    await Cam.fly(wide, PACE.fly * pace());
    Dir.drift(wide, (PACE.open + 400) * pace());
    await pause(PACE.open, run); if (!alive()) return;
    // the cards first: an answer can change what the armies may do (a town that submits)
    let adv = advise();
    for (const c of v.cards.slice()) {
      if (!alive()) return;
      const yes = decide(c, adv, v);
      if (!E.fast && E.ui.openCards) E.ui.openCards();
      say(c.title + ' → ' + (yes ? c.yes.label : c.no.label), { who: c.who, ms: PACE.card * pace() });
      await pause(PACE.card, run); if (!alive()) return;
      await H.onAnswer(c.id, yes);
    }
    // the orders and the towns' tasks, one by one on the map
    v = E.view(); adv = advise();
    for (const it of adv) {
      if (!alive()) return;
      if (it.type === 'order' && it.target && INTENT[it.intent]) {
        const a = v.armies.find((x) => x.id === it.army); if (!a) continue;
        if (!E.fast) { E.sc.select({ kind: 'army', id: a.id }); await Cam.fly(Dir.march(a.id, it.target), PACE.fly * pace()); }
        say(INTENT[it.intent] + ' ' + thingName(v, it.target) + (it.why ? ' · ' + it.why : ''), { who: a.gen ? a.gen.name : 'Đạo quân', ms: (PACE.look + PACE.order) * pace() });
        await pause(PACE.look, run); if (!alive()) return;
        await H.onConfirmOrder({ type: 'order', army: a.id, armies: [a.id], target: it.target, intent: it.intent });
        await pause(PACE.order, run);
        E.sc.select(null);
      } else if (it.type === 'task') {
        const t = v.towns.find((x) => x.id === it.town); if (!t) continue;
        const all = (E.V2.tasks(E.game(), t.id).all || []), k = all.find((x) => x.key === it.key);
        if (!E.fast) { const p = Cam.at(t.id, { dist: 30, el: 0.66, az: Cam.near(E.sc.cam.az + 0.3) }); await Cam.fly(p, PACE.fly * pace()); }
        say((k ? k.name : it.key) + (it.why ? ' · ' + it.why : k && k.text ? ' · ' + k.text : ''), { who: t.name, ms: PACE.task * pace() + 400 });
        await H.onConfirmOrder({ type: 'task', town: t.id, key: it.key });
        await pause(PACE.task, run);
      }
    }
    if (!alive()) return;
    E.sc.select(null);
    // every order on the map at once, then the season plays
    const w = E.view(), no = w.armies.filter((a) => a.fid === w.me && a.order).length, nt = w.towns.filter((t) => t.owner === w.me && t.task).length;
    say(no || nt ? [no ? no + ' lệnh quân' : '', nt ? nt + ' việc thành' : ''].filter(Boolean).join(', ') + '. Hết mùa.' : 'Giữ quân, chờ thời. Hết mùa.', { who: w.calendar, ms: PACE.orders * pace() });
    await Cam.fly(wide, PACE.fly * pace());
    Dir.drift(wide, PACE.orders * pace(), -0.08, 0.97);
    await pause(PACE.orders, run); if (!alive()) return;
    unsay();
    settle(await H.onEndSeason());
  }

  const STEP = {
    async goal(run, alive) { await pause(PACE.goal, run); if (!alive()) return; closeScreen(); E.H.onGoalDone(); if (W.phase === 'goal') setPhase('season'); },
    season,
    async battle(run, alive) {
      const bt = E.V2.battle(E.game());
      await pause(bt && bt.b && bt.b.turn > 1 ? PACE.turn : PACE.turn1, run); if (!alive()) return;
      settle(await E.H.onBattleTurn({}));
    },
    async result(run, alive) { await pause(PACE.result, run); if (!alive()) return; settle(await E.H.onBattleDone()); },
    async beat(run, alive) {
      if (!E.fast) { await pause(700, run); const p = Cam.pose(); Dir.drift(p, PACE.beat * pace(), 0.3, 0.88); }
      await pause(PACE.beat, run); if (!alive()) return;
      closeScreen(); settle(await E.H.onBeatDone());
    },
    async report(run, alive) {
      if (!E.fast) Cam.fly(Dir.open(W.seasons), PACE.report * pace());
      await pause(PACE.report, run); if (!alive()) return;
      closeScreen(); E.H.onReportDone(); if (W.phase === 'report') setPhase('season');
    },
  };

  async function drive(run) {
    const alive = () => W.on && W.run === run;
    await until(() => (window.__v2 && window.__v2.ready) || !alive(), 200);
    let last = '', same = 0;
    while (alive()) {
      if (W.phase === 'busy' || W.phase === 'boot') { await phaseChange(3000); if (W.phase === 'busy' && now() - W.since > 120000) setPhase(derive()); continue; }
      const ph = W.phase, bt = E.V2.battle(E.game()), key = ph + '|' + E.view().season + '|' + (bt ? bt.id + ':' + bt.b.turn : '');
      if (key === last) { if (++same >= 4) { W.stuck++; console.warn('v2 show: the watch mode stopped, stuck at ' + key); break; } } else { last = key; same = 0; }
      if (ph === 'over') { await pause(PACE.over, run); break; }
      const f = STEP[ph]; if (!f) break;
      W.steps++;
      try { await f(run, alive); } catch (e) { console.warn('v2 show: watch step ' + ph, e); }
    }
    // the end of the game, or stuck: the page is the player's again
    if (W.on && W.run === run) E.H.onWatch(false);
  }
  const startWatch = () => {
    if (W.on || !E) return;
    W.on = true; const run = ++W.run;
    hud(true);
    drive(run).catch((e) => console.warn('v2 show: watch', e));
  };
  const stopWatch = () => {
    if (!W.on) return;
    W.on = false; W.run++;
    if (W.cut) W.cut.cut();
    if (E && E.sc && E.sc.select) E.sc.select(null);
    hud(false);
  };

  // ---------------------------------------------------------------- the page's events and hooks
  Play.on('act', (a) => {
    if (BUSY[a.name]) setPhase('busy');
    if (a.name === 'onAgain') { chReset(); untint(); setPhase('goal'); }
    if (a.name === 'onAnswer' && E) { // a card answered: the chronicle keeps it in the scenario's words (the card is still in the View here)
      const v = E.view(), c = v.cards.find((x) => x.id === a.args[0]), d = c && (E.data.cards || []).filter((x) => c.id.indexOf(x.id) === 0).sort((x, y) => y.id.length - x.id.length)[0];
      const t = d && d.chronicle ? d.chronicle[a.args[1] ? 'yes' : 'no'] : c && c.title + ': ' + (a.args[1] ? c.yes.label : c.no.label);
      if (t) chAdd(v.calendar, t.replace(/\.$/, ''), { w: 1, ord: 0, key: 'cd|' + c.id });
    }
  });
  Play.on('battle', () => setPhase('battle'));
  Play.on('turn', (d) => { if (!d.over) setPhase('battle'); });
  Play.on('result', () => setPhase('result'));
  Play.on('beat', (t) => { setPhase('beat'); if (E) { const r = E.view().report; chTaken(r ? r.season : E.view().calendar, t); } });
  Play.on('report', (r) => { setPhase('report'); if (E) chReport(r); });
  Play.on('over', () => setPhase('over'));
  Play.on('season', () => setPhase('season'));
  Play.on('skip', () => { if (playing) playing.cut(); if (W.cut) W.cut.cut(); });
  Play.on('watch', (on) => (on ? startWatch() : stopWatch()));

  Play.hook('boot', async (env) => {
    E = env;
    LD.mark('scene');
    if (env.fast) LD.dissolve(0);
    // &watch=1: the game plays itself as soon as the page is ready (after the intro, on the goal screen)
    if (env.params.get('watch') === '1') until(() => window.__v2 && window.__v2.ready).then(() => { if (!W.on) env.H.onWatch(true); });
    // &show=intro|win|lose: that scene once the page is ready (to look at an ending, or record it, without playing a game out)
    const sh = env.params.get('show'); if (sh) until(() => window.__v2 && window.__v2.ready).then(() => Show.play(sh));
  });
  Play.hook('intro', async (ctx, env) => {
    E = env;
    setPhase('goal'); // the goal screen follows this hook
    const v = ctx.view, me = v.me, home = v.towns.find((t) => t.owner === me);
    if (home) chAdd(v.calendar, ((env.data.factions[me] || {}).name || 'Chu Nguyên Chương') + ' tỉnh giấc ở ' + home.name, { w: 1, ord: 0, key: 'start' });
    const want = env.params.get('intro'), play = !env.fast && want !== '0' && (want === '1' || !store.get(INTRO_KEY));
    if (!play) { Show._intro = env.fast ? 'fast' : 'off'; LD.dissolve(env.fast ? 0 : 900); return; }
    store.set(INTRO_KEY, '1');
    await intro(v);
  });
  Play.hook('ending', async (ctx, env) => {
    E = env;
    chReport(ctx.view.report); // the last season's recap: the end screen comes instead of it
    if (env.fast) return;
    await ending(ctx.over, ctx.view);
  });

  // ---------------------------------------------------------------- for the e2e and the console
  Show._intro = 'pending';
  Show.state = () => ({ phase: W.phase, watching: W.on, seasons: W.seasons, steps: W.steps, stuck: W.stuck, intro: Show._intro, load: Object.assign({}, LD.marks), chronicle: CH.list.length });
  Show.chronicle = () => chPick(99).map((l) => ({ season: l.season, text: l.text, tone: l.tone }));
  Show.stage = Stage; // the stage alone (a harness page draws its titles without a game)
  Show.watch = (on) => E && E.H.onWatch(!!on);
  // a scene of the show on demand, over the game as it stands (the console, a clip, the e2e): 'intro', 'win' or 'lose'
  Show.play = async (name) => {
    if (!E || playing || Stage.on) return;
    forced = true;
    try {
      const v = E.view(), T = E.data.texts || {};
      if (name === 'intro') await intro(v);
      else { await ending({ win: name !== 'lose', why: name === 'lose' ? T.lostAll : T.win }, v); setTimeout(untint, 2500); }
    } finally { forced = false; }
  };
})();
