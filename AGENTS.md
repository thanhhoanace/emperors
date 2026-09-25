# AGENTS.md — Tam Quốc Loạn Nhập

> Nguồn sự thật cho mọi agent. Codex đọc file này trực tiếp; Claude Code đọc qua `CLAUDE.md` (file đó chỉ `@import` file này).
> Giữ ngắn: chỉ ghi điều một đồng đội mới cần biết ngay. Chi tiết nằm trong `docs/`: dẫn link, không chép lại.

## Dự án

Mô phỏng theo lượt: 4 hoàng đế xuyên không tranh thiên hạ với Tào Tháo, Lưu Bị, Tôn Quyền. **Kịch bản khóa: thu 219** (`docs/product/scenario.md`, ADR 0007). Engine đang chạy vẫn là snapshot năm 200 trong `data/world.json` cho đến khi nhập 219.
Trọng tâm là **xem và quay clip**: mỗi lượt kể rõ ai làm gì, trong thế giới 3D Three.js. Chạy trên trình duyệt (GitHub Pages). Server Node chỉ để local và cắm LLM sau này.

## Phân vai — đọc trước khi sửa file

Chi tiết: `docs/product/lanes.md`. Không sửa file của luồng kia.

| Luồng | Được sửa | Cấm |
| --- | --- | --- |
| **Claude — hình** | `docs/design/**`, `assets/map/**`, `tools/bake-map.mjs`, `data/cities.json`, `lonlat` trong `world.json`, ADR 0004–0006, phần hình `proposal-all-china.md` | `src/engine/**`, `tests/engine.test.mjs`, `tests/sim.mjs`, `scenario.md`, `diplomacy.md`, `rules.md`, `data/scenario/**`, `data/personas/**` |
| **Grok — luật** | `scenario.md`, `diplomacy.md`, `march.md`, `rules.md`, `data/scenario/**`, `src/engine/**`, test engine/sim, `data/personas/**`, ADR 0007+ | prototype three.js, `hancity.js`, `bake-map.mjs`, `assets/map`, `data/cities.json` |

`docs/status.md`: mỗi bên chỉ sửa mục của mình. `data/world.json` khi đổi owner/start (nhập engine) là việc Grok; Claude chỉ đụng `lonlat`. Báo trước nếu cả hai sắp sửa file đó.

## Một sự thật, một chỗ

| Câu hỏi | Nguồn duy nhất |
| --- | --- |
| Game kể chuyện gì, UI phải có gì | `docs/product/brief.md` |
| Kịch bản khóa 219 (chỗ ngồi, cửa, cải cách) | `docs/product/scenario.md` |
| Menu ngoại giao | `docs/product/diplomacy.md` |
| Hành quân (phần nhìn) | `docs/product/march.md` |
| Phân vai agent | `docs/product/lanes.md` (và mục trên) |
| Cơ chế đang chạy trong code | `docs/product/rules.md` → `src/engine/engine.js` |
| Số đang chạy (14 châu, năm 200) | `data/world.json` |
| Số kịch bản 219 (engine chưa đọc) | `data/scenario/219.json` + bảng trong `scenario.md` |
| Thành (hình, khảo cổ) | `data/cities.json`; nguồn: `docs/design/history.md` |
| Địa hình, sông, hồ | `tools/bake-map.mjs` → `assets/map/` |
| Giọng nhân vật | `data/personas/<id>.json` |
| Hướng visual | `docs/design/direction.md` |
| Map toàn quốc (phần hình chờ chốt) | `docs/product/proposal-all-china.md` mục 3, 8, 9, 11 |
| Kiến trúc code | `docs/architecture.md` |
| Vì sao | `docs/decisions/NNNN-*.md` |
| Đang ở đâu | `docs/status.md` |
| Giấy phép asset | `assets/SOURCE.md` |

Tài liệu không chép con số từ `data/`. Đổi số đang chạy thì sửa `data/world.json`. Đổi số 219 thì sửa `data/scenario/` + `scenario.md`.

## Cấu trúc

```text
index.html               entry GitHub Pages (Phase 1 slice cũ)
src/engine/engine.js     luật thuần, tất định theo seed
data/                    world.json + cities.json + personas/ + scenario/
tools/bake-map.mjs       nướng địa hình → assets/map/
server/server.js         static + POST /api/turn
tests/                   engine.test.mjs, sim.mjs, e2e/
docs/                    product/ (kể cả lanes.md), design/, research/, architecture.md, status.md, decisions/
assets/                  map/ + asset CC0
.claude/                 skills Claude Code
.github/workflows/       test + deploy Pages
```

## Lệnh

```bash
PUPPETEER_SKIP_DOWNLOAD=1 npm ci
npm test
npm run sim -- 500
npm start                          # http://localhost:3000
npm run qa
node docs/design/prototypes/render.mjs world campaign
node tools/bake-map.mjs
```

Trong container không có GPU: đặt `PUPPETEER_EXECUTABLE_PATH` tới Chromium; WebGL chạy SwiftShader.

## Quy tắc

- **Tự kiểm tra trước khi báo xong.** `npm test`. Đụng frontend thì `npm run qa` và xem ảnh. `.claude/skills/verify/SKILL.md`.
- Engine thuần: không DOM, không `Math.random`; ngẫu nhiên qua `state.seed`. Đổi luật thì sửa engine, test và `docs/product/rules.md` cùng commit.
- Frontend tĩnh, không bundler: three.js r146 global qua CDN (`decisions/0002`).
- Thế giới 3D trong ngân sách `decisions/0005`. Đo bằng `render.mjs`.
- Visual theo `docs/design/direction.md`. Đổi hướng thì dựng phương án duyệt trước, ghi ADR.
- Không dùng asset trích từ game thương mại. Asset mới ghi `assets/SOURCE.md`.
- Không commit `.omc/`, `.omx/`, `.codex/`, `.claude/settings.local.json`.
- Docs và UI: tiếng Việt. Code, identifier, commit message: tiếng Anh.
- Cuối phiên cập nhật `docs/status.md`.

## Bài học

- Mở app qua `http://localhost:3000`, không `file://`.
- three r146: `THREE.ColorManagement.legacyMode = false`.
- Mái nhà: xoay geometry trước rồi mới scale.
- Không để `scene.environment` chiếu sáng toàn cảnh khi đã có đèn. Chỉ gắn envMap cho nước.
- Không đặt biến top-level `top`, `name`, `parent` trong script cổ điển.
- Cây không to hơn thành; không khối chữ nhật placeholder; núi thành dãy; màu không bạc.
- Cân bằng đo bằng `npm run sim`, không đoán.
- Không tilt-shift kiểu mô hình thu nhỏ. Chỉ mờ chiều sâu và sương xa.
- Thành xa phải LOD. 14 thành full làm WebGL mềm sập.
- Thành ~20 đơn vị; sông cách tâm thành ≥ 12 đơn vị.
- InstancedMesh: chia ô, bật lại `frustumCulled`.
- Hoa văn shader phải mờ theo `fwidth`. Không z-fighting tán rừng / đất.
- Đường đi: `Float64Array`, không `Float32Array`.
- Kiến trúc Đông Hán: tường đất nện, cổng đỉnh bằng, mái thẳng. Không mái vênh / ủng thành Minh–Thanh (trừ cải cách tầng 3 của Chu, khi có ADR).
- Nắn sông theo pháp tuyến, không theo bán kính.
- Sông nội địa là dải nước riêng, nâng trên lưới thô khi nhìn xa.
- Toạ độ thành = tâm di chỉ thời Hán, không phải tâm đô thị nay.
- DEM: lượng tử + delta 2 chiều + gzip.

## Workflow

- `.claude/skills/verify/SKILL.md`
- `.claude/skills/handoff/SKILL.md`
