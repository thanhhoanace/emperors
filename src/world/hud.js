// HUD over the world runtime: event card, actor cards, result badge, floating place labels, event log, speed.
// Minimal ink-and-paper look (docs/design/direction.md). It shows what a presenter frame carries; it holds no game state.
(function () {
  const H = (window.WorldHud = {});
  const CSS = `
  .hud{position:fixed;inset:0;pointer-events:none;font-family:"Noto Serif","Noto Serif CJK SC",Georgia,serif;color:#f3ecdc}
  .hud .card{position:absolute;left:28px;top:24px;width:430px;padding:14px 18px 16px;background:linear-gradient(90deg,rgba(18,15,12,.86),rgba(18,15,12,.62));
    border-left:4px solid var(--c,#b8a27a);opacity:0;transform:translateY(-6px);transition:opacity .35s,transform .35s}
  .hud .card.on{opacity:1;transform:none}
  .hud .card .k{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#cdbb95}
  .hud .card .t{font-size:22px;margin:3px 0 6px;font-weight:600}
  .hud .card .x{font-size:15px;line-height:1.45;color:#e9e0cc}
  .hud .card .cl{margin-top:8px;display:flex;gap:6px;flex-wrap:wrap}
  .hud .card .cl span{font-size:12px;padding:2px 8px;border:1px solid rgba(233,224,204,.4);border-radius:10px}
  .hud .actors{position:absolute;left:28px;bottom:28px;display:flex;gap:12px}
  .hud .actor{display:flex;align-items:center;gap:10px;padding:8px 14px 8px 8px;background:rgba(18,15,12,.78);border-bottom:3px solid var(--c,#888);min-width:170px}
  .hud .actor .g{width:40px;height:40px;display:grid;place-items:center;font-size:22px;background:var(--c,#666);color:#fff;border-radius:50%;
    font-family:"Noto Serif CJK SC","Noto Serif SC",serif;box-shadow:inset 0 0 0 2px rgba(255,255,255,.35)}
  .hud .actor .n{font-size:17px;font-weight:600}.hud .actor .f{font-size:12px;color:#cdbb95}
  .hud .badge{position:absolute;left:50%;top:18%;transform:translate(-50%,0) scale(.9);opacity:0;transition:opacity .3s,transform .3s;
    padding:10px 34px;font-size:40px;font-weight:700;letter-spacing:.2em;border:3px solid currentColor;background:rgba(18,15,12,.55)}
  .hud .badge.on{opacity:1;transform:translate(-50%,0) scale(1)}
  .hud .badge.win{color:#f2d27a}.hud .badge.loss{color:#e07a6a}
  .hud .lbl{position:absolute;transform:translate(-50%,-100%);white-space:nowrap;font-size:14px;padding:2px 9px;background:rgba(18,15,12,.7);
    border-bottom:2px solid var(--c,#cdbb95)}
  .hud .place{position:absolute;transform:translate(-50%,-100%);white-space:nowrap;font-size:13px;padding:1px 7px;color:#fbf6ea;background:rgba(18,15,12,.55);border-left:3px solid var(--c,#999)}
  .hud .place.seat{font-size:15px;font-weight:600;background:rgba(18,15,12,.72)}
  .hud .log{position:absolute;right:24px;top:24px;width:300px;max-height:46vh;overflow:hidden;font-size:13px;line-height:1.4}
  .hud .log div{padding:5px 10px;margin-bottom:4px;background:rgba(18,15,12,.62);border-left:3px solid var(--c,#8a7a5a)}
  .hud .log div.now{background:rgba(40,32,22,.85)}
  .hud .ctl{position:absolute;right:24px;bottom:24px;display:flex;gap:6px;pointer-events:auto}
  .hud .ctl button{font:inherit;font-size:14px;color:#f3ecdc;background:rgba(18,15,12,.78);border:1px solid rgba(233,224,204,.35);padding:6px 12px;cursor:pointer}
  .hud .ctl button.on{background:#7a5a2a;border-color:#d8b774}
  `;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CLAUSE = { truce: 'Đình chiến', alliance: 'Liên minh', joint_war: 'Cùng đánh', grain: 'Lương thảo', passage: 'Mượn đường', withdraw: 'Rút quân', recognize: 'Công nhận', break: 'Bội ước' };

  H.create = function (o) {
    const colors = o.colors || {}, glyphs = o.glyphs || {};
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    const el = document.createElement('div'); el.className = 'hud';
    el.innerHTML = '<div class="card"><div class="k"></div><div class="t"></div><div class="x"></div><div class="cl"></div></div><div class="actors"></div><div class="badge"></div><div class="places"></div><div class="labels"></div><div class="log"></div><div class="ctl"></div>';
    document.body.appendChild(el);
    const q = (s) => el.querySelector(s), cardEl = q('.card'), actorsEl = q('.actors'), badgeEl = q('.badge'), labelsEl = q('.labels'), placesEl = q('.places'), logEl = q('.log'), ctlEl = q('.ctl');
    const col = (fid) => colors[fid] || '#8a8070';
    let lastKey = '';
    const hud = { el };

    // one presenter frame → DOM (only rewritten when the set of items changes; labels move every frame)
    hud.frame = (f, rt) => {
      hud.drawPlaces(rt, f.view.mode === 'far' && !f.hud.some((h) => h.type === 'label')); // a shot's own labels replace the city names
      const card = f.hud.find((h) => h.type === 'event'), badge = f.hud.find((h) => h.type === 'badge'), act = f.hud.filter((h) => h.type === 'actors').pop();
      const key = [card && card.title, act && act.actors.map((a) => a.id).join(), badge && badge.text].join('|');
      if (key !== lastKey) {
        lastKey = key;
        cardEl.classList.toggle('on', !!card);
        if (card) {
          cardEl.style.setProperty('--c', card.fid ? col(card.fid) : '#b8a27a');
          q('.card .k').textContent = card.fid ? (o.names ? o.names.name(card.fid) : card.fid) : 'Thiên hạ';
          q('.card .t').textContent = card.title; q('.card .x').textContent = card.text || '';
          q('.card .cl').innerHTML = (card.clauses || []).map((c) => '<span>' + esc(CLAUSE[c] || c) + '</span>').join('');
        }
        actorsEl.innerHTML = act ? act.actors.map((a) => `<div class="actor" style="--c:${col(a.fid)}"><div class="g">${esc(glyphs[a.fid] || '士')}</div><div><div class="n">${esc(a.name)}</div><div class="f">${esc([a.role, a.faction].filter(Boolean).join(' · '))}</div></div></div>`).join('') : '';
        badgeEl.className = 'badge' + (badge ? ' on ' + (badge.win ? 'win' : 'loss') : '');
        badgeEl.textContent = badge ? badge.text : '';
      }
      const labels = f.hud.filter((h) => h.type === 'label');
      while (labelsEl.children.length < labels.length) labelsEl.appendChild(document.createElement('div'));
      [...labelsEl.children].forEach((d, i) => {
        const l = labels[i]; if (!l) { d.style.display = 'none'; return; }
        const p = rt.project(l.at);
        d.className = 'lbl'; d.textContent = l.text; d.style.setProperty('--c', l.fid ? col(l.fid) : '#cdbb95');
        d.style.display = p.visible ? '' : 'none'; d.style.left = p.x + 'px'; d.style.top = p.y - 6 + 'px';
      });
    };
    // the 20 cities on the campaign view, in their owner's colour (owners from the runtime, which takes them from the engine)
    let places = [];
    hud.setPlaces = (items) => { places = items; placesEl.innerHTML = ''; for (const it of items) { const d = document.createElement('div'); d.className = 'place' + (it.seat ? ' seat' : ''); d.textContent = it.text; placesEl.appendChild(d); } };
    hud.drawPlaces = (rt, on) => {
      placesEl.style.display = on ? '' : 'none';
      if (!on) return;
      const own = rt.owners();
      places.forEach((it, i) => { const d = placesEl.children[i], p = rt.project(it.at); d.style.display = p.visible ? '' : 'none'; d.style.left = p.x + 'px'; d.style.top = p.y + 'px'; d.style.setProperty('--c', own[it.pid] ? col(own[it.pid]) : '#9a9486'); });
    };
    hud.clear = () => { lastKey = ''; cardEl.classList.remove('on'); actorsEl.innerHTML = ''; badgeEl.className = 'badge'; labelsEl.innerHTML = ''; };
    hud.log = (ev, title) => {
      [...logEl.children].forEach((d) => d.classList.remove('now'));
      const d = document.createElement('div'); d.className = 'now'; d.style.setProperty('--c', ev.fid ? col(ev.fid) : '#b8a27a');
      d.textContent = (title ? title + ': ' : '') + (ev.text || ev.kind); logEl.prepend(d);
      while (logEl.children.length > 6) logEl.lastChild.remove();
    };
    // speed 1×/2×/4× (march.md) and a way back to the campaign view
    hud.controls = (onSpeed, onCampaign) => {
      ctlEl.innerHTML = '';
      for (const s of [1, 2, 4]) { const b = document.createElement('button'); b.textContent = s + '×'; b.dataset.speed = s; b.onclick = () => { onSpeed(s); [...ctlEl.children].forEach((x) => x.classList.toggle('on', x === b)); }; if (s === 1) b.classList.add('on'); ctlEl.appendChild(b); }
      if (onCampaign) { const b = document.createElement('button'); b.textContent = 'Toàn cảnh'; b.onclick = onCampaign; ctlEl.appendChild(b); }
    };
    return hud;
  };
})();
