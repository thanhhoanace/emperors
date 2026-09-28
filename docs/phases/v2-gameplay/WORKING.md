# V2 Gameplay — Working state

> Cập nhật: 2026-09-28 · giữ bản COMPACT của Claude và nối kết quả CHALLENGE từ [ChatGPT, mục B](_research/chatgpt.md) sau khi chủ dự án chơi spike 2. Nguồn cũ: [Claude](_research/claude.md) A–I, [ChatGPT](_research/chatgpt.md) 1–10, [Grok](_research/grok.md) A, hai spike. Lượt Claude trước đã tự research và synthesis (ngoại lệ luật 4).
> Bước hiện tại: CHALLENGE đã tổng hợp, chờ xét lại vai trò swipe trước FREEZE. [DECISION.md](DECISION.md) 28/9 vẫn ghi quyết định đã chốt; phản hồi sau khi chơi khớp điều kiện **Revisit when**, chưa có quyết định thay thế.
> Ngoại lệ quy trình: chủ dự án trực tiếp yêu cầu thêm tám mặt market research **và tổng hợp**, dù đã dùng 2/2 vòng research. GAP mới là cảm giác agency sau spike 2, tính nhất quán của thẻ, và bằng chứng thị trường bị suy diễn; lý do vượt hạn mức theo `AGENTS.md` luật 6. Cùng tool research và synthesis ở lượt này theo yêu cầu trực tiếp của chủ dự án; chưa mở thêm vòng rộng.

## Problem

Chủ dự án chơi `game.html` (27/9): "đang *xem* chứ không *chơi*"; đánh chỉ xem quân chạy; không bấm được đất, quân, tướng. Ngày 28/9 đặt ngã rẽ cho v2: (1) vào là chơi, nghĩ ít, kết quả nhanh, chơi lại như cờ; (2) chiến dịch tính toán, chi tiết, dài. Câu hỏi kèm: thị trường và người chơi thật muốn gì; gốc ý tưởng là Loạn 12 Sứ Quân cũ + trend xuyên không. Sau spike 1 owner thấy nhiều nút; sau spike 2 quẹt được nhưng vẫn chán, thắng/thua chưa có ý nghĩa. [Grok](_research/grok.md) B0; [ChatGPT](_research/chatgpt.md) B1.

## Owner inputs

Nguyên ý, chưa phải luật. Interview 27/9 (`claude.md` B.9) được nêu *trước* câu hỏi ngã rẽ; Grok (§4) và ChatGPT (§6) đều lưu ý danh sách này là "muốn sau khi chơi v1", có thể rộng hơn DNA gốc.

- Chơi là chính; clip giữ ở `?demo=1`. Mốc đặt ra: thắng 20–30 %, chết trước lượt 16 dưới 5 %, ván 20–40 phút.
- Mở ván từ tay trắng (châu nhỏ, quân ít, xây dần), không nhận sẵn đại quân.
- Muốn làm với đất và quân mình: dân, tiền, lương, mộ binh, xây, điều quân, đồn trú, bổ nhiệm tướng, buôn bán; việc 2–3 lượt.
- Theo lượt, cùng lúc; nhưng có tình báo, tin trễ, mưu kế làm sai tin.
- Trận: chọn tướng và số quân, cách đánh, cắt cảnh, kết quả có lý do; cả phòng thủ; quân đông không tự thắng; tướng, địa hình và sông, đồn trú, hành quân xa.
- Liên minh có cứu nhau và cùng đánh. Tướng đủ bốn lớp. Lật lại: lưu vong, xưng thần, phục quốc. Vùng rìa chiêu binh và buôn bán, không tính vào 20 châu.
- Quy trình: mở freeze v2; đề xuất + prototype duyệt trước khi code; giữ hai lane; Pages đã trỏ `game.html`; LLM sau.

[DECISION.md](DECISION.md) 28/9 **thay các mốc interview ở chỗ mâu thuẫn**: ván ngắn 15–25 phút khi quen, lựa chọn đầu <60 giây, quẹt có/không, scale từ thành tới châu, không khoá lượt, hiển thị số; >40% tự chơi lại là mục tiêu kiểm chứng, thắng 20–30% chỉ là mốc cân bằng máy. Owner chơi trước; người lạ sau Pages; không làm nghiên cứu 18 người trước freeze. Input **mới sau khi chơi**, qua [Grok](_research/grok.md) B0: ưu tiên mobile và YouTube, cân nhắc lệnh chính trên map. **Tối 28/9 owner đã chốt qua interview 5 vòng với Claude** (ghi ở [DECISION.md](DECISION.md) mục Sửa 28/9 tối): ra lệnh bằng chạm bản đồ 3D thật; quân, tướng, bộ/kỵ/thủy hiện trên map; thẻ chỉ cho người; lát cắt Hoài Nam; demo tiếp trên canvas. Bản Loạn 12 Sứ Quân owner chơi: bản Java điện thoại, màn dọc, pixel ([video](https://www.youtube.com/watch?v=Xp0zn6YTnIM), chỉ xem được ảnh bìa).

## Evidence we trust

**Game hiện tại** (`claude.md` B.4): người chơi hợp lý thắng 0–3 %, chết trung bình lượt 12–26; 1,6–2,0 châu đổi chủ mỗi lượt vì thủ = tổng quân chia đều; đánh châu "yếu" vẫn thua 25–40 %; ván 38–41 lượt, 15–25 phút. Về *độ dài* v1 đã ở ngã rẽ 1; thiếu là *chiều sâu của một lệnh*. Grok §5 đồng ý: triệu chứng là "thiếu nước cờ", không phải "thiếu chiến dịch"; thêm thuế, hàng đợi, tin trễ trước khi mỗi lệnh đổi bàn cờ sẽ làm "xem" nặng hơn.

**Chiến dịch dài có người mua, độ dài và đoạn kết vẫn cần xét riêng** ([Claude](_research/claude.md) C.2, E.2; [Grok](_research/grok.md) A.1; [ChatGPT](_research/chatgpt.md) B8–B9): các số achievement từng thắng của Civ VI/TW3K/CK3/Old World mà lượt cũ viện dẫn **không đo tỷ lệ bỏ dở campaign hay mức hài lòng**. CK3 công bố 4 triệu bản đa nền tảng (04/2025); campaign có thị trường thật. Người chơi có thể chê reset làm đầu tư mất nghĩa; cần kiểm tra cách chuyển từ thành lên châu của chính Emperors, không suy từ achievement.

**Ván ngắn có thị trường, nhưng “nông” là lời than thật** ([Claude](_research/claude.md) C.3, E.3; [Grok](_research/grok.md) A.2; [ChatGPT](_research/chatgpt.md) B3, B5): Polytopia, 9 Kings, Thronefall cho các dạng chiều sâu khác nhau; 34 review Steam đọc có cả lời khen luật dễ học, tổ hợp, và lời chê recipe lặp, thua khó hiểu, không lật được snowball. Mẫu tiếng Anh có chọn lọc, không đại diện người Việt. Steam của Reigns: Three Kingdoms hiển thị 52% tích cực trên 337 review tất cả ngôn ngữ lúc kiểm tra; không suy mobile thất bại từ điểm này. Tránh so trực tiếp DAU, download, bản bán và review như cùng một thước đo.

**Cửa vào dễ là lựa chọn thiết kế, không phải kết luận strategy hết người chơi** ([Claude](_research/claude.md) C.1; [Grok](_research/grok.md) A.3; [ChatGPT](_research/chatgpt.md) B2, B8): Quantic Foundry đo thay đổi percentile *động cơ lên kế hoạch* trong mẫu tự chọn, không phải 17% người bỏ game chiến thuật. Sensor Tower báo strategy mobile tăng doanh thu, lượt tải và thời gian chơi năm 2025, chủ yếu bởi 4X dịch vụ; tiền/retention ở đó không tự chuyển sang game solo ngắn. Với Emperors, YouTube là kênh cần kiểm tra chuyển đổi chứ không phải bằng chứng sẵn có cho tệp người chơi.

**Gốc ý tưởng** (`claude.md` D; `grok.md` §4; `chatgpt.md` §4): Loạn 12 Sứ Quân là ít nhất sáu game; bản game thủ Việt nhớ (Java/Android Ola–MGM) là xếp hình + lượt, "vào là đánh, mỗi lượt có kết quả", sử là áo; chưa xác nhận đó là bản chủ dự án chơi. Xuyên không bán fantasy "một người rơi vào thế giới quen, dùng thứ mình biết, đổi một cục diện"; độc giả thưởng "có lương, có quân, logic", phạt "quá bá, harem"; giúp thu hút, không tự giữ chân.

**Chi phí game sâu** (`claude.md` E.4): Humankind, Millennia vỡ ở độ rõ, nhịp cuối, AI; game sâu thành công với đội nhỏ là máy sinh chuyện và mất nhiều năm; mỗi hệ thống thêm = UI + AI + cân bằng.

**Cơ chế tham khảo** (`claude.md` F–I): giữ đất bằng đồn trú cục bộ và vây nhiều lượt; lật lại bằng lưu vong, chư hầu, giải phóng; tin thời Hán tới trong một mùa, thứ nên trễ là *chi tiết đáng tin*; liên minh = phòng thủ chung tự động không dây chuyền + cùng đánh có hạn.

## Spike 1 (28/9, lệnh + việc)

Canvas: https://claude.ai/artifact/974asePfQJjxNqUYSZ5r2y · luật thử và đo: `spike/rules.js`, `spike/sim.js`. Hình dạng: 32 mùa; mỗi mùa 1 lệnh triều đình + 1 việc trong châu; quân đóng theo châu, trần theo bậc khai hoang; đế bắt đầu 4 nghìn quân; mỗi đế một tri thức tương lai; tướng có võ, đặc tính, lòng trung; ước lượng trận bằng chữ; minh phòng thủ góp 30 % quân kề; tin đồn trễ một mùa; thủ phủ bảo hộ 8 mùa; lưu vong 3 mùa. Máy chơi 300 ván mỗi đế: Tần thắng 30–34 %, Lý 18–19 % (chết 15–18 %), Chu 0 % (chết 12 %), Hán Vũ 6–8 %; 0,55–0,92 châu đổi chủ mỗi mùa (v1: 1,6–2,0). Chủ dự án chơi: không bấm được trên canvas, nhiều nút, sai tinh thần ngã rẽ 1 (xem cuối file).

## Spike 2 (28/9, quẹt thẻ)

Canvas Design: https://claude.ai/artifact/KV5Zuif1rgcZAdnZ31hU7m. Chủ dự án yêu cầu làm trên canvas Design ("tạo demo bằng /design") thay cho trang HTML ghi ở DECISION mục 8; bấm Play ở góc artboard rồi mới quẹt. Nguồn duy nhất: `spike2/Main.dc.html` (artboard, luật nằm trong script của nó); đo: `node docs/phases/v2-gameplay/spike2/sim.js 60`.

Hình dạng: màn điện thoại 390×844. Mỗi mùa 2–3 thẻ có / không (quẹt hoặc hai nút), thẻ kết quả sau mỗi trận, thẻ tin tức cuối mùa. Thẻ sinh từ bàn cờ, ba khe: *thời cơ* (đánh hoặc chiêu hàng nơi dễ nhất, hợp binh mọi nơi kề, % thắng tính trước, phép tính in trên thẻ), *giữ nhà* (điều quân, đắp lũy, mộ binh, thuế, khai hoang), *người* (hiền tài, tù binh hàng hay chết, ly gián tướng lòng trung thấp, xin kết minh, dò thám, tri thức của đế). Bản đồ khoanh nơi thẻ nói tới. Chương 1: 5 thành trong châu nhà (hào tộc, Khương hoặc Hồ, đồn Tào); đủ 5 thành hoặc hết mùa 9 thì ra 20 châu, mang quân theo. Chương 2: xưng bá khi nắm 6 châu; thua khi một nhà nắm 11 châu hoặc mất hết đất lần hai (lưu vong một lần, 3 mùa). Không khoá số mùa; AI càng về sau càng dám đánh. Tin: kề đất ta hoặc đồng minh thì ước ±20 %, xa thì "?", dò thám cho số đúng 3 mùa.

Máy chơi 60 ván mỗi đế (cẩn thận / gật hết / nửa ngẫu nhiên): thắng Tần 72 / 80 / 30 %, Đường 22 / 30 / 20 %, Minh 32 / 8 / 2 %, Hán Vũ 45 / 55 / 35 %. Ván 28–52 mùa, trung bình 98–209 lần chạm (p90 tới 570 ở Đường); ra 20 châu ở mùa 7–10 với 3,1–4,8 / 5 thành. Cân bằng đế còn lệch (Tần dễ; Đường, Minh khó; Minh bị kẹp giữa Tào và Ngô nên lưu vong nhiều).

Máy cho thấy (chưa phải cảm giác người): chương 2 cần đồng hồ thua và AI leo thang, thiếu một trong hai là ván bế tắc không hết; Hán Vũ chỉ giáp Tần nên đường ra là tri thức tơ lụa (kỵ binh vượt trần nuôi). Các chỉ số cần đo từ người vẫn là giây tới lựa chọn đầu, phút một ván, một nước đi kể lại được và ý muốn đổi đế/chơi tiếp. Không đổi số chạm ra phút. [ChatGPT](_research/chatgpt.md) B1.2, B6.

**Sau owner chơi:** quẹt được nhưng chán, thắng/thua chưa có sức nặng ([Grok](_research/grok.md) B0). Đọc code: thẻ thường tự chọn đích tối ưu cục bộ, tướng, 70% quân từ các thành kề; map không có thao tác ra lệnh. Audit seed `7919` tái hiện thẻ Hán Vũ mùa 3 hứa “100% giữ được” rồi UI báo mất do quân đã đổi sau thẻ trước; raid xuất phát từ đất vừa chiếm, scout đất mình vẫn tốn lương. Đây là lỗi trạng thái/dự báo cần sửa trước khi dùng cảm giác chơi để phân xử swipe với map. Máy `sense/yes/rand` là heuristic, không đo tư duy người thật. [ChatGPT](_research/chatgpt.md) B1.2–B1.4.

## Contradictions

- **Cách phát biểu về thị trường.** [Claude](_research/claude.md) C/E và [Grok](_research/grok.md) A.1 dùng achievement và phản hồi campaign để nghiêng ngã rẽ 1; [ChatGPT](_research/chatgpt.md) B9 bác suy luận achievement = bỏ cuộc/hết nhu cầu. Cả ba vẫn khuyên thử ván ngắn trước; chưa có dữ liệu nói tệp đó đông hơn campaign. `DECISION.md` đã chọn hướng, không cần quay về tranh luận quy mô thị trường trước spike.
- **DNA gốc và interview.** [Grok](_research/grok.md) A.4 xem Loạn 12 Sứ Quân + xuyên không là ván dễ bắt đầu; [ChatGPT](_research/chatgpt.md) B4 nhấn mạnh chưa xác nhận bản game owner nhớ, và người yêu sử chưa chắc muốn cùng một độ sâu hệ thống. Danh sách interview 27/9 còn giá trị đầu vào; `DECISION.md` thay thế chỗ mâu thuẫn, không tự bỏ mọi ý chưa chốt.
- **Nén hệ thống, agency và swipe.** [Claude](_research/claude.md) A.4–A.5 đề xuất giữ/nén/lùi; [Grok](_research/grok.md) B0–B2 muốn bỏ swipe làm lõi sau feedback; [ChatGPT](_research/chatgpt.md) B1, B8–B10 cho rằng chưa đủ chứng minh swipe chết, nhưng spike 2 đang quyết hộ đích/tướng/quân. Đề xuất map cho lệnh chính, thẻ cho phản ứng **chờ owner quyết**. Chưa thống nhất nước cờ cụ thể nào cần giữ trong mỗi lượt.
- **Độ dài và chỗ kết.** [Claude](_research/claude.md) spike 1 khoá 32 mùa; [Grok](_research/grok.md) A.6 ngại lai hai nửa; [ChatGPT](_research/chatgpt.md) B6 nhắc session mobile không phải độ dài ván. Owner đã chốt không khoá số mùa; cần thử đoạn kết xứng với công sức và lưu/tiếp tục trên điện thoại.
- **AI và quy trình prototype.** [Grok](_research/grok.md) B1 đọc `engine.js` nền và nghi V1 đọc sự thật; [ChatGPT](_research/chatgpt.md) B1.4 thấy runtime `game.html` còn compose `perception.js` ghi đè `decideAll`. Chưa đủ chứng minh toàn V1 gian lận; spike 2 là runtime khác. Prototype tách riêng trước freeze là bước owner yêu cầu trong `DECISION.md`, không tự biến nó thành luật production.
- **Bản Loạn 12 Sứ Quân nào.** [Grok](_research/grok.md) A.4 nêu Ola–MGM; [ChatGPT](_research/chatgpt.md) B4 chưa xác nhận chính bản owner chơi.

## Current hypothesis

Ván tranh bá ngắn "có răng" là lời hứa chính của v2: một ván làm hoàng đế, dùng sở trường và điều mình biết để đổi thế cuộc, rồi thử lại theo cách khác. Chiều sâu = nước cờ đổi bàn ngay + bốn đế khác nhau ở nước hợp lệ + tướng và liên minh sinh chuyện; không = sổ sách. Hệ thống cần nhiều buổi lùi sang phase chiến dịch sau; lai chỉ ở lớp giữa các ván. Spike 1 cho thấy đồn trú theo châu giảm tốc độ đổi chủ so với v1; cả hai spike còn lệch cân bằng theo đế. [Claude](_research/claude.md) B/F; [ChatGPT](_research/chatgpt.md) B1.

**Giả thuyết mới để thử, chưa chốt:** lệnh chính chọn trên map, thẻ cho quyết định con người/ngoại giao, một quyết định lớn mỗi lượt, có hệ quả thấy ngay và cách thử lại. Gắn việc mở rộng từ thành sang châu với ít nhất một thành quả cũ còn tác dụng. Tệp đầu giả định là người yêu sử muốn tự đổi thế và người thích chiến thuật gọn; YouTube là kênh cần đo, chưa có dữ liệu thị phần hay willingness-to-pay ở Việt Nam. [ChatGPT](_research/chatgpt.md) B2–B4, B7, B10.

## Open questions

1. Sau phản hồi spike 2, owner muốn giữ swipe làm lệnh chính, hay chuyển lệnh sang map và để swipe cho phản ứng? [Grok](_research/grok.md) B0; [ChatGPT](_research/chatgpt.md) B10.
2. Trong input 27/9, hai hoặc ba quyền điều quân/đất nào tạo ra nước cờ đáng nhớ mà vẫn ít thao tác; kết ván và di sản từ thành lên châu cần ra sao? [Claude](_research/claude.md) B.9; [ChatGPT](_research/chatgpt.md) B10–B11.
3. Sau khi sửa độ tin cậy thẻ và có lựa chọn thật, owner có tự muốn thử một phương án khác không? Chưa có quan sát này. [ChatGPT](_research/chatgpt.md) B1, B11.
4. Bản Loạn 12 Sứ Quân owner từng chơi là bản nào? Chưa xác nhận. [Claude](_research/claude.md) D; [ChatGPT](_research/chatgpt.md) B4.

## Next research

Không thêm desk research rộng trước quan sát mới. Theo [ChatGPT](_research/chatgpt.md) B11: **P0** thẻ luôn khớp trạng thái và nguồn tấn công còn hợp lệ → **P1** lát cắt nhỏ với hai kế hoạch thật → **P2** lưu/tiếp tục, thử lại cùng thế. Owner chơi trước như `DECISION.md`; sau Pages mới mời nhóm nhỏ để tìm lỗi hiểu và cảm nhận, không dùng mẫu nhỏ để chứng minh tỷ lệ chơi lại hay doanh thu. Grok đối chiếu luật, Claude thử input mobile theo hướng owner chọn; cập nhật quyết định cần thiết trước khi viết freeze v2. Chưa đổi code hoặc luật đã khóa.
