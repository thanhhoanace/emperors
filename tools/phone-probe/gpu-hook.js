// Injected before any page script: tally the GPU memory a page asks WebGL for (buffers, textures, renderbuffers) and count
// WebGL contexts. An estimate: formats are sized by bytes per texel, mip chains as +33%, MSAA renderbuffers × samples.
(() => {
  const W = (window.__gpu = { contexts: 0, bytes: 0, peak: 0, buf: 0, tex: 0, rb: 0, big: [] });
  const BPP = { 0x8058: 4, 0x881A: 8, 0x8814: 16, 0x88F0: 4, 0x81A6: 4, 0x81A5: 2, 0x8CAC: 4, 0x8229: 1, 0x822B: 2, 0x822D: 2, 0x822F: 4, 0x8051: 3, 0x8C43: 4, 0x8C3A: 4, 0x8C3D: 4, 0x8D62: 2, 0x8056: 2, 0x8057: 2, 0x881B: 6, 0x8815: 12, 0x822E: 4, 0x8230: 8, 0x8CAD: 8 };
  const CH = { 0x1908: 4, 0x1907: 3, 0x1903: 1, 0x1909: 1, 0x190A: 2, 0x8227: 2, 0x1902: 1, 0x84F9: 4, 0x8D99: 4 };
  const TB = { 0x1401: 1, 0x1406: 4, 0x140B: 2, 0x8D61: 2, 0x1403: 2, 0x1405: 4, 0x1404: 4, 0x8033: 2, 0x8034: 2, 0x8363: 2, 0x84FA: 4, 0x8C3B: 4 };
  const sizeOf = new WeakMap(), kindOf = new WeakMap();
  const add = (obj, kind, n) => { const old = sizeOf.get(obj) || 0; sizeOf.set(obj, n); kindOf.set(obj, kind); W[kind] += n - old; W.bytes += n - old; if (W.bytes > W.peak) W.peak = W.bytes; if (n > 8e6) W.big.push([kind, Math.round(n / 1e6) + 'MB']); };
  const del = (obj) => { if (!obj) return; const n = sizeOf.get(obj) || 0; if (n) { W[kindOf.get(obj)] -= n; W.bytes -= n; sizeOf.delete(obj); } };
  for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (!C) continue; const P = C.prototype, bound = new WeakMap();
    const st = (gl) => { let s = bound.get(gl); if (!s) { s = { buf: {}, tex: {}, unit: 0x84C0, rb: null }; bound.set(gl, s); } return s; };
    const wrap = (name, f) => { const o = P[name]; if (!o) return; P[name] = function (...a) { const r = o.apply(this, a); try { f(this, a, r); } catch (e) {} return r; }; };
    wrap('bindBuffer', (gl, [t, b]) => { st(gl).buf[t] = b; });
    wrap('bufferData', (gl, [t, d]) => { const b = st(gl).buf[t]; if (b) add(b, 'buf', typeof d === 'number' ? d : d ? d.byteLength : 0); });
    wrap('activeTexture', (gl, [u]) => { st(gl).unit = u; });
    wrap('bindTexture', (gl, [t, x]) => { st(gl).tex[st(gl).unit + ':' + t] = x; });
    const curTex = (gl, t) => st(gl).tex[st(gl).unit + ':' + (t >= 0x8515 && t <= 0x851A ? 0x8513 : t)];
    wrap('texImage2D', (gl, a) => { const tex = curTex(gl, a[0]); if (!tex || a[1] > 0) return; let w, h, bpp;
      if (a.length >= 8) { w = a[3]; h = a[4]; bpp = BPP[a[2]] || (CH[a[6]] || 4) * (TB[a[7]] || 1); } else { const s = a[5]; w = s.width || s.videoWidth || s.codedWidth || 0; h = s.height || s.videoHeight || s.codedHeight || 0; bpp = (CH[a[3]] || 4) * (TB[a[4]] || 1); }
      const faces = a[0] >= 0x8515 && a[0] <= 0x851A ? 1 : 1; add(tex, 'tex', Math.round(w * h * bpp * faces * 1.33)); });
    wrap('texStorage2D', (gl, [t, levels, f, w, h]) => { const tex = curTex(gl, t); if (tex) add(tex, 'tex', Math.round(w * h * (BPP[f] || 4) * (levels > 1 ? 1.33 : 1) * (t === 0x8513 ? 6 : 1))); });
    wrap('texStorage3D', (gl, [t, levels, f, w, h, d]) => { const tex = curTex(gl, t); if (tex) add(tex, 'tex', Math.round(w * h * d * (BPP[f] || 4))); });
    wrap('texImage3D', (gl, a) => { const tex = curTex(gl, a[0]); if (tex && !a[1]) add(tex, 'tex', a[3] * a[4] * a[5] * (BPP[a[2]] || 4)); });
    wrap('bindRenderbuffer', (gl, [, r]) => { st(gl).rb = r; });
    wrap('renderbufferStorage', (gl, [, f, w, h]) => { const r = st(gl).rb; if (r) add(r, 'rb', w * h * (BPP[f] || 4)); });
    wrap('renderbufferStorageMultisample', (gl, [, s, f, w, h]) => { const r = st(gl).rb; if (r) add(r, 'rb', w * h * (BPP[f] || 4) * Math.max(1, s)); });
    wrap('deleteBuffer', (gl, [b]) => del(b)); wrap('deleteTexture', (gl, [t]) => del(t)); wrap('deleteRenderbuffer', (gl, [r]) => del(r));
  }
  const gc = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...r) { const c = gc.call(this, type, ...r); if (c && /webgl/.test(type) && !this.__counted) { this.__counted = true; W.contexts++; } return c; };
})();
