// Player UI over the world: choose an emperor, read your realm, give one order a season, watch the turn, see the end.
// DOM only: every number comes from GameController.status()/options() (engine state), every order goes back through
// the controller to the engine. Same ink-and-paper look as hud.js (docs/design/direction.md); no emoji.
(function () {
  const U = (window.PlayerUI = {});
  const CSS = `
  .pui{position:fixed;inset:0;pointer-events:none;font-family:"Noto Serif","Noto Serif CJK SC",Georgia,serif;color:#f3ecdc;z-index:5}
  .pui button{font:inherit;color:#f3ecdc;cursor:pointer}
  .pui .panel{position:absolute;pointer-events:auto;background:linear-gradient(90deg,rgba(18,15,12,.9),rgba(18,15,12,.74));border-left:4px solid var(--c,#b8a27a)}
  .pui .hide{display:none!important}
  .pui .status{left:24px;top:22px;width:372px;padding:12px 16px 14px}
  .pui .status .top{display:flex;align-items:center;gap:12px}
  .pui .gl{width:44px;height:44px;flex:none;display:grid;place-items:center;font-size:24px;background:var(--c,#666);color:#fff;border-radius:50%;
    font-family:"Noto Serif CJK SC","Noto Serif SC",serif;box-shadow:inset 0 0 0 2px rgba(255,255,255,.35)}
  .pui .status .new{margin-left:auto;align-self:flex-start;font-size:12px;padding:3px 9px;background:rgba(255,255,255,.06);border:1px solid rgba(233,224,204,.3)}
  .pui .status .nm{font-size:20px;font-weight:600}.pui .status .tn{font-size:12px;letter-spacing:.1em;color:#cdbb95}
  .pui .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:10px 0 8px}
  .pui .stats div{background:rgba(255,255,255,.05);padding:5px 7px}.pui .stats b{display:block;font-size:16px}.pui .stats span{font-size:11px;color:#cdbb95}
  .pui .sub{font-size:12px;color:#cdbb95;margin-top:6px}
  .pui .chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}.pui .chips span{font-size:12px;padding:1px 7px;border:1px solid rgba(233,224,204,.3)}
  .pui .chips span.seat{border-color:#d8b774;color:#f2d27a}
  .pui .orders{left:24px;bottom:22px;width:430px;max-height:56vh;display:flex;flex-direction:column;padding:12px 16px 14px}
  .pui .orders h3{margin:0 0 8px;font-size:13px;letter-spacing:.14em;color:#cdbb95;font-weight:500}
  .pui .acts{display:grid;grid-template-columns:repeat(5,1fr);gap:4px}
  .pui .acts button{font-size:14px;padding:7px 2px;background:rgba(255,255,255,.06);border:1px solid rgba(233,224,204,.25)}
  .pui .acts button.on{background:#7a5a2a;border-color:#d8b774}.pui .acts button:disabled{opacity:.35;cursor:default}
  .pui .body{overflow:auto;margin:10px 0 8px;min-height:40px}
  .pui .grp{font-size:12px;color:#cdbb95;margin:8px 0 4px}
  .pui .row{display:flex;justify-content:space-between;gap:8px;width:100%;text-align:left;font-size:14px;padding:6px 9px;margin-bottom:3px;background:rgba(255,255,255,.04);border:1px solid transparent;border-left:3px solid var(--c,#8a8070)}
  .pui .row small{color:#cdbb95;font-size:12px}.pui .row.on{border-color:#d8b774;background:rgba(122,90,42,.45)}.pui .row:disabled{opacity:.4;cursor:default}
  .pui .note{font-size:13px;line-height:1.45;color:#e9e0cc}
  .pui .check{display:flex;gap:8px;align-items:center;font-size:13px;margin:6px 0;color:#f2d27a}
  .pui .go{display:flex;align-items:center;gap:10px}
  .pui .go button{flex:none;font-size:16px;padding:8px 22px;background:#7a5a2a;border:1px solid #d8b774}.pui .go button:disabled{opacity:.35;cursor:default}
  .pui .go .why{font-size:12px;color:#cdbb95}
  .pui .rank{right:24px;bottom:66px;width:316px;padding:8px 12px;font-size:13px}
  .pui .rank div{display:grid;grid-template-columns:14px 1fr 50px 62px 28px;white-space:nowrap;gap:6px;padding:2px 0}.pui .rank div.dead{opacity:.35;text-decoration:line-through}
  .pui .rank div.me{color:#f2d27a}.pui .rank i{width:10px;height:10px;margin-top:4px;background:var(--c)}
  .pui .bar{left:50%;top:18px;transform:translateX(-50%);padding:8px 10px 8px 16px;display:flex;align-items:center;gap:14px;font-size:14px}
  .pui .bar button{font-size:13px;padding:4px 12px;background:rgba(255,255,255,.08);border:1px solid rgba(233,224,204,.35)}
  .pui .veil{position:absolute;inset:0;pointer-events:auto;display:grid;place-items:center;background:radial-gradient(ellipse at center,rgba(18,15,12,.72),rgba(18,15,12,.94))}
  .pui .veil .box{width:min(980px,92vw);text-align:center}
  .pui .veil h1{font-size:40px;margin:0 0 6px;letter-spacing:.06em}.pui .veil .era{color:#cdbb95;font-size:15px;margin-bottom:4px}
  .pui .veil .desc{color:#e9e0cc;font-size:15px;max-width:640px;margin:0 auto 22px;line-height:1.5}
  .pui .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
  .pui .cards button{padding:18px 12px 16px;background:rgba(255,255,255,.05);border:1px solid rgba(233,224,204,.25);border-top:4px solid var(--c);text-align:center}
  .pui .cards button:hover:not(:disabled){background:rgba(255,255,255,.1)}.pui .cards button:disabled{opacity:.45;cursor:default}
  .pui .cards .gl{margin:0 auto 10px;width:58px;height:58px;font-size:32px}
  .pui .cards .n{font-size:19px;font-weight:600}.pui .cards .d{font-size:12px;color:#cdbb95;margin:3px 0 8px}.pui .cards .s{font-size:13px;line-height:1.5}
  .pui .veil .foot{margin-top:18px;font-size:13px;color:#cdbb95}
  .pui .veil .res{font-size:22px;margin:10px 0}.pui .veil .again{margin-top:18px;font-size:16px;padding:9px 26px;background:#7a5a2a;border:1px solid #d8b774}
  `;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const num = (n) => Math.round(n).toLocaleString('vi-VN');
  const WIN_KIND = { unify: 'thống nhất thiên hạ', last: 'là phe cuối cùng còn đứng', hegemon: 'xưng bá khi hết lượt' };

  // o: { world, personas, colors, glyphs, actions (Engine.ACTIONS), stratagems, onChoose(fid), onSubmit(decision|null),
  //      onSkip(), makeDecision(action, choice), validate(decision), onMark(marks) }
  U.create = function (o) {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    const el = document.createElement('div'); el.className = 'pui';
    el.innerHTML = `<div class="panel status hide"></div><div class="panel orders hide"></div><div class="panel rank hide"></div>
      <div class="panel bar hide"><span class="bt"></span><button data-role="skip">Bỏ qua</button></div><div class="veil start"></div><div class="veil over hide"></div>`;
    document.body.appendChild(el);
    const q = (s) => el.querySelector(s), statusEl = q('.status'), ordersEl = q('.orders'), rankEl = q('.rank'), barEl = q('.bar'), startEl = q('.start'), overEl = q('.over');
    const col = (fid) => o.colors[fid] || '#8a8070', glyph = (fid) => o.glyphs[fid] || '';
    const ui = { el };
    let status = null, options = null, locked = false, pick = { action: null, c: {} };
    barEl.querySelector('button').onclick = () => o.onSkip();

    // ------------------------------------------------------------ start: one of the four emperors
    const emperors = o.world.factions.filter((f) => f.type === 'time_displaced');
    const city = (pid) => o.world.provinces.find((p) => p.id === pid).city;
    startEl.innerHTML = `<div class="box"><h1>${esc(o.world.meta.title)}</h1><div class="era">${esc(o.world.meta.era)}</div><div class="desc">${esc(o.world.meta.description)}</div>
      <div class="cards">${emperors.map((f) => { const p = o.personas[f.id]; return `<button data-fid="${f.id}" style="--c:${col(f.id)}" disabled>
        <div class="gl">${esc(glyph(f.id))}</div><div class="n">${esc(p.name)}</div><div class="d">${esc(p.courtesy)} · ${esc(p.dynasty)}</div>
        <div class="s">Trấn ${esc(city(f.start.seat))}<br>${num(f.start.troops)} quân · Uy ${f.start.prestige}</div></button>`; }).join('')}</div>
      <div class="foot">Chọn một hoàng đế. Sáu phe còn lại do máy điều khiển. <span class="ld">Đang dựng thiên hạ…</span></div></div>`;
    startEl.querySelectorAll('[data-fid]').forEach((b) => { b.onclick = () => o.onChoose(b.dataset.fid); });
    ui.ready = () => { startEl.querySelectorAll('[data-fid]').forEach((b) => { b.disabled = false; }); startEl.querySelector('.ld').textContent = ''; };
    ui.showStart = () => { startEl.classList.remove('hide'); overEl.classList.add('hide'); for (const p of [statusEl, ordersEl, rankEl, barEl]) p.classList.add('hide'); };

    // ------------------------------------------------------------ realm status and ranking
    const drawStatus = () => {
      const P = status.player;
      statusEl.style.setProperty('--c', col(P.fid));
      statusEl.innerHTML = `<div class="top"><div class="gl" style="--c:${col(P.fid)}">${esc(glyph(P.fid))}</div><div>
          <div class="tn">LƯỢT ${status.turn}/${status.maxTurns} · ${esc(status.calendar.season.toUpperCase())} NĂM ${status.calendar.year}</div><div class="nm">${esc(P.name)}</div></div><button class="new" data-role="new">Ván mới</button></div>
        <div class="stats"><div><b>${num(P.troops)}</b><span>Quân</span></div><div><b>${num(P.grain)}</b><span>Lương</span></div>
          <div><b>${Math.round(P.loyalty)}</b><span>Dân tâm</span></div><div><b>${Math.round(P.prestige)}</b><span>Uy</span></div></div>
        ${P.alive ? `<div class="sub">Mỗi mùa: thu ${num(P.income)} · nuôi quân ${num(P.upkeep)} lương</div>
        <div class="sub">Châu (${P.provinces.length})</div><div class="chips">${P.provinces.map((p) => `<span class="${p.seat ? 'seat' : ''}">${esc(p.city)}${p.fort ? ' · lũy ' + p.fort : ''}</span>`).join('')}</div>
        <div class="sub">Minh hữu: ${P.pacts.length ? P.pacts.map((x) => `${esc(x.name)} (đến lượt ${x.until})`).join(', ') : 'chưa có'}</div>` : '<div class="sub">Phe đã diệt vong.</div>'}`;
      statusEl.querySelector('[data-role=new]').onclick = () => { if (!locked) ui.showStart(); };
      rankEl.innerHTML = status.factions.map((f) => `<div class="${f.alive ? '' : 'dead'} ${f.fid === P.fid ? 'me' : ''}"><i style="--c:${col(f.fid)}"></i><span>${esc(f.name)}</span><span>${f.provinces} châu</span><span>${num(f.troops)}</span><span>${Math.round(f.prestige)}</span></div>`).join('');
    };

    // ------------------------------------------------------------ orders: the five engine actions and their inputs
    const row = (attrs, main, side, c, on, disabled) => `<button class="row${on ? ' on' : ''}" ${attrs} style="--c:${c}"${disabled ? ' disabled' : ''}><span>${main}</span><small>${side}</small></button>`;
    const body = () => {
      const a = pick.action, c = pick.c;
      if (!a) return '<div class="note">Chọn một lệnh cho mùa này. Mọi phe ra lệnh cùng lúc; trọng tài xử theo thứ tự củng cố → nội chính → ngoại giao → mưu → tấn công.</div>';
      if (a === 'attack') {
        const t = options.attack.find((x) => x.pid === c.target);
        return `<div class="grp">Châu giáp ranh (đích)</div>${options.attack.map((x) => row(`data-target="${x.pid}"`, esc(x.city), `${esc(x.ownerName)}${x.pact ? ' · minh hữu' : ''} · lực ${x.ratio.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}×`, col(x.owner), c.target === x.pid)).join('')}
          ${t ? `<div class="sub">Xuất quân từ: ${t.via.map((v) => esc(v.city)).join(' hoặc ')} (trọng tài chọn, ưu tiên thủ phủ). Ước đem ${num(t.commit)} quân, bên thủ ~${num(t.defenders)}. Chưa tính may rủi.</div>` : ''}
          ${t && t.pact ? `<label class="check"><input type="checkbox" data-betray ${c.betray ? 'checked' : ''}> Bội minh với ${esc(t.ownerName)}</label>` : ''}`;
      }
      if (a === 'diplomacy') {
        const D = options.diplomacy;
        return `<div class="grp">Chiêu hàng châu trung lập giáp ranh</div>${D.annex.length ? D.annex.map((x) => row(`data-sub="annex" data-target="${x.pid}"`, esc(x.city), esc(x.ownerName), '#9a9486', c.sub === 'annex' && c.target === x.pid)).join('') : '<div class="note">Không có.</div>'}
          <div class="grp">Kết minh — đình chiến ${D.pactTurns} lượt</div>${D.pact.map((x) => row(`data-sub="pact" data-target="${x.fid}"`, esc(x.name), x.full ? 'đã đủ minh hữu' : '', col(x.fid), c.sub === 'pact' && c.target === x.fid)).join('')}`;
      }
      if (a === 'stratagem') {
        const S = options.stratagem;
        return `<div class="grp">Kế</div>${o.stratagems.map((x) => row(`data-sub="${x.id}"`, esc(x.label), esc(x.hint), '#b8a27a', c.sub === x.id)).join('')}
          <div class="grp">Nhắm vào</div>${S.targets.map((x) => row(`data-target="${x.fid}"`, esc(x.name), num(x.troops) + ' quân', col(x.fid), c.target === x.fid)).join('')}`;
      }
      if (a === 'fortify') return `<div class="grp">Châu củng cố</div>${options.fortify.map((x) => row(`data-target="${x.pid}"`, esc(x.city) + (x.seat ? ' (thủ phủ)' : ''), `lũy ${x.fort}/${x.max}`, col(status.player.fid), c.target === x.pid)).join('')}`;
      return `<div class="note">Thu lương, mộ binh, an dân ở trị sở ${esc(options.internal.city)}. Không cần chọn gì thêm.</div>`;
    };
    const current = () => (pick.action ? o.makeDecision(pick.action, pick.c) : null);
    // the map shows the pending order: the target city, and where the army may set out from
    const mark = () => {
      const a = pick.action, c = pick.c; let m = {};
      if (a === 'attack' && c.target) m = { pick: c.target, via: options.attack.find((x) => x.pid === c.target).via.map((v) => v.pid) };
      else if ((a === 'fortify' || (a === 'diplomacy' && c.sub === 'annex')) && c.target) m = { pick: c.target };
      else if (a === 'internal') m = { pick: options.internal.seat };
      else if (c.target && status.factions.some((f) => f.fid === c.target)) m = { pick: (o.seatOf && o.seatOf(c.target)) || null };
      o.onMark(m);
    };
    const drawOrders = () => {
      const P = status.player;
      ordersEl.style.setProperty('--c', col(P.fid));
      if (status.over) { ordersEl.innerHTML = '<h3>THIÊN HẠ ĐÃ ĐỊNH</h3>'; return; }
      if (!P.alive) { ordersEl.innerHTML = '<h3>PHE ĐÃ DIỆT VONG</h3><div class="note">Không còn nhận lệnh. Có thể xem các phe khác đánh tiếp.</div><div class="go"><button data-role="submit">Xem lượt tiếp</button></div>'; ordersEl.querySelector('[data-role=submit]').onclick = () => o.onSubmit(null); return; }
      const d = current(), why = d ? o.validate(d) : 'Chưa chọn lệnh.';
      ordersEl.innerHTML = `<h3>LỆNH MÙA NÀY</h3><div class="acts">${Object.keys(o.actions).map((k) => `<button data-action="${k}" class="${pick.action === k ? 'on' : ''}"${options.available[k] ? '' : ' disabled'}>${esc(o.actions[k].label)}</button>`).join('')}</div>
        <div class="body">${body()}</div><div class="go"><button data-role="submit"${why ? ' disabled' : ''}>Ban lệnh</button><span class="why">${esc(why || '')}</span></div>`;
      ordersEl.querySelectorAll('[data-action]').forEach((b) => { b.onclick = () => { pick = { action: b.dataset.action, c: {} }; drawOrders(); mark(); }; });
      ordersEl.querySelectorAll('.body [data-target], .body [data-sub]').forEach((b) => { b.onclick = () => {
        if (b.dataset.sub) pick.c.sub = b.dataset.sub;
        if (b.dataset.target) pick.c.target = b.dataset.target;
        if (pick.action === 'attack') pick.c.betray = false;
        drawOrders(); mark();
      }; });
      const bt = ordersEl.querySelector('[data-betray]'); if (bt) bt.onchange = () => { pick.c.betray = bt.checked; drawOrders(); };
      ordersEl.querySelector('[data-role=submit]').onclick = () => { const dd = current(); if (dd && !o.validate(dd)) o.onSubmit(dd); };
    };

    ui.update = (s, op) => {
      status = s; options = op; pick = { action: null, c: {} }; o.onMark({});
      startEl.classList.add('hide');
      drawStatus(); drawOrders();
      if (!locked) for (const p of [statusEl, ordersEl, rankEl]) p.classList.remove('hide');
    };
    // while the engine's turn plays, orders are closed and the event cards own the screen
    ui.lock = (on, entry) => {
      locked = on;
      for (const p of [statusEl, ordersEl]) p.classList.toggle('hide', on);
      barEl.classList.toggle('hide', !on);
      if (on) { barEl.style.setProperty('--c', col(status.player.fid)); ui.progress(0, entry.events.length, entry); }
    };
    let barTurn = '';
    ui.progress = (i, n, entry) => {
      if (entry) barTurn = `Lượt ${entry.turn} · ${entry.calendar.season} năm ${entry.calendar.year}`;
      barEl.querySelector('.bt').textContent = `${barTurn} — diễn ${i}/${n} sự kiện`;
    };
    ui.gameOver = (s, winEv) => {
      const w = s.winner, me = s.player.fid, name = s.factions.find((f) => f.fid === w.fid).name;
      overEl.innerHTML = `<div class="box"><div class="era">THIÊN HẠ ĐÃ ĐỊNH · LƯỢT ${s.turn}</div><h1 style="color:${col(w.fid)}">${esc(name)}</h1>
        <div class="res">${esc(name)} ${esc(WIN_KIND[w.kind] || w.kind)}. ${w.fid === me ? 'Bạn thắng.' : 'Bạn thua.'}</div>
        ${winEv ? `<div class="desc">${esc(winEv.text)}</div>` : ''}<button class="again" data-role="again">Ván mới</button></div>`;
      overEl.querySelector('[data-role=again]').onclick = () => ui.showStart();
      overEl.classList.remove('hide');
    };
    return ui;
  };
})();
