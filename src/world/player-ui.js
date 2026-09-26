// Player UI over the world: choose an emperor, read your realm, give one order a season, answer envoys, watch the turn.
// DOM only: everything shown comes from GameController.view() (own realm exact, other factions only as the player's
// DecisionContext perceives them) and from the turn's presentation (built from the TurnObservation); every order and
// every answer goes back through the controller to the engine. Same ink-and-paper look as hud.js
// (docs/design/direction.md); no emoji.
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
  .pui .stats div{background:rgba(255,255,255,.05);padding:5px 7px;cursor:help}.pui .stats b{display:block;font-size:16px}.pui .stats span{font-size:11px;color:#cdbb95}
  .pui .sub{font-size:12px;color:#cdbb95;margin-top:6px}.pui .sub b{color:#f3ecdc;font-weight:500}
  .pui .chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}.pui .chips span{font-size:12px;padding:1px 7px;border:1px solid rgba(233,224,204,.3)}
  .pui .chips span.seat{border-color:#d8b774;color:#f2d27a}
  .pui .guest{margin-top:8px;padding:6px 9px;border:1px solid rgba(216,183,116,.45);background:rgba(122,90,42,.18);font-size:12px;line-height:1.45}
  .pui .guest .h{font-size:11px;letter-spacing:.14em;color:#f2d27a}.pui .guest.off{border-color:rgba(233,224,204,.2);background:rgba(255,255,255,.03);color:#cdbb95}
  .pui .orders{left:24px;bottom:22px;width:430px;max-height:52vh;display:flex;flex-direction:column;padding:12px 16px 14px}
  .pui .orders h3{margin:0 0 8px;font-size:13px;letter-spacing:.14em;color:#cdbb95;font-weight:500}
  .pui .acts{display:grid;grid-template-columns:repeat(5,1fr);gap:4px}
  .pui .acts button{font-size:14px;padding:7px 2px;background:rgba(255,255,255,.06);border:1px solid rgba(233,224,204,.25)}
  .pui .acts button.on{background:#7a5a2a;border-color:#d8b774}.pui .acts button:disabled{opacity:.35;cursor:default}
  .pui .body{overflow:auto;margin:10px 0 8px;min-height:40px}
  .pui .grp{font-size:12px;color:#cdbb95;margin:8px 0 4px}
  .pui .row{display:flex;justify-content:space-between;gap:8px;width:100%;text-align:left;font-size:14px;padding:6px 9px;margin-bottom:3px;background:rgba(255,255,255,.04);border:1px solid transparent;border-left:3px solid var(--c,#8a8070)}
  .pui .row small{color:#cdbb95;font-size:12px;text-align:right}.pui .row.on{border-color:#d8b774;background:rgba(122,90,42,.45)}.pui .row:disabled{opacity:.4;cursor:default}
  .pui .intel{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;font-size:13px;margin:4px 0 2px;padding:6px 9px;background:rgba(255,255,255,.04)}
  .pui .intel span{color:#cdbb95}.pui .intel b{font-weight:500}
  .pui .note{font-size:13px;line-height:1.45;color:#e9e0cc}
  .pui .check{display:flex;gap:8px;align-items:center;font-size:13px;margin:6px 0;color:#f2d27a}
  .pui .go{display:flex;align-items:center;gap:10px}
  .pui .go button{flex:none;font-size:16px;padding:8px 22px;background:#7a5a2a;border:1px solid #d8b774}.pui .go button:disabled{opacity:.35;cursor:default}
  .pui .go .why{font-size:12px;color:#cdbb95}
  .pui .rank{right:24px;bottom:66px;width:330px;padding:8px 12px;font-size:13px}
  .pui .rank div.r{display:grid;grid-template-columns:14px 1fr 48px 96px;white-space:nowrap;gap:6px;padding:2px 0}.pui .rank div.dead{opacity:.35;text-decoration:line-through}
  .pui .rank div.hd{font-size:11px;letter-spacing:.08em;color:#cdbb95}.pui .rank small{color:#cdbb95;font-size:11px}
  .pui .rank div.me{color:#f2d27a}.pui .rank i{width:10px;height:10px;margin-top:4px;background:var(--c)}
  .pui .rank .pl{margin-top:6px;padding-top:5px;border-top:1px solid rgba(233,224,204,.15);font-size:12px;color:#cdbb95;line-height:1.5}
  .pui .rank .pl b{color:#f3ecdc;font-weight:500}.pui .rank .pl .high{color:#e9a08f}
  .pui .bar{left:50%;top:18px;transform:translateX(-50%);padding:8px 10px 8px 16px;display:flex;align-items:center;gap:14px;font-size:14px}
  .pui .bar button{font-size:13px;padding:4px 12px;background:rgba(255,255,255,.08);border:1px solid rgba(233,224,204,.35)}
  .pui .news{left:50%;top:18px;transform:translateX(-50%);width:420px;padding:8px 14px 10px;font-size:13px;line-height:1.5}
  .pui .news .h{font-size:11px;letter-spacing:.14em;color:#cdbb95;display:flex;justify-content:space-between}
  .pui .news .h button{font-size:11px;padding:0 6px;background:none;border:none;color:#cdbb95}
  .pui .news ul{margin:3px 0 0;padding-left:16px}
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
  .pui .veil.react{background:rgba(18,15,12,.55)}
  .pui .react .box{width:min(460px,92vw);padding:18px 24px 20px;background:rgba(18,15,12,.94);border-top:4px solid var(--c,#b8a27a);text-align:left}
  .pui .react .k{font-size:12px;letter-spacing:.14em;color:#cdbb95}.pui .react .t{font-size:22px;font-weight:600;margin:6px 0}
  .pui .react .x{font-size:14px;line-height:1.5;color:#e9e0cc}.pui .react .btns{display:flex;gap:10px;margin-top:16px}
  .pui .react .btns button{flex:1;font-size:15px;letter-spacing:.08em;padding:9px 0;border:1px solid #d8b774;background:#7a5a2a}
  .pui .react .btns button[data-react=reject]{background:rgba(255,255,255,.06);border-color:rgba(233,224,204,.4)}
  `;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const num = (n) => Math.round(n).toLocaleString('vi-VN');
  const WIN_KIND = { unify: 'thống nhất thiên hạ', last: 'là phe cuối cùng còn đứng', hegemon: 'xưng bá khi hết lượt' };

  // o: { meta (world.meta), roster (GameController roster()), colors, actions (Engine.ACTIONS), bandText, pressureText,
  //      statHelp, intelWords (GameController.intelWords), onChoose(fid), onSubmit(decision|null), onSkip(), makeDecision(action, choice), validate(decision),
  //      onMark(marks) }
  U.create = function (o) {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    const el = document.createElement('div'); el.className = 'pui';
    el.innerHTML = `<div class="panel status hide"></div><div class="panel orders hide"></div><div class="panel rank hide"></div><div class="panel news hide"></div>
      <div class="panel bar hide"><span class="bt"></span><button data-role="skip">Bỏ qua</button></div><div class="veil start"></div><div class="veil react hide"></div><div class="veil over hide"></div>`;
    document.body.appendChild(el);
    const q = (s) => el.querySelector(s), statusEl = q('.status'), ordersEl = q('.orders'), rankEl = q('.rank'), newsEl = q('.news'), barEl = q('.bar'), startEl = q('.start'), reactEl = q('.react'), overEl = q('.over');
    const col = (fid) => o.colors[fid] || '#8a8070', glyph = (fid) => (o.roster.find((r) => r.fid === fid) || {}).glyph || '';
    const band = (b) => o.bandText[b] || o.bandText.unknown;
    const help = o.statHelp || {};
    // what is known of another faction's army: its troop band, and when it was last seen if not a neighbour now
    const known = (x) => band(x.troopBand) + (!x.adjacent && x.lastSeenTurn ? ' · lượt ' + x.lastSeenTurn : '');
    const claim = (x) => (x.claimedIdentity && x.claimedIdentity !== x.label ? ' · tự xưng ' + esc(x.claimedIdentity) : '');
    // province intel (DecisionContext.provinceIntel) in the controller's words (GameController.intelWords)
    const words = o.intelWords, intelLine = (I) => words(I).line;
    const intelBox = (I) => { const w = words(I); return `<div class="intel" data-intel="${esc(I.source)}"><span>Quân</span><b>${esc(w.band)} · ${esc(w.fresh)}</b><span>Tướng giữ thành</span><b>${esc(w.commander)}</b><span>Lũy</span><b>${esc(w.fort)}</b></div>`; };
    const turnsLeft = (p) => (p.remainingTurns > 0 ? 'còn ' + p.remainingTurns + ' lượt' : 'lượt cuối');
    const ui = { el };
    let status = null, options = null, locked = false, pick = { action: null, c: {} };
    barEl.querySelector('button').onclick = () => o.onSkip();

    // ------------------------------------------------------------ start: one of the four emperors
    startEl.innerHTML = `<div class="box"><h1>${esc(o.meta.title)}</h1><div class="era">${esc(o.meta.era)}</div><div class="desc">${esc(o.meta.description)}</div>
      <div class="cards">${o.roster.map((p) => `<button data-fid="${p.fid}" style="--c:${col(p.fid)}" disabled>
        <div class="gl">${esc(p.glyph)}</div><div class="n">${esc(p.name)}</div><div class="d">${esc(p.courtesy)} · ${esc(p.dynasty)}</div>
        <div class="s">Trấn ${esc(p.seatCity)}<br>${num(p.troops)} quân · Uy ${p.prestige}</div></button>`).join('')}</div>
      <div class="foot">Chọn một hoàng đế. Sáu phe còn lại do máy điều khiển. <span class="ld">Đang dựng thiên hạ…</span></div></div>`;
    startEl.querySelectorAll('[data-fid]').forEach((b) => { b.onclick = () => o.onChoose(b.dataset.fid); });
    ui.ready = () => { startEl.querySelectorAll('[data-fid]').forEach((b) => { b.disabled = false; }); startEl.querySelector('.ld').textContent = ''; };
    ui.showStart = () => { startEl.classList.remove('hide'); overEl.classList.add('hide'); for (const p of [statusEl, ordersEl, rankEl, barEl, newsEl]) p.classList.add('hide'); };

    // ------------------------------------------------------------ realm status and faction panel
    // guest protection exactly as the engine states it for the player (self.guestProtection)
    const guestBlock = (G) => {
      if (!G) return '';
      const names = (l) => l.map((x) => esc(x.label)).join(', ');
      const broken = G.brokenAgainst.length ? `<div>Đã phá ước với: ${names(G.brokenAgainst)} — phe này được đánh ta.</div>` : '';
      if (G.active) return `<div class="guest" data-role="guest" data-active="1"><div class="h">BẢO HỘ KHÁCH · CÒN ${G.remainingTurns} MÙA</div>${G.protectedFrom.length ? `<div>Không bị đánh bởi: ${names(G.protectedFrom)}</div>` : '<div>Không còn phe Tam Quốc nào bị ràng buộc.</div>'}${broken}</div>`;
      const why = G.ended === 'expanded' ? 'Bảo hộ đã chấm dứt sau khi mở rộng lãnh thổ.' : G.ended === 'expired' ? 'Bảo hộ khách đã hết.' : 'Bảo hộ khách không còn hiệu lực.';
      return `<div class="guest off" data-role="guest" data-active="0"><div class="h">BẢO HỘ KHÁCH</div><div>${why}</div>${broken}</div>`;
    };
    const drawStatus = () => {
      const P = status.player, W = status.world;
      statusEl.style.setProperty('--c', col(P.fid));
      const stat = (k, v, l) => `<div title="${esc(help[k] || '')}" data-stat="${k}"><b>${v}</b><span>${l}</span></div>`;
      statusEl.innerHTML = `<div class="top"><div class="gl" style="--c:${col(P.fid)}">${esc(glyph(P.fid))}</div><div>
          <div class="tn">LƯỢT ${status.turn}/${status.maxTurns} · ${esc(status.calendar.season.toUpperCase())} NĂM ${status.calendar.year}</div><div class="nm">${esc(P.name)}</div></div><button class="new" data-role="new">Ván mới</button></div>
        <div class="stats">${stat('troops', num(P.troops), 'Quân')}${stat('grain', num(P.grain), 'Lương')}${stat('loyalty', Math.round(P.loyalty), 'Dân tâm')}${stat('prestige', Math.round(P.prestige), 'Uy')}</div>
        ${P.alive ? `<div class="sub">Mỗi mùa: thu ${num(P.income)} · nuôi quân ${num(P.upkeep)} lương</div>
        <div class="sub">Châu (${P.provinces.length})</div><div class="chips">${P.provinces.map((p) => `<span class="${p.seat ? 'seat' : ''}">${esc(p.city)}${p.fort ? ' · lũy ' + p.fort : ''}</span>`).join('')}</div>
        <div class="sub" data-role="pacts">Minh ước: ${P.pacts.length ? P.pacts.map((x) => `<b>${esc(x.label)}</b> · đến lượt ${x.untilTurn} (${turnsLeft(x)})`).join('; ') : 'chưa có'}</div>
        ${guestBlock(P.guest)}` : '<div class="sub">Phe đã diệt vong.</div>'}`;
      statusEl.querySelector('[data-role=new]').onclick = () => { if (!locked) ui.showStart(); };
      // own row exact; the others as perceived (public label, province count, troop band)
      const rows = status.factions.map((f) => `<div class="r ${f.alive ? '' : 'dead'} ${f.me ? 'me' : ''}"><i style="--c:${col(f.fid)}"></i><span>${esc(f.label)}${f.me ? '' : `<small>${claim(f)}</small>`}</span><span>${f.provinces}</span><span>${f.me ? num(f.troops) : known(f)}</span></div>`).join('');
      const press = W.pressure.filter((x) => x.level !== 'none');
      rankEl.innerHTML = `<div class="r hd"><i></i><span>CÁC PHE</span><span>châu</span><span>quân</span></div>${rows}
        <div class="pl" data-role="pressure">Áp lực biên giới: ${press.length ? press.map((x) => `<b>${esc(x.label)}</b> — <span class="${x.level}">${esc(o.pressureText[x.level])}</span>`).join('; ') : esc(o.pressureText.none).toLowerCase()}</div>
        ${W.pacts.length ? `<div class="pl" data-role="world-pacts">Minh ước thiên hạ: ${W.pacts.map((e) => `<b>${esc(e.aLabel)}</b> – <b>${esc(e.bLabel)}</b> (đến lượt ${e.untilTurn})`).join('; ')}</div>` : ''}`;
    };

    // ------------------------------------------------------------ orders: the five engine actions and their inputs
    const row = (attrs, main, side, c, on, disabled) => `<button class="row${on ? ' on' : ''}" ${attrs} style="--c:${c}"${disabled ? ' disabled' : ''}><span>${main}</span><small>${side}</small></button>`;
    const body = () => {
      const a = pick.action, c = pick.c;
      if (!a) return '<div class="note">Chọn một lệnh cho mùa này. Mọi phe ra lệnh cùng lúc; trọng tài xử theo thứ tự củng cố → nội chính → ngoại giao → mưu → tấn công.</div>';
      if (a === 'attack') {
        const t = options.attack.find((x) => x.pid === c.target);
        return `<div class="grp">Châu giáp ranh (đích)</div>${options.attack.map((x) => row(`data-target="${x.pid}"`, esc(x.city), `${esc(x.ownerLabel)}${x.pact ? ' · minh hữu' : ''} · ${esc(intelLine(x.intel))}`, col(x.owner), c.target === x.pid)).join('')}
          ${t ? `<div class="grp">${esc(t.city)} · ${esc(t.ownerLabel)}${claim({ claimedIdentity: t.claimedIdentity, label: t.ownerLabel })}</div>${intelBox(t.intel)}` : ''}
          ${t && t.via.length > 1 ? `<div class="grp">Xuất quân từ</div>${t.via.map((v) => row(`data-from="${v.pid}"`, esc(v.city) + (v.seat ? ' (thủ phủ)' : ''), '', col(status.player.fid), c.from === v.pid)).join('')}` : ''}
          ${t ? `<div class="sub">${t.via.length > 1 ? (c.from ? '' : 'Chưa chọn nơi xuất quân: trọng tài chọn, ưu tiên thủ phủ. ') : `Xuất quân từ ${esc(t.via[0].city)}. `}Trọng tài xử thắng thua.</div>` : ''}
          ${t && t.pact ? `<label class="check"><input type="checkbox" data-betray ${c.betray ? 'checked' : ''}> Bội minh với ${esc(t.ownerLabel)}</label>` : ''}
          ${!t && options.far.length ? `<div class="grp">Tin cũ các châu xa (không đánh được)</div>${options.far.map((x) => `<div class="row" data-far="${x.pid}" style="--c:${col(x.owner)}"><span>${esc(x.city)}</span><small>${esc(x.ownerLabel)} · ${esc(intelLine(x.intel))}</small></div>`).join('')}` : ''}`;
      }
      if (a === 'diplomacy') {
        const D = options.diplomacy;
        return `<div class="grp">Chiêu hàng châu trung lập giáp ranh</div>${D.annex.length ? D.annex.map((x) => row(`data-sub="annex" data-target="${x.pid}"`, esc(x.city), `${esc(x.ownerLabel)} · ${esc(intelLine(x.intel))}`, '#9a9486', c.sub === 'annex' && c.target === x.pid)).join('') : '<div class="note">Không có.</div>'}
          <div class="grp">Minh ước — đình chiến ${D.pactTurns} mùa</div>${D.pact.map((x) => row(`data-sub="pact" data-target="${x.fid}"`, esc(x.label) + claim(x), x.full ? 'ta đã đủ minh hữu' : 'áp lực ' + esc(o.pressureText[x.pressure]).toLowerCase(), col(x.fid), c.sub === 'pact' && c.target === x.fid)).join('')}`;
      }
      if (a === 'stratagem') {
        const S = options.stratagem;
        return `<div class="grp">Kế</div>${S.subs.map((x) => row(`data-sub="${x.id}"`, esc(x.label), esc(x.hint), '#b8a27a', c.sub === x.id)).join('')}
          <div class="grp">Nhắm vào</div>${S.targets.map((x) => row(`data-target="${x.fid}"`, esc(x.label) + claim(x), 'quân ' + known(x).toLowerCase(), col(x.fid), c.target === x.fid)).join('')}`;
      }
      if (a === 'fortify') return `<div class="grp">Châu củng cố</div>${options.fortify.map((x) => row(`data-target="${x.pid}"`, esc(x.city) + (x.seat ? ' (thủ phủ)' : ''), `lũy ${x.fort}/${x.max}`, col(status.player.fid), c.target === x.pid)).join('')}`;
      return `<div class="note">Thu lương, mộ binh, an dân ở trị sở ${esc(options.internal.city)}. Không cần chọn gì thêm.</div>`;
    };
    const current = () => (pick.action ? o.makeDecision(pick.action, pick.c) : null);
    // the map shows the pending order: every legal attack target (frontier), the chosen one, where the army sets out from
    const mark = () => {
      const a = pick.action, c = pick.c; let m = {};
      if (a === 'attack') {
        m = { front: options.attack.map((x) => x.pid) };
        if (c.target) Object.assign(m, { pick: c.target, via: c.from ? [c.from] : options.attack.find((x) => x.pid === c.target).via.map((v) => v.pid) });
      } else if ((a === 'fortify' || (a === 'diplomacy' && c.sub === 'annex')) && c.target) m = { pick: c.target };
      else if (a === 'internal') m = { pick: options.internal.seat };
      else if (c.target && status.factions.some((f) => f.fid === c.target)) m = { faction: c.target }; // its provinces, from the public map
      o.onMark(m);
    };
    const drawOrders = () => {
      const P = status.player;
      ordersEl.style.setProperty('--c', col(P.fid));
      if (status.over) { ordersEl.innerHTML = '<h3>THIÊN HẠ ĐÃ ĐỊNH</h3>'; return; }
      if (!P.alive) { ordersEl.innerHTML = '<h3>PHE ĐÃ DIỆT VONG</h3><div class="note">Không còn nhận lệnh. Có thể xem các mùa tiếp theo.</div><div class="go"><button data-role="submit">Xem lượt tiếp</button></div>'; ordersEl.querySelector('[data-role=submit]').onclick = () => o.onSubmit(null); return; }
      const d = current(), why = d ? o.validate(d) : 'Chưa chọn lệnh.';
      ordersEl.innerHTML = `<h3>LỆNH MÙA NÀY</h3><div class="acts">${Object.keys(o.actions).map((k) => `<button data-action="${k}" class="${pick.action === k ? 'on' : ''}"${options.available[k] ? '' : ' disabled'}>${esc(o.actions[k].label)}</button>`).join('')}</div>
        <div class="body">${body()}</div><div class="go"><button data-role="submit"${why ? ' disabled' : ''}>Ban lệnh</button><span class="why">${esc(why || '')}</span></div>`;
      ordersEl.querySelectorAll('[data-action]').forEach((b) => { b.onclick = () => { pick = { action: b.dataset.action, c: {} }; drawOrders(); mark(); }; });
      ordersEl.querySelectorAll('.body [data-target], .body [data-sub], .body [data-from]').forEach((b) => { b.onclick = () => {
        if (b.dataset.from) { pick.c.from = b.dataset.from; drawOrders(); mark(); return; }
        if (b.dataset.sub) pick.c.sub = b.dataset.sub;
        if (b.dataset.target) pick.c.target = b.dataset.target;
        if (pick.action === 'attack') { pick.c.betray = false; pick.c.from = null; }
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
    // once "Ban lệnh" is pressed the order is committed: the menu stays closed through envoys and playback
    ui.lock = (on) => {
      locked = on;
      for (const p of [statusEl, ordersEl, newsEl]) p.classList.toggle('hide', on);
      barEl.classList.toggle('hide', !on);
      o.onMark({});
      if (on) { barEl.style.setProperty('--c', col(status.player.fid)); barEl.querySelector('.bt').textContent = 'Trọng tài đang xử lượt…'; }
      else reactEl.classList.add('hide');
    };
    let barTurn = '';
    ui.progress = (i, n, entry) => {
      if (entry) barTurn = `Lượt ${entry.turn} · ${entry.calendar.season} năm ${entry.calendar.year}`;
      barEl.querySelector('.bt').textContent = n ? `${barTurn} — cảnh ${Math.min(Math.max(i, 1), n)}/${n}` : barTurn;
    };
    // one envoy card: resolves 'accept' | 'reject'; the offer comes from envelope.pendingReactions via the controller
    ui.react = (r, i, n) => new Promise((resolve) => {
      reactEl.innerHTML = `<div class="box" style="--c:${col(r.from)}" data-reaction="${esc(r.id)}"><div class="k">SỨ GIẢ TỚI${n > 1 ? ` · ${i + 1}/${n}` : ''}</div>
        <div class="t">${esc(r.fromLabel)} đề nghị minh ước</div>
        <div class="x">Thời hạn: ${r.turns} mùa. Hai bên không đánh nhau khi minh ước còn hiệu lực. Trả lời không tốn lệnh mùa này.</div>
        <div class="btns"><button data-react="accept">CHẤP NHẬN</button><button data-react="reject">TỪ CHỐI</button></div></div>`;
      reactEl.classList.remove('hide');
      barEl.querySelector('.bt').textContent = 'Sứ giả chờ trả lời';
      reactEl.querySelectorAll('[data-react]').forEach((b) => { b.onclick = () => { reactEl.classList.add('hide'); barEl.querySelector('.bt').textContent = 'Trọng tài đang xử lượt…'; resolve(b.dataset.react); }; });
    });
    // one compact world-news card per turn: observation.publicNews only (nothing about what the player did not see)
    ui.news = (news, entry) => {
      if (!entry) { newsEl.classList.add('hide'); return; }
      newsEl.innerHTML = `<div class="h"><span>THIÊN HẠ · LƯỢT ${entry.turn}</span><button data-role="news-close">Đóng</button></div>${news ? `<ul>${news.items.map((n) => `<li data-news="${esc(n.kind)}">${esc(n.text)}</li>`).join('')}</ul>` : '<div class="note">Không có tin đáng tin mới.</div>'}`;
      newsEl.querySelector('[data-role=news-close]').onclick = () => newsEl.classList.add('hide');
      newsEl.classList.toggle('hide', locked);
    };
    ui.gameOver = (s, win) => {
      const w = s.winner, me = s.player.fid, name = (s.factions.find((f) => f.fid === w.fid) || {}).label || (win && win.label) || '';
      overEl.innerHTML = `<div class="box"><div class="era">THIÊN HẠ ĐÃ ĐỊNH · LƯỢT ${s.turn}</div><h1 style="color:${col(w.fid)}">${esc(name)}</h1>
        <div class="res">${esc(name)} ${esc(WIN_KIND[w.kind] || w.kind)}. ${w.fid === me ? 'Bạn thắng.' : 'Bạn thua.'}</div>
        ${win ? `<div class="desc">${esc(win.text)}</div>` : ''}<button class="again" data-role="again">Ván mới</button></div>`;
      overEl.querySelector('[data-role=again]').onclick = () => ui.showStart();
      overEl.classList.remove('hide');
    };
    return ui;
  };
})();
