# Phân tích thị trường: "vào là chơi" hay "chiến dịch sâu"? (ngã rẽ v2)

> **Vai trò:** tổng hợp research cho câu hỏi của chủ dự án ngày 2026-09-28: v2 nên là game đơn giản, vào là chơi, kết quả nhanh, chơi đi chơi lại như cờ; hay chiến dịch tính toán, chi tiết, căng thẳng, dài?
> Ba báo cáo nguồn cùng thư mục, mỗi số liệu có URL và có đánh dấu chỗ chưa kiểm chứng: `market-player-demand.md` (nhu cầu người chơi, thị trường Việt Nam), `market-roots-trends.md` (Loạn 12 Sứ Quân, xuyên không, IP Tam Quốc, xem mô phỏng), `market-design-evidence.md` (lý thuyết thiết kế, tỉ lệ hoàn thành, game nhanh mà sâu, chi phí game sâu).
> Không phải SOT. Kết luận sẽ chép vào đề xuất Gameplay v2.

## 1. Kết luận

**Ngã rẽ 1 hấp dẫn hơn cho dự án này**, với điều kiện đọc đúng chữ "đơn giản": đơn giản ở *luật và thời gian*, không đơn giản ở *hệ quả*. Thị trường không thưởng "nhanh và nông" (Polytopia bị chê thiếu chiều sâu) cũng không thưởng "sâu và dài" (đa số người mua Civ chưa từng thắng một ván). Thứ được thưởng là **luật ít, tương tác nhiều, ván ngắn, kết thúc rõ, có chuyện để kể lại**. Với Tam Quốc Loạn Nhập, mô hình đúng là **cờ Tam Quốc có máy sinh chuyện**: một ván 20–30 phút, vào chơi trong một phút, mỗi lượt một quyết định có đánh đổi rõ, ván sau cách một cú bấm; chiều sâu nằm ở tướng, liên minh, tin tức và một "tri thức tương lai" riêng của mỗi đế, không nằm ở sổ sách (thuế, hậu cần, loại lính, hàng đợi xây).

Ngã rẽ 2 thuần tuý là thứ thị trường đang rời bỏ ngay cả với Civ (Firaxis phải chia Civ VII thành ba kỷ nguyên vì dưới 50 % người chơi chơi hết một ván), và là thứ một người cộng agent không đủ sức làm ra AI, UI và cân bằng cho từng hệ thống. Tiền lớn của "chiến dịch sâu" đề tài Tam Quốc thực chất là SLG live-service theo mùa với áp lực liên minh, không phải chiều sâu chơi đơn.

Độ chắc: **trung bình**. Bằng chứng là tương quan (achievement Steam là mức sàn), không có số liệu riêng cho tệp người Việt mê Tam Quốc, và mô hình "sâu tuỳ chọn" mới được kiểm chứng ở quy mô studio 15 người (Old World). Phải kiểm bằng chơi thử sớm (mục 6).

## 2. Bằng chứng

### 2.1 Người chơi không chơi hết chiến dịch

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

### 2.2 Khẩu vị dịch về ngắn, và ngắn đang thắng

- Quantic Foundry (1,5 triệu người, 2015–2024): 67 % người chơi hôm nay quan tâm "suy nghĩ chiến lược" *ít hơn* người chơi trung bình năm 2015; mức giảm lớn nhất trong mọi động cơ. Newzoo: nhóm "Time Filler" 27 % là nhóm lớn nhất. GameAnalytics 2025: phiên mobile thể loại chiến thuật 5–6 phút, 4 phiên một ngày; phiên PC mọi thể loại trung vị 18 phút. Board gamer chấm cao nhất cho game 3–4 người, 30–60 phút.
- Chess.com: 8,7 triệu người chơi mỗi ngày, khoảng 27 triệu ván mỗi ngày (quý 4/2025). Lichess: 92 triệu ván có xếp hạng một tháng (8/2026). Polytopia: 25 triệu lượt tải, chế độ Perfection đúng 30 lượt, khoảng 30 phút, triết lý "bỏ đi càng nhiều càng tốt, trông phải như bàn cờ". Marvel Snap thiết kế trận 3 phút. OpenFront.io: trò chiến lược trình duyệt mã mở, hơn 1 triệu người chơi một tháng, không tài khoản, bấm là vào; territorial.io 5 triệu lượt tải, "ván dưới 5 phút"; War.app hơn 10.000 ván mỗi ngày, lượt đồng thời, chơi bất đồng bộ.
- Civilization: Eras & Allies (2K, mobile 4X) đóng cửa 6/2026.

### 2.3 Tiền lớn của "Tam Quốc sâu" là mùa giải, không phải chơi đơn

Three Kingdoms Tactics 1,2 tỉ USD; Rise of Kingdoms 3,5 tỉ USD; một mùa 50–75 ngày, liên minh là động cơ. Ở Việt Nam, Tam Quốc Chí – Chiến Lược lên Top 1 doanh thu App Store đúng lúc mở mùa mới, doanh thu tuần tăng 117 % khi reset mùa: người chơi trả tiền cho **chu kỳ ngắn, bắt đầu lại**, không cho một chiến dịch dài. TW3K bán 1 triệu bản tuần đầu nhưng người chơi đồng thời nay còn khoảng 2 % đỉnh. Chiều sâu chơi đơn bán được (Civ hơn 70 triệu bản cả dòng) nhưng cần studio hàng trăm người và chính họ đang cắt nhỏ ván.

### 2.4 Việt Nam

- Thị trường 655 triệu USD (2024), mobile áp đảo, 4X mobile ở Đông Nam Á tăng 17,6 % quý 1/2025. Khoảng 16 game Tam Quốc ra mắt riêng năm 2024; chính báo chí game gọi đề tài này là "bão hoà" nhưng "không bao giờ lỗi mốt".
- Văn hoá chiến thuật của người Việt là **một trận có thắng thua trong một lần ngồi rồi đấu loạt**: Đế Chế (Chim Sẻ Đi Nắng 126.086 người xem đồng thời), cờ tướng ZingPlay hơn 1 triệu lượt tải. Phiên chơi mobile ở Việt Nam dài (khoảng 51 phút) nhưng gồm nhiều ván.
- Indie Việt: không có tiền lệ chiến thuật thành công; ca thành công là thể loại quốc tế bán ra ngoài (God of Weapons 100.000 bản hai tuần, Caravan War 1 triệu tải); ca thất bại là đề tài sử Việt, nội địa, quy mô lớn (Thuận Thiên Kiếm, 7554, Sử Hộ Vương). Tệp thực tế cho một game trình duyệt miễn phí không gacha: **vài nghìn người thử tháng đầu nếu có clip lan, vài trăm quay lại**. Phải đo thành công bằng clip được xem và ván được chia sẻ, không bằng DAU.

### 2.5 Gốc của ý tưởng nói gì

- **Loạn 12 Sứ Quân** là ít nhất sáu game khác nhau (2007–2026). Bản được khen về gameplay (text game 2007) được khen vì "dễ hiểu, dễ học, cách chơi không phức tạp"; bị chê ở chỗ phải *chờ tài nguyên* kiểu OGame. Ký ức cộng đồng là **nhiều phe, bản đồ tranh hùng, gặp danh nhân qua từng trận**, không phải một hệ thống sâu nào. Gốc này nghiêng về ngã rẽ 1.
- **Xuyên không** rất lớn (Trung Quốc 575 triệu người đọc văn học mạng 2024). Độc giả Việt của Tam Quốc xuyên không (thread review 110.000 lượt xem) thưởng "logic hợp lý, ít ảo tưởng, phải có tiền, có lương, có quân", phạt "quá bá, harem". Mobile Việt bán xuyên không như roster liên triều (Tam Quốc Tứ Thời Ca, 9/2026). Fantasy đúng là **dựng nghiệp từ tay trắng bằng tri thức tương lai**, nhưng thứ được thưởng là *cá tính của cách dựng nghiệp*, không phải số lượng hệ thống. Gốc này thoạt nhìn ủng hộ ngã rẽ 2, thực ra chỉ đòi mỗi đế một "tri thức tương lai" đọc được ngay trên bàn cờ.

### 2.6 Xem và cắt clip

Cờ vua trên Twitch (PogChamps đỉnh 166.000 người xem), TFT 241 triệu giờ xem một năm, Civ Battle Royale (AI-only, 61 phe, show hàng tuần nhiều năm), Drew Durnil 1,53 triệu sub khởi nghiệp bằng AI-only rồi bỏ vì "vắt kiệt", đua bi Jelle's 1,5 triệu sub. Công thức chung: **phe ít, màu cố định, tường thuật hoặc bảng xếp hạng theo tập, lật kèo, kẻ yếu sống sót, nhịp ngắn**. Trận ngắn cho nhiều khoảnh khắc đóng gói sẵn; chiến dịch dài cho khoảnh khắc lớn nhưng thưa và cần biên tập nặng.

### 2.7 Chi phí và rủi ro của game sâu

Humankind 69 % tích cực, Millennia 67 % rồi tụt 45 %: vỡ ở **độ rõ, nhịp cuối game, AI**, không phải thiếu tính năng, dù ngân sách lớn hơn ta nhiều lần. Game sâu thành công với đội nhỏ (RimWorld, Old World, Dominions, Songs of Syx) đều có **một cỗ máy sinh chuyện** (nhân vật, sự kiện) và mất **nhiều năm lặp**. Mỗi hệ thống thêm vào 4X = một màn UI + một nhánh AI + một trục cân bằng.

## 3. Hai ngã rẽ trên chín tiêu chí

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

## 4. Ngã rẽ thứ ba: cờ Tam Quốc có máy sinh chuyện

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

## 5. Đối chiếu với câu trả lời interview 27/9

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

## 6. Thước đo và cách kiểm chứng

- Chơi thử 10 người, mỗi người hai ván, trước khi Grok code luật: đo phút tới lệnh đầu, phút một ván, tỉ lệ chơi hết, tỉ lệ bấm ván nữa, ba khoảnh khắc họ kể lại. Mốc: lệnh đầu dưới 60 giây, ván dưới 30 phút, hơn 60 % chơi hết, hơn 40 % chơi tiếp, mỗi người kể được ít nhất một khoảnh khắc có tên tướng.
- Sau khi phát hành: số clip và số seed được chia sẻ, tỉ lệ người xem thành người chơi. Không đặt mục tiêu DAU.
- `npm run play` đo đường thắng mỗi vòng (mục tiêu 20–30 %, chết trước lượt 16 dưới 5 %).

## 7. Benchmark

The Battle of Polytopia (4X nén 30 lượt), OpenFront.io (chiến lược trình duyệt vào là chơi, mã mở để học onboarding), Into the Breach (chiều sâu từ minh bạch, độ dài tự chọn), Slay the Spire (vòng lặp chơi lại, seed ngày), Total War: Three Kingdoms (sức hút đề tài và bài học 31 % hoàn thành), Unciv (Civ-lite mã mở 1 triệu tải).

## 8. Chưa chắc

Không có dữ liệu tỉ lệ dùng tốc độ Quick trong Civ; không có dữ liệu hoàn tiền theo thể loại; số người dùng Steam Việt Nam và độ dài trận Đế Chế thông thường không có nguồn đáng tin; lượt xem YouTube/TikTok bị chặn truy cập; khán giả Việt mê Tam Quốc có thể chuộng chiều sâu tướng lĩnh hơn trung bình thị trường. Chi tiết trong mục "chưa kiểm chứng" của ba báo cáo nguồn.
