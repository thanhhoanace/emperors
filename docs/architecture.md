# Kiến trúc

> **Vai trò:** bản đồ code: module nào làm gì, dữ liệu chảy thế nào, ranh giới nào không được phá.
> Cập nhật khi thêm hoặc xoá module. Lý do của từng lựa chọn nằm ở `decisions/`.

## Hiện tại

```text
data/world.json ─┐
data/personas/*  ├─► src/engine/engine.js ──► tests/engine.test.mjs, tests/sim.mjs
                 │        (thuần, tất định)  ──► server/server.js  POST /api/turn (agent MOCK)
                 │                           ──► result.events (RuntimeEvent v1) ──► game.html
index.html ── Phase 1 slice cũ (three r146, tự chứa, không dùng engine)
game.html ── trò chơi: chọn 1 trong 4 hoàng đế, mỗi mùa một lệnh; engine chạy ngay trong trình duyệt (engine.js → attach-219.js → perception.js)
             Engine → RuntimeEvent v1 → EventPresenter → WorldRuntime (+ HUD); &seed=N cố định ván, &speed=N tốc độ diễn
             ?demo=1: trình diễn fixture chuẩn (src/world/demo.js); &live=1 một lượt POST /api/turn; &qa=1 QA gọi __game.seek(i, t)
src/world/ ── thư viện hình dùng chung (một bản duy nhất; prototype cũng nạp từ đây):
             kit.js (lens, setup) · terrain.js + terrain-real.js (đất, sông, biên châu, đường) · hancity.js + city.js (thành Đông Hán)
             flora.js (cây, làng, trường thành, cầu, mây) · world-runtime.js · event-presenter.js · hud.js · names.js
             game-controller.js (vòng lượt quanh engine) · player-ui.js (chọn phe, lệnh, bảng) · demo.js
docs/design/prototypes/ ── cảnh three.js để render ảnh duyệt design (world.html vòng 8 giữ làm mốc so sánh, render.mjs)

tools/bake-map.mjs ──► assets/map/  (chạy tay, commit kết quả)
  nguồn: AWS Terrain Tiles z7 + Natural Earth 10 m (sông, hồ) + 50 m (biên giới nước) (tải vào .cache/, không commit)
         + data/world.json (lonlat 20 thủ phủ năm 219) + data/cities.json (kích thước thành)
  phép chiếu: Albers nón (25°/47°, 105°E), gốc 112°E 32°N, 1 đơn vị = 3 km (decisions/0006)
  ra:    height-fine-R-C.bin.gz  lõi Hán, lưới 0,5 đơn vị, 42 ô 128 đơn vị (delta 2 chiều + gzip, tổng ~2,2 MB);
                                 trang chỉ tải ô gần camera, ô khác lấy từ lưới thô
         height-coarse.bin.gz    lưới 2 đơn vị trên toàn Trung Quốc ngày nay và một lề (~0,6 MB)
         land.bin.gz             mặt nạ đất 4 đơn vị: khô, cát, rừng, trong biên giới Trung Quốc (~80 KB)
         water.json              sông (đường, mực nước, bề rộng, phù sa) + hồ
         meta.json               phép chiếu, lưới, ô, nguồn, toạ độ và tỉ lệ từng thành, cửa Hán
```

### Engine (`src/engine/engine.js`)

- UMD: `window.EmperorsEngine` trong trình duyệt, `require()` trong Node.
- API: `createGame(world, personas, seed)`, `restoreGame(world, personas, state)`, `decide(game, fid)`, `decideAll(game)`, `resolveTurn(game, decisions)`, `playTurn(game)`, `ranking(game)`, cùng vài truy vấn (`owned`, `frontier`, `calendar`…).
- `game = { def, state }`. `def` là dữ liệu tĩnh đã đánh chỉ mục; `state` là JSON thuần (seed, turn, provinces, factions), serialize được, đủ để replay.
- `resolveTurn` trả về `{ turn, calendar, events[], deltas[], winner }`. Mỗi event có `kind` (`attack`, `pact`, `annex`, `internal`, `stratagem`, `fortify`, `revolt`, `event`, `fall`, `win`), `text` tiếng Việt và dữ kiện cho hoạt cảnh (`fid`, `from`, `to`, `prov`, `other`, `win`…). UI chỉ cần diễn lại các event này.
- `decide` là agent MOCK. Chỗ cắm LLM: thay `decide` bằng lời gọi model dùng `personas[id].llm.decision_prompt`, miễn trả về cùng dạng quyết định (`action`, `target`, `targetKind`, `sub`, `quote`).

### Server (`server/server.js`)

- Phục vụ file tĩnh của repo tại `http://localhost:3000`.
- `POST /api/turn` với `{ seed }` hoặc `{ state }` → `{ mode: "mock", decisions, result, state }`. Đây là seam cho agent LLM; GitHub Pages không có server nên game vẫn phải chạy được thiếu nó.

## Runtime hình (`src/world`)

```text
RuntimeEvent v1 ──► EventPresenter.plan(ev) ──► { cams[], marks[], hud[] }   (hàm thuần của thời gian: frameAt(plan, t))
                         │ show(plan, t)
                         ▼
                   WorldRuntime: setView(view) · addArmy / addStandard / addDust · project()      HUD: thẻ event, tướng, Thắng/Bại, nhãn
```

- `WorldRuntime.create({ world, cities, width, height, dpr, base })` (`world-runtime.js`): dựng một lần thế giới vòng 8 (Albers, ô mịn gần 20 thủ phủ, 20 thành bản nhẹ gộp lượt vẽ, sông, trường thành, làng, cầu). Camera có ba chế độ: `far` (toàn quốc, chiến dịch), `near` (châu, hành quân), `city` (thành). Mỗi view mang khoá LOD; bộ lưới đất gần (`Terrain.meshes(…, { surfaceOnly })`) dựng khi cần, giữ tối đa 6 bộ. Thành đang nhìn gần đổi sang bản đầy đủ (cờ cổng, thuyền), cây mọc quanh tiêu điểm.
  - View: `viewCampaign()`, `viewOverview()`, `viewProvince(pid)`, `viewCity(pid)`, `viewLook(from, to)`, `viewFollow(path, u)`, `lerpView(a, b, e)`; `prepare(view)` dựng LOD trước khi bay.
  - `focusProvince(pid)`, `focusCity(pid)`, `campaign()`; `pathBetween(from, to)` lấy đường đã tính giữa hai châu kề (A* trong `terrain-real.js`).
  - `setOwners(owners)`: nhận chủ đất từ state engine (màu đất, cờ thành). Runtime không tự đổi chủ.
- `EventPresenter.create(rt, { world, characters, names, hud })` (`event-presenter.js`): mỗi event là một cảnh bắt đầu và kết thúc ở view chiến dịch.
  - `attack` (`march.md`): thủ phủ `from` + tướng `actorChar` và quân → theo đường tới `to` → thành đích, tướng `defenderChar` phe `defenderFid` ở chân thành → bụi trận → kết quả lấy từ `win` (thắng: cờ phe đánh cắm lên thành; thua: quân rút) → về chiến dịch. Không đọc `defender` thô, không tính trận, không đổi chủ.
  - `gate`: camera theo `shot.camera` rồi `shot.then` (bảng `EventPresenter.NAMED`; `four_rim_seats` = trị sở của từng `actors`), dài đúng `shot.seconds`; mỗi `actors[]` đứng ở châu mình trấn (`characters.json` `governors`) kèm thẻ và nhãn. Không đổi state.
  - Kind khác: bay tới `prov` hoặc thủ phủ phe, hiện thẻ (`clauses` thành chữ).
  - `play(ev, { speed })` chạy thời gian thật 1×/2×/4×; `playAll(events)`.
- `hud.js`: lớp DOM (thẻ event, thẻ tướng, dấu Thắng/Bại, nhãn nổi theo `rt.project`, nhật ký, tốc độ). `names.js`: tên tiếng Việt theo `docs/product/characters.md`.

## Vòng chơi (`game.html`) — gameplay contract v1.1

```text
PlayerUI ── chọn đế ──► GameController.start(fid) ── Engine.createGame(world + gatesPack + charactersPack + intelRules, personas, seed)
         ── lệnh ────► ctrl.decision(action, lựa chọn) ─ ctrl.validate (chỉ để UX) ─► "Ban lệnh" = lệnh đã chốt cho mùa
                          ctrl.prepare: Engine.ownersSnapshot → Engine.preparePlayerTurn(game, fid, lệnh)   ĐÚNG MỘT LẦN
                                        (mọi quyết định AI của lượt đóng băng trong một envelope; ctrl.pendingTurn)
         ◄── sứ giả ── envelope.pendingReactions → PlayerUI.react (CHẤP NHẬN / TỪ CHỐI, từng thẻ, theo thứ tự id)
                          ctrl.answer → Engine.answerReaction(cùng envelope)       (không tốn lệnh, không sinh lại AI)
                          ctrl.commit: Engine.resolvePrepared(game, cùng envelope) → result.events (RuntimeEvent: chỉ lưu)
                                       Engine.projectTurnObservation(game, fid, result, before) → { visibleEvents, publicNews }
                                       GameController.presentationOf(observation) → { shots, log, news, win }
         ◄── diễn ─── presenter.playAll(shots): kết quả lệnh mình + tối đa một phản ứng nhắm vào mình; phần còn lại vào nhật ký;
                          một thẻ "Thiên hạ" từ publicNews → sync: rt.setOwners(state), HUD từ ctrl.view()
         ◄── mở ──── lượt mới; state.over → màn kết thúc từ state.winner + tin công khai `win`
```

- `game-controller.js` (UMD, không DOM; `tests/game-controller.test.mjs` chạy nó với engine thật trong Node):
  - Mọi thứ về phe khác chỉ từ `Engine.projectPerception(game, playerFid)` (`ctrl.perception()`; `ctrl.view()` = `{ status, options }`). Phe mình: số thật (quân, lương, dân tâm, Uy, châu, lũy, thủ phủ, thu/chi). Phe khác: `publicLabel`, `claimedIdentity`, còn/mất, số châu, `troopBand` phe, lượt thấy cuối. Không quân/Uy thật, không ước lực, không tỉ lệ thắng.
  - Đánh: `legal.attackTargets` (châu được bảo hộ khách không có ở đây). Mỗi đích mang `intel` = `provinceIntel[pid]` `{ troopBand, commander, fortLevel, lastSeenTurn, source }` — band của châu, không phải band cả phe. `GameController.intelWords`: `adjacent` → "Tin: hiện tại"; `memory` → "Tin cũ: lượt N"; `unknown` → "Quân: Chưa rõ · Tướng: ? · Lũy: ?"; `fortLevel` 0 = "0", null = "?". `options.far` = châu xa còn nhớ (`memory`), chỉ để xem. `from` người chơi chọn khi có nhiều châu kề.
  - Chiêu hàng: `annexTargets` (`ownerLabel` "Trung lập" + intel). Minh ước: `pactTargets` (một điều khoản, `rules.pactTurns` mùa), kèm áp lực. Mưu: `Engine.STRATAGEMS`. Củng cố: `fortifyTargets`.
  - Bảo hộ khách: đúng `self.guestProtection` (`active`, `remainingTurns`, `protectedFrom`, `brokenAgainst` → nhãn công khai). Không active thì không hiện đếm ngược; hết vì đã 2 châu → "Bảo hộ đã chấm dứt sau khi mở rộng lãnh thổ."
  - Minh ước của mình và minh ước công khai: `world.pacts` (`untilTurn`, `remainingTurns` của engine). Áp lực biên giới: `diplomaticPressure` (Không đáng kể / Theo dõi / Cao) — góc nhìn của người chơi, không phải ý định phe khác.
  - `presentationOf(observation, look)`: câu chữ dựng từ `textKey` + nhãn/thành/kết quả/`ownLoss` (không bao giờ `ev.text`). Mục `safe: true`: `march` chỉ khi observation có cả `from` và `to` (đánh của mình); bị đánh → cảnh nhìn thành mình, không truy nơi xuất phát. Không đếm việc giấu.
  - Lịch sử lượt: `entry.events` (RuntimeEvent thô, replay/debug), `entry.observation`, `visibleEvents`, `publicNews`, `presentation`. UI không đọc `entry.events`.
  - Người chơi / câu trả lời là dữ liệu phiên (`pendingTurn`), không ghi vào `game.state`.
- `player-ui.js`: màn chọn đế, bảng phe (số mình, minh ước, bảo hộ khách, giải thích chỉ số khi rê chuột), bảng lệnh (thẻ châu theo intel), bảng các phe + áp lực biên giới + minh ước thiên hạ, thẻ sứ giả, thẻ "Thiên hạ", thanh lượt, màn kết thúc. Chỉ đọc `ctrl.view()` và presentation; không đọc `ctrl.game`, `game.state` hay RuntimeEvent.
- `event-presenter.js`: RuntimeEvent (demo/spectator: tên từ `characters.json`, lời thô) hoặc mục `safe` (chơi: chỉ nhãn trong mục, không gọi `names.name`). `hud.js` dùng `kicker`/`glyph` của mục khi có.
- Engine chạy trong trình duyệt đúng như server và test nạp: `engine.js` → `attach-219.js` → `perception.js`; mỗi lớp tự gắn vào `window.EmperorsEngine`, `game.html` chỉ lấy `window.EmperorsEngine`. `?demo=1` vẫn diễn `result.events` thô.

Còn lại: nướng mặt nạ lõi (bớt ~16 giây `createReal` lúc mở trang), cảnh cắt trận (battle.js), tour khóa theo điểm dừng, 3 mức chất lượng, thay `index.html` bằng `game.html` (chờ chủ dự án duyệt).

Hiệu năng: mọi thứ trong `src/world` phải nằm trong ngân sách của `decisions/0005`. `tests/e2e/runtime-slice.mjs` đo tam giác từng khung; ảnh duyệt design vẫn đo bằng `render.mjs`.

Ranh giới:

- `src/world` chỉ đọc `state` và event; không bao giờ tự sửa số liệu game.
- Engine không biết tới Three.js hay DOM.
- Hàm hoạt cảnh nhận một event và trả về Promise, để tốc độ (1×/2×/4×) và "Tự động" điều khiển được toàn bộ trình tự lượt.

## Test và CI

- `npm test`: dữ liệu hợp lệ, quyết định hợp lệ, replay theo seed, luật "1.000 quân không hạ được thành 10.000 quân", chạy trọn 60 ván.
- `npm run qa`: Puppeteer tương tác thật với trang: Phase 1 slice (`index.html`) rồi `tests/e2e/runtime-slice.mjs` (`game.html?demo=1`: focus châu/thành, mở ván, khách tới, một cửa căng, hai trận thắng/thua, về chiến dịch; ngân sách tam giác; ảnh `test-results/runtime-*.png`) rồi `tests/e2e/game-loop.mjs` (ảnh `test-results/game-*.png`). three.js được phục vụ từ `node_modules` thay vì CDN để QA không phụ thuộc mạng.
- `tests/game-controller.test.mjs`: vòng lượt với engine thật trong Node theo contract v1.1: `preparePlayerTurn` đúng một lần, sứ giả chấp nhận/từ chối trên cùng envelope, không ghi `state.playerFid`, bảo hộ khách từ `self.guestProtection`, thẻ châu từ `provinceIntel` (hiện tại / cũ / chưa rõ, lũy 0 ≠ ?), chữ chơi chỉ từ TurnObservation (không tên thật, không quân/thương vong địch, trận xa không hiện), tin công khai, demo vẫn RuntimeEvent.
- `tests/e2e/game-loop.mjs` (trong `npm run qa`): bấm thật trên `game.html`: chọn từng đế, 5 lượt với 5 hành động, spy `preparePlayerTurn` (một lần) / `resolvePrepared`, sứ giả tự từ chối, cảnh quan sát được diễn đúng một lần, nhật ký và tin chỉ từ observation, chủ đất = state, về chiến dịch, bỏ qua, tới hết ván, bộ nhớ GPU qua các lượt.
- `tests/runtime.test.mjs`: tên nhân vật, và kế hoạch cảnh của EventPresenter trên runtime giả (đích hành quân, `win`, không đọc `defender`, không đổi event, về chiến dịch).
- `.github/workflows/pages.yml`: `npm test` → server → QA trình duyệt → chỉ deploy `index.html`, `game.html`, `src/`, `data/`, `assets/` lên Pages (không đưa `docs/` lên).
