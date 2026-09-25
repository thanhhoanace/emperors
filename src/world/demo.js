// RuntimeEvent showcase (game.html?demo=1): the canonical fixtures, or one server turn, played on the world runtime.
//   ?demo=1          opening, guest_arrival, one tension gate, a lost and a won attack, back to the campaign
//   ?demo=1&all=1    every fixture in data/scenario/runtime-events.v1.json
//   ?demo=1&live=1   one turn from the local server (POST /api/turn); owners then follow the returned state
//   &qa=1            no autoplay: tests drive window.__game.seek(i, t)
(function () {
  window.WorldDemo = {
    async run({ rt, presenter, hud, world, gates, fixtures, params, idle, titleOf }) {
      const QA = params.has('qa'), LIVE = params.has('live');
      // A gate event exactly as the engine emits it (src/engine/attach-219.js emitGate + normalizeEvent). guest_arrival has
      // no fixture in runtime-events.v1.json; it comes from gates.json in the same v1 shape.
      const gateEvent = (id) => { const g = gates.gates.find((x) => x.id === id); return { v: 1, kind: 'gate', text: (g.emit && g.emit.text) || g.id, tone: 'neutral', id: g.id, actors: g.actors || [], shot: g.shot || null }; };
      const fx = (pred) => fixtures.events.find(pred);
      let events;
      if (LIVE) {
        const r = await fetch('/api/turn', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ seed: Number(params.get('seed')) || 219 }) }).then((x) => x.json());
        events = r.result.events; // RuntimeEvent v1 (never result.rawEvents)
        window.__liveState = r.state;
      } else if (params.has('all')) {
        events = [fx((e) => e.id === 'opening'), gateEvent('guest_arrival'), ...fixtures.events.filter((e) => e.id !== 'opening')];
      } else {
        events = [
          fx((e) => e.id === 'opening'),
          gateEvent('guest_arrival'),
          fx((e) => e.id === 'fan_xiang_stalemate'),                       // a post_turn tension gate
          fx((e) => e.kind === 'attack' && e.win === false),               // Tần: Lũng Tây → Trường An, repelled
          fx((e) => e.kind === 'attack' && e.win === true),                // Tôn: Giang Hạ → Giang Lăng, taken
        ];
      }
      const frozen = JSON.stringify(events); // QA: presentation must leave events untouched
      const ownersOf = (state) => { const o = {}; for (const [pid, p] of Object.entries(state.provinces)) if (p.owner && p.owner !== 'neutral') o[pid] = p.owner; return o; };
      const plans = events.map((ev) => presenter.plan(ev));
      Object.assign(window.__game, {
        events, plans, frozen,
        // frame i at time t (seconds), deterministic; t = 'end' → the last frame of that event
        seek(i, t) { const pl = plans[i]; const f = presenter.show(pl, t === 'end' ? pl.duration : t); rt.render(); return { view: f.view.name, mode: f.view.mode, marks: f.marks.map((m) => ({ id: m.id, kind: m.kind, fid: m.fid, p: m.p })), hud: f.hud.map((h) => ({ type: h.type, text: h.text, title: h.title, win: h.win })) }; },
        campaign() { presenter.end(); idle(); return rt.view().name; },
        ready: true,
      });
      idle();
      if (QA) return;
      await new Promise((r) => setTimeout(r, 600));
      await presenter.playAll(events, { speed: Number(params.get('speed')) || 1, onEvent: (ev) => hud.log(ev, titleOf(ev)) });
      if (LIVE && window.__liveState) rt.setOwners(ownersOf(window.__liveState)); // owners from the engine's state, not from the shots
      idle();
      window.__game.done = true;
    },
  };
})();
