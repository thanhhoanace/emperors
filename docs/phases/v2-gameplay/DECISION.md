# V2 Gameplay — Decision

> Chốt: 2026-09-28 bởi chủ dự án, qua hỏi đáp 12 câu trên `WORKING.md` (compact cùng ngày) · thay cho: các câu trả lời interview 27/9 ở chỗ mâu thuẫn (xem Preserve / Defer) · luật của phase: `AGENTS.md`, mục phase.

## Decision

1. **v2 là ván tranh bá ngắn, vào là chơi.** Lời hứa: một ván làm hoàng đế xuyên không, dùng điều mình biết để đổi thế cuộc, rồi thử lại cách khác. Sau khi ván ngắn chạy được mới **scale lên**: chiếm dần từ nhỏ đến lớn, từ từng thành trong một châu rồi mới ra 20 châu. Cách scale cụ thể chưa có; spike 2 phá tiếp.
2. **Nét riêng là lựa chọn có / không kiểu quẹt thẻ.** Mỗi lượt là một chuỗi lựa chọn, người chơi quẹt trái / phải, không phải nghĩ nhiều. Không menu lệnh, không tab, không nhiều nút.
3. **Tệp đầu tiên:** người đọc / nói tiếng Việt, thích Tam Quốc hoặc xuyên không, từng chơi cờ hay chiến thuật gọn, "tối nay thử làm hoàng đế một ván". Không phục vụ đồng thời người muốn gây dựng triều đại nhiều buổi.
4. **Không khoá số lượt.** Ván kết thúc khi có người xưng bá (đủ N châu) hoặc người chơi bị loại. Thời lượng là thứ để đo và chỉnh N, không phải luật.
5. **Số, không chữ.** Trạng thái và ước lượng hiện bằng con số ít và rõ (dân, binh, lương…), không bằng band chữ.
6. **Thước đo "chơi được"** là ngưỡng hành vi: lựa chọn đầu dưới 60 giây không cần hướng dẫn; người quen xong ván 15–25 phút; kể lại được một lựa chọn đổi thế cờ; tự bấm ván nữa trên 40 %; đổi đế ở ván sau. Thắng 20–30 % chỉ còn là mốc cân bằng máy (`npm run play`).
7. **Chơi thử:** chỉ chủ dự án chơi trước khi khoá luật; người lạ thử khi đã lên Pages.
8. **Bước tiếp:** Claude làm spike 2 (trang HTML trong repo, chạy bằng `npm start`, quẹt được trên điện thoại): quẹt thẻ có / không trên bản đồ, mở ván từ thành trong một châu rồi lớn dần, số thay chữ. Chủ dự án chơi. Rồi Grok viết `GAMEPLAY-FREEZE.md` v2 từ DECISION này cộng spike 2, rồi mới code engine. Không code luật mới trước freeze v2.

## Why

- Cả ba tool (`_research/claude.md` A, `chatgpt.md` §5, `grok.md` §6) đều khuyên ván ngắn trước, vì lời hứa dễ thử, đo được, đủ sức một người + agent, và vì bỏ dở chiến dịch là hành vi đa số (Civ VI 37 % từng thắng, CK3 4 %, Old World 10 %). **Không tuyên bố thị trường thích ngắn hơn**: không có bằng chứng; ChatGPT và Grok phản đối cách nói đó.
- Triệu chứng v1 "xem chứ không chơi" là thiếu nước cờ đổi bàn ngay, không phải thiếu chiến dịch (`grok.md` §5). Spike 1 (một lệnh + một việc, nhiều nút) bị chủ dự án đánh giá "nhiều lựa chọn, sai tinh thần"; quẹt thẻ là cách giảm tải nhận thức mà vẫn giữ quyền quyết định.
- Gốc ý tưởng là bản Loạn 12 Sứ Quân Java/Android (Ola, MGM 2008–2010): chọn sứ quân, vào là đánh, mỗi lượt có kết quả, chiếm dần từng đối thủ; sử là áo. Xuyên không bán fantasy "dùng thứ mình biết đổi một cục diện". Cả hai gốc nghiêng về ván ngắn có nhịp rõ, không phải Civ mặc áo Tam Quốc.
- Khoá 48 lượt trong 30 phút là 37,5 giây mỗi lượt, không giữ được (`chatgpt.md` §6); Civ VII cắt ngắn bằng điểm reset bị than "cụt" (`grok.md` §1). Nên kết thúc theo cốt, đo thời lượng rồi chỉnh.

## Rejected

- **Chiến dịch sâu làm sản phẩm chính.** Đa số không chơi hết; cần AI, UI, cân bằng cho từng hệ thống; vượt sức một người + agent (`claude.md` E.4).
- **Lai với hệ thống chiến dịch nằm trong lượt.** Yếu cả hai nửa (`grok.md` §6). Lai chỉ được xem xét lại ở lớp giữa các ván khi scale.
- **Hình dạng spike 1** (1 lệnh triều đình + 1 việc trong châu, menu 4 lệnh, tab): quá nhiều nút.
- **Ước lượng bằng chữ** (Bất lợi / Ngang / Có lợi): thay bằng số.
- **Khoá 32 hoặc 48 mùa.**
- **Chơi thử 18 người, A/B hai prototype** (`chatgpt.md` §8): quá nặng cho lúc này.

## Preserve / Defer

Giữ trong ván (đã chốt): mỗi đế một tri thức tương lai đọc được trên bàn cờ; tướng có võ, đặc tính, lòng trung (bị bắt thì hàng hoặc chết, ly gián đủ thì phản); lưu vong một lần; số thay chữ; đồn trú theo châu (spike 1 cho thấy bản đồ ổn định gấp 2–3 lần v1, giữ nguyên tắc, hình thức theo spike 2).

Giữ từ 27/9, không mâu thuẫn: chơi là chính, clip ở `?demo=1`; Pages đã trỏ `game.html`; hai lane; LLM sau; cửa kịch bản chỉ phe liên quan thấy; việc hình theo thứ tự cắt cảnh trận, chân dung, âm thanh.

**Chưa chốt, cần phá lại (owner: "chưa rõ, cần break lại")** — spike 2 và freeze v2 phải trả lời, không tự quyết trong lúc code: việc trong châu (mộ binh, khai hoang, lũy, điều quân, buôn) còn cái nào và ở dạng thẻ nào; thuế, hậu cần, loại lính, hàng đợi; tướng lớp quan hệ, kinh nghiệm, lên cấp; xưng thần, phục quốc, kế vị; tình báo nhiều tầng, tin trễ nhiều mùa; liên minh có nghĩa vụ; vùng rìa chiêu binh và buôn bán; cách scale từ thành trong châu lên 20 châu.

## Assumptions that matter

- Thẻ có / không phải sinh từ trạng thái bàn cờ và tri thức của đế, có hậu quả thấy được trên bản đồ. Nếu thẻ là ngẫu nhiên hoặc chỉ đổi vài số, quyền quyết định sụp: Reigns: Three Kingdoms cùng cơ chế quẹt, cùng đề tài, chỉ 52 % tích cực (`chatgpt.md` §2).
- Ván ngắn phải giữ được cảm giác "xây từ tay trắng" (mở ván nhỏ, lớn dần) mà không kéo dài; nếu người chơi thấy vừa nhập vai đã bị ngắt, xem lại độ dài hoặc hướng (`chatgpt.md` §9).
- Bốn đế phải khác nhau ở *lựa chọn*, không chỉ ở số; hết bất ngờ ở ván 3 là "nông" (`grok.md` §2).
- Cân bằng spike 1 còn lệch (Chu 0 % thắng, Hán Vũ chỉ giáp Tần); spike 2 đổi hình dạng nên đo lại từ đầu.
- Canvas không bấm được với chủ dự án; spike 2 phải là trang HTML thường.

## Revisit when

- Chủ dự án chơi spike 2 mà vẫn thấy "xem chứ không chơi", "cụt", hoặc quẹt thẻ thành ngẫu nhiên.
- Người chơi (khi đã lên Pages) không kể lại được vì sao thua, hoặc không tự chơi ván hai.
- Ý "scale từ thành lên châu" không dựng được trong một ván có nhịp rõ.
- Freeze v2 (Grok) phát hiện luật mâu thuẫn với perception / referee hiện có.

## Written into

- `docs/phases/README.md`, `docs/status.md`: trạng thái phase (đã cập nhật cùng commit).
- `docs/product/GAMEPLAY-FREEZE.md` v2: **chưa**, Grok viết sau spike 2 từ file này; v1 thành log.
- `docs/product/lanes.md`: không đổi.
