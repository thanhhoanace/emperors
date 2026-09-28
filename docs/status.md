# Trạng thái dự án

> **Vai trò:** tài liệu sống duy nhất về *đang ở đâu và làm gì tiếp*.

**Cập nhật:** 2026-09-28 · nhánh `claude/gracious-pasteur-6s8fmk`

## Đang chờ

- **Phase `v2-gameplay`:** `docs/phases/v2-gameplay/DECISION.md` chốt 28/9: v2 là ván tranh bá ngắn vào là chơi, nét riêng là quẹt thẻ có / không, mở ván từ thành trong một châu rồi scale lên 20 châu, số thay chữ, không khoá số lượt, thước đo là ngưỡng hành vi. **Tiếp:** Claude làm spike 2 (trang HTML trong repo, quẹt được trên điện thoại) → chủ dự án chơi → Grok viết `GAMEPLAY-FREEZE.md` v2 từ DECISION + spike 2 → code. Phần chưa chốt (việc trong châu, liên minh, vùng rìa, cách scale) ghi ở DECISION mục Preserve / Defer; không tự quyết trong lúc code.
- **Grok:** chờ spike 2 rồi viết freeze v2. Việc nhỏ làm được ngay: chặn 1–3 dưới, `governors` đổi theo chủ châu.
- LLM adapter remap id: sau khi luật v2 ổn.

## Vòng 9 (Claude, 27–28/9)

- Research gameplay, interview 25 câu, phân tích thị trường "vào là chơi hay chiến dịch": gom vào `docs/phases/v2-gameplay/_research/claude.md`; trạng thái chung ở `WORKING.md` cùng thư mục. Quy trình phase: `AGENTS.md`, mục "Research và quyết định lớn".
- Công cụ đo mới: `tests/playthrough.mjs` (`npm run play -- 30 reasonable|turtle|hothead`) chơi qua đúng vòng lượt của `game.html`. Số đo 27/9: người chơi hợp lý thắng 0–3 %, chết trung bình lượt 12–26; bản đồ đổi chủ 1,6–2,0 châu mỗi lượt. AI-only 300 ván: Lý 29 % · Tào 25 % · Lưu Bị 20 % · Tôn 8 % · Chu 7 % · Tần 6 % · Vũ 4 %. 88 test xanh.
- Đã làm: `index.html` chuyển hướng sang `game.html`; clip cũ thành `phase1.html` (QA và workflow Pages trỏ theo).

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
