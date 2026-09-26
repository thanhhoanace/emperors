# Trạng thái dự án

> **Vai trò:** tài liệu sống duy nhất về *đang ở đâu và làm gì tiếp*.

**Cập nhật:** 2026-09-26 · nhánh `claude/gracious-pasteur-6s8fmk`

## Đang chờ

- **Claude — playability:** wire tiếp observation (`projectTurnObservation`), bỏ ratio/quân/win% nếu còn, `?` / stale / band theo `provinceIntel`. Không vẽ countdown đình chiến khách từ intro — đọc `guestProtectionStatus` (engine đã enforce).
- **Claude — diplomacy UI:** đặt `state.playerFid`, rồi `pendingReactions` + `answerReaction` trước `resolveTurn`. Khi `playerFid` đã đặt, `resolveTurn` trả `blocked: true` nếu chưa trả lời. Đừng đặt `playerFid` trước khi có modal — lượt sẽ đứng. Chưa đặt thì pact nhằm người chơi vẫn roll cũ.
- **Claude — bàn cờ:** tint / biên khối / frontier. Chưa làm.
- **Grok A.5:** bốn máy statecraft — chưa. Officers — chưa.

## Contract v1.1 (Grok, 2026-09-26)

`docs/product/GAMEPLAY-CONTRACT-v1.1.md`.

- `provinceIntel` theo châu: own / adjacent / memory / unknown. Không số quân ẩn.
- `projectTurnObservation` → `visibleEvents` + `publicNews`. Không copy `ev.text`. Spectator vẫn dùng RuntimeEvent.
- Đình chiến khách là luật referee: legal, AI, từ chối combat. `guestProtectionStatus`. Phá ước theo từng phe Tam Quốc khi đế có cú đánh hợp lệ.
- Pact tới người chơi là reaction. Accept = 6 mùa. `world.pacts` công khai. `diplomaticPressure` suy từ khối + biên + grudge.

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

1. HUD chưa vẽ observation / accept-reject / guest status / province card. Chưa đặt `state.playerFid` nên game.html chưa chặn pact; khi Claude đặt cờ mà chưa có modal, `resolveTurn` đứng lượt.
2. Menu đánh của HUD vẫn có thể đi từ frontier, không từ `legal.attackTargets`. Referee từ chối đánh trái đình chiến khách; UI có thể vẫn hiện mục tiêu đó cho đến khi Claude đọc legal.
3. A.5 / Officers chưa.
