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
game.html ── thế giới 219 diễn RuntimeEvent v1:  Engine → RuntimeEvent v1 → EventPresenter → WorldRuntime (+ HUD)
             mặc định: fixture chuẩn (data/scenario/runtime-events.v1.json + guest_arrival dựng từ gates.json đúng dạng engine);
             ?live=1: một lượt POST /api/turn; ?qa=1: không tự chạy, QA gọi window.__game.seek(i, t)
src/world/ ── thư viện hình dùng chung (một bản duy nhất; prototype cũng nạp từ đây):
             kit.js (lens, setup) · terrain.js + terrain-real.js (đất, sông, biên châu, đường) · hancity.js + city.js (thành Đông Hán)
             flora.js (cây, làng, trường thành, cầu, mây) · world-runtime.js · event-presenter.js · hud.js · names.js
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

Còn lại: nướng mặt nạ lõi (bớt ~16 giây `createReal` lúc mở trang), cảnh cắt trận (battle.js), tour khóa theo điểm dừng, 3 mức chất lượng, thay `index.html` bằng `game.html`.

Hiệu năng: mọi thứ trong `src/world` phải nằm trong ngân sách của `decisions/0005`. `tests/e2e/runtime-slice.mjs` đo tam giác từng khung; ảnh duyệt design vẫn đo bằng `render.mjs`.

Ranh giới:

- `src/world` chỉ đọc `state` và event; không bao giờ tự sửa số liệu game.
- Engine không biết tới Three.js hay DOM.
- Hàm hoạt cảnh nhận một event và trả về Promise, để tốc độ (1×/2×/4×) và "Tự động" điều khiển được toàn bộ trình tự lượt.

## Test và CI

- `npm test`: dữ liệu hợp lệ, quyết định hợp lệ, replay theo seed, luật "1.000 quân không hạ được thành 10.000 quân", chạy trọn 60 ván.
- `npm run qa`: Puppeteer tương tác thật với trang: Phase 1 slice (`index.html`) rồi `tests/e2e/runtime-slice.mjs` (`game.html`: focus châu/thành, mở ván, khách tới, một cửa căng, hai trận thắng/thua, về chiến dịch; ngân sách tam giác; ảnh `test-results/runtime-*.png`). three.js được phục vụ từ `node_modules` thay vì CDN để QA không phụ thuộc mạng.
- `tests/runtime.test.mjs`: tên nhân vật, và kế hoạch cảnh của EventPresenter trên runtime giả (đích hành quân, `win`, không đọc `defender`, không đổi event, về chiến dịch).
- `.github/workflows/pages.yml`: `npm test` → server → QA trình duyệt → chỉ deploy `index.html`, `game.html`, `src/`, `data/`, `assets/` lên Pages (không đưa `docs/` lên).
