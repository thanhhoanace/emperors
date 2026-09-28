# Research của Claude — phase v2-gameplay

> **Inbox, không phải knowledge base** (`AGENTS.md`, mục phase). Trạng thái hiện tại nằm ở `../WORKING.md`; quyết định nằm ở `../DECISION.md` khi có.
> Một file duy nhất của Claude cho phase này: chạy lại thì sửa file này, không tạo file mới. Git giữ lịch sử.
> Gom từ chín báo cáo vòng 9 (27–28/9/2026) từng nằm ở `docs/research/`. Nội dung và nguồn giữ nguyên; chỗ ghi "chưa kiểm chứng" / "(TT)" / "(F)" là thật sự chưa kiểm chứng. Tham chiếu chéo cũ kiểu "`market-player-demand.md`" nay là mục tương ứng bên dưới.
> Công cụ đo đi kèm: `tests/playthrough.mjs` (`npm run play -- 30 reasonable|turtle|hothead`) và `tests/sim.mjs`.

## Mục lục

- A. Phân tích ngã rẽ v2: vào là chơi hay chiến dịch sâu (28/9)
- B. Hiện trạng, số đo, 14 phát hiện, interview 25 câu (27/9)
- C. Nhu cầu người chơi, thị trường Việt Nam
- D. Loạn 12 Sứ Quân, xuyên không, IP Tam Quốc, xem mô phỏng
- E. Bằng chứng thiết kế: hoàn thành, nhanh mà sâu, chi phí game sâu
- F. TW3K và Civ VI: thắng, thua, lật lại, thông tin trước trận
- G. TW3K và Civ VI: giữ đất, mở ván, mộ binh, tướng, tương tác bản đồ
- H. Sương mù, tình báo, tin trễ, tin giả
- I. Liên minh, phòng thủ chung, cùng đánh

---

## A. Phân tích ngã rẽ v2: vào là chơi hay chiến dịch sâu (28/9)

<!-- nguồn cũ: docs/research/market-simple-vs-campaign.md -->

### Phân tích thị trường: "vào là chơi" hay "chiến dịch sâu"? (ngã rẽ v2)

> **Vai trò:** tổng hợp research cho câu hỏi của chủ dự án ngày 2026-09-28: v2 nên là game đơn giản, vào là chơi, kết quả nhanh, chơi đi chơi lại như cờ; hay chiến dịch tính toán, chi tiết, căng thẳng, dài?
> Ba báo cáo nguồn cùng thư mục, mỗi số liệu có URL và có đánh dấu chỗ chưa kiểm chứng: `market-player-demand.md` (nhu cầu người chơi, thị trường Việt Nam), `market-roots-trends.md` (Loạn 12 Sứ Quân, xuyên không, IP Tam Quốc, xem mô phỏng), `market-design-evidence.md` (lý thuyết thiết kế, tỉ lệ hoàn thành, game nhanh mà sâu, chi phí game sâu).
> Không phải SOT. Kết luận sẽ chép vào đề xuất Gameplay v2.

#### 1. Kết luận

**Ngã rẽ 1 hấp dẫn hơn cho dự án này**, với điều kiện đọc đúng chữ "đơn giản": đơn giản ở *luật và thời gian*, không đơn giản ở *hệ quả*. Thị trường không thưởng "nhanh và nông" (Polytopia bị chê thiếu chiều sâu) cũng không thưởng "sâu và dài" (đa số người mua Civ chưa từng thắng một ván). Thứ được thưởng là **luật ít, tương tác nhiều, ván ngắn, kết thúc rõ, có chuyện để kể lại**. Với Tam Quốc Loạn Nhập, mô hình đúng là **cờ Tam Quốc có máy sinh chuyện**: một ván 20–30 phút, vào chơi trong một phút, mỗi lượt một quyết định có đánh đổi rõ, ván sau cách một cú bấm; chiều sâu nằm ở tướng, liên minh, tin tức và một "tri thức tương lai" riêng của mỗi đế, không nằm ở sổ sách (thuế, hậu cần, loại lính, hàng đợi xây).

Ngã rẽ 2 thuần tuý là thứ thị trường đang rời bỏ ngay cả với Civ (Firaxis phải chia Civ VII thành ba kỷ nguyên vì dưới 50 % người chơi chơi hết một ván), và là thứ một người cộng agent không đủ sức làm ra AI, UI và cân bằng cho từng hệ thống. Tiền lớn của "chiến dịch sâu" đề tài Tam Quốc thực chất là SLG live-service theo mùa với áp lực liên minh, không phải chiều sâu chơi đơn.

Độ chắc: **trung bình**. Bằng chứng là tương quan (achievement Steam là mức sàn), không có số liệu riêng cho tệp người Việt mê Tam Quốc, và mô hình "sâu tuỳ chọn" mới được kiểm chứng ở quy mô studio 15 người (Old World). Phải kiểm bằng chơi thử sớm (mục 6).

#### 2. Bằng chứng

##### 2.1 Người chơi không chơi hết chiến dịch

| Game | Đã "vào cửa" | Từng thắng / chơi tới cuối |
| --- | --- | --- |
| Civilization VI | 74 % có 6 cải tiến | 37 % thắng ở mức thấp nhất trở lên; từng loại thắng 8–21 % |
| Civilization V | 89 % tìm ruin | 8,5 % đủ mọi kiểu thắng |
| Total War: Three Kingdoms | 88 % chiếm 1 vùng | 31 % xưng đế |
| Crusader Kings III | 61 % kết hôn | 4,4 % chơi tới 1453 |
| Europa Universalis IV | 28 % hôn nhân hoàng gia | 9 % chơi tới 1820 |
| Old World (đã khoá 200 lượt) | 66 % chơi 1 ván | 10,5 % thắng 1 ván |
| Humankind | 91 % chơi 10 lượt | 11–26 % thắng tuỳ độ khó |

Ed Beach (Firaxis): tỉ lệ hoàn thành một ván Civ VI "thấp đến mức đáng buồn, dưới 50 %", người chơi ghét nhịp cuối game "click here, click here". Soren Johnson (Civ IV, Old World): "nửa đầu 4X là phần hay nhất", "phần khó nhất của 4X là kết thúc, chưa ai làm tốt"; Old World khoá 200 lượt "để người ta thật sự chơi hết", vẫn chỉ 10,5 %.

##### 2.2 Khẩu vị dịch về ngắn, và ngắn đang thắng

- Quantic Foundry (1,5 triệu người, 2015–2024): 67 % người chơi hôm nay quan tâm "suy nghĩ chiến lược" *ít hơn* người chơi trung bình năm 2015; mức giảm lớn nhất trong mọi động cơ. Newzoo: nhóm "Time Filler" 27 % là nhóm lớn nhất. GameAnalytics 2025: phiên mobile thể loại chiến thuật 5–6 phút, 4 phiên một ngày; phiên PC mọi thể loại trung vị 18 phút. Board gamer chấm cao nhất cho game 3–4 người, 30–60 phút.
- Chess.com: 8,7 triệu người chơi mỗi ngày, khoảng 27 triệu ván mỗi ngày (quý 4/2025). Lichess: 92 triệu ván có xếp hạng một tháng (8/2026). Polytopia: 25 triệu lượt tải, chế độ Perfection đúng 30 lượt, khoảng 30 phút, triết lý "bỏ đi càng nhiều càng tốt, trông phải như bàn cờ". Marvel Snap thiết kế trận 3 phút. OpenFront.io: trò chiến lược trình duyệt mã mở, hơn 1 triệu người chơi một tháng, không tài khoản, bấm là vào; territorial.io 5 triệu lượt tải, "ván dưới 5 phút"; War.app hơn 10.000 ván mỗi ngày, lượt đồng thời, chơi bất đồng bộ.
- Civilization: Eras & Allies (2K, mobile 4X) đóng cửa 6/2026.

##### 2.3 Tiền lớn của "Tam Quốc sâu" là mùa giải, không phải chơi đơn

Three Kingdoms Tactics 1,2 tỉ USD; Rise of Kingdoms 3,5 tỉ USD; một mùa 50–75 ngày, liên minh là động cơ. Ở Việt Nam, Tam Quốc Chí – Chiến Lược lên Top 1 doanh thu App Store đúng lúc mở mùa mới, doanh thu tuần tăng 117 % khi reset mùa: người chơi trả tiền cho **chu kỳ ngắn, bắt đầu lại**, không cho một chiến dịch dài. TW3K bán 1 triệu bản tuần đầu nhưng người chơi đồng thời nay còn khoảng 2 % đỉnh. Chiều sâu chơi đơn bán được (Civ hơn 70 triệu bản cả dòng) nhưng cần studio hàng trăm người và chính họ đang cắt nhỏ ván.

##### 2.4 Việt Nam

- Thị trường 655 triệu USD (2024), mobile áp đảo, 4X mobile ở Đông Nam Á tăng 17,6 % quý 1/2025. Khoảng 16 game Tam Quốc ra mắt riêng năm 2024; chính báo chí game gọi đề tài này là "bão hoà" nhưng "không bao giờ lỗi mốt".
- Văn hoá chiến thuật của người Việt là **một trận có thắng thua trong một lần ngồi rồi đấu loạt**: Đế Chế (Chim Sẻ Đi Nắng 126.086 người xem đồng thời), cờ tướng ZingPlay hơn 1 triệu lượt tải. Phiên chơi mobile ở Việt Nam dài (khoảng 51 phút) nhưng gồm nhiều ván.
- Indie Việt: không có tiền lệ chiến thuật thành công; ca thành công là thể loại quốc tế bán ra ngoài (God of Weapons 100.000 bản hai tuần, Caravan War 1 triệu tải); ca thất bại là đề tài sử Việt, nội địa, quy mô lớn (Thuận Thiên Kiếm, 7554, Sử Hộ Vương). Tệp thực tế cho một game trình duyệt miễn phí không gacha: **vài nghìn người thử tháng đầu nếu có clip lan, vài trăm quay lại**. Phải đo thành công bằng clip được xem và ván được chia sẻ, không bằng DAU.

##### 2.5 Gốc của ý tưởng nói gì

- **Loạn 12 Sứ Quân** là ít nhất sáu game khác nhau (2007–2026). Bản được khen về gameplay (text game 2007) được khen vì "dễ hiểu, dễ học, cách chơi không phức tạp"; bị chê ở chỗ phải *chờ tài nguyên* kiểu OGame. Ký ức cộng đồng là **nhiều phe, bản đồ tranh hùng, gặp danh nhân qua từng trận**, không phải một hệ thống sâu nào. Gốc này nghiêng về ngã rẽ 1.
- **Xuyên không** rất lớn (Trung Quốc 575 triệu người đọc văn học mạng 2024). Độc giả Việt của Tam Quốc xuyên không (thread review 110.000 lượt xem) thưởng "logic hợp lý, ít ảo tưởng, phải có tiền, có lương, có quân", phạt "quá bá, harem". Mobile Việt bán xuyên không như roster liên triều (Tam Quốc Tứ Thời Ca, 9/2026). Fantasy đúng là **dựng nghiệp từ tay trắng bằng tri thức tương lai**, nhưng thứ được thưởng là *cá tính của cách dựng nghiệp*, không phải số lượng hệ thống. Gốc này thoạt nhìn ủng hộ ngã rẽ 2, thực ra chỉ đòi mỗi đế một "tri thức tương lai" đọc được ngay trên bàn cờ.

##### 2.6 Xem và cắt clip

Cờ vua trên Twitch (PogChamps đỉnh 166.000 người xem), TFT 241 triệu giờ xem một năm, Civ Battle Royale (AI-only, 61 phe, show hàng tuần nhiều năm), Drew Durnil 1,53 triệu sub khởi nghiệp bằng AI-only rồi bỏ vì "vắt kiệt", đua bi Jelle's 1,5 triệu sub. Công thức chung: **phe ít, màu cố định, tường thuật hoặc bảng xếp hạng theo tập, lật kèo, kẻ yếu sống sót, nhịp ngắn**. Trận ngắn cho nhiều khoảnh khắc đóng gói sẵn; chiến dịch dài cho khoảnh khắc lớn nhưng thưa và cần biên tập nặng.

##### 2.7 Chi phí và rủi ro của game sâu

Humankind 69 % tích cực, Millennia 67 % rồi tụt 45 %: vỡ ở **độ rõ, nhịp cuối game, AI**, không phải thiếu tính năng, dù ngân sách lớn hơn ta nhiều lần. Game sâu thành công với đội nhỏ (RimWorld, Old World, Dominions, Songs of Syx) đều có **một cỗ máy sinh chuyện** (nhân vật, sự kiện) và mất **nhiều năm lặp**. Mỗi hệ thống thêm vào 4X = một màn UI + một nhánh AI + một trục cân bằng.

#### 3. Hai ngã rẽ trên chín tiêu chí

| Tiêu chí | Ngã rẽ 1: vào là chơi | Ngã rẽ 2: chiến dịch sâu |
| --- | --- | --- |
| Thời gian tới quyết định đầu | dưới 1 phút | 10–30 phút học luật |
| Tỉ lệ chơi hết một ván | cao (cờ, Polytopia) | 10–37 % (4X), 4–9 % (grand strategy) |
| Chơi lại | ván sau cách một bấm; đổi đế, đổi seed | bắt đầu lại một chiến dịch nặng |
| Clip trên giờ phát triển | nhiều khoảnh khắc ngắn | thưa, cần biên tập |
| Chi phí AI, UI, cân bằng | một lệnh chính, ít màn hình | mỗi hệ thống một màn hình và một nhánh AI |
| Hợp web tĩnh GitHub Pages | rất hợp (mô hình OpenFront) | ngược (phiên dài, cần lưu, cần cloud) |
| Khán giả Việt | Đế Chế, cờ tướng, TikTok Tam Quốc | SLG mùa giải, thứ một người không vận hành được |
| Fantasy xuyên không | phải nén "tri thức tương lai" thành một luật mỗi đế | tự nhiên hơn nhưng dễ thành sổ sách |
| Rủi ro chính | nông, mau chán (Polytopia bị chê) | không rõ, không ai chơi hết, AI kém |

#### 4. Ngã rẽ thứ ba: cờ Tam Quốc có máy sinh chuyện

Không chọn "đơn giản" hay "sâu" mà chọn **nén**: nén không gian, thời gian, kinh tế cùng lúc (Polytopia), giới hạn hành động mỗi lượt để ép đánh đổi (Orders của Old World), minh bạch thông tin (Into the Breach), và một máy sinh chuyện từ nhân vật (RimWorld). Hình dạng đề xuất cho v2:

| Tham số | Đề xuất | Căn cứ |
| --- | --- | --- |
| Vào chơi | link → chọn đế → lệnh đầu trong 60 giây; không tài khoản; luật học qua ba lượt đầu | OpenFront, territorial |
| Một ván | **32 mùa (8 năm) mặc định, 20–30 phút**; tuỳ chọn 48 cho ai muốn dài; kết thúc bằng điểm đa trục (châu, tướng, uy) + xếp hạng; seed ngày | Polytopia 30 lượt, Slay the Spire Daily Climb, board game 30–60 phút |
| Một lượt | **1 lệnh triều đình + 1 việc phụ** (mỗi châu chọn 1 trong 3 khi có gì mới); reveal đồng thời là khoảnh khắc chính | Meier, Orders, War.app |
| Mở ván "từ tay trắng" | 8–12 lượt đầu là cung mọc lên: một tài nguyên, ba bậc thành, mỗi đế **một tri thức tương lai** đọc được trên bản đồ (Tần: pháp trị và đường; Lý: chiêu hiền và kỵ; Chu: đồn điền, cao trúc tường; Vũ: viễn chinh, muối sắt) | Polytopia, chủng điền văn |
| Tướng | 3 chỉ số + 1 tính cách + 1 quan hệ (trung, thù, ơn); chết, hàng, phản xảy ra lúc reveal | RimWorld, Old World, TW3K guanxi |
| Liên minh | hai điều khoản có nghĩa vụ (phòng thủ chung, cùng đánh), có hạn; phá ước là cờ công khai | Civ VI, TW3K |
| Tình báo | một dạng do thám (nhìn một phe hoặc một châu trước reveal); tin đồn trễ một lượt; mưu cắm tin giả | Into the Breach, ROTK 8, Kriegsspiel |
| Lật lại | lưu vong có hạn (rẻ, kịch tính, như Lưu Bị không đất); xưng thần và phục quốc để sau nếu chơi thử cần | TW3K |
| Trận | cắt cảnh 3–5 giây + lý do thắng thua bằng chữ; yếu tố: tướng, địa hình và sông, đồn trú theo châu (tự động từ luỹ và tướng giữ); không hậu cần, thuế, loại lính | Civ VI preview, TW3K đồn trú |
| Xem | chế độ AI-only chạy 60 giây; bản tin lượt tự sinh; bảng xếp hạng quyền lực đổi theo lượt; seed chia sẻ | Civ Battle Royale, marble runs |

Xếp theo **chuyện sinh ra trên mỗi giờ phát triển**:

| Mức | Việc |
| --- | --- |
| Cao | tướng có tính cách và quan hệ; phản bội, đầu hàng lúc reveal; sự kiện mùa theo seed; biên niên tự sinh cuối ván; tri thức tương lai mỗi đế |
| Trung bình | liên minh có hạn và nghĩa vụ; một dạng do thám; tin giả; lưu vong; vùng rìa chiêu binh và buôn bán qua việc phụ |
| Thấp (sổ sách, cắt hoặc tự động) | đồn trú tay từng châu, nhiều loại lính, thuế, hàng đợi xây, cây công nghệ dài, ngoại giao nhiều màn, hành quân nhiều lượt, tiếp tế |

#### 5. Đối chiếu với câu trả lời interview 27/9

| Câu trả lời | Giữ, nén hay lùi |
| --- | --- |
| Chơi là chính; mốc thắng 20–30 % | Giữ. Thêm hai mốc: trên 60 % người chơi hết ván đầu, trên 40 % chơi ván thứ hai |
| Mở ván xây dần, không nhận sẵn đại quân | Giữ, nén thành 8–12 lượt đầu với một tài nguyên và ba bậc |
| Việc trong châu: dân, tiền, lương, mộ, xây, đồn trú, bổ nhiệm, buôn; việc 2–3 lượt | Nén: một việc phụ mỗi lượt, ba lựa chọn; phần còn lại tự động. Việc 2–3 lượt giữ cho xây thành và vây thành |
| Trận: tướng, địa hình và sông, đồn trú theo châu, hành quân xa và tiếp tế | Giữ ba yếu tố đầu; hành quân xa, tiếp tế, thuỷ quân riêng để sau |
| Lật lại: cả ba đường | v2 làm lưu vong; xưng thần và phục quốc sau chơi thử |
| Liên minh kiểu Civ + deal có nghĩa vụ | Giữ, hai điều khoản |
| Tướng đủ bốn lớp | Giữ ba (chỉ số, sự kiện, bổ nhiệm); quan hệ nén còn một quan hệ; kinh nghiệm và lên cấp lùi |
| Tình báo có trễ, tin giả | Giữ ở dạng một lệnh do thám và tin đồn trễ một lượt |
| Vùng rìa chiêu binh và buôn bán | Giữ, qua việc phụ, không thêm màn hình |
| Ngân sách lệnh theo TW3K/Civ | Chốt 1 + 1 |
| Cửa kịch bản cho phe liên quan; cắt cảnh trận trước | Giữ |

#### 6. Thước đo và cách kiểm chứng

- Chơi thử 10 người, mỗi người hai ván, trước khi Grok code luật: đo phút tới lệnh đầu, phút một ván, tỉ lệ chơi hết, tỉ lệ bấm ván nữa, ba khoảnh khắc họ kể lại. Mốc: lệnh đầu dưới 60 giây, ván dưới 30 phút, hơn 60 % chơi hết, hơn 40 % chơi tiếp, mỗi người kể được ít nhất một khoảnh khắc có tên tướng.
- Sau khi phát hành: số clip và số seed được chia sẻ, tỉ lệ người xem thành người chơi. Không đặt mục tiêu DAU.
- `npm run play` đo đường thắng mỗi vòng (mục tiêu 20–30 %, chết trước lượt 16 dưới 5 %).

#### 7. Benchmark

The Battle of Polytopia (4X nén 30 lượt), OpenFront.io (chiến lược trình duyệt vào là chơi, mã mở để học onboarding), Into the Breach (chiều sâu từ minh bạch, độ dài tự chọn), Slay the Spire (vòng lặp chơi lại, seed ngày), Total War: Three Kingdoms (sức hút đề tài và bài học 31 % hoàn thành), Unciv (Civ-lite mã mở 1 triệu tải).

#### 8. Chưa chắc

Không có dữ liệu tỉ lệ dùng tốc độ Quick trong Civ; không có dữ liệu hoàn tiền theo thể loại; số người dùng Steam Việt Nam và độ dài trận Đế Chế thông thường không có nguồn đáng tin; lượt xem YouTube/TikTok bị chặn truy cập; khán giả Việt mê Tam Quốc có thể chuộng chiều sâu tướng lĩnh hơn trung bình thị trường. Chi tiết trong mục "chưa kiểm chứng" của ba báo cáo nguồn.

---

## B. Hiện trạng, số đo, 14 phát hiện, interview 25 câu (27/9)

<!-- nguồn cũ: docs/research/gameplay-interview-2026-09-27.md -->

### Vòng 9 — Gameplay & game feel: đang pending / unknown ở đâu (interview)

> **Vai trò:** research + bộ câu hỏi để chủ dự án quyết hướng vòng tới. Không phải SOT: câu trả lời sẽ chép vào `GAMEPLAY-FREEZE.md` (luật), `docs/status.md` (việc), ADR (quyết định khó đảo).
> Ngày đo: 2026-09-27, nhánh `claude/gracious-pasteur-6s8fmk`, HEAD `2fc1351`.
> Cách trả lời: điền vào dòng **Trả lời:** dưới mỗi câu, hoặc trả lời theo số câu trong chat.

#### 1. Tóm tắt một phút

- Máy đã có đủ: engine 219, perception, vòng lượt v1.1 (`game.html`), 88 test xanh. Cái **chưa có** là *trải nghiệm chơi*: người chơi không biết mình đang cố đạt gì, không ước được một trận, không thấy cốt truyện, và bốn đế chơi giống nhau.
- Với cách chơi hợp lý (đánh láng giềng yếu hơn, chiêu trung lập, còn lại nội chính) **không đế nào thắng** (0–3 %), chết trung bình ở lượt 12–26. Chơi rùa thì sống nhưng cũng không thắng. Đánh liên tục thì chết trước lượt 20.
- Thế giới **quá loạn**: trung bình 1,6–2,0 châu đổi chủ mỗi lượt; Hứa Xương (thủ phủ Tào) đổi chủ 7–17 lần một ván. Tin "X nay thuộc Y" thành nhiễu, không đọc được thế cục.
- Bảy trên chín cửa kịch bản (Quan Vũ vây Phàn, Ngô nhìn Kinh, Nghiệp lộ sườn…) **không bao giờ tới người chơi** — chỉ diễn ở `?demo=1`.
- Hán Vũ Đế ở Hà Tây chỉ kề đúng một châu (Lũng Tây của Tần): "Viễn chinh" không có đâu để đi.
- Phần lớn việc còn lại **không phải unknown kỹ thuật** mà là **pending quyết định của chủ dự án** (mục 6). Mục 7 là 16 câu hỏi (Q0–Q15) để chốt; **mục 9 là kết quả interview** (đã trả lời 25 câu trong chat cùng ngày).

#### 2. Đã đo bằng gì

| Việc | Lệnh | Kết quả |
| --- | --- | --- |
| Test engine + controller + presenter | `node --test "tests/*.test.mjs"` | 88 pass, 0 fail |
| Cân bằng AI-only | `node tests/sim.mjs 300` | mục 4.1 |
| Chơi thử headless qua đúng vòng lượt của `game.html` | `node tests/playthrough.mjs 30 reasonable` (+ `turtle`, `hothead`) | mục 4.2 |
| Đọc | mọi file `docs/product/**`, `docs/design/direction.md`, ADR, `src/engine/**`, `src/world/game-controller.js`, `player-ui.js`, `event-presenter.js`, `hud.js`, test e2e | mục 3, 5 |

`tests/playthrough.mjs` mới thêm trong vòng này: chơi N seed mỗi đế bằng một chính sách cố định, in ra những gì người chơi *sống qua* (sống bao lâu, thấy gì mỗi lượt, bản đồ loạn cỡ nào). Ba chính sách: `reasonable` (đói thì nội chính; đánh châu kề có band thấp hơn quân mình; chiêu trung lập; còn lại xây), `turtle` (không bao giờ đánh), `hothead` (đánh mỗi lượt). Chính sách thô, người thật có thể khá hơn — số ở đây là *hướng*, không phải trần.

#### 3. Hiện trạng: cái gì đã có

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

#### 4. Số đo

##### 4.1 AI-only (`tests/sim.mjs 300`)

| | Lý | Tào | Lưu Bị | Tôn | Chu | Tần | Vũ |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Thắng | 29 % | 25 % | 20 % | 8 % | 7 % | 6 % | 4 % |

- 65 % ván kết thúc "xưng bá" ở lượt 48 (không ai đủ 12 châu); 35 % thống nhất.
- 100 ván: đế chết 183 lần — 127 do Tam Quốc, 56 do đế khác. Trước lượt 8: 51 cái chết, trong đó **Tào diệt Tần 30 lần**. Cơ chế: Tần (hiếu chiến) đánh Tào → mất bảo hộ với Tào → Tào đánh trả với hơn nửa tổng quân → Tần 1 châu = chết.
- 1,76 châu đổi chủ mỗi lượt; Hứa Xương đổi chủ 16 lần một ván.

##### 4.2 Người chơi (`tests/playthrough.mjs`, 30 seed mỗi đế)

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

#### 5. Phát hiện

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

#### 6. Bản đồ pending / unknown

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

#### 7. Interview

Trả lời bằng chữ cái, hoặc ghi ý riêng. "Đề xuất" là ý của Claude sau khi đo, không phải mặc định.

##### A. Hướng và thước đo

**Q0. Anh đã chơi thử `game.html` chưa?** Nếu rồi: ba khoảnh khắc nhớ nhất (một chỗ thích, một chỗ khó chịu, một chỗ không hiểu). Nếu chưa: `npm start` → `/game.html?seed=219`, chơi 10 lượt bằng Lý Thế Dân rồi trả lời.
Trả lời: Đã chơi, chưa ổn. Nguyên văn: đang *xem* game chứ không được *chơi*; thao tác cho người chơi không nhiều; tấn công chỉ được xem cảnh quân chạy; không tương tác với bản đồ như dat.city; không tương tác với quân và đất của mình; câu chuyện về tướng, buff/nerf chưa có.

**Q1. Ưu tiên bây giờ là gì?** Kịch bản gốc nói "trọng tâm: xem và quay clip"; anh vừa nói gameplay/game feel gần như chưa có.
- A. *Chơi* là chính cho `game.html`; clip ở `?demo=1` và cảnh diễn trong lúc chơi.
- B. Clip là chính; `game.html` chỉ cần chơi được để quay.
- C. Hai sản phẩm tách hẳn (trang chơi, trang xem).
Đề xuất: A — cảnh diễn đang có đã phục vụ clip; cái thiếu là phía chơi.
Trả lời: A. Chơi là chính; clip ở `?demo=1` và cảnh diễn trong lúc chơi.

**Q2. "Chơi được" đo bằng gì?** Freeze nói "đo đường thắng, không chỉ win %" nhưng chưa có mốc.
- A. Người chơi biết luật thắng 25–40 % ván; ván 20–30 phút; sống qua lượt 16 ở 80 % ván.
- B. Sống sót và giữ hạng là mục tiêu; thắng thật hiếm (như hiện nay).
- C. Mốc khác: ____
Đề xuất: A, và ghi vào freeze để `tests/playthrough.mjs` đo mỗi vòng.
Trả lời: Research TW3K/Civ trước (đã làm: `tw3k-civ-win-defeat.md`). Sau research chốt: người chơi hợp lý thắng **20–30 %** (khó hơn đề xuất), bị loại trước lượt 16 dưới 5 %, sống tới lượt 48 trên 75 %, ván 20–40 phút.

**Q3. Mất hết châu là chết ngay?** Hiện 1 châu thua 1 trận thủ = diệt vong, không cảnh báo (F2).
- A. Giữ, nhưng UI cảnh báo rõ trước lệnh rủi ro và sau trận thủ thua.
- B. Thêm đường lui một lần: mất thủ phủ khi còn 1 châu → chạy sang châu kề còn trống hoặc trung lập với nửa quân (lưu vong), rồi mới chết nếu mất tiếp.
- C. Giữ nguyên, không cảnh báo (chủ ý khắc nghiệt).
Đề xuất: B, vì cả 3 chính sách đều chết ở lượt 7–26 mà không có "hồi hai".
Trả lời: Research trước; nghiêng về lưu vong / có cách lật lại. Sau research chọn **cả ba**: lưu vong có hạn (như Lưu Bị không đất trong TW3K), xưng thần (chư hầu), phục quốc / trung thành (như Civ VI).

##### B. Luật cần anh quyết (Grok sửa)

**Q4. Thế giới loạn (F1) có chấp nhận không?**
- A. Sửa luật thủ: quân trấn theo châu (không chia đều), hoặc thủ phủ/châu vừa chiếm cần 2 lượt mới hạ, hoặc châu vừa đổi chủ được 1–2 lượt "củng cố" tự động. Mốc đo: ≤ 0,7 châu đổi chủ mỗi lượt, Hứa Xương ≤ 3 lần một ván.
- B. Giữ luật, chỉ lọc tin (gộp "X nay thuộc Y" thành một dòng tổng).
- C. Khác: ____
Đề xuất: A. Lọc tin không sửa được cảm giác bản đồ nhấp nháy.
Trả lời: Research TW3K/Civ trước (đã làm: `tw3k-civ-buildup-economy-generals.md`, mục 1). Hướng: đồn trú theo châu thay vì chia đều, thành phải vây nhiều lượt, hồi quân chỉ ở đất mình.

**Q5. Bảo hộ khách nên là gì?**
- A. Giữ luật, thêm giới hạn phản công: phe bị đế đánh chỉ được đánh trả *một* lần trong 8 mùa, rồi bảo hộ lại có hiệu lực.
- B. Bảo hộ theo *thủ phủ đế* chứ không theo "đúng 1 châu": thủ phủ được bảo hộ tới hết lượt 8 dù đế đã có 2 châu; châu mới không được bảo.
- C. Giữ nguyên: bẫy là chủ ý, đế hiếu chiến phải trả giá.
Đề xuất: B — cho đế một cửa sổ mở rộng thật sự (43 % Lý có 2 châu trước lượt 8 rồi mất sạch).
Trả lời: Research thêm. Ý chính: vừa vào ván đã được cho 1 châu + quân là sai cảm giác; muốn **đi từ đầu như Civ**: châu nhỏ, quân ít, xây dần (Q7 vòng chat).

**Q6. Hán Vũ Đế ở ngõ cụt (F3).**
- A. Thêm cạnh graph: `hexi`–`bing` (thảo nguyên) hoặc `hexi`–`guan`.
- B. Thêm ô trung lập "Tây Vực / Đại Uyển" kề `hexi` để chiêu hoặc đánh (nhãn cửa Hán đã có trên bản đồ, ADR 0006).
- C. Giữ: Vũ là đế ngoại giao/mưu; cần deal "mượn đường" (F13) mới đi được.
Đề xuất: B — khớp "khai hoang rìa" của kịch bản; A đổi địa lý, C phụ thuộc deal chưa có.
Trả lời: Đúng, thêm Tây Vực, Giao Chỉ / Đại Việt, Tây Tạng. Vai trò: **vùng chiêu binh và buôn bán**, không chiếm được, không tính vào 20 châu (giữ ADR 0006). Mục tiêu: thể hiện được việc chiêu binh và kinh doanh.

**Q7. Người chơi được biết gì trước khi đánh (F4)?**
- A. Chỉ band + tướng + lũy như hiện nay (giữ contract).
- B. Thêm địa hình và thủ phủ của châu đích (đều là địa lý công khai) và một chữ ước lượng do *UI* tính từ quân mình + band + lũy + địa hình: "Bất lợi / Ngang / Có lợi". Không đưa vào DecisionContext, AI không dùng.
- C. Hiện tỉ lệ số (như Civ).
Đề xuất: B. Không lộ quân địch, nhưng người chơi hết "học bằng cách chết".
Trả lời: B. Ước lượng bằng chữ, tính từ tình báo và do thám; tin có thể bị mưu kế làm sai lệch. Liên minh phải có hỗ trợ thủ và cùng đánh (xem Q14 vòng chat).

**Q8. Cửa kịch bản tới người chơi (F5)?**
- A. Mọi cửa tension thành tin đồn công khai cho cả 7 phe (chỉ chữ + nhãn công khai, không actor ẩn).
- B. Chỉ phe kề hoặc được nêu tên trong cửa mới thấy (Lý thấy "Nghiệp lộ sườn", Tần không).
- C. Giữ: cửa chỉ cho spectator/demo.
Đề xuất: B. Cốt 219 là lý do chọn mốc này; người chơi phải thấy nó.
Trả lời: B. Phe kề hoặc được nêu tên trong cửa thấy cảnh; phe khác nhận tin đồn trễ.

##### C. Cảm giác chơi và tương tác (Claude làm)

**Q9. Bản đồ là bàn phím (F10)?** Click thành để chọn đích, click châu mình để chọn nơi xuất quân, hover hiện thẻ tin tình báo; danh sách trái vẫn giữ.
- A. Làm ngay vòng tới.
- B. Sau khi luật (Q4–Q7) ổn.
Đề xuất: A — độc lập với luật, đổi hẳn cảm giác "chơi trên bản đồ".
Trả lời: A. Làm ngay: tương tác bản đồ như dat.city là điểm chủ dự án nêu đầu tiên.

**Q10. Kết quả lượt (F8).**
- A. Thẻ tổng kết cuối lượt: delta Quân/Lương/Dân/Uy có chuyển động, lý do thắng/thua bằng chữ (thành cao, địa hình hiểm, quân đông), tên kế địch dùng, nội dung "biến cố". Cần Grok gắn `code`/`sub` (chặn 1–3).
- B. Chỉ delta số, chưa cần lý do.
- C. Giữ.
Đề xuất: A; phần delta làm được ngay, phần lý do chờ chặn 1–3.
Trả lời: A. Thẻ tổng kết có delta và lý do; thêm: chọn tướng và số quân đem, chọn cách đánh, cắt cảnh trận có diễn biến; cả phòng thủ (quân đông không tự thắng).

**Q11. Xếp thứ tự ba việc hình (F11):** cắt cảnh trận 3–5 s (ADR 0004) · chân dung 7 lãnh đạo + tướng chính · âm thanh (nhạc nền, trống trận, sứ giả). Ghi thứ tự, hoặc gạch cái không cần.
Đề xuất: cắt cảnh trận → chân dung → âm thanh.
Trả lời: Cắt cảnh trận → chân dung → âm thanh.

**Q12. Mục tiêu và onboarding (F9):** hiện điều kiện thắng và đồng hồ 48 lượt trên bảng trạng thái; cảnh báo "đánh phe này = mất bảo hộ với phe này" ngay trong thẻ đích; ba gợi ý lượt đầu.
- A. Làm ngay (rẻ, không đụng luật).
- B. Sau.
Đề xuất: A.
Trả lời: Để vào v2.

**Q13. Lưu ván (F12):** tự lưu vào trình duyệt sau mỗi lượt, nút "Tiếp tục" ở màn đầu, seed hiện để chia sẻ.
- A. Làm ngay. B. Sau.
Đề xuất: A khi ván dài 20–30 phút.
Trả lời: Để vào v2.

##### D. Phạm vi vòng tới

**Q14. Thứ tự hai lane.**
- A. Game feel + cân bằng trước (Q4–Q7, Q9–Q12), A.5 sau.
- B. A.5 (bốn máy) trước.
- C. Song song: Grok làm Q4–Q7 + chặn 1–3 + tướng đổi chủ; Claude làm Q9–Q13.
Đề xuất: C — hai lane không đụng file nhau; A.5 chỉ có nghĩa khi đế sống qua lượt 16.
Trả lời: Giữ hai lane. Claude viết đề xuất Gameplay v2 + prototype duyệt trước; Grok làm engine, luật, test, cân bằng theo v2 đã duyệt. A.5 gộp vào v2.

**Q15. Phát hành và LLM (F14).**
- A. Pages trỏ `game.html` sau khi Q4–Q5 xong; LLM sau launch.
- B. Trỏ `game.html` ngay (chấp nhận hiện trạng), LLM sau.
- C. LLM là điều kiện launch.
Đề xuất: A.
Trả lời: Trỏ Pages sang `game.html` ngay (đã làm 2026-09-27: `index.html` chuyển hướng, clip cũ thành `phase1.html`); LLM sau.

#### 8. Làm được ngay, không cần chờ trả lời

- Grok: gắn `code` cho event nội bộ (lương cạn, dời thủ phủ, hủy binh vì minh, bội minh, đường bị cắt, đón Hiến Đế), `sub` cho `stratagem`, giữ `code` trong `observePact` (chặn 1–3 trong `status.md`); `governors` đổi theo chủ châu.
- Claude: hiện điều kiện thắng + đồng hồ lượt; cảnh báo phá ước trong thẻ đích; delta số sau lượt; chạy lại đủ `tests/e2e/game-loop.mjs`.
- Đo lại sau mỗi vòng: `node tests/playthrough.mjs 30 reasonable` và `node tests/sim.mjs 300`, ghi số vào `status.md`.

#### Phụ lục A — 12 lượt đầu của Tần Thủy Hoàng, seed 1, chính sách reasonable

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

#### 9. Kết quả interview (2026-09-27, trong chat)

Chủ dự án trả lời 25 câu (16 câu ở mục 7 cộng các câu nảy sinh). Quyết định, theo chủ đề:

| Chủ đề | Quyết định | Đi vào đâu |
| --- | --- | --- |
| Cảm nhận chơi thử | "Đang xem chứ không chơi": ít thao tác; đánh chỉ xem quân chạy; không tương tác bản đồ như dat.city; không tương tác quân/đất mình; chưa có chuyện tướng, buff/nerf | Định hướng cả vòng v2 |
| Ưu tiên | Chơi là chính; clip ở `?demo=1` và cảnh diễn trong lúc chơi | Freeze v2 |
| Mốc "chơi được" | Người chơi hợp lý thắng 20–30 %; bị loại trước lượt 16 dưới 5 %; sống tới lượt 48 trên 75 %; ván 20–40 phút; độ khó là núm riêng | Freeze v2, đo bằng `npm run play` |
| Lật lại khi sắp chết | Cả ba: lưu vong có hạn, xưng thần (chư hầu), phục quốc / trung thành | Luật v2 |
| Thế giới loạn | Sửa theo mô hình research: đồn trú theo châu, vây thành nhiều lượt, hồi quân ở nhà; mốc dưới 0,7 châu đổi chủ mỗi lượt | Luật v2 |
| Mở ván | Không nhận sẵn đại quân: châu nhỏ, quân ít, xây dần ("đi từ đầu như Civ"); bảo hộ khách 8 mùa thiết kế lại theo đó | Luật v2 |
| Vùng rìa | Thêm Tây Vực, Giao Chỉ / Đại Việt, Tây Tạng như vùng chiêu binh và buôn bán, không chiếm, không tính vào 20 châu | Luật v2, giữ ADR 0006 |
| Việc trong châu | Quản dân, tiền, lương; mộ binh, luyện quân; xây; điều quân, đồn trú; bổ nhiệm tướng; buôn bán; việc kéo 2–3 lượt. Ngân sách lệnh theo TW3K/Civ: một lệnh triều đình + mỗi châu một việc | Luật v2 |
| Nhịp chơi | Theo lượt, cùng lúc như nay; nhưng phải có tình báo và độ trễ tin (tin từ A tới B mất cả tháng) | Research `intel-delay.md` → luật v2 |
| Trận đánh | Chọn tướng và số quân đem, cách đánh, cắt cảnh có diễn biến, kết quả có lý do; cả phòng thủ; yếu tố bắt buộc: tướng, địa hình và sông (thủy quân), đồn trú theo châu + số quân đem, hành quân xa và tiếp tế. Quân đông không tự thắng | Luật v2 |
| Trước trận | Ước lượng bằng chữ từ tình báo và do thám; mưu kế có thể làm sai tin | Luật v2 |
| Liên minh | Như Civ (tầm nhìn chung, cứu nhau, cùng đánh) + tham khảo TW3K; deal có nghĩa vụ chấp nhận được | Research `alliances-civ-tw3k.md` → luật v2 |
| Tướng | Cả bốn lớp: 3 chỉ số + 1 thẻ; sự kiện cá nhân (chết, hàng, phản, kế vị); người chơi bổ nhiệm; quan hệ, kinh nghiệm, lên cấp | Luật v2 (Round B gộp vào) |
| Cửa kịch bản | Phe kề hoặc được nêu tên thấy cảnh; phe khác nhận tin đồn trễ | Luật v2 |
| Việc hình | Cắt cảnh trận trước, rồi chân dung, rồi âm thanh | Claude |
| Onboarding, lưu ván | Để vào v2 | v2 |
| Freeze | Mở `GAMEPLAY-FREEZE` v2 "Civ nhẹ" kèm ADR; v1 thành log; không code luật mới trước khi v2 được duyệt | Claude viết đề xuất |
| Bước tiếp | Claude gộp research + câu trả lời thành đề xuất Gameplay v2 (luật, vòng lặp một lượt, mở ván 8 lượt, màn hình) + prototype tương tác trên canvas để duyệt trước khi code | Vòng 10 |
| Phân vai | Giữ hai lane: Claude viết đề xuất và làm hình/UI; Grok làm engine, luật, test, cân bằng theo v2 đã duyệt | `lanes.md` giữ |
| Phát hành, LLM | Pages trỏ `game.html` ngay (đã làm); LLM sau khi luật ổn | Đã làm |

Research kèm theo (tiếng Việt, có nguồn): `tw3k-civ-win-defeat.md`, `tw3k-civ-buildup-economy-generals.md`, `intel-delay.md`, `alliances-civ-tw3k.md`.

---

## C. Nhu cầu người chơi, thị trường Việt Nam

<!-- nguồn cũ: docs/research/market-player-demand.md -->

### Người chơi strategy thực sự muốn gì? — Bằng chứng thị trường cho ngã rẽ v2 của Tam Quốc Loạn Nhập

*Ngày tra cứu: 28/09/2026. Mọi số liệu có URL kèm theo; mục nào không mở được nguồn gốc hoặc chỉ là ước tính bên thứ ba đều ghi rõ **[chưa kiểm chứng]** hoặc **[ước tính]**. Số cũ (trước 2021) ghi năm.*

#### 1. Phân khúc và động cơ người chơi strategy

| Phát hiện | Số liệu | Nguồn |
| --- | --- | --- |
| "Strategy" là động cơ **ổn định nhất theo tuổi** (các động cơ khác giảm khi người chơi già đi, Strategy gần như không đổi) | Bài 2016, dữ liệu Gamer Motivation Profile | [Quantic Foundry 2016](https://quanticfoundry.com/2016/02/10/gamer-generation/) |
| Nhưng **hứng thú "suy nghĩ chiến lược" giảm mạnh 2015→2024**: 67% người chơi hôm nay quan tâm strategy *ít hơn* người chơi trung bình 6/2015; mức giảm gấp >2 lần thay đổi lớn thứ nhì; có trước COVID, mọi giới, mọi nước | >1,5 triệu người trả lời, 9 năm | [Quantic Foundry 5/2024](https://quanticfoundry.com/2024/05/21/strategy-decline/), tóm tắt tại [Push Square](https://www.pushsquare.com/news/2024/05/bombshell-report-finds-players-becoming-less-interested-in-deep-strategy-games), [MassivelyOP](https://massivelyop.com/2024/06/07/for-science-gamer-motivation-survey-data-suggest-strategic-gaming-in-is-a-nasty-decline/) |
| Tự nhận diện: 13% casual, 68% core, 19% hardcore | 466.000+ người, 1/2023–4/2025 | [Quantic Insight Report](https://quanticfoundry.com/insight-report/) |
| Phân khúc Newzoo (2019): "Time Filler" (chơi mobile lúc rảnh) là nhóm **lớn nhất, 27%**; "Ultimate Gamer" chỉ 13% | 8 archetype | [Gamepressure/Newzoo](https://www.gamepressure.com/newsroom/newzoo-analysts-have-divided-gamers-into-archetypes/zdb5f) |
| Benchmark mobile 2025: phiên chơi trung vị 5–6 phút, ~4 phiên/ngày, ~22 phút/ngày. **Riêng thể loại Strategy**: phiên 5,3–5,6 phút, 4,2–4,4 phiên/ngày, 22–25 phút/ngày, D1 19–21%, D7 trung vị 3,4–3,9% | dữ liệu GameAnalytics | [GameAnalytics 2025](https://www.gameanalytics.com/reports/2025-mobile-gaming-benchmarks) |
| Board gamer (n>1.500): điểm cao nhất cho game **3–4 người, 30–60 phút** | nghiên cứu 2023 | [SAGE 2023](https://journals.sagepub.com/doi/10.1177/10468781231189493) **[chỉ đọc qua trích dẫn tìm kiếm, trang gốc chặn]** |

Tóm lại: người thích strategy không mất đi theo tuổi, nhưng khẩu vị chung đang dịch về phía ít tính toán hơn, và thói quen thực tế là nhiều phiên ngắn mỗi ngày.

#### 2. Bao nhiêu người chơi thực sự "chơi hết" một chiến dịch?

Tỉ lệ mở achievement toàn cầu trên Steam (chỉ tính người đã từng khởi động game):

| Game | Achievement "vào cửa" | Achievement "về đích" | Nguồn |
| --- | --- | --- | --- |
| Civilization VI | Có 6 improvement: **74,4%** | Thắng Khoa học 21,3%; Thống trị 20,0%; Văn hóa 19,2%; Tôn giáo 11,3%; Ngoại giao 7,9% | [Steam](https://steamcommunity.com/stats/289070/achievements) |
| Civilization V | Tìm ruin: 88,5% | Thống trị 28,2%; Vũ trụ 24,0%; Văn hóa 20,4%; Ngoại giao 16,4%; đủ mọi kiểu thắng 8,5% | [Steam](https://steamcommunity.com/stats/8930/achievements) |
| Total War: Three Kingdoms | Chiếm 1 vùng: **87,8%** | Xưng đế & thắng campaign ("Mandate of Heaven"): **30,6%** | [Steam](https://steamcommunity.com/stats/779340/achievements) |
| Crusader Kings III | Kết hôn: 61,0% | Chơi tới 1453: **4,4%** | [Steam](https://steamcommunity.com/stats/1158310/achievements) |
| Europa Universalis IV | Hôn nhân hoàng gia: 28,4% | Chơi 1444→1820: **9,0%** | [Steam](https://steamcommunity.com/stats/236850/achievements) |
| Humankind | Chơi 10 lượt: **90,5%** | Thắng AI Expert 25,9%; đầu tiên qua đủ 6 kỷ nguyên 32,1% | [Steam](https://steamcommunity.com/stats/1124300/achievements) |

Firaxis xác nhận trực tiếp: Ed Beach nói tỉ lệ người hoàn thành một ván Civ VI "thấp đến mức đáng buồn, **dưới 50%**", mỗi ván 15–20 giờ, người chơi "ghét" nhịp cuối game với chuỗi quyết định "click here, click here" vô vị; Civ VII vì thế chia ván thành 3 Age có reset bàn cờ ([Game Developer, 23/8/2024](https://www.gamedeveloper.com/design/firaxis-big-swing-with-civilization-vii-convincing-players-to-actually-finish-their-games)). HowLongToBeat (qua SVG) cho Civ VI: 19,5 giờ một ván chính, 65 giờ có thêm nội dung phụ, 162 giờ hoàn toàn ([SVG](https://www.svg.com/176556/how-long-does-it-take-to-beat-civilization-6/)). Playtime trung bình Steam của Civ VI ~133,9 giờ ([Levvvel](https://levvvel.com/civilization-statistics/) **[nguồn thứ cấp, chưa kiểm chứng]**). Paradox (deck IPO 2016): playtime trung bình *2 tuần* của EU4 15h23', CK2 14h06' ([PDF](https://tekinvestor.s3.dualstack.eu-west-1.amazonaws.com/original/3X/8/2/82280a86f543f2e69952a96659b9978dcd3a8f80.pdf) **[chỉ đọc được qua trích dẫn; file không tách được chữ]**).

Kết luận: người ta mua và chơi rất nhiều giờ, nhưng đa số ván bị bỏ dở; cứ 100 người khởi động chỉ 20–30 người từng thắng một ván 4X, 4–9% chơi tới cuối grand strategy.

#### 3. Thành công của strategy phiên ngắn

| Game | Số liệu | Độ dài phiên | Nguồn |
| --- | --- | --- | --- |
| Chess.com | Q4/2025: **8,7 triệu DAU** (+17,5%), 2,5 tỉ ván/quý (~27 triệu ván/ngày), 243 triệu tài khoản; 250 triệu vào 2/2026. Giai đoạn 3–12/2020 thêm 12,2 triệu thành viên (~1 triệu/tháng, 2,8 triệu riêng tháng 11 sau Queen's Gambit) | 1–10 phút | [Chess.com Q4 2025](https://www.chess.com/board-reports/2025-q4), [Yahoo Finance](https://finance.yahoo.com/markets/stocks/articles/chess-com-surpassed-250-million-200425425.html), [CNN 12/2020](https://edition.cnn.com/2020/12/06/us/queens-gambit-chess-popularity-trnd/index.html) |
| Lichess | Ván standard có xếp hạng/tháng: 1/2020 **46,8 triệu** → 4/2020 73,2 triệu → 8/2026 **91,9 triệu** | như trên | [database.lichess.org](https://database.lichess.org/) |
| The Battle of Polytopia | **25 triệu lượt tải** mobile (10/2025); chế độ Perfection = **đúng 30 lượt**, tính điểm; triết lý "bỏ đi càng nhiều càng tốt", "trông phải như bàn cờ vua" | 10–30 phút | [Wikipedia](https://en.wikipedia.org/wiki/The_Battle_of_Polytopia), [GamingOnPhone 5/2024](https://gamingonphone.com/interviews/midjiwan-interview-delves-into-the-battle-of-polytopias-early-days-concept-stage-monetization-strategies/) |
| Into the Breach | 1–2 triệu chủ sở hữu Steam **[ước tính SteamSpy]**; Subset thiết kế để người chơi *tự chọn số đảo* vì FTL "bắt cam kết 2–3 giờ" là không lý tưởng | 1–2,5 giờ/run, chia nhỏ theo trận | [SteamSpy](https://steamspy.com/app/590380), [Game Developer](https://www.gamedeveloper.com/business/how-subset-games-made-the-jump-from-i-ftl-i-to-i-into-the-breach-i-) |
| Slay the Spire | 1,5 triệu bản (3/2019); 5–10 triệu chủ sở hữu Steam **[ước tính]**; StS2 ~5,3 triệu bản riêng tháng 3/2026 **[ước tính nhà phân tích]** | 45–90 phút/run (cộng đồng) | [Game Developer](https://www.gamedeveloper.com/business/after-a-worrisome-start-i-slay-the-spire-i-has-sold-more-than-1-5-million-copies), [SteamSpy](https://steamspy.com/app/646570), [IG News](https://news.instant-gaming.com/en/articles/18882-slay-the-spire-2-sold-5-3-million-copies-in-march-2026) |
| Marvel Snap | Ben Brode chủ đích thiết kế trận **3 phút** | 3 phút | [GamesBeat](https://gamesbeat.com/ben-brode-bets-super-speed-will-make-marvel-snap-stand-out/) **[trang chặn, đọc qua trích dẫn]** |
| Teamfight Tactics | 33 triệu người chơi/tháng (Riot, **9/2019**) | ~20–35 phút | [GamesBeat 2019](https://gamesbeat.com/teamfight-tactics-hits-33-million-monthly-players-making-riot-games-happy/) |
| Bad North | 0,5–1 triệu chủ sở hữu Steam **[ước tính]** | vài phút/đảo | [SteamSpy](https://steamspy.com/app/688420) |
| Unciv (Civ V mã nguồn mở) | Google Play **1M+ lượt tải**, 4,6★/54,7K đánh giá | tuỳ | [Google Play](https://play.google.com/store/apps/details?id=com.unciv.app) |
| Hexonia | Trang Google Play không còn | — | **[không kiểm chứng được]** |
| Age of Empires Mobile | 5 triệu+ tải, ~13,9 triệu USD iOS trong <1 tháng (GameLook/AppMagic, 11/2024); một nguồn khác nói 130 triệu USD/20 ngày **[mâu thuẫn, chưa kiểm chứng]**; đánh giá phân cực vì P2W | SLG live-service | [WN Hub](https://wnhub.io/news/other/item-46127), [Netmarvel](https://www.netmarvel.com/en/news/1063.html) |
| Civilization: Eras & Allies (2K, mobile SLG) | Dừng nạp 14/4/2026, **đóng cửa 30/6/2026** | — | [Trang chính thức](https://eras-and-allies-civilization.2k.com/) |

#### 4. Game strategy trình duyệt lan nhờ "vào là chơi"

| Game | Quy mô | Một trận | Vào chơi | Nguồn |
| --- | --- | --- | --- | --- |
| **OpenFront.io** (mã nguồn mở, 2024, kế thừa territorial.io) | **>1 triệu người chơi/tháng** trên web; 200–250K người/ngày; 65–70 triệu ad impression/tháng; Steam Early Access 17/9/2026, 87% tích cực/802 review, ~1.000 CCU Steam | 20–50 phút, hàng trăm người cùng bản đồ (wiki fan) | không tài khoản, bấm là vào lobby | [Steam](https://store.steampowered.com/app/3560670/OpenFront/), [Playwire](https://www.playwire.com/case-studies/openfront-io), [openfront.fyi](https://openfront.fyi/) **[wiki fan]**, [SteamCharts](https://steamcharts.com/app/3560670) |
| territorial.io | Google Play **5M+** tải (3,3★); ~500 online, đỉnh 24h ~1.200 CCU web | "<5 phút một ván" | như trên | [Google Play](https://play.google.com/store/apps/details?id=territorial.io), [WebGameDB](https://webgamedb.com/games/territorial.io) |
| generals.io | 1v1 hoặc FFA tối đa 8; round = 25 lượt, nhịp thời gian thực | vài phút | không tài khoản | [generals.io](https://generals.io/), [wiki](https://wiki.generals.io/1v1guide.html) |
| Warzone → War.app (từ 2008) | **>10.000 ván nhiều người/ngày**; tới 400 người/ván | bất đồng bộ, "đi lượt khi rảnh" | có tài khoản | [War.app About](https://war.app/Transfer?RedirectUrl=%2Fabout) |
| Conquer Club (2006), Hex Empire | không công bố số liệu | — | — | [conquerclub.com](https://www.conquerclub.com/) **[không có số]** |

Điểm chung giữ chân: không cài đặt, không tài khoản, trận kết thúc rõ trong một lần ngồi, ván sau chỉ cách một cú bấm.

#### 5. Thành công của chiến dịch sâu

| Game | Doanh số / người chơi | Ghi chú | Nguồn |
| --- | --- | --- | --- |
| Civilization VI | 5,5 triệu bản tới 2019; toàn dòng Civ **>70 triệu bản sold-in, >1 tỉ giờ** (Take-Two 2/2024); Steam hiện ~29–31K người đồng thời trung bình (đỉnh 162K); 10–20 triệu chủ sở hữu **[SteamSpy]** | vẫn sống khoẻ 10 năm sau | [PCGamesN](https://www.pcgamesn.com/civilization-6/sales), [Take-Two IR](https://www.take2games.com/ir/news/sid-meiers-civilizationr-vii-coming-2025), [SteamCharts](https://steamcharts.com/app/289070) |
| Total War: Three Kingdoms | **1 triệu bản trong tuần đầu** (5/2019), đỉnh 191.816 CCU; nay ~3.500–3.900 trung bình (~2% đỉnh); 5–10 triệu chủ sở hữu **[SteamSpy]** | đề tài Tam Quốc bán rất mạnh, nhưng tuổi thọ ngắn hơn Civ | [GWO 30/5/2019](https://gameworldobserver.com/2019/05/30/total-war-three-kingdoms-sales-hit-1m), [SteamCharts](https://steamcharts.com/app/779340) |
| Paradox (EU4/CK2) | 15h/2 tuần (2016, xem mục 2) | rất "dính" nhưng chỉ 4–9% chơi tới cuối | xem mục 2 |
| Three Kingdoms Tactics (三国志·战略版, Lingxi/Alibaba) | **1,2 tỉ USD** tới 4/2021, 96% từ Trung Quốc; >100 triệu người chơi tới 2024 | SLG mùa giải, liên minh | [PocketGamer.biz](https://www.pocketgamer.biz/alibaba-three-kingdoms-tactics-1-billion-ltv/), [SCMP 4/2026](https://www.scmp.com/native/business/topics/ancient-china-world/article/3350327/lingxi-games-three-kingdoms-tactics-hits-target-global-audience) |
| 率土之滨 (NetEase) | ~1 tỉ USD từ 2015; **một mùa ~75 ngày (~3 tháng)** | | [GWO](https://gameworldobserver.com/2021/04/01/chinese-game-three-kingdoms-tactics-published-by-alibaba-surpasses-1-billion-in-revenue), [3DM](https://shouyou.3dmgame.com/gl/114308.html) |
| Rise of Kingdoms (Lilith) | **3,5 tỉ USD** tới 5/2024 (Sensor Tower); KvK đầu tiên ở ngày ~85–95 của server, mỗi mùa KvK 50–60 ngày | | [WN Hub](https://wnhub.io/news/finance/item-43560), [OneChilledGamer](https://onechilledgamer.com/rise-of-kingdoms-kvk-summary/) |

Lưu ý: tiền lớn nhất trong bảng (TKT, 率土, RoK, AoE Mobile) đến từ **SLG live-service nhiều người, áp lực liên minh, mùa 2–3 tháng**, không phải chiều sâu solo. Chiều sâu solo bán được (Civ, TW3K) nhưng cần studio hàng trăm người, và chính họ cũng đang cắt nhỏ ván (Civ VII Ages).

#### 6. Việt Nam

| Chỉ số | Số liệu | Nguồn |
| --- | --- | --- |
| Quy mô | **655 triệu USD (2024)** (Niko); Newzoo: 54,6 triệu người chơi, 655 triệu USD; doanh thu game được cấp phép trong nước 12.500 tỉ đồng (~493 triệu USD), 86% là game ngoại | [Niko](https://nikopartners.com/asia-mena-market-model-2025/), [VnBusiness](https://vnbusiness.vn/cong-nghe/nam-2026-du-kien-doanh-thu-tu-game-va-ung-dung-tai-viet-nam-dat-2-7-ty-usd-1102222.html), [Vietnam Briefing 12/2024](https://www.vietnam-briefing.com/news/vietnam-gaming-industry-growth-opportunities.html/) |
| Nền tảng | Mobile áp đảo; 329 triệu lượt tải Q1/2025; **4X strategy tăng doanh thu +17,6%** ở SEA Q1/2025 | [Sensor Tower SEA 2025](https://sensortower.com/blog/southeast-asia-mobile-gaming-2025) |
| Thói quen | 56% dân số online chơi game mobile; **phiên trung bình ~51 phút**, đỉnh 19–22h; 40% chơi ở quán cà phê | [Decision Lab](https://www.decisionlab.co/blog/what-you-should-know-about-mobile-gamers-in-vietnam) **[không ghi ngày khảo sát]** |
| PC | "44,9% người chơi ưa PC", văn hoá quán net | [Vero ASEAN](https://vero-asean.com/vietnam-gaming-sea-is-like-a-virtual-mall/) **[nguồn thứ cấp]**; số người dùng Steam VN: **không tìm được số công khai đáng tin** |
| Tam Quốc trên mobile | Top grossing Strategy Google Play VN (25/9/2026): #1 **Rise of Kingdoms** (Gamota), #4 Kỷ Nguyên Băng Hà: 3Q, #7 Chinh Phục Cửu Châu, #8 Lords Mobile. *Tam Quốc Chí – Chiến Lược* (bản VN của Three Kingdoms Tactics, NPH TTH, không phải VNG) 500K+ tải, NPH tự nhận "Top 5 Grossing VN" (4/2023) | [Similarweb](https://www.similarweb.com/top-apps/google/vietnam/games/strategy/top-grossing/), [Google Play](https://play.google.com/store/apps/details?id=com.vntth.sgzzlb.gp.vn), [XemGame](https://www.xemgame.com/tam-quoc-chi-chien-luoc-tang-mien-phi-the-tuong-gioi-han-post491333.html) **[tuyên bố của NPH]** |
| Đế Chế (AoE 1) | Chim Sẻ Đi Nắng: kỷ lục **126.086 người xem đồng thời** FB Gaming (10/2019); vô địch Red Bull Wololo El Reinado 10/2024 (chung kết toàn người Việt). Thể thức: Solo Random, Solo Shang, 2v2 Assy-Ya, 4v4 Random, đấu Bo nhiều ván; chung kết không giới hạn giờ; kỷ lục 4v4 dài 4h24' (2021), solo 1h41' (2024) | [CafeBiz](https://cafebiz.vn/15-tuoi-ha-guc-cac-tuong-dai-game-thu-de-che-viet-nam-23-tuoi-gianh-duoc-9-cup-vo-dich-chi-trong-hon-1-thang-than-dong-aoe-chim-se-di-nang-hien-tai-ra-sao-20220615173618672.chn), [Kenh14](https://kenh14.vn/chim-se-di-nang-lap-thanh-tich-moi-doc-binh-luan-phu-cua-khan-gia-thay-la-lam-215241007115426916.chn), [EgoPlay](https://ego-play.com/ky-luc-nhung-tran-dau-aoe-lau-nhat-viet-nam-va-the-gioi), [aoe.vn](https://aoe.vn/binh-luan/neu-ban-chua-hieu-het-ve-luat-thi-dau-cua-aoe-viet-nam-day-la-bai-viet-danh-cho-ban-4144.html). Độ dài trận *thông thường* (~30–60') là kinh nghiệm cộng đồng, **[chưa có số liệu]** |
| Cờ tướng | Cờ tướng ZingPlay: Google Play **1M+ tải**, 4,4★/26,5K đánh giá; VNG tự nhận "hàng trăm nghìn người chơi mỗi ngày" **[marketing]**; Nghị định 147/2024 khiến 4/5 game bài ZingPlay không được cấp phép lại | [Google Play](https://play.google.com/store/apps/details?id=gsn.game.sam), [ZingPlay](https://play.zing.vn/m/tin-tuc/chi-tiet.tin-tuc.co-tuong-zingplay-moi-co-gi-hap-dan.1772.html), [Thanh Niên 2/2025](https://thanhnien.vn/nguoi-choi-tiec-nuoi-khi-vng-dong-cua-game-bai-tren-zingplay-185250217152406353.htm) |

#### Hàm ý

**(a) Ngã rẽ nào?** Bằng chứng nghiêng rõ về **hướng 1 — "vào là chơi", ván ngắn, chơi đi chơi lại** — với điều kiện giữ một *lõi* quyết định có ý nghĩa. Lý do: (1) ngay cả Civ VI, có Firaxis và 10 năm tinh chỉnh, cũng dưới 50% người chơi hoàn thành một ván; grand strategy chỉ 4–9% đi tới cuối; (2) khẩu vị chiến lược đại chúng đang giảm (Quantic 2024) trong khi cờ, Polytopia, Snap, OpenFront tăng nhờ ván ngắn; (3) doanh thu "chiến dịch sâu" đề tài Tam Quốc thực chất là SLG mùa giải 2–3 tháng với liên minh, thứ một người + agent AI không thể vận hành; (4) sản phẩm là web tĩnh GitHub Pages, ưu thế tự nhiên là "bấm link là chơi", đúng mô hình OpenFront/territorial; (5) người Việt chơi trên mobile với phiên ~51 phút nhưng là nhiều lần/ngày, và văn hoá Đế Chế là *một trận có thắng thua trong một lần ngồi*, rồi đấu loạt.

**(b) Độ dài và cấu trúc ván.** Mục tiêu: **một ván 10–25 phút, 20–30 lượt có hạn cứng** (Polytopia 30 lượt; OpenFront 20–50'; TFT ~30'; board game được thích nhất 30–60'), đủ để 2–3 ván trong một buổi tối. Thắng thua rõ khi hết lượt (điểm/lãnh thổ) chứ không chờ tiêu diệt hết. Cho phép chọn độ dài trước ván (Into the Breach chọn số đảo) và thiết kế mùa/loạt Bo3 nhẹ để khuyến khích "ván nữa". Seed ngẫu nhiên + 7 phe bất đối xứng là nguồn replay rẻ nhất.

**(c) "Sâu" nào được quý, "sâu" nào bị chịu đựng.** Được quý: quyết định ít nhưng hệ quả nhìn thấy ngay ("thấy kế hoạch thành hình" là định nghĩa Strategy của Quantic); phe bất đối xứng (tribe Polytopia, comp TFT); căng thẳng đảo chiều, có thể "bỏ ván" hoặc "gấp đôi" (Snap); thông tin minh bạch (Into the Breach); cột mốc kết thúc trong tầm mắt (Civ VII Ages, sao kỷ nguyên Humankind). Bị chịu đựng/ghét: quản trị vi mô cuối game "click here, click here" (Beach), ván 15–20 giờ, mùa giải 50–75 ngày và áp lực liên minh, P2W (AoE Mobile), tech tree dài chỉ để dài.

**(d) Benchmark nên đối chiếu.** 1) **The Battle of Polytopia** — chuẩn vàng 4X-lite, 30 lượt, 25 triệu tải. 2) **OpenFront.io** — strategy trình duyệt "vào là chơi", >1 triệu người/tháng, mã nguồn mở để học onboarding. 3) **Into the Breach** — chiều sâu từ thông tin minh bạch và độ dài tự chọn. 4) **Slay the Spire** — vòng lặp "run" khiến người ta chơi lại hàng trăm lần. 5) **Total War: Three Kingdoms** — tham chiếu về sức hút đề tài Tam Quốc (1 triệu bản/tuần) và bài học 30,6% hoàn thành; kèm **Unciv** như bằng chứng Civ-lite mã nguồn mở vẫn có 1M+ tải.

*Hạn chế dữ liệu:* Quantic Foundry, HowLongToBeat, GamesBeat, SAGE và deck Paradox chặn truy cập trực tiếp (chỉ đọc qua trích dẫn); SteamSpy là ước tính khoảng; số người dùng Steam VN, độ dài trận AoE thông thường và lượt tải Hexonia không có nguồn đáng tin.

---

## D. Loạn 12 Sứ Quân, xuyên không, IP Tam Quốc, xem mô phỏng

<!-- nguồn cũ: docs/research/market-roots-trends.md -->

### Gốc văn hóa và khán giả của "Tam Quốc Loạn Nhập" — báo cáo thị trường

*28/09/2026. Mọi số liệu kèm URL; chỗ nào không xác minh được ghi "(chưa kiểm chứng)".*

#### Tóm tắt

1. "Loạn 12 Sứ Quân" là ít nhất 6 game khác nhau (2007–2026). Bản gần nhất với "bản đồ + sứ quân + theo lượt" là web text-game trên game4v năm 2007, được khen "dễ hiểu, dễ học, cách chơi không phức tạp". Ký ức về cái tên có thật nhưng mỏng.
2. Xuyên không rất lớn ở Trung Quốc (thị trường đọc 430,6 tỷ NDT, 575 triệu người dùng, 2024) và bám sâu ở Việt Nam. Độc giả Việt của Tam Quốc xuyên không khen "logic hợp lý, ít ảo tưởng", đòi "phải có tiền, có lương thực, có quân sĩ", chê "gái gú bao la" và "diệt dễ như ăn cháo".
3. Tam Quốc ở VN "không bao giờ lỗi mốt": ~16 game mobile Tam Quốc ra mắt riêng năm 2024; Tam Quốc Chí – Chiến Lược từng Top 1 doanh thu App Store VN (3/2023).
4. "Xem AI đánh nhau" là thể loại có lịch sử (Civ Battle Royale, Total War AI-only 278 phe/766 lượt, kênh Drew Durnil 1,53 triệu sub, đua bi Jelle's 1,5 triệu sub). Công thức: phe rõ, màu rõ, có tường thuật, có lật kèo.
5. Indie chiến thuật Việt gần như không có ca thành công; ca thành công của indie Việt là action/tower defense bán ra nước ngoài. Khán giả trong nước cho game trình duyệt miễn phí nên tính theo nghìn.

#### 1. "Loạn 12 Sứ Quân": nhiều game, một cái tên

| Năm | Tựa / nhà làm | Nền tảng | Cơ chế lõi | Nguồn |
|---|---|---|---|---|
| 2007 | Loạn 12 Sứ Quân text game (game4v.com) | Web, multi-online | TBS kinh tế–quân sự–ngoại giao; tài nguyên tích lũy khi offline; tối đa 30 người/server; bị ví với OGame | [GVN 13/02/2007](https://f.gvn.co/threads/loan-12-su-quan-text-game-online.279297/) |
| 2008 | Loạn 12 Sứ Quân Online (Ola) | Java Nokia | Nhập vai online: 3 hệ Hỏa–Thủy–Lôi khắc chế, NPC, chợ, "thách đấu có đặt cược", chat; nạp SMS 1.000đ | [Ola 11/2008](http://olagame.blogspot.com/2008/11/12sqo.html), [chiase123 2012](https://chiase123.com/f8/loan-12-su-quan-online-t4262.html) |
| 2010 | Loạn 12 Sứ Quân (Microgame/Ola) | Java → Android | Xếp kim cương + RPG theo lượt: "mỗi phe sẽ thay nhau di chuyển các biểu tượng"; vật phẩm ~5.000đ | [GenK 2010](https://genk.vn/loan-12-su-quan-game-mobile-tai-hien-lich-su-viet-nam-20100801055435186.chn), [muathe6s](https://muathe6s.com/tin-tuc/game-loan-12-su-quan.html) |
| 2014→2019 | Loạn 12 Sứ Quân → Nam Đế → Nam Đế 3 (Cỏ Non Studio) | Mobile | Chiến thuật quản lý: chọn 1/5 sứ quân, "hàng trăm vị tướng Việt", ~30 chiến pháp | [Dzogame 2014](https://dzogame.vn/game-mobile/can-canh-game-thuan-viet-loan-12-su-quan-phien-ban-thu-nghiem-3567-17.html), [Vietnamnet 2015](https://vietnamnet.vn/song-lai-dien-tich-thoi-loan-12-su-quan-voi-game-da-su-viet-nam-de-ig7463.html), [Thanh Niên 2019](https://thanhnien.vn/nam-de-3-game-mobile-chien-thuat-lich-su-thuan-viet-sap-ra-mat-1851144355.htm) |
| 2017 | 12 Sứ Quân / 12 Lords (OLA/GOS) | Android, iOS | Remake xếp hình, 9 tướng, PvP, bang hội | [12lords](https://12lords.blogspot.com/), [Google Play](https://play.google.com/store/apps/details?id=com.gos.twelvelords&hl=en_US) |
| 2024–26 | 12 Warlords (studio Việt, Vietnam GameVerse) | PC/Steam | HoMM-like: bản đồ ô lưới, quản lý thành, đánh theo lượt trên hex; dự kiến 13/07/2026 | [VnExpress VGV 2025](https://vnexpress.net/cong-nghe/vgv-2025/du-an/12-warlords-228) |

Không thấy board game vật lý; trang gamego.vn chỉ là bài sử của một shop board game ([gamego](https://gamego.vn/loan-12-su-quan-dat-nuoc-phan-liet/)). Trang Steam của 12 Warlords không tìm được (chưa kiểm chứng).

**Ký ức cộng đồng.** Cái tên sống nhờ bản Java: có playlist "Game huyền thoại Loạn 12 sứ quân online" và video chơi lại trên Android ([playlist](https://www.youtube.com/playlist?list=PLYlRWbKJJX72coRqwwzMDhCQn_5aDvP6x), [video](https://www.youtube.com/watch?v=gzE1nqKtJao)) — lượt xem bị chặn, chưa kiểm chứng. Trang tải game gọi nó là "gắn liền tuổi thơ 8x, 9x" ([muathe6s](https://muathe6s.com/tin-tuc/game-loan-12-su-quan.html)), nhưng bài top game Java tuổi thơ của Hoàng Hà Mobile không xếp nó vào top 8 ([hoanghamobile](https://hoanghamobile.com/tin-tuc/game-java/)); thread chia sẻ 2012 chỉ 22 trả lời, có cả "chán phèo" ([chiase123](https://chiase123.com/f8/loan-12-su-quan-online-t4262.html)). Đây là ký ức niche; giá trị nằm ở *bối cảnh nhiều phe thời loạn* và *gặp danh nhân qua từng trận* ([GenK](https://genk.vn/loan-12-su-quan-game-mobile-tai-hien-lich-su-viet-nam-20100801055435186.chn)), không ở một cơ chế cụ thể vì mỗi bản một kiểu.

#### 2. Trào lưu xuyên không

**Quy mô.** Báo cáo Viện KHXH Trung Quốc (5/2025): thị trường đọc văn học mạng 2024 đạt 430,6 tỷ NDT (+6,8%), 575 triệu người dùng (+10,58%), thị trường IP chuyển thể 2.985,6 tỷ NDT ([Tân Hoa Xã](http://www.news.cn/fortune/20250509/4fb5f4d8dc0c4bc994a59d1719a0e447/c.html)); xuyên không nằm trong nhóm đề tài liệt kê đầu ([Sohu](https://www.sohu.com/a/774390402_121757514)).

**Nhánh "chủng điền văn" (种田文).** Nhân vật lập căn cứ rồi làm khoa học, kinh tế, quân sự, chế độ; gốc từ khẩu hiệu game chiến thuật "cao trúc tường, quảng tích lương, hoãn xưng vương"; tác phẩm khai sinh 《异时空——中华再起》 (2002) ([Baidu Baike](https://baike.baidu.com/item/%E7%A7%8D%E7%94%B0%E6%96%87/1644809), [Hội Nhà văn TQ](http://www.chinawriter.com.cn/n1/2024/0402/c404027-40208315.html)). Qidian có mục riêng "三国种田流" ([Qidian](https://m.qidian.com/ask/qosamrhkgfo)); đầu tiêu biểu 《神话版三国》, 《三国：谁让他做谋士的？》 ([Maigoo 2024](https://m.maigoo.com/top/430697.html)).

**Việt Nam.** Thread review "truyện xuyên không về Tam Quốc" trên VOZ (1/2022): 96 trả lời, 110.281 lượt xem; bộ điểm cao nhất được khen "logic hợp lý, ít ảo tưởng"; độc giả đòi "phải có tiền, có lương thực, có quân sĩ", chê "gái gú bao la", "diệt… dễ như ăn cháo" ([VOZ](https://voz.vn/t/review-mot-so-truyen-xuyen-khong-ve-tam-quoc-noi-bat.472941/)). Xuyên không "về Đại Việt" nở rộ trên Wattpad; "Lúc biết xuyên không thì đã muộn" (Mật Tiễn, cảm hứng Lê Long Đĩnh) có bản in và đang gọi vốn chuyển thể ([Wattpad](https://www.wattpad.com/story/273808995), [Goodreads](https://www.goodreads.com/book/show/213592209-l-c-bi-t-xuy-n-kh-ng-th-mu-n), [Vfilms](https://invest.vfilms.finance/campaign/luc-biet-xuyen-khong-thi-da-muon/) — trang lỗi 503, chi tiết chưa kiểm chứng). Phim mẫu: TVB "Hồi Đáo Tam Quốc" 2012, game thủ hiện đại xuyên về làm quân sư cho Gia Cát Lượng, 25 tập, rating 27–34 điểm ([Wikipedia](https://en.wikipedia.org/wiki/Three_Kingdoms_RPG)); game cùng tên về VN 2016 ([Dzogame](https://dzogame.vn/pcweb/game-xuyen-khong-de-tai-tam-quoc-du-nhap-ve-viet-nam-10667-57.html)).

**Game "gom anh hùng nhiều thời":**

| Game | Cách dùng | Nguồn |
|---|---|---|
| ROTK XIV – "Anh hùng tập kết" | 592 võ tướng, 39 quân chủ mọi thời cùng sống; mở khóa sau khi phá đảo 1 kịch bản | [sangokushi-fun](https://sangokushi-fun.com/sangokushi14/san14-scenario-25101/), [PC Invasion](https://www.pcinvasion.com/romance-of-the-three-kingdoms-xiv-rtk-14-unlocking-the-gathering-of-heroes-scenario/) |
| Warriors Orochi (2007) | Gộp Tam Quốc + Chiến Quốc Nhật; 1,5 triệu bản (5/2008) | [Wikipedia](https://en.wikipedia.org/wiki/Warriors_Orochi) |
| Fate/Grand Order | Danh nhân mọi thời làm Servant; 7 tỷ USD (9/2023); đóng server VN 2/2022 | [Wikipedia](https://en.wikipedia.org/wiki/Fate/Grand_Order) |
| Civilization VII | Lãnh đạo tách khỏi nền văn minh, đổi văn minh mỗi Kỷ nguyên | [Wikipedia](https://en.wikipedia.org/wiki/Civilization_VII) |
| 无悔华夏 (TQ) | Đi qua 5.000 năm, mỗi thời một cơ chế, ghép danh thần | [Youxituoluo](https://www.youxituoluo.com/529605.html) |
| Tam Quốc Tứ Thời Ca (SohaGame, 16/09/2026) | 70+ tướng Tam Quốc–Tần–Hán–Đường; quảng cáo "Tần Thủy Hoàng, Võ Tắc Thiên, Hạng Vũ… đối đầu Quan Vũ, Lưu Bị" | [GameK](https://gamek.vn/xuat-hien-sieu-tan-binh-khung-long-cho-phep-nguoi-choi-xuyen-khong-var-cham-cuc-manh-o-vu-tru-tam-quoc-178260907210110424.chn) |

Game mobile VN bán xuyên không như **roster liên triều đại**; văn học bán **quá trình dựng nghiệp bằng tri thức tương lai**. Dự án đang ở giữa: có roster liên thời, chưa có "tri thức tương lai" làm cơ chế.

#### 3. IP Tam Quốc tại Việt Nam

- **Nhịp ra mắt:** 2game liệt kê 10 game Tam Quốc mới nửa đầu 2024 và 8 game nửa cuối (trùng 2) → ~16 tựa/năm, đủ SLG, thẻ tướng, idle, auto-chess, roguelike; chính họ gọi thị trường là "bão hòa" ([H1](https://2game.vn/top-10-game-tam-quoc-moi-ra-mat-tai-thi-truong-viet-nam-trong-nua-dau-nam-2024-post419079.html), [H2](https://2game.vn/top-8game-tam-quoc-dac-sac-nhat-duoc-ra-mat-tai-viet-nam-vao-nua-cuoi-nam-2024-post431068.html)). FPT 2026 liệt kê 25 tựa đang vận hành: "Tam quốc vẫn là đề tài không bao giờ lỗi mốt với game thủ Việt" ([FPT](https://fpt.vn/tin-tuc/top-10-game-tam-quoc-tren-mobile-hay-nhat-cho-game-thu-viet-2025-12426.html)).
- **Doanh thu:** Tam Quốc Chí – Chiến Lược (TTH, bản quyền Koei Tecmo) Top 1 doanh thu App Store VN 3/2023 khi mở mùa 2; "không có VIP, không bán tài nguyên" ([2game](https://2game.vn/vinh-du-buoc-len-top-1-ve-doanh-thu-tam-quoc-chi-chien-luoc-chinh-thuc-buoc-vao-mua-giai-thu-2-post373035.html)); tuần 6–12/4/2026 tăng doanh thu 117,63% nhờ mùa mới, Phong Hầu Tam Quốc tăng 110,5% (AppMagic qua [Gamota](https://gamota.com/gamota-lab/vietnam-game-industry-weekly-updates-april-6-12-2026/)). Động cơ chi tiêu là **"mùa mới = reset"**: người chơi SLG Tam Quốc thích chu kỳ ngắn, bắt đầu lại.
- **Nền:** VN thứ 3 Đông Nam Á về lượt tải (329 triệu Q1/2025) ([Sensor Tower](https://sensortower.com/blog/southeast-asia-mobile-gaming-2025)); doanh thu game VN dự báo 1,66 tỷ USD 2025 ([CafeF](https://cafef.vn/game-duoc-du-bao-thanh-nganh-kinh-te-242-ty-usd-cua-viet-nam-doanh-thu-top-5-dong-nam-a-tang-truong-gap-25-lan-trung-binh-the-gioi-188250605084733145.chn)). Thị phần riêng đề tài Tam Quốc: không có số (chưa kiểm chứng).
- **Phim & nội dung:** bản 1994 rating nội địa TQ 47% ([Wikipedia VI](https://vi.wikipedia.org/wiki/Tam_qu%E1%BB%91c_di%E1%BB%85n_ngh%C4%A9a_(phim_truy%E1%BB%81n_h%C3%ACnh_1994))); bản 2010 vẫn phát trên TV360 ([TV360](https://tv360.vn/movie/tam-quoc-dien-nghia-three-kingdom?m=16237)); lịch VTV chưa kiểm chứng. YouTube/TikTok Việt có kênh TAM QUỐC TV, video "Tóm tắt Tam Quốc 98 phút", hashtag #tamquocdiennghia, "Tam Quốc meme" ([YouTube](https://www.youtube.com/@TamQuocTV1), [video](https://www.youtube.com/watch?v=tbKNbTqbOPM), [TikTok](https://www.tiktok.com/discover/tam-qu%E1%BB%91c-di%E1%BB%85n-ngh%C4%A9a)) — số sub/view bị chặn, chưa kiểm chứng. Điều chắc: Tam Quốc ở VN đã là **văn hóa meme** (Tào Tháo, "var" chạm), không chỉ là sử.

#### 4. "Xem mô phỏng" như nội dung

| Ví dụ | Quy mô | Vì sao xem được | Nguồn |
|---|---|---|---|
| Civ Battle Royale (Civ V AI-only, 61 nền văn minh) | Mk II 8/2015–12/2018, CBRX 2019–2020; Firaxis tự stream 1 trận AI-only trước khi bán Civ VI | Tường thuật theo tập; fan làm báo giả, "sàn chứng khoán" cược phe | [MetaFilter](https://www.metafilter.com/191534/Civilization-Battles-Royale), [TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/WebOriginal/CivBattleRoyale) (chi tiết fan qua snippet, trang chặn) |
| Drew Durnil | 1,53 triệu sub, 1,09 tỷ view (12/2025); khởi đầu bằng AI-only Civ 6/HoI4, sau bỏ vì "đã vắt kiệt dạng AI-only" | Bình luận hài, meme + sử | [Wikitubia](https://youtube.fandom.com/wiki/Drew_Durnil) |
| Total War: Warhammer 3 AI-only | 278 phe, 766 lượt | Xem "meta bản đồ" đổi theo patch; kết quả bất ngờ | [Wargamer](https://www.wargamer.com/total-war-warhammer-3/ai-only-campaign) |
| Ultimate Epic Battle Simulator | Video kỷ lục 8.909.679 view (2017) | Quy mô phi lý, "ai thắng" | [Guinness](https://www.guinnessworldrecords.com/world-records/482223-most-viewed-battles-in-ultimate-epic-battle-simulator) |
| Jelle's Marble Runs | 1,51 triệu sub, 213 triệu view (8/2026) | Màu bi = quốc gia để cổ vũ; thêm giọng tường thuật tăng hàng trăm nghìn view; giải theo mùa | [vidIQ](https://vidiq.com/youtube-stats/channel/UCYJdpnjuSWVOLgGT9fIzL0g/), [Vice](https://www.vice.com/en/article/inside-the-hypnotic-world-of-youtube-marble-racers/) |
| Ages of Conflict / WorldBox | Cộng đồng "mapping" YouTube–TikTok; WorldBox 100k+ Discord/Reddit | Bản đồ đổi màu theo thời gian | [Shapes wiki](https://shapes.inc/fandom/ages-of-conflict-world-war-sim), [WorldBox](https://www.superworldbox.com/) |

Điểm chung: phe ít, màu rõ; có người kể hoặc bảng xếp hạng theo tập; kịch tính từ lật kèo và kẻ yếu sống sót; nhịp ngắn (timelapse, tập 10–20 phút). Cảnh báo từ chính Durnil: AI-only thuần bị "vắt kiệt" — cần kịch bản và nhân vật để không lặp.

#### 5. Indie chiến thuật Việt 10 năm — để hiệu chỉnh kỳ vọng

| Game | Studio / năm | Kết quả | Nguồn |
|---|---|---|---|
| Thuận Thiên Kiếm (MMORPG sử Việt) | VNG 2009–13 | Đóng cửa 07/03/2013 vì hết người chơi | [GameLandVN](https://gamelandvn.com/vng-ra-thong-bao-dong-cua-thuan-thien-kiem/) |
| 7554 (FPS lịch sử) | Hiker 2012 | Chi 17 tỷ VND; được nhắc là "kết thúc buồn" | [VnExpress 2023](https://vnexpress.net/thang-tram-cua-dong-game-made-in-vietnam-4586234.html), [Vietcetera](https://vietcetera.com/vn/7-tua-game-sieu-chat-do-nguoi-viet-tu-san-xuat) |
| Nam Đế 1–3 (chiến thuật 12 sứ quân) | Cỏ Non 2015–19 | Có ra mắt, không có số người chơi công bố (chưa kiểm chứng) | [GameHub](https://gamehub.vn/tags/co-non-studio.7907/) |
| Caravan War (tower defense) | Hiker 2018 | 1 triệu tải, top 10 tải ở Hàn Quốc | [VnExpress Intl](https://e.vnexpress.net/news/business/companies/vietnamese-mobile-game-a-hit-in-korea-china-3792905.html) |
| Sử Hộ Vương (thẻ bài sử Việt) | Gamize 2018–19 | Kỷ lục gọi vốn 24h trên Comicola rồi thất bại | [Thanh Niên](https://thanhnien.vn/board-game-ve-su-viet-pha-ky-luc-gop-von-tren-comicola-1851143675.htm), [aFamily](https://afamily.vn/tro-choi-su-ho-vuong-goi-von-that-bai-va-cau-chuyen-co-nen-hay-khong-viec-bien-tau-van-hoa-lich-su-de-kich-thich-tim-hieu-20190813131153918.chn) |
| Legendary Hoplite (TD+ARPG) | TripleBricks, Steam | 335 review, 63% tích cực | [Steam](https://store.steampowered.com/app/1479810/Legendary_Hoplite/) |
| God of Weapons (action roguelike) | Archmage Labs 9/2023 | 100.000 bản/2 tuần; 200–500k chủ sở hữu | [Mytour](https://mytour.vn/en/blog/bai-viet/vietnamese-game-god-of-weapons-achieves-massive-success-on-steam.html), [SteamSpy](https://steamspy.com/app/2342950) |
| Việt Quốc Truyền Kỳ (MMORPG free) | Green Ray 4/2025 | 129 review, 68% | [Steam](https://store.steampowered.com/app/3534830/Viet_Quoc_Truyen_Ky/) |

Game nội địa chỉ ~12% thị trường VN; khoảng 20 game online đóng cửa riêng 2010 ([VnExpress](https://vnexpress.net/thang-tram-cua-dong-game-made-in-vietnam-4586234.html)). Mẫu thành công của indie Việt: **thể loại quốc tế, bán ra ngoài**; mẫu thất bại: **đề tài sử Việt, nội địa, quy mô lớn**. Dự án này khác cả hai (Tam Quốc, miễn phí, trình duyệt) nên không có tiền lệ trực tiếp.

#### Hàm ý

**(a) Gốc "Loạn 12 Sứ Quân" → kiểu chơi.** Thứ người ta nhớ là *nhiều phe, bản đồ tranh hùng, gặp danh nhân qua từng trận*, không phải chiều sâu hệ thống: bản được khen nhất về gameplay (2007) được khen vì "dễ hiểu, dễ học, cách chơi không phức tạp". Điều này nghiêng về **"vào là chơi" kiểu board game**: bản đồ ít vùng (20 châu hợp lý), lượt ngắn, mỗi lượt một quyết định rõ (đánh/giữ/liên minh), một ván 20–40 phút. Cảnh báo: bản 2007 bị chê "giống OGame" vì phải chờ tài nguyên — tránh mọi cơ chế chờ.

**(b) Gốc xuyên không → fantasy.** Độc giả Việt mua fantasy *"dựng nghiệp bằng tri thức tương lai, có logic hậu cần"* và ghét *"quá bá"* ([VOZ](https://voz.vn/t/review-mot-so-truyen-xuyen-khong-ve-tam-quoc-noi-bat.472941/)); mobile thì bán *roster liên triều*. Thoạt nhìn điều này ủng hộ campaign sâu (cải cách, công nghệ, chiêu hiền), nhưng thứ độc giả thưởng là *tính cách khác nhau của cách dựng nghiệp*, không phải số lượng hệ thống. Dung hòa: giữ khung đơn giản, cho mỗi hoàng đế **một "tri thức tương lai" duy nhất đọc được ngay trên bản đồ** (Tần Thủy Hoàng: pháp trị/đường sá; Lý Thế Dân: chiêu hiền/kỵ binh; Chu Nguyên Chương: đồn điền/"cao trúc tường"; Hán Vũ Đế: viễn chinh/độc quyền muối sắt). Đó là "chủng điền văn" nén thành một luật mỗi phe — đúng fantasy mà không phá board game. Không cần lãng mạn/harem (bị chê); cần giữ tiến trình "từ tay trắng".

**(c) Xem được, cắt clip được.** (1) 7 phe, 7 màu cố định, tên phe hiện to. (2) Mỗi ván tự sinh **bản tin lượt** (ai chiếm gì, ai lật kèo) làm lời dẫn cho clip 30–60 giây kiểu "Tam Quốc meme". (3) **Bảng xếp hạng quyền lực** đổi theo lượt như Civ Battle Royale để có "kẻ yếu sống sót" và "ông lớn sụp". (4) Chế độ AI-only timelapse có chia sẻ seed để người xem chạy lại đúng ván. (5) Học Durnil: AI-only thuần chán nhanh; kịch bản (thu 219 + 4 vị khách) và giọng kể "sử ký" mới giữ người xem.

**(d) Khán giả thực tế ở VN.** Nhu cầu đề tài rất lớn (16 game/năm, Top 1 doanh thu) nhưng đó là khán giả SLG mobile trả tiền theo mùa, không tự tìm game trình duyệt miễn phí không gacha. Tệp chạm được là giao của ba nhóm nhỏ: người đọc Tam Quốc xuyên không (một thread review 110k view), người xem sử/meme Tam Quốc trên TikTok–YouTube, và cộng đồng indie Việt (Steam Indie Vietnam Day ~100 game, qua snippet [dlcompare](https://www.dlcompare.vn/gaming-news/su-kien-tuan-le-game-viet-nam-quy-tu-cac-tua-game-indie-noi-bat-trong-nuoc-75775), chưa kiểm chứng). Ước tính (suy luận, không có số đo trực tiếp): vài nghìn người thử trong tháng đầu nếu có 1–2 clip lan tốt, vài trăm quay lại. Vì vậy **đo thành công bằng clip được xem và ván được chia sẻ, không bằng DAU**; thiết kế cho "người xem thành người chơi trong 1 phút", không cho người cày 30 giờ.

#### Chưa kiểm chứng

- Lượt xem/sub YouTube–TikTok của kênh Tam Quốc Việt và video hoài niệm Loạn 12 Sứ Quân (bị chặn truy cập).
- Trang Steam/wishlist của 12 Warlords; số người chơi Nam Đế 1–3.
- Lịch phát VTV của Tam Quốc 1994/2010.
- Thị phần doanh thu riêng của đề tài Tam Quốc tại VN.
- Chi tiết dự án phim "Lúc biết xuyên không thì đã muộn" (trang gọi vốn lỗi 503).

---

## E. Bằng chứng thiết kế: hoàn thành, nhanh mà sâu, chi phí game sâu

<!-- nguồn cũ: docs/research/market-design-evidence.md -->

### Bằng chứng thiết kế & thị trường: "vào chơi ngay" hay "chiến dịch sâu"?

*Cho Tam Quốc Loạn Nhập v2 — 28/09/2026. Mọi số liệu có URL; chỗ không kiểm chứng được ghi **[chưa xác minh]**. Tỷ lệ achievement Steam là **mức sàn** (người tắt achievement, chơi offline hay nền tảng khác không được tính — [twoaveragegamers.com](https://www.twoaveragegamers.com/game-completion-rates/)).*

#### 1. Lý thuyết thiết kế

| Nguồn | Luận điểm | Hàm ý |
| --- | --- | --- |
| Sid Meier, GDC 2012 — [gamedeveloper.com](https://www.gamedeveloper.com/design/gdc-2012-sid-meier-on-how-to-see-games-as-sets-of-interesting-decisions) | "Games are a series of interesting decisions." Quyết định hay = có đánh đổi, gắn tình huống, bộc lộ phong cách, ngắn/dài hạn. Nhịp: "quyết định phức tạp dồn dập → mất kiểm soát; đơn giản và chậm → chán". Cắt quyết định không có chức năng; thà thừa thông tin còn hơn thiếu. | Chất lượng quyết định > số lượng. Một lệnh/lượt vẫn sâu nếu đánh đổi rõ. |
| Soren Johnson (Civ IV, Old World) — [pcgamesn](https://www.pcgamesn.com/old-world/civilization-too-long), [Designer Notes #1](http://www.designer-notes.com/old-world-designer-notes-1-orders/), [#11](https://www.designer-notes.com/old-world-designer-notes-11-the-end/), [AMA](https://bestofama.com/amas/gftr6m) | Civ: "a lot of people just never finish. It's just too long" → Old World khóa 200 lượt để "make a game that people actually finish". "First-half of the game is usually (always?) the best part of a 4X." **Orders** giới hạn hành động/lượt để ép đánh đổi. "The hardest part of a 4X to design is the ending. Truthfully, no one has ever done this well." Phức tạp nên **tùy chọn**. | Ít lượt, mỗi lượt nặng hơn; giới hạn hành động tạo chiều sâu; kết thúc phải được thiết kế. |
| Midjiwan (Polytopia) — [pockettactics](https://www.pockettactics.com/the-battle-of-polytopia/interview), [pixelatedplaygrounds](https://www.pixelatedplaygrounds.com/sidequests/game-design-perspective-the-battle-of-polytopia) | Muốn Civ nhanh hơn; "kept simplifying and removing stuff until they reached the core". 16×16 ô, Perfection 30 lượt, ~30 phút/ván, một tài nguyên. | Nén không gian, thời gian, kinh tế cùng lúc. |
| Subset Games (Into the Breach) — [gamedeveloper](https://www.gamedeveloper.com/game-platforms/road-to-the-igf-subset-games-i-into-the-breach-i-), [postmortem](https://www.gamedeveloper.com/design/video-how-subset-games-designed-i-into-the-breach-i-) | Thông tin hoàn hảo, địch báo đòn, lưới 8×8, "every death felt like your own fault". Cái gì không làm rõ ngay được thì cắt. "Varied goals and priorities rather than just 'kill the enemies'… interesting choices." | Minh bạch + mục tiêu đa chiều tạo chiều sâu, không phải số hệ thống. |
| Reiner Knizia — [justingarydesign](https://justingarydesign.substack.com/p/reiner-knizia-systems-for-publishing) | "The magic of a game doesn't necessarily lie in its complexity but in… profound gameplay experiences through simple rules." "The scoring drives the gameplay." | Cách tính điểm cuối ván là đòn bẩy lớn nhất. |
| Keith Burgun — [gamedeveloper](https://www.gamedeveloper.com/design/criteria-for-strategy-game-design) | Thanh lịch = ít thành phần, nhiều tương tác; mọi thứ phục vụ **một cơ chế lõi**; rút ngắn khoảng giữa hai quyết định; ngẫu nhiên đầu vào (bản đồ) tốt hơn đầu ra (xúc xắc). | Seed cố định tốt; tránh xúc xắc kết quả. |
| Raph Koster — [shortform](https://www.shortform.com/pdf/a-theory-of-fun-for-game-design-pdf-raph-koster) | Vui = học mẫu hình; tic-tac-toe cạn nhanh, cờ vua sống lâu. | Ván ngắn cần mẫu hình đủ giàu để học qua nhiều ván. |

Không ai đối lập "nhanh" với "sâu"; họ đối lập **phức tạp** (nhiều luật) với **sâu** (nhiều tương tác từ ít luật). Công thức được ghi nhận: nén phạm vi, giới hạn hành động/lượt, minh bạch, thiết kế kết thúc.

#### 2. Hoàn thành và giữ chân

| Game | "Đã chơi" (sàn) | "Thắng / hết ván" | Nguồn |
| --- | --- | --- | --- |
| Civilization VI | 74,4% có 6 cải tiến | **37,3%** thắng ở Settler+ | [Steam stats](https://steamcommunity.com/stats/289070/achievements); 2018: 39,3% — [civfanatics](https://forums.civfanatics.com/threads/under-40-of-players-have-won-a-game-from-steam-global-achievements.626992/) |
| Total War: Three Kingdoms | 87,8% chiếm 1 vùng | **30,6%** lên Hoàng đế | [Steam stats](https://steamcommunity.com/stats/779340/achievements) |
| Crusader Kings III | 61,0% kết hôn | **4,4%** chơi tới 1453 | [Steam stats](https://steamcommunity.com/stats/1158310/achievements) |
| Humankind | 90,5% "Toe in the Water" | 11–26% thắng tùy mức khó | [Steam stats](https://steamcommunity.com/stats/1124300/achievements) |
| Old World | 65,7% chơi 1 ván đơn | **10,5%** thắng 1 ván đơn | [Steam stats](https://steamcommunity.com/stats/597180/achievements) |
| 19 game đơn (không có chiến thuật), 6/2026 | — | trung vị **36%**, dải 17–74% | [twoaveragegamers](https://www.twoaveragegamers.com/game-completion-rates/) |

Với 4X/grand strategy chỉ **1/3 đến 1/10** người mua từng thắng một ván; game đơn thường thì hơn 1/3 đi tới cuối. Old World rút ngắn rồi vẫn 10,5%: 5–8 giờ/ván với người quen, 15–20 giờ với người mới ([Steam thread](https://steamcommunity.com/app/597180/discussions/0/595140510531726130/)) vẫn là dài. Đây là tương quan, không phải nhân quả.

| Độ dài phiên | Số liệu | Nguồn |
| --- | --- | --- |
| Civ VI | 15–20 giờ ván đầu | [gamepressure](https://www.gamepressure.com/sidmeierscivilization6/game-length-how-long-to-complete/z6f7f3) |
| Into the Breach | run thành công 1–2,5 giờ | [Steam thread](https://steamcommunity.com/app/590380/discussions/0/1741103267297685557) |
| Polytopia | ~30 phút / 30 lượt | [pixelatedplaygrounds](https://www.pixelatedplaygrounds.com/sidequests/game-design-perspective-the-battle-of-polytopia) |
| Benchmark PC 2025, mọi thể loại | trung vị **18 phút/phiên**; top 25% > 30; top 1% > 100 | [gamedevreports](https://gamedevreports.substack.com/p/gameanalytics-mobile-and-pc-game) |
| Benchmark mobile 2025 | top 25% ≈ 5,2 phút; top 1% ≈ 22 | cùng nguồn |
| "Chiến thuật mobile 50+ phút/phiên" | **[chưa xác minh]** — không truy được bảng gốc theo thể loại | [gameanalytics Q1 2024](https://www.gameanalytics.com/reports/mobile-games-benchmarks-q1-2024) |

Hoàn tiền/bỏ dở theo thể loại: **không tìm được dữ liệu công khai**. Con số "~15% người chơi hoàn thành game" (PlayTracker) chỉ được trích gián tiếp — **[chưa xác minh]** ([expertbeacon](https://expertbeacon.com/what-percentage-of-people-actually-finish-games/)).

#### 3. "Nhanh mà sâu" đã thành công

| Game | Cấu trúc nén | Kết quả | Nguồn |
| --- | --- | --- | --- |
| Polytopia | 16×16, 30 lượt, 1 tài nguyên, cây công nghệ ngắn | 25M lượt tải; giải 10.000 USD 2025; Metacritic 72, bị chê "thiếu chiều sâu" | [Wikipedia](https://en.wikipedia.org/wiki/The_Battle_of_Polytopia) |
| Into the Breach (2 người, ~4 năm) | 8×8, 3 mech, địch báo đòn | Metacritic 90; 1–2M chủ sở hữu Steam (ước tính) | [Wikipedia](https://en.wikipedia.org/wiki/Into_the_Breach), [steamspy](https://steamspy.com/app/590380) |
| Slay the Spire | ~75 lá/nhân vật; **Daily Climb** seed cố định | 1,5M bản tới 3/2019 | [Wikipedia](https://en.wikipedia.org/wiki/Slay_the_Spire) |
| War.app (WarLight 2008) | Risk **lượt đồng thời**, quickmatch, không đồng bộ | > 10.000 ván/ngày | [war.app](https://war.app/Transfer?RedirectUrl=%2Fabout) |
| OpenFront.io (mã mở, 2024) | trình duyệt, lãnh thổ + liên minh, phiên ngắn | Discord 30.000+ | [wiki](https://openfront.miraheze.org/wiki/OpenFront.io) |
| Unciv | Civ V remake chạy "trên củ khoai" | 11,3k sao GitHub | [GitHub](https://github.com/yairm210/Unciv) |
| Hex Empire (Flash) | luật tối giản, chiếm thủ đô | 4,0M lượt chơi Kongregate | [kongregate](https://www.kongregate.com/en/games/uunxx/hex-empire) |
| Bad North | "systems hidden away", một đảo/màn | 500k–1M chủ sở hữu | [steamspy](https://steamspy.com/app/688420), [pocketgamer.biz](https://www.pocketgamer.biz/interview/68638/indie-spotlight-plausible-concept-on-bad-north/) |
| Wargroove | Advance Wars-like, màn ngắn | hoàn vốn trong 3 ngày | [pcgamesinsider](https://www.pcgamesinsider.biz/success-story/68577/why-chucklefishs-wargroove-made-back-its-dev-costs-within-just-three-days/) |
| Old World (15 người) | khóa 200 lượt, Orders, Ambitions, điểm làm đồng hồ | Metacritic 80; PC Gamer best strategy 2021 | [Wikipedia](https://en.wikipedia.org/wiki/Old_World_(video_game)) |
| Civ VI Online/Quick | 250/330 lượt vs 500 | **không có số liệu tỷ lệ dùng [chưa xác minh]** | [fandom](https://civilization.fandom.com/wiki/Speed_(Civ6)) |

**Cấu trúc chung:** trần lượt; bản đồ nhỏ để va chạm sớm (Polytopia gặp địch sau ~5 lượt); giới hạn hành động/lượt (Orders, 1 tài nguyên, 3 mech); thông tin gần hoàn hảo; seed + bảng xếp hạng; lượt đồng thời/không đồng bộ. Giá phải trả: nén quá tay bị chê nông (Polytopia).

#### 4. Chiến dịch sâu: bài học và chi phí

| Game | Đội | Kết quả | Vì sao |
| --- | --- | --- | --- |
| Humankind (Amplitude) | lớn | 69% tích cực / 12.385 đánh giá | "juggled too many concepts", hệ thống "opaque", late game "fall apart" — [Amplitude forum](https://community.amplitude-studios.com/amplitude-studios/humankind/forums/168-general/threads/45801-humankind-now-sits-on-69-positive-review-rating-indicating-mixed-reception-what-went-wrong?page=1), [Steam](https://store.steampowered.com/app/1124300/HUMANKIND/) |
| Millennia (Paradox, 2024) | nhỏ-vừa | 67% / 1.904; gần đây 45% | "fails to explain itself", ý tưởng "fall over once the AI gets going", UI "drab" — [aftermath](https://aftermath.site/millennia-4x-paradox-review/), [Steam](https://store.steampowered.com/app/1268590/Millennia/) |
| Old World | 15 người, nhiều năm | Metacritic 80 | phức tạp tùy chọn; nhân vật già, chết, thừa kế; "you get better games if you take longer" — [yahoo/PC Gamer](https://tech.yahoo.com/gaming/articles/soren-johnson-keeping-game-studio-215108015.html) |
| Shadow Empire | 1 người | khen sâu, "Dwarf Fortress of 4X", learning curve suýt đuổi người | tác giả: "way too ambitious", "way more imagination than time" — [explorminate](https://explorminate.org/shadow-empire-review/), [matchstickeyes](https://www.matchstickeyes.com/2022/04/03/shadow-empire-interview-with-victor-reijkersz/) |
| Songs of Syx | 1 người, từ 2015 | 94% / 6.435; 200–500k chủ sở hữu | quy mô mô phỏng khác biệt, nhiều năm EA — [Steam](https://store.steampowered.com/app/1162750/Songs_of_Syx/), [steamspy](https://steamspy.com/app/1162750) |
| Dominions 6 | 2 người, > 20 năm | 90% / 1.692; 20–50k chủ sở hữu | sâu tích lũy qua nhiều bản, chấp nhận ngách — [Wikipedia](https://en.wikipedia.org/wiki/Illwinter_Game_Design), [Steam](https://store.steampowered.com/app/2511500/Dominions_6__Rise_of_the_Pantokrator/) |
| RimWorld | 1 người 2012; 2–3 người 2013–18 | 1M bản 2/2018; > 100M USD 2020 | định vị **"story generator"**: luật gây kịch tính + AI storyteller — [Wikipedia](https://en.wikipedia.org/wiki/RimWorld) |

Game sâu thành công với đội nhỏ đều có **một cỗ máy sinh chuyện** (nhân vật, sự kiện) thay vì nhiều màn hình quản trị, và mất **nhiều năm** lặp. Game sâu thất bại vỡ ở **rõ ràng, nhịp cuối game, AI**, không phải thiếu tính năng.

**Chi phí:** Civ V cần 52 người ~3 năm ([gamedeveloper](https://www.gamedeveloper.com/business/historical-outlook-a-i-civilization-v-i-interview)); Into the Breach 2 người ~4 năm; Old World 15 người khoảng một thập kỷ sau Offworld (AMA). AI 4X "quite a challenge" vì "many nuanced systems" ([spacesector](https://www.spacesector.com/blog/2012/12/ai-design-in-4x-games-an-overview/)); Civ VI bù bằng thưởng chỉ số thay vì AI khôn ([pcgamesn](https://www.pcgamesn.com/civilization-vii/better-ai)). Mỗi hệ thống thêm = một màn hình UI + một nhánh AI + một trục cân bằng.

#### 5. Xem và cắt clip

| Bằng chứng | Số liệu | Nguồn |
| --- | --- | --- |
| Cờ vua Twitch 2020 | PogChamps 1: đỉnh 166.150 người xem, 4,76M giờ; stream cờ trung bình từ ~3.573 lên > 16.000 người xem đồng thời | [chess.com](https://www.chess.com/article/view/pogchamps-chess), [superjump](https://medium.com/super-jump/chess-is-the-most-watched-game-on-twitch-4b58ecacf30d), [escharts](https://escharts.com/news/chess-esports-viewership-success) |
| Teamfight Tactics | 15,2M giờ xem tuần đầu; 241,5M giờ năm 2022 | [pcgamesn](https://www.pcgamesn.com/teamfight-tactics/tft-twitch-views), [streamscharts](https://streamscharts.com/games/teamfight-tactics) |
| Civ Battle Royale (AI-only, 61 phe) | show hàng tuần từ 2015, cộng đồng 10k+ | [civbattleroyale.tv](https://civbattleroyale.tv/archive/what-is-the-civ-battle-royale/) |
| Video "44 nations AI battle royale" Civ VI | tồn tại; **lượt xem không truy được [chưa xác minh]** | [youtube](https://www.youtube.com/watch?v=utoIw_yNepM) |

Cái xem được có chung: **trạng thái đọc được trong một khung hình**, **chu kỳ căng–xả ngắn**, và **người kể chuyện**. Trận ngắn cho **nhiều** khoảnh khắc đóng gói sẵn; chiến dịch dài cho khoảnh khắc lớn nhưng thưa và cần biên tập nặng — CBR phải cắt ván AI chạy nhiều tháng thành tập ngắn. Với dự án "quay clip Three.js", cấu trúc ngắn thắng về **số clip trên giờ phát triển**.

#### Hàm ý cho Tam Quốc Loạn Nhập

##### (a) Kết luận

Chọn **nhánh 1, dạng "nhanh, sâu tùy chọn"**, không phải "nhanh và nông". Vì: (1) đa số người mua 4X không bao giờ thắng một ván, kể cả Old World đã rút ngắn; (2) chính người thiết kế Civ IV kết luận nửa đầu 4X là phần hay nhất và khóa lượt; (3) các game nhỏ thắng lớn đều nén; (4) game sâu cần nhiều năm lặp và AI/UI cho từng hệ thống — Humankind, Millennia có ngân sách lớn hơn ta vẫn vỡ ở độ rõ; (5) trọng tâm là xem và clip, nơi trận ngắn thắng áp đảo. **Độ chắc: trung bình** — bằng chứng là tương quan, Steam là sàn, và người mê Tam Quốc có thể chuộng chiều sâu tướng lĩnh hơn trung bình thị trường **[không có dữ liệu riêng cho tệp Việt]**.

##### (b) Hình dạng

| Tham số | Đề xuất | Căn cứ |
| --- | --- | --- |
| Số lượt | Giữ **48 mùa**, coi 48 là "đồng hồ" như Perfection 30 lượt | Polytopia, Old World |
| Thời lượng | **20–40 phút/ván**; AI-only 3–5 phút | trung vị PC 18 phút; StS/ITB 1–2,5 giờ là trần |
| Quyết định/lượt | **1 lệnh chính + tối đa 1 lệnh phụ**, mỗi lệnh có đánh đổi rõ | Meier, Orders |
| Bản đồ | Giữ 20 châu; va chạm trong ≤ 5 lượt | Polytopia |
| Giải quyết | Đồng thời (đã có); **màn reveal** là khoảnh khắc chính | War.app |
| Xây từ số 0 | Kinh tế **1 tài nguyên**, 3 bậc thành, mọc trong 12 lượt đầu; "xây" = chọn 1 trong 3 mỗi mùa, không hàng đợi | Polytopia |
| Tướng | Giữ: **3 chỉ số + 1 tính cách + 1 quan hệ** (trung/thù/ơn), sinh phản bội/đầu hàng | RimWorld, Old World |
| Liên minh | Lời hứa 4 mùa; phá hứa có hậu quả công khai | reveal đồng thời làm phản bội kịch tính |
| Tình báo | **Một dạng**: nhìn trộm lệnh 1 phe trước reveal | ITB |
| Đồn trú, thuế, hậu cần | Bỏ hoặc tự động | Johnson: người chơi xin tự động hóa quyết định chán |
| Điểm cuối 48 | Đa trục (đất, tướng, danh vọng) + **seed ngày + xếp hạng** | Knizia; StS Daily Climb |

##### (c) Câu chuyện trên giờ phát triển

- **Cao:** tướng có tính cách + quan hệ (một bảng dữ liệu, vô số tình huống); phản bội/đầu hàng lúc reveal; sự kiện mùa theo seed; "biên niên" tự sinh cuối ván. Đây là mẫu RimWorld.
- **Trung bình:** liên minh có hạn, tình báo một dạng, thiên tai theo mùa.
- **Thấp (sổ sách):** đồn trú từng thành, nhiều loại lính, thuế, hàng đợi xây, cây công nghệ dài, ngoại giao nhiều màn — mỗi thứ kéo UI + AI + cân bằng mà không thêm clip.

##### (d) Giữ game xem được

Một khung nhìn toàn 20 châu; pha reveal có nhịp (lệnh lộ lần lượt); một dòng tường thuật mỗi sự kiện sinh từ luật (CBR làm bằng tay); chế độ AI-only tự chạy để xuất clip 60 giây; seed công khai để người xem chơi lại đúng ván; ván dưới 40 phút để streamer chạy nhiều ván một phiên.

**Còn mở:** không có số liệu tỷ lệ dùng tốc độ Quick trong Civ; không có dữ liệu hoàn tiền theo thể loại; phiên chơi theo thể loại chưa xác minh; "sâu tùy chọn" mới được kiểm chứng ở quy mô 15 người — với một người + agent, phải kiểm bằng chơi thử sớm.

---

## F. TW3K và Civ VI: thắng, thua, lật lại, thông tin trước trận

<!-- nguồn cũ: docs/research/tw3k-civ-win-defeat.md -->

### TW3K và Civ VI: thắng, thua, trở lại, thông tin trước trận, khởi đầu yếu

*Tra cứu 27-09-2026. Wiki Fandom, Prima Games và totalwar.com bị chặn từ môi trường này; mục nào chỉ thấy qua đoạn trích tìm kiếm ghi **[trích]**. Mục không kiểm chứng được ghi rõ.*

#### 1. Điều kiện thắng

##### Total War: Three Kingdoms (TW3K)

| Mục | Cơ chế | Nguồn |
|---|---|---|
| Kích hoạt "Tam quốc" | Phe đầu tiên lên cấp Vương (người chơi ước ~1000 uy tín) kích hoạt sự kiện: hai phe mạnh nhất còn lại **xưng đế ngay lập tức**, quan hệ với bạn tụt ~-300, chư hầu tuyên bố độc lập. Hai phe được chọn không nhất thiết là hai phe uy tín cao nhất | [1][2][3] |
| Thắng chiến dịch | Nắm **cả ba ngai đế** (chiếm kinh đô hai đế kia hoặc ép thoái vị) **và** sở hữu **95 huyện**; đất chư hầu và thành viên "đế quốc" được tính. Chiếm đủ ba ngai mà chưa đủ 95 huyện thì chưa hiện màn thắng | [3][4][5] |
| "Realm Divide" | Không có cơ chế kiểu Shogun 2; thay bằng sự kiện tam đế ở trên. Xưng đế làm coalition tan, nhưng coalition chỉ là hiệp ước lỏng, tan không tự động thành chiến tranh | [6][1] |
| Phe không thể xưng đế | Phe "trung thành với Hán" (vd. Khổng Dung) phải chiếm một kinh đô đế mới vào được vòng cuối | [3] |
| Xưng vương tùy chọn | Từ bản 1.7 (Fates Divided) người chơi được trì hoãn xưng Vương thay vì tự động khi đủ uy tín | [7] **[trích]** |
| Giới hạn lượt | Người chơi sau phát hành: "không có giới hạn số lượt"; một chủ đề trước phát hành nói ngược lại. Kết luận: **không có**, nhưng chưa thấy nguồn chính thức | [8][9] |
| Nhịp | 5 lượt/năm. Người mới 150–250 lượt, trung bình 100–150, tối ưu 50–70. Thời gian thực: 27 h, 45 h (Normal), 55 h/145 lượt, 65 h; ước tính chung 25–35 h | [10][8][11][12] |

##### Civilization VI

| Loại | Điều kiện | Nguồn |
|---|---|---|
| Thống trị | Chiếm **mọi kinh đô gốc** (không cần mọi thành). Mất kinh đô gốc nhưng còn thành khác thì vẫn được theo đuổi loại thắng khác, chỉ không thắng thống trị cho tới khi lấy lại. Kinh đô gốc **không thể bị san bằng** vì là điều kiện thắng | [13][14] |
| Khoa học | Phóng vệ tinh, đưa người lên Mặt Trăng, lập thuộc địa Sao Hỏa | [15] |
| Văn hóa | Du khách đến thăm vượt du khách nội địa của **từng** nền văn minh khác | [16] |
| Tôn giáo | Tôn giáo của mình chiếm đa số ở mọi nền văn minh khác | [17] |
| Ngoại giao (GS) | Tích điểm qua Đại hội Thế giới, kỳ quan, công nghệ; Civilopedia không ghi con số, hướng dẫn cộng đồng ghi ~20 điểm ở tốc độ chuẩn | [18][19] |
| Điểm số | Không ai thắng trước năm 2050 (hoặc lượt tự đặt) thì phe **còn sống** có điểm cao nhất thắng; điểm gồm thành, dân, công nghệ, kỳ quan, quân sự... Giới hạn lượt và thắng điểm là hai tùy chọn tách rời | [20][21] |

Nhịp: Online 250, Quick 330, Standard 500, Epic 750, Marathon 1500 lượt; ván chuẩn ~30 giờ [22][23]. Khác biệt cốt lõi: Civ coi "hết giờ" là một đường thắng chính thức; TW3K kết thúc bằng **sự kiện** (tam đế), không bằng lượt.

#### 2. Thua và đường trở lại

##### TW3K

- **Bị diệt khi nào.** Quân thua trận rút lui và hồi phục, không biến mất; muốn xóa một phe phải bắt/giết thủ lĩnh hoặc diệt hết đơn vị [24]. Engine cho phép **phe không đất nhưng có quân**: Lưu Bị ở 190 khởi đầu không lãnh thổ, chỉ có quân của Quan Vũ và Trương Phi, được **-50% quân phí khi không có vùng**, +50 quân lương/lượt, tuyển và bổ sung quân trên đất đồng minh; đến ~194 thừa kế đất Đào Khiêm qua sự kiện [25]. Trịnh Khương cũng khởi đầu không đất ở Thái Nguyên [26] **[trích]**. Quy tắc chính xác "mất thành cuối cùng thì phe tồn tại bao lâu" **không tìm được nguồn kiểm chứng**.
- **Thủ lĩnh chết.** Người thừa kế lên thay; nếu chưa trưởng thành thì có nhiếp chính (thường là vợ) và phe đổi tên theo nhiếp chính; phe không bị xóa [27][28] **[28 trích]**. Chết không người thừa kế: cộng đồng không thống nhất, không có trả lời chính thức [29].
- **Thay thế cho cái chết.** *Chư hầu*: nộp 20% thu nhập, được chủ bảo hộ, ai đánh một bên là đánh cả hai [30] **[trích]**; đất chư hầu tính vào 95 huyện [4]; chư hầu đủ lớn sẽ tuyên bố độc lập và đánh lại, sáp nhập chư hầu bị phạt ngoại giao nặng [31]; cần cấp Hầu để ép chư hầu [32]. *Triều cống*: nộp ~10% thu nhập, không phải theo chủ ra trận [33]. *Thoái vị* (chỉ ở giai đoạn tam đế): đế AI thoái vị thì toàn bộ đất và tướng về tay bạn; AI chỉ chịu khi quân đã bị diệt và còn ít đất; người chơi thoái vị đồng nghĩa game over, chỉ có ý nghĩa đầu hàng trong multiplayer [34][35]. *Liên bang*: ví dụ Lưu Bị thừa kế Đào Khiêm ở trên [25].
- **"Last stand".** Không tìm thấy tài liệu về hành vi tử thủ riêng của AI.

##### Civ VI

- **Bị loại** khi mất **toàn bộ** thành (có hoạt hình thất bại và thông báo) [36]; chỉ mất kinh đô thì chưa [13].
- **Giải phóng / hồi sinh.** Giải phóng một thành của nền văn minh đã chết sẽ hồi sinh nó; nó giữ nguyên hiềm khích cũ, không tiến bộ công nghệ trong lúc chết và dễ sụp lại vì áp lực trung thành từ hàng xóm [37][38]; thành trả cho chủ cũ cũng hay nổi loạn [39].
- **Trung thành và thành tự do.** Trung thành 0–100; dưới 75 giảm 25% sản lượng, dưới 25 giảm 50% sản lượng và 75% tăng trưởng; về 0 thì thành nổi dậy thành **Thành tự do**, sau đó gia nhập phe gây áp lực nhiều nhất; áp lực lan 9 ô, giảm 10% mỗi ô; Hoàng kim/Anh hùng +0,5, Đen tối -0,5 mỗi dân [40][41].
- **Đen tối rồi Anh hùng.** Rơi vào Thời Đen tối thì ngưỡng Hoàng kim kế tiếp **thấp hơn**; vượt được sẽ vào Thời Anh hùng, chọn 3 cống hiến thay vì 1; thẻ chính sách Đen tối mạnh nhưng có đánh đổi [42][43].
- **Sau khi thua.** Khi phe khác thắng, nút "Just one more turn" cho chơi tiếp và có thể thắng loại khác sau [44]. Người chơi bị chiếm hết thành có được xem tiếp không: **không kiểm chứng được**.

#### 3. Thông tin trước trận

| | TW3K | Civ VI |
|---|---|---|
| Hiện gì | Bảng tiền trận: thanh cán cân lực lượng, thương vong dự kiến, dự đoán của cố vấn; nếu "ủy thác" thì dự đoán thành kết quả thật | Chọn đơn vị rồi rê chuột lên mục tiêu: danh sách hệ số (đỏ bất lợi, trắng có lợi), thanh máu còn lại dự kiến hai bên, chữ "Decisive victory / stalemate..." |
| Nguồn | [45] **[trích]** | [46][47] |
| Độ tin cậy | Dự đoán đánh giá thấp tướng cấp cao và tinh binh; đánh tay thường lật được dự đoán thua [48] | Sát thương = 30 × e^(chênh lệch/25) × ngẫu nhiên 0,75–1,25, tức sai số ±25%; chênh lệch ≥30 gần như diệt gọn [49]; thanh dự đoán không hiện số [47] |
| Ẩn gì | Quân có "stalk" vô hình tới khi kề sát, cần kỵ binh trinh sát [50]; AI dường như biết khi bạn rời vùng, cộng đồng cho là do gián điệp [51]. Có thấy quân số đồn trú trong sương mù không: **không kiểm chứng được** | Sức thủ thành công khai: bộ binh mạnh nhất -10 hoặc đơn vị đồn trú, cộng tường, quận, địa hình; bộ binh chỉ gây 15% sát thương lên tường [52]. Hệ số hiện đủ, chỉ nhiễu ngẫu nhiên là ẩn [46][49] |

#### 4. Khởi đầu yếu

**TW3K.** Không có "thời gian ân hạn" chính thức. Phe yếu được đỡ bằng *lợi thế cơ chế*, không bằng luật bảo hộ: Lưu Bị không đất nhưng quân rẻ, tuyển trên đất bạn, thừa kế Đào Khiêm [25]; Công Tôn Toản ở cực bắc, láng giềng "cực yếu", được khuyên nuốt láng giềng nhỏ trước rồi tiến về tây [53]; Trịnh Khương và Trương Yên bị chính hướng dẫn xếp là khởi đầu khó nhất, Tào Tháo dành cho người mới [54]. Lời khuyên sống sót: bất tương xâm, thương mại, đánh phe yếu hơn [55]. AI tuyên chiến vì cơ hội (đất phòng thủ kém), bị phe khác mời hoặc mua chuộc vào cuộc chiến, và "khi bạn không đánh nhau với đủ nhiều người" [56]. Coalition khởi đầu (Viên Thiệu cầm đầu) là hiệp ước lỏng, không nghĩa vụ phòng thủ chung [57] **[trích]**.

**Civ VI.** Ân hạn ngầm nằm ở *thủ tục*: man rợ phải để trinh sát **thấy thành rồi về được trại** thì trại mới sinh quân cướp; giết trinh sát trước khi nó về là hết đe dọa [58][59]. AI được thưởng theo độ khó: +20% sản xuất và vàng mỗi bậc từ Prince, +1 sức chiến mỗi bậc từ King, Immortal/Deity thêm settler và builder [60]; ở King người chơi bị tuyên chiến quanh lượt 40, thành khởi đầu sức thủ 13 "bị một Warrior xé nát" [61]. Tuyên chiến bất ngờ xảy ra khi biên giới chưa khép; tuyên chiến chính thức phải tố cáo trước 5 lượt [62]. Chương trình nghị sự công khai làm AI ghét quân đội yếu (Cleopatra) hoặc kẻ hiếu hòa (Alexander) [63]. Hình phạt hiếu chiến tăng theo kỷ nguyên; chiến tranh bất ngờ chịu thêm ~50% so với tuyên chiến chính thức [64][65]. Wiki cộng đồng nói thời Cổ đại chiến tranh bất ngờ không bị phạt, **chưa kiểm chứng** trên Civilopedia.

#### 5. Hàm ý cho Tam Quốc Loạn Nhập

**(a) Mục tiêu đo được cho "chơi được".** Cả hai game là *power fantasy*: ở độ khó mặc định thua chiến dịch là ngoại lệ, độ khó là núm vặn để người giỏi tự chọn rủi ro (Civ cộng thẳng sức chiến cho AI [60]). Đề xuất cho chính sách "người chơi hợp lý" của ta:

| Chỉ số | Hiện tại | Mục tiêu |
|---|---|---|
| Thắng (12/20, sống sót cuối, hoặc dẫn đầu lượt 48) | 0–3% | 35–55% ở mặc định (7 phe nên 14% là ngẫu nhiên; nhân vật chính phải hơn 2 lần ngẫu nhiên) |
| Bị loại trước lượt 16 | thường xuyên | dưới 5% |
| Sống đến lượt 48 | hiếm | trên 75% |
| Trung vị số lượt sống | 12–26 | trên 36 (TW3K: người tối ưu vẫn cần 50–70 lượt trên khung 100–150 [10]) |
| Thời gian thực một ván | – | 20–40 phút; 48 lượt là hợp lý so với 500 lượt/30 giờ của Civ [22][23] |

**(b) Cơ chế trở lại, không thêm tiền tệ, một lệnh mỗi lượt.**

1. **Lưu vong có hạn (kiểu Lưu Bị không đất).** Mất châu cuối thì phe không bị xóa ngay mà thành "quân lưu vong" đóng nhờ châu đồng minh hoặc châu trung lập trong 4 lượt (một năm), quân phí giảm nửa như Lưu Bị [25]; mỗi lượt vẫn ra một lệnh, chỉ *tấn công* (đoạt lại châu) hoặc *ngoại giao* có nghĩa. Hết 4 lượt không có đất, hoặc quân bị diệt, thì bị loại. TW3K làm điều này bằng quân không mất khi thua trận [24]; Civ làm bằng cấm san bằng kinh đô để còn đường hồi sinh [14].
2. **Quy phục thay vì chết (chư hầu / triều cống).** Khi còn 1 châu và bị phe mạnh gấp đôi tấn công, lệnh *ngoại giao* có thể "xưng thần": giữ châu, nộp phần thu nhập cho chủ bằng vàng sẵn có (TW3K dùng 20% chư hầu, 10% triều cống [30][33]); châu ấy tính vào mốc 12/20 của chủ như 95 huyện tính đất chư hầu [4]; chủ không được đánh chư hầu; chư hầu mất quyền thắng cho tới khi *tuyên bố độc lập*, một lệnh ngoại giao chỉ mở khi mạnh hơn chủ (TW3K để chư hầu phản khi đủ lớn [31]). Đây là lối thoát cho hoàng đế sau lượt 8 thay vì "mất bảo hộ là chết".
3. **Phục quốc qua giải phóng và trung thành.** Châu giữ nhãn "chủ gốc". Phe chiếm được châu mang nhãn của phe đã bị loại có thể *giải phóng* bằng lệnh ngoại giao: phe cũ sống lại với châu ấy và hàm ơn (Civ hồi sinh phe chết và đổi lấy quan hệ [37]). Đồng thời châu vừa bị chiếm, xa kinh đô kẻ chiếm, mỗi lượt có xác suất đổi về chủ gốc nếu chủ gốc còn sống và kề bên (Civ: thành tự do gia nhập phe gây áp lực nhiều nhất [41]). Kèm quy tắc "Đen tối rồi Anh hùng": phe còn 1 châu được +1 hiệu lực cho lệnh *nội trị/phòng thủ* cho tới khi có 3 châu [42].

**(c) Xem trước trận công bằng.** Không lộ quân số đối phương chính xác, nhưng hiện: (1) thanh cán cân 5 mức (chắc thua / bất lợi / ngang / có lợi / chắc thắng) tính từ công thức engine với sức địch được làm mờ ±25%, đúng biên độ ngẫu nhiên của Civ [49]; (2) danh sách hệ số công khai như Civ: cấp phòng thủ châu, địa hình, phe bảo hộ, hành quân xa, đồng minh kề bên [46][52]; (3) tổn thất *của mình* dự kiến theo khoảng, thay cho số chính xác, như "thương vong dự kiến" của TW3K [45]; (4) cảnh báo "có thể có viện binh" khi châu địch giáp phe thứ ba, tương ứng lời khuyên trinh sát của TW3K [50]. Ẩn: quân số thật, kế sách đối phương, viện binh.

#### Nguồn

[1] https://steamcommunity.com/app/779340/discussions/0/3647273545678698859/
[2] https://steamcommunity.com/app/779340/discussions/0/1651045226226767410/
[3] https://steamcommunity.com/app/779340/discussions/0/4630358783061699948/
[4] https://steamcommunity.com/app/779340/discussions/0/2259060348505382636/
[5] https://steamcommunity.com/app/779340/discussions/0/1734384427831052732/
[6] https://steamcommunity.com/app/779340/discussions/0/1742227264195159688/
[7] https://www.pcinvasion.com/total-war-three-kingdoms-fates-divided-faction-ranks-guide/ (Prima Games; chỉ đọc được đoạn trích)
[8] https://steamcommunity.com/app/779340/discussions/0/1642038749310647806/
[9] https://steamcommunity.com/app/779340/discussions/0/3726075043713798681/
[10] https://steamcommunity.com/app/779340/discussions/0/2942494909164716252/
[11] https://steamcommunity.com/app/779340/discussions/0/1640915206454916528/
[12] https://www.playbite.com/q/how-long-to-beat-total-war-three-kingdoms
[13] https://www.civilopedia.net/standard-rules/concepts/victory_2
[14] https://steamcommunity.com/app/289070/discussions/0/3763355214775742828/
[15] https://www.civilopedia.net/en-US/gathering-storm/concepts/victory_3
[16] https://www.civilopedia.net/en-US/gathering-storm/concepts/victory_4
[17] https://www.civilopedia.net/en-US/gathering-storm/concepts/victory_5
[18] https://www.civilopedia.net/en-US/gathering-storm/concepts/diplomatic_victory/
[19] https://exputer.com/guides/civ-6-diplomatic-victory/
[20] https://www.civilopedia.net/en-US/gathering-storm/concepts/victory_6
[21] https://steamcommunity.com/app/289070/discussions/0/2592234299535727708/
[22] https://forums.civfanatics.com/threads/game-speed-what-is-it.625193/
[23] https://comradekaine.com/civilization6/settings/civ6-game-speed/
[24] https://steamcommunity.com/app/779340/discussions/0/1651045226223184525/
[25] https://steamcommunity.com/app/779340/discussions/0/4339851480050053792/
[26] https://totalwar.fandom.com/wiki/Zheng_Jiang_(faction) (chỉ đọc được đoạn trích)
[27] https://steamcommunity.com/app/779340/discussions/0/1636417554420056240/
[28] https://totalwar.fandom.com/wiki/Faction_Regent_(Total_War:_Three_Kingdoms) (chỉ đọc được đoạn trích)
[29] https://steamcommunity.com/app/779340/discussions/0/1640915206486492574/
[30] https://totalwar.fandom.com/wiki/Vassal_(Total_War:_Three_Kingdoms) (chỉ đọc được đoạn trích)
[31] https://steamcommunity.com/app/779340/discussions/0/3647273545678610435/
[32] https://steamcommunity.com/app/779340/discussions/0/1651045226233010069/
[33] https://steamcommunity.com/app/779340/discussions/0/1642038749327428600/
[34] https://steamcommunity.com/app/779340/discussions/0/1639787494964475286/
[35] https://steamcommunity.com/app/779340/discussions/0/2639622942687544643/
[36] https://steamcommunity.com/app/289070/discussions/3/1696040635904556482/
[37] https://steamcommunity.com/app/289070/discussions/0/1734384016500069803/
[38] https://forums.civfanatics.com/threads/resurrecting-defeated-civs.651088/
[39] https://steamcommunity.com/app/289070/discussions/0/1696040635921617443/
[40] https://www.civilopedia.net/en-US/gathering-storm/concepts/loyalty_1/
[41] https://www.civilopedia.net/en-US/gathering-storm/concepts/free_cities_1/
[42] https://www.civilopedia.net/en-US/rise-and-fall/concepts/golden_ages_1/
[43] https://www.pcgamesn.com/civilization-vi/civilization-6-rise-and-fall-guide-era-score-dark-ages-governors
[44] https://steamcommunity.com/app/289070/discussions/0/340412122418852698/
[45] https://totalwar.fandom.com/wiki/Battle_(Total_War:_Three_Kingdoms) (chỉ đọc được đoạn trích)
[46] https://gamerant.com/civilization-6-best-combat-modifiers/
[47] https://forums.civfanatics.com/threads/damage-preview.601884/
[48] https://steamcommunity.com/app/779340/discussions/0/1642038749312265616/
[49] https://forums.civfanatics.com/threads/hans-lemurson-figures-out-the-combat-formula.606147/
[50] https://steamcommunity.com/app/779340/discussions/0/2838914020271391668/
[51] https://steamcommunity.com/app/779340/discussions/0/1651045226227543371/
[52] https://www.civilopedia.net/en-US/gathering-storm/concepts/combat_9/
[53] https://www.gamepur.com/guides/total-war-three-kingdoms-playing-gongsun-zan
[54] https://www.gamepressure.com/total-war-three-kingdoms/all-available-warlords/z9c420
[55] https://www.retbit.com/2026/01/29/10-total-war-three-kingdoms-tips-for-campaigns/
[56] https://steamcommunity.com/app/779340/discussions/0/1640916564850047875/
[57] https://totalwar.fandom.com/wiki/Coalition (chỉ đọc được đoạn trích)
[58] https://gamerwalkthroughs.com/civilization-6/game-mechanics/
[59] https://forums.civfanatics.com/threads/i-find-that-the-only-way-to-enjoy-civilization-vi-is-to-turn-barbarians-off.625836/
[60] https://www.thegamer.com/civilization-6-difficulty-levels-explained/
[61] https://steamcommunity.com/app/289070/discussions/0/2741975115067128525
[62] https://forums.civfanatics.com/threads/surprise-war.681883/
[63] https://www.pcgamesn.com/civilization-vi/leaders-agendas
[64] https://www.civilopedia.net/en-US/gathering-storm/concepts/diplo_3/
[65] https://www.civilopedia.net/en-US/standard-rules/concepts/combat_11/

---

## G. TW3K và Civ VI: giữ đất, mở ván, mộ binh, tướng, tương tác bản đồ

<!-- nguồn cũ: docs/research/tw3k-civ-buildup-economy-generals.md -->

### Nghiên cứu: giữ đất, xây từ đầu, chiêu binh, tướng lĩnh, tương tác bản đồ (TW3K & Civ VI)

Phạm vi: 5 câu hỏi + hàm ý cho Tam Quốc Loạn Nhập (TQLN). Không bàn thắng/thua, comeback, preview trận, underdog (agent khác lo).
Nguồn: các wiki Fandom bị chặn khi mở trực tiếp trong phiên này; chỗ chỉ dựa vào trích đoạn tìm kiếm của Fandom đánh dấu **(F)**. Số do người chơi báo trên Steam đánh dấu **(nc)**. Nguồn đánh số ở cuối.

#### 1. Ổn định lãnh thổ: vì sao thành không đổi chủ mỗi lượt

##### TW3K

| Cơ chế | Cách hoạt động | Nguồn |
|---|---|---|
| Đồn trú tự sinh | Retinue từ town centre + công trình quân sự + retinue của administrator rảnh; không upkeep, bị "trói" vào thành. nc: 1 retinue gốc + 1 công trình quân sự + 1 administrator; làng tối đa 2. Cố ý để yếu, buộc dùng quân thật giữ đất. | [8][9][10][66] |
| Tường phải vây | Thành không tường bị đánh ngay, có tường phải bao vây (F). Mỗi lượt vây → "siege escalation": tường/tháp tự hư, công trình hỏng, quân thủ bị phạt sĩ khí; nc hay vây 2 lượt rồi đánh. Bộ binh leo tường bằng móc, chịu debuff mệt (nc: −15% tốc độ, −25% giáp, −30% công); ram chế trong menu vây, pháo chỉ Strategist tuyển được. | [1][2][3][4][34] |
| Tiêu hao, sally out | Tiêu hao khi hết tiếp tế, ngân khố = 0 hoặc địa hình xấu; mùa đông rút tiếp tế nhanh. Bên thủ cạn kho sau ~2 lượt rồi mất ~30 lính/đơn vị/lượt (nc). Quân thủ có thể xông ra cùng đồn trú và quân bạn trong vùng kiểm soát của thành. | [6][7][5] |
| Hồi quân | Chỉ ở đất mình, theo dân số vùng đóng, tiếp tế, tướng, stance; ~9 lượt hồi đầy một đơn vị (nc); encamp tốn 50% điểm hành động, sinh tiếp tế (F). | [11][12] |
| Trật tự | Public order −100 → quân phản loạn sinh trong quận, mộ thêm mỗi lượt (F). Tăng nhờ quân đóng trong thành, giảm/miễn thuế, công trình, cải cách, administrator. | [13][14][15][8] |
| Phải đi tới được | Thanh di chuyển (viền vàng), đích xa đi nhiều lượt, qua sông tốn nửa thanh (nc); vòng đỏ ZoC: địch không đi xuyên trừ khi tấn công; đứng trong vòng địch thì lượt sau địch phải đứng lại hoặc đánh. | [16][17][18] |

##### Civ VI

| Cơ chế | Số liệu | Nguồn |
|---|---|---|
| Sức thủ thành | = đơn vị cận chiến mạnh nhất đã chế − 10, hoặc = đơn vị đồn trú; + mỗi district còn nguyên. | [19] |
| Tường | Cận chiến gây 15% lên tường, bắn xa 50%, Bombard 100% → cần công thành; tường chỉ sửa bằng project sau 3 lượt không bị đánh; Ram/Siege Tower cho quân thường phá/vượt tường. | [19][20] |
| Hồi máu | ~20 HP/lượt; chỉ ngừng khi cả 6 ô quanh bị chiếm/ZoC; cung thủ mặc định không có ZoC. | [19][21] |
| Chiếm | HP về 0 rồi đơn vị cận chiến tiến vào; "thường mất nhiều lượt". | [19][22] |
| Loyalty | 0–100; áp lực từ dân trong 9 ô, −10%/ô; tối đa ±20/lượt → lật sau ~5 lượt; về 0 → Free City rồi theo phe ép mạnh nhất; thành vừa chiếm 50%, −5 chiếm đóng, +5 có đồn trú, +8 có governor. | [23][24] |

##### Nguyên tắc làm lãnh thổ "dính"
1. Phòng thủ cục bộ: đồn trú sinh từ công trình và tướng tại chỗ, không phải tổng quân chia đều (ngược với TQLN hiện tại).
2. Tường là "khóa" cần công cụ riêng (bombard, ram, hoặc N lượt vây) → chiếm một thành tốn ≥ 2–3 lượt.
3. Bên tấn công trả giá theo thời gian (tiếp tế, tiêu hao); bên thủ ở nhà được hồi.
4. Đồng hồ thứ hai chậm hơn (loyalty / public order) làm thành vừa chiếm dễ mất lại, nhưng có "nút chữa" rõ: đồn trú, governor/administrator.
5. Tới được thành đã là một quyết định (điểm di chuyển, ZoC).

#### 2. Khởi đầu và xây dựng

##### Civ VI: 20 lượt đầu
- Bắt đầu: 1 Settler (đã đứng chỗ tốt) + 1 Warrior; lượt 1 lập kinh đô hoặc đi ≤ 2 ô rồi lập ở lượt 2–3; chọn tech đầu (Pottery/Animal Husbandry/Mining/Sailing/Astrology), civic, sản phẩm đầu [25][26].
- Thứ tự phổ biến: Scout → Slinger/Warrior nếu bị đe dọa → Monument → Builder (3 lượt dùng) → Settler khi dân ≥ 2 [27][28][26]. Mốc: Settler đầu ~lượt 12–20, thành thứ hai ~lượt 25–35, 3 thành trước lượt 50 [26][28].
- Mỗi lượt: đi warrior, đổi sản phẩm khi xong, chọn tech/civic khi xong, dùng builder. "Từ tay trắng" = mọi thứ trên bản đồ do mình tạo, mỗi lượt 1–3 lựa chọn nhỏ, kết quả hiện sau vài lượt.

##### TW3K: khởi đầu (chiến dịch 190)

| Phe | Bắt đầu với | Nguồn |
|---|---|---|
| Tào Tháo | Quận Chen, có Hạ Hầu Đôn + Hạ Hầu Uyên; phải đánh tay sai nhà Hán rồi gom Chen. | [30] |
| Lưu Bị | Không đất, một đạo dân binh ở Dong, có Quan Vũ + Trương Phi; địa vị thấp nên chỉ được 1 quân (F). | [30][33] |
| Tôn Kiên | Ở Giang Lăng xa nhà, phải về Trường Sa; gốc thương nhân, cảng cho thêm thương mại. | [30] |

Vòng lặp xây/mộ:
- Mộ quân: chọn quận → "raise army" → chọn nhân vật chỉ huy; tối đa 3 retinue × 6 đơn vị; tướng mới tự mang ≥ 2 đơn vị theo class (F); đơn vị tuyển xong ngay nhưng quân số thấp, "muster" dần vài lượt; Instinct giảm giá mộ [32][33][34][15].
- Công trình: town centre sinh prestige, nâng cấp mở thêm ô; mỗi quận chỉ xây 1 công trình một lúc; 5 nhóm màu (nông/quân/chính/kinh tế/chợ), nhóm này giảm giá nhóm kia; huyện 1 ô chuỗi định sẵn (F). Số lượt xây cụ thể: **không xác minh được** [8][68].
- Thu nhập (F): peasantry theo dân số; commerce từ chợ/cảng (cộng hưởng mạnh); industry từ mỏ/xưởng (nền cao); thanh thuế chung + miễn thuế từng quận [35][8].
- Thương mại: hiệp ước có giá trị/lượt tăng dần (nc: ~1500/lượt về sau), mất hiệu lực nếu kinh đô bị vây; mặc cả bằng điểm (xin tiếp tế −5, đưa 300 tiền +4); đổi được cả vùng đất [36][37].
- Cải cách: 1 mỗi 5 lượt (mùa xuân), 5 nhánh, mở đơn vị/công trình/bonus [38][15].
- Records vs Romance: Romance = tướng là đơn vị anh hùng đơn lẻ, có duel và kỹ năng; Records = tướng đi cùng cận vệ, không duel chủ động, không kỹ năng, quân mệt nhanh, đội hình quan trọng hơn [39][40].

#### 3. Chiêu binh và kinh tế trong ngân sách ít lệnh

| Game | Ngân sách lệnh/lượt | Làm gì với đất/quân mình | Nguồn |
|---|---|---|---|
| Polytopia | Giới hạn bằng sao: thành sinh 1 sao/lượt/cấp, kinh đô +1 (F); Perfection 30 lượt | Đi mọi đơn vị; tiêu sao mua tech, đơn vị (Warrior 2), thu tài nguyên → dân → lên cấp thành (+1 sao/lượt) | [41][42][43] |
| Slay | Mỗi quân 1 hành động: chặt cây hoặc tấn công ô kề | +1 vàng/ô trống, lương 2/6/18/54; nông dân 10, lâu đài 15; ghép 2 quân → mạnh hơn; không trả nổi lương → quân chết | [44] |
| Antiyoy | Như Slay, có undo | Farm tăng thu, tower phòng thủ (có upkeep) | [45] |
| Hex Empire | 5 lệnh/lượt, mỗi quân đi 1 lần | Mỗi thành tự +10 lính/lượt | [46] |
| Risk | 3 pha: đặt quân (lãnh thổ/3 + châu lục + thẻ), tấn công tùy ý, đúng 1 lần củng cố | Chọn nơi đặt viện quân; chuyển quân giữa 2 ô kề 1 lần | [47] |
| TW3K | Mỗi quân 1 thanh di chuyển; mỗi quận 1 công trình; 1 cải cách/5 lượt | Stance; tuyển vào retinue; bổ nhiệm administrator; thanh thuế | [16][8][38] |

Bài học: ngân sách hẹp vẫn "xây được" khi (1) tài nguyên tích lũy theo lượt gắn với từng ô đất, (2) lệnh rẻ nhất là "đặt tài nguyên vào đâu", (3) mỗi đơn vị/ô đất có đúng một hành động.

#### 4. Tướng lĩnh: câu chuyện và buff

##### TW3K

| Lớp | Nội dung | Nguồn |
|---|---|---|
| 5 chỉ số | Authority (thỏa mãn người khác, sĩ khí), Expertise (giảm giá xây, né đòn), Cunning (tiếp tế, đạn), Instinct (giảm giá mộ, sát thương), Resolve (máu, dân số); mỗi class thiên 1 chỉ số, 1 loại quân | [34][49] |
| Trait, kỹ năng | Trait cộng/trừ chỉ số và quan hệ, có trait giảm trật tự nơi đóng; cấp 1–10, cây 15 ô, tối đa 12 điểm; lên cấp nhờ trận, chức, nhiệm vụ (F) | [48][50][49] |
| Guanxi | Bạn/kình địch → Oathsworn/Nemesis; hình thành khi cùng sự kiện, cùng trận, đóng gần; ba anh em Lưu-Quan-Trương đánh tốt hơn khi cùng trận; bắt tướng địch → thả hoặc thu nạp, "gặp lại nhiều lần" | [51][52][49] |
| Thỏa mãn | Tăng nhờ lương/tước, chức, quà (F); giảm khi cạnh kình địch; quá thấp → bỏ sang phe khác; mộ kẻ thù của người kế vị → có thể nội chiến | [15][53][52] |
| Administrator | Tăng thu, giảm tham nhũng, tăng cap quân, buff theo class (F); retinue tự thành đồn trú | [54][9] |
| Chết | Chết già (~60+, ngẫu nhiên); bị bắt → thả/mộ/chém; tướng huyền thoại chỉ chết khi đã bị thương; Records dễ chết hơn | [55][56] |

##### Civ VI
- Great General: +5 sức chiến, +1 di chuyển cho quân bộ trong 2 ô, chỉ với quân cùng kỷ nguyên hoặc kế tiếp (F; CivFanatics: "+1 move +5 CS for 2 eras"); mỗi vị có "Retire" riêng (Tôn Tử → Binh pháp; Boudica → thu phục man rợ kề bên) [57][58][59].
- Governor: 7 nhân vật có tên, mỗi thành 1 người; title từ civic/Government Plaza; 3–5 lượt "thiết lập"; +8 loyalty; cây thăng cấp; Victor: +5 quân đồn trú, nấc "thành không thể bị vây" [60][61].

Ít luật nhất mà có chuyện: Governor kiểu Civ (tên + đặt vào thành + một số + vài nấc) sinh chuyện "ai giữ thành nào"; TW3K sinh chuyện bằng quan hệ đôi + thỏa mãn + chết/đào ngũ, ba biến, không cần cây kỹ năng.

#### 5. Từ vựng tương tác bản đồ

| Hành động | dat.city (Ryan Sael) | TW3K campaign |
|---|---|---|
| Kéo trái | Pan | Giữ chuột giữa kéo hoặc WASD; Q/E xoay |
| Kéo phải | Xoay camera | — |
| Cuộn | Zoom | Zoom; zoom xa → bản đồ chiến lược |
| Click trái | Quận phát sáng → mở panel dataset | Chọn thành (panel công trình/đồn trú) hoặc quân (panel retinue) |
| Click phải | — | Ra lệnh đi/đánh mục tiêu; giữ chuột phải xem điểm di chuyển còn lại (F) |
| Hover | Không xác minh được | Tooltip trên thành/quân/nút |
| Camera stop | "Follow FPV", "Auto", chỉnh giờ trong ngày | Click quân/thành trong panel → camera bay tới; reset camera, ghim kinh đô |
| Hủy, khác | — | Backspace dừng di chuyển; hotkey mở Court/Diplomacy/Reform/Treasury; bật/tắt nhãn thành |

Nguồn: [62][63][64][65][15][18][10][67].

#### Hàm ý cho Tam Quốc Loạn Nhập

##### (a) Hành động "đất của tôi / quân của tôi", vẫn 1 lệnh chính/lượt

| Thêm | Cách gọn | Tương tự |
|---|---|---|
| 1. Chọn xây miễn phí mỗi châu | Mỗi lượt, mỗi châu chọn 1 trong 3: Ruộng (+lương), Đồn (+fort), Chợ (+uy tín); mặc định Ruộng; xong sau 2–3 lượt; vùng ngoại vi (Tây Vực, Giao Chỉ, Tây Tạng) có chuỗi riêng (ngựa, lúa, muối) | TW3K 1 công trình/quận [8]; Civ hàng đợi sản xuất [27] |
| 2. Đồn trú tại chỗ | Fort sinh quân thủ cố định (fort 1 = 10% quân phe, fort 3 = 30%), không rút, không tính vào quân cơ động → bỏ chia đều tổng quân; fort ≥ 2 phải vây 2 lượt | TW3K đồn trú từ công trình [8][9]; Civ tường cần bombard [19] |
| 3. Cắm tướng | Kéo tướng vào châu (thái thú: +fort, +loyalty) hoặc vào đạo quân (+tấn công); đổi chỗ tốn 1 lượt "thiết lập" | TW3K administrator [54]; Civ governor 3–5 lượt [61] |
| 4. Củng cố 1 lần | Chuyển quân giữa 2 châu kề đúng 1 lần/lượt, miễn lệnh chính | Risk pha fortify [47] |

##### (b) "Bắt đầu từ nhỏ" cho 4 hoàng đế (8 lượt đầu)
- Khởi đầu: 1 châu ngoại vi, fort 1, lương ít, **không có quân sẵn**; 1 tướng + 1 "hạt giống" theo phe (Tần: dân binh; Đường: kỵ; Minh: nông dân; Hán Vũ: ngựa). Như Lưu Bị không đất nhưng có Quan-Trương [30], Civ 1 settler + 1 warrior [25].
- L1–2: xây đầu (Ruộng) + chiêu binh (tốn lương, quân "muster" 2 lượt như TW3K [32]). L3: cải cách đầu (1 trong 3 nhánh; 4 lượt = 1 năm được 1 lần, như TW3K 5 lượt/xuân [38]). L4–5: tướng thứ hai xin theo (sự kiện). L6–8: đánh châu trung lập kề (fort 1 chiếm ngay; fort ≥ 2 vây 2 lượt). Mốc: 2 châu ở lượt 8, như Civ "3 thành lượt 50" [28].

##### (c) Lớp tướng tối thiểu tạo chuyện
Mỗi tướng: tên, 2 chỉ số (Võ = +tấn công, Trị = +lương/+loyalty), 1 trait; vị trí (châu hoặc quân); 1 quan hệ đôi (bạn/kình địch, kể cả với tướng phe địch); thỏa mãn 0–100 giảm khi không có chức hoặc ở cùng kình địch, ≤ 30 → bỏ sang phe địch; thua trận có thể bị bắt → thả/mộ/chém. Như TW3K guanxi + satisfaction + capture [51][52][56], Civ governor placement [60]. Nhật ký sự kiện ghi lại thành câu chuyện.

##### (d) Từ vựng tương tác nên áp dụng
Click trái = chọn (châu → panel: chủ, fort, đồn trú, thái thú, đang xây; quân → panel: tướng, quân số); click phải = ra lệnh cho thứ đang chọn lên mục tiêu (đánh/chuyển quân); hover = tooltip 1 dòng; kéo trái pan, kéo phải xoay, cuộn zoom như dat.city [62]; mỗi châu và mỗi đạo quân là một "camera stop", click tên trong panel → bay tới [64]; Backspace/Esc hủy lệnh chưa xác nhận [18]; nút "Auto/Follow" cho chế độ xem clip [62].

#### Nguồn
1. https://totalwar.fandom.com/wiki/Siege_(Total_War:_Three_Kingdoms) (F)
2. https://steamcommunity.com/app/779340/discussions/0/1651045226236189658/
3. https://steamcommunity.com/app/779340/discussions/0/1651045226220768342/
4. https://steamcommunity.com/app/779340/discussions/0/1640915206463776247/
5. https://segmentnext.com/total-war-three-kingdoms-siege-guide-how-to-siege-outcomes/
6. https://steamcommunity.com/app/779340/discussions/0/4295944344101162223/
7. https://steamcommunity.com/app/779340/discussions/0/1651045226223807451/
8. https://gameplay.tips/guides/4232-total-war-three-kingdoms.html
9. https://steamcommunity.com/app/779340/discussions/0/1639787494961248397/
10. https://steamcommunity.com/app/779340/discussions/0/1642038659011205859/
11. https://steamcommunity.com/app/779340/discussions/0/7318962605496304500/
12. https://totalwar.fandom.com/wiki/Army_(Total_War:_Three_Kingdoms) (F)
13. https://www.gamepressure.com/total-war-three-kingdoms/public-order/zec452
14. https://totalwar.fandom.com/wiki/Rebellion (F)
15. https://www.feralinteractive.com/en/manuals/threekingdomstw/1.0/steam/?access=zooevrj6xb
16. https://academy.totalwar.com/campaign-moving-armies-exploration-and-stances/
17. https://steamcommunity.com/app/779340/discussions/0/1642043096899840526/
18. https://www.noobfeed.com/articles/total-war-three-kingdoms-stop-enemy-armies-running
19. https://www.civilopedia.net/en-US/gathering-storm/concepts/combat_9/
20. https://www.player.one/civ-6-guide-how-siege-cities-and-conquer-your-enemies-564550
21. https://forums.civfanatics.com/threads/city-keeps-healing-under-siege.603205/
22. https://www.thegamer.com/civilization-6-conquer-city-military-walkthrough/
23. https://www.civilopedia.net/en-US/gathering-storm/concepts/loyalty_1/
24. https://forums.civfanatics.com/resources/civ-vi-loyalty-guide.27114/
25. https://www.pcgamesn.com/civilization-vi/civilization-6-strategy-guide-starting-tips
26. https://forums.civfanatics.com/threads/civ-vi-early-game-guide-for-the-decidedly-average-feedback-welcome.644711/
27. https://gamerant.com/civ-6-early-build-order/
28. https://comradekaine.com/civilization6/build-order-best-opening-moves/
30. https://academy.totalwar.com/three-kingdoms-warlords/?lang=en
32. https://www.gamepressure.com/total-war-three-kingdoms/managing-and-controlling-the-army/z1c4a9
33. https://totalwar.fandom.com/wiki/Retinue_(Total_War:_Three_Kingdoms) (F); https://totalwar.fandom.com/wiki/Liu_Bei_(faction) (F)
34. https://www.player.one/total-war-three-kingdoms-guide-learn-more-attributes-classes-128833
35. https://totalwar.fandom.com/wiki/Treasury_(Total_War:_Three_Kingdoms) (F)
36. https://steamcommunity.com/app/779340/discussions/0/3158630999985096288/
37. https://www.pcgamesn.com/total-war-three-kingdoms/diplomacy-tactics-guide
38. https://segmentnext.com/total-war-three-kingdoms-reform-trees-and-branches-guide/
39. https://www.gamepressure.com/total-war-three-kingdoms/romance-and-records-modes/zdc43c
40. https://en.wikipedia.org/wiki/Total_War:_Three_Kingdoms
41. https://en.wikipedia.org/wiki/The_Battle_of_Polytopia
42. https://www.andrewnoske.com/wiki/The_Battle_of_Polytopia_(game)
43. https://polytopia.fandom.com/wiki/City (F)
44. https://www.windowsgames.co.uk/slayRules.html
45. https://indie-hive.com/antiyoy-review/
46. https://jayisgames.com/review/hex-empire.php
47. https://gamerules.com/rules/risk-board-game/
48. https://www.gamepur.com/guides/three-kingdoms-maintaining-generals
49. https://www.gameshedge.com/total-war-three-kingdoms-characters-guide/
50. https://totalwar.fandom.com/wiki/Skill_(Total_War:_Three_Kingdoms) (F)
51. https://segmentnext.com/total-war-three-kingdoms-character-relationships-guide/
52. https://www.pcgamesn.com/total-war-three-kingdoms/total-war-three-kingdoms-interview-generals
53. https://totalwar.fandom.com/wiki/Satisfaction (F)
54. https://totalwar.fandom.com/wiki/Administrator (F)
55. https://steamcommunity.com/app/779340/discussions/0/1639787494948349576/
56. https://steamcommunity.com/app/779340/discussions/0/2999900467538034452/
57. https://forums.civfanatics.com/threads/when-should-i-retire-a-general.606893/
58. https://www.civilopedia.net/en-US/gathering-storm/units/unit_great_general/
59. https://civilization.fandom.com/wiki/Great_General_(Civ6) (F); https://civilization.fandom.com/wiki/Sun_Tzu_(Civ6) (F); https://civilization.fandom.com/wiki/Boudica_(Civ6) (F)
60. https://www.civilopedia.net/en-US/gathering-storm/concepts/governors_1/
61. https://www.player.one/civilization-6-rise-fall-expansion-guide-governors-124051
62. https://dat.city/
63. https://www.ryansael.com/
64. https://academy.totalwar.com/campaign-keyboard-and-mouse-controls/
65. https://www.gamepressure.com/total-war-three-kingdoms/controls-and-key-bindings/zac421
66. https://academy.totalwar.com/campaign-provinces-and-settlements/
67. https://steamcommunity.com/app/779340/discussions/0/1637536330474360307/ (F)
68. https://totalwar.fandom.com/wiki/Building_(Total_War:_Three_Kingdoms) (F)

---

## H. Sương mù, tình báo, tin trễ, tin giả

<!-- nguồn cũ: docs/research/intel-delay.md -->

### Sương mù, tình báo và tin trễ trong game chiến lược — hàm ý cho Tam Quốc Loạn Nhập

> Nghiên cứu 2026-09-27. Không bàn thắng/thua, kinh tế, tướng (agent khác lo). Mỗi ý có link; mục 7 liệt kê thứ chưa kiểm chứng được.

**Tóm tắt.** Các game khảo sát làm ba việc với thông tin: *che* theo tầm nhìn kề (Civ, TW3K, Diplomacy Fog of War), *bán* tin theo cấp (Civ: 5 cấp tầm nhìn ngoại giao; ROTK 8: lệnh Do thám hạn 12 tháng; ROTK 14 PK: tài nguyên "quân tình"), *làm nhiễu* theo nguồn (Dominions: sai số 0–50 % tuỳ nguồn; Command Ops: dấu "vị trí cuối" và cảnh báo tin cũ; Kriegsspiel: trọng tài giữ thư một hai lượt hoặc đưa cho địch). Tin *trễ* thật sự chỉ có ở Kriegsspiel, Command Ops, Flashpoint. Sử liệu Hán: công văn đi hết bản đồ trong 1–3 tuần, tin dân gian 1–2 tháng — đều ngắn hơn một mùa, nên "trễ một lượt" chỉ nên áp cho *lời đồn*, không cho *sự kiện công khai*.

#### 1. Civilization VI

| Lớp | Cơ chế | Nguồn |
| --- | --- | --- |
| Sương mù | Chưa khám phá (đen) → đã khám phá nhưng mất tầm nhìn (giữ địa hình, tài nguyên, thành, kỳ quan; **ẩn quân**) → đang thấy. Không có tầm nhìn vĩnh viễn. | [Fog of war](https://civilization.fandom.com/wiki/Fog_of_war), [Steam](https://steamcommunity.com/app/289070/discussions/0/340412122409528184) |
| Tầm nhìn | Đa số quân 2 ô; settler/vài tàu 3; máy bay ≥4; thành nhìn 1 ô ngoài biên; thương nhân, gián điệp cũng cho tầm nhìn. | [Sight](https://civilization.fandom.com/wiki/Sight_(Civ6)) |
| 5 cấp tầm nhìn ngoại giao | None → Limited → Open → Secret → Top Secret. Mỗi thứ +1 cấp với một nước: phái đoàn/đại sứ, tuyến thương mại, Listening Post, liên minh; tech Printing và Catherine +1 với mọi nước. Gián điệp và liên minh không cộng dồn. | [Civilopedia](https://www.civilopedia.net/en-US/gathering-storm/concepts/diplo_4/), [Delegations](https://www.civilopedia.net/en-US/gathering-storm/concepts/diplo_8/) |
| Mỗi cấp lộ gì | None: tuyên chiến, lên án, kết bạn, liên minh, lập tôn giáo, kỳ quan xong. Limited: ý kiến về bạn, thể chế. Open: agenda, quan hệ với nước khác. Secret/Top Secret: bấm thành xem chi tiết; gossip "tăng quân", "chuẩn bị chiến tranh", đổi chiến lược thắng. | [Wiki](https://civilization.fandom.com/wiki/Diplomatic_Visibility_and_Gossip_(Civ6)), [LadiesGamers](https://ladiesgamers.com/civilization-6-switch-beginners-guide-7-diplomacy/) |
| Gossip | Thông báo **ngay trong lượt**, không trễ, gom vào Gossip report. Rất nhiều loại: luyện quân, xây quận, đổi chính sách, bao vây thành, "Attack launched", "Preparation for war". | [Gossip Trim](https://steamcommunity.com/sharedfiles/filedetails/?id=1699536058) |
| Gián điệp | Mở ở Renaissance; tối đa ~5. Nhiệm vụ 8–16 lượt; tỉ lệ cơ bản: Siphon Funds/Fabricate Scandal/Foment Unrest 56 %, Sabotage/Steal Tech 35 %, Heist/Partisans 10–20 %. Listening Post +1 cấp khi đang chạy; Gain Sources: gián điệp ở thành đó tính cao hơn 2 cấp trong 24 lượt. | [Spy](https://www.civilopedia.net/en-US/rise-and-fall/units/unit_spy/), [GameRant](https://gamerant.com/civilization-6-spies-steal-great-works-gold/) |
| Bị bắt | Kết quả: thành công / thất bại không lộ / bị bắt / bị giết. Counterspy **ẩn**, không hiện trong tỉ lệ bạn thấy, kéo cơ hội "xuống gần 0". Bị bắt → có thể chuộc; nước bị do thám giảm thiện cảm mạnh. | [Civilopedia](https://www.civilopedia.net/en-US/gathering-storm/concepts/diplo_5/), [Steam](https://steamcommunity.com/app/289070/discussions/0/3441214221465032698/), [CivFanatics](https://forums.civfanatics.com/threads/secrets-about-spies.607065/) |
| Thưởng chiến đấu | +3 sức chiến đấu mỗi *bậc chênh* tầm nhìn, tối đa +12; Mông Cổ gấp đôi. Tuyên chiến huỷ phái đoàn/thương mại nên chỉ giữ được qua Mông Cổ, Printing, Listening Post. | [Wiki](https://civilization.fandom.com/wiki/Diplomatic_Visibility_and_Gossip_(Civ6)), [CivFanatics](https://forums.civfanatics.com/threads/diplomatic-visibility-and-combat.651343/) |

Người chơi biết "X đang làm gì" bằng ba kênh chồng nhau: thấy quân trên bản đồ, dòng gossip *mở khoá theo cấp*, gián điệp nâng cấp tạm. Civ chỉ *che*, không *nhiễu*.

#### 2. Total War: Three Kingdoms

- **Lượt = một mùa**, 5 mùa/năm. [Seasons](https://totalwar.fandom.com/wiki/Seasons_(Total_War:_Three_Kingdoms))
- **Sương mù chiến dịch**: không có đơn vị trinh sát; "sương che hết, đôi khi không thấy cả chủ châu kề"; muốn nhìn phải dùng gián điệp. [Steam](https://steamcommunity.com/app/779340/discussions/0/1651045226226978167/)
- **Undercover Network**: thả nhân vật để phe địch *tự tuyển*; *ngay khi đang xin việc* đã lộ vàng, lương, dân số, số thành, thái thú của địch. Hai tài nguyên: Undercover Network (toàn phe) và Cover (tích luỹ theo lượt). Thất bại/thiếu tài nguyên → bị bắt → xử, thả, hoặc bị *lật thành gián điệp hai mang*. Dấu hiệu: tướng địch lâu năm bỗng xin về với ta. [Gamepressure](https://www.gamepressure.com/total-war-three-kingdoms/undercover-network-spies/z4c47f)
- **Thang leo**: mới vào → tầm nhìn thành địch; lên tướng → *thấy quân địch di chuyển*; thái thú → tác động thành; thừa kế → châm nội chiến. CA: "hành động của gián điệp luôn thành công, rủi ro nằm ở bị lộ". [PCGamesN](https://www.pcgamesn.com/total-war-three-kingdoms/total-war-three-kingdoms-spies-espionage)
- **Hành động cấp tướng**: Infiltrate Army, Leak Marching Orders, Falsify Marching Orders, Deny/Poison Military Provisions. [Gaming Nexus](https://www.gamingnexus.com/News/43117/The-Spy-Segment-of-Total-War-Three-Kingdoms-is-one-facet-of-a-complex-game). Discredit cần "tầm nhìn tới tướng đang ra trận". [Steam](https://steamcommunity.com/app/779340/discussions/0/1742266965426880610)
- **Ngoại giao công khai**: màn ngoại giao liệt kê phe *đã biết*, rê chuột xem hiệp ước giữa hai phe bất kỳ, ai đánh ai, thứ hạng sức mạnh; nút "group by faction" xem khối. [TW Academy](https://academy.totalwar.com/campaign-diplomacy/), [Steam](https://steamcommunity.com/app/779340/discussions/0/1642038749323192193/)
- **AI nhìn xuyên sương?** Cộng đồng khẳng định "AI luôn thấy cả bản đồ"; không có tuyên bố chính thức của CA. [Steam](https://steamcommunity.com/app/779340/discussions/0/1637536330460245435/)

#### 3. Koei — Sangokushi

Đính chính: XI và XIV **theo lượt 10 ngày**; XII/XIII mới là thời gian thực có tạm dừng.

| Bản | Nhịp / ngân sách lệnh | Tình báo và tin giả |
| --- | --- | --- |
| VII | Tháng; mỗi tướng/chúa có Action Points (trần 200), hết AP thì nghỉ tháng. | Lệnh Spy "thu tin một thành"; kỹ năng Spy nhìn nhiều thành và các thành lân cận. [Kongming](https://kongming.net/faqs/romance-of-the-three-kingdoms-vii/three_kingdoms_vii.html) |
| VIII Remake | Tháng, AP theo lệnh. | Espionage: "biết độ bền, quân và tướng của thành", **luôn thành công, hạn 12 tháng**, làm mưu dễ thành hơn; tự đi được thành kề, xa hơn phải do thám. Mưu: Estrange, Destroy, Provoke, Collude, Spy. [Manual](https://www.koeitecmoamerica.com/manual/rtk8-remake/en/5100.html), [Namu](https://en.namu.wiki/w/%EC%82%BC%EA%B5%AD%EC%A7%80%208%20%EB%A6%AC%EB%A9%94%EC%9D%B4%ED%81%AC/%EA%B2%8C%EC%9E%84%20%EC%8B%9C%EC%8A%A4%ED%85%9C) |
| XI | Lượt 10 ngày; hành động lực toàn phe hồi mỗi lượt theo số thành, thống suất/mị lực chúa, trí quân sư; ~25/thành, trần 255. | **Không sương mù** — thấy toàn thiên hạ. Lưu ngôn 200 vàng, hạ trung thành + trị an; thành bại so trí quân sư ta với quân sư, thái thú, mị lực chúa địch. Trên trận: Nguỵ báo (lừa địch rút), Hoả kế, Nhiễu loạn. [Baidu](https://baike.baidu.com/en/item/Romance%20of%20the%20Three%20Kingdoms%20XI/1530826), [GamerSky AP](https://www.gamersky.com/handbook/200603/21611.shtml), [Sohu](https://www.sohu.com/a/337285985_120099898), [GamerSky mưu](https://www.gamersky.com/handbook/200603/21607.shtml) |
| XIII | Thời gian thực, 3 tốc độ, tạm dừng; nhiệm vụ tốn ngày; INT quyết kết quả nhiệm vụ Nhân sự/Chiến lược/Ngoại giao. | [Koei wiki](https://koei.fandom.com/wiki/Romance_of_the_Three_Kingdoms_XIII), [GameFAQs](https://gamefaqs.gamespot.com/ps4/160302-romance-of-the-three-kingdoms-xiii/faqs/80274) |
| XIV | Lượt 10 ngày, 3 lượt/tháng; "Orders" tiêu khi ra lệnh, hồi theo diện tích đất. | Mưu: Hidden Poison, Estrange, Placation, Unattended Home, Dual Destruction — thành bại theo INT tướng làm + INT chúa ta *đối* INT chúa địch, trị an, quan hệ. PK: **False Information** (dẫn quân địch vào bẫy; đặc tính Seer/Careless), Hoài Nam giảm giá mưu. PK CE: tài nguyên **quân tình** — Điệp báo (đặt quan tình báo → tin định kỳ) hoặc Trinh sát (phái tướng → nhiều tin một lần); *tiêu quân tình để nâng tỉ lệ hiện trên màn* của mưu/ngoại giao, địch cũng tiêu; Tuần thị giảm mưu địch. [Manual](https://www.koeitecmoamerica.com/manual/rtk14wpk/en/3300.html), [Plots](https://www.koeitecmoamerica.com/manual/rtk14/en/4300.html), [PK](https://www.koeitecmoamerica.com/rtk14/wpk/pk.html), [PK CE](https://www.gamecity.ne.jp/sangokushi14/wpk/ce/jp/feature/system.html) |

Bài học Koei: tin *có hạn sử dụng*; tin *làm mưu dễ thành* (tình báo là tiền đề của mưu); thành bại mưu và tin giả là *đấu INT hai bên*; ROTK XI bỏ hẳn sương mù mà vẫn hay vì cạnh tranh nằm ở ngân sách lệnh.

#### 4. Wargame và boardgame: trễ, che, nhiễu

| Trò | Cơ chế | Nguồn |
| --- | --- | --- |
| Kriegsspiel (1824) | Lượt 2 phút; bản đồ thật chỉ trọng tài giữ; lệnh viết tay; quân chỉ đặt lên bàn khi *cả hai bên thấy*; trọng tài **giữ thư một hai lượt, không giao, hoặc giao cho địch**. | [Wikipedia](https://en.wikipedia.org/wiki/Kriegsspiel), [IKS](https://kriegsspiel.org/faq/) |
| Diplomacy | Lệnh viết kín, lật cùng lúc; **không giấu quân, không xúc xắc**; đàm phán được nói dối. Biến thể Fog of War: chỉ thấy ô mình đứng + ô kề; quân *đứng yên* thành đài quan sát. | [Wikipedia](https://en.wikipedia.org/wiki/Diplomacy_(game)), [vDiplomacy](https://www.vdiplomacy.com/variants.php?variantID=30), [DipWiki](http://dipwiki.com/index.php?title=Fog_of_War) |
| Battles of Bull Run | Quân úp, thêm quân **giả**, viết trước lộ trình; lật khi kề nhau. | [Wikipedia](https://en.wikipedia.org/wiki/The_Battles_of_Bull_Run) |
| Command Ops 2 | Địch hiện dưới dạng *báo cáo tình báo*, nhìn xa nhận nhầm loại; rời tầm thì giữ **vị trí cuối thấy**; "đừng lập kế trên tin cũ, mơ hồ". Lệnh trễ ~30 phút, sửa theo chỉ huy, tham mưu, sức khoẻ. | [Guide](https://steamcommunity.com/sharedfiles/filedetails/?id=1223954053), [Steam](https://steamcommunity.com/app/521800/discussions/0/2139714324761590469/) |
| Flashpoint Campaigns | WeGo; chu kỳ lệnh NATO 10 phút, WP 18–19; **kéo dài** khi mất sẵn sàng, mất HQ, quân ngoài bán kính chỉ huy. | [OTS](https://ontargetsimulations.com/guides/coldwar/fieldmanuals/basic-tutorials/command-and-control/) |
| Radio General | Chỉ nghe báo cáo; đơn vị mất liên lạc, **phóng đại**, lạc đường. | [Steam](https://store.steampowered.com/app/1011610/Radio_General/) |
| Rule the Waves 2 | Tin về tàu địch có thể sai; do thám tăng căng thẳng; bị đánh cắp mà không biết ai. | [Naval Gazing](https://www.navalgazing.net/Rule-the-Waves-2-Game-1-January-1902), [TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/RuleTheWaves) |
| Dominions 5 | Lượt đồng thời; **sai số theo nguồn**: bói 0 %, gián điệp 10 %, trinh sát 30 %, mặc định 50 % ("khoảng N quân"); thực tế 50–200 % báo cáo. | [illwiki](https://illwiki.com/dom5/user/loggy/scoutreports), [Steam](https://steamcommunity.com/app/722060/discussions/0/1500126447381672721/) |
| Unity of Command 2 | Sương phủ nhưng **HQ và kho tiếp tế địch luôn hiện**; tù binh/trinh sát tạo intel marker; thẻ Ultra xoá sương một lượt. | [Steam](https://steamcommunity.com/app/809230/discussions/0/591770212722839085/), [Dev diary](https://unityofcommand.net/blog/2017/12/07/developer-diary-14-fog-of-war/) |

Chris Crawford: sương mù "hợp lý, cần trinh sát" thì thêm hứng thú; quá thật thì hết vui. [Wikipedia](https://en.wikipedia.org/wiki/Fog_of_war)

**Nguyên tắc**: *che* số quân và lệnh của phe không kề; *giữ công khai* mốc lớn (chủ đất, hiệp ước, HQ) để bàn cờ đọc được; *trễ* chỉ với tin gián tiếp và trễ phải *thấy được* (nhãn tuổi tin); *nhiễu* theo nguồn, thang rõ; tin giả *luôn cắm được* nhưng *bị lộ có giá*; đứng yên/củng cố phải có giá trị quan sát.

#### 5. Neo lịch sử: tin đi nhanh bao nhiêu thời Hán

- Luật *Hành thư* (Trương Gia Sơn): "bưu nhân hành thư, một ngày một đêm 200 dặm"; chậm nửa ngày 50 roi; bưu đặt mỗi 10 dặm (20 dặm nam Giang, 30 dặm Bắc Địa/Thượng/Lũng Tây). [NWUPL](https://zhfx.nwupl.edu.cn/hsdt/100049.htm), [BSM](http://m.bsm.org.cn/?hanjian%2F4277.html=)
- Quân báo khẩn 300 dặm/ngày. [Baidu](https://baike.baidu.com/en/item/Eight-hundred-li%20urgent%20dispatch/1459597). Chiếu khẩn Đông Hán: ba kỵ thay nhau, 1 000 dặm một ngày đêm; Kim Thành ↔ Trường An có hồi đáp trong 7 ngày; trạm Hà Tây cách nhau 50–90 dặm (20,8–37,4 km). [CSSN](https://cssn.cn/kgxc/kgxc_kgsb/202207/t20220728_5431431.shtml), [QQ](https://news.qq.com/rain/a/20240307A07ZYW00)
- Đi bộ thường dân 50–70 dặm/ngày (nhật ký đời Tống, dùng làm sàn). [NEAC](https://www.neac.gov.cn/seac/c103391/202302/1161230.shtml). Dặm Hán = 415,8 m. [Wikipedia](https://en.wikipedia.org/wiki/Li_(unit))
- Áp lên `data/world.json` (đường chim bay từ `lonlat`; đường bộ thật dài hơn 1,3–1,5×):

| Tuyến | km ≈ dặm Hán | 200 d/ng (công văn) | 300 (khẩn) | 70 (dân) |
| --- | --- | --- | --- | --- |
| Lạc Dương – Thành Đô | 920 ≈ 2 200 | 11 ngày | 7 | ~32 |
| Thành Đô – Kiến Nghiệp | 1 405 ≈ 3 400 | 17 | 11 | ~48 |
| Lạc Dương – Phiên Ngung | 1 291 ≈ 3 100 | 16 | 10 | ~44 |
| Hứa Xương – Tương Dương | 280 ≈ 670 | 3,4 | 2,2 | ~10 |

Kết luận: "tin từ A tới B mất một tháng" đúng cho *tin dân gian* xuyên bản đồ; công văn, sứ giả mất 1–3 tuần. Cả hai **ngắn hơn một mùa (~90 ngày)**: sự kiện đầu mùa ở đâu cũng tới mọi triều đình trước mùa sau. Cái *chưa tới* là **chi tiết đáng tin** (số quân, ý đồ) — đó mới là thứ nên trễ và nhiễu.

#### 6. Hàm ý cho Tam Quốc Loạn Nhập

Ràng buộc freeze: 1 phe / 1 lệnh / lượt, không tiền tệ mới, không chồng %, referee tất định, `decide` chỉ nhận `DecisionContext`. Đề xuất chỉ thêm *lớp chiếu tin* (`projectPerception`, `provinceIntel`, `publicNews`) và một mưu trong `Engine.STRATAGEMS`; không đổi máy chiến đấu. Lane engine là của Grok — đây là đề bài, không phải code.

##### (a) Nguồn tin và mỗi nguồn lộ gì

| Nguồn | Điều kiện | Lộ | Độ tin | Mẫu |
| --- | --- | --- | --- | --- |
| Châu mình | luôn | số thật | `exact` | như nay |
| Kề biên | châu kề châu mình | band, tướng giữ, luỹ, *loại lệnh* phe đó vừa ra nếu lệnh chạm ô kề | `seen` | Civ thành nhìn 1 ô; Diplomacy FoW |
| Đồng minh | pact có clause `alliance` | **chia sẻ `seen` của nhau** (hợp hai tập kề) | `seen` | Civ liên minh +1 cấp; TW3K gián điệp lên tướng thấy quân |
| Do thám | mưu `spy(pid)`, đích ≤ 2 bước từ đất mình | số quân ±10 % làm tròn nghìn, tướng, luỹ, band lương; **hạn 4 lượt** (= 12 tháng ROTK 8) | `spy` | ROTK 8 Espionage; Dominions gián điệp 10 % |
| Lời đồn | mọi phe không kề, tự động, **trễ 1 lượt** | loại lệnh lượt trước của phe đó + band ±1 nấc | `rumor` | Civ gossip nhưng có trễ; Dominions 50 % |
| Công khai | luôn, cùng lượt | đổi chủ châu, pact ký/vỡ/từ chối, phe chết, Hiến Đế ở đâu, hai cảnh kịch bản, mốc coalition/late-war | `public` | TW3K màn ngoại giao; UoC2 HQ luôn hiện |

Điểm mới so với hôm nay: đồng minh chia sẻ tầm nhìn (liên minh *đáng ký*), lời đồn trễ một lượt ("ai đang làm gì" *có câu trả lời* nhưng cũ), do thám là mưu có hạn dùng.

##### (b) Trễ và tuổi tin

- **Cùng lượt**: kết quả lệnh mình, quan sát kề, tin công khai, tin đồng minh chia sẻ.
- **Lượt sau**: lời đồn về lệnh của phe không kề; kết quả do thám (sứ đi về trong mùa, báo cáo mô tả *trạng thái đầu lượt*, dùng lượt sau).
- **Tuổi**: giữ `lastSeenTurn`; HUD in "Tin hiện tại / Cũ N mùa / Lời đồn / Chưa rõ" (đã có 3 nhãn đầu). Tin cũ tự nới band một nấc mỗi 2 mùa; sau 6 mùa về `unknown`. Mẫu: Command Ops giữ vị trí cuối và cảnh báo tin cũ.
- Không trễ tin công khai: sử liệu (mục 5) cho thấy chúng tới trong mùa; trễ chúng chỉ làm bàn cờ khó đọc.

##### (c) Nhiễu và lừa

- **Nhiễu tất định theo nguồn** (chỉ qua `rng` seed): `seen` = band đúng; `rumor` = band ±1 nấc theo seed lượt; `spy` = số thật ±10 %. Thang như Dominions nhưng dùng nấc thay %.
- **Mưu "hư báo"** (cạnh discord/burn/defect): chọn phe nạn nhân và một châu; lượt sau `provinceIntel` của nạn nhân về châu đó nhận band giả (ép "mạnh" để doạ, "yếu" để dụ) hoặc lời đồn giả "X sắp đánh Y". Theo TW3K: **luôn cắm được**, rủi ro là **bị lộ**.
- **Phản gián tất định, không %**: tin giả vô hiệu ngay nếu nạn nhân có nguồn tốt hơn về châu đó (`seen`/`spy`/đồng minh) — nguồn cao ghi đè nguồn thấp. Nếu nạn nhân ra `fortify` hoặc `internal` *trên châu bị nhắm* cùng lượt (Tuần thị ROTK 14 / counterspy Civ), tin giả **lộ kèm tên kẻ cắm** → `grudge` tăng, vào `publicNews` ("Tào Tháo phao tin giả về Kinh Châu"). Không lộ thì tin giả sống đúng **một lượt** rồi bị sự thật lượt sau ghi đè (Kriegsspiel giữ thư một hai lượt).
- Chỉ *nạn nhân* bị nhiễu; referee luôn dùng truth (Truth ≠ Perception).

##### (d) Ước lượng trước trận theo chất lượng tin

Không cộng sức chiến đấu theo tin (Civ +3/bậc là "máy hai giá", trái freeze). Tin chỉ **thu hẹp khoảng ước lượng** và mở lựa chọn `from`:

| Nguồn tốt nhất về châu đích | Khoảng quân địch hiển thị | Câu HUD |
| --- | --- | --- |
| `spy` ≤ 4 mùa | ±10 % quanh số do thám | "Do thám: ~38 nghìn, tin cậy cao" |
| `seen` | [lo, hi] của band (`weak` ≤25k, `medium` 25–45k, `strong` 45–90k) | "Quân vừa (25–45 nghìn)" |
| `seen` cũ N mùa | band nới 1 nấc mỗi 2 mùa | "Cũ 3 mùa: vừa hoặc mạnh" |
| `rumor` | band ±1 nấc, đánh dấu lời đồn | "Lời đồn: yếu đến vừa" |
| `unknown` | không số | "Chưa rõ — do thám hoặc kết minh với láng giềng" |

Kết luận trận = so `self.troops` với khoảng trên: "chắc thắng / ngang ngửa / mạo hiểm / mù", không in %. AI dùng band như nay; tin `spy` cho AI chỉ là band hẹp hơn (không số) để giữ test counterfactual "cùng band → cùng `decide`".

##### (e) Phải công khai để bàn cờ đọc được

Chủ châu (đánh lẫn annex), mọi pact và phản ứng (ký, từ chối, vỡ), phe chết và ai kết liễu, Hiến Đế ở đâu, hai cảnh kịch bản, mốc coalition/late-war, **tin giả bị lộ**. Giữ ẩn: số quân phe không kề, thương vong địch, lệnh không chạm biên, mưu không bị lộ, danh tính đế ẩn.

#### 7. Chưa kiểm chứng được

- ROTK VIII gốc (2001) "mỗi tướng một việc mỗi tháng": không có nguồn đọc được; chỉ có Remake và cheat "mưu một lần mỗi kỳ hội nghị". [GameFAQs](https://gamefaqs.gamespot.com/ps2/914672-romance-of-the-three-kingdoms-viii/cheats)
- ROTK XIV có thấy số quân thành địch không: diễn đàn nói XIV không sương mù (sương chỉ ở 3, 7, 8, 12), manual chưa xác nhận. [Tieba](https://tieba.baidu.com/p/6212601306)
- TW3K: AI nhìn xuyên sương và hiệu ứng chính xác của Falsify Marching Orders — chỉ có lời cộng đồng/preview.
- Civ VI gossip *không* trễ; "gossip trễ một lượt" ở mục 6 là đề xuất của ta.
- Tốc độ tin thời Hán là định mức luật và kỷ lục; mùa mưa, giặc giã chậm hơn; khoảng cách tính đường chim bay.
- Fandom, GameFAQs, BGG chặn máy; các mục đó dẫn tóm tắt tìm kiếm hoặc nguồn thay thế.

---

## I. Liên minh, phòng thủ chung, cùng đánh

<!-- nguồn cũ: docs/research/alliances-civ-tw3k.md -->

### Liên minh & cùng đánh — Civ VI, TW3K, Koei RTK → hàm ý cho Tam Quốc Loạn Nhập

Ngày 2026-09-27. Chỉ bàn liên minh, phòng thủ chung, cùng đánh. Nguồn Fandom (Civ, Total War, Koei), totalwar.com, GameFAQs, Neoseeker, Before I Play, TWCenter, Prima bị chặn (402/403/429) từ môi trường này; chỗ đánh dấu **(TT)** chỉ có qua đoạn trích của công cụ tìm kiếm, coi là chưa xác minh.

#### 1. Civilization VI (Rise and Fall / Gathering Storm)

- **Điều kiện:** phải là *Declared Friends* và cả hai có civic Civil Service [1][6]. Đang Declaration of Friendship thì không được tuyên chiến chính thức với nhau [5]; DoF kéo 30 lượt **(TT)** [16].
- **Năm loại** (Research, Military, Economic, Cultural, Religious); với một nước chỉ một loại, tối đa 5 liên minh [1]. Mọi liên minh tự kèm Open Borders + Defensive Pact [1][7].
- **Cấp 1–3:** điểm tích mỗi lượt, buôn bán tăng tốc [1]: 1 điểm/lượt, +0,25 mỗi chiều có Trade Route, không cộng dồn nhiều tuyến [6][8]; 80 điểm lên cấp 2, thêm 160 lên cấp 3 **(TT)** [6].
- **Quân sự:** cấp 1 +5 sức chiến đấu với đơn vị của phe đang chiến tranh với *cả hai*; cấp 2 chia sẻ tầm nhìn, +15 sản xuất quân khi một bên có chiến tranh; cấp 3 đơn vị mới có sẵn thăng cấp [1][7].
- **Khóa:** 30 lượt, gia hạn thủ công, không hủy sớm, không thể tuyên chiến đồng minh [9][10][11].
- **Defensive Pact:** civic Mobilization, phải đang liên minh; một bên bị tuyên chiến thì bên kia tự động tuyên chiến kẻ tấn công; **không dây chuyền**; Emergency không kích hoạt [2].
- **Joint War:** cả hai cần Foreign Trade; nhận deal là lập tức cùng chiến tranh với mục tiêu [3]; deal kéo 30 lượt, phạt warmonger bằng Formal War (Surprise War +50 %) [4]. Grievances lan một phần sang đồng minh của nạn nhân [13].
- **Open Borders:** civic Early Empire, 30 lượt, bất đối xứng, đồng minh tự có [12].
- **AI:** đồng minh *không* tự vào chiến tranh do bạn khởi xướng; phải "mời tham chiến" qua deal, điều kiện: đã biết mục tiêu, không liên minh/bạn với mục tiêu; đồng minh đòi giá thấp hơn; AI có thể mời bạn rồi denounce bạn [14]. Từ R&F đồng minh tự tuyên chiến kẻ tấn công, *trừ khi* kẻ đó cũng là đồng minh của họ [15]. Lỗ hổng: Joint War bỏ qua DoF/alliance, AI "vào joint war với bất kỳ ai" [17].

#### 2. Total War: Three Kingdoms

- **Nhóm deal:** War, Peace, Trade & Marriage, Vassals, Alliances, Treaties (không xâm phạm, mượn đường) [18][19].
- **Coalition vs Military Alliance:** coalition "không buộc tham gia chiến tranh của thành viên khác"; military alliance "dù giá nào cũng đứng sau lưng nhau" [18]; cần cấp Marquis và quan hệ rất tốt [20]. Vào khối là đồng minh với mọi thành viên **(TT)** [19].
- **Bỏ phiếu:** đưa cả khối vào chiến tranh hay mời thành viên đều phải bỏ phiếu đa số, có dự đoán yes/no từng thủ lĩnh **(TT)** [21]; người chơi xác nhận "hơn nửa thành viên phải chấp nhận", **không có thủ lĩnh**, rời không cần phiếu nhưng mất quan hệ với cựu thành viên [22]. Hòa với cả khối phải qua một "leader" (đang lỗi) [23].
- **Nghĩa vụ:** "thành viên có thể xin trợ chiến và tuyên *alliance war* để mọi thành viên cùng vào", nhưng mỗi thành viên vẫn hòa riêng được [24]; military alliance cho "gọi đồng minh khi bị tấn công" [25]; cấp thấp thì *không rời được* liên minh [26]. Từ chối lời gọi tham chiến mất gì: chỉ **(TT)** [27], "một số lời mời từ chối không mất gì".
- **Trustworthiness** (chỉ áp cho người chơi): đánh đối tác coalition hay phá hiệp ước có hạn hạ mức tin, có thể thành Treacherous với mọi phe, tự hồi theo thời gian **(TT)** [19]; phá trade agreement −5, "từ từ hồi lại" [28]. Chư hầu xin viện: cứu thì phải phá hòa ước, bỏ mặc cũng mất trust [29]. Chủ ép được chư hầu tham chiến, chư hầu nộp cống [24][30].
- **Tiếp viện:** chỉ quân *cùng coalition/military alliance* mới tiếp viện, cùng kẻ thù thôi không đủ [31]; tầm tiếp viện là vòng tròn quanh quân/thành [32]; cần còn ≥1 điểm di chuyển, không tiếp viện trận đêm, phục kích [33].
- **Xưng đế:** đạt Emperor là tách khỏi coalition; hai phe mạnh nhất tự xưng đế, ghét tối đa (người chơi nêu −300), không thể liên minh với họ; chư hầu ly khai; military alliance có thể giữ nếu quan hệ tốt [34][35][36][37].

#### 3. Koei RTK (ngắn)

- **XIV:** liên minh tối đa 24 tháng (72 lượt), cần sentiment Normal trở lên; "Attack Request" cần tước Grand General [38] và quan hệ Friendly; có lệnh Dissolve [39]. Hết hạn AI đánh ngay [40]. Coalition chỉ do AI/kịch bản lập chống phe mạnh nhất **(TT)** [41][42].
- **XIII:** xin đánh qua Petition → Attack [43]; viện binh bị khóa nếu đồng minh cũng liên minh với kẻ đang đánh bạn [44]; hủy liên minh: rapport −100 với chủ, "không ngoại giao được lâu" [45].
- **XI:** liên minh không hết hạn tới khi hủy, đình chiến không hủy được **(TT)** [46]; bản PC có "request reinforcements from allies" [47]. **X:** đồng minh qua đất, xin viện, cần quan hệ friendly/trusted **(TT)** [48]. **III:** joint invasion hiệu lực 3 tháng **(TT)** [49] (PDF là ảnh quét).

#### 4. Hàm ý cho Tam Quốc Loạn Nhập

Lấy: phòng thủ chung *tự động, không dây chuyền* (Civ); cùng đánh là *deal có mục tiêu, có hạn* (Civ 30 lượt, RTK III 3 tháng); viện binh phải *kề* và chỉ cho đồng minh chính thức (TW3K); bội ước là *cờ công khai với mọi phe, tự hồi* (TW3K); đồng minh đứng ngoài khi cũng có ước với kẻ tấn công (RTK XIII, Civ R&F). Không lấy: bỏ phiếu, thủ lĩnh khối, chư hầu, năm loại liên minh.

**(a) Ba điều khoản, dùng chung `rules.pact` (6 mùa, 2 slot):**
- `truce` — như v1.1.
- `defend` (Minh phòng thủ, 1 slot, bao gồm truce): khi châu P của A bị `attack`, mỗi đồng minh B có châu kề P góp tự động `defendShare × troops(B)` (đề xuất 0,25, cùng thang `commitBase` 0,45) vào phòng thủ. Không tiêu lệnh của B; B chịu tổn thất theo tỉ lệ; châu không đổi chủ. B có truce/defend với kẻ tấn công thì đứng ngoài, phát event; không dây chuyền.
- `joint_war` (Cùng đánh X ở châu P, 2 mùa, mỗi phe tối đa 1): A ký bằng lệnh diplomacy, B trả lời trong envelope như pact. Hai lượt sau, khi *cả hai* cùng ra `attack P` thì lực cộng vào một trận; P về `beneficiary` ghi trong deal, mặc định bên `commit` lớn hơn (hòa thì bên đã kề P). Một bên vắng lệnh thì bên kia đánh một mình, deal hủy, bên vắng bị `defected` (mất Uy nhẹ). Chỉ cho ký khi cả hai đều kề P, khỏi cần mượn đường.

**(b) AI nhận/từ chối chỉ từ DecisionContext công khai** (`world.pacts`, `owners`, band `provinceIntel`, `diplomaticPressure`, `grudge` của mình, `leaderOf` theo `coalitionAt`): nhận `defend` khi đối tác giáp cùng phe đang `watch/high` với mình hoặc mình có `grudge` với phe giáp đối tác; từ chối khi đối tác là `leaderOf`, còn cờ `oathbreaker`, hoặc hết slot. Nhận `joint_war` khi X là `leaderOf` hoặc `grudge.fid`, X kề mình, mình không có ước với X, tổng band hai bên ≥ 1,3× band phòng thủ của P. Không đọc `troops` thật, doctrine, persona (freeze).

**(c) Bội ước:** `attack` phe đang truce/defend, hay rút `defend` giữa kỳ → mất Uy lớn, cờ công khai `oathbreaker` 8 mùa (thang `guestTruceTurns`); trong lúc đó AI cho `pact/joint_war` trọng số 0, `defect`/`discord` lên phe này dễ hơn. Nạn nhân và đồng minh `defend` của nạn nhân nhận `grudge` (grievance lan). `world.pacts` thêm `kind` (`truce|defend|joint_war`); `diplomaticPressure` giữ quy tắc 4 châu, cạnh `defend` tính là liên kết, `joint_war` nhắm vào mình ép thẳng `high`; bội ước xóa mọi cạnh của kẻ bội ước nên áp lực tự tính lại.

**(d) Người chơi thấy:** thẻ hiệp ước (loại, đối tác, `remainingTurns`, nghĩa vụ một dòng, cờ oathbreaker); trên châu biên: "viện binh ước tính +X vạn từ B" tính từ band, không từ số thật; deal cùng đánh hiện mục tiêu, số mùa còn lại, ai hưởng châu; publicNews ghi cả lời từ chối (như v1.1); spectator dùng `deal_accept/deal_break/attack` sẵn có trong RuntimeEvent.

#### Nguồn
1. https://www.civilopedia.net/en-US/gathering-storm/concepts/alliances_1/
2. https://www.civilopedia.net/en-US/gathering-storm/concepts/diplo_11/
3. https://www.civilopedia.net/en-US/gathering-storm/concepts/diplo_14/
4. https://www.civilopedia.net/en-US/gathering-storm/concepts/diplo_3/
5. https://www.civilopedia.net/en-US/gathering-storm/concepts/diplo_12/
6. https://gamerant.com/civilization-6-how-to-form-alliances-guide/
7. https://www.well-of-souls.com/civ/civ6_riseandfall.html
8. https://steamcommunity.com/app/289070/discussions/0/1796278072841926761/
9. https://forums.civfanatics.com/threads/why-do-alliances-require-constant-renewal-all-the-time.642595/
10. https://steamcommunity.com/app/289070/discussions/0/135507403160843309/
11. https://steamcommunity.com/app/289070/discussions/0/340412122416797256/
12. https://www.civilopedia.net/en-US/gathering-storm/concepts/diplo_9/
13. https://www.civilopedia.net/en-US/gathering-storm/concepts/grievances/
14. https://steamcommunity.com/app/289070/discussions/0/2138588424845455444/
15. https://steamcommunity.com/app/289070/discussions/0/1696048879949368831/
16. https://civilization.fandom.com/wiki/Diplomacy_(Civ6) (TT)
17. https://steamcommunity.com/app/289070/discussions/0/282992562607803632
18. https://www.pcgamesn.com/total-war-three-kingdoms/diplomacy-tactics-guide
19. https://totalwar.fandom.com/wiki/Diplomacy_(Total_War:_Three_Kingdoms) (TT)
20. https://segmentnext.com/total-war-three-kingdoms-diplomacy-guide/
21. https://www.totalwar.com/news/diplomacy-in-total-war-three-kingdoms-part-1 (TT)
22. https://steamcommunity.com/app/779340/discussions/0/1639787494955383803/
23. https://steamcommunity.com/app/779340/discussions/0/2259060348503092684/
24. https://steamcommunity.com/app/779340/discussions/0/2838914020275851118
25. https://steamcommunity.com/app/779340/discussions/0/1639787494965554945/
26. https://steamcommunity.com/app/779340/discussions/0/1639787494970807673/
27. https://www.twcenter.net/threads/hosed-by-my-allies-again-or-why-you-should-never-ally-in-tw.732828/ (TT)
28. https://steamcommunity.com/app/779340/discussions/0/1642038659011231848/
29. https://steamcommunity.com/app/779340/discussions/0/1637536330477612854/
30. https://www.gamepressure.com/total-war-three-kingdoms/diplomacy-and-trade/z0c44e
31. https://steamcommunity.com/app/779340/discussions/0/1640915206463714901/
32. https://steamcommunity.com/app/779340/discussions/0/1651045226225727042/
33. https://steamcommunity.com/app/779340/discussions/0/1651045226229909817/
34. https://steamcommunity.com/app/779340/discussions/0/1742227264195159688/
35. https://steamcommunity.com/app/779340/discussions/0/1642038749311181988/
36. https://steamcommunity.com/app/779340/discussions/0/3647273545678698859/
37. https://steamcommunity.com/app/779340/discussions/0/1642038659009156253/
38. https://www.koeitecmoamerica.com/rtk14/system-strategy.html
39. https://www.koeitecmoamerica.com/manual/rtk14wpk/en/6100.html
40. https://steamcommunity.com/app/872410/discussions/0/3016788637312754733/
41. https://www.pcinvasion.com/romance-of-the-three-kingdoms-xiv-rtk-14-guide-diplomacy-and-plots/ (TT)
42. https://www.koeitecmoamerica.com/rtk14/wpk/pk.html
43. https://steamcommunity.com/app/363150/discussions/0/358417008723778389
44. https://steamcommunity.com/app/363150/discussions/0/343785380903047459/
45. https://steamcommunity.com/app/363150/discussions/0/1732087825001227686/
46. https://beforeiplay.com/index.php?title=Romance_Of_The_Three_Kingdoms_XI (TT)
47. https://blog.lukiegames.com/2011/07/romance-of-three-kingdoms-xi.html
48. https://gamefaqs.gamespot.com/ps2/925867-romance-of-the-three-kingdoms-x/faqs/38497 (TT)
49. https://kongming.net/3/dl/rot3k3manual.pdf (TT)
