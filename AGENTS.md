# AGENTS.md — Tam Quốc Loạn Nhập

> Nguồn sự thật cho mọi agent. Codex đọc file này trực tiếp; Claude Code đọc qua `CLAUDE.md`.
> Gameplay đã khóa: `docs/product/GAMEPLAY-FREEZE.md`. Thảo luận cũ không thắng freeze.

## Dự án

Mô phỏng theo lượt: 4 hoàng đế xuyên không tranh thiên hạ với Tào Tháo, Lưu Bị, Tôn Quyền. **Kịch bản khóa: thu 219**. Engine: 20 châu, `data/world.json`.
Trọng tâm: xem và quay clip Three.js. GitHub Pages.

## Phân vai

Chi tiết + cô lập kiến thức: `docs/product/lanes.md`.

| Luồng | Được sửa | Cấm |
| --- | --- | --- |
| **Claude — hình** | `src/world/**`, `game.html`, design, bake, `cities.json`, `lonlat` | `src/engine/**`, scenario, freeze nội dung máy, `data/scenario/**`, personas |
| **Grok — luật** | freeze, scenario, rules, `data/scenario/**`, `src/engine/**`, test engine/sim, personas | `src/world/**`, bake, `cities.json` |

`decide(fid)` trong engine chỉ nhận DecisionContext của đúng phe. Không đọc doctrine / persona / prior phe khác.

## Một sự thật, một chỗ

| Câu hỏi | Nguồn |
| --- | --- |
| Gameplay đã khóa | `docs/product/GAMEPLAY-FREEZE.md` |
| Kịch bản 219 | `docs/product/scenario.md` |
| RuntimeEvent | `docs/product/runtime-event.md` |
| Phân vai / cô lập | `docs/product/lanes.md` |
| Số đang chạy | `data/world.json` |
| Đang ở đâu | `docs/status.md` |

## Lệnh

```bash
PUPPETEER_SKIP_DOWNLOAD=1 npm ci
npm test
npm run sim -- 500
npm start
```

Engine thuần: không DOM, không Math.random. Đổi luật: engine + test + rules cùng commit.
