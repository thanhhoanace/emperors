# Trạng thái dự án

> **Vai trò:** tài liệu sống duy nhất về *đang ở đâu và làm gì tiếp*.

**Cập nhật:** 2026-09-29 · hình vào game (cắt cảnh trận); trước đó audit research trên `9d30411`

## Đang chờ

- **Phase `v2-gameplay`:** tối 28/9 owner chốt lại input sau spike 2 (interview 5 vòng): chạm bản đồ 3D thật, quân/tướng/bộ-kỵ-thủy hiện trên map, thẻ chỉ cho người, trận theo lượt, tướng dự đoán trận, lát cắt Hoài Nam — [DECISION.md](phases/v2-gameplay/DECISION.md) mục Sửa 28/9 tối. **Demo 1 trên canvas** (một mùa ở Hoài Nam trên bản đồ 3D, điện thoại ngang): https://claude.ai/artifact/4BoowPeFYC9kTLVg7B35pf — vòng 2 (28/9 khuya) đã sửa theo 9 ý owner: tỉ lệ Civ, tượng lính theo binh chủng, chân dung, màn mục tiêu, tầm đi, địa thế. Nguồn, cách dựng lại gói và số đo ở `docs/phases/v2-gameplay/demo1/` và WORKING mục Demo 1. Vòng 3 (28/9 khuya, hình theo công thức Ryan Sael: mái cong, tường đất, lính và ngựa bo tròn, ống kính mô hình thu nhỏ) theo ý owner "khối vuông xấu quá mức"; ảnh trước/sau: https://claude.ai/artifact/Gb14MQqMnPu81bG8wMK6vu. Vòng 4 (28/9 khuya): owner gửi ảnh TW3K, hỏi three.js có khả thi; canvas thử hình Thọ Xuân bị vây (núi Bát Công, rừng thu, trận vây theo thế thật): https://claude.ai/artifact/NuafHe8Qa1qQq1HfJK1af7, nguồn `docs/design/prototypes/siege/`. Mô hình demo đã sửa về kiến trúc Đông Hán (quyết định 0006). Owner: trận vây đạt 75 % mức muốn; vòng 5 (28/9 khuya) làm đá và cây nhìn gần, dựng lại doanh trại theo lệ Hán (luỹ, hào, rào gỗ, bốn cổng, tháp canh, khu trung quân, lều, tàu ngựa, kho lương, giáo trường), cùng canvas, nguồn thêm `sg-camp.js`. **Tiếp:** owner xem vòng 5, chọn bước sau (lính có cử động, hay mức điện thoại), chốt hướng hình → Grok viết freeze v2. Review research dạng hình: https://claude.ai/artifact/KJAXDd1yodaWQWWo11xL16
- **Hình vào game (29/9):** cảnh trận vây đã duyệt chạy trong `game.html` như cắt cảnh khi quân tới thành (`src/world/battle-cut.js`), ba mức chất lượng dò theo GPU (`?tier=`, `?hud=1`); lính có cử động, cây đá gần, doanh trại. E2E `tests/e2e/battle-cut.mjs` 103/103, trong ngân sách 0005 ở cả ba mức. Số đo và nợ: [visual-build.md](design/visual-build.md). **Tiếp:** chủ dự án mở `game.html?hud=1` trên máy thật, báo fps.
- **Luật v2 (29/9, Claude, ASSIGN mục 1 → 3 → 4 → 2):** `attack` mang BattleDescriptor v2 (`0aef1b0`); trận theo lượt thuần `src/engine/battle.js` khớp spike demo 1 từng seed (`c8cafc9`); dự đoán của tướng `Battle.forecast` (`cf12192`); nháp [GAMEPLAY-FREEZE-v2.md](product/GAMEPLAY-FREEZE-v2.md); GPT đã phản biện 29/9 (`cacf406`, `_research/chatgpt.md` mục D): engine ổn nhưng thiếu interaction contract, chờ chủ dự án chốt 4 điểm trước khi promote SOT. Game 20 châu vẫn luật v1: `npm run sim` và `npm run play` in y như trước.
- **Giao việc luật v2:** [ASSIGN.md](phases/v2-gameplay/ASSIGN.md) — Claude mục 1–4 (hợp đồng trận, trận theo lượt, dự đoán, freeze v2 có GPT phản biện); mục 5 owner chốt GPT làm market/system audit + Grok làm community intelligence, synthesis bằng tool khác; Grok thoại và kịch bản; nội dung ở WORKING.md mục "Việc cho Grok": hợp đồng dữ liệu trận + `attack` v2 trước, rồi freeze v2, trận theo lượt thuần, dự đoán của tướng, các câu chưa chốt. Không dùng bản spike có lỗi dự báo/trạng thái để chốt cảm giác chơi. Các chặn V1 bên dưới vẫn theo phạm vi riêng.
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
