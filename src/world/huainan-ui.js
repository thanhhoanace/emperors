// Huai Nan demo UI (v2, docs/design/v2-build.md §U): plain DOM over the 3D canvas, one injected <style>, no framework.
// It never calls the game engine: it draws the View (and the shapes in docs/design/v2-fixtures/) it is given and calls
// handlers. Look and numbers come from the approved demo 1 UI (docs/phases/v2-gameplay/demo1/ui/): fonts, TONE, kfmt,
// ink portraits, five-stat general cards with the Trung bar. Reference frame: phone landscape 844×390 (bigger screens
// scale the whole layer up to 1.4×). Every number is a number; a win percentage is never printed anywhere.
//
//   const ui = HuaiNanUI.create(root, handlers, { factions?, portraits?, towns?, battle? })
//       factions: { fid: { name, short, glyph, color } } (data/scenario/huainan.json) · portraits: base url ('…/portraits/'),
//       fn(id) → url, or { id: url } (a missing image falls back to the seal glyph) · towns: data.towns (names, terrain)
//       · battle: EmperorsBattle (default: the global)
//   ui.render(view, sel?)        HUD (Lương / Tiền / Uy with last season's change), card badge, Hết mùa (always enabled),
//                                selection panel from sel = { kind: 'army'|'town', id } | null
//   ui.armyCard(army, targets?)  targets = V2.targets(g, army.id): a list to tap besides the map
//   ui.townPanel(town, tasks)    tasks = V2.tasks(g, town.id): 2–3 suggested, "Thêm" for all
//   ui.preview(p, act?)          chip: seasons, resources before → after, lines; act goes to onConfirmOrder
//   ui.askIntent(target)         enemy town: "Đánh ngay" / "Vây"   ·   ui.forecast(f, act?, { partners?, preview? })
//   ui.cards(list?)              queue + badge; opens when the badge is tapped, or by itself for an urgent card
//   ui.battle(state)             state = V2.battle(g) (+ outcome when b.over); ui.battle.selectWing(id); ui.battle(null)
//   ui.report(r) · ui.beat({ town, from, to, siege }) a town changing hands, over the map · ui.goal(info?) · ui.over(o) · ui.close()
//   ui.labels([{ kind, id, x, y }])  map chips (town / army) at screen px, drawn centred above (x, y)
//   ui.tap({ kind, id }|null)    what a tap on the map does (chip taps call it): pick a target, or select
//   handlers: onEndSeason() onSelect(sel|null) onTarget({ army, kind, id, intent }) onForecast({ armies, kind, id, intent })
//     onPartner(armyId) onConfirmOrder(act) onCancel(what) onClearOrder(armyId) onTask(townId, key|null) onAnswer(cardId, yes)
//     onBattleOrder(wingId, order) onWingSelect(wingId) onBattleTurn(overrides) onAutoBattle() onBattleDone()
//     onReportDone() onBeatDone() onGoalDone() onAgain() onOverview()
(function () {
  'use strict';

  const ARMS = ['bo', 'cung', 'ky', 'thuy'];
  const ARM_NAME = { bo: 'Bộ', cung: 'Cung', ky: 'Kỵ', thuy: 'Thủy' };
  const LANE = ['trái', 'giữa', 'phải'];
  const STATS = [['uy', 'Uy'], ['tai', 'Tài'], ['muu', 'Mưu'], ['dung', 'Dũng'], ['kien', 'Kiên']];
  // the stat that matters for what the card is about (freeze v2: prediction → Mưu, attack → Dũng, hold → Kiên, morale → Uy, building → Tài)
  const STAT_CTX = { uy: 'sĩ khí', tai: 'xây dựng', muu: 'đọc trận', dung: 'sức đánh', kien: 'sức giữ' };
  const INTENT = { move: 'Đi tới', attack: 'Đánh', siege: 'Vây', hold: 'Giữ' };
  const TONE = { text: '#efe6d2', muted: '#b9ab8d', gold: '#e2bf6c', bad: '#f08a72', good: '#98d494' };
  const FAC = {
    zhu_yuanzhang: { name: 'Chu Nguyên Chương', short: 'Minh', glyph: '明', color: '#b3262e' },
    cao_cao: { name: 'Tào Tháo', short: 'Tào', glyph: '魏', color: '#4d6a3a' },
    sun_quan: { name: 'Tôn Quyền', short: 'Ngô', glyph: '吳', color: '#e07b24' },
    local: { name: 'Hào tộc', short: 'Hào tộc', glyph: '豪', color: '#8a7a55' },
  };
  const ICON = {
    bo: '<path d="M5 21L19 3"/><path d="M15 3h4v4"/><circle cx="8" cy="15" r="5"/>',
    cung: '<path d="M6 3c9 3 9 15 0 18"/><path d="M6 3v18"/><path d="M3 12h15"/><path d="M15 9l3 3-3 3"/>',
    ky: '<path d="M6 21l2-7-3-4 5-6 5 1 5 5-2 2-4-1-1 4 3 6"/>',
    thuy: '<path d="M3 15h18l-3 5H6z"/><path d="M12 15V3l6 9h-6"/>',
    task: '<path d="M14 4l6 6-3 3-6-6z"/><path d="M12 8L4 16l4 4 8-8"/>',
  };

  const CSS = `
.hn{position:absolute;left:0;top:0;transform-origin:0 0;pointer-events:none;overflow:hidden;color:#efe6d2;font:400 12.5px/1.35 "Be Vietnam Pro","Noto Sans","Liberation Sans","DejaVu Sans",system-ui,sans-serif;
  -webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;--mu:#b9ab8d;--go:#e2bf6c;--bd:#f08a72;--gd:#98d494;--ln:rgba(226,191,108,.3);--pn:rgba(22,18,13,.93);--rd:#9e2a1e;--rl:#f3d58f;
  --ser:"Noto Serif","Noto Serif CJK SC","Liberation Serif","DejaVu Serif",Georgia,serif;--cjk:"Noto Serif TC","Noto Serif CJK SC","WenQuanYi Zen Hei","Noto Sans CJK SC",serif}
.hn *{box-sizing:border-box;scrollbar-width:thin;scrollbar-color:rgba(226,191,108,.4) transparent}
.hn ::-webkit-scrollbar{width:5px}.hn ::-webkit-scrollbar-thumb{background:rgba(226,191,108,.4);border-radius:3px}
.hn button{font:inherit;color:inherit;margin:0;padding:0;text-align:left;cursor:pointer;-webkit-appearance:none;appearance:none;background:none;border:0}
.hn .x{display:none!important}
.hn b{font-weight:700}
.hn .num{font-variant-numeric:tabular-nums}
.hn .pn{position:absolute;pointer-events:auto;background:var(--pn);border:1px solid var(--ln);border-radius:12px;padding:9px 12px 11px;display:flex;flex-direction:column;gap:6px}
.hn .bt{min-height:40px;padding:6px 10px;border-radius:9px;border:1px solid rgba(226,191,108,.4);background:rgba(255,255,255,.05);display:flex;flex-direction:column;justify-content:center;gap:1px;pointer-events:auto}
.hn .bt.pr{background:var(--rd);border-color:var(--rl);color:#fbf1dc;font-weight:700}
.hn .bt:disabled{opacity:.45;cursor:default}
.hn .bt small{font-size:10.5px;font-weight:400;color:var(--mu)}.hn .bt.pr small{color:#f0dccb}
.hn .sq{width:40px;height:40px;flex:none;border-radius:9px;border:1px solid rgba(226,191,108,.3);display:grid;place-items:center;pointer-events:auto}
.hn .sq svg{width:18px;height:18px;stroke:#efe6d2;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.hn .ic{width:13px;height:13px;flex:none;stroke:currentColor;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;vertical-align:-2px}
.hn .bad{color:var(--bd)}.hn .good{color:var(--gd)}.hn .gold{color:var(--go)}.hn .mu{color:var(--mu)}
.hn .ser{font-family:var(--ser)}
/* portraits and seals: the glyph is always there, the ink portrait sits on top when it loads */
.hn .pt{position:relative;flex:none;width:36px;height:36px;border-radius:50%;background:var(--c,#555);display:grid;place-items:center;font:700 19px var(--cjk);color:#f6eedb;box-shadow:0 0 0 2.5px var(--c,#555);overflow:hidden}
.hn .pt img{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;background:#efe3c8}
.hn .pt.L{width:50px;height:50px;border-radius:10px;font-size:26px}
.hn .pt.M{width:46px;height:46px;border-radius:9px;font-size:24px}
/* top bar */
.hn-hud{position:absolute;left:10px;top:8px;display:flex;align-items:stretch;gap:6px;pointer-events:none}
.hn-hud .seal{width:40px;height:40px;align-self:center;border-radius:50%;display:grid;place-items:center;font:700 22px var(--cjk);color:#f6eedb;box-shadow:0 0 0 2px rgba(246,238,219,.75)}
.hn-hud .nm,.hn-hud .rs{padding:3px 9px;border-radius:8px;background:rgba(22,18,13,.8);display:flex;flex-direction:column;justify-content:center}
.hn-hud .nm b{font:700 14px var(--ser);color:#f6eedb;white-space:nowrap}
.hn-hud .nm span,.hn-hud .rs .k,.hn-hud .rs small{font-size:10.5px;color:var(--mu);white-space:nowrap}
.hn-hud .rs{min-width:80px}
.hn-hud .rs b{font-size:15px;line-height:1.25;font-variant-numeric:tabular-nums;white-space:nowrap}
.hn-hud .rs.w{box-shadow:inset 0 0 0 1px var(--bd)}
.hn-hud .rs .k i{font-style:normal;font-weight:700;color:var(--bd)}
.hn-hud .rs small em{font-style:normal;font-variant-numeric:tabular-nums}
.hn-tr{position:absolute;right:10px;top:8px;display:flex;gap:6px}
.hn-tr .sq{background:rgba(22,18,13,.82);font:700 19px var(--ser);color:var(--go)}
.hn-tr .cb{height:42px;padding:0 13px;border-radius:10px;border:1px solid var(--go);background:rgba(90,62,20,.92);font-weight:700;font-size:13px;color:#f6e2b0;pointer-events:auto;display:flex;align-items:center}
.hn-tr .cb.u{animation:hnp 1.4s ease-in-out infinite}
@keyframes hnp{50%{box-shadow:0 0 0 4px rgba(226,191,108,.35)}}
.hn .hn-end{position:absolute;right:10px;bottom:10px;width:184px;height:54px;border-radius:12px;border:1px solid var(--rl);background:var(--rd);box-shadow:0 6px 18px rgba(0,0,0,.35);
  display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:auto;text-align:center}
.hn-end b{font:700 17px var(--ser);color:#fbf1dc}.hn-end span{font-size:10.5px;color:#f3d9c2;padding:0 6px;line-height:1.25}.hn-end.w span{color:#ffd2c4;font-weight:600}
/* selection panel (left) */
.hn .hn-side{left:10px;top:56px;width:304px;max-height:calc(100% - 66px);overflow-y:auto;overscroll-behavior:contain}
.hn .ph{display:flex;gap:9px;align-items:center}
.hn .pi{flex:1;min-width:0;display:flex;flex-direction:column}
.hn .pi .nm{font:700 16px/1.2 var(--ser);color:#f6eedb}
.hn .pi .cl2{font-size:11.5px;color:var(--mu)}
.hn .xb{width:40px;height:40px;flex:none;border-radius:8px;border:1px solid rgba(226,191,108,.25);display:grid;place-items:center;pointer-events:auto;align-self:flex-start}
.hn .xb svg{width:14px;height:14px;stroke:#efe6d2;stroke-width:2.4;stroke-linecap:round;fill:none}
.hn .lo{font-size:11.5px;display:flex;flex-direction:column;gap:2px;margin-top:2px}
.hn .tr{position:relative;height:6px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden}
.hn .tr i{display:block;height:100%}.hn .tr u{position:absolute;top:0;width:1px;height:100%;background:rgba(255,255,255,.55)}
.hn .st{display:grid;grid-template-columns:repeat(5,1fr);gap:4px}
.hn .st div{padding:2px 4px 3px;border-radius:6px;border:1px solid transparent}
.hn .st div.f{border-color:rgba(226,191,108,.7);background:rgba(226,191,108,.1)}
.hn .st span{font-size:10.5px;color:var(--mu)}.hn .st div.f span{color:var(--go)}
.hn .st b{margin-left:2px;font-size:11.5px}.hn .st em{display:block;font-style:normal;font-size:9.5px;line-height:1.2;color:var(--go);white-space:nowrap}
.hn .bar{height:4px;border-radius:2px;background:rgba(255,255,255,.1);overflow:hidden;margin-top:2px}.hn .bar i{display:block;height:100%}
.hn .ell{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hn .note{font-size:11px;line-height:1.35;color:var(--mu)}
.hn .txt{font-size:11.5px;line-height:1.4;color:#ddd0b3}
.hn .box{padding:6px 8px;border-radius:8px;background:rgba(255,255,255,.05);display:flex;flex-wrap:wrap;gap:3px 11px;align-items:center}
.hn .box .u{display:flex;align-items:center;gap:3px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}
.hn .box .w100{width:100%;font-size:11px;color:var(--mu)}
.hn .fx2{display:grid;grid-template-columns:1fr 1fr;gap:3px 10px}.hn .fx2 span{font-size:12px;color:var(--mu);white-space:nowrap}.hn .fx2 b{color:#f6eedb}
.hn .od{display:flex;align-items:center;justify-content:space-between;gap:8px}
.hn .od .ol{font-size:10.5px;color:var(--mu);text-transform:uppercase;letter-spacing:.05em}
.hn .od b{font-size:13.5px}.hn .od>div:first-child{min-width:0}.hn .od .ol{display:block}
.hn .od .bt{flex:none;min-height:40px}
.hn .sec{font-size:10.5px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--mu);margin-top:2px}
.hn .lst{display:grid;grid-template-columns:1fr 1fr;gap:5px}
.hn .tg{min-height:44px;padding:4px 9px;border-radius:9px;border:1px solid rgba(240,138,114,.5);background:rgba(96,28,20,.45);display:flex;flex-direction:column;justify-content:center;min-width:0;pointer-events:auto}
.hn .tg.mv{border-color:rgba(226,191,108,.5);background:rgba(90,62,20,.4)}.hn .tg.on{box-shadow:inset 0 0 0 1.5px var(--go)}
.hn .tg b{font-size:13px;color:#f6eedb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hn .tg span{font-size:10.5px;color:#ead2c6;white-space:nowrap}
.hn .tk{min-height:42px;padding:4px 10px;border-radius:9px;border:1px solid rgba(226,191,108,.25);background:rgba(255,255,255,.04);display:flex;flex-direction:column;gap:1px;pointer-events:auto}
.hn .tk.on{border-color:var(--go);background:rgba(226,191,108,.2)}.hn .tk:disabled{opacity:.55;cursor:default}
.hn .tk .t1{display:flex;justify-content:space-between;gap:8px;align-items:baseline}.hn .tk .t1 b{font-size:12.5px;color:#f6eedb}.hn .tk .t1 em{font-style:normal;font-size:11px;color:var(--go);white-space:nowrap}
.hn .tk .t2{font-size:10.5px;line-height:1.3;color:var(--mu);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hn .tk .t2 i{font-style:normal;color:var(--bd);font-weight:600}
.hn .more{min-height:40px;border-radius:9px;border:1px dashed rgba(226,191,108,.4);display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:600;color:var(--go);pointer-events:auto}
/* bottom dock: preview chip and the attack / siege question */
.hn-dock{position:absolute;left:322px;right:204px;bottom:10px;padding:8px 10px 10px;background:var(--pn);border:1px solid var(--go);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.4);display:flex;flex-direction:column;gap:5px;pointer-events:auto}
.hn-dock .h{display:flex;justify-content:space-between;align-items:baseline;gap:8px}.hn-dock .h b{font:700 14px var(--ser);color:#f6eedb}.hn-dock .h span{font-size:12px;font-weight:600;color:var(--go);white-space:nowrap}
.hn-dock .rr{display:flex;flex-wrap:wrap;gap:3px 12px;font-size:12px;font-variant-numeric:tabular-nums}.hn-dock .rr span{white-space:nowrap}.hn-dock .rr em{font-style:normal;color:var(--mu)}
.hn-dock .ln{font-size:11px;line-height:1.35;color:#ddd0b3}
.hn-dock .bb{display:flex;gap:8px}.hn-dock .bb .bt{flex:1}
.hn-dock .ask{display:grid;grid-template-columns:1fr 1fr;gap:8px}
/* cards */
.hn .hn-card{left:10px;top:56px;width:452px;max-height:calc(100% - 66px);overflow-y:auto;overscroll-behavior:contain;border-color:var(--go);box-shadow:0 10px 30px rgba(0,0,0,.45)}
.hn-card .k{font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase}
.hn-card .ti{font:700 17px/1.25 var(--ser);color:#f6eedb}
.hn-card .tx{font-size:13px;line-height:1.45;color:#e6dbc3}
.hn-card .gb{display:flex;flex-direction:column;gap:4px;padding:6px 9px;border-radius:9px;background:rgba(255,255,255,.05);border:1px solid rgba(226,191,108,.2)}
.hn-card .yn{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.hn-card .yn .bt{min-height:66px;justify-content:flex-start;padding:7px 10px;gap:3px}.hn-card .yn .bt b{font-size:13.5px}.hn-card .yn .bt small{font-size:11px;line-height:1.32;white-space:normal}
.hn-card .pg{display:flex;align-items:center;gap:4px}.hn-card .pg .bt{min-height:40px;width:40px;padding:0;align-items:center;font-size:18px}.hn-card .pg .bt.l{width:auto;padding:0 12px;font-size:12px}
/* forecast (takes the left slot) */
.hn .hn-fc{border-color:var(--go);overflow:hidden;gap:6px}
.hn-fc .fcb{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:6px;overscroll-behavior:contain}
.hn-fc .lb2{font:700 26px/1.1 var(--ser)}
.hn-fc .sc5{display:flex;gap:3px;margin-top:4px}.hn-fc .sc5 i{flex:1;height:5px;border-radius:2px;background:rgba(255,255,255,.14)}
.hn-fc .two{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.hn-fc .two div{display:flex;flex-direction:column;padding:5px 8px;border-radius:8px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05)}
.hn-fc .two div.me{background:rgba(179,38,46,.18);border-color:rgba(179,38,46,.5)}
.hn-fc .two .k{font-size:10.5px;color:var(--mu)}.hn-fc .two b{font-size:17px;font-variant-numeric:tabular-nums}.hn-fc .two .l{font-size:11px;color:#ddd0b3}
.hn-fc .rs2{display:flex;justify-content:space-between;gap:8px;font-size:12px;line-height:1.3}.hn-fc .rs2 b{white-space:nowrap;font-size:11.5px;font-variant-numeric:tabular-nums}
.hn-fc .pp{display:flex;flex-wrap:wrap;gap:5px}.hn-fc .pp .bt{min-height:40px;padding:4px 9px;flex-direction:row;align-items:center}
.hn-fc .bb{display:flex;gap:8px}.hn-fc .bb .bt{flex:1}
/* map chips */
.hn-hint{position:absolute;left:10px;bottom:10px;max-width:290px;padding:6px 10px;border-radius:8px;background:rgba(22,18,13,.78);font-size:11.5px;line-height:1.4;color:#d8cbb0;pointer-events:none}
.hn-lab{position:absolute;left:0;top:0;width:0;height:0;pointer-events:none}
.hn .lb{position:absolute;left:0;top:0;display:flex;align-items:center;gap:6px;padding:3px 7px 3px 4px;border-radius:8px;border:1px solid rgba(226,191,108,.35);background:rgba(22,18,13,.84);pointer-events:auto;white-space:nowrap}
.hn .lb.tw{flex-direction:column;gap:0;padding:3px 8px;min-width:96px;align-items:center;justify-content:center;min-height:40px}
.hn .lb.on{border-color:var(--go);box-shadow:0 0 0 1px var(--go)}.hn .lb.tgt{border-color:var(--bd);background:rgba(96,28,20,.9);box-shadow:0 0 0 1px var(--bd)}.hn .lb.tgt.mv{border-color:var(--go);background:rgba(90,62,20,.92);box-shadow:0 0 0 1px var(--go)}
.hn .lb .n{display:flex;align-items:center;gap:5px;font:700 13px var(--ser);color:#f6eedb}.hn .lb .dot{width:9px;height:9px;border-radius:50%;box-shadow:0 0 0 1.5px rgba(246,238,219,.7)}
.hn .lb .s{font-size:10.5px;color:#c9bb9c;font-variant-numeric:tabular-nums}
.hn .lb .ai{display:flex;flex-direction:column;min-width:0}.hn .lb .ai b{font-size:12px;color:#f6eedb;max-width:118px;overflow:hidden;text-overflow:ellipsis}
.hn .lb .au{display:flex;gap:7px;font-size:11px;font-weight:600;color:#ddd0b3;font-variant-numeric:tabular-nums}.hn .lb .au span{display:flex;align-items:center;gap:2px}
.hn .lb .ao{font-size:10px;color:var(--mu)}
/* battle */
.hn-bt{position:absolute;left:10px;top:8px;display:flex;gap:8px;align-items:stretch;pointer-events:none}
.hn-bt .tn{padding:0 13px;border-radius:9px;background:var(--rd);border:1px solid var(--rl);font:700 17px var(--ser);color:#fbf1dc;display:flex;align-items:center;white-space:nowrap}
.hn-bt .tt{padding:3px 10px;border-radius:8px;background:rgba(22,18,13,.8);display:flex;flex-direction:column;justify-content:center}.hn-bt .tt b{font:700 14px var(--ser);color:#f6eedb;white-space:nowrap}.hn-bt .tt span{font-size:10.5px;color:var(--mu);white-space:nowrap}
.hn .hn-wl{left:10px;top:56px;width:214px;max-height:calc(100% - 66px);overflow-y:auto;padding:6px;gap:4px;overscroll-behavior:contain}
.hn-wl .hd{font-size:10.5px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--mu);padding:1px 3px}
.hn .wr{min-height:44px;padding:4px 6px;border-radius:8px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);display:flex;align-items:center;gap:6px;pointer-events:auto}
.hn .wr.on{border-color:var(--go);background:rgba(226,191,108,.16)}.hn .wr.gone{opacity:.45;min-height:26px;pointer-events:none}
.hn .wr .ic{width:17px;height:17px}
.hn .wr .wi{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.hn .wr .wi b{font-size:12px;font-variant-numeric:tabular-nums;color:#f6eedb}.hn .wr .wi b span{font-weight:400;color:var(--mu);font-size:10.5px}
.hn .wr .ln2{display:flex;align-items:center;gap:6px;font-size:10px;color:var(--mu);white-space:nowrap}.hn .wr .mo{flex:1;height:3px;border-radius:2px;background:rgba(255,255,255,.12);overflow:hidden}.hn .wr .mo i{display:block;height:100%}
.hn .wr .od2{flex:none;width:68px;text-align:center;display:flex;flex-direction:column;align-items:center}
.hn .wr .od2 b{display:block;width:100%;padding:2px 2px;border-radius:6px;background:rgba(255,255,255,.07);font-size:11px;white-space:nowrap;color:#f6eedb}.hn .wr .od2 small{font-size:9.5px;color:var(--mu)}
.hn .wr .od2.ch b{background:var(--go);color:#1b150e}.hn .wr .od2.ch small{color:var(--go)}
.hn .hn-wc{left:234px;bottom:10px;width:354px;padding:7px 7px 7px;gap:4px}
.hn-wc .hd{display:flex;justify-content:space-between;gap:8px;font-size:11.5px}.hn-wc .hd b{color:#f6eedb}
.hn-wc .os{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:3px}
.hn-wc .os .bt{min-height:44px;padding:2px 2px;align-items:center;text-align:center;font-size:11.5px;font-weight:700;line-height:1.15;justify-content:center;gap:0}
.hn-wc .os .bt.on{background:var(--go);border-color:var(--go);color:#1b150e}.hn-wc .os .bt small{font-size:9px;color:var(--go);font-weight:600}.hn-wc .os .bt.on small{color:#4a3510}
.hn-wc .tp{font-size:11px;line-height:1.3;color:#ddd0b3;min-height:14px}
.hn .hn-lg{right:10px;top:56px;width:244px;max-height:calc(100% - 128px);overflow-y:auto;overscroll-behavior:contain;gap:5px;padding:8px 10px 10px}
.hn-lg .en{display:flex;flex-wrap:wrap;gap:3px 8px;font-size:11px;font-variant-numeric:tabular-nums}.hn-lg .en span{display:flex;align-items:center;gap:2px;white-space:nowrap}.hn-lg .en .gn{opacity:.4;text-decoration:line-through}
.hn-lg .lt{font-size:10.5px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--mu);margin-top:3px}
.hn-lg .ev{font-size:11.5px;line-height:1.3}
.hn-lg .res{display:flex;flex-direction:column;gap:1px}.hn-lg .res b{font:700 20px/1.15 var(--ser)}
.hn-bb{position:absolute;right:10px;bottom:10px;width:244px;display:flex;gap:8px;pointer-events:none}
.hn-bb .bt{height:54px;justify-content:center;align-items:center;text-align:center}
.hn-bb .bt:first-child{width:96px;flex:none;font-size:13px;font-weight:600;background:rgba(22,18,13,.9)}.hn-bb .bt.pr{flex:1;font:700 16px var(--ser)}
/* full screens */
.hn-full{position:absolute;left:0;top:0;right:0;bottom:0;background:rgba(10,8,6,.62);pointer-events:auto;display:grid;place-items:center;padding:12px}
.hn-full .fp{max-height:100%;width:min(720px,100%);overflow-y:auto;padding:14px 20px 16px;border:1px solid var(--go);border-radius:16px;background:rgba(24,19,14,.97);display:flex;flex-direction:column;gap:9px;box-shadow:0 12px 40px rgba(0,0,0,.5)}
.hn-full .fp.nr{width:min(560px,100%)}
.hn-full .h1{font:700 21px/1.2 var(--ser);color:#f6eedb}.hn-full .h2{font-size:11.5px;color:var(--mu)}
.hn-full .tri{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
.hn-full .tri div{display:flex;flex-direction:column;gap:3px;padding:8px 10px;border-radius:11px;border:1px solid var(--c);background:var(--b)}
.hn-full .tri b{font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:var(--c)}.hn-full .tri span{font-size:12.5px;line-height:1.4;color:#e6dbc3}
.hn-full .gl{display:flex;flex-direction:column;gap:3px}.hn-full .gl span{font-size:13px;line-height:1.4}
.hn-full .fb{display:flex;justify-content:space-between;gap:10px;padding:6px 10px;border-radius:9px;border:1px solid var(--c);background:rgba(255,255,255,.04);font-size:12.5px}.hn-full .fb b{color:var(--c)}
.hn-full .in{display:flex;gap:8px}.hn-full .in div{flex:1;padding:5px 9px;border-radius:9px;background:rgba(255,255,255,.05);display:flex;flex-direction:column}
.hn-full .in span{font-size:10.5px;color:var(--mu)}.hn-full .in b{font-size:15px;font-variant-numeric:tabular-nums}
.hn-full .go{min-height:46px;border-radius:11px;border:1px solid var(--rl);background:var(--rd);font:700 15px var(--ser);color:#fbf1dc;text-align:center;display:flex;align-items:center;justify-content:center}
.hn-full .fp.ov{width:min(640px,100%);align-items:flex-start}.hn-full .ov .h1{font-size:30px}.hn-full .ov .why{font-size:15px;line-height:1.5;color:#f6eedb}
.hn-full .fp .go{align-self:stretch}
/* a town changing hands: a card at the bottom, the map (camera on the town) left in view */
.hn-full.beat{background:none;place-items:end center;pointer-events:none;padding-bottom:16px}.hn-full.beat .fp{pointer-events:auto;width:min(440px,100%);gap:6px;padding:12px 16px 14px}
.hn-full.beat .h1{font-size:19px;color:var(--c)}.hn-full.beat .why{font-size:13.5px;line-height:1.45;color:#e6dbc3}
`;

  // ------------------------------------------------------------------------------ helpers
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const num = (n) => (n == null ? '?' : (n < 0 ? '−' : '') + String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
  const sgn = (n) => (n < 0 ? '−' : '+') + num(Math.abs(n));
  const kfmt = (n) => { if (n == null) return '?'; n = Math.round(n); return n >= 10000 ? Math.round(n / 1000) + 'k' : n >= 1000 ? (Math.round(n / 100) / 10).toString().replace('.', ',') + 'k' : String(n); };
  const total = (u) => (u ? ARMS.reduce((s, k) => s + (u[k] || 0), 0) : null);
  const ic = (k) => '<svg class="ic" viewBox="0 0 24 24">' + (ICON[k] || '') + '</svg>';
  const xIcon = '<svg viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19"/></svg>';
  const title = (id) => String(id || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  function create(root, handlers, opts) {
    opts = opts || {};
    const Hd = handlers || {};
    const fac = Object.assign({}, FAC);
    if (opts.factions) (Array.isArray(opts.factions) ? opts.factions.map((x) => [x.id || x.fid, x]) : Object.entries(opts.factions)).forEach(([k, v]) => { if (k) fac[k] = Object.assign({}, fac[k], v); });
    const F = (fid) => fac[fid] || { name: fid || '?', short: fid || '?', glyph: '?', color: '#777' };
    const EB = () => opts.battle || window.EmperorsBattle || null;
    const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
    const layer = document.createElement('div'); layer.className = 'hn';
    layer.innerHTML = '<div class="hn-lab"></div><div class="hn-hud"></div><div class="hn-tr"></div><div class="pn hn-side x"></div><div class="hn-dock x"></div><div class="pn hn-card x"></div>' +
      '<button type="button" class="hn-end" data-a="end"></button><div class="hn-bt x"></div><div class="pn hn-wl x"></div><div class="pn hn-wc x"></div><div class="pn hn-lg x"></div><div class="hn-bb x"></div><div class="hn-full x"></div><div class="hn-hint x"></div>';
    root.appendChild(layer);
    const q = (s) => layer.querySelector(s);
    const el = { lab: q('.hn-lab'), hud: q('.hn-hud'), tr: q('.hn-tr'), side: q('.hn-side'), dock: q('.hn-dock'), card: q('.hn-card'), end: q('.hn-end'), bt: q('.hn-bt'), wl: q('.hn-wl'), wc: q('.hn-wc'), lg: q('.hn-lg'), bb: q('.hn-bb'), full: q('.hn-full'), hint: q('.hn-hint') };

    const S = { view: null, sel: null, targets: null, tasks: null, more: false, pend: null, pendF: null, preview: null, ask: null, fc: null, cards: [], cardsOpen: false, cardIx: 0, seen: {}, battle: null, bo: {}, bsel: null, busy: false, screen: null, labels: [], snap: {} };
    const chips = {}; let sc = 1;

    const H = (name, ...args) => { const f = Hd[name]; if (typeof f !== 'function') return undefined; try { return f.apply(Hd, args); } catch (e) { console.error('HuaiNanUI handler ' + name, e); return undefined; } };
    const set = (node, html, key) => { if (node._h === html) return; const keep = node._k === key ? node.scrollTop : 0; node.innerHTML = html; node.scrollTop = keep; node._h = html; node._k = key; };
    const show = (node, on) => node.classList.toggle('x', !on);

    // ---------------------------------------------------------------------------- lookups
    const V = () => S.view || { towns: [], armies: [], gens: {}, cards: [], res: {}, warn: {} };
    const town = (id) => V().towns.find((t) => t.id === id);
    const army = (id) => V().armies.find((a) => a.id === id);
    const townName = (id) => { const t = town(id) || (opts.towns || []).find((x) => x.id === id); return t ? t.name : title(id); };
    const genOf = (id) => (id && ((V().gens || {})[id] || null)) || null;
    const armyName = (a) => (a && a.gen ? a.gen.name : 'Đạo quân ' + (a ? F(a.fid).short : ''));
    const thing = (kind, id) => (kind === 'town' ? townName(id) : armyName(army(id)));
    const mine = (a) => a && a.fid === V().me;
    const selArmy = () => (S.sel && S.sel.kind === 'army' ? army(S.sel.id) : null);
    const selTown = () => (S.sel && S.sel.kind === 'town' ? town(S.sel.id) : null);
    const orderText = (o) => (o && o.intent && o.intent !== 'hold' ? (INTENT[o.intent] || 'Đi tới') + ' ' + thing(o.target && o.target.kind, o.target && o.target.id) : 'Giữ');
    const portrait = (id) => { const p = opts.portraits; if (!p || !id) return ''; return typeof p === 'function' ? p(id) || '' : typeof p === 'string' ? p + id + '.svg' : p[id] || ''; };
    const pt = (g, fid, cls) => { const c = esc(F(fid || (g && g.fid)).color), u = g && portrait(g.id); return '<span class="pt ' + (cls || '') + '" style="--c:' + c + '"><b>' + esc(g && g.seal ? g.seal : '?') + '</b>' + (u ? '<img src="' + esc(u) + '" alt="">' : '') + '</span>'; };

    // ---------------------------------------------------------------------------- scale
    function fit() {
      const r = root.getBoundingClientRect(), w = r.width || root.clientWidth || 844, h = r.height || root.clientHeight || 390;
      sc = Math.max(1, Math.min(1.4, Math.min(w / 844, h / 390)));
      layer.style.width = w / sc + 'px'; layer.style.height = h / sc + 'px'; layer.style.transform = 'scale(' + sc + ')';
      placeLabels();
    }

    // ---------------------------------------------------------------------------- pieces
    const statBars = (g, hi) => '<div class="st">' + STATS.map(([k, l]) => { const v = g[k]; return '<div class="' + (hi === k ? 'f' : '') + '"><span>' + l + '</span><b style="color:' + (v >= 8 ? TONE.gold : v <= 4 ? '#9a8b70' : '#e6dbc3') + '">' + v + '</b><div class="bar"><i style="width:' + v * 10 + '%;background:' + (v >= 8 ? TONE.gold : v <= 4 ? '#9a8b70' : '#d8cbb0') + '"></i></div>' + (hi === k ? '<em>' + STAT_CTX[k] + '</em>' : '') + '</div>'; }).join('') + '</div>';
    // Trung: one bar with the three thresholds marked, and the consequence of where it stands in words
    function trung(g) {
      if (g.loyal == null) return '';
      if (g.lord || g.loyal >= 100) return '<div class="lo gold">Chúa công</div>';
      const L = g.loyal, r = L < 30 ? ['sắp bỏ đi, mang cả đạo quân', TONE.bad] : L < 70 ? ['bất mãn: quân đánh kém (tới −8 sĩ khí)', TONE.gold] : L >= 85 ? ['một lòng: +3 sĩ khí', TONE.good] : ['tạm yên', TONE.text];
      return '<div class="lo"><span>Trung <b style="color:' + r[1] + '">' + L + '</b> · <span style="color:' + r[1] + '">' + r[0] + '</span></span><div class="tr"><i style="width:' + L + '%;background:' + r[1] + '"></i><u style="left:30%"></u><u style="left:70%"></u><u style="left:85%"></u></div></div>';
    }
    const hasStats = (g) => g && g.uy != null;
    const unitBox = (u, approx, arms) => {
      if (!u) return '<div class="box">' + (arms || []).map((k) => '<span class="u">' + ic(k) + ARM_NAME[k] + '</span>').join('') + '<span class="w100">Xa: chỉ thấy cờ và loại quân, chưa rõ số. Dò thám mới ra số đúng.</span></div>';
      return '<div class="box">' + ARMS.filter((k) => u[k]).map((k) => '<span class="u">' + ic(k) + (approx ? '~' : '') + num(u[k]) + '</span>').join('') + '</div>';
    };

    // ---------------------------------------------------------------------------- HUD, badge, end button
    function snapDelta(v) { const a = S.snap[v.season], b = S.snap[v.season - 1]; return a && b ? a.uy - b.uy : null; }
    function drawHud() {
      const v = S.view, on = !!v && !S.battle;
      show(el.hud, on); show(el.tr, on && !S.screen); show(el.end, on && !S.screen);
      if (!on) return;
      const f = F(v.me), r = v.res || {}, inc = v.income, w = v.warn || {};
      const uyD = inc && inc.uy != null ? inc.uy : snapDelta(v);
      const chip = (k, val, cls, sub, warn) => '<div class="rs' + (warn ? ' w' : '') + '"><span class="k">' + k + (warn ? ' <i>Cảnh báo</i>' : '') + '</span><b class="' + cls + '">' + val + '</b><small>' + sub + '</small></div>';
      const first = '<span class="mu">mùa đầu</span>', none = '&nbsp;';
      el.hud.innerHTML = '<div class="seal" style="background:' + esc(f.color) + '">' + esc(f.glyph) + '</div><div class="nm"><b>' + esc(f.name) + '</b><span>' + esc(v.calendar || '') + ' · Hoài Nam</span></div>' +
        chip('Lương', num(r.luong), r.luong < 0 || w.luong ? 'bad' : '', inc ? '<em class="good">' + sgn(inc.luong) + '</em> <em class="bad">−' + num(inc.up) + '</em>' : first, w.luong) +
        chip('Tiền', num(r.tien), '', inc ? '<em class="good">' + sgn(inc.tien) + '</em>' : none, false) +
        chip('Uy', num(r.uy), r.uy <= 0 || w.uy ? 'bad' : '', uyD == null ? none : '<em class="' + (uyD < 0 ? 'bad' : uyD > 0 ? 'good' : 'mu') + '">' + (uyD === 0 ? '±0' : sgn(uyD)) + '</em>', w.uy);
      const n = S.cards.length, urgent = S.cards.some((c) => c.urgent);
      el.tr.innerHTML = '<button type="button" class="sq" data-a="goal" aria-label="Mục tiêu và cách chơi">?</button>' +
        (n ? '<button type="button" class="cb' + (urgent ? ' u' : '') + '" data-a="cards">Thẻ · ' + n + '</button>' : '') +
        '<button type="button" class="sq" data-a="home" aria-label="Toàn cảnh Hoài Nam"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg></button>';
      const arm = v.armies.filter((a) => mine(a) && a.order).length, tk = v.towns.filter((t) => t.owner === v.me && t.task).length;
      const warn = w.luong ? 'Lương ở đáy: mùa sau còn thế này thì binh biến' : w.uy ? 'Uy ở đáy: mùa sau còn thế này thì dân nổi loạn' : '';
      el.end.classList.toggle('w', !!warn);
      const sub = warn || (arm || tk ? [arm ? arm + ' lệnh' : '', tk ? tk + ' việc' : ''].filter(Boolean).join(' · ') : 'Chưa ra lệnh: quân Giữ');
      set(el.end, '<b>Hết mùa</b><span>' + esc(sub) + '</span>', 'end');
    }

    // ---------------------------------------------------------------------------- selection panels
    function armyPanel(a) {
      const g = a.gen, own = mine(a), o = a.order, hi = o ? (o.intent === 'attack' || o.intent === 'siege' ? 'dung' : o.intent === 'move' ? 'uy' : 'kien') : 'kien';
      const stats = hasStats(g);
      let h = '<div class="ph">' + pt(g, a.fid, 'L') + '<div class="pi"><span class="nm">' + esc(g ? g.name : armyName(a)) + '</span><span class="cl2">' + esc((g && g.cls ? g.cls + ' · ' : '') + F(a.fid).short) + '</span>' + (stats ? trung(g) : '') + '</div><button type="button" class="xb" data-a="close" aria-label="Đóng">' + xIcon + '</button></div>';
      if (stats) h += statBars(g, hi) + '<div class="txt">' + esc(g.trait || '') + (g.traitText ? ': ' + esc(g.traitText) : '') + '</div>';
      const approx = a.seen !== 'own', tot = total(a.units);
      h += unitBox(a.units, approx, a.arms);
      h = h.replace(/<\/div>$/, (tot != null ? '<span class="w100">' + (approx ? '~' : '') + num(tot) + ' quân' + (a.seen === 'near' ? ' (ước ±20%, gần)' : '') + ' · ở ' + esc(townName(a.at)) + (a.besieging ? ', đang vây ' + esc(townName(a.besieging)) : '') + '</span>' : '<span class="w100">Ở ' + esc(townName(a.at)) + '</span>') + '</div>');
      if (own) {
        h += '<div class="od"><div><span class="ol">Lệnh mùa này</span><b class="' + (o ? '' : 'mu') + '">' + esc(orderText(o)) + '</b></div>' + (o ? '<button type="button" class="bt" data-a="clear" data-id="' + esc(a.id) + '">Bỏ lệnh</button>' : '') + '</div>';
        if (!o) h += '<div class="note">Không lệnh: quân Giữ, thủ +15% nếu bị đánh.</div>';
        h += '<div class="sec">Hạ lệnh: chạm đích trên bản đồ</div>';
        if (S.targets) {
          h += S.targets.length ? '<div class="lst">' + S.targets.map((t, i) => {
            const cur = o && o.target && o.target.kind === t.kind && o.target.id === t.id, hostile = t.intent !== 'move';
            return '<button type="button" class="tg ' + (hostile ? '' : 'mv') + (cur ? ' on' : '') + '" data-a="tgt" data-i="' + i + '"><b>' + esc(thing(t.kind, t.id)) + '</b><span>' + (t.intent === 'move' ? 'Đi tới' : t.intent === 'attack' ? 'Đánh' : 'Đánh hoặc Vây') + '</span></button>';
          }).join('') + '</div>' : '<div class="note bad">Không có nơi nào trong tầm một mùa.</div>';
        }
      } else h += '<div class="note">' + (a.seen === 'far' ? 'Ở xa: chỉ thấy cờ và loại quân.' : 'Số quân là ước: gần thành hay quân ta thì sát hơn.') + ' Muốn đánh: chọn một đạo quân ta rồi chạm đạo này.</div>';
      return h;
    }
    function townPanel(t) {
      const own = t.owner === V().me, f = F(t.owner), T = (opts.towns || []).find((x) => x.id === t.id) || {}, g = t.gov;
      let h = '<div class="ph"><div class="pi"><span class="nm"><i class="dot" style="display:inline-block;width:11px;height:11px;border-radius:50%;background:' + esc(f.color) + ';margin-right:7px"></i>' + esc(t.name) + '</span><span class="cl2 ell">' + esc(f.short) + (T.terrain ? ' · ' + esc(T.terrain) : '') + (t.river ? ' · bến thuyền' : '') + '</span></div><button type="button" class="xb" data-a="close" aria-label="Đóng">' + xIcon + '</button></div>';
      const info = (t.gar ? 'Đồn ' + (t.garApprox ? '~' : '') + num(total(t.gar)) + (t.garApprox ? ' (ước)' : '') : 'Đồn chưa rõ') + ' · lũy ' + t.walls + ' · trấn thủ ' + (g ? g.name : 'không');
      h += t.gar ? unitBox(t.gar, t.garApprox).replace(/<\/div>$/, '<span class="w100">' + esc(info) + '</span></div>') : '<div class="box"><span class="w100">' + esc(info) + '</span></div>';
      if (!own) return h + '<div class="note">Muốn lấy thành: chọn một đạo quân ta rồi chạm thành này. Đánh ngay (một trận) hoặc Vây (mỗi mùa đồn −20%, lũy −1, dân −8%).</div>';
      const k = t.task;
      h += '<div class="od"><div class="ell">Việc mùa này: <b class="' + (k ? '' : 'mu') + '">' + (k ? esc(k.name) + (k.left != null ? ' · còn ' + k.left + ' mùa' : '') : 'chưa giao (không bắt buộc)') + '</b></div>' + (k && k.fresh ? '<button type="button" class="bt" data-a="untask" data-id="' + esc(t.id) + '">Bỏ việc</button>' : '') + '</div>';
      const tk = S.tasks;
      if (!tk) return h;
      const all = tk.all || [], by = {}; all.forEach((x) => { by[x.key] = x; });
      let sug = (tk.suggested || []).map((x) => by[x]).filter(Boolean); if (!sug.length) sug = all.filter((x) => x.ok).slice(0, 3);
      const rest = all.filter((x) => sug.indexOf(x) < 0);
      const row = (x) => '<button type="button" class="tk' + (k && k.key === x.key ? ' on' : '') + '" data-a="task" data-k="' + esc(x.key) + '"' + (x.ok ? '' : ' disabled') + '><span class="t1"><b>' + esc(x.name) + '</b><em>' + (x.seasons != null ? x.seasons + ' mùa · ' : '') + esc(costText(x.cost)) + '</em></span><span class="t2">' + (x.ok || !x.why ? esc(x.text || '') : '<i>' + esc(x.why) + '</i>') + '</span></button>';
      h += sug.map(row).join('');
      if (rest.length) h += S.more ? '<div class="sec">Các việc khác</div>' + rest.map(row).join('') + '<button type="button" class="more" data-a="more">Thu gọn</button>' : '<button type="button" class="more" data-a="more">Thêm ' + rest.length + ' việc</button>';
      return h;
    }
    function costText(c) {
      if (c == null) return '';
      if (typeof c === 'string') return c;
      if (typeof c === 'number') return num(c) + ' tiền';
      return Object.keys(c).filter((k) => c[k]).map((k) => num(c[k]) + (k === 'luong' ? ' lương' : k === 'tien' ? ' tiền' : ' ' + k)).join(', ');
    }

    // ---------------------------------------------------------------------------- forecast
    const FC_STEPS = ['Thua lớn', 'Thua', 'Ngang ngửa', 'Thắng', 'Thắng lớn'];
    function forecastPanel() {
      const { f, act, x } = S.fc, ex = x || {}, more = f.more || {}, i = Math.max(0, FC_STEPS.indexOf(f.label));
      const col = i >= 3 ? TONE.good : i === 2 ? TONE.gold : TONE.bad, an = more.analyst, ag = an && (genOf(an.id) || { id: an.id, name: an.name, seal: '?', fid: V().me });
      const tg = act.target, where = tg ? (tg.kind === 'town' ? 'đánh ' + townName(tg.id) : 'đánh ' + armyName(army(tg.id)) + ' ở ' + townName((army(tg.id) || {}).at)) : 'trận sắp tới';
      const rs = (r) => { const good = (r.side === 'A') === (r.pct >= 0); return '<div class="rs2"><span class="' + (good ? 'good' : 'bad') + '">' + (r.side === 'A' ? 'Ta' : 'Họ') + ': ' + esc(r.why) + '</span><b class="' + (good ? 'good' : 'bad') + '">' + (r.pct ? 'sức ' + (r.pct > 0 ? '+' : '−') + Math.abs(r.pct) + '%' : '') + '</b></div>'; };
      const list = S.fc.more ? (more.reasons || f.reasons || []) : (f.reasons || []).slice(0, 2);
      let h = '<div class="fcb"><div class="ph">' + (ag ? pt(ag, ag.fid, 'M') : '') + '<div class="pi"><span class="nm" style="font-size:15px">' + esc(an ? an.name : 'Tướng') + '</span><span class="cl2">' + (an ? 'Mưu ' + an.muu + ' · ' : '') + 'đọc trận: ' + esc(where) + '</span></div></div>';
      h += '<div><div class="lb2" style="color:' + col + '">' + esc(f.label) + '</div><div class="sc5">' + FC_STEPS.map((s, j) => '<i style="' + (j <= i && i >= 0 ? 'background:' + col : '') + (j === i ? '' : ';opacity:.45') + '"></i>').join('') + '</div></div>';
      h += '<div class="two"><div class="me"><span class="k">Ta' + ((act.armies || []).length > 1 ? ' (hợp binh)' : '') + '</span><b>Sức ' + num(f.sa) + '</b><span class="l">ước mất ' + num(f.est && f.est.la) + ' quân</span></div><div><span class="k">Họ</span><b>Sức ' + num(f.sd) + '</b><span class="l">ước mất ' + num(f.est && f.est.ld) + ' quân</span></div></div>';
      h += '<div class="sec">Vì sao' + (S.fc.more ? ' (đủ lý do)' : '') + '</div>' + (list.length ? list.map(rs).join('') : '<div class="note">Không có gì đáng kể.</div>');
      if (S.fc.more) {
        if (more.lanes) h += '<div class="sec">Ba làn chiến địa</div><div class="txt">' + more.lanes.map((l, j) => 'Làn ' + LANE[j] + ': <b>' + esc(l) + '</b>').join(' · ') + '</div>';
        h += '<div class="note">' + (an ? esc(an.name) + ' (Mưu ' + an.muu + ')' : 'Tướng') + ' đoán từ những gì thấy được: Mưu càng cao càng sát, Mưu thấp có thể lạc quan hay bi quan. Gió và vận trong ngày không ai biết trước.</div>';
      }
      if (ex.partners && ex.partners.length) h += '<div class="sec">Hợp binh</div><div class="pp">' + ex.partners.map((p) => '<button type="button" class="bt" data-a="partner" data-id="' + esc(p.army) + '" style="' + (p.on ? 'border-color:var(--go);background:rgba(226,191,108,.2)' : '') + '">' + (p.on ? '✓ ' : '+ ') + esc(p.label || armyName(army(p.army))) + '</button>').join('') + '</div>';
      if (ex.preview) h += pvLine(ex.preview);
      h += '</div><div class="bb"><button type="button" class="bt" data-a="fc-more" style="flex:none;width:44px;align-items:center;font:700 18px var(--ser);color:var(--go)" aria-label="Vì sao, chi tiết">' + (S.fc.more ? '×' : '?') + '</button><button type="button" class="bt" data-a="fc-no">Thôi</button><button type="button" class="bt pr" data-a="fc-go" style="flex:1.6">Hạ lệnh đánh</button></div>';
      return h;
    }

    // ---------------------------------------------------------------------------- preview / ask dock
    const RESN = { luong: 'Lương', tien: 'Tiền', uy: 'Uy' };
    function pvLine(p) {
      const r = p.res || {}, ch = Object.keys(RESN).filter((k) => r[k] && r[k][0] !== r[k][1]);
      return '<div class="rr">' + (ch.length ? ch.map((k) => '<span>' + RESN[k] + ' ' + num(r[k][0]) + ' → <b class="' + (r[k][1] < r[k][0] ? 'bad' : 'good') + '">' + num(r[k][1]) + '</b></span>').join('') : '<span class="mu">Không tốn thêm tài nguyên</span>') + '</div>' + (p.lines || []).map((l) => '<div class="ln">' + esc(l) + '</div>').join('');
    }
    function drawDock() {
      const map = !!S.view && !S.battle && !S.screen && !S.fc && !S.cardsOpen;
      let h = '';
      if (map && S.ask) {
        const a = S.ask, nm = thing(a.kind, a.id);
        h = '<div class="h"><b>' + esc(nm) + ' là thành địch</b></div><div class="ask"><button type="button" class="bt pr" data-a="ask-attack"><b>Đánh ngay</b><small>một trận trong mùa này</small></button><button type="button" class="bt" data-a="ask-siege"><b>Vây</b><small>đồn −20%, lũy −1 mỗi mùa</small></button></div><div class="bb"><button type="button" class="bt" data-a="ask-no" style="flex:none;width:100%;min-height:40px;align-items:center">Thôi</button></div>';
      } else if (map && S.preview) {
        const p = S.preview.p, a = S.preview.act || {}, task = a.type === 'task';
        const t = task ? ((S.tasks && (S.tasks.all || []).find((x) => x.key === a.key)) || {}).name || 'Việc thành' : (INTENT[a.intent] || 'Đi tới') + ' ' + thing(a.target && a.target.kind, a.target && a.target.id);
        const w = p.seasons == null ? '' : p.seasons <= 0 ? (task ? 'xong ngay' : 'tới nơi ngay') : (task ? 'xong sau ' : 'tới nơi sau ') + p.seasons + ' mùa';
        h = '<div class="h"><b>' + esc(t) + (task ? ' · ' + esc(townName(a.town)) : '') + '</b><span>' + esc(w) + '</span></div>' + pvLine(p) + '<div class="bb"><button type="button" class="bt" data-a="pv-no">Thôi</button><button type="button" class="bt pr" data-a="pv-ok">Xác nhận</button></div>';
      }
      show(el.dock, !!h); if (h) set(el.dock, h, 'dock');
    }

    // ---------------------------------------------------------------------------- side slot: forecast or selection
    function drawSide() {
      const map = !!S.view && !S.battle && !S.screen;
      let h = '', key = '', cls = 'pn hn-side';
      if (map && S.fc) { h = forecastPanel(); key = 'fc'; cls += ' hn-fc'; }
      else if (map && !S.cardsOpen && S.sel) {
        const a = selArmy(), t = selTown();
        if (a) { h = armyPanel(a); key = 'a' + a.id; } else if (t) { h = townPanel(t); key = 't' + t.id; }
      }
      el.side.className = cls + (h ? '' : ' x');
      if (h) set(el.side, h, key + (S.fc ? S.fc.more : ''));
    }

    // ---------------------------------------------------------------------------- cards
    const TONE_K = { history: '#c9a8ff', envoy: TONE.gold, general: TONE.gold, captive: TONE.bad };
    function drawCards() {
      const c = S.cards[S.cardIx], on = !!S.view && !S.battle && !S.screen && S.cardsOpen && !!c && !S.fc;
      show(el.card, on); if (!on) return;
      const g = c.gen ? genOf(c.gen) : null, glyph = c.kind === 'history' ? '憶' : '令';
      const head = g ? pt(g, g.fid, 'L') : '<span class="pt L" style="--c:' + (c.kind === 'history' ? '#5b3f8c' : '#6b5a3a') + '"><b>' + glyph + '</b></span>';
      const n = S.cards.length;
      let h = '<div class="ph">' + head + '<div class="pi"><span class="k" style="color:' + (TONE_K[c.kind] || TONE.gold) + '">' + esc(c.who) + '</span><span class="ti">' + esc(c.title) + '</span></div><div class="pg">' +
        (n > 1 ? '<button type="button" class="bt" data-a="card-prev" aria-label="Thẻ trước">‹</button><span class="mu num" style="font-size:11.5px">' + (S.cardIx + 1) + '/' + n + '</span><button type="button" class="bt" data-a="card-next" aria-label="Thẻ sau">›</button>' : '') +
        '<button type="button" class="bt l" data-a="card-later">Để sau</button></div></div>';
      h += '<div class="tx">' + esc(c.text) + '</div>';
      if (hasStats(g)) h += '<div class="gb"><span class="txt"><b style="color:#f6eedb">' + esc(g.name) + '</b> · ' + esc((g.cls || '') + (g.trait ? ' · ' + g.trait + ': ' + (g.traitText || '') : '')) + '</span>' + statBars(g) + trung(g) + '</div>';
      h += '<div class="yn"><button type="button" class="bt" data-a="card-no"><b>' + esc(c.no.label) + '</b><small>' + esc(c.no.fx) + '</small></button><button type="button" class="bt pr" data-a="card-yes"><b>' + esc(c.yes.label) + '</b><small>' + esc(c.yes.fx) + '</small></button></div>';
      set(el.card, h, 'c' + c.id);
    }

    // ---------------------------------------------------------------------------- map chips
    function chipHtml(kind, id) {
      const t = kind === 'town' ? town(id) : null, a = kind === 'army' ? army(id) : null, tg = S.targets && S.targets.find((x) => x.kind === kind && x.id === id), tgt = !!tg, on = S.sel && S.sel.kind === kind && S.sel.id === id;
      const cls = 'lb ' + (kind === 'town' ? 'tw' : 'ar') + (on ? ' on' : '') + (tgt ? ' tgt' + (tg.intent === 'move' ? ' mv' : '') : '');
      const open = '<button type="button" class="' + cls + '" data-a="chip" data-k="' + kind + '" data-id="' + esc(id) + '">';
      if (t) {
        const n = total(t.gar), sub = n == null ? '?' : t.garApprox ? '~' + kfmt(Math.round(n / 100) * 100) : kfmt(n);
        return open + '<span class="n"><i class="dot" style="background:' + esc(F(t.owner).color) + '"></i>' + esc(t.name) + '</span><span class="s">' + sub + ' · lũy ' + t.walls + (t.task ? ' · ' + ic('task') : '') + '</span></button>';
      }
      if (a) {
        const own = mine(a), u = a.units, ap = a.seen !== 'own';
        const au = u ? ARMS.filter((k) => u[k]).map((k) => '<span>' + ic(k) + (ap ? '~' : '') + kfmt(u[k]) + '</span>').join('') : (a.arms || []).map((k) => '<span>' + ic(k) + '</span>').join('');
        const ao = own ? orderText(a.order) : a.seen === 'far' ? 'Xa: chỉ thấy cờ, loại quân' : 'Ước ±20%';
        return open + pt(a.gen, a.fid) + '<span class="ai"><b>' + esc(armyName(a)) + '</b><span class="au">' + au + '</span><span class="ao">' + esc(ao) + '</span></span></button>';
      }
      return '';
    }
    function drawLabels() {
      const seen = {};
      S.labels.forEach((l) => {
        const k = l.kind + ':' + l.id; seen[k] = 1;
        if (l.visible === false || !S.view || S.battle || S.screen) return void (chips[k] && chips[k].classList.add('x'));
        const html = chipHtml(l.kind, l.id); if (!html) return void (chips[k] && chips[k].classList.add('x'));
        let c = chips[k];
        if (!c) { const d = document.createElement('div'); d.innerHTML = html; c = chips[k] = d.firstChild; c._h = html; el.lab.appendChild(c); } else { c.classList.remove('x'); if (c._h !== html) { const d = document.createElement('div'); d.innerHTML = html; const n = d.firstChild; c.className = n.className; c.innerHTML = n.innerHTML; c._h = html; } }
        c._x = null;
      });
      Object.keys(chips).forEach((k) => { if (!seen[k]) { chips[k].remove(); delete chips[k]; } });
      placeLabels();
    }
    function placeLabels() {
      S.labels.forEach((l) => { const c = chips[l.kind + ':' + l.id]; if (!c) return; const key = l.x + ',' + l.y + ',' + sc; if (c._x === key) return; c._x = key; c.style.transform = 'translate(' + l.x / sc + 'px,' + l.y / sc + 'px) translate(-50%,-100%)'; });
    }

    // ---------------------------------------------------------------------------- battle
    const eff = (w) => S.bo[w.id] || ((S.battle.proposed || {})[w.id]) || null;
    const oname = (k) => { const B = EB(); return k && B && B.ORDERS[k] ? B.ORDERS[k].name : k || '—'; };
    const moraleCol = (m) => (m < 30 ? TONE.bad : m < 55 ? TONE.gold : TONE.good);
    const lossOf = (b, side) => b.wings.filter((w) => w.side === side).reduce((s, w) => s + Math.max(0, (w.start || 0) - Math.max(0, w.men)), 0);
    function drawBattle() {
      const st = S.battle, on = !!st && !S.screen;
      [el.bt, el.wl, el.wc, el.lg, el.bb].forEach((n) => show(n, on));
      if (!on) return;
      const b = st.b, me = st.me || 'A', foe = me === 'A' ? 'D' : 'A', B = EB(), over = !!b.over, prop = st.proposed || {};
      const my = b.wings.filter((w) => w.side === me), ft = b.wings.filter((w) => w.side === foe);
      const site = townName(b.site), wind = b.wind ? 'Có gió: hỏa công được' : 'Lặng gió: không hỏa công';
      set(el.bt, '<div class="tn">' + (over ? 'Hết trận' : 'Lượt ' + b.turn + '/' + (b.maxTurn || 5)) + '</div><div class="tt"><b>' + esc((b.siege ? (me === 'A' ? 'Công thành ' : 'Giữ thành ') : 'Trận ') + site) + '</b><span>' + esc(b[me].gen.name + ' đấu ' + b[foe].gen.name + ' · ' + wind + (st.forecast ? ' · đã đoán: ' + st.forecast : '')) + '</span></div>', 'bt');
      // my wings: the general's proposal preselected, a tap opens the legal orders
      let wl = '<div class="hd">Cánh quân ta · lệnh đề xuất</div>';
      my.forEach((w) => {
        if (w.gone) { wl += '<div class="wr gone">' + ic(w.arm) + '<div class="wi"><b>' + ARM_NAME[w.arm] + ' <span>' + (w.routed ? 'tan vỡ' : w.left ? 'rời trận' : 'hết') + '</span></b></div></div>'; return; }
        const o = eff(w), ch = !!S.bo[w.id];
        wl += '<button type="button" class="wr' + (S.bsel === w.id ? ' on' : '') + '" data-a="wing" data-id="' + esc(w.id) + '">' + ic(w.arm) + '<div class="wi"><b>' + ARM_NAME[w.arm] + ' ' + num(w.men) + '</b><div class="ln2"><span>làn ' + LANE[w.lane] + '</span><div class="mo"><i style="width:' + Math.max(0, Math.min(100, w.morale)) + '%;background:' + moraleCol(w.morale) + '"></i></div></div></div><div class="od2' + (ch ? ' ch' : '') + '"><b>' + esc(over ? '—' : oname(o)) + '</b><small>' + (over ? '' : ch ? 'đã đổi' : 'đề xuất') + '</small></div></button>';
      });
      set(el.wl, wl, 'wl');
      // the legal orders of the chosen wing (EmperorsBattle.legalOrders on the given b)
      const sw = !over && S.bsel && my.find((w) => w.id === S.bsel && !w.gone);
      show(el.wc, !!sw);
      if (sw && B) {
        const cur = eff(sw), legal = B.legalOrders(b, sw.id);
        set(el.wc, '<div class="hd"><span><b>Cánh ' + ARM_NAME[sw.arm] + '</b> · ' + num(sw.men) + ' quân · sĩ khí ' + Math.round(sw.morale) + ' · làn ' + LANE[sw.lane] + '</span></div><div class="os">' +
          legal.map((k) => { const no = k === 'hoa' && !b.wind; return '<button type="button" class="bt' + (cur === k ? ' on' : '') + '" data-a="ord" data-w="' + esc(sw.id) + '" data-o="' + k + '"' + (no ? ' disabled' : '') + '>' + esc(B.ORDERS[k].name) + (no ? '<small>lặng gió</small>' : prop[sw.id] === k ? '<small>đề xuất</small>' : '') + '</button>'; }).join('') +
          '</div><div class="tp">' + esc(cur && B.ORDERS[cur] ? B.ORDERS[cur].text : '') + ' <span class="mu">Chạm lại cánh để đóng.</span></div>', 'wc' + sw.id);
      }
      // log and the other side's wings
      const foeRow = ft.map((w) => '<span class="' + (w.gone ? 'gn' : '') + '">' + ic(w.arm) + num(w.men) + '</span>').join('');
      let lg = '';
      if (over) {
        const win = b.over.win, draw = win === 'draw', won = win === me, oc = st.outcome, L = oc && oc.losses ? oc.losses : { A: lossOf(b, 'A'), D: lossOf(b, 'D') };
        lg += '<div class="res"><b class="' + (draw ? 'gold' : won ? 'good' : 'bad') + '">' + (draw ? 'Bất phân thắng bại' : won ? 'Thắng trận' : 'Thua trận') + '</b><span class="num">Ta mất ' + num(L[me]) + ' · địch mất ' + num(L[foe]) + '</span></div>';
      }
      lg += '<div class="lt">Địch · ' + ft.filter((w) => !w.gone).length + ' cánh</div><div class="en">' + foeRow + '</div>';
      const log = b.log || [];
      if (!log.length) lg += '<div class="lt">Trước trận</div><div class="ev mu">Đề xuất của tướng đã chọn sẵn. Chạm một cánh để đổi, hoặc Đánh luôn.</div>';
      log.slice().reverse().forEach((l) => {
        const lines = (l.ev || []).map((e) => ({ t: B ? B.say(b, e, me) : '', big: e.big, side: e.side })).filter((e) => e.t);
        lg += '<div class="lt">Lượt ' + l.turn + '</div>' + (lines.length ? lines.map((e) => '<div class="ev" style="' + (e.big ? 'font-weight:700;color:' + (e.side === me ? TONE.good : TONE.bad) : '') + '">' + esc(e.t) + '</div>').join('') : '<div class="ev mu">Hai bên giằng co, chưa ai mất quân.</div>');
      });
      set(el.lg, lg, 'lg' + b.turn + (over ? 'o' : ''));
      const bb = over ? '<button type="button" class="bt pr" data-a="bdone" style="width:100%">Xem kết quả</button>' : '<button type="button" class="bt" data-a="auto"' + (S.busy ? ' disabled' : '') + '>Tự đánh</button><button type="button" class="bt pr" data-a="fight"' + (S.busy ? ' disabled' : '') + '>' + (S.busy ? 'Đang đánh…' : 'Đánh') + '</button>';
      set(el.bb, bb, 'bb');
    }
    function selectWing(id) {
      const st = S.battle; if (!st || st.b.over) return;
      const w = st.b.wings.find((x) => x.id === id);
      if (!w || w.side !== (st.me || 'A') || w.gone) return;
      S.bsel = S.bsel === id ? null : id; drawBattle(); H('onWingSelect', S.bsel);
    }
    function setOrder(wid, k) {
      const st = S.battle, prop = st.proposed || {}, me = st.me || 'A';
      if (k === 'hoa') st.b.wings.forEach((w) => { if (w.side === me && w.id !== wid && !w.gone && eff(w) === 'hoa') S.bo[w.id] = 'giu'; });
      S.bo[wid] = k;
      Object.keys(S.bo).forEach((id) => { if (S.bo[id] === prop[id]) delete S.bo[id]; });
      drawBattle(); H('onBattleOrder', wid, k);
    }

    // ---------------------------------------------------------------------------- full screens
    function drawFull() {
      const s = S.screen; show(el.full, !!s); if (!s) return;
      let h = '';
      if (s.t === 'goal') {
        const i = s.info || {}, v = S.view;
        h = '<div class="fp"><div><div class="h1">' + esc(i.title || 'Thu 219. Chu Nguyên Chương ở Hoài Nam.') + '</div><div class="h2">Ván ngắn: không giới hạn số lượt, xong khi thắng hoặc thua</div></div><div class="tri">' +
          '<div style="--c:#98d494;--b:rgba(152,212,148,.08)"><b>Thắng</b><span>' + esc(i.win || 'Nắm đủ 5 thành Hoài Nam: Chung Ly, Âm Lăng (ta), Thọ Xuân (Tào), Hu Dị và Lịch Dương (hào tộc, Ngô).') + '</span></div>' +
          '<div style="--c:#f08a72;--b:rgba(240,138,114,.08)"><b>Thua</b><span>' + esc(i.lose || 'Mất hết thành, hoặc Chu tử trận. Lương âm hay Uy về 0 hai mùa liền thì binh biến, dân nổi loạn; mùa đầu chạm đáy chỉ bị cảnh báo.') + '</span></div>' +
          '<div style="--c:#e2bf6c;--b:rgba(226,191,108,.08)"><b>Một mùa</b><span>' + esc(i.season || 'Chạm một đạo quân rồi chạm đích trên bản đồ để hạ lệnh; chạm thành ta để giao một việc. Không lệnh thì quân Giữ. Xong bấm Hết mùa: mọi phe cùng đi.') + '</span></div></div>' +
          '<div class="txt">' + esc(i.note || 'Tào có Trương Liêu (6.000 quân, 3.500 kỵ) ở Thọ Xuân; Ngô có thuyền Chu Thái ở Lịch Dương. Thẻ (sứ giả, tướng, ký ức) nằm ở huy hiệu "Thẻ", xem lúc nào cũng được. Trước khi đánh, tướng đoán trận bằng nhãn, không bằng phần trăm.') + '</div>' +
          '<button type="button" class="go" data-a="goal-ok">' + esc(i.button || 'Vào mùa ' + (v && v.calendar ? v.calendar : 'Thu 219')) + '</button></div>';
      } else if (s.t === 'report') {
        const r = s.report, v = V(), inc = r.income;
        h = '<div class="fp nr"><div class="h1">' + esc(r.season || 'Mùa') + ' kết thúc</div><div class="gl">' + (r.lines || []).map((l) => { const bad = l.charAt(0) === '!'; return '<span class="' + (bad ? 'bad' : '') + '" style="' + (bad ? 'font-weight:700' : '') + '">' + esc(bad ? l.slice(1) : l) + '</span>'; }).join('') + '</div>';
        (r.fought || []).forEach((f) => { const meS = f.me || 'A', draw = f.win === 'draw', won = f.win === meS, lo = meS === 'A' ? f.la : f.ld, lf = meS === 'A' ? f.ld : f.la; h += '<div class="fb" style="--c:' + (draw ? TONE.gold : won ? TONE.good : TONE.bad) + '"><span><b>' + (draw ? 'Hòa' : won ? 'Thắng' : 'Thua') + '</b> · ' + esc(townName(f.site)) + '</span><span class="num">ta mất ' + num(lo) + ' · địch mất ' + num(lf) + '</span></div>'; });
        if (inc && !(r.lines || []).some((l) => /nuôi quân/i.test(l))) h += '<div class="in"><div><span>Thu lương</span><b class="good">' + sgn(inc.luong) + '</b></div><div><span>Nuôi quân</span><b class="bad">−' + num(inc.up) + '</b></div><div><span>Thu tiền</span><b class="good">' + sgn(inc.tien) + '</b></div></div>';
        h += '<button type="button" class="go" data-a="rep-ok">' + (v.calendar && v.calendar !== r.season ? 'Sang ' + esc(v.calendar) : 'Tiếp tục') + '</button></div>';
      } else if (s.t === 'beat') {
        const b = s.beat, v = V(), t = town(b.town) || {}, nm = townName(b.town), ours = b.to === v.me, lost = b.from === v.me;
        const head = ours ? nm + ' về tay ta' : lost ? nm + ' mất vào tay ' + F(b.to).short : nm + ': ' + F(b.from).short + ' → ' + F(b.to).short;
        const why = b.siege ? (ours ? 'Bị vây, đồn đói, mở cổng hàng.' : 'Bị vây, đồn đói, mở cổng.') : ours ? 'Hạ thành sau trận.' : 'Thất thủ sau trận.';
        const gar = t.gar ? total(t.gar) : null;
        h = '<div class="fp" style="--c:' + (ours ? TONE.good : lost ? TONE.bad : TONE.gold) + '"><div class="h1">' + esc(head) + '</div><div class="why">' + esc(why) + (gar != null ? ' Đồn ' + (t.garApprox ? '~' : '') + num(gar) + ' · lũy ' + num(t.walls) + '.' : '') + '</div>' +
          '<button type="button" class="go" data-a="beat-ok">Tiếp</button></div>';
      } else if (s.t === 'over') {
        const o = s.over, v = V(), own = v.towns.filter((t) => t.owner === v.me).length;
        h = '<div class="fp ov"><div class="h1" style="color:' + (o.win ? TONE.good : TONE.bad) + '">' + (o.win ? 'Hoài Nam về một mối' : 'Thất bại') + '</div><div class="why">' + esc(o.why || '') + '</div>' +
          (S.view ? '<div class="in" style="align-self:stretch"><div><span>Mùa</span><b>' + v.season + '</b></div><div><span>Thành</span><b>' + own + '/' + v.towns.length + '</b></div><div><span>Lương</span><b>' + num(v.res.luong) + '</b></div><div><span>Tiền</span><b>' + num(v.res.tien) + '</b></div><div><span>Uy</span><b>' + num(v.res.uy) + '</b></div></div>' : '') +
          '<button type="button" class="go" data-a="again">Chơi lại</button></div>';
      }
      el.full.classList.toggle('beat', s.t === 'beat');
      set(el.full, h, s.t);
    }

    // ---------------------------------------------------------------------------- selection and taps
    function resetSel() { S.targets = null; S.tasks = null; S.more = false; S.preview = null; S.ask = null; S.fc = null; S.pend = null; S.pendF = null; }
    function select(sel) {
      const same = (!sel && !S.sel) || (sel && S.sel && sel.kind === S.sel.kind && sel.id === S.sel.id);
      if (!same) resetSel();
      S.sel = sel || null;
    }
    function target(t) {
      const a = selArmy(); if (!a) return;
      const tg = { army: a.id, kind: t.kind, id: t.id, intent: t.intent };
      if (t.intent === 'ask') return ui.askIntent(tg);
      S.preview = null; S.ask = null; S.fc = null; S.pend = { type: 'order', army: a.id, target: { kind: t.kind, id: t.id }, intent: t.intent };
      draw();
      if (t.intent === 'attack') { S.pendF = { armies: [a.id], target: { kind: t.kind, id: t.id } }; H('onForecast', { armies: [a.id], kind: t.kind, id: t.id, intent: 'attack' }); } else H('onTarget', tg);
    }
    const tap = (hit) => {
      if (!hit || hit.kind === 'ground' || hit.id == null) { if (S.sel || S.cardsOpen) { S.cardsOpen = false; select(null); draw(); H('onSelect', null); } return; }
      const a = selArmy(), t = a && mine(a) && S.targets && S.targets.find((x) => x.kind === hit.kind && x.id === hit.id);
      if (t) return target(t);
      S.cardsOpen = false; select({ kind: hit.kind, id: hit.id }); draw(); H('onSelect', { kind: hit.kind, id: hit.id });
    };

    // ---------------------------------------------------------------------------- events
    const act = {
      end: () => H('onEndSeason'),
      goal: () => ui.goal(),
      cards: () => { S.cardsOpen = !S.cardsOpen; if (S.cardsOpen) { S.fc = null; S.preview = null; S.ask = null; } draw(); },
      home: () => H('onOverview'),
      close: () => { select(null); draw(); H('onSelect', null); },
      chip: (d) => tap({ kind: d.k, id: d.id }),
      tgt: (d) => { const t = S.targets && S.targets[+d.i]; if (t) target(t); },
      clear: (d) => H('onClearOrder', d.id),
      task: (d) => { const t = selTown(); if (!t) return; S.preview = null; S.pend = { type: 'task', town: t.id, key: d.k }; draw(); H('onTask', t.id, d.k); },
      untask: (d) => { S.preview = null; draw(); H('onTask', d.id, null); },
      more: () => { S.more = !S.more; draw(); },
      'pv-ok': () => { const p = S.preview; S.preview = null; S.pend = null; draw(); if (p && p.act) H('onConfirmOrder', p.act); },
      'pv-no': () => { S.preview = null; S.pend = null; draw(); H('onCancel', 'preview'); },
      'ask-attack': () => { const a = S.ask; S.ask = null; S.pendF = { armies: [a.army], target: { kind: a.kind, id: a.id } }; draw(); H('onForecast', { armies: [a.army], kind: a.kind, id: a.id, intent: 'attack' }); },
      'ask-siege': () => { const a = S.ask; S.ask = null; S.pend = { type: 'order', army: a.army, target: { kind: a.kind, id: a.id }, intent: 'siege' }; draw(); H('onTarget', { army: a.army, kind: a.kind, id: a.id, intent: 'siege' }); },
      'ask-no': () => { S.ask = null; draw(); H('onCancel', 'ask'); },
      'fc-more': () => { S.fc.more = !S.fc.more; draw(); },
      'fc-no': () => { S.fc = null; S.pendF = null; draw(); H('onCancel', 'forecast'); },
      'fc-go': () => { const f = S.fc; S.fc = null; S.pendF = null; draw(); const ar = f.act.armies || []; H('onConfirmOrder', { type: 'order', army: ar[0], armies: ar, target: f.act.target, intent: 'attack' }); },
      partner: (d) => H('onPartner', d.id),
      'card-yes': () => { const c = S.cards[S.cardIx]; if (c) H('onAnswer', c.id, true); },
      'card-no': () => { const c = S.cards[S.cardIx]; if (c) H('onAnswer', c.id, false); },
      'card-later': () => { S.cardsOpen = false; draw(); },
      'card-prev': () => { S.cardIx = (S.cardIx + S.cards.length - 1) % S.cards.length; draw(); },
      'card-next': () => { S.cardIx = (S.cardIx + 1) % S.cards.length; draw(); },
      wing: (d) => selectWing(d.id),
      wclose: () => { S.bsel = null; drawBattle(); },
      ord: (d) => setOrder(d.w, d.o),
      fight: () => { if (S.busy) return; S.busy = true; drawBattle(); H('onBattleTurn', Object.assign({}, S.bo)); },
      auto: () => { if (S.busy) return; S.busy = true; drawBattle(); H('onAutoBattle'); },
      bdone: () => H('onBattleDone'),
      'goal-ok': () => { S.screen = null; draw(); H('onGoalDone'); },
      'rep-ok': () => { S.screen = null; draw(); H('onReportDone'); },
      'beat-ok': () => { S.screen = null; draw(); H('onBeatDone'); },
      again: () => H('onAgain'),
    };
    layer.addEventListener('click', (e) => { const n = e.target.closest && e.target.closest('[data-a]'); if (!n || !layer.contains(n) || n.disabled) return; const f = act[n.dataset.a]; if (f) f(n.dataset); });
    // panels sit above the 3D canvas: their pointer and wheel events must not reach the map gestures underneath
    ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'wheel', 'touchstart', 'touchmove', 'mousedown', 'contextmenu'].forEach((t) => layer.addEventListener(t, (e) => { if (e.target !== layer) e.stopPropagation(); }, { passive: true }));
    // an ink portrait that fails to load leaves the seal glyph showing
    layer.addEventListener('error', (e) => { if (e.target && e.target.tagName === 'IMG') e.target.style.display = 'none'; }, true);

    // nothing chosen yet in the first season: one line on how to start, and that skipping is fine
    function drawHint() {
      const v = S.view, on = !!v && !S.battle && !S.screen && v.season <= 1 && !S.sel && !S.cardsOpen && !S.fc && !S.preview && !S.ask && !v.armies.some((a) => a.order) && !v.towns.some((t) => t.task);
      show(el.hint, on); if (on) el.hint.textContent = 'Chạm một đạo quân của ta, rồi chạm đích trên bản đồ để ra lệnh. Không cần lệnh nào: cứ bấm Hết mùa cũng được.';
    }
    function draw() { drawHud(); drawHint(); drawSide(); drawDock(); drawCards(); drawBattle(); drawFull(); drawLabels(); }

    // ---------------------------------------------------------------------------- API
    const ui = {
      el: layer,
      render(view, sel) {
        S.view = view;
        if (view && view.res && !S.snap[view.season]) S.snap[view.season] = { uy: view.res.uy };
        if (arguments.length > 1) select(sel || null);
        if (S.sel && !(S.sel.kind === 'army' ? army(S.sel.id) : town(S.sel.id))) select(null);
        ui.cards(view && view.cards, true);
        draw();
      },
      armyCard(a, targets) { select({ kind: 'army', id: a.id }); S.tasks = null; S.targets = (targets || []).slice().sort((x, y) => (x.d || 0) - (y.d || 0)); draw(); },
      townPanel(t, tasks) { select({ kind: 'town', id: t.id }); S.targets = null; S.tasks = tasks || null; draw(); },
      preview(p, a) { S.preview = { p: p || {}, act: a || S.pend }; S.ask = null; S.fc = null; draw(); },
      askIntent(t) { S.ask = { army: t.army || (selArmy() || {}).id, kind: t.kind, id: t.id }; S.preview = null; S.fc = null; draw(); },
      forecast(f, a, x) {
        a = a || {}; const p = S.pendF || {}, armies = a.armies || (a.army ? [a.army] : p.armies || (selArmy() ? [selArmy().id] : []));
        S.fc = { f, act: { armies, target: a.target || (a.kind ? { kind: a.kind, id: a.id } : p.target) }, x, more: false }; S.ask = null; S.preview = null; S.cardsOpen = false; draw();
      },
      cards(list, quiet) {
        if (list) S.cards = list;
        if (S.cardIx >= S.cards.length) S.cardIx = 0;
        if (!S.cards.length) S.cardsOpen = false;
        // an urgent card opens itself once, never over a gesture in progress (an open preview, question or forecast)
        const u = S.cards.findIndex((c) => c.urgent && !S.seen[c.id]);
        if (u >= 0 && !S.fc && !S.preview && !S.ask) { S.seen[S.cards[u].id] = 1; S.cardIx = u; S.cardsOpen = true; }
        if (!quiet) draw();
      },
      openCards() { if (S.cards.length) { S.cardsOpen = true; S.fc = null; S.preview = null; S.ask = null; draw(); } },
      battle(st) {
        const prev = S.battle;
        S.busy = false;
        if (!st) { S.battle = null; S.bo = {}; S.bsel = null; draw(); return; }
        if (!prev || prev.b.site !== st.b.site || prev.b.turn !== st.b.turn) S.bo = {};
        Object.keys(S.bo).forEach((id) => { const w = st.b.wings.find((x) => x.id === id); if (!w || w.gone || S.bo[id] === (st.proposed || {})[id]) delete S.bo[id]; });
        if (S.bsel && !st.b.wings.some((w) => w.id === S.bsel && !w.gone)) S.bsel = null;
        S.battle = st; S.sel = null; draw();
      },
      report(r) { S.screen = { t: 'report', report: r || {} }; draw(); },
      beat(b) { S.screen = { t: 'beat', beat: b }; S.sel = null; draw(); },
      goal(info) { S.screen = { t: 'goal', info }; draw(); },
      over(o) { S.screen = { t: 'over', over: o || {} }; draw(); },
      close() { S.screen = null; draw(); },
      labels(list) { S.labels = list || []; drawLabels(); },
      tap,
      selectWing,
      destroy() { if (ro) ro.disconnect(); window.removeEventListener('resize', fit); layer.remove(); style.remove(); },
    };
    ui.battle.selectWing = selectWing;
    ui.battle.end = () => ui.battle(null);
    let ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(fit); ro.observe(root); }
    window.addEventListener('resize', fit);
    fit();
    return ui;
  }

  window.HuaiNanUI = { create };
})();
