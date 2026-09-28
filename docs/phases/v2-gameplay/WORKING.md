# V2 Gameplay — Working state

> Cập nhật: 2026-09-28 · lượt COMPACT bởi Claude theo yêu cầu chủ dự án (lệch luật 4 trong `AGENTS.md`: Claude vừa research vừa synthesis; ghi lại để lần sau xoay tool) · nguồn: `_research/claude.md` (mục A–I), `_research/chatgpt.md` (mục 1–10), `_research/grok.md` (mục 1–6), spike `spike/`.
> Bước hiện tại: DECIDE. Đã dùng 2/2 vòng research. Chưa có `DECISION.md`.

## Problem

Chủ dự án chơi `game.html` (27/9): "đang *xem* chứ không *chơi*"; đánh chỉ xem quân chạy; không bấm được đất, quân, tướng. Ngày 28/9 đặt ngã rẽ cho v2: (1) vào là chơi, nghĩ ít, kết quả nhanh, chơi lại như cờ; (2) chiến dịch tính toán, chi tiết, dài. Câu hỏi kèm: thị trường và người chơi thật muốn gì; gốc ý tưởng là Loạn 12 Sứ Quân cũ + trend xuyên không.

## Owner inputs

Nguyên ý, chưa phải luật. Interview 27/9 (`claude.md` B.9) được nêu *trước* câu hỏi ngã rẽ; Grok (§4) và ChatGPT (§6) đều lưu ý danh sách này là "muốn sau khi chơi v1", có thể rộng hơn DNA gốc.

- Chơi là chính; clip giữ ở `?demo=1`. Mốc đặt ra: thắng 20–30 %, chết trước lượt 16 dưới 5 %, ván 20–40 phút.
- Mở ván từ tay trắng (châu nhỏ, quân ít, xây dần), không nhận sẵn đại quân.
- Muốn làm với đất và quân mình: dân, tiền, lương, mộ binh, xây, điều quân, đồn trú, bổ nhiệm tướng, buôn bán; việc 2–3 lượt.
- Theo lượt, cùng lúc; nhưng có tình báo, tin trễ, mưu kế làm sai tin.
- Trận: chọn tướng và số quân, cách đánh, cắt cảnh, kết quả có lý do; cả phòng thủ; quân đông không tự thắng; tướng, địa hình và sông, đồn trú, hành quân xa.
- Liên minh có cứu nhau và cùng đánh. Tướng đủ bốn lớp. Lật lại: lưu vong, xưng thần, phục quốc. Vùng rìa chiêu binh và buôn bán, không tính vào 20 châu.
- Quy trình: mở freeze v2; đề xuất + prototype duyệt trước khi code; giữ hai lane; Pages đã trỏ `game.html`; LLM sau.

## Evidence we trust

**Game hiện tại** (`claude.md` B.4): người chơi hợp lý thắng 0–3 %, chết trung bình lượt 12–26; 1,6–2,0 châu đổi chủ mỗi lượt vì thủ = tổng quân chia đều; đánh châu "yếu" vẫn thua 25–40 %; ván 38–41 lượt, 15–25 phút. Về *độ dài* v1 đã ở ngã rẽ 1; thiếu là *chiều sâu của một lệnh*. Grok §5 đồng ý: triệu chứng là "thiếu nước cờ", không phải "thiếu chiến dịch"; thêm thuế, hàng đợi, tin trễ trước khi mỗi lệnh đổi bàn cờ sẽ làm "xem" nặng hơn.

**Chiến dịch bị bỏ dở là đa số và được chấp nhận** (`claude.md` C.2, E.2; `grok.md` §1): Civ VI 37 % từng thắng một ván, TW3K 31 %, CK3 4 %, Old World 10 % dù khoá 200 lượt; Firaxis: dưới 50 % chơi hết; cộng đồng r/civ, r/CK coi bỏ dở là bình thường, mua *quá trình* không mua *hồi kết*; phần được yêu là mở ván và bất định, phần bỏ là quản lý cuối. Cắt ngắn bằng điểm reset (Civ VII ages) sinh than "cụt" và "mất công đầu tư": không phải cắt nào cũng được.

**Ván ngắn có thị trường, nhưng "nông" là lời than thật** (`claude.md` C.3, E.3; `grok.md` §2; `chatgpt.md` §2–3): chess.com 8,7 triệu người/ngày; Polytopia 25 triệu tải, 30 lượt; OpenFront hơn 1 triệu người/tháng trên trình duyệt; 9 Kings hơn 1 triệu bản; Thronefall 95 % tích cực. Than trong cộng đồng Polytopia không phải "giá dài thêm" mà là "lặp recipe, hết bài toán"; chiều sâu được chấp nhận = mastery trong cùng khuôn, không = thêm sổ sách. Reigns: Three Kingdoms 52 % tích cực: chủ đề quen và thao tác dễ không tự bảo đảm.

**Khẩu vị dịch về cửa vào thấp, không phải "hết người chơi strategy"** (`claude.md` C.1; `grok.md` §3; `chatgpt.md` §2): Quantic Foundry 2015→2024 điểm "strategy and planning" 50 → 33; mobile strategy vẫn tăng 26 % nửa đầu 2025, tiền ở hybrid 4X "30 giây đầu dễ, dày ở ngày 7"; SLG Tam Quốc lớn nhất là mùa giải có liên minh, thứ một người không vận hành được.

**Gốc ý tưởng** (`claude.md` D; `grok.md` §4; `chatgpt.md` §4): Loạn 12 Sứ Quân là ít nhất sáu game; bản game thủ Việt nhớ (Java/Android Ola–MGM) là xếp hình + lượt, "vào là đánh, mỗi lượt có kết quả", sử là áo; chưa xác nhận đó là bản chủ dự án chơi. Xuyên không bán fantasy "một người rơi vào thế giới quen, dùng thứ mình biết, đổi một cục diện"; độc giả thưởng "có lương, có quân, logic", phạt "quá bá, harem"; giúp thu hút, không tự giữ chân.

**Chi phí game sâu** (`claude.md` E.4): Humankind, Millennia vỡ ở độ rõ, nhịp cuối, AI; game sâu thành công với đội nhỏ là máy sinh chuyện và mất nhiều năm; mỗi hệ thống thêm = UI + AI + cân bằng.

**Cơ chế tham khảo** (`claude.md` F–I): giữ đất bằng đồn trú cục bộ và vây nhiều lượt; lật lại bằng lưu vong, chư hầu, giải phóng; tin thời Hán tới trong một mùa, thứ nên trễ là *chi tiết đáng tin*; liên minh = phòng thủ chung tự động không dây chuyền + cùng đánh có hạn.

## Spike (28/9)

Canvas: https://claude.ai/artifact/974asePfQJjxNqUYSZ5r2y · luật thử và đo: `spike/rules.js`, `spike/sim.js`. Hình dạng: 32 mùa; mỗi mùa 1 lệnh triều đình + 1 việc trong châu; quân đóng theo châu, trần theo bậc khai hoang; đế bắt đầu 4 nghìn quân; mỗi đế một tri thức tương lai; tướng có võ, đặc tính, lòng trung; ước lượng trận bằng chữ; minh phòng thủ góp 30 % quân kề; tin đồn trễ một mùa; thủ phủ bảo hộ 8 mùa; lưu vong 3 mùa. Máy chơi 300 ván mỗi đế: Tần thắng 30–34 %, Lý 18–19 % (chết 15–18 %), Chu 0 % (chết 12 %), Hán Vũ 6–8 %; 0,55–0,92 châu đổi chủ mỗi mùa (v1: 1,6–2,0). Chưa có cảm giác người: chủ dự án chưa chơi.

## Contradictions

- **Cách phát biểu về thị trường.** Claude: bằng chứng nghiêng ngã rẽ 1, độ chắc trung bình. ChatGPT: không có cơ sở nói nhóm thích ngắn đông hơn; khuyên ngã rẽ 1 vì lời hứa dễ thử, đo được, đủ sức làm. Grok: không phân xử bằng doanh thu; bằng lời than thì bỏ dở chiến dịch là đa số, "cụt" ván ngắn là lời của người đo nhầm thước hoặc game hết bài toán. Cả ba thống nhất *làm ván ngắn trước*; khác nhau ở *tuyên bố*. Chưa có bằng chứng phân xử; DECISION nên ghi theo cách yếu nhất.
- **Owner inputs 27/9 và DNA gốc.** Grok §4: sản phẩm gốc trong đầu là "ván có mặt nạ lịch sử + ego xuyên không", không phải Civ mặc áo Tam Quốc; danh sách thuế, hậu cần, hàng đợi, tướng bốn lớp có thể lệch gốc. ChatGPT §6: các lựa chọn interview vẫn là quyết định đã ghi, research không tự huỷ. Cần chủ dự án nhìn lại.
- **Nén hệ thống và nguy cơ tái tạo v1.** ChatGPT §9: giảm hệ thống có thể tái tạo "ít việc để làm"; phải giữ agency. Grok §5: chỉ những gì là *nước cờ* (đổi bàn cờ ngay) mới đáng ở trong ván. Claude A.4–A.5 đề xuất bảng giữ/nén/lùi. Chưa thống nhất tiêu chí "nước cờ" cho từng hệ thống.
- **Số lượt và thời lượng.** ChatGPT §6: 48 lượt trong 30 phút = 37,5 giây/lượt, không giữ được khi mỗi lượt có nhiều việc; đừng khoá số lượt chỉ để đạt thời lượng; điều kiện thắng phải hợp cốt. Claude spike: 32 mùa. Grok §6: lai yếu hai nửa nếu nhét hệ thống chiến dịch vào ván 20 phút; lai được nếu lớp sâu nằm *giữa các ván*.
- **Thước đo.** Chủ dự án: thắng 20–30 %. ChatGPT §6, §8: diễn giải lại theo nhóm và độ khó; đo người mới có hiểu vì sao thua và tự muốn chơi lại trước khi tối ưu một tỉ lệ. Grok §6: nếu chọn ngã rẽ 1 thì đo chơi lại và độ rõ của nước đi, đừng đo bằng fantasy đế chế.
- **Quy mô chơi thử.** ChatGPT §8: 18 người, ba nhóm, A/B hai prototype. Claude A.6: 10 người, 2 ván. Grok: chỉ cần spike.
- **Bản Loạn 12 Sứ Quân nào.** Grok: bản Ola–MGM. ChatGPT: cần ảnh hoặc link từ chủ dự án. Chưa xác nhận.

## Current hypothesis

Ván tranh bá ngắn "có răng" là lời hứa chính của v2: một ván làm hoàng đế, dùng sở trường và điều mình biết để đổi thế cuộc, rồi thử lại theo cách khác. Chiều sâu = nước cờ đổi bàn ngay + bốn đế khác nhau ở nước hợp lệ + tướng và liên minh sinh chuyện; không = sổ sách. Hệ thống cần nhiều buổi lùi sang phase chiến dịch sau; lai chỉ ở lớp giữa các ván. Spike cho thấy đồn trú theo châu làm bản đồ ổn định gấp 2–3 lần; cân bằng bốn đế còn lệch (Chu, Hán Vũ).

## Open questions (để DECISION)

1. Ngã rẽ: 1, 2, hay 1 + lớp meta giữa các ván?
2. Tệp đầu tiên: "tối nay thử làm hoàng đế một ván" hay "gây dựng triều đại nhiều buổi"?
3. Owner input nào là nước cờ giữ trong ván, cái nào lùi sang chiến dịch?
4. Độ dài: khoá 32 mùa như spike, hay không khoá và để điều kiện thắng theo cốt?
5. Thước đo thay cho hoặc bên cạnh 20–30 %?
6. Quy mô và cách chơi thử trước khi khoá luật?
7. Bản Loạn 12 Sứ Quân gốc là bản nào?
8. Ai viết freeze v2 từ DECISION (lane Grok) và spike có sửa tiếp trước khi code không?

## Next research

Không. Đã dùng 2/2 vòng. Tiếp theo: chủ dự án trả lời 8 câu trên → `DECISION.md` → luật chép vào `GAMEPLAY-FREEZE.md` v2 → chơi thử theo quy mô đã chọn → BUILD.
