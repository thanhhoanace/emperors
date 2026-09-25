# Trạng thái dự án

> **Vai trò:** tài liệu sống duy nhất về *đang ở đâu và làm gì tiếp*.

**Cập nhật:** 2026-09-26 · nhánh `claude/gracious-pasteur-6s8fmk`

## Đang chờ

- **Claude — HUD:** nạp `src/engine/perception.js` sau `attach-219.js`. HUD đọc `projectPerception(game, playerFid)`, không đọc truth phe khác. Không sửa luật.
- **Grok A.5:** bốn máy statecraft — chưa. Deal đầy đủ — chưa.

## Round A (engine)

Node và server cùng compose: `engine.js` → `attach-219.js` → `perception.js`.

- Lịch: lượt 1 = Thu 219 (`startSeason`).
- Tấn công: `from` hợp lệ thì dùng, không thì `originFor`. `STRATAGEMS` đã export. Browser: `EmperorsAttach219`.
- Perception: một snapshot trước khi quyết định; `projectPerception` không mutate; không `seed`, không `bandValues` trong DecisionContext.
- `npm test`: 44 pass. `npm run sim -- 500`: Lý 36.0%, 3K không bắn đế yếu ẩn (0).

## Chặn còn

1. Ngoại giao deal đủ điều khoản — vòng riêng.
2. `game.html` chưa nạp `perception.js` — HUD vẫn truth cho đến vòng Claude.
