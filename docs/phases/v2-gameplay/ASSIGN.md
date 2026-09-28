# V2 Gameplay — Giao việc

> Chủ dự án giao, 28/9 khuya. File này chỉ nói **ai làm gì**; nội dung từng việc ở `WORKING.md` mục "Việc cho Grok" (tên mục giữ nguyên để link cũ không gãy).
> Ngoại lệ lane: mục 1–4 là luật (`src/engine/**`, freeze, `runtime-event.md`) nhưng chủ dự án giao cho Claude; `docs/product/lanes.md` vẫn đúng cho mọi việc khác. Grok không sửa `src/engine/**` song song với Claude trong lúc mục 1–4 chưa xong.

| Mục | Giao cho | Vì sao | Trạng thái |
| --- | --- | --- | --- |
| 1. Hợp đồng dữ liệu trận, `attack` v2 | Claude | Việc nhỏ, thuần kỹ thuật, và Claude là bên đang cần nó để nối cắt cảnh. Giao người khác chỉ thêm một vòng chờ. | xong 29/9 (`0aef1b0`): `battle` v2 trên mọi `attack`, làm mờ ±20 % cho bên kia, cắt cảnh dùng; sim và play không đổi một dòng |
| 2. Freeze v2 | Claude viết, GPT đọc phản biện | Freeze là tổng hợp từ DECISION + spike, cần nhất quán với engine và test. GPT đọc chéo để bắt chỗ "chặt chẽ nhưng không vui", như đã từng phản đối đúng một kết luận của Claude. | chưa bắt đầu |
| 3. Trận theo lượt, API thuần | Claude | Có sẵn spike `demo1/src/hn-rules.js` làm mẫu, có `npm run play` và `npm run sim` để cân bằng. | chưa bắt đầu |
| 4. Dự đoán của tướng | Claude | Cùng lý do mục 3; công thức sai số theo Mưu đã có trong spike. | chưa bắt đầu |
| 5. Các câu chưa chốt, cách scale lên 20 châu | Grok (chat mới) hoặc GPT | Cần bằng chứng cộng đồng và thị trường thời gian thực. Grok mạnh cảm nhận cộng đồng, GPT mạnh audit thị trường (phần B trước đó). Bản yêu cầu trong `WORKING.md` viết để chat mới đọc được. | tạm dừng, chờ chủ dự án |
| Thoại, personas, kịch bản | Grok | Grok đã làm từ đầu, giọng nhất quán. | tạm dừng, chờ chủ dự án |

## Cách giao

- **Claude (mục 1–4):** nói "làm mục N trong `docs/phases/v2-gameplay/ASSIGN.md`". Làm theo thứ tự 1 → 3 → 4 → 2 (freeze viết sau khi engine và test đã chạy, để freeze tả đúng cái có thật). Mỗi mục: engine + test + `rules.md` cùng commit, `npm test` và `npm run sim -- 500` xanh.
- **GPT (đọc phản biện mục 2):** dán `DECISION.md`, freeze v2 nháp, và câu hỏi: "Chỗ nào chặt chẽ nhưng không vui? Chỗ nào người chơi phải nghĩ nhiều hơn một lần quẹt/chạm?" Dán nguyên văn trả lời vào `_research/chatgpt.md` (ghi ngày và câu hỏi ở đầu, luật 9 `AGENTS.md`).
- **Grok hoặc GPT (mục 5):** mở chat mới, dán mục 5 của `WORKING.md` "Việc cho Grok" cộng `DECISION.md` mục "Chưa chốt". Kết quả vào `_research/grok.md` hoặc `_research/chatgpt.md` (một file mỗi tool, ghi đè). Synthesis vào `WORKING.md` do tool khác làm (luật 3–4).
- **Grok (thoại, personas, kịch bản):** như cũ, `data/personas/**`, `data/scenario/**`, `docs/product/scenario.md`.

**Chủ dự án, 28/9 khuya:** Claude làm mục 1 → 3 → 4 → 2 sau khi xong phần hình đang chạy (`docs/design/visual-build.md`); phần GPT (phản biện mục 2) và Grok (mục 5, thoại) tạm dừng, chủ dự án sẽ cho làm sau.

Cập nhật cột "Trạng thái" khi bắt đầu / xong (ghi commit).
