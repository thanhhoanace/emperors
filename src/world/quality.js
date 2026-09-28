// Quality tiers for the 3D world (decisions/0005, docs/design/visual-build.md §1): which machine gets how much.
// Three tiers, picked once from the GPU string and the device, forced with ?tier=high|mid|low, lowered at run time by
// dat.city's rule (two consecutive 100-frame windows over 31 ms → one tier down, never back up in a page).
//
//   const q = Quality.pick(info);                 // pure: { gpu, mobile, memoryGB, cores, width, height, dpr, override }
//                                                 //   → { tier, dpr, shadow, ssao, dof, trees, crowd, reason }
//   const q = Quality.detect(renderer, { override }); // the same, with info gathered from the browser (q.info keeps it)
//   const q = Quality.tier('mid', reason);        // one tier of the table, by name (after a drop)
//   const mon = Quality.monitor(renderer, (tier) => …, opts); mon.frame(dtMs) from the render loop; mon.fps, mon.tier
//   const hud = Quality.hud(container, () => ({ tier, reason, fps, triangles, calls, gpu })); hud.tick() every frame
//
// pick() and monitor() touch neither the DOM nor THREE, so Node tests cover them (tests/quality.test.mjs). Fields:
// shadow is the shadow map size (0: no real-time shadows), trees the cap on individual trees, crowd 'full' or 'lite'
// (fewer pose frames). The container's software GPU always lands on `low`; force ?tier= for screenshots.
(function (root) {
  const Q = {};
  const ORDER = ['high', 'mid', 'low'];
  const VI = { high: 'cao', mid: 'vừa', low: 'thấp' };
  Q.TIERS = {
    high: { dpr: 1.5, shadow: 4096, ssao: true, dof: true, trees: 12000, crowd: 'full' },
    mid: { dpr: 1, shadow: 2048, ssao: false, dof: true, trees: 6000, crowd: 'full' },
    low: { dpr: 1, shadow: 0, ssao: false, dof: false, trees: 2500, crowd: 'lite' },
  };
  Q.ORDER = ORDER;
  Q.tier = (name, reason) => Object.assign({ tier: name }, Q.TIERS[name], { reason: reason || '' });

  // GPU families, first match wins: software and phone GPUs before the desktop ones ("Apple A15" before "Apple M1")
  const FAMILIES = [
    [/swiftshader|llvmpipe|softpipe|\bsoftware\b|mesa offscreen|basic render driver/i, 'low', 'GPU phần mềm'],
    [/adreno|\bmali\b|mali-|powervr|immortalis|xclipse|vivante|videocore|apple a\d+/i, 'low', 'GPU di động'],
    [/apple m\d/i, 'high', 'GPU'],
    [/nvidia|geforce|\b(?:rtx|gtx)\b|quadro|\btesla\b/i, 'high', 'GPU rời'],
    [/radeon(?:\(tm\))? (?:rx|pro|vii|r9)\b|radeon rx|\barc(?:\(tm\))? a\d/i, 'high', 'GPU rời'],
    [/intel|iris|uhd graphics|hd graphics|amd|radeon|vega/i, 'mid', 'GPU tích hợp'],
  ];
  // A short model name out of an ANGLE string: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)"
  // → "NVIDIA GeForce RTX 3060"; the software renderers get their family name.
  const label = (gpu) => {
    if (/swiftshader/i.test(gpu)) return 'SwiftShader';
    if (/llvmpipe|softpipe/i.test(gpu)) return 'llvmpipe';
    const parts = gpu.replace(/^ANGLE \(/, '').replace(/\)$/, '').split(/,\s*/)
      .map((s) => s.replace(/ANGLE Metal Renderer:\s*/, '').replace(/\((?:R|TM)\)/gi, '').replace(/\s*(Direct3D\d+|vs_\d_\d|ps_\d_\d|OpenGL Engine|Unspecified Version)\s*/g, ' ').replace(/\s+/g, ' ').trim())
      .filter((s) => s && !/^(OpenGL|Vulkan|D3D|Metal|Direct3D)/i.test(s)); // the API and driver parts say nothing about the chip
    const best = parts.sort((a, b) => b.length - a.length)[0] || '';
    return best.length > 40 ? best.slice(0, 40).trim() + '…' : best;
  };

  Q.pick = function (info) {
    const i = info || {};
    const gpu = String(i.gpu || '');
    if (i.override && Q.TIERS[i.override]) return Q.tier(i.override, 'Ép mức ' + VI[i.override] + ' qua ?tier=' + i.override);
    let tier, reason;
    if (i.mobile) { tier = 'low'; reason = 'Điện thoại hoặc máy tính bảng → mức thấp'; }
    else {
      const f = FAMILIES.find(([re]) => re.test(gpu));
      if (f) { tier = f[1]; reason = f[2] + ' ' + label(gpu) + ' → mức ' + VI[tier]; }
      else { tier = 'mid'; reason = (gpu ? 'Không nhận ra GPU' : 'Không đọc được GPU') + ' → mức vừa'; }
    }
    // navigator.deviceMemory: 4 GB or less never runs the high tier, whatever the GPU
    if (tier === 'high' && i.memoryGB != null && i.memoryGB <= 4) { tier = 'mid'; reason += ' · RAM ' + i.memoryGB + ' GB → không quá mức vừa'; }
    return Q.tier(tier, reason);
  };

  // Browser side: the unmasked renderer string, the device and the ?tier= override.
  Q.detect = function (renderer, opts = {}) {
    const nav = root.navigator || {}, scr = root.screen || {}, ua = String(nav.userAgent || '');
    let gpu = '';
    try {
      const gl = renderer && renderer.getContext ? renderer.getContext() : null;
      const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
      gpu = gl ? String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '') : '';
    } catch (e) { gpu = ''; }
    const width = scr.width || root.innerWidth || 0, height = scr.height || root.innerHeight || 0, touch = nav.maxTouchPoints || 0;
    // a phone or tablet: its user agent, or touch with a small screen; iPadOS Safari says "Macintosh" but has touch
    const mobile = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua) || (touch > 1 && (/Macintosh/.test(ua) || Math.min(width, height) < 900));
    let override = opts.override;
    if (override === undefined) { try { override = new URLSearchParams(root.location ? root.location.search : '').get('tier') || undefined; } catch (e) { override = undefined; } }
    const info = { gpu, mobile, memoryGB: nav.deviceMemory, cores: nav.hardwareConcurrency, width, height, dpr: root.devicePixelRatio || 1, override, ua };
    return Object.assign(Q.pick(info), { info });
  };

  // dat.city's rule on frame times fed by the page's render loop (no patched requestAnimationFrame): windows of 100
  // frames; two in a row averaging over 31 ms drop one tier. Frames over a second (a hidden tab, the first compile)
  // are ignored; long stalls count as a slow frame but are clamped so one hiccup cannot decide a window.
  Q.monitor = function (renderer, onDrop, opts = {}) {
    const W = opts.window || 100, limit = opts.limitMs || 31;
    const start = opts.tier || (renderer && renderer.userData && renderer.userData.quality && renderer.userData.quality.tier) || 'high';
    const m = { tier: start, fps: 0, avgMs: 0, windows: 0, drops: 0, slow: 0 };
    let n = 0, sum = 0;
    m.frame = (dt) => {
      if (!(dt > 0) || dt > 1000) return;
      sum += Math.min(dt, limit * 4); n++;
      if (n < W) return;
      m.avgMs = sum / n; m.fps = 1000 / m.avgMs; m.windows++; n = 0; sum = 0;
      m.slow = m.avgMs > limit ? m.slow + 1 : 0;
      if (m.slow < 2) return;
      m.slow = 0;
      const k = ORDER.indexOf(m.tier);
      if (k < 0 || k >= ORDER.length - 1) return; // already low: nothing left to drop
      m.tier = ORDER[k + 1]; m.drops++;
      if (onDrop) onDrop(m.tier, 'Tự hạ xuống mức ' + VI[m.tier] + ': khung hình trung bình ' + Math.round(m.avgMs) + ' ms');
    };
    return m;
  };

  // Corner overlay for the owner's reports from real machines: tier, reason, fps, triangles, draw calls, GPU.
  // Shown when ?hud=1 (or opts.show); otherwise the same object does nothing, so pages wire it unconditionally.
  Q.hud = function (container, getStats, opts = {}) {
    let show = opts.show;
    if (show === undefined) { try { show = new URLSearchParams(root.location ? root.location.search : '').get('hud') === '1'; } catch (e) { show = false; } }
    const doc = root.document;
    if (!show || !doc) return { el: null, tick() {}, remove() {} };
    const el = doc.createElement('div');
    el.className = 'quality-hud';
    el.style.cssText = 'position:fixed;top:8px;right:8px;z-index:9999;padding:6px 9px;border-radius:4px;background:rgba(14,11,8,.74);color:#ecdfc4;font:11px/1.45 ui-monospace,Menlo,Consolas,monospace;white-space:pre;pointer-events:none;box-shadow:0 1px 4px rgba(0,0,0,.4)';
    (container || doc.body).appendChild(el);
    const num = (x) => (x == null || !isFinite(x) ? '–' : String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
    let last = -1e9;
    const tick = (now) => {
      const t = now != null ? now : (root.performance ? root.performance.now() : Date.now());
      if (t - last < 250) return; // ~4 Hz
      last = t;
      const s = (getStats && getStats()) || {};
      const gpu = String(s.gpu || '');
      el.textContent = ['Mức: ' + (s.tier || '–') + (s.tier ? ' (' + VI[s.tier] + ')' : ''), 'Lý do: ' + (s.reason || '–'), 'FPS: ' + (s.fps ? s.fps.toFixed(0) : '–'),
        'Tam giác: ' + num(s.triangles), 'Lệnh vẽ: ' + num(s.calls), 'GPU: ' + (gpu.length > 56 ? gpu.slice(0, 56) + '…' : gpu || '–')].join('\n');
    };
    return { el, tick, remove() { if (el.parentNode) el.parentNode.removeChild(el); } };
  };

  if (typeof module === 'object' && module.exports) module.exports = Q;
  else root.Quality = Q;
})(typeof window !== 'undefined' ? window : globalThis);
