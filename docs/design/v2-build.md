# Dựng v2: Demo Hoài Nam chơi được trong repo

> Luật: [`GAMEPLAY-FREEZE.md`](../product/GAMEPLAY-FREEZE.md) (v2, khóa 29/9), tầng A (Lõi) + B (Demo Hoài Nam). Quyết định: [`DECISION.md`](../phases/v2-gameplay/DECISION.md). Chủ dự án giao 29/9: "spawn các subagent thực hiện v2".
> Nguồn để cổng: demo 1 (`docs/phases/v2-gameplay/demo1/`), chủ dự án đã chơi. Spike là mẫu, không phải code để giữ: `hn-rules.js` (luật), `hn-scene.js` (cảnh), `ui/component.js` + `ui/template.html` (giao diện canvas). Trận: `src/engine/battle.js` (đã có, khớp spike từng seed); dự đoán: `Battle.forecast`.
> Trang: `v2.html` (mới). `game.html` (v1, 20 châu) giữ nguyên cho tới khi v2 thay.

## Mô-đun và hợp đồng

Ba agent chạy song song trong worktree riêng, mỗi agent chỉ sửa file của mình. Hợp đồng dưới đây là ranh giới; đổi hợp đồng thì báo Claude chính, không tự đổi phía bên kia.

| Mô-đun | Agent, model | File được sửa |
| --- | --- | --- |
| E. Luật v2 | E, Opus | `src/engine/v2/huainan.js`, `data/scenario/huainan.json`, `tests/v2-engine.test.mjs`, `tests/v2-sim.mjs`, `package.json` (script `v2sim`), mục v2 trong `docs/product/rules.md` |
| S. Cảnh 3D | S, Sonnet | `src/world/huainan-scene.js`, `docs/design/prototypes/huainan.html` (harness), `tests/huainan-scene.test.mjs` nếu có phần thuần |
| U. Giao diện | U, Sonnet | `src/world/huainan-ui.js`, `docs/design/prototypes/huainan-ui.html` (harness) |
| Ghép | Claude chính | `v2.html`, `src/world/huainan-play.js` (controller), `tests/e2e/v2-loop.mjs`, tài liệu |

Chung: classic script (three r146, không bundler), UMD như `src/engine/*.js`; engine thuần (không DOM, không `Math.random`); tiếng Việt cho mọi chữ người chơi thấy; comment tiếng Anh, giọng như code quanh đó. Dữ liệu mẫu cho S và U: `docs/design/v2-fixtures/*.json` (view và battle đúng hình dạng dưới, sinh từ spike).

### E. `src/engine/v2/huainan.js` — global `EmperorsV2` (Node: `module.exports`)

Cần `EmperorsBattle` (`src/engine/battle.js`): Node `require`, trình duyệt global. Mọi hàm thuần, trả state mới; `g` là JSON (lưu được).

```
V2.newGame(data, seed) → g                      data = data/scenario/huainan.json
V2.view(g) → View                              những gì người chơi (g.me) được thấy; UI và cảnh chỉ đọc View
V2.targets(g, armyId) → [{ kind: 'town'|'army', id, intent: 'move'|'attack'|'ask', d }]
                                               intent suy từ đích: đất ta / bạn = move; quân địch = attack; thành địch = ask (UI hỏi đánh ngay / vây)
V2.preview(g, act) → { seasons, res: { luong: [trước, sau mùa], tien: [..], uy: [..] }, lines: [string] }
                                               act = { type: 'order', army, target: { kind, id }, intent } | { type: 'task', town, key }
V2.order(g, armyId, target|null, intent?) → g  tối đa một lệnh mỗi đạo; null = bỏ lệnh (Giữ)
V2.tasks(g, townId) → { suggested: [key] (2–3, theo ngữ cảnh), all: [{ key, name, seasons, cost, text, ok, why }] }
V2.setTask(g, townId, key|null) → g            tối đa một việc; đổi trong mùa thì hoàn
V2.transfer(g, townId, armyId, arm, n) → g     n > 0: đồn → quân
V2.answer(g, cardId, yes) → g
V2.forecast(g, armyIds, target) → { label, sa, sd, est: { la, ld }, reasons: [2 lý do], more: { reasons: [≤ 6], lanes, analyst: { id, name, muu } } }
                                               đọc trên quân địch như View cho thấy (không truth); không bao giờ có tỉ lệ thật
V2.endSeason(g) → g                            thẻ chưa trả lời = "không"; AI; đi; trận. Có trận của người chơi → g.pending ≠ null, dừng chờ;
                                               không → hết mùa (vây, việc, thu chi, Trung, chạm đáy, thắng thua), g.report, mùa mới
V2.battle(g) → null | { plan, b, me: 'A'|'D', proposed: { wingId: order } }
                                               b là state của Battle (src/engine/battle.js); proposed = lệnh tướng đề xuất cho cánh ta
V2.battleTurn(g, overrides) → g                overrides = { wingId: order } (chỉ cánh người chơi đổi); cánh khác theo đề xuất; bên kia tự động.
                                               Trận hết → áp hậu quả, sang trận kế hoặc hết mùa
V2.autoBattle(g) → g                           đánh hết trận bằng đề xuất (người chơi bỏ qua)
```

`View` (UI và cảnh chỉ đọc cái này):

```
{
  season, calendar: 'Thu 219', me, over: null | { win, why },
  res: { luong, tien, uy }, income: null | { luong, tien, up }, warn: { luong, uy },
  towns: [{ id, name, owner, walls, river, gar: { bo, cung, ky, thuy } | null, garApprox, task: null | { key, name, left }, gov: null | GenCard }],
  armies: [{ id, fid, arm: 'land'|'fleet', at, besieging, gen: GenCard | null,
             units: { bo, cung, ky, thuy } | null,   // ta: đúng; gần: ±20 % tròn trăm; xa: null
             arms: ['bo', 'ky', …],                   // luôn có: loại quân (xa chỉ thấy cờ và loại)
             seen: 'own' | 'near' | 'far', order: null | { intent, target: { kind, id } } }],   // order: chỉ quân ta
  cards: [{ id, kind: 'history'|'envoy'|'general'|'captive', who, gen, title, text, yes: { label, fx }, no: { label, fx }, urgent }],
  gens: { [id]: GenCard },                      // tướng ta, đủ chỉ số; tướng địch chỉ { id, name, fid, seal }
  report: null | { season, lines: [string], fought: [{ site, win, me, la, ld }], income, towns,
            taken: [{ town, from, to, siege }] }   thành đổi chủ trong mùa, theo thứ tự mất (vây mở cổng: siege true)
}
GenCard = { id, name, fid, seal, cls?, uy?, tai?, muu?, dung?, kien?, loyal?, trait?, traitText? }
```

`data/scenario/huainan.json` có ít nhất `towns` (hình dạng như `v2-fixtures/data-towns.json`: `{ id, name, seat | lonlat, river, terrain }`), `seats`, `factions` (`{ name, short, glyph, color }`); cảnh đọc ba khóa này, giữ nguyên tên.

Luật: freeze tầng B (số của demo 1) với các sửa của tầng A: lệnh và việc tối đa một, bỏ qua hợp lệ (quân Giữ, thành không khởi việc); thẻ hàng chờ, `urgent` chỉ khi thật sự chặn; quân xa chỉ cờ và loại (demo 1 cho ±50 %, freeze bỏ); dự đoán trả 2 lý do + `more`. Nội dung (thành, quân, tướng có chỉ số, thẻ, AI Tào / Ngô / hào tộc) lấy từ spike vào `data/scenario/huainan.json` và engine; đặc tính tướng dùng id tác dụng của `Battle.TRAITS`.

Test (`tests/v2-engine.test.mjs`): mùa kết thúc được khi không lệnh, không việc; không đạo nào hai lệnh, không thành nào hai việc; thẻ không trả lời là "không"; chạm đáy hai mùa thua, một mùa không; View không lộ số của phe khác ở xa, không lộ tên hay chỉ số tướng địch ngoài `GenCard` rút gọn, không có tỉ lệ thắng thật; `preview` khớp với thu chi thật của mùa; cùng seed chơi lại y hệt; một trận đánh hết được chỉ bằng đề xuất. `tests/v2-sim.mjs` (`npm run v2sim -- 200`): tỉ lệ thắng, số mùa, lần chạm theo 3 lối chơi (thụ động: chỉ bấm hết mùa; tham: đánh nơi dự đoán tốt nhất; ngẫu nhiên hợp lệ).

### S. `src/world/huainan-scene.js` — global `HuaiNanScene`

Cổng `hn-scene.js` sang runtime thường (`WorldRuntime.create` như `game.html`, assets `assets/map/`, không `HNBoot`, không `HN_DATA`: vị trí thành, tên, sông lấy từ `data/scenario/huainan.json` + `rt.terr`, `rt.MC`, meta của runtime). Giữ hình đã duyệt: thành cỡ Civ, tượng quân theo binh chủng quanh cờ tướng, nền màu phe, ống kính.

```
const sc = await HuaiNanScene.create(rt, { data, width, height, quality })
sc.sync(view)                                  vẽ thành, quân theo View (xa: tượng theo loại quân, không số)
sc.pick(x, y) → { kind: 'army'|'town'|'ground', id?, ground?: { kind, name, fx } }
sc.select(sel) · sc.targets(armyId, targets)   vòng tầm và đích hợp lệ; sc.targets(null) để xoá
sc.focus(id) · sc.overview()                   máy quay tới thành / quân, hay toàn cảnh Hoài Nam
sc.battle.begin({ site, from, me, siege }) · sc.battle.show(b, me) · sc.battle.pickWing(x, y) → wingId | null · sc.battle.end()
                                               b = state của Battle; khối quân mỗi cánh theo làn × hàng trên địa hình thật, như spike
sc.loop(onFrame) · sc.stop() · sc.measure() → { calls, triangles }
```

Ngân sách: `docs/design/visual-build.md` (0005). Harness `docs/design/prototypes/huainan.html?view=…&battle=…` đọc fixture, chụp được bằng `tools/shoot.mjs`.

### U. `src/world/huainan-ui.js` — global `HuaiNanUI`

DOM thuần phủ trên canvas (như `src/world/player-ui.js`), điện thoại ngang 844×390 là khung chuẩn, desktop co giãn. Không gọi engine: nhận View / dữ liệu và gọi callback. Cổng giao diện của demo 1 (`ui/template.html`, `component.js`): chữ, màu, chân dung mực (`demo1/portraits/`).

```
const ui = HuaiNanUI.create(root, handlers)
ui.render(view, sel)                           thanh lương / tiền / Uy (số, kèm thu chi mùa trước), huy hiệu thẻ, nút Hết mùa (luôn bấm được)
ui.armyCard(army) · ui.townPanel(town, tasks)  quân: tướng, số, lệnh hiện tại; thành: 2–3 việc gợi ý + "thêm"
ui.preview(p) · ui.askIntent(target)           chip hệ quả trước khi xác nhận; hỏi "đánh ngay / vây" khi đích là thành địch
ui.forecast(f)                                 nhãn, sức hai bên, thương vong ước, 2 lý do; "?" mở `more`
ui.cards(view.cards)                           hàng chờ; mở khi người chơi chạm huy hiệu (hoặc thẻ `urgent`)
ui.battle(state)                               lượt n / 5, đề xuất của tướng từng cánh; chạm cánh đổi lệnh (chỉ lệnh hợp lệ); "Đánh" chạy lượt; "Tự đánh" hết trận; log lượt (Battle.say)
ui.report(report) · ui.goal() · ui.over(over)  tóm tắt mùa (một màn), màn mục tiêu đầu ván, màn kết
ui.beat({ town, from, to, siege })             một thành đổi chủ: thẻ dưới đáy, bản đồ (máy quay ở thành đó) vẫn thấy
handlers = { onEndSeason, onSelect, onConfirmOrder, onClearOrder, onTask, onAnswer, onBattleOrder, onBattleTurn, onAutoBattle, onForecast, … }
```

## Thứ tự và trạng thái

| Bước | Ai | Trạng thái |
| --- | --- | --- |
| Hợp đồng, fixture | Claude | xong 29/9 (`1966d2f`) |
| E. Luật v2 | agent E (Opus) | xong (`23b69ba`): `EmperorsV2`, `data/scenario/huainan.json`, 27 test, `npm run v2sim -- 200` |
| S. Cảnh 3D | agent S (Sonnet) | xong (`abafcc6`, `32d28c6`, `ae6742d`): hình demo 1 trên runtime thật, 11 test hàm thuần; toàn cảnh 1,87 / 1,83 / 0,97 triệu tam giác (cao / vừa / thấp) |
| U. Giao diện | agent U (Sonnet) | xong (`5fabbb1`): DOM, harness 20 trạng thái |
| Ghép `v2.html`, `huainan-play.js`, e2e | Claude | xong 29/9: `tests/e2e/v2-loop.mjs` 17/17 (thấp), 16/16 (cao) |
| Sửa sau lượt chơi đầu của chủ dự án (thành vây, bước đổi chủ) | Claude | xong 29/9: e2e 18/18 (thấp) |
| Chủ dự án chơi trên máy thật; đo 7 tiêu chí nhận của freeze | chủ dự án | chờ |

Chạy: `npm start`, mở `http://localhost:3000/v2.html` (`&seed=N`, `&tier=high|mid|low`, `&hud=1`). QA: `BASE_URL=http://127.0.0.1:3000/ xvfb-run -a node tests/e2e/v2-loop.mjs low 3`.

## Khác hợp đồng (đã ghép theo bản thật)

- Luật: thêm `V2.lastBattle(g)` (trận vừa hết, cho màn kết quả), `view.pending`, `view.flash`, `view.moves`; `targets[].km`; `preview.ok/why/fall`; lệnh trái luật thì ném lỗi (bộ điều phối bỏ qua và vẽ lại). Khóa dự đoán có seed ván.
- Cảnh: runtime tạo với `hamlets: false`; `sc.bind(canvas, { onTap })` lo cử chỉ camera; `pick` trả thêm `seat` (thành ngoài lát demo, coi như chạm đất); nhãn tên và số quân là sprite trong cảnh (chip DOM của UI tắt); đất gần chỉ dựng quanh Hoài Nam (dựng cảnh 6,3 → 2,4 giây, dựa vào thứ tự con của runtime: sửa `world-runtime.js` thì xem lại).
- Giao diện: tự xử lý chạm bản đồ (`ui.tap`) và tự hỏi "đánh ngay / vây"; dự đoán có hợp binh (`partners`).
- Ghép: khung toàn cảnh chừa chỗ cho thanh trên và nút Hết mùa; hai lỗi thời gian khung hình của cảnh (tiến độ hành quân và bay máy âm khi thời điểm khung hình sớm hơn lúc ra lệnh) đã sửa.
- Lượt chơi đầu của chủ dự án (29/9):
  - Trận vây từng dựng một bức tường thẳng thay cho thành vuông. Nay dựng chính mô hình thành (`HM.town({ open: true })`), phóng to cho mặt trước phủ ba làn; mặt đó là ba đoạn tường, mỗi làn phá riêng. Giữ thành thì máy quay nhìn từ trên tường, cờ thành tắt.
  - Vây làm thành mở cổng (hoặc thành đổi chủ vì bất cứ lý do gì) chỉ hiện một dòng trong tóm tắt mùa. Nay mỗi thành đổi chủ là một bước: máy quay bay tới, thẻ "X về tay ta" / "X mất vào tay Y" (`report.taken`, `ui.beat`, `onBeatDone`), rồi mới tới tóm tắt.

## Nợ và câu hỏi cho chủ dự án

- Cân bằng: máy "đánh chỗ tướng đoán tốt nhất" thắng 89 % trong ~4 mùa; chỉ bấm Hết mùa thì nửa số ván hết lương ở ~mùa 7. Chỉnh số tầng B sau khi chủ dự án chơi.
- Nội dung: nhận liên minh Ngô rồi từ chối thẻ Lã Mông thì Lịch Dương thành đồng minh vĩnh viễn, không đủ 5 thành để thắng (có từ spike).
- Làn trận lấy từ bảng của spike (`towns[].lanes`), có thể khác đất thật dưới trận (`sc.lanesAt`).
- Chưa thử trên điện thoại thật (cử chỉ, font, fps); mức thấp còn ~3 % dư ngân sách ở góc nặng nhất.
