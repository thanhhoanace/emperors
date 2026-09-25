# 0004 — Hướng visual: thế giới hiện thực, kể chuyện kiểu Ryan Sael

**Trạng thái:** Chấp nhận · 2026-09-25 (đề xuất 2026-09-24)

## Bối cảnh

Chủ dự án muốn làm lại UI/UX và thế giới 3D theo phong cách Ryan Sael (dat.city), lấy thêm ý tưởng từ Total War: Three Kingdoms, và ưu tiên độ hiện thực như Ryan, Total War, Civ VI. Vòng 1 (stylized/voxel) đã dựng và bị thay bởi yêu cầu hiện thực.

## Phương án

Chi tiết và ảnh: `docs/design/direction.md`, canvas https://claude.ai/artifact/958ZoQxAFcGPKTUNGVdWeV

- **A — Chiến dịch Thiên Hạ:** bản đồ chiến dịch liền mạch kiểu TW3K, UI thủy mặc, camera theo lượt và làm xám ngoài tiêu điểm kiểu Ryan.
- **B — Sa bàn bảo tàng:** cùng thế giới, đóng khung sa bàn trên bàn, tilt-shift, UI tối giản kiểu Ryan.
- **C — Bản đồ rõ + cắt cảnh trận:** tầng chiến lược kiểu Civ VI, cắt cảnh trận 3–5 giây kiểu TW3K.

Đề xuất: A + cắt cảnh trận của C + khung sa bàn B cho mở đầu/kết thúc.

## Quyết định

Chủ dự án chọn **A — Chiến dịch Thiên Hạ**, kết hợp **cắt cảnh trận của C** mỗi khi có giao chiến.

Nhận xét kèm quyết định: thành trì trong bản mock còn "đồ chơi", chưa đạt mức Total War: Three Kingdoms và chưa đạt độ chăm chút của dat.city. Vì vậy, trước khi đưa vào app, thành trì phải được dựng lại ở mức chi tiết cao (mái cong có ngói, tường gạch, lầu cổng, tứ hợp viện, cung điện, bóng tiếp xúc) và gửi chủ dự án duyệt lại.

## Hệ quả

- Frontend mới đi theo bố cục và UI của A (thủy mặc, bản đồ tròn, biển tên thành có chân dung, camera theo lượt, xám ngoài tiêu điểm).
- Mỗi event `attack` có thể mở cảnh cắt trận 3–5 giây (góc thấp, khung điện ảnh, thanh tương quan lực lượng); nút "Bỏ qua" và chế độ tốc độ nhanh phải tắt được cảnh này.
- Khung sa bàn của B không dùng trong app; có thể dùng cho cảnh mở đầu/kết thúc video sau này.
