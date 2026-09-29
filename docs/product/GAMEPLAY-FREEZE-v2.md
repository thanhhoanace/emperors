# GAMEPLAY FREEZE v2 — nháp 2026-09-29

> **Trạng thái: nháp, chưa khóa.** Claude viết (ASSIGN mục 2, sau khi mục 1, 3, 4 đã chạy trong engine). Còn: GPT đọc phản biện ("chỗ nào chặt chẽ nhưng không vui, chỗ nào phải nghĩ hơn một lần chạm"; tạm dừng theo chủ dự án), rồi chủ dự án chốt. Khi chốt: file này thành `GAMEPLAY-FREEZE.md`, bản v1 thành log. **Tới lúc đó v1 vẫn là SOT của game đang chạy** (`game.html`, engine 20 châu).
> Nguồn: [DECISION.md](../phases/v2-gameplay/DECISION.md) (mục Sửa 28/9 tối), demo 1 (`docs/phases/v2-gameplay/demo1/src/hn-rules.js`, spike đã chơi), engine (`0aef1b0`, `c8cafc9`, `cf12192`). Số chi tiết: `rules.md`. Khi demo 1 và DECISION khác nhau, freeze theo DECISION và ghi lại.

## Khóa

- **Ván ngắn, vào là chơi.** Lát demo: Hoài Nam, Chu Nguyên Chương (Chung Ly, Âm Lăng) giữa Tào (Thọ Xuân) và Ngô (Lịch Dương), hào tộc Hu Dị; 5 thành. Thắng: đủ 5 thành. Thua: mất hết thành, Chu tử trận, hoặc chạm đáy hai mùa liền. Không khóa số lượt.
- **Một mùa chia theo đơn vị:** mỗi đạo quân một lệnh, mỗi thành một việc, thẻ người bất kỳ lúc nào trong mùa; bấm hết mùa thì mọi phe cùng đi. Không menu lệnh, không tab.
- **Ra lệnh bằng chạm bản đồ 3D** (`game.html`, điện thoại cầm ngang): chạm quân → chạm đích; chạm thành → chọn việc.
- **Số, không chữ.** Mọi trạng thái và ước lượng là số ít và rõ (quân, lương, tiền, Uy). Ngoại lệ duy nhất: dự đoán trận là nhãn của tướng, không in %.
- **Thẻ chỉ cho người:** sứ giả và liên minh, tù binh, tướng có chuyện, mốc lịch sử đế biết trước. Thẻ sinh từ bàn cờ và hậu quả thấy trên bản đồ; thẻ không trả lời trước hết mùa = "không".
- **Mỗi đế một tri thức tương lai đọc được trên bàn cờ** (thẻ mốc lịch sử: Chu biết Phàn Thành, Lã Mông áo trắng). Bốn đế khác nhau ở lựa chọn, không chỉ ở số.
- Giữ từ v1: Truth ≠ Perception ≠ Presentation; không bonus hard-code theo id châu; một máy + một giá; đo đường thắng, không chỉ tỉ lệ thắng.
- **Bỏ từ v1:** "1 phe / 1 lệnh / lượt" (nay mỗi đơn vị một lệnh); "không stack" (nay nhiều đạo hợp binh đánh một đích là một trận).

## Một mùa

1. **Lệnh đạo quân:** Đi (tới thành ta / thành bạn), Đánh (thành hoặc đạo quân địch trong tầm), Vây (đứng vây một thành), Giữ (đứng yên; bị đánh ngoài đồng thì dàn trận chờ sẵn, thủ +15 %). Nhiều đạo đánh cùng đích = một trận, tướng Uy cao nhất cầm.
2. **Việc của thành** (trả trước bằng tiền, lương; đổi ý trong mùa thì hoàn; việc đang làm không đổi): khai ruộng 2 mùa (lương thành này +25 %), đắp lũy 2 mùa (lũy +1, tối đa 4), dựng chợ 2 mùa (tiền +200 mỗi mùa), mộ bộ / cung / kỵ / thủy 1 mùa (+1.000 / 600 / 400 / 600 vào đồn, lấy từ dân; thủy chỉ thành ven sông). Giá: `rules.md` khi dựng.
3. **Chuyển quân** giữa đồn và đạo quân đứng trong thành: tự do trong mùa.
4. **Hết mùa, theo thứ tự:** thẻ chưa trả lời → "không" · lệnh AI · đi, vây · trận (của người chơi: theo lượt, người chơi ra lệnh; AI với AI: tự động) · vây (đồn −20 %, lũy −1, dân −8 %; thủ dưới 30 % quân vây thì mở cổng hàng) · việc của thành · thu, nuôi quân · Trung của tướng · chạm đáy · thắng thua · thẻ mùa sau.

## Quân

- **Đạo quân** = một tướng + `{ bo, cung, ky, thuy }`. Trên map: khối lính theo binh chủng, cờ phe, thẻ tướng kèm số quân.
- **Tầm một mùa:** bộ 108 km, kỵ (quá nửa đạo là kỵ) 135 km, thuyền 180 km trên một con sông. **DECISION:** đạo quân đi theo đường, xa thì nhiều mùa và tốn lương dọc đường. Demo 1 đo đường chim bay, một mùa tới nơi; đi nhiều mùa chưa dựng.
- **Nuôi quân** mỗi mùa (lương / người): bộ, cung 0,1; kỵ 0,2; thủy 0,15; đồn 0,05. **Thu:** lương = dân × 0,03 (ruộng +25 %), tiền = dân × 0,012 (+200 có chợ); thành miễn thuế không thu.
- **Binh chủng theo địa thế và thành:** kỵ mạnh đồng trống (+30 %), yếu trong rừng (−30 %), đánh tường ×0,35; bộ giữ thành, giữ trận chặn kỵ +50 %; cung bắn xa 2 hàng; thủy chỉ đi sông, +15 % ở bến, cần để qua Trường Giang (qua sông lớn không có thủy: **chưa dựng**).
- **Thấy quân** (DECISION): mọi đạo quân của mọi phe đều hiện. Gần đất hoặc quân ta (~100 km): số ước lệch tới ±20 %, cố định trong mùa. Xa: chỉ cờ và loại quân, không số. Dò thám mới ra số đúng. *Demo 1 cho xa ±50 %; freeze theo DECISION.* Engine đã có hàm làm mờ ±20 % cho trận (`perception.md`, Trận); cho đạo quân trên map: chưa.

## Trận

- **Dữ liệu:** mỗi trận là một BattleDescriptor v2 (`runtime-event.md`): nơi, tường 0–4, làn, hai bên `{ fid, gen, units }`, kết quả `{ win, losses, routed, turns }`. Có trong engine (`0aef1b0`); trận v1 cũng mang nó.
- **Theo lượt** (`src/engine/battle.js`, `c8cafc9`; luật chi tiết `rules.md`, Trận theo lượt): 3 làn × 6 hàng, tối đa 5 lượt; mỗi bên 1–6 cánh; mỗi lượt người chơi ra lệnh từng cánh (tiến, xung phong, giữ, bắn, vòng sườn, rút, hỏa công), cánh không có lệnh nhận lệnh tự động. Làn do bản đồ cho (đồng, bến, rừng, đồi). Trên bàn trận hai bên thấy số từng cánh (như demo 1).
- **Đánh thành:** chỉ thắng khi phá hết đồn hoặc có cánh qua một mặt tường bỏ trống; hết lượt 5 mà tường còn người giữ thì thành đứng. **Dã chiến:** hơn 20 % sức còn lại là thắng, không thì hòa.
- **Sau trận** (demo 1): lấy được thành thì thành đổi chủ, lũy −1, việc đang làm mất, đồn = 20 % quân thắng, đạo quân vào thành còn 80 %; tướng trấn thủ bị bắt. Quân thủ thua rút về thành gần nhất của phe mình (từ 300 người; ít hơn thì nhập đồn thành đó; không còn thành thì tan, tướng bị bắt nếu người chơi đánh tan). Quân đánh thua đứng lại, trừ đạo còn dưới 300 người nhập đồn thành gần nhất. Uy người chơi: đánh thắng +4, đánh thua −6, mất thành −8, giữ được thành +5.

## Tướng

- **Năm chỉ số 1–10 kiểu TW3K:** Uy (sĩ khí đầu trận), Tài (xây dựng, lũy: chưa có tác dụng số), Mưu (hỏa công, dự đoán), Dũng (sức đánh), Kiên (sức thủ). Cộng đặc tính (theo tác dụng: xung phong, giữ thành, thủy chiến, gan lì, xuất thân bần nông) và **Trung**.
- **Trung:** dưới 70 quân ông mất tới 8 sĩ khí, từ 85 được +3, dưới 30 ông bỏ đi mang cả đạo quân. Thẻ tướng đổi Trung (hứa cho làm tiên phong mà không cho đánh: −15).
- **Tù binh:** chiêu hàng (Trung với chủ cũ từ 85: 25 % theo, không: 60 %; không theo thì bị chém) hoặc thả về (Uy +6).
- **Dự đoán trước trận** (`Battle.forecast`, `cf12192`): tướng Mưu cao nhất bên đánh đọc trận kiểu Civ: sức hai bên, lý do ±%, thương vong ước, nhãn Thắng lớn / Thắng / Ngang ngửa / Thua / Thua lớn. Lệch cố định mỗi câu hỏi, tới ±(42 − 3,5·Mưu) %; đọc trên quân địch như perception cho thấy. Không bao giờ lộ tỉ lệ thật.

## Tài nguyên và chạm đáy

- Ba số: lương, tiền, Uy. Hiện bằng số, kèm thu / nuôi quân của mùa vừa rồi.
- **Chạm đáy:** hết mùa mà lương âm hoặc Uy 0 → cảnh báo một mùa (lương âm: 10 % quân bỏ trốn ngay). Mùa sau vẫn ở đáy → sụp: lương là binh biến, Uy là dân nổi dậy; ván thua.

## Cô lập kiến thức (giữ v1, thêm)

- `decide(fid)` chỉ nhận DecisionContext của phe mình; cấm đọc truth, doctrine, persona, prior của phe khác. RuntimeEvent là truth cho spectator, không phải input AI.
- Dự đoán của tướng và lệnh tự động đọc kế hoạch **như bên đó biết** (quân địch qua perception), không đọc truth.
- Bản đồ và cảnh trận chỉ vẽ từ TurnObservation của người chơi (hoặc RuntimeEvent ở `?demo=1`); cờ đế khách không lộ chữ thật.

## Có trong engine / chưa

| Phần | Trạng thái |
| --- | --- |
| BattleDescriptor v2, làm mờ ±20 % cho bên kia trận | có (`0aef1b0`) |
| Trận theo lượt, lệnh, làn, tướng năm chỉ số | có, API thuần (`c8cafc9`); chưa nối vào lượt |
| Dự đoán của tướng | có (`cf12192`) |
| Đạo quân trên map, lệnh theo đơn vị, việc của thành, thẻ người, chạm đáy, vây, tù binh | chỉ trong spike demo 1; chưa trong engine |
| Đi theo đường nhiều mùa, qua Trường Giang cần thủy, dò thám | chưa có ở đâu |
| Chỉ số và đặc tính của từng tướng Tam Quốc | chưa có dữ liệu (`data/`, việc của Grok) |

## Chưa chốt (không tự quyết trong lúc code)

Từ DECISION: việc trong châu còn cái nào và ở dạng thẻ nào; thuế, hậu cần, loại lính, hàng đợi; tướng quan hệ, kinh nghiệm, lên cấp; xưng thần, phục quốc, kế vị; tình báo nhiều tầng, tin trễ nhiều mùa; liên minh có nghĩa vụ; vùng rìa chiêu binh và buôn bán; **cách scale từ thành trong châu lên 20 châu** (mục 5, Grok / GPT, tạm dừng).
Thêm từ lúc dựng engine: trận theo lượt thay luôn cú tung sức của game 20 châu, hay chỉ cho lát Hoài Nam (`npm run sim -- 500 --battles`: bên đánh thắng 75 % so với 88 % của v1, khớp kết quả 85 %); đồng minh AI có đánh cùng trận không; hòa ở dã chiến thì ai giữ đất; Tài dùng vào đâu.

## Test bắt buộc

- Có: `tests/battle-contract.test.mjs` (mỗi `attack` mang descriptor; ba ván v1 kết thúc y như trước; bên kia trận ±20 %), `tests/battle.test.mjs` (trận khớp spike từng seed; dự đoán lệch theo Mưu, không lộ tỉ lệ thật).
- Khi dựng phần còn lại: một đạo một lệnh, một thành một việc; thẻ không trả lời là "không"; chạm đáy hai mùa thì thua, một mùa thì không; quân xa không lộ số; trận của người chơi không tự giải khi người chơi chưa ra lệnh xong; thắng thua lát demo đo bằng máy (`npm run play`) trước khi đưa người lạ chơi.
