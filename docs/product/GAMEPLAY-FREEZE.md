# GAMEPLAY FREEZE v2 — khóa 2026-09-29

> **SOT gameplay v2, khóa 29/9 bởi chủ dự án.** Thắng thảo luận cũ. Claude viết (ASSIGN mục 2); GPT phản biện (`_research/chatgpt.md` mục D); chủ dự án chốt cách chơi ([DECISION.md](../phases/v2-gameplay/DECISION.md), Sửa 29/9) và khóa. Bản v1 là log: [`GAMEPLAY-FREEZE-v1.md`](GAMEPLAY-FREEZE-v1.md); game 20 châu đang chạy (engine v1) vẫn theo nó cho tới khi v2 thay. Hộp cát LLM: `agent-sandbox.md`.
> Ba tầng. **A. Lõi:** DNA của v2, đúng ở mọi quy mô. **B. Demo Hoài Nam:** luật và số của lát 5 thành, để chạy, đo và test; không phải DNA của cả game. **C. Mở:** scale lên 20 châu và các câu chưa chốt; không code như luật.
> Nguồn: DECISION.md (Sửa 28/9 tối, Sửa 29/9), demo 1 (`docs/phases/v2-gameplay/demo1/src/hn-rules.js`), engine (`0aef1b0`, `c8cafc9`, `cf12192`). Số chi tiết: `rules.md`. Khi demo 1 và DECISION khác nhau, freeze theo DECISION và ghi lại.

## A. Lõi

### Khóa

- **Ván tranh bá ngắn, vào là chơi.** Không khóa số lượt: ván hết khi có người xưng bá hoặc người chơi bị loại.
- **Bản đồ 3D là bề mặt điều khiển chính** (điện thoại cầm ngang). Không menu lệnh, không tab.
- **Trạng thái định lượng, không band mơ hồ.** Số cho quân, lương, tiền, Uy. Chữ để giải thích nguyên nhân và cho quyết định con người. Dự đoán trận là nhãn của tướng, không lộ tỉ lệ thật.
- **Hiện hệ quả, không bắt tính công thức.** Trước khi xác nhận một cuộc hành quân hay một việc: số mùa tới nơi / xong việc, và lương, tiền sau mùa (ví dụ "Lương 12.400 → 9.800 · tới nơi sau 2 mùa"). Công thức ở `rules.md`.
- **Thẻ chỉ cho người:** sứ giả và liên minh, tù binh, tướng có chuyện, mốc lịch sử đế biết trước. Thẻ sinh từ bàn cờ, hậu quả thấy trên bản đồ. Thẻ nằm trong hàng chờ có huy hiệu, xử lý lúc nào cũng được, không tự giật tay người chơi giữa thao tác bản đồ (trừ thẻ thật sự bắt buộc). Hết mùa chưa trả lời = "không".
- **Mỗi đế một tri thức tương lai đọc được trên bàn cờ** (thẻ mốc lịch sử). Bốn đế khác nhau ở lựa chọn, không chỉ ở số.
- Giữ từ v1: Truth ≠ Perception ≠ Presentation; không bonus hard-code theo id châu; một máy + một giá; đo đường thắng, không chỉ tỉ lệ thắng.
- Bỏ từ v1: "1 phe / 1 lệnh / lượt" (nay theo đơn vị); "không stack" (nay nhiều đạo đánh một đích là một trận).

### Một mùa: sức chứa, không phải danh sách phải làm

- Mỗi đạo quân **tối đa** một lệnh mỗi mùa; mỗi thành **tối đa** một việc. Bỏ qua luôn hợp lệ: quân không lệnh = **Giữ**; thành không chọn = **không khởi việc mới**.
- **Hết mùa luôn bấm được** khi không còn thẻ bắt buộc; không bắt chạm mọi quân, mọi thành. Có thêm đất không được làm mùa dài thêm tuyến tính.
- **Chạm quân → chạm đích**, lệnh suy từ đích: đích là đất ta hay đất bạn = đi; đạo quân địch = đánh; thành địch = hỏi một lần "đánh ngay hay vây" (GPT D2; chủ dự án chưa quyết riêng, sửa được sau chơi thử).
- Hết mùa mọi phe cùng đi; trận của người chơi đánh theo lượt, trận AI với AI tự giải.

### Quân và trận

- **Đạo quân** = một tướng + `{ bo, cung, ky, thuy }`, hiện trên map: khối lính theo binh chủng, cờ phe, thẻ tướng kèm số quân. Đi theo đường; xa thì nhiều mùa và tốn lương (DECISION).
- **Binh chủng theo địa thế và thành:** kỵ mạnh ở đồng, yếu khi công thành; bộ giữ thành, giữ trận chặn kỵ; cung bắn từ hàng sau; thủy chỉ đi sông và cần để qua Trường Giang.
- **Thấy quân** (DECISION): mọi đạo quân của mọi phe đều hiện; gần đất hoặc quân ta thì số lệch tới ±20 % (cố định trong mùa); xa thì chỉ cờ và loại quân; dò thám mới ra số đúng. *Demo 1 cho xa ±50 %; freeze theo DECISION.*
- **Mỗi trận là một BattleDescriptor v2** (`runtime-event.md`): nơi, tường, làn, hai bên `{ fid, gen, units }`, kết quả `{ win, losses, routed, turns }`.
- **Trận có địa hình, binh chủng, sĩ khí, tướng, và người chơi can thiệp theo lượt.** Mỗi lượt, **tướng đề xuất sẵn lệnh cho mọi cánh**; người chơi chạm cánh nào muốn đổi thì đổi, cánh không đụng giữ đề xuất; một thao tác cho chạy lượt. Không bắt ra lệnh từng cánh: người mới đánh được cả trận bằng cách nhận đề xuất.
- **Sau trận: một màn tóm tắt ngắn, thay đổi thấy thẳng trên bản đồ.** Hậu quả cơ học (đổi chủ, lũy, đồn, rút quân, Uy) không cần xác nhận. Tù binh, tướng, ngoại giao sinh ra từ trận thành thẻ người.

### Tướng

- **Năm chỉ số kiểu TW3K** (Uy, Tài, Mưu, Dũng, Kiên), đặc tính và **Trung** có trong model. Mỗi ngữ cảnh chỉ làm nổi chỉ số liên quan: dự đoán → Mưu, công → Dũng, thủ → Kiên, sĩ khí → Uy, xây dựng → Tài (khi có tác dụng). Trung là một thanh có mốc hậu quả, không bắt nhớ ngưỡng.
- Tướng bị bắt thì hàng hoặc chết; ly gián đủ thì phản (giữ từ DECISION).
- **Dự đoán trước trận:** tướng Mưu cao nhất bên đánh đọc trận; tướng giỏi đoán sát, tướng kém lệch nhiều; đọc trên quân địch như perception cho thấy; không bao giờ lộ tỉ lệ thật. **Người chơi thấy:** nhãn (Thắng lớn / Thắng / Ngang ngửa / Thua / Thua lớn), sức hai bên, thương vong ước, **tối đa 2 lý do chính**. Phần còn lại (đủ lý do, làn) mở bằng "?". `estWin`, biên độ sai số, danh sách 6 lý do là nội bộ.

### Tài nguyên và chạm đáy

- Lương, tiền, Uy; hiện bằng số, kèm thu và nuôi quân của mùa vừa rồi.
- **Chạm đáy:** hết mùa mà lương âm hoặc Uy 0 → cảnh báo một mùa; mùa sau vẫn ở đáy → sụp (binh biến, dân nổi dậy), ván thua.

### Cô lập kiến thức (giữ v1, thêm)

- `decide(fid)` chỉ nhận DecisionContext của phe mình; cấm đọc truth, doctrine, persona, prior của phe khác. RuntimeEvent là truth cho spectator, không phải input AI.
- Dự đoán của tướng và lệnh đề xuất đọc trận **như bên đó biết** (quân địch qua perception), không đọc truth.
- Bản đồ và cảnh trận chỉ vẽ từ TurnObservation của người chơi (hoặc RuntimeEvent ở `?demo=1`); cờ đế khách không lộ chữ thật.

### Tiêu chí nhận (trải nghiệm)

Test engine kiểm tra tính đúng; bảy tiêu chí này kiểm tra cách người chơi chạm vào hệ thống. Chưa đạt thì chưa đưa người lạ chơi.

1. Người mới tạo được một ý định trên bản đồ có hậu quả trong dưới 60 giây, không đọc hướng dẫn.
2. Một mùa kết thúc được mà không phải chạm mọi quân, mọi thành, không mở menu.
3. Một lượt trận chạy được bằng đề xuất mặc định; đổi lệnh cánh là tùy chọn.
4. Nhìn dự đoán, người chơi nói được 2 lý do chính nên hay không nên đánh.
5. Hành quân và việc của thành hiện số mùa tới nơi / xong và thay đổi tài nguyên trước khi xác nhận.
6. Sau trận chỉ một màn tóm tắt ngắn; kết quả chính thấy trên bản đồ.
7. Sau một mùa Demo Hoài Nam, chủ dự án kể được ít nhất một quyết định của mình làm đổi thế cờ (không chỉ vận may hay cắt cảnh).

## B. Demo Hoài Nam (luật và số của lát 5 thành)

Số lấy từ demo 1, đã chạy và đo; chỉnh được khi chơi thử mà không đụng tầng A.

- **Bàn cờ:** Chu Nguyên Chương giữ Chung Ly, Âm Lăng; Tào giữ Thọ Xuân (Mãn Sủng, lũy 3, đồn 3.000 bộ + 1.000 cung; Trương Liêu 6.000 quân, 3.500 kỵ); Ngô ở Lịch Dương (Chu Thái, thuyền); hào tộc Hu Dị (Trần Kiểu). **Thắng:** đủ 5 thành. **Thua:** mất hết thành, Chu tử trận, hoặc chạm đáy hai mùa liền.
- **Nhịp ván (29/9, sau lượt chơi đầu và `npm run v2sim`: lối "tham" thắng 89 % sau 4 mùa, quá dễ và quá ngắn).** Đích: người chơi chú tâm thắng sau khoảng 6–10 mùa, có lúc vấp; người chơi ẩu thua được. Sửa:
  - Thọ Xuân đồn 4.000 (demo 1: 2.600): hai đạo quân đầu ván không còn chắc lấy được bằng một trận; phải vây hạ lũy trước, mộ thêm, hay đánh lúc tướng đoán tốt.
  - **Trương Liêu trở lại hạ 220** (mùa 4) với 3.500 quân nếu đã bị gọi về Phàn Thành: Tào còn giữ thành ở Hoài Nam thì ông về thành đó, đánh từ mùa sau; Thọ Xuân đã mất thì ông đánh thẳng vào Thọ Xuân ngay mùa đó, thua thì về Hợp Phì. Thẻ "Quan Vũ sắp dìm bảy quân" nói trước điều này (tri thức của người xuyên không), nên người chơi chuẩn bị được.
  - **Vây: lũy sụp hết rồi mới mở cổng** (thủ dưới 30 % quân vây *và* lũy về 0). Thành lũy 1 yếu (Hu Dị) vẫn mở cổng ngay cuối mùa đầu vây; thành lũy 3 (Thọ Xuân) phải vây ít nhất 3 mùa. Demo 1 để Thọ Xuân mở cổng sau một mùa vây.
  - Thẻ Lã Mông đòi Uy ≥ 55 (demo 1: 45, tức là gần như chắc được Lịch Dương ở mùa 2); thẻ chỉ ra khi Lịch Dương còn của hào tộc.
  - Đồn của các phe máy được bù dần (Tào 150, hào tộc 50 mỗi mùa) **chỉ tới số đầu ván của thành đó**. Demo 1 bù không giới hạn: người chơi chậm gặp một Thọ Xuân không đạo quân nào lấy nổi, ván đứng mãi.
  - **Mộ quân vào đạo quân đang đóng ở thành** (bộ, cung, kỵ vào đạo bộ lớn nhất; thủy vào đạo thủy), không có đạo nào thì vào đồn. Thành đóng quân nuôi được đạo quân mà không phải chuyển tay; chuyển quân đồn ↔ đạo vẫn tự do.
- **Minh ước với Ngô hết ở xuân 220 (29/9).** Nhận minh rồi bỏ qua thẻ Lã Mông thì Lịch Dương thành đất bạn mãi, không thắng được (có từ demo 1). Cách sửa nhỏ nhất giữ được chuyện: minh ước có hạn theo sử, Tôn Quyền dâng biểu xưng thần với Tào (cuối xuân 220, mùa 3), minh tan, thuyền Chu Thái về tây đánh Kinh Châu như nhánh không minh; Lịch Dương (của Ngô hay hào tộc) lại là thành ai lấy được thì lấy. Không chọn "thành đồng minh tính vào thắng": "Hoài Nam về một mối" mà Ngô vẫn giữ một thành thì sai chuyện.
- **Lệnh đạo quân** (ý định engine, suy từ đích): Đi, Đánh (thành hoặc đạo quân trong tầm), Vây (đứng vây một thành), Giữ (bị đánh ngoài đồng thì dàn trận chờ sẵn, thủ +15 %). Nhiều đạo cùng đích = một trận, tướng Uy cao nhất cầm. Chuyển quân giữa đồn và đạo quân đứng trong thành: tự do.
- **Tầm một mùa:** bộ 108 km, kỵ (quá nửa đạo là kỵ) 135 km, thuyền 180 km trên một con sông. Demo đo đường chim bay, một mùa tới nơi; đi theo đường nhiều mùa chưa dựng.
- **Việc của thành** (luật engine): khai ruộng 2 mùa (lương thành này +25 %), đắp lũy 2 mùa (lũy +1, tối đa 4), dựng chợ 2 mùa (tiền +200 mỗi mùa), mộ bộ / cung / kỵ / thủy 1 mùa (+1.000 / 600 / 400 / 600, lấy từ dân, vào đạo quân ta đang đóng ở thành, không có thì vào đồn; thủy chỉ thành ven sông). Trả trước; đổi ý trong mùa thì hoàn; việc đang làm không đổi.
- **Chạm thành** chỉ hiện **2–3 việc hợp ngữ cảnh**, có "thêm" để mở mọi việc hợp lệ (chủ dự án chốt 29/9). Ví dụ ngữ cảnh: thành giáp địch → đắp lũy, mộ bộ; thành phía sau → khai ruộng, dựng chợ; thành ven sông chưa có thuyền → đóng thuyền. Nén giao diện không đổi luật việc ở trên.
- **Hết mùa, theo thứ tự:** thẻ chưa trả lời → "không" · minh ước hết hạn · lệnh AI · đi, vây · trận · vây (đồn −20 %, lũy −1, dân −8 %; lũy về 0 và thủ dưới 30 % quân vây thì mở cổng hàng) · việc của thành · thu, nuôi quân · Trung · chạm đáy · thắng thua · thẻ mùa sau, cảnh báo cho mùa sau.
- **Xem trước vây:** thành mở cổng ngay cuối mùa này thì câu đầu nói thẳng "mở cổng ngay cuối mùa này, không đánh" (chủ dự án, 29/9); không thì ước số mùa.
- **Nuôi quân** mỗi mùa (lương / người): bộ, cung 0,1; kỵ 0,2; thủy 0,15; đồn 0,05. **Thu:** lương = dân × 0,03 (ruộng +25 %), tiền = dân × 0,012 (+200 có chợ); thành miễn thuế không thu.
- **Thấy quân:** "gần" là trong ~100 km quanh thành hoặc quân ta. Đường đi trong mùa (`view.moves`) chỉ có quân ta và quân phe khác bắt đầu hay kết thúc ở chỗ ta thấy (lúc đầu mùa hay cuối mùa); quân xa vẫn hiện cờ và loại quân ở chỗ nó đứng. Tóm tắt mùa: trận của ta đủ số; trận của phe khác gần ta chỉ ai thắng, xa ta chỉ thành đổi chủ; không bao giờ có thương vong của phe khác; đồn thành bị vây đọc ±20 %.
- **Trận** (`src/engine/battle.js`, luật chi tiết `rules.md`, Trận theo lượt): 3 làn (đồng, bến, rừng, đồi, do bản đồ cho) × 6 hàng, tối đa 5 lượt, mỗi bên 1–6 cánh, 7 lệnh (tiến, xung phong, giữ, bắn, vòng sườn, rút, hỏa công). Đề xuất mặc định = lệnh tự động của engine (`Battle.autoOrders`). Hai bên thấy số từng cánh trên bàn trận (và gió); vận may của ngày, xúc xắc và chỉ số tướng địch không lộ. Đánh thành chỉ thắng khi phá hết đồn hoặc có cánh qua một mặt tường bỏ trống; hết lượt 5 mà tường còn người giữ thì thành đứng. Dã chiến: hơn 20 % sức còn lại là thắng, không thì hòa.
- **Trận vô vọng và bỏ trận (29/9).** Chủ dự án phải đánh từng lượt một trận giữ thành 500 người trước 5 cánh. Trận là *vô vọng* khi trên bàn trận hai bên cùng thấy, không cách nào của ta (đề xuất của tướng, giữ cả, xông cả) thắng hay hòa được trong 6 ngày khác (vận may, xúc xắc khác); không đọc vận may thật của ngày. Trước lượt 1, trận nào của ta cũng bỏ được, có giá: rút lệnh đánh (quân đứng lại chỗ cũ, Uy −5); không nhận trận ngoài đồng (quân lui về thành gần nhất, bỏ vây, Uy −5); bỏ thành không đánh (địch vào, lũy còn nguyên; đồn và quân ta trong thành rút về thành gần nhất, Uy −10, hơn −8 khi mất thành sau khi đánh thua, nhưng giữ được người). Thành ta không còn một cánh nào thì mất ngay, không bày trận.
- **Sau trận:** lấy được thành thì thành đổi chủ, lũy −1, việc đang làm mất, đồn = 20 % quân thắng, đạo quân vào thành còn 80 %, tướng trấn thủ bị bắt. Quân thủ thua rút về thành gần nhất của phe mình (từ 300 người; ít hơn thì nhập đồn thành đó; không còn thành thì tan, tướng bị bắt nếu người chơi đánh tan). Quân đánh thua đứng lại, trừ đạo còn dưới 300 người nhập đồn thành gần nhất. Uy người chơi: đánh thắng +4, đánh thua −6, mất thành −8, giữ được thành +5.
- **Tướng:** chỉ số 1–10; Trung dưới 70 mất tới 8 sĩ khí, từ 85 được +3, dưới 30 bỏ đi mang cả đạo quân; hứa cho làm tiên phong mà không cho đánh: Trung −15. Tù binh: chiêu hàng (Trung với chủ cũ từ 85: 25 % theo, không thì 60 %; không theo thì bị chém) hoặc thả về (Uy +6).
- **Dự đoán:** sự thật là 24 trận mô phỏng; tướng lệch cố định mỗi câu hỏi, tới ±(42 − 3,5·Mưu) % (`Battle.forecast`).
- **Chạm đáy:** lương âm thì 10 % quân bỏ trốn ngay khi cảnh báo.
- **Cảnh báo sớm, kèm cách cứu (GPT D9, chốt cho demo 29/9).** Mỗi mùa engine chiếu thu chi của mùa này (lệnh và việc đã chọn, không tính trận, AI, thẻ): lương âm cuối mùa này hay cuối mùa sau, hoặc Uy sắp về 0, thì có cảnh báo (`view.alerts`, và trong tóm tắt mùa) kèm ít nhất một cách cứu còn hợp lệ, có số: cho quân vào đồn (đồn ăn 0,05, kỵ ngoài trận 0,2), bỏ việc vừa chọn để hoàn lương, khai ruộng, lấy thêm thành (thu tính ngay mùa đó), thả tù binh (Uy). Không cách nào kịp thì nói thẳng.
- **Đề xuất của tướng (`V2.advise`, 29/9):** kế hoạch cả mùa từ những gì người chơi thấy (lệnh cho mọi đạo quân, việc cho thành, mỗi dòng một lý do); chế độ Xem chơi bằng nó, nút "Đề xuất" cho người mới. Không đọc AI, xúc xắc hay số thật của phe khác; nhớ điều thẻ mốc lịch sử đã nói (Trương Liêu trở lại).

## C. Mở: scale lên 20 châu và các câu chưa chốt

Không code như luật. Mục 5 (GPT audit thị trường và hệ thống, Grok cảm nhận cộng đồng, synthesis bằng tool khác; đang tạm dừng) trả lời:

- **"Mỗi thành một việc mỗi mùa" không phải Lõi cho 20 châu:** chơi được với 2–5 thành, thành bảng tính với 10–20 nơi. Cần: giao việc hay tự động hóa khi có nhiều thành; đơn vị quản lý là thành, châu hay "mặt trận đang nóng".
- Đi theo đường nhiều mùa và hậu cần dọc đường; dò thám và tình báo nhiều tầng, tin trễ nhiều mùa; liên minh có nghĩa vụ; quan hệ, kinh nghiệm, lên cấp của tướng; xưng thần, phục quốc, kế vị; vùng rìa chiêu binh và buôn bán; thuế, loại lính, hàng đợi; việc trong châu còn cái nào và ở dạng thẻ nào; điều kiện thắng khi đủ 20 châu.
- Từ lúc dựng engine: trận theo lượt có thay cú tung sức của game 20 châu không, hay chỉ cho lát Hoài Nam (`npm run sim -- 500 --battles`: bên đánh thắng 75 % so với 88 % của v1, cùng kết quả 85 %); đồng minh AI có đánh cùng trận không; hòa ở dã chiến thì ai giữ đất; Tài dùng vào đâu.
- Cảnh báo chạm đáy chỉ ra cách cứu (GPT D9): đã dựng cho demo (tầng B, 29/9); với 20 châu còn mở (nhiều thành, nhiều cách cứu, chọn cái nào để nói).

## Có trong engine / chưa

| Phần | Trạng thái |
| --- | --- |
| BattleDescriptor v2, làm mờ ±20 % cho bên kia trận | có (`0aef1b0`) |
| Trận theo lượt, lệnh, làn, tướng năm chỉ số; lệnh đề xuất cho mọi cánh (`autoOrders`), cánh không đụng giữ đề xuất (`resolve`) | có, API thuần (`c8cafc9`); chưa nối vào lượt |
| Dự đoán của tướng (`Battle.forecast`: đủ số; giao diện chỉ hiện nhãn, 2 sức, thương vong, 2 lý do) | có (`cf12192`) |
| Đạo quân trên map, lệnh theo đơn vị với mặc định Giữ, việc của thành, thẻ người và hàng chờ, chạm đáy, vây, tù binh | chỉ trong spike demo 1; chưa trong engine |
| Xem trước hệ quả (số mùa tới nơi, tài nguyên sau mùa); chọn 2–3 việc hợp ngữ cảnh | chưa có; cần hàm engine thuần để UI gọi |
| Đi theo đường nhiều mùa, qua Trường Giang cần thủy, dò thám | chưa có ở đâu |
| Chỉ số và đặc tính của từng tướng Tam Quốc | chưa có dữ liệu (`data/`, việc của Grok) |

## Test bắt buộc

- Có: `tests/battle-contract.test.mjs` (mỗi `attack` mang descriptor; ba ván v1 kết thúc y như trước; bên kia trận ±20 %), `tests/battle.test.mjs` (trận khớp spike từng seed; cánh không có lệnh nhận lệnh tự động; dự đoán lệch theo Mưu, không lộ tỉ lệ thật).
- Khi dựng phần còn lại: mùa kết thúc được khi không đạo quân, không thành nào có lệnh (quân Giữ, thành không khởi việc); không đạo nào nhận hai lệnh, không thành nào hai việc; thẻ không trả lời là "không"; chạm đáy hai mùa thì thua, một mùa thì không; quân xa không lộ số; một trận chạy hết được chỉ bằng đề xuất mặc định; xem trước hệ quả khớp với kết quả thật của mùa; thắng thua lát demo đo bằng máy (`npm run play`) trước khi đưa người lạ chơi.
