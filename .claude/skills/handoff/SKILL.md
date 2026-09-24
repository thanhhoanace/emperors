---
name: handoff
description: Kết thúc phiên làm việc trên Tam Quốc Loạn Nhập — cập nhật docs/status.md để agent (Claude hoặc Codex) hoặc người sau làm tiếp mà không cần đọc lại hội thoại.
---

# Handoff

1. Mở `docs/status.md`. Sửa tại chỗ, đừng viết thêm lịch sử dài:
   - **Cập nhật:** ngày hôm nay và nhánh hiện tại (`git branch --show-current`).
   - **Đang chờ:** quyết định hoặc thông tin đang cần từ chủ dự án.
   - **Đã xong:** 3–6 gạch đầu dòng của phiên này, nêu kết quả chứ không kể quá trình. Gộp hoặc xoá mục của các phiên cũ đã hết giá trị.
   - **Việc tiếp theo:** danh sách có thứ tự, mỗi mục làm được ngay (nêu file hoặc lệnh).
   - **Vấn đề đã biết:** kèm số đo nếu có (ví dụ kết quả `npm run sim`).
2. Nếu phiên này có quyết định khó đảo ngược: thêm ADR vào `docs/decisions/` và cập nhật bảng trong `docs/decisions/README.md`.
3. Nếu agent vừa mắc một lỗi đáng nhớ: thêm một dòng vào mục "Bài học" của `AGENTS.md`.
4. Không chép số liệu từ `data/` vào docs; dẫn link.
5. Commit cùng thay đổi code của phiên, hoặc commit riêng với message `docs: update status`.
