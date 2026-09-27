# Vòng 9 — Gameplay & game feel: đang pending / unknown ở đâu (interview)

> **Vai trò:** research + bộ câu hỏi để chủ dự án quyết hướng vòng tới. Không phải SOT: câu trả lời sẽ chép vào `GAMEPLAY-FREEZE.md` (luật), `docs/status.md` (việc), ADR (quyết định khó đảo).
> Ngày đo: 2026-09-27, nhánh `claude/gracious-pasteur-6s8fmk`, HEAD `2fc1351`.
> Cách trả lời: điền vào dòng **Trả lời:** dưới mỗi câu, hoặc trả lời theo số câu trong chat.

## 1. Tóm tắt một phút

- Máy đã có đủ: engine 219, perception, vòng lượt v1.1 (`game.html`), 88 test xanh. Cái **chưa có** là *trải nghiệm chơi*: người chơi không biết mình đang cố đạt gì, không ước được một trận, không thấy cốt truyện, và bốn đế chơi giống nhau.
- Với cách chơi hợp lý (đánh láng giềng yếu hơn, chiêu trung lập, còn lại nội chính) **không đế nào thắng** (0–3 %), chết trung bình ở lượt 12–26. Chơi rùa thì sống nhưng cũng không thắng. Đánh liên tục thì chết trước lượt 20.
- Thế giới **quá loạn**: trung bình 1,6–2,0 châu đổi chủ mỗi lượt; Hứa Xương (thủ phủ Tào) đổi chủ 7–17 lần một ván. Tin "X nay thuộc Y" thành nhiễu, không đọc được thế cục.
- Bảy trên chín cửa kịch bản (Quan Vũ vây Phàn, Ngô nhìn Kinh, Nghiệp lộ sườn…) **không bao giờ tới người chơi** — chỉ diễn ở `?demo=1`.
- Hán Vũ Đế ở Hà Tây chỉ kề đúng một châu (Lũng Tây của Tần): "Viễn chinh" không có đâu để đi.
- Phần lớn việc còn lại **không phải unknown kỹ thuật** mà là **pending quyết định của chủ dự án** (mục 6). Mục 7 là 16 câu hỏi (Q0–Q15) để chốt.

## 2. Đã đo bằng gì

| Việc | Lệnh | Kết quả |
| --- | --- | --- |
| Test engine + controller + presenter | `node --test "tests/*.test.mjs"` | 88 pass, 0 fail |
| Cân bằng AI-only | `node tests/sim.mjs 300` | mục 4.1 |
| Chơi thử headless qua đúng vòng lượt của `game.html` | `node tests/playthrough.mjs 30 reasonable` (+ `turtle`, `hothead`) | mục 4.2 |
| Đọc | mọi file `docs/product/**`, `docs/design/direction.md`, ADR, `src/engine/**`, `src/world/game-controller.js`, `player-ui.js`, `event-presenter.js`, `hud.js`, test e2e | mục 3, 5 |

`tests/playthrough.mjs` mới thêm trong vòng này: chơi N seed mỗi đế bằng một chính sách cố định, in ra những gì người chơi *sống qua* (sống bao lâu, thấy gì mỗi lượt, bản đồ loạn cỡ nào). Ba chính sách: `reasonable` (đói thì nội chính; đánh châu kề có band thấp hơn quân mình; chiêu trung lập; còn lại xây), `turtle` (không bao giờ đánh), `hothead` (đánh mỗi lượt). Chính sách thô, người thật có thể khá hơn — số ở đây là *hướng*, không phải trần.

## 3. Hiện trạng: cái gì đã có

| Lớp | Có | Chưa / chỉ là dữ liệu |
| --- | --- | --- |
| Engine (`engine.js`) | 5 lệnh, 20 châu, trọng tài tất định theo seed, minh ước 6 mùa, chiêu trung lập, 3 kế, dân biến, hậu cần, thắng 12/20 hoặc còn 1 phe hoặc hết 48 lượt | Bốn máy A.5; deal nhiều điều khoản; tướng chết/hàng khi mất châu; kế vị / sập nước (`succession`, `realm_fall` có trong `EVENT_KINDS` nhưng **không có code bắn**); `reforms`, `annexBonus`, `reserves`, `heirsOffMap` trong data **engine không đọc** |
| Attach 219 | 9 cửa bắn theo predicate; đình chiến khách 8 mùa ba lớp; RuntimeEvent v1 | `governors` khởi tạo rồi **đứng yên**: Tần chiếm Trường An, tin tình báo vẫn ghi "Trương Hợp giữ thành" |
| Perception | DecisionContext, band quân, provinceIntel own/adjacent/memory/unknown, TurnObservation, phong bì lượt + sứ giả, áp lực khối, prior Lý/Chu | Adapter remap id cho LLM; `source: public` |
| Vòng chơi (`game-controller.js`, `player-ui.js`) | Chọn 1 trong 4 đế → 1 lệnh/mùa → thẻ sứ giả → diễn ≤ 2 cảnh → nhật ký + thẻ Thiên hạ → bảng phe/áp lực/minh ước/bảo hộ | Không hiện **điều kiện thắng**; không delta số sau lượt; không lý do thắng/thua; không lưu ván; không undo; bản đồ **không nhận click** (mọi lệnh qua danh sách trái); không tooltip trên bản đồ |
| Trình diễn (`event-presenter.js`, `hud.js`) | Cảnh hành quân theo đường nướng, cảnh tiêu điểm, huy hiệu Thắng/Bại, bụi, cờ, tốc độ 1/2/4, Bỏ qua | Cắt cảnh trận 3–5 s (ADR 0004 đã chọn) — hiện là bụi + huy hiệu; chân dung (đang là chữ Hán trong vòng tròn); âm thanh; cảnh cửa tension chỉ ở demo |
| Thế giới 3D | Bản đồ Albers toàn quốc, 20 thành Đông Hán, LOD, ngân sách ADR 0005 | Bản đồ tranh khi thu nhỏ; nướng mặt nạ lõi (16 s dựng) |
| Phát hành | Pages workflow copy cả `index.html` và `game.html` | `index.html` vẫn là clip Phase 1; `game.html` không có link từ đâu |
| AI | MOCK theo persona + tình huống, qua DecisionContext | LLM: sandbox đã spec (`agent-sandbox.md`), chưa có adapter |

## 4. Số đo

### 4.1 AI-only (`tests/sim.mjs 300`)

| | Lý | Tào | Lưu Bị | Tôn | Chu | Tần | Vũ |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Thắng | 29 % | 25 % | 20 % | 8 % | 7 % | 6 % | 4 % |

- 65 % ván kết thúc "xưng bá" ở lượt 48 (không ai đủ 12 châu); 35 % thống nhất.
- 100 ván: đế chết 183 lần — 127 do Tam Quốc, 56 do đế khác. Trước lượt 8: 51 cái chết, trong đó **Tào diệt Tần 30 lần**. Cơ chế: Tần (hiếu chiến) đánh Tào → mất bảo hộ với Tào → Tào đánh trả với hơn nửa tổng quân → Tần 1 châu = chết.
- 1,76 châu đổi chủ mỗi lượt; Hứa Xương đổi chủ 16 lần một ván.

### 4.2 Người chơi (`tests/playthrough.mjs`, 30 seed mỗi đế)

| Chính sách | Đế | Thắng | Chết | Lượt chết TB | Sống tới lượt 48 | Hạng cuối TB / 7 |
| --- | --- | --- | --- | --- | --- | --- |
| reasonable | Tần | 0 % | 97 % | 12,6 | 3 % | 5,4 |
| | Lý | 0 % | 70 % | 18,2 | 23 % | 5,5 |
| | Chu | 0 % | 70 % | 12,0 | 17 % | 5,4 |
| | Vũ | 3 % | 60 % | 25,8 | 30 % | 5,6 |
| turtle | Tần | 0 % | 27 % | 23,4 | 53 % | 4,4 |
| | Lý | 3 % | 0 % | – | 47 % | 3,7 |
| | Chu | 0 % | 17 % | 33,6 | 40 % | 4,4 |
| | Vũ | 0 % | 20 % | 32,5 | 60 % | 5,1 |
| hothead | Tần | 0 % | 100 % | 7,2 | 0 % | 5,9 |
| | Lý | 0 % | 93 % | 15,4 | 0 % | 5,3 |
| | Chu | 0 % | 97 % | 10,9 | 3 % | 5,9 |
| | Vũ | 0 % | 90 % | 18,3 | 0 % | 6,5 |

Những gì người chơi *thấy* (reasonable):

| | Tần | Lý | Chu | Vũ |
| --- | --- | --- | --- | --- |
| Cảnh mỗi lượt 1 / 2 | 65 / 35 % | 58 / 42 % | 78 / 22 % | 89 / 11 % |
| Lượt có sứ giả | 14 % | 9 % | 1 % | 1 % |
| Đánh châu band "yếu" mà **thua** | 38 % | 25 % | 40 % | 39 % |
| Bị đánh (lượt) | 31 % | 36 % | 18 % | 9 % |
| Có 2 châu trước lượt 8 | 20 % | 43 % | 0 % | 7 % |
| Châu giữ nhiều nhất TB | 2,1 | 3,8 | 1,9 | 2,4 |
| Châu đổi chủ mỗi lượt | 1,85 | 2,01 | 1,85 | 1,79 |
| Hứa Xương đổi chủ / ván | 7,2 | 11,8 | 8,0 | 12,8 |
| Dòng "Biến cố trong nước." không nội dung / ván | 1,6 | 2,6 | 2,3 | 1,9 |

Không lượt nào "im lặng" (luôn có ít nhất một cảnh: lệnh của mình). Thẻ Thiên hạ trống 3–4 % lượt. Ván dài trung bình 38–41 lượt; ở tốc độ mặc định 2× một cảnh đánh mất khoảng 8–10 s, cảnh tiêu điểm 3–4 s.

Phụ lục A: nguyên văn 12 lượt đầu của Tần, seed 1.

## 5. Phát hiện

Mỗi mục: bằng chứng → ảnh hưởng tới cảm giác chơi → lane sửa.

**F1 — Thế giới loạn.** 1,6–2,0 châu đổi chủ mỗi lượt; thủ phủ Tào đổi chủ 7–17 lần/ván. Nguyên nhân trong luật: sức thủ = tổng quân chia đều số châu, nên từng châu của Tào chỉ còn band "yếu" dù Tào là phe đông quân nhất; Hứa Xương lại là châu kề nhiều láng giềng nhất bàn cờ, vừa `strategic` vừa có Hiến Đế nên mọi AI đều nhắm. Cảm giác: bản đồ nhấp nháy, thẻ Thiên hạ là 3–5 dòng "X nay thuộc Y" mỗi lượt, không có thế cục để đọc. *Grok.*

**F2 — Đế không có đường thắng.** Reasonable 0–3 % thắng; turtle sống nhưng hạng 4–5. Chuỗi bẫy: đánh Tam Quốc lần đầu = phá ước với phe đó → phe đó phản công với hơn nửa quân → 1 châu = chết ngay, không có cảnh báo, không có đường lui. "Cửa sổ 8 mùa" hiện là bẫy cho đế hiếu chiến và vô nghĩa cho đế rùa. *Grok + chủ dự án.*

**F3 — Hán Vũ Đế ngõ cụt.** `hexi` chỉ kề `longxi`. Mục tiêu hợp lệ suốt ván: Thiên Thủy của Tần. Không trung lập để chiêu. Persona "viễn chinh, ngoại giao" nhưng chỉ có một lựa chọn duy nhất là đánh đế khác. *Scenario (Grok) + chủ dự án.*

**F4 — Intel không đủ để quyết.** Người chơi thấy band + tướng + lũy, không thấy địa hình, thủ phủ, thành trì nhân vào sức thủ; không có ước lượng. Kết quả: đánh châu "yếu" thua 25–40 %, hothead thua 75–93 %. Contract v1.1 cấm tỉ lệ trong context và HUD (`ratio`, `power`, `winChance` là từ khoá cấm trong test). Người chơi học bằng cách chết. *Contract (Grok) — cần chủ dự án mở.*

**F5 — Cốt truyện không tới người chơi.** `PUBLIC_GATES` chỉ có `opening`, `guest_arrival`. Bảy cửa còn lại chỉ diễn ở `?demo=1`. Lý ngồi Tấn Dương không bao giờ thấy "Nghiệp lộ sườn" — cửa viết riêng cho Lý. *Contract (Grok).*

**F6 — Bốn đế chơi giống nhau.** A.5 chưa có; khác biệt chỉ là số `traits`/`weights` ẩn (người chơi không thấy hệ số `knowledge` của Tần là gì, cũng không thấy nó đang làm gì). Màn chọn đế chỉ ghi "Trấn X · N quân · Uy". `reforms` trong `world.json` không được engine đọc. *Grok (A.5) + Claude (màn chọn).*

**F7 — Tướng đứng yên.** `state.governors` không đổi khi châu đổi chủ; tướng không chết, không hàng; `succession`/`realm_fall` không có code. Tin tình báo sai ngay trên châu của mình. *Grok.*

**F8 — Phản hồi lượt mỏng.** Không delta Quân/Lương/Dân/Uy (kịch bản gốc đòi "+2000 binh"), không lý do thắng/thua. Ba chặn trong `status.md` hiện ra thành: "Biến cố trong nước." 1,6–2,6 dòng/ván không nội dung; "dùng kế với ta" không tên kế; sứ giả bị từ chối vì `pact_full` đọc giống bị ta từ chối. *Grok (code/sub trên event) + Claude (bảng).*

**F9 — Mục tiêu và luật không hiện.** UI không nói điều kiện thắng (12/20 châu · còn 1 phe · nhiều châu nhất ở lượt 48). Khối bảo hộ khách có nhưng không cảnh báo *trước* khi bấm "Đánh Tào": "đánh phe này = mất bảo hộ với phe này". Không onboarding. *Claude.*

**F10 — Bản đồ chỉ để nhìn.** Không click châu, không hover; `hud .place` là `pointer-events: none`. Mọi lệnh qua danh sách trái; bản đồ chỉ tô đích. Trái với kỳ vọng TW3K/Civ mà `direction.md` đặt ra. *Claude.*

**F11 — Nhịp diễn.** 1–2 cảnh/lượt là đúng chủ ý; nhưng trận = bụi + huy hiệu, chưa có cắt cảnh 3–5 s như ADR 0004 chọn; không chân dung; không âm thanh; không nháy đỏ giao chiến (kịch bản gốc). *Claude.*

**F12 — Không lưu ván / undo / xem lại.** `restoreGame` có trong engine, UI không dùng. Mất tab = mất ván. *Claude.*

**F13 — Ngoại giao một điều khoản.** Chỉ minh ước 6 mùa và chiêu; sứ giả chỉ nhận/từ chối; bảng 8 điều khoản `diplomacy.md` chưa wire. Áp lực khối hiện "Cao" nhưng người chơi không có cách phản ứng ngoài xin minh. *Grok.*

**F14 — Phát hành và LLM.** `index.html` vẫn là clip Phase 1 (bậc 0 trong `launch.md`); `game.html` chờ chủ dự án chơi thử từ 2026-09-25. LLM: spec có, adapter chưa. *Chủ dự án.*

## 6. Bản đồ pending / unknown

| # | Hạng mục | Trạng thái | Chờ ai / thiếu gì | Nguồn |
| --- | --- | --- | --- | --- |
| 1 | Chủ dự án chơi thử `game.html` | **Pending** từ 25/9 | Cảm nhận tay đầu tiên — chưa có | `status.md` |
| 2 | Thước đo "chơi được" (đường thắng mục tiêu) | **Unknown** | Freeze nói "đo đường thắng" nhưng không có mốc | `GAMEPLAY-FREEZE.md` |
| 3 | Sức thủ / churn | **Unknown** (chưa ai nêu) | Quyết luật thủ theo châu | F1 |
| 4 | Bảo hộ khách: bẫy hay cửa sổ | **Pending** quyết | Chủ dự án | F2 |
| 5 | Vũ Đế ngõ cụt | **Unknown** | Đổi graph hoặc thêm ô | F3 |
| 6 | Ước lượng trận cho người chơi | **Pending** — contract cấm | Chủ dự án mở, Grok sửa contract | F4 |
| 7 | Cửa tension tới người chơi | **Pending** — contract cấm | Chủ dự án | F5 |
| 8 | Bốn máy A.5 | **Pending** Grok | Chưa có spec chi tiết ngoài freeze | F6 |
| 9 | Tướng đổi chủ / chết / kế vị | **Pending** Grok (Round B) | Chưa xếp lịch | F7 |
| 10 | `code` / `sub` trên event (chặn 1–3) | **Pending** Grok | Việc nhỏ, không cần quyết | F8 |
| 11 | Delta + lý do thắng thua trên UI | Chưa làm | Claude, sau #10 | F8 |
| 12 | Điều kiện thắng, cảnh báo phá ước, onboarding | Chưa làm | Claude, không cần quyết | F9 |
| 13 | Click/hover trên bản đồ | Chưa làm | Claude, nên xác nhận | F10 |
| 14 | Cắt cảnh trận, chân dung, âm thanh | Chưa làm | Claude, cần xếp ưu tiên | F11 |
| 15 | Lưu ván | Chưa làm | Claude | F12 |
| 16 | Deal nhiều điều khoản | **Pending** Grok | Chọn 2–3 điều khoản đầu | F13 |
| 17 | `index.html` → `game.html` | **Pending** quyết | Chủ dự án | F14 |
| 18 | LLM adapter | **Pending** | Có trong v1 không? | F14 |
| 19 | `tests/e2e/game-loop.mjs` chạy lại đủ | Pending Claude | Chỉ smoke vòng trước | `status.md` |

## 7. Interview

Trả lời bằng chữ cái, hoặc ghi ý riêng. "Đề xuất" là ý của Claude sau khi đo, không phải mặc định.

### A. Hướng và thước đo

**Q0. Anh đã chơi thử `game.html` chưa?** Nếu rồi: ba khoảnh khắc nhớ nhất (một chỗ thích, một chỗ khó chịu, một chỗ không hiểu). Nếu chưa: `npm start` → `/game.html?seed=219`, chơi 10 lượt bằng Lý Thế Dân rồi trả lời.
Trả lời:

**Q1. Ưu tiên bây giờ là gì?** Kịch bản gốc nói "trọng tâm: xem và quay clip"; anh vừa nói gameplay/game feel gần như chưa có.
- A. *Chơi* là chính cho `game.html`; clip ở `?demo=1` và cảnh diễn trong lúc chơi.
- B. Clip là chính; `game.html` chỉ cần chơi được để quay.
- C. Hai sản phẩm tách hẳn (trang chơi, trang xem).
Đề xuất: A — cảnh diễn đang có đã phục vụ clip; cái thiếu là phía chơi.
Trả lời:

**Q2. "Chơi được" đo bằng gì?** Freeze nói "đo đường thắng, không chỉ win %" nhưng chưa có mốc.
- A. Người chơi biết luật thắng 25–40 % ván; ván 20–30 phút; sống qua lượt 16 ở 80 % ván.
- B. Sống sót và giữ hạng là mục tiêu; thắng thật hiếm (như hiện nay).
- C. Mốc khác: ____
Đề xuất: A, và ghi vào freeze để `tests/playthrough.mjs` đo mỗi vòng.
Trả lời:

**Q3. Mất hết châu là chết ngay?** Hiện 1 châu thua 1 trận thủ = diệt vong, không cảnh báo (F2).
- A. Giữ, nhưng UI cảnh báo rõ trước lệnh rủi ro và sau trận thủ thua.
- B. Thêm đường lui một lần: mất thủ phủ khi còn 1 châu → chạy sang châu kề còn trống hoặc trung lập với nửa quân (lưu vong), rồi mới chết nếu mất tiếp.
- C. Giữ nguyên, không cảnh báo (chủ ý khắc nghiệt).
Đề xuất: B, vì cả 3 chính sách đều chết ở lượt 7–26 mà không có "hồi hai".
Trả lời:

### B. Luật cần anh quyết (Grok sửa)

**Q4. Thế giới loạn (F1) có chấp nhận không?**
- A. Sửa luật thủ: quân trấn theo châu (không chia đều), hoặc thủ phủ/châu vừa chiếm cần 2 lượt mới hạ, hoặc châu vừa đổi chủ được 1–2 lượt "củng cố" tự động. Mốc đo: ≤ 0,7 châu đổi chủ mỗi lượt, Hứa Xương ≤ 3 lần một ván.
- B. Giữ luật, chỉ lọc tin (gộp "X nay thuộc Y" thành một dòng tổng).
- C. Khác: ____
Đề xuất: A. Lọc tin không sửa được cảm giác bản đồ nhấp nháy.
Trả lời:

**Q5. Bảo hộ khách nên là gì?**
- A. Giữ luật, thêm giới hạn phản công: phe bị đế đánh chỉ được đánh trả *một* lần trong 8 mùa, rồi bảo hộ lại có hiệu lực.
- B. Bảo hộ theo *thủ phủ đế* chứ không theo "đúng 1 châu": thủ phủ được bảo hộ tới hết lượt 8 dù đế đã có 2 châu; châu mới không được bảo.
- C. Giữ nguyên: bẫy là chủ ý, đế hiếu chiến phải trả giá.
Đề xuất: B — cho đế một cửa sổ mở rộng thật sự (43 % Lý có 2 châu trước lượt 8 rồi mất sạch).
Trả lời:

**Q6. Hán Vũ Đế ở ngõ cụt (F3).**
- A. Thêm cạnh graph: `hexi`–`bing` (thảo nguyên) hoặc `hexi`–`guan`.
- B. Thêm ô trung lập "Tây Vực / Đại Uyển" kề `hexi` để chiêu hoặc đánh (nhãn cửa Hán đã có trên bản đồ, ADR 0006).
- C. Giữ: Vũ là đế ngoại giao/mưu; cần deal "mượn đường" (F13) mới đi được.
Đề xuất: B — khớp "khai hoang rìa" của kịch bản; A đổi địa lý, C phụ thuộc deal chưa có.
Trả lời:

**Q7. Người chơi được biết gì trước khi đánh (F4)?**
- A. Chỉ band + tướng + lũy như hiện nay (giữ contract).
- B. Thêm địa hình và thủ phủ của châu đích (đều là địa lý công khai) và một chữ ước lượng do *UI* tính từ quân mình + band + lũy + địa hình: "Bất lợi / Ngang / Có lợi". Không đưa vào DecisionContext, AI không dùng.
- C. Hiện tỉ lệ số (như Civ).
Đề xuất: B. Không lộ quân địch, nhưng người chơi hết "học bằng cách chết".
Trả lời:

**Q8. Cửa kịch bản tới người chơi (F5)?**
- A. Mọi cửa tension thành tin đồn công khai cho cả 7 phe (chỉ chữ + nhãn công khai, không actor ẩn).
- B. Chỉ phe kề hoặc được nêu tên trong cửa mới thấy (Lý thấy "Nghiệp lộ sườn", Tần không).
- C. Giữ: cửa chỉ cho spectator/demo.
Đề xuất: B. Cốt 219 là lý do chọn mốc này; người chơi phải thấy nó.
Trả lời:

### C. Cảm giác chơi và tương tác (Claude làm)

**Q9. Bản đồ là bàn phím (F10)?** Click thành để chọn đích, click châu mình để chọn nơi xuất quân, hover hiện thẻ tin tình báo; danh sách trái vẫn giữ.
- A. Làm ngay vòng tới.
- B. Sau khi luật (Q4–Q7) ổn.
Đề xuất: A — độc lập với luật, đổi hẳn cảm giác "chơi trên bản đồ".
Trả lời:

**Q10. Kết quả lượt (F8).**
- A. Thẻ tổng kết cuối lượt: delta Quân/Lương/Dân/Uy có chuyển động, lý do thắng/thua bằng chữ (thành cao, địa hình hiểm, quân đông), tên kế địch dùng, nội dung "biến cố". Cần Grok gắn `code`/`sub` (chặn 1–3).
- B. Chỉ delta số, chưa cần lý do.
- C. Giữ.
Đề xuất: A; phần delta làm được ngay, phần lý do chờ chặn 1–3.
Trả lời:

**Q11. Xếp thứ tự ba việc hình (F11):** cắt cảnh trận 3–5 s (ADR 0004) · chân dung 7 lãnh đạo + tướng chính · âm thanh (nhạc nền, trống trận, sứ giả). Ghi thứ tự, hoặc gạch cái không cần.
Đề xuất: cắt cảnh trận → chân dung → âm thanh.
Trả lời:

**Q12. Mục tiêu và onboarding (F9):** hiện điều kiện thắng và đồng hồ 48 lượt trên bảng trạng thái; cảnh báo "đánh phe này = mất bảo hộ với phe này" ngay trong thẻ đích; ba gợi ý lượt đầu.
- A. Làm ngay (rẻ, không đụng luật).
- B. Sau.
Đề xuất: A.
Trả lời:

**Q13. Lưu ván (F12):** tự lưu vào trình duyệt sau mỗi lượt, nút "Tiếp tục" ở màn đầu, seed hiện để chia sẻ.
- A. Làm ngay. B. Sau.
Đề xuất: A khi ván dài 20–30 phút.
Trả lời:

### D. Phạm vi vòng tới

**Q14. Thứ tự hai lane.**
- A. Game feel + cân bằng trước (Q4–Q7, Q9–Q12), A.5 sau.
- B. A.5 (bốn máy) trước.
- C. Song song: Grok làm Q4–Q7 + chặn 1–3 + tướng đổi chủ; Claude làm Q9–Q13.
Đề xuất: C — hai lane không đụng file nhau; A.5 chỉ có nghĩa khi đế sống qua lượt 16.
Trả lời:

**Q15. Phát hành và LLM (F14).**
- A. Pages trỏ `game.html` sau khi Q4–Q5 xong; LLM sau launch.
- B. Trỏ `game.html` ngay (chấp nhận hiện trạng), LLM sau.
- C. LLM là điều kiện launch.
Đề xuất: A.
Trả lời:

## 8. Làm được ngay, không cần chờ trả lời

- Grok: gắn `code` cho event nội bộ (lương cạn, dời thủ phủ, hủy binh vì minh, bội minh, đường bị cắt, đón Hiến Đế), `sub` cho `stratagem`, giữ `code` trong `observePact` (chặn 1–3 trong `status.md`); `governors` đổi theo chủ châu.
- Claude: hiện điều kiện thắng + đồng hồ lượt; cảnh báo phá ước trong thẻ đích; delta số sau lượt; chạy lại đủ `tests/e2e/game-loop.mjs`.
- Đo lại sau mỗi vòng: `node tests/playthrough.mjs 30 reasonable` và `node tests/sim.mjs 300`, ghi số vào `status.md`.

## Phụ lục A — 12 lượt đầu của Tần Thủy Hoàng, seed 1, chính sách reasonable

Nguyên văn những gì người chơi đọc (cảnh + thẻ Thiên hạ), `node tests/playthrough.mjs 30 reasonable 1`.

```
L1 Thu 219 · lệnh attack → guan
   thấy: Chúa Cô Tang và Tần Thủy Hoàng lập minh ước (đến lượt 7). / Tần Thủy Hoàng đánh Trường An — bại, rút quân. Ta mất 7.432 quân.
   tin:  Thu Kiến An 24: thiên hạ chia ba. / Các thế lực lạ xuất hiện ở rìa thiên hạ. / Chúa Cô Tang và Tần Thủy Hoàng công bố minh ước (đến lượt 7). / Hứa Xương nay thuộc Tôn Quyền. / Kế Thành nay thuộc Tào Tháo.
   sau lượt: quân 21278 · lương 49094 · châu 1
L2 Đông 219 · lệnh internal → longxi
   thấy: Nội chính ở Thiên Thủy.
   tin:  Hứa Xương nay thuộc Tào Tháo. / Bành Thành nay thuộc Chúa Chung Ly. / Tương Dương nay thuộc Lưu Bị.
L3 Xuân 220 · lệnh fortify → longxi
   thấy: Củng cố Thiên Thủy.
   tin:  Hứa Xương nay thuộc Chúa Chung Ly. / Nghiệp Thành nay thuộc Chúa Tấn Dương.
L4 Hạ 220 · lệnh internal → longxi
   thấy: Nội chính ở Thiên Thủy.
   tin:  Hứa Xương nay thuộc Tào Tháo.
L5 Thu 220 · lệnh attack → guan
   thấy: Tần Thủy Hoàng đánh Trường An — thắng. Ta mất 4.465 quân.
   tin:  Trường An nay thuộc Tần Thủy Hoàng. / Hứa Xương nay thuộc Tôn Quyền. / Nghiệp Thành nay thuộc Tào Tháo.
   sau lượt: quân 26648 · lương 94882 · châu 2
L6 Đông 220 · lệnh attack → si_li
   thấy: Tần Thủy Hoàng đánh Lạc Dương — thắng. Ta mất 5.236 quân.
   tin:  Lạc Dương nay thuộc Tần Thủy Hoàng. / Hứa Xương nay thuộc Tào Tháo. / Nghiệp Thành nay thuộc Chúa Tấn Dương.
   sau lượt: châu 3
L7 Xuân 221 · lệnh attack → yu
   thấy: Quân Lưu Bị đánh Lạc Dương — phòng tuyến thất thủ. Ta mất 5.414 quân. / Biến cố trong nước.
   tin:  Lạc Dương nay thuộc Tào Tháo. / Hứa Xương nay thuộc Tôn Quyền.
   sau lượt: châu 2
L8 Hạ 221 · lệnh attack → si_li
   thấy: Chúa Cô Tang và Tần Thủy Hoàng lập minh ước (đến lượt 14). / Tần Thủy Hoàng đánh Lạc Dương — thắng. Ta mất 3.961 quân.
   tin:  Chúa Cô Tang và Tần Thủy Hoàng công bố minh ước (đến lượt 14). / Lạc Dương nay thuộc Tần Thủy Hoàng.
   sau lượt: châu 3
L9 Thu 221 · lệnh attack → yu
   thấy: Quân Chúa Tấn Dương đánh Lạc Dương — phòng tuyến thất thủ. Ta mất 5.605 quân. / Biến cố trong nước. / Biến cố trong nước.
   tin:  Chúa Cô Tang và Chúa Tấn Dương công bố minh ước (đến lượt 15). / Lạc Dương nay thuộc Chúa Tấn Dương. / Hứa Xương nay thuộc Tào Tháo. / Tương Dương nay thuộc Tôn Quyền.
   sau lượt: châu 2
L10 Đông 221 · lệnh attack → si_li
   thấy: Tần Thủy Hoàng đánh Lạc Dương — bại, rút quân. Ta mất 7.868 quân.
   tin:  Tào Tháo và Chúa Tấn Dương công bố minh ước (đến lượt 16). / Hứa Xương nay thuộc Tôn Quyền. / Tương Dương nay thuộc Lưu Bị.
L11 Xuân 222 · lệnh internal → longxi
   thấy: Nội chính ở Thiên Thủy.
   tin:  Hứa Xương nay thuộc Lưu Bị. / Kế Thành nay thuộc Trung lập.
L12 Hạ 222 · lệnh attack → han_zhong
   thấy: Tần Thủy Hoàng đánh Nam Trịnh — bại, rút quân. Ta mất 7.452 quân.
   tin:  Hứa Xương nay thuộc Tôn Quyền.
```

Đọc lại 12 lượt này thấy ngay bốn thứ: Hứa Xương đổi chủ 9 lần trong 12 lượt; lệnh đánh lượt 1 thua vì Trường An "yếu" theo band nhưng là đất đồi có hệ số thủ cao, và người chơi không được biết điều đó; "Biến cố trong nước." xuất hiện ba lần không nói gì; và không có dòng nào nói người chơi đang cách chiến thắng bao xa.
