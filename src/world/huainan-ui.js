// Huai Nan demo UI (v2, docs/design/v2-build.md §U; docs/design/v2-polish.md, job 7): plain DOM over the 3D canvas, one
// injected <style>, no framework. It never calls the game engine: it draws the View (and the shapes in
// docs/design/v2-fixtures/) it is given and calls handlers. Look: dark lacquer panels with a gold hairline, cinnabar
// buttons, ink portraits and seal chops, from demo 1's approved UI (docs/phases/v2-gameplay/demo1/ui/); fonts Be Vietnam
// Pro, Noto Serif, Noto Serif TC. Reference frame: phone landscape 844×390 (bigger screens scale the whole layer up to
// 1.4×). Every number is a number; a win percentage is never printed anywhere. Motion is transform and opacity only
// (panels ease in and out, resources count up or down with a floating +/−, buttons give under the finger): cheap on a
// phone, and no backdrop blur over the live canvas.
//
//   const ui = HuaiNanUI.create(root, handlers, { factions?, portraits?, towns?, tasks?, battle?, coach? })
//       factions: { fid: { name, short, glyph, color } } (data/scenario/huainan.json) · portraits: base url ('…/portraits/'),
//       fn(id) → url, or { id: url } (a missing image falls back to the seal glyph) · towns: data.towns (names, terrain)
//       · tasks: data.tasks (task names for the general's plan) · battle: EmperorsBattle (default: the global)
//       · coach: false never shows the first-season steps
//   ui.render(view, sel?)        HUD (Lương / Tiền / Uy with last season's change), card badge, Hết mùa (always enabled),
//                                selection panel from sel = { kind: 'army'|'town', id } | null
//   ui.armyCard(army, targets?)  targets = V2.targets(g, army.id): a list to tap besides the map
//   ui.townPanel(town, tasks)    tasks = V2.tasks(g, town.id): 2–3 suggested, "Thêm" for all
//   ui.preview(p, act?)          chip: seasons, resources before → after, lines; act goes to onConfirmOrder
//   ui.askIntent(target)         enemy town: "Đánh ngay" / "Vây"   ·   ui.forecast(f, act?, { partners?, preview? })
//   ui.cards(list?)              queue + badge; opens when the badge is tapped, or by itself for an urgent card
//   ui.battle(state)             state = V2.battle(g) (or V2.lastBattle(g) when over: the recap); ui.battle.selectWing(id);
//                                ui.battle(null). Wing cards: arm, men, the general's order and one line why
//   ui.report(r) · ui.beat({ town, from, to, siege }) a town changing hands, over the map · ui.goal(info?) · ui.over(o) · ui.close()
//   ui.labels([{ kind, id, x, y }])  map chips (town / army) at screen px, drawn centred above (x, y)
//   ui.tap({ kind, id }|null)    what a tap on the map does (chip taps call it): pick a target, or select
//   ui.lock(on, { bars? })       a hook plays: panels fade out, the HUD stays, a tap anywhere → onSkip ("Chạm để bỏ qua");
//                                bars: the cinema letterbox (also ui.bars(on) on its own; lock(false) lifts it)
//   ui.caption(text, { who?, name?, ms? }) → Promise   a subtitle strip: portrait or seal + one line. who = a general id,
//                                a faction id or { id, name, seal, fid }; ms: how long (default from the length; 0 = until
//                                ui.caption(null)). A new caption replaces the last; the promise settles when it goes
//   ui.watch(on)                 watch mode: HUD only, "Đang xem · Dừng" → onWatch(false); the map's "Xem" → onWatch(true)
//   ui.mute(on?) → bool          the sound toggle, kept in localStorage 'tq.mute'; a tap → onMute(bool) (and once at create
//                                when it was left muted)
//   ui.advise(list|null)         the general's plan (V2.advise(g): [{ type: 'order', army, target, intent, why } |
//                                { type: 'task', town, key, why }]): "Theo" → onConfirmOrder(act), "Theo cả" for all.
//                                The "Đề xuất" button (season HUD) calls onAdvise() and shows only when that handler exists
//   ui.coach(on)                 first-season steps (an army → a target → Hết mùa): shown once per browser ('tq.coach'),
//                                never blocking; coach(false) hides it for this session, coach(true) shows it again
//   handlers: onEndSeason() onSelect(sel|null) onTarget({ army, kind, id, intent }) onForecast({ armies, kind, id, intent })
//     onPartner(armyId) onConfirmOrder(act) onCancel(what) onClearOrder(armyId) onTask(townId, key|null) onAnswer(cardId, yes)
//     onBattleOrder(wingId, order) onWingSelect(wingId) onBattleTurn(overrides) onAutoBattle() onBattleDone()
//     onReportDone() onBeatDone() onGoalDone() onAgain() onOverview() onSkip() onWatch(on) onMute(on) onAdvise()
(function () {
  'use strict';

  const ARMS = ['bo', 'cung', 'ky', 'thuy'];
  const ARM_NAME = { bo: 'Bộ', cung: 'Cung', ky: 'Kỵ', thuy: 'Thủy' };
  const LANE = ['trái', 'giữa', 'phải'];
  const LANE_KIND = { open: 'đồng', ford: 'bến', wood: 'rừng', hill: 'đồi' };
  const STATS = [['uy', 'Uy'], ['tai', 'Tài'], ['muu', 'Mưu'], ['dung', 'Dũng'], ['kien', 'Kiên']];
  // the stat that matters for what the card is about (freeze v2: prediction → Mưu, attack → Dũng, hold → Kiên, morale → Uy, building → Tài)
  const STAT_CTX = { uy: 'sĩ khí', tai: 'xây dựng', muu: 'đọc trận', dung: 'sức đánh', kien: 'sức giữ' };
  const INTENT = { move: 'Đi tới', attack: 'Đánh', siege: 'Vây', hold: 'Giữ' };
  // an order in a few words, for a wing card the player changed (the order picker shows the rules' full text)
  const ORDER_SHORT = { tien: 'Lên một hàng, chạm địch thì đánh.', xung: 'Lên hai hàng, cú va +40%.', giu: 'Đứng yên, thủ +25%.', ban: 'Bắn cánh địch trong 2 hàng.', suon: 'Sang làn bên, đánh sườn +50%.', rut: 'Lùi một hàng, hồi sĩ khí.', hoa: 'Đốt địch trong rừng, trên thuyền.' };
  const TASK_NAME = { ruong: 'Khai ruộng', luy: 'Đắp lũy', cho: 'Dựng chợ', mo_bo: 'Mộ bộ binh', mo_cung: 'Mộ cung thủ', mo_ky: 'Mộ kỵ', mo_thuy: 'Đóng thuyền' };
  const TONE = { text: '#efe6d2', muted: '#b3a486', gold: '#e2bf6c', bad: '#f08a72', good: '#9bd49a' };
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
    luong: '<path d="M12 22V8"/><path d="M12 8C9 7 8 4.5 8 2c3 .5 4 3 4 6z"/><path d="M12 13c-3-.5-5-2.5-5-5.5 3 .5 5 2.5 5 5.5z"/><path d="M12 13c3-.5 5-2.5 5-5.5-3 .5-5 2.5-5 5.5z"/><path d="M12 18c-3-.5-5-2.5-5-5.5 3 .5 5 2.5 5 5.5z"/><path d="M12 18c3-.5 5-2.5 5-5.5-3 .5-5 2.5-5 5.5z"/>',
    tien: '<circle cx="12" cy="12" r="9"/><rect x="9" y="9" width="6" height="6" rx=".5"/>',
    uy: '<path d="M6 22V3"/><path d="M6 4h12l-3 4.5L18 13H6"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5L12 13l8.5-6.5"/>',
    home: '<circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
    eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    snd: '<path d="M4 9.5h3.5L13 5v14l-5.5-4.5H4z"/><path d="M16.5 9a4 4 0 0 1 0 6"/><path d="M19 6.5a7.5 7.5 0 0 1 0 11"/>',
    mute: '<path d="M4 9.5h3.5L13 5v14l-5.5-4.5H4z"/><path d="M17 9.5l5 5M22 9.5l-5 5"/>',
    scroll: '<path d="M7 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8"/><path d="M7 4a2.5 2.5 0 0 0-2.5 2.5V8H9V6.5A2.5 2.5 0 0 0 7 4z"/><path d="M8 20a2.5 2.5 0 0 1-2.5-2.5V8"/><path d="M11 9h6M11 12.5h6M11 16h4"/>',
    sword: '<path d="M14.5 17.5L4 7V4h3l10.5 10.5"/><path d="M13 19l6-6"/><path d="M16.5 16.5l3.5 3.5"/>',
    camp: '<circle cx="12" cy="12" r="9" stroke-dasharray="2.6 2.6"/><rect x="8.5" y="8.5" width="7" height="7" rx="1"/>',
    wind: '<path d="M3 8.5h10.5a2.8 2.8 0 1 0-2.8-2.8"/><path d="M3 12.5h15a3 3 0 1 1-3 3"/><path d="M3 16.5h7"/>',
    calm: '<path d="M4 12h16"/>',
    next: '<path d="M6 6l6 6-6 6"/><path d="M13 6l6 6-6 6"/>',
    arrow: '<path d="M4 12h15"/><path d="M13 6l6 6-6 6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
  };

  const CSS = `
.hn{position:absolute;left:0;top:0;transform-origin:0 0;pointer-events:none;overflow:hidden;color:#efe6d2;font:400 12.5px/1.38 "Be Vietnam Pro","Noto Sans","Liberation Sans","DejaVu Sans",system-ui,sans-serif;
  -webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;-webkit-font-smoothing:antialiased;
  --hi:#f7efdd;--mu:#b3a486;--go:#e2bf6c;--go2:#f3d58f;--bd:#f08a72;--gd:#9bd49a;--ln:rgba(226,191,108,.34);--ln2:rgba(226,191,108,.17);
  --lac:linear-gradient(180deg,rgba(46,33,22,.955),rgba(25,18,12,.955) 44%,rgba(17,12,8,.965));
  --sh:inset 0 1px 0 rgba(255,229,180,.1),0 0 0 1px rgba(0,0,0,.34),0 14px 32px rgba(0,0,0,.42);
  --cin:linear-gradient(180deg,#b93d2d,#982b1f 50%,#7b1d14);--cinsh:inset 0 1px 0 rgba(255,214,176,.34),inset 0 -3px 0 rgba(0,0,0,.2),0 6px 18px rgba(80,16,8,.4);
  --ease:cubic-bezier(.2,.8,.2,1);
  --ser:"Noto Serif","Noto Serif CJK SC","Liberation Serif","DejaVu Serif",Georgia,serif;--cjk:"Noto Serif TC","Noto Serif CJK SC","WenQuanYi Zen Hei","Noto Sans CJK SC",serif}
.hn *{box-sizing:border-box;scrollbar-width:thin;scrollbar-color:rgba(226,191,108,.35) transparent}
.hn ::-webkit-scrollbar{width:4px}.hn ::-webkit-scrollbar-thumb{background:rgba(226,191,108,.35);border-radius:2px}
.hn button{font:inherit;color:inherit;margin:0;padding:0;text-align:left;cursor:pointer;-webkit-appearance:none;appearance:none;background:none;border:0;
  transition:transform .14s var(--ease),filter .14s,background-color .2s,border-color .2s,box-shadow .2s,opacity .2s}
.hn button:active:not(:disabled){transform:translateY(1px) scale(.965);filter:brightness(1.16)}
.hn .x{display:none!important}
.hn b{font-weight:700}
.hn .num{font-variant-numeric:tabular-nums}
.hn .en{animation:hnIn .3s var(--ease) backwards}
.hn .lv{animation:hnOut .18s ease-in forwards;pointer-events:none!important}
@keyframes hnIn{from{opacity:0;transform:translate3d(var(--ix,0),var(--iy,8px),0) scale(var(--is,1))}}
@keyframes hnOut{to{opacity:0;transform:translate3d(var(--ix,0),var(--iy,8px),0) scale(var(--is,1))}}
.hn .pn{position:absolute;pointer-events:auto;background:var(--lac);border:1px solid var(--ln);border-radius:14px;box-shadow:var(--sh);padding:10px 12px 12px;display:flex;flex-direction:column;gap:7px}
.hn .bt{min-height:40px;padding:6px 11px;border-radius:10px;border:1px solid rgba(226,191,108,.36);background:linear-gradient(180deg,rgba(255,240,210,.075),rgba(255,240,210,.02));box-shadow:inset 0 1px 0 rgba(255,236,196,.07);
  display:flex;flex-direction:column;justify-content:center;gap:1px;pointer-events:auto;font-weight:600;color:#f1e5ca}
.hn .bt.pr{background:var(--cin);border-color:rgba(243,213,143,.72);color:#fcf2de;font-weight:700;box-shadow:var(--cinsh)}
.hn .bt:disabled{opacity:.42;cursor:default}
.hn .bt small{font-size:10.5px;font-weight:400;color:var(--mu)}.hn .bt.pr small{color:#f2dccb}
.hn .ic{width:13px;height:13px;flex:none;stroke:currentColor;fill:none;stroke-width:2.1;stroke-linecap:round;stroke-linejoin:round;vertical-align:-2px}
.hn .bad{color:var(--bd)}.hn .good{color:var(--gd)}.hn .gold{color:var(--go)}.hn .mu{color:var(--mu)}
.hn .ser{font-family:var(--ser)}
.hn .kk{font-size:9.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--go)}
.hn .rule{height:1px;background:linear-gradient(90deg,transparent,rgba(226,191,108,.35),transparent);flex:none}
/* seals (a chop: colour, cream double frame) and portraits (the glyph always, the ink portrait on top when it loads) */
.hn .seal{flex:none;width:40px;height:40px;border-radius:9px;background:var(--c,#8a2a20);display:grid;place-items:center;font:700 22px/1 var(--cjk);color:#fbf3e2;text-shadow:0 1px 0 rgba(0,0,0,.25);
  box-shadow:inset 0 0 0 2px rgba(251,243,226,.6),inset 0 0 0 4px var(--c,#8a2a20),inset 0 0 0 5px rgba(251,243,226,.28),0 2px 7px rgba(0,0,0,.35)}
.hn .seal.S{width:24px;height:24px;border-radius:6px;font-size:13px;box-shadow:inset 0 0 0 1.5px rgba(251,243,226,.6),0 1px 3px rgba(0,0,0,.3)}
.hn .seal.XL{width:74px;height:74px;border-radius:14px;font-size:42px;box-shadow:inset 0 0 0 3px rgba(251,243,226,.62),inset 0 0 0 7px var(--c,#8a2a20),inset 0 0 0 8.5px rgba(251,243,226,.3),0 8px 20px rgba(0,0,0,.45)}
.hn .pt{position:relative;flex:none;width:36px;height:36px;border-radius:50%;background:var(--c,#555);display:grid;place-items:center;font:700 19px var(--cjk);color:#f6eedb;overflow:hidden;
  box-shadow:0 0 0 2px var(--c,#555),0 0 0 3.2px rgba(226,191,108,.42)}
.hn .pt img{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;background:#efe3c8}
.hn .pt.L{width:52px;height:52px;border-radius:12px;font-size:27px;box-shadow:0 0 0 2px var(--c,#555),0 0 0 3.5px rgba(226,191,108,.5),0 6px 14px rgba(0,0,0,.4)}
.hn .pt.M{width:44px;height:44px;border-radius:10px;font-size:23px}
.hn .pt.XL{width:66px;height:66px;border-radius:14px;font-size:34px;box-shadow:0 0 0 2.5px var(--c,#555),0 0 0 4.5px rgba(226,191,108,.55),0 8px 18px rgba(0,0,0,.45)}
.hn .ib{position:relative;width:42px;height:42px;flex:none;border-radius:12px;background:var(--lac);border:1px solid var(--ln);box-shadow:var(--sh);display:grid;place-items:center;pointer-events:auto;color:var(--go)}
.hn .ib svg{width:19px;height:19px;stroke:currentColor;fill:none;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.hn .ib.tx{width:auto;padding:0 12px 0 10px;display:flex;align-items:center;gap:6px;font-weight:700;font-size:12.5px;color:#f1dfb4}
.hn .ib.tx svg{width:17px;height:17px}
.hn .ib.q{font:700 19px var(--ser)}
.hn .ib .n{position:absolute;top:-6px;right:-6px;min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:#b3262e;border:1.5px solid var(--go2);font:700 11px/17px "Be Vietnam Pro",system-ui,sans-serif;color:#fff;text-align:center;font-style:normal;font-variant-numeric:tabular-nums}
.hn .ib.u{border-color:var(--go)}.hn .ib.u::after{content:'';position:absolute;inset:-4px;border-radius:15px;border:1.5px solid var(--go2);animation:hnRing 1.6s ease-out infinite;pointer-events:none}
@keyframes hnRing{0%{opacity:.85;transform:scale(.94)}100%{opacity:0;transform:scale(1.14)}}
/* top bar: seal, name, calendar, then Lương · Tiền · Uy in one lacquer strip */
.hn-hud{position:absolute;left:10px;top:8px;height:46px;display:flex;align-items:center;padding:0 2px 0 4px;border-radius:14px;background:var(--lac);border:1px solid var(--ln2);box-shadow:var(--sh);pointer-events:none;--iy:-8px}
.hn-hud .seal{width:36px;height:36px;font-size:20px;border-radius:9px;margin-right:9px}
.hn-hud .who{display:flex;flex-direction:column;padding-right:12px}
.hn-hud .who b{font:700 14px/1.15 var(--ser);color:var(--hi);white-space:nowrap}
.hn-hud .who span{font-size:10.5px;color:var(--mu);white-space:nowrap}
.hn-hud .rs{position:relative;height:32px;padding:0 12px;border-left:1px solid rgba(226,191,108,.16);display:flex;flex-direction:column;justify-content:center}
.hn-hud .rs .k{display:flex;align-items:center;gap:4px;font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--mu);line-height:1.1}
.hn-hud .rs .k svg{width:11px;height:11px;stroke:var(--go);fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.hn-hud .rs .r2{display:flex;align-items:baseline;gap:6px;white-space:nowrap}
.hn-hud .rs .v{font-size:16px;line-height:1.2;font-weight:700;font-variant-numeric:tabular-nums;color:var(--hi)}
.hn-hud .rs small{font-size:10px;font-variant-numeric:tabular-nums;letter-spacing:.01em}.hn-hud .rs small em{font-style:normal}
.hn-hud .rs.w .k{color:var(--bd)}.hn-hud .rs.w .k svg{stroke:var(--bd)}.hn-hud .rs.w .v{color:var(--bd)}
.hn-hud .rs.w::after{content:'';position:absolute;left:8px;right:8px;bottom:-5px;height:2px;border-radius:1px;background:var(--bd);box-shadow:0 0 8px var(--bd);animation:hnWarn 1.4s ease-in-out infinite}
@keyframes hnWarn{50%{opacity:.35}}
.hn-hud .fl{position:absolute;left:10px;top:calc(100% + 8px);padding:1px 7px;border-radius:8px;background:rgba(18,13,9,.92);border:1px solid rgba(226,191,108,.25);font-style:normal;font-size:11.5px;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap;animation:hnFl 1.9s var(--ease) forwards}
@keyframes hnFl{0%{opacity:0;transform:translateY(-10px)}14%{opacity:1;transform:translateY(0)}72%{opacity:1;transform:translateY(3px)}100%{opacity:0;transform:translateY(12px)}}
.hn-tr{position:absolute;right:58px;top:8px;display:flex;gap:6px;--iy:-8px}
.hn-sys{position:absolute;right:10px;top:8px;display:flex;gap:6px;align-items:center}
.hn-sys .ib.off{color:var(--mu)}
.hn .hn-wp{height:42px;padding:0 6px 0 14px;border-radius:21px;display:flex;align-items:center;gap:9px;background:var(--lac);border:1px solid var(--ln);box-shadow:var(--sh);pointer-events:auto}
.hn-wp i{width:9px;height:9px;border-radius:50%;background:#e0483b;box-shadow:0 0 0 3px rgba(224,72,59,.22);animation:hnRec 1.6s ease-in-out infinite}
@keyframes hnRec{50%{opacity:.35}}
.hn-wp b{font:700 13.5px var(--ser);color:var(--hi);white-space:nowrap}
.hn-wp span{height:30px;padding:0 12px;border-radius:15px;background:var(--cin);border:1px solid rgba(243,213,143,.6);display:flex;align-items:center;font-weight:700;font-size:12px;color:#fcf2de}
/* Hết mùa, and the general's plan above it */
.hn .hn-end{position:absolute;right:10px;bottom:10px;width:184px;height:58px;border-radius:14px;border:1px solid rgba(243,213,143,.75);background:var(--cin);box-shadow:var(--cinsh),0 10px 24px rgba(0,0,0,.35);
  display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:auto;text-align:center;--iy:14px}
.hn-end b{font:700 18.5px/1.1 var(--ser);color:#fdf4e2;letter-spacing:.02em;text-shadow:0 1px 0 rgba(0,0,0,.3)}
.hn-end span{font-size:10.5px;color:#f5dcc6;margin-top:3px;padding:0 8px;line-height:1.2}.hn-end.w span{color:#ffe0d4;font-weight:600}
.hn-end.cue::after{content:'';position:absolute;inset:-5px;border-radius:17px;border:2px solid var(--go2);animation:hnRing 1.5s ease-out infinite;pointer-events:none}
.hn .hn-adv{position:absolute;right:10px;bottom:76px;width:184px;height:40px;padding:0 12px;border-radius:12px;background:var(--lac);border:1px solid var(--ln);box-shadow:var(--sh);display:flex;align-items:center;gap:9px;pointer-events:auto;color:#f1dfb4;--iy:10px}
.hn-adv svg{width:18px;height:18px;stroke:var(--go);fill:none;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;flex:none}
.hn-adv b{font:700 13.5px var(--ser)}.hn-adv span{margin-left:auto;font-size:10px;color:var(--mu)}
.hn-adv.on{border-color:var(--go);background:linear-gradient(180deg,rgba(120,84,30,.7),rgba(60,40,16,.9))}
/* selection panel (left) */
.hn .hn-side{left:10px;top:62px;width:300px;max-height:calc(100% - 72px);overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;--ix:-16px;--iy:0}
.hn .ph{display:flex;gap:10px;align-items:center}
.hn .pi{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.hn .pi .nm{font:700 15.5px/1.2 var(--ser);color:var(--hi)}
.hn .pi .cl2{font-size:11px;color:var(--mu)}
.hn .xb{width:34px;height:34px;flex:none;border-radius:10px;border:1px solid rgba(226,191,108,.22);display:grid;place-items:center;pointer-events:auto;align-self:flex-start;color:#d9ccae}
.hn .xb svg{width:14px;height:14px;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;fill:none}
.hn .lo{font-size:11px;display:flex;flex-direction:column;gap:3px;margin-top:3px}
.hn .tr{position:relative;height:5px;border-radius:3px;background:rgba(255,255,255,.1);overflow:hidden}
.hn .tr i{display:block;height:100%;border-radius:3px}.hn .tr u{position:absolute;top:0;width:1px;height:100%;background:rgba(255,255,255,.5)}
.hn .st{display:grid;grid-template-columns:repeat(5,1fr);gap:4px}
.hn .st div{padding:3px 5px 4px;border-radius:8px;border:1px solid transparent}
.hn .st div.f{border-color:rgba(226,191,108,.6);background:rgba(226,191,108,.09)}
.hn .st span{font-size:10px;color:var(--mu)}.hn .st div.f span{color:var(--go)}
.hn .st b{margin-left:3px;font-size:12px}.hn .st em{display:block;font-style:normal;font-size:9px;line-height:1.2;color:var(--go);white-space:nowrap}
.hn .bar{height:3px;border-radius:2px;background:rgba(255,255,255,.1);overflow:hidden;margin-top:3px}.hn .bar i{display:block;height:100%}
.hn .ell{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hn .note{font-size:11px;line-height:1.38;color:var(--mu)}
.hn .txt{font-size:11.5px;line-height:1.4;color:#ddd0b3}
.hn .box{padding:7px 9px;border-radius:10px;background:rgba(0,0,0,.2);border:1px solid rgba(226,191,108,.12);display:flex;flex-wrap:wrap;gap:3px 12px;align-items:center}
.hn .box .u{display:flex;align-items:center;gap:4px;font-size:13px;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--hi)}.hn .box .u .ic{color:var(--go)}
.hn .box .w100{width:100%;font-size:11px;color:var(--mu)}
.hn .od{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:2px 0}
.hn .od .ol{display:block;font-size:9.5px;font-weight:700;color:var(--mu);text-transform:uppercase;letter-spacing:.12em}
.hn .od b{font:700 14.5px var(--ser)}.hn .od>div:first-child{min-width:0}
.hn .od .bt{flex:none;min-height:36px;font-size:12px}
.hn .sec{font-size:9.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--mu);margin-top:2px}
.hn .lst{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.hn .tg{min-height:46px;padding:5px 10px;border-radius:10px;border:1px solid rgba(240,138,114,.45);background:linear-gradient(180deg,rgba(120,36,24,.5),rgba(80,22,14,.5));display:flex;flex-direction:column;justify-content:center;min-width:0;pointer-events:auto}
.hn .tg.mv{border-color:rgba(226,191,108,.42);background:linear-gradient(180deg,rgba(110,78,28,.45),rgba(70,48,16,.45))}.hn .tg.on{box-shadow:inset 0 0 0 1.5px var(--go2)}
.hn .tg b{font:700 13px var(--ser);color:var(--hi);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hn .tg span{font-size:10.5px;color:#e6d0c2;white-space:nowrap}
.hn .tk{min-height:44px;padding:5px 11px;border-radius:10px;border:1px solid rgba(226,191,108,.22);background:rgba(255,255,255,.035);display:flex;flex-direction:column;gap:1px;pointer-events:auto}
.hn .tk.on{border-color:var(--go);background:rgba(226,191,108,.16)}.hn .tk:disabled{opacity:.5;cursor:default}
.hn .tk .t1{display:flex;justify-content:space-between;gap:8px;align-items:baseline}.hn .tk .t1 b{font:700 13px var(--ser);color:var(--hi)}.hn .tk .t1 em{font-style:normal;font-size:10.5px;color:var(--go);white-space:nowrap;font-variant-numeric:tabular-nums}
.hn .tk .t2{font-size:10.5px;line-height:1.3;color:var(--mu);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hn .tk .t2 i{font-style:normal;color:var(--bd);font-weight:600}
.hn .more{min-height:40px;border-radius:10px;border:1px dashed rgba(226,191,108,.38);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--go);pointer-events:auto}
/* bottom dock: the preview and the attack / siege question */
.hn-dock{position:absolute;left:320px;right:204px;bottom:10px;padding:10px 12px 12px;background:var(--lac);border:1px solid rgba(226,191,108,.6);border-radius:14px;box-shadow:var(--sh);display:flex;flex-direction:column;gap:6px;pointer-events:auto;--iy:14px}
.hn-dock .h{display:flex;justify-content:space-between;align-items:baseline;gap:8px}.hn-dock .h b{font:700 15px var(--ser);color:var(--hi)}.hn-dock .h span{font-size:11.5px;font-weight:700;color:var(--go);white-space:nowrap}
.hn .rr{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:12.5px;font-variant-numeric:tabular-nums}.hn .rr span{white-space:nowrap;color:var(--mu)}.hn .rr b{font-size:13.5px}.hn .rr i{font-style:normal;color:#d9ccae}
.hn .ln{font-size:11px;line-height:1.38;color:#ddd0b3}
.hn-dock .bb{display:flex;gap:8px}.hn-dock .bb .bt{flex:1;align-items:center}
.hn-dock .ask{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.hn-dock .ask .bt{min-height:58px;flex-direction:row;align-items:center;gap:10px;padding:6px 12px}
.hn-dock .ask .bt svg{width:24px;height:24px;flex:none;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;opacity:.9}
.hn-dock .ask .bt div{display:flex;flex-direction:column}.hn-dock .ask .bt b{font:700 15px var(--ser)}
/* cards */
.hn .hn-card{left:10px;top:62px;width:452px;max-height:calc(100% - 72px);overflow-y:auto;overscroll-behavior:contain;border-color:rgba(226,191,108,.6);--ix:-16px;--iy:0}
.hn-card .k{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
.hn-card .ti{font:700 17.5px/1.25 var(--ser);color:var(--hi)}
.hn-card .tx{font:400 13.5px/1.55 var(--ser);color:#e9dfc8}
.hn-card .gb{display:flex;flex-direction:column;gap:5px;padding:7px 10px;border-radius:10px;background:rgba(0,0,0,.2);border:1px solid rgba(226,191,108,.16)}
.hn-card .yn{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.hn-card .yn .bt{min-height:64px;justify-content:flex-start;padding:8px 11px;gap:3px}.hn-card .yn .bt b{font:700 14px var(--ser)}.hn-card .yn .bt small{font-size:11px;line-height:1.32;white-space:normal}
.hn-card .pg{display:flex;align-items:center;gap:4px}.hn-card .pg .bt{min-height:36px;width:36px;padding:0;align-items:center;font-size:18px}.hn-card .pg .bt.l{width:auto;padding:0 11px;font-size:11.5px}
/* forecast (takes the left slot) */
.hn .hn-fc{border-color:rgba(226,191,108,.6);overflow:hidden;gap:7px}
.hn-fc .fcb{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:7px;overscroll-behavior:contain}
.hn-fc .lb2{font:700 28px/1.05 var(--ser);letter-spacing:.01em}
.hn-fc .sc5{display:flex;gap:3px;margin-top:6px}.hn-fc .sc5 i{flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,.13)}
.hn-fc .two{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.hn-fc .two div{display:flex;flex-direction:column;padding:6px 9px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.2)}
.hn-fc .two div.me{background:linear-gradient(180deg,rgba(179,38,46,.24),rgba(120,26,30,.14));border-color:rgba(214,90,80,.45)}
.hn-fc .two .k{font-size:9.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--mu)}.hn-fc .two b{font-size:19px;font-variant-numeric:tabular-nums;color:var(--hi)}.hn-fc .two .l{font-size:10.5px;color:#d9ccae}
.hn-fc .rs2{display:flex;justify-content:space-between;gap:8px;font-size:12px;line-height:1.3}.hn-fc .rs2 b{white-space:nowrap;font-size:11.5px;font-variant-numeric:tabular-nums}
.hn-fc .pp{display:flex;flex-wrap:wrap;gap:5px}.hn-fc .pp .bt{min-height:38px;padding:4px 10px;flex-direction:row;align-items:center}.hn-fc .pp .bt.on{border-color:var(--go);background:rgba(226,191,108,.18)}
.hn-fc .bb{display:flex;gap:8px}.hn-fc .bb .bt{flex:1;align-items:center}
/* the general's plan (left slot) */
.hn .av{flex:none;display:flex;gap:9px;align-items:center;padding:6px 8px;border-radius:11px;border:1px solid rgba(226,191,108,.18);background:rgba(0,0,0,.18)}
.hn .av.done{border-color:rgba(155,212,154,.4);background:rgba(155,212,154,.07)}
.hn .av .ai{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}.hn .av .ai b{font:700 13.5px var(--ser);color:var(--hi)}.hn .av .ai span{font-size:10.5px;color:var(--mu)}.hn .av .ai .why{font-size:10.5px;line-height:1.3;color:#d6c9ac;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.hn .av .bt{flex:none;min-height:36px;padding:0 12px;align-items:center}
.hn .av .ok{flex:none;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;color:var(--gd);border:1px solid rgba(155,212,154,.45)}.hn .av .ok svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.hn .av .tw{width:36px;height:36px;font-size:18px;border-radius:50%}
.hn .hn-side .bb{display:flex;gap:8px}.hn .hn-side .bb .bt{flex:1;align-items:center}
/* first-season steps */
.hn .hn-coach{position:absolute;left:10px;bottom:10px;width:272px;padding:9px 8px 10px 11px;border-radius:14px;background:var(--lac);border:1px solid rgba(226,191,108,.55);box-shadow:var(--sh);pointer-events:auto;display:flex;gap:10px;align-items:center;--iy:12px}
.hn .hn-coach.r{left:auto;right:206px}
.hn-coach .no{flex:none;width:32px;height:32px;border-radius:50%;border:1.5px solid var(--go);display:grid;place-items:center;font:700 16px var(--ser);color:var(--go2)}
.hn-coach .cc{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.hn-coach .cc b{font:700 13.5px/1.25 var(--ser);color:var(--hi)}.hn-coach .cc span{font-size:10.5px;line-height:1.3;color:var(--mu)}
.hn-coach .dt{display:flex;gap:4px;margin-top:3px}.hn-coach .dt i{width:14px;height:3px;border-radius:2px;background:rgba(255,255,255,.16)}.hn-coach .dt i.on{background:var(--go)}
.hn-coach .xb{width:32px;height:32px;align-self:center}
.hn-coach.r.s3::after{content:'';position:absolute;right:-9px;top:50%;margin-top:-8px;border:8px solid transparent;border-right:0;border-left:9px solid rgba(226,191,108,.7);animation:hnNudge 1.2s ease-in-out infinite}
@keyframes hnNudge{50%{transform:translateX(4px)}}
/* map chips (harness; the page draws its labels in the scene) */
.hn-lab{position:absolute;left:0;top:0;width:0;height:0;pointer-events:none}
.hn .lb{position:absolute;left:0;top:0;display:flex;align-items:center;gap:6px;padding:3px 8px 3px 4px;border-radius:10px;border:1px solid rgba(226,191,108,.32);background:rgba(20,15,10,.88);box-shadow:0 4px 12px rgba(0,0,0,.35);pointer-events:auto;white-space:nowrap}
.hn .lb.tw{flex-direction:column;gap:0;padding:3px 9px;min-width:96px;align-items:center;justify-content:center;min-height:40px}
.hn .lb.on{border-color:var(--go);box-shadow:0 0 0 1px var(--go),0 4px 12px rgba(0,0,0,.35)}.hn .lb.tgt{border-color:var(--bd);background:rgba(96,28,20,.92);box-shadow:0 0 0 1px var(--bd)}.hn .lb.tgt.mv{border-color:var(--go);background:rgba(90,62,20,.92);box-shadow:0 0 0 1px var(--go)}
.hn .lb .n{display:flex;align-items:center;gap:5px;font:700 13px var(--ser);color:var(--hi)}.hn .lb .dot{width:9px;height:9px;border-radius:50%;box-shadow:0 0 0 1.5px rgba(246,238,219,.7)}
.hn .lb .s{font-size:10.5px;color:#c9bb9c;font-variant-numeric:tabular-nums}
.hn .lb .ai{display:flex;flex-direction:column;min-width:0}.hn .lb .ai b{font-size:12px;color:var(--hi);max-width:118px;overflow:hidden;text-overflow:ellipsis}
.hn .lb .au{display:flex;gap:7px;font-size:11px;font-weight:600;color:#ddd0b3;font-variant-numeric:tabular-nums}.hn .lb .au span{display:flex;align-items:center;gap:2px}
.hn .lb .ao{font-size:10px;color:var(--mu)}
/* battle: the two sides and the turn at the top, my wings as cards along the bottom, the log on the right */
.hn-bt{position:absolute;top:8px;left:0;right:0;margin:0 auto;width:max-content;max-width:calc(100% - 20px);display:flex;align-items:stretch;gap:6px;pointer-events:none;--iy:-10px}
.hn-bt .sd{display:flex;align-items:center;gap:9px;padding:4px 12px 4px 5px;border-radius:14px;background:var(--lac);border:1px solid var(--ln2);box-shadow:var(--sh)}
.hn-bt .sd.foe{padding:4px 5px 4px 12px}
.hn-bt .sd div{display:flex;flex-direction:column;min-width:0}.hn-bt .sd.foe div{align-items:flex-end}
.hn-bt .sd b{font:700 13px/1.15 var(--ser);color:var(--hi);white-space:nowrap;max-width:150px;overflow:hidden;text-overflow:ellipsis}.hn-bt .sd span{font-size:15px;font-weight:700;font-variant-numeric:tabular-nums;color:#e8dcc2}
.hn-bt .sd span small{font-size:10px;font-weight:400;color:var(--mu);margin-left:3px}
.hn-bt .pt{width:38px;height:38px;border-radius:10px;font-size:20px}
.hn-bt .mid{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3px 16px;border-radius:14px;background:var(--cin);border:1px solid rgba(243,213,143,.7);box-shadow:var(--cinsh)}
.hn-bt .mid b{font:700 16px/1.1 var(--ser);color:#fdf4e2;white-space:nowrap}.hn-bt .mid b i{font-style:normal;font-size:12px;opacity:.75}
.hn-bt .mid span{display:flex;align-items:center;gap:4px;font-size:10px;color:#f5dcc6;white-space:nowrap}.hn-bt .mid svg{width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round}
.hn-wl{position:absolute;left:10px;right:204px;bottom:10px;display:flex;gap:6px;pointer-events:none;--iy:18px}
.hn .wg{position:relative;flex:1 1 0;min-width:0;max-width:136px;height:116px;padding:7px 8px 7px 9px;border-radius:13px;background:var(--lac);border:1px solid var(--ln);box-shadow:var(--sh);display:flex;flex-direction:column;gap:2px;pointer-events:auto;overflow:hidden}
.hn .wg .w1{display:flex;align-items:center;gap:4px;font-size:11.5px;font-weight:700;color:#e6d8ba;white-space:nowrap}.hn .wg .w1 .ic{width:15px;height:15px;color:var(--go)}
.hn .wg .lp{margin-left:auto;display:flex;gap:2px}.hn .wg .lp i{width:6px;height:9px;border-radius:1.5px;background:rgba(255,255,255,.14)}.hn .wg .lp i.on{background:var(--go)}
.hn .wg .w2{font-size:19px;line-height:1.1;font-weight:700;font-variant-numeric:tabular-nums;color:var(--hi)}
.hn .wg .mo{height:3px;border-radius:2px;background:rgba(255,255,255,.12);overflow:hidden;margin:1px 0 3px}.hn .wg .mo i{display:block;height:100%;border-radius:2px}
.hn .wg .w3{padding-top:3px;border-top:1px solid rgba(226,191,108,.14);min-width:0}.hn .wg .w3 b{display:block;font:700 14.5px/1.2 var(--ser);color:var(--go2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hn .wg .ch2{position:absolute;right:6px;top:30px;padding:1px 6px;border-radius:6px;background:var(--go);color:#23180b;font-size:9px;font-weight:700;white-space:nowrap}
.hn .wg .w4{font-size:10px;line-height:1.25;color:#d2c4a6;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.hn .wg.on{border-color:var(--go2);box-shadow:inset 0 0 0 1px var(--go2),0 0 0 1px rgba(243,213,143,.3),0 12px 26px rgba(0,0,0,.5);transform:translateY(-5px)}
.hn .wg.on:active:not(:disabled){transform:translateY(-4px) scale(.97)}
.hn .wg.ch .w3 b{color:#fff3d3}.hn .wg.ch{border-color:rgba(243,213,143,.7)}
.hn .wg.gone{opacity:.5;pointer-events:none}.hn .wg.gone .w2{text-decoration:line-through;color:var(--mu)}
.hn .hn-wc{left:10px;right:204px;bottom:138px;padding:8px 8px 8px 12px;gap:6px;border-color:rgba(226,191,108,.6);--iy:10px}
.hn-wc .hd{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:11.5px;color:var(--mu)}.hn-wc .hd b{font:700 13.5px var(--ser);color:var(--hi)}
.hn-wc .hd .xb{width:30px;height:30px;border-radius:9px}
.hn-wc .os{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:5px}
.hn-wc .os .bt{min-height:46px;padding:2px 3px;align-items:center;text-align:center;font:700 12.5px/1.15 var(--ser);justify-content:center;gap:1px}
.hn-wc .os .bt.on{background:linear-gradient(180deg,#f0d38a,#d9ae55);border-color:#f7e3ad;color:#22170a;box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 4px 12px rgba(0,0,0,.3)}
.hn-wc .os .bt small{font:600 9px "Be Vietnam Pro",system-ui,sans-serif;color:var(--go)}.hn-wc .os .bt.on small{color:#5a3f12}
.hn-wc .tp{font-size:11px;line-height:1.3;color:#ddd0b3;min-height:14px}
.hn .hn-lg{right:10px;top:62px;bottom:134px;width:186px;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;gap:5px;padding:9px 11px 11px;--ix:16px;--iy:0}
.hn-lg .en{display:flex;flex-wrap:wrap;gap:3px 9px;font-size:11.5px;font-weight:600;font-variant-numeric:tabular-nums;color:#e6d8ba}.hn-lg .en span{display:flex;align-items:center;gap:3px;white-space:nowrap}.hn-lg .en .ic{color:var(--bd)}.hn-lg .en .gn{opacity:.4;text-decoration:line-through}
.hn-lg .lt{font-size:9.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--mu);margin-top:4px}
.hn-lg .ev{font-size:11px;line-height:1.35;color:#ddd0b3;padding-left:8px;border-left:2px solid rgba(226,191,108,.18)}
.hn-lg .ev.me{border-left-color:var(--gd)}.hn-lg .ev.foe{border-left-color:var(--bd)}.hn-lg .ev.big{font-weight:700}
.hn-bb{position:absolute;right:10px;bottom:10px;width:186px;height:116px;display:flex;flex-direction:column;gap:6px;pointer-events:none;--iy:14px}
.hn-bb .bt{align-items:center;justify-content:center;text-align:center}
.hn-bb .bt:first-child{flex:none;height:40px;min-height:40px;font-size:12.5px;background:var(--lac);box-shadow:var(--sh)}.hn-bb .bt.pr{flex:1;font:700 20px var(--ser);letter-spacing:.02em}.hn-bb .bt.pr small{font:400 10px "Be Vietnam Pro",system-ui,sans-serif;letter-spacing:0}
.hn .hn-br{left:0;right:0;bottom:10px;margin:0 auto;width:min(600px,calc(100% - 20px));max-height:calc(100% - 72px);overflow-y:auto;padding:14px 18px 16px;gap:10px;border-color:rgba(226,191,108,.62);outline:1px solid rgba(226,191,108,.14);outline-offset:-6px;--iy:22px}
.hn-br .top{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
.hn-br .h1{font:700 28px/1.05 var(--ser)}
.hn-br .vs{display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center}
.hn-br .sd{display:flex;align-items:center;gap:11px;min-width:0}.hn-br .sd.foe{flex-direction:row-reverse;text-align:right}
.hn-br .sd div{display:flex;flex-direction:column;min-width:0}.hn-br .sd b{font:700 14px/1.2 var(--ser);color:var(--hi);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hn-br .sd .kk{color:var(--mu)}
.hn-br .ls{display:flex;align-items:baseline;gap:6px}.hn-br .sd.foe .ls{flex-direction:row-reverse}
.hn-br .ls em{font-style:normal;font-size:26px;font-weight:700;line-height:1.1;font-variant-numeric:tabular-nums}
.hn-br .ls small{font-size:10.5px;color:var(--mu);white-space:nowrap}
.hn-br .vv{font:700 13px var(--ser);color:var(--mu);letter-spacing:.1em}
.hn-br .fx{display:flex;align-items:center;gap:11px;padding:8px 10px;border-radius:12px;background:rgba(0,0,0,.22);border:1px solid rgba(226,191,108,.16)}
.hn-br .fx .seal{width:46px;height:46px;font-size:25px;animation:hnStamp .55s cubic-bezier(.3,1.5,.5,1) .35s backwards;transform:rotate(-5deg)}
.hn-br .fx b{font:700 15px var(--ser);color:var(--hi)}.hn-br .fx span{font-size:11px;color:var(--mu)}
.hn-br .fx .go{margin-left:auto;min-width:150px}
/* full screens */
.hn-full{position:absolute;left:0;top:0;right:0;bottom:0;background:radial-gradient(ellipse at 50% 55%,rgba(12,9,6,.42),rgba(6,5,4,.76));pointer-events:auto;display:grid;place-items:center;padding:14px;--iy:0}
.hn-full .fp{position:relative;max-height:100%;width:min(720px,100%);overflow-y:auto;padding:17px 22px 18px;border:1px solid rgba(226,191,108,.62);border-radius:18px;background:var(--lac);
  box-shadow:inset 0 1px 0 rgba(255,229,180,.1),0 18px 48px rgba(0,0,0,.55);outline:1px solid rgba(226,191,108,.14);outline-offset:-6px;display:flex;flex-direction:column;gap:10px}
.hn-full.en .fp{animation:hnIn .4s var(--ease) backwards;--iy:18px;--is:.985}
.hn-full .fp.nr{width:min(600px,100%)}.hn-full .fp.rpt{gap:9px;padding:14px 20px 16px}.hn-full .fp.rpt .go{min-height:44px}
.hn-full .h1{font:700 22px/1.2 var(--ser);color:var(--hi)}.hn-full .h2{font-size:11.5px;color:var(--mu)}
.hn-full .gh{display:flex;align-items:center;gap:16px}.hn-full .gh>div{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}.hn-full .gh .seal{order:-1}
.hn-full .tri{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
.hn-full .tri div{display:flex;flex-direction:column;gap:4px;padding:9px 11px 10px;border-radius:12px;border:1px solid var(--c);background:linear-gradient(180deg,var(--b),rgba(0,0,0,.12))}
.hn-full .tri b{font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--c)}.hn-full .tri span{font:400 13px/1.45 var(--ser);color:#ece2cb}
.hn-full .t5{display:flex;flex-wrap:wrap;gap:6px}.hn-full .t5 span{display:flex;align-items:center;gap:6px;padding:4px 10px 4px 7px;border-radius:14px;background:rgba(0,0,0,.24);border:1px solid rgba(226,191,108,.16);font:700 12px var(--ser);color:#eadfc6;white-space:nowrap}
.hn-full .t5 i{width:9px;height:9px;border-radius:50%;box-shadow:0 0 0 1.5px rgba(246,238,219,.6)}
.hn-full .go{min-height:48px;border-radius:12px;border:1px solid rgba(243,213,143,.72);background:var(--cin);box-shadow:var(--cinsh);font:700 16px var(--ser);color:#fdf4e2;letter-spacing:.02em;text-align:center;display:flex;align-items:center;justify-content:center;gap:8px;pointer-events:auto}
.hn-full .go svg,.hn-br .go svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.hn-br .go{min-height:46px;padding:0 16px;border-radius:12px;border:1px solid rgba(243,213,143,.72);background:var(--cin);box-shadow:var(--cinsh);font:700 15px var(--ser);color:#fdf4e2;display:flex;align-items:center;justify-content:center;gap:8px;pointer-events:auto}
.hn-full .fp .go{align-self:stretch}
/* the season's recap: resources in big numbers, our battles, the towns that changed hands, the news */
.hn-full .rp{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(0,1fr);gap:16px}
.hn-full .rp>div{display:flex;flex-direction:column;gap:6px;min-width:0}
.hn-full .hdr{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
.hn-full .r3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
.hn-full .r3 div{display:flex;flex-direction:column;padding:6px 10px 6px;border-radius:12px;background:rgba(0,0,0,.24);border:1px solid rgba(226,191,108,.16)}
.hn-full .r3 span{display:flex;align-items:center;gap:4px;font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--mu)}.hn-full .r3 span svg{width:11px;height:11px;stroke:var(--go);fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.hn-full .r3 b{font-size:21px;line-height:1.12;font-variant-numeric:tabular-nums;color:var(--hi)}
.hn-full .r3 small{font-size:10.5px;font-variant-numeric:tabular-nums;white-space:nowrap}
.hn-full .fb{display:flex;align-items:center;gap:10px;padding:5px 10px;border-radius:12px;border:1px solid var(--c);background:linear-gradient(90deg,var(--b),rgba(0,0,0,.14))}
.hn-full .fb .tg2{flex:none;padding:2px 8px;border-radius:7px;background:var(--c);font:700 11px var(--ser);color:#1d140a}
.hn-full .fb b{font:700 13.5px var(--ser);color:var(--hi)}.hn-full .fb .lz{margin-left:auto;display:flex;gap:10px;font-size:10.5px;color:var(--mu);white-space:nowrap}.hn-full .fb .lz em{font-style:normal;font-size:14px;font-weight:700;font-variant-numeric:tabular-nums;color:#eadfc6}
.hn-full .tk2{display:flex;align-items:center;gap:7px;padding:3px 10px 3px 5px;border-radius:12px;background:rgba(0,0,0,.2);border:1px solid rgba(226,191,108,.14);white-space:nowrap;min-width:0}
.hn-full .tk2 b{font:700 13.5px var(--ser);color:var(--hi);overflow:hidden;text-overflow:ellipsis}.hn-full .tk2 span{margin-left:auto;font-size:10.5px;color:var(--mu)}.hn-full .tk2 .ar{width:12px;height:12px;flex:none;stroke:var(--mu);fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}.hn-full .tk2 .seal.old{opacity:.72;filter:saturate(.6)}
.hn-full .nw{display:flex;flex-direction:column;gap:5px}
.hn-full .nw span{position:relative;padding-left:14px;font-size:12px;line-height:1.4;color:#dfd3b8}.hn-full .nw span::before{content:'';position:absolute;left:2px;top:.55em;width:5px;height:5px;border-radius:50%;background:rgba(226,191,108,.55)}
.hn-full .nw span.bad{color:var(--bd);font-weight:600}.hn-full .nw span.bad::before{background:var(--bd)}
.hn-full .in{display:flex;gap:8px}.hn-full .in div{flex:1;padding:7px 10px;border-radius:12px;background:rgba(0,0,0,.24);border:1px solid rgba(226,191,108,.14);display:flex;flex-direction:column}
.hn-full .in span{font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--mu)}.hn-full .in b{font-size:20px;font-variant-numeric:tabular-nums;color:var(--hi)}
.hn-full .fp.ov{width:min(640px,100%);align-items:stretch;padding-top:22px}.hn-full .ov .h1{font-size:32px}.hn-full .ov .why{font:400 15px/1.55 var(--ser);color:#f1e7d0}
/* a town changing hands: a card at the bottom, the map (camera on the town) left in view; the new owner's seal is stamped */
.hn-full.beat{background:linear-gradient(180deg,transparent 45%,rgba(6,5,4,.55));place-items:end center;pointer-events:none;padding-bottom:14px}
.hn-full.beat .fp{pointer-events:auto;width:min(520px,100%);flex-direction:row;align-items:center;gap:16px;padding:14px 16px 14px 18px}
.hn-full.beat .bx{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.hn-full.beat .h1{font-size:21px;color:var(--c)}.hn-full.beat .why{font-size:12.5px;line-height:1.45;color:#e2d7bf}
.hn-full.beat .stp{order:-1;position:relative;flex:none;width:74px;height:74px}
.hn-full.beat .stp .seal.XL{position:absolute;left:0;top:0;animation:hnStamp .55s cubic-bezier(.3,1.5,.5,1) .12s backwards;transform:rotate(-5deg)}
@keyframes hnStamp{0%{opacity:0;transform:scale(1.9) rotate(-14deg)}60%{opacity:1;transform:scale(.94) rotate(-4deg)}100%{transform:scale(1) rotate(-5deg)}}
.hn-full.beat .go{flex:none;min-width:96px;min-height:46px;padding:0 14px}
/* a hook playing: the cinema letterbox, the skip hint, the tap catcher; captions over everything */
.hn-bar{position:absolute;left:0;right:0;height:max(30px,7.5%);background:#070605;transition:transform .55s var(--ease);pointer-events:none}
.hn-bar.t{top:0;transform:translateY(-101%)}.hn-bar.b{bottom:0;height:max(40px,10.5%);transform:translateY(101%)}
.hn.bars .hn-bar{transform:none}
.hn-catch{position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:auto;cursor:pointer}
.hn-skip{position:absolute;right:12px;bottom:11px;height:30px;padding:0 10px 0 13px;border-radius:15px;background:rgba(12,9,6,.72);border:1px solid rgba(226,191,108,.3);display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;color:#d9ccae;pointer-events:none;
  animation:hnIn .5s var(--ease) .7s backwards;--iy:6px}
.hn-skip svg{width:13px;height:13px;stroke:var(--go);fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.hn-cap{position:absolute;left:0;right:0;bottom:16px;margin:0 auto;width:max-content;max-width:min(680px,calc(100% - 300px));display:flex;align-items:center;gap:12px;padding:8px 20px 8px 9px;border-radius:30px;
  background:linear-gradient(90deg,rgba(8,6,4,0),rgba(8,6,4,.84) 14%,rgba(8,6,4,.84) 86%,rgba(8,6,4,0));pointer-events:none;--iy:10px}
.hn-cap.nr{padding:8px 34px}
.hn.bars .hn-cap{bottom:calc(max(40px,10.5%) + 2px)}
.hn-cap .pt{width:40px;height:40px}.hn-cap .seal{width:36px;height:36px;font-size:19px}
.hn-cap div{display:flex;flex-direction:column;min-width:0}
.hn-cap .kk{letter-spacing:.14em}
.hn-cap .ln{font:400 15.5px/1.35 var(--ser);color:#fbf3e2;text-shadow:0 1px 2px rgba(0,0,0,.7)}.hn-cap.nr .ln{font-style:italic;text-align:center}
`;

  // ------------------------------------------------------------------------------ helpers
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const num = (n) => (n == null ? '?' : (n < 0 ? '−' : '') + String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
  const sgn = (n) => (n < 0 ? '−' : '+') + num(Math.abs(n));
  const kfmt = (n) => { if (n == null) return '?'; n = Math.round(n); return n >= 10000 ? Math.round(n / 1000) + 'k' : n >= 1000 ? (Math.round(n / 100) / 10).toString().replace('.', ',') + 'k' : String(n); };
  const total = (u) => (u ? ARMS.reduce((s, k) => s + (u[k] || 0), 0) : null);
  const ic = (k) => '<svg class="ic" viewBox="0 0 24 24">' + (ICON[k] || '') + '</svg>';
  const svg = (k) => '<svg viewBox="0 0 24 24">' + (ICON[k] || '') + '</svg>';
  const xIcon = svg('x');
  const title = (id) => String(id || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* private mode: this session only */ } } };
  const now = () => (window.performance ? performance.now() : Date.now());

  function create(root, handlers, opts) {
    opts = opts || {};
    const Hd = handlers || {};
    const fac = Object.assign({}, FAC);
    if (opts.factions) (Array.isArray(opts.factions) ? opts.factions.map((x) => [x.id || x.fid, x]) : Object.entries(opts.factions)).forEach(([k, v]) => { if (k) fac[k] = Object.assign({}, fac[k], v); });
    const F = (fid) => fac[fid] || { name: fid || '?', short: fid || '?', glyph: '?', color: '#777' };
    const EB = () => opts.battle || window.EmperorsBattle || null;
    const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
    const layer = document.createElement('div'); layer.className = 'hn';
    // stacking follows the order: map chips, HUD, panels, battle, full screens, the letterbox and captions, the tap catcher, then the
    // sound / watch controls above it (they stay usable while a hook plays)
    layer.innerHTML = '<div class="hn-lab"></div><div class="hn-hud x"></div><div class="hn-tr x"></div><div class="pn hn-side x"></div><div class="hn-dock x"></div><div class="pn hn-card x"></div>' +
      '<div class="hn-coach x"></div><button type="button" class="hn-adv x" data-a="advise"></button><button type="button" class="hn-end x" data-a="end"></button>' +
      '<div class="hn-bt x"></div><div class="hn-wl x"></div><div class="pn hn-wc x"></div><div class="pn hn-lg x"></div><div class="hn-bb x"></div><div class="pn hn-br x"></div>' +
      '<div class="hn-full x"></div><div class="hn-bar t"></div><div class="hn-bar b"></div><div class="hn-cap x"></div><div class="hn-catch x"></div><div class="hn-skip x">Chạm để bỏ qua' + svg('next') + '</div><div class="hn-sys"></div>';
    root.appendChild(layer);
    const q = (s) => layer.querySelector(s);
    const el = { lab: q('.hn-lab'), hud: q('.hn-hud'), tr: q('.hn-tr'), side: q('.hn-side'), dock: q('.hn-dock'), card: q('.hn-card'), coach: q('.hn-coach'), adv: q('.hn-adv'), end: q('.hn-end'),
      bt: q('.hn-bt'), wl: q('.hn-wl'), wc: q('.hn-wc'), lg: q('.hn-lg'), bb: q('.hn-bb'), br: q('.hn-br'), full: q('.hn-full'), cap: q('.hn-cap'), catch: q('.hn-catch'), skip: q('.hn-skip'), sys: q('.hn-sys') };

    const S = { view: null, sel: null, targets: null, tasks: null, more: false, pend: null, pendF: null, preview: null, ask: null, fc: null, cards: [], cardsOpen: false, cardIx: 0, seen: {}, battle: null, bo: {}, bsel: null, busy: false, screen: null, labels: [], snap: {},
      locked: false, bars: false, watching: false, muted: store.get('tq.mute') === '1', advice: null, coachOff: opts.coach === false, coachDone: store.get('tq.coach') === '1', cap: null };
    const chips = {}; let sc = 1;

    const H = (name, ...args) => { const f = Hd[name]; if (typeof f !== 'function') return undefined; try { return f.apply(Hd, args); } catch (e) { console.error('HuaiNanUI handler ' + name, e); return undefined; } };
    const has = (name) => typeof Hd[name] === 'function';
    const set = (node, html, key) => { if (node._h === html) return; const keep = node._k === key ? node.scrollTop : 0; node.innerHTML = html; node.scrollTop = keep; node._h = html; node._k = key; };
    // panels ease in and out: in on the next frame after display, out for 180 ms before display:none (a re-show cancels it)
    const pop = (node) => { node.classList.remove('en'); void node.offsetWidth; node.classList.add('en'); };
    const show = (node, on) => {
      const hidden = node.classList.contains('x');
      if (on) {
        if (node._lv) { clearTimeout(node._lv); node._lv = 0; node.classList.remove('lv'); }
        if (hidden) { node.classList.remove('x'); pop(node); }
      } else if (!hidden && !node._lv) {
        node.classList.remove('en'); node.classList.add('lv');
        node._lv = setTimeout(() => { node._lv = 0; node.classList.remove('lv'); node.classList.add('x'); }, 180);
      }
    };
    const shown = (node) => !node.classList.contains('x') && !node._lv;

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
    const taskName = (key) => { const t = S.tasks && (S.tasks.all || []).find((x) => x.key === key); return (t && t.name) || (opts.tasks && opts.tasks[key] && opts.tasks[key].name) || TASK_NAME[key] || title(key); };
    const portrait = (id) => { const p = opts.portraits; if (!p || !id) return ''; return typeof p === 'function' ? p(id) || '' : typeof p === 'string' ? p + id + '.svg' : p[id] || ''; };
    const pt = (g, fid, cls) => { const c = esc(F(fid || (g && g.fid)).color), u = g && portrait(g.id); return '<span class="pt ' + (cls || '') + '" style="--c:' + c + '"><b>' + esc(g && g.seal ? g.seal : F(fid || (g && g.fid)).glyph) + '</b>' + (u ? '<img src="' + esc(u) + '" alt="">' : '') + '</span>'; };
    const seal = (fid, cls) => '<span class="seal ' + (cls || '') + '" style="--c:' + esc(F(fid).color) + '">' + esc(F(fid).glyph) + '</span>';
    const mapOn = () => !!S.view && !S.battle && !S.screen && !S.locked && !S.watching;

    // ---------------------------------------------------------------------------- scale
    function fit() {
      const r = root.getBoundingClientRect(), w = r.width || root.clientWidth || 844, h = r.height || root.clientHeight || 390;
      sc = Math.max(1, Math.min(1.4, Math.min(w / 844, h / 390)));
      layer.style.width = w / sc + 'px'; layer.style.height = h / sc + 'px'; layer.style.transform = 'scale(' + sc + ')';
      placeLabels();
    }

    // ---------------------------------------------------------------------------- pieces
    const statCol = (v) => (v >= 8 ? TONE.gold : v <= 4 ? '#9a8b70' : '#e6dbc3');
    const statBars = (g, hi) => '<div class="st">' + STATS.map(([k, l]) => { const v = g[k]; return '<div class="' + (hi === k ? 'f' : '') + '"><span>' + l + '</span><b style="color:' + statCol(v) + '">' + v + '</b><div class="bar"><i style="width:' + v * 10 + '%;background:' + statCol(v) + '"></i></div>' + (hi === k ? '<em>' + STAT_CTX[k] + '</em>' : '') + '</div>'; }).join('') + '</div>';
    // Trung: one bar with the three thresholds marked, and the consequence of where it stands in words
    function trung(g) {
      if (g.loyal == null) return '';
      if (g.lord || g.loyal >= 100) return '<div class="lo gold">Chúa công</div>';
      const L = g.loyal, r = L < 30 ? ['sắp bỏ đi, mang cả đạo quân', TONE.bad] : L < 70 ? ['bất mãn: quân đánh kém (tới −8 sĩ khí)', TONE.gold] : L >= 85 ? ['một lòng: +3 sĩ khí', TONE.good] : ['tạm yên', TONE.text];
      return '<div class="lo"><span>Trung <b style="color:' + r[1] + '">' + L + '</b> · <span style="color:' + r[1] + '">' + r[0] + '</span></span><div class="tr"><i style="width:' + L + '%;background:' + r[1] + '"></i><u style="left:30%"></u><u style="left:70%"></u><u style="left:85%"></u></div></div>';
    }
    const hasStats = (g) => g && g.uy != null;
    const unitBox = (u, approx, arms, foot) => {
      if (!u) return '<div class="box">' + (arms || []).map((k) => '<span class="u">' + ic(k) + ARM_NAME[k] + '</span>').join('') + '<span class="w100">Xa: chỉ thấy cờ và loại quân.' + (foot ? ' ' + esc(foot) : '') + '</span></div>';
      return '<div class="box">' + ARMS.filter((k) => u[k]).map((k) => '<span class="u">' + ic(k) + (approx ? '~' : '') + num(u[k]) + '</span>').join('') + (foot ? '<span class="w100">' + esc(foot) + '</span>' : '') + '</div>';
    };

    // ---------------------------------------------------------------------------- HUD: built once, numbers tween
    const RES = [['luong', 'Lương'], ['tien', 'Tiền'], ['uy', 'Uy']];
    const tw = { shown: {}, target: {}, from: {}, t0: 0, raf: 0 };
    function buildHud() {
      el.hud.innerHTML = '<span class="seal"></span><div class="who"><b></b><span></span></div>' +
        RES.map(([k, l]) => '<div class="rs" data-r="' + k + '"><span class="k">' + svg(k) + '<i style="font-style:normal">' + l + '</i></span><div class="r2"><b class="v">0</b><small></small></div></div>').join('');
      el.hud._built = true;
    }
    const paintRes = () => RES.forEach(([k]) => { const n = el.hud.querySelector('[data-r=' + k + '] .v'); if (n && tw.shown[k] != null) n.textContent = num(tw.shown[k]); });
    function stepRes() {
      const t = Math.min(1, (now() - tw.t0) / 900), e = 1 - Math.pow(1 - t, 3);
      RES.forEach(([k]) => { if (tw.from[k] != null) tw.shown[k] = tw.from[k] + (tw.target[k] - tw.from[k]) * e; });
      paintRes();
      if (t < 1) tw.raf = requestAnimationFrame(stepRes);
      else { tw.raf = 0; RES.forEach(([k]) => { tw.shown[k] = tw.target[k]; tw.from[k] = null; }); paintRes(); }
    }
    function floatDelta(k, d) {
      if (!d || !shown(el.hud)) return;
      const cell = el.hud.querySelector('[data-r=' + k + ']'); if (!cell) return;
      const f = document.createElement('em'); f.className = 'fl ' + (d > 0 ? 'good' : 'bad'); f.textContent = sgn(d);
      cell.appendChild(f); setTimeout(() => f.remove(), 2000);
    }
    function tweenRes(r) {
      let moved = false;
      RES.forEach(([k]) => {
        const v = r[k]; if (v == null) return;
        if (tw.target[k] == null) { tw.shown[k] = tw.target[k] = v; return; }
        if (v !== tw.target[k]) { floatDelta(k, v - tw.target[k]); tw.from[k] = tw.shown[k]; tw.target[k] = v; moved = true; }
      });
      if (moved) { tw.t0 = now(); if (!tw.raf) tw.raf = requestAnimationFrame(stepRes); }
      paintRes();
    }
    function snapDelta(v) { const a = S.snap[v.season], b = S.snap[v.season - 1]; return a && b ? a.uy - b.uy : null; }
    function drawHud() {
      const v = S.view, on = !!v && !S.battle && !(S.locked && S.bars);
      show(el.hud, on);
      if (!on) return;
      if (!el.hud._built) buildHud();
      const f = F(v.me), r = v.res || {}, inc = v.income, w = v.warn || {};
      const sl = el.hud.querySelector('.seal'); sl.style.setProperty('--c', f.color); sl.textContent = f.glyph;
      el.hud.querySelector('.who b').textContent = f.name; el.hud.querySelector('.who span').textContent = (v.calendar || '') + ' · Hoài Nam';
      const uyD = inc && inc.uy != null ? inc.uy : snapDelta(v);
      const sub = { luong: inc ? '<em class="good">' + sgn(inc.luong) + '</em> <em class="bad">−' + num(inc.up) + '</em>' : '', tien: inc ? '<em class="good">' + sgn(inc.tien) + '</em>' : '',
        uy: uyD == null ? '' : '<em class="' + (uyD < 0 ? 'bad' : uyD > 0 ? 'good' : 'mu') + '">' + (uyD === 0 ? '±0' : sgn(uyD)) + '</em>' };
      const warn = { luong: r.luong < 0 || w.luong, tien: false, uy: r.uy <= 0 || w.uy };
      RES.forEach(([k, l]) => {
        const c = el.hud.querySelector('[data-r=' + k + ']'), s = c.querySelector('small');
        c.classList.toggle('w', !!warn[k]); c.querySelector('.k i').textContent = warn[k] ? l + ' · đáy' : l;
        if (s._h !== sub[k]) { s.innerHTML = sub[k]; s._h = sub[k]; }
      });
      tweenRes(r);
    }
    // the right cluster: cards badge, overview, watch, goal; the sound (and, watching, the stop pill) sits apart, always on top
    function drawTr() {
      const on = mapOn();
      show(el.tr, on);
      if (on) {
        const n = S.cards.length, urgent = S.cards.some((c) => c.urgent);
        set(el.tr, (n ? '<button type="button" class="ib tx' + (urgent ? ' u' : '') + '" data-a="cards" aria-label="Thẻ">' + svg('mail') + 'Thẻ<i class="n">' + n + '</i></button>' : '') +
          '<button type="button" class="ib" data-a="home" aria-label="Toàn cảnh Hoài Nam">' + svg('home') + '</button>' +
          (has('onWatch') ? '<button type="button" class="ib tx" data-a="watch" aria-label="Xem ván tự chơi">' + svg('eye') + 'Xem</button>' : '') +
          '<button type="button" class="ib q" data-a="goal" aria-label="Mục tiêu và cách chơi">?</button>', 'tr');
      }
      const sys = (S.watching ? '<button type="button" class="hn-wp" data-a="unwatch"><i></i><b>Đang xem</b><span>Dừng</span></button>' : '') +
        (S.view || S.watching ? '<button type="button" class="ib' + (S.muted ? ' off' : '') + '" data-a="mute" aria-label="' + (S.muted ? 'Bật tiếng' : 'Tắt tiếng') + '">' + svg(S.muted ? 'mute' : 'snd') + '</button>' : '');
      set(el.sys, sys, 'sys');
    }
    function drawEnd() {
      const on = mapOn();
      show(el.end, on);
      show(el.adv, on && has('onAdvise') && !S.cardsOpen);
      if (!on) return;
      const v = S.view, w = v.warn || {};
      const arm = v.armies.filter((a) => mine(a) && a.order).length, tk = v.towns.filter((t) => t.owner === v.me && t.task).length;
      const warn = w.luong ? 'Lương ở đáy: mùa sau còn thế thì binh biến' : w.uy ? 'Uy ở đáy: mùa sau còn thế thì dân nổi loạn' : '';
      el.end.classList.toggle('w', !!warn);
      const sub = warn || (arm || tk ? [arm ? arm + ' lệnh' : '', tk ? tk + ' việc' : ''].filter(Boolean).join(' · ') : 'Không lệnh: quân Giữ');
      set(el.end, '<b>Hết mùa</b><span>' + esc(sub) + '</span>', 'end');
      el.adv.classList.toggle('on', !!S.advice);
      set(el.adv, svg('scroll') + '<b>Đề xuất</b><span>kế của tướng</span>', 'adv');
    }

    // ---------------------------------------------------------------------------- selection panels
    function armyPanel(a) {
      const g = a.gen, own = mine(a), o = a.order, hi = o ? (o.intent === 'attack' || o.intent === 'siege' ? 'dung' : o.intent === 'move' ? 'uy' : 'kien') : 'kien';
      const stats = hasStats(g);
      let h = '<div class="ph">' + pt(g, a.fid, 'L') + '<div class="pi"><span class="nm">' + esc(g ? g.name : armyName(a)) + '</span><span class="cl2">' + esc((g && g.cls ? g.cls + ' · ' : '') + F(a.fid).short) + '</span>' + (stats ? trung(g) : '') + '</div><button type="button" class="xb" data-a="close" aria-label="Đóng">' + xIcon + '</button></div>';
      // the general: our own after the order (what to do comes first), the enemy's before his men
      const gen = stats ? statBars(g, hi) + (g.trait ? '<div class="note"><b style="color:#e6d8ba">' + esc(g.trait) + '</b>' + (g.traitText ? ': ' + esc(g.traitText) : '') + '</div>' : '') : '';
      if (!own) h += gen;
      const approx = a.seen !== 'own', tot = total(a.units);
      const foot = tot != null ? (approx ? '~' : '') + num(tot) + ' quân' + (a.seen === 'near' ? ' (ước ±20%)' : '') + ' · ' + townName(a.at) + (a.besieging ? ' · đang vây ' + townName(a.besieging) : '') : townName(a.at);
      h += unitBox(a.units, approx, a.arms, foot);
      if (own) {
        h += '<div class="od"><div><span class="ol">Lệnh mùa này</span><b class="' + (o ? 'gold' : 'mu') + '">' + esc(orderText(o)) + '</b></div>' + (o ? '<button type="button" class="bt" data-a="clear" data-id="' + esc(a.id) + '">Bỏ lệnh</button>' : '<span class="note">thủ +15%</span>') + '</div>';
        if (S.targets) {
          h += '<div class="sec">Chạm đích trên bản đồ, hay ở đây</div>';
          h += S.targets.length ? '<div class="lst">' + S.targets.map((t, i) => {
            const cur = o && o.target && o.target.kind === t.kind && o.target.id === t.id, hostile = t.intent !== 'move';
            return '<button type="button" class="tg ' + (hostile ? '' : 'mv') + (cur ? ' on' : '') + '" data-a="tgt" data-i="' + i + '"><b>' + esc(thing(t.kind, t.id)) + '</b><span>' + (t.intent === 'move' ? 'Đi tới' : t.intent === 'attack' ? 'Đánh' : 'Đánh hay Vây') + (t.km ? ' · ' + num(t.km) + ' km' : '') + '</span></button>';
          }).join('') + '</div>' : '<div class="note bad">Không nơi nào trong tầm một mùa.</div>';
        }
        if (gen) h += '<div class="rule"></div>' + gen;
      } else h += '<div class="note">' + (a.seen === 'far' ? 'Ở xa: chỉ thấy cờ và loại quân.' : 'Số là ước: càng gần càng sát.') + ' Muốn đánh: chọn quân ta, rồi chạm đạo này.</div>';
      return h;
    }
    function townPanel(t) {
      const own = t.owner === V().me, f = F(t.owner), T = (opts.towns || []).find((x) => x.id === t.id) || {}, g = t.gov;
      let h = '<div class="ph">' + seal(t.owner) + '<div class="pi"><span class="nm">' + esc(t.name) + '</span><span class="cl2 ell">' + esc(f.short) + (T.terrain ? ' · ' + esc(T.terrain) : '') + (t.river ? ' · bến thuyền' : '') + '</span></div><button type="button" class="xb" data-a="close" aria-label="Đóng">' + xIcon + '</button></div>';
      const info = (t.gar ? 'Đồn ' + (t.garApprox ? '~' : '') + num(total(t.gar)) + (t.garApprox ? ' (ước)' : '') : 'Đồn chưa rõ') + ' · lũy ' + t.walls + ' · trấn thủ ' + (g ? g.name : 'không');
      h += t.gar ? unitBox(t.gar, t.garApprox, null, info) : '<div class="box"><span class="w100">' + esc(info) + '</span></div>';
      if (!own) return h + '<div class="note">Muốn lấy: chọn quân ta, rồi chạm thành này. <b style="color:#e6d8ba">Đánh ngay</b> (một trận) hay <b style="color:#e6d8ba">Vây</b> (mỗi mùa đồn −20%, lũy −1).</div>';
      const k = t.task;
      h += '<div class="od"><div class="ell"><span class="ol">Việc mùa này</span><b class="' + (k ? 'gold' : 'mu') + '">' + (k ? esc(k.name) + (k.left != null ? ' · còn ' + k.left + ' mùa' : '') : 'Chưa giao') + '</b></div>' + (k && k.fresh ? '<button type="button" class="bt" data-a="untask" data-id="' + esc(t.id) + '">Bỏ việc</button>' : k ? '' : '<span class="note">không bắt buộc</span>') + '</div>';
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
      let h = '<div class="fcb"><div class="ph">' + (ag ? pt(ag, ag.fid, 'M') : '') + '<div class="pi"><span class="kk">' + (an ? 'Mưu ' + an.muu + ' · ' : '') + 'tướng đọc trận</span><span class="nm" style="font-size:14.5px">' + esc(an ? an.name : 'Tướng') + '</span><span class="cl2 ell">' + esc(where) + '</span></div></div>';
      h += '<div><div class="lb2" style="color:' + col + '">' + esc(f.label) + '</div><div class="sc5">' + FC_STEPS.map((s, j) => '<i style="' + (j <= i && i >= 0 ? 'background:' + col : '') + (j === i ? '' : ';opacity:.45') + '"></i>').join('') + '</div></div>';
      h += '<div class="two"><div class="me"><span class="k">Ta' + ((act.armies || []).length > 1 ? ' · hợp binh' : '') + '</span><b>Sức ' + num(f.sa) + '</b><span class="l">ước mất ' + num(f.est && f.est.la) + '</span></div><div><span class="k">Họ</span><b>Sức ' + num(f.sd) + '</b><span class="l">ước mất ' + num(f.est && f.est.ld) + '</span></div></div>';
      h += '<div class="sec">Vì sao' + (S.fc.more ? ' · đủ lý do' : '') + '</div>' + (list.length ? list.map(rs).join('') : '<div class="note">Không có gì đáng kể.</div>');
      if (S.fc.more) {
        if (more.lanes) h += '<div class="sec">Ba làn</div><div class="txt">' + more.lanes.map((l, j) => 'Làn ' + LANE[j] + ': <b>' + esc(l) + '</b>').join(' · ') + '</div>';
        h += '<div class="note">' + (an ? esc(an.name) + ' (Mưu ' + an.muu + ')' : 'Tướng') + ' đoán từ những gì thấy được: Mưu càng cao càng sát. Gió và vận trong ngày không ai biết trước.</div>';
      }
      if (ex.partners && ex.partners.length) h += '<div class="sec">Hợp binh</div><div class="pp">' + ex.partners.map((p) => '<button type="button" class="bt' + (p.on ? ' on' : '') + '" data-a="partner" data-id="' + esc(p.army) + '">' + (p.on ? '✓ ' : '+ ') + esc(p.label || armyName(army(p.army))) + '</button>').join('') + '</div>';
      if (ex.preview) h += pvLine(ex.preview);
      h += '</div><div class="bb"><button type="button" class="bt" data-a="fc-more" style="flex:none;width:44px;font:700 18px var(--ser);color:var(--go)" aria-label="Vì sao, chi tiết">' + (S.fc.more ? '×' : '?') + '</button><button type="button" class="bt" data-a="fc-no">Thôi</button><button type="button" class="bt pr" data-a="fc-go" style="flex:1.6">Hạ lệnh đánh</button></div>';
      return h;
    }

    // ---------------------------------------------------------------------------- preview / ask dock
    const RESN = { luong: 'Lương', tien: 'Tiền', uy: 'Uy' };
    function pvLine(p) {
      const r = p.res || {}, ch = Object.keys(RESN).filter((k) => r[k] && r[k][0] !== r[k][1]);
      return '<div class="rr">' + (ch.length ? ch.map((k) => '<span>' + RESN[k] + ' <i>' + num(r[k][0]) + '</i> → <b class="' + (r[k][1] < r[k][0] ? 'bad' : 'good') + '">' + num(r[k][1]) + '</b></span>').join('') : '<span>Không tốn thêm</span>') + '</div>' + (p.lines || []).map((l) => '<div class="ln">' + esc(l) + '</div>').join('');
    }
    function drawDock() {
      const map = mapOn() && !S.fc && !S.cardsOpen;
      let h = '', key = '';
      if (map && S.ask) {
        const a = S.ask, nm = thing(a.kind, a.id);
        h = '<div class="h"><b>' + esc(nm) + '</b><span>thành địch</span></div><div class="ask"><button type="button" class="bt pr" data-a="ask-attack">' + svg('sword') + '<div><b>Đánh ngay</b><small>một trận</small></div></button><button type="button" class="bt" data-a="ask-siege">' + svg('camp') + '<div><b>Vây</b><small>đồn −20% mỗi mùa</small></div></button></div><div class="bb"><button type="button" class="bt" data-a="ask-no" style="min-height:36px">Thôi</button></div>';
        key = 'ask' + a.id;
      } else if (map && S.preview) {
        const p = S.preview.p, a = S.preview.act || {}, task = a.type === 'task';
        const t = task ? taskName(a.key) : (INTENT[a.intent] || 'Đi tới') + ' ' + thing(a.target && a.target.kind, a.target && a.target.id);
        const w = p.seasons == null ? '' : p.seasons <= 0 ? (task ? 'xong ngay' : 'tới nơi ngay') : (task ? 'xong sau ' : 'tới nơi sau ') + p.seasons + ' mùa';
        h = '<div class="h"><b>' + esc(t) + (task ? ' · ' + esc(townName(a.town)) : '') + '</b><span>' + esc(w) + '</span></div>' + pvLine(p) + (p.ok === false && p.why ? '<div class="ln bad">' + esc(p.why) + '</div>' : '') +
          '<div class="bb"><button type="button" class="bt" data-a="pv-no">Thôi</button><button type="button" class="bt pr" data-a="pv-ok"' + (p.ok === false ? ' disabled' : '') + ' style="flex:1.6">Xác nhận</button></div>';
        key = 'pv' + JSON.stringify(a);
      }
      const was = el.dock._k;
      show(el.dock, !!h); if (h) { set(el.dock, h, key); if (was && was !== key && shown(el.dock)) pop(el.dock); }
    }

    // ---------------------------------------------------------------------------- side slot: forecast, the general's plan or selection
    function drawSide() {
      const map = mapOn();
      let h = '', key = '';
      if (map && S.fc) { h = forecastPanel(); key = 'fc'; }
      else if (map && S.advice && !S.cardsOpen) { h = advicePanel(); key = 'adv'; }
      else if (map && !S.cardsOpen && S.sel) {
        const a = selArmy(), t = selTown();
        if (a) { h = armyPanel(a); key = 'a' + a.id; } else if (t) { h = townPanel(t); key = 't' + t.id; }
      }
      el.side.classList.toggle('hn-fc', key === 'fc' || key === 'adv');
      const was = el.side._k && el.side._k.replace(/(true|false)$/, '');
      show(el.side, !!h);
      if (h) { set(el.side, h, key + (S.fc ? S.fc.more : '')); if (was && was !== key && shown(el.side)) pop(el.side); }
    }

    // ---------------------------------------------------------------------------- the general's plan (V2.advise)
    const adviceAct = (it) => (it.type === 'task' ? { type: 'task', town: it.town, key: it.key } : { type: 'order', army: it.army, armies: [it.army], target: it.target, intent: it.intent });
    const adviceDone = (it) => {
      if (it.type === 'task') { const t = town(it.town); return !!(t && t.task && t.task.key === it.key); }
      const a = army(it.army), o = a && a.order;
      return !!(o && o.intent === it.intent && o.target && it.target && o.target.kind === it.target.kind && o.target.id === it.target.id);
    };
    function advicePanel() {
      const L = S.advice || [];
      let h = '<div class="ph">' + seal(V().me, '') + '<div class="pi"><span class="kk">Kế của tướng</span><span class="nm">Đề xuất mùa này</span></div><button type="button" class="xb" data-a="adv-no" aria-label="Đóng">' + xIcon + '</button></div>';
      if (!L.length) return h + '<div class="note">Tướng không đề xuất gì mùa này: giữ quân, bấm Hết mùa.</div>';
      h += '<div class="fcb">' + L.map((it, i) => {
        const done = adviceDone(it);
        let head, who, face;
        if (it.type === 'task') { head = taskName(it.key); who = townName(it.town); face = seal(V().me, 'tw'); }
        else { const a = army(it.army); head = (INTENT[it.intent] || 'Đi tới') + ' ' + thing(it.target && it.target.kind, it.target && it.target.id); who = armyName(a); face = pt(a && a.gen, a ? a.fid : V().me); }
        return '<div class="av' + (done ? ' done' : '') + '">' + face + '<div class="ai"><b class="ell">' + esc(head) + '</b><span class="ell">' + esc(who) + '</span>' + (it.why ? '<span class="why">' + esc(it.why) + '</span>' : '') + '</div>' +
          (done ? '<span class="ok" aria-label="Đã theo">' + svg('check') + '</span>' : '<button type="button" class="bt" data-a="adv-ok" data-i="' + i + '">Theo</button>') + '</div>';
      }).join('') + '</div>';
      const left = L.filter((it) => !adviceDone(it)).length;
      h += '<div class="bb"><button type="button" class="bt" data-a="adv-no">Đóng</button><button type="button" class="bt pr" data-a="adv-all"' + (left ? '' : ' disabled') + ' style="flex:1.6">' + (left ? 'Theo cả' + (left > 1 ? ' (' + left + ')' : '') : 'Đã theo cả') + '</button></div>';
      return h;
    }

    // ---------------------------------------------------------------------------- cards
    const TONE_K = { history: '#c9a8ff', envoy: TONE.gold, general: TONE.gold, captive: TONE.bad };
    function drawCards() {
      const c = S.cards[S.cardIx], on = mapOn() && S.cardsOpen && !!c && !S.fc;
      show(el.card, on); if (!on) return;
      const g = c.gen ? genOf(c.gen) : null, glyph = c.kind === 'history' ? '憶' : '令';
      const head = g ? pt(g, g.fid, 'L') : '<span class="seal" style="--c:' + (c.kind === 'history' ? '#5b3f8c' : '#6b5a3a') + ';width:52px;height:52px;font-size:27px;border-radius:12px">' + glyph + '</span>';
      const n = S.cards.length;
      let h = '<div class="ph">' + head + '<div class="pi"><span class="k" style="color:' + (TONE_K[c.kind] || TONE.gold) + '">' + esc(c.who) + '</span><span class="ti">' + esc(c.title) + '</span></div><div class="pg">' +
        (n > 1 ? '<button type="button" class="bt" data-a="card-prev" aria-label="Thẻ trước">‹</button><span class="mu num" style="font-size:11px">' + (S.cardIx + 1) + '/' + n + '</span><button type="button" class="bt" data-a="card-next" aria-label="Thẻ sau">›</button>' : '') +
        '<button type="button" class="bt l" data-a="card-later">Để sau</button></div></div><div class="rule"></div>';
      h += '<div class="tx">' + esc(c.text) + '</div>';
      if (hasStats(g)) h += '<div class="gb"><span class="txt"><b style="color:#f6eedb">' + esc(g.name) + '</b> · ' + esc((g.cls || '') + (g.trait ? ' · ' + g.trait + ': ' + (g.traitText || '') : '')) + '</span>' + statBars(g) + trung(g) + '</div>';
      h += '<div class="yn"><button type="button" class="bt" data-a="card-no"><b>' + esc(c.no.label) + '</b><small>' + esc(c.no.fx) + '</small></button><button type="button" class="bt pr" data-a="card-yes"><b>' + esc(c.yes.label) + '</b><small>' + esc(c.yes.fx) + '</small></button></div>';
      const was = el.card._k; set(el.card, h, 'c' + c.id); if (was && was !== 'c' + c.id) pop(el.card);
    }

    // ---------------------------------------------------------------------------- first-season steps
    function coachStep() {
      const v = S.view;
      if (!v || S.coachOff || S.coachDone || !mapOn() || S.cardsOpen || S.fc || S.preview || S.ask || S.advice) return 0;
      if (v.season > 1) return 0;
      const given = v.armies.some((a) => mine(a) && a.order) || v.towns.some((t) => t.owner === v.me && t.task);
      const a = selArmy();
      return given ? 3 : a && mine(a) ? 2 : 1;
    }
    const COACH = [null,
      ['Chạm một đạo quân ta', 'Cờ đỏ trên bản đồ.'],
      ['Chạm một đích', 'Thành hay quân địch: thấy hệ quả, rồi Xác nhận.'],
      ['Bấm Hết mùa', 'Mọi phe cùng đi. Quân không lệnh thì Giữ.']];
    function drawCoach() {
      const k = coachStep();
      show(el.coach, !!k);
      el.end.classList.toggle('cue', k === 3);
      if (!k) return;
      el.coach.classList.toggle('r', k > 1 || shown(el.side)); el.coach.classList.toggle('s3', k === 3);
      set(el.coach, '<span class="no">' + k + '</span><div class="cc"><b>' + COACH[k][0] + '</b><span>' + COACH[k][1] + '</span><div class="dt">' + [1, 2, 3].map((j) => '<i class="' + (j <= k ? 'on' : '') + '"></i>').join('') + '</div></div>' +
        '<button type="button" class="xb" data-a="coach-x" aria-label="Tắt hướng dẫn">' + xIcon + '</button>', 'coach' + k);
      if (el.coach._step && el.coach._step !== k) pop(el.coach);
      el.coach._step = k;
    }
    const coachEnd = () => { if (S.coachDone) return; S.coachDone = true; store.set('tq.coach', '1'); };

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
        if (l.visible === false || !mapOn()) return void (chips[k] && chips[k].classList.add('x'));
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
    const menOf = (b, side) => b.wings.filter((w) => w.side === side && !w.gone).reduce((s, w) => s + Math.max(0, w.men), 0);
    // one line why for the order a wing carries: what the general saw (the same reading as Battle.autoOrders), or the order's own text
    function whyOrder(b, w, o, changed) {
      const B = EB();
      if (!o) return '';
      if (changed) return ORDER_SHORT[o] || (B && B.ORDERS[o] ? B.ORDERS[o].text : '');
      const foes = b.wings.filter((f) => f.side !== w.side && !f.gone);
      const near = foes.filter((f) => f.lane === w.lane).sort((x, y) => Math.abs(x.row - w.row) - Math.abs(y.row - w.row))[0];
      const gap = near ? Math.abs(near.row - w.row) : 9, lane = b.lanes && b.lanes[w.lane];
      switch (o) {
        case 'ban': return 'Địch trong tầm bắn.';
        case 'xung': return 'Địch cách ' + gap + ' hàng: đà xung phong +40%.';
        case 'suon': return lane === 'wood' ? 'Rừng cản ngựa: vòng sang làn bên.' : 'Vòng sang làn bên, đánh sườn +50%.';
        case 'rut': return 'Sĩ khí ' + Math.round(w.morale) + ': lui lại hồi sức.';
        case 'hoa': return 'Có gió, địch trong rừng hay trên thuyền.';
        case 'giu': return b.siege && w.side === 'D' ? 'Giữ tường: thủ +25%, chờ địch leo.' : w.arm === 'bo' ? 'Giữ trận, giáo dài chặn kỵ.' : 'Đứng yên chờ: thủ +25%.';
        case 'tien': return w.arm === 'cung' ? 'Tiến vào tầm bắn.' : b.siege && w.side === 'A' ? 'Áp sát chân tường.' : gap <= 1 ? 'Địch trước mặt: đánh.' : 'Áp sát địch.';
        default: return B && B.ORDERS[o] ? B.ORDERS[o].text : '';
      }
    }
    function drawBattle() {
      const st = S.battle, on = !!st && !S.screen && !S.locked;
      const over = on && !!st.b.over, play = on && !over && !S.watching;
      const sw = play && S.bsel && st.b.wings.find((w) => w.id === S.bsel && w.side === (st.me || 'A') && !w.gone);
      show(el.bt, on); show(el.wl, play); show(el.lg, on && !over); show(el.bb, play); show(el.br, over); show(el.wc, !!sw && !!EB());
      if (!on) return;
      const b = st.b, me = st.me || 'A', foe = me === 'A' ? 'D' : 'A', B = EB(), prop = st.proposed || {};
      const my = b.wings.filter((w) => w.side === me), ft = b.wings.filter((w) => w.side === foe);
      const site = townName(b.site), gm = b[me] && b[me].gen, gf = b[foe] && b[foe].gen;
      const fm = (b[me] && b[me].fid) || V().me, ff = (b[foe] && b[foe].fid) || null;
      const what = (b.siege ? (me === 'A' ? 'Công thành ' : 'Giữ thành ') : 'Trận ') + site;
      // the two sides and the turn
      set(el.bt, '<div class="sd me">' + pt(gm && Object.assign({ fid: fm }, gm, genOf(gm.id) || {}), fm) + '<div><b>' + esc(gm ? gm.name : 'Ta') + '</b><span>' + num(menOf(b, me)) + '<small>quân</small></span></div></div>' +
        '<div class="mid"><b>' + (over ? 'Hết trận' : 'Lượt ' + b.turn + '<i> / ' + (b.maxTurn || 5) + '</i>') + '</b><span>' + esc(what) + ' · ' + (b.wind ? svg('wind') + 'có gió' : 'lặng gió') + (st.forecast ? ' · đoán ' + esc(st.forecast) : '') + '</span></div>' +
        '<div class="sd foe"><div><b>' + esc(gf ? gf.name : 'Địch') + '</b><span>' + num(menOf(b, foe)) + '<small>quân</small></span></div>' + pt(gf && Object.assign({ fid: ff }, gf, genOf(gf.id) || {}), ff) + '</div>', 'bt');
      if (over) { drawRecap(st); return; }
      // my wings: big cards, the general's proposal preselected; a tap opens the legal orders above the row
      if (play) {
        const wl = my.map((w) => {
          const lp = '<span class="lp" aria-label="làn ' + LANE[w.lane] + '">' + [0, 1, 2].map((j) => '<i class="' + (j === w.lane ? 'on' : '') + '"></i>').join('') + '</span>';
          if (w.gone) return '<div class="wg gone"><div class="w1">' + ic(w.arm) + ARM_NAME[w.arm] + lp + '</div><div class="w2">' + num(Math.max(0, w.men)) + '</div><div class="w4">' + (w.routed ? 'Tan vỡ.' : w.left ? 'Rời trận.' : 'Hết quân.') + '</div></div>';
          const o = eff(w), ch = !!S.bo[w.id];
          return '<button type="button" class="wg' + (S.bsel === w.id ? ' on' : '') + (ch ? ' ch' : '') + '" data-a="wing" data-id="' + esc(w.id) + '"><div class="w1">' + ic(w.arm) + ARM_NAME[w.arm] + lp + '</div>' +
            '<div class="w2">' + num(w.men) + '</div><div class="mo"><i style="width:' + Math.max(0, Math.min(100, w.morale)) + '%;background:' + moraleCol(w.morale) + '"></i></div>' +
            '<div class="w3"><b>' + esc(oname(o)) + '</b></div><div class="w4">' + esc(whyOrder(b, w, o, ch)) + '</div>' + (ch ? '<span class="ch2">đã đổi</span>' : '') + '</button>';
        }).join('');
        set(el.wl, wl, 'wl');
        // the legal orders of the chosen wing (EmperorsBattle.legalOrders on the given b)
        if (sw && B) {
          const cur = eff(sw), legal = B.legalOrders(b, sw.id);
          set(el.wc, '<div class="hd"><span><b>Cánh ' + ARM_NAME[sw.arm] + '</b> · ' + num(sw.men) + ' quân · sĩ khí ' + Math.round(sw.morale) + ' · làn ' + LANE[sw.lane] + '</span><button type="button" class="xb" data-a="wclose" aria-label="Đóng">' + xIcon + '</button></div><div class="os">' +
            legal.map((k) => { const no = k === 'hoa' && !b.wind; return '<button type="button" class="bt' + (cur === k ? ' on' : '') + '" data-a="ord" data-w="' + esc(sw.id) + '" data-o="' + k + '"' + (no ? ' disabled' : '') + '>' + esc(B.ORDERS[k].name) + (no ? '<small>lặng gió</small>' : prop[sw.id] === k ? '<small>đề xuất</small>' : '') + '</button>'; }).join('') +
            '</div><div class="tp">' + esc(cur && B.ORDERS[cur] ? B.ORDERS[cur].text : '') + '</div>', 'wc' + sw.id);
        }
        const nch = Object.keys(S.bo).length;
        set(el.bb, '<button type="button" class="bt" data-a="auto"' + (S.busy ? ' disabled' : '') + '>Tự đánh hết trận</button><button type="button" class="bt pr" data-a="fight"' + (S.busy ? ' disabled' : '') + '>' + (S.busy ? 'Đang đánh…' : 'Đánh') + '<small>' + (S.busy ? '' : nch ? 'đổi ' + nch + ' cánh' : 'theo đề xuất') + '</small></button>', 'bb');
      }
      // the other side's wings and the turns, newest first
      const foeRow = ft.map((w) => '<span class="' + (w.gone ? 'gn' : '') + '">' + ic(w.arm) + num(Math.max(0, w.men)) + '</span>').join('');
      let lg = '<div class="lt" style="margin-top:0">Địch · ' + ft.filter((w) => !w.gone).length + ' cánh</div><div class="en">' + foeRow + '</div>';
      const log = b.log || [];
      if (!log.length) lg += '<div class="lt">Trước trận</div><div class="ev">Tướng đã chọn sẵn lệnh. Chạm một cánh để đổi, hoặc Đánh luôn.</div>';
      log.slice().reverse().forEach((l) => {
        const lines = (l.ev || []).map((e) => ({ t: B ? B.say(b, e, me) : '', big: e.big, side: e.side })).filter((e) => e.t);
        lg += '<div class="lt">Lượt ' + l.turn + '</div>' + (lines.length ? lines.map((e) => '<div class="ev' + (e.big ? ' big' : '') + (e.side === me ? ' me' : e.side ? ' foe' : '') + '">' + esc(e.t) + '</div>').join('') : '<div class="ev">Hai bên giằng co.</div>');
      });
      set(el.lg, lg, 'lg' + b.turn);
    }
    // the recap after a battle: who won, both generals, the losses in big numbers, the town if it changed hands
    function drawRecap(st) {
      const b = st.b, me = st.me || 'A', foe = me === 'A' ? 'D' : 'A', oc = st.outcome || {}, win = b.over.win, draw = win === 'draw', won = win === me;
      const L = oc.losses || { A: lossOf(b, 'A'), D: lossOf(b, 'D') }, start = (s) => b.wings.filter((w) => w.side === s).reduce((n, w) => n + (w.start || 0), 0);
      const fm = (b[me] && b[me].fid) || V().me, ff = (b[foe] && b[foe].fid) || null, gm = b[me] && b[me].gen, gf = b[foe] && b[foe].gen, site = townName(b.site);
      const col = draw ? TONE.gold : won ? TONE.good : TONE.bad;
      const side = (s, g, fid, cls) => '<div class="sd ' + cls + '">' + pt(g && Object.assign({ fid }, g, genOf(g.id) || {}), fid, 'L') + '<div><span class="kk">' + (s === me ? 'Ta' : 'Địch') + (oc.routed === s ? ' · tan vỡ' : '') + '</span><b>' + esc(g ? g.name : '') + '</b>' +
        '<div class="ls"><em class="' + (s === me ? 'bad' : 'good') + '">−' + num(L[s]) + '</em><small>còn ' + num(Math.max(0, start(s) - L[s])) + '</small></div></div></div>';
      let fx;
      if (b.siege) {
        const taken = win === 'A', holder = taken ? b.A.fid : b.D.fid;
        const line = taken ? (me === 'A' ? site + ' về tay ta' : site + ' thất thủ') : me === 'D' ? 'Giữ được ' + site : site + ' vẫn đứng';
        fx = seal(holder) + '<div style="display:flex;flex-direction:column;min-width:0"><b>' + esc(line) + '</b><span>' + (taken ? 'Cờ ' + esc(F(holder).short) + ' lên thành' : 'Tường còn người giữ') + '</span></div>';
      } else {
        const line = draw ? 'Hai bên cùng lui' : won ? 'Địch rút chạy' : 'Ta lui quân';
        fx = seal(draw ? fm : won ? fm : ff) + '<div style="display:flex;flex-direction:column;min-width:0"><b>' + esc(line) + '</b><span>' + esc(site) + '</span></div>';
      }
      set(el.br, '<div class="top"><div class="h1" style="color:' + col + '">' + (draw ? 'Bất phân thắng bại' : won ? 'Thắng trận' : 'Thua trận') + '</div><span class="kk" style="color:var(--mu)">' + esc((b.siege ? 'Công thành ' : 'Trận ') + site) + ' · ' + (oc.turns || b.turn) + ' lượt</span></div>' +
        '<div class="vs">' + side(me, gm, fm, 'me') + '<span class="vv">ĐẤU</span>' + side(foe, gf, ff, 'foe') + '</div>' +
        '<div class="fx">' + fx + '<button type="button" class="go" data-a="bdone">Tiếp tục' + svg('arrow') + '</button></div>', 'br' + b.site + b.turn);
    }
    function selectWing(id) {
      const st = S.battle; if (!st || st.b.over || S.locked) return;
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
      const s = S.screen, on = !!s && !S.locked; show(el.full, on); if (!on) return;
      let h = '';
      if (s.t === 'goal') {
        const i = s.info || {}, v = S.view, me = (v && v.me) || 'zhu_yuanzhang';
        const t5 = v ? '<div class="t5">' + v.towns.map((t) => '<span><i style="background:' + esc(F(t.owner).color) + '"></i>' + esc(t.name) + '</span>').join('') + '</div>' : '';
        h = '<div class="fp"><div class="gh"><div><span class="kk">' + esc(i.kicker || 'Hoài Nam · ' + (v && v.calendar ? v.calendar : 'Thu 219')) + '</span><div class="h1">' + esc(i.title || 'Chu Nguyên Chương xuyên về Hoài Nam') + '</div><div class="h2">' + esc(i.sub || 'Ván ngắn, không giới hạn lượt: xong khi thắng hoặc thua.') + '</div></div>' + seal(me, 'XL') + '</div>' +
          '<div class="tri"><div style="--c:#9bd49a;--b:rgba(155,212,154,.1)"><b>Thắng</b><span>' + esc(i.win || 'Nắm đủ 5 thành Hoài Nam.') + '</span></div>' +
          '<div style="--c:#f08a72;--b:rgba(240,138,114,.1)"><b>Thua</b><span>' + esc(i.lose || 'Mất hết thành, Chu tử trận, hoặc hai mùa liền hết lương hay mất Uy.') + '</span></div>' +
          '<div style="--c:#e2bf6c;--b:rgba(226,191,108,.1)"><b>Một mùa</b><span>' + esc(i.season || 'Chạm quân, chạm đích, xác nhận. Xong: Hết mùa, mọi phe cùng đi.') + '</span></div></div>' + t5 +
          '<div class="note">' + esc(i.note || 'Tào: Trương Liêu giữ Thọ Xuân với 6.000 quân, 3.500 kỵ. Ngô: thuyền Chu Thái ở Lịch Dương. Thẻ sứ giả và ký ức chờ trong huy hiệu "Thẻ".') + '</div>' +
          '<button type="button" class="go" data-a="goal-ok">' + esc(i.button || 'Vào mùa ' + (v && v.calendar ? v.calendar : 'Thu 219')) + '</button></div>';
      } else if (s.t === 'report') {
        const r = s.report, v = V(), inc = r.income, res = v.res || {}, uyD = snapDelta(v);
        const tile = (k, l, sub) => '<div><span>' + svg(k) + l + '</span><b class="num">' + num(res[k]) + '</b><small>' + sub + '</small></div>';
        const tiles = S.view ? '<div class="r3">' + tile('luong', 'Lương', inc ? '<em class="good">' + sgn(inc.luong) + '</em> <em class="bad">−' + num(inc.up) + '</em>' : '&nbsp;') + tile('tien', 'Tiền', inc ? '<em class="good">' + sgn(inc.tien) + '</em>' : '&nbsp;') +
          tile('uy', 'Uy', uyD == null ? '&nbsp;' : '<em class="' + (uyD < 0 ? 'bad' : uyD > 0 ? 'good' : 'mu') + '">' + (uyD === 0 ? '±0' : sgn(uyD)) + '</em>') + '</div>' : '';
        const fought = (r.fought || []).map((f) => {
          const meS = f.me || 'A', draw = f.win === 'draw', won = f.win === meS, lo = meS === 'A' ? f.la : f.ld, lf = meS === 'A' ? f.ld : f.la, c = draw ? TONE.gold : won ? TONE.good : TONE.bad;
          return '<div class="fb" style="--c:' + c + ';--b:' + (draw ? 'rgba(226,191,108,.12)' : won ? 'rgba(155,212,154,.12)' : 'rgba(240,138,114,.12)') + '"><span class="tg2">' + (draw ? 'Hòa' : won ? 'Thắng' : 'Thua') + '</span><b>' + esc(townName(f.site)) + '</b><span class="lz"><span>ta <em>−' + num(lo) + '</em></span><span>địch <em>−' + num(lf) + '</em></span></span></div>';
        }).join('');
        const taken = (r.taken || []).map((t) => {
          const ours = t.to === v.me, lost = t.from === v.me;
          return '<div class="tk2">' + seal(t.from, 'S old') + '<svg class="ar" viewBox="0 0 24 24">' + ICON.arrow + '</svg>' + seal(t.to, 'S') + '<b class="' + (ours ? 'good' : lost ? 'bad' : '') + '">' + esc(townName(t.town) + (ours ? ' về tay ta' : lost ? ' mất vào tay ' + F(t.to).short : ' về ' + F(t.to).short)) + '</b><span>' + (t.siege ? 'vây, mở cổng' : 'sau trận') + '</span></div>';
        }).join('');
        const news = (r.lines || []).filter((l) => !(inc && /^Thu \d|nuôi quân/i.test(l))).map((l) => { const bad = l.charAt(0) === '!'; return '<span class="' + (bad ? 'bad' : '') + '">' + esc(bad ? l.slice(1) : l) + '</span>'; }).join('');
        h = '<div class="fp rpt"><div class="hdr"><div class="h1">' + esc(r.season || 'Mùa') + ' kết thúc</div><span class="kk">Tổng kết mùa</span></div><div class="rp"><div>' + tiles + fought + taken + '</div><div><span class="kk" style="color:var(--mu)">Tin trong mùa</span><div class="nw">' + (news || '<span>Một mùa yên ắng.</span>') + '</div></div></div>' +
          '<button type="button" class="go" data-a="rep-ok">' + (v.calendar && v.calendar !== r.season ? 'Sang ' + esc(v.calendar) : 'Tiếp tục') + svg('arrow') + '</button></div>';
      } else if (s.t === 'beat') {
        const b = s.beat, v = V(), t = town(b.town) || {}, nm = townName(b.town), ours = b.to === v.me, lost = b.from === v.me;
        const head = ours ? nm + ' về tay ta' : lost ? nm + ' mất vào tay ' + F(b.to).short : nm + ' về tay ' + F(b.to).short;
        const why = b.siege ? (ours ? 'Bị vây, đồn đói, mở cổng hàng.' : 'Bị vây, đồn đói, mở cổng.') : ours ? 'Hạ thành sau trận.' : 'Thất thủ sau trận.';
        const gar = t.gar ? total(t.gar) : null;
        h = '<div class="fp" style="--c:' + (ours ? TONE.good : lost ? TONE.bad : TONE.gold) + '"><div class="bx"><div class="h1">' + esc(head) + '</div><div class="why">' + esc(why) + (gar != null ? ' Đồn ' + (t.garApprox ? '~' : '') + num(gar) + ' · lũy ' + num(t.walls) + '.' : '') + '</div></div>' +
          '<div class="stp">' + seal(b.to, 'XL') + '</div><button type="button" class="go" data-a="beat-ok">Tiếp' + svg('arrow') + '</button></div>';
      } else if (s.t === 'over') {
        const o = s.over, v = V(), own = v.towns.filter((t) => t.owner === v.me).length;
        h = '<div class="fp ov"><div class="gh"><div><span class="kk">' + (o.win ? 'Thiên hạ Hoài Nam' : 'Hết ván') + '</span><div class="h1" style="color:' + (o.win ? TONE.gold : TONE.bad) + '">' + (o.win ? 'Hoài Nam về một mối' : 'Thất bại') + '</div></div>' + seal(v.me || 'zhu_yuanzhang', 'XL') + '</div><div class="why">' + esc(o.why || '') + '</div>' +
          (S.view ? '<div class="in"><div><span>Mùa</span><b>' + v.season + '</b></div><div><span>Thành</span><b>' + own + '/' + v.towns.length + '</b></div><div><span>Lương</span><b>' + num(v.res.luong) + '</b></div><div><span>Tiền</span><b>' + num(v.res.tien) + '</b></div><div><span>Uy</span><b>' + num(v.res.uy) + '</b></div></div>' : '') +
          '<button type="button" class="go" data-a="again">Chơi lại</button></div>';
      }
      el.full.classList.toggle('beat', s.t === 'beat');
      const key = s.t + (s.t === 'beat' ? s.beat.town : ''), was = el.full._k;
      set(el.full, h, key); if (was && was !== key && shown(el.full)) pop(el.full);
    }

    // ---------------------------------------------------------------------------- a hook playing: lock, letterbox, captions
    function drawLock() {
      show(el.catch, S.locked); show(el.skip, S.locked && has('onSkip'));
      if (layer.classList.contains('bars') !== !!S.bars) { layer.classList.toggle('bars', !!S.bars); drawHud(); }
      // the skip hint sits in the letterbox when there is one
      el.skip.style.bottom = S.bars ? '6px' : '';
    }
    let skipAt = 0;
    let capSeq = 0, capDone = null, capTimer = 0, capHold = false;
    // a tap while a hook plays: its caption goes with it, and the hook is told to finish now
    el.catch.addEventListener('pointerdown', (e) => { e.preventDefault(); const t = now(); if (t - skipAt < 350) return; skipAt = t; if (capHold) caption(null); H('onSkip'); });
    function caption(text, o) {
      o = o || {};
      if (capDone) { capDone(); capDone = null; }
      clearTimeout(capTimer);
      const id = ++capSeq;
      capHold = false;
      if (!text) { show(el.cap, false); return Promise.resolve(); }
      const who = o.who, B = S.battle && S.battle.b;
      let face = '', name = o.name || '';
      if (who && typeof who === 'object') { face = pt(who, who.fid); name = name || who.name || ''; }
      else if (who && (genOf(who) || (B && [B.A, B.D].some((s) => s && s.gen && s.gen.id === who)))) {
        const g = genOf(who) || [B.A, B.D].map((s) => s && s.gen && s.gen.id === who && Object.assign({ fid: s.fid }, s.gen)).find(Boolean);
        face = pt(g, g.fid); name = name || g.name;
      } else if (who && fac[who]) { face = seal(who); name = name || F(who).name; }
      else if (who) name = name || String(who);
      el.cap.classList.toggle('nr', !face && !name);
      el.cap.innerHTML = face + '<div>' + (name ? '<span class="kk">' + esc(name) + '</span>' : '') + '<span class="ln">' + esc(text) + '</span></div>';
      show(el.cap, true); pop(el.cap);
      const ms = o.ms != null ? o.ms : Math.max(2200, Math.min(6000, 1600 + String(text).length * 55));
      capHold = !(ms > 0);
      return new Promise((res) => {
        capDone = res;
        if (ms > 0) capTimer = setTimeout(() => { if (id !== capSeq) return; show(el.cap, false); if (capDone) { capDone(); capDone = null; } }, ms);
      });
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
      if (S.locked || S.watching) return;
      if (!hit || hit.kind === 'ground' || hit.id == null) { if (S.sel || S.cardsOpen || S.advice) { S.cardsOpen = false; S.advice = null; select(null); draw(); H('onSelect', null); } return; }
      const a = selArmy(), t = a && mine(a) && S.targets && S.targets.find((x) => x.kind === hit.kind && x.id === hit.id);
      if (t) return target(t);
      S.cardsOpen = false; S.advice = null; select({ kind: hit.kind, id: hit.id }); draw(); H('onSelect', { kind: hit.kind, id: hit.id });
    };
    function watch(on) {
      S.watching = !!on;
      if (S.watching) { resetSel(); S.sel = null; S.cardsOpen = false; S.advice = null; S.bsel = null; }
      draw();
    }
    function mute(on) {
      if (on === undefined) return S.muted;
      S.muted = !!on; store.set('tq.mute', S.muted ? '1' : '0'); drawTr(); H('onMute', S.muted);
      return S.muted;
    }

    // ---------------------------------------------------------------------------- events
    const act = {
      end: () => { coachEnd(); H('onEndSeason'); },
      goal: () => ui.goal(),
      cards: () => { S.cardsOpen = !S.cardsOpen; if (S.cardsOpen) { S.fc = null; S.preview = null; S.ask = null; S.advice = null; } draw(); },
      home: () => H('onOverview'),
      watch: () => { watch(true); H('onWatch', true); },
      unwatch: () => { watch(false); H('onWatch', false); },
      mute: () => mute(!S.muted),
      advise: () => { if (S.advice) { S.advice = null; draw(); return; } S.cardsOpen = false; S.fc = null; S.preview = null; S.ask = null; select(null); H('onAdvise'); draw(); },
      'adv-ok': (d) => { const it = S.advice && S.advice[+d.i]; if (it) H('onConfirmOrder', adviceAct(it)); draw(); },
      'adv-all': () => { (S.advice || []).filter((it) => !adviceDone(it)).forEach((it) => H('onConfirmOrder', adviceAct(it))); draw(); },
      'adv-no': () => { S.advice = null; draw(); },
      'coach-x': () => { coachEnd(); draw(); },
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
      wclose: () => { S.bsel = null; drawBattle(); H('onWingSelect', null); },
      ord: (d) => setOrder(d.w, d.o),
      fight: () => { if (S.busy) return; S.busy = true; S.bsel = null; drawBattle(); H('onBattleTurn', Object.assign({}, S.bo)); },
      auto: () => { if (S.busy) return; S.busy = true; S.bsel = null; drawBattle(); H('onAutoBattle'); },
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

    function draw() { drawHud(); drawTr(); drawEnd(); drawSide(); drawDock(); drawCards(); drawCoach(); drawBattle(); drawFull(); drawLock(); drawLabels(); }

    // ---------------------------------------------------------------------------- API
    const ui = {
      el: layer,
      render(view, sel) {
        S.view = view;
        if (view && view.res && !S.snap[view.season]) S.snap[view.season] = { uy: view.res.uy };
        if (view && view.season > 1) coachEnd();
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
        S.fc = { f, act: { armies, target: a.target || (a.kind ? { kind: a.kind, id: a.id } : p.target) }, x, more: false }; S.ask = null; S.preview = null; S.cardsOpen = false; S.advice = null; draw();
      },
      cards(list, quiet) {
        if (list) S.cards = list;
        if (S.cardIx >= S.cards.length) S.cardIx = 0;
        if (!S.cards.length) S.cardsOpen = false;
        // an urgent card opens itself once, never over a gesture in progress (an open preview, question or forecast)
        const u = S.cards.findIndex((c) => c.urgent && !S.seen[c.id]);
        if (u >= 0 && !S.fc && !S.preview && !S.ask && !S.watching) { S.seen[S.cards[u].id] = 1; S.cardIx = u; S.cardsOpen = true; }
        if (!quiet) draw();
      },
      openCards() { if (S.cards.length) { S.cardsOpen = true; S.fc = null; S.preview = null; S.ask = null; S.advice = null; draw(); } },
      battle(st) {
        const prev = S.battle;
        S.busy = false;
        if (!st) { S.battle = null; S.bo = {}; S.bsel = null; draw(); return; }
        if (!prev || prev.b.site !== st.b.site || prev.b.turn !== st.b.turn) S.bo = {};
        Object.keys(S.bo).forEach((id) => { const w = st.b.wings.find((x) => x.id === id); if (!w || w.gone || S.bo[id] === (st.proposed || {})[id]) delete S.bo[id]; });
        if (S.bsel && !st.b.wings.some((w) => w.id === S.bsel && !w.gone)) S.bsel = null;
        S.battle = st; S.sel = null; S.advice = null; draw();
      },
      report(r) { S.screen = { t: 'report', report: r || {} }; draw(); },
      beat(b) { S.screen = { t: 'beat', beat: b }; S.sel = null; draw(); },
      goal(info) { S.screen = { t: 'goal', info }; draw(); },
      over(o) { S.screen = { t: 'over', over: o || {} }; draw(); },
      close() { S.screen = null; draw(); },
      labels(list) { S.labels = list || []; drawLabels(); },
      tap,
      selectWing,
      // a caption left up with ms 0 goes when the lock lifts (a hook that forgot it must not leave it over play)
      lock(on, o) { S.locked = !!on; if (o && o.bars != null) S.bars = !!o.bars; if (!S.locked) { S.bars = false; if (capHold) caption(null); } else S.bsel = null; draw(); },
      bars(on) { S.bars = !!on; drawLock(); },
      caption,
      watch,
      mute,
      advise(list) { S.advice = list ? list.slice() : null; if (S.advice) { S.cardsOpen = false; S.fc = null; S.preview = null; S.ask = null; } draw(); },
      coach(on) { if (on) { S.coachOff = false; S.coachDone = false; store.set('tq.coach', '0'); } else S.coachOff = true; draw(); },
      destroy() { if (ro) ro.disconnect(); window.removeEventListener('resize', fit); clearTimeout(capTimer); if (tw.raf) cancelAnimationFrame(tw.raf); layer.remove(); style.remove(); },
    };
    ui.battle.selectWing = selectWing;
    ui.battle.end = () => ui.battle(null);
    let ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(fit); ro.observe(root); }
    window.addEventListener('resize', fit);
    fit();
    draw();
    // the sound was left off last time: say so once, so whoever plays sound starts silent
    if (S.muted) H('onMute', true);
    return ui;
  }

  window.HuaiNanUI = { create };
})();
