# Báo cáo tra cứu gốc

> **Vai trò:** tư liệu tra cứu thô, kèm nguồn. Không phải SOT: kết luận đã được chép sang `docs/design/history.md`, `docs/product/proposal-all-china.md` và các ADR.
> Các báo cáo do agent viết bằng tiếng Anh (ngày 2026-09-25, sau khi môi trường mở mạng), giữ nguyên để không mất nguồn trích dẫn.

| File | Nội dung |
| --- | --- |
| `datcity.md` | Đọc mã nguồn dat.city (Ryan Sael): renderer, mức chất lượng, instancing, dựng dần, hậu kỳ, camera; số đo lệnh vẽ và tam giác; mục cuối là những điều nên làm theo |
| `tw3k.md` | Bản đồ chiến dịch Total War: Three Kingdoms: phạm vi, số quận huyện, tỉ lệ đo được, cách vẽ mùa, thành, quân |
| `cities.md` | Đối chiếu 14 thành với Wikipedia, Commons và bài khảo cổ: bảng "ta / đúng / nguồn" và các chỉnh sửa đã áp dụng vào `data/cities.json` |
| `cities219-west.md` | Thiên Thủy (thành Ký), Cô Tang, Nam Trịnh, Điền Trì năm 219: vị trí di chỉ, hình thành, trạng thái mùa thu 219 |
| `cities219-east.md` | Chung Ly, Giang Lăng; Lạc Dương và Trường An năm 219 (hồi sinh một phần, cung vẫn là phế tích) |
| `cities219-diff.md` | Mười hai thành còn lại: thay đổi từ 200 tới 219 (Tam Đài ở Nghiệp, Quan Vũ vây Phàn Thành, Bộ Chất ở Phiên Ngung…) |
| `periphery.md` | Vùng biên Trung Quốc năm 200 và lợi thế có căn cứ lịch sử cho từng hoàng đế |
| `tw3k-civ-win-defeat.md` | Vòng 9 (tiếng Việt): TW3K và Civ VI — điều kiện thắng, khi nào bị loại, đường trở lại (lưu vong, chư hầu, giải phóng), thông tin trước trận, khởi đầu yếu; hàm ý mốc thắng và cơ chế lật lại |
| `tw3k-civ-buildup-economy-generals.md` | Vòng 9 (tiếng Việt): TW3K và Civ VI — giữ đất (đồn trú, vây thành, trung thành), 20 lượt đầu, mộ binh và kinh tế trong ngân sách ít lệnh, lớp tướng, từ vựng tương tác bản đồ (dat.city, TW3K) |
| `alliances-civ-tw3k.md` | Vòng 9 (tiếng Việt): liên minh, phòng thủ chung, cùng đánh trong Civ VI, TW3K, Koei RTK; đề xuất ba điều khoản `truce` / `defend` / `joint_war` cho một lệnh mỗi lượt, AI nhận/từ chối chỉ từ tin công khai, cờ bội ước |
| `intel-delay.md` | Vòng 9 (tiếng Việt): sương mù, tình báo, tin đồn, tin giả và độ trễ trong Civ VI, TW3K, Koei ROTK, Kriegsspiel, Diplomacy, Dominions, Command Ops; tốc độ tin thời Hán áp lên bản đồ; mô hình nguồn tin / tuổi tin / nhiễu / do thám đề xuất cho luật v2 |
| `gameplay-interview-2026-09-27.md` | Vòng 9 (tiếng Việt): hiện trạng gameplay / game feel, số đo `tests/sim.mjs` + `tests/playthrough.mjs`, 14 phát hiện, bản đồ pending / unknown và 25 câu interview đã trả lời (mục 9) |

Ảnh chụp TW3K và dữ liệu TWDB mà các báo cáo nhắc tới **không có trong repo**. Đó là tư liệu của game thương mại, chỉ dùng để tham khảo (`AGENTS.md`).
