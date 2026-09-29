# V2 Gameplay — Giao việc

> Chủ dự án giao, 28/9 khuya. File này chỉ nói **ai làm gì**; nội dung từng việc ở `WORKING.md` mục "Việc cho Grok" (tên mục giữ nguyên để link cũ không gãy).
> Ngoại lệ lane: mục 1–4 là luật (`src/engine/**`, freeze, `runtime-event.md`) nhưng chủ dự án giao cho Claude; `docs/product/lanes.md` vẫn đúng cho mọi việc khác. Grok không sửa `src/engine/**` song song với Claude trong lúc mục 1–4 chưa xong.

| Mục | Giao cho | Vì sao | Trạng thái |
| --- | --- | --- | --- |
| 1. Hợp đồng dữ liệu trận, `attack` v2 | Claude | Việc nhỏ, thuần kỹ thuật, và Claude là bên đang cần nó để nối cắt cảnh. Giao người khác chỉ thêm một vòng chờ. | xong 29/9 (`0aef1b0`): `battle` v2 trên mọi `attack`, làm mờ ±20 % cho bên kia, cắt cảnh dùng; sim và play không đổi một dòng |
| 2. Freeze v2 | Claude viết, GPT đọc phản biện | Freeze là tổng hợp từ DECISION + spike, cần nhất quán với engine và test. GPT đọc chéo để bắt chỗ "chặt chẽ nhưng không vui", như đã từng phản đối đúng một kết luận của Claude. | GPT phản biện xong 29/9 (`cacf406`), `_research/chatgpt.md` mục D: engine ổn nhưng thiếu interaction contract; chưa promote SOT. owner đã chốt đủ 29/9: Core / Demo / Open; battle default + optional override; entity orders optional; city UI 2–3 việc theo context + “thêm”. Claude sửa theo change request 29/9 (Lõi / Demo / Mở, quyết định vào DECISION.md Sửa 29/9); **chủ dự án khóa 29/9**: `GAMEPLAY-FREEZE.md` là v2, v1 thành `GAMEPLAY-FREEZE-v1.md` |
| 3. Trận theo lượt, API thuần | Claude | Có sẵn spike `demo1/src/hn-rules.js` làm mẫu, có `npm run play` và `npm run sim` để cân bằng. | xong 29/9 (`c8cafc9`): `src/engine/battle.js`, khớp spike từng seed; chưa nối vào lượt v1 (freeze v2 quyết); `npm run sim -- 500 --battles` |
| 4. Dự đoán của tướng | Claude | Cùng lý do mục 3; công thức sai số theo Mưu đã có trong spike. | xong 29/9 (`cf12192`): `Battle.forecast`, không lộ tỉ lệ thật; lệch trung bình Mưu 7 là 0,07 như demo |
| 5. Các câu chưa chốt, cách scale lên 20 châu | GPT + Grok, research tách; synthesis bằng tool khác | Owner chốt 29/9: GPT làm market/system audit, Grok làm community intelligence; giữ hai nguồn độc lập rồi synthesis sau. Bản yêu cầu trong `WORKING.md` viết để chat mới đọc được. | tạm dừng; đã chốt cách chia việc, chưa bắt đầu research mục 5 |
| Thoại, personas, kịch bản | Grok | Grok đã làm từ đầu, giọng nhất quán. | tạm dừng, chờ chủ dự án |

## Cách giao

- **Claude (mục 1–4):** nói "làm mục N trong `docs/phases/v2-gameplay/ASSIGN.md`". Làm theo thứ tự 1 → 3 → 4 → 2 (freeze viết sau khi engine và test đã chạy, để freeze tả đúng cái có thật). Mỗi mục: engine + test + `rules.md` cùng commit, `npm test` và `npm run sim -- 500` xanh.
- **GPT (đọc phản biện mục 2):** dán `DECISION.md`, freeze v2 nháp, và câu hỏi: "Chỗ nào chặt chẽ nhưng không vui? Chỗ nào người chơi phải nghĩ nhiều hơn một lần quẹt/chạm?" Dán nguyên văn trả lời vào `_research/chatgpt.md` (ghi ngày và câu hỏi ở đầu, luật 9 `AGENTS.md`).
- **Grok hoặc GPT (mục 5):** mở chat mới, dán mục 5 của `WORKING.md` "Việc cho Grok" cộng `DECISION.md` mục "Chưa chốt". Kết quả vào `_research/grok.md` hoặc `_research/chatgpt.md` (một file mỗi tool, ghi đè). Synthesis vào `WORKING.md` do tool khác làm (luật 3–4).
- **Grok (thoại, personas, kịch bản):** như cũ, `data/personas/**`, `data/scenario/**`, `docs/product/scenario.md`.

**Chủ dự án, 28/9 khuya:** Claude làm mục 1 → 3 → 4 → 2 sau khi xong phần hình đang chạy (`docs/design/visual-build.md`); phần GPT (phản biện mục 2) và Grok (mục 5, thoại) tạm dừng, chủ dự án sẽ cho làm sau.

Cập nhật cột "Trạng thái" khi bắt đầu / xong (ghi commit).


## Change request cho Claude — sửa Freeze v2 sau GPT review (29/9) — đã làm 29/9

**Không mở lại research. Không đổi battle engine nếu không cần.** Sửa `docs/product/GAMEPLAY-FREEZE-v2.md` theo các quyết định owner đã chốt:

1. **Tách file thành ba tầng rõ**
   - **Core Rules:** behavior/DNA chung của V2.
   - **Demo Hoài Nam Rules:** các con số và rule cụ thể của vertical slice 5 thành.
   - **Open — scale lên 20 châu:** mọi phần chưa khóa; không được viết như Core.
   - Các exact tuning như 108/135/180 km, grid 3×6, loyalty threshold, upkeep, 20/80 sau trận, công thức forecast… để ở Demo/rules, không mô tả như luật bất biến của toàn game.

2. **Sửa interaction contract của mùa**
   - “mỗi đạo quân một lệnh, mỗi thành một việc” → **mỗi đạo quân/thành tối đa một lệnh/việc**.
   - Không bắt người chơi xử lý tất cả entity trước Hết mùa.
   - Quân không nhận lệnh = **Giữ**.
   - Thành không chọn việc = **không khởi việc mới**.
   - Hết mùa luôn hợp lệ nếu không còn modal bắt buộc.

3. **Sửa interaction contract của trận**
   - Không viết “người chơi ra lệnh từng cánh” theo nghĩa bắt buộc.
   - Mỗi lượt trận: **tướng/system đề xuất plan mặc định cho toàn bộ cánh**; người chơi có thể chạm cánh để override; cánh không đụng giữ plan mặc định; sau đó bấm cho chạy lượt.
   - Giữ 3×6, 7 order, `autoPick`, forecast và API hiện tại trong engine.
   - Tactical depth là optional override, không phải checklist.

4. **Sửa City UI của Demo Hoài Nam**
   - Chạm thành chỉ hiện **2–3 việc phù hợp context**.
   - Có nút/gesture **“thêm”** để mở toàn bộ việc hợp lệ.
   - Không mở menu 5–6 việc mặc định mỗi lần chạm thành.
   - Quy tắc engine về task không đổi chỉ vì nén UI.

5. **Giữ các refinement từ GPT challenge**
   - Forecast player-facing: nhãn + sức hai bên + thương vong ước + tối đa **2 lý do chính**; chi tiết khác mở thêm khi cần.
   - Economy/march: trước confirm hiển thị **ETA + delta tài nguyên**, không bắt người chơi tự tính formula.
   - Thẻ người có queue/badge; không tự giật focus giữa thao tác map, trừ sự kiện thật sự bắt buộc.
   - Character sheet: giữ 5 stat trong model, nhưng context nào chỉ highlight stat liên quan.
   - Sau trận: 1 recap ngắn + thay đổi trực tiếp trên map; hậu quả cơ học không tạo thêm confirmation. Tù binh/tướng/ngoại giao mới thành thẻ người.
   - “Số, không chữ” viết lại thành **trạng thái định lượng, không band mơ hồ**; chữ vẫn dùng để giải thích nguyên nhân và quyết định con người.

6. **Thêm acceptance criteria vào Freeze**
   - Người mới tạo được một map intent có hậu quả trong <60 giây, không cần manual.
   - Một mùa có thể kết thúc mà không phải chạm mọi quân/thành.
   - Một lượt battle chạy được bằng plan mặc định; override là optional.
   - Forecast giải thích được 2 lý do chính.
   - March/build cho thấy ETA + delta tài nguyên trước confirm.
   - Sau trận chỉ một recap ngắn; kết quả chính thấy trên map.
   - Sau một mùa Demo Hoài Nam, owner kể được ít nhất một quyết định của mình làm đổi thế cờ.

7. **Không phá lại các phần đã ổn**
   - Truth ≠ Perception ≠ Presentation.
   - BattleDescriptor/TurnObservation.
   - Battle API thuần.
   - Forecast theo Mưu.
   - Binh chủng × địa hình.
   - Cards chỉ cho người.
   - Map 3D là interaction surface chính.
   - Short-run trước, scale sau.

**Definition of done:** draft được tổ chức lại theo Core / Demo / Open, các câu mâu thuẫn về bắt buộc thao tác đã được sửa, `npm test` và `npm run sim -- 500` xanh; chưa rename thành `GAMEPLAY-FREEZE.md` cho tới khi owner đọc và khóa.
