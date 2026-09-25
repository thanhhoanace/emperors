# AGENTS.md — Tam Quốc Loạn Nhập

> Nguồn sự thật cho mọi agent. Codex đọc file này trực tiếp; Claude Code đọc qua `CLAUDE.md` (file đó chỉ `@import` file này).
> Giữ ngắn: chỉ ghi điều một đồng đội mới cần biết ngay. Chi tiết nằm trong `docs/`: dẫn link, không chép lại.

## Dự án

Mô phỏng theo lượt: 4 hoàng đế xuyên không tranh thiên hạ với Tào Tháo, Lưu Bị, Tôn Quyền. **Kịch bản khóa: thu 219** (`docs/product/scenario.md`, ADR 0007). Engine đang chạy snapshot **thu 219**, 20 châu (`data/world.json`). Archive 200: `data/archive/world-200.json`.
Trọng tâm là **xem và quay clip**: mỗi lượt kể rõ ai làm gì, trong thế giới 3D Three.js. Chạy trên trình duyệt (GitHub Pages). Server Node chỉ để local và cắm LLM sau này.

## Phân vai — đọc trước khi sửa file

Chi tiết: `docs/product/lanes.md`. Không sửa file của luồng kia.

| Luồng | Được sửa | Cấm |
| --- | --- | --- |
| **Claude — hình** | `docs/design/**`, `assets/map/**`, `tools/bake-map.mjs`, `data/cities.json`, `lonlat` trong `world.json`, ADR 0004–0006, phần hình `proposal-all-china.md` | `src/engine/**`, `tests/engine.test.mjs`, `tests/sim.mjs`, `scenario.md`, `diplomacy.md`, `rules.md`, `data/scenario/**`, `data/personas/**` |
| **Grok — luật** | `scenario.md`, `diplomacy.md`, `march.md`, `rules.md`, `data/scenario/**`, `src/engine/**`, test engine/sim, `data/personas/**`, ADR 0007+ | prototype three.js, `hancity.js`, `bake-map.mjs`, `assets/map`, `data/cities.json` |

`docs/status.md`: mỗi bên chỉ sửa mục của mình. `data/world.json` khi đổi owner/start là việc Grok; Claude chỉ đụng `lonlat`.

## Một sự thật, một chỗ

| Câu hỏi | Nguồn duy nhất |
| --- | --- |
| Game kể chuyện gì, UI phải có gì | `docs/product/brief.md` |
| Kịch bản khóa 219 | `docs/product/scenario.md` |
| Menu ngoại giao | `docs/product/diplomacy.md` |
| Hành quân | `docs/product/march.md` |
| Phân vai | `docs/product/lanes.md` |
| Cơ chế đang chạy | `docs/product/rules.md` → `src/engine/engine.js` |
| Số đang chạy (20 châu, thu 219) | `data/world.json` |
| Cửa / tướng | `data/scenario/gates.json`, `data/scenario/characters.json` |
| RuntimeEvent v1 | `docs/product/runtime-event.md` + `data/scenario/runtime-events.v1.json` |
| Thành | `data/cities.json` |
| Địa hình | `tools/bake-map.mjs` → `assets/map/` |
| Giọng | `data/personas/<id>.json` |
| Visual | `docs/design/direction.md` |
| Kiến trúc | `docs/architecture.md` |
| Đang ở đâu | `docs/status.md` |

Tài liệu không chép con số từ `data/`.

## Cấu trúc

```text
index.html               entry GitHub Pages
src/engine/engine.js     luật thuần, tất định theo seed
data/                    world.json + cities.json + personas/ + scenario/
tools/bake-map.mjs       nướng địa hình → assets/map/
server/server.js         static + POST /api/turn
tests/                   engine.test.mjs, events.test.mjs, sim.mjs, map.test.mjs
docs/                    product/, design/, research/, architecture.md, status.md
```

## Lệnh

```bash
PUPPETEER_SKIP_DOWNLOAD=1 npm ci
npm test
npm run sim -- 500
npm start
```

## Quy tắc

- Engine thuần: không DOM, không Math.random; ngẫu nhiên qua state.seed.
- Đổi luật thì sửa engine, test và rules.md cùng commit.
- Docs và UI: tiếng Việt. Code: tiếng Anh.
- Cuối phiên cập nhật docs/status.md.

## Workflow

- `.claude/skills/verify/SKILL.md`
- `.claude/skills/handoff/SKILL.md`
