# Phân vai agent

Hai luồng song song trên nhánh `claude/gracious-pasteur-6s8fmk`. Không sửa file của luồng kia.
Gameplay đã khóa: `docs/product/GAMEPLAY-FREEZE.md`.

## Cô lập — đọc gì

| Agent | Được đọc để làm việc | Không được dùng làm input |
| --- | --- | --- |
| Claude | freeze (mục WAR + RuntimeEvent), `march.md`, `runtime-event.md`, `cities.json`, DEM | `decide` nội bộ, `intel-rules`, doctrine, persona phe khác, prior Lý/Chu |
| Grok | freeze cả file, `data/scenario/**`, `src/engine/**`, personas để viết thoại | `src/world/**`, bake, `hancity.js` |
| Codex | freeze + diff để review | Tự nhét statecraft vào HUD / mesh |

Trong *game*: mỗi `decide(fid)` chỉ thấy DecisionContext của đúng phe. Không load kịch bản / persona / doctrine phe khác.

## Claude — hình

Được sửa: `src/world/**`, `game.html`, test runtime/e2e, `docs/design/**`, `assets/map/**`, `tools/bake-map.mjs`, `data/cities.json`, `lonlat` trong `world.json`, ADR 0004–0006.

Cấm: `src/engine/**`, `tests/engine.test.mjs`, `tests/sim.mjs`, `docs/product/scenario.md`, `GAMEPLAY-FREEZE.md` (trừ khi chủ dự án bảo dẫn link), `diplomacy.md`, `rules.md`, `data/scenario/**`, `data/personas/**`.

## Grok — luật

Được sửa: freeze, scenario, diplomacy, march, rules, `data/scenario/**`, `src/engine/**`, test engine/sim, personas, ADR 0007+.

Cấm: `src/world/**`, `game.html`, bake, `assets/map`, `data/cities.json`.

Round A và A.5 là hai patch riêng. Không trộn Perception với statecraft.
