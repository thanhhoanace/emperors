# V2 Gameplay — Working state

> Cập nhật: 2026-09-28 · synthesis bởi Claude · nguồn: `_research/claude.md` (mục A–I). `_research/chatgpt.md`, `_research/grok.md` chưa có trong repo.
> Luật dùng file này: `docs/phases/README.md`. Chưa có `DECISION.md`: chưa chốt gì về luật v2.

## Problem

Chủ dự án chơi thử `game.html` (27/9): "đang *xem* game chứ không được *chơi*". Ít thao tác; tấn công chỉ xem quân chạy; không tương tác bản đồ như dat.city; không tương tác quân, đất của mình; chưa có chuyện tướng, buff/nerf. v2 đứng trước hai ngã rẽ:

1. **Vào là chơi:** đơn giản, nghĩ ít, kết quả nhanh, chơi đi chơi lại như cờ.
2. **Chiến dịch sâu:** tính toán, chi tiết, căng thẳng, mất nhiều thời gian.

(Có thể có hướng 3: lai.)

## Owner inputs

Từ interview 27/9 (`_research/claude.md` mục B, phần 9) và câu hỏi 28/9. Đây là mong muốn, **chưa phải luật**, và một phần được nêu *trước* khi đặt câu hỏi ngã rẽ.

- Chơi là chính; clip ở `?demo=1` và cảnh diễn trong lúc chơi. Mốc: người chơi hợp lý thắng 20–30 %, bị loại trước lượt 16 dưới 5 %, sống tới cuối trên 75 %, ván 20–40 phút.
- Mở ván "đi từ đầu như Civ": châu nhỏ, quân ít, xây dần; không nhận sẵn đại quân.
- Muốn làm với đất và quân mình: quản dân, tiền, lương; mộ binh, luyện quân; xây; điều quân, đồn trú; bổ nhiệm tướng; buôn bán; có việc 2–3 lượt mới xong. Ngân sách lệnh "theo cách TW3K và Civ làm".
- Theo lượt, cùng lúc như nay, nhưng phải có tình báo và tin trễ ("tin từ A tới B mất cả tháng").
- Trận: chọn tướng và số quân, cách đánh, cắt cảnh có diễn biến, kết quả có lý do; cả phòng thủ; quân đông không tự thắng. Yếu tố: tướng, địa hình và sông (thuỷ quân, Xích Bích), đồn trú theo châu, hành quân xa và tiếp tế.
- Trước trận: ước lượng bằng chữ từ tình báo, do thám; mưu kế làm sai tin được.
- Liên minh kiểu Civ + TW3K: hỗ trợ thủ, cùng đánh; deal có nghĩa vụ được.
- Tướng: 3 chỉ số + 1 thẻ, sự kiện cá nhân, người chơi bổ nhiệm, quan hệ, kinh nghiệm, lên cấp.
- Lật lại khi sắp chết: lưu vong có hạn, xưng thần, phục quốc.
- Vùng rìa Tây Vực, Giao Chỉ / Đại Việt, Tây Tạng: nơi chiêu binh và buôn bán, không tính vào 20 châu.
- Cửa kịch bản: phe liên quan thấy, phe khác nghe đồn. Việc hình: cắt cảnh trận trước, rồi chân dung, rồi âm thanh.
- Quy trình: mở freeze v2 kèm quyết định; đề xuất + prototype duyệt trước khi code; giữ hai lane (Claude hình/UI + đề xuất, Grok engine/luật). Pages trỏ `game.html` (đã làm), LLM sau.
- Gốc ý tưởng: game cũ Loạn 12 Sứ Quân + trend xuyên không.

## Evidence we trust

Chỉ giữ những gì có số đo hoặc nguồn; chi tiết và URL ở mục ghi trong ngoặc.

**Game hiện tại (đo 27/9, `tests/playthrough.mjs`, 30 seed mỗi đế) (B.4):**
- Người chơi hợp lý thắng 0–3 %, chết trung bình lượt 12–26; rùa sống nhưng hạng 4–5; đánh liên tục chết trước lượt 20.
- Bản đồ đổi chủ 1,6–2,0 châu mỗi lượt vì sức thủ = tổng quân chia đều số châu. Đánh châu band "yếu" vẫn thua 25–40 %.
- Một ván dài 38–41 lượt, khoảng 15–25 phút ở tốc độ mặc định: về *độ dài*, game đã ở ngã rẽ 1; cái thiếu là *chiều sâu của một lệnh*.

**Thị trường (C, E):**
- Ít người chơi hết chiến dịch: Civ VI 37 % từng thắng một ván, TW3K 31 %, Crusader Kings III 4 %, Old World (khoá 200 lượt) 10 %. Firaxis: dưới 50 % hoàn thành một ván Civ VI → Civ VII chia ba kỷ nguyên. Achievement Steam là mức sàn.
- Có thị trường lớn cho strategy cô đọng: chess.com 8,7 triệu người/ngày, Polytopia 25 triệu tải (30 lượt), OpenFront.io trên 1 triệu người/tháng trên trình duyệt, không tài khoản.
- Có thị trường lớn cho chiều sâu: Civ trên 70 triệu bản cả dòng, TW3K 1 triệu bản tuần đầu. Nhưng tiền lớn nhất của "Tam Quốc sâu" là SLG mùa giải 50–75 ngày có liên minh (Three Kingdoms Tactics 1,2 tỉ USD, Rise of Kingdoms 3,5 tỉ USD), thứ một người không vận hành được.
- Quantic Foundry: hứng thú "suy nghĩ chiến lược" giảm mạnh 2015→2024.
- Game sâu vỡ ở độ rõ, nhịp cuối, AI (Humankind, Millennia). Game sâu thành công với đội nhỏ đều là máy sinh chuyện và mất nhiều năm (RimWorld, Old World, Dominions). Mỗi hệ thống thêm = một màn UI + một nhánh AI + một trục cân bằng.

**Gốc ý tưởng (D):**
- Loạn 12 Sứ Quân là ít nhất sáu game khác nhau; bản được khen gameplay được khen vì "dễ hiểu, dễ học, không phức tạp", bị chê vì chờ tài nguyên. Ký ức: nhiều phe, bản đồ tranh hùng, gặp danh nhân.
- Độc giả Việt Tam Quốc xuyên không thưởng "logic hợp lý, có tiền, có lương, có quân", phạt "quá bá, harem". Xuyên không giúp *thu hút*; giữ chân phải đến từ gameplay.
- Tam Quốc ở Việt Nam bão hoà (khoảng 16 game mới năm 2024). Tệp thực tế cho game trình duyệt miễn phí: vài nghìn người thử, vài trăm quay lại → đo bằng clip và seed chia sẻ, không bằng DAU.

**Cơ chế tham khảo (F–I):** giữ đất bằng đồn trú cục bộ + vây nhiều lượt + trung thành (TW3K, Civ); lật lại bằng lưu vong (Lưu Bị không đất), chư hầu, giải phóng; tình báo = che theo tầm nhìn, bán theo cấp, nhiễu theo nguồn; tin thời Hán tới trong 1–3 tuần (công văn) đến 1–2 tháng (dân gian), đều ngắn hơn một mùa; liên minh = phòng thủ chung tự động không dây chuyền + cùng đánh có mục tiêu, có hạn.

## Contradictions

- **Mức độ chắc của kết luận "ngắn hơn".** Claude (A.1): bằng chứng nghiêng rõ về ngã rẽ 1, độ chắc trung bình. ChatGPT (theo chủ dự án chuyển lại 28/9, file chưa vào repo): bằng chứng *không* chứng minh nhóm thích ngắn đông hơn nhóm thích chiến dịch; chỉ nên nói "ưu tiên test ngắn trước", không kết luận thị trường thích ngắn hơn. Hai bên thống nhất về *việc làm tiếp*, khác nhau về *cách diễn giải*. Chưa có bằng chứng phân xử.
- **Ngắn giúp test vòng chơi nhanh** ↔ **quá ngắn phá fantasy "xây đế chế"** mà chủ dự án muốn (mở ván từ tay trắng, xây 2–3 lượt).
- **Owner inputs rất rộng** (quản dân, tiền, lương, thuế, hậu cần, bốn lớp tướng, ba đường lật lại) ↔ **evidence nói mỗi hệ thống thêm là sổ sách nếu không sinh chuyện**. Claude đề xuất nén (A.4–A.5); chủ dự án chưa trả lời.
- **Campaign hỗ trợ tướng, ngoại giao, phục quốc tốt hơn** ↔ **chi phí content, AI, cân bằng** vượt sức một người + agent.

## Current hypothesis

Prototype **ván ngắn trước**, không kết luận thị trường thích ngắn hơn. Hình dạng Claude đề xuất (A.4), để phản biện, chưa chốt: "cờ Tam Quốc có máy sinh chuyện" — ván 32 mùa, 20–30 phút; 1 lệnh triều đình + 1 việc phụ mỗi lượt; mở ván 8–12 lượt từ tay trắng với một tài nguyên; mỗi đế một "tri thức tương lai" đọc được trên bàn cờ; giữ tướng (chỉ số, tính cách, một quan hệ), liên minh có nghĩa vụ, một dạng do thám, lưu vong; cắt thuế, hậu cần, loại lính, hàng đợi. Có thể thêm một lớp meta bền giữa các ván (hướng lai) nếu chơi thử cho thấy ván ngắn bị "cụt".

## Open questions

1. Chủ dự án chọn ngã rẽ nào (1, 2, hay lai)? Chưa trả lời.
2. Chơi lại đến từ đâu: đổi đế, seed, xếp hạng, hay lớp meta?
3. Một ván 20–30 phút có đủ cảm giác tranh bá và "xây từ tay trắng" không?
4. Người chơi sử Việt / Tam Quốc muốn nhập vai hay làm chủ chiến thuật?
5. Lai có làm cả hai nửa cùng yếu không?
6. Những owner input nào giữ nguyên, nào nén, nào lùi sau chơi thử (bảng A.5 là đề xuất)?

## Next research

Chỉ những GAP còn lại; tối đa một vòng nữa (vòng 2 trên 2).

- **ChatGPT:** dán research đã có vào `_research/chatgpt.md` (nguyên văn, ghi ngày và câu hỏi). Nếu chạy tiếp: game có vòng phiên tương tự (Thronefall, 9 Kings, Polytopia) và cách chúng tạo cảm giác tiến triển trong ván ngắn.
- **Grok:** cảm nhận cộng đồng về strategy ngắn và chiến dịch dài (Reddit, X, diễn đàn Việt), đặc biệt lời than về ván ngắn "cụt" và chiến dịch "bỏ dở".
- **Claude:** không research thêm; làm spike thay tài liệu (luật 8): prototype một ván ngắn trên canvas để chủ dự án bấm thử, kết quả ghi lại đây.
- Synthesis lượt sau: tool khác Claude (luật 4).
