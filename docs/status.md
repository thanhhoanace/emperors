# Trạng thái dự án

> **Vai trò:** tài liệu sống duy nhất về *đang ở đâu và làm gì tiếp*.

**Cập nhật:** 2026-09-27 · nhánh `claude/gracious-pasteur-6s8fmk`

## Đang chờ

- **Chủ dự án — interview gameplay (vòng 9):** trả lời 16 câu trong `docs/research/gameplay-interview-2026-09-27.md` (Q0–Q15). Câu trả lời quyết hướng cả hai lane; chưa có thì chưa nên làm A.5 hay đổi luật.
- **Claude — HUD v1.1 + bàn cờ:** xong, chờ chủ dự án chơi thử `game.html` (`npm start` → `/game.html`; smoke `tests/e2e/playable-smoke.mjs`, ảnh `test-results/smoke-*.png`).
- **Grok A.5:** bốn máy statecraft — chưa. Officers — chưa. LLM adapter remap id — chưa. `projectPerception` thô không phải payload LLM.

## Vòng 9 — research gameplay / game feel (Claude, 2026-09-27)

`docs/research/gameplay-interview-2026-09-27.md`. Đo bằng `node tests/sim.mjs 300` và `tests/playthrough.mjs` mới (`npm run play -- 30 reasonable|turtle|hothead`: chơi N seed mỗi đế qua đúng vòng lượt của `game.html`, in ra thứ người chơi sống qua).

- 88 test xanh. AI-only 300 ván: Lý 29 % · Tào 25 % · Lưu Bị 20 % · Tôn 8 % · Chu 7 % · Tần 6 % · Vũ 4 %; 65 % ván kết thúc "xưng bá" ở lượt 48.
- Người chơi hợp lý: thắng 0–3 %, chết trung bình lượt 12–26; rùa thì sống nhưng hạng 4–5; đánh liên tục chết trước lượt 20.
- Bản đồ đổi chủ 1,6–2,0 châu mỗi lượt; Hứa Xương 7–17 lần một ván. Đánh châu band "yếu" thua 25–40 %.
- Vũ Đế ở Hà Tây chỉ kề một châu (Lũng Tây). 7/9 cửa kịch bản không tới người chơi. `governors` không đổi khi châu đổi chủ. `succession` / `realm_fall` chưa có code bắn.
- Việc làm được ngay không cần chờ trả lời: mục 8 của bản research (Grok: chặn 1–3 + `governors`; Claude: điều kiện thắng, cảnh báo phá ước, delta số, chạy lại `game-loop.mjs`).

## Contract v1.1 (Grok, 2026-09-26)

`docs/product/GAMEPLAY-CONTRACT-v1.1.md`.

- `provinceIntel` theo châu: own / adjacent / memory / unknown. Không số quân ẩn.
- `projectTurnObservation` → `visibleEvents` + `publicNews`. Không copy `ev.text`. Spectator vẫn dùng RuntimeEvent.
- Đình chiến khách là luật referee: legal, AI, từ chối combat. `guestProtectionStatus`. Phá ước theo từng phe Tam Quốc khi đế có cú đánh hợp lệ.
- Pact tới người chơi là reaction. Accept = 6 mùa. `world.pacts` công khai. `diplomaticPressure` suy từ khối + biên + grudge.

## HUD contract v1.1 (Claude, 2026-09-26)

- Lượt người chơi: `ctrl.prepare` → `Engine.preparePlayerTurn` **một lần** (envelope trong `ctrl.pendingTurn`, không ghi `game.state`) → thẻ sứ giả cho từng `pendingReactions` (CHẤP NHẬN / TỪ CHỐI, không tốn lệnh) → `answerReaction` cùng envelope → `resolvePrepared` → `projectTurnObservation` → `GameController.presentationOf`.
- Người chơi chỉ thấy observation: cảnh kết quả lệnh mình + tối đa một phản ứng nhắm vào mình, còn lại vào nhật ký; một thẻ "Thiên hạ" từ `publicNews` (trống → "Không có tin đáng tin mới."). Câu chữ từ `textKey` + nhãn; không `ev.text`, không đếm việc giấu. `entry.events` giữ để replay/debug. `?demo=1` vẫn diễn RuntimeEvent.
- Thẻ đánh theo `provinceIntel` (band châu, tướng giữ thành hoặc "?", lũy hoặc "?", tin hiện tại / cũ lượt N / chưa có). Đích từ `legal.attackTargets`. Bảo hộ khách từ `self.guestProtection`. Minh ước từ `world.pacts`. Áp lực biên giới từ `diplomaticPressure`. Sửa lỗi nhãn chiêu hàng (`ownerLabel`). Giải thích Quân/Lương/Dân tâm/Uy khi rê chuột (luật hiện tại, không A.5).
- Bàn cờ: màu chủ đậm hơn ở view chiến dịch, biên hai phe có quầng tối + vệt màu phía trong, đường châu cùng chủ mờ đi; chọn Tấn công thì đích hợp lệ gạch chéo trên đất + nhãn thành viền đỏ.

## HUD perception (Claude, 2026-09-26)

`game.html` nạp `engine.js` → `attach-219.js` → `perception.js` (tự gắn vào `window.EmperorsEngine`, không `attach` lại) và `world.intelRules` trước `createGame`. AI mọi phe qua `fillDecisions` → DecisionContext.

- UI đọc `ctrl.view()`; phe khác chỉ từ `projectPerception(game, playerFid)`: `publicLabel` (+ `claimedIdentity` nếu có), còn/mất, số châu, band quân (Yếu/Vừa/Mạnh/Rất mạnh/Chưa rõ), lượt thấy cuối. Phe mình: số thật.
- Bỏ khỏi mô hình UI: xếp hạng `Engine.ranking` (quân/Uy thật, tên thật), ước lực đánh (`defenders`, `ratio`, `commit`), quân thật của đích mưu, tên persona của đế ẩn, `seatOf` đọc thủ phủ địch từ state.
- Bảng phe xếp theo số châu rồi thứ tự cố định. Người chơi chọn được nơi xuất quân (`from`) khi có nhiều châu kề đích.
- (Đã thay bởi contract v1.1 ở trên: phần diễn và nhật ký của người chơi giờ chỉ từ TurnObservation; RuntimeEvent thô chỉ còn ở `?demo=1`.)

## Round A (engine)

Node và server cùng compose: `engine.js` → `attach-219.js` → `perception.js`.

- Lịch: lượt 1 = Thu 219 (`startSeason`).
- Tấn công: `from` hợp lệ thì dùng, không thì `originFor`. `STRATAGEMS` đã export. Browser: `EmperorsAttach219`.
- Perception: một snapshot trước khi quyết định; `projectPerception` không mutate; không `seed`, không `bandValues` trong DecisionContext.
- Prior `wu_jing_pressure`: neo thêm `jing` của Tào; `bias.attack` chỉ nhân điểm mục tiêu trong `focus`, một lần.
- Anti-cheat: counterfactual tests. Sim không còn metric “đế yếu ẩn”.

## Chặn còn

1. Observation `own_event` / `target_event` không có `code` (lương cạn, dời thủ phủ, hủy binh vì minh, bội minh, đường tiến quân bị cắt, đón Hiến Đế) → UI chỉ viết "Biến cố ở …" / "Biến cố trong nước.". Tối thiểu: engine gắn `code` cho các event này và observation giữ `code`.
2. Event `stratagem` không mang `sub` → kế của mình lấy từ chính lệnh mình; kế địch nhắm vào ta chỉ ghi "dùng kế với ta". Tối thiểu: `resolveStratagem` đặt `sub`, `normalizeEvent` chép `sub`.
3. `observePact` bỏ `code` → sứ giả bị từ chối vì đủ minh (`pact_full`) hiện giống bị ta từ chối ("Minh ước … đề nghị không thành."). Tối thiểu: giữ `code` trong visible pact.
4. `tests/e2e/game-loop.mjs` đã đổi sang observation (spy `preparePlayerTurn`, tự từ chối sứ giả) nhưng chưa chạy lại đủ (vòng này chỉ smoke).
5. A.5 / Officers chưa. Context nội bộ còn id đế ẩn — không gửi LLM cho đến khi có lớp remap.
