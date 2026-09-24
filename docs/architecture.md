# Kiến trúc

> **Vai trò:** bản đồ code: module nào làm gì, dữ liệu chảy thế nào, ranh giới nào không được phá.
> Cập nhật khi thêm hoặc xoá module. Lý do của từng lựa chọn nằm ở `decisions/`.

## Hiện tại

```text
data/world.json ─┐
data/personas/*  ├─► src/engine/engine.js ──► tests/engine.test.mjs, tests/sim.mjs
                 │        (thuần, tất định)  ──► server/server.js  POST /api/turn (agent MOCK)
                 │                           ──► [frontend mới — chờ duyệt design]
index.html ── Phase 1 slice cũ (three r146, tự chứa, không dùng engine)
docs/design/prototypes/ ── cảnh three.js để render ảnh duyệt design
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

## Dự kiến sau khi duyệt design

```text
index.html            nạp script cổ điển theo thứ tự, không bundler
src/engine/engine.js  (giữ nguyên)
src/world/            terrain.js, water.js, forest.js, cities.js, armies.js, fx.js, lens.js (DOF + xám ngoài tiêu điểm), camera.js (tour khóa theo điểm dừng)
src/ui/               hud.js, ranking.js, log.js, tags.js (nhãn nổi), controls.js
src/main.js           nạp data → tạo game → diễn lượt: decide từng phe (camera bay tới, "Đang nghĩ…", câu thoại) → resolveTurn → hoạt cảnh event → cập nhật bảng và nhật ký
```

Ranh giới:

- `src/world` và `src/ui` chỉ đọc `state` và event; không bao giờ tự sửa số liệu game.
- Engine không biết tới Three.js hay DOM.
- Hàm hoạt cảnh nhận một event và trả về Promise, để tốc độ (1×/2×/4×) và "Tự động" điều khiển được toàn bộ trình tự lượt.

## Test và CI

- `npm test`: dữ liệu hợp lệ, quyết định hợp lệ, replay theo seed, luật "1.000 quân không hạ được thành 10.000 quân", chạy trọn 60 ván.
- `npm run qa`: Puppeteer tương tác thật với trang (hiện là Phase 1 slice). three.js được phục vụ từ `node_modules` thay vì CDN để QA không phụ thuộc mạng.
- `.github/workflows/pages.yml`: `npm test` → server → QA trình duyệt → chỉ deploy `index.html`, `src/`, `data/`, `assets/` lên Pages (không đưa `docs/` lên).
