# Trạng thái dự án

> **Vai trò:** tài liệu sống duy nhất về *đang ở đâu và làm gì tiếp*.

**Cập nhật:** 2026-09-26 · nhánh `claude/gracious-pasteur-6s8fmk`

## Đang chờ

- **Claude — HUD perception:** xong, chờ chủ dự án chơi thử `game.html` (`npm start` → `/game.html`).
- **Grok A.5:** bốn máy statecraft — chưa. Deal đầy đủ — chưa.

## HUD perception (Claude, 2026-09-26)

`game.html` nạp `engine.js` → `attach-219.js` → `perception.js` (tự gắn vào `window.EmperorsEngine`, không `attach` lại) và `world.intelRules` trước `createGame`. AI mọi phe qua `fillDecisions` → DecisionContext.

- UI đọc `ctrl.view()`; phe khác chỉ từ `projectPerception(game, playerFid)`: `publicLabel` (+ `claimedIdentity` nếu có), còn/mất, số châu, band quân (Yếu/Vừa/Mạnh/Rất mạnh/Chưa rõ), lượt thấy cuối. Phe mình: số thật.
- Bỏ khỏi mô hình UI: xếp hạng `Engine.ranking` (quân/Uy thật, tên thật), ước lực đánh (`defenders`, `ratio`, `commit`), quân thật của đích mưu, tên persona của đế ẩn, `seatOf` đọc thủ phủ địch từ state.
- Bảng phe xếp theo số châu rồi thứ tự cố định. Người chơi chọn được nơi xuất quân (`from`) khi có nhiều châu kề đích.
- RuntimeEvent không lọc: phần diễn và nhật ký vẫn là sự thật spectator (tên thật trong lời event).

## Round A (engine)

Node và server cùng compose: `engine.js` → `attach-219.js` → `perception.js`.

- Lịch: lượt 1 = Thu 219 (`startSeason`).
- Tấn công: `from` hợp lệ thì dùng, không thì `originFor`. `STRATAGEMS` đã export. Browser: `EmperorsAttach219`.
- Perception: một snapshot trước khi quyết định; `projectPerception` không mutate; không `seed`, không `bandValues` trong DecisionContext.
- Prior `wu_jing_pressure`: neo thêm `jing` của Tào; `bias.attack` chỉ nhân điểm mục tiêu trong `focus`, một lần.
- Anti-cheat: counterfactual tests. Sim không còn metric “đế yếu ẩn”.

## Chặn còn

1. Ngoại giao deal đủ điều khoản — vòng riêng.
2. Màn kết thúc và nhật ký event hiện lời RuntimeEvent (tên thật) — đúng hợp đồng "RuntimeEvent = sự thật spectator"; nếu muốn giấu danh tính trong lời diễn thì cần quyết định luật riêng.
